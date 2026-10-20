import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import {
  LiveNavigationEngine,
  projectPointOntoRoute,
  projectPointOntoSegment,
} from '../liveNavigationEngine.ts'
import { buildCalibrationModel, modelToGeoCoordinates } from '../campusCalibration.ts'
import {
  DEFAULT_CAMPUS_CONTROL_POINTS,
  TEST_MODE_CONTROL_POINTS,
} from '../../data/campusCalibrationData.ts'
import { NAVIGATION_SCENARIOS } from '../../data/navigationScenarios.ts'
import type { Point3, RoutePlan } from '../../types/navigation.ts'
import type { LocationObservation } from '../../types/liveNavigation.ts'

describe('Live Navigation Engine (Phase 4B)', () => {
  const testCalibration = buildCalibrationModel(TEST_MODE_CONTROL_POINTS)
  const defaultEmptyCalibration = buildCalibrationModel(DEFAULT_CAMPUS_CONTROL_POINTS)

  // Test Route: Gate 1 [181, 0.25, -6.2] -> Corner [195, 0.25, -45] -> IT Block [211.5, 0.25, -92]
  const mockRoutePoints: Point3[] = [
    [181.0, 0.25, -6.2],
    [195.0, 0.25, -45.0],
    [211.5, 0.25, -92.0],
  ]

  const mockRoutePlan: RoutePlan = {
    nodeIds: ['main-gate-1', 'path-corner-1', 'it-block'],
    verificationStatus: 'verified',
    hasVerifiedPath: true,
    notes: ['Test pathway'],
    totalCost: 92.5,
    steps: [
      {
        nodeId: 'main-gate-1',
        title: 'Start at Main Entrance (Gate 1)',
        notes: 'Walk south-east along the primary avenue.',
        verificationStatus: 'verified',
      },
      {
        nodeId: 'path-corner-1',
        title: 'Turn right towards IT Block',
        notes: 'Follow the concrete walkway toward IT department.',
        verificationStatus: 'verified',
      },
      {
        nodeId: 'it-block',
        title: 'Arrive at IT Block',
        notes: 'Destination entrance is on the right.',
        verificationStatus: 'verified',
      },
    ],
  }

  let engine: LiveNavigationEngine

  beforeEach(() => {
    engine = new LiveNavigationEngine()
    engine.setRoute(mockRoutePlan, mockRoutePoints)
    engine.startNavigation()
  })

  describe('Geometric Polyline Projection', () => {
    it('correctly projects point onto a segment', () => {
      const a: Point3 = [0, 0, 0]
      const b: Point3 = [10, 0, 0]
      const p: Point3 = [5, 0, 3]

      const proj = projectPointOntoSegment(p, a, b)
      assert.equal(proj.closest[0], 5)
      assert.equal(proj.closest[2], 0)
      assert.equal(proj.distance, 3)
      assert.equal(proj.segmentFraction, 0.5)
    })

    it('correctly projects point onto multi-segment route polyline', () => {
      const cumDist = [0, 41.2, 92.5]
      // Point near first segment at 20m along route
      const p1: Point3 = [188.0, 0.25, -25.6]
      const proj = projectPointOntoRoute(p1, mockRoutePoints, cumDist)

      assert.ok(proj.crossTrackDistance < 2.0)
      assert.ok(proj.progressDistance > 18.0 && proj.progressDistance < 24.0)
    })
  })

  describe('Observation Processing & Progress Calculation', () => {
    it('advances progress smoothly when fed valid sequential observations', () => {
      const scenario = NAVIGATION_SCENARIOS.find((s) => s.id === 'walk_main_gate_to_it')!
      assert.ok(scenario.observations.length > 5)

      let lastDist = -1
      for (const obs of scenario.observations) {
        const state = engine.processObservation(obs, testCalibration, true)
        assert.ok(state.currentDistance >= lastDist, 'Progress should be non-decreasing')
        lastDist = state.currentDistance
      }

      assert.ok(lastDist > 80.0, 'Final progress should approach end of route')
    })

    it('prevents backward progress caused by normal GPS jitter (monotonic clamping)', () => {
      // Progress to ~20m
      const basePoint: Point3 = [188.0, 0.25, -25.6]
      const geo1 = modelToGeoCoordinates(basePoint, testCalibration)!
      const state1 = engine.processObservation(
        { latitude: geo1.latitude, longitude: geo1.longitude, accuracy: 5, timestamp: 1000 },
        testCalibration,
        true
      )
      const initialProgress = state1.currentDistance
      assert.ok(initialProgress > 15)

      // Inject small backward jitter: point 3m behind previous location
      const jitterPoint: Point3 = [186.5, 0.25, -22.0]
      const geo2 = modelToGeoCoordinates(jitterPoint, testCalibration)!
      const state2 = engine.processObservation(
        { latitude: geo2.latitude, longitude: geo2.longitude, accuracy: 5, timestamp: 2000 },
        testCalibration,
        true
      )

      // Jitter tolerance must hold the progress at initialProgress without pulling user backward
      assert.equal(state2.currentDistance, initialProgress)
    })

    it('rejects low-accuracy readings (>30m) without updating progress', () => {
      const basePoint: Point3 = [188.0, 0.25, -25.6]
      const geo = modelToGeoCoordinates(basePoint, testCalibration)!

      const state1 = engine.processObservation(
        { latitude: geo.latitude, longitude: geo.longitude, accuracy: 6, timestamp: 1000 },
        testCalibration,
        true
      )
      const progressBefore = state1.currentDistance

      // Inject low accuracy fix (55m)
      const badObs: LocationObservation = {
        latitude: geo.latitude + 0.0001,
        longitude: geo.longitude + 0.0001,
        accuracy: 55,
        timestamp: 2000,
      }
      const state2 = engine.processObservation(badObs, testCalibration, true)

      assert.equal(state2.status, 'accuracy_insufficient')
      assert.equal(state2.confidence, 'uncertain')
      assert.equal(state2.currentDistance, progressBefore)
    })

    it('rejects implausible speed jumps (>8 m/s walking speed)', () => {
      const p1: Point3 = [181.0, 0.25, -6.2]
      const geo1 = modelToGeoCoordinates(p1, testCalibration)!

      engine.processObservation(
        { latitude: geo1.latitude, longitude: geo1.longitude, accuracy: 5, timestamp: 1000 },
        testCalibration,
        true
      )

      // Teleport 60m away in just 1 second (60 m/s >> 8 m/s)
      const pJump: Point3 = [181.0 + 50, 0.25, -6.2 - 30]
      const geoJump = modelToGeoCoordinates(pJump, testCalibration)!

      const stateJump = engine.processObservation(
        { latitude: geoJump.latitude, longitude: geoJump.longitude, accuracy: 5, timestamp: 2000 },
        testCalibration,
        true
      )

      assert.ok(stateJump.userMessage.includes('Implausible movement detected'))
      assert.equal(stateJump.confidence, 'low')
    })

    it('rejects stale timestamps', () => {
      const p1: Point3 = [181.0, 0.25, -6.2]
      const geo1 = modelToGeoCoordinates(p1, testCalibration)!

      engine.processObservation(
        { latitude: geo1.latitude, longitude: geo1.longitude, accuracy: 5, timestamp: 5000 },
        testCalibration,
        true
      )

      // Fix with earlier timestamp
      const stateStale = engine.processObservation(
        { latitude: geo1.latitude, longitude: geo1.longitude, accuracy: 5, timestamp: 3000 },
        testCalibration,
        true
      )

      assert.ok(stateStale.userMessage.includes('Stale GPS timestamp ignored'))
    })
  })

  describe('Turn Guidance & Arrival Detection', () => {
    it('detects upcoming turn when within proximity threshold', () => {
      // Approach corner [195, 0.25, -45] within 8m
      const nearTurn: Point3 = [193.0, 0.25, -40.0]
      const geo = modelToGeoCoordinates(nearTurn, testCalibration)!

      const state = engine.processObservation(
        { latitude: geo.latitude, longitude: geo.longitude, accuracy: 5, timestamp: 1000 },
        testCalibration,
        true
      )

      assert.equal(state.isApproachingTurn, true)
      assert.ok(state.distanceToNextTurn <= 12)
    })

    it('confirms destination arrival when within arrival threshold', () => {
      // Close to destination IT Block [211.5, 0.25, -92]
      const nearDest: Point3 = [211.0, 0.25, -91.0]
      const geo = modelToGeoCoordinates(nearDest, testCalibration)!

      const state = engine.processObservation(
        { latitude: geo.latitude, longitude: geo.longitude, accuracy: 5, timestamp: 1000 },
        testCalibration,
        true
      )

      assert.equal(state.isArrived, true)
      assert.equal(state.status, 'arrived')
      assert.ok(state.userMessage.includes('arrived at your destination'))
    })
  })

  describe('Off-Route Detection without False Snapping', () => {
    it('detects off-route deviation and shows raw location without false walkway snapping', () => {
      // Deviate 25m perpendicular to route
      const offRoutePt: Point3 = [155.0, 0.25, -25.0]
      const geo = modelToGeoCoordinates(offRoutePt, testCalibration)!

      const state = engine.processObservation(
        { latitude: geo.latitude, longitude: geo.longitude, accuracy: 5, timestamp: 1000 },
        testCalibration,
        true
      )

      assert.equal(state.isOffRoute, true)
      assert.equal(state.confidence, 'off_route')
      // Crucial requirement: displayPosition MUST equal rawModelPosition when off route!
      assert.deepEqual(state.displayPosition, state.rawModelPosition)
    })
  })

  describe('Signal Loss and Recovery', () => {
    it('detects signal loss after 8 seconds without fixes and recovers when fixes resume', () => {
      const p1: Point3 = [181.0, 0.25, -6.2]
      const geo1 = modelToGeoCoordinates(p1, testCalibration)!

      engine.processObservation(
        { latitude: geo1.latitude, longitude: geo1.longitude, accuracy: 5, timestamp: 1000 },
        testCalibration,
        true
      )

      // Fast-forward time by 10 seconds without new observations
      const lostState = engine.checkSignalTimeout(11000, true)
      assert.ok(lostState !== null)
      assert.equal(lostState?.status, 'signal_lost')
      assert.equal(lostState?.signalStatus, 'lost')

      // Fix resumes
      const resumeState = engine.processObservation(
        { latitude: geo1.latitude, longitude: geo1.longitude, accuracy: 5, timestamp: 12000 },
        testCalibration,
        true
      )
      assert.equal(resumeState.signalStatus, 'healthy')
    })
  })

  describe('Safety Separation for Real GPS', () => {
    it('locks outdoor blue-dot navigation when real GPS is uncalibrated', () => {
      const realObs: LocationObservation = {
        latitude: 12.94504,
        longitude: 80.24378,
        accuracy: 8,
        timestamp: 1000,
      }

      // Live GPS (!isSimulated) with empty default production calibration
      const state = engine.processObservation(realObs, defaultEmptyCalibration, false)

      assert.equal(state.rawModelPosition, null)
      assert.equal(state.displayPosition, null)
      assert.ok(state.userMessage.includes('Campus map calibration pending'))
    })
  })

  describe('Lifecycle Controls & Reset', () => {
    it('supports pause, resume, and clean stop reset', () => {
      engine.pauseNavigation()
      const p1: Point3 = [181.0, 0.25, -6.2]
      const geo1 = modelToGeoCoordinates(p1, testCalibration)!

      const statePaused = engine.processObservation(
        { latitude: geo1.latitude, longitude: geo1.longitude, accuracy: 5, timestamp: 1000 },
        testCalibration,
        true
      )
      assert.equal(statePaused.status, 'paused')

      engine.resumeNavigation()
      const stateResumed = engine.processObservation(
        { latitude: geo1.latitude, longitude: geo1.longitude, accuracy: 5, timestamp: 2000 },
        testCalibration,
        true
      )
      assert.equal(stateResumed.status, 'navigating')

      engine.stopNavigation()
      assert.equal(stateResumed.isNavigating, true)
    })
  })
})
