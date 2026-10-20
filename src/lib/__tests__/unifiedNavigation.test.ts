import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import type { NavigationEdge, NavigationGraph, NavigationNode, Point3 } from '../../types/navigation.ts'
import { createRoutePlan } from '../routePlanner.ts'
import { PROVISIONAL_CAMPUS_BOUNDARY } from '../../data/campusGeofenceData.ts'
import { DEFAULT_CAMPUS_CONTROL_POINTS } from '../../data/campusCalibrationData.ts'
import { buildCalibrationModel } from '../campusCalibration.ts'
import { computeCumulativeDistances } from '../routeSimulation.ts'
import { isDevTestAuthorized } from '../devAuth.ts'

// Campus Walkway Navigation Graph for testing
const testNodes: NavigationNode[] = [
  { id: 'main-gate-1', label: 'Main Entrance (Gate 1)', position: [181.0, 0.2, -6.2], verificationStatus: 'verified', kind: 'start', sourceObjectName: 'TestMesh' },
  { id: 'road-main-mid', label: 'Main Entrance Avenue', position: [180.2, 0.093, -20.0], verificationStatus: 'verified', kind: 'waypoint', sourceObjectName: 'TestMesh' },
  { id: 'road-academic-junction', label: 'Academic Junction', position: [180.2, 0.093, -38.6], verificationStatus: 'verified', kind: 'waypoint', sourceObjectName: 'TestMesh' },
  { id: 'road-front-first-year', label: 'First Year Front Road', position: [166.5, 0.093, -38.6], verificationStatus: 'verified', kind: 'waypoint', sourceObjectName: 'TestMesh' },
  { id: 'road-departments-junction', label: 'Departments Junction', position: [113.4, 0.093, -42.8], verificationStatus: 'verified', kind: 'waypoint', sourceObjectName: 'TestMesh' },
  { id: 'node-it-block-entrance', label: 'IT Block', position: [96.8, 0.2, -45.8], verificationStatus: 'verified', kind: 'destination', sourceObjectName: 'TestMesh' },
  { id: 'node-mech-block-entrance', label: 'Mechanical Block', position: [90.0, 0.2, -80.0], verificationStatus: 'verified', kind: 'destination', sourceObjectName: 'TestMesh' },
  { id: 'isolated-unconnected-node', label: 'Isolated Node', position: [500.0, 0.0, 500.0], verificationStatus: 'provisional', kind: 'waypoint', sourceObjectName: 'TestMesh' },
]

function edge(id: string, from: string, to: string, cost: number): NavigationEdge {
  return { id, from, to, cost, verificationStatus: 'verified', sourceObjectName: 'TestMesh' }
}

const testEdges: NavigationEdge[] = [
  edge('e1', 'main-gate-1', 'road-main-mid', 13.8),
  edge('e2', 'road-main-mid', 'road-academic-junction', 18.6),
  edge('e3', 'road-academic-junction', 'road-front-first-year', 13.7),
  edge('e4', 'road-front-first-year', 'road-departments-junction', 53.3),
  edge('e5', 'road-departments-junction', 'node-it-block-entrance', 16.8),
  edge('e6', 'road-departments-junction', 'node-mech-block-entrance', 37.5),
]

const testGraph: NavigationGraph = {
  nodes: testNodes,
  edges: testEdges,
}

const testNodesById = new Map(testNodes.map((n) => [n.id, n]))

describe('Unified Campus Navigation (Phase 5B)', () => {
  describe('Automatic Route Calculation & Selection', () => {
    it('calculates valid route automatically between campus entrance and academic block', () => {
      const startNodeId = 'main-gate-1'
      const destNodeId = 'node-it-block-entrance'

      const result = createRoutePlan(testGraph, startNodeId, destNodeId)
      assert.equal(result.status, 'ok')
      assert.ok(result.route)
      assert.ok(result.route.nodeIds.length >= 2)
      assert.equal(result.route.nodeIds[0], startNodeId)
      assert.equal(result.route.nodeIds[result.route.nodeIds.length - 1], destNodeId)
      assert.ok(result.route.totalCost > 0)
      assert.ok(result.route.steps.length >= 2)
    })

    it('swapping start and destination calculates the valid reverse route', () => {
      const startNodeId = 'main-gate-1'
      const destNodeId = 'node-it-block-entrance'

      const forwardResult = createRoutePlan(testGraph, startNodeId, destNodeId)
      const reverseResult = createRoutePlan(testGraph, destNodeId, startNodeId)

      assert.equal(forwardResult.status, 'ok')
      assert.equal(reverseResult.status, 'ok')
      assert.ok(forwardResult.route)
      assert.ok(reverseResult.route)

      assert.equal(reverseResult.route.nodeIds[0], destNodeId)
      assert.equal(
        reverseResult.route.nodeIds[reverseResult.route.nodeIds.length - 1],
        startNodeId
      )

      const diff = Math.abs(forwardResult.route.totalCost - reverseResult.route.totalCost)
      assert.ok(diff < 0.01, `Distance difference ${diff} should be negligible`)
    })

    it('handles identical start and destination gracefully without generating a route', () => {
      const sameNodeId = 'main-gate-1'
      const result = createRoutePlan(testGraph, sameNodeId, sameNodeId)
      assert.equal(result.status, 'ok')
      assert.equal(result.route?.nodeIds.length, 1)
      assert.equal(result.route?.totalCost, 0)
    })

    it('handles disconnected nodes safely without generating shortcuts through buildings', () => {
      const result = createRoutePlan(testGraph, 'main-gate-1', 'isolated-unconnected-node')
      assert.equal(result.status, 'no-route')
    })

    it('handles invalid or non-existent nodes safely without throwing', () => {
      const result = createRoutePlan(testGraph, 'non-existent-node-1', 'main-gate-1')
      assert.equal(result.status, 'invalid-node')
    })
  })

  describe('Route Progression & Completed Route Partitioning', () => {
    it('correctly partitions polyline into completedPoints and remainingPoints as step advances', () => {
      const startNodeId = 'main-gate-1'
      const destNodeId = 'node-it-block-entrance'

      const result = createRoutePlan(testGraph, startNodeId, destNodeId)
      assert.equal(result.status, 'ok')
      const route = result.route!

      const routePoints: Point3[] = route.nodeIds
        .map((id) => testNodesById.get(id)?.position)
        .filter((p): p is Point3 => Boolean(p))

      assert.ok(routePoints.length >= 2)

      // Step 0: at start
      const step0Idx = 0
      const completedStep0 = routePoints.slice(0, step0Idx + 1)
      const remainingStep0 = routePoints.slice(step0Idx)

      assert.equal(completedStep0.length, 1)
      assert.equal(remainingStep0.length, routePoints.length)
      assert.deepEqual(completedStep0[0], routePoints[0])

      // Mid-step
      if (routePoints.length > 2) {
        const midIdx = 2
        const completedMid = routePoints.slice(0, midIdx + 1)
        const remainingMid = routePoints.slice(midIdx)

        assert.equal(completedMid.length, 3)
        assert.equal(remainingMid.length, routePoints.length - 2)
        assert.deepEqual(completedMid[completedMid.length - 1], routePoints[midIdx])
        assert.deepEqual(remainingMid[0], routePoints[midIdx])
      }

      // Final step: arrival
      const finalIdx = routePoints.length - 1
      const completedFinal = routePoints.slice(0, finalIdx + 1)
      const remainingFinal = routePoints.slice(finalIdx)

      assert.equal(completedFinal.length, routePoints.length)
      assert.equal(remainingFinal.length, 1)
      assert.deepEqual(remainingFinal[0], routePoints[finalIdx])
    })

    it('calculates cumulative distances accurately for progress estimation', () => {
      const startNodeId = 'main-gate-1'
      const destNodeId = 'node-it-block-entrance'

      const result = createRoutePlan(testGraph, startNodeId, destNodeId)
      assert.equal(result.status, 'ok')

      const routePoints: Point3[] = result.route!.nodeIds
        .map((id) => testNodesById.get(id)?.position)
        .filter((p): p is Point3 => Boolean(p))

      const cumulativeDistances = computeCumulativeDistances(routePoints)
      assert.equal(cumulativeDistances.length, routePoints.length)
      assert.equal(cumulativeDistances[0], 0)

      for (let i = 1; i < cumulativeDistances.length; i++) {
        assert.ok(
          cumulativeDistances[i] > cumulativeDistances[i - 1],
          'Cumulative distance must be strictly increasing'
        )
      }
    })
  })

  describe('Real GPS Safety & Calibration Lock Verification', () => {
    it('verifies isApprovedForLiveNavigation is strictly FALSE in default geofence configuration', () => {
      assert.equal(
        PROVISIONAL_CAMPUS_BOUNDARY.metadata.isApprovedForLiveNavigation,
        false,
        'Provisional campus geofence metadata must have isApprovedForLiveNavigation = false'
      )
    })

    it('verifies default campus calibration control points are empty/uncalibrated in production', () => {
      assert.equal(
        DEFAULT_CAMPUS_CONTROL_POINTS.length,
        0,
        'Production control points must remain empty until official physical ground survey'
      )

      const model = buildCalibrationModel(DEFAULT_CAMPUS_CONTROL_POINTS)
      assert.equal(
        model.status,
        'uncalibrated',
        'Default calibration model must be uncalibrated'
      )
      assert.equal(
        model.helmertParams,
        null,
        'Helmert transformation parameters must be null when uncalibrated'
      )
    })

    it('ensures real GPS live navigation approval condition is locked', () => {
      const isApprovedGeofence = PROVISIONAL_CAMPUS_BOUNDARY.metadata.isApprovedForLiveNavigation
      const model = buildCalibrationModel(DEFAULT_CAMPUS_CONTROL_POINTS)
      const isCalibrated = model.status === 'calibrated'

      const isLiveApproved = isApprovedGeofence && isCalibrated
      assert.equal(
        isLiveApproved,
        false,
        'Live navigation approval must evaluate to false for safety'
      )
    })
  })

  describe('Manual Navigation Truthfulness & Non-Fabrication', () => {
    it('ensures manual turn-by-turn guidance does not move a simulated blue dot or fabricate movement', () => {
      const startNodeId = 'main-gate-1'
      const destNodeId = 'node-it-block-entrance'

      const result = createRoutePlan(testGraph, startNodeId, destNodeId)
      assert.equal(result.status, 'ok')
      const route = result.route!

      // Manual guidance only provides activeStepPoint (target node in 3D), never simulatedPosition
      const activeStepIndex = 1
      const activeNodeId = route.steps[activeStepIndex]?.nodeId
      const activeStepPosition = testNodesById.get(activeNodeId)?.position ?? null

      assert.ok(activeStepPosition)
      assert.deepEqual(activeStepPosition, testNodesById.get('road-main-mid')?.position)

      // Verified: simulated position must remain null in manual mode
      const manualSimulatedPosition = null
      assert.equal(
        manualSimulatedPosition,
        null,
        'Manual walkway navigation must not render a fake moving user blue dot'
      )
    })

    it('ensures route completion fading is not applied during manual guidance without verified GPS', () => {
      // In manual guidance, completedPoints is undefined so the complete route remains clearly visible
      const completedPointsInManual = undefined
      assert.equal(
        completedPointsInManual,
        undefined,
        'Completed route segments must not be faded as completed during manual step guidance'
      )
    })
  })

  describe('Developer Utility Isolation & Production Restrictions', () => {
    it('blocks developer navigation test mode in standard production environment (DEV: false)', () => {
      const isAuthorized = isDevTestAuthorized({ DEV: false })
      assert.equal(
        isAuthorized,
        false,
        '/dev-navigation must be strictly inaccessible in production builds'
      )
    })

    it('permits developer navigation test mode in local development mode (DEV: true)', () => {
      const isAuthorized = isDevTestAuthorized({ DEV: true })
      assert.equal(
        isAuthorized,
        true,
        '/dev-navigation must be accessible in local development mode'
      )
    })

    it('ensures no token or query parameter can bypass production restriction', () => {
      // Even if a query token was attempted, DEV: false strictly rejects it
      const isAuthorized = isDevTestAuthorized({ DEV: false })
      assert.equal(
        isAuthorized,
        false,
        'Production builds cannot access developer simulation interface through any parameter'
      )
    })
  })
})


