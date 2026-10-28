import {
  Camera,
  CheckCircle2,
  Filter,
  History,
  Layers,
  MapPin,
  RefreshCw,
  Search,
  Shield,
  Wrench,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Campus3D } from '../components/Campus3D'
import { EvidenceImageViewer } from '../components/EvidenceImageViewer'
import { useAuth } from '../context/AuthContext'
import { CAMPUS_LANDMARKS } from '../data/campusLandmarks'
import { isSupabaseConfigured } from '../lib/supabaseClient'
import { issueService } from '../services/issueService'
import {
  MAINTENANCE_TEAMS,
  type CampusIssueReport,
  type IssueCategory,
  type IssueStatus,
} from '../types/issues'

const ALL_STATUSES: IssueStatus[] = [
  'SUBMITTED',
  'UNDER_REVIEW',
  'ASSIGNED',
  'IN_PROGRESS',
  'RESOLVED',
  'REJECTED',
]

export function AdminDashboardScreen() {
  const { user, role } = useAuth()
  const [issues, setIssues] = useState<CampusIssueReport[]>([])
  const [selectedIssue, setSelectedIssue] = useState<CampusIssueReport | null>(null)
  const [viewMode, setViewMode] = useState<'table' | '3d'>('table')
  const [enlargedPhotoUrl, setEnlargedPhotoUrl] = useState<string | null>(null)

  // Filters
  const [filterStatus, setFilterStatus] = useState<string>('All')
  const [filterCategory, setFilterCategory] = useState<string>('All')
  const [filterBuilding, setFilterBuilding] = useState<string>('All')
  const [searchQuery, setSearchQuery] = useState('')

  // Edit / Status Update Modal state
  const [isUpdating, setIsUpdating] = useState(false)
  const [newStatus, setNewStatus] = useState<IssueStatus>('UNDER_REVIEW')
  const [selectedTeam, setSelectedTeam] = useState<string>('')
  const [adminNotes, setAdminNotes] = useState('')
  const [updateError, setUpdateError] = useState<string | null>(null)
  const [isSubmittingUpdate, setIsSubmittingUpdate] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const reload = () => {
    const list = issueService.getIssuesForRole(role, user.id)
    setIssues(list)
    if (selectedIssue) {
      const refreshed = list.find((i) => i.id === selectedIssue.id) ?? null
      setSelectedIssue(refreshed)
    }
  }

  useEffect(() => {
    reload()
    const unsubscribe = issueService.onChange(() => reload())
    return () => unsubscribe()
  }, [role, user.id])

  const stats = useMemo(() => issueService.getStatistics(role), [issues, role])

  const filteredIssues = useMemo(() => {
    return issues.filter((item) => {
      if (filterStatus !== 'All' && item.status !== filterStatus) return false
      if (filterCategory !== 'All' && item.category !== filterCategory) return false
      if (filterBuilding !== 'All' && item.buildingId !== filterBuilding) return false
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchId = item.id.toLowerCase().includes(q)
        const matchDesc = item.description.toLowerCase().includes(q)
        const matchLoc = item.locationName.toLowerCase().includes(q)
        const matchReporter = item.reporterName.toLowerCase().includes(q)
        if (!matchId && !matchDesc && !matchLoc && !matchReporter) return false
      }
      return true
    })
  }, [issues, filterStatus, filterCategory, filterBuilding, searchQuery])

  const handleOpenUpdateModal = (issue: CampusIssueReport) => {
    setSelectedIssue(issue)
    setNewStatus(issue.status)
    setSelectedTeam(issue.assignedTeam || '')
    setAdminNotes('')
    setUpdateError(null)
    setIsUpdating(true)
  }

  const handleSaveUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedIssue) return

    setUpdateError(null)
    setIsSubmittingUpdate(true)
    try {
      const res = await issueService.updateIssueStatus(
        selectedIssue.id,
        newStatus,
        role,
        user,
        adminNotes,
        selectedTeam || undefined
      )

      if (res.success) {
        setIsUpdating(false)
        reload()
      } else {
        setUpdateError(res.error || 'Failed to update issue.')
      }
    } catch {
      setUpdateError('Network or server error updating issue status.')
    } finally {
      setIsSubmittingUpdate(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#E8DDF2] text-[#352A47] p-4 md:p-6 lg:p-8 font-sans">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#352A47]/10 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-heading font-semibold text-[#51465F] mb-1">
            <span className="rounded-md bg-[#D2BEE7]/60 px-2 py-0.5 border border-[#352A47]/15 text-[10px] font-heading uppercase font-bold tracking-wider text-[#352A47]">
              Estate Operations
            </span>
            <span className="text-[#51465F]">MNM Jain Engineering College</span>
            <span
              className={`rounded-md text-[9px] uppercase px-1.5 py-0.5 font-heading font-bold ${
                isSupabaseConfigured
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-amber-100 text-amber-800 border border-amber-300'
              }`}
            >
              {isSupabaseConfigured ? 'CONNECTED TO SUPABASE' : 'DEMO DATA'}
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-editorial font-medium text-[#352A47] tracking-tight flex items-center gap-2.5">
            <Shield className="text-[#825A9E]" size={28} />
            <span>Campus Issue <em className="italic font-normal">Command Center</em></span>
          </h1>
          <p className="text-xs font-sans text-[#51465F] mt-1">
            Review reported campus hazards, dispatch maintenance teams, and visualize pins on the 3D model.
          </p>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={isRefreshing}
            onClick={async () => {
              setIsRefreshing(true)
              if (isSupabaseConfigured) {
                await issueService.fetchFromSupabase()
              } else {
                issueService.resetToDefaultSeed()
              }
              reload()
              setIsRefreshing(false)
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#352A47]/15 bg-white text-[11px] font-heading font-semibold text-[#352A47] hover:bg-[#FAF8FC] transition disabled:opacity-50 shadow-sm cursor-pointer"
            title={isSupabaseConfigured ? 'Refresh live issue records from Supabase' : 'Reset to default seed issues'}
          >
            <RefreshCw size={13} className={isRefreshing ? 'animate-spin text-[#825A9E]' : 'text-[#825A9E]'} />
            <span>{isSupabaseConfigured ? (isRefreshing ? 'Refreshing...' : 'Sync Supabase') : 'Reset Seed Data'}</span>
          </button>

          <div className="flex rounded-xl bg-[#DFD1EC] p-1 border border-[#352A47]/10 shadow-sm">
            <button
              type="button"
              data-testid="btn-view-table"
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-heading font-bold transition cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-[#352A47] text-[#FAF8FC] shadow-sm'
                  : 'text-[#51465F] hover:text-[#352A47]'
              }`}
            >
              Operations List
            </button>
            <button
              type="button"
              data-testid="btn-view-3d"
              onClick={() => setViewMode('3d')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-heading font-bold transition cursor-pointer ${
                viewMode === '3d'
                  ? 'bg-[#352A47] text-[#FAF8FC] shadow-sm'
                  : 'text-[#51465F] hover:text-[#352A47]'
              }`}
            >
              <Layers size={14} />
              3D Pin Visualization
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto space-y-6">
        {/* KPI Metrics Banner */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <div className="rounded-2xl border border-[#352A47]/10 bg-[#FAF8FC] p-3.5 shadow-sm">
              <div className="text-xs font-heading font-semibold text-[#51465F]">Total Reports</div>
              <div className="text-2xl font-editorial font-medium text-[#352A47] mt-0.5">{stats.total}</div>
              <div className="text-[11px] text-[#8C7E9C] mt-1">Campus-wide</div>
            </div>

            <div className="rounded-2xl border border-amber-300/40 bg-amber-50/60 p-3.5 shadow-sm">
              <div className="text-xs font-heading font-semibold text-amber-900">Submitted</div>
              <div className="text-2xl font-editorial font-medium text-amber-800 mt-0.5">{stats.submitted}</div>
              <div className="text-[11px] text-amber-700/80 mt-1">Pending review</div>
            </div>

            <div className="rounded-2xl border border-[#C6DCE4] bg-[#EEF5F8] p-3.5 shadow-sm">
              <div className="text-xs font-heading font-semibold text-[#2C5766]">Under Review</div>
              <div className="text-2xl font-editorial font-medium text-[#1E3F4B] mt-0.5">{stats.underReview}</div>
              <div className="text-[11px] text-[#557887] mt-1">In verification</div>
            </div>

            <div className="rounded-2xl border border-[#D2BEE7]/60 bg-[#F5EFFB] p-3.5 shadow-sm">
              <div className="text-xs font-heading font-semibold text-[#5D3F75]">Assigned</div>
              <div className="text-2xl font-editorial font-medium text-[#412854] mt-0.5">{stats.assigned}</div>
              <div className="text-[11px] text-[#7A608F] mt-1">Dispatched to crew</div>
            </div>

            <div className="rounded-2xl border border-[#E8C8B9] bg-[#FAF2ED] p-3.5 shadow-sm">
              <div className="text-xs font-heading font-semibold text-[#8C5E47]">In Progress</div>
              <div className="text-2xl font-editorial font-medium text-[#6B422F] mt-0.5">{stats.inProgress}</div>
              <div className="text-[11px] text-[#A67E6A] mt-1">Active repair</div>
            </div>

            <div className="rounded-2xl border border-emerald-300/50 bg-emerald-50/60 p-3.5 shadow-sm">
              <div className="text-xs font-heading font-semibold text-emerald-900">Resolved</div>
              <div className="text-2xl font-editorial font-medium text-emerald-800 mt-0.5">{stats.resolved}</div>
              <div className="text-[11px] text-emerald-700/80 mt-1">Closed successfully</div>
            </div>
          </div>
        )}

        {/* View Mode: 3D Visualization */}
        {viewMode === '3d' && (
          <div className="rounded-2xl border border-[#352A47]/10 bg-[#FAF8FC] p-4 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3">
              <div>
                <h2 className="text-sm font-heading font-bold text-[#352A47] flex items-center gap-2">
                  <MapPin size={16} className="text-[#825A9E]" />
                  Real 3D Model Issue Pins &amp; Spatial Clustering
                </h2>
                <p className="text-[11px] text-[#51465F] mt-0.5">
                  Click any pin to inspect the report, view the reporter, or update resolution progress.
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-[#51465F] font-medium">Showing {filteredIssues.length} pin(s) on model</span>
              </div>
            </div>

            <div className="relative h-[480px] w-full rounded-xl overflow-hidden border border-[#352A47]/15 bg-[#E8DDF2]">
              <Campus3D
                className="h-full w-full"
                selectedBuildingId={selectedIssue?.buildingId}
                showIssuePins={true}
                issueReports={filteredIssues}
                selectedIssueId={selectedIssue?.id}
                onIssueSelect={(issue) => {
                  setSelectedIssue(issue)
                  handleOpenUpdateModal(issue)
                }}
                showHud={true}
                suppressLabels={Boolean(isUpdating || enlargedPhotoUrl)}
              />
            </div>
          </div>
        )}

        {/* Filters Bar */}
        <div className="rounded-2xl border border-[#352A47]/10 bg-[#FAF8FC] p-4 shadow-sm flex flex-col md:flex-row items-center gap-3">
          {/* Search */}
          <div className="flex flex-1 items-center gap-2 rounded-xl bg-white px-3 py-2 border border-[#352A47]/15 w-full md:w-auto shadow-sm">
            <Search size={15} className="text-[#8C7E9C] shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search reports by ID, location, description..."
              className="w-full bg-transparent text-xs text-[#352A47] placeholder:text-[#8C7E9C] focus:outline-none"
            />
            {searchQuery && (
              <button type="button" onClick={() => setSearchQuery('')} className="text-[#8C7E9C] hover:text-[#352A47]">
                <X size={14} />
              </button>
            )}
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <Filter size={14} className="text-[#8C7E9C] shrink-0" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="rounded-xl border border-[#352A47]/15 bg-white px-3 py-2 text-xs text-[#352A47] focus:outline-none w-full md:w-auto shadow-sm cursor-pointer"
            >
              <option value="All">All Statuses</option>
              {ALL_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="rounded-xl border border-[#352A47]/15 bg-white px-3 py-2 text-xs text-[#352A47] focus:outline-none w-full md:w-auto shadow-sm cursor-pointer"
          >
            <option value="All">All Categories</option>
            {stats &&
              Object.keys(stats.byCategory).map((cat) => (
                <option key={cat} value={cat}>
                  {cat} ({stats.byCategory[cat as IssueCategory]})
                </option>
              ))}
          </select>

          {/* Building Filter */}
          <select
            value={filterBuilding}
            onChange={(e) => setFilterBuilding(e.target.value)}
            className="rounded-xl border border-[#352A47]/15 bg-white px-3 py-2 text-xs text-[#352A47] focus:outline-none w-full md:w-auto shadow-sm cursor-pointer"
          >
            <option value="All">All Buildings / Grounds</option>
            {CAMPUS_LANDMARKS.map((lm) => (
              <option key={lm.id} value={lm.id}>
                {lm.label}
              </option>
            ))}
          </select>
        </div>

        {/* Reports Table / Card List */}
        <div className="rounded-2xl border border-[#352A47]/10 bg-[#FAF8FC] shadow-sm overflow-hidden">
          <div className="p-4 border-b border-[#352A47]/10 flex items-center justify-between bg-[#F4EDF8]">
            <div className="text-xs font-heading font-bold text-[#352A47] flex items-center gap-2">
              <Wrench size={16} className="text-[#825A9E]" />
              Operational Reports ({filteredIssues.length})
            </div>
            <div className="text-[11px] text-[#51465F]">
              Showing active student reports logged in Stage E3 coordinates
            </div>
          </div>

          {issues.length === 0 ? (
            <div className="p-12 text-center text-[#51465F] text-xs space-y-2">
              <Shield size={32} className="mx-auto text-[#8C7E9C] mb-2" />
              <div className="font-heading font-bold text-[#352A47] text-sm">No Campus Issues Currently Reported</div>
              <p className="text-[#51465F] max-w-sm mx-auto">
                {isSupabaseConfigured
                  ? 'The database contains zero reported campus hazards or maintenance requests at this time.'
                  : 'No issues recorded in local session.'}
              </p>
            </div>
          ) : filteredIssues.length === 0 ? (
            <div className="p-12 text-center text-[#51465F] text-xs">
              No campus issues match your active filter criteria.
            </div>
          ) : (
            <>
              {/* Mobile Card List (< md) */}
              <div className="divide-y divide-[#352A47]/10 md:hidden">
                {filteredIssues.map((issue) => (
                  <div key={issue.id} className="p-4 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 font-mono font-bold text-xs text-[#352A47]">
                        <span>{issue.id}</span>
                        {issue.photoUrl && (
                          <span
                            className="rounded-full bg-[#D2BEE7]/60 px-1.5 py-0.5 text-[9px] font-heading font-bold text-[#352A47] border border-[#352A47]/15 flex items-center gap-0.5"
                            title="Photographic evidence attached"
                          >
                            <Camera size={10} />
                            <span>Photo</span>
                          </span>
                        )}
                      </div>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[9px] font-heading font-bold uppercase tracking-wider border shrink-0 ${
                          issue.status === 'RESOLVED'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : issue.status === 'IN_PROGRESS'
                              ? 'bg-[#FAF2ED] text-[#8C5E47] border-[#E8C8B9]'
                              : issue.status === 'ASSIGNED'
                                ? 'bg-[#F5EFFB] text-[#5D3F75] border-[#D2BEE7]'
                                : issue.status === 'UNDER_REVIEW'
                                  ? 'bg-[#EEF5F8] text-[#2C5766] border-[#C6DCE4]'
                                  : 'bg-amber-100 text-amber-800 border-amber-300'
                        }`}
                      >
                        {issue.status.replace('_', ' ')}
                      </span>
                    </div>

                    <div>
                      <div className="text-xs font-heading font-bold text-[#352A47]">{issue.locationName}</div>
                      <div className="text-[11px] text-[#51465F]">{issue.category} • Reporter: {issue.reporterName}</div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div className="text-[10px] text-[#51465F]">
                        Team: {issue.assignedTeam || <span className="italic">Unassigned</span>}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleOpenUpdateModal(issue)}
                        className="px-3 py-1.5 rounded-lg bg-[#352A47] hover:bg-[#231A32] text-[#FAF8FC] font-heading font-bold text-[11px] shadow-sm transition cursor-pointer"
                      >
                        Manage
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table (>= md) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs text-[#352A47]">
                  <thead className="bg-[#E8DDF2]/60 text-[11px] font-heading font-bold text-[#51465F] uppercase tracking-wider border-b border-[#352A47]/10">
                    <tr>
                      <th className="py-3 px-4">Tracking ID</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Location</th>
                      <th className="py-3 px-4">Reporter</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Assigned Team</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#352A47]/10">
                    {filteredIssues.map((issue) => (
                      <tr key={issue.id} className="hover:bg-[#E8DDF2]/30 transition">
                        <td className="py-3.5 px-4 font-mono font-bold text-[#352A47] whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span>{issue.id}</span>
                            {issue.photoUrl && (
                              <span
                                className="rounded-full bg-[#D2BEE7]/60 px-1.5 py-0.5 text-[9px] font-heading font-bold text-[#352A47] border border-[#352A47]/15 flex items-center gap-0.5"
                                title="Photographic evidence attached"
                              >
                                <Camera size={10} />
                                <span>Photo</span>
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-[#352A47] whitespace-nowrap">
                          {issue.category}
                        </td>
                        <td className="py-3.5 px-4 max-w-[200px] truncate">
                          <div className="font-medium text-[#352A47]">{issue.locationName}</div>
                          <div className="text-[10px] text-[#8C7E9C] font-mono">
                            [{issue.modelCoordinates[0]}, {issue.modelCoordinates[2]}]
                          </div>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="text-[#352A47]">{issue.reporterName}</div>
                          <div className="text-[10px] text-[#8C7E9C] uppercase">{issue.reporterRole}</div>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span
                            className={`rounded-full px-2.5 py-1 text-[10px] font-heading font-bold uppercase tracking-wider border ${
                              issue.status === 'RESOLVED'
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                : issue.status === 'IN_PROGRESS'
                                  ? 'bg-[#FAF2ED] text-[#8C5E47] border-[#E8C8B9]'
                                  : issue.status === 'ASSIGNED'
                                    ? 'bg-[#F5EFFB] text-[#5D3F75] border-[#D2BEE7]'
                                    : issue.status === 'UNDER_REVIEW'
                                      ? 'bg-[#EEF5F8] text-[#2C5766] border-[#C6DCE4]'
                                      : 'bg-amber-100 text-amber-800 border-amber-300'
                            }`}
                          >
                            {issue.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap text-[#51465F]">
                          {issue.assignedTeam || <span className="text-[#8C7E9C] italic">Unassigned</span>}
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleOpenUpdateModal(issue)}
                            className="px-3 py-1.5 rounded-lg bg-[#352A47] hover:bg-[#231A32] text-[#FAF8FC] font-heading font-bold text-[11px] shadow-sm transition cursor-pointer"
                          >
                            Manage / Update
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Admin Action & Status Update Modal */}
      {isUpdating && selectedIssue && (
        <div className="fixed inset-0 z-[9999] isolate flex items-center justify-center p-4 bg-[#352A47]/75 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl rounded-3xl border border-[#352A47]/15 bg-[#FAF8FC] p-6 text-[#352A47] shadow-2xl max-h-[90vh] overflow-y-auto">
            {/* Close */}
            <button
              type="button"
              onClick={() => setIsUpdating(false)}
              className="absolute right-4 top-4 rounded-xl p-2 text-[#51465F] hover:bg-[#E8DDF2] hover:text-[#352A47] transition cursor-pointer"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#D2BEE7]/60 border border-[#352A47]/15 text-[#352A47]">
                <Wrench size={22} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-[#352A47]">{selectedIssue.id}</span>
                  <span className="text-xs text-[#8C7E9C]">•</span>
                  <span className="text-xs text-[#51465F]">{selectedIssue.category}</span>
                </div>
                <h3 className="text-base font-editorial font-medium text-[#352A47] mt-0.5">{selectedIssue.locationName}</h3>
              </div>
            </div>

            {/* Description & Details */}
            <div className="rounded-2xl border border-[#352A47]/10 bg-[#E8DDF2]/30 p-4 mb-4 space-y-2 text-xs">
              <div className="text-[#51465F] font-heading font-bold">Reported Problem:</div>
              <p className="text-[#352A47] leading-relaxed">{selectedIssue.description}</p>
              <div className="pt-2 flex flex-wrap gap-4 text-[11px] text-[#51465F] border-t border-[#352A47]/10">
                <div>Reporter: <strong className="text-[#352A47]">{selectedIssue.reporterName}</strong></div>
                <div>Submitted: <strong className="text-[#352A47]">{new Date(selectedIssue.createdAt).toLocaleString()}</strong></div>
                <div>3D Pin: <strong className="text-[#352A47] font-mono">[{selectedIssue.modelCoordinates.join(', ')}]</strong></div>
              </div>
            </div>

            {/* Photographic Evidence Attachment in Modal */}
            {selectedIssue.photoUrl && (
              <div className="rounded-2xl border border-[#352A47]/10 bg-[#E8DDF2]/30 p-4 mb-4 space-y-2">
                <span className="text-[11px] font-heading font-bold text-[#352A47] flex items-center gap-1.5 mb-1">
                  <Camera size={14} className="text-[#825A9E]" />
                  <span>Attached Photographic Evidence</span>
                </span>
                <EvidenceImageViewer
                  photoUrl={selectedIssue.photoUrl}
                  alt={`Evidence photograph for ${selectedIssue.id}`}
                  role="admin"
                />
              </div>
            )}

            <form onSubmit={handleSaveUpdate} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Update Status */}
                <div>
                  <label htmlFor="modal-status" className="block text-xs font-heading font-semibold text-[#352A47] mb-1.5">
                    Operational Status *
                  </label>
                  <select
                    id="modal-status"
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as IssueStatus)}
                    className="w-full rounded-xl border border-[#352A47]/15 bg-white px-3 py-2 text-xs text-[#352A47] focus:border-[#825A9E] focus:outline-none shadow-sm cursor-pointer"
                  >
                    {ALL_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s.replace('_', ' ')}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Assign Team */}
                <div>
                  <label htmlFor="modal-team" className="block text-xs font-heading font-semibold text-[#352A47] mb-1.5">
                    Assign Maintenance Team
                  </label>
                  <select
                    id="modal-team"
                    value={selectedTeam}
                    onChange={(e) => setSelectedTeam(e.target.value)}
                    className="w-full rounded-xl border border-[#352A47]/15 bg-white px-3 py-2 text-xs text-[#352A47] focus:border-[#825A9E] focus:outline-none shadow-sm cursor-pointer"
                  >
                    <option value="">-- No Team Assigned --</option>
                    {MAINTENANCE_TEAMS.map((team) => (
                      <option key={team} value={team}>
                        {team}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Admin Remarks / Resolution Notes */}
              <div>
                <label htmlFor="modal-notes" className="block text-xs font-heading font-semibold text-[#352A47] mb-1.5">
                  Internal Remarks / Work Order Notes
                </label>
                <textarea
                  id="modal-notes"
                  rows={3}
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="e.g. Dispatched plumber with valve parts. Work scheduled for completion today."
                  className="w-full rounded-xl border border-[#352A47]/15 bg-white px-3 py-2 text-xs text-[#352A47] placeholder:text-[#8C7E9C] focus:border-[#825A9E] focus:outline-none resize-none shadow-sm"
                />
              </div>

              {updateError && (
                <div className="rounded-xl border border-rose-300 bg-rose-50 p-2.5 text-xs text-rose-700">
                  {updateError}
                </div>
              )}

              {/* Audit Trail Log in Modal */}
              <div className="rounded-xl border border-[#352A47]/10 bg-[#E8DDF2]/30 p-3">
                <div className="text-[11px] font-heading font-bold text-[#352A47] mb-2 flex items-center gap-1.5">
                  <History size={13} className="text-[#825A9E]" />
                  Administrative Audit Trail ({selectedIssue.history.length} records)
                </div>
                <div className="space-y-1.5 max-h-32 overflow-y-auto text-[10px] text-[#51465F] pr-1">
                  {selectedIssue.history.map((h, i) => (
                    <div key={i} className="flex justify-between border-b border-[#352A47]/10 pb-1">
                      <div>
                        <strong className="text-[#352A47]">{h.status}</strong> by {h.actorName}: {h.notes}
                      </div>
                      <div className="text-[#8C7E9C] shrink-0 ml-2">
                        {new Date(h.timestamp).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsUpdating(false)}
                  className="px-4 py-2 rounded-xl text-xs font-heading font-semibold text-[#51465F] hover:text-[#352A47] transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingUpdate}
                  className="flex items-center gap-2 rounded-xl bg-[#352A47] hover:bg-[#231A32] px-5 py-2 text-xs font-heading font-bold text-[#FAF8FC] transition shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  <CheckCircle2 size={15} />
                  <span>{isSubmittingUpdate ? 'Updating Status...' : 'Commit Status Change'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Enlarged Photo Evidence Modal Viewer */}
      {enlargedPhotoUrl && (
        <div className="fixed inset-0 z-[9999] isolate flex items-center justify-center p-4 bg-[#352A47]/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative max-w-4xl w-full flex flex-col items-center">
            <button
              type="button"
              onClick={() => setEnlargedPhotoUrl(null)}
              className="absolute -top-12 right-0 rounded-full bg-white/20 hover:bg-white/30 p-2 text-white transition cursor-pointer"
              aria-label="Close photo preview"
            >
              <X size={22} />
            </button>
            <div className="rounded-3xl overflow-hidden border border-white/20 bg-black shadow-2xl max-h-[80vh] flex items-center justify-center">
              <img
                src={enlargedPhotoUrl}
                alt="Enlarged Campus Maintenance Evidence"
                className="max-h-[80vh] w-auto max-w-full object-contain"
              />
            </div>
            <p className="mt-3 text-xs text-white/80 text-center font-sans">
              Estate Operations Evidence Inspection • Tap outside or Close to exit
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
