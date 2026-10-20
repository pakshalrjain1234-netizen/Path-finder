import type { Point3 } from '../types/navigation'
import type { LiveNavigationConfig, LocationObservation, OffRouteStatus, RouteProjection } from '../types/liveNavigation.ts'
import { pointDistance3D } from './routeSimulation.ts'

export interface OffRouteEvaluationResult {
  status: OffRouteStatus
  isConfirmed: boolean
  effectiveThreshold: number
  isStationary: boolean
  consecutiveOffRouteCount: number
  deviationDurationMs: number
}

/**
 * Intelligent Off-Route Detector with dynamic accuracy scaling,
 * consecutive observation hysteresis, stationary jitter protection,
 * and recovery detection.
 */
export class OffRouteDetector {
  private status: OffRouteStatus = 'on_route'
  private consecutiveOffRouteCount: number = 0
  private consecutiveOnRouteCount: number = 0
  private firstDeviationTimestamp: number | null = null
  private lastObservation: LocationObservation | null = null
  private lastModelPoint: Point3 | null = null

  /**
   * Evaluates a valid, transformed location observation against the route projection
   */
  public evaluateObservation(
    obs: LocationObservation,
    modelPoint: Point3,
    projection: RouteProjection,
    config: LiveNavigationConfig
  ): OffRouteEvaluationResult {
    // 1. Stationary GPS Jitter Protection
    let isStationary = false
    if (obs.speed !== undefined && obs.speed !== null) {
      isStationary = obs.speed < config.stationarySpeedThresholdMps
    } else if (this.lastModelPoint && this.lastObservation) {
      const dtSec = Math.max(0.1, (obs.timestamp - this.lastObservation.timestamp) / 1000)
      const dispMeters = pointDistance3D(modelPoint, this.lastModelPoint)
      const computedSpeed = dispMeters / dtSec
      isStationary = computedSpeed < config.stationarySpeedThresholdMps
    }

    // 2. Dynamic accuracy-aware threshold
    // When satellite accuracy degrades (e.g. ±20m), widen the off-route threshold
    // so normal satellite dilution does not trigger spurious rerouting.
    const effectiveThreshold = Math.max(config.offRouteThresholdMeters, obs.accuracy * 1.15)

    // If user is stationary and not already confirmed off-route,
    // prevent jitter from incrementing the off-route counter
    if (isStationary && this.status !== 'confirmed_off_route') {
      this.lastObservation = obs
      this.lastModelPoint = modelPoint
      return {
        status: this.status,
        isConfirmed: false,
        effectiveThreshold,
        isStationary: true,
        consecutiveOffRouteCount: this.consecutiveOffRouteCount,
        deviationDurationMs: this.firstDeviationTimestamp ? Math.max(0, obs.timestamp - this.firstDeviationTimestamp) : 0,
      }
    }

    // 3. Evaluate Cross-Track Distance against Dynamic Threshold
    if (projection.crossTrackDistance > effectiveThreshold) {
      this.consecutiveOnRouteCount = 0
      this.consecutiveOffRouteCount++

      if (this.firstDeviationTimestamp === null) {
        this.firstDeviationTimestamp = obs.timestamp
      }

      const durationMs = Math.max(0, obs.timestamp - this.firstDeviationTimestamp)

      if (
        this.consecutiveOffRouteCount >= config.consecutiveOffRouteThreshold &&
        durationMs >= config.minDeviationDurationMs
      ) {
        this.status = 'confirmed_off_route'
      } else {
        this.status = 'diverging'
      }
    } else if (projection.crossTrackDistance <= config.snapToRouteThresholdMeters) {
      // User is within standard walkway snap corridor (<=7m)
      this.consecutiveOffRouteCount = 0
      this.firstDeviationTimestamp = null
      this.consecutiveOnRouteCount++

      if (this.status === 'confirmed_off_route' || this.status === 'diverging' || this.status === 'recovering') {
        if (this.consecutiveOnRouteCount >= config.recoveryConsecutiveThreshold) {
          this.status = 'on_route'
        } else {
          this.status = 'recovering'
        }
      } else {
        this.status = 'on_route'
      }
    } else {
      // In hysteresis zone between snap threshold (7m) and off-route threshold (18m):
      // Maintain previous state to avoid flutter
      if (this.status === 'diverging') {
        // Still diverging if not recovered
      }
    }

    this.lastObservation = obs
    this.lastModelPoint = modelPoint

    return {
      status: this.status,
      isConfirmed: this.status === 'confirmed_off_route',
      effectiveThreshold,
      isStationary: false,
      consecutiveOffRouteCount: this.consecutiveOffRouteCount,
      deviationDurationMs: this.firstDeviationTimestamp ? Math.max(0, obs.timestamp - this.firstDeviationTimestamp) : 0,
    }
  }

  /**
   * Resets all off-route counters and returns status to on_route
   */
  public reset(): void {
    this.status = 'on_route'
    this.consecutiveOffRouteCount = 0
    this.consecutiveOnRouteCount = 0
    this.firstDeviationTimestamp = null
    this.lastObservation = null
    this.lastModelPoint = null
  }

  public getStatus(): OffRouteStatus {
    return this.status
  }

  public getConsecutiveCount(): number {
    return this.consecutiveOffRouteCount
  }
}
