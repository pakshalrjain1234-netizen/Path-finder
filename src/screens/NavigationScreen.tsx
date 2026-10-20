import {
  AlertTriangle,
  ArrowLeftRight,
  ArrowUp,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Compass,
  CornerUpLeft,
  CornerUpRight,
  Crosshair,
  Footprints,
  Info,
  Layers,
  MapPin,
  Navigation,
  PanelLeftClose,
  PanelLeftOpen,
  Pause,
  Play,
  Radio,
  RotateCcw,
  Sparkles,
  StopCircle,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Campus3D } from '../components/Campus3D'
import { SurfaceCard } from '../components/SurfaceCard'
import { buildings } from '../data/buildings'
import { useSearchParams } from 'react-router-dom'
import { type CampusBuildingId } from '../data/campusModelMapping'
import {
  campusDestinationNodesByBuildingId,
  campusNavigationGraph,
  campusNavigationNodesById,
} from '../data/navigationGraph'
import { createRoutePlan } from '../lib/routePlanner'
import { computeCumulativeDistances, interpolatePolylineAtDistance } from '../lib/routeSimulation'
import { useGpsLocation } from '../hooks/useGpsLocation.ts'
import { useLiveNavigation } from '../hooks/useLiveNavigation.ts'
import { NAVIGATION_SCENARIOS } from '../data/navigationScenarios.ts'
import type { ScenarioId } from '../types/liveNavigation.ts'
import type { Point3, RoutePlan } from '../types/navigation'

interface LocationOption {
  id: string
  label: string
  nodeId: string | null
  type: 'gate' | 'building'
}

type MobileSheetState = 'collapsed' | 'half' | 'expanded'
type NavMode = 'manual' | 'simulation' | 'live'

export function NavigationScreen() {
  const [searchParams] = useSearchParams()
  const [fromId, setFromId] = useState<string>(() => searchParams.get('from') || 'main-gate-1')
  const [toId, setToId] = useState<string>(() => searchParams.get('to') || 'it-block')
  const [isNavigating, setIsNavigating] = useState<boolean>(false)
  const [activeStepIndex, setActiveStepIndex] = useState<number>(0)
  const [showAllSteps, setShowAllSteps] = useState<boolean>(false)

  // Navigation mode & Live GPS state
  const [navMode, setNavMode] = useState<NavMode>(() => (searchParams.get('mode') as NavMode) || 'manual')
  const [selectedScenarioId, setSelectedScenarioId] = useState<ScenarioId>('walk_main_gate_to_it')
  const [cameraRevision, setCameraRevision] = useState<number>(0)
  const [isPlaying, setIsPlaying] = useState<boolean>(false)
  const [simulatedDistance, setSimulatedDistance] = useState<number>(0)
  const [simSpeed, setSimSpeed] = useState<number>(3.0) // 3.0 m/s walking simulation

  // React to searchParam changes
  useEffect(() => {
    const qFrom = searchParams.get('from')
    const qTo = searchParams.get('to')
    const qMode = searchParams.get('mode') as NavMode | null
    if (qFrom) setFromId(qFrom)
    if (qTo) setToId(qTo)
    if (qMode) setNavMode(qMode)
  }, [searchParams])

  // Layout states
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false)
  const [mobileSheetState, setMobileSheetState] = useState<MobileSheetState>('half')

  // Unified location options for Origin and Destination
  const locationOptions = useMemo<LocationOption[]>(() => {
    const gates: LocationOption[] = [
      { id: 'main-gate-1', label: 'Main Entrance (Gate 1)', nodeId: 'main-gate-1', type: 'gate' },
      { id: 'west-entrance', label: 'West Entrance', nodeId: 'west-entrance', type: 'gate' },
      { id: 'ground-entrance', label: 'Ground Entrance', nodeId: 'ground-entrance', type: 'gate' },
    ]

    const buildingOptions: LocationOption[] = buildings.map((b) => {
      const destNodes = campusDestinationNodesByBuildingId.get(b.id as CampusBuildingId)
      const mappedNode = destNodes && destNodes.length > 0 ? destNodes[0] : null
      return {
        id: b.id,
        label: b.name,
        nodeId: mappedNode ? mappedNode.id : null,
        type: 'building',
      }
    })

    return [...gates, ...buildingOptions]
  }, [])

  // Resolve start node
  const originNodeId = useMemo(() => {
    const opt = locationOptions.find((l) => l.id === fromId)
    return opt?.nodeId ?? null
  }, [fromId, locationOptions])

  // Resolve destination node
  const destinationNodeId = useMemo(() => {
    const opt = locationOptions.find((l) => l.id === toId)
    return opt?.nodeId ?? null
  }, [toId, locationOptions])

  // Calculate route plan
  const routeCalculation = useMemo(() => {
    if (!originNodeId) {
      const fromOpt = locationOptions.find((l) => l.id === fromId)
      return {
        status: 'unverified' as const,
        route: null,
        message: `${fromOpt?.label ?? 'Origin location'} has no mapped entrance anchor in the campus 3D model. Position remains pending verification.`,
      }
    }

    if (!destinationNodeId) {
      const toOpt = locationOptions.find((l) => l.id === toId)
      return {
        status: 'unverified' as const,
        route: null,
        message: `${toOpt?.label ?? 'Destination location'} has no mapped entrance anchor in the campus 3D model. Position remains pending verification.`,
      }
    }

    if (originNodeId === destinationNodeId) {
      return {
        status: 'same-node' as const,
        route: null,
        message: 'Origin and destination are the same location. Please choose a different destination.',
      }
    }

    const result = createRoutePlan(campusNavigationGraph, originNodeId, destinationNodeId)
    if (result.status === 'ok') {
      return {
        status: 'ok' as const,
        route: result.route,
        message: null,
      }
    }

    if (result.status === 'no-route') {
      const destOpt = locationOptions.find((l) => l.id === toId)
      return {
        status: 'disconnected' as const,
        route: null,
        message: `Pathway connectivity to ${destOpt?.label ?? 'this building'} is unverified or unavailable in the current campus model. Ground pathway survey is incomplete.`,
      }
    }

    return {
      status: 'error' as const,
      route: null,
      message: result.message,
    }
  }, [originNodeId, destinationNodeId, fromId, toId, locationOptions])

  const route: RoutePlan | null = routeCalculation.route

  // 3D route points for Campus3D
  const routePoints = useMemo<Point3[]>(() => {
    if (!route) return []
    return route.nodeIds
      .map((id) => campusNavigationNodesById.get(id)?.position)
      .filter((pos): pos is Point3 => Boolean(pos))
  }, [route])

  // GPS Location & Live Navigation Tracking Hooks
  const {
    coords: gpsCoords,
    calibrationModel,
    isTestMode,
  } = useGpsLocation()

  const {
    navState,
    activeScenario,
    scenarioStepIndex,
    isScenarioPlaying,
    startNavigation: startLiveNav,
    pauseNavigation: pauseLiveNav,
    resumeNavigation: resumeLiveNav,
    stopNavigation: stopLiveNav,
    runScenario,
    stepScenario,
  } = useLiveNavigation({
    route,
    routePoints,
    calibration: calibrationModel,
    liveCoordinates: gpsCoords,
    isSimulated: isTestMode || Boolean(selectedScenarioId) || navMode === 'simulation' || navMode === 'live',
    graph: campusNavigationGraph,
    destinationNodeId: destinationNodeId,
  })

  // Dynamic route points for active display (switches seamlessly upon automatic rerouting)
  const liveRoutePoints = useMemo<Point3[]>(() => {
    if (navMode === 'live' && navState.activeRoutePlan) {
      return navState.activeRoutePlan.nodeIds
        .map((id) => campusNavigationNodesById.get(id)?.position)
        .filter((pos): pos is Point3 => Boolean(pos))
    }
    return routePoints
  }, [navMode, navState.activeRoutePlan, routePoints])

  const handleRunScenario = (scenarioId: ScenarioId) => {
    const scenario = NAVIGATION_SCENARIOS.find((s) => s.id === scenarioId)
    if (scenario) {
      setSelectedScenarioId(scenarioId)
      if (scenario.fromId !== fromId) setFromId(scenario.fromId)
      if (scenario.toId !== toId) setToId(scenario.toId)
      runScenario(scenarioId)
    }
  }

  const handleRecenterCamera = () => {
    setCameraRevision((r) => r + 1)
  }

  // Polyline cumulative distances
  const cumulativeDistances = useMemo(() => computeCumulativeDistances(routePoints), [routePoints])
  const totalRouteDistance = useMemo(() => {
    return cumulativeDistances.length > 0 ? cumulativeDistances[cumulativeDistances.length - 1] : 0
  }, [cumulativeDistances])

  // Continuous polyline progress
  const simProgress = useMemo(() => {
    return interpolatePolylineAtDistance(routePoints, cumulativeDistances, simulatedDistance)
  }, [routePoints, cumulativeDistances, simulatedDistance])

  // Map each route step to its cumulative distance along the polyline
  const stepCumulativeDistances = useMemo(() => {
    if (!route) return []
    return route.steps.map((step) => {
      const idx = route.nodeIds.indexOf(step.nodeId)
      return idx >= 0 && idx < cumulativeDistances.length ? cumulativeDistances[idx] : 0
    })
  }, [route, cumulativeDistances])

  // Active step index during simulation based on distance thresholds
  const simulatedStepIndex = useMemo(() => {
    if (!route || stepCumulativeDistances.length === 0) return 0
    let currentIdx = 0
    for (let i = 0; i < stepCumulativeDistances.length; i++) {
      if (simulatedDistance >= stepCumulativeDistances[i] - 1.5) {
        currentIdx = i
      }
    }
    return Math.min(route.steps.length - 1, currentIdx)
  }, [route, stepCumulativeDistances, simulatedDistance])

  const effectiveStepIndex =
    navMode === 'live'
      ? navState.currentStepIndex
      : navMode === 'simulation'
        ? simulatedStepIndex
        : activeStepIndex

  // Animation frame loop for continuous simulation
  useEffect(() => {
    if (!isPlaying || navMode !== 'simulation' || totalRouteDistance <= 0) return

    let lastTime = performance.now()
    let animId: number

    const tick = (now: number) => {
      const deltaSec = Math.min((now - lastTime) / 1000, 0.1)
      lastTime = now

      setSimulatedDistance((prev) => {
        const next = prev + simSpeed * deltaSec
        if (next >= totalRouteDistance) {
          setIsPlaying(false)
          return totalRouteDistance
        }
        return next
      })

      animId = requestAnimationFrame(tick)
    }

    animId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(animId)
  }, [isPlaying, navMode, simSpeed, totalRouteDistance])

  // Active step point in 3D for manual guidance
  const activeStepPoint = useMemo<Point3 | null>(() => {
    if (!isNavigating || !route || !route.steps[effectiveStepIndex]) return null
    const nodeId = route.steps[effectiveStepIndex].nodeId
    return campusNavigationNodesById.get(nodeId)?.position ?? null
  }, [isNavigating, route, effectiveStepIndex])

  // Landmarks passed along the route
  const landmarksPassed = useMemo(() => {
    if (!route) return []
    const landmarks = new Set<string>()
    for (const nodeId of route.nodeIds) {
      const node = campusNavigationNodesById.get(nodeId)
      if (node?.buildingId && node.buildingId !== toId && node.buildingId !== fromId) {
        const b = buildings.find((item) => item.id === node.buildingId)
        if (b) landmarks.add(b.name)
      }
    }
    return Array.from(landmarks)
  }, [route, toId, fromId])

  // Swap origin and destination
  const handleSwap = () => {
    const prevFrom = fromId
    const prevTo = toId
    setFromId(prevTo)
    setToId(prevFrom)
    setActiveStepIndex(0)
    setIsNavigating(false)
    setIsPlaying(false)
    setSimulatedDistance(0)
  }

  // Reset to default
  const handleReset = () => {
    setFromId('main-gate-1')
    setToId('it-block')
    setActiveStepIndex(0)
    setIsNavigating(false)
    setShowAllSteps(false)
    setIsPlaying(false)
    setSimulatedDistance(0)
    setNavMode('manual')
  }

  // Handle building selection from 3D canvas
  const handleBuildingSelect = (buildingId: string) => {
    setToId(buildingId)
    setActiveStepIndex(0)
    setIsNavigating(false)
    setIsPlaying(false)
    setSimulatedDistance(0)
    if (mobileSheetState === 'collapsed') {
      setMobileSheetState('half')
    }
  }

  const currentStep = route?.steps[effectiveStepIndex] ?? null

  // Reusable Route Planning Controls content
  const renderPlanningControls = (isMobile: boolean = false) => (
    <div className="flex flex-col gap-3">
      {/* Origin & Destination Selectors */}
      <div className="space-y-2">
        <div className="grid gap-2">
          {/* From Input */}
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#111827]/80 px-3 py-1.5 focus-within:border-cyan-400 focus-within:bg-[#162033] focus-within:ring-2 focus-within:ring-cyan-400/20 transition-all">
            <span className="h-2.5 w-2.5 rounded-full border border-white/20 bg-cyan-400 shadow-sm flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <label htmlFor={isMobile ? 'mobile-route-from-select' : 'route-from-select'} className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                From (Origin)
              </label>
              <select
                id={isMobile ? 'mobile-route-from-select' : 'route-from-select'}
                value={fromId}
                onChange={(e) => {
                  setFromId(e.target.value)
                  setActiveStepIndex(0)
                  setIsNavigating(false)
                }}
                className="w-full bg-[#111827] text-xs font-semibold text-white outline-none"
              >
                <optgroup label="Campus Entrances & Gates">
                  {locationOptions
                    .filter((opt) => opt.type === 'gate')
                    .map((opt) => (
                      <option key={`from-${opt.id}`} value={opt.id}>
                        {opt.label}
                      </option>
                    ))}
                </optgroup>
                <optgroup label="Campus Buildings & Facilities">
                  {locationOptions
                    .filter((opt) => opt.type === 'building')
                    .map((opt) => (
                      <option key={`from-${opt.id}`} value={opt.id}>
                        {opt.label} {!opt.nodeId ? '(Unverified position)' : ''}
                      </option>
                    ))}
                </optgroup>
              </select>
            </div>
          </div>

          {/* Swap Button Divider */}
          <div className="relative flex items-center justify-center">
            <div className="absolute inset-x-0 h-px bg-white/10" />
            <button
              type="button"
              onClick={handleSwap}
              className="relative z-10 flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-[#162033] text-slate-300 shadow-sm hover:border-cyan-400 hover:text-cyan-400 transition-colors"
              title="Swap origin and destination"
              aria-label="Swap origin and destination"
            >
              <ArrowLeftRight size={13} />
            </button>
          </div>

          {/* To Input */}
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#111827]/80 px-3 py-1.5 focus-within:border-cyan-400 focus-within:bg-[#162033] focus-within:ring-2 focus-within:ring-cyan-400/20 transition-all">
            <span className="h-2.5 w-2.5 rounded-full border border-white/20 bg-rose-500 shadow-sm flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <label htmlFor={isMobile ? 'mobile-route-to-select' : 'route-to-select'} className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                To (Destination)
              </label>
              <select
                id={isMobile ? 'mobile-route-to-select' : 'route-to-select'}
                value={toId}
                onChange={(e) => {
                  setToId(e.target.value)
                  setActiveStepIndex(0)
                  setIsNavigating(false)
                }}
                className="w-full bg-[#111827] text-xs font-semibold text-white outline-none"
              >
                <optgroup label="Campus Buildings & Facilities">
                  {locationOptions
                    .filter((opt) => opt.type === 'building')
                    .map((opt) => (
                      <option key={`to-${opt.id}`} value={opt.id}>
                        {opt.label} {!opt.nodeId ? '(Unverified position)' : ''}
                      </option>
                    ))}
                </optgroup>
                <optgroup label="Campus Entrances & Gates">
                  {locationOptions
                    .filter((opt) => opt.type === 'gate')
                    .map((opt) => (
                      <option key={`to-${opt.id}`} value={opt.id}>
                        {opt.label}
                      </option>
                    ))}
                </optgroup>
              </select>
            </div>
          </div>
        </div>

        {/* Status Badge & Metrics (Accurate: distance pending survey) */}
        {routeCalculation.status === 'ok' && route && (
          <div className="flex items-center justify-between rounded-xl bg-[#111827]/70 border border-white/10 p-2.5 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-950/80 text-cyan-400 border border-cyan-500/30">
                <Footprints size={15} />
              </div>
              <div>
                <div className="font-semibold text-white">
                  Distance pending campus survey
                </div>
                <div className="text-[10px] text-slate-400">Scale uncalibrated • Provisional route</div>
              </div>
            </div>
            <span className="rounded-full bg-amber-950/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-300 border border-amber-500/30">
              Route provisional
            </span>
          </div>
        )}
      </div>

      {/* Navigation Execution / Route Unavailable Feedback */}
      <div className="flex-1">
        {routeCalculation.status === 'ok' && route && currentStep && (
          <div className="space-y-3">
            {/* Mode Switcher Tabs */}
            <div className="flex rounded-xl bg-[#111827]/80 border border-white/10 p-1 text-xs">
              <button
                type="button"
                onClick={() => {
                  setNavMode('manual')
                  setIsPlaying(false)
                }}
                className={`flex-1 rounded-lg py-1.5 font-semibold transition-all ${
                  navMode === 'manual'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30 border border-blue-400/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Manual
              </button>
              <button
                type="button"
                onClick={() => {
                  setNavMode('simulation')
                  setIsNavigating(true)
                }}
                className={`flex-1 rounded-lg py-1.5 font-bold transition-all ${
                  navMode === 'simulation'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/30 border border-blue-400/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Virtual Walk
              </button>
              <button
                id="tab-gps-navigation"
                type="button"
                onClick={() => {
                  setNavMode('live')
                  setIsNavigating(true)
                  startLiveNav()
                }}
                className={`flex-1 rounded-lg py-1.5 font-bold transition-all ${
                  navMode === 'live'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/30 border border-blue-400/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                GPS Navigation
              </button>
            </div>

            {/* LIVE GPS / SCENARIO NAVIGATION MODE */}
            {navMode === 'live' ? (
              <div className="space-y-3 rounded-2xl border border-white/10 bg-[#0B1220]/95 p-3.5 shadow-2xl backdrop-blur-2xl">
                {/* Mode Indicator & Safety Status */}
                <div
                  className={`rounded-xl border p-2.5 text-[11px] ${
                    activeScenario
                      ? 'border-blue-500/30 bg-blue-950/60 text-blue-200'
                      : isTestMode
                        ? 'border-amber-500/30 bg-amber-950/60 text-amber-200'
                        : navState.rawModelPosition === null
                          ? 'border-white/10 bg-[#162033]/80 text-slate-300'
                          : 'border-emerald-500/30 bg-emerald-950/60 text-emerald-200'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider">
                      <span
                        className={`h-2 w-2 rounded-full animate-pulse ${
                          activeScenario
                            ? 'bg-cyan-400'
                            : isTestMode
                              ? 'bg-amber-400'
                              : navState.rawModelPosition === null
                                ? 'bg-slate-500'
                                : 'bg-emerald-400'
                        }`}
                      />
                      <span>
                        {activeScenario
                          ? 'SIMULATION MODE • TEST SCENARIO'
                          : isTestMode
                            ? 'GPS TEST MODE (SIMULATED)'
                            : navState.rawModelPosition === null
                              ? 'CALIBRATION PENDING (LOCKED)'
                              : 'LIVE GPS TRACKING'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] font-semibold">
                      <span className="rounded-full bg-[#111827] px-2 py-0.5 border border-white/10 text-slate-300">
                        ±{navState.accuracyRadiusMeters.toFixed(1)}m
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 uppercase ${
                          navState.confidence === 'high'
                            ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/30'
                            : navState.confidence === 'medium'
                              ? 'bg-blue-950/80 text-cyan-300 border border-blue-500/30'
                              : navState.confidence === 'off_route'
                                ? 'bg-rose-950/80 text-rose-300 border border-rose-500/30'
                                : 'bg-amber-950/80 text-amber-300 border border-amber-500/30'
                        }`}
                      >
                        {navState.confidence}
                      </span>
                    </div>
                  </div>
                  <div className="mt-1 text-[10px] opacity-90 leading-tight">
                    {activeScenario
                      ? activeScenario.description
                      : isTestMode
                        ? 'Simulating GPS observations using development benchmarks with 0m residual error.'
                        : navState.userMessage}
                  </div>
                </div>

                {/* Turn-by-Turn Guidance Hero Card (Google Maps Style) */}
                <div className="rounded-2xl bg-[#111827]/90 p-3.5 shadow-xl border border-white/10 space-y-3">
                  {/* Turn Maneuver Header */}
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl shadow-lg text-white ${
                        navState.status === 'arrived'
                          ? 'bg-emerald-600 shadow-emerald-500/30'
                          : navState.isOffRoute
                            ? 'bg-amber-600 shadow-amber-500/30'
                            : navState.isApproachingTurn
                              ? 'bg-rose-600 shadow-rose-500/30 animate-pulse'
                              : 'bg-gradient-to-tr from-blue-600 to-cyan-600 shadow-blue-500/30'
                      }`}
                    >
                      {navState.status === 'arrived' ? (
                        <CheckCircle2 size={24} />
                      ) : navState.isOffRoute ? (
                        <AlertTriangle size={24} />
                      ) : navState.currentStep?.title.toLowerCase().includes('right') ||
                        (navState.isApproachingTurn &&
                          navState.nextStep?.title.toLowerCase().includes('right')) ? (
                        <CornerUpRight size={24} />
                      ) : navState.currentStep?.title.toLowerCase().includes('left') ||
                        (navState.isApproachingTurn &&
                          navState.nextStep?.title.toLowerCase().includes('left')) ? (
                        <CornerUpLeft size={24} />
                      ) : (
                        <ArrowUp size={24} />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-extrabold text-base text-white tracking-tight">
                          {navState.status === 'arrived'
                            ? 'Destination Arrived'
                            : navState.status === 'rerouted'
                              ? 'Route Recalculated'
                              : `In ${navState.distanceToNextTurn.toFixed(0)} m`}
                        </span>
                        {navState.isApproachingTurn && (
                          <span className="rounded-full bg-amber-950/80 px-2 py-0.5 text-[9px] font-bold text-amber-300 uppercase border border-amber-500/30 animate-pulse">
                            Upcoming Turn
                          </span>
                        )}
                        {navState.status === 'rerouted' && (
                          <span className="rounded-full bg-emerald-950/80 px-2 py-0.5 text-[9px] font-bold text-emerald-300 uppercase border border-emerald-500/30 flex items-center gap-1">
                            <Sparkles size={10} /> Recalculated ({navState.rerouteCount})
                          </span>
                        )}
                        {navState.offRouteStatus === 'diverging' && !navState.isOffRoute && (
                          <span className="rounded-full bg-amber-950/80 px-2 py-0.5 text-[9px] font-bold text-amber-300 uppercase border border-amber-500/30">
                            Diverging
                          </span>
                        )}
                        {navState.isOffRoute && (
                          <span className="rounded-full bg-rose-950/80 px-2 py-0.5 text-[9px] font-bold text-rose-300 uppercase border border-rose-500/30 animate-pulse">
                            Off-Route
                          </span>
                        )}
                      </div>

                      <h3 className="text-xs font-semibold text-slate-200 mt-0.5 leading-snug">
                        {navState.status === 'arrived'
                          ? 'You have safely reached your destination!'
                          : navState.status === 'rerouted'
                            ? navState.userMessage
                            : navState.isApproachingTurn && navState.nextStep
                              ? navState.nextStep.title
                              : navState.currentStep?.title ?? 'Proceed along path'}
                      </h3>

                      {navState.status === 'rerouted' && (
                        <div className="mt-1.5 rounded-lg bg-emerald-950/60 border border-emerald-500/30 px-2 py-1 text-[11px] font-medium text-emerald-200 flex items-center gap-1.5">
                          <Sparkles size={12} className="text-emerald-400 flex-shrink-0" />
                          <span>{navState.userMessage}</span>
                        </div>
                      )}

                      {navState.isOffRoute && navState.rerouteFailureReason && (
                        <div className="mt-1.5 rounded-lg bg-amber-950/60 border border-amber-500/30 px-2 py-1 text-[11px] font-medium text-amber-200 flex items-center gap-1.5">
                          <AlertTriangle size={12} className="text-amber-400 flex-shrink-0" />
                          <span>{navState.userMessage}</span>
                        </div>
                      )}

                      {navState.currentStep?.notes && navState.status !== 'rerouted' && (
                        <p className="mt-0.5 text-[11px] text-slate-400">
                          {navState.currentStep.notes}
                        </p>
                      )}

                      {/* Next Turn Preview */}
                      {navState.nextStep && !navState.isApproachingTurn && (
                        <div className="mt-1.5 flex items-center gap-1 text-[10px] text-slate-400">
                          <span>Then:</span>
                          <span className="font-medium text-slate-300 truncate">
                            {navState.nextStep.title}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar & Distance / ETA */}
                  <div className="border-t border-white/10 pt-2.5 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-white">
                        {navState.remainingDistance.toFixed(0)} m remaining
                      </span>
                      <span className="font-medium text-slate-400">
                        ~{Math.ceil(navState.estimatedTimeRemainingSec / 60)} min •{' '}
                        {(navState.progressRatio * 100).toFixed(0)}%
                      </span>
                    </div>

                    <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 via-cyan-400 to-teal-400 transition-all duration-300"
                        style={{
                          width: `${Math.min(100, Math.max(0, navState.progressRatio * 100))}%`,
                        }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span>Start: {locationOptions.find((o) => o.id === fromId)?.label}</span>
                      <span>End: {locationOptions.find((o) => o.id === toId)?.label}</span>
                    </div>
                  </div>

                  {/* Primary Navigation Controls */}
                  <div className="flex items-center justify-between gap-2 border-t border-white/10 pt-2.5">
                    <div className="flex items-center gap-1.5">
                      <button
                        id="btn-live-pause-resume"
                        type="button"
                        onClick={() => {
                          if (navState.isPaused) {
                            resumeLiveNav()
                          } else {
                            pauseLiveNav()
                          }
                        }}
                        className="flex items-center gap-1 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 px-3 py-1.5 text-xs font-semibold text-white shadow-md shadow-blue-500/30 hover:from-blue-500 hover:to-cyan-500 transition"
                      >
                        {navState.isPaused ? <Play size={13} /> : <Pause size={13} />}
                        <span>{navState.isPaused ? 'Resume' : 'Pause'}</span>
                      </button>

                      <button
                        id="btn-live-stop"
                        type="button"
                        onClick={stopLiveNav}
                        className="flex items-center gap-1 rounded-xl border border-white/10 bg-[#162033] px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-[#1B2540] hover:text-white transition"
                      >
                        <StopCircle size={13} className="text-rose-400" />
                        <span>Stop</span>
                      </button>
                    </div>

                    <button
                      id="btn-live-recenter"
                      type="button"
                      onClick={handleRecenterCamera}
                      className="flex items-center gap-1 rounded-xl border border-white/10 bg-[#162033] px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:border-cyan-400 hover:text-cyan-400 transition"
                      title="Recenter camera on route"
                    >
                      <Crosshair size={13} className="text-cyan-400" />
                      <span>Recenter</span>
                    </button>
                  </div>
                </div>

                {/* Repeatable Test Scenarios Suite */}
                <div className="rounded-2xl bg-[#111827]/90 p-3 shadow-xl border border-white/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
                      <Radio size={14} className="text-cyan-400" />
                      <span>GPS Test Scenarios (10 Tests)</span>
                    </span>
                    {activeScenario && (
                      <span className="text-[10px] font-semibold text-cyan-300">
                        Obs {scenarioStepIndex + 1}/{activeScenario.observations.length}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <select
                      id="nav-scenario-select"
                      value={selectedScenarioId}
                      onChange={(e) => {
                        const scId = e.target.value as ScenarioId
                        setSelectedScenarioId(scId)
                        handleRunScenario(scId)
                      }}
                      className="w-full rounded-xl border border-white/10 bg-[#162033] px-2.5 py-1.5 text-xs font-medium text-white outline-none focus:border-cyan-400"
                    >
                      {NAVIGATION_SCENARIOS.map((sc) => (
                        <option key={sc.id} value={sc.id}>
                          {sc.name}
                        </option>
                      ))}
                    </select>

                    {/* Scenario Action Controls */}
                    <div className="flex items-center justify-between gap-1.5 pt-1">
                      <button
                        id="btn-run-scenario"
                        type="button"
                        onClick={() => handleRunScenario(selectedScenarioId)}
                        className="flex-1 flex items-center justify-center gap-1 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-1.5 text-xs font-semibold text-white hover:from-blue-500 hover:to-indigo-500 transition shadow-md shadow-blue-500/25"
                      >
                        <Play size={12} />
                        <span>
                          {activeScenario?.id === selectedScenarioId && isScenarioPlaying
                            ? 'Restart Scenario'
                            : 'Run Scenario'}
                        </span>
                      </button>

                      {activeScenario && (
                        <div className="flex items-center gap-1">
                          <button
                            id="btn-scenario-prev"
                            type="button"
                            disabled={scenarioStepIndex === 0}
                            onClick={() => stepScenario('prev')}
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-[#162033] text-slate-300 hover:bg-[#1B2540] hover:text-white disabled:opacity-40"
                            title="Previous observation"
                          >
                            <ChevronLeft size={14} />
                          </button>
                          <button
                            id="btn-scenario-next"
                            type="button"
                            disabled={scenarioStepIndex >= activeScenario.observations.length - 1}
                            onClick={() => stepScenario('next')}
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-[#162033] text-slate-300 hover:bg-[#1B2540] hover:text-white disabled:opacity-40"
                            title="Next observation"
                          >
                            <ChevronRight size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : navMode === 'simulation' ? (
              <div className="space-y-2.5 rounded-2xl border border-cyan-500/30 bg-[#0B1220]/90 p-3.5 shadow-glass backdrop-blur-xl">
                {/* Clear Label & Disclaimer */}
                <div className="rounded-xl border border-cyan-500/25 bg-cyan-950/40 p-2.5 text-[11px] text-cyan-200">
                  <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-cyan-300">
                    <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
                    Simulation Mode — Virtual Demo
                  </div>
                  <div className="mt-0.5 text-[10px] text-cyan-300/80 leading-normal">
                    Demonstrates continuous route progress along verified road centerlines. Virtual animation only — not live GPS positioning.
                  </div>
                </div>

                {/* Simulation Controls: Play/Pause, Reset, Speed */}
                <div className="rounded-xl bg-[#111827]/80 p-3 ring-1 ring-white/10 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (simProgress.isFinished) {
                            setSimulatedDistance(0)
                            setIsPlaying(true)
                          } else {
                            setIsPlaying((p) => !p)
                          }
                        }}
                        className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:from-blue-500 hover:to-cyan-400 transition-all"
                      >
                        {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                        <span>{isPlaying ? 'Pause' : simProgress.isFinished ? 'Replay' : 'Play'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsPlaying(false)
                          setSimulatedDistance(0)
                        }}
                        className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:bg-white/10 transition-all"
                        title="Reset simulation"
                      >
                        <RotateCcw size={13} />
                        <span>Reset</span>
                      </button>
                    </div>

                    {/* Speed selector */}
                    <div className="flex items-center gap-0.5 rounded-lg bg-black/40 border border-white/10 p-0.5 text-[10px]">
                      {[1.5, 3.0, 6.0].map((speed) => (
                        <button
                          key={speed}
                          type="button"
                          onClick={() => setSimSpeed(speed)}
                          className={`rounded-md px-1.5 py-0.5 font-semibold transition ${
                            simSpeed === speed ? 'bg-cyan-500/20 text-cyan-300 ring-1 ring-cyan-500/40' : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {speed === 1.5 ? '1x' : speed === 3.0 ? '2x' : '4x'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Scrubber / Progress slider */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>Progress along route</span>
                      <span className="font-semibold text-slate-200">
                        {simulatedDistance.toFixed(1)} m / {totalRouteDistance.toFixed(1)} m ({Math.round(simProgress.progressRatio * 100)}%)
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={totalRouteDistance || 1}
                      step={0.2}
                      value={simulatedDistance}
                      onChange={(e) => {
                        setSimulatedDistance(parseFloat(e.target.value))
                      }}
                      className="w-full accent-cyan-400 cursor-pointer bg-slate-800"
                    />
                  </div>
                </div>

                {/* Auto-advancing step card */}
                <div className="rounded-xl bg-[#111827]/80 p-3 ring-1 ring-white/10">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>STEP {simulatedStepIndex + 1} OF {route.steps.length} (AUTO)</span>
                    <span className="font-medium text-cyan-400">{currentStep.verificationStatus}</span>
                  </div>
                  <div className="mt-2 flex items-start gap-2.5">
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 text-white shadow-sm shadow-cyan-500/20">
                      {simulatedStepIndex === 0 ? (
                        <Compass size={18} />
                      ) : simulatedStepIndex === route.steps.length - 1 ? (
                        <MapPin size={18} />
                      ) : (
                        <ArrowUp size={18} />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-xs font-semibold text-slate-100 leading-snug">{currentStep.title}</h2>
                      {currentStep.notes && (
                        <p className="mt-0.5 text-[11px] text-slate-400 leading-normal">{currentStep.notes}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* MANUAL GUIDANCE MODE */
              <div>
                {!isNavigating ? (
                  <button
                    type="button"
                    onClick={() => {
                      setIsNavigating(true)
                      setActiveStepIndex(0)
                    }}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 px-4 py-3 text-xs font-bold text-white shadow-lg shadow-blue-500/20 hover:from-blue-500 hover:to-cyan-400 transition-all"
                  >
                    <Sparkles size={15} />
                    <span>Start Turn-by-Turn Navigation</span>
                  </button>
                ) : (
                  <div className="space-y-2.5 rounded-2xl border border-blue-500/30 bg-[#0B1220]/90 p-3.5 shadow-glass backdrop-blur-xl">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-cyan-300">
                        <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
                        Live Guidance Active
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsNavigating(false)}
                        className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] font-medium text-slate-300 hover:bg-white/10"
                      >
                        <StopCircle size={12} className="text-rose-400" />
                        Exit Guidance
                      </button>
                    </div>

                    {/* Direction step highlight */}
                    <div className="rounded-xl bg-[#111827]/80 p-3 ring-1 ring-white/10">
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span>STEP {activeStepIndex + 1} OF {route.steps.length}</span>
                        <span className="font-medium text-cyan-400">{currentStep.verificationStatus}</span>
                      </div>
                      <div className="mt-2 flex items-start gap-2.5">
                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 text-white shadow-sm shadow-cyan-500/20">
                          {activeStepIndex === 0 ? (
                            <Compass size={18} />
                          ) : activeStepIndex === route.steps.length - 1 ? (
                            <MapPin size={18} />
                          ) : (
                            <ArrowUp size={18} />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h2 className="text-xs font-semibold text-slate-100 leading-snug">{currentStep.title}</h2>
                          {currentStep.notes && (
                            <p className="mt-0.5 text-[11px] text-slate-400 leading-normal">{currentStep.notes}</p>
                          )}
                        </div>
                      </div>

                      {/* Step controls */}
                      <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-2 text-xs">
                        <button
                          type="button"
                          disabled={activeStepIndex === 0}
                          onClick={() => setActiveStepIndex((idx) => Math.max(0, idx - 1))}
                          className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 font-medium text-slate-300 hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none"
                        >
                          Previous Step
                        </button>
                        <button
                          type="button"
                          disabled={activeStepIndex === route.steps.length - 1}
                          onClick={() => setActiveStepIndex((idx) => Math.min(route.steps.length - 1, idx + 1))}
                          className="rounded-lg bg-gradient-to-r from-blue-600 to-cyan-500 px-3 py-1 font-semibold text-white hover:from-blue-500 hover:to-cyan-400 disabled:opacity-30 disabled:pointer-events-none"
                        >
                          Next Step
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Waypoints Toggle */}
            <button
              type="button"
              onClick={() => setShowAllSteps((v) => !v)}
              className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-[#111827]/80 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-white/10 transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <Layers size={14} className="text-cyan-400" />
                Full Waypoints List ({route.steps.length} nodes)
              </span>
              <span className="text-[11px] text-cyan-400 font-semibold">
                {showAllSteps ? 'Hide' : 'View'}
              </span>
            </button>

            {/* Expanded Waypoint List */}
            {showAllSteps && (
              <div className="max-h-48 space-y-1.5 overflow-y-auto rounded-xl border border-white/10 bg-[#0B1220]/95 p-2 text-xs">
                {route.steps.map((step, idx) => (
                  <div
                    key={`step-${step.nodeId}-${idx}`}
                    onClick={() => {
                      if (navMode === 'simulation') {
                        const dist = stepCumulativeDistances[idx] ?? 0
                        setSimulatedDistance(dist)
                      } else {
                        setActiveStepIndex(idx)
                        setIsNavigating(true)
                      }
                    }}
                    className={`flex cursor-pointer items-start justify-between rounded-lg p-2 transition-colors ${
                      idx === effectiveStepIndex
                        ? 'bg-cyan-500/15 ring-1 ring-cyan-500/30 font-semibold text-cyan-200'
                        : 'hover:bg-white/5 text-slate-300'
                    }`}
                  >
                    <div className="truncate pr-2">
                      <span className="text-slate-500 mr-1.5">{idx + 1}.</span>
                      <span>{step.title}</span>
                    </div>
                    <span className="text-[10px] text-amber-400 uppercase flex-shrink-0">
                      {step.verificationStatus}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Disconnected or Unverified Destination Message */}
        {routeCalculation.status !== 'ok' && (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-950/40 p-3.5 text-xs text-amber-200">
            <div className="flex items-start gap-2.5">
              <AlertTriangle size={18} className="mt-0.5 text-amber-400 flex-shrink-0" />
              <div className="space-y-1">
                <h2 className="font-semibold text-amber-100">
                  {routeCalculation.status === 'unverified'
                    ? 'Entrance Pending Verification'
                    : routeCalculation.status === 'same-node'
                      ? 'Identical Start & End'
                      : 'Route Unavailable — Disconnected'}
                </h2>
                <p className="text-[11px] text-amber-300/90 leading-relaxed">
                  {routeCalculation.message}
                </p>
                <p className="text-[10px] text-amber-400/80 pt-1">
                  Per strict campus navigation safety rules, unmapped or speculative paths are not generated.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Landmarks Traversed */}
      {landmarksPassed.length > 0 && (
        <div className="border-t border-white/10 pt-2.5">
          <div className="text-[11px] font-semibold text-slate-400">Landmarks along this path:</div>
          <div className="mt-1 flex flex-wrap gap-1">
            {landmarksPassed.map((landmark) => (
              <span
                key={landmark}
                className="rounded-lg bg-white/5 border border-white/10 px-2 py-0.5 text-[10px] font-medium text-slate-300"
              >
                {landmark}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Honest Technical Note */}
      <div className="border-t border-white/10 pt-2 text-[10px] text-slate-500">
        <span className="font-medium text-slate-400">Route Engine:</span> Dijkstra calculation on campus 3D model graph. All paths marked provisional pending field ground-truthing.
      </div>
    </div>
  )

  return (
    <div className="relative min-h-[calc(100vh-4rem)] p-3 md:p-4 overflow-x-hidden">
      {/* ============================================================== */}
      {/* DESKTOP LAYOUT (md:flex): Proper 2-Column Sibling Workspace   */}
      {/* ============================================================== */}
      <div className="hidden md:flex h-[calc(100vh-6.5rem)] min-h-[640px] w-full gap-4">
        {/* Left Column: Dedicated Collapsible Route Sidebar */}
        <aside
          className={`flex flex-col h-full bg-[#0B1220]/95 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl overflow-hidden transition-all duration-300 relative flex-shrink-0 ${
            isSidebarCollapsed ? 'w-14 items-center' : 'w-[360px] xl:w-[380px]'
          }`}
        >
          {/* Collapsed Mini-Sidebar View */}
          {isSidebarCollapsed ? (
            <div className="flex flex-col items-center py-4 gap-4 h-full">
              <button
                type="button"
                onClick={() => setIsSidebarCollapsed(false)}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:bg-cyan-500/20 hover:text-cyan-300 transition-colors"
                title="Expand route planner"
                aria-label="Expand route planner"
              >
                <PanelLeftOpen size={18} />
              </button>
              <div className="h-px w-8 bg-white/10" />
              <button
                type="button"
                onClick={handleReset}
                className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
                title="Reset route"
                aria-label="Reset route"
              >
                <RotateCcw size={16} />
              </button>
              <button
                type="button"
                onClick={handleSwap}
                className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
                title="Swap origin and destination"
                aria-label="Swap origin and destination"
              >
                <ArrowLeftRight size={16} />
              </button>
              <div className="mt-auto flex flex-col items-center pb-2">
                <span className="h-2.5 w-2.5 rounded-full bg-cyan-400 animate-pulse shadow-sm shadow-cyan-400/50" title="Campus Navigator Active" />
              </div>
            </div>
          ) : (
            /* Expanded Full Sidebar */
            <div className="flex flex-col h-full p-4 overflow-y-auto">
              {/* Header: Title, Reset and Collapse Toggle */}
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white shadow-sm shadow-cyan-500/20">
                    <Navigation size={16} />
                  </div>
                  <div>
                    <h1 className="text-sm font-semibold text-slate-100 leading-tight">Campus Navigator</h1>
                    <p className="text-[10px] text-slate-400 truncate max-w-[190px]">MNMJEC Campus Model</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="flex h-8 items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-2 text-xs font-medium text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
                    title="Reset route to default"
                  >
                    <RotateCcw size={12} />
                    <span>Reset</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsSidebarCollapsed(true)}
                    className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
                    title="Collapse sidebar"
                    aria-label="Collapse sidebar"
                  >
                    <PanelLeftClose size={14} />
                  </button>
                </div>
              </div>

              {/* Sidebar Body */}
              <div className="mt-3 flex-1 overflow-y-auto pr-1">
                {renderPlanningControls(false)}
              </div>
            </div>
          )}
        </aside>

        {/* Right Column: Large Dedicated 3D Campus Viewport (Sibling in Flexbox) */}
        <main className="flex-1 min-w-0 h-full relative rounded-3xl border border-white/10 bg-[#0B1220] overflow-hidden shadow-2xl">
          <Campus3D
            key={`campus-3d-desktop-${cameraRevision}`}
            routePoints={liveRoutePoints}
            activeStepPoint={navMode === 'manual' && isNavigating ? activeStepPoint : null}
            simulatedPosition={
              navMode === 'live'
                ? navState.displayPosition
                : navMode === 'simulation'
                  ? simProgress.position
                  : null
            }
            simulatedAccuracyRadius={
              navMode === 'live'
                ? navState.accuracyRadiusModel
                : null
            }
            completedPoints={
              navMode === 'live'
                ? navState.completedPoints
                : navMode === 'simulation'
                  ? simProgress.completedPoints
                  : undefined
            }
            remainingPoints={
              navMode === 'live'
                ? navState.remainingPoints
                : navMode === 'simulation'
                  ? simProgress.remainingPoints
                  : undefined
            }
            isSimulating={navMode === 'live' || navMode === 'simulation'}
            selectedBuildingId={toId}
            viewTarget="route"
            showHud={false}
            showInstructionBadge={false}
            className="absolute inset-0 h-full w-full"
            onBuildingSelect={handleBuildingSelect}
          />
          {/* Subtle bottom-left hint */}
          <div className="pointer-events-none absolute bottom-4 left-4 z-10">
            <div className="pointer-events-auto rounded-full bg-[#0B1220]/80 border border-white/10 px-3.5 py-1.5 text-[11px] font-medium text-slate-300 shadow-xl backdrop-blur-xl">
              Click any building to set destination • Drag to orbit • Scroll to zoom
            </div>
          </div>
        </main>
      </div>

      {/* ============================================================== */}
      {/* MOBILE LAYOUT (< md): Large Viewport + Collapsible Bottom Sheet */}
      {/* ============================================================== */}
      <div className="flex md:hidden flex-col h-[calc(100dvh-10.5rem)] min-h-[460px] w-full relative rounded-3xl border border-white/10 bg-[#0B1220] overflow-hidden shadow-2xl">
        {/* Full 3D Campus Viewport */}
        <div className="absolute inset-0 h-full w-full">
          <Campus3D
            key={`campus-3d-mobile-${cameraRevision}`}
            routePoints={liveRoutePoints}
            activeStepPoint={navMode === 'manual' && isNavigating ? activeStepPoint : null}
            simulatedPosition={
              navMode === 'live'
                ? navState.displayPosition
                : navMode === 'simulation'
                  ? simProgress.position
                  : null
            }
            simulatedAccuracyRadius={
              navMode === 'live'
                ? navState.accuracyRadiusModel
                : null
            }
            completedPoints={
              navMode === 'live'
                ? navState.completedPoints
                : navMode === 'simulation'
                  ? simProgress.completedPoints
                  : undefined
            }
            remainingPoints={
              navMode === 'live'
                ? navState.remainingPoints
                : navMode === 'simulation'
                  ? simProgress.remainingPoints
                  : undefined
            }
            isSimulating={navMode === 'live' || navMode === 'simulation'}
            selectedBuildingId={toId}
            viewTarget="route"
            showHud={false}
            showInstructionBadge={false}
            className="h-full w-full"
            onBuildingSelect={handleBuildingSelect}
          />
        </div>

        {/* Floating Mobile Bottom Sheet with 3 States: collapsed, half, expanded */}
        <div
          className={`absolute inset-x-0 bottom-0 z-30 flex flex-col rounded-t-3xl bg-[#0B1220]/95 shadow-2xl border-t border-x border-white/10 backdrop-blur-2xl transition-all duration-300 ${
            mobileSheetState === 'collapsed'
              ? 'h-14'
              : mobileSheetState === 'half'
                ? 'h-[52%] max-h-[350px]'
                : 'h-[85%]'
          }`}
        >
          {/* Grab Handle & Sheet Header */}
          <div
            onClick={(e) => {
              if ((e.target as HTMLElement).tagName !== 'BUTTON' && !(e.target as HTMLElement).closest('button')) {
                setMobileSheetState((s) => (s === 'collapsed' ? 'half' : 'collapsed'))
              }
            }}
            className="flex flex-col items-center px-4 pt-2 pb-2 border-b border-white/10 flex-shrink-0 cursor-pointer select-none"
          >
            <button
              type="button"
              onClick={() => {
                setMobileSheetState((s) => (s === 'collapsed' ? 'half' : s === 'half' ? 'expanded' : 'collapsed'))
              }}
              className="h-1.5 w-12 rounded-full bg-slate-700 hover:bg-slate-500 transition-colors mb-2"
              aria-label="Toggle sheet height"
            />
            <div className="flex w-full items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-cyan-500 text-white shadow-sm shadow-cyan-500/20">
                  <Navigation size={14} />
                </div>
                <div className="text-left">
                  <h2 className="text-xs font-semibold text-slate-100 leading-tight">Campus Navigator</h2>
                  <p className="text-[10px] text-slate-400">
                    {mobileSheetState === 'collapsed'
                      ? routeCalculation.status === 'ok'
                        ? 'Route calculated • Tap to view'
                        : 'Route unavailable • Tap'
                      : 'Misrimal Navajee Munoth Jain'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleReset}
                  className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[11px] font-medium text-slate-300 hover:bg-white/10"
                  title="Reset"
                >
                  <RotateCcw size={12} />
                </button>
                {mobileSheetState === 'collapsed' ? (
                  <button
                    type="button"
                    onClick={() => setMobileSheetState('half')}
                    className="rounded-lg border border-white/10 bg-white/5 p-1 text-slate-300 hover:bg-white/10"
                    title="Expand sheet"
                    aria-label="Expand sheet"
                  >
                    <ChevronUp size={16} />
                  </button>
                ) : mobileSheetState === 'half' ? (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setMobileSheetState('collapsed')}
                      className="rounded-lg border border-white/10 bg-white/5 p-1 text-slate-300 hover:bg-white/10"
                      title="Collapse sheet"
                      aria-label="Collapse sheet"
                    >
                      <ChevronDown size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setMobileSheetState('expanded')}
                      className="rounded-lg border border-white/10 bg-white/5 p-1 text-slate-300 hover:bg-white/10"
                      title="Maximize sheet"
                      aria-label="Maximize sheet"
                    >
                      <ChevronUp size={16} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setMobileSheetState('half')}
                    className="rounded-lg border border-white/10 bg-white/5 p-1 text-slate-300 hover:bg-white/10"
                    title="Minimize sheet"
                    aria-label="Minimize sheet"
                  >
                    <ChevronDown size={16} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Sheet Body (Hidden when collapsed) */}
          {mobileSheetState !== 'collapsed' && (
            <div className="flex-1 overflow-y-auto p-4">
              {renderPlanningControls(true)}
            </div>
          )}
        </div>
      </div>

      {/* Supporting Information Cards below main workspace */}
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <SurfaceCard title="Campus Pathway Policy" subtitle="Accurate spatial guidance">
          <div className="flex items-start gap-2.5 text-xs text-slate-300">
            <Info size={16} className="text-cyan-400 flex-shrink-0 mt-0.5" />
            <p>
              Navigation routes follow geometry extracted directly from the Blender campus GLB. If pathway connectivity is uncertain or pending survey, routes are honestly marked provisional.
            </p>
          </div>
        </SurfaceCard>

        <SurfaceCard title="Real-Time 3D Interaction" subtitle="Responsive controls">
          <div className="flex items-start gap-2.5 text-xs text-slate-300">
            <Compass size={16} className="text-cyan-400 flex-shrink-0 mt-0.5" />
            <p>
              Use the top-right camera controls to toggle between 3D Isometric, 2D Top-down, Fit Route, and Campus Reset perspectives. Tap or click directly on any academic block in the 3D model to refocus your route.
            </p>
          </div>
        </SurfaceCard>
      </div>
    </div>
  )
}
