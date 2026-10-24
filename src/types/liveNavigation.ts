import type { Point3, RoutePlan, RouteStep } from './navigation'

/**
 * Raw timestamped location observation in WGS-84 coordinates
 */
export interface LocationObservation {
  latitude: number
  longitude: number
  accuracy: number // in metres
  timestamp: number // Unix epoch ms
  speed?: number | null // in m/s
  heading?: number | null // in degrees [0, 360)
  altitude?: number | null
}

/**
 * Route-matching confidence class
 */
export type RouteMatchingConfidence = 'high' | 'medium' | 'low' | 'off_route' | 'uncertain'

/**
 * Navigation operational status
 */
export type NavigationStatus =
  | 'idle'
  | 'navigating'
  | 'paused'
  | 'arrived'
  | 'off_route'
  | 'recalculating'
  | 'rerouted'
  | 'signal_lost'
  | 'accuracy_insufficient'

/**
 * Off-route state machine status
 */
export type OffRouteStatus = 'on_route' | 'diverging' | 'confirmed_off_route' | 'recovering'

/**
 * Detailed orthogonal projection onto a route polyline
 */
export interface RouteProjection {
  segmentIndex: number
  progressDistance: number // cumulative metres from route start along centerline
  crossTrackDistance: number // orthogonal distance in metres from route centerline
  projectedPoint: Point3 // closest point on route centerline
  rawModelPoint: Point3 // unprojected 3D model point
}

/**
 * Real-time state of the navigation engine
 */
export interface LiveNavigationState {
  status: NavigationStatus
  isSimulated: boolean
  isNavigating: boolean
  isPaused: boolean
  isArrived: boolean
  isOffRoute: boolean
  signalStatus: 'healthy' | 'degraded' | 'lost'

  // Progress metrics
  totalDistance: number
  currentDistance: number
  progressRatio: number
  remainingDistance: number
  estimatedTimeRemainingSec: number

  // 3D positioning
  rawModelPosition: Point3 | null
  matchedModelPosition: Point3 | null
  displayPosition: Point3 | null // Softly snapped or raw depending on confidence
  crossTrackDistance: number
  accuracyRadiusMeters: number
  accuracyRadiusModel: number
  heading: number | null
  confidence: RouteMatchingConfidence

  // Step guidance
  currentStepIndex: number
  currentStep: RouteStep | null
  nextStep: RouteStep | null
  distanceToNextTurn: number
  isApproachingTurn: boolean

  // Polyline sliced for 3D visualization
  completedPoints: Point3[]
  remainingPoints: Point3[]
  previousCompletedPoints: Point3[] // Historical points from prior traversed segments before rerouting

  // Automatic rerouting state
  offRouteStatus: OffRouteStatus
  offRouteConsecutiveCount: number
  isRerouting: boolean
  rerouteCount: number
  lastReroutedNodeId: string | null
  rerouteFailureReason: string | null
  activeRoutePlan: RoutePlan | null

  // Status message for user
  userMessage: string
  details: string
}

/**
 * Configuration options and tuning thresholds for the navigation engine
 */
export interface LiveNavigationConfig {
  maxAcceptableAccuracyMeters: number // default: 30m
  maxPlausibleSpeedMps: number // default: 8 m/s (~29 km/h)
  offRouteThresholdMeters: number // default: 18m
  snapToRouteThresholdMeters: number // default: 7m
  turnProximityThresholdMeters: number // default: 12m
  arrivalThresholdMeters: number // default: 7m
  jitterBackwardToleranceMeters: number // default: 4m
  signalLossTimeoutMs: number // default: 8000ms

  // Phase 4C Intelligent Rerouting thresholds
  consecutiveOffRouteThreshold: number // default: 3 observations
  recoveryConsecutiveThreshold: number // default: 2 observations
  minDeviationDurationMs: number // default: 2500ms
  rerouteSearchRadiusMeters: number // default: 40m
  stationarySpeedThresholdMps: number // default: 0.4 m/s
  enableAutoReroute: boolean // default: true
}

/**
 * Deterministic test scenario identifier (Phase 4B & Phase 4C)
 */
export type ScenarioId =
  | 'walk_main_gate_to_it'
  | 'walk_main_gate_to_main_block'
  | 'normal_continuous_walk'
  | 'temporary_signal_loss'
  | 'waypoint_gps_jitter'
  | 'inaccurate_gps_readings'
  | 'stationary_user'
  | 'approaching_turn'
  | 'destination_arrival'
  | 'off_route_deviation'
  // Phase 4C Rerouting Scenarios
  | 'reroute_wrong_turn'
  | 'reroute_valid_walkway'
  | 'reroute_walking_away'
  | 'reroute_return_to_route'
  | 'reroute_stationary_jitter'
  | 'reroute_single_inaccurate_obs'
  | 'reroute_signal_loss_during_dev'
  | 'reroute_no_valid_path'
  | 'reroute_repeated_attempts'
  | 'reroute_then_arrive'

export interface NavigationScenario {
  id: ScenarioId
  name: string
  description: string
  fromId: string
  toId: string
  observations: LocationObservation[]
  expectedFinalStatus?: NavigationStatus
  notes?: string
}
