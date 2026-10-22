import {
  BookmarkPlus,
  ChevronDown,
  ChevronUp,
  Info,
  MapPin,
  Route,
  Search,
  Sliders,
  Star,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Campus3D } from '../components/Campus3D'
import { CampusCalibrationModal } from '../components/CampusCalibrationModal'
import { GpsLocationButton } from '../components/GpsLocationButton'
import { GpsStatusBanner } from '../components/GpsStatusBanner'
import { buildings } from '../data/buildings'
import { campusModelMapById } from '../data/campusModelMapping'
import { useGpsLocation } from '../hooks/useGpsLocation'
import { useSavedLocations } from '../hooks/useSavedLocations'

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

  const { isSaved, toggle: toggleSaved } = useSavedLocations()

  // React to URL search params (e.g., /explore?focus=it-block or /explore?building=main-block)
  useEffect(() => {
    const focusId = searchParams.get('focus') || searchParams.get('building')
    if (focusId && buildings.some((b) => b.id === focusId)) {
      setSelectedBuildingId(focusId)
      setIsCardCollapsed(false)
    }
  }, [searchParams])

  // GPS & Calibration state
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

  return (
    <div className="relative h-[calc(100vh-64px)] md:h-screen w-full overflow-hidden bg-[#061018] flex flex-col">
      {/* Map-First 3D Canvas (occupies full screen space) */}
      <div className="relative flex-1 w-full h-full min-h-0 bg-[#0B1220]">
        <Campus3D
          className="h-full w-full"
          selectedBuildingId={selectedBuildingId}
          selectedFloor={selectedFloor}
          showHud={false}
          categoryFilter={selectedCategory}
          userLocationPoint={classification.modelPoint}
          userLocationAccuracyRadius={classification.accuracyRadiusModel}
          onBuildingSelect={(token) => {
            setSelectedBuildingId(token)
            setIsSearchFocused(false)
            setIsCardCollapsed(false)
          }}
          onSelectionChange={(buildingId) => {
            setSelectedBuildingId(buildingId ?? '')
          }}
          onResetView={() => {
            setSelectedBuildingId('')
          }}
        />

        {/* Floating Top Header: Search & Category Filter Pills */}
        <div className="pointer-events-none absolute inset-x-3 top-3 z-30 flex flex-col gap-2 md:left-4 md:right-auto md:top-4 md:w-[410px]">
          {/* Search Box & Mobile Header Container */}
          <div className="pointer-events-auto relative rounded-2xl border border-white/10 bg-[#0B1220]/90 p-2 shadow-2xl backdrop-blur-xl">
            {/* Top row: search field + mobile GPS tools */}
            <div className="flex items-center gap-2">
              <div className="flex flex-1 items-center gap-2 rounded-xl bg-white/5 px-2.5 py-1.5 border border-white/5 focus-within:border-cyan-400/40 transition">
                <Search size={15} className="text-slate-400 shrink-0" />
                <input
                  id="campus-search-input"
                  data-testid="input-campus-search"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    setIsSearchFocused(true)
                  }}
                  onFocus={() => setIsSearchFocused(true)}
                  placeholder="Search campus buildings, departments..."
                  className="w-full bg-transparent text-xs font-semibold text-white placeholder:text-slate-400 outline-none"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('')
                      setIsSearchFocused(false)
                    }}
                    className="rounded-full p-0.5 text-slate-400 hover:text-white cursor-pointer"
                    aria-label="Clear search"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Mobile-only compact GPS & Calibration trigger */}
              <div className="flex md:hidden items-center gap-1 shrink-0">
                <GpsLocationButton
                  isTracking={isTracking}
                  serviceStatus={serviceStatus}
                  positionStatus={classification.status}
                  isTestMode={isTestMode}
                  onStart={startLocation}
                  onStop={stopLocation}
                />
                <button
                  type="button"
                  onClick={() => setIsCalibrationOpen(true)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
                  title="Campus Calibration"
                  aria-label="Campus Calibration"
                >
                  <Sliders size={14} className="text-cyan-400" />
                </button>
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="mt-2 flex items-center gap-1.5 border-t border-white/10 pt-2 overflow-x-auto no-scrollbar">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  id={`btn-category-${cat.toLowerCase()}`}
                  data-testid={`filter-category-${cat.toLowerCase()}`}
                  onClick={() => {
                    setSelectedCategory(cat)
                  }}
                  className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-[11px] font-bold transition-all whitespace-nowrap cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30 border border-blue-400/40'
                      : 'bg-[#162033] text-slate-300 hover:bg-[#1B2540] hover:text-white'
                  }`}
                >
                  <span>{cat}</span>
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[9px] font-black ${
                      selectedCategory === cat ? 'bg-white/20 text-white' : 'bg-black/30 text-slate-400'
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
                className="absolute inset-x-0 top-full mt-2 max-h-72 overflow-y-auto rounded-2xl border border-white/15 bg-[#0B1220]/95 p-1.5 shadow-2xl backdrop-blur-2xl z-50"
              >
                <div className="flex items-center justify-between px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-white/5 mb-1">
                  <span>
                    {selectedCategory === 'All' ? 'All Mapped Locations' : `${selectedCategory} Locations`} (
                    {filteredBuildings.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsSearchFocused(false)}
                    className="text-slate-400 hover:text-white cursor-pointer"
                    aria-label="Close location list"
                  >
                    <X size={12} />
                  </button>
                </div>
                {filteredBuildings.length > 0 ? (
                  filteredBuildings.map((b) => (
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
                      className="flex w-full items-center justify-between rounded-xl p-2 text-left hover:bg-blue-950/60 transition cursor-pointer"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="text-xs font-bold text-white truncate">{b.name}</div>
                        <div className="text-[10px] text-slate-400 font-medium truncate">
                          {b.aliases && b.aliases.length > 0 ? b.aliases.slice(0, 2).join(', ') : b.floorInfo.label}
                        </div>
                      </div>
                      <span className="rounded-md bg-[#162033] px-1.5 py-0.5 text-[9px] font-bold text-cyan-300 uppercase border border-cyan-500/20 shrink-0">
                        {b.category}
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="p-3 text-center text-xs text-slate-400 font-medium">
                    No {selectedCategory !== 'All' ? selectedCategory.toLowerCase() : ''} locations found matching &quot;{searchQuery}&quot;
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Floating Top-Right Tools on Desktop: GPS Location & Calibration */}
        <div className="pointer-events-none absolute hidden md:flex right-4 top-4 z-30 items-center gap-2">
          <div className="pointer-events-auto flex items-center gap-1.5 rounded-2xl border border-white/10 bg-[#0B1220]/90 p-1.5 shadow-2xl backdrop-blur-xl">
            <GpsLocationButton
              isTracking={isTracking}
              serviceStatus={serviceStatus}
              positionStatus={classification.status}
              isTestMode={isTestMode}
              onStart={startLocation}
              onStop={stopLocation}
            />
            <button
              id="campus-calibration-button"
              type="button"
              onClick={() => setIsCalibrationOpen(true)}
              className="flex h-9 items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-2.5 text-xs font-semibold text-slate-300 hover:border-cyan-400/50 hover:text-white hover:bg-white/10 transition cursor-pointer"
              title="Open Campus Calibration & GPS Test Utility"
            >
              <Sliders size={14} className="text-cyan-400" />
              <span className="hidden sm:inline text-[11px] font-bold">Calibration</span>
            </button>
          </div>
        </div>

        {/* GPS Live Status Banner (top-center float) */}
        {classification.status !== 'idle' && (
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
        {/* Placed at bottom-20 on mobile to leave full clearance for the mobile bottom navigation bar */}
        {selectedBuilding && (
          <div className="pointer-events-none absolute inset-x-3 bottom-20 z-30 flex justify-center md:inset-x-auto md:left-4 md:bottom-5 md:max-w-md md:w-full">
            <div className="pointer-events-auto w-full rounded-3xl border border-white/15 bg-[#0B1220]/95 p-4 shadow-2xl backdrop-blur-2xl text-white">
              {/* Card Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-blue-950/80 px-2 py-0.5 text-[10px] font-bold tracking-wider text-cyan-300 uppercase border border-cyan-500/30">
                      {selectedBuilding.category}
                    </span>
                    <span className="text-[11px] font-medium text-slate-400">
                      {selectedBuilding.floorInfo.label}
                    </span>
                  </div>
                  <h2 className="mt-1.5 text-base font-extrabold tracking-tight text-white truncate">
                    {selectedBuilding.name}
                  </h2>
                  {selectedBuilding.knownEntrance && (
                    <p className="mt-0.5 text-[11px] text-slate-400 flex items-center gap-1 truncate">
                      <MapPin size={11} className="text-cyan-400 shrink-0" />
                      <span>{selectedBuilding.knownEntrance}</span>
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => toggleSaved(selectedBuilding.id)}
                    className={`flex h-8 w-8 items-center justify-center rounded-full border transition ${
                      isSaved(selectedBuilding.id)
                        ? 'border-amber-400/50 bg-amber-500/20 text-amber-300'
                        : 'border-white/10 text-slate-400 hover:bg-white/10 hover:text-white'
                    }`}
                    title={isSaved(selectedBuilding.id) ? 'Remove from saved' : 'Save location'}
                  >
                    {isSaved(selectedBuilding.id) ? <Star size={15} fill="currentColor" /> : <BookmarkPlus size={15} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCardCollapsed(!isCardCollapsed)}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-white/10 hover:text-white transition md:hidden"
                    title={isCardCollapsed ? 'Expand panel' : 'Collapse panel'}
                  >
                    {isCardCollapsed ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedBuildingId('')}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-white/10 hover:text-white transition"
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
                    <div className="mt-3 border-t border-white/10 pt-2.5">
                      <div className="flex items-center justify-between text-[11px] mb-1.5">
                        <span className="font-bold text-slate-300">Floor Level</span>
                        <span className="text-slate-400">
                          {selectedMapping?.indoorAvailable ? 'Indoor mapped' : 'Provisional floor levels'}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {availableFloors.map((floor) => (
                          <button
                            key={floor}
                            type="button"
                            onClick={() => setSelectedFloor(floor)}
                            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                              selectedFloor.toUpperCase() === floor
                                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/30 border border-blue-400/30'
                                : 'bg-[#162033] text-slate-300 hover:bg-[#1B2540] hover:text-white'
                            }`}
                          >
                            Floor {floor}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="mt-4 flex items-center gap-2 border-t border-white/10 pt-3">
                    <Link
                      to={`/navigation?to=${selectedBuilding.id}`}
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 py-2.5 text-xs font-bold text-white shadow-lg shadow-blue-500/30 hover:scale-[1.01] active:scale-[0.99] transition"
                    >
                      <Route size={14} className="text-white" />
                      <span>Get Directions</span>
                    </Link>
                    <Link
                      to={`/building/${selectedBuilding.id}`}
                      className="flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-xs font-semibold text-slate-300 hover:bg-white/10 hover:text-white transition"
                    >
                      <Info size={14} />
                      <span>Details</span>
                    </Link>
                  </div>
                </>
              )}

              {/* Quick Compact Action when collapsed */}
              {isCardCollapsed && (
                <div className="mt-2.5 flex items-center justify-between border-t border-white/10 pt-2">
                  <span className="text-[11px] text-slate-400">Tap expand for floor levels</span>
                  <Link
                    to={`/navigation?to=${selectedBuilding.id}`}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1 text-[11px] font-bold text-white hover:bg-blue-500"
                  >
                    <Route size={12} />
                    <span>Directions</span>
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Campus Calibration & GPS Test Utility Modal (Preserved 100%) */}
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
    </div>
  )
}
