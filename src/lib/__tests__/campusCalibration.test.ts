import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  getMetricScaleForLatitude,
  geoToLocalMeters,
  localMetersToGeo,
  fitHelmertTransformation,
  buildCalibrationModel,
  geoToModelCoordinates,
  modelToGeoCoordinates,
} from '../campusCalibration.ts'
import type { GroundControlPoint } from '../../types/gps.ts'

describe('Campus Calibration & Helmert Transformation', () => {
  it('computes correct metric scale for campus latitude (Chennai ~12.87°N)', () => {
    const { metersPerDegLat, metersPerDegLon } = getMetricScaleForLatitude(12.8715)
    // At ~13°N: 1 deg lat is ~110.6 km, 1 deg lon is ~108.6 km
    assert.ok(metersPerDegLat > 110500 && metersPerDegLat < 110700)
    assert.ok(metersPerDegLon > 108400 && metersPerDegLon < 108700)
  })

  it('transforms geographic coordinates to local meters and roundtrips accurately', () => {
    const origin = { latitude: 12.8715, longitude: 80.2195 }
    const testPoint = { latitude: 12.8725, longitude: 80.2205 }

    const { u, v } = geoToLocalMeters(testPoint.latitude, testPoint.longitude, origin)
    assert.ok(u > 0, 'East offset should be positive')
    assert.ok(v > 0, 'North offset should be positive')

    const roundtrip = localMetersToGeo(u, v, origin)
    assert.ok(Math.abs(roundtrip.latitude - testPoint.latitude) < 1e-9)
    assert.ok(Math.abs(roundtrip.longitude - testPoint.longitude) < 1e-9)
  })

  it('rejects calibration when fewer than 2 control points are provided', () => {
    const singlePoint: GroundControlPoint[] = [
      {
        id: 'p1',
        name: 'Gate 1',
        latitude: 12.8715,
        longitude: 80.2195,
        modelPosition: [181.0, 0.25, -6.2],
        source: 'Field Benchmark',
        verificationStatus: 'verified',
      },
    ]

    const result = buildCalibrationModel(singlePoint)
    assert.equal(result.status, 'uncalibrated')
    assert.equal(result.helmertParams, null)
  })

  it('detects degenerate geometry when points are coincident', () => {
    const coincidentPoints: GroundControlPoint[] = [
      {
        id: 'p1',
        name: 'Point A',
        latitude: 12.8715,
        longitude: 80.2195,
        modelPosition: [100, 0.25, 50],
        source: 'Field Benchmark',
        verificationStatus: 'verified',
      },
      {
        id: 'p2',
        name: 'Point B (Identical Coords)',
        latitude: 12.8715,
        longitude: 80.2195,
        modelPosition: [100, 0.25, 50],
        source: 'Field Benchmark',
        verificationStatus: 'verified',
      },
    ]

    const result = fitHelmertTransformation(coincidentPoints, { latitude: 12.8715, longitude: 80.2195 })
    assert.equal(result.status, 'degenerate')
    assert.equal(result.helmertParams, null)
  })

  it('accurately solves Helmert parameters for known reference benchmarks', () => {
    // Synthetic exact Helmert test: scale=1.0, rotation=0deg, translation=[100, -50]
    const origin = { latitude: 12.8700, longitude: 80.2100 }
    const { metersPerDegLat, metersPerDegLon } = getMetricScaleForLatitude(origin.latitude)

    const points: GroundControlPoint[] = [
      {
        id: 'bench-1',
        name: 'South-West Benchmark',
        latitude: origin.latitude,
        longitude: origin.longitude,
        modelPosition: [100, 0.25, -50], // u=0, v=0 -> X=100, Z=-50
        source: 'RTK-GNSS',
        verificationStatus: 'verified',
      },
      {
        id: 'bench-2',
        name: 'North-East Benchmark',
        latitude: origin.latitude + 100 / metersPerDegLat, // v=100m
        longitude: origin.longitude + 100 / metersPerDegLon, // u=100m
        modelPosition: [200, 0.25, 50], // u=100, v=100 -> X=200, Z=50
        source: 'RTK-GNSS',
        verificationStatus: 'verified',
      },
    ]

    const model = buildCalibrationModel(points)
    assert.equal(model.status, 'calibrated')
    assert.ok(model.helmertParams !== null)
    assert.ok(Math.abs(model.helmertParams!.scale - 1.0) < 0.01)
    assert.ok(Math.abs(model.helmertParams!.rotationDeg - 0.0) < 0.1)
    assert.equal(model.rmse, 0)
  })

  it('marks calibration as provisional if any control point is not fully verified', () => {
    const points: GroundControlPoint[] = [
      {
        id: 'bench-1',
        name: 'Surveyed Point',
        latitude: 12.8715,
        longitude: 80.2195,
        modelPosition: [181.0, 0.25, -6.2],
        source: 'Survey',
        verificationStatus: 'verified',
      },
      {
        id: 'bench-2',
        name: 'Provisional Mobile Point',
        latitude: 12.8717,
        longitude: 80.2197,
        modelPosition: [203.2, 0.25, -26.0],
        source: 'Provisional Mobile GNSS',
        verificationStatus: 'provisional',
      },
    ]

    const model = buildCalibrationModel(points)
    assert.equal(model.status, 'provisional')
    assert.ok(model.warning?.includes('provisional'))
  })

  it('transforms coordinates from geo to 3D model and back with roundtrip fidelity', () => {
    const points: GroundControlPoint[] = [
      {
        id: 'p1',
        name: 'Point 1',
        latitude: 12.8715,
        longitude: 80.2195,
        modelPosition: [181.0, 0.25, -6.2],
        source: 'RTK-GNSS',
        verificationStatus: 'verified',
      },
      {
        id: 'p2',
        name: 'Point 2',
        latitude: 12.8731,
        longitude: 80.2181,
        modelPosition: [24.6, 0.25, -183.0],
        source: 'RTK-GNSS',
        verificationStatus: 'verified',
      },
    ]

    const model = buildCalibrationModel(points)
    const testLat = 12.8720
    const testLon = 80.2190

    const modelResult = geoToModelCoordinates(testLat, testLon, model)
    assert.ok(modelResult !== null)
    assert.equal(modelResult!.modelPoint[1], 0.25) // Elevation ground

    const geoResult = modelToGeoCoordinates(modelResult!.modelPoint, model)
    assert.ok(geoResult !== null)
    assert.ok(Math.abs(geoResult!.latitude - testLat) < 0.0001)
    assert.ok(Math.abs(geoResult!.longitude - testLon) < 0.0001)
  })

  it('returns null when attempting to convert with an uncalibrated model', () => {
    const uncalibratedModel = buildCalibrationModel([])
    const result = geoToModelCoordinates(12.8715, 80.2195, uncalibratedModel)
    assert.equal(result, null)
  })

  it('rejects calibration model with high_error status when RMSE exceeds 10m threshold', () => {
    // Inconsistent control points with large geometric distortion (>40m RMSE)
    const distortedPoints: GroundControlPoint[] = [
      {
        id: 'distorted-1',
        name: 'Gate 1 Distorted',
        latitude: 12.945040,
        longitude: 80.243780,
        modelPosition: [181.0, 0.25, -6.2],
        source: 'Test Mode Benchmark',
        verificationStatus: 'verified',
      },
      {
        id: 'distorted-2',
        name: 'Main Block Distorted',
        latitude: 12.945040, // Grossly displaced latitude
        longitude: 80.250000,
        modelPosition: [203.2, 0.25, -26.0],
        source: 'Test Mode Benchmark',
        verificationStatus: 'verified',
      },
      {
        id: 'distorted-3',
        name: 'Mech Block Distorted',
        latitude: 12.940000,
        longitude: 80.240000,
        modelPosition: [88.5, 0.25, -56.2],
        source: 'Test Mode Benchmark',
        verificationStatus: 'verified',
      },
    ]

    const model = buildCalibrationModel(distortedPoints)
    assert.equal(model.status, 'high_error')
    assert.equal(model.helmertParams, null)
    assert.ok(model.rmse !== null && model.rmse > 10.0)
    assert.ok(model.warning?.includes('exceeds maximum allowable threshold'))

    // Coordinate conversion must return null when RMSE exceeds threshold
    const conversion = geoToModelCoordinates(12.945040, 80.243780, model)
    assert.equal(conversion, null)
  })
})
