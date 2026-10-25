import {
  AlertCircle,
  BookmarkPlus,
  ChevronDown,
  ChevronUp,
  Crosshair,
  HeartPulse,
  Info,
  MapPin,
  MessageSquare,
  Printer,
  Route,
  Search,
  Sparkles,
  Star,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Campus3D } from '../components/Campus3D'
import { CampusCalibrationModal } from '../components/CampusCalibrationModal'
import { CampusTourOverlay } from '../components/CampusTourOverlay'
import { GpsLocationButton } from '../components/GpsLocationButton'
import { GpsStatusBanner } from '../components/GpsStatusBanner'
import { VisitorFeedbackModal } from '../components/VisitorFeedbackModal'
import { useAuth } from '../context/AuthContext'
import { buildings } from '../data/buildings'
import { campusModelMapById } from '../data/campusModelMapping'
import { CAMPUS_SERVICE_POIS, findCampusPoi, searchCampusPois } from '../data/campusPois'
import { useCampusTour } from '../hooks/useCampusTour'
import { useGpsLocation } from '../hooks/useGpsLocation'
import { useSavedLocations } from '../hooks/useSavedLocations'
import { issueService } from '../services/issueService'
import type { CampusIssueReport } from '../types/issues'

const CATEGORIES = ['All', 'Academic', 'Department', 'Facility'] as const
type CategoryFilter = (typeof CATEGORIES)[number]

export function CampusExplorerScreen() {
  const [searchParams] = useSearchParams()
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>('main-block')
  const [selectedFloor, setSelectedFloor] = useState<string>('G')
  const [isCalibrationOpen, setIsCalibrationOpen] = useState<boolean>(false)
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('All')
  const [isSearchFocused, setIsSearchFocused] = useState<boolean>(false)
  const [isCardCollapsed, setIsCardCollapsed] = useState<boolean>(false)
  const [isLibraryNoticeOpen, setIsLibraryNoticeOpen] = useState<boolean>(false)
  const [isPoiNoticeOpen, setIsPoiNoticeOpen] = useState<boolean>(false)
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState<boolean>(false)
  const [isCameraFollowing, setIsCameraFollowing] = useState<boolean>(false)
  const [locationViewRevision, setLocationViewRevision] = useState<number>(0)

  const { role, user } = useAuth()
  const [issueReports, setIssueReports] = useState<CampusIssueReport[]>([])

  useEffect(() => {
    // Only load issue records if authorized role (never visitor)
    if (role === 'visitor') {
      setIssueReports([])
      return
    }
    setIssueReports(issueService.getIssuesForRole(role, user?.id))
    const unsubscribe = issueService.onChange(() => {
      setIssueReports(issueService.getIssuesForRole(role, user?.id))
    })
    return () => unsubscribe()
  }, [role, user?.id])

  const handleTourBuildingSelect = useCallback((buildingId: string | null) => {
    setSelectedBuildingId(buildingId ?? '')
  }, [])
  const tour = useCampusTour(handleTourBuildingSelect)
  const { isSaved, toggle: toggleSaved } = useSavedLocations()

  const { startTour } = tour
  // Auto-launch tour if requested via URL query param (e.g. /explore?tour=true)
  useEffect(() => {
    if (searchParams.get('tour') === 'true') {
      const mode = searchParams.get('mode') === 'highlights' ? 'highlights' : 'full'
      startTour(mode)
    }
  }, [searchParams, startTour])

  // React to URL search params (e.g., /explore?focus=it-block or /explore?building=main-block)
  useEffect(() => {
    const focusId = searchParams.get('focus') || searchParams.get('building')
    if (focusId && (buildings.some((b) => b.id === focusId) || CAMPUS_SERVICE_POIS.some((p) => p.id === focusId))) {
      setSelectedBuildingId(focusId)
      setIsCardCollapsed(false)
    }
  }, [searchParams])

  // GPS state
  const {
    isTracking,
    serviceStatus,
    classification,
    calibrationModel,
    geofence,
    isTestMode,
    startLocation,
    stopLocation,
    toggleTestMode,
    injectTestPosition,
    updateControlPoints,
    resetToDefaultCalibration,
  } = useGpsLocation()

  const selectedBuilding = useMemo(
    () => buildings.find((building) => building.id === selectedBuildingId) ?? null,
    [selectedBuildingId],
  )

  const selectedPoi = useMemo(
    () => (selectedBuildingId ? findCampusPoi(selectedBuildingId) : null),
    [selectedBuildingId],
  )

  const selectedMapping = selectedBuildingId ? campusModelMapById[selectedBuildingId as keyof typeof campusModelMapById] ?? null : null
  const availableFloors = useMemo(() => {
    if (!selectedMapping) {
      return []
    }
    return Object.keys(selectedMapping.floorObjects).map((floor) => floor.toUpperCase())
  }, [selectedMapping])

  useEffect(() => {
    if (availableFloors.length > 0 && !availableFloors.includes(selectedFloor.toUpperCase())) {
      setSelectedFloor(availableFloors[0])
    }
  }, [availableFloors, selectedFloor])

  // Accurate counts for all campus categories
  const categoryCounts = useMemo(() => {
    const counts: Record<CategoryFilter, number> = {
      All: buildings.length,
      Academic: 0,
      Department: 0,
      Facility: 0,
    }
    for (const b of buildings) {
      if (b.category === 'Academic') counts.Academic++
      else if (b.category === 'Department') counts.Department++
      else if (b.category === 'Facility') counts.Facility++
    }
    return counts
  }, [])

  // Filtered buildings list for search & category filters (supports name, category, and known aliases)
  const filteredBuildings = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return buildings.filter((b) => {
      const matchesCategory = selectedCategory === 'All' || b.category === selectedCategory
      if (!matchesCategory) return false
      if (!q) return true
      const nameMatch = b.name.toLowerCase().includes(q)
      const catMatch = b.category.toLowerCase().includes(q)
      const aliasMatch = b.aliases?.some((a) => a.toLowerCase().includes(q)) ?? false
      return nameMatch || catMatch || aliasMatch
    })
  }, [searchQuery, selectedCategory])

  // Filtered POIs for search query matching
  const filteredPois = useMemo(() => {
    if (!searchQuery.trim()) return []
    return searchCampusPois(searchQuery)
  }, [searchQuery])

  return (
    <div className="relative h-[calc(100vh-3.5rem)] md:h-screen w-full overflow-hidden bg-[#101827]">
      {/* 3D Campus Scene: Centerpiece taking 100% of viewport */}
      <div className="absolute inset-0 z-0">
        <Campus3D
          key={`explorer-3d-${locationViewRevision}`}
          className="h-full w-full"
          showHud={false}
          showInstructionBadge={false}
          selectedFloor={selectedFloor}
          selectedBuildingId={selectedBuildingId}
          userLocationPoint={classification.modelPoint}
          userLocationAccuracyRadius={classification.accuracyRadiusModel ?? undefined}
          userLocationIsSimulated={classification.isSimulated}
          userLocationLabel={classification.isSimulated ? 'Simulated Location (Test Mode)' : 'Your Location'}
          viewTarget={isCameraFollowing && classification.modelPoint ? 'location' : 'campus'}
          onBuildingSelect={(id) => {
            setSelectedBuildingId(id ?? '')
            setIsCardCollapsed(false)
            setIsCameraFollowing(false)
          }}
          isTourActive={tour.isTourActive}
          activeTourStop={tour.currentStop}
          onTourCameraArrived={tour.handleCameraArrived}
          issueReports={issueReports}
          onIssueSelect={(report) => {
            if (report.buildingId) {
              setSelectedBuildingId(report.buildingId)
              setIsCardCollapsed(false)
              setIsCameraFollowing(false)
            }
          }}
        />
      </div>

      {/* Cinematic Campus Tour Overlay (Controlled by Phase 7F.2 state machine) */}
      <CampusTourOverlay tour={tour} />

      {/* Floating UI Layer for Campus Exploration */}
      <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
        {/* Floating Top Search Bar & Category Filters */}
        {!tour.isTourActive && (
          <div className="pointer-events-none absolute inset-x-3 top-3 z-30 flex justify-center md:inset-x-auto md:left-4 md:top-4 md:w-96">
            <div className="pointer-events-auto w-full">
              {/* Floating Search Input */}
              <div className="relative flex items-center rounded-2xl border border-[#293A50] bg-[#192638]/95 px-3.5 py-2.5 shadow-xl backdrop-blur-xl">
                <Search size={18} className="text-[#60A5FA] shrink-0 mr-2.5" />
                <input
                  type="text"
                  id="campus-search-input"
                  data-testid="campus-search-input"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  placeholder="Search buildings, labs, departments..."
                  className="w-full bg-transparent text-xs sm:text-sm font-semibold text-white placeholder-[#94A3B8] focus:outline-none"
                />
                {searchQuery ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('')
                      setIsSearchFocused(false)
                    }}
                    className="text-[#94A3B8] hover:text-white transition p-1 cursor-pointer"
                    aria-label="Clear search"
                  >
                    <X size={15} />
                  </button>
                ) : (
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#94A3B8] hidden sm:inline px-1.5 py-0.5 rounded bg-[#162235]">
                    ESC
                  </span>
                )}
              </div>

              {/* Category Pills Bar */}
              <div className="mt-2 flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    id={`filter-category-${cat.toLowerCase()}`}
                    data-testid={`filter-category-${cat.toLowerCase()}`}
                    onClick={() => {
                      setSelectedCategory(cat)
                      setIsSearchFocused(true)
                    }}
                    className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-[11px] font-bold transition-all shrink-0 cursor-pointer shadow-sm ${
                      selectedCategory === cat
                        ? 'bg-[#2563EB] text-white shadow-blue-500/20'
                        : 'bg-[#162235] text-[#94A3B8] border border-[#293A50] hover:bg-[#192638] hover:text-white'
                    }`}
                  >
                    <span>{cat}</span>
                    <span
                      className={`rounded-full px-1.5 py-0.2 text-[9px] font-black ${
                        selectedCategory === cat ? 'bg-white/25 text-white' : 'bg-[#24364D] text-[#94A3B8]'
                      }`}
                    >
                      {categoryCounts[cat]}
                    </span>
                  </button>
                ))}
              </div>

              {/* Search Autocomplete / Discoverable Locations Results Dropdown */}
              {(isSearchFocused || searchQuery.trim().length > 0) && (
                <div
                  id="search-results-dropdown"
                  data-testid="search-results-dropdown"
                  className="absolute inset-x-0 top-full mt-2 max-h-72 overflow-y-auto rounded-2xl border border-[#293A50] bg-[#192638] p-1.5 shadow-2xl z-50"
                >
                  <div className="flex items-center justify-between px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#94A3B8] border-b border-[#293A50] mb-1">
                    <span>
                      {selectedCategory === 'All' ? 'All Mapped Locations' : `${selectedCategory} Locations`} (
                      {filteredBuildings.length + filteredPois.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsSearchFocused(false)}
                      className="text-[#94A3B8] hover:text-white cursor-pointer"
                      aria-label="Close location list"
                    >
                      <X size={12} />
                    </button>
                  </div>

                  {/* Registered Primary Campus Buildings */}
                  {filteredBuildings.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      id={`location-result-${b.id}`}
                      data-testid={`location-result-${b.id}`}
                      onClick={() => {
                        setSelectedBuildingId(b.id)
                        setIsSearchFocused(false)
                        setSearchQuery('')
                        setIsCardCollapsed(false)
                      }}
                      className="flex w-full items-center justify-between rounded-xl p-2 text-left hover:bg-[#24364D] transition cursor-pointer"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="text-xs font-bold text-[#F1F5F9] truncate">{b.name}</div>
                        <div className="text-[10px] text-[#94A3B8] font-medium truncate">
                          {b.aliases && b.aliases.length > 0 ? b.aliases.slice(0, 2).join(', ') : b.floorInfo.label}
                        </div>
                      </div>
                      <span className="rounded-md bg-[#162235] px-1.5 py-0.5 text-[9px] font-bold text-[#60A5FA] uppercase border border-[#293A50] shrink-0">
                        {b.category}
                      </span>
                    </button>
                  ))}

                  {/* Provisional Campus Service POIs (Apollo Shine & Xerox Shop) */}
                  {filteredPois.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      id={`location-result-${p.id}`}
                      data-testid={`location-result-${p.id}`}
                      onClick={() => {
                        setSelectedBuildingId(p.id)
                        setIsSearchFocused(false)
                        setSearchQuery('')
                        setIsCardCollapsed(false)
                      }}
                      className="flex w-full items-center justify-between rounded-xl p-2 text-left hover:bg-[#24364D] border border-amber-500/30 bg-amber-950/20 my-0.5 transition cursor-pointer"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="text-xs font-bold text-amber-300 truncate flex items-center gap-1.5">
                          {p.id === 'apollo-shine' ? <HeartPulse size={12} className="text-rose-400 shrink-0" /> : <Printer size={12} className="text-[#60A5FA] shrink-0" />}
                          <span>{p.name}</span>
                        </div>
                        <div className="text-[10px] text-[#94A3B8] font-medium truncate">
                          Frontage • {p.aliases.slice(0, 2).join(', ')}
                        </div>
                      </div>
                      <span className="rounded-md bg-amber-900/40 px-1.5 py-0.5 text-[9px] font-bold text-amber-300 uppercase border border-amber-600/40 shrink-0">
                        Provisional
                      </span>
                    </button>
                  ))}

                  {filteredBuildings.length === 0 && filteredPois.length === 0 && (
                    <div className="p-3 text-center text-xs text-[#94A3B8] font-medium">
                      No {selectedCategory !== 'All' ? selectedCategory.toLowerCase() : ''} locations found matching &quot;{searchQuery}&quot;
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Floating Top-Right Tools on Desktop: Take Campus Tour + GPS Location & Feedback */}
        {!tour.isTourActive && (
          <div className="pointer-events-none absolute hidden md:flex right-4 top-4 z-30 items-center gap-2">
            {/* Take Campus Tour CTA */}
            <button
              type="button"
              id="btn-take-campus-tour"
              data-testid="btn-take-campus-tour"
              onClick={() => tour.startTour('full')}
              className="pointer-events-auto flex h-10 items-center gap-2 rounded-xl bg-[#2563EB] hover:bg-blue-700 px-4 text-xs font-extrabold text-white shadow-md shadow-blue-600/20 hover:scale-[1.01] active:scale-[0.99] transition cursor-pointer"
              title="Take interactive 3D virtual tour of MNMJEC"
            >
              <Sparkles size={15} className="text-white" />
              <span>Take Campus Tour</span>
            </button>

            <div className="pointer-events-auto flex items-center gap-1.5 rounded-xl border border-[#293A50] bg-[#162235]/95 p-1 shadow-card backdrop-blur-xl">
              <GpsLocationButton
                isTracking={isTracking}
                serviceStatus={serviceStatus}
                positionStatus={classification.status}
                isTestMode={isTestMode}
                onStart={startLocation}
                onStop={stopLocation}
              />

              {/* Recenter & Follow Controls when transformed 3D location exists */}
              {classification.modelPoint && (
                <button
                  id="btn-recenter-my-location"
                  data-testid="btn-recenter-my-location"
                  type="button"
                  onClick={() => {
                    setIsCameraFollowing(true)
                    setLocationViewRevision((r) => r + 1)
                  }}
                  className={`flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-bold transition cursor-pointer border ${
                    isCameraFollowing
                      ? 'border-[#34D399] bg-[#34D399]/20 text-[#34D399]'
                      : 'border-[#293A50] bg-[#192638] text-[#94A3B8] hover:text-white hover:bg-[#24364D]'
                  }`}
                  title={isCameraFollowing ? 'Following location' : 'Recenter camera on your location'}
                >
                  <Crosshair size={13} className={isCameraFollowing ? 'text-[#34D399]' : 'text-[#60A5FA]'} />
                  <span className="hidden lg:inline text-[11px]">
                    {isCameraFollowing ? 'Following' : 'Recenter'}
                  </span>
                </button>
              )}

              <button
                id="btn-give-visitor-feedback"
                data-testid="btn-give-visitor-feedback"
                type="button"
                onClick={() => setIsFeedbackModalOpen(true)}
                className="flex h-8 items-center gap-1.5 rounded-lg border border-[#293A50] bg-[#192638] hover:bg-[#24364D] px-2.5 text-xs font-semibold text-[#94A3B8] hover:text-white transition cursor-pointer"
                title="Give Website & Navigation Feedback"
              >
                <MessageSquare size={13} className="text-[#60A5FA]" />
                <span className="hidden sm:inline text-[11px] font-bold">Feedback</span>
              </button>
            </div>
          </div>
        )}

        {/* GPS Live Status Banner (top-center float) */}
        {!tour.isTourActive && classification.status !== 'idle' && (
          <div className="pointer-events-none absolute inset-x-4 top-20 z-30 flex justify-center md:top-4">
            <div className="pointer-events-auto max-w-lg w-full">
              <GpsStatusBanner
                classification={classification}
                geofence={geofence}
                onStop={stopLocation}
                onOpenCalibration={() => setIsCalibrationOpen(true)}
              />
            </div>
          </div>
        )}

        {/* Floating Bottom Card / Collapsible Sheet: Selected Building Information */}
        {!tour.isTourActive && selectedBuilding && (
          <div className="pointer-events-none absolute inset-x-3 bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] z-30 flex justify-center md:inset-x-auto md:left-4 md:bottom-5 md:max-w-md md:w-full">
            <div className="pointer-events-auto w-full rounded-3xl border border-[#293A50] bg-[#192638]/95 p-4 shadow-2xl backdrop-blur-xl text-[#F1F5F9]">
              {/* Card Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-[#162235] px-2 py-0.5 text-[10px] font-bold tracking-wider text-[#60A5FA] uppercase border border-[#293A50]">
                      {selectedBuilding.category}
                    </span>
                    <span className="text-[11px] font-medium text-[#94A3B8]">
                      {selectedBuilding.floorInfo.label}
                    </span>
                  </div>
                  <h2 className="mt-1.5 text-base font-extrabold tracking-tight text-white truncate">
                    {selectedBuilding.name}
                  </h2>
                  {selectedBuilding.knownEntrance && (
                    <p className="mt-0.5 text-[11px] text-[#94A3B8] flex items-center gap-1 truncate font-medium">
                      <MapPin size={11} className="text-[#60A5FA] shrink-0" />
                      <span>{selectedBuilding.knownEntrance}</span>
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => toggleSaved(selectedBuilding.id)}
                    className={`flex h-8 w-8 items-center justify-center rounded-full border transition cursor-pointer ${
                      isSaved(selectedBuilding.id)
                        ? 'border-amber-400 bg-amber-500/20 text-amber-300'
                        : 'border-[#293A50] text-[#94A3B8] hover:bg-[#24364D] hover:text-white'
                    }`}
                    title={isSaved(selectedBuilding.id) ? 'Remove from saved' : 'Save location'}
                  >
                    {isSaved(selectedBuilding.id) ? <Star size={15} fill="currentColor" /> : <BookmarkPlus size={15} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCardCollapsed(!isCardCollapsed)}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-[#94A3B8] hover:bg-[#24364D] hover:text-white transition md:hidden cursor-pointer"
                    title={isCardCollapsed ? 'Expand panel' : 'Collapse panel'}
                  >
                    {isCardCollapsed ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedBuildingId('')}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-[#94A3B8] hover:text-white hover:bg-[#24364D] transition cursor-pointer"
                    title="Close inspection"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Collapsible Details Body */}
              {!isCardCollapsed && (
                <>
                  {/* Floor Switcher if known floors exist */}
                  {availableFloors.length > 0 && (
                    <div className="mt-3 border-t border-[#293A50] pt-2.5">
                      <div className="flex items-center justify-between text-[11px] mb-1.5">
                        <span className="font-bold text-slate-300">Floor Level</span>
                        <span className="text-[#94A3B8]">
                          {selectedMapping?.indoorAvailable ? 'Indoor mapped' : 'Provisional floor levels'}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {availableFloors.map((floor) => (
                          <button
                            key={floor}
                            type="button"
                            onClick={() => setSelectedFloor(floor)}
                            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                              selectedFloor.toUpperCase() === floor
                                ? 'bg-[#2563EB] text-white shadow-sm shadow-blue-500/20'
                                : 'bg-[#162235] text-[#94A3B8] border border-[#293A50] hover:bg-[#24364D] hover:text-white'
                            }`}
                          >
                            Floor {floor}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Provisional status note for Dr. C. L. Mehta Central Library */}
                  {selectedBuilding.id === 'library' && (
                    <div className="mt-3 rounded-2xl border border-amber-500/30 bg-amber-950/20 p-3 text-[11px] text-amber-300">
                      <div className="flex items-center gap-1.5 font-bold text-amber-400">
                        <AlertCircle size={14} className="shrink-0" />
                        <span>Provisional 3D Placement</span>
                      </div>
                      <p className="mt-1 text-[#94A3B8] leading-snug">
                        Stage E3 position is provisional. Physical surveyor verification of entrance coordinates, floor layout, and walkway route is pending.
                      </p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="mt-4 flex items-center gap-2 border-t border-[#293A50] pt-3">
                    {selectedBuilding.id === 'library' ? (
                      <button
                        type="button"
                        id="btn-library-directions"
                        onClick={() => setIsLibraryNoticeOpen(true)}
                        className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-amber-900/40 hover:bg-amber-800/40 border border-amber-600/40 py-2.5 text-xs font-bold text-amber-300 cursor-pointer transition"
                      >
                        <Route size={14} className="text-amber-400" />
                        <span>Directions (Pending)</span>
                      </button>
                    ) : (
                      <Link
                        to={`/navigation?to=${selectedBuilding.id}`}
                        className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#2563EB] hover:bg-blue-600 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-600/20 hover:scale-[1.01] active:scale-[0.99] transition"
                      >
                        <Route size={14} className="text-white" />
                        <span>Get Directions</span>
                      </Link>
                    )}
                    <Link
                      to={`/building/${selectedBuilding.id}`}
                      className="flex items-center justify-center gap-1.5 rounded-xl border border-[#293A50] bg-[#162235] px-3.5 py-2.5 text-xs font-semibold text-white hover:bg-[#24364D] transition"
                    >
                      <Info size={14} />
                      <span>Details</span>
                    </Link>
                  </div>
                </>
              )}

              {/* Quick Compact Action when collapsed */}
              {isCardCollapsed && (
                <div className="mt-2.5 flex items-center justify-between border-t border-[#293A50] pt-2">
                  <span className="text-[11px] text-[#94A3B8]">
                    {selectedBuilding.id === 'library' ? 'Provisional placement' : 'Tap expand for floor levels'}
                  </span>
                  {selectedBuilding.id === 'library' ? (
                    <button
                      type="button"
                      onClick={() => setIsLibraryNoticeOpen(true)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-amber-900/40 border border-amber-600/40 px-3 py-1 text-[11px] font-bold text-amber-300 cursor-pointer"
                    >
                      <Route size={12} />
                      <span>Directions</span>
                    </button>
                  ) : (
                    <Link
                      to={`/navigation?to=${selectedBuilding.id}`}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#2563EB] px-3 py-1 text-[11px] font-bold text-white hover:bg-blue-600"
                    >
                      <Route size={12} />
                      <span>Directions</span>
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Floating Bottom Card: Selected Provisional Service POI (Apollo Shine or Xerox Shop) */}
        {!tour.isTourActive && !selectedBuilding && selectedPoi && (
          <div className="pointer-events-none absolute inset-x-3 bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] z-30 flex justify-center md:inset-x-auto md:left-4 md:bottom-5 md:max-w-md md:w-full">
            <div className="pointer-events-auto w-full rounded-3xl border border-amber-500/30 bg-[#192638]/95 p-4 shadow-2xl backdrop-blur-xl text-[#F1F5F9]">
              {/* Card Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-amber-900/40 px-2 py-0.5 text-[10px] font-bold tracking-wider text-amber-300 uppercase border border-amber-600/40">
                      Facility • Provisional POI
                    </span>
                    <span className="text-[11px] font-medium text-[#94A3B8]">
                      Campus Services Area
                    </span>
                  </div>
                  <h2 className="mt-1.5 text-base font-extrabold tracking-tight text-white truncate flex items-center gap-2">
                    {selectedPoi.id === 'apollo-shine' ? (
                      <HeartPulse className="h-4 w-4 text-rose-400 shrink-0" />
                    ) : (
                      <Printer className="h-4 w-4 text-[#60A5FA] shrink-0" />
                    )}
                    <span>{selectedPoi.name}</span>
                  </h2>
                  <p className="mt-0.5 text-[11px] text-[#94A3B8] flex items-center gap-1 truncate font-medium">
                    <MapPin size={11} className="text-amber-400 shrink-0" />
                    <span>Campus Service Frontage (West of Main Gate 1)</span>
                  </p>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => setSelectedBuildingId('')}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-[#94A3B8] hover:text-white hover:bg-[#24364D] transition cursor-pointer"
                    title="Close inspection"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="mt-3 border-t border-[#293A50] pt-2.5">
                <p className="text-xs text-[#94A3B8] leading-relaxed">
                  {selectedPoi.description}
                </p>

                {/* Provisional Notice */}
                <div className="mt-3 rounded-2xl border border-amber-500/30 bg-amber-950/20 p-3 text-[11px] text-amber-300">
                  <div className="flex items-center gap-1.5 font-bold text-amber-400">
                    <AlertCircle size={14} className="shrink-0" />
                    <span>Provisional Landmark Notice</span>
                  </div>
                  <p className="mt-1 text-[#94A3B8] leading-snug">
                    {selectedPoi.provisionalNotice}
                  </p>
                </div>

                {/* Actions */}
                <div className="mt-4 flex items-center gap-2 border-t border-[#293A50] pt-3">
                  <button
                    type="button"
                    id={`btn-${selectedPoi.id}-directions`}
                    data-testid={`btn-${selectedPoi.id}-directions`}
                    onClick={() => setIsPoiNoticeOpen(true)}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-amber-900/40 hover:bg-amber-800/40 border border-amber-600/40 py-2.5 text-xs font-bold text-amber-300 cursor-pointer transition"
                  >
                    <Route size={14} className="text-amber-400" />
                    <span>Directions (Pending)</span>
                  </button>
                  <Link
                    to="/navigation?to=main-gate-1"
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-[#293A50] bg-[#162235] px-3.5 py-2.5 text-xs font-semibold text-white hover:bg-[#24364D] transition"
                  >
                    <MapPin size={14} />
                    <span>Gate 1</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal explaining Library route is pending physical verification */}
        {isLibraryNoticeOpen && (
          <div className="fixed inset-0 z-[9999] isolate flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-3xl border border-[#293A50] bg-[#192638] p-5 shadow-2xl text-[#F1F5F9]">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                <AlertCircle size={18} />
                <span>Library Route Pending Verification</span>
              </div>
              <p className="mt-2.5 text-xs text-[#94A3B8] leading-relaxed">
                The 3D model for <span className="font-semibold text-white">Dr. C. L. Mehta Central Library</span> is provisionally integrated in Stage E3.
                Precise entrance coordinates and walkway connections are pending on-site surveyor confirmation.
              </p>
              <p className="mt-2 text-[11px] text-[#64748B]">
                You can navigate to adjacent verified buildings such as Main Block or First Year Block.
              </p>
              <div className="mt-5 flex gap-2">
                <Link
                  to="/navigation?to=main-block"
                  onClick={() => setIsLibraryNoticeOpen(false)}
                  className="flex-1 rounded-xl bg-[#2563EB] hover:bg-blue-600 py-2.5 text-center text-xs font-bold text-white transition shadow-sm"
                >
                  Route to Main Block
                </Link>
                <button
                  type="button"
                  onClick={() => setIsLibraryNoticeOpen(false)}
                  className="rounded-xl border border-[#293A50] bg-[#162235] px-3.5 py-2.5 text-xs font-semibold text-[#94A3B8] hover:text-white hover:bg-[#24364D] cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal explaining Provisional Service POI route is pending physical verification */}
        {isPoiNoticeOpen && selectedPoi && (
          <div className="fixed inset-0 z-[9999] isolate flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-3xl border border-[#293A50] bg-[#192638] p-5 shadow-2xl text-[#F1F5F9]">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                <AlertCircle size={18} />
                <span>{selectedPoi.name} Route Notice</span>
              </div>
              <p className="mt-2.5 text-xs text-[#94A3B8] leading-relaxed">
                {selectedPoi.name} is identified along the campus service frontage near Main Gate 1. Exact doorway coordinates and pedestrian graph connections are pending surveyor verification.
              </p>
              <p className="mt-2 text-[11px] text-[#64748B]">
                You can navigate to Main Gate 1 for closest verified pedestrian approach.
              </p>
              <div className="mt-5 flex gap-2">
                <Link
                  to="/navigation?to=main-gate-1"
                  onClick={() => setIsPoiNoticeOpen(false)}
                  className="flex-1 rounded-xl bg-[#2563EB] hover:bg-blue-600 py-2.5 text-center text-xs font-bold text-white transition shadow-sm"
                >
                  Route to Gate 1
                </Link>
                <button
                  type="button"
                  onClick={() => setIsPoiNoticeOpen(false)}
                  className="rounded-xl border border-[#293A50] bg-[#162235] px-3.5 py-2.5 text-xs font-semibold text-[#94A3B8] hover:text-white hover:bg-[#24364D] cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Campus Calibration & GPS Test Utility Modal (Preserved in DOM for testing & dev access) */}
      <CampusCalibrationModal
        isOpen={isCalibrationOpen}
        onClose={() => setIsCalibrationOpen(false)}
        calibrationModel={calibrationModel}
        geofence={geofence}
        onUpdateControlPoints={updateControlPoints}
        onResetCalibration={resetToDefaultCalibration}
        isTestMode={isTestMode}
        onToggleTestMode={toggleTestMode}
        onInjectTestPosition={injectTestPosition}
      />

      {/* Visitor Experience & Usability Feedback Modal */}
      <VisitorFeedbackModal
        isOpen={isFeedbackModalOpen}
        onClose={() => setIsFeedbackModalOpen(false)}
      />
    </div>
  )
}
