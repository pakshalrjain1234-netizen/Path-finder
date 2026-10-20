import type { LocationObservation, NavigationScenario, ScenarioId } from '../types/liveNavigation'
import { TEST_MODE_CONTROL_POINTS } from './campusCalibrationData.ts'
import { buildCalibrationModel, modelToGeoCoordinates } from '../lib/campusCalibration.ts'
import type { Point3 } from '../types/navigation'

const testCalibration = buildCalibrationModel(TEST_MODE_CONTROL_POINTS)

/**
 * Helper to generate a LocationObservation from a 3D model point
 */
function createObsFromModel(
  point: Point3,
  timeOffsetMs: number,
  accuracy: number = 6,
  speed: number = 1.3,
  heading: number = 45
): LocationObservation {
  const geo = modelToGeoCoordinates(point, testCalibration)
  return {
    latitude: geo ? Number(geo.latitude.toFixed(6)) : 12.94504,
    longitude: geo ? Number(geo.longitude.toFixed(6)) : 80.24378,
    accuracy,
    timestamp: 1700000000000 + timeOffsetMs,
    speed,
    heading,
  }
}

/**
 * 1. Walk from Main Entrance (Gate 1) to IT Block
 * Route key points: Gate 1 [181, 0.25, -6.2] -> Corner [195, 0.25, -45] -> IT Block [211.5, 0.25, -92]
 */
function generateMainGateToIt(): LocationObservation[] {
  const points: Point3[] = [
    [181.0, 0.25, -6.2],
    [184.5, 0.25, -16.0],
    [188.0, 0.25, -26.0],
    [191.5, 0.25, -36.0],
    [195.0, 0.25, -45.0], // Corner turn
    [199.0, 0.25, -57.0],
    [203.0, 0.25, -69.0],
    [207.0, 0.25, -81.0],
    [211.5, 0.25, -92.0], // Destination
  ]

  return points.map((pt, i) => createObsFromModel(pt, i * 2000, 5.5, 1.3, 150))
}

/**
 * 2. Walk from Main Entrance (Gate 1) to Main Block
 */
function generateMainGateToMainBlock(): LocationObservation[] {
  const points: Point3[] = [
    [181.0, 0.25, -6.2],
    [186.5, 0.25, -11.0],
    [192.0, 0.25, -16.0],
    [197.5, 0.25, -21.0],
    [203.2, 0.25, -26.0], // Main Block
  ]

  return points.map((pt, i) => createObsFromModel(pt, i * 2000, 6.0, 1.2, 135))
}

/**
 * 3. Normal continuous walking
 */
function generateNormalContinuous(): LocationObservation[] {
  return generateMainGateToIt()
}

/**
 * 4. Temporary GPS signal loss (10s gap)
 */
function generateTemporarySignalLoss(): LocationObservation[] {
  const base = generateMainGateToIt()
  // Step 0, 1, 2 normal (0s, 2s, 4s)
  // Step 3 happens at 18s (14 second gap, exceeding 8s timeout)
  // Steps 4-8 continue normally
  return base.map((obs, i) => {
    if (i >= 3) {
      return {
        ...obs,
        timestamp: obs.timestamp + 12000, // 12 second gap
      }
    }
    return obs
  })
}

/**
 * 5. Waypoint GPS jitter (oscillating around waypoint without moving backward)
 */
function generateWaypointJitter(): LocationObservation[] {
  const cornerPt: Point3 = [195.0, 0.25, -45.0]
  // Oscillate by ±2m in X and Z
  const offsets: [number, number][] = [
    [0, 0],
    [1.8, -1.2],
    [-1.5, 1.4],
    [1.2, 1.0],
    [-0.8, -1.5],
    [0, 0],
  ]

  return offsets.map(([dx, dz], i) => {
    const pt: Point3 = [cornerPt[0] + dx, cornerPt[1], cornerPt[2] + dz]
    return createObsFromModel(pt, i * 1500, 6.5, 0.2, 90)
  })
}

/**
 * 6. Inaccurate GPS readings (accuracy degrades to 45m and 60m, then recovers)
 */
function generateInaccurateReadings(): LocationObservation[] {
  const base = generateMainGateToIt()
  return base.map((obs, i) => {
    if (i === 3) return { ...obs, accuracy: 48.0 } // Insufficient (>30m)
    if (i === 4) return { ...obs, accuracy: 65.0 } // Insufficient (>30m)
    return obs // All others good (5.5m)
  })
}

/**
 * 7. Stationary user (sitting still at Gate 1 for 12 seconds)
 */
function generateStationaryUser(): LocationObservation[] {
  const gatePt: Point3 = [181.0, 0.25, -6.2]
  return [0, 1, 2, 3, 4, 5].map((i) => createObsFromModel(gatePt, i * 2000, 5.0, 0, 0))
}

/**
 * 8. Approaching a turn (comes within 8m of corner)
 */
function generateApproachingTurn(): LocationObservation[] {
  // Points leading right up to the 195, -45 corner
  const points: Point3[] = [
    [191.5, 0.25, -36.0], // ~10m before corner
    [193.0, 0.25, -40.0], // ~6m before corner (triggers approaching turn)
    [194.5, 0.25, -43.5], // ~2m before corner
  ]
  return points.map((pt, i) => createObsFromModel(pt, i * 2000, 5.0, 1.2, 160))
}

/**
 * 9. Destination arrival (within 3m of destination)
 */
function generateDestinationArrival(): LocationObservation[] {
  const points: Point3[] = [
    [207.0, 0.25, -81.0], // 12m from dest
    [209.5, 0.25, -87.0], // 5.5m from dest
    [211.2, 0.25, -91.5], // 0.6m from dest (arrived)
  ]
  return points.map((pt, i) => createObsFromModel(pt, i * 2000, 4.5, 1.1, 150))
}

/**
 * 10. Off-route deviation (deviates 26m into sports ground/parking)
 */
function generateOffRouteDeviation(): LocationObservation[] {
  const points: Point3[] = [
    [181.0, 0.25, -6.2],  // On route (Gate 1)
    [185.0, 0.25, -15.0], // On route
    [170.0, 0.25, -20.0], // Deviating 16m west
    [155.0, 0.25, -25.0], // Deviating 26m west (off-route detected)
    [150.0, 0.25, -30.0], // 30m off route
  ]
  return points.map((pt, i) => createObsFromModel(pt, i * 2000, 6.0, 1.3, 240))
}

export const NAVIGATION_SCENARIOS: NavigationScenario[] = [
  {
    id: 'walk_main_gate_to_it',
    name: '1. Walk: Main Entrance to IT Block',
    description: 'Continuous walking along the primary walkway from Gate 1 to IT Block.',
    fromId: 'main-gate-1',
    toId: 'it-block',
    observations: generateMainGateToIt(),
    expectedFinalStatus: 'arrived',
  },
  {
    id: 'walk_main_gate_to_main_block',
    name: '2. Walk: Main Entrance to Main Block',
    description: 'Walking path towards the administrative Main Block portico.',
    fromId: 'main-gate-1',
    toId: 'main-block',
    observations: generateMainGateToMainBlock(),
    expectedFinalStatus: 'arrived',
  },
  {
    id: 'normal_continuous_walk',
    name: '3. Normal Continuous Walking',
    description: 'Steady 1.3 m/s walking speed with high GPS accuracy (±5m).',
    fromId: 'main-gate-1',
    toId: 'it-block',
    observations: generateNormalContinuous(),
    expectedFinalStatus: 'arrived',
  },
  {
    id: 'temporary_signal_loss',
    name: '4. Temporary GPS Signal Loss',
    description: 'GPS signal drops out for 12 seconds, triggering a loss alert, then recovers.',
    fromId: 'main-gate-1',
    toId: 'it-block',
    observations: generateTemporarySignalLoss(),
    expectedFinalStatus: 'navigating',
  },
  {
    id: 'waypoint_gps_jitter',
    name: '5. GPS Jitter at Waypoint',
    description: 'User stationary at corner with ±3m satellite noise. Clamping prevents backward jumps.',
    fromId: 'main-gate-1',
    toId: 'it-block',
    observations: generateWaypointJitter(),
    expectedFinalStatus: 'navigating',
  },
  {
    id: 'inaccurate_gps_readings',
    name: '6. Inaccurate GPS Readings',
    description: 'GPS accuracy degrades to 48m & 65m. Filter rejects updates until accuracy improves.',
    fromId: 'main-gate-1',
    toId: 'it-block',
    observations: generateInaccurateReadings(),
    expectedFinalStatus: 'navigating',
  },
  {
    id: 'stationary_user',
    name: '7. Stationary User',
    description: 'User stands still at Gate 1 for 10 seconds. Progress remains unchanged.',
    fromId: 'main-gate-1',
    toId: 'it-block',
    observations: generateStationaryUser(),
    expectedFinalStatus: 'navigating',
  },
  {
    id: 'approaching_turn',
    name: '8. Approaching a Turn',
    description: 'User reaches within 8m of a 90° pathway junction. Proximity guidance triggers.',
    fromId: 'main-gate-1',
    toId: 'it-block',
    observations: generateApproachingTurn(),
    expectedFinalStatus: 'navigating',
  },
  {
    id: 'destination_arrival',
    name: '9. Destination Arrival',
    description: 'User approaches within 3m of IT Block entrance. Arrival state confirms.',
    fromId: 'main-gate-1',
    toId: 'it-block',
    observations: generateDestinationArrival(),
    expectedFinalStatus: 'arrived',
  },
  {
    id: 'off_route_deviation',
    name: '10. Off-Route Pathway Deviation',
    description: 'User walks 26m off the path. Engine alerts off-route without falsely snapping marker.',
    fromId: 'main-gate-1',
    toId: 'it-block',
    observations: generateOffRouteDeviation(),
    expectedFinalStatus: 'off_route',
  },
]

export function getScenarioById(id: ScenarioId): NavigationScenario | undefined {
  return NAVIGATION_SCENARIOS.find((s) => s.id === id)
}
