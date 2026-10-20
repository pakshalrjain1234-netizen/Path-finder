import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  getAccuracyClass,
  isPointInsideCampus,
  classifyGpsPosition,
  GPS_ACCURACY_THRESHOLDS,
} from '../gpsAccuracy.ts'
import { buildCalibrationModel } from '../campusCalibration.ts'
import { TEST_MODE_CONTROL_POINTS } from '../../data/campusCalibrationData.ts'
import type { GpsCoordinates } from '../../types/gps.ts'

describe('GPS Accuracy & Position Classification', () => {
  it('correctly maps accuracy thresholds to accuracy classes', () => {
    assert.equal(getAccuracyClass(5), 'high')
    assert.equal(getAccuracyClass(GPS_ACCURACY_THRESHOLDS.highMeters), 'high')
    assert.equal(getAccuracyClass(15), 'medium')
    assert.equal(getAccuracyClass(GPS_ACCURACY_THRESHOLDS.mediumMeters), 'medium')
    assert.equal(getAccuracyClass(28), 'poor')
    assert.equal(getAccuracyClass(GPS_ACCURACY_THRESHOLDS.maxAcceptableMeters), 'poor')
    assert.equal(getAccuracyClass(35), 'rejected')
    assert.equal(getAccuracyClass(-1), 'rejected')
    assert.equal(getAccuracyClass(Infinity), 'rejected')
  })

  it('accurately verifies whether model coordinates are inside or outside campus boundaries', () => {
    // Within campus envelope (bounds minX: -25, maxX: 265, minZ: -215, maxZ: 25)
    assert.equal(isPointInsideCampus(100, -50), true)
    assert.equal(isPointInsideCampus(181, -6), true)

    // Far outside campus envelope
    assert.equal(isPointInsideCampus(1000, 500), false)
    assert.equal(isPointInsideCampus(-300, -500), false)
  })

  it('classifies idle state when no coordinates are present', () => {
    const uncalibrated = buildCalibrationModel([])
    const result = classifyGpsPosition(null, 'idle', uncalibrated)

    assert.equal(result.status, 'idle')
    assert.equal(result.modelPoint, null)
    assert.equal(result.accuracyRadiusModel, null)
  })

  it('classifies service error states: permission denied, unavailable, and timeout', () => {
    const uncalibrated = buildCalibrationModel([])

    const permDenied = classifyGpsPosition(null, 'permission_denied', uncalibrated)
    assert.equal(permDenied.status, 'permission_denied')
    assert.equal(permDenied.modelPoint, null)

    const unavail = classifyGpsPosition(null, 'position_unavailable', uncalibrated)
    assert.equal(unavail.status, 'gps_unavailable')
    assert.equal(unavail.modelPoint, null)

    const timeout = classifyGpsPosition(null, 'timeout', uncalibrated)
    assert.equal(timeout.status, 'timeout')
    assert.equal(timeout.modelPoint, null)
  })

  it('rejects coordinates with insufficient accuracy (>30m) without creating 3D point', () => {
    const calibrated = buildCalibrationModel(TEST_MODE_CONTROL_POINTS)
    const coarseCoords: GpsCoordinates = {
      latitude: 12.8715,
      longitude: 80.2195,
      accuracy: 45, // 45m exceeds 30m maxAcceptable
      altitude: null,
      altitudeAccuracy: null,
      heading: null,
      speed: null,
      timestamp: Date.now(),
    }

    const result = classifyGpsPosition(coarseCoords, 'active', calibrated)
    assert.equal(result.status, 'accuracy_insufficient')
    assert.equal(result.modelPoint, null)
    assert.equal(result.accuracyClass, 'rejected')
  })

  it('reports calibration_pending when campus model has no ground control points (uncalibrated state)', () => {
    const emptyCalibration = buildCalibrationModel([])
    const validCoords: GpsCoordinates = {
      latitude: 12.8715,
      longitude: 80.2195,
      accuracy: 8,
      altitude: null,
      altitudeAccuracy: null,
      heading: null,
      speed: null,
      timestamp: Date.now(),
    }

    const result = classifyGpsPosition(validCoords, 'active', emptyCalibration)
    assert.equal(result.status, 'calibration_pending')
    assert.equal(result.modelPoint, null) // Must NEVER fabricate 3D point in uncalibrated state!
    assert.ok(result.rawCoordinates !== null)
  })

  it('detects when position falls outside physical campus boundaries', () => {
    const calibrated = buildCalibrationModel(TEST_MODE_CONTROL_POINTS)
    // Coordinates ~2 km away from campus
    const offCampusCoords: GpsCoordinates = {
      latitude: 12.8900,
      longitude: 80.2400,
      accuracy: 8,
      altitude: null,
      altitudeAccuracy: null,
      heading: null,
      speed: null,
      timestamp: Date.now(),
    }

    const result = classifyGpsPosition(offCampusCoords, 'active', calibrated)
    assert.equal(result.status, 'outside_campus')
    assert.equal(result.modelPoint, null)
  })

  it('successfully calculates 3D model point when calibrated, inside campus, and accurate in test mode', () => {
    const calibrated = buildCalibrationModel(TEST_MODE_CONTROL_POINTS)
    const gateCoords: GpsCoordinates = {
      latitude: 12.945040,
      longitude: 80.243780,
      accuracy: 6,
      altitude: 12,
      altitudeAccuracy: 3,
      heading: null,
      speed: null,
      timestamp: Date.now(),
    }

    const result = classifyGpsPosition(gateCoords, 'active', calibrated, true)
    assert.equal(result.status, 'location_available')
    assert.ok(result.modelPoint !== null)
    assert.ok(result.accuracyRadiusModel !== null)
    assert.equal(result.accuracyClass, 'high')
  })

  it('regression: prevents provisional calibration from placing real blue marker in live mode (!isSimulated)', () => {
    // Model with provisional benchmarks
    const provisionalModel = {
      ...buildCalibrationModel(TEST_MODE_CONTROL_POINTS),
      status: 'provisional' as const,
    }

    const gateCoords: GpsCoordinates = {
      latitude: 12.945040,
      longitude: 80.243780,
      accuracy: 6,
      altitude: 12,
      altitudeAccuracy: 3,
      heading: null,
      speed: null,
      timestamp: Date.now(),
    }

    // Live mode (isSimulated = false)
    const result = classifyGpsPosition(gateCoords, 'active', provisionalModel, false)
    assert.equal(result.status, 'calibration_pending')
    assert.equal(result.modelPoint, null) // Prohibits real blue marker
    assert.ok(result.message.includes('Real campus positioning is disabled'))
  })

  it('regression: prevents high RMSE calibration (>10m) from placing 3D marker', () => {
    const highErrorModel = {
      ...buildCalibrationModel(TEST_MODE_CONTROL_POINTS),
      status: 'high_error' as const,
      rmse: 43.18,
    }

    const gateCoords: GpsCoordinates = {
      latitude: 12.945040,
      longitude: 80.243780,
      accuracy: 6,
      altitude: 12,
      altitudeAccuracy: 3,
      heading: null,
      speed: null,
      timestamp: Date.now(),
    }

    const result = classifyGpsPosition(gateCoords, 'active', highErrorModel, true)
    assert.equal(result.status, 'calibration_pending')
    assert.equal(result.modelPoint, null) // Prohibits 3D marker
    assert.ok(result.message.includes('exceeds acceptable threshold'))
  })

  it('regression: rejects displaced southern geographic coordinates (~12.8715°N) as outside campus boundary', () => {
    const calibrated = buildCalibrationModel(TEST_MODE_CONTROL_POINTS)
    // Erroneous southern reference from previous session (~8km away from MNMJEC at 12.945°N)
    const displacedCoords: GpsCoordinates = {
      latitude: 12.871500,
      longitude: 80.219500,
      accuracy: 6,
      altitude: 12,
      altitudeAccuracy: 3,
      heading: null,
      speed: null,
      timestamp: Date.now(),
    }

    const result = classifyGpsPosition(displacedCoords, 'active', calibrated, true)
    assert.equal(result.status, 'outside_campus')
    assert.equal(result.modelPoint, null)
    assert.ok(result.message.includes('outside the MNMJEC campus boundary'))
  })
})
