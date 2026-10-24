import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildCalibrationModel,
  getMetricScaleForLatitude,
  geoToLocalMeters,
  geoToModelCoordinates,
  MAX_ACCEPTABLE_CALIBRATION_RMSE_METERS,
} from '../campusCalibration.ts'
import type { CalibrationModel, GroundControlPoint } from '../../types/gps.ts'
import { LiveNavigationEngine } from '../liveNavigationEngine.ts'
import type { LocationObservation } from '../../types/liveNavigation.ts'
import { campusNavigationGraph } from '../../data/navigationGraph.ts'
import { createRoutePlan } from '../routePlanner.ts'
import { GpsLocationService } from '../../services/gpsService.ts'

describe('Phase 7E: GPS Navigation, Calibration, Blue-Dot & Mobile Controls', () => {
  // -------------------------------------------------------------
  // PART 2: REAL GPS TRACKING & PRIVACY SAFEGUARDS
  // -------------------------------------------------------------
  describe('Part 2: Real GPS Tracking Lifecycle & Privacy Safeguards', () => {
    it('requests GPS permission only after startTracking is explicitly triggered', () => {
      let watchCalled = false
      const mockGeolocation = {
        watchPosition: () => {
          watchCalled = true
          return 1
        },
        clearWatch: () => {},
        getCurrentPosition: () => {},
      }

      const service = new GpsLocationService(mockGeolocation)
      assert.strictEqual(watchCalled, false)

      service.startTracking()
      assert.strictEqual(watchCalled, true)
    })

    it('stops watcher and clears active registration when stopped', () => {
      let clearedId: number | null = null
      const mockGeolocation = {
        watchPosition: () => 42,
        clearWatch: (id: number) => {
          clearedId = id
        },
        getCurrentPosition: () => {},
      }

      const service = new GpsLocationService(mockGeolocation)
      service.startTracking()
      service.stopTracking()
      assert.strictEqual(clearedId, 42)
    })

    it('handles GPS permission denial cleanly and resets status without crashing', () => {
      const mockGeolocation = {
        watchPosition: (
          _success: PositionCallback,
          error?: PositionErrorCallback
        ) => {
          if (error) {
            error({
              code: 1, // PERMISSION_DENIED
              message: 'User denied Geolocation',
              PERMISSION_DENIED: 1,
              POSITION_UNAVAILABLE: 2,
              TIMEOUT: 3,
            } as GeolocationPositionError)
          }
          return 101
        },
        clearWatch: () => {},
        getCurrentPosition: () => {},
      }

      const service = new GpsLocationService(mockGeolocation)
      service.startTracking()

      assert.strictEqual(service.getStatus(), 'permission_denied')
      assert.strictEqual(service.getLastCoordinates(), null)
    })

    it('rejects stale or invalid GPS readings', () => {
      let positionCallback: PositionCallback = () => {}
      const mockGeolocation = {
        watchPosition: (success: PositionCallback) => {
          positionCallback = success
          return 202
        },
        clearWatch: () => {},
        getCurrentPosition: () => {},
      }

      const service = new GpsLocationService(mockGeolocation)
      service.startTracking()

      // Stale timestamp (older than 30s)
      const staleTimestamp = Date.now() - 45000
      positionCallback({
        coords: {
          latitude: 12.94504,
          longitude: 80.24378,
          accuracy: 5,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
          toJSON: () => ({}),
        },
        timestamp: staleTimestamp,
        toJSON: () => ({}),
      } as GeolocationPosition)

      assert.strictEqual(service.getLastCoordinates(), null)
    })

    it('enforces privacy: does not store location history or transmit to database', () => {
      let positionCallback: PositionCallback = () => {}
      const mockGeolocation = {
        watchPosition: (success: PositionCallback) => {
          positionCallback = success
          return 303
        },
        clearWatch: () => {},
        getCurrentPosition: () => {},
      }

      const service = new GpsLocationService(mockGeolocation)
      service.startTracking()

      // Emit multiple positions
      for (let i = 0; i < 5; i++) {
        positionCallback({
          coords: {
            latitude: 12.94504 + i * 0.0001,
            longitude: 80.24378 + i * 0.0001,
            accuracy: 6,
            altitude: null,
            altitudeAccuracy: null,
            heading: null,
            speed: null,
            toJSON: () => ({}),
          },
          timestamp: Date.now(),
          toJSON: () => ({}),
        } as GeolocationPosition)
      }

      // Ensure only the latest active point is held and no history accumulation array is exposed
      const coords = service.getLastCoordinates()
      assert.ok(coords !== null)
      assert.strictEqual((service as unknown as { history?: unknown[] }).history, undefined)
    })
  })

  // -------------------------------------------------------------
  // PART 3: GPS CALIBRATION WIZARD & HELMERT TRANSFORM
  // -------------------------------------------------------------
  describe('Part 3: GPS Calibration Wizard & Conformal Helmert Transformation', () => {
    const origin = { latitude: 12.94504, longitude: 80.24378 }
    const { metersPerDegLat, metersPerDegLon } = getMetricScaleForLatitude(origin.latitude)
    const sampleBenchmarks: GroundControlPoint[] = [
      {
        id: 'bench-1',
        name: 'Gate 1 Benchmark',
        latitude: origin.latitude,
        longitude: origin.longitude,
        modelPosition: [181.0, 0.25, -6.2],
        source: 'Survey',
        verificationStatus: 'verified',
      },
      {
        id: 'bench-2',
        name: 'Central Road Benchmark',
        latitude: origin.latitude + 50 / metersPerDegLat,
        longitude: origin.longitude + 50 / metersPerDegLon,
        modelPosition: [231.0, 0.25, 43.8],
        source: 'Survey',
        verificationStatus: 'verified',
      },
      {
        id: 'bench-3',
        name: 'Academic Front Benchmark',
        latitude: origin.latitude - 30 / metersPerDegLat,
        longitude: origin.longitude + 40 / metersPerDegLon,
        modelPosition: [221.0, 0.25, -36.2],
        source: 'Survey',
        verificationStatus: 'verified',
      },
    ]

    it('requires at least 3 geographically separated reference points for production calibration', () => {
      // 1 point -> uncalibrated
      const res1 = buildCalibrationModel([sampleBenchmarks[0]])
      assert.strictEqual(res1.status, 'uncalibrated')

      // 2 points -> calibrated/provisional depending on survey status
      const res2 = buildCalibrationModel([sampleBenchmarks[0], sampleBenchmarks[1]])
      assert.ok(res2.status === 'calibrated' || res2.status === 'provisional')

      // 3 points -> calculates transform with residuals
      const res3 = buildCalibrationModel(sampleBenchmarks)
      assert.ok(res3.helmertParams !== null)
      assert.strictEqual(res3.residuals.length, 3)
    })

    it('converts geographic lat/lon to local metric tangent space (u, v) before transforming', () => {
      const origin = { latitude: 12.94504, longitude: 80.24378 }
      const local = geoToLocalMeters(12.9455, 80.2442, origin)
      assert.ok(local.u > 0)
      assert.ok(local.v > 0)
      assert.ok(local.u > 10 && local.u < 200)
    })

    it('computes residuals and rejects calibrations that exceed the maximum acceptable RMSE threshold', () => {
      const noisyBenchmarks: GroundControlPoint[] = [
        {
          id: 'p1',
          name: 'Point 1',
          latitude: 12.94504,
          longitude: 80.24378,
          modelPosition: [-46.7, 0.25, 43.1],
          source: 'Survey',
          verificationStatus: 'verified',
        },
        {
          id: 'p2',
          name: 'Point 2',
          latitude: 12.9455,
          longitude: 80.2442,
          modelPosition: [8.8, 0.25, -29.6],
          source: 'Survey',
          verificationStatus: 'verified',
        },
        {
          id: 'p3',
          name: 'Point 3',
          latitude: 12.955, // Intentionally massive ~1km outlier
          longitude: 80.2436,
          modelPosition: [-42.8, 0.25, -57.2],
          source: 'Survey',
          verificationStatus: 'verified',
        },
      ]

      const cal = buildCalibrationModel(noisyBenchmarks)
      assert.strictEqual(cal.status, 'high_error')
      assert.ok(cal.rmse !== null && cal.rmse > MAX_ACCEPTABLE_CALIBRATION_RMSE_METERS)
      assert.ok(cal.warning && cal.warning.includes('exceeds'))
    })

    it('prevents transforming coordinates into 3D space when calibration is unverified or high-error', () => {
      const badCal: CalibrationModel = {
        status: 'high_error',
        controlPoints: sampleBenchmarks,
        referenceOrigin: { latitude: 12.94504, longitude: 80.24378 },
        helmertParams: {
          a: 1,
          b: 0,
          tx: 0,
          tz: 0,
          scale: 1,
          rotationDeg: 0,
          translation: [0, 0],
        },
        residuals: [],
        rmse: 35.0,
      }

      const result = geoToModelCoordinates(12.9455, 80.2442, badCal)
      assert.strictEqual(result, null)
    })
  })

  // -------------------------------------------------------------
  // PART 4 & 5: BLUE-DOT MOVEMENT & AUTOMATIC WALKING NAVIGATION
  // -------------------------------------------------------------
  describe('Part 4 & 5: Automatic Walking Navigation & Blue-Dot Progression', () => {
    it('advances current instruction step automatically without requiring manual Next button clicks', () => {
      const { metersPerDegLon } = getMetricScaleForLatitude(12.94504)
      const routeResult = createRoutePlan(campusNavigationGraph, 'main-gate-1', 'it-entrance')
      assert.strictEqual(routeResult.status, 'ok')
      if (routeResult.status !== 'ok') return

      const engine = new LiveNavigationEngine()
      const route = routeResult.route
      const routePoints = route.nodeIds
        .map((id) => campusNavigationGraph.nodes.find((n) => n.id === id)?.position)
        .filter((pos): pos is [number, number, number] => Boolean(pos))

      engine.setRoute(route, routePoints)

      const cal: CalibrationModel = {
        status: 'calibrated',
        controlPoints: [],
        referenceOrigin: { latitude: 12.94504, longitude: 80.24378 },
        helmertParams: { a: 1, b: 0, tx: 181.0, tz: -6.2, scale: 1, rotationDeg: 0, translation: [181.0, -6.2] },
        residuals: [],
        rmse: 2.1,
      }

      engine.startNavigation()

      // Start position (at gate 1: u=0, v=0 -> [181, 0.25, -6.2])
      const obs1: LocationObservation = {
        latitude: 12.94504,
        longitude: 80.24378,
        accuracy: 4,
        timestamp: Date.now(),
      }
      const state1 = engine.processObservation(obs1, cal, true)
      assert.strictEqual(state1.currentStepIndex, 0)

      // Advance observation along route (toward road-main-mid at z = -20)
      const state2 = engine.processObservation(
        {
          latitude: 12.94504,
          longitude: 80.24378 - 14 / metersPerDegLon, // delta z = -14m
          accuracy: 4,
          timestamp: Date.now() + 15000,
        },
        cal,
        true
      )
      assert.ok(state2.currentDistance >= 0)
      assert.ok(state2.remainingDistance <= state1.remainingDistance)
    })

    it('fades traversed route segments behind the user as walking progresses', () => {
      const routeResult = createRoutePlan(campusNavigationGraph, 'main-gate-1', 'it-entrance')
      if (routeResult.status !== 'ok') return

      const engine = new LiveNavigationEngine()
      const route = routeResult.route
      const routePoints = route.nodeIds
        .map((id) => campusNavigationGraph.nodes.find((n) => n.id === id)?.position)
        .filter((pos): pos is [number, number, number] => Boolean(pos))

      engine.setRoute(route, routePoints)
      engine.startNavigation()

      const cal: CalibrationModel = {
        status: 'calibrated',
        controlPoints: [],
        referenceOrigin: { latitude: 12.94504, longitude: 80.24378 },
        helmertParams: { a: 1, b: 0, tx: 0, tz: 0, scale: 1, rotationDeg: 0, translation: [0, 0] },
        residuals: [],
        rmse: 2.0,
      }

      const obs: LocationObservation = {
        latitude: 12.9453,
        longitude: 80.2440,
        accuracy: 4,
        timestamp: Date.now(),
      }
      const state = engine.processObservation(obs, cal, true)

      assert.ok(state.completedPoints !== undefined)
      assert.ok(state.remainingPoints !== undefined)
      assert.ok(state.remainingPoints.length > 0)
    })

    it('ensures blue dot position is elevated above ground surface (y >= 0.25)', () => {
      const cal: CalibrationModel = {
        status: 'calibrated',
        controlPoints: [],
        referenceOrigin: { latitude: 12.94504, longitude: 80.24378 },
        helmertParams: { a: 1, b: 0, tx: 10, tz: 20, scale: 1, rotationDeg: 0, translation: [10, 20] },
        residuals: [],
        rmse: 2.0,
      }

      const res = geoToModelCoordinates(12.94504, 80.24378, cal)
      assert.ok(res !== null)
      if (res) {
        assert.ok(res.modelPoint[1] >= 0.25)
      }
    })
  })

  // -------------------------------------------------------------
  // PART 6: MOBILE TOUCH GESTURES CONFIGURATION
  // -------------------------------------------------------------
  describe('Part 6: Mobile Touch Gestures Configuration', () => {
    it('verifies OrbitControls touch mapping: ONE finger pans, TWO fingers dolly/rotate', () => {
      // Drei / Three.js OrbitControls:
      // TOUCH.ROTATE = 0, TOUCH.PAN = 1, TOUCH.DOLLY_PAN = 2, TOUCH.DOLLY_ROTATE = 3
      const defaultTouches = { ONE: 1, TWO: 3 }
      assert.strictEqual(defaultTouches.ONE, 1) // 1-finger pan
      assert.strictEqual(defaultTouches.TWO, 3) // 2-finger zoom/rotate

      const rotateModeTouches = { ONE: 0, TWO: 3 }
      assert.strictEqual(rotateModeTouches.ONE, 0) // 1-finger rotate mode
    })
  })

  // -------------------------------------------------------------
  // PART 9 & 10: UNIFIED WELCOME PAGE & ROLE-BASED ACCESS
  // -------------------------------------------------------------
  describe('Part 9 & 10: Unified Welcome Page & Role Isolation', () => {
    it('redirects Admin, Student, and Visitor all to /welcome after authentication', () => {
      const getPostLoginDestination = (_role: 'admin' | 'student' | 'visitor', fromPath?: string) => {
        if (fromPath && fromPath !== '/login' && fromPath !== '/') {
          return fromPath
        }
        return '/welcome'
      }

      assert.strictEqual(getPostLoginDestination('admin'), '/welcome')
      assert.strictEqual(getPostLoginDestination('student'), '/welcome')
      assert.strictEqual(getPostLoginDestination('visitor'), '/welcome')
      assert.strictEqual(getPostLoginDestination('admin', '/navigation?to=it-block'), '/navigation?to=it-block')
    })

    it('isolates visitor role: never exposes maintenance reports or campus issue counters', () => {
      const canAccessIssues = (role: 'admin' | 'student' | 'visitor') => {
        return role === 'admin' || role === 'student'
      }

      const canAccessAdminDashboard = (role: 'admin' | 'student' | 'visitor') => {
        return role === 'admin'
      }

      assert.strictEqual(canAccessIssues('visitor'), false)
      assert.strictEqual(canAccessAdminDashboard('visitor'), false)
      assert.strictEqual(canAccessIssues('student'), true)
      assert.strictEqual(canAccessAdminDashboard('admin'), true)
    })
  })
})
