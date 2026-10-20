import {
  Info,
  Route,
  Search,
  Sliders,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Campus3D } from '../components/Campus3D'
import { CampusCalibrationModal } from '../components/CampusCalibrationModal'
import { GpsLocationButton } from '../components/GpsLocationButton'
import { GpsStatusBanner } from '../components/GpsStatusBanner'
import { buildings } from '../data/buildings'
import { campusModelMapById } from '../data/campusModelMapping'
import { useGpsLocation } from '../hooks/useGpsLocation'

const CATEGORIES = ['All', 'Academic', 'Department', 'Facility'] as const
type CategoryFilter = (typeof CATEGORIES)[number]

export function CampusExplorerScreen() {
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>('main-block')
  const [selectedFloor, setSelectedFloor] = useState<string>('G')
  const [isCalibrationOpen, setIsCalibrationOpen] = useState<boolean>(false)
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('All')
  const [isSearchFocused, setIsSearchFocused] = useState<boolean>(false)

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

  // Filtered buildings list for search & category filters
  const filteredBuildings = useMemo(() => {
    return buildings.filter((b) => {
      const matchesCategory = selectedCategory === 'All' || b.category === selectedCategory
      const matchesSearch =
        searchQuery.trim() === '' ||
        b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.category.toLowerCase().includes(searchQuery.toLowerCase())
      return matchesCategory && matchesSearch
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
          userLocationPoint={classification.modelPoint}
          userLocationAccuracyRadius={classification.accuracyRadiusModel}
          onBuildingSelect={(token) => {
            setSelectedBuildingId(token)
            setIsSearchFocused(false)
          }}
          onSelectionChange={(buildingId) => {
            setSelectedBuildingId(buildingId ?? '')
          }}
        />

        {/* Floating Top Header: Search & Category Filter Pills */}
        <div className="pointer-events-none absolute inset-x-3 top-3 z-30 flex flex-col gap-2 md:left-4 md:right-auto md:top-4 md:w-[380px]">
          {/* Search Box */}
          <div className="pointer-events-auto relative rounded-2xl border border-white/10 bg-[#0B1220]/90 p-1.5 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center gap-2 px-2.5">
              <Search size={16} className="text-slate-400 flex-shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setIsSearchFocused(true)
                }}
                onFocus={() => setIsSearchFocused(true)}
                placeholder="Search campus building or department..."
                className="w-full bg-transparent py-1.5 text-xs font-semibold text-white placeholder:text-slate-400 outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('')
                    setIsSearchFocused(false)
                  }}
                  className="rounded-full p-1 text-slate-400 hover:text-white"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Quick Filter Pills */}
            <div className="mt-1 flex items-center gap-1 border-t border-white/10 px-1 pt-1.5 overflow-x-auto no-scrollbar">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`rounded-lg px-2.5 py-1 text-[10px] font-bold transition-all whitespace-nowrap ${
                    selectedCategory === cat
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30 border border-blue-400/40'
                      : 'bg-[#162033] text-slate-300 hover:bg-[#1B2540] hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Search Autocomplete Results Dropdown */}
            {isSearchFocused && searchQuery.trim() !== '' && (
              <div className="absolute inset-x-0 top-full mt-2 max-h-60 overflow-y-auto rounded-2xl border border-white/15 bg-[#0B1220]/95 p-1.5 shadow-2xl backdrop-blur-2xl z-50">
                {filteredBuildings.length > 0 ? (
                  filteredBuildings.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => {
                        setSelectedBuildingId(b.id)
                        setIsSearchFocused(false)
                        setSearchQuery('')
                      }}
                      className="flex w-full items-center justify-between rounded-xl p-2 text-left hover:bg-blue-950/60 transition"
                    >
                      <div>
                        <div className="text-xs font-bold text-white">{b.name}</div>
                        <div className="text-[10px] text-slate-400 font-medium">{b.floorInfo.label}</div>
                      </div>
                      <span className="rounded-md bg-[#162033] px-1.5 py-0.5 text-[9px] font-bold text-cyan-300 uppercase border border-cyan-500/20">
                        {b.category}
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="p-3 text-center text-xs text-slate-400 font-medium">
                    No buildings found matching &quot;{searchQuery}&quot;
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Floating Top-Right Tools: GPS Location & Calibration */}
        <div className="pointer-events-none absolute right-3 top-3 z-30 flex items-center gap-2 md:right-4 md:top-4">
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
              className="flex h-9 items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-2.5 text-xs font-semibold text-slate-300 hover:border-cyan-400/50 hover:text-white hover:bg-white/10 transition"
              title="Open Campus Calibration & GPS Test Utility"
            >
              <Sliders size={14} className="text-cyan-400" />
              <span className="hidden sm:inline text-[11px] font-bold">Calibration</span>
            </button>
          </div>
        </div>

        {/* GPS Live Status Banner (top-center float) */}
        {classification.status !== 'idle' && (
          <div className="pointer-events-none absolute inset-x-4 top-18 z-30 flex justify-center md:top-4">
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

        {/* Floating Bottom Card / Sheet: Selected Building Information */}
        {selectedBuilding && (
          <div className="pointer-events-none absolute inset-x-3 bottom-4 z-30 flex justify-center md:inset-x-auto md:left-4 md:bottom-5 md:max-w-md md:w-full">
            <div className="pointer-events-auto w-full rounded-3xl border border-white/15 bg-[#0B1220]/95 p-4 shadow-2xl backdrop-blur-2xl text-white">
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
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedBuildingId('')}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-white/10 hover:text-white transition"
                  title="Close inspection"
                >
                  <X size={16} />
                </button>
              </div>

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
