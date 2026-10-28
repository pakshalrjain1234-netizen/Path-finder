import {
  Calendar,
  CheckCircle2,
  MessageSquare,
  Search,
  ShieldCheck,
  Star,
  User,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.tsx'
import { feedbackService } from '../services/feedbackService.ts'
import type { FeedbackEntry, FeedbackReviewStatus } from '../types/feedback.ts'

export function AdminFeedbackScreen() {
  const { role } = useAuth()
  const [feedbackList, setFeedbackList] = useState<FeedbackEntry[]>([])
  const [filterRating, setFilterRating] = useState<string>('All')
  const [filterStatus, setFilterStatus] = useState<string>('All')
  const [filterCategory, setFilterCategory] = useState<string>('All')
  const [filterUserType, setFilterUserType] = useState<string>('All')
  const [searchTerm, setSearchTerm] = useState('')

  // Review modal state
  const [selectedEntry, setSelectedEntry] = useState<FeedbackEntry | null>(null)
  const [reviewStatus, setReviewStatus] = useState<FeedbackReviewStatus>('pending')
  const [reviewNotes, setReviewNotes] = useState('')
  const [isSavingReview, setIsSavingReview] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)

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

  const availableCategories = useMemo(() => {
    const set = new Set<string>()
    feedbackList.forEach((item) => set.add(item.category))
    return Array.from(set)
  }, [feedbackList])

  const filteredList = useMemo(() => {
    return feedbackList.filter((item) => {
      if (filterUserType !== 'All' && item.userType !== filterUserType) return false
      if (filterStatus !== 'All' && item.status !== filterStatus) return false
      if (filterRating !== 'All') {
        if (filterRating === 'Unrated') {
          if (item.rating !== undefined && item.rating !== null) return false
        } else if (item.rating !== parseInt(filterRating, 10)) {
          return false
        }
      }
      if (filterCategory !== 'All' && item.category !== filterCategory) return false
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase()
        const matchComments = item.comments?.toLowerCase().includes(q)
        const matchCategory = item.category.toLowerCase().includes(q)
        const matchName = item.name?.toLowerCase().includes(q)
        if (!matchComments && !matchCategory && !matchName) return false
      }
      return true
    })
  }, [feedbackList, filterUserType, filterStatus, filterRating, filterCategory, searchTerm])

  const handleOpenReview = (entry: FeedbackEntry) => {
    setSelectedEntry(entry)
    setReviewStatus(entry.status)
    setReviewNotes(entry.adminNotes || '')
    setSaveMessage(null)
  }

  const handleSaveReview = () => {
    if (!selectedEntry || role !== 'admin') return
    setIsSavingReview(true)
    const res = feedbackService.updateFeedbackReview(
      selectedEntry.id,
      reviewStatus,
      reviewNotes,
      'admin'
    )
    setIsSavingReview(false)

    if (res.success) {
      setSaveMessage('Review status updated successfully.')
      reload()
      setTimeout(() => {
        setSelectedEntry(null)
        setSaveMessage(null)
      }, 800)
    }
  }

  return (
    <div className="min-h-screen bg-[#E8DDF2] text-[#352A47] p-4 md:p-6 lg:p-8 pb-24 md:pb-12 font-sans">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#352A47]/10 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-heading font-semibold text-[#51465F] mb-1">
            <span className="rounded-md bg-[#D2BEE7]/60 px-2 py-0.5 border border-[#352A47]/15 text-[10px] font-heading uppercase font-bold tracking-wider text-[#352A47]">
              Administration Review
            </span>
            <span className="text-[#51465F]">MNM Jain Engineering College</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-editorial font-medium text-[#352A47] tracking-tight flex items-center gap-2.5">
            <MessageSquare className="text-[#825A9E]" size={28} />
            <span>Unified Feedback <em className="italic font-normal">Console</em></span>
          </h1>
          <p className="text-xs font-sans text-[#51465F] mt-1">
            Review user experience submissions, facilities suggestions, and 3D navigation feedback submitted by campus visitors and enrolled students.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/feedback"
            className="rounded-xl border border-[#352A47]/15 bg-white hover:bg-[#FAF8FC] px-3.5 py-2 text-xs font-heading font-bold text-[#352A47] transition shadow-sm"
          >
            <span>Feedback Center Form</span>
          </Link>
          <div className="rounded-xl border border-[#352A47]/10 bg-[#D2BEE7]/40 px-3.5 py-2 text-xs flex items-center gap-2 text-[#51465F] font-heading font-medium">
            <ShieldCheck size={16} className="text-[#825A9E]" />
            <span>Private Admin Console</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto space-y-6">
        {/* KPI Metrics */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-[#352A47]/10 bg-[#FAF8FC] p-5 shadow-sm">
              <div className="text-xs font-heading font-semibold text-[#51465F]">Total Submissions</div>
              <div className="text-3xl font-editorial font-medium text-[#352A47] mt-1">{stats.totalCount}</div>
              <div className="text-[11px] text-[#8C7E9C] mt-1">
                {stats.byUserType.visitor} Visitors • {stats.byUserType.student} Students
              </div>
            </div>

            <div className="rounded-2xl border border-amber-300/40 bg-amber-50/60 p-5 shadow-sm">
              <div className="text-xs font-heading font-semibold text-amber-900">Average Rating</div>
              <div className="text-3xl font-editorial font-medium text-amber-800 mt-1 flex items-center gap-2">
                <span>{stats.averageRating}</span>
                <div className="flex text-amber-500">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      size={16}
                      className={s <= Math.round(stats.averageRating) ? 'fill-amber-500' : 'text-slate-300'}
                    />
                  ))}
                </div>
              </div>
              <div className="text-[11px] text-amber-700/80 mt-1">Out of 5.0 scale</div>
            </div>

            <div className="rounded-2xl border border-[#E8C8B9] bg-[#FAF2ED] p-5 shadow-sm">
              <div className="text-xs font-heading font-semibold text-[#8C5E47]">Pending Review</div>
              <div className="text-3xl font-editorial font-medium text-[#6B422F] mt-1">
                {stats.byStatus.pending}
              </div>
              <div className="text-[11px] text-[#A67E6A] mt-1">Awaiting staff action</div>
            </div>

            <div className="rounded-2xl border border-emerald-300/40 bg-emerald-50/60 p-5 shadow-sm">
              <div className="text-xs font-heading font-semibold text-emerald-900">Addressed &amp; Closed</div>
              <div className="text-3xl font-editorial font-medium text-emerald-800 mt-1">
                {stats.byStatus.addressed}
              </div>
              <div className="text-[11px] text-emerald-700/80 mt-1">
                {stats.byStatus.reviewed} reviewed
              </div>
            </div>
          </div>
        )}

        {/* Filters Toolbar */}
        <div className="rounded-2xl border border-[#352A47]/10 bg-[#FAF8FC] p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search */}
            <div className="relative min-w-[200px]">
              <Search size={14} className="absolute left-3 top-2.5 text-[#8C7E9C]" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search comments or name..."
                className="w-full rounded-xl border border-[#352A47]/15 bg-white pl-8 pr-3 py-1.5 text-xs text-[#352A47] placeholder-[#8C7E9C] focus:outline-none shadow-sm"
              />
            </div>

            {/* Filter by Role */}
            <select
              value={filterUserType}
              onChange={(e) => setFilterUserType(e.target.value)}
              className="rounded-xl border border-[#352A47]/15 bg-white px-3 py-1.5 text-xs text-[#352A47] focus:outline-none cursor-pointer shadow-sm"
              aria-label="Filter by submitter role"
            >
              <option value="All">All Roles (Visitors &amp; Students)</option>
              <option value="visitor">Visitors Only</option>
              <option value="student">Students Only</option>
            </select>

            {/* Filter by Status */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="rounded-xl border border-[#352A47]/15 bg-white px-3 py-1.5 text-xs text-[#352A47] focus:outline-none cursor-pointer shadow-sm"
              aria-label="Filter by review status"
            >
              <option value="All">All Review Statuses</option>
              <option value="pending">Pending</option>
              <option value="reviewed">Reviewed</option>
              <option value="addressed">Addressed</option>
            </select>

            {/* Filter by Rating */}
            <select
              value={filterRating}
              onChange={(e) => setFilterRating(e.target.value)}
              className="rounded-xl border border-[#352A47]/15 bg-white px-3 py-1.5 text-xs text-[#352A47] focus:outline-none cursor-pointer shadow-sm"
              aria-label="Filter by rating"
            >
              <option value="All">All Ratings</option>
              <option value="5">5 Stars</option>
              <option value="4">4 Stars</option>
              <option value="3">3 Stars</option>
              <option value="2">2 Stars</option>
              <option value="1">1 Star</option>
              <option value="Unrated">Unrated Only</option>
            </select>

            {/* Filter by Category */}
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="rounded-xl border border-[#352A47]/15 bg-white px-3 py-1.5 text-xs text-[#352A47] focus:outline-none cursor-pointer max-w-[200px] shadow-sm"
              aria-label="Filter by category"
            >
              <option value="All">All Categories</option>
              {availableCategories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => {
              setFilterUserType('All')
              setFilterStatus('All')
              setFilterRating('All')
              setFilterCategory('All')
              setSearchTerm('')
            }}
            className="text-xs font-heading font-bold text-[#825A9E] hover:underline cursor-pointer"
          >
            Reset Filters
          </button>
        </div>

        {/* Feedback List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredList.length === 0 ? (
            <div className="md:col-span-2 rounded-2xl border border-[#352A47]/10 bg-[#FAF8FC] p-12 text-center text-[#51465F] text-xs">
              No feedback entries match your filter.
            </div>
          ) : (
            filteredList.map((entry) => (
              <div
                key={entry.id}
                className="rounded-2xl border border-[#352A47]/10 bg-[#FAF8FC] p-5 shadow-sm flex flex-col justify-between space-y-3.5 hover:border-[#825A9E]/40 transition"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      {entry.rating ? (
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              size={14}
                              className={
                                s <= (entry.rating || 0)
                                  ? 'fill-amber-500 text-amber-500'
                                  : 'text-slate-300'
                              }
                            />
                          ))}
                          <span className="ml-1 text-xs font-heading font-bold text-amber-700">{entry.rating}.0</span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-[#8C7E9C] italic">Unrated</span>
                      )}

                      <span
                        className={`rounded-full px-2 py-0.5 text-[9px] font-heading font-bold uppercase tracking-wider border ${
                          entry.userType === 'student'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : 'bg-[#D2BEE7]/60 text-[#352A47] border-[#352A47]/15'
                        }`}
                      >
                        {entry.userType}
                      </span>
                    </div>

                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-heading font-bold border ${
                        entry.status === 'addressed'
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : entry.status === 'reviewed'
                            ? 'bg-[#C6DCE4] text-[#2C5766] border-[#2C5766]/20'
                            : 'bg-[#FAF2ED] text-[#8C5E47] border-[#E8C8B9]'
                      }`}
                    >
                      {entry.status.toUpperCase()}
                    </span>
                  </div>

                  <div className="mt-2 text-xs font-heading font-bold text-[#352A47] flex items-center gap-1.5">
                    <span className="text-[#825A9E]">•</span>
                    <span>{entry.category}</span>
                  </div>

                  {entry.comments ? (
                    <p className="mt-2 text-xs text-[#352A47] leading-relaxed italic bg-[#E8DDF2]/40 p-3 rounded-xl border border-[#352A47]/10 font-sans">
                      &ldquo;{entry.comments}&rdquo;
                    </p>
                  ) : (
                    <div className="mt-2 text-[11px] text-[#8C7E9C] italic">No written comment provided.</div>
                  )}

                  {entry.adminNotes && (
                    <div className="mt-2.5 rounded-xl border border-[#E8C8B9] bg-[#FAF2ED] p-2.5 text-xs text-[#352A47]">
                      <span className="font-heading font-bold text-[10px] uppercase text-[#8C5E47] block mb-0.5">
                        Internal Staff Note:
                      </span>
                      <p className="text-[11px] text-[#51465F]">{entry.adminNotes}</p>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between text-[11px] text-[#51465F] pt-2 border-t border-[#352A47]/10">
                  <div>
                    <span className="flex items-center gap-1 text-[#352A47] font-medium">
                      <User size={12} className="text-[#8C7E9C]" />
                      <span>{entry.name || 'Anonymous Submitter'}</span>
                      {entry.studentId && (
                        <span className="text-[10px] text-[#8C7E9C]">
                          ({entry.studentId.slice(0, 6)}****)
                        </span>
                      )}
                    </span>
                    <span className="flex items-center gap-1 text-[#8C7E9C] mt-0.5">
                      <Calendar size={11} />
                      <span>{new Date(entry.createdAt).toLocaleDateString()}</span>
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOpenReview(entry)}
                    className="rounded-xl border border-[#352A47]/15 bg-white hover:bg-[#FAF8FC] text-[#352A47] px-3 py-1.5 text-xs font-heading font-bold shadow-sm transition cursor-pointer"
                  >
                    Review / Notes
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Review Modal */}
      {selectedEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#352A47]/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg rounded-2xl border border-[#352A47]/15 bg-[#FAF8FC] p-6 text-[#352A47] shadow-2xl">
            <button
              type="button"
              onClick={() => setSelectedEntry(null)}
              className="absolute right-4 top-4 rounded-xl p-1.5 text-[#51465F] hover:bg-[#E8DDF2] hover:text-[#352A47]"
            >
              <X size={18} />
            </button>

            <h3 className="text-base font-editorial font-medium text-[#352A47] mb-1 flex items-center gap-2">
              <ShieldCheck size={18} className="text-[#825A9E]" />
              <span>Review Feedback Submission</span>
            </h3>
            <p className="text-xs text-[#51465F] mb-4">
              ID: {selectedEntry.id} • {selectedEntry.category}
            </p>

            {saveMessage && (
              <div className="mb-4 rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-xs text-emerald-800 flex items-center gap-2">
                <CheckCircle2 size={15} />
                <span>{saveMessage}</span>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-heading font-bold uppercase tracking-wider text-[#51465F] mb-1.5">
                  Update Review Status
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['pending', 'reviewed', 'addressed'] as FeedbackReviewStatus[]).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setReviewStatus(st)}
                      className={`rounded-xl py-2 px-3 text-xs font-heading font-bold uppercase transition cursor-pointer border ${
                        reviewStatus === st
                          ? 'bg-[#352A47] text-[#FAF8FC] border-[#352A47] shadow-sm'
                          : 'bg-white text-[#51465F] border-[#352A47]/15'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-heading font-bold uppercase tracking-wider text-[#51465F] mb-1.5">
                  Internal Staff Resolution Note
                </label>
                <textarea
                  rows={3}
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Record internal resolution notes, team assignments, or follow-up status..."
                  className="w-full rounded-xl border border-[#352A47]/15 bg-white p-3 text-xs text-[#352A47] placeholder-[#8C7E9C] focus:outline-none focus:ring-1 focus:ring-[#825A9E]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#352A47]/10">
                <button
                  type="button"
                  onClick={() => setSelectedEntry(null)}
                  className="rounded-xl border border-[#352A47]/15 bg-white hover:bg-[#FAF8FC] px-4 py-2 text-xs font-heading font-semibold text-[#51465F] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSavingReview}
                  onClick={handleSaveReview}
                  className="rounded-xl bg-[#352A47] hover:bg-[#231A32] px-4 py-2 text-xs font-heading font-bold text-[#FAF8FC] shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {isSavingReview ? 'Saving...' : 'Save Review'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
