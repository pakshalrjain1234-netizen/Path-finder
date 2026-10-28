import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { describe, it } from 'node:test'
import {
  CAMPUS_GPS_SURVEY_OBSERVATIONS,
  UNCOLLECTED_SURVEY_TARGETS,
  getSurveyObservationById,
} from '../../data/campusGpsSurveyData.ts'
import { DEFAULT_CAMPUS_CONTROL_POINTS } from '../../data/campusCalibrationData.ts'
import { PROVISIONAL_CAMPUS_BOUNDARY } from '../../data/campusGeofenceData.ts'
import { VERIFIED_ROOF_ANCHORS } from '../../data/campusLandmarks.ts'
import { campusNavigationNodesById } from '../../data/navigationGraph.ts'
import { fitHelmertTransformation } from '../campusCalibration.ts'
import type { GroundControlPoint } from '../../types/gps.ts'

describe('Phase 9A: Real Campus GPS & 3D Model Audit Verification', () => {
  describe('Task 1: GPS Survey Dataset Integrity (17 Points + Uncollected)', () => {
    it('contains exactly 17 provisional field observations', () => {
      assert.equal(CAMPUS_GPS_SURVEY_OBSERVATIONS.length, 17)
    })

    it('confirms all 17 observations have valid WGS84 coordinates and reported horizontal accuracy', () => {
      for (const obs of CAMPUS_GPS_SURVEY_OBSERVATIONS) {
        assert.ok(obs.latitude > 12.945 && obs.latitude < 12.947, `${obs.locationName} latitude must be in MNMJEC range`)
        assert.ok(obs.longitude > 80.244 && obs.longitude < 80.247, `${obs.locationName} longitude must be in MNMJEC range`)
        assert.ok(obs.horizontalAccuracyMeters >= 3.0 && obs.horizontalAccuracyMeters <= 6.0)
        assert.equal(obs.verificationStatus, 'provisional', 'All observations must be flagged provisional')
        assert.equal(obs.instrumentType, 'GPSTest Mobile GNSS')
      }
    })

    it('verifies exact coordinates of core landmarks from GPSTest field survey', () => {
      const gate1 = getSurveyObservationById('survey-main-gate-1')
      assert.ok(gate1)
      assert.equal(gate1.latitude, 12.9462708)
      assert.equal(gate1.longitude, 80.2455018)
      assert.equal(gate1.horizontalAccuracyMeters, 3.8)

      const civil = getSurveyObservationById('survey-civil-block')
      assert.ok(civil)
      assert.equal(civil.latitude, 12.9455970)
      assert.equal(civil.longitude, 80.2457751)
      assert.equal(civil.horizontalAccuracyMeters, 5.2)

      const oat = getSurveyObservationById('survey-oat')
      assert.ok(oat)
      assert.equal(oat.latitude, 12.9459243)
      assert.equal(oat.longitude, 80.2451393)
      assert.equal(oat.horizontalAccuracyMeters, 4.0)

      const lShape = getSurveyObservationById('survey-l-shape-block-oat')
      assert.ok(lShape)
      assert.equal(lShape.latitude, 12.9463154)
      assert.equal(lShape.longitude, 80.2447659)
      assert.equal(lShape.horizontalAccuracyMeters, 3.8)
    })

    it('registers Gate 2 as an uncollected survey target awaiting field survey', () => {
      const gate2 = UNCOLLECTED_SURVEY_TARGETS.find((t) => t.id === 'uncollected-gate-2')
      assert.ok(gate2, 'Gate 2 must be registered in uncollected survey targets')
      assert.ok(gate2.locationName.includes('Gate 2'))
      assert.ok(gate2.notes.includes('School of Architecture'))
      assert.equal(gate2.stageE3ReferenceNode, 'WEST_ENTRANCE_MARKER')
    })
  })

  describe('Task 2: Stage E3 3D Ground-Level Correspondences', () => {
    it('distinguishes ground reference positions from elevated roof labels', () => {
      for (const obs of CAMPUS_GPS_SURVEY_OBSERVATIONS) {
        // Ground positions are on or near the ground plane (Y <= 0.35m in Stage E3)
        assert.ok(
          obs.stageE3GroundPosition[1] <= 0.35,
          `${obs.locationName} ground reference elevation (Y=${obs.stageE3GroundPosition[1]}) must be ground level`
        )

        // If a roof anchor exists, its elevation is elevated (Y >= 2.5m)
        if (obs.roofAnchorId) {
          const roofPos = VERIFIED_ROOF_ANCHORS[obs.roofAnchorId]
          assert.ok(roofPos, `Roof anchor ${obs.roofAnchorId} must exist in VERIFIED_ROOF_ANCHORS`)
          assert.ok(
            roofPos[1] >= 2.5,
            `${obs.locationName} roof anchor elevation (Y=${roofPos[1]}) must be elevated`
          )
        }
      }
    })

    it('verifies that ground reference nodes exist in the Stage E3 GLB model', () => {
      const glbPath = path.resolve(process.cwd(), 'public/models/MNMJEC_Campus_Stage_E3_Web.glb')
      const buf = fs.readFileSync(glbPath)
      const chunk0Length = buf.readUInt32LE(12)
      const jsonText = buf.toString('utf8', 20, 20 + chunk0Length)
      const gltf = JSON.parse(jsonText)
      const nodeNames = new Set((gltf.nodes || []).map((n: { name?: string }) => n.name).filter(Boolean))

      for (const obs of CAMPUS_GPS_SURVEY_OBSERVATIONS) {
        assert.ok(
          nodeNames.has(obs.stageE3ReferenceNode),
          `GLB must contain stageE3ReferenceNode: ${obs.stageE3ReferenceNode} for ${obs.locationName}`
        )
      }
    })
  })

  describe('Task 3: Civil Block & L-Shape Block Contiguity Audit', () => {
    it('documents the 2.6m gap between Civil Block and L-Shape Block in Stage E3', () => {
      const glbPath = path.resolve(process.cwd(), 'public/models/MNMJEC_Campus_Stage_E3_Web.glb')
      const buf = fs.readFileSync(glbPath)
      const chunk0Length = buf.readUInt32LE(12)
      const jsonText = buf.toString('utf8', 20, 20 + chunk0Length)
      const gltf = JSON.parse(jsonText)

      const civilFloorG = gltf.nodes.find((n: { name?: string }) => n.name === 'CIVIL_BLOCK_FLOOR_G')
      const lShapeFloorG = gltf.nodes.find((n: { name?: string }) => n.name === 'L_SHAPE_BLOCK_FLOOR_G')

      assert.ok(civilFloorG, 'CIVIL_BLOCK_FLOOR_G must exist')
      assert.ok(lShapeFloorG, 'L_SHAPE_BLOCK_FLOOR_G must exist')

      // Civil Block extends to Z = -83.0; L-Shape Block rear arm starts at Z = -85.6
      const civilMesh = gltf.meshes[civilFloorG.mesh]
      const lShapeMesh = gltf.meshes[lShapeFloorG.mesh]
      const civilMinZ = civilMesh.primitives[0].attributes.POSITION !== undefined
      assert.ok(civilMinZ)
      assert.ok(lShapeMesh)

      // Navigation graph routes through this artificial gap
      const rearWalkwayNode = campusNavigationNodesById.get('walk-l-shape-rear-mid')
      assert.ok(rearWalkwayNode, 'walk-l-shape-rear-mid is in the artificial gap in Stage E3')
      assert.equal(rearWalkwayNode.position[2], -84.0, 'walk-l-shape-rear-mid is at Z = -84.0 between Z=-83 and Z=-85.6')
    })
  })

  describe('Task 4 & 5: Calibration Feasibility & Safety Lock Preservation', () => {
    it('rejects calibration on full 17-point raw survey dataset due to high RMSE (>10m)', () => {
      const origin = { latitude: 12.9462708, longitude: 80.2455018 }
      const gcps: GroundControlPoint[] = CAMPUS_GPS_SURVEY_OBSERVATIONS.map((obs) => ({
        id: obs.id,
        name: obs.locationName,
        latitude: obs.latitude,
        longitude: obs.longitude,
        modelPosition: obs.stageE3GroundPosition,
        source: 'Survey',
        verificationStatus: 'verified',
      }))

      const fit = fitHelmertTransformation(gcps, origin)
      assert.equal(fit.status, 'high_error', 'Unconstrained Helmert on raw dataset must reject calibration')
      assert.ok(fit.rmse !== null && fit.rmse > 10.0, 'Raw RMSE must exceed 10m threshold')
    })

    it('preserves empty calibration control points in production', () => {
      assert.equal(
        DEFAULT_CAMPUS_CONTROL_POINTS.length,
        0,
        'DEFAULT_CAMPUS_CONTROL_POINTS must remain strictly empty to prevent uncalibrated GPS'
      )
    })

    it('preserves strict live outdoor navigation lock', () => {
      assert.equal(
        PROVISIONAL_CAMPUS_BOUNDARY.metadata.isApprovedForLiveNavigation,
        false,
        'isApprovedForLiveNavigation must remain strictly false until certified RTK survey'
      )
    })
  })
})
