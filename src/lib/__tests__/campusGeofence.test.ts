import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  distanceToPolygonBoundaryMeters,
  evaluateCampusGeofence,
  GEOFENCE_THRESHOLDS,
  isPointInPolygon,
} from '../campusGeofence.ts'
import {
  GEOFENCE_MESSAGES,
  GEOFENCE_PRESETS,
  PROVISIONAL_CAMPUS_BOUNDARY,
} from '../../data/campusGeofenceData.ts'
import type { CampusBoundaryPolygon } from '../../types/geofence.ts'

describe('Campus Geofencing Engine', () => {
  const polygonRing = PROVISIONAL_CAMPUS_BOUNDARY.coordinates

  describe('isPointInPolygon', () => {
    it('correctly detects campus center courtyard as inside', () => {
      // lon, lat
      const centerPoint: [number, number] = [80.24378, 12.94504]
      assert.equal(isPointInPolygon(centerPoint, polygonRing), true)
    })

    it('correctly detects academic building as inside', () => {
      const buildingPoint: [number, number] = [80.24523, 12.94592]
      assert.equal(isPointInPolygon(buildingPoint, polygonRing), true)
    })

    it('correctly detects displaced southern point as outside', () => {
      const outsideSouth: [number, number] = [80.2195, 12.8715]
      assert.equal(isPointInPolygon(outsideSouth, polygonRing), false)
    })

    it('correctly detects western approach road as outside', () => {
      const outsideWest: [number, number] = [80.2370, 12.9460]
      assert.equal(isPointInPolygon(outsideWest, polygonRing), false)
    })

    it('handles degenerate or empty polygon rings gracefully', () => {
      assert.equal(isPointInPolygon([80.24378, 12.94504], []), false)
      assert.equal(isPointInPolygon([80.24378, 12.94504], [[80.24, 12.94]]), false)
      assert.equal(isPointInPolygon([80.24378, 12.94504], [[80.24, 12.94], [80.25, 12.95]]), false)
    })
  })

  describe('distanceToPolygonBoundaryMeters', () => {
    it('computes positive metric distance to boundary for inside point', () => {
      const centerPoint: [number, number] = [80.24378, 12.94504]
      const dist = distanceToPolygonBoundaryMeters(centerPoint, polygonRing)
      assert.ok(dist > 10 && dist < 500, `Distance should be reasonable inside distance, got ${dist}`)
    })

    it('computes accurate metric distance to boundary for outside point', () => {
      const outsideWest: [number, number] = [80.2370, 12.9460]
      const dist = distanceToPolygonBoundaryMeters(outsideWest, polygonRing)
      // Point is approximately 300-450m west of boundary
      assert.ok(dist > 250 && dist < 600, `Distance should be between 250m and 600m, got ${dist}`)
    })

    it('returns Infinity for empty polygon rings', () => {
      assert.equal(distanceToPolygonBoundaryMeters([80.24, 12.94], []), Infinity)
    })
  })

  describe('evaluateCampusGeofence', () => {
    describe('Safety Guardrails for Real GPS', () => {
      it('returns boundary_unapproved for live GPS when boundary is not approved', () => {
        const evalResult = evaluateCampusGeofence(12.94504, 80.24378, 6, {
          isSimulated: false,
        })

        assert.equal(evalResult.status, 'boundary_unapproved')
        assert.equal(evalResult.userMessage, GEOFENCE_MESSAGES.BOUNDARY_UNAPPROVED)
        assert.equal(evalResult.isApprovedForLiveNavigation, false)
      })

      it('evaluates status when bypassApprovalGuard is set', () => {
        const evalResult = evaluateCampusGeofence(12.94504, 80.24378, 6, {
          isSimulated: false,
          bypassApprovalGuard: true,
        })

        assert.equal(evalResult.status, 'inside')
        assert.equal(evalResult.userMessage, GEOFENCE_MESSAGES.INSIDE)
      })
    })

    describe('Test Simulation Mode', () => {
      it('evaluates inside campus point with high confidence', () => {
        const evalResult = evaluateCampusGeofence(12.94504, 80.24378, 6, {
          isSimulated: true,
        })

        assert.equal(evalResult.status, 'inside')
        assert.equal(evalResult.isInsidePolygon, true)
        assert.equal(evalResult.confidence, 'high')
        assert.equal(evalResult.userMessage, GEOFENCE_MESSAGES.INSIDE)
      })

      it('evaluates outside campus point with high confidence', () => {
        const evalResult = evaluateCampusGeofence(12.8715, 80.2195, 10, {
          isSimulated: true,
        })

        assert.equal(evalResult.status, 'outside')
        assert.equal(evalResult.isInsidePolygon, false)
        assert.equal(evalResult.confidence, 'high')
        assert.equal(evalResult.userMessage, GEOFENCE_MESSAGES.OUTSIDE)
      })

      it('classifies location as uncertain when accuracy circle crosses perimeter', () => {
        // Point is ~15-20m from boundary, but accuracy is 30m
        const evalResult = evaluateCampusGeofence(12.94675, 80.24200, 30, {
          isSimulated: true,
        })

        assert.equal(evalResult.status, 'uncertain')
        assert.ok(evalResult.distanceToBoundaryMeters < 30)
        assert.equal(evalResult.userMessage, GEOFENCE_MESSAGES.UNCERTAIN)
        assert.ok(evalResult.details.includes('Boundary overlap detected'))
      })

      it('classifies location as uncertain when satellite accuracy is poor (>30m)', () => {
        const evalResult = evaluateCampusGeofence(12.94504, 80.24378, 45, {
          isSimulated: true,
        })

        assert.equal(evalResult.status, 'uncertain')
        assert.equal(evalResult.confidence, 'low')
        assert.equal(evalResult.userMessage, GEOFENCE_MESSAGES.UNCERTAIN)
        assert.ok(
          evalResult.details.includes(
            `exceeds reliable geofence threshold (${GEOFENCE_THRESHOLDS.MAX_ACCURACY_THRESHOLD_METERS}m)`
          )
        )
      })
    })

    describe('All Geofence Test Presets', () => {
      it('correctly evaluates all 6 deterministic presets in test mode', () => {
        for (const preset of GEOFENCE_PRESETS) {
          const evalResult = evaluateCampusGeofence(
            preset.latitude,
            preset.longitude,
            preset.accuracy,
            { isSimulated: true }
          )

          assert.equal(
            evalResult.status,
            preset.expectedStatus,
            `Preset ${preset.id} failed: expected ${preset.expectedStatus}, got ${evalResult.status}`
          )
        }
      })
    })

    describe('Custom Approved Boundary Support', () => {
      it('allows live evaluation if polygon is approved', () => {
        const approvedPolygon: CampusBoundaryPolygon = {
          metadata: {
            ...PROVISIONAL_CAMPUS_BOUNDARY.metadata,
            isApprovedForLiveNavigation: true,
          },
          coordinates: PROVISIONAL_CAMPUS_BOUNDARY.coordinates,
        }

        const evalResult = evaluateCampusGeofence(12.94504, 80.24378, 6, {
          polygon: approvedPolygon,
          isSimulated: false,
        })

        assert.equal(evalResult.status, 'inside')
        assert.equal(evalResult.isApprovedForLiveNavigation, true)
      })
    })
  })
})
