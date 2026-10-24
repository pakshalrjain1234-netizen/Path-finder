export const FEEDBACK_CATEGORIES = [
  'Campus 3D experience',
  'Navigation experience',
  'Campus information',
  'Website usability',
  'General suggestion',
] as const

export type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number]

export interface VisitorFeedbackEntry {
  id: string
  rating: number // 1 to 5
  category: FeedbackCategory
  name?: string
  comments?: string
  createdAt: string
  isDemo?: boolean
}

export interface FeedbackSubmissionInput {
  rating: number
  category: FeedbackCategory
  name?: string
  comments?: string
}

export interface FeedbackStats {
  totalCount: number
  averageRating: number
  ratingCounts: Record<number, number>
  categoryCounts: Record<FeedbackCategory, number>
}
