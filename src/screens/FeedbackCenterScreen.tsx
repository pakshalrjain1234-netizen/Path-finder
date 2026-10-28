import {
  AlertCircle,
  Building,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  GraduationCap,
  Lock,
  MessageSquare,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Star,
  User,
  Wrench,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.tsx'
import { feedbackService } from '../services/feedbackService.ts'
import {
  STUDENT_FEEDBACK_CATEGORIES,
  VISITOR_FEEDBACK_CATEGORIES,
  type FeedbackEntry,
  type FeedbackReviewStatus,
  type FeedbackUserType,
  type UnifiedFeedbackCategory,
} from '../types/feedback.ts'

export function FeedbackCenterScreen() {
  const { user, role, isStudent, isAdmin } = useAuth()
  const [searchParams] = useSearchParams()

  // Tabs for Students: 'submit' | 'history'
  // Tabs for Admin: 'all' | 'visitor' | 'student'
  const activeTabParam = searchParams.get('tab') || (isAdmin ? 'all' : 'submit')
  const [activeTab, setActiveTab] = useState<string>(activeTabParam)

  // Form State
  const [category, setCategory] = useState<UnifiedFeedbackCategory>(
    isStudent ? STUDENT_FEEDBACK_CATEGORIES[0] : VISITOR_FEEDBACK_CATEGORIES[0]
  )
  const [rating, setRating] = useState<number | null>(5)
  const [hoverRating, setHoverRating] = useState<number | null>(null)
  const [comments, setComments] = useState('')
  const [visitorName, setVisitorName] = useState('')
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submittedEntry, setSubmittedEntry] = useState<FeedbackEntry | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Admin Dashboard State
  const [adminFeedbackList, setAdminFeedbackList] = useState<FeedbackEntry[]>([])
  const [filterRating, setFilterRating] = useState<string>('All')
  const [filterStatus, setFilterStatus] = useState<string>('All')
  const [filterCategory, setFilterCategory] = useState<string>('All')
  const [filterUserType, setFilterUserType] = useState<string>('All')
  const [searchTerm, setSearchTerm] = useState('')

  // Admin Review Modal / Note Edit State
  const [selectedReviewEntry, setSelectedReviewEntry] = useState<FeedbackEntry | null>(null)
  const [reviewStatusDraft, setReviewStatusDraft] = useState<FeedbackReviewStatus>('pending')
  const [reviewNoteDraft, setReviewNoteDraft] = useState('')
  const [isUpdatingReview, setIsUpdatingReview] = useState(false)
  const [reviewActionSuccess, setReviewActionSuccess] = useState<string | null>(null)

  // Load and subscribe to feedback updates
  const loadFeedback = () => {
    if (isAdmin) {
      setAdminFeedbackList(feedbackService.getAllFeedback('admin'))
    }
  }

  useEffect(() => {
    loadFeedback()
    const unsubscribe = feedbackService.onChange(() => {
      loadFeedback()
    })
    return () => unsubscribe()
  }, [isAdmin])

  // Sync category defaults when role changes
  useEffect(() => {
    if (isStudent) {
      setCategory(STUDENT_FEEDBACK_CATEGORIES[0])
    } else {
      setCategory(VISITOR_FEEDBACK_CATEGORIES[0])
    }
  }, [isStudent])

  // Student Past Submissions
  const studentSubmissions = useMemo(() => {
    if (!isStudent && !isAdmin) return []
    return feedbackService.getStudentFeedback(user?.studentId || user?.name, role)
  }, [isStudent, isAdmin, user?.studentId, user?.name, role, adminFeedbackList])

  // Admin Filtered List
  const filteredAdminList = useMemo(() => {
    if (!isAdmin) return []
    return adminFeedbackList.filter((item) => {
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
  }, [adminFeedbackList, isAdmin, filterUserType, filterStatus, filterRating, filterCategory, searchTerm])

  const stats = useMemo(() => {
    if (!isAdmin) return null
    return feedbackService.getFeedbackStats('admin')
  }, [isAdmin, adminFeedbackList])

  // Handle Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (!category) {
      setErrorMessage('Please select a feedback category.')
      return
    }

    setIsSubmitting(true)

    const determinedUserType: FeedbackUserType = isStudent ? 'student' : 'visitor'
    const finalName = isStudent
      ? isAnonymous
        ? undefined
        : user?.name
      : visitorName.trim() || undefined
    const finalStudentId = isStudent && !isAnonymous ? user?.studentId : undefined
    const finalDepartment = isStudent && !isAnonymous ? user?.department : undefined

    try {
      const res = await feedbackService.submitFeedback({
        userType: determinedUserType,
        category,
        rating: rating !== null ? rating : undefined,
        comments: comments.trim() || undefined,
        name: finalName,
        studentId: finalStudentId,
        department: finalDepartment,
      })

      if (res.success && res.entry) {
        setSubmittedEntry(res.entry)
        setComments('')
        setVisitorName('')
        if (isAdmin) loadFeedback()
      } else {
        setErrorMessage(res.error || 'Failed to submit feedback. Please try again.')
      }
    } catch {
      setErrorMessage('An unexpected error occurred while transmitting feedback.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle Admin Review Update
  const handleOpenReviewModal = (entry: FeedbackEntry) => {
    setSelectedReviewEntry(entry)
    setReviewStatusDraft(entry.status)
    setReviewNoteDraft(entry.adminNotes || '')
    setReviewActionSuccess(null)
  }

  const handleSaveReview = () => {
    if (!selectedReviewEntry || !isAdmin) return
    setIsUpdatingReview(true)
    const res = feedbackService.updateFeedbackReview(
      selectedReviewEntry.id,
      reviewStatusDraft,
      reviewNoteDraft,
      'admin'
    )
    setIsUpdatingReview(false)

    if (res.success) {
      setReviewActionSuccess('Review status and administrative notes updated.')
      loadFeedback()
      setTimeout(() => {
        setSelectedReviewEntry(null)
        setReviewActionSuccess(null)
      }, 900)
    }
  }

  return (
    <div className="min-h-screen bg-[#E8DDF2] text-[#352A47] pb-24 md:pb-12 font-sans">
      {/* Top Hero Banner */}
      <div className="border-b border-[#C9B6DF] bg-[#FBF8FD]/95 backdrop-blur-xl px-4 py-6 sm:px-8 shadow-dream-card">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#D9B4A3] bg-[#E8C8B9] px-3 py-0.5 text-[11px] font-heading font-bold text-[#352A47]">
                <MessageSquare size={13} />
                <span>MNMJEC Feedback Center</span>
              </span>

              {/* Active Role Badge */}
              <span
                className={`rounded-full px-2.5 py-0.5 text-[10px] font-heading font-bold border ${
                  isAdmin
                    ? 'bg-[#DFD1EC] text-[#352A47] border-[#C9B6DF]'
                    : isStudent
                      ? 'bg-[#BCD8C9] text-[#1E583F] border-[#94BCA7]'
                      : 'bg-[#E8DDF2] text-[#51465F] border-[#C9B6DF]'
                }`}
              >
                {isAdmin
                  ? 'Administrator Console'
                  : isStudent
                    ? 'Enrolled Student Mode'
                    : 'Campus Visitor Mode'}
              </span>
            </div>

            <h1 className="font-editorial text-2xl sm:text-4xl font-extrabold tracking-tight text-[#352A47] leading-tight">
              Campus Experience &amp; Suggestions Center
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-[#51465F] max-w-2xl leading-relaxed font-sans">
              Share your observations, 3D wayfinding feedback, and suggestions to help enhance the virtual campus and institutional services.
            </p>
          </div>

          {/* Quick Context Action */}
          <div className="flex items-center gap-2 self-start md:self-auto">
            <Link
              to="/explore"
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-2xl border border-[#C9B6DF] bg-[#E8DDF2] hover:bg-[#D2BEE7] px-3.5 py-2 text-xs font-heading font-bold text-[#352A47] transition shadow-xs"
            >
              <span>Explore 3D Campus</span>
            </Link>
            {!isAdmin && !isStudent && (
              <Link
                to="/login"
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-2xl bg-[#352A47] hover:bg-[#231B30] px-3.5 py-2 text-xs font-heading font-bold text-white transition shadow-dream-soft"
              >
                <Lock size={12} />
                <span>Student / Admin Sign In</span>
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 sm:px-8 space-y-6">
        {/* Requirement 4: Explicit Boundary Notice Distinguishing Feedback vs Issue Passport */}
        <div className="rounded-3xl border border-[#D7A894] bg-[#E8C8B9]/30 p-4 sm:p-5 flex items-start gap-3.5 shadow-xs">
          <Wrench size={20} className="text-[#9E563A] shrink-0 mt-0.5" />
          <div className="text-xs space-y-1 font-sans">
            <span className="font-heading font-bold text-[#9E563A] block text-sm">
              Notice: Feedback vs. Campus Issue Passport
            </span>
            <p className="text-[#51465F] leading-relaxed">
              This Feedback Center is for sharing general user impressions, 3D model suggestions, and service evaluations.
              If you are reporting an actionable infrastructure defect (broken classroom equipment, plumbing leaks, electrical hazards, or damaged walkways), please file a work order in the{' '}
              <Link
                to="/issues"
                className="font-bold text-[#7A4465] hover:underline inline-flex items-center gap-0.5 font-heading"
              >
                <span>Campus Issue Passport</span>
                <ExternalLink size={11} />
              </Link>{' '}
              for field technician dispatch and status tracking.
            </p>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* ADMINISTRATOR DASHBOARD VIEW                                              */}
        {/* ========================================================================= */}
        {isAdmin ? (
          <div className="space-y-6">
            {/* KPI Cards */}
            {stats && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                <div className="rounded-3xl border border-[#C9B6DF] bg-[#FBF8FD] p-4 shadow-dream-soft">
                  <span className="text-[11px] font-heading font-bold text-[#51465F]">Total Submissions</span>
                  <div className="font-editorial text-2xl sm:text-3xl font-extrabold text-[#352A47] mt-1">
                    {stats.totalCount}
                  </div>
                  <div className="text-[10px] text-[#51465F] mt-0.5">
                    {stats.byUserType.visitor} Visitors • {stats.byUserType.student} Students
                  </div>
                </div>

                <div className="rounded-3xl border border-[#D7A894] bg-[#FBF8FD] p-4 shadow-dream-soft">
                  <span className="text-[11px] font-heading font-bold text-[#9E563A]">Average Rating</span>
                  <div className="font-editorial text-2xl sm:text-3xl font-extrabold text-[#9E563A] mt-1 flex items-center gap-2">
                    <span>{stats.averageRating}</span>
                    <Star size={18} className="fill-amber-400 text-amber-400" />
                  </div>
                  <div className="text-[10px] text-[#9E563A] mt-0.5">Scale: 1.0 to 5.0</div>
                </div>

                <div className="rounded-3xl border border-[#C9B6DF] bg-[#FBF8FD] p-4 shadow-dream-soft">
                  <span className="text-[11px] font-heading font-bold text-[#7A4465]">Pending Review</span>
                  <div className="font-editorial text-2xl sm:text-3xl font-extrabold text-[#7A4465] mt-1">
                    {stats.byStatus.pending}
                  </div>
                  <div className="text-[10px] text-[#51465F] mt-0.5">Awaiting staff action</div>
                </div>

                <div className="rounded-3xl border border-[#94BCA7] bg-[#FBF8FD] p-4 shadow-dream-soft">
                  <span className="text-[11px] font-heading font-bold text-[#1E583F]">Addressed</span>
                  <div className="font-editorial text-2xl sm:text-3xl font-extrabold text-[#1E583F] mt-1">
                    {stats.byStatus.addressed}
                  </div>
                  <div className="text-[10px] text-[#1E583F] mt-0.5">
                    {stats.byStatus.reviewed} marked reviewed
                  </div>
                </div>
              </div>
            )}

            {/* Filter Toolbar */}
            <div className="rounded-3xl border border-[#C9B6DF] bg-[#FBF8FD] p-4 shadow-dream-soft flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Search Input */}
                <div className="relative min-w-[200px]">
                  <Search size={14} className="absolute left-3 top-2.5 text-[#51465F]" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search comments or name..."
                    className="w-full rounded-2xl border border-[#C9B6DF] bg-[#E8DDF2]/60 pl-8 pr-3 py-1.5 text-xs text-[#352A47] placeholder-[#51465F]/70 focus:outline-none focus:ring-2 focus:ring-[#D2BEE7]"
                  />
                </div>

                {/* Filter by Role */}
                <select
                  value={filterUserType}
                  onChange={(e) => setFilterUserType(e.target.value)}
                  className="rounded-2xl border border-[#C9B6DF] bg-[#E8DDF2]/60 px-3 py-1.5 text-xs font-heading font-bold text-[#352A47] focus:outline-none cursor-pointer"
                  aria-label="Filter submissions by user role"
                >
                  <option value="All">All Roles (Visitors &amp; Students)</option>
                  <option value="visitor">Visitors Only</option>
                  <option value="student">Students Only</option>
                </select>

                {/* Filter by Review Status */}
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="rounded-2xl border border-[#C9B6DF] bg-[#E8DDF2]/60 px-3 py-1.5 text-xs font-heading font-bold text-[#352A47] focus:outline-none cursor-pointer"
                  aria-label="Filter by review status"
                >
                  <option value="All">All Statuses</option>
                  <option value="pending">Pending Review</option>
                  <option value="reviewed">Reviewed</option>
                  <option value="addressed">Addressed</option>
                </select>

                {/* Filter by Rating */}
                <select
                  value={filterRating}
                  onChange={(e) => setFilterRating(e.target.value)}
                  className="rounded-2xl border border-[#C9B6DF] bg-[#E8DDF2]/60 px-3 py-1.5 text-xs font-heading font-bold text-[#352A47] focus:outline-none cursor-pointer"
                  aria-label="Filter by star rating"
                >
                  <option value="All">All Ratings</option>
                  <option value="5">5 Stars</option>
                  <option value="4">4 Stars</option>
                  <option value="3">3 Stars</option>
                  <option value="2">2 Stars</option>
                  <option value="1">1 Star</option>
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
                className="text-xs font-heading font-bold text-[#7A4465] hover:text-[#352A47] hover:underline cursor-pointer"
              >
                Reset Filters
              </button>
            </div>

            {/* Submissions List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredAdminList.length === 0 ? (
                <div className="md:col-span-2 rounded-3xl border border-[#C9B6DF] bg-[#FBF8FD] p-12 text-center text-[#51465F] text-xs">
                  No feedback entries match your active filters.
                </div>
              ) : (
                filteredAdminList.map((entry) => (
                  <div
                    key={entry.id}
                    className="rounded-3xl border border-[#C9B6DF] bg-[#FBF8FD] p-5 shadow-dream-soft flex flex-col justify-between space-y-3.5 hover:border-[#352A47] transition"
                  >
                    <div>
                      {/* Top Header: Rating, Role Pill, Status Badge */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          {entry.rating ? (
                            <div className="flex items-center gap-1">
                              {[1, 2, 3, 4, 5].map((s) => (
                                <Star
                                  key={s}
                                  size={13}
                                  className={
                                    s <= (entry.rating || 0)
                                      ? 'fill-amber-400 text-amber-400'
                                      : 'text-slate-300'
                                  }
                                />
                              ))}
                              <span className="text-xs font-heading font-bold text-[#9E563A] ml-1">
                                {entry.rating}.0
                              </span>
                            </div>
                          ) : (
                            <span className="text-[10px] text-[#51465F] italic">Unrated</span>
                          )}

                          <span
                            className={`rounded-full px-2 py-0.5 text-[9px] font-heading font-bold uppercase tracking-wider border ${
                              entry.userType === 'student'
                                ? 'bg-[#BCD8C9] text-[#1E583F] border-[#94BCA7]'
                                : 'bg-[#DFD1EC] text-[#352A47] border-[#C9B6DF]'
                            }`}
                          >
                            {entry.userType}
                          </span>
                        </div>

                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-heading font-bold border ${
                            entry.status === 'addressed'
                              ? 'bg-[#BCD8C9] text-[#1E583F] border-[#94BCA7]'
                              : entry.status === 'reviewed'
                                ? 'bg-[#DFD1EC] text-[#352A47] border-[#C9B6DF]'
                                : 'bg-[#E8C8B9] text-[#9E563A] border-[#D7A894]'
                          }`}
                        >
                          {entry.status.toUpperCase()}
                        </span>
                      </div>

                      {/* Category Label */}
                      <div className="mt-2 text-xs font-heading font-bold text-[#352A47] flex items-center gap-1.5">
                        <span className="text-[#7A4465]">•</span>
                        <span>{entry.category}</span>
                      </div>

                      {/* Comment text */}
                      {entry.comments ? (
                        <p className="mt-2 text-xs text-[#352A47] leading-relaxed italic bg-[#E8DDF2]/50 p-3 rounded-2xl border border-[#C9B6DF]">
                          &ldquo;{entry.comments}&rdquo;
                        </p>
                      ) : (
                        <div className="mt-2 text-[11px] text-[#51465F] italic">
                          No written comment provided.
                        </div>
                      )}

                      {/* Internal Admin Review Notes Display */}
                      {entry.adminNotes && (
                        <div className="mt-2.5 rounded-2xl border border-[#C9B6DF] bg-[#DFD1EC]/60 p-2.5 text-xs text-[#352A47]">
                          <span className="font-heading font-bold text-[10px] uppercase text-[#7A4465] block mb-0.5">
                            Staff Note:
                          </span>
                          <p className="text-[11px] text-[#352A47] leading-relaxed font-sans">
                            {entry.adminNotes}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Bottom Metadata & Review Action */}
                    <div className="pt-2.5 border-t border-[#C9B6DF] flex items-center justify-between text-[11px] text-[#51465F]">
                      <div>
                        <div className="font-heading font-bold text-[#352A47] flex items-center gap-1">
                          <User size={12} className="text-[#51465F]" />
                          <span>{entry.name || 'Anonymous Visitor'}</span>
                          {/* Privacy Protection: Mask Student ID */}
                          {entry.studentId && (
                            <span className="text-[10px] text-[#51465F] font-mono">
                              ({entry.studentId.slice(0, 6)}****)
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-[#51465F] flex items-center gap-1 mt-0.5">
                          <Calendar size={10} />
                          <span>{new Date(entry.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleOpenReviewModal(entry)}
                        className="rounded-xl border border-[#C9B6DF] bg-[#E8DDF2] hover:bg-[#D2BEE7] text-[#352A47] px-3 py-1.5 text-xs font-heading font-bold transition cursor-pointer shadow-xs"
                      >
                        Review / Note
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          /* ========================================================================= */
          /* VISITOR & STUDENT SUBMISSION EXPERIENCE                                   */
          /* ========================================================================= */
          <div className="space-y-6">
            {/* Student Navigation Sub-Tabs */}
            {isStudent && (
              <div className="flex border-b border-[#C9B6DF] pb-2 gap-4">
                <button
                  type="button"
                  onClick={() => setActiveTab('submit')}
                  className={`flex items-center gap-2 pb-2 text-xs font-heading font-bold transition border-b-2 cursor-pointer ${
                    activeTab === 'submit'
                      ? 'border-[#352A47] text-[#352A47]'
                      : 'border-transparent text-[#51465F] hover:text-[#352A47]'
                  }`}
                >
                  <Send size={14} />
                  <span>Submit New Feedback</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('history')}
                  className={`flex items-center gap-2 pb-2 text-xs font-heading font-bold transition border-b-2 cursor-pointer ${
                    activeTab === 'history'
                      ? 'border-[#352A47] text-[#352A47]'
                      : 'border-transparent text-[#51465F] hover:text-[#352A47]'
                  }`}
                >
                  <Clock size={14} />
                  <span>My Past Submissions ({studentSubmissions.length})</span>
                </button>
              </div>
            )}

            {isStudent && activeTab === 'history' ? (
              /* Student Past Submissions History */
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-heading font-bold uppercase tracking-wider text-[#352A47]">
                    My Feedback Submissions
                  </h2>
                  <span className="text-xs text-[#51465F]">
                    Strictly confidential • Private to your student account
                  </span>
                </div>

                {studentSubmissions.length === 0 ? (
                  <div className="rounded-3xl border border-[#C9B6DF] bg-[#FBF8FD] p-10 text-center text-xs text-[#51465F]">
                    You have not submitted any feedback yet. Share your experience with campus facilities and services above!
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {studentSubmissions.map((entry) => (
                      <div
                        key={entry.id}
                        className="rounded-3xl border border-[#C9B6DF] bg-[#FBF8FD] p-5 shadow-dream-soft space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-heading font-bold text-[#352A47]">{entry.category}</span>
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[10px] font-heading font-bold border ${
                              entry.status === 'addressed'
                                ? 'bg-[#BCD8C9] text-[#1E583F] border-[#94BCA7]'
                                : entry.status === 'reviewed'
                                  ? 'bg-[#DFD1EC] text-[#352A47] border-[#C9B6DF]'
                                  : 'bg-[#E8C8B9] text-[#9E563A] border-[#D7A894]'
                            }`}
                          >
                            {entry.status === 'addressed'
                              ? 'Addressed by Staff'
                              : entry.status === 'reviewed'
                                ? 'Reviewed'
                                : 'Pending Review'}
                          </span>
                        </div>

                        {entry.comments && (
                          <p className="text-xs text-[#352A47] bg-[#E8DDF2]/50 p-3 rounded-2xl border border-[#C9B6DF] italic font-sans">
                            &ldquo;{entry.comments}&rdquo;
                          </p>
                        )}

                        {entry.adminNotes && (
                          <div className="rounded-2xl border border-[#C9B6DF] bg-[#DFD1EC]/60 p-2.5 text-xs text-[#352A47]">
                            <span className="font-heading font-bold text-[10px] uppercase text-[#7A4465] block mb-0.5">
                              Institutional Response:
                            </span>
                            <p className="text-[11px] text-[#352A47] font-sans">{entry.adminNotes}</p>
                          </div>
                        )}

                        <div className="flex items-center justify-between text-[11px] text-[#51465F] pt-2 border-t border-[#C9B6DF]">
                          <span>ID: {entry.id}</span>
                          <span>{new Date(entry.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* Submission Form (Visitors & Students) */
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Form */}
                <div className="lg:col-span-2 rounded-3xl border border-[#C9B6DF] bg-[#FBF8FD] p-5 sm:p-7 shadow-dream-card">
                  {submittedEntry ? (
                    /* Submission Success Card */
                    <div className="py-6 text-center space-y-4">
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#BCD8C9] text-[#1E583F] border border-[#94BCA7]">
                        <CheckCircle2 size={32} />
                      </div>
                      <h2 className="text-xl font-heading font-extrabold text-[#352A47]">Feedback Successfully Recorded</h2>
                      <p className="text-xs text-[#51465F] max-w-md mx-auto leading-relaxed font-sans">
                        Thank you for helping us improve PATH FINDER and campus facilities. Your feedback has been logged under reference{' '}
                        <span className="font-mono font-bold text-[#352A47]">
                          {submittedEntry.id}
                        </span>{' '}
                        and routed to college administration.
                      </p>

                      <div className="pt-4">
                        <button
                          type="button"
                          onClick={() => setSubmittedEntry(null)}
                          className="rounded-2xl bg-[#352A47] hover:bg-[#231B30] text-white px-5 py-2.5 text-xs font-heading font-bold transition shadow-dream-soft cursor-pointer"
                        >
                          Submit Additional Feedback
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Active Submission Form */
                    <form onSubmit={handleSubmit} className="space-y-5">
                      {errorMessage && (
                        <div className="rounded-2xl border border-[#D7A894] bg-[#E8C8B9]/40 p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-[#9E563A]">
                          <div className="flex items-center gap-2.5">
                            <AlertCircle size={18} className="text-[#9E563A] shrink-0" />
                            <span>{errorMessage}</span>
                          </div>
                          <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="rounded-xl bg-[#E8C8B9] border border-[#D7A894] px-3 py-1 text-xs font-heading font-bold text-[#9E563A] hover:bg-[#DFC0B1] transition shrink-0 cursor-pointer disabled:opacity-50"
                          >
                            {isSubmitting ? 'Retrying...' : 'Retry Submission'}
                          </button>
                        </div>
                      )}

                      {/* Category Selection */}
                      <div>
                        <label className="block text-xs font-heading font-bold uppercase tracking-wider text-[#51465F] mb-2">
                          1. Select Feedback Category <span className="text-[#9E563A]">*</span>
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {(isStudent ? STUDENT_FEEDBACK_CATEGORIES : VISITOR_FEEDBACK_CATEGORIES).map(
                            (cat) => {
                              const isSelected = category === cat
                              return (
                                <button
                                  key={cat}
                                  type="button"
                                  onClick={() => setCategory(cat)}
                                  className={`flex items-center justify-between rounded-2xl p-3 text-left text-xs font-heading font-bold transition cursor-pointer border ${
                                    isSelected
                                      ? 'border-[#352A47] bg-[#352A47] text-white shadow-dream-soft'
                                      : 'border-[#C9B6DF] bg-[#E8DDF2]/50 text-[#352A47] hover:bg-[#D2BEE7]'
                                  }`}
                                >
                                  <span>{cat}</span>
                                  {isSelected && (
                                    <CheckCircle2 size={14} className="text-white shrink-0" />
                                  )}
                                </button>
                              )
                            }
                          )}
                        </div>
                      </div>

                      {/* Optional Rating (Mandated Feature 2 & 3: Optional rating and comments) */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-xs font-heading font-bold uppercase tracking-wider text-[#51465F]">
                            2. Experience Rating <span className="text-[10px] lowercase text-[#51465F]">(optional)</span>
                          </label>
                          {rating !== null && (
                            <button
                              type="button"
                              onClick={() => setRating(null)}
                              className="text-[10px] font-heading font-bold text-[#7A4465] hover:underline"
                            >
                              Clear rating
                            </button>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <button
                              key={s}
                              type="button"
                              onMouseEnter={() => setHoverRating(s)}
                              onMouseLeave={() => setHoverRating(null)}
                              onClick={() => setRating(s)}
                              aria-label={`Rate ${s} out of 5 stars`}
                              className="p-1 rounded-xl hover:bg-[#E8DDF2] transition cursor-pointer"
                            >
                              <Star
                                size={24}
                                className={`transition-colors ${
                                  s <= (hoverRating ?? rating ?? 0)
                                    ? 'fill-amber-400 text-amber-400'
                                    : 'text-slate-300'
                                }`}
                              />
                            </button>
                          ))}
                          <span className="text-xs font-sans text-[#51465F] ml-2 font-medium">
                            {rating === 5
                              ? '5.0 — Excellent'
                              : rating === 4
                                ? '4.0 — Very Good'
                                : rating === 3
                                  ? '3.0 — Average'
                                  : rating === 2
                                    ? '2.0 — Needs Improvement'
                                    : rating === 1
                                      ? '1.0 — Unsatisfactory'
                                      : 'No rating specified'}
                          </span>
                        </div>
                      </div>

                      {/* Comments & Suggestions */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label
                            htmlFor="feedback-comments-input"
                            className="text-xs font-heading font-bold uppercase tracking-wider text-[#51465F]"
                          >
                            3. Observations &amp; Suggestions{' '}
                            <span className="text-[10px] lowercase text-[#51465F]">(optional)</span>
                          </label>
                          <span className="text-[10px] text-[#51465F]">
                            {comments.length}/2000
                          </span>
                        </div>
                        <textarea
                          id="feedback-comments-input"
                          rows={4}
                          value={comments}
                          maxLength={2000}
                          onChange={(e) => setComments(e.target.value)}
                          placeholder={
                            isStudent
                              ? 'Share your observations regarding lab computing facilities, classroom conditions, Wi-Fi connectivity, or campus navigation...'
                              : 'Tell us how your campus tour or virtual 3D visit went. What information was clear, and what can be improved?'
                          }
                          className="w-full rounded-2xl border border-[#C9B6DF] bg-[#E8DDF2]/40 p-3 text-xs sm:text-sm text-[#352A47] placeholder-[#51465F]/70 focus:outline-none focus:ring-2 focus:ring-[#D2BEE7] font-sans"
                        />
                      </div>

                      {/* Identity Details */}
                      {isStudent ? (
                        <div className="rounded-2xl border border-[#C9B6DF] bg-[#E8DDF2]/50 p-3.5 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="text-xs text-[#352A47] font-heading font-bold flex items-center gap-2">
                              <GraduationCap size={15} className="text-[#1E583F]" />
                              <span>
                                {user?.name} • {user?.department || 'Student'}
                              </span>
                            </div>
                            <span className="text-[10px] text-[#51465F] font-mono">
                              ID: {user?.studentId}
                            </span>
                          </div>

                          <label className="flex items-center gap-2 pt-1 border-t border-[#C9B6DF] cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isAnonymous}
                              onChange={(e) => setIsAnonymous(e.target.checked)}
                              className="rounded border-[#C9B6DF] bg-[#FBF8FD] text-[#352A47] focus:ring-[#352A47] cursor-pointer"
                            />
                            <span className="text-xs text-[#51465F] font-sans">
                              Submit anonymously (omit my name and student registration ID)
                            </span>
                          </label>
                        </div>
                      ) : (
                        <div>
                          <label
                            htmlFor="visitor-name-input"
                            className="block text-xs font-heading font-bold uppercase tracking-wider text-[#51465F] mb-1.5"
                          >
                            Your Name / Role <span className="text-[10px] lowercase text-[#51465F]">(optional)</span>
                          </label>
                          <input
                            type="text"
                            id="visitor-name-input"
                            value={visitorName}
                            maxLength={100}
                            onChange={(e) => setVisitorName(e.target.value)}
                            placeholder="e.g. S. Venkat (Alumnus) or Guest Visitor"
                            className="w-full rounded-2xl border border-[#C9B6DF] bg-[#E8DDF2]/40 p-3 text-xs sm:text-sm text-[#352A47] placeholder-[#51465F]/70 focus:outline-none focus:ring-2 focus:ring-[#D2BEE7] font-sans"
                          />
                        </div>
                      )}

                      {/* Submit Button */}
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full min-h-[46px] flex items-center justify-center gap-2 rounded-2xl bg-[#352A47] hover:bg-[#231B30] text-white text-xs font-heading font-bold transition shadow-dream-soft cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSubmitting ? (
                          <>
                            <RefreshCw size={15} className="animate-spin" />
                            <span>Transmitting Feedback...</span>
                          </>
                        ) : (
                          <>
                            <Send size={15} />
                            <span>Submit Feedback to MNMJEC</span>
                          </>
                        )}
                      </button>
                    </form>
                  )}
                </div>

                {/* Sidebar Guidance & Privacy Guarantees */}
                <div className="space-y-4">
                  <div className="rounded-3xl border border-[#C9B6DF] bg-[#FBF8FD] p-5 shadow-dream-card space-y-3">
                    <h3 className="text-xs font-heading font-bold uppercase tracking-wider text-[#352A47] flex items-center gap-2">
                      <ShieldCheck size={16} className="text-[#1E583F]" />
                      <span>Privacy &amp; Security Standards</span>
                    </h3>
                    <ul className="space-y-2 text-xs text-[#51465F] leading-relaxed font-sans">
                      <li className="flex items-start gap-2">
                        <span className="text-[#1E583F] font-bold">•</span>
                        <span>Zero public exposure: submissions are accessible strictly to authorized administration.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-[#1E583F] font-bold">•</span>
                        <span>Cross-student isolation: fellow students cannot inspect or access your submissions.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-[#1E583F] font-bold">•</span>
                        <span>IP hashes and identifiers are masked to safeguard respondent privacy.</span>
                      </li>
                    </ul>
                  </div>

                  <div className="rounded-3xl border border-[#C9B6DF] bg-[#FBF8FD] p-5 shadow-dream-card space-y-3">
                    <h3 className="text-xs font-heading font-bold uppercase tracking-wider text-[#352A47] flex items-center gap-2">
                      <Building size={16} className="text-[#7A4465]" />
                      <span>In-Person Feedback</span>
                    </h3>
                    <p className="text-xs text-[#51465F] leading-relaxed font-sans">
                      Students and visitors may also submit written feedback directly at the Administrative Office or Student Affairs desk located on the Ground Floor of the Main Block.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Admin Review Modal */}
      {selectedReviewEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg rounded-3xl border border-[#C9B6DF] bg-[#FBF8FD] p-6 text-[#352A47] shadow-dream-elevated">
            <button
              type="button"
              onClick={() => setSelectedReviewEntry(null)}
              className="absolute right-4 top-4 rounded-xl p-1.5 text-[#51465F] hover:bg-[#E8DDF2] hover:text-[#352A47]"
            >
              <X size={18} />
            </button>

            <h3 className="text-base font-heading font-bold text-[#352A47] mb-1 flex items-center gap-2">
              <ShieldCheck size={18} className="text-[#7A4465]" />
              <span>Review Feedback Submission</span>
            </h3>
            <p className="text-xs text-[#51465F] mb-4 font-sans">
              ID: {selectedReviewEntry.id} • {selectedReviewEntry.category}
            </p>

            {reviewActionSuccess && (
              <div className="mb-4 rounded-2xl border border-[#94BCA7] bg-[#BCD8C9] p-3 text-xs text-[#1E583F] flex items-center gap-2 font-sans font-medium">
                <CheckCircle2 size={15} />
                <span>{reviewActionSuccess}</span>
              </div>
            )}

            <div className="space-y-4 font-sans">
              <div>
                <label className="block text-xs font-heading font-bold uppercase tracking-wider text-[#51465F] mb-1.5">
                  Update Review Status
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['pending', 'reviewed', 'addressed'] as FeedbackReviewStatus[]).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setReviewStatusDraft(st)}
                      className={`rounded-2xl py-2 px-3 text-xs font-heading font-bold uppercase transition cursor-pointer border ${
                        reviewStatusDraft === st
                          ? 'bg-[#352A47] text-white border-[#352A47] shadow-dream-soft'
                          : 'bg-[#E8DDF2] text-[#51465F] border-[#C9B6DF]'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-heading font-bold uppercase tracking-wider text-[#51465F] mb-1.5">
                  Internal Administrative Notes
                </label>
                <textarea
                  rows={3}
                  value={reviewNoteDraft}
                  onChange={(e) => setReviewNoteDraft(e.target.value)}
                  placeholder="Record internal resolution notes, team assignments, or follow-up status..."
                  className="w-full rounded-2xl border border-[#C9B6DF] bg-[#E8DDF2]/40 p-3 text-xs text-[#352A47] placeholder-[#51465F]/70 focus:outline-none focus:ring-2 focus:ring-[#D2BEE7]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#C9B6DF]">
                <button
                  type="button"
                  onClick={() => setSelectedReviewEntry(null)}
                  className="rounded-2xl border border-[#C9B6DF] bg-[#E8DDF2] hover:bg-[#D2BEE7] px-4 py-2 text-xs font-heading font-bold text-[#51465F] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isUpdatingReview}
                  onClick={handleSaveReview}
                  className="rounded-2xl bg-[#352A47] hover:bg-[#231B30] px-4 py-2 text-xs font-heading font-bold text-white shadow-dream-soft cursor-pointer disabled:opacity-50"
                >
                  {isUpdatingReview ? 'Saving...' : 'Save Review'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
