import type { Point3, NavigationGraph, NavigationEdge } from '../types/navigation'

export interface BoundingBox2D {
  name: string
  minX: number
  maxX: number
  minZ: number
  maxZ: number
}

// Building obstacles extracted directly from campus GLB model (world coordinates)
export const CAMPUS_BUILDING_OBSTACLES: BoundingBox2D[] = [
  { name: 'MAIN_BLOCK', minX: 181.0, maxX: 206.0, minZ: -75.8, maxZ: -57.2 },
  { name: 'FIRST_YEAR_BLOCK', minX: 157.8, maxX: 175.8, minZ: -82.8, maxZ: -64.8 },
  { name: 'CIVIL_BLOCK', minX: 137.0, maxX: 152.0, minZ: -83.0, maxZ: -54.8 },
  { name: 'IT_BLOCK', minX: 82.4, maxX: 111.4, minZ: -56.0, maxZ: -46.4 },
  { name: 'MECHANICAL_BLOCK', minX: 27.4, maxX: 86.4, minZ: -86.4, maxZ: -66.2 },
  { name: 'MNM_ARCHITECTURE', minX: 6.2, maxX: 30.4, minZ: -145.4, maxZ: -102.2 },
  { name: 'BOYS_HOSTEL', minX: 9.0, maxX: 50.4, minZ: -199.6, maxZ: -183.8 },
  { name: 'OAT', minX: 216.6, maxX: 238.4, minZ: -75.8, maxZ: -57.2 },
  { name: 'PHYSICS_DEPARTMENT', minX: 1.6, maxX: 27.2, minZ: -61.0, maxZ: -47.8 },
  { name: 'NON_JAIN_MESS', minX: 2.6, maxX: 24.2, minZ: -40.2, maxZ: -23.8 },
  { name: 'JAIN_MESS', minX: 30.0, maxX: 50.6, minZ: -40.2, maxZ: -23.8 },
  { name: 'ENGLISH_DEPARTMENT', minX: 59.6, maxX: 81.8, minZ: -40.2, maxZ: -23.8 },
  { name: 'MATHS_DEPARTMENT', minX: 85.2, maxX: 108.2, minZ: -40.2, maxZ: -23.8 },
  { name: 'CANTEEN', minX: 11.2, maxX: 63.4, minZ: -15.8, maxZ: -3.8 },
  { name: 'L_SHAPE_EAST_WING', minX: 240.0, maxX: 263.4, minZ: -95.0, maxZ: -39.2 },
  { name: 'L_SHAPE_NORTH_WING', minX: 137.4, maxX: 263.4, minZ: -95.0, maxZ: -85.0 },
]

// Traversable road & walkway surface polygons/boxes extracted from campus GLB model
export const CAMPUS_WALKABLE_SURFACES: BoundingBox2D[] = [
  // 1. Main entrance avenue from Gate 1 to academic front
  { name: 'ROAD_MAIN_ENTRANCE_AVENUE', minX: 168.0, maxX: 192.0, minZ: -39.5, maxZ: 12.0 },
  // 2. Main entrance south front plaza linking to canteen
  { name: 'ROAD_MAIN_ENTRANCE_SOUTH_PLAZA', minX: 30.0, maxX: 192.0, minZ: -3.0, maxZ: 12.0 },
  // 3. Academic front road corridor
  { name: 'ROAD_ACADEMIC_FRONT_CORRIDOR', minX: 115.0, maxX: 240.0, minZ: -43.5, maxZ: -34.0 },
  // 4. Central road bend transition & connection to front road
  { name: 'ROAD_FRONT_CURVE_TRANSITION', minX: 106.0, maxX: 126.0, minZ: -48.5, maxZ: -34.0 },
  // 5. North plaza connector between North Walkway and Central Road
  { name: 'ROAD_PLAZA_NORTH', minX: 100.0, maxX: 120.0, minZ: -39.0, maxZ: -16.0 },
  // 6. Central spine road (North-South spine between core and sports ground)
  { name: 'ROAD_CENTRAL_SPINE', minX: 106.0, maxX: 120.0, minZ: -136.0, maxZ: -42.0 },
  // 7. West cross-campus road (runs east-west at Z = -93)
  { name: 'ROAD_WEST_CROSS_CAMPUS', minX: 9.0, maxX: 115.0, minZ: -97.5, maxZ: -88.5 },
  // 8. Mechanical block road loop & entrance apron
  { name: 'ROAD_MECHANICAL_EAST', minX: 96.0, maxX: 103.5, minZ: -93.5, maxZ: -55.5 },
  { name: 'ROAD_MECHANICAL_NORTH', minX: 9.0, maxX: 103.5, minZ: -67.0, maxZ: -49.0 },
  { name: 'ROAD_MECHANICAL_WEST', minX: 9.0, maxX: 15.5, minZ: -93.5, maxZ: -55.5 },
  // 9. North-south hostel access road
  { name: 'ROAD_NORTH_SOUTH_LINK', minX: 72.0, maxX: 78.0, minZ: -123.0, maxZ: -92.5 },
  // 10. Hostel ground loop
  { name: 'ROAD_HOSTEL_DIAGONAL_LINK', minX: 74.0, maxX: 115.0, minZ: -136.0, maxZ: -121.5 },
  { name: 'ROAD_HOSTEL_NS_LEG', minX: 69.5, maxX: 79.5, minZ: -155.5, maxZ: -121.5 },
  { name: 'ROAD_HOSTEL_EW_LEG', minX: 19.5, maxX: 79.5, minZ: -160.0, maxZ: -149.5 },
  { name: 'ROAD_HOSTEL_APPROACH_LEG', minX: 19.5, maxX: 30.0, minZ: -184.0, maxZ: -149.5 },
  // 11. Academic front walkways
  { name: 'WALK_ACADEMIC_FRONT', minX: 133.0, maxX: 246.0, minZ: -46.5, maxZ: -42.0 },
  { name: 'WALK_MAIN', minX: 189.0, maxX: 198.5, minZ: -57.5, maxZ: -43.0 },
  { name: 'WALK_FIRST_YEAR', minX: 162.5, maxX: 170.5, minZ: -65.0, maxZ: -43.0 },
  { name: 'WALK_CIVIL', minX: 141.0, maxX: 149.5, minZ: -55.0, maxZ: -43.0 },
  { name: 'WALK_OAT', minX: 223.5, maxX: 232.0, minZ: -57.5, maxZ: -43.0 },
  // 12. Departments and Mess walkways
  { name: 'WALK_MESS_DEPARTMENTS', minX: 1.0, maxX: 115.0, minZ: -46.5, maxZ: -39.8 },
  { name: 'WALK_IT', minX: 92.5, maxX: 101.0, minZ: -46.8, maxZ: -42.0 },
  { name: 'WALK_PHYSICS', minX: 9.0, maxX: 18.0, minZ: -48.0, maxZ: -42.0 },
  // 13. North canteen and mess entrance walkways
  { name: 'WALK_CANTEEN_NORTH', minX: 2.5, maxX: 103.0, minZ: -22.2, maxZ: -15.8 },
  { name: 'WALK_CANTEEN_APPROACH', minX: 30.5, maxX: 44.5, minZ: -16.0, maxZ: 1.5 },
  { name: 'WALK_ENGLISH_APPROACH', minX: 66.5, maxX: 75.0, minZ: -24.0, maxZ: 0.5 },
  { name: 'WALK_JAIN_MESS', minX: 36.0, maxX: 44.0, minZ: -24.0, maxZ: -18.5 },
  { name: 'WALK_NON_JAIN_MESS', minX: 9.0, maxX: 18.0, minZ: -24.0, maxZ: -18.5 },
  // 14. Architecture walkways
  { name: 'WALK_ARCHITECTURE_SOUTH', minX: 17.0, maxX: 27.5, minZ: -103.0, maxZ: -92.5 },
  { name: 'WALK_ARCHITECTURE_EAST', minX: 29.5, maxX: 47.5, minZ: -115.0, maxZ: -96.5 },
  // 15. Rear academic walkway & L-Shape passage
  { name: 'WALK_REAR_OAT_CORRIDOR', minX: 206.0, maxX: 216.5, minZ: -85.0, maxZ: -42.0 },
  { name: 'WALK_ACADEMIC_REAR', minX: 152.0, maxX: 246.0, minZ: -86.0, maxZ: -45.5 },
  { name: 'WALK_L_SHAPE_ENTRANCE', minX: 161.5, maxX: 170.5, minZ: -86.0, maxZ: -82.0 },
]

export interface ValidationIssue {
  type: 'building_penetration' | 'off_walkway'
  point: [number, number]
  edgeId?: string
  obstacleName?: string
  message: string
}

export interface RouteGeometryValidationResult {
  valid: boolean
  issues: ValidationIssue[]
  checkedSampleCount: number
  summary: string
}

/**
 * Checks if a 2D point (x, z) falls strictly inside any building obstacle bounding box.
 * Uses an inset tolerance (0.15m) to avoid false positives at outer entrance door thresholds.
 */
export function getBuildingIntersection(x: number, z: number, tolerance = 0.15): BoundingBox2D | null {
  for (const b of CAMPUS_BUILDING_OBSTACLES) {
    if (x >= b.minX + tolerance && x <= b.maxX - tolerance && z >= b.minZ + tolerance && z <= b.maxZ - tolerance) {
      return b
    }
  }
  return null
}

/**
 * Checks if a 2D point (x, z) lies within any mapped traversable road or walkway surface.
 * Allows a configurable corridor buffer (default 1.5m) to account for road widths and junction corners.
 */
export function isPointOnWalkableSurface(x: number, z: number, buffer = 1.5): boolean {
  for (const w of CAMPUS_WALKABLE_SURFACES) {
    if (x >= w.minX - buffer && x <= w.maxX + buffer && z >= w.minZ - buffer && z <= w.maxZ + buffer) {
      return true
    }
  }
  return false
}

/**
 * Validates a single line segment between two 3D points.
 * Samples points every `stepSize` meters along the segment.
 */
export function validateSegmentGeometry(
  start: Point3,
  end: Point3,
  edgeId?: string,
  stepSize = 0.75,
): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const dx = end[0] - start[0]
  const dz = end[2] - start[2]
  const distance = Math.hypot(dx, dz)

  if (distance < 0.01) return issues

  const steps = Math.max(3, Math.ceil(distance / stepSize))

  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const sx = start[0] + dx * t
    const sz = start[2] + dz * t

    // 1. Check building penetration
    const obstacle = getBuildingIntersection(sx, sz)
    if (obstacle) {
      issues.push({
        type: 'building_penetration',
        point: [Number(sx.toFixed(2)), Number(sz.toFixed(2))],
        edgeId,
        obstacleName: obstacle.name,
        message: `Segment penetrates building footprint ${obstacle.name} at (${sx.toFixed(1)}, ${sz.toFixed(1)})`,
      })
      break
    }

    // 2. Check walkable surface containment
    if (!isPointOnWalkableSurface(sx, sz)) {
      issues.push({
        type: 'off_walkway',
        point: [Number(sx.toFixed(2)), Number(sz.toFixed(2))],
        edgeId,
        message: `Sample point at (${sx.toFixed(1)}, ${sz.toFixed(1)}) falls outside mapped walkable surfaces.`,
      })
      break
    }
  }

  return issues
}

/**
 * Validates a sequence of points representing a route.
 */
export function validateRouteGeometry(points: Point3[]): RouteGeometryValidationResult {
  const issues: ValidationIssue[] = []
  let checkedSampleCount = 0

  if (points.length < 2) {
    return {
      valid: true,
      issues: [],
      checkedSampleCount: 0,
      summary: 'Route has fewer than 2 points; trivially valid.',
    }
  }

  for (let i = 0; i < points.length - 1; i++) {
    const start = points[i]
    const end = points[i + 1]
    const distance = Math.hypot(end[0] - start[0], end[2] - start[2])
    const steps = Math.max(3, Math.ceil(distance / 0.75))
    checkedSampleCount += steps

    const segmentIssues = validateSegmentGeometry(start, end, `step_${i}_to_${i + 1}`)
    issues.push(...segmentIssues)
  }

  const valid = issues.length === 0
  const summary = valid
    ? `Route verified: 100% of ${checkedSampleCount} sampled points follow mapped roads/walkways without building penetration.`
    : `Validation failed: Found ${issues.length} geometric violation(s) along route. First violation: ${issues[0]?.message}`

  return {
    valid,
    issues,
    checkedSampleCount,
    summary,
  }
}

/**
 * Validates all edges in a navigation graph.
 */
export function validateGraphEdges(graph: NavigationGraph): {
  valid: boolean
  totalEdges: number
  invalidEdges: Array<{ edge: NavigationEdge; issues: ValidationIssue[] }>
  summary: string
} {
  const nodeMap = new Map(graph.nodes.map((n) => [n.id, n.position]))
  const invalidEdges: Array<{ edge: NavigationEdge; issues: ValidationIssue[] }> = []

  for (const edge of graph.edges) {
    const p1 = nodeMap.get(edge.from)
    const p2 = nodeMap.get(edge.to)
    if (!p1 || !p2) {
      invalidEdges.push({
        edge,
        issues: [
          {
            type: 'off_walkway',
            point: [0, 0],
            edgeId: edge.id,
            message: `Node ${!p1 ? edge.from : edge.to} not found in graph nodes.`,
          },
        ],
      })
      continue
    }

    const issues = validateSegmentGeometry(p1, p2, edge.id)
    if (issues.length > 0) {
      invalidEdges.push({ edge, issues })
    }
  }

  return {
    valid: invalidEdges.length === 0,
    totalEdges: graph.edges.length,
    invalidEdges,
    summary:
      invalidEdges.length === 0
        ? `All ${graph.edges.length} edges successfully validated against campus 3D geometry.`
        : `${invalidEdges.length} of ${graph.edges.length} edges violate campus walkway geometry.`,
  }
}
