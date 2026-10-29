import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { getGpsButtonLabels } from '../gpsButtonLabels.ts'
import {
  geoToLocalMeters,
  localMetersToGeo,
  buildCalibrationModel,
  geoToModelCoordinates,
  modelToGeoCoordinates,
} from '../campusCalibration.ts'
import {
  classifyGpsPosition,
  getAccuracyClass,
  GPS_ACCURACY_THRESHOLDS,
  isPointInsideCampus,
} from '../gpsAccuracy.ts'
import {
  PROVISIONAL_CAMPUS_CONTROL_POINTS,
  DEFAULT_CAMPUS_CONTROL_POINTS,
  CAMPUS_MODEL_BOUNDS,
} from '../../data/campusCalibrationData.ts'
import {
  getSurveyObservationById,
} from '../../data/campusGpsSurveyData.ts'
import { PROVISIONAL_CAMPUS_BOUNDARY } from '../../data/campusGeofenceData.ts'
import type { GpsCoordinates } from '../../types/gps.ts'

describe('Path Finder — Issue 1: Mobile Find My Location Button & Responsive Usability', () => {
  it('computes responsive labels in idle state for mobile and desktop', () => {
    const labels = getGpsButtonLabels('idle', false)
    assert.equal(labels.mobileText, 'Locate', 'Mobile label must be concise "Locate"')
    assert.equal(labels.desktopText, 'Find My Location', 'Desktop label must be "Find My Location"')
    assert.equal(labels.ariaLabel, 'Find my location on campus')
    assert.equal(labels.disabled, false)
  })

  it('computes responsive labels in requesting state with disabled flag', () => {
    const labels = getGpsButtonLabels('requesting', false)
    assert.equal(labels.mobileText, 'Locating...', 'Mobile label must be concise "Locating..."')
    assert.equal(labels.desktopText, 'Acquiring GPS Signal...', 'Desktop label must be descriptive')
    assert.equal(labels.ariaLabel, 'Acquiring GPS Signal...')
    assert.equal(labels.disabled, true)
  })

  it('computes responsive labels in active live tracking state with stop guidance', () => {
    const labels = getGpsButtonLabels('active', true, 'location_available', false)
    assert.equal(labels.mobileText, 'Tracking', 'Mobile label must be concise "Tracking"')
    assert.equal(labels.desktopText, 'Live GPS Active (Stop)')
    assert.equal(labels.ariaLabel, 'Stop Live GPS tracking')
    assert.equal(labels.disabled, false)
  })

  it('computes responsive labels in active test mode tracking state', () => {
    const labels = getGpsButtonLabels('active', true, 'location_available', true)
    assert.equal(labels.mobileText, 'Tracking')
    assert.equal(labels.desktopText, 'Test GPS Active (Stop)')
    assert.equal(labels.ariaLabel, 'Stop Test GPS tracking')
  })

  it('computes responsive labels in permission denied state with retry prompt', () => {
    const labels = getGpsButtonLabels('permission_denied', false)
    assert.equal(labels.mobileText, 'Retry GPS')
    assert.equal(labels.desktopText, 'Permission Denied (Retry)')
    assert.equal(labels.ariaLabel, 'Location permission denied. Click to retry.')
    assert.equal(labels.disabled, false)
  })

  it('respects explicit compact override across all states', () => {
    const idleCompact = getGpsButtonLabels('idle', false, undefined, false, true)
    assert.equal(idleCompact.desktopText, 'Locate')

    const reqCompact = getGpsButtonLabels('requesting', false, undefined, false, true)
    assert.equal(reqCompact.desktopText, 'Locating...')

    const trackCompact = getGpsButtonLabels('active', true, 'location_available', false, true)
    assert.equal(trackCompact.desktopText, 'Tracking')

    const permCompact = getGpsButtonLabels('permission_denied', false, undefined, false, true)
    assert.equal(permCompact.desktopText, 'Retry GPS')
  })
})

describe('Path Finder — Issue 2: Civil Block Indoor Positioning & Coordinate Pipeline Diagnostics', () => {
  const model = buildCalibrationModel(PROVISIONAL_CAMPUS_CONTROL_POINTS)

  it('traces the coordinate pipeline from geographic coordinates to 3D model space', () => {
    assert.equal(model.status, 'provisional')
    assert.ok(model.helmertParams !== null)
    assert.equal(model.helmertParams.isReflected, true)

    // Campus reference origin is Gate 1
    const origin = model.referenceOrigin
    assert.ok(origin !== null)

    // Test Gate 1 survey point
    const gate1 = getSurveyObservationById('survey-main-gate-1')
    assert.ok(gate1 !== undefined)

    const localGateToSelf = geoToLocalMeters(gate1.latitude, gate1.longitude, {
      latitude: gate1.latitude,
      longitude: gate1.longitude,
    })
    assert.ok(Math.abs(localGateToSelf.u) < 1e-4, 'Gate 1 u offset relative to itself must be ~0')
    assert.ok(Math.abs(localGateToSelf.v) < 1e-4, 'Gate 1 v offset relative to itself must be ~0')

    const localGateToCentroid = geoToLocalMeters(gate1.latitude, gate1.longitude, origin)
    assert.ok(Number.isFinite(localGateToCentroid.u))
    assert.ok(Number.isFinite(localGateToCentroid.v))

    const projectedGate = geoToModelCoordinates(gate1.latitude, gate1.longitude, model)
    assert.ok(projectedGate !== null)
    assert.ok(Math.abs(projectedGate.modelPoint[0] - gate1.stageE3GroundPosition[0]) < 10.0)
    assert.ok(Math.abs(projectedGate.modelPoint[2] - gate1.stageE3GroundPosition[2]) < 10.0)
  })

  it('diagnoses the Civil Block coordinate pipeline and documents the mathematical offset under provisional calibration', () => {
    const civilObs = getSurveyObservationById('survey-civil-block')
    assert.ok(civilObs !== undefined)

    // 1. Authoritative ground position in 3D model
    const [expectedX, , expectedZ] = civilObs.stageE3GroundPosition
    assert.equal(expectedX, 136.2)
    assert.equal(expectedZ, -78.2)

    // Civil Block physical building envelope
    const civilBounds = { minX: 137.0, maxX: 152.0, minZ: -83.0, maxZ: -54.8 }

    // 2. Real-world distance from Gate 1 to Civil Block
    const gate1Obs = getSurveyObservationById('survey-main-gate-1')!
    const realOffset = geoToLocalMeters(civilObs.latitude, civilObs.longitude, {
      latitude: gate1Obs.latitude,
      longitude: gate1Obs.longitude,
    })
    const realDistance = Math.hypot(realOffset.u, realOffset.v)
    assert.ok(realDistance > 75 && realDistance < 85, `Real distance ~80.2m, got ${realDistance.toFixed(1)}m`)

    // 3D model distance from Gate 1 to Civil Block
    const modelDistance = Math.hypot(
      civilObs.stageE3GroundPosition[0] - gate1Obs.stageE3GroundPosition[0],
      civilObs.stageE3GroundPosition[2] - gate1Obs.stageE3GroundPosition[2]
    )
    assert.ok(modelDistance > 80 && modelDistance < 90, `Model distance ~84.8m, got ${modelDistance.toFixed(1)}m`)

    // 3. Project Civil Block surveyed coordinates through provisional calibration
    const projected = geoToModelCoordinates(civilObs.latitude, civilObs.longitude, model)
    assert.ok(projected !== null)

    const [projX, , projZ] = projected.modelPoint

    // Mapped position: [125.38, 0.25, -114.62]
    assert.equal(projX, 125.38)
    assert.equal(projZ, -114.62)

    // Mathematical offset from anchor:
    const offsetDistance = Math.hypot(projX - expectedX, projZ - expectedZ)
    assert.ok(offsetDistance > 35 && offsetDistance < 42, `Offset distance is ~38.0m, got ${offsetDistance.toFixed(1)}m`)

    // Verify it is placed south-west of the building outside its bounds
    assert.ok(projZ < civilBounds.minZ, `Z (${projZ}) is south of building envelope (${civilBounds.minZ})`)
    assert.ok(projX < civilBounds.minX, `X (${projX}) is west of building envelope (${civilBounds.minX})`)
  })

  it('strictly rejects indoor fixes with poor accuracy (>30m) without creating a 3D model marker', () => {
    // Typical indoor GPS fix where concrete ceiling degrades accuracy to 38m
    const indoorDegradedFix: GpsCoordinates = {
      latitude: 12.9455970, // Civil Block lat
      longitude: 80.2457751, // Civil Block lon
      accuracy: 38.0, // > 30m threshold
      altitude: 12,
      altitudeAccuracy: 8,
      heading: null,
      speed: null,
      timestamp: Date.now(),
    }

    assert.equal(getAccuracyClass(38.0), 'rejected')

    const classification = classifyGpsPosition(indoorDegradedFix, 'active', model, false)
    assert.equal(classification.status, 'accuracy_insufficient')
    assert.equal(classification.modelPoint, null, 'Must suppress 3D marker when accuracy is insufficient')
    assert.ok(classification.message.includes('±38m exceeds 30m threshold'))
  })

  it('truthfully tags indoor fixes within threshold (10m–30m) with numeric accuracy and provisional notice', () => {
    // Indoor fix near window with ±18m accuracy
    const indoorModerateFix: GpsCoordinates = {
      latitude: 12.9455970,
      longitude: 80.2457751,
      accuracy: 18.0,
      altitude: 12,
      altitudeAccuracy: 5,
      heading: null,
      speed: null,
      timestamp: Date.now(),
    }

    assert.equal(getAccuracyClass(18.0), 'medium')

    const classification = classifyGpsPosition(indoorModerateFix, 'active', model, false)
    assert.equal(classification.status, 'location_available')
    assert.ok(classification.modelPoint !== null)
    assert.ok(classification.message.includes('±18m'))
    assert.ok(classification.message.includes('Provisional calibration'))

    // Accuracy radius model is scaled by Helmert scale factor (1.442)
    assert.ok(classification.accuracyRadiusModel !== null)
    assert.ok(classification.accuracyRadiusModel! > 18.0, 'Accuracy radius in model space must incorporate scale')
  })

  it('guarantees round-trip mathematical consistency between local metric and geographic conversions', () => {
    const origin = { latitude: 12.9462708, longitude: 80.2455018 }
    const civil = { latitude: 12.9455970, longitude: 80.2457751 }

    const local = geoToLocalMeters(civil.latitude, civil.longitude, origin)
    const roundtrip = localMetersToGeo(local.u, local.v, origin)

    assert.ok(Math.abs(roundtrip.latitude - civil.latitude) < 1e-9)
    assert.ok(Math.abs(roundtrip.longitude - civil.longitude) < 1e-9)

    // Full geoToModel and modelToGeo round-trip
    const forward = geoToModelCoordinates(civil.latitude, civil.longitude, model)
    assert.ok(forward !== null)
    const reverse = modelToGeoCoordinates(forward.modelPoint, model)
    assert.ok(reverse !== null)
    assert.ok(Math.abs(reverse.latitude - civil.latitude) < 1e-6)
    assert.ok(Math.abs(reverse.longitude - civil.longitude) < 1e-6)
  })

  it('preserves all security and navigation safety invariants', () => {
    // 1. Live navigation is locked by default
    assert.equal(PROVISIONAL_CAMPUS_BOUNDARY.metadata.isApprovedForLiveNavigation, false)

    // 2. Production control points remain strictly empty
    assert.equal(DEFAULT_CAMPUS_CONTROL_POINTS.length, 0)

    // 3. Safety threshold is preserved at 30 meters
    assert.equal(GPS_ACCURACY_THRESHOLDS.maxAcceptableMeters, 30)
    assert.equal(GPS_ACCURACY_THRESHOLDS.highMeters, 10)
    assert.equal(GPS_ACCURACY_THRESHOLDS.mediumMeters, 25)

    // 4. Campus bounds remain unmodified
    assert.equal(CAMPUS_MODEL_BOUNDS.minX, -25.0)
    assert.equal(CAMPUS_MODEL_BOUNDS.maxX, 265.0)
    assert.equal(CAMPUS_MODEL_BOUNDS.minZ, -215.0)
    assert.equal(CAMPUS_MODEL_BOUNDS.maxZ, 25.0)

    // 5. Point inside campus check works as intended
    assert.equal(isPointInsideCampus(136.2, -78.2), true, 'Civil Block anchor must be inside campus envelope')
  })
})
