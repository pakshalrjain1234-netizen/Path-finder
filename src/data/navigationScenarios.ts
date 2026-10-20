import type { LocationObservation, NavigationScenario, ScenarioId } from '../types/liveNavigation.ts'
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

// -------------------------------------------------------------
// PHASE 4B BASE SCENARIOS
// -------------------------------------------------------------

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

function generateMainGateToMainBlock(): LocationObservation[] {
  const points: Point3[] = [
    [181.0, 0.25, -6.2],
    [186.5, 0.25, -11.0],
    [192.0, 0.25, -16.0],
    [197.5, 0.25, -21.0],
    [203.2, 0.25, -26.0],
  ]
  return points.map((pt, i) => createObsFromModel(pt, i * 2000, 6.0, 1.2, 135))
}

function generateTemporarySignalLoss(): LocationObservation[] {
  const base = generateMainGateToIt()
  return base.map((obs, i) => {
    if (i >= 3) {
      return { ...obs, timestamp: obs.timestamp + 12000 }
    }
    return obs
  })
}

function generateWaypointJitter(): LocationObservation[] {
  const cornerPt: Point3 = [195.0, 0.25, -45.0]
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

function generateInaccurateReadings(): LocationObservation[] {
  const base = generateMainGateToIt()
  return base.map((obs, i) => {
    if (i === 3) return { ...obs, accuracy: 48.0 }
    if (i === 4) return { ...obs, accuracy: 65.0 }
    return obs
  })
}

function generateStationaryUser(): LocationObservation[] {
  const gatePt: Point3 = [181.0, 0.25, -6.2]
  return [0, 1, 2, 3, 4, 5].map((i) => createObsFromModel(gatePt, i * 2000, 5.0, 0, 0))
}

function generateApproachingTurn(): LocationObservation[] {
  const points: Point3[] = [
    [191.5, 0.25, -36.0],
    [193.0, 0.25, -40.0],
    [194.5, 0.25, -43.5],
  ]
  return points.map((pt, i) => createObsFromModel(pt, i * 2000, 5.0, 1.2, 160))
}

function generateDestinationArrival(): LocationObservation[] {
  const points: Point3[] = [
    [207.0, 0.25, -81.0],
    [209.5, 0.25, -87.0],
    [211.2, 0.25, -91.5],
  ]
  return points.map((pt, i) => createObsFromModel(pt, i * 2000, 4.5, 1.1, 150))
}

function generateOffRouteDeviation(): LocationObservation[] {
  const points: Point3[] = [
    [181.0, 0.25, -6.2],
    [185.0, 0.25, -15.0],
    [170.0, 0.25, -20.0],
    [155.0, 0.25, -25.0],
    [150.0, 0.25, -30.0],
  ]
  return points.map((pt, i) => createObsFromModel(pt, i * 2000, 6.0, 1.3, 240))
}

// -------------------------------------------------------------
// PHASE 4C: INTELLIGENT REROUTING SCENARIOS
// -------------------------------------------------------------

/**
 * 11. Wrong turn at junction:
 * User walks north up Main Avenue, but turns East toward Main Block (Z = -38.6, X = 193.7)
 * instead of West towards IT Block.
 * After 3 consecutive observations off-route (>2.5s), triggers automatic reroute!
 */
function generateWrongTurnReroute(): LocationObservation[] {
  const points: Point3[] = [
    [181.0, 0.2, -6.2],   // Start Gate 1
    [180.2, 0.1, -20.0],  // On route along main avenue
    [180.2, 0.1, -38.6],  // Reaches junction
    // Wrong Turn: Heading EAST instead of WEST towards IT
    [188.0, 0.1, -38.6],  // Obs 1 off-route (diverging, ~8m off)
    [195.0, 0.1, -38.6],  // Obs 2 off-route (~28m off route to IT)
    [202.0, 0.1, -38.6],  // Obs 3 off-route (confirmed off-route -> triggers reroute via road-front-main!)
    [205.0, 0.1, -38.6],  // Continues on recalculated route
  ]
  return points.map((pt, i) => createObsFromModel(pt, i * 2000, 5.0, 1.3, 90))
}

/**
 * 12. Walking onto another valid walkway:
 * User walks southwest across South Plaza towards Canteen Gate (X=37.4, Z=2.0)
 * Reroutes via road-south-plaza-canteen.
 */
function generateWalkOntoAnotherWalkway(): LocationObservation[] {
  const points: Point3[] = [
    [181.0, 0.2, -6.2],  // Start
    [180.2, 0.1, 2.0],   // South plaza junction
    [150.0, 0.1, 2.0],   // Walking west along south plaza (diverging)
    [110.0, 0.1, 2.0],   // Diverging further
    [70.0, 0.1, 2.0],    // Confirmed off-route -> triggers reroute along south corridor!
    [40.0, 0.1, 2.0],    // Approaching canteen front
  ]
  return points.map((pt, i) => createObsFromModel(pt, i * 2000, 5.5, 1.4, 270))
}

/**
 * 13. Walking away from destination:
 * User turns around and walks south out through the main gate plaza
 */
function generateWalkingAway(): LocationObservation[] {
  const points: Point3[] = [
    [181.0, 0.2, -6.2],  // Gate 1
    [180.2, 0.1, -2.0],  // Heading South away from campus
    [180.2, 0.1, 15.0],  // Outside gate plaza
    [180.2, 0.1, 30.0],  // Sustained departure (confirmed off-route)
    [180.2, 0.1, 40.0],  // Reroutes back via main entrance gate
  ]
  return points.map((pt, i) => createObsFromModel(pt, i * 2000, 5.0, 1.2, 180))
}

/**
 * 14. Returning to the original route:
 * User takes 1 brief divergent step into courtyard, but returns within 2 steps
 * State machine detects recovery to on_route WITHOUT spurious rerouting!
 */
function generateReturnToRoute(): LocationObservation[] {
  const points: Point3[] = [
    [181.0, 0.2, -6.2],   // On route
    [180.2, 0.1, -20.0],  // On route
    [160.0, 0.1, -20.0],  // Diverges 20m west into parking (count = 1, diverging)
    [174.0, 0.1, -20.0],  // Moving back east towards path (recovering)
    [180.2, 0.1, -22.0],  // Back on walkway corridor (recovered to on_route!)
    [180.2, 0.1, -30.0],  // Resumes forward navigation on original route
  ]
  return points.map((pt, i) => createObsFromModel(pt, i * 2000, 5.0, 1.2, 0))
}

/**
 * 15. Stationary GPS jitter:
 * User stands still at junction for 12 seconds with ±3m satellite flutter.
 * Stationary detection ensures off-route counter NEVER increments.
 */
function generateStationaryJitterProtection(): LocationObservation[] {
  const junctionPt: Point3 = [180.2, 0.1, -38.6]
  const jitterOffsets: [number, number][] = [
    [0, 0],
    [2.5, -1.8],
    [-2.2, 2.1],
    [1.9, 1.5],
    [-1.8, -2.0],
    [0.5, 0.5],
  ]
  return jitterOffsets.map(([dx, dz], i) => {
    const pt: Point3 = [junctionPt[0] + dx, junctionPt[1], junctionPt[2] + dz]
    return createObsFromModel(pt, i * 2000, 6.0, 0.05, 0) // speed ~0 m/s
  })
}

/**
 * 16. Single inaccurate GPS observation:
 * Exactly 1 reading has an accuracy error of 26m and lateral offset.
 * State machine marks 'diverging' (count 1), then subsequent accurate reading resets to 'on_route'.
 */
function generateSingleInaccurateObs(): LocationObservation[] {
  return [
    createObsFromModel([181.0, 0.2, -6.2], 0, 5.0, 1.2, 0),
    createObsFromModel([180.2, 0.1, -15.0], 2000, 5.0, 1.2, 0),
    createObsFromModel([155.0, 0.1, -20.0], 4000, 26.0, 1.2, 0), // Single noisy reading
    createObsFromModel([180.2, 0.1, -25.0], 6000, 5.0, 1.2, 0),  // Normal accurate reading
    createObsFromModel([180.2, 0.1, -35.0], 8000, 5.0, 1.2, 0),  // Normal on-route
  ]
}

/**
 * 17. GPS signal loss during deviation:
 * User diverges for 1 reading, then GPS drops for 12 seconds (>8s timeout).
 * System transitions to 'signal_lost', freezes off-route counter until signal resumes.
 */
function generateSignalLossDuringDeviation(): LocationObservation[] {
  return [
    createObsFromModel([181.0, 0.2, -6.2], 0, 5.0, 1.2, 0),
    createObsFromModel([180.2, 0.1, -20.0], 2000, 5.0, 1.2, 0),
    createObsFromModel([160.0, 0.1, -20.0], 4000, 5.0, 1.2, 270), // Diverging reading
    createObsFromModel([158.0, 0.1, -20.0], 18000, 5.0, 1.2, 270), // 14s gap!
    createObsFromModel([156.0, 0.1, -20.0], 20000, 5.0, 1.2, 270),
  ]
}

/**
 * 18. No valid connected rerouting path:
 * User simulated in inaccessible location surrounded by Mechanical Block walls [55.0, 0.25, -78.0]
 * Direct line of sight to open nodes penetrates building. Rerouting fails gracefully.
 */
function generateNoValidPath(): LocationObservation[] {
  const points: Point3[] = [
    [181.0, 0.2, -6.2],
    [180.2, 0.1, -20.0],
    // Teleports/wanders into interior blocked zone
    [55.0, 0.25, -78.0],
    [55.0, 0.25, -78.0],
    [55.0, 0.25, -78.0],
  ]
  return points.map((pt, i) => createObsFromModel(pt, i * 2000, 5.0, 1.2, 0))
}

/**
 * 19. Repeated rerouting attempts:
 * User takes wrong turn 1 (east) -> reroutes -> then takes another wrong turn (north towards OAT) -> reroutes again!
 */
function generateRepeatedRerouting(): LocationObservation[] {
  const points: Point3[] = [
    [181.0, 0.2, -6.2],   // Start Gate 1
    [180.2, 0.1, -38.6],  // Junction
    // Wrong turn 1: East
    [192.0, 0.1, -38.6],
    [200.0, 0.1, -38.6],
    [205.0, 0.1, -38.6],  // Reroutes via road-front-main!
    // Wrong turn 2: North towards OAT corridor
    [205.0, 0.1, -50.0],
    [205.0, 0.1, -62.0],
    [205.0, 0.1, -75.0],  // Reroutes second time!
  ]
  return points.map((pt, i) => createObsFromModel(pt, i * 2000, 5.0, 1.3, 90))
}

/**
 * 20. Successful rerouting followed by destination arrival:
 * Wrong turn -> reroute calculated -> user follows new path all the way to IT Block entrance -> arrival confirmed!
 */
function generateRerouteThenArrive(): LocationObservation[] {
  const points: Point3[] = [
    [181.0, 0.2, -6.2],   // Start Gate 1
    [180.2, 0.1, -25.0],  // Main avenue
    [180.2, 0.1, -38.6],  // Junction
    // Takes wrong turn east toward Main Block
    [192.0, 0.1, -38.6],
    [198.0, 0.1, -38.6],
    [202.0, 0.1, -38.6],  // Triggers reroute from road-front-main!
    // Follows recalculated route west towards IT
    [180.2, 0.1, -38.6],
    [166.5, 0.1, -38.6],  // First year front road
    [145.2, 0.1, -38.6],  // Civil front road
    [124.0, 0.1, -38.6],  // Academic bend
    [113.4, 0.1, -42.8],  // Central departments junction
    [96.8, 0.2, -45.8],   // IT Block Entrance Anchor (ARRIVED!)
  ]
  return points.map((pt, i) => createObsFromModel(pt, i * 2000, 4.5, 1.3, 270))
}

export const NAVIGATION_SCENARIOS: NavigationScenario[] = [
  // 1-10 Phase 4B Base Scenarios
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
    observations: generateMainGateToIt(),
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

  // 11-20 Phase 4C Intelligent Rerouting Scenarios
  {
    id: 'reroute_wrong_turn',
    name: '11. Reroute: Taking a Wrong Turn',
    description: 'User takes wrong turn east at junction. Confirmed off-route triggers automatic rerouting to IT Block.',
    fromId: 'main-gate-1',
    toId: 'it-block',
    observations: generateWrongTurnReroute(),
    expectedFinalStatus: 'rerouted',
  },
  {
    id: 'reroute_valid_walkway',
    name: '12. Reroute: Walking onto Valid Walkway',
    description: 'User diverges onto South Plaza walkway towards Canteen. Reroutes via south plaza entrance.',
    fromId: 'main-gate-1',
    toId: 'it-block',
    observations: generateWalkOntoAnotherWalkway(),
    expectedFinalStatus: 'rerouted',
  },
  {
    id: 'reroute_walking_away',
    name: '13. Reroute: Walking Away from Destination',
    description: 'User walks south away from destination. Reroutes along verified return path.',
    fromId: 'main-gate-1',
    toId: 'it-block',
    observations: generateWalkingAway(),
    expectedFinalStatus: 'rerouted',
  },
  {
    id: 'reroute_return_to_route',
    name: '14. Return to Route (No False Reroute)',
    description: 'User temporarily leaves walkway corridor, then steps back. State machine recovers without false rerouting.',
    fromId: 'main-gate-1',
    toId: 'it-block',
    observations: generateReturnToRoute(),
    expectedFinalStatus: 'navigating',
  },
  {
    id: 'reroute_stationary_jitter',
    name: '15. Stationary GPS Jitter Protection',
    description: 'User stands still at junction with ±3m satellite noise. Stationary filter prevents spurious reroute.',
    fromId: 'main-gate-1',
    toId: 'it-block',
    observations: generateStationaryJitterProtection(),
    expectedFinalStatus: 'navigating',
  },
  {
    id: 'reroute_single_inaccurate_obs',
    name: '16. Single Inaccurate GPS Observation',
    description: 'One reading has 26m error. Engine marks diverging but does not reroute; next reading recovers.',
    fromId: 'main-gate-1',
    toId: 'it-block',
    observations: generateSingleInaccurateObs(),
    expectedFinalStatus: 'navigating',
  },
  {
    id: 'reroute_signal_loss_during_dev',
    name: '17. GPS Signal Loss During Deviation',
    description: 'User diverges then satellite signal drops for 14 seconds. Engine alerts signal loss and freezes counter.',
    fromId: 'main-gate-1',
    toId: 'it-block',
    observations: generateSignalLossDuringDeviation(),
    expectedFinalStatus: 'signal_lost',
  },
  {
    id: 'reroute_no_valid_path',
    name: '18. No Valid Connected Rerouting Path',
    description: 'User position enclosed by building footprints. System reports obstacle blockage and preserves last route.',
    fromId: 'main-gate-1',
    toId: 'it-block',
    observations: generateNoValidPath(),
    expectedFinalStatus: 'off_route',
  },
  {
    id: 'reroute_repeated_attempts',
    name: '19. Repeated Rerouting Stability',
    description: 'User takes wrong turn, gets rerouted, then takes another wrong turn. Reroutes second time smoothly.',
    fromId: 'main-gate-1',
    toId: 'it-block',
    observations: generateRepeatedRerouting(),
    expectedFinalStatus: 'rerouted',
  },
  {
    id: 'reroute_then_arrive',
    name: '20. Reroute Followed by Destination Arrival',
    description: 'User deviates, gets rerouted, follows recalculated path, and confirms arrival at IT Block.',
    fromId: 'main-gate-1',
    toId: 'it-block',
    observations: generateRerouteThenArrive(),
    expectedFinalStatus: 'arrived',
  },
]

export function getScenarioById(id: ScenarioId): NavigationScenario | undefined {
  return NAVIGATION_SCENARIOS.find((s) => s.id === id)
}
