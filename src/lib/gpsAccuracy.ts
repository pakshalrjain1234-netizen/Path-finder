import { CAMPUS_MODEL_BOUNDS } from '../data/campusCalibrationData.ts'
import {
  geoToModelCoordinates,
  MAX_ACCEPTABLE_CALIBRATION_RMSE_METERS,
} from './campusCalibration.ts'
import type {
  AccuracyClass,
  CalibrationModel,
  GpsCoordinates,
  GpsServiceStatus,
  PositionClassification,
} from '../types/gps.ts'

export const GPS_ACCURACY_THRESHOLDS = {
  highMeters: 10,
  mediumMeters: 25,
  maxAcceptableMeters: 30,
}

/**
 * Categorizes reported GPS accuracy in meters into qualitative accuracy classes.
 */
export function getAccuracyClass(accuracyMeters?: number | null): AccuracyClass {
  if (
    accuracyMeters === undefined ||
    accuracyMeters === null ||
    !Number.isFinite(accuracyMeters) ||
    accuracyMeters < 0
  ) {
    return 'rejected'
  }
  if (accuracyMeters <= GPS_ACCURACY_THRESHOLDS.highMeters) {
    return 'high'
  }
  if (accuracyMeters <= GPS_ACCURACY_THRESHOLDS.mediumMeters) {
    return 'medium'
  }
  if (accuracyMeters <= GPS_ACCURACY_THRESHOLDS.maxAcceptableMeters) {
    return 'poor'
  }
  return 'rejected'
}

/**
 * Tests whether a 3D model coordinate lies within the physical campus bounding envelope.
 */
export function isPointInsideCampus(
  x: number,
  z: number,
  bufferMeters: number = 25.0
): boolean {
  return (
    x >= CAMPUS_MODEL_BOUNDS.minX - bufferMeters &&
    x <= CAMPUS_MODEL_BOUNDS.maxX + bufferMeters &&
    z >= CAMPUS_MODEL_BOUNDS.minZ - bufferMeters &&
    z <= CAMPUS_MODEL_BOUNDS.maxZ + bufferMeters
  )
}

/**
 * Evaluates a raw GPS fix against the campus calibration model and returns
 * an honest, complete classification without fabricating 3D points.
 */
export function classifyGpsPosition(
  coords: GpsCoordinates | null,
  serviceStatus: GpsServiceStatus,
  calibration: CalibrationModel,
  isSimulated: boolean = false
): PositionClassification {
  // Service-level error states
  if (serviceStatus === 'permission_denied') {
    return {
      status: 'permission_denied',
      message: 'Location access was denied. Enable location permission in your browser to use GPS.',
      accuracyClass: 'rejected',
      modelPoint: null,
      accuracyRadiusModel: null,
      rawCoordinates: null,
      isSimulated,
    }
  }

  if (serviceStatus === 'position_unavailable') {
    return {
      status: 'gps_unavailable',
      message: 'GPS signal unavailable. Ensure device location hardware is enabled and outdoors.',
      accuracyClass: 'rejected',
      modelPoint: null,
      accuracyRadiusModel: null,
      rawCoordinates: null,
      isSimulated,
    }
  }

  if (serviceStatus === 'timeout') {
    return {
      status: 'timeout',
      message: 'Location request timed out while waiting for satellite fix.',
      accuracyClass: 'rejected',
      modelPoint: null,
      accuracyRadiusModel: null,
      rawCoordinates: null,
      isSimulated,
    }
  }

  if (serviceStatus === 'unsupported') {
    return {
      status: 'gps_unavailable',
      message: 'Geolocation API is not supported on this browser or device.',
      accuracyClass: 'rejected',
      modelPoint: null,
      accuracyRadiusModel: null,
      rawCoordinates: null,
      isSimulated,
    }
  }

  if (!coords) {
    return {
      status: 'idle',
      message: 'GPS location tracking is idle. Click "Find My Location" to locate.',
      accuracyClass: 'rejected',
      modelPoint: null,
      accuracyRadiusModel: null,
      rawCoordinates: null,
      isSimulated,
    }
  }

  const hasValidAccuracy =
    typeof coords.accuracy === 'number' &&
    Number.isFinite(coords.accuracy) &&
    coords.accuracy >= 0

  const accuracyClass = getAccuracyClass(coords.accuracy)

  // 1. Accuracy Check: reject fixes coarser than maxAcceptableMeters or missing accuracy
  if (accuracyClass === 'rejected') {
    return {
      status: 'accuracy_insufficient',
      message: hasValidAccuracy
        ? `Low GPS accuracy warning: ±${coords.accuracy.toFixed(0)}m exceeds ${GPS_ACCURACY_THRESHOLDS.maxAcceptableMeters}m threshold for campus positioning.`
        : 'Low GPS accuracy warning: accuracy value not recorded.',
      accuracyClass: 'rejected',
      modelPoint: null,
      accuracyRadiusModel: null,
      rawCoordinates: coords,
      isSimulated,
    }
  }

  // 2. Calibration Check: is there a valid, calibrated transformation model?
  if (
    calibration.status === 'high_error' ||
    (calibration.rmse !== null && calibration.rmse > MAX_ACCEPTABLE_CALIBRATION_RMSE_METERS)
  ) {
    return {
      status: 'calibration_pending',
      message: `Campus calibration residual error (RMSE ±${calibration.rmse}m) exceeds acceptable threshold (${MAX_ACCEPTABLE_CALIBRATION_RMSE_METERS}m). 3D campus positioning disabled.`,
      accuracyClass,
      modelPoint: null,
      accuracyRadiusModel: null,
      rawCoordinates: coords,
      isSimulated,
    }
  }

  if (calibration.status === 'degenerate') {
    return {
      status: 'calibration_pending',
      message: 'Campus map calibration is degenerate or ill-conditioned. Please check ground control points.',
      accuracyClass,
      modelPoint: null,
      accuracyRadiusModel: null,
      rawCoordinates: coords,
      isSimulated,
    }
  }

  if (calibration.status === 'uncalibrated' || !calibration.helmertParams) {
    return {
      status: 'calibration_pending',
      message: hasValidAccuracy
        ? `GPS acquired (±${coords.accuracy.toFixed(0)}m) — Campus map calibration pending. Field benchmarks required before 3D mapping.`
        : 'GPS acquired — Campus map calibration pending. Field benchmarks required before 3D mapping.',
      accuracyClass,
      modelPoint: null,
      accuracyRadiusModel: null,
      rawCoordinates: coords,
      isSimulated,
    }
  }


  // 3. Transformation & Campus Boundary Check
  const transformed = geoToModelCoordinates(coords.latitude, coords.longitude, calibration)
  if (!transformed) {
    return {
      status: 'calibration_pending',
      message: 'Unable to project geographic coordinates into 3D campus coordinate space.',
      accuracyClass,
      modelPoint: null,
      accuracyRadiusModel: null,
      rawCoordinates: coords,
      isSimulated,
    }
  }

  const [mX, , mZ] = transformed.modelPoint
  if (!isPointInsideCampus(mX, mZ)) {
    return {
      status: 'outside_campus',
      message: `Reported location is outside the MNMJEC campus boundary (${coords.latitude.toFixed(5)}°, ${coords.longitude.toFixed(5)}°).`,
      accuracyClass,
      modelPoint: null,
      accuracyRadiusModel: null,
      rawCoordinates: coords,
      isSimulated,
    }
  }

  // 4. All checks passed: Location Available
  const modelAccuracyRadius = hasValidAccuracy
    ? coords.accuracy * (transformed.accuracyRadiusModel || 1.0)
    : 5.0
  const isProvisional = calibration.status === 'provisional'
  const accuracyText = hasValidAccuracy ? `±${coords.accuracy.toFixed(0)}m` : 'accuracy unrecorded'

  return {
    status: 'location_available',
    message: isProvisional
      ? `Location mapped to campus (${accuracyText}) • Provisional calibration`
      : `Location mapped to campus (${accuracyText})`,
    accuracyClass,
    modelPoint: transformed.modelPoint,
    accuracyRadiusModel: Number(modelAccuracyRadius.toFixed(1)),
    rawCoordinates: coords,
    isSimulated,
  }
}
