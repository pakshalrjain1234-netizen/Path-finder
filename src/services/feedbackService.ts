import { isSupabaseConfigured, supabase } from '../lib/supabaseClient.ts'
import { authService } from './authService.ts'
import type { UserRole } from '../types/auth.ts'
import {
  FEEDBACK_CATEGORIES,
  STUDENT_FEEDBACK_CATEGORIES,
  VISITOR_FEEDBACK_CATEGORIES,
  type FeedbackEntry,
  type FeedbackReviewStatus,
  type FeedbackStats,
  type FeedbackSubmissionInput,
  type FeedbackUserType,
  type UnifiedFeedbackCategory,
} from '../types/feedback.ts'

const FEEDBACK_STORAGE_KEY = 'pathfinder_visitor_feedback'

const SEED_FEEDBACK: FeedbackEntry[] = [
  {
    id: 'FB-2026-001',
    userType: 'visitor',
    rating: 5,
    category: '3D virtual tour experience',
    name: 'Suresh Kumar (Alumnus)',
    comments: 'The 3D campus model looks remarkably authentic. The Stage E3 geometry captures the college environment accurately.',
    status: 'reviewed',
    adminNotes: 'Verified Stage E3 model visual fidelities. Forwarded praise to 3D team.',
    reviewedAt: new Date(Date.now() - 36 * 3600 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
    isDemo: true,
  },
  {
    id: 'FB-2026-002',
    userType: 'visitor',
    rating: 5,
    category: 'Campus visit experience',
    name: 'Priya Narayanan (Prospective Parent)',
    comments: 'Walkway navigation made it easy to locate the Admissions office in Main Block without confusion.',
    status: 'addressed',
    adminNotes: 'Confirmed physical signage at Main Gate corresponds with digital routing.',
    reviewedAt: new Date(Date.now() - 18 * 3600 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    isDemo: true,
  },
  {
    id: 'FB-2026-003',
    userType: 'visitor',
    rating: 4,
    category: 'Website usability',
    name: 'Vikram Chandran',
    comments: 'The cinematic tour with automatic progression and natural voice narration was very informative and smooth.',
    status: 'reviewed',
    createdAt: new Date(Date.now() - 10 * 3600 * 1000).toISOString(),
    isDemo: true,
  },
  {
    id: 'FB-2026-004',
    userType: 'student',
    rating: 4,
    category: 'Campus facilities',
    name: 'Aditya Sundaram',
    studentId: '311822104018',
    department: 'Computer Science & Engineering',
    comments: 'The computing laboratories in IT Block are well-equipped. Adding real-time seating availability would be very helpful.',
    status: 'pending',
    createdAt: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
    isDemo: true,
  },
  {
    id: 'FB-2026-005',
    userType: 'student',
    rating: 5,
    category: 'Campus navigation experience',
    name: 'Meenakshi Raman',
    studentId: '311822106024',
    department: 'Information Technology',
    comments: 'The turn-by-turn guidance between First Year Block and Mechanical Block works seamlessly across the central walkways.',
    status: 'reviewed',
    adminNotes: 'Validated collision-free pathway with navigation team.',
    reviewedAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
    isDemo: true,
  },
  {
    id: 'FB-2026-006',
    userType: 'student',
    rating: 3,
    category: 'Student services',
    name: 'Karthik Raja',
    studentId: '311822114009',
    department: 'Mechanical Engineering',
    comments: 'Canteen service hours during sports events could be extended for evening practice sessions.',
    status: 'pending',
    createdAt: new Date(Date.now() - 1 * 3600 * 1000).toISOString(),
    isDemo: true,
  },
]

function makeThenable<T extends object>(res: T): Promise<T> & T {
  const p = Promise.resolve(res)
  return Object.assign(p, res)
}

function isValidCategory(cat: any): boolean {
  if (!cat || typeof cat !== 'string') return false
  return (
    (FEEDBACK_CATEGORIES as readonly string[]).includes(cat) ||
    (VISITOR_FEEDBACK_CATEGORIES as readonly string[]).includes(cat) ||
    (STUDENT_FEEDBACK_CATEGORIES as readonly string[]).includes(cat)
  )
}

class FeedbackService {
  private feedbackList: FeedbackEntry[] = []
  private listeners: Array<() => void> = []
  private lastSubmissionTimestamp = 0

  constructor() {
    this.loadFromStorage()
  }

  private loadFromStorage() {
    if (typeof window === 'undefined') {
      this.feedbackList = [...SEED_FEEDBACK]
      return
    }

    if (!isSupabaseConfigured) {
      try {
        const stored = localStorage.getItem(FEEDBACK_STORAGE_KEY)
        if (stored) {
          const parsed = JSON.parse(stored)
          this.feedbackList = Array.isArray(parsed) && parsed.length > 0 ? parsed : [...SEED_FEEDBACK]
        } else {
          this.feedbackList = [...SEED_FEEDBACK]
          localStorage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify(this.feedbackList))
        }
      } catch {
        this.feedbackList = [...SEED_FEEDBACK]
      }
    }
  }

  public onChange(listener: () => void): () => void {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener)
    }
  }

  private notify() {
    this.listeners.forEach((l) => {
      try {
        l()
      } catch {
        // ignore
      }
    })
  }

  public async fetchFromSupabase(role: UserRole): Promise<FeedbackEntry[]> {
    if (role !== 'admin') {
      return [] // Strictly blocked from non-admins
    }

    if (!isSupabaseConfigured || !supabase) {
      return this.feedbackList
    }

    try {
      const { data, error } = await supabase
        .from('visitor_feedback')
        .select('*')
        .order('created_at', { ascending: false })

      if (!error && data) {
        this.feedbackList = data.map((item: any) => ({
          id: item.id,
          userType: (item.user_type as FeedbackUserType) || 'visitor',
          rating: item.rating ? Number(item.rating) : undefined,
          category: item.category as UnifiedFeedbackCategory,
          name: item.name || undefined,
          studentId: item.student_id || undefined,
          department: item.department || undefined,
          comments: item.comments || undefined,
          status: (item.status as FeedbackReviewStatus) || 'pending',
          adminNotes: item.admin_notes || undefined,
          reviewedAt: item.reviewed_at || undefined,
          createdAt: item.created_at,
          isDemo: false,
        }))
        this.notify()
      }
    } catch (e) {
      console.warn('Error fetching feedback from Supabase:', e)
    }

    return this.feedbackList
  }

  public submitFeedback(
    input: FeedbackSubmissionInput
  ): Promise<{ success: boolean; entry?: FeedbackEntry; error?: string }> & {
    success: boolean
    entry?: FeedbackEntry
    error?: string
  } {
    // 1. Validate Rating (optional, but if provided must be integer 1 to 5)
    if (input.rating !== undefined && input.rating !== null) {
      if (typeof input.rating !== 'number' || input.rating < 1 || input.rating > 5) {
        return makeThenable({
          success: false,
          error: 'Please select a star rating between 1 and 5.',
        })
      }
    }

    // 2. Validate Category
    if (!input.category || !isValidCategory(input.category)) {
      return makeThenable({
        success: false,
        error: 'Please select a feedback category.',
      })
    }

    // 3. Validate Comments Bounds
    const cleanComments = input.comments?.trim() || ''
    if (cleanComments.length > 0 && cleanComments.length < 5) {
      return makeThenable({
        success: false,
        error: 'Feedback comments must be at least 5 characters.',
      })
    }

    // 4. Client-side rate-limit throttle (15 seconds between submissions)
    const now = Date.now()
    if (this.lastSubmissionTimestamp > 0 && now - this.lastSubmissionTimestamp < 15000) {
      const waitSeconds = Math.ceil((15000 - (now - this.lastSubmissionTimestamp)) / 1000)
      return makeThenable({
        success: false,
        error: `Rate limit: Please wait ${waitSeconds}s before submitting additional feedback.`,
      })
    }

    const determinedUserType: FeedbackUserType =
      input.userType || (input.studentId ? 'student' : 'visitor')

    // 5. Server-Authoritative Identity Derivation & Anti-Impersonation
    let authoritativeStudentId: string | undefined = undefined
    let authoritativeDepartment: string | undefined = undefined
    let authoritativeName: string | undefined = input.name?.trim() || undefined

    const activeUser = authService.getUser()
    const activeRole = authService.getRole()

    if (determinedUserType === 'student') {
      if (authService.isAuthenticated()) {
        if (activeRole !== 'student' && activeRole !== 'admin') {
          return makeThenable({
            success: false,
            error: 'Unauthorized: Student feedback requires an authenticated student session.',
          })
        }
        // Derive student identity strictly from the authenticated profile
        authoritativeStudentId = activeUser?.studentId || activeUser?.id
        authoritativeDepartment = activeUser?.department || 'General'
        authoritativeName = activeUser?.name || 'Verified Student'

        // Reject forged student ID attempts
        if (input.studentId && authoritativeStudentId && input.studentId !== authoritativeStudentId) {
          return makeThenable({
            success: false,
            error: 'Access Denied: Forged student ID detected. You cannot submit feedback posing as another student.',
          })
        }
      } else {
        // Fallback for offline demo mode
        authoritativeStudentId = input.studentId?.trim() || undefined
        authoritativeDepartment = input.department?.trim() || undefined
      }
    } else {
      // Visitor submissions: strictly disallow student ID and department
      authoritativeStudentId = undefined
      authoritativeDepartment = undefined
    }

    // 6. Supabase-Backed Submission via submit-feedback Edge Function
    if (isSupabaseConfigured) {
      const env: any =
        (typeof import.meta !== 'undefined' && (import.meta as any).env) ||
        (typeof process !== 'undefined' && process.env) ||
        {}
      const baseUrl = env.VITE_SUPABASE_URL || 'https://lqqqrqajeqzdtvkfvrnp.supabase.co'
      const edgeFunctionUrl = `${baseUrl}/functions/v1/submit-feedback`
      const session = authService.getSession()
      const authToken = session?.token

      const asyncOp = (async () => {
        try {
          const headers: Record<string, string> = {
            'Content-Type': 'application/json',
          }
          if (authToken) {
            headers['Authorization'] = `Bearer ${authToken}`
          }

          const response = await fetch(edgeFunctionUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              userType: determinedUserType,
              rating: input.rating ? Math.round(input.rating) : undefined,
              category: input.category,
              name: authoritativeName,
              studentId: authoritativeStudentId,
              department: authoritativeDepartment,
              comments: cleanComments || undefined,
            }),
          })

          if (!response.ok) {
            if (response.status === 404) {
              return {
                success: false,
                error:
                  "Not submitted — campus feedback service is not yet deployed on server. Your draft has been preserved. Please retry later.",
              }
            }
            const errBody = await response.json().catch(() => ({}))
            return {
              success: false,
              error:
                errBody.error ||
                `Not submitted — server rejected request (HTTP ${response.status}). Your draft has been preserved. Please retry.`,
            }
          }

          const resData = await response.json()
          const entry: FeedbackEntry = {
            id: resData.id || `FB-${Date.now()}`,
            userType: determinedUserType,
            rating: input.rating ? Math.round(input.rating) : undefined,
            category: input.category,
            name: authoritativeName,
            studentId: authoritativeStudentId,
            department: authoritativeDepartment,
            comments: cleanComments || undefined,
            status: 'pending',
            createdAt: new Date().toISOString(),
            isDemo: false,
          }

          this.lastSubmissionTimestamp = Date.now()
          return { success: true, entry }
        } catch {
          return {
            success: false,
            error:
              "Not submitted — campus feedback server is currently unreachable. Your draft has been preserved. Please retry.",
          }
        }
      })()

      return asyncOp as any
    }

    // 7. Offline / Local Demo Fallback Mode
    this.lastSubmissionTimestamp = Date.now()
    const counter = this.feedbackList.length + 1
    const id = `FB-2026-${String(counter).padStart(3, '0')}`
    const entry: FeedbackEntry = {
      id,
      userType: determinedUserType,
      rating: input.rating ? Math.round(input.rating) : undefined,
      category: input.category,
      name: authoritativeName,
      studentId: authoritativeStudentId,
      department: authoritativeDepartment,
      comments: cleanComments || undefined,
      status: 'pending',
      createdAt: new Date().toISOString(),
      isDemo: true,
    }

    this.feedbackList = [entry, ...this.feedbackList]
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify(this.feedbackList))
      } catch {
        // ignore
      }
    }
    this.notify()

    return makeThenable({ success: true, entry })
  }

  /**
   * Only ADMIN can retrieve all visitor and student feedback submissions.
   * Visitors and Students cannot read other people's feedback submissions.
   */
  public getAllFeedback(role: UserRole): FeedbackEntry[] {
    // If authenticated as non-admin, block immediately
    if (authService.isAuthenticated() && authService.getRole() !== 'admin') {
      return []
    }
    if (role !== 'admin') {
      return []
    }
    if (isSupabaseConfigured && supabase) {
      // Trigger background sync for admin
      this.fetchFromSupabase(role)
    }
    return [...this.feedbackList]
  }

  /**
   * Students can view only their own feedback submissions.
   * Strictly prevents cross-student access to private feedback.
   * CRITICAL PRIVACY: adminNotes are strictly omitted for non-admins.
   */
  public getStudentFeedback(studentId: string | undefined, role: UserRole): FeedbackEntry[] {
    if (role !== 'student' && role !== 'admin') {
      return []
    }
    if (!studentId && role !== 'admin') {
      return []
    }

    // Cross-student access prevention:
    // If authenticated as a student, reject queries for other student IDs
    if (role === 'student' && authService.isAuthenticated()) {
      const currentUser = authService.getUser()
      const sessionStudentId = currentUser?.studentId || currentUser?.id
      if (sessionStudentId && studentId !== sessionStudentId && studentId !== currentUser?.name) {
        return [] // Blocked: cannot inspect peer student feedback
      }
    }

    const entries = this.feedbackList.filter(
      (entry) =>
        entry.userType === 'student' &&
        (entry.studentId === studentId || entry.name === studentId || role === 'admin')
    )

    // CRITICAL PRIVACY: Ordinary students must NEVER see administrative internal notes
    if (role !== 'admin') {
      return entries.map((entry) => {
        const { adminNotes: _notes, ...sanitized } = entry
        return sanitized as FeedbackEntry
      })
    }

    return entries
  }

  /**
   * Admin-only update of review status and internal notes.
   * Denies attempts by non-admins or forged student tokens.
   */
  public updateFeedbackReview(
    feedbackId: string,
    status: FeedbackReviewStatus,
    adminNotes: string | undefined,
    role: UserRole
  ): { success: boolean; error?: string } {
    if (role !== 'admin') {
      return { success: false, error: 'Unauthorized: Administrator access required.' }
    }
    if (authService.isAuthenticated() && authService.getRole() !== 'admin') {
      return { success: false, error: 'Unauthorized: Administrator access required.' }
    }

    const idx = this.feedbackList.findIndex((item) => item.id === feedbackId)
    if (idx === -1) {
      return { success: false, error: 'Feedback entry not found.' }
    }

    const updated: FeedbackEntry = {
      ...this.feedbackList[idx],
      status,
      adminNotes: adminNotes?.trim() || undefined,
      reviewedAt: new Date().toISOString(),
    }

    this.feedbackList[idx] = updated

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify(this.feedbackList))
      } catch {
        // ignore
      }
    }

    return { success: true }
  }

  public getFeedbackStats(role: UserRole): FeedbackStats | null {
    if (authService.isAuthenticated() && authService.getRole() !== 'admin') {
      return null
    }
    if (role !== 'admin') {
      return null
    }

    const totalCount = this.feedbackList.length
    if (totalCount === 0) {
      return {
        totalCount: 0,
        averageRating: 0,
        ratingCounts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        categoryCounts: {} as Record<string, number>,
        byUserType: { visitor: 0, student: 0 },
        byStatus: { pending: 0, reviewed: 0, addressed: 0 },
      }
    }

    const ratingCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    const categoryCounts: Record<string, number> = {}
    const byUserType = { visitor: 0, student: 0 }
    const byStatus = { pending: 0, reviewed: 0, addressed: 0 }
    let totalScore = 0
    let ratedCount = 0

    for (const item of this.feedbackList) {
      if (item.rating && item.rating >= 1 && item.rating <= 5) {
        totalScore += item.rating
        ratedCount++
        ratingCounts[item.rating] = (ratingCounts[item.rating] || 0) + 1
      }
      categoryCounts[item.category] = (categoryCounts[item.category] || 0) + 1
      if (item.userType === 'student') {
        byUserType.student++
      } else {
        byUserType.visitor++
      }

      if (item.status === 'reviewed') {
        byStatus.reviewed++
      } else if (item.status === 'addressed') {
        byStatus.addressed++
      } else {
        byStatus.pending++
      }
    }

    return {
      totalCount,
      averageRating: ratedCount > 0 ? parseFloat((totalScore / ratedCount).toFixed(1)) : 0,
      ratingCounts,
      categoryCounts,
      byUserType,
      byStatus,
    }
  }
}

export const feedbackService = new FeedbackService()
