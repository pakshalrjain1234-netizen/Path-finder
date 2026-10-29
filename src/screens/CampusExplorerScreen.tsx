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
    if (
      availableFloors.length > 0 &&
      selectedFloor.toUpperCase() !== 'ALL' &&
      !availableFloors.includes(selectedFloor.toUpperCase())
    ) {
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
    <div className="relative h-[calc(100vh-3.5rem)] md:h-screen w-full overflow-hidden bg-[#E8DDF2]">
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
          userLocationLabel={
            classification.isSimulated
              ? 'Simulated Location (Test Mode)'
              : classification.rawCoordinates &&
                  typeof classification.rawCoordinates.accuracy === 'number' &&
                  Number.isFinite(classification.rawCoordinates.accuracy) &&
                  classification.rawCoordinates.accuracy >= 0
                ? `Your Location (±${classification.rawCoordinates.accuracy.toFixed(0)}m)`
                : 'Your Location'
          }
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
              <div className="relative flex items-center rounded-2xl border border-[#C9B6DF] bg-[#FBF8FD]/95 px-3.5 py-2.5 shadow-dream-card backdrop-blur-md">
                <Search size={18} className="text-[#352A47] shrink-0 mr-2.5" />
                <input
                  type="text"
                  id="campus-search-input"
                  data-testid="campus-search-input"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  placeholder="Search buildings, labs, departments..."
                  className="w-full bg-transparent text-xs sm:text-sm font-sans font-medium text-[#352A47] placeholder-[#7E708E] focus:outline-none"
                />
                {searchQuery ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('')
                      setIsSearchFocused(false)
                    }}
                    className="text-[#51465F] hover:text-[#352A47] transition p-1 cursor-pointer"
                    aria-label="Clear search"
                  >
                    <X size={15} />
                  </button>
                ) : (
                  <span className="text-[10px] font-heading font-bold uppercase tracking-wider text-[#51465F] hidden sm:inline px-2 py-0.5 rounded-lg bg-[#E8DDF2] border border-[#C9B6DF]">
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
                    className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[11px] font-heading font-bold transition-all shrink-0 cursor-pointer shadow-2xs ${
                      selectedCategory === cat
                        ? 'bg-[#352A47] text-[#FAF6FD]'
                        : 'bg-[#FBF8FD]/90 text-[#51465F] border border-[#C9B6DF] hover:bg-[#E8DDF2] hover:text-[#352A47]'
                    }`}
                  >
                    <span>{cat}</span>
                    <span
                      className={`rounded-full px-1.5 py-0.2 text-[9px] font-bold ${
                        selectedCategory === cat ? 'bg-white/20 text-[#FAF6FD]' : 'bg-[#D2BEE7]/60 text-[#352A47]'
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
                  className="absolute inset-x-0 top-full mt-2 max-h-72 overflow-y-auto rounded-2xl border border-[#C9B6DF] bg-[#FBF8FD] p-2 shadow-dream-elevated z-50 text-[#352A47]"
                >
                  <div className="flex items-center justify-between px-2.5 py-1.5 text-[10px] font-heading font-bold uppercase tracking-wider text-[#51465F] border-b border-[#C9B6DF] mb-1">
                    <span>
                      {selectedCategory === 'All' ? 'All Mapped Locations' : `${selectedCategory} Locations`} (
                      {filteredBuildings.length + filteredPois.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsSearchFocused(false)}
                      className="text-[#51465F] hover:text-[#352A47] cursor-pointer"
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
                      className="flex w-full items-center justify-between rounded-xl p-2.5 text-left hover:bg-[#E8DDF2] transition cursor-pointer"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="text-xs font-heading font-bold text-[#352A47] truncate">{b.name}</div>
                        <div className="text-[10px] text-[#51465F] font-sans font-medium truncate">
                          {b.aliases && b.aliases.length > 0 ? b.aliases.slice(0, 2).join(', ') : b.floorInfo.label}
                        </div>
                      </div>
                      <span className="rounded-md bg-[#D2BEE7] px-2 py-0.5 text-[9px] font-heading font-bold text-[#352A47] uppercase border border-[#C9B6DF] shrink-0">
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
                      className="flex w-full items-center justify-between rounded-xl p-2.5 text-left hover:bg-[#E8DDF2] border border-[#D7A894] bg-[#F5E6DF] my-1 transition cursor-pointer"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="text-xs font-heading font-bold text-[#9E563A] truncate flex items-center gap-1.5">
                          {p.id === 'apollo-shine' ? <HeartPulse size={12} className="text-rose-500 shrink-0" /> : <Printer size={12} className="text-[#9E563A] shrink-0" />}
                          <span>{p.name}</span>
                        </div>
                        <div className="text-[10px] text-[#51465F] font-sans font-medium truncate">
                          Frontage • {p.aliases.slice(0, 2).join(', ')}
                        </div>
                      </div>
                      <span className="rounded-md bg-[#E8C8B9] px-2 py-0.5 text-[9px] font-heading font-bold text-[#9E563A] uppercase border border-[#D7A894] shrink-0">
                        Provisional
                      </span>
                    </button>
                  ))}

                  {filteredBuildings.length === 0 && filteredPois.length === 0 && (
                    <div className="p-3 text-center text-xs text-[#51465F] font-sans font-medium">
                      No {selectedCategory !== 'All' ? selectedCategory.toLowerCase() : ''} locations found matching &quot;{searchQuery}&quot;
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Floating Tools: Take Campus Tour (Desktop) + GPS Location & Feedback */}
        {!tour.isTourActive && (
          <div className="pointer-events-none absolute right-3 top-[6.75rem] md:right-4 md:top-4 z-30 flex items-center gap-2">
            {/* Take Campus Tour CTA (Desktop only - mobile accesses tour via bottom nav) */}
            <button
              type="button"
              id="btn-take-campus-tour"
              data-testid="btn-take-campus-tour"
              onClick={() => tour.startTour('full')}
              className="pointer-events-auto hidden md:flex h-10 items-center gap-2 rounded-2xl border border-[#D7A894] bg-[#E8C8B9] hover:bg-[#DEC0B0] px-4 text-xs font-heading font-bold text-[#352A47] shadow-dream-soft transition-all hover:-translate-y-0.5 cursor-pointer"
              title="Take interactive 3D virtual tour of MNMJEC"
            >
              <Sparkles size={15} className="text-[#352A47]" />
              <span>Take Campus Tour</span>
            </button>

            <div className="pointer-events-auto flex items-center gap-1.5 rounded-2xl border border-[#C9B6DF] bg-[#FBF8FD]/95 p-1.5 shadow-dream-card backdrop-blur-md">
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
                  className={`flex h-8 items-center gap-1 rounded-xl px-2.5 text-xs font-heading font-bold transition cursor-pointer border ${
                    isCameraFollowing
                      ? 'border-[#94BCA7] bg-[#BCD8C9] text-[#1E583F]'
                      : 'border-[#C9B6DF] bg-[#E8DDF2] text-[#51465F] hover:text-[#352A47] hover:bg-[#D2BEE7]'
                  }`}
                  title={isCameraFollowing ? 'Following location' : 'Recenter camera on your location'}
                >
                  <Crosshair size={13} className={isCameraFollowing ? 'text-[#1E583F]' : 'text-[#352A47]'} />
                  <span className="hidden lg:inline text-[11px]">
                    {isCameraFollowing ? 'Following' : 'Recenter'}
                  </span>
                </button>
              )}

              {/* Feedback CTA (Desktop only - mobile accesses feedback via mobile header) */}
              <button
                id="btn-give-visitor-feedback"
                data-testid="btn-give-visitor-feedback"
                type="button"
                onClick={() => setIsFeedbackModalOpen(true)}
                className="hidden md:flex h-8 items-center gap-1.5 rounded-xl border border-[#C9B6DF] bg-[#E8DDF2] hover:bg-[#D2BEE7] px-3 text-xs font-heading font-bold text-[#352A47] transition cursor-pointer"
                title="Give Website & Navigation Feedback"
              >
                <MessageSquare size={13} className="text-[#352A47]" />
                <span className="hidden sm:inline text-[11px] font-semibold">Feedback</span>
              </button>
            </div>
          </div>
        )}

        {/* GPS Live Status Banner (top-center float, placed below category bar on mobile) */}
        {!tour.isTourActive && classification.status !== 'idle' && (
          <div className="pointer-events-none absolute inset-x-4 top-36 md:top-4 z-30 flex justify-center">
            <div className="pointer-events-auto max-w-lg w-full">
              <GpsStatusBanner
                classification={classification}
                calibrationModel={calibrationModel}
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
            <div className="pointer-events-auto w-full rounded-3xl border border-[#C9B6DF] bg-[#FBF8FD]/95 p-5 shadow-dream-card backdrop-blur-md text-[#352A47]">
              {/* Card Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-[#D2BEE7] px-3 py-0.5 text-[10px] font-heading font-bold tracking-wider text-[#352A47] uppercase border border-[#C9B6DF]">
                      {selectedBuilding.category}
                    </span>
                    <span className="text-xs font-sans font-medium text-[#51465F]">
                      {selectedBuilding.floorInfo.label}
                    </span>
                  </div>
                  <h2 className="mt-1.5 font-heading text-lg font-extrabold tracking-tight text-[#352A47] truncate">
                    {selectedBuilding.name}
                  </h2>
                  {selectedBuilding.knownEntrance && (
                    <p className="mt-0.5 text-xs text-[#51465F] font-sans flex items-center gap-1 truncate font-medium">
                      <MapPin size={12} className="text-[#352A47] shrink-0" />
                      <span>{selectedBuilding.knownEntrance}</span>
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => toggleSaved(selectedBuilding.id)}
                    className={`flex h-10 w-10 sm:h-8 sm:w-8 items-center justify-center rounded-xl border transition cursor-pointer touch-target ${
                      isSaved(selectedBuilding.id)
                        ? 'border-[#D7A894] bg-[#E8C8B9] text-[#9E563A]'
                        : 'border-[#C9B6DF] bg-[#E8DDF2] text-[#51465F] hover:bg-[#D2BEE7] hover:text-[#352A47]'
                    }`}
                    title={isSaved(selectedBuilding.id) ? 'Remove from saved' : 'Save location'}
                    aria-label={isSaved(selectedBuilding.id) ? 'Remove from saved' : 'Save location'}
                  >
                    {isSaved(selectedBuilding.id) ? <Star size={16} fill="currentColor" /> : <BookmarkPlus size={16} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCardCollapsed(!isCardCollapsed)}
                    className="flex h-10 w-10 sm:h-8 sm:w-8 items-center justify-center rounded-xl text-[#51465F] hover:bg-[#E8DDF2] hover:text-[#352A47] transition md:hidden cursor-pointer touch-target border border-[#C9B6DF]"
                    title={isCardCollapsed ? 'Expand panel' : 'Collapse panel'}
                    aria-label={isCardCollapsed ? 'Expand panel' : 'Collapse panel'}
                  >
                    {isCardCollapsed ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedBuildingId('')}
                    className="flex h-10 w-10 sm:h-8 sm:w-8 items-center justify-center rounded-xl text-[#51465F] hover:text-[#352A47] hover:bg-[#E8DDF2] transition cursor-pointer touch-target border border-[#C9B6DF]"
                    title="Close inspection"
                    aria-label="Close inspection"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Collapsible Details Body */}
              {!isCardCollapsed && (
                <>
                  {/* Floor Switcher if known floors exist */}
                  {availableFloors.length > 0 && (
                    <div className="mt-3.5 border-t border-[#C9B6DF] pt-2.5">
                      <div className="flex items-center justify-between text-[11px] mb-2 font-heading">
                        <span className="font-bold text-[#352A47]">Floor Level</span>
                        <span className="text-[#51465F]">
                          {selectedMapping?.indoorAvailable ? 'Indoor mapped' : 'Provisional floor levels'}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          id="btn-floor-all"
                          onClick={() => setSelectedFloor('ALL')}
                          className={`rounded-xl px-3 py-1.5 text-xs font-heading font-bold transition-all cursor-pointer ${
                            selectedFloor.toUpperCase() === 'ALL'
                              ? 'bg-[#352A47] text-[#FAF6FD] shadow-dream-soft'
                              : 'bg-[#E8DDF2] text-[#51465F] border border-[#C9B6DF] hover:bg-[#D2BEE7] hover:text-[#352A47]'
                          }`}
                        >
                          All Floors
                        </button>
                        {availableFloors.map((floor) => (
                          <button
                            key={floor}
                            type="button"
                            id={`btn-floor-${floor.toLowerCase()}`}
                            onClick={() => setSelectedFloor(floor)}
                            className={`rounded-xl px-3.5 py-1.5 text-xs font-heading font-bold transition-all cursor-pointer ${
                              selectedFloor.toUpperCase() === floor
                                ? 'bg-[#352A47] text-[#FAF6FD] shadow-dream-soft'
                                : 'bg-[#E8DDF2] text-[#51465F] border border-[#C9B6DF] hover:bg-[#D2BEE7] hover:text-[#352A47]'
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
                    <div className="mt-3.5 rounded-2xl border border-[#D7A894] bg-[#F5E6DF] p-3 text-[11px] text-[#9E563A]">
                      <div className="flex items-center gap-1.5 font-heading font-bold text-[#9E563A]">
                        <AlertCircle size={14} className="shrink-0" />
                        <span>Provisional 3D Placement</span>
                      </div>
                      <p className="mt-1 text-[#51465F] font-sans leading-snug">
                        Stage E3 position is provisional. Physical surveyor verification of entrance coordinates, floor layout, and walkway route is pending.
                      </p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="mt-4 flex items-center gap-2.5 border-t border-[#C9B6DF] pt-3.5">
                    {selectedBuilding.id === 'library' ? (
                      <button
                        type="button"
                        id="btn-library-directions"
                        onClick={() => setIsLibraryNoticeOpen(true)}
                        className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#E8C8B9] hover:bg-[#DEC0B0] border border-[#D7A894] py-3 text-xs font-heading font-bold text-[#352A47] cursor-pointer transition shadow-2xs"
                      >
                        <Route size={14} className="text-[#352A47]" />
                        <span>Directions (Pending)</span>
                      </button>
                    ) : (
                      <Link
                        to={`/navigation?to=${selectedBuilding.id}`}
                        className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#352A47] hover:bg-[#433659] py-3 text-xs font-heading font-bold text-[#FAF6FD] shadow-dream-soft transition"
                      >
                        <Route size={14} className="text-[#E8C8B9]" />
                        <span>Get Directions</span>
                      </Link>
                    )}
                    <Link
                      to={`/building/${selectedBuilding.id}`}
                      className="flex items-center justify-center gap-1.5 rounded-2xl border border-[#C9B6DF] bg-[#E8DDF2] px-4 py-3 text-xs font-heading font-bold text-[#352A47] hover:bg-[#D2BEE7] transition"
                    >
                      <Info size={14} />
                      <span>Details</span>
                    </Link>
                  </div>
                </>
              )}

              {/* Quick Compact Action when collapsed */}
              {isCardCollapsed && (
                <div className="mt-2.5 flex items-center justify-between border-t border-[#C9B6DF] pt-2">
                  <span className="text-[11px] font-sans text-[#51465F]">
                    {selectedBuilding.id === 'library' ? 'Provisional placement' : 'Tap expand for floor levels'}
                  </span>
                  {selectedBuilding.id === 'library' ? (
                    <button
                      type="button"
                      onClick={() => setIsLibraryNoticeOpen(true)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-[#E8C8B9] border border-[#D7A894] px-3.5 py-1.5 text-[11px] font-heading font-bold text-[#352A47] cursor-pointer"
                    >
                      <Route size={12} />
                      <span>Directions</span>
                    </button>
                  ) : (
                    <Link
                      to={`/navigation?to=${selectedBuilding.id}`}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-[#352A47] px-3.5 py-1.5 text-[11px] font-heading font-bold text-[#FAF6FD] hover:bg-[#433659]"
                    >
                      <Route size={12} className="text-[#E8C8B9]" />
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
            <div className="pointer-events-auto w-full rounded-3xl border border-[#D7A894] bg-[#FBF8FD]/95 p-5 shadow-dream-card backdrop-blur-md text-[#352A47]">
              {/* Card Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-[#E8C8B9] px-3 py-0.5 text-[10px] font-heading font-bold tracking-wider text-[#9E563A] uppercase border border-[#D7A894]">
                      Facility • Provisional POI
                    </span>
                    <span className="text-xs font-sans font-medium text-[#51465F]">
                      Campus Services Area
                    </span>
                  </div>
                  <h2 className="mt-1.5 font-heading text-lg font-extrabold tracking-tight text-[#352A47] truncate flex items-center gap-2">
                    {selectedPoi.id === 'apollo-shine' ? (
                      <HeartPulse className="h-4 w-4 text-rose-500 shrink-0" />
                    ) : (
                      <Printer className="h-4 w-4 text-[#352A47] shrink-0" />
                    )}
                    <span>{selectedPoi.name}</span>
                  </h2>
                  <p className="mt-0.5 text-xs text-[#51465F] font-sans flex items-center gap-1 truncate font-medium">
                    <MapPin size={12} className="text-[#9E563A] shrink-0" />
                    <span>Campus Service Frontage (West of Main Gate 1)</span>
                  </p>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => setSelectedBuildingId('')}
                    className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#C9B6DF] bg-[#E8DDF2] text-[#51465F] hover:text-[#352A47] hover:bg-[#D2BEE7] transition cursor-pointer"
                    title="Close inspection"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="mt-3.5 border-t border-[#C9B6DF] pt-2.5">
                <p className="text-xs text-[#51465F] font-sans leading-relaxed">
                  {selectedPoi.description}
                </p>

                {/* Provisional Notice */}
                <div className="mt-3.5 rounded-2xl border border-[#D7A894] bg-[#F5E6DF] p-3 text-[11px] text-[#9E563A]">
                  <div className="flex items-center gap-1.5 font-heading font-bold text-[#9E563A]">
                    <AlertCircle size={14} className="shrink-0" />
                    <span>Provisional Landmark Notice</span>
                  </div>
                  <p className="mt-1 text-[#51465F] font-sans leading-snug">
                    {selectedPoi.provisionalNotice}
                  </p>
                </div>

                {/* Actions */}
                <div className="mt-4 flex items-center gap-2.5 border-t border-[#C9B6DF] pt-3.5">
                  <button
                    type="button"
                    id={`btn-${selectedPoi.id}-directions`}
                    data-testid={`btn-${selectedPoi.id}-directions`}
                    onClick={() => setIsPoiNoticeOpen(true)}
                    className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#E8C8B9] hover:bg-[#DEC0B0] border border-[#D7A894] py-3 text-xs font-heading font-bold text-[#352A47] cursor-pointer transition shadow-2xs"
                  >
                    <Route size={14} className="text-[#352A47]" />
                    <span>Directions (Pending)</span>
                  </button>
                  <Link
                    to="/navigation?to=main-gate-1"
                    className="flex items-center justify-center gap-1.5 rounded-2xl border border-[#C9B6DF] bg-[#E8DDF2] px-4 py-3 text-xs font-heading font-bold text-[#352A47] hover:bg-[#D2BEE7] transition"
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
          <div className="fixed inset-0 z-[9999] isolate flex items-center justify-center bg-[#352A47]/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-3xl border border-[#C9B6DF] bg-[#FBF8FD] p-6 shadow-dream-elevated text-[#352A47]">
              <div className="flex items-center gap-2 text-[#9E563A] font-heading font-bold text-sm">
                <AlertCircle size={18} />
                <span>Library Route Pending Verification</span>
              </div>
              <p className="mt-2.5 text-xs text-[#51465F] font-sans leading-relaxed">
                The 3D model for <span className="font-heading font-bold text-[#352A47]">Dr. C. L. Mehta Central Library</span> is provisionally integrated in Stage E3.
                Precise entrance coordinates and walkway connections are pending on-site surveyor confirmation.
              </p>
              <p className="mt-2 text-[11px] text-[#7E708E] font-sans">
                You can navigate to adjacent verified buildings such as Main Block or First Year Block.
              </p>
              <div className="mt-5 flex gap-2.5">
                <Link
                  to="/navigation?to=main-block"
                  onClick={() => setIsLibraryNoticeOpen(false)}
                  className="flex-1 rounded-2xl bg-[#352A47] hover:bg-[#433659] py-3 text-center text-xs font-heading font-bold text-[#FAF6FD] transition shadow-dream-soft"
                >
                  Route to Main Block
                </Link>
                <button
                  type="button"
                  onClick={() => setIsLibraryNoticeOpen(false)}
                  className="rounded-2xl border border-[#C9B6DF] bg-[#E8DDF2] px-4 py-3 text-xs font-heading font-bold text-[#352A47] hover:bg-[#D2BEE7] cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal explaining Provisional Service POI route is pending physical verification */}
        {isPoiNoticeOpen && selectedPoi && (
          <div className="fixed inset-0 z-[9999] isolate flex items-center justify-center bg-[#352A47]/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-3xl border border-[#C9B6DF] bg-[#FBF8FD] p-6 shadow-dream-elevated text-[#352A47]">
              <div className="flex items-center gap-2 text-[#9E563A] font-heading font-bold text-sm">
                <AlertCircle size={18} />
                <span>{selectedPoi.name} Route Notice</span>
              </div>
              <p className="mt-2.5 text-xs text-[#51465F] font-sans leading-relaxed">
                {selectedPoi.name} is identified along the campus service frontage near Main Gate 1. Exact doorway coordinates and pedestrian graph connections are pending surveyor verification.
              </p>
              <p className="mt-2 text-[11px] text-[#7E708E] font-sans">
                You can navigate to Main Gate 1 for closest verified pedestrian approach.
              </p>
              <div className="mt-5 flex gap-2.5">
                <Link
                  to="/navigation?to=main-gate-1"
                  onClick={() => setIsPoiNoticeOpen(false)}
                  className="flex-1 rounded-2xl bg-[#352A47] hover:bg-[#433659] py-3 text-center text-xs font-heading font-bold text-[#FAF6FD] transition shadow-dream-soft"
                >
                  Route to Gate 1
                </Link>
                <button
                  type="button"
                  onClick={() => setIsPoiNoticeOpen(false)}
                  className="rounded-2xl border border-[#C9B6DF] bg-[#E8DDF2] px-4 py-3 text-xs font-heading font-bold text-[#352A47] hover:bg-[#D2BEE7] cursor-pointer"
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
