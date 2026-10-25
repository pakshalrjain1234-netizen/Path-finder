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
  Layers,
  Navigation,
  PanelLeftClose,
  PanelLeftOpen,
  Radio,
  RotateCcw,
  Search,
  ShieldAlert,
  StopCircle,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Campus3D } from '../components/Campus3D'
import { buildings } from '../data/buildings'
import { type CampusBuildingId } from '../data/campusModelMapping'
import { CAMPUS_SERVICE_POIS, findCampusPoi, type CampusServicePoi } from '../data/campusPois'
import { CAMPUS_LANDMARKS } from '../data/campusLandmarks'
import {
  campusDestinationNodesByBuildingId,
  campusNavigationGraph,
  campusNavigationNodesById,
} from '../data/navigationGraph'
import { useGpsLocation } from '../hooks/useGpsLocation'
import { useLiveNavigation } from '../hooks/useLiveNavigation'
import { geoToModelCoordinates } from '../lib/campusCalibration'
import { createRoutePlan } from '../lib/routePlanner'
import { computeCumulativeDistances } from '../lib/routeSimulation'
import type { Point3, RoutePlan } from '../types/navigation'

interface LocationOption {
  id: string
  label: string
  nodeId: string | null
  type: 'gate' | 'building' | 'poi'
  isProvisional?: boolean
  aliases?: string[]
  description?: string
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
  const {
    coords: gpsCoords,
    classification,
    calibrationModel,
    geofence,
    isTracking,
    startLocation,
    stopLocation,
    isTestMode,
  } = useGpsLocation()
  const isGpsLiveApproved = geofence?.isApprovedForLiveNavigation === true && calibrationModel.status === 'calibrated'

  // Camera follow state & GPS field diagnostics drawer
  const [isCameraFollowing, setIsCameraFollowing] = useState<boolean>(true)

  // Notice banner when student clicks "Start Navigation"
  const [showGpsNotice, setShowGpsNotice] = useState<boolean>(false)

  // Approach Route to Main Entrance (Gate 1) for Provisional POIs
  const [showApproachRoute, setShowApproachRoute] = useState<boolean>(false)

  // Destination Search and Alias matching
  const [destinationSearchQuery, setDestinationSearchQuery] = useState<string>('')
  const [isDestinationSearchFocused, setIsDestinationSearchFocused] = useState<boolean>(false)

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
      { id: 'main-gate-1', label: 'Main Entrance (Gate 1)', nodeId: 'main-gate-1', type: 'gate', aliases: ['Gate 1', 'Main Gate', 'East Gate'] },
      { id: 'west-entrance', label: 'West Entrance', nodeId: 'west-entrance', type: 'gate', aliases: ['Gate 2', 'West Gate', 'Back Gate'] },
      { id: 'ground-entrance', label: 'Ground Entrance', nodeId: 'ground-entrance', type: 'gate', aliases: ['Ground Gate', 'Ground Road'] },
    ]

    const gateIds = new Set(gates.map((g) => g.id))
    const buildingOptions: LocationOption[] = buildings
      .filter((b) => !gateIds.has(b.id))
      .map((b) => {
        const destNodes = campusDestinationNodesByBuildingId.get(b.id as CampusBuildingId)
        const mappedNode = destNodes && destNodes.length > 0 ? destNodes[0] : null
        return {
          id: b.id,
          label: b.name,
          nodeId: mappedNode ? mappedNode.id : null,
          type: 'building' as const,
          aliases: b.aliases,
        }
      })

    const poiOptions: LocationOption[] = CAMPUS_SERVICE_POIS.map((poi) => ({
      id: poi.id,
      label: poi.name,
      nodeId: null, // exact entrance unverified
      type: 'poi' as const,
      isProvisional: true,
      aliases: poi.aliases,
      description: poi.locationDescription,
    }))

    return [...gates, ...buildingOptions, ...poiOptions]
  }, [])

  // Search filtered options with alias matching
  const filteredSearchResults = useMemo(() => {
    const q = destinationSearchQuery.trim().toLowerCase()
    if (!q) return []
    return locationOptions
      .map((opt) => {
        let matchScore = 0
        let matchedAlias: string | undefined = undefined

        if (opt.label.toLowerCase().includes(q)) {
          matchScore = 3
        } else if (opt.id.toLowerCase().includes(q)) {
          matchScore = 2
        } else {
          const matchingAlias = opt.aliases?.find((a) => a.toLowerCase().includes(q))
          if (matchingAlias) {
            matchScore = 1
            matchedAlias = matchingAlias
          }
        }

        return { opt, matchScore, matchedAlias }
      })
      .filter((item) => item.matchScore > 0)
      .sort((a, b) => b.matchScore - a.matchScore)
      .map((item) => ({ ...item.opt, matchedAlias: item.matchedAlias }))
  }, [destinationSearchQuery, locationOptions])

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

  // Selected POI if target or origin is a provisional service POI
  const selectedPoi = useMemo(() => findCampusPoi(toId), [toId])
  const fromPoi = useMemo(() => findCampusPoi(fromId), [fromId])

  // Calculate route plan automatically
  const routeCalculation = useMemo(() => {
    // 1. Unknown location checks
    const isToKnown = locationOptions.some((l) => l.id === toId)
    const isFromKnown = locationOptions.some((l) => l.id === fromId)

    if (!isToKnown) {
      return {
        status: 'unknown' as const,
        route: null,
        message: `Destination "${toId}" was not found in the verified campus registry. Please select a recognized campus facility or building.`,
        isApproachRoute: false,
        approachDestinationName: null as string | null,
        originalPoi: null as CampusServicePoi | null,
        poi: null as CampusServicePoi | null,
      }
    }

    if (!isFromKnown) {
      return {
        status: 'unknown' as const,
        route: null,
        message: `Origin "${fromId}" was not found in the verified campus registry. Please select a recognized campus facility or building.`,
        isApproachRoute: false,
        approachDestinationName: null as string | null,
        originalPoi: null as CampusServicePoi | null,
        poi: null as CampusServicePoi | null,
      }
    }

    // 2. Library special unverified case
    if (toId === 'library' || fromId === 'library') {
      if (fromId === 'library') {
        return {
          status: 'unverified' as const,
          route: null,
          message: 'Dr. C. L. Mehta Central Library entrance walkway is unverified. Walkway routing from the library cannot be safely calculated without physical ground verification.',
          isApproachRoute: false,
          approachDestinationName: null as string | null,
          originalPoi: null as CampusServicePoi | null,
          poi: null as CampusServicePoi | null,
        }
      }

      // toId === 'library'
      if (showApproachRoute) {
        if (!originNodeId) {
          const fromOpt = locationOptions.find((l) => l.id === fromId)
          return {
            status: 'unverified' as const,
            route: null,
            message: `${fromOpt?.label ?? 'Origin location'} has no mapped entrance anchor.`,
            isApproachRoute: false,
            approachDestinationName: null as string | null,
            originalPoi: null as CampusServicePoi | null,
            poi: null as CampusServicePoi | null,
          }
        }
        if (originNodeId === 'main-block-approach') {
          return {
            status: 'at-approach-point' as const,
            route: null,
            message: 'You are already at Main Block Approach. Dr. C. L. Mehta Central Library is directly north across the courtyard. Final entrance walkway access has not been mapped.',
            isApproachRoute: true,
            approachDestinationName: 'Main Block Approach',
            originalPoi: null as CampusServicePoi | null,
            poi: null as CampusServicePoi | null,
          }
        }
        const approachResult = createRoutePlan(campusNavigationGraph, originNodeId, 'main-block-approach')
        if (approachResult.status === 'ok') {
          return {
            status: 'ok' as const,
            route: approachResult.route,
            isApproachRoute: true,
            approachDestinationName: 'Main Block Approach',
            originalPoi: null as CampusServicePoi | null,
            poi: null as CampusServicePoi | null,
            message: 'To Main Block Approach — Not to Central Library entrance. Remaining access across courtyard is unverified.',
          }
        }
        return {
          status: 'disconnected' as const,
          route: null,
          message: 'Unable to calculate verified approach route to Main Block Approach.',
          isApproachRoute: false,
          approachDestinationName: null as string | null,
          originalPoi: null as CampusServicePoi | null,
          poi: null as CampusServicePoi | null,
        }
      }

      return {
        status: 'unverified' as const,
        route: null,
        message: 'Dr. C. L. Mehta Central Library is visible in the authentic 3D campus model. Walkway routing directly to its entrance is being verified.',
        isApproachRoute: false,
        approachDestinationName: null as string | null,
        originalPoi: null as CampusServicePoi | null,
        poi: null as CampusServicePoi | null,
      }
    }

    // 3. Origin is a provisional POI (e.g. apollo-shine -> main-block)
    if (fromPoi) {
      return {
        status: 'provisional-poi' as const,
        poi: fromPoi,
        route: null,
        message: `${fromPoi.name} has an unverified entrance coordinate. Origin walkway routing cannot be safely calculated without physical ground verification.`,
        isApproachRoute: false,
        approachDestinationName: null as string | null,
        originalPoi: null as CampusServicePoi | null,
      }
    }

    // 4. Destination is a provisional POI (e.g. main-gate-1 -> apollo-shine, civil-block -> xerox-shop)
    if (selectedPoi) {
      if (showApproachRoute) {
        if (!originNodeId) {
          const fromOpt = locationOptions.find((l) => l.id === fromId)
          return {
            status: 'unverified' as const,
            route: null,
            message: `${fromOpt?.label ?? 'Origin location'} has no mapped entrance anchor.`,
            isApproachRoute: false,
            approachDestinationName: null as string | null,
            originalPoi: null as CampusServicePoi | null,
            poi: selectedPoi,
          }
        }
        if (originNodeId === 'main-gate-1') {
          return {
            status: 'at-approach-point' as const,
            route: null,
            message: 'You are already at the nearest verified approach point. The final access to this facility has not been mapped.',
            isApproachRoute: true,
            approachDestinationName: 'Main Entrance (Gate 1)',
            originalPoi: selectedPoi,
            poi: selectedPoi,
          }
        }
        const approachResult = createRoutePlan(campusNavigationGraph, originNodeId, 'main-gate-1')
        if (approachResult.status === 'ok') {
          return {
            status: 'ok' as const,
            route: approachResult.route,
            isApproachRoute: true,
            approachDestinationName: 'Main Entrance (Gate 1)',
            originalPoi: selectedPoi,
            poi: selectedPoi,
            message: `To Main Entrance (Gate 1 Approach) — Not to ${selectedPoi.name}. Frontage access requires on-site orientation.`,
          }
        }
        return {
          status: 'disconnected' as const,
          route: null,
          message: 'Unable to calculate verified approach route to Main Entrance (Gate 1).',
          isApproachRoute: false,
          approachDestinationName: null as string | null,
          originalPoi: null as CampusServicePoi | null,
          poi: selectedPoi,
        }
      }

      // No approach route active: show truthful provisional notice
      return {
        status: 'provisional-poi' as const,
        poi: selectedPoi,
        route: null,
        message: `${selectedPoi.name} is visible in the authentic 3D campus model, but its exact entrance coordinate and connecting walkway routing remain provisional pending physical ground verification.`,
        isApproachRoute: false,
        approachDestinationName: null as string | null,
        originalPoi: null as CampusServicePoi | null,
      }
    }

    // 5. Normal verified routing
    if (!originNodeId) {
      const fromOpt = locationOptions.find((l) => l.id === fromId)
      return {
        status: 'unverified' as const,
        route: null,
        message: `${fromOpt?.label ?? 'Origin location'} walking directions are being verified on-site.`,
        isApproachRoute: false,
        approachDestinationName: null as string | null,
        originalPoi: null as CampusServicePoi | null,
        poi: null as CampusServicePoi | null,
      }
    }

    if (!destinationNodeId) {
      const toOpt = locationOptions.find((l) => l.id === toId)
      return {
        status: 'unverified' as const,
        route: null,
        message: `${toOpt?.label ?? 'Destination location'} walking directions are being verified on-site.`,
        isApproachRoute: false,
        approachDestinationName: null as string | null,
        originalPoi: null as CampusServicePoi | null,
        poi: null as CampusServicePoi | null,
      }
    }

    if (originNodeId === destinationNodeId) {
      return {
        status: 'same-node' as const,
        route: null,
        message: 'Origin and destination are the same location. Please choose a different destination.',
        isApproachRoute: false,
        approachDestinationName: null as string | null,
        originalPoi: null as CampusServicePoi | null,
        poi: null as CampusServicePoi | null,
      }
    }

    const result = createRoutePlan(campusNavigationGraph, originNodeId, destinationNodeId)
    if (result.status === 'ok') {
      return {
        status: 'ok' as const,
        route: result.route,
        message: null,
        isApproachRoute: false,
        approachDestinationName: null as string | null,
        originalPoi: null as CampusServicePoi | null,
        poi: null as CampusServicePoi | null,
      }
    }

    if (result.status === 'no-route') {
      const destOpt = locationOptions.find((l) => l.id === toId)
      return {
        status: 'disconnected' as const,
        route: null,
        message: `Pathway connectivity to ${destOpt?.label ?? 'this building'} is unverified or unavailable in the current campus model. Ground pathway survey is incomplete.`,
        isApproachRoute: false,
        approachDestinationName: null as string | null,
        originalPoi: null as CampusServicePoi | null,
        poi: null as CampusServicePoi | null,
      }
    }

    return {
      status: 'error' as const,
      route: null,
      message: result.message,
      isApproachRoute: false,
      approachDestinationName: null as string | null,
      originalPoi: null as CampusServicePoi | null,
      poi: null as CampusServicePoi | null,
    }
  }, [locationOptions, fromId, toId, fromPoi, selectedPoi, showApproachRoute, originNodeId, destinationNodeId])

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

  // Display names and target 3D point for route rendering and framing
  const originName = useMemo(() => {
    return locationOptions.find((l) => l.id === fromId)?.label ?? fromId
  }, [locationOptions, fromId])

  const targetDestinationName = useMemo(() => {
    return locationOptions.find((l) => l.id === toId)?.label ?? toId
  }, [locationOptions, toId])

  const targetDestinationPoint = useMemo<Point3 | null>(() => {
    if (selectedPoi) {
      return selectedPoi.anchorPosition
    }
    const landmark = CAMPUS_LANDMARKS.find((lm) => lm.id === toId)
    if (landmark) {
      return landmark.fallbackPosition
    }
    const destNode = destinationNodeId ? campusNavigationNodesById.get(destinationNodeId) : null
    return destNode?.position ?? null
  }, [selectedPoi, toId, destinationNodeId])

  // Live Navigation Engine for automatic route progression and off-route handling
  const { navState, stopNavigation: stopLiveNav } = useLiveNavigation({
    route,
    routePoints,
    calibration: calibrationModel,
    liveCoordinates: gpsCoords,
    isSimulated: isTestMode,
    graph: campusNavigationGraph,
    destinationNodeId,
  })

  // Automatic walking progression active when user is walking or in test mode
  const isAutoNavActive = isNavigating && (isGpsLiveApproved || isTestMode) && navState.status !== 'idle'

  // Automatically advance current instruction step without pressing Next
  useEffect(() => {
    if (isAutoNavActive && typeof navState.currentStepIndex === 'number') {
      setActiveStepIndex(navState.currentStepIndex)
    }
  }, [isAutoNavActive, navState.currentStepIndex])

  // Stop GPS watcher on component unmount
  useEffect(() => {
    return () => {
      stopLocation()
    }
  }, [stopLocation])

  // Active Blue Dot position (kept above ground road surface at y=0.35)
  const activeUserPosition = useMemo<Point3 | null>(() => {
    if (isAutoNavActive) {
      const pos = navState.displayPosition ?? navState.rawModelPosition ?? navState.matchedModelPosition
      if (pos) {
        return [pos[0], Math.max(0.35, pos[1]), pos[2]]
      }
    }
    // Only display transformed blue dot if in authorized Test Mode OR if live navigation is verified and approved!
    if (isTestMode || isGpsLiveApproved) {
      if (classification.modelPoint) {
        return [classification.modelPoint[0], Math.max(0.35, classification.modelPoint[1]), classification.modelPoint[2]]
      }
      if (gpsCoords && (calibrationModel.status === 'calibrated' || (isTestMode && calibrationModel.status === 'provisional'))) {
        const res = geoToModelCoordinates(gpsCoords.latitude, gpsCoords.longitude, calibrationModel)
        if (res) {
          return [res.modelPoint[0], Math.max(0.35, res.modelPoint[1]), res.modelPoint[2]]
        }
      }
    }
    return null
  }, [isAutoNavActive, navState.displayPosition, navState.rawModelPosition, navState.matchedModelPosition, isTestMode, isGpsLiveApproved, classification.modelPoint, gpsCoords, calibrationModel])

  // Active step point in 3D: highlights current waypoint on campus model
  const activeStepPoint = useMemo<Point3 | null>(() => {
    if (!isNavigating || !route || !route.steps[activeStepIndex]) return null
    const nodeId = route.steps[activeStepIndex].nodeId
    return campusNavigationNodesById.get(nodeId)?.position ?? null
  }, [isNavigating, route, activeStepIndex])

  // Current and next steps
  const currentStep = route?.steps[activeStepIndex] ?? null
  const nextStep = route && activeStepIndex + 1 < route.steps.length ? route.steps[activeStepIndex + 1] : null
  const isArrived = isAutoNavActive
    ? navState.status === 'arrived'
    : isNavigating && Boolean(route) && activeStepIndex === (route?.steps.length ?? 0) - 1

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
    setShowApproachRoute(false)
    setActiveStepIndex(0)
    setIsNavigating(false)
    setShowGpsNotice(false)
  }

  // Reset to default
  const handleReset = () => {
    setFromId('main-gate-1')
    setToId('it-block')
    setShowApproachRoute(false)
    setActiveStepIndex(0)
    setIsNavigating(false)
    setShowAllSteps(false)
    setShowGpsNotice(false)
  }

  // Handle building selection from 3D canvas
  const handleBuildingSelect = (buildingId: string) => {
    setToId(buildingId)
    setShowApproachRoute(false)
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
    setIsCameraFollowing(true)

    // Request GPS permission only when the user starts navigation
    if (!isTracking) {
      startLocation()
    }

    // Check GPS approval
    if (!isGpsLiveApproved && !isTestMode) {
      setShowGpsNotice(true)
    }
  }

  // Exit Navigation
  const handleExitNavigation = () => {
    setIsNavigating(false)
    setActiveStepIndex(0)
    setShowGpsNotice(false)
    stopLiveNav()
    stopLocation()
  }

  // Reusable Route Planning & Navigation Controls
  const renderPlanningControls = (isMobile: boolean = false) => (
    <div className="flex flex-col gap-3">
      {/* Origin & Destination Selectors */}
      <div className="space-y-2">
        <div className="grid gap-2">
          {/* From Input */}
          <div className="flex items-center gap-2 rounded-xl border border-[#293A50] bg-[#192638] px-3 py-1.5 focus-within:border-[#60A5FA] focus-within:ring-2 focus-within:ring-blue-500/20 shadow-sm transition-all">
            <span className="h-2.5 w-2.5 rounded-full border border-emerald-400 bg-emerald-500 shadow-sm flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <label
                htmlFor={isMobile ? 'mobile-route-from-select' : 'route-from-select'}
                className="block text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]"
              >
                From (Origin)
              </label>
              <select
                id={isMobile ? 'mobile-route-from-select' : 'route-from-select'}
                data-testid={isMobile ? 'mobile-route-from-select' : 'route-from-select'}
                value={fromId}
                disabled={isNavigating}
                onChange={(e) => {
                  setFromId(e.target.value)
                  setShowApproachRoute(false)
                  setActiveStepIndex(0)
                  setIsNavigating(false)
                  setShowGpsNotice(false)
                }}
                className="w-full bg-[#192638] text-xs font-semibold text-[#F1F5F9] outline-none disabled:opacity-60 cursor-pointer"
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
                <optgroup label="Provisional Campus Facilities">
                  {locationOptions
                    .filter((opt) => opt.type === 'poi')
                    .map((opt) => (
                      <option key={`from-${opt.id}`} value={opt.id}>
                        {opt.label} (Provisional POI — Unverified entrance)
                      </option>
                    ))}
                </optgroup>
              </select>
            </div>
          </div>

          {/* Swap Button Divider */}
          <div className="relative flex items-center justify-center">
            <div className="absolute inset-x-0 h-px bg-[#24364D]" />
            <button
              id={isMobile ? 'btn-swap-locations-mobile' : 'btn-swap-locations'}
              type="button"
              disabled={isNavigating}
              onClick={handleSwap}
              className="relative z-10 flex h-7 w-7 items-center justify-center rounded-full border border-[#293A50] bg-[#162235] text-[#94A3B8] shadow-sm hover:border-[#60A5FA] hover:text-white disabled:opacity-40 transition-colors cursor-pointer"
              title="Swap origin and destination"
              aria-label="Swap origin and destination"
            >
              <ArrowLeftRight size={13} />
            </button>
          </div>

          {/* Destination Search & Alias Filter Input */}
          <div className="relative">
            <div className="flex items-center gap-2 rounded-xl border border-[#293A50] bg-[#192638] px-2.5 py-1.5 focus-within:border-[#60A5FA] focus-within:ring-2 focus-within:ring-blue-500/20 shadow-sm transition-all">
              <Search size={13} className="text-[#94A3B8] shrink-0" />
              <input
                id={isMobile ? 'mobile-destination-search-input' : 'destination-search-input'}
                data-testid={isMobile ? 'mobile-destination-search-input' : 'destination-search-input'}
                type="text"
                value={destinationSearchQuery}
                disabled={isNavigating}
                onChange={(e) => {
                  setDestinationSearchQuery(e.target.value)
                  setIsDestinationSearchFocused(true)
                }}
                onFocus={() => setIsDestinationSearchFocused(true)}
                placeholder="Search destination or alias (e.g. Clinic, Xerox, First Aid)..."
                className="w-full bg-transparent text-xs font-semibold text-[#F1F5F9] placeholder:text-[#64748B] outline-none disabled:opacity-50"
              />
              {destinationSearchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setDestinationSearchQuery('')
                    setIsDestinationSearchFocused(false)
                  }}
                  className="rounded-full p-0.5 text-[#94A3B8] hover:text-white"
                  aria-label="Clear destination search"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Destination Search Autocomplete Results Dropdown */}
            {isDestinationSearchFocused && destinationSearchQuery.trim().length > 0 && (
              <div
                id={isMobile ? 'mobile-destination-search-results' : 'destination-search-results'}
                data-testid="destination-search-results"
                className="absolute inset-x-0 top-full mt-1.5 max-h-56 overflow-y-auto rounded-2xl border border-[#293A50] bg-[#192638] p-1.5 shadow-2xl backdrop-blur-2xl z-50 divide-y divide-[#24364D]"
              >
                {filteredSearchResults.length > 0 ? (
                  filteredSearchResults.map((opt) => (
                    <button
                      key={`search-res-${opt.id}`}
                      type="button"
                      id={`btn-search-select-${opt.id}`}
                      data-testid={`btn-search-select-${opt.id}`}
                      onClick={() => {
                        setToId(opt.id)
                        setShowApproachRoute(false)
                        setActiveStepIndex(0)
                        setIsNavigating(false)
                        setShowGpsNotice(false)
                        setDestinationSearchQuery('')
                        setIsDestinationSearchFocused(false)
                      }}
                      className="flex w-full items-center justify-between rounded-xl p-2 text-left hover:bg-[#24364D] transition cursor-pointer text-xs"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="font-semibold text-[#F1F5F9] flex items-center gap-1.5">
                          <span>{opt.label}</span>
                          {opt.type === 'poi' && (
                            <span className="rounded-md bg-amber-900/40 px-1.5 py-0.2 text-[9px] font-bold text-amber-300 uppercase border border-amber-600/40">
                              Provisional
                            </span>
                          )}
                        </div>
                        {opt.matchedAlias && (
                          <div className="text-[10px] text-[#60A5FA] font-medium">
                            Matched alias: &ldquo;{opt.matchedAlias}&rdquo;
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] text-[#94A3B8] capitalize">
                        {opt.type}
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="p-2 text-center text-[11px] text-[#94A3B8] font-medium">
                    No campus locations matching &ldquo;{destinationSearchQuery}&rdquo;
                  </div>
                )}
              </div>
            )}
          </div>

          {/* To Input Select */}
          <div className="flex items-center gap-2 rounded-xl border border-[#293A50] bg-[#192638] px-3 py-1.5 focus-within:border-[#60A5FA] focus-within:ring-2 focus-within:ring-blue-500/20 shadow-sm transition-all">
            <span className="h-2.5 w-2.5 rounded-full border border-blue-400 bg-blue-500 shadow-sm flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <label
                htmlFor={isMobile ? 'mobile-route-to-select' : 'route-to-select'}
                className="block text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]"
              >
                To (Destination)
              </label>
              <select
                id={isMobile ? 'mobile-route-to-select' : 'route-to-select'}
                data-testid={isMobile ? 'mobile-route-to-select' : 'route-to-select'}
                value={toId}
                disabled={isNavigating}
                onChange={(e) => {
                  setToId(e.target.value)
                  setShowApproachRoute(false)
                  setActiveStepIndex(0)
                  setIsNavigating(false)
                  setShowGpsNotice(false)
                }}
                className="w-full bg-[#192638] text-xs font-semibold text-[#F1F5F9] outline-none disabled:opacity-60 cursor-pointer"
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
                <optgroup label="Provisional Campus Facilities">
                  {locationOptions
                    .filter((opt) => opt.type === 'poi')
                    .map((opt) => (
                      <option key={`to-${opt.id}`} value={opt.id}>
                        {opt.label} (Provisional POI — Unverified entrance)
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

        {/* Approach Route Notice Banner (When user opted to navigate to verified approach) */}
        {routeCalculation.isApproachRoute && (
          <div id="approach-route-banner" data-testid="approach-route-banner" className="rounded-xl border border-amber-500/40 bg-amber-950/30 p-2.5 text-xs text-amber-200 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-0.5 min-w-0">
                <div className="font-bold text-amber-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5 flex-wrap">
                  <span>To {routeCalculation.approachDestinationName} — Not to {targetDestinationName}</span>
                  <span className="rounded-full bg-amber-900/50 px-1.5 py-0.2 text-[9px] text-amber-300 font-extrabold border border-amber-500/40">
                    Approach Only
                  </span>
                </div>
                <p className="text-[10px] text-amber-200/90 leading-snug">
                  Guided along verified walkways to <strong className="text-white">{routeCalculation.approachDestinationName}</strong>. Final pedestrian approach to <strong className="text-white">{targetDestinationName}</strong> has not been physically surveyed.
                </p>
              </div>
              <button
                type="button"
                id="btn-dismiss-approach-route"
                data-testid="btn-dismiss-approach-route"
                onClick={() => {
                  setShowApproachRoute(false)
                  setIsNavigating(false)
                }}
                className="shrink-0 rounded-lg border border-amber-500/40 bg-[#192638] px-2 py-0.5 text-[10px] font-semibold text-amber-300 hover:text-white hover:bg-[#24364D] transition-colors shadow-sm cursor-pointer"
                title="Dismiss approach route"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Route Overview Card (When route is valid) */}
        {routeCalculation.status === 'ok' && route && (
          <div className="flex items-center justify-between rounded-xl bg-[#192638] border border-[#293A50] p-2.5 text-xs text-[#F1F5F9] shadow-sm">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10 text-[#60A5FA] border border-blue-500/20">
                <Footprints size={15} />
              </div>
              <div>
                <div className="font-semibold text-white flex items-center gap-1.5">
                  <span>~{totalRouteDistance.toFixed(0)} m</span>
                  <span className="text-[#94A3B8]">•</span>
                  <span>~{estimatedWalkingMinutes} min walk</span>
                </div>
                <div className="text-[10px] text-[#94A3B8]">
                  {route.steps.length} turns • {routeCalculation.isApproachRoute ? `Verified approach to ${routeCalculation.approachDestinationName}` : 'Scale provisional • Verified walkways'}
                </div>
              </div>
            </div>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider border ${
              routeCalculation.isApproachRoute
                ? 'bg-amber-900/40 text-amber-300 border-amber-600/40'
                : 'bg-blue-500/10 text-[#60A5FA] border-blue-500/30'
            }`}>
              {routeCalculation.isApproachRoute ? 'Approach Route' : 'Provisional Scale'}
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
              <div className="rounded-xl border border-blue-500/30 bg-blue-950/40 p-2.5 text-[11px] text-blue-200 shadow-sm">
                <div className="flex items-start gap-2">
                  <ShieldAlert size={15} className="mt-0.5 text-[#60A5FA] flex-shrink-0" />
                  <div className="space-y-0.5 min-w-0">
                    <div className="font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <span>Step-by-Step Guided Navigation</span>
                      <span className="rounded-full bg-blue-900/50 px-1.5 py-0.2 text-[9px] text-[#60A5FA] font-semibold border border-blue-500/30">
                        Walkway Guidance
                      </span>
                    </div>
                    <p className="text-[10px] text-[#94A3B8] leading-normal">
                      Follow the step-by-step guidance along authentic campus walkways.
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
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#2563EB] hover:bg-blue-600 active:bg-blue-700 px-4 py-3 text-xs font-bold text-white shadow-md shadow-blue-500/20 active:scale-[0.99] transition-all cursor-pointer"
                >
                  <Navigation size={15} className="fill-white" />
                  <span>START NAVIGATION</span>
                </button>

                {/* Route Preview Snippet */}
                <div className="rounded-xl bg-[#192638] p-3 border border-[#293A50] shadow-sm space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-[#94A3B8]">
                    <span className="font-semibold text-white">Route Summary</span>
                    <span>{route.steps.length} waypoints</span>
                  </div>
                  {routeCalculation.isApproachRoute && (
                    <div className="rounded-lg bg-amber-950/40 border border-amber-500/30 p-2 text-[11px] text-amber-200">
                      <div className="font-bold text-amber-300 flex items-center gap-1">
                        <AlertTriangle size={13} className="text-amber-400 shrink-0" />
                        <span>Approach Route (Walking Ends Nearby)</span>
                      </div>
                      <p className="text-[10px] text-amber-200/90 mt-0.5 leading-snug">
                        Walkway directions terminate at <strong>{routeCalculation.approachDestinationName}</strong>. Final pedestrian access to <strong>{targetDestinationName}</strong> has not been physically surveyed.
                      </p>
                    </div>
                  )}
                  <div className="text-xs text-[#F1F5F9] flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    <span className="truncate">Start: {originName}</span>
                  </div>
                  <div className="text-xs text-[#F1F5F9] flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${routeCalculation.isApproachRoute ? 'bg-amber-400' : 'bg-[#A78BFA]'}`} />
                    <span className="truncate">
                      {routeCalculation.isApproachRoute
                        ? `Walking Endpoint: ${routeCalculation.approachDestinationName}`
                        : `Destination: ${targetDestinationName}`}
                    </span>
                  </div>
                  {routeCalculation.isApproachRoute && (
                    <div className="text-xs text-[#A78BFA] flex items-center gap-2 pl-4 text-[11px]">
                      <span>↳ Target Facility: {targetDestinationName} (Unverified approach)</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* ACTIVE GUIDED NAVIGATION STATE (Turn-by-Turn Card) */
              <div className="space-y-3 rounded-2xl border border-[#293A50] bg-[#192638] p-3.5 shadow-xl">
                {/* Active Guidance Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-xs uppercase tracking-wider text-[#60A5FA]">
                    <span className={`h-2 w-2 rounded-full ${isAutoNavActive ? 'bg-[#60A5FA] animate-ping' : 'bg-[#60A5FA] animate-pulse'}`} />
                    <span>
                      {isAutoNavActive
                        ? isTestMode
                          ? 'Automatic GPS Guidance (Test Mode)'
                          : 'Automatic Live GPS Navigation Active'
                        : 'Walkway Guidance Active (Manual Stepper)'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    
                    <button
                      id={isMobile ? 'btn-exit-navigation-mobile' : 'btn-exit-navigation'}
                      type="button"
                      onClick={handleExitNavigation}
                      className="inline-flex items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-950/40 px-2 py-0.5 text-[11px] font-medium text-rose-300 hover:bg-rose-900/40 transition cursor-pointer"
                    >
                      <StopCircle size={12} className="text-rose-400" />
                      <span>Exit</span>
                    </button>
                  </div>
                </div>

                {/* Off-Route / Signal Status Warnings */}
                {isAutoNavActive && navState.status === 'off_route' && (
                  <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-950/40 p-2.5 text-xs text-amber-200">
                    <AlertTriangle size={15} className="text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-white">Off-Route Detected (~{navState.crossTrackDistance.toFixed(1)}m)</div>
                      <div className="text-[10px] text-[#94A3B8] leading-tight">
                        You have stepped away from the active walkway. Recalculating path safely using verified connections...
                      </div>
                    </div>
                  </div>
                )}

                {isAutoNavActive && navState.status === 'paused' && (
                  <div className="flex items-start gap-2 rounded-xl border border-blue-500/30 bg-blue-950/40 p-2.5 text-xs text-blue-200">
                    <Radio size={15} className="text-[#60A5FA] shrink-0 mt-0.5 animate-pulse" />
                    <div>
                      <div className="font-bold text-white">Navigation Paused (Weak GPS Signal)</div>
                      <div className="text-[10px] text-[#94A3B8] leading-tight">
                        Holding current instruction until high-accuracy satellite fix is restored.
                      </div>
                    </div>
                  </div>
                )}

                {/* Turn-by-Turn Guidance Hero Card */}
                <div className="rounded-2xl bg-[#162235] p-3.5 border border-[#293A50] space-y-3">
                  {/* Turn Maneuver Header */}
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl shadow-sm text-white ${
                        isArrived
                          ? 'bg-emerald-600'
                          : 'bg-[#2563EB]'
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
                          <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[9px] font-bold text-emerald-300 uppercase border border-emerald-500/30">
                            Arrived
                          </span>
                        )}
                        {isAutoNavActive && !isArrived && (
                          <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-[9px] font-bold text-[#60A5FA] uppercase border border-blue-500/30">
                            Auto Next
                          </span>
                        )}
                      </div>

                      <h3 className="text-xs font-semibold text-slate-200 mt-0.5 leading-snug">
                        {isArrived
                          ? routeCalculation.isApproachRoute && routeCalculation.originalPoi
                            ? `You have reached Main Entrance (Gate 1)! Final approach to ${routeCalculation.originalPoi.name} requires walking ~35m west along the frontage lawn.`
                            : `You have reached ${locationOptions.find((o) => o.id === toId)?.label}!`
                          : currentStep.title}
                      </h3>

                      {currentStep.notes && !isArrived && (
                        <p className="mt-0.5 text-[11px] text-[#94A3B8]">
                          {currentStep.notes}
                        </p>
                      )}

                      {/* Next Turn Preview */}
                      {nextStep && !isArrived && (
                        <div className="mt-1.5 flex items-center gap-1 text-[10px] text-[#94A3B8]">
                          <span>Then:</span>
                          <span className="font-medium text-slate-300 truncate">
                            {nextStep.title}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="border-t border-[#293A50] pt-2.5 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-slate-200">
                        {isArrived
                          ? 'All Instructions Viewed'
                          : isAutoNavActive
                            ? `Instruction ${activeStepIndex + 1} of ${route.steps.length} • ~${Math.max(0, navState.remainingDistance).toFixed(0)}m remaining`
                            : `Instruction ${activeStepIndex + 1} of ${route.steps.length}`}
                      </span>
                      <span className="font-medium text-[#94A3B8]">
                        {isAutoNavActive
                          ? `${totalRouteDistance > 0 ? Math.min(100, Math.round((navState.currentDistance / totalRouteDistance) * 100)) : 0}% walked`
                          : `${Math.round(((activeStepIndex + 1) / route.steps.length) * 100)}% viewed`}
                      </span>
                    </div>

                    <div className="h-2 w-full rounded-full bg-[#24364D] overflow-hidden">
                      <div
                        className="h-full bg-[#2563EB] transition-all duration-300"
                        style={{
                          width: `${
                            isAutoNavActive
                              ? totalRouteDistance > 0
                                ? Math.min(100, Math.max(0, (navState.currentDistance / totalRouteDistance) * 100))
                                : 0
                              : Math.min(100, Math.max(0, ((activeStepIndex + 1) / route.steps.length) * 100))
                          }%`,
                        }}
                      />
                    </div>

                    <div className="text-[10px] text-[#94A3B8] flex items-center justify-between">
                      <span>
                        {isAutoNavActive
                          ? 'Automatic GPS progression • Step advances automatically as you walk'
                          : 'Step-by-step walkway directions • Physical position is not tracked'}
                      </span>
                      {isAutoNavActive && (
                        <span className="text-[#60A5FA] font-mono text-[9px] font-semibold">
                          AUTO ADVANCE ON
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Step Navigation Controls */}
                  <div className="flex items-center justify-between gap-2 border-t border-[#293A50] pt-2.5">
                    <div className="flex items-center gap-1.5">
                      <button
                        id={isMobile ? 'btn-prev-step-mobile' : 'btn-prev-step'}
                        type="button"
                        disabled={activeStepIndex === 0}
                        onClick={() => setActiveStepIndex((idx) => Math.max(0, idx - 1))}
                        className="flex items-center gap-1 rounded-xl border border-[#293A50] bg-[#192638] px-3 py-1.5 text-xs font-medium text-[#94A3B8] hover:text-white hover:bg-[#24364D] disabled:opacity-40 transition cursor-pointer shadow-sm"
                      >
                        <ChevronLeft size={13} />
                        <span>Previous</span>
                      </button>

                      <button
                        id={isMobile ? 'btn-next-step-mobile' : 'btn-next-step'}
                        type="button"
                        disabled={activeStepIndex >= route.steps.length - 1}
                        onClick={() => setActiveStepIndex((idx) => Math.min(route.steps.length - 1, idx + 1))}
                        className="flex items-center gap-1 rounded-xl bg-[#2563EB] px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-600 disabled:opacity-40 transition cursor-pointer"
                      >
                        <span>Next Step</span>
                        <ChevronRight size={13} />
                      </button>
                    </div>

                    <button
                      id={isMobile ? 'btn-recenter-mobile' : 'btn-recenter'}
                      type="button"
                      onClick={() => {
                        setIsCameraFollowing(true)
                        handleRecenterCamera()
                      }}
                      className="flex items-center gap-1 rounded-xl border border-[#293A50] bg-[#192638] px-2.5 py-1.5 text-xs font-medium text-[#94A3B8] hover:border-[#60A5FA] hover:text-white transition cursor-pointer shadow-sm"
                      title={activeUserPosition ? 'Recenter camera on blue dot location' : 'Recenter camera on current step'}
                    >
                      <Crosshair size={13} className="text-[#60A5FA]" />
                      <span>{activeUserPosition ? 'Recenter on Me' : 'Recenter'}</span>
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
              className="flex w-full items-center justify-between rounded-xl border border-[#293A50] bg-[#192638] px-3 py-2 text-xs font-medium text-[#94A3B8] hover:text-white hover:bg-[#24364D] transition-colors shadow-sm cursor-pointer"
            >
              <span className="flex items-center gap-1.5">
                <Layers size={14} className="text-[#60A5FA]" />
                <span>Full Waypoints List ({route.steps.length} nodes)</span>
              </span>
              <span className="text-[11px] text-[#60A5FA] font-semibold">
                {showAllSteps ? 'Hide' : 'View'}
              </span>
            </button>

            {/* Expanded Waypoint List */}
            {showAllSteps && (
              <div className="max-h-48 space-y-1.5 overflow-y-auto rounded-xl border border-[#293A50] bg-[#192638] p-2 text-xs shadow-sm">
                {route.steps.map((step, idx) => (
                  <div
                    key={`step-${step.nodeId}-${idx}`}
                    onClick={() => {
                      setActiveStepIndex(idx)
                      setIsNavigating(true)
                    }}
                    className={`flex cursor-pointer items-start justify-between rounded-lg p-2 transition-colors ${
                      idx === activeStepIndex && isNavigating
                        ? 'bg-[#24364D] ring-1 ring-[#60A5FA] font-semibold text-white'
                        : 'hover:bg-[#24364D]/50 text-slate-300'
                    }`}
                  >
                    <div className="truncate pr-2">
                      <span className="text-[#94A3B8] mr-1.5">{idx + 1}.</span>
                      <span>{step.title}</span>
                    </div>
                    <span className="text-[10px] text-[#60A5FA] uppercase flex-shrink-0 font-medium">
                      {step.verificationStatus}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Provisional POI with Unverified Entrance Notice */}
        {routeCalculation.status === 'provisional-poi' && routeCalculation.poi && (
          <div
            id="poi-provisional-warning"
            data-testid="poi-provisional-warning"
            className="rounded-2xl border border-amber-500/30 bg-amber-950/20 p-3.5 text-xs text-amber-200 shadow-sm space-y-3"
          >
            <div className="flex items-start gap-2.5">
              <AlertTriangle size={18} className="mt-0.5 text-amber-400 flex-shrink-0" />
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-bold text-amber-300 text-sm">
                    Directions to this entrance are still being verified.
                  </h2>
                  <span className="rounded-md bg-amber-900/40 px-1.5 py-0.2 text-[9px] font-bold text-amber-300 uppercase border border-amber-600/40">
                    Provisional POI
                  </span>
                </div>
                <p className="text-[11px] text-amber-200/90 leading-relaxed">
                  {routeCalculation.message}
                </p>
                <div className="text-[10px] text-slate-300 pt-0.5">
                  <span className="text-amber-400 font-semibold">Location:</span> {routeCalculation.poi.locationDescription}
                </div>
              </div>
            </div>

            {/* Verified Nearby Point Action Card */}
            {toId === routeCalculation.poi.id && (
              <div className="rounded-xl border border-amber-500/30 bg-[#162235] p-2.5 space-y-2">
                <div className="text-[11px] font-bold text-white flex items-center gap-1.5">
                  <Footprints size={14} className="text-amber-400 shrink-0" />
                  <span>Verified Nearby Point</span>
                </div>
                <p className="text-[10px] text-[#94A3B8] leading-snug">
                  Navigate along verified walkways to <strong className="text-white">Main Entrance (Gate 1 Approach)</strong>.
                </p>
                <button
                  type="button"
                  id="btn-navigate-approach-gate"
                  data-testid="btn-navigate-approach-gate"
                  onClick={() => setShowApproachRoute(true)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#60A5FA] hover:bg-blue-400 px-3 py-2 text-xs font-bold text-[#0F172A] shadow-sm transition-all cursor-pointer"
                >
                  <Footprints size={14} />
                  <span>Navigate to Verified Nearby Point (Gate 1 Approach)</span>
                </button>
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => handleBuildingSelect(toId)}
                    className="flex items-center gap-1.5 rounded-lg border border-[#293A50] bg-[#192638] px-2.5 py-1 text-[11px] font-medium text-slate-300 hover:bg-[#24364D] hover:text-white transition cursor-pointer"
                  >
                    <Layers size={12} className="text-[#60A5FA]" />
                    <span>View on Map</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDestinationSearchQuery('')
                      setIsDestinationSearchFocused(true)
                    }}
                    className="flex items-center gap-1.5 rounded-lg border border-[#293A50] bg-[#192638] px-2.5 py-1 text-[11px] font-medium text-slate-300 hover:bg-[#24364D] hover:text-white transition cursor-pointer"
                  >
                    <Search size={12} className="text-[#60A5FA]" />
                    <span>Choose Another Destination</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Unknown Destination Message */}
        {routeCalculation.status === 'unknown' && (
          <div
            id="route-unknown-notice"
            data-testid="route-unknown-notice"
            className="rounded-2xl border border-rose-500/30 bg-rose-950/40 p-3.5 text-xs text-rose-200 shadow-sm"
          >
            <div className="flex items-start gap-2.5">
              <AlertTriangle size={18} className="mt-0.5 text-rose-400 flex-shrink-0" />
              <div className="space-y-1">
                <h2 className="font-semibold text-rose-300">Unknown Destination</h2>
                <p className="text-[11px] text-rose-200/90 leading-relaxed">
                  {routeCalculation.message}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* At Nearest Verified Approach Point Notice */}
        {routeCalculation.status === 'at-approach-point' && (
          <div
            id="at-approach-point-card"
            data-testid="at-approach-point-card"
            className="rounded-2xl border border-amber-500/40 bg-amber-950/30 p-3.5 text-xs text-amber-200 shadow-md space-y-3"
          >
            <div className="flex items-start gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 flex-shrink-0">
                <Footprints size={18} />
              </div>
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-bold text-amber-300 text-sm">
                    At Nearest Verified Approach Point
                  </h2>
                  <span className="rounded-md bg-amber-900/50 px-1.5 py-0.5 text-[9px] font-bold text-amber-300 uppercase border border-amber-500/40">
                    Approach Endpoint
                  </span>
                </div>
                <p className="text-[11px] text-amber-200/90 leading-relaxed">
                  {routeCalculation.message}
                </p>
                <p className="text-[10px] text-amber-300/80">
                  Target: <strong className="text-white">{targetDestinationName}</strong> • Verified Stop: <strong className="text-amber-300">{routeCalculation.approachDestinationName}</strong>
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-amber-500/20">
              <button
                type="button"
                id="btn-preview-facility-3d"
                onClick={() => handleRecenterCamera()}
                className="flex items-center gap-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 px-3 py-2 text-xs font-bold text-stone-900 shadow-sm transition-all cursor-pointer"
              >
                <Layers size={13} />
                <span>Preview Facility &amp; Surroundings</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setDestinationSearchQuery('')
                  setIsDestinationSearchFocused(true)
                }}
                className="flex items-center gap-1.5 rounded-xl border border-[#293A50] bg-[#192638] px-3 py-2 text-xs font-medium text-slate-300 hover:bg-[#24364D] hover:text-white transition cursor-pointer"
              >
                <Search size={13} className="text-[#60A5FA]" />
                <span>Choose Another Destination</span>
              </button>
            </div>
          </div>
        )}

        {/* Disconnected or Unverified Standard Building Destination Message */}
        {routeCalculation.status !== 'ok' &&
          routeCalculation.status !== 'provisional-poi' &&
          routeCalculation.status !== 'at-approach-point' &&
          routeCalculation.status !== 'unknown' && (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-950/20 p-3.5 text-xs text-amber-200 shadow-sm">
              <div className="flex items-start gap-2.5">
                <AlertTriangle size={18} className="mt-0.5 text-amber-400 flex-shrink-0" />
                <div className="space-y-2 w-full">
                  <div>
                    <h2 className="font-semibold text-amber-300">
                      {routeCalculation.status === 'unverified'
                        ? 'Directions to this entrance are still being verified.'
                        : routeCalculation.status === 'same-node'
                          ? 'Identical Start & End'
                          : 'Route Unavailable'}
                    </h2>
                    <p className="text-[11px] text-amber-200/90 leading-relaxed mt-0.5">
                      {routeCalculation.message}
                    </p>
                  </div>

                  {/* Library special verified approach option */}
                  {toId === 'library' && (
                    <div className="pt-1">
                      <button
                        type="button"
                        id="btn-navigate-approach-library-main"
                        data-testid="btn-navigate-approach-library-main"
                        onClick={() => setShowApproachRoute(true)}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#60A5FA] hover:bg-blue-400 px-3 py-2 text-xs font-bold text-[#0F172A] shadow-sm transition-all cursor-pointer"
                      >
                        <Footprints size={14} />
                        <span>Navigate to Verified Nearby Point (Main Block Approach)</span>
                      </button>
                    </div>
                  )}

                  {/* Helpful Quick Navigation Actions */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => handleBuildingSelect(toId)}
                      className="flex items-center gap-1.5 rounded-lg border border-[#293A50] bg-[#192638] px-2.5 py-1 text-[11px] font-medium text-slate-300 hover:bg-[#24364D] hover:text-white transition cursor-pointer"
                    >
                      <Layers size={12} className="text-[#60A5FA]" />
                      <span>View on Map</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDestinationSearchQuery('')
                        setIsDestinationSearchFocused(true)
                      }}
                      className="flex items-center gap-1.5 rounded-lg border border-[#293A50] bg-[#192638] px-2.5 py-1 text-[11px] font-medium text-slate-300 hover:bg-[#24364D] hover:text-white transition cursor-pointer"
                    >
                      <Search size={12} className="text-[#60A5FA]" />
                      <span>Choose Another Destination</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
      </div>

      {/* Landmarks Traversed */}
      {landmarksPassed.length > 0 && (
        <div className="border-t border-[#293A50] pt-2.5">
          <div className="text-[11px] font-semibold text-[#94A3B8]">Landmarks along this path:</div>
          <div className="mt-1 flex flex-wrap gap-1">
            {landmarksPassed.map((landmark) => (
              <span
                key={landmark}
                className="rounded-lg bg-[#192638] border border-[#293A50] px-2 py-0.5 text-[10px] font-medium text-slate-300"
              >
                {landmark}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* College Wayfinding Footer */}
      <div className="border-t border-[#293A50] pt-2 text-[10px] text-[#94A3B8] text-center">
        Misrimal Navajee Munoth Jain Engineering College • Campus Wayfinding
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
          className={`flex flex-col h-full bg-[#162235]/95 backdrop-blur-xl rounded-3xl border border-[#293A50] shadow-2xl overflow-hidden transition-all duration-300 relative flex-shrink-0 ${
            isSidebarCollapsed ? 'w-14 items-center' : 'w-[360px] xl:w-[380px]'
          }`}
        >
          {/* Collapsed Mini-Sidebar View */}
          {isSidebarCollapsed ? (
            <div className="flex flex-col items-center py-4 gap-4 h-full">
              <button
                type="button"
                onClick={() => setIsSidebarCollapsed(false)}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#192638] border border-[#293A50] text-[#94A3B8] hover:bg-[#24364D] hover:text-white transition-colors shadow-sm cursor-pointer"
                title="Expand route planner"
                aria-label="Expand route planner"
              >
                <PanelLeftOpen size={18} />
              </button>
              <div className="h-px w-8 bg-[#24364D]" />
              <button
                type="button"
                onClick={handleReset}
                className="flex h-10 w-10 items-center justify-center rounded-xl text-[#94A3B8] hover:bg-[#24364D] hover:text-white transition-colors cursor-pointer"
                title="Reset route"
                aria-label="Reset route"
              >
                <RotateCcw size={16} />
              </button>
              <button
                type="button"
                onClick={handleSwap}
                className="flex h-10 w-10 items-center justify-center rounded-xl text-[#94A3B8] hover:bg-[#24364D] hover:text-white transition-colors cursor-pointer"
                title="Swap origin and destination"
                aria-label="Swap origin and destination"
              >
                <ArrowLeftRight size={16} />
              </button>
              <div className="mt-auto flex flex-col items-center pb-2">
                <span
                  className="h-2.5 w-2.5 rounded-full bg-[#60A5FA] animate-pulse shadow-sm shadow-blue-500/50"
                  title="Campus Navigator Active"
                />
              </div>
            </div>
          ) : (
            /* Expanded Full Sidebar */
            <div className="flex flex-col h-full p-4 overflow-y-auto">
              {/* Header: Title, Reset and Collapse Toggle */}
              <div className="flex items-center justify-between border-b border-[#293A50] pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#2563EB] text-white shadow-sm shadow-blue-500/20">
                    <Navigation size={16} />
                  </div>
                  <div>
                    <h1 className="text-sm font-semibold text-white leading-tight">Campus Navigator</h1>
                    <p className="text-[10px] text-[#94A3B8] truncate max-w-[190px]">MNMJEC Campus Model</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="flex h-8 items-center gap-1 rounded-xl border border-[#293A50] bg-[#192638] px-2 text-xs font-medium text-[#94A3B8] hover:bg-[#24364D] hover:text-white transition-colors shadow-sm cursor-pointer"
                    title="Reset route to default"
                  >
                    <RotateCcw size={12} />
                    <span>Reset</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsSidebarCollapsed(true)}
                    className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#293A50] bg-[#192638] text-[#94A3B8] hover:bg-[#24364D] hover:text-white transition-colors shadow-sm cursor-pointer"
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
        <main className="flex-1 min-w-0 h-full relative rounded-3xl border border-[#293A50] bg-[#101827] overflow-hidden shadow-2xl">
          <Campus3D
            key={`campus-3d-desktop-${cameraRevision}`}
            routePoints={routePoints}
            isApproachRoute={Boolean(routeCalculation.isApproachRoute)}
            approachDestinationName={routeCalculation.approachDestinationName}
            originName={originName}
            targetDestinationPoint={targetDestinationPoint}
            targetDestinationName={targetDestinationName}
            activeStepPoint={isNavigating ? activeStepPoint : null}
            userLocationPoint={activeUserPosition}
            userLocationAccuracyRadius={gpsCoords?.accuracy}
            userLocationIsSimulated={isTestMode}
            userLocationLabel={isTestMode ? 'Simulated Location (Test Mode)' : 'Your Location'}
            completedPoints={isAutoNavActive ? navState.completedPoints : undefined}
            remainingPoints={isAutoNavActive ? navState.remainingPoints : undefined}
            isSimulating={false}
            selectedBuildingId={toId}
            viewTarget={isCameraFollowing && activeUserPosition ? 'location' : 'route'}
            showHud={false}
            showInstructionBadge={false}
            className="absolute inset-0 h-full w-full"
            onBuildingSelect={handleBuildingSelect}
          />
          {/* Subtle bottom-left hint */}
          <div className="pointer-events-none absolute bottom-4 left-4 z-10 flex items-center gap-2">
            <div className="pointer-events-auto rounded-full bg-[#162235]/90 border border-[#293A50] px-3.5 py-1.5 text-[11px] font-medium text-[#94A3B8] shadow-md backdrop-blur-md">
              Click any building to set destination • 1-finger pan • 2-finger twist
            </div>
            
          </div>
        </main>
      </div>

      {/* ============================================================== */}
      {/* MOBILE LAYOUT (< md): Large Viewport + Collapsible Bottom Sheet */}
      {/* ============================================================== */}
      <div className="flex md:hidden flex-col h-[calc(100dvh-10.5rem)] min-h-[460px] w-full relative rounded-3xl border border-[#293A50] bg-[#101827] overflow-hidden shadow-2xl">
        {/* Full 3D Campus Viewport */}
        <div className="absolute inset-0 h-full w-full">
          <Campus3D
            key={`campus-3d-mobile-${cameraRevision}`}
            routePoints={routePoints}
            isApproachRoute={Boolean(routeCalculation.isApproachRoute)}
            approachDestinationName={routeCalculation.approachDestinationName}
            originName={originName}
            targetDestinationPoint={targetDestinationPoint}
            targetDestinationName={targetDestinationName}
            activeStepPoint={isNavigating ? activeStepPoint : null}
            userLocationPoint={activeUserPosition}
            userLocationAccuracyRadius={gpsCoords?.accuracy}
            userLocationIsSimulated={isTestMode}
            userLocationLabel={isTestMode ? 'Simulated Location (Test Mode)' : 'Your Location'}
            completedPoints={isAutoNavActive ? navState.completedPoints : undefined}
            remainingPoints={isAutoNavActive ? navState.remainingPoints : undefined}
            isSimulating={false}
            selectedBuildingId={toId}
            viewTarget={isCameraFollowing && activeUserPosition ? 'location' : 'route'}
            showHud={false}
            showInstructionBadge={false}
            className="h-full w-full"
            onBuildingSelect={handleBuildingSelect}
          />
        </div>

        {/* Floating Mobile Bottom Sheet with 3 States: collapsed, half, expanded */}
        <div
          className={`absolute inset-x-0 bottom-0 z-30 flex flex-col rounded-t-3xl bg-[#162235]/98 shadow-2xl border-t border-x border-[#293A50] backdrop-blur-xl transition-all duration-300 text-[#F1F5F9] ${
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
            className="flex flex-col items-center px-4 pt-2 pb-2 border-b border-[#293A50] flex-shrink-0 cursor-pointer select-none"
          >
            <button
              type="button"
              onClick={() => {
                setMobileSheetState((s) => (s === 'collapsed' ? 'half' : s === 'half' ? 'expanded' : 'collapsed'))
              }}
              className="h-1.5 w-12 rounded-full bg-[#24364D] hover:bg-[#34465E] transition-colors mb-2"
              aria-label="Toggle sheet height"
            />
            <div className="flex w-full items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#2563EB] text-white shadow-sm shadow-blue-500/20">
                  <Navigation size={14} />
                </div>
                <div className="text-left">
                  <h2 className="text-xs font-semibold text-white leading-tight">Campus Navigator</h2>
                  <p className="text-[10px] text-[#94A3B8]">
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
                  className="rounded-lg border border-[#293A50] bg-[#192638] px-2 py-1 text-[11px] font-medium text-[#94A3B8] hover:text-white shadow-sm"
                  title="Reset"
                >
                  <RotateCcw size={12} />
                </button>
                {mobileSheetState === 'collapsed' ? (
                  <button
                    type="button"
                    onClick={() => setMobileSheetState('half')}
                    className="rounded-lg border border-[#293A50] bg-[#192638] p-1 text-[#94A3B8] hover:text-white shadow-sm"
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
                      className="rounded-lg border border-[#293A50] bg-[#192638] p-1 text-[#94A3B8] hover:text-white shadow-sm"
                      title="Collapse sheet"
                      aria-label="Collapse sheet"
                    >
                      <ChevronDown size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setMobileSheetState('expanded')}
                      className="rounded-lg border border-[#293A50] bg-[#192638] p-1 text-[#94A3B8] hover:text-white shadow-sm"
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
                    className="rounded-lg border border-[#293A50] bg-[#192638] p-1 text-[#94A3B8] hover:text-white shadow-sm"
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

      

      </div>
  )
}
