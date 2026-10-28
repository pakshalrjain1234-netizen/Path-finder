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
    assert.equal(getAccuracyClass(155), 'rejected')
    assert.equal(getAccuracyClass(-1), 'rejected')
    assert.equal(getAccuracyClass(NaN), 'rejected')
    assert.equal(getAccuracyClass(undefined), 'rejected')
    assert.equal(getAccuracyClass(null), 'rejected')
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
    assert.equal(permDenied.accuracyClass, 'rejected')
    assert.equal(permDenied.modelPoint, null)
    assert.ok(permDenied.message.includes('Location access was denied'))

    const unavail = classifyGpsPosition(null, 'position_unavailable', uncalibrated)
    assert.equal(unavail.status, 'gps_unavailable')
    assert.equal(unavail.accuracyClass, 'rejected')
    assert.equal(unavail.modelPoint, null)
    assert.ok(unavail.message.includes('GPS signal unavailable'))

    const timeout = classifyGpsPosition(null, 'timeout', uncalibrated)
    assert.equal(timeout.status, 'timeout')
    assert.equal(timeout.accuracyClass, 'rejected')
    assert.equal(timeout.modelPoint, null)
    assert.ok(timeout.message.includes('Location request timed out'))

    const unsupported = classifyGpsPosition(null, 'unsupported', uncalibrated)
    assert.equal(unsupported.status, 'gps_unavailable')
    assert.equal(unsupported.accuracyClass, 'rejected')
    assert.equal(unsupported.modelPoint, null)
    assert.ok(unsupported.message.includes('Geolocation API is not supported'))
  })

  it('diagnostic 1: correctly handles valid accuracy such as 15 m', () => {
    const calibrated = buildCalibrationModel(TEST_MODE_CONTROL_POINTS)
    const validCoords: GpsCoordinates = {
      latitude: 12.945040,
      longitude: 80.243780,
      accuracy: 15, // 15m is within medium threshold (<= 25m)
      altitude: 10,
      altitudeAccuracy: 3,
      heading: null,
      speed: null,
      timestamp: Date.now(),
    }

    assert.equal(getAccuracyClass(15), 'medium')

    const result = classifyGpsPosition(validCoords, 'active', calibrated, true)
    assert.equal(result.status, 'location_available')
    assert.equal(result.accuracyClass, 'medium')
    assert.ok(result.modelPoint !== null)
    assert.ok(result.rawCoordinates !== null)
    assert.equal(result.rawCoordinates?.accuracy, 15)
    assert.ok(result.message.includes('±15m'))
  })

  it('diagnostic 2: distinguishes valid but poor accuracy (155 m) with explicit numeric accuracy message', () => {
    const calibrated = buildCalibrationModel(TEST_MODE_CONTROL_POINTS)
    const poorCoords: GpsCoordinates = {
      latitude: 12.945040,
      longitude: 80.243780,
      accuracy: 155, // 155m exceeds 30m maxAcceptable
      altitude: null,
      altitudeAccuracy: null,
      heading: null,
      speed: null,
      timestamp: Date.now(),
    }

    assert.equal(getAccuracyClass(155), 'rejected')

    const result = classifyGpsPosition(poorCoords, 'active', calibrated)
    assert.equal(result.status, 'accuracy_insufficient')
    assert.equal(result.accuracyClass, 'rejected')
    assert.equal(result.modelPoint, null)
    assert.ok(result.rawCoordinates !== null)
    assert.equal(result.rawCoordinates?.accuracy, 155)
    assert.equal(
      result.message,
      'Low GPS accuracy warning: ±155m exceeds 30m threshold for campus positioning.'
    )
  })

  it('diagnostic 3: distinguishes missing or invalid accuracy (NaN, undefined, null, negative) with unrecorded warning', () => {
    const calibrated = buildCalibrationModel(TEST_MODE_CONTROL_POINTS)

    // NaN accuracy
    const nanCoords: GpsCoordinates = {
      latitude: 12.945040,
      longitude: 80.243780,
      accuracy: NaN,
      altitude: null,
      altitudeAccuracy: null,
      heading: null,
      speed: null,
      timestamp: Date.now(),
    }
    const nanResult = classifyGpsPosition(nanCoords, 'active', calibrated)
    assert.equal(nanResult.status, 'accuracy_insufficient')
    assert.equal(nanResult.accuracyClass, 'rejected')
    assert.equal(nanResult.modelPoint, null)
    assert.equal(nanResult.message, 'Low GPS accuracy warning: accuracy value not recorded.')

    // undefined accuracy (e.g. from malformed navigator position)
    const undefinedCoords = {
      latitude: 12.945040,
      longitude: 80.243780,
      accuracy: undefined as unknown as number,
      altitude: null,
      altitudeAccuracy: null,
      heading: null,
      speed: null,
      timestamp: Date.now(),
    }
    const undefinedResult = classifyGpsPosition(undefinedCoords, 'active', calibrated)
    assert.equal(undefinedResult.status, 'accuracy_insufficient')
    assert.equal(undefinedResult.accuracyClass, 'rejected')
    assert.equal(undefinedResult.modelPoint, null)
    assert.equal(undefinedResult.message, 'Low GPS accuracy warning: accuracy value not recorded.')

    // null accuracy
    const nullCoords = {
      latitude: 12.945040,
      longitude: 80.243780,
      accuracy: null as unknown as number,
      altitude: null,
      altitudeAccuracy: null,
      heading: null,
      speed: null,
      timestamp: Date.now(),
    }
    const nullResult = classifyGpsPosition(nullCoords, 'active', calibrated)
    assert.equal(nullResult.status, 'accuracy_insufficient')
    assert.equal(nullResult.accuracyClass, 'rejected')
    assert.equal(nullResult.modelPoint, null)
    assert.equal(nullResult.message, 'Low GPS accuracy warning: accuracy value not recorded.')

    // negative accuracy
    const negativeCoords: GpsCoordinates = {
      latitude: 12.945040,
      longitude: 80.243780,
      accuracy: -5,
      altitude: null,
      altitudeAccuracy: null,
      heading: null,
      speed: null,
      timestamp: Date.now(),
    }
    const negativeResult = classifyGpsPosition(negativeCoords, 'active', calibrated)
    assert.equal(negativeResult.status, 'accuracy_insufficient')
    assert.equal(negativeResult.accuracyClass, 'rejected')
    assert.equal(negativeResult.modelPoint, null)
    assert.equal(negativeResult.message, 'Low GPS accuracy warning: accuracy value not recorded.')
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

  it('allows provisional calibration to place blue location marker in live mode (!isSimulated) with provisional notice', () => {
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
    assert.equal(result.status, 'location_available')
    assert.ok(result.modelPoint !== null) // Allows blue dot placement on model
    assert.ok(result.message.includes('Provisional calibration'))
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
