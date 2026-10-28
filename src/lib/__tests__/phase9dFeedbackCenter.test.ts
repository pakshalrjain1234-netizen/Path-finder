import assert from 'node:assert/strict'
import { describe, it, beforeEach } from 'node:test'
import { feedbackService } from '../../services/feedbackService.ts'
import {
  FEEDBACK_CATEGORIES,
  STUDENT_FEEDBACK_CATEGORIES,
  VISITOR_FEEDBACK_CATEGORIES,
} from '../../types/feedback.ts'

describe('Phase 9D.1: Student & Visitor Feedback Center Architecture & Security', () => {
  beforeEach(() => {
    // Reset rate-limit timer and local list
    ;(feedbackService as any).lastSubmissionTimestamp = 0
  })

  describe('Feature 1, 2 & 3: Category Specifications & Role-Aware Data Integrity', () => {
    it('mandates the 4 required Visitor feedback categories', () => {
      assert.equal(VISITOR_FEEDBACK_CATEGORIES.length, 4)
      assert.ok(VISITOR_FEEDBACK_CATEGORIES.includes('Campus visit experience'))
      assert.ok(VISITOR_FEEDBACK_CATEGORIES.includes('3D virtual tour experience'))
      assert.ok(VISITOR_FEEDBACK_CATEGORIES.includes('Clarity of college information'))
      assert.ok(VISITOR_FEEDBACK_CATEGORIES.includes('General suggestions'))
    })

    it('mandates the 4 required Student feedback categories', () => {
      assert.equal(STUDENT_FEEDBACK_CATEGORIES.length, 4)
      assert.ok(STUDENT_FEEDBACK_CATEGORIES.includes('Campus facilities'))
      assert.ok(STUDENT_FEEDBACK_CATEGORIES.includes('Campus navigation experience'))
      assert.ok(STUDENT_FEEDBACK_CATEGORIES.includes('Student services'))
      assert.ok(STUDENT_FEEDBACK_CATEGORIES.includes('Suggestions for improvement'))
    })

    it('preserves legacy FEEDBACK_CATEGORIES for backward compatibility', () => {
      assert.equal(FEEDBACK_CATEGORIES.length, 5)
      assert.ok(FEEDBACK_CATEGORIES.includes('Campus 3D experience'))
      assert.ok(FEEDBACK_CATEGORIES.includes('Navigation experience'))
      assert.ok(FEEDBACK_CATEGORIES.includes('Campus information'))
      assert.ok(FEEDBACK_CATEGORIES.includes('Website usability'))
      assert.ok(FEEDBACK_CATEGORIES.includes('General suggestion'))
    })
  })

  describe('Feature 2: Visitor Feedback Submission & Optional Rating', () => {
    it('accepts valid visitor feedback with 5-star rating and comments', () => {
      const res = feedbackService.submitFeedback({
        userType: 'visitor',
        category: 'Campus visit experience',
        rating: 5,
        name: 'Guest Visitor',
        comments: 'Found the Main Block admissions desk very easily with the 3D map.',
      })

      assert.equal(res.success, true)
      assert.ok(res.entry)
      assert.equal(res.entry?.userType, 'visitor')
      assert.equal(res.entry?.rating, 5)
      assert.equal(res.entry?.status, 'pending')
    })

    it('accepts unrated visitor feedback (optional rating feature)', () => {
      ;(feedbackService as any).lastSubmissionTimestamp = 0
      const res = feedbackService.submitFeedback({
        userType: 'visitor',
        category: 'Clarity of college information',
        comments: 'Could use more details on library entry timings.',
      })

      assert.equal(res.success, true)
      assert.ok(res.entry)
      assert.equal(res.entry?.rating, undefined)
      assert.equal(res.entry?.comments, 'Could use more details on library entry timings.')
    })

    it('rejects out-of-range star ratings (0 or 6)', () => {
      ;(feedbackService as any).lastSubmissionTimestamp = 0
      const resLow = feedbackService.submitFeedback({
        category: 'Campus visit experience',
        rating: 0,
      })
      assert.equal(resLow.success, false)

      ;(feedbackService as any).lastSubmissionTimestamp = 0
      const resHigh = feedbackService.submitFeedback({
        category: 'Campus visit experience',
        rating: 6,
      })
      assert.equal(resHigh.success, false)
    })

    it('rejects feedback submission with missing or empty category', () => {
      ;(feedbackService as any).lastSubmissionTimestamp = 0
      const resMissing = feedbackService.submitFeedback({
        category: '' as any,
        rating: 4,
      })
      assert.equal(resMissing.success, false)
      assert.equal(resMissing.error, 'Please select a feedback category.')
    })
  })

  describe('Feature 3 & 6: Student Feedback Submission & Cross-Student Privacy', () => {
    it('submits student feedback with studentId and department', () => {
      ;(feedbackService as any).lastSubmissionTimestamp = 0
      const res = feedbackService.submitFeedback({
        userType: 'student',
        category: 'Campus facilities',
        rating: 4,
        name: 'Aditya Sundaram',
        studentId: '311822104018',
        department: 'Computer Science & Engineering',
        comments: 'Air conditioning in the IT Block lab 2 needs servicing.',
      })

      assert.equal(res.success, true)
      assert.ok(res.entry)
      assert.equal(res.entry?.userType, 'student')
      assert.equal(res.entry?.studentId, '311822104018')
      assert.equal(res.entry?.department, 'Computer Science & Engineering')
      assert.equal(res.entry?.status, 'pending')
    })

    it('allows a student to view only their own feedback submissions', () => {
      const student1Submissions = feedbackService.getStudentFeedback('311822104018', 'student')
      assert.ok(Array.isArray(student1Submissions))
      assert.ok(student1Submissions.length > 0)
      for (const item of student1Submissions) {
        assert.equal(item.studentId, '311822104018')
        assert.equal(item.userType, 'student')
      }
    })

    it('strictly denies cross-student access: Student B cannot see Student A submissions', () => {
      const student2Submissions = feedbackService.getStudentFeedback('311822999999', 'student')
      // No feedback was submitted by 311822999999
      assert.deepEqual(student2Submissions, [])
    })

    it('strictly denies visitor role from accessing student feedback', () => {
      const visitorAccess = feedbackService.getStudentFeedback('311822104018', 'visitor')
      assert.deepEqual(visitorAccess, [])
    })
  })

  describe('Feature 5 & 6: Admin Feedback Management & Status Review', () => {
    it('allows Administrator to retrieve all feedback submissions across roles', () => {
      const allFeedback = feedbackService.getAllFeedback('admin')
      assert.ok(Array.isArray(allFeedback))
      assert.ok(allFeedback.length >= 4)

      const userTypes = allFeedback.map((f) => f.userType)
      assert.ok(userTypes.includes('visitor'))
      assert.ok(userTypes.includes('student'))
    })

    it('allows Admin to update review status and internal notes', () => {
      const allFeedback = feedbackService.getAllFeedback('admin')
      const target = allFeedback[0]

      const res = feedbackService.updateFeedbackReview(
        target.id,
        'addressed',
        'Resolution verified by department head.',
        'admin'
      )
      assert.equal(res.success, true)

      const updatedList = feedbackService.getAllFeedback('admin')
      const updatedEntry = updatedList.find((f) => f.id === target.id)
      assert.equal(updatedEntry?.status, 'addressed')
      assert.equal(updatedEntry?.adminNotes, 'Resolution verified by department head.')
      assert.ok(updatedEntry?.reviewedAt)
    })

    it('strictly denies non-admins from updating feedback review status or notes', () => {
      const allFeedback = feedbackService.getAllFeedback('admin')
      const target = allFeedback[0]

      const visitorAttempt = feedbackService.updateFeedbackReview(
        target.id,
        'addressed',
        'Malicious update',
        'visitor'
      )
      assert.equal(visitorAttempt.success, false)

      const studentAttempt = feedbackService.updateFeedbackReview(
        target.id,
        'addressed',
        'Malicious student update',
        'student'
      )
      assert.equal(studentAttempt.success, false)
    })

    it('generates multi-role feedback analytics metrics for Admin only', () => {
      const stats = feedbackService.getFeedbackStats('admin')
      assert.ok(stats)
      assert.ok(stats.totalCount > 0)
      assert.ok(stats.averageRating >= 1 && stats.averageRating <= 5)
      assert.ok(stats.byUserType.visitor >= 1)
      assert.ok(stats.byUserType.student >= 1)
      assert.ok(stats.byStatus.pending >= 0)

      // Denies non-admins
      assert.equal(feedbackService.getFeedbackStats('visitor'), null)
      assert.equal(feedbackService.getFeedbackStats('student'), null)
    })
  })

  describe('Feature 4 & 6: Abuse Protection & Rate Limiting', () => {
    it('throttles rapid sequential submissions within 15 seconds', async () => {
      ;(feedbackService as any).lastSubmissionTimestamp = Date.now()

      const throttledRes = await feedbackService.submitFeedback({
        category: 'General suggestions',
        comments: 'Spam burst test',
      })

      assert.equal(throttledRes.success, false)
      assert.ok(throttledRes.error?.includes('Rate limit'))

      ;(feedbackService as any).lastSubmissionTimestamp = 0
    })
  })
})
