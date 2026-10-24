import { AlertCircle, CheckCircle2, MessageSquare, Send, Star, X } from 'lucide-react'
import { useState } from 'react'
import { feedbackService } from '../services/feedbackService'
import type { FeedbackCategory } from '../types/feedback'

interface VisitorFeedbackModalProps {
  isOpen: boolean
  onClose: () => void
}

const CATEGORIES: FeedbackCategory[] = [
  'Campus 3D experience',
  'Navigation experience',
  'Campus information',
  'Website usability',
  'General suggestion',
]

export function VisitorFeedbackModal({ isOpen, onClose }: VisitorFeedbackModalProps) {
  const [rating, setRating] = useState<number>(5)
  const [hoverRating, setHoverRating] = useState<number | null>(null)
  const [category, setCategory] = useState<FeedbackCategory>('Campus 3D experience')
  const [name, setName] = useState('')
  const [comments, setComments] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isCloudPersisted, setIsCloudPersisted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (rating < 1 || rating > 5) {
      setError('Please select a star rating.')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await feedbackService.submitFeedback({
        rating,
        category,
        name: name.trim() || undefined,
        comments: comments.trim() || undefined,
      })

      if (res.success) {
        setIsCloudPersisted(!res.entry?.isDemo)
        setIsSubmitted(true)
      } else {
        setError(res.error || 'Failed to submit feedback. Please try again.')
      }
    } catch {
      setError('An unexpected error occurred.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleResetAndClose = () => {
    setIsSubmitted(false)
    setName('')
    setComments('')
    setRating(5)
    setError(null)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[9999] isolate flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-3xl border border-white/10 bg-[#0B1424] p-6 md:p-8 text-white shadow-2xl">
        {/* Close Button */}
        <button
          type="button"
          onClick={handleResetAndClose}
          className="absolute right-4 top-4 rounded-xl p-2 text-slate-400 hover:bg-white/10 hover:text-white transition"
          aria-label="Close Feedback Modal"
        >
          <X size={20} />
        </button>

        {isSubmitted ? (
          <div className="flex flex-col items-center text-center py-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400 mb-4 border border-emerald-500/30">
              <CheckCircle2 size={36} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Thank You for Your Feedback!</h3>
            <p className="text-xs text-slate-300 max-w-sm leading-relaxed mb-6">
              Your response has been recorded. Your insights help the MNMJEC web team enhance 3D visualization,
              walkway routing, and visitor information.
            </p>
            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-[11px] text-slate-400 mb-6">
              {isCloudPersisted
                ? 'Persisted to Supabase Database • Visitor Feedback Queue'
                : 'Evaluation Demo Mode • Stored locally in prototype session'}
            </div>
            <button
              type="button"
              onClick={handleResetAndClose}
              className="rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-6 py-2.5 text-xs font-bold text-white hover:opacity-90 transition shadow-lg shadow-blue-600/30"
            >
              Back to Campus
            </button>
          </div>
        ) : (
          <div>
            {/* Header */}
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 text-white shadow-md">
                <MessageSquare size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Share Your Experience</h2>
                <p className="text-xs text-slate-400">Help us improve the campus navigation experience.</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              {/* Star Rating */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  How was your PATH FINDER experience?
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(null)}
                      onClick={() => setRating(star)}
                      className="p-1 text-slate-600 hover:scale-110 transition-transform"
                      aria-label={`Rate ${star} star`}
                    >
                      <Star
                        size={28}
                        className={`${
                          (hoverRating !== null ? star <= hoverRating : star <= rating)
                            ? 'fill-amber-400 text-amber-400'
                            : 'fill-transparent text-slate-600'
                        } transition-colors`}
                      />
                    </button>
                  ))}
                  <span className="ml-2 text-xs font-bold text-amber-400">
                    {hoverRating !== null ? `${hoverRating} Stars` : `${rating} Stars`}
                  </span>
                </div>
              </div>

              {/* Feedback Category */}
              <div>
                <label htmlFor="feedback-category" className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Category
                </label>
                <select
                  id="feedback-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as FeedbackCategory)}
                  className="w-full rounded-xl border border-white/10 bg-[#0F172A] px-3 py-2 text-xs text-white focus:border-cyan-400 focus:outline-none"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Optional Name */}
              <div>
                <label htmlFor="feedback-name" className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Your Name <span className="text-slate-500 font-normal">(Optional — can remain anonymous)</span>
                </label>
                <input
                  id="feedback-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. S. Ramanathan / Prospective Student"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
                />
              </div>

              {/* Comments */}
              <div>
                <label htmlFor="feedback-comments" className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Comments & Suggestions <span className="text-slate-500 font-normal">(Optional)</span>
                </label>
                <textarea
                  id="feedback-comments"
                  rows={3}
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="Tell us what you liked or what could be improved..."
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none resize-none"
                />
              </div>

              {error && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-950/40 p-3 text-xs text-amber-200 leading-relaxed flex items-start gap-2.5">
                  <AlertCircle size={16} className="text-amber-400 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Notice */}
              <div className="text-[11px] text-slate-400 leading-relaxed">
                Note: This form is for website and visitor navigation feedback. To report campus maintenance
                problems, sign in with a Student account.
              </div>

              {/* Submit Button */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleResetAndClose}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 px-5 py-2 text-xs font-bold text-white hover:opacity-90 transition shadow-lg shadow-cyan-600/30 disabled:opacity-50"
                >
                  <Send size={14} />
                  <span>{isSubmitting ? 'Submitting...' : 'Submit Feedback'}</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
