import type { Point3 } from './navigation'

/**
 * Standard GPS geographic coordinates with accuracy and metadata.
 */
export interface GpsCoordinates {
  latitude: number
  longitude: number
  accuracy: number // Accuracy radius in meters (68% confidence)
  altitude: number | null
  altitudeAccuracy: number | null
  heading: number | null
  speed: number | null
  timestamp: number
}

/**
 * Lifecycle status of the GPS service.
 */
export type GpsServiceStatus =
  | 'idle'
  | 'requesting'
  | 'active'
  | 'permission_denied'
  | 'position_unavailable'
  | 'timeout'
  | 'unsupported'

/**
 * Accuracy classification bucket.
 */
export type AccuracyClass = 'high' | 'medium' | 'poor' | 'rejected'

/**
 * Quality and calibration classification of a GPS reading against the 3D campus model.
 */
export type PositionStatus =
  | 'location_available'     // Calibrated, inside campus, acceptable accuracy
  | 'calibration_pending'    // GPS acquired, but campus map has no valid calibration
  | 'accuracy_insufficient'  // Accuracy radius exceeds maximum acceptable threshold
  | 'outside_campus'         // Position falls outside calibrated campus boundaries
  | 'uncalibrated'           // No ground control points configured
  | 'permission_denied'      // User explicitly denied location permission
  | 'gps_unavailable'        // Device hardware/signal unavailable
  | 'timeout'                // Request timed out
  | 'idle'                   // Location service not active

export interface PositionClassification {
  status: PositionStatus
  message: string
  accuracyClass: AccuracyClass
  modelPoint: Point3 | null
  accuracyRadiusModel: number | null
  rawCoordinates: GpsCoordinates | null
  isSimulated: boolean
}

/**
 * Ground Control Point (GCP) / Campus Landmark Benchmark.
 */
export interface GroundControlPoint {
  id: string
  name: string
  latitude: number
  longitude: number
  modelPosition: Point3 // [x, y, z] in Blender coordinates
  source: 'Survey' | 'RTK-GNSS' | 'Provisional Mobile GNSS' | 'Field Benchmark' | 'Test Mode Benchmark'
  verificationStatus: 'verified' | 'provisional' | 'unverified'
  notes?: string
}

/**
 * Helmert 4-parameter conformal transformation parameters:
 * X_model = a * u - b * v + tx
 * Z_model = b * u + a * v + tz
 * where:
 *   u = metric East offset from reference origin
 *   v = metric North offset from reference origin
 *   scale = sqrt(a^2 + b^2)
 *   rotation = atan2(b, a)
 */
export interface HelmertParameters {
  a: number
  b: number
  tx: number
  tz: number
  scale: number
  rotationDeg: number
  translation: [number, number]
  isReflected?: boolean
}

export type CalibrationStatus =
  | 'uncalibrated' // Fewer than 2 control points
  | 'degenerate'   // Points are coincident, collinear, or ill-conditioned
  | 'high_error'   // Residual error (RMSE) exceeds acceptable threshold
  | 'provisional'  // Points available but marked provisional / pending survey
  | 'calibrated'   // Confirmed benchmarks with acceptable residual error

export interface ControlPointResidual {
  pointId: string
  pointName: string
  errorMeters: number
}

export interface CalibrationModel {
  status: CalibrationStatus
  controlPoints: GroundControlPoint[]
  referenceOrigin: { latitude: number; longitude: number } | null
  helmertParams: HelmertParameters | null
  residuals: ControlPointResidual[]
  rmse: number | null
  warning?: string
}

/**
 * Injectable Geolocation provider interface for testability and mock providers.
 */
export interface GeolocationProvider {
  getCurrentPosition(
    success: (position: GeolocationPosition) => void,
    error: (error: GeolocationPositionError) => void,
    options?: PositionOptions
  ): void
  watchPosition(
    success: (position: GeolocationPosition) => void,
    error: (error: GeolocationPositionError) => void,
    options?: PositionOptions
  ): number
  clearWatch(watchId: number): void
}
