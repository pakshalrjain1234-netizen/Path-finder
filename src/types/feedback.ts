// ==============================================================================
// PATH FINDER — FEEDBACK CENTER DATA TYPES (Phase 9D.1)
// Unified feedback contracts for Visitors, Students, and Administrators
// ==============================================================================

// Legacy feedback categories (retained for backward compatibility and test conformance)
export const FEEDBACK_CATEGORIES = [
  'Campus 3D experience',
  'Navigation experience',
  'Campus information',
  'Website usability',
  'General suggestion',
] as const

export type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number]

// Visitor Feedback Categories (Mandated in Phase 9D.1 Feature 2)
export const VISITOR_FEEDBACK_CATEGORIES = [
  'Campus visit experience',
  '3D virtual tour experience',
  'Clarity of college information',
  'General suggestions',
] as const

export type VisitorFeedbackCategory = (typeof VISITOR_FEEDBACK_CATEGORIES)[number]

// Student Feedback Categories (Mandated in Phase 9D.1 Feature 3)
export const STUDENT_FEEDBACK_CATEGORIES = [
  'Campus facilities',
  'Campus navigation experience',
  'Student services',
  'Suggestions for improvement',
] as const

export type StudentFeedbackCategory = (typeof STUDENT_FEEDBACK_CATEGORIES)[number]

export type UnifiedFeedbackCategory =
  | FeedbackCategory
  | VisitorFeedbackCategory
  | StudentFeedbackCategory

export type FeedbackUserType = 'visitor' | 'student'

export type FeedbackReviewStatus = 'pending' | 'reviewed' | 'addressed'

export interface FeedbackEntry {
  id: string
  userType: FeedbackUserType
  category: UnifiedFeedbackCategory
  rating?: number // 1 to 5 (optional)
  comments?: string
  name?: string
  studentId?: string
  department?: string
  status: FeedbackReviewStatus
  adminNotes?: string
  reviewedAt?: string
  createdAt: string
  isDemo?: boolean
}

// Backward-compatible alias for existing components
export type VisitorFeedbackEntry = FeedbackEntry

export interface FeedbackSubmissionInput {
  userType?: FeedbackUserType
  category: UnifiedFeedbackCategory
  rating?: number // 1 to 5 (optional)
  comments?: string
  name?: string
  studentId?: string
  department?: string
}

export interface FeedbackStats {
  totalCount: number
  averageRating: number
  ratingCounts: Record<number, number>
  categoryCounts: Record<string, number>
  byUserType: {
    visitor: number
    student: number
  }
  byStatus: {
    pending: number
    reviewed: number
    addressed: number
  }
}
