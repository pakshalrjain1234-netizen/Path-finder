import type { NavigationGraph, Point3, RoutePlan } from '../types/navigation'
import type { CalibrationModel } from '../types/gps'
import { geoToModelCoordinates } from './campusCalibration.ts'
import { computeCumulativeDistances, interpolatePolylineAtDistance, pointDistance3D } from './routeSimulation.ts'
import type {
  LiveNavigationConfig,
  LiveNavigationState,
  LocationObservation,
  NavigationStatus,
  OffRouteStatus,
  RouteMatchingConfidence,
  RouteProjection,
} from '../types/liveNavigation.ts'
import { OffRouteDetector } from './offRouteDetector.ts'
import { findValidReroute } from './routeRerouter.ts'

export const DEFAULT_NAVIGATION_CONFIG: LiveNavigationConfig = {
  maxAcceptableAccuracyMeters: 30,
  maxPlausibleSpeedMps: 8, // ~29 km/h (walking/jogging sanity threshold)
  offRouteThresholdMeters: 18,
  snapToRouteThresholdMeters: 7,
  turnProximityThresholdMeters: 12,
  arrivalThresholdMeters: 7,
  jitterBackwardToleranceMeters: 4,
  signalLossTimeoutMs: 8000,

  // Phase 4C Intelligent Rerouting Defaults
  consecutiveOffRouteThreshold: 3,
  recoveryConsecutiveThreshold: 2,
  minDeviationDurationMs: 2500,
  rerouteSearchRadiusMeters: 40,
  stationarySpeedThresholdMps: 0.4,
  enableAutoReroute: true,
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
 * Manages tracking lifecycle, filtering, progression, guidance,
 * and automatic intelligent rerouting upon confirmed pathway deviation.
 */
export class LiveNavigationEngine {
  private config: LiveNavigationConfig
  private route: RoutePlan | null = null
  private routePoints: Point3[] = []
  private cumulativeDistances: number[] = []
  private stepCumulativeDistances: number[] = []
  private totalDistance: number = 0

  // Campus Graph & Destination for Automatic Rerouting
  private graph: NavigationGraph | null = null
  private destinationNodeId: string | null = null

  // Tracking state
  private isNavigating: boolean = false
  private isPaused: boolean = false
  private isArrived: boolean = false
  private lastValidObservation: LocationObservation | null = null
  private lastValidModelPoint: Point3 | null = null
  private currentProgressDistance: number = 0
  private lastObservationTime: number = 0

  // Phase 4C Rerouting & Off-Route State Machine
  private offRouteDetector: OffRouteDetector = new OffRouteDetector()
  private rerouteCount: number = 0
  private lastReroutedNodeId: string | null = null
  private rerouteFailureReason: string | null = null
  private previousCompletedPoints: Point3[] = []

  constructor(config: Partial<LiveNavigationConfig> = {}) {
    this.config = { ...DEFAULT_NAVIGATION_CONFIG, ...config }
  }

  /**
   * Sets the campus graph and destination for automatic rerouting
   */
  public setGraph(graph: NavigationGraph | null, destinationNodeId: string | null): void {
    this.graph = graph
    this.destinationNodeId = destinationNodeId
  }

  /**
   * Initializes or updates the active route plan
   * @param preserveHistory If true, preserves traversed history and reroute count (used during rerouting)
   */
  public setRoute(route: RoutePlan | null, routePoints: Point3[], preserveHistory: boolean = false): void {
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

    if (!preserveHistory) {
      this.previousCompletedPoints = []
      this.rerouteCount = 0
      this.lastReroutedNodeId = null
      this.rerouteFailureReason = null
      this.reset()
    }
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
    this.previousCompletedPoints = []
    this.rerouteCount = 0
    this.lastReroutedNodeId = null
    this.rerouteFailureReason = null
    this.offRouteDetector.reset()
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
    this.offRouteDetector.reset()
  }

  /**
   * Forcefully overrides current progress distance (for manual scrubbing / test previews)
   */
  public setProgressDistance(distance: number): void {
    this.currentProgressDistance = Math.max(0, Math.min(this.totalDistance, distance))
  }

  /**
   * Returns total reroutes executed in this navigation session
   */
  public getRerouteCount(): number {
    return this.rerouteCount
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

    // Project onto active route
    const projection = projectPointOntoRoute(
      currentModelPoint,
      this.routePoints,
      this.cumulativeDistances,
      this.currentProgressDistance
    )

    // Evaluate Phase 4C Off-Route State Machine
    const offRouteEval = this.offRouteDetector.evaluateObservation(
      obs,
      currentModelPoint,
      projection,
      this.config
    )

    // -------------------------------------------------------------
    // PHASE 4C: AUTOMATIC REROUTING LOGIC
    // -------------------------------------------------------------
    if (
      offRouteEval.status === 'confirmed_off_route' &&
      this.config.enableAutoReroute &&
      this.graph &&
      this.destinationNodeId &&
      !this.isArrived &&
      this.isNavigating
    ) {
      const rerouteResult = findValidReroute({
        userModelPoint: currentModelPoint,
        destinationNodeId: this.destinationNodeId,
        graph: this.graph,
        searchRadiusMeters: this.config.rerouteSearchRadiusMeters,
      })

      if (rerouteResult.success) {
        // Archive current traversed progress into previousCompletedPoints
        if (this.currentProgressDistance > 0 && this.routePoints.length >= 2) {
          const prevSlice = interpolatePolylineAtDistance(
            this.routePoints,
            this.cumulativeDistances,
            this.currentProgressDistance
          )
          this.previousCompletedPoints = [
            ...this.previousCompletedPoints,
            ...prevSlice.completedPoints,
          ]
        }

        // Install new route plan
        this.route = rerouteResult.routePlan
        this.routePoints = rerouteResult.routePoints
        this.cumulativeDistances = computeCumulativeDistances(this.routePoints)
        this.totalDistance =
          this.cumulativeDistances.length > 0
            ? this.cumulativeDistances[this.cumulativeDistances.length - 1]
            : 0

        this.stepCumulativeDistances = this.route.steps.map((step) => {
          const idx = this.route!.nodeIds.indexOf(step.nodeId)
          return idx >= 0 && idx < this.cumulativeDistances.length
            ? this.cumulativeDistances[idx]
            : 0
        })

        this.currentProgressDistance = 0
        this.rerouteCount++
        this.lastReroutedNodeId = rerouteResult.entryNode.id
        this.rerouteFailureReason = null
        this.offRouteDetector.reset()

        // Re-project user position onto the newly installed route
        const newProjection = projectPointOntoRoute(
          currentModelPoint,
          this.routePoints,
          this.cumulativeDistances,
          0
        )

        return this.buildStateWithProjection(
          isSimulated,
          'rerouted',
          newProjection,
          'high',
          `Route recalculated via ${rerouteResult.entryNode.label}.`,
          'on_route',
          0
        )
      } else {
        // Rerouting failed (e.g. building obstacle block or no path)
        this.rerouteFailureReason = rerouteResult.reason
        return this.buildStateWithProjection(
          isSimulated,
          'off_route',
          projection,
          'off_route',
          `Off-route: ${rerouteResult.message}`,
          'confirmed_off_route',
          offRouteEval.consecutiveOffRouteCount
        )
      }
    }

    // If confirmed off-route but auto rerouting disabled or unconfigured
    if (offRouteEval.status === 'confirmed_off_route') {
      return this.buildStateWithProjection(
        isSimulated,
        'off_route',
        projection,
        'off_route',
        `You are ${projection.crossTrackDistance.toFixed(0)}m away from the planned walkway.`,
        'confirmed_off_route',
        offRouteEval.consecutiveOffRouteCount
      )
    }

    // If diverging (single or unconfirmed reading)
    if (offRouteEval.status === 'diverging') {
      // Rule 4: Monotonic Progress Clamp continues
      this.applyProgressClamping(projection)
      const divergingConfidence: RouteMatchingConfidence =
        projection.crossTrackDistance > this.config.offRouteThresholdMeters ? 'off_route' : 'low'

      return this.buildStateWithProjection(
        isSimulated,
        divergingConfidence === 'off_route' ? 'off_route' : (this.isNavigating ? 'navigating' : 'idle'),
        projection,
        divergingConfidence,
        `Leaving walkway corridor (${projection.crossTrackDistance.toFixed(0)}m). Monitoring path...`,
        'diverging',
        offRouteEval.consecutiveOffRouteCount
      )
    }

    // If on-route or recovering
    let confidence: RouteMatchingConfidence = 'high'
    if (projection.crossTrackDistance > this.config.snapToRouteThresholdMeters || obs.accuracy > 15) {
      confidence = 'medium'
    }

    // Monotonic Progress Clamp & Jitter Tolerance
    this.applyProgressClamping(projection)

    // Check Destination Arrival
    const remainingDist = Math.max(0, this.totalDistance - this.currentProgressDistance)
    if (this.isNavigating && remainingDist <= this.config.arrivalThresholdMeters) {
      this.isArrived = true
      this.currentProgressDistance = this.totalDistance
    }

    const status: NavigationStatus = this.isArrived
      ? 'arrived'
      : this.isNavigating
        ? 'navigating'
        : 'idle'

    let userMessage = 'Navigation active.'
    if (status === 'arrived') {
      userMessage = 'You have arrived at your destination.'
    } else if (offRouteEval.status === 'recovering') {
      userMessage = 'Returned to planned walkway.'
    }

    return this.buildStateWithProjection(
      isSimulated,
      status,
      projection,
      confidence,
      userMessage,
      offRouteEval.status,
      offRouteEval.consecutiveOffRouteCount
    )
  }

  /**
   * Applies monotonic progress clamping so normal GPS jitter cannot pull the user backward
   */
  private applyProgressClamping(projection: RouteProjection): void {
    const proposedProgress = projection.progressDistance
    if (proposedProgress < this.currentProgressDistance) {
      const backwardDelta = this.currentProgressDistance - proposedProgress
      if (backwardDelta <= this.config.jitterBackwardToleranceMeters) {
        // Clamp: normal jitter cannot pull user backward
        // Keep this.currentProgressDistance unchanged
      } else if (backwardDelta > 15) {
        // Sustained reverse walking: allow controlled recalculation
        this.currentProgressDistance = proposedProgress
      }
    } else {
      // Forward progress
      this.currentProgressDistance = proposedProgress
    }
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
    userMessage: string,
    offRouteStatus: OffRouteStatus = 'on_route',
    offRouteConsecutiveCount: number = 0
  ): LiveNavigationState {
    const totalDist = this.totalDistance
    const curDist = Math.max(0, Math.min(totalDist, this.currentProgressDistance))
    const progressRatio = totalDist > 0 ? curDist / totalDist : 1
    const remainingDist = Math.max(0, totalDist - curDist)
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

    // Distinct raw vs snapped display position:
    // If confidence is off_route, NEVER falsely snap onto an incorrect walkway!
    const isOffRoute =
      confidence === 'off_route' ||
      projection.crossTrackDistance > this.config.offRouteThresholdMeters ||
      offRouteStatus === 'confirmed_off_route'

    const displayPosition: Point3 = isOffRoute
      ? projection.rawModelPoint
      : projection.projectedPoint

    return {
      status,
      isSimulated,
      isNavigating: this.isNavigating,
      isPaused: this.isPaused,
      isArrived: this.isArrived,
      isOffRoute,
      signalStatus: 'healthy',
      totalDistance: totalDist,
      currentDistance: curDist,
      progressRatio,
      remainingDistance: remainingDist,
      estimatedTimeRemainingSec: estimatedTimeSec,
      rawModelPosition: projection.rawModelPoint,
      matchedModelPosition: projection.projectedPoint,
      displayPosition,
      crossTrackDistance: projection.crossTrackDistance,
      accuracyRadiusMeters: this.lastValidObservation?.accuracy ?? 8,
      accuracyRadiusModel: Number(((this.lastValidObservation?.accuracy ?? 8) * 0.15).toFixed(1)),
      heading: this.lastValidObservation?.heading ?? null,
      confidence,
      currentStepIndex,
      currentStep,
      nextStep,
      distanceToNextTurn,
      isApproachingTurn,
      completedPoints: [...this.previousCompletedPoints, ...polylineProgress.completedPoints],
      remainingPoints: polylineProgress.remainingPoints,
      previousCompletedPoints: this.previousCompletedPoints,
      offRouteStatus,
      offRouteConsecutiveCount,
      isRerouting: status === 'recalculating',
      rerouteCount: this.rerouteCount,
      lastReroutedNodeId: this.lastReroutedNodeId,
      rerouteFailureReason: this.rerouteFailureReason,
      activeRoutePlan: this.route,
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
      crossTrackDistance: 0,
      accuracyRadiusMeters: this.lastValidObservation?.accuracy ?? 10,
      accuracyRadiusModel: Number(((this.lastValidObservation?.accuracy ?? 10) * 0.15).toFixed(1)),
      heading: this.lastValidObservation?.heading ?? null,
      confidence: overrideConfidence ?? (status === 'accuracy_insufficient' ? 'uncertain' : 'high'),
      currentStepIndex,
      currentStep,
      nextStep,
      distanceToNextTurn,
      isApproachingTurn,
      completedPoints: [...this.previousCompletedPoints, ...polylineProgress.completedPoints],
      remainingPoints: polylineProgress.remainingPoints,
      previousCompletedPoints: this.previousCompletedPoints,
      offRouteStatus: this.offRouteDetector.getStatus(),
      offRouteConsecutiveCount: this.offRouteDetector.getConsecutiveCount(),
      isRerouting: status === 'recalculating',
      rerouteCount: this.rerouteCount,
      lastReroutedNodeId: this.lastReroutedNodeId,
      rerouteFailureReason: this.rerouteFailureReason,
      activeRoutePlan: this.route,
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
      crossTrackDistance: 0,
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
      previousCompletedPoints: [],
      offRouteStatus: 'on_route',
      offRouteConsecutiveCount: 0,
      isRerouting: false,
      rerouteCount: 0,
      lastReroutedNodeId: null,
      rerouteFailureReason: null,
      activeRoutePlan: this.route,
      userMessage: 'Campus map calibration pending. Real outdoor GPS navigation is locked.',
      details: 'On-site RTK-GNSS surveyed benchmarks are required before live outdoor blue-dot navigation.',
    }
  }
}
