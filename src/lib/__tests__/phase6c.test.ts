import assert from 'node:assert/strict'
import { beforeEach, describe, it } from 'node:test'
import { CAMPUS_LANDMARKS } from '../../data/campusLandmarks.ts'
import { CAMPUS_SERVICE_POIS } from '../../data/campusPois.ts'
import { CAMPUS_TOUR_STOPS, HIGHLIGHTS_TOUR_STOPS } from '../../data/campusTourStops.ts'
import { PROVISIONAL_CAMPUS_BOUNDARY } from '../../data/campusGeofenceData.ts'
import { authService, DEMO_USERS, getRolePermissions } from '../../services/authService.ts'
import { feedbackService } from '../../services/feedbackService.ts'
import { issueService } from '../../services/issueService.ts'

describe('Phase 6C: Role-Based Authentication, Campus Issue Passport, Feedback & Tour Fixes', () => {
  beforeEach(() => {
    authService.logout()
    issueService.resetToDefaultSeed()
  })

  describe('Part 1: Authentication & Role Selection', () => {
    it('authenticates Admin demo account with correct credentials', async () => {
      const res = await authService.login('admin', 'admin', 'admin@demo2026')
      assert.equal(res.success, true)
      assert.ok(res.session)
      assert.equal(res.session?.user.role, 'admin')
      assert.equal(authService.getRole(), 'admin')
      assert.equal(authService.isAuthenticated(), true)
    })

    it('authenticates Student demo account with correct credentials', async () => {
      const res = await authService.login('student', 'student', 'student@demo2026')
      assert.equal(res.success, true)
      assert.ok(res.session)
      assert.equal(res.session?.user.role, 'student')
      assert.equal(authService.getRole(), 'student')
      assert.equal(authService.isAuthenticated(), true)
    })

    it('rejects invalid password credentials', async () => {
      const res = await authService.login('student', 'student', 'wrong-pass')
      assert.equal(res.success, false)
      assert.ok(res.error)
      assert.equal(authService.isAuthenticated(), false)
    })

    it('supports seamless Visitor entry without credentials', () => {
      const session = authService.loginAsVisitor()
      assert.equal(session.user.role, 'visitor')
      assert.equal(authService.getRole(), 'visitor')
      // Visitor is not a privileged authenticated account
      assert.equal(authService.isAuthenticated(), false)
    })

    it('clears session upon logout', async () => {
      await authService.login('admin', 'admin', 'admin@demo2026')
      assert.equal(authService.getRole(), 'admin')
      authService.logout()
      assert.equal(authService.getRole(), 'visitor')
      assert.equal(authService.getSession(), null)
    })
  })

  describe('Part 2: Permission Matrix & Visitor Isolation', () => {
    it('grants administrative operations only to Admin', () => {
      const adminPerms = getRolePermissions('admin')
      assert.equal(adminPerms.canManageIssues, true)
      assert.equal(adminPerms.canViewAllIssues, true)
      assert.equal(adminPerms.canViewFeedbackDashboard, true)
      assert.equal(adminPerms.canViewIssue3DMarkers, true)
    })

    it('limits Student permissions to personal reporting', () => {
      const studentPerms = getRolePermissions('student')
      assert.equal(studentPerms.canSubmitIssue, true)
      assert.equal(studentPerms.canViewOwnIssues, true)
      assert.equal(studentPerms.canViewAllIssues, false)
      assert.equal(studentPerms.canManageIssues, false)
      assert.equal(studentPerms.canViewFeedbackDashboard, false)
      assert.equal(studentPerms.canViewIssue3DMarkers, false)
    })

    it('enforces STRICT visitor isolation: ZERO access to issue records or markers', () => {
      const visitorPerms = getRolePermissions('visitor')
      assert.equal(visitorPerms.canSubmitIssue, false)
      assert.equal(visitorPerms.canViewOwnIssues, false)
      assert.equal(visitorPerms.canViewAllIssues, false)
      assert.equal(visitorPerms.canManageIssues, false)
      assert.equal(visitorPerms.canViewIssue3DMarkers, false)

      // Data layer isolation test: visitor receives empty issues array
      const visitorIssues = issueService.getIssuesForRole('visitor')
      assert.deepEqual(visitorIssues, [])

      // Direct ID lookup by visitor returns null
      const directLookup = issueService.getIssueById('MNM-2026-0038', 'visitor')
      assert.equal(directLookup, null)

      // Direct statistics query by visitor returns null
      const stats = issueService.getStatistics('visitor')
      assert.equal(stats, null)
    })
  })

  describe('Part 3: Campus Issue Passport (Student Workflow)', () => {
    it('allows authenticated student to create issue with 3D model coordinates', () => {
      const studentUser = DEMO_USERS.student
      const res = issueService.createIssue(
        {
          category: 'Water leakage',
          description: 'Drinking water filter leaking on ground floor corridor.',
          locationName: 'Main Block East Wing',
          buildingId: 'main-block',
          modelCoordinates: [193.5, 3.8, -65.8],
        },
        'student',
        studentUser
      )

      assert.equal(res.success, true)
      assert.ok(res.issue)
      assert.ok(res.issue.id.startsWith('MNM-2026-'))
      assert.equal(res.issue.status, 'SUBMITTED')
      assert.equal(res.issue.reporterId, studentUser.id)
      assert.deepEqual(res.issue.modelCoordinates, [193.5, 3.8, -65.8])
    })

    it('blocks visitor from creating a campus maintenance issue', () => {
      const res = issueService.createIssue(
        {
          category: 'Cleanliness',
          description: 'Spill on walkway',
          locationName: 'Walkway',
          modelCoordinates: [100, 3.8, -50],
        },
        'visitor',
        { id: 'guest', name: 'Guest', email: 'guest@test', role: 'visitor' }
      )

      assert.equal(res.success, false)
      assert.ok(res.error)
    })

    it('isolates student report access so students cannot inspect other students private issues', () => {
      const student1 = DEMO_USERS.student
      const student1Reports = issueService.getIssuesForRole('student', student1.id)
      // All returned reports belong strictly to student1
      for (const r of student1Reports) {
        assert.equal(r.reporterId, student1.id)
      }

      // If student1 tries to fetch an issue created by student2 (e.g. MNM-2026-0043)
      const foreignIssue = issueService.getIssueById('MNM-2026-0043', 'student', student1.id)
      assert.equal(foreignIssue, null)
    })

    it('prevents students from changing administrative issue status', () => {
      const student = DEMO_USERS.student
      const res = issueService.updateIssueStatus(
        'MNM-2026-0038',
        'RESOLVED',
        'student',
        student,
        'Attempting unauthorized student resolve'
      )
      assert.equal(res.success, false)
      assert.ok(res.error)
    })
  })

  describe('Part 4: Admin Campus Issue Command Center', () => {
    it('returns all campus issues and calculates operational statistics for Admin', () => {
      const allIssues = issueService.getIssuesForRole('admin')
      assert.ok(allIssues.length >= 4)

      const stats = issueService.getStatistics('admin')
      assert.ok(stats)
      assert.equal(stats.total, allIssues.length)
      assert.ok(stats.submitted >= 1)
      assert.ok(stats.inProgress >= 1)
      assert.ok(stats.resolved >= 1)
    })

    it('allows Admin to update status, assign maintenance team, and record audit trail', () => {
      const admin = DEMO_USERS.admin
      const issueId = 'MNM-2026-0043'

      const updateRes = issueService.updateIssueStatus(
        issueId,
        'ASSIGNED',
        'admin',
        admin,
        'Assigned to electrical team for capacitor repair',
        'Campus Electrical Works'
      )
      assert.equal(updateRes.success, true)

      const updated = issueService.getIssueById(issueId, 'admin')
      assert.ok(updated)
      assert.equal(updated.status, 'ASSIGNED')
      assert.equal(updated.assignedTeam, 'Campus Electrical Works')

      // Audit trail record verification
      const latestHistory = updated.history[updated.history.length - 1]
      assert.equal(latestHistory.status, 'ASSIGNED')
      assert.equal(latestHistory.actorName, admin.name)
      assert.equal(latestHistory.notes, 'Assigned to electrical team for capacitor repair')
    })
  })

  describe('Part 5: Visitor Feedback (Anonymous & Public-Isolated)', () => {
    it('allows anonymous visitor to submit 1-5 star feedback without account', () => {
      const res = feedbackService.submitFeedback({
        rating: 5,
        category: 'Campus 3D experience',
        name: 'Parent of Candidate',
        comments: 'Outstanding 3D view of the college facilities.',
      })

      assert.equal(res.success, true)
      assert.ok(res.entry)
      assert.equal(res.entry.rating, 5)
    })

    it('rejects invalid ratings outside 1-5', () => {
      const res = feedbackService.submitFeedback({
        rating: 6 as any,
        category: 'Website usability',
      })
      assert.equal(res.success, false)
      assert.ok(res.error)
    })

    it('restricts feedback dashboard view strictly to Admin', () => {
      // Visitor role gets empty array
      const visitorList = feedbackService.getAllFeedback('visitor')
      assert.deepEqual(visitorList, [])

      // Student role gets empty array
      const studentList = feedbackService.getAllFeedback('student')
      assert.deepEqual(studentList, [])

      // Admin role retrieves all submissions
      const adminList = feedbackService.getAllFeedback('admin')
      assert.ok(adminList.length >= 3)

      const stats = feedbackService.getFeedbackStats('admin')
      assert.ok(stats)
      assert.ok(stats.averageRating >= 1 && stats.averageRating <= 5)
    })
  })

  describe('Part 6 & 7: Cinematic Tour Fixes', () => {
    it('verifies Full Tour has 16 stops and Highlights Tour has 8 stops', () => {
      assert.equal(CAMPUS_TOUR_STOPS.length, 16)
      assert.equal(HIGHLIGHTS_TOUR_STOPS.length, 8)
    })

    it('verifies building tour stops correspond to campus landmarks or outdoor tour positions', () => {
      for (const stop of CAMPUS_TOUR_STOPS) {
        if (stop.buildingId) {
          const found = CAMPUS_LANDMARKS.find((l) => l.id === stop.buildingId)
          assert.ok(found, `Tour stop building ${stop.buildingId} must correspond to a valid campus landmark`)
        } else {
          assert.ok(
            ['aerial-overview-start', 'sports-ground', 'campus-panorama-finale'].includes(stop.id),
            `Unexpected overview/outdoor stop: ${stop.id}`
          )
        }
      }
    })
  })

  describe('Part 10: Regression Safeguards', () => {
    it('maintains strict live navigation approval lock (isApprovedForLiveNavigation === false)', () => {
      assert.equal(PROVISIONAL_CAMPUS_BOUNDARY.metadata.isApprovedForLiveNavigation, false)
    })

    it('preserves provisional POIs Apollo Shine and Xerox Shop', () => {
      const apollo = CAMPUS_SERVICE_POIS.find((p) => p.id === 'apollo-shine')
      const xerox = CAMPUS_SERVICE_POIS.find((p) => p.id === 'xerox-shop')
      assert.ok(apollo)
      assert.ok(xerox)
      assert.equal(apollo.isProvisional, true)
      assert.equal(xerox.isProvisional, true)
    })

    it('preserves Central Library in landmark registry', () => {
      const lib = CAMPUS_LANDMARKS.find((l) => l.id === 'library')
      assert.ok(lib)
      assert.equal(lib.type, 'facility')
    })
  })
})
