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
  const renderPlanningControls = (isMobile: boolean = false) => {
    // 1. Origin & Destination Selectors and Overview
    const selectorsBlock = (
      <div className="space-y-3 font-sans">
        <div className="grid gap-2.5">
          {/* From Input */}
          <div className="flex items-center gap-2.5 rounded-2xl border border-[#C9B6DF] bg-[#FBF8FD] px-3.5 py-2 focus-within:border-[#352A47] focus-within:ring-2 focus-within:ring-[#D2BEE7] shadow-2xs transition-all">
            <span className="h-2.5 w-2.5 rounded-full border border-[#94BCA7] bg-[#1E583F] shadow-xs flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <label
                htmlFor={isMobile ? 'mobile-route-from-select' : 'route-from-select'}
                className="block text-[10px] font-heading font-bold uppercase tracking-wider text-[#51465F]"
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
                className="w-full bg-transparent text-xs font-heading font-bold text-[#352A47] outline-none disabled:opacity-60 cursor-pointer"
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
            <div className="absolute inset-x-0 h-px bg-[#C9B6DF]/80" />
            <button
              id={isMobile ? 'btn-swap-locations-mobile' : 'btn-swap-locations'}
              type="button"
              disabled={isNavigating}
              onClick={handleSwap}
              className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full border border-[#D7A894] bg-[#E8C8B9] text-[#352A47] shadow-dream-soft hover:bg-[#DEC0B0] disabled:opacity-40 transition-colors cursor-pointer"
              title="Swap origin and destination"
              aria-label="Swap origin and destination"
            >
              <ArrowLeftRight size={13} />
            </button>
          </div>

          {/* Destination Search & Alias Filter Input */}
          <div className="relative">
            <div className="flex items-center gap-2 rounded-2xl border border-[#C9B6DF] bg-[#FBF8FD] px-3 py-2 focus-within:border-[#352A47] focus-within:ring-2 focus-within:ring-[#D2BEE7] shadow-2xs transition-all">
              <Search size={14} className="text-[#352A47] shrink-0" />
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
                className="w-full bg-transparent text-xs font-sans font-medium text-[#352A47] placeholder:text-[#7E708E] outline-none disabled:opacity-50"
              />
              {destinationSearchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setDestinationSearchQuery('')
                    setIsDestinationSearchFocused(false)
                  }}
                  className="rounded-full p-0.5 text-[#51465F] hover:text-[#352A47]"
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
                className="absolute inset-x-0 top-full mt-1.5 max-h-56 overflow-y-auto rounded-2xl border border-[#C9B6DF] bg-[#FBF8FD] p-2 shadow-dream-elevated backdrop-blur-2xl z-50 divide-y divide-[#C9B6DF]/50"
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
                      className="flex w-full items-center justify-between rounded-xl p-2 text-left hover:bg-[#E8DDF2] transition cursor-pointer text-xs"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="font-heading font-bold text-[#352A47] flex items-center gap-1.5">
                          <span>{opt.label}</span>
                          {opt.type === 'poi' && (
                            <span className="rounded-md bg-[#E8C8B9] px-2 py-0.2 text-[9px] font-heading font-bold text-[#9E563A] uppercase border border-[#D7A894]">
                              Provisional
                            </span>
                          )}
                        </div>
                        {opt.matchedAlias && (
                          <div className="text-[10px] text-[#265A6E] font-sans font-medium">
                            Matched alias: &ldquo;{opt.matchedAlias}&rdquo;
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] text-[#51465F] font-heading capitalize">
                        {opt.type}
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="p-2.5 text-center text-[11px] text-[#51465F] font-sans font-medium">
                    No campus locations matching &ldquo;{destinationSearchQuery}&rdquo;
                  </div>
                )}
              </div>
            )}
          </div>

          {/* To Input Select */}
          <div className="flex items-center gap-2.5 rounded-2xl border border-[#C9B6DF] bg-[#FBF8FD] px-3.5 py-2 focus-within:border-[#352A47] focus-within:ring-2 focus-within:ring-[#D2BEE7] shadow-2xs transition-all">
            <span className="h-2.5 w-2.5 rounded-full border border-[#D7A894] bg-[#E8C8B9] shadow-xs flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <label
                htmlFor={isMobile ? 'mobile-route-to-select' : 'route-to-select'}
                className="block text-[10px] font-heading font-bold uppercase tracking-wider text-[#51465F]"
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
                className="w-full bg-transparent text-xs font-heading font-bold text-[#352A47] outline-none disabled:opacity-60 cursor-pointer"
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
          <div id="approach-route-banner" data-testid="approach-route-banner" className="rounded-2xl border border-[#D7A894] bg-[#F5E6DF] p-3 text-xs text-[#9E563A] shadow-2xs">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1 min-w-0">
                <div className="font-heading font-bold text-[#9E563A] uppercase tracking-wider text-[11px] flex items-center gap-1.5 flex-wrap">
                  <span>To {routeCalculation.approachDestinationName} — Not to {targetDestinationName}</span>
                  <span className="rounded-full bg-[#E8C8B9] px-2 py-0.2 text-[9px] text-[#9E563A] font-bold border border-[#D7A894]">
                    Approach Only
                  </span>
                </div>
                <p className="text-[10px] text-[#51465F] font-sans leading-snug">
                  Guided along verified walkways to <strong className="text-[#352A47]">{routeCalculation.approachDestinationName}</strong>. Final pedestrian approach to <strong className="text-[#352A47]">{targetDestinationName}</strong> has not been physically surveyed.
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
                className="shrink-0 rounded-xl border border-[#D7A894] bg-[#FBF8FD] px-2.5 py-1 text-[10px] font-heading font-bold text-[#9E563A] hover:bg-white transition-colors shadow-2xs cursor-pointer"
                title="Dismiss approach route"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Route Overview Card (When route is valid) */}
        {routeCalculation.status === 'ok' && route && (
          <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5 rounded-2xl bg-[#E8DDF2] border border-[#C9B6DF] p-3 text-xs text-[#352A47] shadow-dream-soft">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#352A47] text-[#FAF6FD]">
                <Footprints size={16} />
              </div>
              <div className="min-w-0">
                <div className="font-heading font-bold text-[#352A47] flex items-center gap-1.5 flex-wrap">
                  <span className="font-editorial italic text-base font-bold">~{totalRouteDistance.toFixed(0)}m</span>
                  <span className="text-[#51465F]">•</span>
                  <span>~{estimatedWalkingMinutes} min walk</span>
                </div>
                <div className="text-[10px] text-[#51465F] font-sans truncate">
                  {route.steps.length} turns • {routeCalculation.isApproachRoute ? `Verified approach to ${routeCalculation.approachDestinationName}` : 'Surveyed walkway network'}
                </div>
              </div>
            </div>
            <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-heading font-bold uppercase tracking-wider border ${
              routeCalculation.isApproachRoute
                ? 'bg-[#E8C8B9] text-[#9E563A] border-[#D7A894]'
                : 'bg-[#D2BEE7] text-[#352A47] border-[#C9B6DF]'
            }`}>
              {routeCalculation.isApproachRoute ? 'Approach Route' : 'Surveyed'}
            </span>
          </div>
        )}
      </div>
    )

    const mainActionBlock = (
      <div className="flex-1 font-sans">
        {routeCalculation.status === 'ok' && route && currentStep && (
          <div className="space-y-3">
            {/* GPS Calibration Safety Notice (When active and uncalibrated) */}
            {isNavigating && showGpsNotice && (
              <div className="flex items-center justify-between gap-2 rounded-2xl border border-[#94BCA7] bg-[#BCD8C9] px-3.5 py-2 text-[10px] text-[#1E583F] shadow-2xs">
                <div className="flex items-center gap-1.5 min-w-0">
                  <ShieldAlert size={13} className="text-[#1E583F] shrink-0" />
                  <span className="truncate font-sans font-medium">Guided along authentic surveyed campus walkways</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowGpsNotice(false)}
                  className="text-[9px] font-heading font-bold text-[#1E583F] hover:underline uppercase shrink-0 cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* PREVIEW STATE: Single Primary Action "START NAVIGATION" */}
            {!isNavigating ? (
              <div className="space-y-3">
                <button
                  id={isMobile ? 'btn-start-navigation-mobile' : 'btn-start-navigation'}
                  type="button"
                  onClick={handleStartNavigation}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#352A47] hover:bg-[#433659] active:bg-[#251B33] px-4 py-3.5 text-xs font-heading font-bold text-[#FAF6FD] shadow-dream-soft active:scale-[0.99] transition-all cursor-pointer min-h-[44px]"
                >
                  <Navigation size={15} className="fill-[#FAF6FD]" />
                  <span>START NAVIGATION</span>
                </button>

                {/* Route Preview Snippet */}
                <div className="rounded-2xl bg-[#FBF8FD] p-4 border border-[#C9B6DF] shadow-dream-soft space-y-2.5">
                  <div className="flex items-center justify-between text-[11px] font-heading">
                    <span className="font-bold text-[#352A47]">Route Summary</span>
                    <span className="text-[#51465F] font-sans font-medium">{route.steps.length} waypoints</span>
                  </div>
                  {routeCalculation.isApproachRoute && (
                    <div className="rounded-xl bg-[#F5E6DF] border border-[#D7A894] p-2.5 text-[11px] text-[#9E563A]">
                      <div className="font-heading font-bold text-[#9E563A] flex items-center gap-1">
                        <AlertTriangle size={13} className="text-[#9E563A] shrink-0" />
                        <span>Approach Route (Walking Ends Nearby)</span>
                      </div>
                      <p className="text-[10px] text-[#51465F] font-sans mt-0.5 leading-snug">
                        Walkway directions terminate at <strong>{routeCalculation.approachDestinationName}</strong>. Final pedestrian access to <strong>{targetDestinationName}</strong> has not been physically surveyed.
                      </p>
                    </div>
                  )}
                  <div className="text-xs text-[#352A47] flex items-center gap-2 font-medium">
                    <span className="h-2 w-2 rounded-full bg-[#1E583F]" />
                    <span className="truncate">Start: {originName}</span>
                  </div>
                  <div className="text-xs text-[#352A47] flex items-center gap-2 font-medium">
                    <span className={`h-2 w-2 rounded-full ${routeCalculation.isApproachRoute ? 'bg-[#9E563A]' : 'bg-[#352A47]'}`} />
                    <span className="truncate">
                      {routeCalculation.isApproachRoute
                        ? `Walking Endpoint: ${routeCalculation.approachDestinationName}`
                        : `Destination: ${targetDestinationName}`}
                    </span>
                  </div>
                  {routeCalculation.isApproachRoute && (
                    <div className="text-xs text-[#9E563A] flex items-center gap-2 pl-4 text-[11px] font-medium">
                      <span>↳ Target Facility: {targetDestinationName} (Unverified approach)</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* ACTIVE GUIDED NAVIGATION STATE (Turn-by-Turn Card) */
              <div className="space-y-3.5 rounded-3xl border border-[#C9B6DF] bg-[#FBF8FD] p-4 sm:p-5 shadow-dream-card text-[#352A47]">
                {/* Active Guidance Header */}
                <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 pb-2.5 border-b border-[#C9B6DF]">
                  <div className="flex items-center gap-1.5 font-heading font-bold text-[11px] sm:text-xs uppercase tracking-wider text-[#352A47] min-w-0">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${isAutoNavActive ? 'bg-[#1E583F] animate-ping' : 'bg-[#352A47] animate-pulse'}`} />
                    <span className="truncate">
                      {isAutoNavActive
                        ? isTestMode
                          ? 'Automatic GPS Guidance (Test Mode)'
                          : 'Automatic Live GPS Navigation'
                        : 'Walkway Guidance Active (Manual Stepper)'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      id={isMobile ? 'btn-exit-navigation-mobile' : 'btn-exit-navigation'}
                      type="button"
                      onClick={handleExitNavigation}
                      className="inline-flex items-center gap-1 rounded-xl border border-rose-300 bg-rose-100 hover:bg-rose-200 px-3 py-1 text-[11px] font-heading font-bold text-rose-800 transition cursor-pointer shadow-2xs"
                    >
                      <StopCircle size={12} className="text-rose-700" />
                      <span>Exit</span>
                    </button>
                  </div>
                </div>

                {/* Off-Route / Signal Status Warnings */}
                {isAutoNavActive && navState.status === 'off_route' && (
                  <div className="flex items-start gap-2.5 rounded-2xl border border-[#D7A894] bg-[#F5E6DF] p-3 text-xs text-[#9E563A]">
                    <AlertTriangle size={15} className="text-[#9E563A] shrink-0 mt-0.5" />
                    <div>
                      <div className="font-heading font-bold text-[#9E563A]">Off-Route Detected (~{navState.crossTrackDistance.toFixed(1)}m)</div>
                      <div className="text-[10px] text-[#51465F] font-sans leading-tight mt-0.5">
                        You have stepped away from the active walkway. Recalculating path safely using verified connections...
                      </div>
                    </div>
                  </div>
                )}

                {isAutoNavActive && navState.status === 'paused' && (
                  <div className="flex items-start gap-2.5 rounded-2xl border border-[#9FBECB] bg-[#C6DCE4] p-3 text-xs text-[#265A6E]">
                    <Radio size={15} className="text-[#265A6E] shrink-0 mt-0.5 animate-pulse" />
                    <div>
                      <div className="font-heading font-bold text-[#265A6E]">Navigation Paused (Weak GPS Signal)</div>
                      <div className="text-[10px] text-[#265A6E]/90 font-sans leading-tight mt-0.5">
                        Holding current instruction until high-accuracy satellite fix is restored.
                      </div>
                    </div>
                  </div>
                )}

                {/* Turn Maneuver Header */}
                <div className="flex items-start gap-3.5">
                    <div
                      className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl shadow-2xs ${
                        isArrived
                          ? 'bg-[#BCD8C9] text-[#1E583F] border border-[#94BCA7]'
                          : 'bg-[#E8C8B9] text-[#352A47] border border-[#D7A894]'
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
                        <span className="font-heading font-bold text-base text-[#352A47] tracking-tight">
                          {isArrived
                            ? 'Destination Arrived'
                            : `Instruction ${activeStepIndex + 1} of ${route.steps.length}`}
                        </span>
                        {isArrived && (
                          <span className="rounded-full bg-[#BCD8C9] px-2.5 py-0.5 text-[9px] font-heading font-bold text-[#1E583F] uppercase border border-[#94BCA7]">
                            Arrived
                          </span>
                        )}
                        {isAutoNavActive && !isArrived && (
                          <span className="rounded-full bg-[#D2BEE7] px-2.5 py-0.5 text-[9px] font-heading font-bold text-[#352A47] uppercase border border-[#C9B6DF]">
                            Auto Next
                          </span>
                        )}
                      </div>

                      <h3 className="font-sans text-xs font-semibold text-[#352A47] mt-1 leading-snug">
                        {isArrived
                          ? routeCalculation.isApproachRoute && routeCalculation.originalPoi
                            ? `You have reached Main Entrance (Gate 1)! Final approach to ${routeCalculation.originalPoi.name} requires walking ~35m west along the frontage lawn.`
                            : `You have reached ${locationOptions.find((o) => o.id === toId)?.label}!`
                          : currentStep.title}
                      </h3>

                      {currentStep.notes && !isArrived && (
                        <p className="mt-1 text-[11px] text-[#51465F] font-sans">
                          {currentStep.notes}
                        </p>
                      )}

                      {/* Next Turn Preview */}
                      {nextStep && !isArrived && (
                        <div className="mt-2 flex items-center gap-1 text-[10px] text-[#51465F] font-sans">
                          <span>Then:</span>
                          <span className="font-heading font-bold text-[#352A47] truncate">
                            {nextStep.title}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="border-t border-[#C9B6DF] pt-3 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-heading font-bold text-[#352A47]">
                        {isArrived
                          ? 'All Instructions Viewed'
                          : isAutoNavActive
                            ? `Instruction ${activeStepIndex + 1} of ${route.steps.length} • ~${Math.max(0, navState.remainingDistance).toFixed(0)}m remaining`
                            : `Instruction ${activeStepIndex + 1} of ${route.steps.length}`}
                      </span>
                      <span className="font-sans font-medium text-[#51465F]">
                        {isAutoNavActive
                          ? `${totalRouteDistance > 0 ? Math.min(100, Math.round((navState.currentDistance / totalRouteDistance) * 100)) : 0}% walked`
                          : `${Math.round(((activeStepIndex + 1) / route.steps.length) * 100)}% viewed`}
                      </span>
                    </div>

                    <div className="h-2 w-full rounded-full bg-[#E8DDF2] border border-[#C9B6DF] overflow-hidden">
                      <div
                        className="h-full bg-[#352A47] transition-all duration-300"
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

                    <div className="text-[10px] text-[#51465F] font-sans flex items-center justify-between">
                      <span>
                        {isAutoNavActive
                          ? 'Automatic GPS progression • Step advances automatically as you walk'
                          : 'Step-by-step walkway directions • Physical position is not tracked'}
                      </span>
                      {isAutoNavActive && (
                        <span className="text-[#352A47] font-heading text-[9px] font-bold">
                          AUTO ADVANCE ON
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Step Navigation Controls */}
                  <div className="flex items-center justify-between gap-2.5 border-t border-[#C9B6DF] pt-3">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <button
                        id={isMobile ? 'btn-prev-step-mobile' : 'btn-prev-step'}
                        type="button"
                        disabled={activeStepIndex === 0}
                        onClick={() => setActiveStepIndex((idx) => Math.max(0, idx - 1))}
                        className="flex items-center justify-center gap-1 rounded-2xl border border-[#C9B6DF] bg-[#E8DDF2] px-3.5 py-2.5 text-xs font-heading font-bold text-[#352A47] hover:bg-[#D2BEE7] disabled:opacity-30 transition cursor-pointer shadow-2xs shrink-0"
                      >
                        <ChevronLeft size={14} />
                        <span>Previous</span>
                      </button>

                      <button
                        id={isMobile ? 'btn-next-step-mobile' : 'btn-next-step'}
                        type="button"
                        disabled={activeStepIndex >= route.steps.length - 1}
                        onClick={() => setActiveStepIndex((idx) => Math.min(route.steps.length - 1, idx + 1))}
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-2xl bg-[#352A47] px-4 py-2.5 text-xs font-heading font-bold text-[#FAF6FD] shadow-dream-soft hover:bg-[#433659] disabled:opacity-30 transition cursor-pointer min-w-0"
                      >
                        <span className="truncate">Next Step</span>
                        <ChevronRight size={14} className="shrink-0" />
                      </button>
                    </div>

                    <button
                      id={isMobile ? 'btn-recenter-mobile' : 'btn-recenter'}
                      type="button"
                      onClick={() => {
                        setIsCameraFollowing(true)
                        handleRecenterCamera()
                      }}
                      className="flex items-center justify-center p-2.5 rounded-2xl border border-[#C9B6DF] bg-[#E8DDF2] text-[#352A47] hover:bg-[#D2BEE7] transition cursor-pointer shadow-2xs shrink-0"
                      title={activeUserPosition ? 'Recenter camera on blue dot location' : 'Recenter camera on current step'}
                      aria-label="Recenter camera"
                    >
                      <Crosshair size={15} className="text-[#352A47]" />
                    </button>
                  </div>
                </div>
            )}

            {/* Waypoints Toggle */}
            <button
              id={isMobile ? 'btn-toggle-waypoints-mobile' : 'btn-toggle-waypoints'}
              type="button"
              onClick={() => setShowAllSteps((v) => !v)}
              className="flex w-full items-center justify-between rounded-2xl border border-[#C9B6DF] bg-[#FBF8FD] px-3.5 py-2.5 text-xs font-heading font-bold text-[#352A47] hover:bg-[#E8DDF2] transition-colors shadow-2xs cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Layers size={14} className="text-[#352A47]" />
                <span>Full Waypoints List ({route.steps.length} nodes)</span>
              </span>
              <span className="text-[11px] text-[#352A47] font-bold">
                {showAllSteps ? 'Hide' : 'View'}
              </span>
            </button>

            {/* Expanded Waypoint List */}
            {showAllSteps && (
              <div className="max-h-48 space-y-1.5 overflow-y-auto rounded-2xl border border-[#C9B6DF] bg-[#FBF8FD] p-2 text-xs shadow-dream-soft">
                {route.steps.map((step, idx) => (
                  <div
                    key={`step-${step.nodeId}-${idx}`}
                    onClick={() => {
                      setActiveStepIndex(idx)
                      setIsNavigating(true)
                    }}
                    className={`flex cursor-pointer items-start justify-between rounded-xl p-2 transition-colors ${
                      idx === activeStepIndex && isNavigating
                        ? 'bg-[#D2BEE7] font-heading font-bold text-[#352A47]'
                        : 'hover:bg-[#E8DDF2] text-[#51465F] font-sans'
                    }`}
                  >
                    <div className="truncate pr-2">
                      <span className="text-[#352A47] font-bold mr-1.5">{idx + 1}.</span>
                      <span>{step.title}</span>
                    </div>
                    <span className="text-[10px] text-[#352A47] font-heading uppercase flex-shrink-0 font-bold">
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
            className="rounded-3xl border border-[#D7A894] bg-[#F5E6DF] p-4 text-xs text-[#9E563A] shadow-dream-soft space-y-3"
          >
            <div className="flex items-start gap-2.5">
              <AlertTriangle size={18} className="mt-0.5 text-[#9E563A] flex-shrink-0" />
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-heading font-extrabold text-[#9E563A] text-sm">
                    Directions to this entrance are still being verified.
                  </h2>
                  <span className="rounded-full bg-[#E8C8B9] px-2 py-0.2 text-[9px] font-heading font-bold text-[#9E563A] uppercase border border-[#D7A894]">
                    Provisional POI
                  </span>
                </div>
                <p className="text-[11px] text-[#51465F] font-sans leading-relaxed">
                  {routeCalculation.message}
                </p>
                <div className="text-[10px] text-[#51465F] font-sans pt-0.5">
                  <span className="text-[#9E563A] font-bold">Location:</span> {routeCalculation.poi.locationDescription}
                </div>
              </div>
            </div>

            {/* Verified Nearby Point Action Card */}
            {toId === routeCalculation.poi.id && (
              <div className="rounded-2xl border border-[#D7A894] bg-[#FBF8FD] p-3 space-y-2">
                <div className="text-[11px] font-heading font-bold text-[#352A47] flex items-center gap-1.5">
                  <Footprints size={14} className="text-[#9E563A] shrink-0" />
                  <span>Verified Nearby Point</span>
                </div>
                <p className="text-[10px] text-[#51465F] font-sans leading-snug">
                  Navigate along verified walkways to <strong className="text-[#352A47]">Main Entrance (Gate 1 Approach)</strong>.
                </p>
                <button
                  type="button"
                  id="btn-navigate-approach-gate"
                  data-testid="btn-navigate-approach-gate"
                  onClick={() => setShowApproachRoute(true)}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#352A47] hover:bg-[#433659] px-4 py-2.5 text-xs font-heading font-bold text-[#FAF6FD] shadow-dream-soft transition-all cursor-pointer"
                >
                  <Footprints size={14} />
                  <span>Navigate to Verified Nearby Point (Gate 1 Approach)</span>
                </button>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleBuildingSelect(toId)}
                    className="flex items-center gap-1.5 rounded-xl border border-[#C9B6DF] bg-[#E8DDF2] px-3 py-1.5 text-[11px] font-heading font-bold text-[#352A47] hover:bg-[#D2BEE7] transition cursor-pointer"
                  >
                    <Layers size={12} className="text-[#352A47]" />
                    <span>View on Map</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDestinationSearchQuery('')
                      setIsDestinationSearchFocused(true)
                    }}
                    className="flex items-center gap-1.5 rounded-xl border border-[#C9B6DF] bg-[#E8DDF2] px-3 py-1.5 text-[11px] font-heading font-bold text-[#352A47] hover:bg-[#D2BEE7] transition cursor-pointer"
                  >
                    <Search size={12} className="text-[#352A47]" />
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
            className="rounded-3xl border border-rose-300 bg-rose-50 p-4 text-xs text-rose-800 shadow-dream-soft"
          >
            <div className="flex items-start gap-2.5">
              <AlertTriangle size={18} className="mt-0.5 text-rose-700 flex-shrink-0" />
              <div className="space-y-1">
                <h2 className="font-heading font-bold text-rose-900">Unknown Destination</h2>
                <p className="text-[11px] text-rose-800 font-sans leading-relaxed">
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
            className="rounded-3xl border border-[#D7A894] bg-[#F5E6DF] p-4 text-xs text-[#9E563A] shadow-dream-soft space-y-3"
          >
            <div className="flex items-start gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#E8C8B9] text-[#9E563A] border border-[#D7A894] flex-shrink-0">
                <Footprints size={18} />
              </div>
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-heading font-extrabold text-[#9E563A] text-sm">
                    At Nearest Verified Approach Point
                  </h2>
                  <span className="rounded-full bg-[#E8C8B9] px-2 py-0.5 text-[9px] font-heading font-bold text-[#9E563A] uppercase border border-[#D7A894]">
                    Approach Endpoint
                  </span>
                </div>
                <p className="text-[11px] text-[#51465F] font-sans leading-relaxed">
                  {routeCalculation.message}
                </p>
                <p className="text-[10px] text-[#9E563A] font-sans">
                  Target: <strong className="text-[#352A47]">{targetDestinationName}</strong> • Verified Stop: <strong className="text-[#9E563A]">{routeCalculation.approachDestinationName}</strong>
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[#D7A894]/40">
              <button
                type="button"
                id="btn-preview-facility-3d"
                onClick={() => handleRecenterCamera()}
                className="flex items-center gap-1.5 rounded-2xl bg-[#E8C8B9] hover:bg-[#DEC0B0] border border-[#D7A894] px-3.5 py-2.5 text-xs font-heading font-bold text-[#352A47] shadow-2xs transition-all cursor-pointer"
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
                className="flex items-center gap-1.5 rounded-2xl border border-[#C9B6DF] bg-[#FBF8FD] px-3.5 py-2.5 text-xs font-heading font-bold text-[#352A47] hover:bg-[#E8DDF2] transition cursor-pointer"
              >
                <Search size={13} className="text-[#352A47]" />
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
            <div className="rounded-3xl border border-[#D7A894] bg-[#F5E6DF] p-4 text-xs text-[#9E563A] shadow-dream-soft">
              <div className="flex items-start gap-2.5">
                <AlertTriangle size={18} className="mt-0.5 text-[#9E563A] flex-shrink-0" />
                <div className="space-y-2 w-full">
                  <div>
                    <h2 className="font-heading font-bold text-[#9E563A]">
                      {routeCalculation.status === 'unverified'
                        ? 'Directions to this entrance are still being verified.'
                        : routeCalculation.status === 'same-node'
                          ? 'Identical Start & End'
                          : 'Route Unavailable'}
                    </h2>
                    <p className="text-[11px] text-[#51465F] font-sans leading-relaxed mt-0.5">
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
                        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#352A47] hover:bg-[#433659] px-4 py-2.5 text-xs font-heading font-bold text-[#FAF6FD] shadow-dream-soft transition-all cursor-pointer"
                      >
                        <Footprints size={14} />
                        <span>Navigate to Verified Nearby Point (Main Block Approach)</span>
                      </button>
                    </div>
                  )}

                  {/* Helpful Quick Navigation Actions */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleBuildingSelect(toId)}
                      className="flex items-center gap-1.5 rounded-xl border border-[#C9B6DF] bg-[#FBF8FD] px-3 py-1.5 text-[11px] font-heading font-bold text-[#352A47] hover:bg-[#E8DDF2] transition cursor-pointer"
                    >
                      <Layers size={12} className="text-[#352A47]" />
                      <span>View on Map</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDestinationSearchQuery('')
                        setIsDestinationSearchFocused(true)
                      }}
                      className="flex items-center gap-1.5 rounded-xl border border-[#C9B6DF] bg-[#FBF8FD] px-3 py-1.5 text-[11px] font-heading font-bold text-[#352A47] hover:bg-[#E8DDF2] transition cursor-pointer"
                    >
                      <Search size={12} className="text-[#352A47]" />
                      <span>Choose Another Destination</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
      </div>
    )

    return (
      <div className="flex flex-col gap-3 font-sans">
        {/* On mobile during active navigation: show the Active Turn Card at the top */}
        {isMobile && isNavigating ? (
          <>
            {mainActionBlock}
            {selectorsBlock}
          </>
        ) : (
          <>
            {selectorsBlock}
            {mainActionBlock}
          </>
        )}

      {/* Landmarks Traversed */}
      {landmarksPassed.length > 0 && (
        <div className="border-t border-[#C9B6DF] pt-2.5">
          <div className="text-[11px] font-heading font-bold text-[#352A47]">Landmarks along this path:</div>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {landmarksPassed.map((landmark) => (
              <span
                key={landmark}
                className="rounded-full bg-[#E8DDF2] border border-[#C9B6DF] px-2.5 py-0.5 text-[10px] font-sans font-medium text-[#352A47]"
              >
                {landmark}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* College Wayfinding Footer */}
      <div className="border-t border-[#C9B6DF] pt-2 text-[10px] text-[#51465F] text-center font-sans">
        Misrimal Navajee Munoth Jain Engineering College • Campus Wayfinding
      </div>
    </div>
  )
}

  return (
    <div className="relative min-h-[calc(100vh-4rem)] p-3 md:p-4 overflow-x-hidden bg-[#E8DDF2] text-[#352A47]">
      {/* ============================================================== */}
      {/* DESKTOP LAYOUT (md:flex): 2-Column Map-First Workspace         */}
      {/* ============================================================== */}
      <div className="hidden md:flex h-[calc(100vh-6.5rem)] min-h-[640px] w-full gap-4">
        {/* Left Column: Dedicated Collapsible Route Sidebar */}
        <aside
          className={`flex flex-col h-full bg-[#FBF8FD]/95 backdrop-blur-xl rounded-3xl border border-[#C9B6DF] shadow-dream-card overflow-hidden transition-all duration-300 relative flex-shrink-0 ${
            isSidebarCollapsed ? 'w-14 items-center' : 'w-[360px] xl:w-[380px]'
          }`}
        >
          {/* Collapsed Mini-Sidebar View */}
          {isSidebarCollapsed ? (
            <div className="flex flex-col items-center py-4 gap-4 h-full">
              <button
                type="button"
                onClick={() => setIsSidebarCollapsed(false)}
                className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#E8DDF2] border border-[#C9B6DF] text-[#51465F] hover:bg-[#D2BEE7] hover:text-[#352A47] transition-colors shadow-xs cursor-pointer"
                title="Expand route planner"
                aria-label="Expand route planner"
              >
                <PanelLeftOpen size={18} />
              </button>
              <div className="h-px w-8 bg-[#C9B6DF]" />
              <button
                type="button"
                onClick={handleReset}
                className="flex h-10 w-10 items-center justify-center rounded-2xl text-[#51465F] hover:bg-[#E8DDF2] hover:text-[#352A47] transition-colors cursor-pointer"
                title="Reset route"
                aria-label="Reset route"
              >
                <RotateCcw size={16} />
              </button>
              <button
                type="button"
                onClick={handleSwap}
                className="flex h-10 w-10 items-center justify-center rounded-2xl text-[#51465F] hover:bg-[#E8DDF2] hover:text-[#352A47] transition-colors cursor-pointer"
                title="Swap origin and destination"
                aria-label="Swap origin and destination"
              >
                <ArrowLeftRight size={16} />
              </button>
              <div className="mt-auto flex flex-col items-center pb-2">
                <span
                  className="h-2.5 w-2.5 rounded-full bg-[#352A47] animate-pulse shadow-xs"
                  title="Campus Navigator Active"
                />
              </div>
            </div>
          ) : (
            /* Expanded Full Sidebar */
            <div className="flex flex-col h-full p-4 overflow-y-auto">
              {/* Header: Title, Reset and Collapse Toggle */}
              <div className="flex items-center justify-between border-b border-[#C9B6DF] pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#E8C8B9] text-[#352A47] border border-[#D9B4A3] shadow-xs">
                    <Navigation size={16} />
                  </div>
                  <div>
                    <h1 className="font-heading font-extrabold text-sm text-[#352A47] leading-tight">Campus Navigator</h1>
                    <p className="font-sans text-[10px] text-[#51465F] truncate max-w-[190px]">MNMJEC Campus Model</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="flex h-8 items-center gap-1 rounded-xl border border-[#C9B6DF] bg-[#E8DDF2] px-2.5 text-xs font-heading font-bold text-[#352A47] hover:bg-[#D2BEE7] transition-colors shadow-xs cursor-pointer"
                    title="Reset route to default"
                  >
                    <RotateCcw size={12} />
                    <span>Reset</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsSidebarCollapsed(true)}
                    className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#C9B6DF] bg-[#E8DDF2] text-[#51465F] hover:bg-[#D2BEE7] hover:text-[#352A47] transition-colors shadow-xs cursor-pointer"
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
        <main className="flex-1 min-w-0 h-full relative rounded-3xl border border-[#C9B6DF] bg-[#DFD0EF] overflow-hidden shadow-dream-card">
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
            <div className="pointer-events-auto rounded-full bg-[#FBF8FD]/90 border border-[#C9B6DF] px-3.5 py-1.5 text-[11px] font-sans font-medium text-[#51465F] shadow-sm backdrop-blur-md">
              Click any building to set destination • 1-finger pan • 2-finger twist
            </div>
          </div>
        </main>
      </div>

      {/* ============================================================== */}
      {/* MOBILE LAYOUT (< md): Large Viewport + Collapsible Bottom Sheet */}
      {/* ============================================================== */}
      <div className="flex md:hidden flex-col h-[calc(100dvh-10.5rem)] min-h-[460px] w-full relative rounded-3xl border border-[#C9B6DF] bg-[#DFD0EF] overflow-hidden shadow-dream-card">
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
          className={`absolute inset-x-0 bottom-0 z-30 flex flex-col rounded-t-3xl bg-[#FBF8FD] shadow-[0_-12px_36px_rgba(53,42,71,0.15)] border-t border-x border-[#C9B6DF] transition-all duration-300 text-[#352A47] ${
            mobileSheetState === 'collapsed'
              ? 'h-[82px]'
              : mobileSheetState === 'half'
                ? 'h-[44%] min-h-[300px] max-h-[400px]'
                : 'h-[90%]'
          }`}
        >
          {/* Solid Header with Drag Handle */}
          <div
            onClick={(e) => {
              if ((e.target as HTMLElement).tagName !== 'BUTTON' && !(e.target as HTMLElement).closest('button')) {
                setMobileSheetState((s) => (s === 'collapsed' ? 'half' : 'collapsed'))
              }
            }}
            className="flex flex-col bg-[#FBF8FD] border-b border-[#C9B6DF] px-4 pt-1.5 pb-2.5 flex-shrink-0 cursor-pointer select-none rounded-t-3xl"
          >
            {/* Centered Drag Handle with Accessible 44px Touch Envelope */}
            <div className="flex justify-center w-full">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setMobileSheetState((s) => (s === 'collapsed' ? 'half' : s === 'half' ? 'expanded' : 'collapsed'))
                }}
                className="touch-target py-2 px-6 focus:outline-none"
                aria-label="Toggle navigation drawer height"
              >
                <span className="h-1.5 w-12 rounded-full bg-[#C9B6DF] hover:bg-[#9E86B8] transition-colors cursor-grab active:cursor-grabbing block" />
              </button>
            </div>

            {/* Header Content Row */}
            {mobileSheetState === 'collapsed' ? (
              <div className="flex w-full items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl shadow-xs border ${
                      isNavigating
                        ? isArrived
                          ? 'bg-[#BCD8C9] text-[#1B382B] border-[#A2C9B3]'
                          : 'bg-[#E8C8B9] text-[#352A47] border-[#D9B4A3]'
                        : 'bg-[#E8C8B9] text-[#352A47] border-[#D9B4A3]'
                    }`}
                  >
                    {isNavigating ? (
                      isArrived ? (
                        <CheckCircle2 size={18} />
                      ) : currentStep?.title.toLowerCase().includes('right') ? (
                        <CornerUpRight size={18} />
                      ) : currentStep?.title.toLowerCase().includes('left') ? (
                        <CornerUpLeft size={18} />
                      ) : activeStepIndex === 0 ? (
                        <Compass size={18} />
                      ) : (
                        <ArrowUp size={18} />
                      )
                    ) : (
                      <Navigation size={18} />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 text-left">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-heading font-bold text-[#7A4465] uppercase tracking-wider">
                        {isNavigating
                          ? isArrived
                            ? 'Arrived'
                            : `Step ${activeStepIndex + 1} of ${route?.steps.length}`
                          : routeCalculation.status === 'ok'
                            ? `Route Ready • ~${totalRouteDistance.toFixed(0)}m`
                            : 'Campus Navigator'}
                      </span>
                    </div>
                    <div className="text-xs font-heading font-bold text-[#352A47] truncate leading-tight">
                      {isNavigating
                        ? isArrived
                          ? 'Destination Arrived'
                          : currentStep?.title ?? 'Following Walkway'
                        : routeCalculation.status === 'ok'
                          ? `To ${targetDestinationName}`
                          : 'Select Destination'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {isNavigating ? (
                    <>
                      <button
                        type="button"
                        disabled={activeStepIndex === 0}
                        onClick={(e) => {
                          e.stopPropagation()
                          setActiveStepIndex((idx) => Math.max(0, idx - 1))
                        }}
                        className="flex h-9 w-9 min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-[#C9B6DF] bg-[#E8DDF2] text-[#352A47] hover:bg-[#D2BEE7] disabled:opacity-30 shadow-xs transition"
                        title="Previous step"
                        aria-label="Previous step"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <button
                        type="button"
                        disabled={!route || activeStepIndex >= route.steps.length - 1}
                        onClick={(e) => {
                          e.stopPropagation()
                          setActiveStepIndex((idx) => (route ? Math.min(route.steps.length - 1, idx + 1) : idx))
                        }}
                        className="flex h-9 w-9 min-h-[44px] min-w-[44px] items-center justify-center rounded-xl bg-[#352A47] text-white hover:bg-[#231B30] disabled:opacity-30 shadow-xs transition"
                        title="Next step"
                        aria-label="Next step"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleReset()
                      }}
                      className="flex h-9 w-9 min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-[#C9B6DF] bg-[#E8DDF2] text-[#352A47] hover:bg-[#D2BEE7] shadow-xs transition"
                      title="Reset"
                      aria-label="Reset route"
                    >
                      <RotateCcw size={14} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setMobileSheetState('half')
                    }}
                    className="flex h-9 w-9 min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-[#C9B6DF] bg-[#E8DDF2] text-[#352A47] hover:bg-[#D2BEE7] shadow-xs transition"
                    title="Expand details"
                    aria-label="Expand details"
                  >
                    <ChevronUp size={16} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex w-full items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#E8C8B9] text-[#352A47] border border-[#D9B4A3] shadow-xs">
                    <Navigation size={18} />
                  </div>
                  <div className="text-left min-w-0">
                    <h2 className="text-sm font-heading font-extrabold text-[#352A47] leading-tight truncate">Campus Navigator</h2>
                    <p className="text-[11px] font-sans text-[#51465F] truncate">
                      {routeCalculation.status === 'ok'
                        ? isNavigating
                          ? `Instruction ${activeStepIndex + 1} of ${route?.steps.length} • ~${totalRouteDistance.toFixed(0)}m`
                          : `Route ready • ~${totalRouteDistance.toFixed(0)}m (~${estimatedWalkingMinutes} min walk)`
                        : 'MNMJEC Chennai • Authentic Walkways'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleReset()
                    }}
                    className="flex h-9 w-9 min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-[#C9B6DF] bg-[#E8DDF2] text-[#352A47] hover:bg-[#D2BEE7] shadow-xs transition"
                    title="Reset route"
                    aria-label="Reset route"
                  >
                    <RotateCcw size={14} />
                  </button>
                  {mobileSheetState === 'half' ? (
                    <>
                      <button
                        type="button"
                        id="btn-sheet-collapse"
                        data-testid="btn-sheet-collapse"
                        onClick={(e) => {
                          e.stopPropagation()
                          setMobileSheetState('collapsed')
                        }}
                        className="flex h-9 w-9 min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-[#C9B6DF] bg-[#E8DDF2] text-[#352A47] hover:bg-[#D2BEE7] shadow-xs transition"
                        title="Collapse sheet"
                        aria-label="Collapse sheet"
                      >
                        <ChevronDown size={16} />
                      </button>
                      <button
                        type="button"
                        id="btn-sheet-expand"
                        data-testid="btn-sheet-expand"
                        onClick={(e) => {
                          e.stopPropagation()
                          setMobileSheetState('expanded')
                        }}
                        className="flex h-9 w-9 min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-[#C9B6DF] bg-[#E8DDF2] text-[#352A47] hover:bg-[#D2BEE7] shadow-xs transition"
                        title="Maximize sheet"
                        aria-label="Maximize sheet"
                      >
                        <ChevronUp size={16} />
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      id="btn-sheet-minimize"
                      data-testid="btn-sheet-minimize"
                      onClick={(e) => {
                        e.stopPropagation()
                        setMobileSheetState('half')
                      }}
                      className="flex h-9 w-9 min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-[#C9B6DF] bg-[#E8DDF2] text-[#352A47] hover:bg-[#D2BEE7] shadow-xs transition"
                      title="Minimize sheet"
                      aria-label="Minimize sheet"
                    >
                      <ChevronDown size={16} />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Sheet Body (Hidden when collapsed) */}
          {mobileSheetState !== 'collapsed' && (
            <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-3 pb-[calc(5rem+env(safe-area-inset-bottom,0px))] bg-[#FBF8FD] space-y-3">
              {renderPlanningControls(true)}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
