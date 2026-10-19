import type { Point3 } from '../types/navigation'

export interface PolylineProgress {
  totalDistance: number
  currentDistance: number
  progressRatio: number
  position: Point3
  segmentIndex: number
  completedPoints: Point3[]
  remainingPoints: Point3[]
  isFinished: boolean
}

/**
 * Calculates Euclidean distance between two 3D points.
 */
export function pointDistance3D(a: Point3, b: Point3): number {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const dz = b[2] - a[2]
  return Math.sqrt(dx * dx + dy * dy + dz * dz)
}

/**
 * Precomputes cumulative distances along a polyline.
 * Result has the same length as points, starting with 0.
 */
export function computeCumulativeDistances(points: Point3[]): number[] {
  if (points.length === 0) return []
  const distances: number[] = [0]
  for (let i = 0; i < points.length - 1; i++) {
    const dist = pointDistance3D(points[i], points[i + 1])
    distances.push(distances[i] + dist)
  }
  return distances
}

/**
 * Computes exact continuous position, completed polyline, and remaining polyline
 * for a given distance along an ordered sequence of points.
 */
export function interpolatePolylineAtDistance(
  points: Point3[],
  cumulativeDistances: number[],
  targetDistance: number
): PolylineProgress {
  if (points.length === 0) {
    return {
      totalDistance: 0,
      currentDistance: 0,
      progressRatio: 0,
      position: [0, 0, 0],
      segmentIndex: 0,
      completedPoints: [],
      remainingPoints: [],
      isFinished: true,
    }
  }

  const totalDist = cumulativeDistances[cumulativeDistances.length - 1] ?? 0

  if (points.length === 1 || totalDist === 0) {
    return {
      totalDistance: 0,
      currentDistance: 0,
      progressRatio: 1,
      position: points[0],
      segmentIndex: 0,
      completedPoints: [points[0]],
      remainingPoints: [points[0]],
      isFinished: true,
    }
  }

  const clampedDist = Math.max(0, Math.min(totalDist, targetDistance))
  const isFinished = clampedDist >= totalDist - 1e-4

  // Find active segment where cumulativeDistances[i] <= clampedDist <= cumulativeDistances[i+1]
  let segIndex = 0
  for (let i = 0; i < points.length - 1; i++) {
    if (clampedDist >= cumulativeDistances[i] && clampedDist <= cumulativeDistances[i + 1]) {
      segIndex = i
      break
    }
    if (i === points.length - 2) {
      segIndex = i
    }
  }

  const segStartDist = cumulativeDistances[segIndex]
  const segEndDist = cumulativeDistances[segIndex + 1]
  const segLength = segEndDist - segStartDist

  const fraction = segLength > 1e-6 ? (clampedDist - segStartDist) / segLength : 1
  const pA = points[segIndex]
  const pB = points[segIndex + 1]

  const currentPos: Point3 = [
    pA[0] + (pB[0] - pA[0]) * fraction,
    pA[1] + (pB[1] - pA[1]) * fraction,
    pA[2] + (pB[2] - pA[2]) * fraction,
  ]

  // Sliced points
  // Completed points: all vertices up to segIndex, plus currentPos
  const completedPoints: Point3[] = [...points.slice(0, segIndex + 1), currentPos]

  // Remaining points: currentPos, plus all vertices from segIndex + 1 onwards
  const remainingPoints: Point3[] = [currentPos, ...points.slice(segIndex + 1)]

  return {
    totalDistance: totalDist,
    currentDistance: clampedDist,
    progressRatio: totalDist > 0 ? clampedDist / totalDist : 1,
    position: currentPos,
    segmentIndex: segIndex,
    completedPoints,
    remainingPoints,
    isFinished,
  }
}
