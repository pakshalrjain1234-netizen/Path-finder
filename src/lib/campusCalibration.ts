import type { Point3 } from '../types/navigation'
import type {
  CalibrationModel,
  CalibrationStatus,
  ControlPointResidual,
  GroundControlPoint,
  HelmertParameters,
} from '../types/gps'

/**
 * Maximum acceptable Root-Mean-Square Error (RMSE) in meters for valid geographic calibration.
 * Calibrations with RMSE exceeding this threshold are rejected to prevent inaccurate 3D placement.
 */
export const MAX_ACCEPTABLE_CALIBRATION_RMSE_METERS = 10.0

/**
 * Metric distance per degree for WGS-84 ellipsoid at a specific latitude.
 */
export function getMetricScaleForLatitude(latitudeDeg: number): { metersPerDegLat: number; metersPerDegLon: number } {
  const phi = (latitudeDeg * Math.PI) / 180
  // Standard WGS-84 metric distance per degree formulas
  const metersPerDegLat = 111132.954 - 559.822 * Math.cos(2 * phi) + 1.175 * Math.cos(4 * phi)
  const metersPerDegLon = 111412.84 * Math.cos(phi) - 93.5 * Math.cos(3 * phi)
  return { metersPerDegLat, metersPerDegLon }
}

/**
 * Converts geographic coordinates (lat, lon) to local tangent metric coordinates (u=East, v=North)
 * relative to a reference origin.
 */
export function geoToLocalMeters(
  latitude: number,
  longitude: number,
  origin: { latitude: number; longitude: number }
): { u: number; v: number } {
  const { metersPerDegLat, metersPerDegLon } = getMetricScaleForLatitude(origin.latitude)
  const u = (longitude - origin.longitude) * metersPerDegLon
  const v = (latitude - origin.latitude) * metersPerDegLat
  return { u, v }
}

/**
 * Converts local tangent metric coordinates (u=East, v=North) back to geographic coordinates (lat, lon).
 */
export function localMetersToGeo(
  u: number,
  v: number,
  origin: { latitude: number; longitude: number }
): { latitude: number; longitude: number } {
  const { metersPerDegLat, metersPerDegLon } = getMetricScaleForLatitude(origin.latitude)
  const longitude = origin.longitude + u / metersPerDegLon
  const latitude = origin.latitude + v / metersPerDegLat
  return { latitude, longitude }
}

/**
 * Fits a 2D Conformal Helmert Transformation between local metric geographic offsets
 * (u=East, v=North) and 3D Blender model horizontal coordinates (X, Z).
 *
 * Model equations:
 *   X = a * u - b * v + tx
 *   Z = b * u + a * v + tz
 */
export function fitHelmertTransformation(
  points: GroundControlPoint[],
  referenceOrigin: { latitude: number; longitude: number }
): {
  status: CalibrationStatus
  helmertParams: HelmertParameters | null
  residuals: ControlPointResidual[]
  rmse: number | null
  warning?: string
} {
  // Need at least 2 control points
  if (points.length < 2) {
    return {
      status: 'uncalibrated',
      helmertParams: null,
      residuals: [],
      rmse: null,
      warning: 'At least 2 ground control points are required for calibration.',
    }
  }

  const n = points.length
  const localPoints = points.map((p) => {
    const { u, v } = geoToLocalMeters(p.latitude, p.longitude, referenceOrigin)
    return {
      id: p.id,
      name: p.name,
      u,
      v,
      X: p.modelPosition[0],
      Z: p.modelPosition[2],
      isVerified: p.verificationStatus === 'verified',
    }
  })

  // Compute centroids
  let sumU = 0
  let sumV = 0
  let sumX = 0
  let sumZ = 0

  for (const lp of localPoints) {
    sumU += lp.u
    sumV += lp.v
    sumX += lp.X
    sumZ += lp.Z
  }

  const meanU = sumU / n
  const meanV = sumV / n
  const meanX = sumX / n
  const meanZ = sumZ / n

  // Compute denominator and cross-products with centered coordinates
  let denom = 0
  let crossA = 0
  let crossB = 0

  for (const lp of localPoints) {
    const uPrime = lp.u - meanU
    const vPrime = lp.v - meanV
    const xPrime = lp.X - meanX
    const zPrime = lp.Z - meanZ

    denom += uPrime * uPrime + vPrime * vPrime
    crossA += uPrime * xPrime + vPrime * zPrime
    crossB += uPrime * zPrime - vPrime * xPrime
  }

  // Degeneracy check: points are coincident or geometrically collapsed
  if (denom < 1.0) {
    return {
      status: 'degenerate',
      helmertParams: null,
      residuals: [],
      rmse: null,
      warning: 'Control points are coincident or too close together for reliable orientation.',
    }
  }

  const a = crossA / denom
  const b = crossB / denom
  const scale = Math.sqrt(a * a + b * b)
  const rotationRad = Math.atan2(b, a)
  const rotationDeg = (rotationRad * 180) / Math.PI

  // Scale feasibility check: Blender model units should be near meters (scale between 0.2 and 5.0)
  if (scale < 0.05 || scale > 20.0 || !Number.isFinite(scale)) {
    return {
      status: 'degenerate',
      helmertParams: null,
      residuals: [],
      rmse: null,
      warning: `Estimated scale factor (${scale.toFixed(3)}) is outside plausible physical campus bounds.`,
    }
  }

  const tx = meanX - (a * meanU - b * meanV)
  const tz = meanZ - (b * meanU + a * meanV)

  const helmertParams: HelmertParameters = {
    a,
    b,
    tx,
    tz,
    scale,
    rotationDeg,
    translation: [tx, tz],
  }

  // Compute individual residuals and RMSE
  let sumSqErr = 0
  const residuals: ControlPointResidual[] = localPoints.map((lp) => {
    const predX = a * lp.u - b * lp.v + tx
    const predZ = b * lp.u + a * lp.v + tz
    const errX = lp.X - predX
    const errZ = lp.Z - predZ
    const errorMeters = Math.sqrt(errX * errX + errZ * errZ)
    sumSqErr += errorMeters * errorMeters
    return {
      pointId: lp.id,
      pointName: lp.name,
      errorMeters: Number(errorMeters.toFixed(2)),
    }
  })

  const rmse = Number(Math.sqrt(sumSqErr / n).toFixed(2))

  // High RMSE Error check: if residual errors exceed allowable threshold, reject calibration
  if (rmse > MAX_ACCEPTABLE_CALIBRATION_RMSE_METERS) {
    return {
      status: 'high_error',
      helmertParams: null,
      residuals,
      rmse,
      warning: `Calibration residual error (RMSE ±${rmse}m) exceeds maximum allowable threshold (${MAX_ACCEPTABLE_CALIBRATION_RMSE_METERS}m). Benchmark geometry is inconsistent with campus model.`,
    }
  }

  // Determine verification status
  const allVerified = points.every((p) => p.verificationStatus === 'verified')
  const status: CalibrationStatus = allVerified ? 'calibrated' : 'provisional'

  return {
    status,
    helmertParams,
    residuals,
    rmse,
    warning: !allVerified
      ? 'One or more benchmarks are provisional. Calibration requires field survey validation.'
      : undefined,
  }
}

/**
 * Builds a complete CalibrationModel from a list of control points.
 */
export function buildCalibrationModel(
  controlPoints: GroundControlPoint[],
  referenceOrigin?: { latitude: number; longitude: number }
): CalibrationModel {
  if (controlPoints.length === 0) {
    return {
      status: 'uncalibrated',
      controlPoints: [],
      referenceOrigin: null,
      helmertParams: null,
      residuals: [],
      rmse: null,
      warning: 'No ground control points entered.',
    }
  }

  // Use provided origin or average of control points
  const origin =
    referenceOrigin || {
      latitude: controlPoints.reduce((acc, p) => acc + p.latitude, 0) / controlPoints.length,
      longitude: controlPoints.reduce((acc, p) => acc + p.longitude, 0) / controlPoints.length,
    }

  const result = fitHelmertTransformation(controlPoints, origin)

  return {
    status: result.status,
    controlPoints,
    referenceOrigin: origin,
    helmertParams: result.helmertParams,
    residuals: result.residuals,
    rmse: result.rmse,
    warning: result.warning,
  }
}

/**
 * Transforms real-world geographic coordinates (latitude, longitude) into 3D Blender model space [X, Y, Z].
 * Returns null if calibration is not active or parameters are missing.
 */
export function geoToModelCoordinates(
  latitude: number,
  longitude: number,
  calibration: CalibrationModel
): { modelPoint: Point3; accuracyRadiusModel: number } | null {
  if (
    (calibration.status !== 'calibrated' && calibration.status !== 'provisional') ||
    !calibration.helmertParams ||
    !calibration.referenceOrigin ||
    (calibration.rmse !== null && calibration.rmse > MAX_ACCEPTABLE_CALIBRATION_RMSE_METERS)
  ) {
    return null
  }

  const { a, b, tx, tz, scale } = calibration.helmertParams
  const { u, v } = geoToLocalMeters(latitude, longitude, calibration.referenceOrigin)

  const X = a * u - b * v + tx
  const Y = 0.25 // Standard campus ground elevation in model space
  const Z = b * u + a * v + tz

  return {
    modelPoint: [Number(X.toFixed(2)), Y, Number(Z.toFixed(2))],
    accuracyRadiusModel: scale, // multiplier per meter of geographic error
  }
}

/**
 * Transforms 3D Blender model coordinates [X, Y, Z] back to geographic (latitude, longitude).
 */
export function modelToGeoCoordinates(
  modelPoint: Point3,
  calibration: CalibrationModel
): { latitude: number; longitude: number } | null {
  if (
    (calibration.status !== 'calibrated' && calibration.status !== 'provisional') ||
    !calibration.helmertParams ||
    !calibration.referenceOrigin
  ) {
    return null
  }

  const { a, b, tx, tz } = calibration.helmertParams
  const deltaX = modelPoint[0] - tx
  const deltaZ = modelPoint[2] - tz
  const det = a * a + b * b

  if (det < 1e-8) {
    return null
  }

  const u = (a * deltaX + b * deltaZ) / det
  const v = (-b * deltaX + a * deltaZ) / det

  return localMetersToGeo(u, v, calibration.referenceOrigin)
}
