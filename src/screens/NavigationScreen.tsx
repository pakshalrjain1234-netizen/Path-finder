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
  ExternalLink,
  Footprints,
  Info,
  Layers,
  Navigation,
  PanelLeftClose,
  PanelLeftOpen,
  RotateCcw,
  ShieldAlert,
  StopCircle,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Campus3D } from '../components/Campus3D'
import { SurfaceCard } from '../components/SurfaceCard'
import { buildings } from '../data/buildings'
import { type CampusBuildingId } from '../data/campusModelMapping'
import {
  campusDestinationNodesByBuildingId,
  campusNavigationGraph,
  campusNavigationNodesById,
} from '../data/navigationGraph'
import { useGpsLocation } from '../hooks/useGpsLocation'
import { isDevTestAuthorized } from '../lib/devAuth'
import { createRoutePlan } from '../lib/routePlanner'
import { computeCumulativeDistances } from '../lib/routeSimulation'
import type { Point3, RoutePlan } from '../types/navigation'

interface LocationOption {
  id: string
  label: string
  nodeId: string | null
  type: 'gate' | 'building'
}

type MobileSheetState = 'collapsed' | 'half' | 'expanded'

export function NavigationScreen() {
  const [searchParams] = useSearchParams()
  const [fromId, setFromId] = useState<string>(() => searchParams.get('from') || 'main-gate-1')
  const [toId, setToId] = useState<string>(() => searchParams.get('to') || 'it-block')
  const [isNavigating, setIsNavigating] = useState<boolean>(false)
  const [activeStepIndex, setActiveStepIndex] = useState<number>(0)
  const [showAllSteps, setShowAllSteps] = useState<boolean>(false)
  const [cameraRevision, setCameraRevision] = useState<number>(0)

  // Layout states
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false)
  const [mobileSheetState, setMobileSheetState] = useState<MobileSheetState>('half')

  // GPS Safety & Calibration status
  const { coords: gpsCoords, calibrationModel, geofence } = useGpsLocation()
  const isGpsLiveApproved = geofence?.isApprovedForLiveNavigation === true && calibrationModel.status === 'calibrated'

  // Notice banner when student clicks "Start Navigation"
  const [showGpsNotice, setShowGpsNotice] = useState<boolean>(false)

  // React to searchParam changes
  useEffect(() => {
    const qFrom = searchParams.get('from')
    const qTo = searchParams.get('to')
    if (qFrom) setFromId(qFrom)
    if (qTo) setToId(qTo)
  }, [searchParams])

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

  // Calculate route plan automatically
  const routeCalculation = useMemo(() => {
    if (toId === 'library' || fromId === 'library') {
      return {
        status: 'unverified' as const,
        route: null,
        message: 'Precise entrance and route to Dr. C. L. Mehta Central Library are pending physical surveyor verification. Please select Main Block or First Year Block.',
      }
    }

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

  // Polyline cumulative distances
  const cumulativeDistances = useMemo(() => computeCumulativeDistances(routePoints), [routePoints])
  const totalRouteDistance = useMemo(() => {
    return cumulativeDistances.length > 0 ? cumulativeDistances[cumulativeDistances.length - 1] : 0
  }, [cumulativeDistances])

  // Active step point in 3D: highlights current waypoint on campus model without moving real blue dot
  const activeStepPoint = useMemo<Point3 | null>(() => {
    if (!isNavigating || !route || !route.steps[activeStepIndex]) return null
    const nodeId = route.steps[activeStepIndex].nodeId
    return campusNavigationNodesById.get(nodeId)?.position ?? null
  }, [isNavigating, route, activeStepIndex])

  // Current and next steps
  const currentStep = route?.steps[activeStepIndex] ?? null
  const nextStep = route && activeStepIndex + 1 < route.steps.length ? route.steps[activeStepIndex + 1] : null
  const isArrived = isNavigating && Boolean(route) && activeStepIndex === (route?.steps.length ?? 0) - 1

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

  // Estimated walking duration: ~80 meters per minute (1.33 m/s)
  const estimatedWalkingMinutes = useMemo(() => {
    if (totalRouteDistance <= 0) return 1
    return Math.max(1, Math.round(totalRouteDistance / 80))
  }, [totalRouteDistance])

  // Swap origin and destination
  const handleSwap = () => {
    const prevFrom = fromId
    const prevTo = toId
    setFromId(prevTo)
    setToId(prevFrom)
    setActiveStepIndex(0)
    setIsNavigating(false)
    setShowGpsNotice(false)
  }

  // Reset to default
  const handleReset = () => {
    setFromId('main-gate-1')
    setToId('it-block')
    setActiveStepIndex(0)
    setIsNavigating(false)
    setShowAllSteps(false)
    setShowGpsNotice(false)
  }

  // Handle building selection from 3D canvas
  const handleBuildingSelect = (buildingId: string) => {
    setToId(buildingId)
    setActiveStepIndex(0)
    setIsNavigating(false)
    setShowGpsNotice(false)
    if (mobileSheetState === 'collapsed') {
      setMobileSheetState('half')
    }
  }

  // Recenter camera
  const handleRecenterCamera = () => {
    setCameraRevision((r) => r + 1)
  }

  // Primary Action: Start Navigation
  const handleStartNavigation = () => {
    if (!route) return
    setActiveStepIndex(0)
    setIsNavigating(true)

    // Check GPS approval
    if (!isGpsLiveApproved) {
      setShowGpsNotice(true)
    }
  }

  // Exit Navigation
  const handleExitNavigation = () => {
    setIsNavigating(false)
    setActiveStepIndex(0)
    setShowGpsNotice(false)
  }

  // Reusable Route Planning & Navigation Controls
  const renderPlanningControls = (isMobile: boolean = false) => (
    <div className="flex flex-col gap-3">
      {/* Origin & Destination Selectors */}
      <div className="space-y-2">
        <div className="grid gap-2">
          {/* From Input */}
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#111827]/80 px-3 py-1.5 focus-within:border-cyan-400 focus-within:bg-[#162033] focus-within:ring-2 focus-within:ring-cyan-400/20 transition-all">
            <span className="h-2.5 w-2.5 rounded-full border border-white/20 bg-cyan-400 shadow-sm flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <label
                htmlFor={isMobile ? 'mobile-route-from-select' : 'route-from-select'}
                className="block text-[10px] font-bold uppercase tracking-wider text-slate-400"
              >
                From (Origin)
              </label>
              <select
                id={isMobile ? 'mobile-route-from-select' : 'route-from-select'}
                value={fromId}
                disabled={isNavigating}
                onChange={(e) => {
                  setFromId(e.target.value)
                  setActiveStepIndex(0)
                  setIsNavigating(false)
                  setShowGpsNotice(false)
                }}
                className="w-full bg-[#111827] text-xs font-semibold text-white outline-none disabled:opacity-60"
              >
                {isGpsLiveApproved && gpsCoords && (
                  <option value="your-location">Your Location (Verified GPS)</option>
                )}
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
              id={isMobile ? 'btn-swap-locations-mobile' : 'btn-swap-locations'}
              type="button"
              disabled={isNavigating}
              onClick={handleSwap}
              className="relative z-10 flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-[#162033] text-slate-300 shadow-sm hover:border-cyan-400 hover:text-cyan-400 disabled:opacity-40 transition-colors"
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
              <label
                htmlFor={isMobile ? 'mobile-route-to-select' : 'route-to-select'}
                className="block text-[10px] font-bold uppercase tracking-wider text-slate-400"
              >
                To (Destination)
              </label>
              <select
                id={isMobile ? 'mobile-route-to-select' : 'route-to-select'}
                value={toId}
                disabled={isNavigating}
                onChange={(e) => {
                  setToId(e.target.value)
                  setActiveStepIndex(0)
                  setIsNavigating(false)
                  setShowGpsNotice(false)
                }}
                className="w-full bg-[#111827] text-xs font-semibold text-white outline-none disabled:opacity-60"
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

        {/* Route Overview Card (When route is valid) */}
        {routeCalculation.status === 'ok' && route && (
          <div className="flex items-center justify-between rounded-xl bg-[#111827]/70 border border-white/10 p-2.5 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-950/80 text-cyan-400 border border-cyan-500/30">
                <Footprints size={15} />
              </div>
              <div>
                <div className="font-semibold text-white flex items-center gap-1.5">
                  <span>~{totalRouteDistance.toFixed(0)} m (Provisional)</span>
                  <span className="text-slate-400">•</span>
                  <span>~{estimatedWalkingMinutes} min walk (Estimated)</span>
                </div>
                <div className="text-[10px] text-slate-400">
                  {route.steps.length} turns/nodes • Scale uncalibrated • Provisional route
                </div>
              </div>
            </div>
            <span className="rounded-full bg-amber-950/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-300 border border-amber-500/30">
              Provisional Scale
            </span>
          </div>
        )}
      </div>

      {/* Main Action Area: Route Preview vs Active Navigation */}
      <div className="flex-1">
        {routeCalculation.status === 'ok' && route && currentStep && (
          <div className="space-y-3">
            {/* GPS Calibration Safety Notice (When active and uncalibrated) */}
            {isNavigating && showGpsNotice && (
              <div className="rounded-xl border border-blue-500/30 bg-[#0E1A2E] p-2.5 text-[11px] text-blue-200">
                <div className="flex items-start gap-2">
                  <ShieldAlert size={15} className="mt-0.5 text-cyan-400 flex-shrink-0" />
                  <div className="space-y-0.5 min-w-0">
                    <div className="font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <span>Step-by-Step Guided Navigation</span>
                      <span className="rounded-full bg-blue-900/60 px-1.5 py-0.2 text-[9px] text-cyan-300">
                        Walkway Guidance
                      </span>
                    </div>
                    <p className="text-[10px] text-blue-200/80 leading-normal">
                      Outdoor GPS tracking is locked pending physical campus control point survey. Guiding your route along verified 3D walkways.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* PREVIEW STATE: Single Primary Action "START NAVIGATION" */}
            {!isNavigating ? (
              <div className="space-y-3">
                <button
                  id={isMobile ? 'btn-start-navigation-mobile' : 'btn-start-navigation'}
                  type="button"
                  onClick={handleStartNavigation}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 px-4 py-3 text-xs font-bold text-white shadow-lg shadow-blue-500/25 hover:from-blue-500 hover:to-cyan-400 active:scale-[0.99] transition-all"
                >
                  <Navigation size={15} className="fill-white" />
                  <span>START NAVIGATION</span>
                </button>

                {/* Route Preview Snippet */}
                <div className="rounded-xl bg-[#111827]/80 p-3 ring-1 ring-white/10 space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="font-semibold text-slate-300">Route Summary</span>
                    <span>{route.steps.length} waypoints</span>
                  </div>
                  <div className="text-xs text-slate-300 flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-cyan-400" />
                    <span className="truncate">Start: {locationOptions.find((o) => o.id === fromId)?.label}</span>
                  </div>
                  <div className="text-xs text-slate-300 flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-rose-500" />
                    <span className="truncate">End: {locationOptions.find((o) => o.id === toId)?.label}</span>
                  </div>
                </div>
              </div>
            ) : (
              /* ACTIVE GUIDED NAVIGATION STATE (Google Maps Turn-by-Turn Card) */
              <div className="space-y-3 rounded-2xl border border-cyan-500/30 bg-[#0B1220]/95 p-3.5 shadow-2xl backdrop-blur-2xl">
                {/* Active Guidance Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-xs uppercase tracking-wider text-cyan-300">
                    <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
                    <span>Walkway Guidance Active (Manual)</span>
                  </div>
                  <button
                    id={isMobile ? 'btn-exit-navigation-mobile' : 'btn-exit-navigation'}
                    type="button"
                    onClick={handleExitNavigation}
                    className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] font-medium text-slate-300 hover:bg-rose-500/20 hover:text-rose-300 transition"
                  >
                    <StopCircle size={12} className="text-rose-400" />
                    <span>Exit</span>
                  </button>
                </div>

                {/* Turn-by-Turn Guidance Hero Card */}
                <div className="rounded-2xl bg-[#111827]/90 p-3.5 shadow-xl border border-white/10 space-y-3">
                  {/* Turn Maneuver Header */}
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl shadow-lg text-white ${
                        isArrived
                          ? 'bg-emerald-600 shadow-emerald-500/30'
                          : currentStep.title.toLowerCase().includes('right')
                            ? 'bg-gradient-to-tr from-blue-600 to-cyan-600 shadow-blue-500/30'
                            : currentStep.title.toLowerCase().includes('left')
                              ? 'bg-gradient-to-tr from-blue-600 to-cyan-600 shadow-blue-500/30'
                              : 'bg-gradient-to-tr from-blue-600 to-indigo-600 shadow-blue-500/30'
                      }`}
                    >
                      {isArrived ? (
                        <CheckCircle2 size={24} />
                      ) : currentStep.title.toLowerCase().includes('right') ? (
                        <CornerUpRight size={24} />
                      ) : currentStep.title.toLowerCase().includes('left') ? (
                        <CornerUpLeft size={24} />
                      ) : activeStepIndex === 0 ? (
                        <Compass size={24} />
                      ) : (
                        <ArrowUp size={24} />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-extrabold text-base text-white tracking-tight">
                          {isArrived
                            ? 'Destination Arrived'
                            : `Instruction ${activeStepIndex + 1} of ${route.steps.length}`}
                        </span>
                        {isArrived && (
                          <span className="rounded-full bg-emerald-950/80 px-2 py-0.5 text-[9px] font-bold text-emerald-300 uppercase border border-emerald-500/30">
                            Arrived
                          </span>
                        )}
                      </div>

                      <h3 className="text-xs font-semibold text-slate-100 mt-0.5 leading-snug">
                        {isArrived
                          ? `You have reached ${locationOptions.find((o) => o.id === toId)?.label}!`
                          : currentStep.title}
                      </h3>

                      {currentStep.notes && !isArrived && (
                        <p className="mt-0.5 text-[11px] text-slate-400">
                          {currentStep.notes}
                        </p>
                      )}

                      {/* Next Turn Preview */}
                      {nextStep && !isArrived && (
                        <div className="mt-1.5 flex items-center gap-1 text-[10px] text-slate-400">
                          <span>Then:</span>
                          <span className="font-medium text-slate-300 truncate">
                            {nextStep.title}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="border-t border-white/10 pt-2.5 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-white">
                        {isArrived
                          ? 'All Instructions Viewed'
                          : `Instruction ${activeStepIndex + 1} of ${route.steps.length}`}
                      </span>
                      <span className="font-medium text-slate-400">
                        {Math.round(((activeStepIndex + 1) / route.steps.length) * 100)}% viewed
                      </span>
                    </div>

                    <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 via-cyan-400 to-teal-400 transition-all duration-300"
                        style={{
                          width: `${Math.min(100, Math.max(0, ((activeStepIndex + 1) / route.steps.length) * 100))}%`,
                        }}
                      />
                    </div>

                    <div className="text-[10px] text-slate-400">
                      Step-by-step walkway directions • Physical position is not tracked
                    </div>
                  </div>

                  {/* Step Navigation Controls */}
                  <div className="flex items-center justify-between gap-2 border-t border-white/10 pt-2.5">
                    <div className="flex items-center gap-1.5">
                      <button
                        id={isMobile ? 'btn-prev-step-mobile' : 'btn-prev-step'}
                        type="button"
                        disabled={activeStepIndex === 0}
                        onClick={() => setActiveStepIndex((idx) => Math.max(0, idx - 1))}
                        className="flex items-center gap-1 rounded-xl border border-white/10 bg-[#162033] px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-[#1B2540] hover:text-white disabled:opacity-40 transition"
                      >
                        <ChevronLeft size={13} />
                        <span>Previous</span>
                      </button>

                      <button
                        id={isMobile ? 'btn-next-step-mobile' : 'btn-next-step'}
                        type="button"
                        disabled={activeStepIndex >= route.steps.length - 1}
                        onClick={() => setActiveStepIndex((idx) => Math.min(route.steps.length - 1, idx + 1))}
                        className="flex items-center gap-1 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 px-3 py-1.5 text-xs font-semibold text-white shadow-md shadow-blue-500/30 hover:from-blue-500 hover:to-cyan-500 disabled:opacity-40 transition"
                      >
                        <span>Next Step</span>
                        <ChevronRight size={13} />
                      </button>
                    </div>

                    <button
                      id={isMobile ? 'btn-recenter-mobile' : 'btn-recenter'}
                      type="button"
                      onClick={handleRecenterCamera}
                      className="flex items-center gap-1 rounded-xl border border-white/10 bg-[#162033] px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:border-cyan-400 hover:text-cyan-400 transition"
                      title="Recenter camera on current step"
                    >
                      <Crosshair size={13} className="text-cyan-400" />
                      <span>Recenter</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Waypoints Toggle */}
            <button
              id={isMobile ? 'btn-toggle-waypoints-mobile' : 'btn-toggle-waypoints'}
              type="button"
              onClick={() => setShowAllSteps((v) => !v)}
              className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-[#111827]/80 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-white/10 transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <Layers size={14} className="text-cyan-400" />
                <span>Full Waypoints List ({route.steps.length} nodes)</span>
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
                      setActiveStepIndex(idx)
                      setIsNavigating(true)
                    }}
                    className={`flex cursor-pointer items-start justify-between rounded-lg p-2 transition-colors ${
                      idx === activeStepIndex && isNavigating
                        ? 'bg-cyan-500/15 ring-1 ring-cyan-500/30 font-semibold text-cyan-200'
                        : 'hover:bg-white/5 text-slate-300'
                    }`}
                  >
                    <div className="truncate pr-2">
                      <span className="text-slate-500 mr-1.5">{idx + 1}.</span>
                      <span>{step.title}</span>
                    </div>
                    <span className="text-[10px] text-cyan-400 uppercase flex-shrink-0">
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

      {/* Developer Test Suite Link for Authorized Evaluators */}
      {isDevTestAuthorized() && (
        <div className="border-t border-white/10 pt-2.5">
          <Link
            to="/dev-navigation"
            className="flex items-center justify-between rounded-xl border border-cyan-500/20 bg-cyan-950/30 p-2 text-[11px] font-medium text-cyan-300 hover:border-cyan-500/40 hover:bg-cyan-950/50 transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <Compass size={13} className="text-cyan-400" />
              <span>Developer Test Suite (Authorized Testing Only)</span>
            </span>
            <ExternalLink size={12} className="text-cyan-400" />
          </Link>
        </div>
      )}

      {/* Honest Technical Note */}
      <div className="border-t border-white/10 pt-2 text-[10px] text-slate-500">
        <span className="font-medium text-slate-400">Route Engine:</span> Dijkstra calculation on verified campus 3D walkway graph. Outdoor GPS locked pending ground survey calibration.
      </div>
    </div>
  )

  return (
    <div className="relative min-h-[calc(100vh-4rem)] p-3 md:p-4 overflow-x-hidden">
      {/* ============================================================== */}
      {/* DESKTOP LAYOUT (md:flex): 2-Column Map-First Workspace         */}
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
                <span
                  className="h-2.5 w-2.5 rounded-full bg-cyan-400 animate-pulse shadow-sm shadow-cyan-400/50"
                  title="Campus Navigator Active"
                />
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

        {/* Right Column: Large Dedicated 3D Campus Viewport */}
        <main className="flex-1 min-w-0 h-full relative rounded-3xl border border-white/10 bg-[#0B1220] overflow-hidden shadow-2xl">
          <Campus3D
            key={`campus-3d-desktop-${cameraRevision}`}
            routePoints={routePoints}
            activeStepPoint={isNavigating ? activeStepPoint : null}
            simulatedPosition={null}
            completedPoints={undefined}
            remainingPoints={undefined}
            isSimulating={false}
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
            routePoints={routePoints}
            activeStepPoint={isNavigating ? activeStepPoint : null}
            simulatedPosition={null}
            completedPoints={undefined}
            remainingPoints={undefined}
            isSimulating={false}
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
                ? 'h-[52%] max-h-[380px]'
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
                        ? isNavigating
                          ? `Step ${activeStepIndex + 1} of ${route?.steps.length}`
                          : 'Route calculated • Tap to view'
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
