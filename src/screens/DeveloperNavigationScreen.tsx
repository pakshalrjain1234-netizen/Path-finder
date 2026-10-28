import {
  AlertTriangle,
  ArrowLeftRight,
  ArrowUp,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Crosshair,
  FlaskConical,
  PanelLeftClose,
  PanelLeftOpen,
  Pause,
  Play,
  RotateCcw,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { Campus3D } from '../components/Campus3D'
import { buildings } from '../data/buildings'
import { type CampusBuildingId } from '../data/campusModelMapping'
import {
  campusDestinationNodesByBuildingId,
  campusNavigationGraph,
  campusNavigationNodesById,
} from '../data/navigationGraph'
import { createRoutePlan } from '../lib/routePlanner'
import { computeCumulativeDistances, interpolatePolylineAtDistance } from '../lib/routeSimulation'
import { useGpsLocation } from '../hooks/useGpsLocation'
import { useLiveNavigation } from '../hooks/useLiveNavigation'
import { NAVIGATION_SCENARIOS } from '../data/navigationScenarios'
import { isDevTestAuthorized } from '../lib/devAuth'
import type { ScenarioId } from '../types/liveNavigation'
import type { Point3, RoutePlan } from '../types/navigation'

interface LocationOption {
  id: string
  label: string
  nodeId: string | null
  type: 'gate' | 'building'
}

type DevTestTab = 'scenarios' | 'virtual_walk'

function DeveloperNavigationScreenInner() {

  const [searchParams] = useSearchParams()
  const [fromId, setFromId] = useState<string>(() => searchParams.get('from') || 'main-gate-1')
  const [toId, setToId] = useState<string>(() => searchParams.get('to') || 'it-block')
  const [devTab, setDevTab] = useState<DevTestTab>('scenarios')
  const [selectedScenarioId, setSelectedScenarioId] = useState<ScenarioId>('walk_main_gate_to_it')
  const [cameraRevision, setCameraRevision] = useState<number>(0)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false)

  // Virtual walk states
  const [isPlaying, setIsPlaying] = useState<boolean>(false)
  const [simulatedDistance, setSimulatedDistance] = useState<number>(0)
  const [simSpeed, setSimSpeed] = useState<number>(3.0)

  // Unified location options
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

  const originNodeId = useMemo(() => {
    return locationOptions.find((l) => l.id === fromId)?.nodeId ?? null
  }, [fromId, locationOptions])

  const destinationNodeId = useMemo(() => {
    return locationOptions.find((l) => l.id === toId)?.nodeId ?? null
  }, [toId, locationOptions])

  // Route calculation
  const routeCalculation = useMemo(() => {
    if (toId === 'library' || fromId === 'library') {
      return {
        route: null,
        status: 'unavailable',
        message: 'Precise entrance and route to Dr. C. L. Mehta Central Library are pending physical surveyor verification. Please select Main Block or First Year Block.',
      }
    }
    if (!originNodeId || !destinationNodeId || originNodeId === destinationNodeId) {
      return { route: null, status: 'unavailable', message: 'Select distinct start and destination nodes.' }
    }
    const result = createRoutePlan(campusNavigationGraph, originNodeId, destinationNodeId)
    return {
      route: result.status === 'ok' ? result.route : null,
      status: result.status,
      message: result.status === 'ok' ? null : result.message,
    }
  }, [fromId, toId, originNodeId, destinationNodeId])

  const route: RoutePlan | null = routeCalculation.route

  const routePoints = useMemo<Point3[]>(() => {
    if (!route) return []
    return route.nodeIds
      .map((id) => campusNavigationNodesById.get(id)?.position)
      .filter((pos): pos is Point3 => Boolean(pos))
  }, [route])

  // GPS & Live Navigation Hooks
  const { coords: gpsCoords, calibrationModel } = useGpsLocation()

  const {
    navState,
    activeScenario,
    scenarioStepIndex,
    stopNavigation: stopLiveNav,
    runScenario,
    stepScenario,
  } = useLiveNavigation({
    route,
    routePoints,
    calibration: calibrationModel,
    liveCoordinates: gpsCoords,
    isSimulated: true, // Developer utility is always clearly simulated
    graph: campusNavigationGraph,
    destinationNodeId,
  })

  // Dynamic route points (switches upon automatic rerouting)
  const liveRoutePoints = useMemo<Point3[]>(() => {
    if (navState.activeRoutePlan) {
      return navState.activeRoutePlan.nodeIds
        .map((id) => campusNavigationNodesById.get(id)?.position)
        .filter((pos): pos is Point3 => Boolean(pos))
    }
    return routePoints
  }, [navState.activeRoutePlan, routePoints])

  const handleRunScenario = (scenarioId: ScenarioId) => {
    const scenario = NAVIGATION_SCENARIOS.find((s) => s.id === scenarioId)
    if (scenario) {
      setSelectedScenarioId(scenarioId)
      if (scenario.fromId !== fromId) setFromId(scenario.fromId)
      if (scenario.toId !== toId) setToId(scenario.toId)
      runScenario(scenarioId)
    }
  }

  // Virtual walk polyline calculations
  const cumulativeDistances = useMemo(() => computeCumulativeDistances(routePoints), [routePoints])
  const totalRouteDistance = useMemo(() => {
    return cumulativeDistances.length > 0 ? cumulativeDistances[cumulativeDistances.length - 1] : 0
  }, [cumulativeDistances])

  const simProgress = useMemo(() => {
    return interpolatePolylineAtDistance(routePoints, cumulativeDistances, simulatedDistance)
  }, [routePoints, cumulativeDistances, simulatedDistance])

  // Continuous animation frame loop for virtual walk
  useEffect(() => {
    if (!isPlaying || devTab !== 'virtual_walk' || totalRouteDistance <= 0) return

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
  }, [isPlaying, devTab, simSpeed, totalRouteDistance])

  const handleSwap = () => {
    setFromId(toId)
    setToId(fromId)
    setIsPlaying(false)
    setSimulatedDistance(0)
  }

  const handleReset = () => {
    setFromId('main-gate-1')
    setToId('it-block')
    setIsPlaying(false)
    setSimulatedDistance(0)
    stopLiveNav()
  }

  return (
    <div className="relative min-h-[calc(100vh-4rem)] p-3 md:p-4 overflow-x-hidden bg-[#E8DDF2] text-[#352A47] font-sans">
      {/* Prominent Developer Warning Banner */}
      <div className="mb-3 rounded-2xl border border-amber-300 bg-amber-50 p-3 shadow-sm backdrop-blur-xl">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-xs font-heading font-bold uppercase tracking-wider text-amber-950">
              SIMULATION MODE — DEVELOPER NAVIGATION TEST UTILITY
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-amber-800">
              Isolated testing tool for GPS mock observations, virtual walks &amp; rerouting
            </span>
            <Link
              to="/navigation"
              className="rounded-xl border border-amber-400/40 bg-amber-100 px-2.5 py-1 text-xs font-heading font-bold text-amber-950 hover:bg-amber-200 transition"
            >
              Exit to Student Navigation
            </Link>
          </div>
        </div>
      </div>

      {/* Main 2-Column Desktop / Mobile Layout */}
      <div className="flex flex-col md:flex-row h-[calc(100vh-10rem)] min-h-[580px] w-full gap-4">
        {/* Left Column: Developer Controls Sidebar */}
        <aside
          className={`flex flex-col h-full bg-[#FAF8FC] backdrop-blur-xl rounded-3xl border border-[#352A47]/10 shadow-lg overflow-hidden transition-all duration-300 relative flex-shrink-0 ${isSidebarCollapsed ? 'w-14 items-center' : 'w-full md:w-[380px] xl:w-[420px]'
            }`}
        >
          {isSidebarCollapsed ? (
            <div className="flex flex-col items-center py-4 gap-4 h-full">
              <button
                type="button"
                onClick={() => setIsSidebarCollapsed(false)}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E8DDF2] border border-[#352A47]/15 text-[#352A47] hover:bg-[#D2BEE7] transition-colors cursor-pointer"
                title="Expand Developer Panel"
                aria-label="Expand Developer Panel"
              >
                <PanelLeftOpen size={18} />
              </button>
              <div className="h-px w-8 bg-[#352A47]/10" />
              <button
                type="button"
                onClick={handleReset}
                className="flex h-10 w-10 items-center justify-center rounded-xl text-[#51465F] hover:bg-[#E8DDF2] hover:text-[#352A47] transition-colors cursor-pointer"
                title="Reset route"
                aria-label="Reset route"
              >
                <RotateCcw size={16} />
              </button>
            </div>
          ) : (
            <div className="flex flex-col h-full p-4 overflow-y-auto space-y-3">
              {/* Sidebar Header */}
              <div className="flex items-center justify-between border-b border-[#352A47]/10 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#D2BEE7]/60 border border-[#352A47]/15 text-[#352A47]">
                    <FlaskConical size={16} />
                  </div>
                  <div>
                    <h1 className="text-sm font-heading font-bold text-[#352A47] leading-tight">Developer Navigation Test</h1>
                    <p className="text-[11px] text-[#51465F]">Phase 4B/4C Architecture Validation</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="flex h-8 items-center gap-1 rounded-xl border border-[#352A47]/15 bg-white px-2.5 text-xs font-heading font-semibold text-[#51465F] hover:bg-[#FAF8FC] hover:text-[#352A47] transition-colors cursor-pointer shadow-sm"
                    title="Reset to default route"
                  >
                    <RotateCcw size={12} />
                    <span>Reset</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsSidebarCollapsed(true)}
                    className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#352A47]/15 bg-white text-[#51465F] hover:bg-[#FAF8FC] hover:text-[#352A47] transition-colors cursor-pointer shadow-sm"
                    title="Collapse sidebar"
                    aria-label="Collapse sidebar"
                  >
                    <PanelLeftClose size={14} />
                  </button>
                </div>
              </div>

              {/* Origin & Destination Selectors */}
              <div className="space-y-2 rounded-2xl border border-[#352A47]/10 bg-[#E8DDF2]/30 p-3">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#825A9E]" />
                  <span className="text-[11px] font-heading font-bold uppercase tracking-wider text-[#51465F]">Origin</span>
                  <select
                    value={fromId}
                    onChange={(e) => setFromId(e.target.value)}
                    className="w-full bg-white rounded-xl border border-[#352A47]/15 px-2.5 py-1.5 text-xs text-[#352A47] outline-none shadow-sm cursor-pointer"
                  >
                    {locationOptions.map((opt) => (
                      <option key={`dev-from-${opt.id}`} value={opt.id}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-center">
                  <button
                    type="button"
                    onClick={handleSwap}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-[#352A47]/15 bg-white text-[#51465F] hover:border-[#825A9E] hover:text-[#352A47] transition cursor-pointer shadow-sm touch-target"
                    title="Swap start & destination"
                  >
                    <ArrowLeftRight size={13} />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-rose-500" />
                  <span className="text-[11px] font-heading font-bold uppercase tracking-wider text-[#51465F]">Destination</span>
                  <select
                    value={toId}
                    onChange={(e) => setToId(e.target.value)}
                    className="w-full bg-white rounded-xl border border-[#352A47]/15 px-2.5 py-1.5 text-xs text-[#352A47] outline-none shadow-sm cursor-pointer"
                  >
                    {locationOptions.map((opt) => (
                      <option key={`dev-to-${opt.id}`} value={opt.id}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Test Mode Selector Tabs */}
              <div className="flex rounded-xl bg-[#DFD1EC] border border-[#352A47]/10 p-1 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setDevTab('scenarios')
                    setIsPlaying(false)
                  }}
                  className={`flex-1 rounded-lg py-1.5 font-heading font-bold transition cursor-pointer ${devTab === 'scenarios'
                      ? 'bg-[#352A47] text-[#FAF8FC] shadow-sm'
                      : 'text-[#51465F] hover:text-[#352A47]'
                    }`}
                >
                  GPS Scenarios
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDevTab('virtual_walk')
                    stopLiveNav()
                  }}
                  className={`flex-1 rounded-lg py-1.5 font-heading font-bold transition cursor-pointer ${devTab === 'virtual_walk'
                      ? 'bg-[#352A47] text-[#FAF8FC] shadow-sm'
                      : 'text-[#51465F] hover:text-[#352A47]'
                    }`}
                >
                  Virtual Walk
                </button>
              </div>

              {/* SCENARIO SUITE */}
              {devTab === 'scenarios' ? (
                <div className="space-y-3">
                  {/* Status Indicator */}
                  <div className="rounded-xl border border-[#352A47]/10 bg-[#E8DDF2]/30 p-3 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-heading font-bold uppercase tracking-wider text-[#352A47]">
                        {activeScenario ? activeScenario.name : 'Ready for scenario selection'}
                      </span>
                      <span className="rounded-full bg-[#D2BEE7]/60 px-2 py-0.5 border border-[#352A47]/15 text-[#352A47] font-heading font-semibold text-[11px]">
                        Obs {scenarioStepIndex + 1}/{activeScenario ? activeScenario.observations.length : 0}
                      </span>
                    </div>
                    <p className="text-xs text-[#51465F]">
                      {activeScenario ? activeScenario.description : 'Select a pre-programmed navigation test scenario below.'}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-[#51465F] pt-1">
                      <span>Status: <strong className="text-[#352A47] uppercase">{navState.status}</strong></span>
                      <span>Confidence: <strong className="text-[#825A9E] uppercase">{navState.confidence}</strong></span>
                      {navState.rerouteCount > 0 && (
                        <span className="text-emerald-700 font-bold">Reroutes: {navState.rerouteCount}</span>
                      )}
                    </div>
                  </div>

                  {/* Scenario Dropdown & Runner */}
                  <div className="space-y-2 rounded-2xl border border-[#352A47]/10 bg-[#FAF8FC] p-3 shadow-sm">
                    <label className="text-[11px] font-heading font-bold uppercase tracking-wider text-[#51465F] block">
                      Choose Deterministic Scenario
                    </label>
                    <select
                      value={selectedScenarioId}
                      onChange={(e) => {
                        const scId = e.target.value as ScenarioId
                        setSelectedScenarioId(scId)
                        handleRunScenario(scId)
                      }}
                      className="w-full rounded-xl border border-[#352A47]/15 bg-white px-3 py-2 text-xs font-semibold text-[#352A47] outline-none shadow-sm cursor-pointer"
                    >
                      {NAVIGATION_SCENARIOS.map((sc) => (
                        <option key={sc.id} value={sc.id}>
                          {sc.name}
                        </option>
                      ))}
                    </select>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleRunScenario(selectedScenarioId)}
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-[#352A47] hover:bg-[#231A32] py-2.5 text-xs font-heading font-bold text-[#FAF8FC] shadow-md shadow-[#352A47]/20 transition cursor-pointer min-h-[44px]"
                      >
                        <Play size={14} />
                        <span>Run Test Scenario</span>
                      </button>

                      {activeScenario && (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={scenarioStepIndex === 0}
                            onClick={() => stepScenario('prev')}
                            className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#352A47]/15 bg-white text-[#51465F] hover:bg-[#FAF8FC] hover:text-[#352A47] transition-colors disabled:opacity-40 cursor-pointer shadow-sm"
                            title="Step backward"
                            aria-label="Step backward"
                          >
                            <ChevronLeft size={14} />
                          </button>
                          <button
                            type="button"
                            disabled={scenarioStepIndex >= activeScenario.observations.length - 1}
                            onClick={() => stepScenario('next')}
                            className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#352A47]/15 bg-white text-[#51465F] hover:bg-[#FAF8FC] hover:text-[#352A47] transition-colors disabled:opacity-40 cursor-pointer shadow-sm"
                            title="Step forward"
                            aria-label="Step forward"
                          >
                            <ChevronRight size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setCameraRevision((r) => r + 1)}
                            className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#352A47]/15 bg-white text-[#352A47] hover:bg-[#FAF8FC] transition-colors cursor-pointer shadow-sm"
                            title="Recenter camera"
                            aria-label="Recenter camera"
                          >
                            <Crosshair size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Turn Guidance Live Preview */}
                  <div className="rounded-2xl border border-[#352A47]/10 bg-[#FAF8FC] p-3.5 space-y-2.5 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#352A47] text-[#FAF8FC] shadow-md shadow-[#352A47]/20">
                        {navState.status === 'arrived' ? (
                          <CheckCircle2 size={20} />
                        ) : navState.isOffRoute ? (
                          <AlertTriangle size={20} />
                        ) : (
                          <ArrowUp size={20} />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-heading font-bold text-[#352A47]">
                          {navState.status === 'arrived'
                            ? 'Destination Arrived'
                            : `In ${navState.distanceToNextTurn.toFixed(0)} m`}
                        </div>
                        <div className="text-xs text-[#51465F] mt-0.5">
                          {navState.currentStep?.title ?? 'Follow walkway route'}
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1 pt-1">
                      <div className="flex justify-between text-xs text-[#51465F]">
                        <span>{navState.remainingDistance.toFixed(0)}m remaining</span>
                        <span>{(navState.progressRatio * 100).toFixed(0)}%</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-[#DFD1EC] overflow-hidden">
                        <div
                          className="h-full bg-[#352A47] transition-all duration-300"
                          style={{ width: `${Math.min(100, Math.max(0, navState.progressRatio * 100))}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* VIRTUAL WALK SIMULATION */
                <div className="space-y-3">
                  <div className="rounded-2xl border border-[#352A47]/10 bg-[#FAF8FC] p-3.5 space-y-2.5 shadow-sm">
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
                          className="flex items-center gap-1.5 rounded-xl bg-[#352A47] hover:bg-[#231A32] px-3.5 py-2 text-xs font-heading font-bold text-[#FAF8FC] shadow-sm transition cursor-pointer min-h-[36px]"
                        >
                          {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                          <span>{isPlaying ? 'Pause' : simProgress.isFinished ? 'Replay' : 'Play Walk'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsPlaying(false)
                            setSimulatedDistance(0)
                          }}
                          className="flex items-center gap-1.5 rounded-xl border border-[#352A47]/15 bg-white px-2.5 py-2 text-xs font-heading font-medium text-[#51465F] hover:bg-[#FAF8FC] hover:text-[#352A47] transition cursor-pointer min-h-[36px] shadow-sm"
                        >
                          <RotateCcw size={13} />
                          <span>Reset</span>
                        </button>
                      </div>

                      {/* Speed */}
                      <div className="flex items-center gap-0.5 rounded-lg bg-[#DFD1EC] border border-[#352A47]/10 p-0.5 text-[11px]">
                        {[1.5, 3.0, 6.0].map((speed) => (
                          <button
                            key={speed}
                            type="button"
                            onClick={() => setSimSpeed(speed)}
                            className={`rounded-md px-1.5 py-0.5 font-heading font-bold transition cursor-pointer ${simSpeed === speed
                                ? 'bg-[#352A47] text-[#FAF8FC]'
                                : 'text-[#51465F] hover:text-[#352A47]'
                              }`}
                          >
                            {speed === 1.5 ? '1x' : speed === 3.0 ? '2x' : '4x'}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Scrubber */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-[#51465F]">
                        <span>Distance</span>
                        <span className="font-heading font-semibold text-[#352A47]">
                          {simulatedDistance.toFixed(1)}m / {totalRouteDistance.toFixed(1)}m
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={totalRouteDistance || 1}
                        step={0.2}
                        value={simulatedDistance}
                        onChange={(e) => setSimulatedDistance(parseFloat(e.target.value))}
                        className="w-full accent-[#352A47] cursor-pointer bg-[#DFD1EC]"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </aside>

        {/* Right Column: Dedicated 3D Viewport */}
        <main className="flex-1 min-w-0 h-full relative rounded-3xl border border-[#352A47]/15 bg-[#E8DDF2] overflow-hidden shadow-2xl">
          <Campus3D
            key={`dev-campus-3d-${cameraRevision}`}
            routePoints={liveRoutePoints}
            simulatedPosition={
              devTab === 'scenarios'
                ? navState.displayPosition
                : devTab === 'virtual_walk'
                  ? simProgress.position
                  : null
            }
            simulatedAccuracyRadius={devTab === 'scenarios' ? navState.accuracyRadiusModel : null}
            completedPoints={
              devTab === 'scenarios'
                ? navState.completedPoints
                : devTab === 'virtual_walk'
                  ? simProgress.completedPoints
                  : undefined
            }
            remainingPoints={
              devTab === 'scenarios'
                ? navState.remainingPoints
                : devTab === 'virtual_walk'
                  ? simProgress.remainingPoints
                  : undefined
            }
            isSimulating={true}
            selectedBuildingId={toId}
            viewTarget="route"
            showHud={false}
            showInstructionBadge={false}
            className="absolute inset-0 h-full w-full"
            onBuildingSelect={(id) => setToId(id)}
          />

          <div className="pointer-events-none absolute bottom-4 left-4 z-10">
            <div className="pointer-events-auto rounded-full bg-[#FAF8FC]/90 border border-[#352A47]/15 px-3.5 py-1.5 text-xs font-medium text-[#51465F] shadow-sm backdrop-blur-xl">
              Developer View: Model highlights remaining path in deep plum &amp; completed path in muted lilac
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export function DeveloperNavigationScreen() {
  if (!isDevTestAuthorized()) {
    return <Navigate to="/navigation" replace />
  }
  return <DeveloperNavigationScreenInner />
}

