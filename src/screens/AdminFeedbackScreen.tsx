import {
  Calendar,
  Filter,
  MessageSquare,
  ShieldCheck,
  Star,
  User,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { feedbackService } from '../services/feedbackService'
import type { FeedbackCategory, VisitorFeedbackEntry } from '../types/feedback'

const CATEGORIES: FeedbackCategory[] = [
  'Campus 3D experience',
  'Navigation experience',
  'Campus information',
  'Website usability',
  'General suggestion',
]

export function AdminFeedbackScreen() {
  const { role } = useAuth()
  const [feedbackList, setFeedbackList] = useState<VisitorFeedbackEntry[]>([])
  const [filterRating, setFilterRating] = useState<string>('All')
  const [filterCategory, setFilterCategory] = useState<string>('All')

  const reload = () => {
    const list = feedbackService.getAllFeedback(role)
    setFeedbackList(list)
  }

  useEffect(() => {
    reload()
    const unsubscribe = feedbackService.onChange(() => reload())
    return () => unsubscribe()
  }, [role])

  const stats = useMemo(() => feedbackService.getFeedbackStats(role), [feedbackList, role])

  const filteredList = useMemo(() => {
    return feedbackList.filter((item) => {
      if (filterRating !== 'All' && item.rating !== parseInt(filterRating, 10)) return false
      if (filterCategory !== 'All' && item.category !== filterCategory) return false
      return true
    })
  }, [feedbackList, filterRating, filterCategory])

  return (
    <div className="min-h-screen bg-[#101827] text-[#F1F5F9] p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#293A50] pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#60A5FA] mb-1">
            <span className="rounded-md bg-[#162235] px-2 py-0.5 border border-[#293A50] text-[10px] uppercase font-bold tracking-wider text-[#60A5FA]">
              Administration Review
            </span>
            <span className="text-[#94A3B8]">MNM Jain Engineering College</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-[#F1F5F9] tracking-tight flex items-center gap-2.5">
            <MessageSquare className="text-[#60A5FA]" size={28} />
            Visitor Feedback Management
          </h1>
          <p className="text-xs text-[#94A3B8] mt-1">
            Review ratings, feedback, and user experience impressions submitted by campus visitors and guests.
          </p>
        </div>

        <div className="rounded-xl border border-[#293A50] bg-[#162235] px-3.5 py-2 text-xs flex items-center gap-2 text-[#94A3B8]">
          <ShieldCheck size={16} className="text-[#60A5FA]" />
          <span>Private Administrator Console • Visitor entries confidential</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto space-y-6">
        {/* KPI Metrics */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-[#293A50] bg-[#192638] p-5 shadow-lg">
              <div className="text-xs font-semibold text-[#94A3B8]">Total Submissions</div>
              <div className="text-3xl font-extrabold text-[#F1F5F9] mt-1">{stats.totalCount}</div>
              <div className="text-[11px] text-[#94A3B8]/70 mt-1">Recorded responses</div>
            </div>

            <div className="rounded-2xl border border-amber-500/30 bg-[#192638] p-5 shadow-lg">
              <div className="text-xs font-semibold text-amber-300">Average Rating</div>
              <div className="text-3xl font-extrabold text-amber-400 mt-1 flex items-center gap-2">
                <span>{stats.averageRating}</span>
                <div className="flex text-amber-400">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      size={16}
                      className={s <= Math.round(stats.averageRating) ? 'fill-amber-400' : 'text-slate-600'}
                    />
                  ))}
                </div>
              </div>
              <div className="text-[11px] text-amber-400/70 mt-1">Out of 5.0 scale</div>
            </div>

            <div className="rounded-2xl border border-[#293A50] bg-[#192638] p-5 shadow-lg md:col-span-2">
              <div className="text-xs font-semibold text-[#60A5FA] mb-2">Rating Distribution</div>
              <div className="grid grid-cols-5 gap-2 text-center text-xs">
                {[5, 4, 3, 2, 1].map((r) => (
                  <div key={r} className="rounded-xl border border-[#293A50] bg-[#162235] p-2">
                    <div className="font-bold text-[#F1F5F9]">{r} ★</div>
                    <div className="text-[#60A5FA] font-mono text-sm mt-0.5">
                      {stats.ratingCounts[r] || 0}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="rounded-2xl border border-[#293A50] bg-[#192638] p-4 shadow-xl flex flex-col md:flex-row items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-[#94A3B8]">
            <Filter size={15} className="text-[#60A5FA]" />
            <span>Filter Entries:</span>
          </div>

          <select
            value={filterRating}
            onChange={(e) => setFilterRating(e.target.value)}
            className="rounded-xl border border-[#293A50] bg-[#162235] px-3 py-2 text-xs text-[#F1F5F9] focus:outline-none cursor-pointer"
          >
            <option value="All" className="bg-[#162235] text-[#F1F5F9]">All Ratings (1 - 5 Stars)</option>
            {[5, 4, 3, 2, 1].map((s) => (
              <option key={s} value={String(s)} className="bg-[#162235] text-[#F1F5F9]">
                {s} Stars Only
              </option>
            ))}
          </select>

          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="rounded-xl border border-[#293A50] bg-[#162235] px-3 py-2 text-xs text-[#F1F5F9] focus:outline-none cursor-pointer"
          >
            <option value="All" className="bg-[#162235] text-[#F1F5F9]">All Categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c} className="bg-[#162235] text-[#F1F5F9]">
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Feedback List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredList.length === 0 ? (
            <div className="md:col-span-2 rounded-2xl border border-[#293A50] bg-[#192638] p-12 text-center text-[#94A3B8] text-xs">
              No visitor feedback entries match your filter.
            </div>
          ) : (
            filteredList.map((entry) => (
              <div
                key={entry.id}
                className="rounded-2xl border border-[#293A50] bg-[#192638] p-5 shadow-lg space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        size={14}
                        className={s <= entry.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-600'}
                      />
                    ))}
                    <span className="ml-1 text-xs font-bold text-amber-400">{entry.rating}.0</span>
                  </div>
                  <span className="rounded-full bg-[#162235] border border-[#293A50] px-2.5 py-0.5 text-[10px] font-bold text-[#60A5FA]">
                    {entry.category}
                  </span>
                </div>

                {entry.comments ? (
                  <p className="text-xs text-[#F1F5F9] leading-relaxed italic bg-[#162235] p-3 rounded-xl border border-[#293A50]">
                    "{entry.comments}"
                  </p>
                ) : (
                  <div className="text-[11px] text-[#94A3B8] italic">No written comment provided.</div>
                )}

                <div className="flex items-center justify-between text-[11px] text-[#94A3B8] pt-1 border-t border-[#293A50]">
                  <span className="flex items-center gap-1 text-[#F1F5F9] font-medium">
                    <User size={12} className="text-[#94A3B8]" />
                    {entry.name || 'Anonymous Visitor'}
                  </span>
                  <span className="flex items-center gap-1 text-[#94A3B8]">
                    <Calendar size={11} />
                    {new Date(entry.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
