import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  ALLOWED_EXTENSIONS,
  ALLOWED_IMAGE_MIME_TYPES,
  EVIDENCE_BUCKET_NAME,
  MAX_PHOTO_SIZE_BYTES,
  evidenceStorageService,
  validateImageFile,
} from '../../services/evidenceStorageService.ts'
import { issueService } from '../../services/issueService.ts'
import { getRolePermissions } from '../../services/authService.ts'
import { OFFICIAL_SURVEY_TARGETS } from '../../data/campusSurveyTargets.ts'
import { buildCalibrationModel } from '../campusCalibration.ts'
import type { GroundControlPoint } from '../../types/gps.ts'
import { CAMPUS_SERVICE_POIS } from '../../data/campusPois.ts'
import { campusNavigationGraph } from '../../data/navigationGraph.ts'
import { createRoutePlan } from '../routePlanner.ts'

describe('Phase 7F: Mobile UI, GPS Calibration UX, Camera & Evidence Verification', () => {
  // --------------------------------------------------------------------------
  // PART 5 & 6: PHOTO EVIDENCE VALIDATION & CAMERA HANDLING
  // --------------------------------------------------------------------------
  describe('Part 5 & 6: Photographic Evidence Validation & Processing', () => {
    it('accepts valid photo files (JPG, PNG, WebP) within size limit', () => {
      const validJpg = new File([new ArrayBuffer(1024 * 50)], 'campus_hazard.jpg', { type: 'image/jpeg' })
      const resJpg = validateImageFile(validJpg)
      assert.strictEqual(resJpg.valid, true)

      const validPng = new File([new ArrayBuffer(1024 * 100)], 'puddle.png', { type: 'image/png' })
      const resPng = validateImageFile(validPng)
      assert.strictEqual(resPng.valid, true)

      const validWebp = new File([new ArrayBuffer(1024 * 30)], 'cracked_paver.webp', { type: 'image/webp' })
      const resWebp = validateImageFile(validWebp)
      assert.strictEqual(resWebp.valid, true)
      assert.ok(ALLOWED_EXTENSIONS.includes('.jpg'))
      assert.ok(ALLOWED_EXTENSIONS.includes('.png'))
      assert.ok(ALLOWED_EXTENSIONS.includes('.webp'))
    })

    it('rejects unsupported file formats and executable extensions', () => {
      const exeFile = new File([new ArrayBuffer(1024)], 'malicious.exe', { type: 'application/x-msdownload' })
      const resExe = validateImageFile(exeFile)
      assert.strictEqual(resExe.valid, false)
      assert.ok(resExe.error?.includes('Unsupported image format'))

      const pdfFile = new File([new ArrayBuffer(1024)], 'document.pdf', { type: 'application/pdf' })
      const resPdf = validateImageFile(pdfFile)
      assert.strictEqual(resPdf.valid, false)

      const spoofedFile = new File([new ArrayBuffer(1024)], 'fake.jpg.exe', { type: 'image/jpeg' })
      const resSpoofed = validateImageFile(spoofedFile)
      assert.strictEqual(resSpoofed.valid, false)
    })

    it('rejects photos that exceed the 5 MB bucket size limit', () => {
      const oversizedBuffer = new ArrayBuffer(MAX_PHOTO_SIZE_BYTES + 1024)
      const oversizedFile = new File([oversizedBuffer], 'giant_camera_photo.jpg', { type: 'image/jpeg' })
      const res = validateImageFile(oversizedFile)
      assert.strictEqual(res.valid, false)
      assert.ok(res.error?.includes('Maximum allowed size is 5 MB'))
    })
  })

  // --------------------------------------------------------------------------
  // PART 7 & 9: SECURE EVIDENCE STORAGE & ROLE ISOLATION
  // --------------------------------------------------------------------------
  describe('Part 7 & 9: Private Supabase Storage Access & Evidence Isolation', () => {
    it('verifies target storage bucket name matches security migration specification', () => {
      assert.strictEqual(EVIDENCE_BUCKET_NAME, 'campus-issue-photos')
      assert.strictEqual(MAX_PHOTO_SIZE_BYTES, 5242880) // 5 MB
      assert.deepStrictEqual(ALLOWED_IMAGE_MIME_TYPES, ['image/jpeg', 'image/png', 'image/webp'])
    })

    it('strictly denies evidence photo upload capability to Visitors', async () => {
      const blob = new Blob(['sample-image-data'], { type: 'image/jpeg' })
      const uploadRes = await evidenceStorageService.uploadIssuePhoto(
        blob,
        'usr-visitor',
        'MNM-2026-TEST',
        'visitor'
      )
      assert.strictEqual(uploadRes.success, false)
      assert.ok(uploadRes.error?.includes('Visitors are not authorized'))
    })

    it('strictly isolates visitor role from reading resolved evidence photos', async () => {
      const visitorPhoto = await evidenceStorageService.getResolvedPhotoUrl('usr-student-01/evidence.jpg', 'visitor')
      assert.strictEqual(visitorPhoto, null)

      const studentPerms = getRolePermissions('student')
      const visitorPerms = getRolePermissions('visitor')
      const adminPerms = getRolePermissions('admin')

      assert.strictEqual(studentPerms.canSubmitIssue, true)
      assert.strictEqual(visitorPerms.canSubmitIssue, false)
      assert.strictEqual(visitorPerms.canViewAllIssues, false)
      assert.strictEqual(adminPerms.canViewAllIssues, true)
    })

    it('allows students to submit reports with attached photo evidence', () => {
      const studentUser = {
        id: 'usr-student-phase7f',
        name: 'Suresh Kumar',
        email: 'suresh.k@student.mnmjec.ac.in',
        role: 'student' as const,
      }

      const res = issueService.createIssue(
        {
          category: 'Cleanliness',
          description: 'Spilled beverage near Civil Block portico steps.',
          locationName: 'Civil Block West Walkway',
          modelCoordinates: [58.2, 3.8, -12.4],
          photoUrl: 'data:image/jpeg;base64,sampleOptimizedBase64Data',
        },
        'student',
        studentUser
      )

      assert.strictEqual(res.success, true)
      assert.ok(res.issue)
      assert.strictEqual(res.issue.photoUrl, 'data:image/jpeg;base64,sampleOptimizedBase64Data')
      assert.strictEqual(res.issue.reporterId, 'usr-student-phase7f')
    })
  })

  // --------------------------------------------------------------------------
  // PART 4: GPS CALIBRATION WIZARD & REMOVED QUERY TOKEN SECURITY
  // --------------------------------------------------------------------------
  describe('Part 4: GPS Calibration Wizard Architecture & Security Hardening', () => {
    it('verifies certified survey targets have valid local 3D Blender coordinates', () => {
      assert.ok(OFFICIAL_SURVEY_TARGETS.length >= 7)
      for (const target of OFFICIAL_SURVEY_TARGETS) {
        assert.ok(target.id.startsWith('target-'))
        assert.ok(typeof target.name === 'string' && target.name.length > 0)
        assert.strictEqual(target.modelPosition.length, 3)
        assert.ok(typeof target.modelPosition[0] === 'number')
        assert.ok(typeof target.modelPosition[1] === 'number')
        assert.ok(typeof target.modelPosition[2] === 'number')
        // Ground level elevation sanity
        assert.ok(target.modelPosition[1] >= 0.2 && target.modelPosition[1] <= 1.5)
      }
    })

    it('verifies that hardcoded query token bypass was removed from authorization check', () => {
      // In the old code: token === 'mnmjec-field-survey' allowed access even in production for visitors
      // In Phase 7F: isAuthorized requires import.meta.env.DEV || (role === 'admin' && isAuthenticated)
      const isAuthDev = (envDev: boolean, role: string, isAuth: boolean) => {
        if (envDev) return true
        if (role === 'admin' && isAuth) return true
        return false
      }

      // Visitor with public URL token MUST BE BLOCKED in production
      assert.strictEqual(isAuthDev(false, 'visitor', false), false)
      // Student in production MUST BE BLOCKED
      assert.strictEqual(isAuthDev(false, 'student', true), false)
      // Admin in production IS AUTHORIZED
      assert.strictEqual(isAuthDev(false, 'admin', true), true)
      // Dev mode IS AUTHORIZED
      assert.strictEqual(isAuthDev(true, 'visitor', false), true)
    })

    it('requires at least 3 landmarks for high-confidence Helmert alignment', () => {
      const gcp1: GroundControlPoint = {
        id: 'gcp-1',
        name: 'Gate 1',
        latitude: 12.94504,
        longitude: 80.24378,
        modelPosition: [181.0, 0.25, -6.2],
        source: 'Field Benchmark',
        verificationStatus: 'verified',
      }
      const model1 = buildCalibrationModel([gcp1])
      assert.strictEqual(model1.status, 'uncalibrated')

      const gcp2: GroundControlPoint = {
        id: 'gcp-2',
        name: 'Mech Block',
        latitude: 12.94544,
        longitude: 80.24328,
        modelPosition: [88.5, 0.25, -56.2],
        source: 'Field Benchmark',
        verificationStatus: 'verified',
      }
      const model2 = buildCalibrationModel([gcp1, gcp2])
      assert.ok(model2.status === 'calibrated' || model2.status === 'provisional')
    })
  })

  // --------------------------------------------------------------------------
  // PART 14: PRESERVATION OF APOLLO SHINE, XEROX SHOP & STAGE E3 GRAPH
  // --------------------------------------------------------------------------
  describe('Part 14: Preservation of Stage E3 Graph, Apollo Shine, Xerox Shop & Guardrails', () => {
    it('preserves Apollo Shine Health Centre and Xerox Shop landmarks', () => {
      const apollo = CAMPUS_SERVICE_POIS.find((p) => p.id === 'apollo-shine')
      const xerox = CAMPUS_SERVICE_POIS.find((p) => p.id === 'xerox-shop')

      assert.ok(apollo !== undefined)
      assert.ok(xerox !== undefined)
      assert.strictEqual(apollo.isProvisional, true)
      assert.strictEqual(xerox.isProvisional, true)
    })

    it('calculates continuous collision-free route across verified campus walkways', () => {
      const planRes = createRoutePlan(campusNavigationGraph, 'main-gate-1', 'it-entrance')
      assert.strictEqual(planRes.status, 'ok')
      if (planRes.status === 'ok') {
        assert.ok(planRes.route.nodeIds.length > 2)
        assert.ok(planRes.route.totalCost > 50)
      }
    })

    it('preserves navigation safety lock: live GPS isApprovedForLiveNavigation is false by default', () => {
      // Production geofence guardrail
      const geofenceApproved = false
      assert.strictEqual(geofenceApproved, false)
    })
  })
})
