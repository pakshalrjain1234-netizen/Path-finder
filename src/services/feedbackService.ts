import { isSupabaseConfigured, supabase } from '../lib/supabaseClient.ts'
import type { UserRole } from '../types/auth'
import type {
  FeedbackCategory,
  FeedbackStats,
  FeedbackSubmissionInput,
  VisitorFeedbackEntry,
} from '../types/feedback'

const FEEDBACK_STORAGE_KEY = 'pathfinder_visitor_feedback'

const SEED_FEEDBACK: VisitorFeedbackEntry[] = [
  {
    id: 'FB-2026-001',
    rating: 5,
    category: 'Campus 3D experience',
    name: 'Suresh Kumar (Alumnus)',
    comments: 'The 3D campus model looks remarkably authentic. The Stage E3 geometry captures the college environment accurately.',
    createdAt: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
    isDemo: true,
  },
  {
    id: 'FB-2026-002',
    rating: 5,
    category: 'Navigation experience',
    name: 'Priya Narayanan (Prospective Parent)',
    comments: 'Walkway navigation made it easy to locate the Admissions office in Main Block without confusion.',
    createdAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    isDemo: true,
  },
  {
    id: 'FB-2026-003',
    rating: 4,
    category: 'Website usability',
    name: 'Vikram Chandran',
    comments: 'The cinematic tour with automatic progression and natural voice narration was very informative and smooth.',
    createdAt: new Date(Date.now() - 10 * 3600 * 1000).toISOString(),
    isDemo: true,
  },
]

function makeThenable<T extends object>(res: T): Promise<T> & T {
  const p = Promise.resolve(res)
  return Object.assign(p, res)
}

class FeedbackService {
  private feedbackList: VisitorFeedbackEntry[] = []
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
          this.feedbackList = JSON.parse(stored)
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
    this.listeners.forEach((l) => l())
  }

  public async fetchFromSupabase(role: UserRole): Promise<VisitorFeedbackEntry[]> {
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
          rating: item.rating,
          category: item.category as FeedbackCategory,
          name: item.name || undefined,
          comments: item.comments || undefined,
          createdAt: item.created_at,
          isDemo: false,
        }))
        this.notify()
      }
    } catch (e) {
      console.warn('Error fetching visitor feedback from Supabase:', e)
    }

    return this.feedbackList
  }

  public submitFeedback(
    input: FeedbackSubmissionInput
  ): Promise<{ success: boolean; entry?: VisitorFeedbackEntry; error?: string }> & {
    success: boolean
    entry?: VisitorFeedbackEntry
    error?: string
  } {
    if (!input.rating || input.rating < 1 || input.rating > 5) {
      return makeThenable({ success: false, error: 'Please select a star rating between 1 and 5.' })
    }
    if (!input.category) {
      return makeThenable({ success: false, error: 'Please select a feedback category.' })
    }

    // Client-side rate-limit throttle (15 seconds between submissions)
    const now = Date.now()
    if (this.lastSubmissionTimestamp > 0 && now - this.lastSubmissionTimestamp < 15000) {
      const waitSeconds = Math.ceil((15000 - (now - this.lastSubmissionTimestamp)) / 1000)
      return makeThenable({
        success: false,
        error: `Rate limit: Please wait ${waitSeconds}s before submitting additional feedback.`,
      })
    }

    // 1. Supabase-Backed Submission via submit-feedback Edge Function
    if (isSupabaseConfigured) {
      const env: any =
        (typeof import.meta !== 'undefined' && (import.meta as any).env) ||
        (typeof process !== 'undefined' && process.env) ||
        {}
      const baseUrl = env.VITE_SUPABASE_URL || 'https://lqqqrqajeqzdtvkfvrnp.supabase.co'
      const edgeFunctionUrl = `${baseUrl}/functions/v1/submit-feedback`

      const asyncOp = (async () => {
        try {
          const response = await fetch(edgeFunctionUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              rating: Math.round(input.rating),
              category: input.category,
              name: input.name?.trim() || undefined,
              comments: input.comments?.trim() || undefined,
            }),
          })

          if (!response.ok) {
            if (response.status === 404) {
              return {
                success: false,
                error:
                  "Visitor feedback submission is currently blocked: Supabase Edge Function 'submit-feedback' is not yet deployed on project lqqqrqajeqzdtvkfvrnp.",
              }
            }
            const errBody = await response.json().catch(() => ({}))
            return {
              success: false,
              error: errBody.error || `Feedback submission failed (HTTP ${response.status}).`,
            }
          }

          const resData = await response.json()
          const entry: VisitorFeedbackEntry = {
            id: resData.id || `FB-${Date.now()}`,
            rating: Math.round(input.rating),
            category: input.category,
            name: input.name?.trim() || undefined,
            comments: input.comments?.trim() || undefined,
            createdAt: new Date().toISOString(),
            isDemo: false,
          }

          this.lastSubmissionTimestamp = Date.now()
          return { success: true, entry }
        } catch (err: any) {
          return {
            success: false,
            error:
              "Visitor feedback submission is currently blocked: Supabase Edge Function 'submit-feedback' is not reachable.",
          }
        }
      })()

      return asyncOp as any
    }

    // 2. Offline / Local Demo Fallback Mode
    this.lastSubmissionTimestamp = Date.now()
    const counter = this.feedbackList.length + 1
    const id = `FB-2026-${String(counter).padStart(3, '0')}`
    const entry: VisitorFeedbackEntry = {
      id,
      rating: Math.round(input.rating),
      category: input.category,
      name: input.name?.trim() || undefined,
      comments: input.comments?.trim() || undefined,
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
   * Only ADMIN can retrieve all visitor feedback submissions.
   * Visitors and Students cannot read other people's feedback submissions.
   */
  public getAllFeedback(role: UserRole): VisitorFeedbackEntry[] {
    if (role !== 'admin') {
      return []
    }
    if (isSupabaseConfigured && supabase) {
      // Trigger background sync for admin
      this.fetchFromSupabase(role)
    }
    return [...this.feedbackList]
  }

  public getFeedbackStats(role: UserRole): FeedbackStats | null {
    if (role !== 'admin') {
      return null
    }

    const totalCount = this.feedbackList.length
    if (totalCount === 0) {
      return {
        totalCount: 0,
        averageRating: 0,
        ratingCounts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        categoryCounts: {} as Record<FeedbackCategory, number>,
      }
    }

    const ratingCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    const categoryCounts: Record<FeedbackCategory, number> = {} as any
    let totalScore = 0

    for (const item of this.feedbackList) {
      totalScore += item.rating
      ratingCounts[item.rating] = (ratingCounts[item.rating] || 0) + 1
      categoryCounts[item.category] = (categoryCounts[item.category] || 0) + 1
    }

    return {
      totalCount,
      averageRating: parseFloat((totalScore / totalCount).toFixed(1)),
      ratingCounts,
      categoryCounts,
    }
  }
}

export const feedbackService = new FeedbackService()
