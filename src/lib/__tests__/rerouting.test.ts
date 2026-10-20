import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import type { NavigationEdge, NavigationGraph, NavigationNode, Point3, RoutePlan } from '../../types/navigation.ts'
import type { LocationObservation } from '../../types/liveNavigation.ts'
import { LiveNavigationEngine } from '../liveNavigationEngine.ts'
import { OffRouteDetector } from '../offRouteDetector.ts'
import { findValidReroute } from '../routeRerouter.ts'
import { TEST_MODE_CONTROL_POINTS } from '../../data/campusCalibrationData.ts'
import { buildCalibrationModel, modelToGeoCoordinates } from '../campusCalibration.ts'

const testCalibration = buildCalibrationModel(TEST_MODE_CONTROL_POINTS)

function createObs(
  modelPoint: Point3,
  timeOffsetMs: number,
  accuracy: number = 6,
  speed: number = 1.3,
  heading: number = 90
): LocationObservation {
  const geo = modelToGeoCoordinates(modelPoint, testCalibration)
  return {
    latitude: geo ? Number(geo.latitude.toFixed(6)) : 12.94504,
    longitude: geo ? Number(geo.longitude.toFixed(6)) : 80.24378,
    accuracy,
    timestamp: 1700000000000 + timeOffsetMs,
    speed,
    heading,
  }
}

// Campus Test Graph based directly on the MNMJEC campus model layout
const testCampusNodes: NavigationNode[] = [
  { id: 'main-gate-1', label: 'Main Entrance (Gate 1)', position: [181.0, 0.2, -6.2], verificationStatus: 'verified', kind: 'start', sourceObjectName: 'TestMesh' },
  { id: 'road-main-mid', label: 'Main Entrance Avenue', position: [180.2, 0.093, -20.0], verificationStatus: 'verified', kind: 'waypoint', sourceObjectName: 'TestMesh' },
  { id: 'road-main-academic-junction', label: 'Academic Junction', position: [180.2, 0.093, -38.6], verificationStatus: 'verified', kind: 'waypoint', sourceObjectName: 'TestMesh' },
  { id: 'road-front-main', label: 'Main Block Front Road', position: [193.7, 0.093, -38.6], verificationStatus: 'verified', kind: 'waypoint', sourceObjectName: 'TestMesh' },
  { id: 'road-front-first-year', label: 'First Year Front Road', position: [166.5, 0.093, -38.6], verificationStatus: 'verified', kind: 'waypoint', sourceObjectName: 'TestMesh' },
  { id: 'road-front-civil', label: 'Civil Block Front Road', position: [145.2, 0.093, -38.6], verificationStatus: 'verified', kind: 'waypoint', sourceObjectName: 'TestMesh' },
  { id: 'road-front-bend', label: 'Academic Road Bend', position: [124.0, 0.093, -38.6], verificationStatus: 'verified', kind: 'waypoint', sourceObjectName: 'TestMesh' },
  { id: 'road-central-departments-junction', label: 'Departments Junction', position: [113.4, 0.093, -42.8], verificationStatus: 'verified', kind: 'waypoint', sourceObjectName: 'TestMesh' },
  { id: 'it-entrance', label: 'IT Block', position: [96.8, 0.2, -45.8], verificationStatus: 'verified', kind: 'destination', sourceObjectName: 'TestMesh' },
  { id: 'road-south-plaza-main', label: 'Main Entrance Plaza', position: [180.2, 0.093, 2.0], verificationStatus: 'verified', kind: 'waypoint', sourceObjectName: 'TestMesh' },
  { id: 'road-south-plaza-canteen', label: 'Canteen Front Plaza', position: [37.4, 0.093, 2.0], verificationStatus: 'verified', kind: 'waypoint', sourceObjectName: 'TestMesh' },
]

function edge(id: string, from: string, to: string, cost: number): NavigationEdge {
  return { id, from, to, cost, verificationStatus: 'verified', sourceObjectName: 'TestMesh' }
}

const testCampusEdges: NavigationEdge[] = [
  edge('e-gate-mid', 'main-gate-1', 'road-main-mid', 14.0),
  edge('e-mid-junc', 'road-main-mid', 'road-main-academic-junction', 18.6),
  edge('e-junc-main', 'road-main-academic-junction', 'road-front-main', 13.5),
  edge('e-junc-fy', 'road-main-academic-junction', 'road-front-first-year', 13.7),
  edge('e-fy-civil', 'road-front-first-year', 'road-front-civil', 21.3),
  edge('e-civil-bend', 'road-front-civil', 'road-front-bend', 21.2),
  edge('e-bend-dept', 'road-front-bend', 'road-central-departments-junction', 11.4),
  edge('e-dept-it', 'road-central-departments-junction', 'it-entrance', 16.8),
  edge('e-gate-south', 'main-gate-1', 'road-south-plaza-main', 8.2),
  edge('e-south-canteen', 'road-south-plaza-main', 'road-south-plaza-canteen', 142.8),
  edge('e-canteen-dept', 'road-south-plaza-canteen', 'road-central-departments-junction', 87.5),
]

const testCampusGraph: NavigationGraph = {
  nodes: testCampusNodes,
  edges: testCampusEdges,
}

// Sample baseline route: Main Gate 1 -> road-main-academic-junction -> road-front-first-year -> it-entrance
const baselineRoutePoints: Point3[] = [
  [181.0, 0.2, -6.2],   // main-gate-1
  [180.2, 0.1, -20.0],  // road-main-mid
  [180.2, 0.1, -38.6],  // road-main-academic-junction
  [166.5, 0.1, -38.6],  // road-front-first-year
  [145.2, 0.1, -38.6],  // road-front-civil
  [124.0, 0.1, -38.6],  // road-front-bend
  [113.4, 0.1, -42.8],  // road-central-departments-junction
  [96.8, 0.2, -45.8],   // it-entrance
]

const sampleRoutePlan: RoutePlan = {
  nodeIds: [
    'main-gate-1',
    'road-main-mid',
    'road-main-academic-junction',
    'road-front-first-year',
    'road-front-civil',
    'road-front-bend',
    'road-central-departments-junction',
    'it-entrance',
  ],
  steps: [
    { nodeId: 'main-gate-1', title: 'Start at Main Entrance (Gate 1)', verificationStatus: 'verified' },
    { nodeId: 'road-main-mid', title: 'Continue along Main Entrance Avenue', verificationStatus: 'verified' },
    { nodeId: 'road-main-academic-junction', title: 'Turn left at Academic Junction', verificationStatus: 'verified' },
    { nodeId: 'road-front-first-year', title: 'Continue past First Year Block', verificationStatus: 'verified' },
    { nodeId: 'road-front-civil', title: 'Continue past Civil Block', verificationStatus: 'verified' },
    { nodeId: 'road-front-bend', title: 'Follow curving road westward', verificationStatus: 'verified' },
    { nodeId: 'road-central-departments-junction', title: 'Turn towards Departments Walkway', verificationStatus: 'verified' },
    { nodeId: 'it-entrance', title: 'Arrive at IT Block', verificationStatus: 'verified' },
  ],
  verificationStatus: 'verified',
  hasVerifiedPath: true,
  notes: [],
  totalCost: 110.5,
}

describe('Intelligent Off-Route State Machine & Automatic Rerouting (Phase 4C)', () => {
  describe('OffRouteDetector Hysteresis & Accuracy Scaling', () => {
    it('treats a single lateral deviation as diverging and does not confirm off-route', () => {
      const detector = new OffRouteDetector()
      const obs = createObs([150.0, 0.2, -20.0], 0, 5.0, 1.3)
      const projection = {
        segmentIndex: 1,
        progressDistance: 20,
        crossTrackDistance: 25.0, // > 18m threshold
        projectedPoint: [180.2, 0.1, -20.0] as Point3,
        rawModelPoint: [150.0, 0.2, -20.0] as Point3,
      }
      const config = {
        maxAcceptableAccuracyMeters: 30,
        maxPlausibleSpeedMps: 8,
        offRouteThresholdMeters: 18,
        snapToRouteThresholdMeters: 7,
        turnProximityThresholdMeters: 12,
        arrivalThresholdMeters: 7,
        jitterBackwardToleranceMeters: 4,
        signalLossTimeoutMs: 8000,
        consecutiveOffRouteThreshold: 3,
        recoveryConsecutiveThreshold: 2,
        minDeviationDurationMs: 2500,
        rerouteSearchRadiusMeters: 40,
        stationarySpeedThresholdMps: 0.4,
        enableAutoReroute: true,
      }

      const result = detector.evaluateObservation(obs, [150.0, 0.2, -20.0], projection, config)
      assert.equal(result.status, 'diverging')
      assert.equal(result.isConfirmed, false)
      assert.equal(result.consecutiveOffRouteCount, 1)
    })

    it('confirms off-route only after 3 consecutive observations spanning >= 2500ms', () => {
      const detector = new OffRouteDetector()
      const config = {
        maxAcceptableAccuracyMeters: 30,
        maxPlausibleSpeedMps: 8,
        offRouteThresholdMeters: 18,
        snapToRouteThresholdMeters: 7,
        turnProximityThresholdMeters: 12,
        arrivalThresholdMeters: 7,
        jitterBackwardToleranceMeters: 4,
        signalLossTimeoutMs: 8000,
        consecutiveOffRouteThreshold: 3,
        recoveryConsecutiveThreshold: 2,
        minDeviationDurationMs: 2500,
        rerouteSearchRadiusMeters: 40,
        stationarySpeedThresholdMps: 0.4,
        enableAutoReroute: true,
      }

      const p1: Point3 = [150.0, 0.2, -20.0]
      const proj = {
        segmentIndex: 1,
        progressDistance: 20,
        crossTrackDistance: 25.0,
        projectedPoint: [180.2, 0.1, -20.0] as Point3,
        rawModelPoint: p1,
      }

      // Observation 1 (t = 0ms)
      const r1 = detector.evaluateObservation(createObs(p1, 0), p1, proj, config)
      assert.equal(r1.status, 'diverging')
      assert.equal(r1.isConfirmed, false)

      // Observation 2 (t = 1500ms)
      const r2 = detector.evaluateObservation(createObs(p1, 1500), p1, proj, config)
      assert.equal(r2.status, 'diverging')
      assert.equal(r2.isConfirmed, false)

      // Observation 3 (t = 3000ms -> duration = 3000ms >= 2500ms & count = 3)
      const r3 = detector.evaluateObservation(createObs(p1, 3000), p1, proj, config)
      assert.equal(r3.status, 'confirmed_off_route')
      assert.equal(r3.isConfirmed, true)
    })

    it('expands off-route threshold dynamically when GPS accuracy degrades', () => {
      const detector = new OffRouteDetector()
      const config = {
        maxAcceptableAccuracyMeters: 30,
        maxPlausibleSpeedMps: 8,
        offRouteThresholdMeters: 18,
        snapToRouteThresholdMeters: 7,
        turnProximityThresholdMeters: 12,
        arrivalThresholdMeters: 7,
        jitterBackwardToleranceMeters: 4,
        signalLossTimeoutMs: 8000,
        consecutiveOffRouteThreshold: 3,
        recoveryConsecutiveThreshold: 2,
        minDeviationDurationMs: 2500,
        rerouteSearchRadiusMeters: 40,
        stationarySpeedThresholdMps: 0.4,
        enableAutoReroute: true,
      }

      // Accuracy is ±24m -> effectiveThreshold = max(18, 24 * 1.15) = 27.6m
      // Cross-track distance is 22m -> should NOT trigger off-route under degraded satellite conditions!
      const p: Point3 = [160.0, 0.2, -20.0]
      const proj = {
        segmentIndex: 1,
        progressDistance: 20,
        crossTrackDistance: 22.0,
        projectedPoint: [180.2, 0.1, -20.0] as Point3,
        rawModelPoint: p,
      }

      const res = detector.evaluateObservation(createObs(p, 0, 24.0), p, proj, config)
      assert.equal(res.status, 'on_route')
      assert.equal(res.consecutiveOffRouteCount, 0)
      assert.ok(res.effectiveThreshold > 25)
    })

    it('protects against stationary GPS jitter without incrementing off-route counter', () => {
      const detector = new OffRouteDetector()
      const config = {
        maxAcceptableAccuracyMeters: 30,
        maxPlausibleSpeedMps: 8,
        offRouteThresholdMeters: 18,
        snapToRouteThresholdMeters: 7,
        turnProximityThresholdMeters: 12,
        arrivalThresholdMeters: 7,
        jitterBackwardToleranceMeters: 4,
        signalLossTimeoutMs: 8000,
        consecutiveOffRouteThreshold: 3,
        recoveryConsecutiveThreshold: 2,
        minDeviationDurationMs: 2500,
        rerouteSearchRadiusMeters: 40,
        stationarySpeedThresholdMps: 0.4,
        enableAutoReroute: true,
      }

      const p: Point3 = [155.0, 0.2, -20.0]
      const proj = {
        segmentIndex: 1,
        progressDistance: 20,
        crossTrackDistance: 25.0,
        projectedPoint: [180.2, 0.1, -20.0] as Point3,
        rawModelPoint: p,
      }

      // Speed is 0.1 m/s (stationary)
      const res = detector.evaluateObservation(createObs(p, 0, 6.0, 0.1), p, proj, config)
      assert.equal(res.isStationary, true)
      assert.equal(res.consecutiveOffRouteCount, 0)
      assert.equal(res.isConfirmed, false)
    })

    it('recovers cleanly to on_route when user returns to walkway without rerouting', () => {
      const detector = new OffRouteDetector()
      const config = {
        maxAcceptableAccuracyMeters: 30,
        maxPlausibleSpeedMps: 8,
        offRouteThresholdMeters: 18,
        snapToRouteThresholdMeters: 7,
        turnProximityThresholdMeters: 12,
        arrivalThresholdMeters: 7,
        jitterBackwardToleranceMeters: 4,
        signalLossTimeoutMs: 8000,
        consecutiveOffRouteThreshold: 3,
        recoveryConsecutiveThreshold: 2,
        minDeviationDurationMs: 2500,
        rerouteSearchRadiusMeters: 40,
        stationarySpeedThresholdMps: 0.4,
        enableAutoReroute: true,
      }

      const offPt: Point3 = [150.0, 0.2, -20.0]
      const onPt1: Point3 = [180.2, 0.1, -22.0]
      const onPt2: Point3 = [180.2, 0.1, -25.0]

      // Step 1 off route
      detector.evaluateObservation(createObs(offPt, 0, 5.0, 1.3), offPt, {
        segmentIndex: 1,
        progressDistance: 20,
        crossTrackDistance: 25.0,
        projectedPoint: [180.2, 0.1, -20.0],
        rawModelPoint: offPt,
      }, config)

      // Step 2 back near route (crossTrack = 4m <= 7m snap threshold)
      const rec1 = detector.evaluateObservation(createObs(onPt1, 2000, 5.0, 1.3), onPt1, {
        segmentIndex: 1,
        progressDistance: 22,
        crossTrackDistance: 4.0,
        projectedPoint: [180.2, 0.1, -22.0],
        rawModelPoint: onPt1,
      }, config)
      assert.equal(rec1.status, 'recovering')

      // Step 3 second observation on route
      const rec2 = detector.evaluateObservation(createObs(onPt2, 4000, 5.0, 1.3), onPt2, {
        segmentIndex: 1,
        progressDistance: 25,
        crossTrackDistance: 3.0,
        projectedPoint: [180.2, 0.1, -25.0],
        rawModelPoint: onPt2,
      }, config)
      assert.equal(rec2.status, 'on_route')
    })
  })

  describe('Rerouting Origin Selection & Building Collision Avoidance', () => {
    it('identifies nearest obstacle-free entrance node and validates candidate route', () => {
      // User is at X=193.0, Z=-38.6 (Academic front road near Main Block)
      const userPos: Point3 = [193.0, 0.1, -38.6]
      const result = findValidReroute({
        userModelPoint: userPos,
        destinationNodeId: 'it-entrance',
        graph: testCampusGraph,
        searchRadiusMeters: 40,
      })

      assert.equal(result.success, true)
      if (result.success) {
        assert.ok(result.entryNode.id === 'road-front-main' || result.entryNode.id === 'road-main-academic-junction')
        assert.ok(result.routePlan.nodeIds.includes('it-entrance'))
        assert.ok(result.routePoints.length >= 2)
      }
    })

    it('rejects candidate nodes when direct connection penetrates a building obstacle', () => {
      // Inside Mechanical block footprint [27.4, 86.4, -86.4, -66.2]
      // Attempting to route out through building walls to an outside road node
      const blockedPos: Point3 = [55.0, 0.25, -78.0]
      const result = findValidReroute({
        userModelPoint: blockedPos,
        destinationNodeId: 'it-entrance',
        graph: testCampusGraph,
        searchRadiusMeters: 40,
      })

      assert.equal(result.success, false)
      if (!result.success) {
        assert.ok(
          result.reason === 'obstacle_blocking_all_nodes' ||
          result.reason === 'no_nearby_nodes' ||
          result.reason === 'no_connected_path'
        )
      }
    })

    it('preserves the original destination after automatic rerouting', () => {
      const userPos: Point3 = [180.2, 0.1, 2.0] // South Plaza
      const result = findValidReroute({
        userModelPoint: userPos,
        destinationNodeId: 'it-entrance',
        graph: testCampusGraph,
        searchRadiusMeters: 40,
      })

      assert.equal(result.success, true)
      if (result.success) {
        const lastNode = result.routePlan.nodeIds[result.routePlan.nodeIds.length - 1]
        assert.equal(lastNode, 'it-entrance')
      }
    })
  })

  describe('LiveNavigationEngine Phase 4C End-to-End Rerouting', () => {
    it('executes full wrong-turn rerouting workflow and resets progress to 0% on new route', () => {
      const engine = new LiveNavigationEngine({ enableAutoReroute: true })
      engine.setGraph(testCampusGraph, 'it-entrance')
      engine.setRoute(sampleRoutePlan, baselineRoutePoints)
      engine.startNavigation()

      // User reaches junction
      const obs1 = createObs([180.2, 0.1, -38.6], 0, 5.0, 1.3)
      const s1 = engine.processObservation(obs1, testCalibration, true)
      assert.equal(s1.status, 'navigating')
      assert.ok(s1.currentDistance > 0)

      // User takes wrong turn east: walking progressively eastward along road-front-main
      // Reading 1: X=190.0 (near junction)
      const sWrong1 = engine.processObservation(createObs([190.0, 0.1, -38.6], 7000, 5.0, 1.3), testCalibration, true)
      assert.equal(sWrong1.status, 'navigating') // Within corridor

      // Reading 2: X=200.0 (20m off route to IT, diverging, count 1)
      const sWrong2 = engine.processObservation(createObs([200.0, 0.1, -38.6], 15000, 5.0, 1.3), testCalibration, true)
      assert.equal(sWrong2.status, 'off_route')
      assert.equal(sWrong2.isOffRoute, true)

      // Reading 3: X=204.0 (24m off route, diverging, count 2)
      const sWrong3 = engine.processObservation(createObs([204.0, 0.1, -38.6], 18000, 5.0, 1.3), testCalibration, true)
      assert.equal(sWrong3.status, 'off_route')
      assert.equal(sWrong3.isOffRoute, true)

      // Reading 4: X=208.0 (28m off route, count 3, duration 6000ms >= 2500ms -> confirms deviation and triggers reroute!)
      const sReroute = engine.processObservation(createObs([208.0, 0.1, -38.6], 21000, 5.0, 1.3), testCalibration, true)
      assert.equal(sReroute.status, 'rerouted')
      assert.equal(engine.getRerouteCount(), 1)
      assert.ok(sReroute.userMessage.includes('Route recalculated'))
      assert.equal(sReroute.currentDistance, 0) // Progress resets cleanly on new route
      assert.ok(sReroute.previousCompletedPoints.length > 0) // Past traversed path preserved
    })

    it('supports repeated rerouting attempts stably across multiple deviations', () => {
      const engine = new LiveNavigationEngine({ enableAutoReroute: true })
      engine.setGraph(testCampusGraph, 'it-entrance')
      engine.setRoute(sampleRoutePlan, baselineRoutePoints)
      engine.startNavigation()

      // First deviation eastward: reach X=208.0, Z=-38.6 (3 consecutive off-route observations)
      engine.processObservation(createObs([180.2, 0.1, -38.6], 0, 5.0, 1.3), testCalibration, true)
      engine.processObservation(createObs([195.0, 0.1, -38.6], 11000, 5.0, 1.3), testCalibration, true)
      engine.processObservation(createObs([200.0, 0.1, -38.6], 15000, 5.0, 1.3), testCalibration, true) // count 1
      engine.processObservation(createObs([204.0, 0.1, -38.6], 18000, 5.0, 1.3), testCalibration, true) // count 2
      const r1 = engine.processObservation(createObs([208.0, 0.1, -38.6], 21000, 5.0, 1.3), testCalibration, true) // count 3 -> reroute 1
      assert.equal(r1.status, 'rerouted')
      assert.equal(engine.getRerouteCount(), 1)

      // Second deviation: user walks south toward south plaza (3 consecutive off-route observations from new route)
      engine.processObservation(createObs([190.0, 0.1, -20.0], 35000, 5.0, 1.3), testCalibration, true) // count 1
      engine.processObservation(createObs([180.2, 0.1, 0.0], 50000, 5.0, 1.3), testCalibration, true) // count 2
      const r2 = engine.processObservation(createObs([150.0, 0.1, 2.0], 72000, 5.0, 1.3), testCalibration, true) // count 3 -> reroute 2
      assert.equal(r2.status, 'rerouted')
      assert.equal(engine.getRerouteCount(), 2)
    })

    it('confirms destination arrival after rerouting when user follows the new path', () => {
      const engine = new LiveNavigationEngine({ enableAutoReroute: true })
      engine.setGraph(testCampusGraph, 'it-entrance')
      engine.setRoute(sampleRoutePlan, baselineRoutePoints)
      engine.startNavigation()

      // Trigger reroute at junction (3 consecutive off-route observations)
      engine.processObservation(createObs([180.2, 0.1, -38.6], 0, 5.0, 1.3), testCalibration, true)
      engine.processObservation(createObs([195.0, 0.1, -38.6], 11000, 5.0, 1.3), testCalibration, true)
      engine.processObservation(createObs([200.0, 0.1, -38.6], 15000, 5.0, 1.3), testCalibration, true) // count 1
      engine.processObservation(createObs([204.0, 0.1, -38.6], 18000, 5.0, 1.3), testCalibration, true) // count 2
      const rerouted = engine.processObservation(createObs([208.0, 0.1, -38.6], 21000, 5.0, 1.3), testCalibration, true) // count 3 -> reroute
      assert.equal(rerouted.status, 'rerouted')

      // User now walks westward along the recalculated route to IT Block entrance [96.8, 0.2, -45.8]
      engine.processObservation(createObs([180.2, 0.1, -38.6], 35000, 5.0, 1.3), testCalibration, true)
      engine.processObservation(createObs([145.2, 0.1, -38.6], 60000, 5.0, 1.3), testCalibration, true)
      engine.processObservation(createObs([113.4, 0.1, -42.8], 85000, 5.0, 1.3), testCalibration, true)

      // Arrives at IT Block entrance anchor
      const arrivedPt: Point3 = [96.8, 0.2, -45.8]
      const finalState = engine.processObservation(createObs(arrivedPt, 98000, 5.0, 1.3), testCalibration, true)

      assert.equal(finalState.status, 'arrived')
      assert.equal(finalState.isArrived, true)
      assert.ok(finalState.userMessage.includes('arrived at your destination'))
    })

    it('enforces safety guardrail: real GPS disables live outdoor rerouting when uncalibrated', () => {
      const engine = new LiveNavigationEngine({ enableAutoReroute: true })
      engine.setGraph(testCampusGraph, 'it-entrance')
      engine.setRoute(sampleRoutePlan, baselineRoutePoints)
      engine.startNavigation()

      // Real GPS mode (!isSimulated) with provisional/uncalibrated model
      const provisionalCal = { ...testCalibration, status: 'provisional' as const }
      const obs = createObs([193.0, 0.1, -38.6], 0)
      const state = engine.processObservation(obs, provisionalCal, false)

      assert.equal(state.status, 'idle')
      assert.equal(state.displayPosition, null)
      assert.equal(state.confidence, 'uncertain')
      assert.ok(state.userMessage.includes('Real outdoor GPS navigation is locked'))
      assert.equal(engine.getRerouteCount(), 0) // No reroute executed
    })
  })
})
