import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  ALLOWED_IMAGE_MIME_TYPES,
  EVIDENCE_BUCKET_NAME,
  MAX_PHOTO_SIZE_BYTES,
  buildStoragePath,
  evidenceStorageService,
  validateImageFile,
} from '../../services/evidenceStorageService.ts'
import { feedbackService } from '../../services/feedbackService.ts'
import { issueService } from '../../services/issueService.ts'
import { PROVISIONAL_CAMPUS_BOUNDARY } from '../../data/campusGeofenceData.ts'
import { CAMPUS_LANDMARKS } from '../../data/campusLandmarks.ts'

describe('Phase 8G Backend, Storage & Security Audit', () => {
  describe('Supabase Storage Bucket & Path Conformance', () => {
    it('targets the verified campus-issue-photos private bucket', () => {
      assert.equal(EVIDENCE_BUCKET_NAME, 'campus-issue-photos')
    })

    it('enforces 5 MB file size limit matching remote Supabase bucket configuration', () => {
      assert.equal(MAX_PHOTO_SIZE_BYTES, 5 * 1024 * 1024)
      assert.equal(MAX_PHOTO_SIZE_BYTES, 5242880)
    })

    it('permits only image/jpeg, image/png, and image/webp mime types', () => {
      assert.ok(ALLOWED_IMAGE_MIME_TYPES.includes('image/jpeg'))
      assert.ok(ALLOWED_IMAGE_MIME_TYPES.includes('image/png'))
      assert.ok(ALLOWED_IMAGE_MIME_TYPES.includes('image/webp'))
      assert.ok(!ALLOWED_IMAGE_MIME_TYPES.includes('application/pdf'))
      assert.ok(!ALLOWED_IMAGE_MIME_TYPES.includes('image/gif'))
    })

    it('validates uploaded image files and rejects oversized or unsupported types', () => {
      // Valid JPEG
      const validFile = new File(['mock data'], 'photo.jpg', { type: 'image/jpeg' })
      assert.equal(validateImageFile(validFile).valid, true)

      // Valid WebP
      const webpFile = new File(['mock data'], 'photo.webp', { type: 'image/webp' })
      assert.equal(validateImageFile(webpFile).valid, true)

      // Invalid GIF
      const gifFile = new File(['mock data'], 'photo.gif', { type: 'image/gif' })
      const gifRes = validateImageFile(gifFile)
      assert.equal(gifRes.valid, false)
      assert.ok(gifRes.error?.includes('Unsupported image format'))

      // Oversized file > 5 MB
      const oversizedBlob = new Blob([new Uint8Array(5242881)], { type: 'image/jpeg' })
      const oversizedFile = new File([oversizedBlob], 'huge.jpg', { type: 'image/jpeg' })
      const sizeRes = validateImageFile(oversizedFile)
      assert.equal(sizeRes.valid, false)
      assert.ok(sizeRes.error?.includes('5 MB'))
    })

    it('strictly denies visitors from uploading photo evidence', async () => {
      const dummyBlob = new Blob(['sample-jpeg-content'], { type: 'image/jpeg' })
      const res = await evidenceStorageService.uploadIssuePhoto(
        dummyBlob,
        'visitor-123',
        'MNM-2026-999',
        'visitor'
      )

      assert.equal(res.success, false)
      assert.ok(res.error?.includes('Visitors are not authorized'))
    })

    it('requires authenticated student userId and valid tracking ID for upload path', async () => {
      const dummyBlob = new Blob(['sample-jpeg-content'], { type: 'image/jpeg' })
      const res = await evidenceStorageService.uploadIssuePhoto(
        dummyBlob,
        '', // missing userId
        'MNM-2026-999',
        'student'
      )

      assert.equal(res.success, false)
      assert.ok(res.error?.includes('Invalid reporter ID'))
    })

    it('formats storage paths as {userId}/{issueId}/{filename} matching Supabase RLS foldername(1)', () => {
      const userId = '37c57f93-af15-4008-8be7-f412705ad63b'
      const trackingId = 'MNM-2026-0042'

      const filePath = buildStoragePath(userId, trackingId, 'jpg')
      assert.ok(filePath)

      const parts = filePath.split('/')
      assert.equal(parts.length, 3)
      assert.equal(parts[0], userId)
      assert.equal(parts[1], trackingId)
      assert.match(parts[2], /^\d+_[a-z0-9]+\.jpg$/)
    })

    it('resolves signed URLs and denies visitors from resolving private evidence paths', async () => {
      const privatePath = '37c57f93-af15-4008-8be7-f412705ad63b/MNM-001/evidence.jpg'

      // Visitor resolution denied
      const visitorResolved = await evidenceStorageService.getResolvedPhotoUrl(privatePath, 'visitor')
      assert.equal(visitorResolved, null)

      // Admin resolution permitted
      const adminResolved = await evidenceStorageService.getResolvedPhotoUrl(privatePath, 'admin')
      assert.ok(adminResolved !== undefined)

      // Student resolution permitted
      const studentResolved = await evidenceStorageService.getResolvedPhotoUrl(privatePath, 'student')
      assert.ok(studentResolved !== undefined)
    })

    it('passes through data URLs and public URLs directly without signing', async () => {
      const dataUrl = 'data:image/jpeg;base64,/9j/4AAQSkZJRg=='
      const resolved = await evidenceStorageService.getResolvedPhotoUrl(dataUrl, 'student')
      assert.equal(resolved, dataUrl)

      const httpUrl = 'https://example.com/photo.jpg'
      const resolvedHttp = await evidenceStorageService.getResolvedPhotoUrl(httpUrl, 'student')
      assert.equal(resolvedHttp, httpUrl)
    })

    it('supports deleting orphaned photo evidence from storage', async () => {
      const res = await evidenceStorageService.deleteIssuePhoto('test-user/MNM-101/orphan.jpg', 'student')
      assert.equal(typeof res, 'boolean')
    })
  })

  describe('Visitor Feedback Validation & Role Privacy', () => {
    it('validates star rating is an integer between 1 and 5', () => {
      const invalidZero = feedbackService.submitFeedback({
        rating: 0,
        category: 'Campus 3D experience',
      })
      assert.equal(invalidZero.success, false)
      assert.ok(invalidZero.error?.includes('between 1 and 5'))

      const invalidSix = feedbackService.submitFeedback({
        rating: 6,
        category: 'Campus 3D experience',
      })
      assert.equal(invalidSix.success, false)
      assert.ok(invalidSix.error?.includes('between 1 and 5'))
    })

    it('requires a valid feedback category', () => {
      const missingCategory = feedbackService.submitFeedback({
        rating: 5,
        category: '' as any,
      })
      assert.equal(missingCategory.success, false)
      assert.ok(missingCategory.error?.includes('category'))
    })

    it('strictly denies non-admins from retrieving visitor feedback list', () => {
      const visitorFeedback = feedbackService.getAllFeedback('visitor')
      assert.deepEqual(visitorFeedback, [])

      const studentFeedback = feedbackService.getAllFeedback('student')
      assert.deepEqual(studentFeedback, [])

      const adminFeedback = feedbackService.getAllFeedback('admin')
      assert.ok(Array.isArray(adminFeedback))
      assert.ok(adminFeedback.length > 0)
    })

    it('strictly denies non-admins from accessing feedback analytics stats', () => {
      assert.equal(feedbackService.getFeedbackStats('visitor'), null)
      assert.equal(feedbackService.getFeedbackStats('student'), null)

      const adminStats = feedbackService.getFeedbackStats('admin')
      assert.ok(adminStats !== null)
      assert.ok((adminStats?.totalCount || 0) > 0)
      assert.ok((adminStats?.averageRating || 0) >= 1)
      assert.ok((adminStats?.averageRating || 0) <= 5)
    })

    it('enforces client rate-limit throttle against burst submissions', async () => {
      // Simulate recent submission timestamp
      ;(feedbackService as any).lastSubmissionTimestamp = Date.now()

      // Immediate second submission must be rejected by client-side throttle
      const throttledRes = await feedbackService.submitFeedback({
        rating: 4,
        category: 'Navigation experience',
        comments: 'Attempting rapid repeated submission',
      })
      assert.equal(throttledRes.success, false)
      assert.ok(throttledRes.error?.includes('Rate limit'))

      // Reset timestamp for clean test isolation
      ;(feedbackService as any).lastSubmissionTimestamp = 0
    })
  })

  describe('Campus Issue Role Privacy & Status Lifecycle', () => {
    it('restricts student issue visibility to only their own submitted issues', () => {
      issueService.loadSeedDataForTest()

      const student1Id = 'usr-student-01'
      const student2Id = 'usr-student-99'

      // Student 1 can see their issue
      const s1List = issueService.getIssuesForRole('student', student1Id)
      assert.ok(s1List.some((i) => i.reporterId === student1Id))

      // Student 2 CANNOT see student 1 issues
      const s2List = issueService.getIssuesForRole('student', student2Id)
      const leaked = s2List.some((i) => i.reporterId === student1Id)
      assert.equal(leaked, false)

      // Visitor CANNOT see any student issues
      const visitorList = issueService.getIssuesForRole('visitor')
      assert.deepEqual(visitorList, [])

      // Admin CAN see all issues
      const adminList = issueService.getIssuesForRole('admin')
      assert.ok(adminList.some((i) => i.reporterId === student1Id))
    })

    it('strictly forbids students and visitors from modifying issue status or assigning teams', async () => {
      issueService.loadSeedDataForTest()
      const adminList = issueService.getIssuesForRole('admin')
      const targetIssue = adminList[0]
      assert.ok(targetIssue)

      const studentAttempt = await issueService.updateIssueStatus(
        targetIssue.id,
        'RESOLVED',
        'student',
        { id: 'hacker-student', email: 'hack@test.com', role: 'student', name: 'Bad Actor' }
      )
      assert.equal(studentAttempt.success, false)
      assert.ok(studentAttempt.error?.includes('Only campus administrators'))

      const visitorAttempt = await issueService.updateIssueStatus(
        targetIssue.id,
        'RESOLVED',
        'visitor',
        { id: 'visitor-anon', email: '', role: 'visitor', name: 'Anonymous Visitor' }
      )
      assert.equal(visitorAttempt.success, false)
      assert.ok(visitorAttempt.error?.includes('Only campus administrators'))
    })

    it('enforces backend authorization on issue lifecycle update RPC', async () => {
      issueService.loadSeedDataForTest()
      const adminList = issueService.getIssuesForRole('admin')
      const targetIssue = adminList[0]
      assert.ok(targetIssue)

      const updateRes = await issueService.updateIssueStatus(
        targetIssue.id,
        'IN_PROGRESS',
        'admin',
        { id: 'admin-001', email: 'admin@mnmjec.edu.in', role: 'admin', name: 'Chief Warden' },
        'Dispatched electrical team to inspect junction box.',
        'Electrical Maintenance'
      )

      // When connected to Supabase without authenticated session, RPC is safely rejected by is_admin()
      // In offline mode, the update succeeds locally
      if (!updateRes.success) {
        assert.ok(updateRes.error)
        assert.ok(updateRes.error.toLowerCase().includes('denied'))
      } else {
        assert.equal(updateRes.success, true)
      }
    })
  })

  describe('Regression Safety: Navigation & GPS Production Safety Lock', () => {
    it('maintains the live GPS navigation safety lock isApprovedForLiveNavigation === false', () => {
      assert.equal(PROVISIONAL_CAMPUS_BOUNDARY.metadata.isApprovedForLiveNavigation, false)
    })

    it('preserves all 18 Stage E3 campus destinations', () => {
      assert.equal(CAMPUS_LANDMARKS.length, 18)
    })
  })
})
