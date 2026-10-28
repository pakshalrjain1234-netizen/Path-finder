import assert from 'node:assert/strict'
import { describe, it, beforeEach } from 'node:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { feedbackService } from '../../services/feedbackService.ts'
import { authService } from '../../services/authService.ts'

describe('Phase 9D.2: Feedback Backend Security Hardening & Negative Security Tests', () => {
  beforeEach(async () => {
    // Reset auth session and rate-limit timers between tests
    await authService.logout()
    ;(feedbackService as any).lastSubmissionTimestamp = 0
  })

  describe('1. Negative Security: Forged Student IDs & Impersonation Prevention', () => {
    it('rejects submission when an authenticated student attempts to forge a peer student ID', async () => {
      // Log in as real student Aditya Sundaram (ID: 311822104018)
      await authService.login('student', 'student', 'student@demo2026')
      assert.equal(authService.getRole(), 'student')
      assert.equal(authService.getUser()?.studentId, '311822104018')

      // Attempt to submit feedback claiming to be student 311822999999 (forgery attempt)
      const res = await feedbackService.submitFeedback({
        userType: 'student',
        category: 'Campus facilities',
        studentId: '311822999999', // Spoofed student ID
        name: 'Forged Peer Name',
        comments: 'Attempting to inject feedback under another students account.',
      })

      assert.equal(res.success, false)
      assert.ok(
        res.error?.includes('Forged student ID detected') || res.error?.includes('Access Denied'),
        `Expected forgery error, got: ${res.error}`
      )
    })

    it('derives authoritative student ID from server-side session when student submits', async () => {
      await authService.login('student', 'student', 'student@demo2026')

      const res = await feedbackService.submitFeedback({
        userType: 'student',
        category: 'Campus navigation experience',
        studentId: '311822104018', // Correct session ID
        comments: 'Navigation arrows correctly guided me to the Computer Science lab.',
      })

      assert.equal(res.success, true)
      assert.ok(res.entry)
      assert.equal(res.entry?.studentId, '311822104018')
      assert.equal(res.entry?.department, 'Computer Science & Engineering')
      assert.equal(res.entry?.name, 'Aditya Sundaram')
    })

    it('strips student identity fields if submitted under visitor role', async () => {
      authService.loginAsVisitor()
      assert.equal(authService.getRole(), 'visitor')

      const res = await feedbackService.submitFeedback({
        userType: 'visitor',
        category: 'Campus visit experience',
        studentId: '311822104018', // Attempting to attach student ID as visitor
        department: 'Computer Science & Engineering',
        comments: 'Clean campus pathways and well-maintained landscape.',
      })

      assert.equal(res.success, true)
      assert.ok(res.entry)
      assert.equal(res.entry?.userType, 'visitor')
      assert.equal(res.entry?.studentId, undefined, 'Visitor submissions must not persist student ID')
      assert.equal(res.entry?.department, undefined, 'Visitor submissions must not persist department')
    })
  })

  describe('2. Negative Security: Unauthorized Admin Access & Privilege Elevation Prevention', () => {
    it('denies unauthenticated visitors from retrieving all feedback', () => {
      const result = feedbackService.getAllFeedback('visitor')
      assert.deepEqual(result, [], 'Visitors must receive zero feedback records')
    })

    it('denies ordinary students from retrieving all feedback', async () => {
      await authService.login('student', 'student', 'student@demo2026')
      const result = feedbackService.getAllFeedback('student')
      assert.deepEqual(result, [], 'Students must receive zero feedback records')
    })

    it('blocks self-elevation: authenticated student passing role "admin" is denied all feedback', async () => {
      await authService.login('student', 'student', 'student@demo2026')
      assert.equal(authService.getRole(), 'student')

      // Student attempts to call getAllFeedback passing 'admin'
      const elevationAttempt = feedbackService.getAllFeedback('admin')
      assert.deepEqual(elevationAttempt, [], 'Student claiming admin role must be denied')
    })

    it('denies visitor from updating feedback review status or notes', () => {
      const allEntries = (feedbackService as any).feedbackList
      const target = allEntries[0]

      const res = feedbackService.updateFeedbackReview(
        target.id,
        'addressed',
        'Unauthorized status change by visitor',
        'visitor'
      )
      assert.equal(res.success, false)
      assert.ok(res.error?.includes('Unauthorized'))
    })

    it('blocks self-elevation: authenticated student passing role "admin" cannot update review notes', async () => {
      await authService.login('student', 'student', 'student@demo2026')
      const allEntries = (feedbackService as any).feedbackList
      const target = allEntries[0]

      const res = feedbackService.updateFeedbackReview(
        target.id,
        'addressed',
        'Student attempting unauthorized admin review update',
        'admin' // Attempted elevation
      )
      assert.equal(res.success, false)
      assert.ok(res.error?.includes('Unauthorized'))
    })

    it('denies non-admins from viewing feedback statistical KPIs', async () => {
      assert.equal(feedbackService.getFeedbackStats('visitor'), null)

      await authService.login('student', 'student', 'student@demo2026')
      assert.equal(feedbackService.getFeedbackStats('student'), null)
      assert.equal(feedbackService.getFeedbackStats('admin'), null, 'Student claiming admin role must be denied stats')
    })
  })

  describe('3. Security & Privacy: Internal Administrative Notes Isolation', () => {
    it('strictly strips adminNotes when students inspect their own submissions', async () => {
      await authService.login('student', 'student', 'student@demo2026')

      // Ensure at least one entry has an admin note in the store
      const allEntries = (feedbackService as any).feedbackList
      const studentEntry = allEntries.find((e: any) => e.userType === 'student' && e.studentId === '311822104018')
      if (studentEntry) {
        studentEntry.adminNotes = 'CONFIDENTIAL STAFF NOTE: Verified with Estate Office.'
      }

      const studentView = feedbackService.getStudentFeedback('311822104018', 'student')
      assert.ok(studentView.length > 0)

      for (const entry of studentView) {
        assert.equal(
          entry.adminNotes,
          undefined,
          'Administrative internal notes must NEVER be exposed to students'
        )
      }
    })

    it('preserves adminNotes only when verified Administrator queries submissions', async () => {
      await authService.login('admin', 'admin', 'admin@demo2026')
      assert.equal(authService.getRole(), 'admin')

      const adminView = feedbackService.getStudentFeedback('311822104018', 'admin')
      assert.ok(adminView.length > 0)

      const entryWithNotes = adminView.find((e) => e.adminNotes !== undefined)
      assert.ok(entryWithNotes, 'Administrator must be able to view staff internal notes')
    })
  })

  describe('4. Security & Privacy: Cross-Student Isolation & Impersonation Prevention', () => {
    it('blocks Student A from querying Student B feedback submissions', async () => {
      // Log in as Student A (Aditya Sundaram: 311822104018)
      await authService.login('student', 'student', 'student@demo2026')

      // Attempt to query Student B (Karthik Raja: 311822114009)
      const crossStudentQuery = feedbackService.getStudentFeedback('311822114009', 'student')
      assert.deepEqual(crossStudentQuery, [], 'Cross-student query must return empty array')
    })

    it('blocks visitors from querying student feedback', () => {
      authService.loginAsVisitor()
      const visitorQuery = feedbackService.getStudentFeedback('311822104018', 'visitor')
      assert.deepEqual(visitorQuery, [])
    })
  })

  describe('5. Abuse Protection: Comments Bounds & Rate Limiting', () => {
    it('rejects comments that are too short (< 5 chars)', async () => {
      const res = await feedbackService.submitFeedback({
        category: 'Campus visit experience',
        comments: 'Bad',
      })
      assert.equal(res.success, false)
      assert.ok(res.error?.includes('at least 5 characters'))
    })

    it('throttles rapid repeated submissions within cooldown window', async () => {
      ;(feedbackService as any).lastSubmissionTimestamp = Date.now()

      const res = await feedbackService.submitFeedback({
        category: 'General suggestions',
        comments: 'Rapid submission burst test message.',
      })

      assert.equal(res.success, false)
      assert.ok(res.error?.includes('Rate limit'))
    })
  })

  describe('6. PostgreSQL Security Invariants & Migration Hardening Review', () => {
    it('verifies SQL migration removes WITH CHECK (true) and hardens table grants', () => {
      const migrationPath = join(process.cwd(), 'supabase', 'migrations', '20261026000001_phase9d_feedback_center.sql')
      const sqlContent = readFileSync(migrationPath, 'utf-8')

      // 1. Ensure NO permissive WITH CHECK (true) exists
      assert.ok(
        !sqlContent.includes('WITH CHECK (true)'),
        'Migration must not contain permissive WITH CHECK (true)'
      )

      // 2. Ensure direct table INSERT is revoked from anon and authenticated
      assert.ok(
        sqlContent.includes('REVOKE INSERT, DELETE ON public.visitor_feedback FROM anon, authenticated'),
        'Direct table INSERT must be revoked from anon and authenticated'
      )

      // 3. Ensure dedicated feedback_internal_notes table exists
      assert.ok(
        sqlContent.includes('CREATE TABLE IF NOT EXISTS public.feedback_internal_notes'),
        'Internal notes must be isolated in feedback_internal_notes table'
      )

      // 4. Ensure internal notes table RLS uses public.is_admin()
      assert.ok(
        sqlContent.includes('USING (public.is_admin())'),
        'Internal notes must be protected strictly with public.is_admin()'
      )

      // 5. Ensure submit_unified_feedback RPC is REVOKED from PUBLIC, anon, and authenticated
      assert.ok(
        sqlContent.includes('REVOKE ALL ON FUNCTION public.submit_unified_feedback FROM PUBLIC, anon, authenticated'),
        'Atomic submission RPC must be revoked from browser roles'
      )
      assert.ok(
        sqlContent.includes('GRANT EXECUTE ON FUNCTION public.submit_unified_feedback TO service_role'),
        'Atomic submission RPC must be restricted to service_role only'
      )

      // 6. Ensure no email suffix based authorization is used
      assert.ok(
        !sqlContent.includes('%@admin.mnmjec%'),
        'Migration must never use email wildcard matching for admin access'
      )
    })

    it('verifies Edge Function enforces identity verification and profile derivation', () => {
      const edgeFunctionPath = join(process.cwd(), 'supabase', 'functions', 'submit-feedback', 'index.ts')
      const functionContent = readFileSync(edgeFunctionPath, 'utf-8')

      // 1. Verifies token check
      assert.ok(
        functionContent.includes('supabaseAdmin.auth.getUser(token)'),
        'Edge Function must verify JWT token using auth.getUser()'
      )

      // 2. Verifies public.profiles role check
      assert.ok(
        functionContent.includes("from('profiles')"),
        'Edge Function must query trusted profiles table'
      )
      assert.ok(
        functionContent.includes("profile.role !== 'student'"),
        'Edge Function must verify student role'
      )

      // 3. Verifies student ID is derived from profile, not body
      assert.ok(
        functionContent.includes('sanitizedStudentId = profile.student_id'),
        'Student ID must be derived from database profile'
      )

      // 4. Verifies database rate limit RPC is called
      assert.ok(
        functionContent.includes('check_and_record_feedback_rate_limit'),
        'Edge Function must enforce database atomic rate limiting'
      )

      // 5. Verifies FEEDBACK_SALT is required and fails safely if missing or weak
      assert.ok(
        functionContent.includes('salt.trim().length < 32'),
        'Edge Function must enforce a minimum 32-character FEEDBACK_SALT'
      )
      assert.ok(
        !functionContent.includes('|| \'mnmjec_pathfinder_2026_salt\''),
        'Edge Function must NEVER have a hardcoded fallback salt'
      )

      // 6. Verifies client IP is obtained strictly from trusted infrastructure
      assert.ok(
        functionContent.includes('getTrustedClientIp') && functionContent.includes('cf-connecting-ip'),
        'Edge Function must use trusted Cloudflare edge header'
      )
      assert.ok(
        !functionContent.includes("req.headers.get('x-forwarded-for')"),
        'Edge Function must NOT trust arbitrary spoofable X-Forwarded-For headers'
      )
    })

    it('verifies feedbackService provides clear "Not submitted — please retry" error when server is unreachable', () => {
      const servicePath = join(process.cwd(), 'src', 'services', 'feedbackService.ts')
      const serviceContent = readFileSync(servicePath, 'utf-8')

      assert.ok(
        serviceContent.includes('Not submitted — campus feedback server is currently unreachable. Your draft has been preserved. Please retry.'),
        'feedbackService must present an explicit Not submitted state with draft preservation'
      )
    })
  })
})
