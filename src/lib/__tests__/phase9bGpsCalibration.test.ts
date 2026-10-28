import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  fitHelmertTransformation,
  buildCalibrationModel,
  geoToModelCoordinates,
  modelToGeoCoordinates,
} from '../campusCalibration.ts'
import { classifyGpsPosition } from '../gpsAccuracy.ts'
import {
  DEFAULT_CAMPUS_CONTROL_POINTS,
  PROVISIONAL_CAMPUS_CONTROL_POINTS,
  FULL_17_POINT_SURVEY_CONTROL_POINTS,
} from '../../data/campusCalibrationData.ts'
import {
  CAMPUS_GPS_SURVEY_OBSERVATIONS,
} from '../../data/campusGpsSurveyData.ts'
import { PROVISIONAL_CAMPUS_BOUNDARY } from '../../data/campusGeofenceData.ts'
import type { GpsCoordinates, GroundControlPoint } from '../../types/gps.ts'

describe('Phase 9B — Real GPS to 3D Campus Blue Dot Integration', () => {
  // 1. Geographic-to-local coordinate conversion
  it('correctly converts geographic coordinates to local tangent plane and projects into 3D model space', () => {
    const model = buildCalibrationModel(PROVISIONAL_CAMPUS_CONTROL_POINTS)
    assert.equal(model.status, 'provisional')
    assert.ok(model.helmertParams !== null)
    assert.equal(model.helmertParams.isReflected, true)

    // Gate 1 real coordinates from field survey
    const gateCoords = { latitude: 12.9462708, longitude: 80.2455018 }
    const projected = geoToModelCoordinates(gateCoords.latitude, gateCoords.longitude, model)

    assert.ok(projected !== null)
    // Model coordinates for Gate 1 in 3D scene: [181.0, 0.2, -6.2]
    // Residual error is ~6.3m, so projected position should be within 10m of anchor
    assert.ok(Math.abs(projected.modelPoint[0] - 181.0) < 10.0, `Expected X ~ 181.0, got ${projected.modelPoint[0]}`)
    assert.ok(Math.abs(projected.modelPoint[2] - (-6.2)) < 10.0, `Expected Z ~ -6.2, got ${projected.modelPoint[2]}`)
  })

  // 2. Dual Helmert orientation (Direct vs Reflected)
  it('accurately chooses direct orientation for standard frame and reflected orientation for MNMJEC campus', () => {
    // Synthetic direct points (+X = East, +Z = North)
    const directPoints: GroundControlPoint[] = [
      { id: 'D1', name: 'Origin', latitude: 12.9450, longitude: 80.2430, modelPosition: [0, 0, 0], verificationStatus: 'verified', source: 'Test Mode Benchmark' },
      { id: 'D2', name: 'East', latitude: 12.9450, longitude: 80.2440, modelPosition: [100, 0, 0], verificationStatus: 'verified', source: 'Test Mode Benchmark' },
      { id: 'D3', name: 'North', latitude: 12.9460, longitude: 80.2430, modelPosition: [0, 0, 100], verificationStatus: 'verified', source: 'Test Mode Benchmark' },
    ]
    const directModel = fitHelmertTransformation(directPoints, { latitude: 12.9450, longitude: 80.2430 })
    assert.equal(directModel.helmertParams?.isReflected, false)

    // Real MNMJEC provisional points (+X = West, +Z = North)
    const reflectedModel = fitHelmertTransformation(
      PROVISIONAL_CAMPUS_CONTROL_POINTS,
      { latitude: 12.9462708, longitude: 80.2455018 }
    )
    assert.equal(reflectedModel.helmertParams?.isReflected, true)
    assert.ok(reflectedModel.rmse! < 10.0, `RMSE ${reflectedModel.rmse} must be < 10.0m`)
  })

  // 3. Exact round-trip inversion symmetry
  it('guarantees round-trip mathematical consistency between geoToModelCoordinates and modelToGeoCoordinates', () => {
    const model = buildCalibrationModel(PROVISIONAL_CAMPUS_CONTROL_POINTS)
    const testLat = 12.9461738
    const testLon = 80.2460064

    const forward = geoToModelCoordinates(testLat, testLon, model)
    assert.ok(forward !== null)

    const reverse = modelToGeoCoordinates(forward.modelPoint, model)
    assert.ok(reverse !== null)

    assert.ok(Math.abs(reverse.latitude - testLat) < 1e-6, `Lat diff: ${Math.abs(reverse.latitude - testLat)}`)
    assert.ok(Math.abs(reverse.longitude - testLon) < 1e-6, `Lon diff: ${Math.abs(reverse.longitude - testLon)}`)
  })

  // 4. Ground-level marker placement (Y coordinate)
  it('places the projected marker on the walkable ground surface (Y = 0.25) to avoid z-fighting', () => {
    const model = buildCalibrationModel(PROVISIONAL_CAMPUS_CONTROL_POINTS)
    const projected = geoToModelCoordinates(12.9462708, 80.2455018, model)
    assert.ok(projected !== null)
    assert.equal(projected.modelPoint[1], 0.25, 'Marker Y coordinate must be 0.25')
  })

  // 5. Marker updates dynamically when GPS coordinates change
  it('updates 3D position dynamically when GPS coordinates update from Gate 1 to Maths Department', () => {
    const model = buildCalibrationModel(PROVISIONAL_CAMPUS_CONTROL_POINTS)

    // Position 1: Gate 1
    const coords1: GpsCoordinates = {
      latitude: 12.9462708,
      longitude: 80.2455018,
      accuracy: 6,
      altitude: null,
      altitudeAccuracy: null,
      heading: null,
      speed: null,
      timestamp: Date.now(),
    }
    const class1 = classifyGpsPosition(coords1, 'active', model, false)
    assert.equal(class1.status, 'location_available')
    assert.ok(class1.modelPoint !== null)

    // Position 2: Maths Department
    const coords2: GpsCoordinates = {
      latitude: 12.9461738,
      longitude: 80.2460064,
      accuracy: 7,
      altitude: null,
      altitudeAccuracy: null,
      heading: null,
      speed: null,
      timestamp: Date.now() + 1000,
    }
    const class2 = classifyGpsPosition(coords2, 'active', model, false)
    assert.equal(class2.status, 'location_available')
    assert.ok(class2.modelPoint !== null)

    // Ensure positions are distinct and update properly
    const dx = class1.modelPoint[0] - class2.modelPoint[0]
    const dz = class1.modelPoint[2] - class2.modelPoint[2]
    const dist = Math.sqrt(dx * dx + dz * dz)
    assert.ok(dist > 50, `Distance between points should be > 50m, got ${dist.toFixed(1)}m`)
  })

  // 6. Geolocation permission denied, unavailable, and timeout handling
  it('handles permission denied, position unavailable, and timeout gracefully without fabricating a position', () => {
    const model = buildCalibrationModel(PROVISIONAL_CAMPUS_CONTROL_POINTS)

    const denied = classifyGpsPosition(null, 'permission_denied', model, false)
    assert.equal(denied.status, 'permission_denied')
    assert.equal(denied.modelPoint, null)

    const unavail = classifyGpsPosition(null, 'position_unavailable', model, false)
    assert.equal(unavail.status, 'gps_unavailable')
    assert.equal(unavail.modelPoint, null)

    const timeout = classifyGpsPosition(null, 'timeout', model, false)
    assert.equal(timeout.status, 'timeout')
    assert.equal(timeout.modelPoint, null)
  })

  // 7. Low-accuracy location handling
  it('rejects coarse GPS accuracy (>30m) without creating a 3D model marker', () => {
    const model = buildCalibrationModel(PROVISIONAL_CAMPUS_CONTROL_POINTS)
    const coarseCoords: GpsCoordinates = {
      latitude: 12.9462708,
      longitude: 80.2455018,
      accuracy: 38, // > 30m
      altitude: null,
      altitudeAccuracy: null,
      heading: null,
      speed: null,
      timestamp: Date.now(),
    }

    const result = classifyGpsPosition(coarseCoords, 'active', model, false)
    assert.equal(result.status, 'accuracy_insufficient')
    assert.equal(result.modelPoint, null)
    assert.equal(result.accuracyClass, 'rejected')
  })

  // 8. Outside campus handling
  it('rejects coordinates outside the physical campus boundary without displaying on campus', () => {
    const model = buildCalibrationModel(PROVISIONAL_CAMPUS_CONTROL_POINTS)
    // Tidel Park / OMR coordinates ~6km north
    const offCampusCoords: GpsCoordinates = {
      latitude: 12.989000,
      longitude: 80.247000,
      accuracy: 5,
      altitude: null,
      altitudeAccuracy: null,
      heading: null,
      speed: null,
      timestamp: Date.now(),
    }

    const result = classifyGpsPosition(offCampusCoords, 'active', model, false)
    assert.equal(result.status, 'outside_campus')
    assert.equal(result.modelPoint, null)
    assert.ok(result.message.includes('outside the MNMJEC campus boundary'))
  })

  // 9. Preservation of all 17 raw survey observations
  it('preserves all 17 raw survey observations exactly as recorded by GPS Test without modification', () => {
    assert.equal(CAMPUS_GPS_SURVEY_OBSERVATIONS.length, 17)

    const ids = CAMPUS_GPS_SURVEY_OBSERVATIONS.map((o) => o.id)
    assert.ok(ids.includes('survey-main-gate-1'))
    assert.ok(ids.includes('survey-physics-dept'))
    assert.ok(ids.includes('survey-it-block'))
    assert.ok(ids.includes('survey-mech-block'))
    assert.ok(ids.includes('survey-civil-block'))
    assert.ok(ids.includes('survey-canteen'))
    assert.ok(ids.includes('survey-maths-dept'))
    assert.ok(ids.includes('survey-oat'))
    assert.ok(ids.includes('survey-first-year-block'))

    // Verify Gate 1 raw values
    const obsGate1 = CAMPUS_GPS_SURVEY_OBSERVATIONS.find((o) => o.id === 'survey-main-gate-1')
    assert.equal(obsGate1?.locationName, 'Main Entrance Gate 1')
    assert.equal(obsGate1?.latitude, 12.9462708)
    assert.equal(obsGate1?.longitude, 80.2455018)
    assert.equal(obsGate1?.horizontalAccuracyMeters, 3.8)

    // Verify uncollected locations are NOT in observations
    assert.equal(CAMPUS_GPS_SURVEY_OBSERVATIONS.some((o) => o.locationName.includes('Gate 2')), false)
    assert.equal(CAMPUS_GPS_SURVEY_OBSERVATIONS.some((o) => o.locationName.includes('Boys Hostel Approach')), false)
  })

  // 10. Rejection of uncalibrated or high-error models
  it('rejects uncalibrated and high-error (>10m RMSE) calibrations from rendering 3D marker', () => {
    // Uncalibrated
    const uncal = buildCalibrationModel([])
    const coords: GpsCoordinates = {
      latitude: 12.9462708,
      longitude: 80.2455018,
      accuracy: 6,
      altitude: null,
      altitudeAccuracy: null,
      heading: null,
      speed: null,
      timestamp: Date.now(),
    }
    const resUncal = classifyGpsPosition(coords, 'active', uncal, false)
    assert.equal(resUncal.status, 'calibration_pending')
    assert.equal(resUncal.modelPoint, null)

    // Full 17-point raw survey model (RMSE = 27.79m, which is > 10m threshold)
    const raw17Model = buildCalibrationModel(FULL_17_POINT_SURVEY_CONTROL_POINTS)
    assert.equal(raw17Model.status, 'high_error')
    assert.ok(raw17Model.rmse! > 10.0)

    const resRaw17 = classifyGpsPosition(coords, 'active', raw17Model, false)
    assert.equal(resRaw17.status, 'calibration_pending')
    assert.equal(resRaw17.modelPoint, null)
    assert.ok(resRaw17.message.includes('exceeds acceptable threshold'))
  })

  // 11. Ensuring showing location dot does not unlock turn-by-turn navigation
  it('ensures that showing the location dot does not automatically unlock turn-by-turn navigation', () => {
    // DEFAULT_CAMPUS_CONTROL_POINTS must remain strictly empty
    assert.equal(DEFAULT_CAMPUS_CONTROL_POINTS.length, 0)

    // Geofence metadata isApprovedForLiveNavigation must remain strictly false
    assert.equal(PROVISIONAL_CAMPUS_BOUNDARY.metadata.isApprovedForLiveNavigation, false)

    // Provisional model status is 'provisional', which also prevents turn-by-turn approval
    const model = buildCalibrationModel(PROVISIONAL_CAMPUS_CONTROL_POINTS)
    assert.equal(model.status, 'provisional')

    // Live navigation condition: geofence?.isApprovedForLiveNavigation === true && calibrationModel.status === 'calibrated'
    const isApprovedGeofence: boolean = PROVISIONAL_CAMPUS_BOUNDARY.metadata.isApprovedForLiveNavigation
    const isModelCalibrated: boolean = (model.status as string) === 'calibrated'
    const isNavigationApproved = isApprovedGeofence && isModelCalibrated
    assert.equal(isNavigationApproved, false)
  })
})
