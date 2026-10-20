import type { Point3, RouteStep } from './navigation'

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
  | 'signal_lost'
  | 'accuracy_insufficient'

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
}

/**
 * Deterministic test scenario identifier
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
