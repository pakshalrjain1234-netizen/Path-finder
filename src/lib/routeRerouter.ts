import type { NavigationGraph, NavigationNode, Point3, RoutePlan } from '../types/navigation'
import { createRoutePlan } from './routePlanner.ts'
import { validateRouteGeometry, validateSegmentGeometry } from './routeGeometryValidator.ts'

export type RerouteFailureReason =
  | 'no_destination'
  | 'no_nearby_nodes'
  | 'obstacle_blocking_all_nodes'
  | 'no_connected_path'
  | 'route_geometry_invalid'

export interface RerouteSuccessResult {
  success: true
  entryNode: NavigationNode
  distanceToEntry: number
  routePlan: RoutePlan
  routePoints: Point3[]
}

export interface RerouteFailureResult {
  success: false
  reason: RerouteFailureReason
  message: string
}

export type RerouteResult = RerouteSuccessResult | RerouteFailureResult

export interface RerouteParams {
  userModelPoint: Point3
  destinationNodeId: string | null
  graph: NavigationGraph
  searchRadiusMeters?: number
}

/**
 * Evaluates candidate graph entry nodes, enforces building obstacle avoidance,
 * finds shortest path on campus walkway graph, validates route geometry,
 * and returns the optimal rerouted path to the destination.
 */
export function findValidReroute({
  userModelPoint,
  destinationNodeId,
  graph,
  searchRadiusMeters = 40,
}: RerouteParams): RerouteResult {
  if (!destinationNodeId) {
    return {
      success: false,
      reason: 'no_destination',
      message: 'No navigation destination is selected.',
    }
  }

  const nodeMap = new Map<string, NavigationNode>(graph.nodes.map((n) => [n.id, n]))
  const destNode = nodeMap.get(destinationNodeId)
  if (!destNode) {
    return {
      success: false,
      reason: 'no_destination',
      message: `Destination node ${destinationNodeId} not found in campus graph.`,
    }
  }

  let nodesInRangeCount = 0
  let obstacleBlockedCount = 0

  interface CandidateEvaluation {
    node: NavigationNode
    distance: number
    routePlan: RoutePlan
    routePoints: Point3[]
    score: number
  }

  const validCandidates: CandidateEvaluation[] = []

  for (const node of graph.nodes) {
    const dx = userModelPoint[0] - node.position[0]
    const dz = userModelPoint[2] - node.position[2]
    const dist = Math.hypot(dx, dz)

    if (dist > searchRadiusMeters) {
      continue
    }
    nodesInRangeCount++

    // 1. Building Obstacle Check:
    // Ensure direct line from user's current position to candidate entry node
    // does NOT penetrate any campus building footprint.
    const connectorIssues = validateSegmentGeometry(userModelPoint, node.position, 'reroute-connector', 0.5)
    const penetratesBuilding = connectorIssues.some((issue) => issue.type === 'building_penetration')
    if (penetratesBuilding) {
      obstacleBlockedCount++
      continue
    }

    // 2. Connectivity to Destination Check:
    // Plan route from candidate node to the preserved destination
    const planResult = createRoutePlan(graph, node.id, destinationNodeId)
    if (planResult.status !== 'ok' || !planResult.route) {
      continue
    }

    // 3. Extract 3D points for candidate route
    const candidateRoutePoints = planResult.route.nodeIds
      .map((id) => nodeMap.get(id)?.position)
      .filter((pos): pos is Point3 => Boolean(pos))

    if (candidateRoutePoints.length < 2) {
      continue
    }

    // 4. Route Geometry Validation Check:
    // Ensure candidate route follows valid walkways without building penetration
    const validationResult = validateRouteGeometry(candidateRoutePoints)
    if (!validationResult.valid) {
      continue
    }

    // 5. Candidate scoring:
    // Balance proximity to the entry point (weight 1.25) with overall route efficiency
    const score = dist * 1.25 + planResult.route.totalCost

    validCandidates.push({
      node,
      distance: dist,
      routePlan: planResult.route,
      routePoints: candidateRoutePoints,
      score,
    })
  }

  if (validCandidates.length === 0) {
    if (nodesInRangeCount === 0) {
      return {
        success: false,
        reason: 'no_nearby_nodes',
        message: `No campus walkways found within ${searchRadiusMeters.toFixed(0)}m of your position.`,
      }
    }
    if (obstacleBlockedCount === nodesInRangeCount) {
      return {
        success: false,
        reason: 'obstacle_blocking_all_nodes',
        message: 'Direct access to nearby walkways is blocked by campus buildings. Please return to the nearest open walkway.',
      }
    }
    return {
      success: false,
      reason: 'no_connected_path',
      message: 'No safe connected pathway could be verified from nearby entrance nodes to your destination.',
    }
  }

  // Select candidate with lowest score
  validCandidates.sort((a, b) => a.score - b.score)
  const best = validCandidates[0]

  return {
    success: true,
    entryNode: best.node,
    distanceToEntry: best.distance,
    routePlan: best.routePlan,
    routePoints: best.routePoints,
  }
}
