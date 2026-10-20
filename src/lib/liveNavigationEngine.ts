import type { Point3, RoutePlan } from '../types/navigation'
import type { CalibrationModel } from '../types/gps'
import { geoToModelCoordinates } from './campusCalibration.ts'
import { computeCumulativeDistances, interpolatePolylineAtDistance, pointDistance3D } from './routeSimulation.ts'
import type {
  LiveNavigationConfig,
  LiveNavigationState,
  LocationObservation,
  NavigationStatus,
  RouteMatchingConfidence,
  RouteProjection,
} from '../types/liveNavigation.ts'

export const DEFAULT_NAVIGATION_CONFIG: LiveNavigationConfig = {
  maxAcceptableAccuracyMeters: 30,
  maxPlausibleSpeedMps: 8, // ~29 km/h (walking/jogging sanity threshold)
  offRouteThresholdMeters: 18,
  snapToRouteThresholdMeters: 7,
  turnProximityThresholdMeters: 12,
  arrivalThresholdMeters: 7,
  jitterBackwardToleranceMeters: 4,
  signalLossTimeoutMs: 8000,
}

/**
 * Projects a 3D point onto a line segment [a, b] in the horizontal XZ plane.
 * Returns the closest point on the segment and the orthogonal distance.
 */
export function projectPointOntoSegment(p: Point3, a: Point3, b: Point3): {
  closest: Point3
  distance: number
  segmentFraction: number
} {
  const dx = b[0] - a[0]
  const dz = b[2] - a[2]
  const segLenSq = dx * dx + dz * dz

  if (segLenSq === 0) {
    const d = Math.sqrt((p[0] - a[0]) ** 2 + (p[2] - a[2]) ** 2)
    return { closest: a, distance: d, segmentFraction: 0 }
  }

  // Orthogonal projection scalar t clamped to [0, 1]
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[2] - a[2]) * dz) / segLenSq))
  const closest: Point3 = [
    a[0] + t * dx,
    a[1] + t * (b[1] - a[1]),
    a[2] + t * dz,
  ]

  const distance = Math.sqrt((p[0] - closest[0]) ** 2 + (p[2] - closest[2]) ** 2)
  return { closest, distance, segmentFraction: t }
}

/**
 * Projects a 3D point onto an entire route polyline.
 * Computes closest segment, cumulative distance along centerline, and cross-track distance.
 */
export function projectPointOntoRoute(
  point: Point3,
  routePoints: Point3[],
  cumulativeDistances: number[],
  lastProgressDistance: number = 0,
  searchWindowMeters: number = 50
): RouteProjection {
  if (routePoints.length === 0) {
    return {
      segmentIndex: 0,
      progressDistance: 0,
      crossTrackDistance: Infinity,
      projectedPoint: [0, 0, 0],
      rawModelPoint: point,
    }
  }

  if (routePoints.length === 1) {
    const d = Math.sqrt((point[0] - routePoints[0][0]) ** 2 + (point[2] - routePoints[0][2]) ** 2)
    return {
      segmentIndex: 0,
      progressDistance: 0,
      crossTrackDistance: d,
      projectedPoint: routePoints[0],
      rawModelPoint: point,
    }
  }

  let bestSegmentIndex = 0
  let bestDistance = Infinity
  let bestProjected: Point3 = routePoints[0]
  let bestProgress = 0

  for (let i = 0; i < routePoints.length - 1; i++) {
    const segStartDist = cumulativeDistances[i]
    const segEndDist = cumulativeDistances[i + 1]

    // Proximity window: prefer segments near the user's current progress unless off-route
    const isNearby =
      lastProgressDistance <= 0 ||
      (segEndDist >= lastProgressDistance - searchWindowMeters &&
        segStartDist <= lastProgressDistance + searchWindowMeters)

    const { closest, distance, segmentFraction } = projectPointOntoSegment(
      point,
      routePoints[i],
      routePoints[i + 1]
    )

    // Penalty for segments far outside the search window to avoid false shortcuts on overlapping loops
    const effectiveDistance = isNearby ? distance : distance + 15

    if (effectiveDistance < bestDistance) {
      bestDistance = distance
      bestSegmentIndex = i
      bestProjected = closest
      bestProgress = segStartDist + segmentFraction * (segEndDist - segStartDist)
    }
  }

  return {
    segmentIndex: bestSegmentIndex,
    progressDistance: bestProgress,
    crossTrackDistance: bestDistance,
    projectedPoint: bestProjected,
    rawModelPoint: point,
  }
}

/**
 * Pure, stateful Live Navigation Engine.
 * Manages tracking lifecycle, filtering, progression, and guidance.
 */
export class LiveNavigationEngine {
  private config: LiveNavigationConfig
  private route: RoutePlan | null = null
  private routePoints: Point3[] = []
  private cumulativeDistances: number[] = []
  private stepCumulativeDistances: number[] = []
  private totalDistance: number = 0

  // Tracking state
  private isNavigating: boolean = false
  private isPaused: boolean = false
  private isArrived: boolean = false
  private lastValidObservation: LocationObservation | null = null
  private lastValidModelPoint: Point3 | null = null
  private currentProgressDistance: number = 0
  private lastObservationTime: number = 0

  constructor(config: Partial<LiveNavigationConfig> = {}) {
    this.config = { ...DEFAULT_NAVIGATION_CONFIG, ...config }
  }

  /**
   * Initializes or updates the active route plan
   */
  public setRoute(route: RoutePlan | null, routePoints: Point3[]): void {
    this.route = route
    this.routePoints = routePoints
    this.cumulativeDistances = computeCumulativeDistances(routePoints)
    this.totalDistance =
      this.cumulativeDistances.length > 0
        ? this.cumulativeDistances[this.cumulativeDistances.length - 1]
        : 0

    if (route) {
      this.stepCumulativeDistances = route.steps.map((step) => {
        const idx = route.nodeIds.indexOf(step.nodeId)
        return idx >= 0 && idx < this.cumulativeDistances.length
          ? this.cumulativeDistances[idx]
          : 0
      })
    } else {
      this.stepCumulativeDistances = []
    }

    this.reset()
  }

  /**
   * Starts or resumes navigation
   */
  public startNavigation(): void {
    this.isNavigating = true
    this.isPaused = false
    this.isArrived = false
  }

  /**
   * Pauses navigation
   */
  public pauseNavigation(): void {
    this.isPaused = true
  }

  /**
   * Resumes paused navigation
   */
  public resumeNavigation(): void {
    this.isPaused = false
  }

  /**
   * Stops and resets navigation
   */
  public stopNavigation(): void {
    this.isNavigating = false
    this.isPaused = false
    this.isArrived = false
    this.reset()
  }

  /**
   * Resets internal tracking variables to beginning of route
   */
  public reset(): void {
    this.lastValidObservation = null
    this.lastValidModelPoint = null
    this.currentProgressDistance = 0
    this.lastObservationTime = 0
    this.isArrived = false
  }

  /**
   * Forcefully overrides current progress distance (for manual scrubbing / test previews)
   */
  public setProgressDistance(distance: number): void {
    this.currentProgressDistance = Math.max(0, Math.min(this.totalDistance, distance))
  }

  /**
   * Processes a location observation and returns a comprehensive navigation state.
   */
  public processObservation(
    obs: LocationObservation,
    calibration: CalibrationModel,
    isSimulated: boolean = false
  ): LiveNavigationState {
    const now = obs.timestamp || Date.now()
    this.lastObservationTime = now

    // If navigation is paused, return existing progress without updating
    if (this.isPaused) {
      return this.buildCurrentState(isSimulated, 'paused', 'Navigation is paused.')
    }

    // Safety Guardrail: Real GPS requires verified, non-provisional calibration
    if (!isSimulated && (calibration.status === 'uncalibrated' || calibration.status === 'provisional' || calibration.status === 'high_error')) {
      return this.buildSafetyLockedState(isSimulated, obs)
    }

    // Rule 1: Timestamp Stale Check
    if (this.lastValidObservation && obs.timestamp < this.lastValidObservation.timestamp) {
      return this.buildCurrentState(
        isSimulated,
        this.isNavigating ? 'navigating' : 'idle',
        'Stale GPS timestamp ignored.',
        'low'
      )
    }

    // Rule 2: Low-accuracy observation filter
    if (obs.accuracy > this.config.maxAcceptableAccuracyMeters) {
      return this.buildCurrentState(
        isSimulated,
        'accuracy_insufficient',
        `GPS accuracy (±${obs.accuracy.toFixed(0)}m) is insufficient. Threshold is ${this.config.maxAcceptableAccuracyMeters}m.`,
        'uncertain'
      )
    }

    // Transform geographic coordinates to 3D model space
    const transformed = geoToModelCoordinates(obs.latitude, obs.longitude, calibration)
    if (!transformed) {
      return this.buildCurrentState(
        isSimulated,
        'accuracy_insufficient',
        'Unable to project GPS position onto campus coordinate grid.',
        'uncertain'
      )
    }

    const currentModelPoint = transformed.modelPoint

    // Rule 3: Implausible speed rejection (teleportation / satellite jump)
    if (this.lastValidObservation && this.lastValidModelPoint) {
      const dtSec = Math.max(0.1, (obs.timestamp - this.lastValidObservation.timestamp) / 1000)
      const displacement = pointDistance3D(currentModelPoint, this.lastValidModelPoint)
      const computedSpeed = displacement / dtSec

      if (computedSpeed > this.config.maxPlausibleSpeedMps) {
        // Reject jump, keep previous stable point
        return this.buildCurrentState(
          isSimulated,
          this.isNavigating ? 'navigating' : 'idle',
          `Implausible movement detected (${computedSpeed.toFixed(1)} m/s). Anomaly filtered.`,
          'low'
        )
      }
    }

    // Observation is valid
    this.lastValidObservation = obs
    this.lastValidModelPoint = currentModelPoint

    // Project onto route
    const projection = projectPointOntoRoute(
      currentModelPoint,
      this.routePoints,
      this.cumulativeDistances,
      this.currentProgressDistance
    )

    // Route matching confidence classification
    let confidence: RouteMatchingConfidence = 'high'
    if (projection.crossTrackDistance > this.config.offRouteThresholdMeters) {
      confidence = 'off_route'
    } else if (projection.crossTrackDistance > this.config.snapToRouteThresholdMeters || obs.accuracy > 15) {
      confidence = 'medium'
    }

    // Rule 4: Monotonic Progress Clamp & Jitter Tolerance
    const proposedProgress = projection.progressDistance
    if (proposedProgress < this.currentProgressDistance) {
      const backwardDelta = this.currentProgressDistance - proposedProgress
      if (backwardDelta <= this.config.jitterBackwardToleranceMeters) {
        // Clamp: normal jitter cannot pull user backward
        // Keep this.currentProgressDistance unchanged
      } else if (backwardDelta > 15 && confidence !== 'off_route') {
        // Sustained reverse walking: allow controlled recalculation
        this.currentProgressDistance = proposedProgress
      }
    } else {
      // Forward progress
      this.currentProgressDistance = proposedProgress
    }

    // Check Destination Arrival
    const remainingDist = Math.max(0, this.totalDistance - this.currentProgressDistance)
    if (this.isNavigating && remainingDist <= this.config.arrivalThresholdMeters && confidence !== 'off_route') {
      this.isArrived = true
      this.currentProgressDistance = this.totalDistance
    }

    const status: NavigationStatus = this.isArrived
      ? 'arrived'
      : confidence === 'off_route'
        ? 'off_route'
        : this.isNavigating
          ? 'navigating'
          : 'idle'

    let userMessage = 'Navigation active.'
    if (status === 'arrived') {
      userMessage = 'You have arrived at your destination.'
    } else if (status === 'off_route') {
      userMessage = `You are ${projection.crossTrackDistance.toFixed(0)}m away from the planned walkway.`
    }

    return this.buildStateWithProjection(isSimulated, status, projection, confidence, userMessage)
  }

  /**
   * Checks whether GPS signal has been lost due to observation timeout
   */
  public checkSignalTimeout(now: number = Date.now(), isSimulated: boolean = false): LiveNavigationState | null {
    if (!this.lastObservationTime || this.isPaused || this.isArrived) {
      return null
    }

    if (now - this.lastObservationTime > this.config.signalLossTimeoutMs) {
      return this.buildCurrentState(
        isSimulated,
        'signal_lost',
        'GPS signal lost. Waiting for satellite reconnection...',
        'uncertain'
      )
    }

    return null
  }

  /**
   * Helper to construct state when a full projection is available
   */
  private buildStateWithProjection(
    isSimulated: boolean,
    status: NavigationStatus,
    projection: RouteProjection,
    confidence: RouteMatchingConfidence,
    userMessage: string
  ): LiveNavigationState {
    const totalDist = this.totalDistance
    const curDist = Math.max(0, Math.min(totalDist, this.currentProgressDistance))
    const progressRatio = totalDist > 0 ? curDist / totalDist : 1
    const remainingDist = Math.max(0, totalDist - curDist)
    // Assume average walking speed ~1.3 m/s for ETA
    const estimatedTimeSec = Math.round(remainingDist / 1.3)

    // Slice polyline for visual completion & remaining highlight
    const polylineProgress = interpolatePolylineAtDistance(
      this.routePoints,
      this.cumulativeDistances,
      curDist
    )

    // Determine current and next steps
    let currentStepIndex = 0
    if (this.route && this.stepCumulativeDistances.length > 0) {
      for (let i = 0; i < this.stepCumulativeDistances.length; i++) {
        if (curDist >= this.stepCumulativeDistances[i] - 1.5) {
          currentStepIndex = i
        }
      }
      currentStepIndex = Math.min(this.route.steps.length - 1, currentStepIndex)
    }

    const currentStep = this.route?.steps[currentStepIndex] ?? null
    const nextStep = this.route?.steps[currentStepIndex + 1] ?? null
    const nextStepDist =
      this.stepCumulativeDistances[currentStepIndex + 1] !== undefined
        ? this.stepCumulativeDistances[currentStepIndex + 1]
        : totalDist
    const distanceToNextTurn = Math.max(0, nextStepDist - curDist)
    const isApproachingTurn = distanceToNextTurn <= this.config.turnProximityThresholdMeters && nextStep !== null

    // Display Position Strategy:
    // If confidence is high/medium, softly snap to route centerline for clean walkway traversal.
    // If off-route, display raw location — NEVER falsely snap an off-route user onto an incorrect walkway!
    const displayPosition: Point3 =
      confidence === 'off_route'
        ? projection.rawModelPoint
        : projection.projectedPoint

    return {
      status,
      isSimulated,
      isNavigating: this.isNavigating,
      isPaused: this.isPaused,
      isArrived: this.isArrived,
      isOffRoute: confidence === 'off_route',
      signalStatus: 'healthy',
      totalDistance: totalDist,
      currentDistance: curDist,
      progressRatio,
      remainingDistance: remainingDist,
      estimatedTimeRemainingSec: estimatedTimeSec,
      rawModelPosition: projection.rawModelPoint,
      matchedModelPosition: projection.projectedPoint,
      displayPosition,
      accuracyRadiusMeters: this.lastValidObservation?.accuracy ?? 8,
      accuracyRadiusModel: Number(((this.lastValidObservation?.accuracy ?? 8) * 0.15).toFixed(1)),
      heading: this.lastValidObservation?.heading ?? null,
      confidence,
      currentStepIndex,
      currentStep,
      nextStep,
      distanceToNextTurn,
      isApproachingTurn,
      completedPoints: polylineProgress.completedPoints,
      remainingPoints: polylineProgress.remainingPoints,
      userMessage,
      details: `${curDist.toFixed(1)}m of ${totalDist.toFixed(1)}m • ${(progressRatio * 100).toFixed(0)}% complete`,
    }
  }

  /**
   * Helper to construct state without a new projection (e.g. idle, paused, or signal lost)
   */
  private buildCurrentState(
    isSimulated: boolean,
    status: NavigationStatus,
    userMessage: string,
    overrideConfidence?: RouteMatchingConfidence
  ): LiveNavigationState {
    const totalDist = this.totalDistance
    const curDist = Math.max(0, Math.min(totalDist, this.currentProgressDistance))
    const progressRatio = totalDist > 0 ? curDist / totalDist : 1
    const remainingDist = Math.max(0, totalDist - curDist)
    const estimatedTimeSec = Math.round(remainingDist / 1.3)

    const polylineProgress = interpolatePolylineAtDistance(
      this.routePoints,
      this.cumulativeDistances,
      curDist
    )

    let currentStepIndex = 0
    if (this.route && this.stepCumulativeDistances.length > 0) {
      for (let i = 0; i < this.stepCumulativeDistances.length; i++) {
        if (curDist >= this.stepCumulativeDistances[i] - 1.5) {
          currentStepIndex = i
        }
      }
      currentStepIndex = Math.min(this.route.steps.length - 1, currentStepIndex)
    }

    const currentStep = this.route?.steps[currentStepIndex] ?? null
    const nextStep = this.route?.steps[currentStepIndex + 1] ?? null
    const nextStepDist =
      this.stepCumulativeDistances[currentStepIndex + 1] !== undefined
        ? this.stepCumulativeDistances[currentStepIndex + 1]
        : totalDist
    const distanceToNextTurn = Math.max(0, nextStepDist - curDist)
    const isApproachingTurn = distanceToNextTurn <= this.config.turnProximityThresholdMeters && nextStep !== null

    return {
      status,
      isSimulated,
      isNavigating: this.isNavigating,
      isPaused: this.isPaused,
      isArrived: this.isArrived,
      isOffRoute: false,
      signalStatus: status === 'signal_lost' ? 'lost' : 'healthy',
      totalDistance: totalDist,
      currentDistance: curDist,
      progressRatio,
      remainingDistance: remainingDist,
      estimatedTimeRemainingSec: estimatedTimeSec,
      rawModelPosition: this.lastValidModelPoint,
      matchedModelPosition: polylineProgress.position,
      displayPosition: polylineProgress.position,
      accuracyRadiusMeters: this.lastValidObservation?.accuracy ?? 10,
      accuracyRadiusModel: Number(((this.lastValidObservation?.accuracy ?? 10) * 0.15).toFixed(1)),
      heading: this.lastValidObservation?.heading ?? null,
      confidence: overrideConfidence ?? (status === 'accuracy_insufficient' ? 'uncertain' : 'high'),
      currentStepIndex,
      currentStep,
      nextStep,
      distanceToNextTurn,
      isApproachingTurn,
      completedPoints: polylineProgress.completedPoints,
      remainingPoints: polylineProgress.remainingPoints,
      userMessage,
      details: `${curDist.toFixed(1)}m of ${totalDist.toFixed(1)}m • ${(progressRatio * 100).toFixed(0)}% complete`,
    }
  }

  /**
   * Helper when real GPS safety guardrail prevents model positioning
   */
  private buildSafetyLockedState(isSimulated: boolean, obs: LocationObservation): LiveNavigationState {
    const polylineProgress = interpolatePolylineAtDistance(
      this.routePoints,
      this.cumulativeDistances,
      0
    )

    return {
      status: 'idle',
      isSimulated,
      isNavigating: this.isNavigating,
      isPaused: this.isPaused,
      isArrived: false,
      isOffRoute: false,
      signalStatus: 'healthy',
      totalDistance: this.totalDistance,
      currentDistance: 0,
      progressRatio: 0,
      remainingDistance: this.totalDistance,
      estimatedTimeRemainingSec: Math.round(this.totalDistance / 1.3),
      rawModelPosition: null,
      matchedModelPosition: null,
      displayPosition: null,
      accuracyRadiusMeters: obs.accuracy,
      accuracyRadiusModel: 0,
      heading: null,
      confidence: 'uncertain',
      currentStepIndex: 0,
      currentStep: this.route?.steps[0] ?? null,
      nextStep: this.route?.steps[1] ?? null,
      distanceToNextTurn: this.stepCumulativeDistances[1] ?? this.totalDistance,
      isApproachingTurn: false,
      completedPoints: [],
      remainingPoints: polylineProgress.remainingPoints,
      userMessage: 'Campus map calibration pending. Real outdoor GPS navigation is locked.',
      details: 'On-site RTK-GNSS surveyed benchmarks are required before live outdoor blue-dot navigation.',
    }
  }
}
