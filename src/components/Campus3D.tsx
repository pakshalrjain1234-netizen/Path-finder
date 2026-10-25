import { Html, Line, OrbitControls, useGLTF } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import type { ThreeEvent } from '@react-three/fiber'
import {
  AlertCircle,
  BookOpen,
  Box,
  Building2,
  Compass as CompassIcon,
  Focus,
  GraduationCap,
  HeartPulse,
  Loader2,
  MapPin,
  Maximize2,
  Navigation,
  Printer,
  RefreshCcw,
  Target,
  Utensils,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import { Component, Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Mesh, Object3D } from 'three'
import { ACESFilmicToneMapping, Box3, Color, Matrix4, PCFSoftShadowMap, PerspectiveCamera, Vector3 } from 'three'
import type { CampusIssueReport } from '../types/issues'
import { buildings } from '../data/buildings'
import { CAMPUS_SERVICE_POIS } from '../data/campusPois'
import type { CampusTourStop } from '../data/campusTourStops'
import {
  CAMPUS_MODEL_CONFIG,
  campusModelMapById,
  resolveCampusBuilding,
  type CampusBuildingId,
  type CampusModelMappingEntry,
  type FloorKey,
} from '../data/campusModelMapping'
import {
  CAMPUS_LANDMARKS,
  type CampusLandmark,
  type LabelVisibilityMode,
  calculateZoomTierWithHysteresis,
  isLandmarkVisible,
} from '../data/campusLandmarks'
export { CAMPUS_LANDMARKS, type CampusLandmark, type LabelVisibilityMode }
import type { Point3 } from '../types/navigation'

const MODEL_PATH = CAMPUS_MODEL_CONFIG.activeModelPath
// Load within Suspense so readiness reflects the actual scene.

type CameraPreset = 'framed' | 'top-down' | 'isometric' | 'welcome-showcase'

export interface Campus3DProps {
  selectedBuildingId?: string
  selectedFloor?: string
  routePoints?: Point3[]
  activeStepPoint?: Point3 | null
  simulatedPosition?: Point3 | null
  simulatedAccuracyRadius?: number | null
  completedPoints?: Point3[]
  remainingPoints?: Point3[]
  isSimulating?: boolean
  userLocationPoint?: Point3 | null
  userLocationAccuracyRadius?: number | null
  userLocationIsSimulated?: boolean
  userLocationLabel?: string
  viewTarget?: 'campus' | 'route' | 'location'
  preset?: CameraPreset
  isWelcomeShowcase?: boolean
  showHud?: boolean
  showInstructionBadge?: boolean
  className?: string
  labelVisibilityMode?: LabelVisibilityMode
  categoryFilter?: string
  onLabelVisibilityModeChange?: (mode: LabelVisibilityMode) => void
  onBuildingSelect?: (buildingId: string) => void
  onSelectionChange?: (buildingId: string | null) => void
  onModelReady?: (availableBuildings: CampusBuildingId[]) => void
  onResetView?: () => void
  isTourActive?: boolean
  activeTourStop?: CampusTourStop | null
  onTourCameraArrived?: (stopId: string) => void
  suppressLabels?: boolean
  isPlacingIssue?: boolean
  issuePlacementPoint?: Point3 | null
  onLocationPick?: (point: Point3, nearestBuildingId?: string) => void
  showIssuePins?: boolean
  issueReports?: CampusIssueReport[]
  selectedIssueId?: string
  onIssueSelect?: (issue: CampusIssueReport) => void
  isApproachRoute?: boolean
  approachDestinationName?: string | null
  originName?: string | null
  targetDestinationPoint?: Point3 | null
  targetDestinationName?: string | null
}

interface ErrorBoundaryProps {
  onError: (error: Error) => void
  children: ReactNode
}

interface ModelFrame {
  box?: Box3
  center: Vector3
  radius: number
  framedPosition: [number, number, number]
  topDownPosition: [number, number, number]
  isometricPosition: [number, number, number]
}

const DEFAULT_FRAME: ModelFrame = {
  center: new Vector3(0, 0, 0),
  radius: 30,
  framedPosition: [24, 16, 24],
  topDownPosition: [0, 80, 0.01],
  isometricPosition: [40, 28, 40],
}

function buildFrameFromPoints(points: Point3[]): ModelFrame | null {
  if (points.length === 0) return null

  const vectors = points.map(([x, y, z]) => new Vector3(x, y, z))
  const box = new Box3().setFromPoints(vectors)
  if (box.isEmpty()) return null

  const center = box.getCenter(new Vector3())
  const size = box.getSize(new Vector3())
  const radius = Math.max(size.length() / 2, 8)

  return {
    box,
    center,
    radius,
    framedPosition: [center.x + radius * 1.5, center.y + radius * 0.9, center.z + radius * 1.5],
    topDownPosition: [center.x, center.y + radius * 2.5, center.z + 0.01],
    isometricPosition: [center.x + radius * 1.35, center.y + radius * 1.05, center.z + radius * 1.35],
  }
}

function buildFrameFromPoint(point: Point3, radius = 24): ModelFrame {
  const center = new Vector3(point[0], point[1], point[2])
  const box = new Box3(
    new Vector3(point[0] - radius, point[1] - 4, point[2] - radius),
    new Vector3(point[0] + radius, point[1] + 16, point[2] + radius),
  )
  return {
    box,
    center,
    radius,
    framedPosition: [center.x + radius * 1.2, center.y + Math.max(radius * 0.9, 8), center.z + radius * 1.2],
    topDownPosition: [center.x, center.y + radius * 2.2, center.z + 0.01],
    isometricPosition: [center.x + radius * 1.1, center.y + Math.max(radius * 0.9, 8), center.z + radius * 1.1],
  }
}


function buildFrameFromBuilding(scene: Object3D, buildingId: string): ModelFrame | null {
  // Task 2: Shared area overview for Apollo Shine and Xerox Shop showing both facilities and Gate 1 frontage
  if (buildingId === 'apollo-shine' || buildingId === 'xerox-shop') {
    const center = new Vector3(152.0, 3.5, -18.0)
    const radius = 45
    const box = new Box3(new Vector3(120.0, -2.0, -42.0), new Vector3(192.0, 18.0, 14.0))
    return {
      box,
      center,
      radius,
      framedPosition: [196.0, 36.0, 24.0],
      topDownPosition: [152.0, 95.0, -17.99],
      isometricPosition: [194.0, 38.0, 26.0],
    }
  }

  // Task 2: Dedicated framing for Dr. C. L. Mehta Central Library with Main Block and pedestrian courtyard
  if (buildingId === 'library') {
    const center = new Vector3(193.5, 5.0, -64.0)
    const radius = 48
    const box = new Box3(new Vector3(162.0, -2.0, -94.0), new Vector3(228.0, 20.0, -34.0))
    return {
      box,
      center,
      radius,
      framedPosition: [240.0, 42.0, -18.0],
      topDownPosition: [193.5, 105.0, -63.99],
      isometricPosition: [238.0, 44.0, -16.0],
    }
  }

  const entry = campusModelMapById[buildingId as CampusBuildingId]
  if (!entry) {
    const landmark = CAMPUS_LANDMARKS.find((lm) => lm.id === buildingId)
    if (landmark) {
      return buildFrameFromPoint(landmark.fallbackPosition, 32)
    }
    return null
  }

  const activeNames = entry ? new Set<string>([...entry.objectNames, ...(entry.interactionObjects ?? [])]) : new Set<string>()
  const box = new Box3()
  let hasObjects = false

  scene.traverse((object) => {
    if (!('isMesh' in object) || !object.isMesh) return
    const mesh = object as Mesh
    const mapped = resolveCampusBuilding(mesh.name)
    if (mapped === buildingId || activeNames.has(mesh.name)) {
      mesh.updateWorldMatrix(true, false)
      box.expandByObject(mesh)
      hasObjects = true
    }
  })

  if (!hasObjects || box.isEmpty()) {
    const landmark = CAMPUS_LANDMARKS.find((lm) => lm.id === buildingId)
    if (landmark) {
      return buildFrameFromPoint(landmark.fallbackPosition, 32)
    }
    return null
  }

  const center = box.getCenter(new Vector3())
  const size = box.getSize(new Vector3())
  // Minimum radius of 30 ensures full structure + surrounding roads & landmarks are visible without roof-only close-ups
  const radius = Math.max(size.length() / 2, 30)

  // Expand box symmetrically around the center to include surrounding roads and avoid rooftop domination
  box.expandByPoint(new Vector3(center.x - radius * 0.85, center.y - 4, center.z - radius * 0.85))
  box.expandByPoint(new Vector3(center.x + radius * 0.85, center.y + 16, center.z + radius * 0.85))

  return {
    box,
    center,
    radius,
    framedPosition: [center.x + radius * 1.35, center.y + Math.max(radius * 0.95, 16), center.z + radius * 1.35],
    topDownPosition: [center.x, center.y + radius * 2.5, center.z + 0.01],
    isometricPosition: [center.x + radius * 1.25, center.y + Math.max(radius * 0.95, 16), center.z + radius * 1.25],
  }
}

function toFloorKey(value?: string): FloorKey | undefined {
  if (!value) return undefined
  const normalized = value.trim().toUpperCase()
  if (normalized === 'GROUND' || normalized === 'G') return 'G'
  if (normalized === 'ELEVATED' || normalized === 'ELEVATED LEVEL') return 'elevated'
  if (normalized === '1' || normalized === '2' || normalized === '3') return normalized as FloorKey
  return undefined
}

function resolveBuildingIdFromObject(object: Object3D | null): CampusBuildingId | null {
  let current: Object3D | null = object
  while (current) {
    const mapped = resolveCampusBuilding(current.name)
    if (mapped) return mapped
    current = current.parent
  }
  return null
}

function getBuildingEntry(buildingId?: string | null): CampusModelMappingEntry | null {
  if (!buildingId) return null
  return campusModelMapById[buildingId as CampusBuildingId] ?? null
}

function buildFrame(scene: Object3D): ModelFrame {
  scene.updateWorldMatrix(true, true)
  const box = new Box3().setFromObject(scene)
  if (box.isEmpty()) return DEFAULT_FRAME

  const center = box.getCenter(new Vector3())
  const size = box.getSize(new Vector3())
  const radius = size.length() / 2 || 30

  return {
    box,
    center,
    radius,
    framedPosition: [center.x + radius * 1.5, center.y + radius * 0.9, center.z + radius * 1.5],
    topDownPosition: [center.x, center.y + radius * 2.5, center.z + 0.01],
    isometricPosition: [center.x + radius * 1.35, center.y + radius * 1.1, center.z + radius * 1.35],
  }
}

function buildWelcomeShowcaseFrame(): ModelFrame {
  // Focus on the central academic quad: Main Block, First Year Block, Civil Block, IT Block and central walkways
  const center = new Vector3(155, 6, -65)
  const radius = 68
  const box = new Box3(
    new Vector3(center.x - radius, 0, center.z - radius),
    new Vector3(center.x + radius, 28, center.z + radius)
  )

  return {
    box,
    center,
    radius,
    framedPosition: [center.x + 92, 54, center.z + 92],
    topDownPosition: [center.x, 135, center.z + 0.01],
    isometricPosition: [center.x + 90, 54, center.z + 90],
  }
}

class ModelErrorBoundary extends Component<ErrorBoundaryProps, { error: Error | null }> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error) {
    this.props.onError(error)
  }

  render() {
    if (this.state.error) {
      return null
    }
    return this.props.children
  }
}

function LoadingState() {
  return (
    <div className="flex h-full min-h-[420px] items-center justify-center rounded-2xl border border-white/10 bg-[#0B1220]/90 px-6 text-center backdrop-blur-xl">
      <div>
        <Loader2 className="mx-auto animate-spin text-cyan-400" size={28} />
        <h3 className="mt-3 text-base font-semibold text-white">Loading MNMJEC 3D Campus</h3>
        <p className="mt-1 text-sm text-slate-400">Preparing architectural geometry and interactive controls...</p>
      </div>
    </div>
  )
}

function ErrorState({ error, onRetry }: { error: Error | null; onRetry?: () => void }) {
  return (
    <div className="flex h-full min-h-[380px] md:min-h-[420px] items-center justify-center rounded-2xl border border-rose-500/30 bg-[#0B1220]/95 px-6 py-8 text-center backdrop-blur-xl">
      <div className="max-w-md">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 mb-3.5 shadow-lg shadow-rose-950/40">
          <AlertCircle size={28} />
        </div>
        <h3 className="text-base font-bold text-white">Unable to load the 3D campus model</h3>
        <p className="mt-1.5 text-xs text-slate-300 leading-relaxed">
          {error?.message?.includes('fetch')
            ? 'The browser network request for the 3D campus architecture model timed out or was interrupted. Check your connection and click retry.'
            : error
              ? error.message
              : 'The campus GLB file could not be parsed. Verify the connection and try again.'}
        </p>
        <div className="mt-4 flex flex-col sm:flex-row items-center justify-center gap-2.5">
          {onRetry && (
            <button
              type="button"
              id="btn-retry-model-load"
              onClick={onRetry}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-cyan-600/30 hover:from-cyan-500 hover:to-blue-500 transition cursor-pointer"
            >
              <RefreshCcw size={14} />
              <span>Retry Loading Model</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-semibold text-slate-300 hover:bg-white/10 hover:text-white transition cursor-pointer"
          >
            <span>Reload Page</span>
          </button>
        </div>
      </div>
    </div>
  )
}

function Hud({
  selectedBuildingId,
  selectedFloor,
  routePoints,
}: {
  selectedBuildingId?: string
  selectedFloor?: string
  routePoints?: Point3[]
}) {
  const entry = getBuildingEntry(selectedBuildingId)
  const buildingLabel = selectedBuildingId
    ? buildings.find((item) => item.id === selectedBuildingId)?.name ?? entry?.displayName ?? 'Campus selection'
    : routePoints && routePoints.length > 0
      ? 'Active Transit Route'
      : 'Campus overview'
  const floorCount = entry ? Object.keys(entry.floorObjects).length : 0
  const indoorAvailable = entry?.indoorAvailable ?? false
  const key = toFloorKey(selectedFloor)
  const floorLabel = entry && key && entry.floorObjects[key] ? ` • Floor ${selectedFloor}` : ''

  return (
    <div className="pointer-events-none absolute left-3 top-3 z-20 max-w-[calc(100%-8rem)] rounded-2xl border border-white/10 bg-[#0B1220]/90 p-3.5 shadow-2xl backdrop-blur-xl md:left-4 md:top-4">
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-950/80 px-2 py-0.5 text-[10px] font-extrabold tracking-wider uppercase text-cyan-300 border border-cyan-500/30">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
          3D Interactive
        </span>
        <span className="text-[11px] font-medium text-slate-400">
          {routePoints && routePoints.length > 0 ? `Route active (${routePoints.length} waypoints)` : 'MNMJEC Campus'}
        </span>
      </div>
      <div className="mt-1.5 text-sm font-bold text-white tracking-tight">{buildingLabel}</div>
      <div className="mt-0.5 text-[11px] font-medium text-slate-400">
        {floorCount > 0
          ? `${floorCount} known floor(s)`
          : entry?.knownFloorLabel ?? (routePoints && routePoints.length > 0 ? 'Outdoor Walkway Navigation' : 'Tap any building to inspect details')}
        {floorLabel}
        {indoorAvailable ? '' : ' • Ground access'}
      </div>
    </div>
  )
}

function useMaterialDefaults(scene: Object3D) {
  const originals = useRef<Map<string, { color?: string; emissive?: string; emissiveIntensity?: number; opacity?: number; transparent?: boolean }>>(new Map())

  const capture = useCallback((material: any) => {
    if (!material || !material.uuid || originals.current.has(material.uuid)) return
    originals.current.set(material.uuid, {
      color: 'color' in material ? `#${material.color.getHexString()}` : undefined,
      emissive: 'emissive' in material ? `#${material.emissive.getHexString()}` : undefined,
      emissiveIntensity: 'emissiveIntensity' in material ? material.emissiveIntensity : undefined,
      opacity: 'opacity' in material ? material.opacity : undefined,
      transparent: 'transparent' in material ? material.transparent : undefined,
    })
  }, [])

  const restore = useCallback(() => {
    scene.traverse((object) => {
      if (!('isMesh' in object) || !object.isMesh) return
      const mesh = object as Mesh
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      materials.forEach((material) => {
        if (!material || !material.uuid) return
        const original = originals.current.get(material.uuid)
        if (!original) return
        if ('color' in material && original.color) (material as any).color.set(original.color)
        if ('emissive' in material && original.emissive) {
          ;(material as any).emissive = new Color(original.emissive)
          ;(material as any).emissiveIntensity = original.emissiveIntensity ?? 0
        }
        if ('opacity' in material && typeof original.opacity === 'number') (material as any).opacity = original.opacity
        if ('transparent' in material && typeof original.transparent === 'boolean') (material as any).transparent = original.transparent
      })
    })
  }, [scene])

  return { capture, restore }
}

function RouteOverlay({
  points,
  activeStepPoint,
  simulatedPosition,
  simulatedAccuracyRadius,
  completedPoints,
  remainingPoints,
  isSimulating,
  isApproachRoute = false,
  approachDestinationName,
  originName,
  targetDestinationPoint,
  targetDestinationName,
}: {
  points: Point3[]
  activeStepPoint?: Point3 | null
  simulatedPosition?: Point3 | null
  simulatedAccuracyRadius?: number | null
  completedPoints?: Point3[]
  remainingPoints?: Point3[]
  isSimulating?: boolean
  isApproachRoute?: boolean
  approachDestinationName?: string | null
  originName?: string | null
  targetDestinationPoint?: Point3 | null
  targetDestinationName?: string | null
}) {
  const elevatedAllPoints = useMemo(
    () => points.map(([x, y, z]) => [x, y + 0.25, z] as [number, number, number]),
    [points],
  )
  const elevatedCompleted = useMemo(
    () =>
      completedPoints && completedPoints.length >= 2
        ? completedPoints.map(([x, y, z]) => [x, y + 0.24, z] as [number, number, number])
        : null,
    [completedPoints],
  )
  const elevatedRemaining = useMemo(
    () =>
      remainingPoints && remainingPoints.length >= 2
        ? remainingPoints.map(([x, y, z]) => [x, y + 0.25, z] as [number, number, number])
        : null,
    [remainingPoints],
  )

  const start = points[0]
  const destination = points[points.length - 1]

  return (
    <group name="route-overlay">
      {/* Active walking route polyline: Sky blue (#38BDF8), Traversed: Slate (#475569) */}
      {isSimulating && elevatedCompleted && (
        <Line points={elevatedCompleted} color="#475569" lineWidth={5} opacity={0.45} transparent />
      )}
      {isSimulating && elevatedRemaining ? (
        <Line points={elevatedRemaining} color="#38BDF8" lineWidth={7} />
      ) : (
        <Line points={elevatedAllPoints} color="#38BDF8" lineWidth={7} />
      )}

      {/* ORIGIN X: Emerald Green (#34D399) with ground ring and HTML marker */}
      {start && (
        <group position={[start[0], start[1], start[2]]} name="route-origin-marker">
          <mesh position={[0, 0.45, 0]}>
            <sphereGeometry args={[0.85, 20, 20]} />
            <meshStandardMaterial color="#059669" emissive="#34D399" emissiveIntensity={1.25} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.18, 0]}>
            <ringGeometry args={[0.7, 1.4, 32]} />
            <meshBasicMaterial color="#34D399" opacity={0.65} transparent side={2} depthWrite={false} />
          </mesh>
          <Html position={[0, 1.6, 0]} center zIndexRange={[35, 0]}>
            <div className="flex items-center gap-1.5 rounded-full border border-emerald-400 bg-[#064E3B]/95 px-2.5 py-1 text-[11px] font-bold text-[#A7F3D0] shadow-xl backdrop-blur-md pointer-events-none select-none whitespace-nowrap">
              <span className="h-2 w-2 rounded-full bg-[#34D399] ring-2 ring-emerald-300" />
              <span>Start: {originName ?? 'Origin'}</span>
            </div>
          </Html>
        </group>
      )}

      {/* Intermediate waypoints */}
      {points.slice(1, -1).map(([x, y, z], index) => (
        <mesh key={`waypoint-${index}`} position={[x, y + 0.35, z]}>
          <sphereGeometry args={[0.28, 12, 12]} />
          <meshStandardMaterial color="#0284C7" emissive="#38BDF8" emissiveIntensity={0.6} opacity={0.85} transparent />
        </mesh>
      ))}

      {/* ENDPOINT MARKER: Verified Nearby Endpoint (Amber #FBBF24) OR Direct Destination (Violet #A78BFA) */}
      {destination && (
        <group position={[destination[0], destination[1], destination[2]]} name={targetDestinationName ? `route-dest-${targetDestinationName}` : 'route-destination-marker'}>
          {isApproachRoute ? (
            /* VERIFIED NEARBY ROUTE ENDPOINT: Warm amber (#FBBF24) with clear "Walking Route Ends Here" indicator */
            <>
              <mesh position={[0, 0.55, 0]}>
                <sphereGeometry args={[1.05, 20, 20]} />
                <meshStandardMaterial color="#D97706" emissive="#FBBF24" emissiveIntensity={1.3} />
              </mesh>
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.18, 0]}>
                <ringGeometry args={[0.9, 1.6, 32]} />
                <meshBasicMaterial color="#FBBF24" opacity={0.75} transparent side={2} depthWrite={false} />
              </mesh>
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.17, 0]}>
                <ringGeometry args={[0, 0.9, 32]} />
                <meshBasicMaterial color="#B45309" opacity={0.18} transparent side={2} depthWrite={false} />
              </mesh>
              <Html position={[0, 1.9, 0]} center zIndexRange={[45, 0]}>
                <div className="flex flex-col items-center pointer-events-none select-none -translate-y-3">
                  <div className="flex items-center gap-1.5 rounded-full border-2 border-[#FBBF24] bg-[#451A03]/95 px-3 py-1.5 text-xs font-bold text-[#FEF3C7] shadow-2xl backdrop-blur-md whitespace-nowrap">
                    <span className="h-2 w-2 rounded-full bg-[#FBBF24] animate-pulse" />
                    <span>Walking Route Ends Here</span>
                  </div>
                  <span className="text-[10px] font-semibold text-[#FBBF24] bg-[#0F172A]/90 px-2 py-0.5 rounded-full mt-1 border border-[#FBBF24]/40 shadow-md">
                    {approachDestinationName ?? 'Verified Nearby Approach'}
                  </span>
                </div>
              </Html>
            </>
          ) : (
            /* DESTINATION Y: Bright elegant violet (#A78BFA) with understated halo */
            <>
              <mesh position={[0, 0.6, 0]}>
                <sphereGeometry args={[1.1, 20, 20]} />
                <meshStandardMaterial color="#7C3AED" emissive="#A78BFA" emissiveIntensity={1.3} />
              </mesh>
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.18, 0]}>
                <ringGeometry args={[0.9, 1.6, 32]} />
                <meshBasicMaterial color="#A78BFA" opacity={0.7} transparent side={2} depthWrite={false} />
              </mesh>
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.17, 0]}>
                <ringGeometry args={[0, 2.6, 32]} />
                <meshBasicMaterial color="#A78BFA" opacity={0.12} transparent side={2} depthWrite={false} />
              </mesh>
              {/* 3D Violet Arrival Pin & Concentric Ripple Rings at Ground Walkway */}
              {/* Note: HTML text badge omitted here to prevent duplicate badge overlap with the building roof landmark pill */}
            </>
          )}
        </group>
      )}

      {/* UNVERIFIED FINAL CONNECTION: Non-directional dashed visual relationship (not solid route) */}
      {isApproachRoute && destination && targetDestinationPoint && (
        <group name="unverified-final-segment">
          <Line
            points={[
              [destination[0], destination[1] + 0.35, destination[2]],
              [targetDestinationPoint[0], targetDestinationPoint[1] + 0.35, targetDestinationPoint[2]],
            ]}
            color="#FBBF24"
            dashed
            dashScale={1.5}
            dashSize={1.2}
            gapSize={1.2}
            lineWidth={2.5}
            opacity={0.65}
            transparent
          />
          <Html
            position={[
              (destination[0] + targetDestinationPoint[0]) / 2,
              (destination[1] + targetDestinationPoint[1]) / 2 + 1.2,
              (destination[2] + targetDestinationPoint[2]) / 2,
            ]}
            center
            zIndexRange={[30, 0]}
          >
            <div className="pointer-events-none select-none rounded-full border border-amber-400/50 bg-[#1E1B4B]/95 px-2 py-0.5 text-[9px] font-semibold text-amber-200 shadow-lg backdrop-blur-md whitespace-nowrap">
              Remaining access unverified
            </div>
          </Html>
        </group>
      )}

      {/* Blue location dot for simulation / live navigation mode */}
      {isSimulating && simulatedPosition && (
        <group position={[simulatedPosition[0], simulatedPosition[1] + 0.55, simulatedPosition[2]]}>
          {simulatedAccuracyRadius && simulatedAccuracyRadius > 0 && (
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.45, 0]}>
              <ringGeometry args={[0, Math.max(simulatedAccuracyRadius, 1.2), 32]} />
              <meshBasicMaterial color="#38BDF8" opacity={0.18} transparent side={2} depthWrite={false} />
            </mesh>
          )}
          <mesh>
            <sphereGeometry args={[0.75, 20, 20]} />
            <meshStandardMaterial color="#2563EB" emissive="#60A5FA" emissiveIntensity={1} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.15, 0]}>
            <ringGeometry args={[0.9, 1.4, 32]} />
            <meshBasicMaterial color="#22D3EE" opacity={0.85} transparent side={2} />
          </mesh>
        </group>
      )}

      {/* Active step waypoint in manual guidance */}
      {!isSimulating && activeStepPoint && (
        <group position={[activeStepPoint[0], activeStepPoint[1] + 0.55, activeStepPoint[2]]}>
          <mesh>
            <sphereGeometry args={[0.65, 16, 16]} />
            <meshStandardMaterial color="#2A9D8F" emissive="#8CF5E4" emissiveIntensity={0.9} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.2, 0]}>
            <ringGeometry args={[0.9, 1.3, 24]} />
            <meshBasicMaterial color="#2A9D8F" opacity={0.7} transparent side={2} />
          </mesh>
        </group>
      )}
    </group>
  )
}

function UserLocationMarker({
  position,
  accuracyRadius,
  isSimulated = false,
  label,
}: {
  position: Point3
  accuracyRadius?: number | null
  isSimulated?: boolean
  label?: string
}) {
  const [x, y, z] = position
  const safeRadius = Math.max(accuracyRadius || 4.5, 2.5)
  const displayLabel = label ?? (isSimulated ? 'Simulated Location (Test Fix)' : 'Your Location')

  return (
    <group position={[x, y, z]} name="user-location-marker">
      {/* Accuracy disc on the ground: elevated to y + 0.35 to prevent sinking into road meshes */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.35, 0]}>
        <ringGeometry args={[0, safeRadius, 32]} />
        <meshBasicMaterial color="#3B82F6" opacity={0.18} transparent side={2} depthWrite={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.36, 0]}>
        <ringGeometry args={[Math.max(0, safeRadius - 0.35), safeRadius, 32]} />
        <meshBasicMaterial color="#2563EB" opacity={0.55} transparent side={2} depthWrite={false} />
      </mesh>

      {/* Pulsating ground wave ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.38, 0]}>
        <ringGeometry args={[1.2, 1.9, 32]} />
        <meshBasicMaterial color="#60A5FA" opacity={0.75} transparent side={2} depthWrite={false} />
      </mesh>

      {/* Blue location glowing sphere */}
      <mesh position={[0, 0.85, 0]}>
        <sphereGeometry args={[1.05, 24, 24]} />
        <meshStandardMaterial color="#2563EB" emissive="#3B82F6" emissiveIntensity={1.2} />
      </mesh>

      {/* Inner white core */}
      <mesh position={[0, 0.85, 0]}>
        <sphereGeometry args={[0.42, 16, 16]} />
        <meshStandardMaterial color="#FFFFFF" emissive="#FFFFFF" emissiveIntensity={1.5} />
      </mesh>

      {/* Vertical light pillar / beacon column for instant high-altitude visibility */}
      <mesh position={[0, 4.5, 0]}>
        <cylinderGeometry args={[0.15, 0.4, 8, 16, 1, true]} />
        <meshBasicMaterial color="#60A5FA" opacity={0.35} transparent side={2} depthWrite={false} />
      </mesh>

      {/* Prominent HTML Landmark Pin directly above user location */}
      <Html position={[0, 2.4, 0]} center zIndexRange={[50, 0]}>
        <div className="relative flex flex-col items-center pointer-events-none select-none -translate-x-1/2 -translate-y-full">
          <div className="flex items-center gap-1.5 rounded-full border border-[#60A5FA] bg-[#101827]/95 px-3 py-1.5 shadow-2xl backdrop-blur-md">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500" />
            </span>
            <span className="text-xs font-bold text-[#F1F5F9] whitespace-nowrap tracking-wide">
              {displayLabel}
            </span>
            {isSimulated && (
              <span className="rounded bg-amber-500/20 px-1 py-0.5 text-[8px] font-extrabold uppercase text-amber-300 border border-amber-400/30">
                Test Mode
              </span>
            )}
          </div>
          <div className="h-3 w-0.5 bg-[#60A5FA] shadow-[0_0_6px_#60A5FA]" />
          <div className="h-1.5 w-1.5 rounded-full bg-[#60A5FA] ring-2 ring-white/80" />
        </div>
      </Html>
    </group>
  )
}

// Campus landmarks and priority tiers are imported from ../data/campusLandmarks

interface LandmarkVisualConfig {
  stemHeight: number
  offsetX: number
}

const LANDMARK_VISUAL_OFFSETS: Record<string, LandmarkVisualConfig> = {
  'main-block': { stemHeight: 12, offsetX: 0 },
  'library': { stemHeight: 14, offsetX: 0 },
  'first-year-block': { stemHeight: 12, offsetX: 0 },
  'civil-block': { stemHeight: 16, offsetX: 0 },
  'l-shape-block': { stemHeight: 14, offsetX: 0 },
  'it-block': { stemHeight: 12, offsetX: 0 },
  'mechanical-block': { stemHeight: 14, offsetX: 0 },
  'mnm-school-of-architecture': { stemHeight: 14, offsetX: -12 },
  'boys-hostel': { stemHeight: 30, offsetX: 14 },
  'canteen': { stemHeight: 12, offsetX: -8 },
  'jain-mess': { stemHeight: 20, offsetX: 12 },
  'non-jain-mess': { stemHeight: 32, offsetX: -6 },
  'physics-department': { stemHeight: 14, offsetX: -10 },
  'english-department': { stemHeight: 14, offsetX: -8 },
  'maths-department': { stemHeight: 26, offsetX: 12 },
  'open-air-theatre': { stemHeight: 12, offsetX: 0 },
  'main-gate-1': { stemHeight: 12, offsetX: 0 },
  'west-entrance': { stemHeight: 12, offsetX: 0 },
}

function CampusScene({
  selectedBuildingId,
  selectedFloor,
  routePoints,
  activeStepPoint,
  simulatedPosition,
  simulatedAccuracyRadius,
  completedPoints,
  remainingPoints,
  isSimulating,
  userLocationPoint,
  userLocationAccuracyRadius,
  userLocationIsSimulated = false,
  userLocationLabel,
  isWelcomeShowcase = false,
  labelVisibilityMode = 'major',
  categoryFilter = 'All',
  onBuildingSelect,
  onSelectionChange,
  onModelReady,
  onFrameReady,
  onBuildingFrameReady,
  suppressLabels = false,
  isTourActive = false,
  isPlacingIssue = false,
  issuePlacementPoint = null,
  onLocationPick,
  showIssuePins = false,
  issueReports = [],
  selectedIssueId,
  onIssueSelect,
  isApproachRoute = false,
  approachDestinationName,
  originName,
  targetDestinationPoint,
  targetDestinationName,
}: {
  selectedBuildingId?: string
  selectedFloor?: string
  routePoints?: Point3[]
  activeStepPoint?: Point3 | null
  simulatedPosition?: Point3 | null
  simulatedAccuracyRadius?: number | null
  completedPoints?: Point3[]
  remainingPoints?: Point3[]
  isSimulating?: boolean
  userLocationPoint?: Point3 | null
  userLocationAccuracyRadius?: number | null
  userLocationIsSimulated?: boolean
  userLocationLabel?: string
  isWelcomeShowcase?: boolean
  labelVisibilityMode?: LabelVisibilityMode
  categoryFilter?: string
  onBuildingSelect?: (buildingId: string) => void
  onSelectionChange?: (buildingId: string | null) => void
  onModelReady?: (availableBuildings: CampusBuildingId[]) => void
  onFrameReady: (frame: ModelFrame) => void
  onBuildingFrameReady?: (frame: ModelFrame | null) => void
  suppressLabels?: boolean
  isTourActive?: boolean
  isPlacingIssue?: boolean
  issuePlacementPoint?: Point3 | null
  onLocationPick?: (point: Point3, nearestBuildingId?: string) => void
  showIssuePins?: boolean
  issueReports?: CampusIssueReport[]
  selectedIssueId?: string
  onIssueSelect?: (issue: CampusIssueReport) => void
  isApproachRoute?: boolean
  approachDestinationName?: string | null
  originName?: string | null
  targetDestinationPoint?: Point3 | null
  targetDestinationName?: string | null
}) {
  const gltf = useGLTF(MODEL_PATH)
  const scene = useMemo(() => {
    const instance = gltf.scene.clone(true)
    instance.traverse((object) => {
      if (!('isMesh' in object) || !object.isMesh) return
      const mesh = object as Mesh
      mesh.castShadow = true
      mesh.receiveShadow = true

      const nameLower = mesh.name.toLowerCase()
      const isRoadOrWalkway =
        nameLower.includes('road') ||
        nameLower.includes('walkway') ||
        nameLower.includes('path') ||
        nameLower.includes('lane') ||
        nameLower.includes('driveway') ||
        nameLower.includes('paver')
      const isGround =
        nameLower.includes('ground') ||
        nameLower.includes('lawn') ||
        nameLower.includes('terrain')
      const isWindowOrGlass =
        nameLower.includes('win') ||
        nameLower.includes('glass') ||
        nameLower.includes('panel')

      // Architectural materials calibration
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      materials.forEach((m) => {
        if ('roughness' in m && typeof m.roughness === 'number') {
          if (isRoadOrWalkway) {
            m.roughness = 0.85
            if ('metalness' in m) (m as any).metalness = 0.02
          } else if (isGround) {
            m.roughness = 0.94
            if ('metalness' in m) (m as any).metalness = 0.01
          } else if (isWindowOrGlass) {
            m.roughness = 0.22
            if ('metalness' in m) (m as any).metalness = 0.08
          } else {
            m.roughness = 0.65
            if ('metalness' in m) (m as any).metalness = 0.04
          }
        }
      })
      mesh.material = Array.isArray(mesh.material) ? mesh.material.map((m) => m.clone()) : mesh.material.clone()
    })
    return instance
  }, [gltf.scene])

  const frame = useMemo(() => buildFrame(scene), [scene])
  const selectedFloorKey = useMemo(() => toFloorKey(selectedFloor), [selectedFloor])
  const { capture, restore } = useMaterialDefaults(scene)
  const { camera, size } = useThree()
  const [localSelectedId, setLocalSelectedId] = useState<string | null>(selectedBuildingId ?? null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [zoomTier, setZoomTier] = useState<1 | 2 | 3>(1)
  const lastTierRef = useRef<1 | 2 | 3>(1)

  // Dynamically compute exact roof apex and horizontal centroid for every landmark from GLB meshes
  const landmarkAnchors = useMemo(() => {
    const anchors: Record<string, Point3> = {}
    CAMPUS_LANDMARKS.forEach((landmark) => {
      if (landmark.id === 'l-shape-block') {
        // Continuous medial axis midpoint on physical roof spine: [222.5, roofY, -90.3]
        // Perfectly positioned on North wing roof, clear of Main Block, Library, and arbitrary corners
        const bFrame = buildFrameFromBuilding(scene, 'l-shape-block')
        const roofY = bFrame && bFrame.box && !bFrame.box.isEmpty() ? bFrame.box.max.y : 10.05
        anchors[landmark.id] = [222.5, roofY, -90.3]
        return
      }
      if (landmark.id === 'library') {
        const bFrame = buildFrameFromBuilding(scene, 'library')
        const roofY = bFrame && bFrame.box && !bFrame.box.isEmpty() ? bFrame.box.max.y : 8.3
        anchors[landmark.id] = [193.5, roofY, -73.1]
        return
      }
      const bFrame = buildFrameFromBuilding(scene, landmark.id)
      if (bFrame && bFrame.box && !bFrame.box.isEmpty()) {
        anchors[landmark.id] = [
          bFrame.center.x,
          bFrame.box.max.y,
          bFrame.center.z,
        ]
      } else {
        anchors[landmark.id] = landmark.fallbackPosition
      }
    })
    return anchors
  }, [scene])

  useEffect(() => {
    onFrameReady(frame)
  }, [frame, onFrameReady])

  useEffect(() => {
    const found = new Set<CampusBuildingId>()
    scene.traverse((object) => {
      const id = resolveBuildingIdFromObject(object)
      if (id) found.add(id)
    })
    onModelReady?.([...found])
  }, [scene, onModelReady])

  const activeBuildingId = (selectedBuildingId !== undefined ? selectedBuildingId : localSelectedId) as CampusBuildingId | null

  // Calculate building frame and notify parent whenever activeBuildingId changes
  const activeBuildingFrame = useMemo(() => {
    if (!activeBuildingId) return null
    return buildFrameFromBuilding(scene, activeBuildingId)
  }, [scene, activeBuildingId])

  // Responsive LOD decluttering based on camera distance with hysteresis to avoid flickering
  useFrame(() => {
    const targetX = activeBuildingFrame?.center.x ?? 100
    const targetY = activeBuildingFrame?.center.y ?? 0
    const targetZ = activeBuildingFrame?.center.z ?? -60
    const dist = camera.position.distanceTo(new Vector3(targetX, targetY, targetZ))

    const next = calculateZoomTierWithHysteresis(dist, lastTierRef.current, size.width < 640)
    if (next !== lastTierRef.current) {
      lastTierRef.current = next
      setZoomTier(next)
    }
  })

  useEffect(() => {
    onBuildingFrameReady?.(activeBuildingFrame)
  }, [activeBuildingFrame, onBuildingFrameReady])

  useEffect(() => {
    restore()
    const targetBuildingId = activeBuildingId || hoveredId
    const isHoverOnly = !activeBuildingId && Boolean(hoveredId)
    if (!targetBuildingId) return

    const entry = campusModelMapById[targetBuildingId as CampusBuildingId]
    const isServicePoi = targetBuildingId === 'apollo-shine' || targetBuildingId === 'xerox-shop'
    if (!entry && !isServicePoi) return
    const activeNames = entry ? new Set<string>([...entry.objectNames, ...(entry.interactionObjects ?? [])]) : new Set<string>()
    const activeFloorNames = selectedFloorKey && entry ? new Set(entry.floorObjects[selectedFloorKey] ?? []) : null

    scene.traverse((object) => {
      if (!('isMesh' in object) || !object.isMesh) return
      const mesh = object as Mesh
      const mapped = resolveBuildingIdFromObject(mesh)
      if (mapped !== targetBuildingId && !activeNames.has(mesh.name)) return

      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      materials.forEach((material) => {
        capture(material)
        let isFloor = false
        for (let current: Object3D | null = mesh; current && activeFloorNames; current = current.parent) {
          if (activeFloorNames.has(current.name)) {
            isFloor = true
            break
          }
        }
        // Palette: Elegant Violet (#A78BFA) for selected destination building, (#8B5CF6) for floor, Hover Cyan (#22D3EE)
        const highlightColor = isFloor ? '#8B5CF6' : isHoverOnly ? '#22D3EE' : '#A78BFA'
        if ('emissive' in material) {
          ;(material as any).emissive = new Color(highlightColor)
          ;(material as any).emissiveIntensity = isHoverOnly ? 0.22 : isFloor ? 0.65 : 0.35
        }
      })
    })
  }, [capture, hoveredId, activeBuildingId, restore, scene, selectedFloorKey])

  return (
    <group>
      <primitive
        object={scene}
        dispose={null}
        onClick={(event: ThreeEvent<MouseEvent>) => {
          if (event.delta > 5) return
          event.stopPropagation()
          if (isPlacingIssue && onLocationPick) {
            const p: Point3 = [
              parseFloat(event.point.x.toFixed(2)),
              parseFloat(event.point.y.toFixed(2)),
              parseFloat(event.point.z.toFixed(2)),
            ]
            const mapped = resolveBuildingIdFromObject(event.object)
            onLocationPick(p, mapped ?? undefined)
            return
          }
          const mapped = resolveBuildingIdFromObject(event.object)
          if (!mapped) {
            setLocalSelectedId(null)
            onSelectionChange?.(null)
            return
          }

          setLocalSelectedId(mapped)
          onBuildingSelect?.(mapped)
          onSelectionChange?.(mapped)
        }}
        onPointerOver={(event: ThreeEvent<PointerEvent>) => {
          const mapped = resolveBuildingIdFromObject(event.object)
          if (mapped) {
            document.body.style.cursor = 'pointer'
            setHoveredId(mapped)
          }
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'default'
          setHoveredId(null)
        }}
      />

      {/* Selected Building Ground Projection Halo: Elegant Violet (#A78BFA) with subtle opacity */}
      {activeBuildingFrame && (
        <group position={[activeBuildingFrame.center.x, 0.03, activeBuildingFrame.center.z]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[Math.max(activeBuildingFrame.radius * 0.85, 4), Math.max(activeBuildingFrame.radius * 0.85 + 1.2, 5.2), 48]} />
            <meshBasicMaterial color="#A78BFA" opacity={0.35} transparent side={2} depthWrite={false} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0, Math.max(activeBuildingFrame.radius * 0.85, 4), 48]} />
            <meshBasicMaterial color="#8B5CF6" opacity={0.05} transparent side={2} depthWrite={false} />
          </mesh>
        </group>
      )}

      {/* 3D Floating Landmark Badges: Selected destination prioritized; decluttered during route */}
      {!suppressLabels &&
        CAMPUS_LANDMARKS.map((landmark) => {
          const isSelected = (selectedBuildingId ?? localSelectedId) === landmark.id
          const isHovered = hoveredId === landmark.id

          if (routePoints && routePoints.length > 0) {
            // When route is active: prioritize selected destination and suppress other non-essential landmark badges
            if (!isSelected) return null
          } else if (isWelcomeShowcase) {
            // In Welcome showcase: display only the 4 primary academic landmarks
            if (!['main-block', 'first-year-block', 'civil-block', 'it-block'].includes(landmark.id)) {
              return null
            }
          } else {
            // Physics / English / Maths shared visibility: when any one is selected, keep all 3 visible together!
            const currentSelected = selectedBuildingId ?? localSelectedId
            const isDeptWing =
              (currentSelected === 'physics-department' || currentSelected === 'english-department' || currentSelected === 'maths-department') &&
              (landmark.id === 'physics-department' || landmark.id === 'english-department' || landmark.id === 'maths-department')

            const isVisible = isDeptWing || isLandmarkVisible(landmark, currentSelected, hoveredId, zoomTier, labelVisibilityMode, categoryFilter)
            if (!isVisible) return null
          }

          const anchor = landmarkAnchors[landmark.id] ?? landmark.fallbackPosition
          const visual = LANDMARK_VISUAL_OFFSETS[landmark.id] ?? { stemHeight: 12, offsetX: 0 }
          const stemHeightPx = isSelected ? visual.stemHeight + 6 : visual.stemHeight
          const offsetX = visual.offsetX

          return (
            <Html
              key={landmark.id}
              position={[anchor[0], anchor[1], anchor[2]]}
              center={false}
              zIndexRange={[isSelected ? 40 : isHovered ? 30 : 10, 0]}
            >
              <div
                className="relative flex flex-col items-center pointer-events-auto select-none"
                style={{ transform: 'translate3d(-50%, -100%, 0)' }}
              >
                {/* Floating Pill Card with horizontal leader offset */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    if (landmark.type !== 'entrance') {
                      setLocalSelectedId(landmark.id)
                      onBuildingSelect?.(landmark.id)
                      onSelectionChange?.(landmark.id)
                    }
                  }}
                  onPointerOver={(e) => {
                    e.stopPropagation()
                    setHoveredId(landmark.id)
                  }}
                  onPointerOut={(e) => {
                    e.stopPropagation()
                    setHoveredId(null)
                  }}
                  style={{ transform: offsetX ? `translate3d(${offsetX}px, 0, 0)` : undefined }}
                  aria-label={`Select ${landmark.label}`}
                  className={`group flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold shadow-xl backdrop-blur-xl transition-all duration-200 cursor-pointer select-none whitespace-nowrap ${
                    isSelected
                      ? 'bg-gradient-to-r from-violet-950 via-purple-900 to-violet-950 text-white border-2 border-[#A78BFA] ring-4 ring-[#A78BFA]/30 shadow-violet-500/50 scale-110 z-50'
                      : isHovered
                        ? 'bg-[#192638] text-[#93C5FD] border border-[#60A5FA] shadow-md scale-105 z-30'
                        : 'bg-[#162235]/95 text-[#F1F5F9] border border-[#293A50] hover:border-[#60A5FA] hover:text-white hover:scale-105 shadow-black/80 z-10'
                  }`}
                >
                  {/* Category Icon */}
                  <span
                    className={`flex items-center justify-center shrink-0 ${
                      isSelected
                        ? 'text-violet-200'
                        : isHovered
                          ? 'text-cyan-300'
                          : landmark.type === 'entrance'
                            ? 'text-emerald-400'
                            : landmark.type === 'facility'
                              ? 'text-amber-400'
                              : 'text-cyan-400'
                    }`}
                  >
                    {landmark.type === 'entrance' && <Navigation className="h-3.5 w-3.5 rotate-45" />}
                    {landmark.type === 'academic' && <GraduationCap className="h-3.5 w-3.5" />}
                    {landmark.type === 'facility' &&
                      (landmark.id === 'boys-hostel' ? (
                        <Building2 className="h-3.5 w-3.5" />
                      ) : landmark.id === 'library' ? (
                        <BookOpen className="h-3.5 w-3.5" />
                      ) : (
                        <Utensils className="h-3.5 w-3.5" />
                      ))}
                    {landmark.type === 'department' && <Building2 className="h-3.5 w-3.5" />}
                  </span>

                  {/* Building Name */}
                  <span className={`tracking-tight max-w-[145px] sm:max-w-[210px] truncate ${isSelected ? 'font-bold text-white' : 'font-medium text-slate-100'}`}>
                    {landmark.label}
                  </span>

                  {/* Selected Indicator Badge in Elegant Violet (Suppressed if route destination marker already rendered) */}
                  {isSelected && (!routePoints || routePoints.length === 0) && (
                    <span className="flex items-center gap-1 rounded-full bg-violet-400/25 px-1.5 py-0.5 text-[9px] font-extrabold tracking-wider uppercase text-violet-200 border border-violet-300/40 shrink-0">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#A78BFA] animate-pulse" />
                      Destination
                    </span>
                  )}
                </button>

                {/* Anchor Stem & Pin Dot connecting floating label to building roof */}
                <div className="relative flex flex-col items-center pointer-events-none -mt-px">
                  <svg
                    className="overflow-visible"
                    width="1"
                    height={stemHeightPx}
                    style={{ position: 'relative' }}
                  >
                    <line
                      x1={offsetX}
                      y1={0}
                      x2={0}
                      y2={stemHeightPx}
                      stroke={isSelected ? '#A78BFA' : isHovered ? '#22d3ee' : 'rgba(255,255,255,0.45)'}
                      strokeWidth={isSelected ? '2' : '1.5'}
                    />
                  </svg>
                  <div
                    className={`rounded-full transition-all duration-200 -mt-0.5 ${
                      isSelected
                        ? 'h-2 w-2 bg-[#A78BFA] ring-2 ring-violet-400/60 shadow-[0_0_8px_#A78BFA]'
                        : isHovered
                          ? 'h-1.5 w-1.5 bg-cyan-300'
                          : 'h-1.5 w-1.5 bg-white/70'
                    }`}
                  />
                </div>
              </div>
            </Html>
          )
        })}

      {/* Provisional Service POI Badges (Apollo Shine & Xerox Shop) */}
      {!isWelcomeShowcase && !suppressLabels &&
        CAMPUS_SERVICE_POIS.map((poi) => {
          const isSelected = (selectedBuildingId ?? localSelectedId) === poi.id
          const isHovered = hoveredId === poi.id

          // When route is active: prioritize selected destination POI
          if (routePoints && routePoints.length > 0) {
            if (!isSelected) return null
          } else {
            const shouldShow =
              isSelected ||
              isHovered ||
              labelVisibilityMode === 'all' ||
              (labelVisibilityMode === 'major' && (categoryFilter === 'All' || categoryFilter === 'Facility') && zoomTier >= 2)
            if (!shouldShow) return null
          }

          const isApollo = poi.id === 'apollo-shine'
          const stemHeightPx = isSelected ? 18 : 12

          return (
            <Html
              key={poi.id}
              position={[poi.anchorPosition[0], poi.anchorPosition[1], poi.anchorPosition[2]]}
              center={false}
              zIndexRange={[isSelected ? 40 : isHovered ? 30 : 10, 0]}
            >
              <div
                className="relative flex flex-col items-center pointer-events-auto select-none"
                style={{ transform: 'translate3d(-50%, -100%, 0)' }}
              >
                <button
                  type="button"
                  id={`btn-poi-${poi.id}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    setLocalSelectedId(poi.id)
                    onBuildingSelect?.(poi.id)
                    onSelectionChange?.(poi.id)
                  }}
                  onPointerOver={(e) => {
                    e.stopPropagation()
                    setHoveredId(poi.id)
                  }}
                  onPointerOut={(e) => {
                    e.stopPropagation()
                    setHoveredId(null)
                  }}
                  aria-label={`Select ${poi.name}`}
                  className={`group flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold shadow-xl backdrop-blur-xl transition-all duration-200 cursor-pointer select-none whitespace-nowrap ${
                    isSelected
                      ? 'bg-gradient-to-r from-violet-950 via-purple-900 to-violet-950 text-white border-2 border-[#A78BFA] ring-4 ring-[#A78BFA]/30 shadow-violet-500/50 scale-110 z-50'
                      : isHovered
                        ? 'bg-[#0F172A]/95 text-cyan-200 border border-cyan-400/80 shadow-cyan-500/30 scale-105 z-30'
                        : 'bg-[#0B1220]/95 text-slate-100 border border-white/20 hover:border-cyan-400/80 hover:text-white hover:scale-105 shadow-black/80 z-10'
                  }`}
                >
                  <span
                    className={`flex items-center justify-center shrink-0 ${
                      isSelected ? 'text-violet-200' : isHovered ? 'text-cyan-300' : 'text-amber-400'
                    }`}
                  >
                    {isApollo ? <HeartPulse className="h-3.5 w-3.5" /> : <Printer className="h-3.5 w-3.5" />}
                  </span>
                  <span className={`tracking-tight max-w-[145px] sm:max-w-[210px] truncate ${isSelected ? 'font-bold text-white' : 'font-medium text-slate-100'}`}>
                    {poi.name}
                  </span>
                  {(!isSelected || !routePoints || routePoints.length === 0) && (
                    <span className={`rounded px-1 py-0.5 text-[8px] font-bold border shrink-0 ${
                      isSelected
                        ? 'bg-violet-500/30 text-violet-200 border-violet-400/40'
                        : 'bg-amber-500/20 text-amber-300 border-amber-400/30'
                    }`}>
                      {isSelected ? 'Destination' : 'Provisional'}
                    </span>
                  )}
                </button>
                <div className="relative flex flex-col items-center pointer-events-none -mt-px">
                  <svg className="overflow-visible" width="1" height={stemHeightPx} style={{ position: 'relative' }}>
                    <line
                      x1={0}
                      y1={0}
                      x2={0}
                      y2={stemHeightPx}
                      stroke={isSelected ? '#A78BFA' : isHovered ? '#22d3ee' : 'rgba(255,255,255,0.45)'}
                      strokeWidth={isSelected ? '2' : '1.5'}
                    />
                  </svg>
                  <div
                    className={`rounded-full transition-all duration-200 -mt-0.5 ${
                      isSelected
                        ? 'h-2 w-2 bg-[#A78BFA] ring-2 ring-violet-400/60 shadow-[0_0_8px_#A78BFA]'
                        : isHovered
                          ? 'h-1.5 w-1.5 bg-cyan-300'
                          : 'h-1.5 w-1.5 bg-white/70'
                    }`}
                  />
                </div>
              </div>
            </Html>
          )
        })}

      {/* 3D Active Placement Pin for Student Issue Reporting */}
      {isPlacingIssue && issuePlacementPoint && (
        <group position={[issuePlacementPoint[0], issuePlacementPoint[1] + 0.1, issuePlacementPoint[2]]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.8, 1.8, 32]} />
            <meshBasicMaterial color="#22D3EE" opacity={0.6} transparent depthWrite={false} />
          </mesh>
          <Html position={[0, 1.3, 0]} center zIndexRange={[45, 0]}>
            <div className="relative flex flex-col items-center pointer-events-none select-none -translate-x-1/2 -translate-y-full">
              <div className="rounded-xl border border-cyan-400 bg-[#0B1424]/95 px-3 py-1.5 shadow-2xl backdrop-blur-md text-center">
                <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-300 whitespace-nowrap">
                  <MapPin size={13} className="text-cyan-400 animate-bounce" />
                  Selected Location Pin
                </div>
                <div className="text-[9px] text-amber-300 font-medium whitespace-nowrap mt-0.5">
                  Approximate campus location — verify before dispatch
                </div>
              </div>
              <div className="h-4 w-0.5 bg-cyan-400" />
              <div className="h-2 w-2 rounded-full bg-cyan-400 ring-2 ring-cyan-200" />
            </div>
          </Html>
        </group>
      )}

      {/* Campus Issue 3D Pins Layer (Authorized Admin / Student Only — NEVER VISITOR) */}
      {!suppressLabels && !isTourActive && showIssuePins && issueReports && issueReports.length > 0 && (
        <group name="campus-issue-pins">
          {issueReports.map((issue) => {
            const isSelected = selectedIssueId === issue.id
            const statusColor =
              issue.status === 'RESOLVED'
                ? '#10B981'
                : issue.status === 'IN_PROGRESS'
                  ? '#06B6D4'
                  : issue.status === 'ASSIGNED'
                    ? '#A855F7'
                    : issue.status === 'UNDER_REVIEW'
                      ? '#3B82F6'
                      : '#F59E0B'

            return (
              <Html
                key={issue.id}
                position={[issue.modelCoordinates[0], issue.modelCoordinates[1] + 1.2, issue.modelCoordinates[2]]}
                center
                zIndexRange={[isSelected ? 40 : 20, 0]}
              >
                <div
                  className="relative flex flex-col items-center pointer-events-auto select-none -translate-x-1/2 -translate-y-full cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation()
                    onIssueSelect?.(issue)
                  }}
                >
                  <button
                    type="button"
                    className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold shadow-xl backdrop-blur-xl border transition-all ${
                      isSelected
                        ? 'bg-[#0E1A2D] text-white border-cyan-400 scale-110 ring-2 ring-cyan-400/50'
                        : 'bg-[#0B1424]/90 text-slate-200 border-white/20 hover:border-cyan-400 hover:scale-105'
                    }`}
                  >
                    <span
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ backgroundColor: statusColor }}
                    />
                    <span className="font-mono text-cyan-300">{issue.id}</span>
                    <span className="text-slate-400 max-w-[80px] truncate">{issue.category}</span>
                  </button>
                  <div
                    className="h-3 w-0.5"
                    style={{ backgroundColor: statusColor }}
                  />
                  <div
                    className="h-1.5 w-1.5 rounded-full ring-1 ring-white/60"
                    style={{ backgroundColor: statusColor }}
                  />
                </div>
              </Html>
            )
          })}
        </group>
      )}

      {routePoints && routePoints.length >= 2 && (
        <RouteOverlay
          points={routePoints}
          activeStepPoint={activeStepPoint}
          simulatedPosition={simulatedPosition}
          simulatedAccuracyRadius={simulatedAccuracyRadius}
          completedPoints={completedPoints}
          remainingPoints={remainingPoints}
          isSimulating={isSimulating}
          isApproachRoute={isApproachRoute}
          approachDestinationName={approachDestinationName}
          originName={originName}
          targetDestinationPoint={targetDestinationPoint}
          targetDestinationName={targetDestinationName}
        />
      )}

      {userLocationPoint && (
        <UserLocationMarker
          position={userLocationPoint}
          accuracyRadius={userLocationAccuracyRadius}
          isSimulated={userLocationIsSimulated}
          label={userLocationLabel}
        />
      )}
    </group>
  )
}

function CameraRig({
  frame,
  preset,
  controlsRef,
  revision,
  isLocationMode = false,
  isTourActive = false,
  activeTourStop = null,
  onTourCameraArrived,
}: {
  frame: ModelFrame
  preset: CameraPreset
  controlsRef: React.RefObject<any>
  revision: number
  isLocationMode?: boolean
  isTourActive?: boolean
  activeTourStop?: CampusTourStop | null
  onTourCameraArrived?: (stopId: string) => void
}) {
  const { camera, size } = useThree()
  const targetPos = useRef<Vector3>(new Vector3())
  const targetCenter = useRef<Vector3>(new Vector3())
  const isTransitioning = useRef<boolean>(false)
  const isInteracting = useRef<boolean>(false)
  const arrivedStopIdRef = useRef<string | null>(null)
  const lastTargetStopIdRef = useRef<string | null>(null)
  const onTourCameraArrivedRef = useRef(onTourCameraArrived)

  useEffect(() => {
    onTourCameraArrivedRef.current = onTourCameraArrived
  })

  // Detect user preference for reduced motion
  const prefersReducedMotion = useMemo(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false
  }, [])

  // Listen to orbit controls interaction start to let user take control immediately
  useEffect(() => {
    if (isTourActive) return
    const controls = controlsRef.current
    if (!controls) return
    const onStart = () => {
      isInteracting.current = true
      isTransitioning.current = false
    }
    const onEnd = () => {
      isInteracting.current = false
    }
    controls.addEventListener('start', onStart)
    controls.addEventListener('end', onEnd)
    return () => {
      controls.removeEventListener('start', onStart)
      controls.removeEventListener('end', onEnd)
    }
  }, [controlsRef, isTourActive])

  useEffect(() => {
    if (isTourActive && activeTourStop) {
      if (lastTargetStopIdRef.current === activeTourStop.id) {
        return
      }
      lastTargetStopIdRef.current = activeTourStop.id
      arrivedStopIdRef.current = null
      const destPos = new Vector3(
        activeTourStop.cameraPosition[0],
        Math.max(activeTourStop.cameraPosition[1], 4.0),
        activeTourStop.cameraPosition[2]
      )
      const destTarget = new Vector3(
        activeTourStop.targetPoint[0],
        activeTourStop.targetPoint[1],
        activeTourStop.targetPoint[2]
      )
      targetPos.current.copy(destPos)
      targetCenter.current.copy(destTarget)
      isInteracting.current = false

      if (prefersReducedMotion) {
        camera.position.copy(destPos)
        camera.lookAt(destTarget)
        if (controlsRef.current) {
          controlsRef.current.target.copy(destTarget)
          controlsRef.current.update()
        }
        isTransitioning.current = false
        arrivedStopIdRef.current = activeTourStop.id
        onTourCameraArrivedRef.current?.(activeTourStop.id)
      } else {
        isTransitioning.current = true
      }
      return
    }

    if (!frame.box || !(camera instanceof PerspectiveCamera)) return

    let destPos: Vector3
    if (isLocationMode) {
      const controls = controlsRef.current
      const currentTarget = controls ? controls.target.clone() : new Vector3()
      const offset = camera.position.clone().sub(currentTarget)
      const currentDist = offset.length()
      // Clamp distance to a comfortable inspection range for student position
      const clampedDist = Math.max(22, Math.min(55, currentDist))
      if (Math.hypot(offset.x, offset.z) < 0.5) {
        offset.set(1, 1.1, 1).normalize()
      } else {
        offset.normalize()
      }
      // Ensure vertical viewing pitch remains elevated above terrain
      if (offset.y < 0.35) offset.y = 0.35
      offset.normalize()
      destPos = frame.center.clone().addScaledVector(offset, clampedDist)
      // Safety: always keep camera height well above ground and terrain
      destPos.y = Math.max(destPos.y, frame.center.y + 8, 4.5)
    } else {
      const direction =
        preset === 'welcome-showcase'
          ? new Vector3(1, 0.75, 1).normalize()
          : preset === 'top-down'
            ? new Vector3(0, 1, 0.00001)
            : preset === 'isometric'
              ? new Vector3(1, 1.1, 1).normalize()
              : new Vector3(1, 1.25, 1.2).normalize()

      const rotation = new Matrix4().lookAt(direction, new Vector3(), camera.up)
      const right = new Vector3().setFromMatrixColumn(rotation, 0)
      const up = new Vector3().setFromMatrixColumn(rotation, 1)
      const tanY = Math.tan((camera.fov * Math.PI) / 360)
      const tanX = (tanY * size.width) / Math.max(size.height, 1)

      const fillMultiplier = preset === 'welcome-showcase' ? 0.95 : 1.2
      let distance = 0
      for (const x of [frame.box.min.x, frame.box.max.x]) {
        for (const y of [frame.box.min.y, frame.box.max.y]) {
          for (const z of [frame.box.min.z, frame.box.max.z]) {
            const point = new Vector3(x, y, z).sub(frame.center)
            distance = Math.max(
              distance,
              point.dot(direction) +
                fillMultiplier * Math.max(Math.abs(point.dot(right)) / tanX, Math.abs(point.dot(up)) / tanY)
            )
          }
        }
      }

      // Task 2: Ensure destination-focus camera never crops to a roof-only close-up
      const isMobileViewport = size.width < 768
      const minContextDistance = preset === 'top-down' ? 65 : (isMobileViewport ? 42 : 50)
      distance = Math.max(distance, minContextDistance)

      destPos = frame.center.clone().addScaledVector(direction, distance)
      destPos.y = Math.max(destPos.y, frame.center.y + 12.0, 14.0)
    }

    targetPos.current.copy(destPos)
    targetCenter.current.copy(frame.center)

    // Reset interaction lock on every programmatic camera command
    isInteracting.current = false

    if (prefersReducedMotion) {
      camera.position.copy(destPos)
      camera.lookAt(frame.center)
      if (controlsRef.current) {
        controlsRef.current.target.copy(frame.center)
        controlsRef.current.update()
      }
      isTransitioning.current = false
    } else {
      isTransitioning.current = true
    }
  }, [camera, size.width, size.height, frame, preset, revision, controlsRef, prefersReducedMotion, isLocationMode, isTourActive, activeTourStop])

  useFrame((_, delta) => {
    const controls = controlsRef.current
    if (!controls) return

    if (!isTourActive && isInteracting.current) {
      isTransitioning.current = false
      return
    }
    if (!isTransitioning.current && !isTourActive) {
      if (preset === 'welcome-showcase' && !isInteracting.current && !prefersReducedMotion) {
        const offset = camera.position.clone().sub(controls.target)
        offset.applyAxisAngle(new Vector3(0, 1, 0), delta * 0.035)
        camera.position.copy(controls.target).add(offset)
        controls.update()
      }
      return
    }

    if (isTourActive) {
      if (isTransitioning.current) {
        // Fast, smooth cinematic camera flight
        const step = Math.min(1, delta * 3.6)
        camera.position.lerp(targetPos.current, step)
        controls.target.lerp(targetCenter.current, step)
        controls.update()
        camera.lookAt(controls.target)

        const posDist = camera.position.distanceTo(targetPos.current)
        const targetDist = controls.target.distanceTo(targetCenter.current)
        if (posDist < 0.45 && targetDist < 0.45) {
          camera.position.copy(targetPos.current)
          controls.target.copy(targetCenter.current)
          controls.update()
          isTransitioning.current = false
          if (activeTourStop && arrivedStopIdRef.current !== activeTourStop.id) {
            arrivedStopIdRef.current = activeTourStop.id
            onTourCameraArrivedRef.current?.(activeTourStop.id)
          }
        }
      } else {
        // Subtle camera hold during narration: smooth damping prevents any jerks
        controls.target.lerp(targetCenter.current, Math.min(1, delta * 4.0))
        camera.lookAt(controls.target)
      }
      return
    }

    // Smooth exponential step
    const step = Math.min(1, delta * 4.2)
    camera.position.lerp(targetPos.current, step)
    controls.target.lerp(targetCenter.current, step)
    controls.update()

    const posDist = camera.position.distanceTo(targetPos.current)
    const targetDist = controls.target.distanceTo(targetCenter.current)

    if (posDist < 0.08 && targetDist < 0.08) {
      camera.position.copy(targetPos.current)
      controls.target.copy(targetCenter.current)
      controls.update()
      isTransitioning.current = false
    }
  })

  return null
}

function ControlsLayer({
  preset,
  setPreset,
  controlsRef,
  hasRoute,
  hasSelectedBuilding,
  labelVisibilityMode,
  onLabelVisibilityModeChange,
  onFitRoute,
  onFitCampus,
  onFocusBuilding,
  touchRotateMode,
  onToggleTouchRotate,
}: {
  preset: CameraPreset
  setPreset: (preset: CameraPreset) => void
  controlsRef: React.RefObject<any>
  hasRoute?: boolean
  hasSelectedBuilding?: boolean
  labelVisibilityMode: LabelVisibilityMode
  onLabelVisibilityModeChange: (mode: LabelVisibilityMode) => void
  onFitRoute?: () => void
  onFitCampus: () => void
  onFocusBuilding?: () => void
  touchRotateMode?: boolean
  onToggleTouchRotate?: () => void
}) {
  const zoom = useCallback(
    (factor: number) => {
      const controls = controlsRef.current
      if (!controls) return
      const offset = controls.object.position.clone().sub(controls.target)
      const distance = Math.max(controls.minDistance, Math.min(controls.maxDistance, offset.length() * factor))
      controls.object.position.copy(controls.target).add(offset.setLength(distance))
      controls.update()
    },
    [controlsRef],
  )

  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      {/* Top-Right Camera Modes, Tools & Label Visibility Toggle */}
      <div className="pointer-events-none absolute right-2.5 top-3 z-20 flex flex-col items-end gap-1.5 md:right-4 md:top-4">
        {/* Compact Label Visibility Segmented Control */}
        <div className="pointer-events-auto flex items-center rounded-2xl border border-[#293A50] bg-[#162235]/95 p-1 shadow-2xl backdrop-blur-xl gap-0.5">
          <span className="px-2 text-[10px] font-bold tracking-wider text-slate-400 uppercase hidden sm:inline">
            Labels
          </span>
          <button
            type="button"
            id="btn-label-mode-major"
            onClick={() => onLabelVisibilityModeChange('major')}
            className={`rounded-xl px-2 py-1 sm:px-2.5 text-[10px] sm:text-[11px] font-bold transition-all cursor-pointer ${
              labelVisibilityMode === 'major'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/40 border border-blue-400/40'
                : 'text-slate-300 hover:bg-white/10 hover:text-white'
            }`}
            title="Major Blocks (Default decluttered view)"
          >
            Major
          </button>
          <button
            type="button"
            id="btn-label-mode-all"
            onClick={() => onLabelVisibilityModeChange('all')}
            className={`rounded-xl px-2 py-1 sm:px-2.5 text-[10px] sm:text-[11px] font-bold transition-all cursor-pointer ${
              labelVisibilityMode === 'all'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/40 border border-blue-400/40'
                : 'text-slate-300 hover:bg-white/10 hover:text-white'
            }`}
            title="All Places (Display all known campus labels)"
          >
            All
          </button>
          <button
            type="button"
            id="btn-label-mode-selected"
            onClick={() => onLabelVisibilityModeChange('selected')}
            className={`rounded-xl px-2 py-1 sm:px-2.5 text-[10px] sm:text-[11px] font-bold transition-all cursor-pointer ${
              labelVisibilityMode === 'selected'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/40 border border-blue-400/40'
                : 'text-slate-300 hover:bg-white/10 hover:text-white'
            }`}
            title="Selected Only (Show only currently selected building label)"
          >
            Selected
          </button>
        </div>

        {/* Primary Camera Navigation Controls Card */}
        <div className="pointer-events-auto flex flex-col items-center gap-1.5 rounded-2xl border border-[#293A50] bg-[#162235]/95 p-1.5 shadow-2xl backdrop-blur-xl">
          {/* Recenter Campus Overview */}
          <button
            type="button"
            id="btn-camera-recenter-campus"
            data-testid="btn-camera-fit-campus"
            onClick={onFitCampus}
            className="btn-camera-fit-campus flex h-9 w-9 items-center justify-center rounded-xl text-slate-300 hover:bg-white/10 hover:text-white transition cursor-pointer"
            aria-label="Recenter Campus Overview"
            title="Recenter Campus (Default full-campus overview)"
          >
            <RefreshCcw size={15} />
          </button>

          {/* Focus Selected Building */}
          <button
            type="button"
            id="btn-camera-focus-building"
            onClick={onFocusBuilding}
            disabled={!hasSelectedBuilding}
            className={`flex h-9 w-9 items-center justify-center rounded-xl transition ${
              hasSelectedBuilding
                ? 'text-cyan-300 hover:bg-cyan-950/60 hover:text-cyan-200 cursor-pointer'
                : 'text-slate-600 cursor-not-allowed opacity-40'
            }`}
            aria-label="Focus Selected Building"
            title={hasSelectedBuilding ? 'Focus Selected Building' : 'Select a building to focus'}
          >
            <Focus size={15} />
          </button>

          {hasRoute && (
            <button
              type="button"
              id="btn-camera-fit-route"
              onClick={onFitRoute}
              className="flex h-9 items-center gap-1.5 rounded-xl bg-cyan-950/70 px-2.5 text-[11px] font-bold text-cyan-300 hover:bg-cyan-900/80 transition border border-cyan-500/40 cursor-pointer"
              aria-label="Fit entire route"
              title="Fit entire route within view"
            >
              <Maximize2 size={13} className="text-cyan-400" />
              <span>Fit Route</span>
            </button>
          )}

          <div className="h-px w-6 bg-white/10" />

          {/* 3D Isometric View */}
          <button
            type="button"
            id="btn-camera-view-3d"
            onClick={() => setPreset('isometric')}
            className={`flex h-9 items-center gap-1.5 rounded-xl px-2.5 text-[11px] font-bold transition cursor-pointer ${
              preset === 'isometric' || preset === 'framed'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/40 border border-blue-400/40'
                : 'text-slate-300 hover:bg-white/10 hover:text-white'
            }`}
            aria-label="Isometric view"
            title="3D Isometric perspective"
          >
            <Box size={14} />
            <span>3D</span>
          </button>

          {/* Top-down 2D View */}
          <button
            type="button"
            id="btn-camera-view-top"
            onClick={() => setPreset('top-down')}
            className={`flex h-9 items-center gap-1.5 rounded-xl px-2.5 text-[11px] font-bold transition cursor-pointer ${
              preset === 'top-down'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/40 border border-indigo-400/40'
                : 'text-slate-300 hover:bg-white/10 hover:text-white'
            }`}
            aria-label="Top-down view"
            title="Top-down 2D perspective"
          >
            <Target size={14} />
            <span>Top</span>
          </button>

          {/* Dedicated Mobile/Desktop Touch Rotate Toggle Button */}
          {onToggleTouchRotate && (
            <button
              type="button"
              id="btn-toggle-touch-rotate"
              data-testid="btn-toggle-touch-rotate"
              onClick={onToggleTouchRotate}
              className={`flex h-9 items-center gap-1.5 rounded-xl px-2.5 text-[11px] font-bold transition cursor-pointer ${
                touchRotateMode
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/40 border border-amber-300/50'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
              aria-label="Toggle 1-finger rotate mode"
              title={
                touchRotateMode
                  ? '1-Finger Orbit Active (Tap to return to Map Pan)'
                  : 'Map Pan Active (Tap to enable 1-Finger Orbit)'
              }
            >
              <RefreshCcw size={13} className={touchRotateMode ? 'text-amber-100 rotate-45' : 'text-slate-400'} />
              <span>{touchRotateMode ? 'Orbit' : 'Pan'}</span>
            </button>
          )}
        </div>

        {/* North Compass Indicator */}
        <div className="pointer-events-auto flex items-center gap-1.5 rounded-full border border-white/10 bg-[#0B1220]/90 px-2.5 py-1 text-[10px] font-bold text-slate-300 shadow-xl backdrop-blur-md">
          <CompassIcon size={12} className="text-rose-400" />
          <span>NORTH</span>
        </div>
      </div>

      {/* Bottom-Right Zoom Controls */}
      <div className="pointer-events-none absolute bottom-20 md:bottom-4 right-3 md:right-4 z-20 flex flex-col gap-1.5">
        <div className="pointer-events-auto flex flex-col rounded-2xl border border-[#293A50] bg-[#162235]/95 p-1 shadow-2xl backdrop-blur-xl">
          <button
            type="button"
            onClick={() => zoom(0.82)}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-300 hover:bg-white/10 hover:text-white transition cursor-pointer"
            aria-label="Zoom in"
            title="Zoom in"
          >
            <ZoomIn size={16} />
          </button>
          <div className="mx-1.5 h-px bg-white/10" />
          <button
            type="button"
            onClick={() => zoom(1.22)}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-300 hover:bg-white/10 hover:text-white transition cursor-pointer"
            aria-label="Zoom out"
            title="Zoom out"
          >
            <ZoomOut size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}

function CampusCanvas({
  selectedBuildingId,
  selectedFloor,
  routePoints,
  activeStepPoint,
  simulatedPosition,
  simulatedAccuracyRadius,
  completedPoints,
  remainingPoints,
  isSimulating,
  userLocationPoint,
  userLocationAccuracyRadius,
  userLocationIsSimulated = false,
  userLocationLabel,
  isWelcomeShowcase = false,
  preset: presetProp,
  viewTarget,
  showHud = true,
  showInstructionBadge = true,
  className,
  labelVisibilityMode = 'major',
  categoryFilter = 'All',
  onLabelVisibilityModeChange,
  onBuildingSelect,
  onSelectionChange,
  onModelReady,
  onResetView,
  onSceneError,
  isTourActive = false,
  activeTourStop = null,
  onTourCameraArrived,
  suppressLabels = false,
  isPlacingIssue = false,
  issuePlacementPoint = null,
  onLocationPick,
  showIssuePins = false,
  issueReports = [],
  selectedIssueId,
  onIssueSelect,
  isApproachRoute = false,
  approachDestinationName,
  originName,
  targetDestinationPoint,
  targetDestinationName,
}: {
  selectedBuildingId?: string
  selectedFloor?: string
  routePoints?: Point3[]
  activeStepPoint?: Point3 | null
  simulatedPosition?: Point3 | null
  simulatedAccuracyRadius?: number | null
  completedPoints?: Point3[]
  remainingPoints?: Point3[]
  isSimulating?: boolean
  userLocationPoint?: Point3 | null
  userLocationAccuracyRadius?: number | null
  userLocationIsSimulated?: boolean
  userLocationLabel?: string
  isWelcomeShowcase?: boolean
  preset?: CameraPreset
  viewTarget?: 'campus' | 'route' | 'location'
  showHud?: boolean
  showInstructionBadge?: boolean
  className?: string
  labelVisibilityMode?: LabelVisibilityMode
  categoryFilter?: string
  onLabelVisibilityModeChange?: (mode: LabelVisibilityMode) => void
  onBuildingSelect?: (buildingId: string) => void
  onSelectionChange?: (buildingId: string | null) => void
  onModelReady?: (availableBuildings: CampusBuildingId[]) => void
  onResetView?: () => void
  onSceneError: (error: Error) => void
  isTourActive?: boolean
  activeTourStop?: CampusTourStop | null
  onTourCameraArrived?: (stopId: string) => void
  suppressLabels?: boolean
  isPlacingIssue?: boolean
  issuePlacementPoint?: Point3 | null
  onLocationPick?: (point: Point3, nearestBuildingId?: string) => void
  showIssuePins?: boolean
  issueReports?: CampusIssueReport[]
  selectedIssueId?: string
  onIssueSelect?: (issue: CampusIssueReport) => void
  isApproachRoute?: boolean
  approachDestinationName?: string | null
  originName?: string | null
  targetDestinationPoint?: Point3 | null
  targetDestinationName?: string | null
}) {
  const controlsRef = useRef<any>(null)
  const [campusFrame, setCampusFrame] = useState<ModelFrame>(DEFAULT_FRAME)
  const [buildingFrame, setBuildingFrame] = useState<ModelFrame | null>(null)
  const [userLocFrame, setUserLocFrame] = useState<ModelFrame | null>(null)
  const [labelMode, setLabelMode] = useState<LabelVisibilityMode>(labelVisibilityMode)
  const [frameMode, setFrameMode] = useState<'campus' | 'route' | 'building' | 'location'>(
    viewTarget === 'location' ? 'location' : viewTarget === 'route' ? 'route' : selectedBuildingId ? 'building' : 'campus'
  )
  const welcomeShowcaseFrame = useMemo(() => buildWelcomeShowcaseFrame(), [])
  const [preset, setPreset] = useState<CameraPreset>(presetProp ?? (isWelcomeShowcase ? 'welcome-showcase' : 'isometric'))
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    if (presetProp) setPreset(presetProp)
  }, [presetProp])

  // Sync external label visibility mode prop
  useEffect(() => {
    if (labelVisibilityMode) {
      setLabelMode(labelVisibilityMode)
    }
  }, [labelVisibilityMode])

  const routeFrame = useMemo(() => {
    if (routePoints && routePoints.length > 0) {
      const allPoints = [...routePoints]
      if (targetDestinationPoint) {
        allPoints.push(targetDestinationPoint)
      }
      const rawFrame = buildFrameFromPoints(allPoints)
      if (rawFrame) {
        const safeRadius = Math.max(rawFrame.radius * 1.08, 28)
        return {
          ...rawFrame,
          radius: safeRadius,
          framedPosition: [rawFrame.center.x + safeRadius * 1.35, rawFrame.center.y + Math.max(safeRadius * 0.95, 16), rawFrame.center.z + safeRadius * 1.35] as [number, number, number],
          topDownPosition: [rawFrame.center.x, rawFrame.center.y + safeRadius * 2.5, rawFrame.center.z + 0.01] as [number, number, number],
          isometricPosition: [rawFrame.center.x + safeRadius * 1.25, rawFrame.center.y + Math.max(safeRadius * 0.95, 16), rawFrame.center.z + safeRadius * 1.25] as [number, number, number],
        }
      }
    }
    return null
  }, [routePoints, targetDestinationPoint])

  // Sync frame mode when viewTarget, route, or selected building changes
  useEffect(() => {
    if (viewTarget === 'location' && userLocationPoint) {
      const locFrame = buildFrameFromPoints([userLocationPoint])
      setUserLocFrame(locFrame)
      setFrameMode('location')
      setRevision((r) => r + 1)
    } else if (viewTarget === 'route' && routeFrame) {
      setFrameMode('route')
      setRevision((r) => r + 1)
    } else if (buildingFrame) {
      setFrameMode('building')
      setRevision((r) => r + 1)
    }
  }, [viewTarget, routeFrame, buildingFrame, userLocationPoint])

  const activeFrame = isWelcomeShowcase
    ? welcomeShowcaseFrame
    : frameMode === 'location' && userLocFrame
      ? userLocFrame
      : frameMode === 'route' && routeFrame
        ? routeFrame
        : frameMode === 'building' && buildingFrame
          ? buildingFrame
          : campusFrame

  const containerClasses =
    className ??
    'relative h-[62svh] min-h-[360px] w-full min-w-0 md:h-[calc(100dvh-200px)] md:min-h-[480px] overflow-hidden rounded-3xl border border-[#24364D] bg-[#101827] shadow-xl shadow-black/40'

  const handleFitRoute = useCallback(() => {
    if (routeFrame) {
      setFrameMode('route')
      setRevision((r) => r + 1)
    }
  }, [routeFrame])

  const handleFitCampus = useCallback(() => {
    setFrameMode('campus')
    setBuildingFrame(null)
    setUserLocFrame(null)
    setPreset('isometric')
    setRevision((r) => r + 1)
    onResetView?.()
  }, [onResetView])

  const handleFocusBuilding = useCallback(() => {
    if (buildingFrame) {
      setFrameMode('building')
      setRevision((r) => r + 1)
    }
  }, [buildingFrame])


  const [touchRotateMode, setTouchRotateMode] = useState<boolean>(false)
  const lastTapRef = useRef<{ time: number; x: number; y: number } | null>(null)

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (e.changedTouches.length !== 1) return
    const touch = e.changedTouches[0]
    const now = Date.now()
    if (lastTapRef.current) {
      const dt = now - lastTapRef.current.time
      const dx = Math.abs(touch.clientX - lastTapRef.current.x)
      const dy = Math.abs(touch.clientY - lastTapRef.current.y)
      if (dt < 320 && dx < 24 && dy < 24) {
        // Double-tap detected: smooth zoom into target
        const controls = controlsRef.current
        if (controls) {
          const offset = controls.object.position.clone().sub(controls.target)
          const distance = Math.max(controls.minDistance, Math.min(controls.maxDistance, offset.length() * 0.75))
          controls.object.position.copy(controls.target).add(offset.setLength(distance))
          controls.update()
        }
        lastTapRef.current = null
        return
      }
    }
    lastTapRef.current = { time: now, x: touch.clientX, y: touch.clientY }
  }, [controlsRef])

  return (
    <div
      className={`isolate z-0 ${containerClasses}`}
      onTouchEnd={handleTouchEnd}
      style={{ touchAction: 'none' }}
    >
      <Canvas
        shadows
        dpr={[1, typeof window !== 'undefined' && window.innerWidth < 768 ? 1.75 : 2]}
        camera={{ position: activeFrame.isometricPosition, fov: 42, near: 0.2, far: 4000 }}
        onCreated={({ gl }) => {
          gl.setClearColor('#101827', 1)
          gl.toneMapping = ACESFilmicToneMapping
          gl.toneMappingExposure = 1.28
          gl.shadowMap.enabled = true
          gl.shadowMap.type = PCFSoftShadowMap
        }}
      >
        <fog attach="fog" args={['#101827', 420, 1800]} />
        <ambientLight intensity={0.72} color="#F8FAFC" />
        <hemisphereLight args={['#93C5FD', '#162235', 0.88]} />
        <directionalLight
          position={[75, 120, 60]}
          intensity={2.1}
          color="#FFFDF5"
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-near={10}
          shadow-camera-far={480}
          shadow-camera-left={-160}
          shadow-camera-right={160}
          shadow-camera-top={160}
          shadow-camera-bottom={-160}
          shadow-bias={-0.00015}
        />
        <directionalLight position={[-60, 40, -60]} intensity={0.65} color="#60A5FA" />
        <directionalLight position={[0, -20, 0]} intensity={0.15} color="#1E293B" />

        {/* Sleek architectural dark ground base */}
        <mesh position={[activeFrame.center.x, -0.08, activeFrame.center.z]} receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[1400, 1400]} />
          <meshStandardMaterial color="#0F172A" roughness={0.92} metalness={0.05} />
        </mesh>

        {/* Soft shadow-receiving ground plane */}
        <mesh position={[activeFrame.center.x, -0.06, activeFrame.center.z]} receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[1400, 1400]} />
          <shadowMaterial opacity={0.32} />
        </mesh>

        <Suspense fallback={null}>
          <ModelErrorBoundary onError={onSceneError}>
            <CampusScene
              selectedBuildingId={selectedBuildingId}
              selectedFloor={selectedFloor}
              routePoints={routePoints}
              activeStepPoint={activeStepPoint}
              simulatedPosition={simulatedPosition}
              simulatedAccuracyRadius={simulatedAccuracyRadius}
              completedPoints={completedPoints}
              remainingPoints={remainingPoints}
              isSimulating={isSimulating}
              userLocationPoint={userLocationPoint}
              userLocationAccuracyRadius={userLocationAccuracyRadius}
              userLocationIsSimulated={userLocationIsSimulated}
              userLocationLabel={userLocationLabel}
              labelVisibilityMode={labelMode}
              categoryFilter={categoryFilter}
              onBuildingSelect={onBuildingSelect}
              onSelectionChange={onSelectionChange}
              onModelReady={onModelReady}
              onFrameReady={setCampusFrame}
              onBuildingFrameReady={setBuildingFrame}
              suppressLabels={suppressLabels}
              isTourActive={isTourActive}
              isPlacingIssue={isPlacingIssue}
              issuePlacementPoint={issuePlacementPoint}
              onLocationPick={onLocationPick}
              showIssuePins={showIssuePins}
              issueReports={issueReports}
              selectedIssueId={selectedIssueId}
              onIssueSelect={onIssueSelect}
              isWelcomeShowcase={isWelcomeShowcase}
              isApproachRoute={isApproachRoute}
              approachDestinationName={approachDestinationName}
              originName={originName}
              targetDestinationPoint={targetDestinationPoint}
              targetDestinationName={targetDestinationName}
            />
          </ModelErrorBoundary>
        </Suspense>
        <OrbitControls
          ref={controlsRef}
          makeDefault
          enableDamping
          dampingFactor={0.07}
          enablePan={!isWelcomeShowcase}
          enableZoom
          enableRotate
          rotateSpeed={0.55}
          zoomSpeed={0.9}
          panSpeed={0.65}
          maxPolarAngle={Math.PI / 2 - 0.08}
          minPolarAngle={0.12}
          minDistance={isWelcomeShowcase ? 35 : 8}
          maxDistance={isWelcomeShowcase ? 240 : 350}
          touches={{ ONE: touchRotateMode ? 0 : 1, TWO: 3 }}
          enabled={!isTourActive}
        />
        <CameraRig
          frame={activeFrame}
          preset={preset}
          controlsRef={controlsRef}
          revision={revision}
          isLocationMode={frameMode === 'location'}
          isTourActive={isTourActive}
          activeTourStop={activeTourStop}
          onTourCameraArrived={onTourCameraArrived}
        />
      </Canvas>

      {!isTourActive && !isWelcomeShowcase && (
        <ControlsLayer
          preset={preset}
          setPreset={(value) => {
            setPreset(value)
            setRevision((n) => n + 1)
          }}
          controlsRef={controlsRef}
          hasRoute={Boolean(routePoints && routePoints.length >= 2)}
          hasSelectedBuilding={Boolean(selectedBuildingId || buildingFrame)}
          labelVisibilityMode={labelMode}
          onLabelVisibilityModeChange={(mode) => {
            setLabelMode(mode)
            onLabelVisibilityModeChange?.(mode)
          }}
          onFitRoute={handleFitRoute}
          onFitCampus={handleFitCampus}
          onFocusBuilding={handleFocusBuilding}
          touchRotateMode={touchRotateMode}
          onToggleTouchRotate={() => setTouchRotateMode((m) => !m)}
        />
      )}

      {!isTourActive && !isWelcomeShowcase && showInstructionBadge && (
        <div className="pointer-events-none absolute bottom-4 left-3 z-20 max-w-[calc(100%-6.5rem)] rounded-xl border border-white/10 bg-[#0B1220]/90 px-3 py-1.5 shadow-lg backdrop-blur-xl md:left-4">
          <div className="flex items-center gap-2 text-[11px] font-medium text-slate-300">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse shadow-sm shadow-cyan-400/50" />
            1-finger pan • 2-finger twist & pinch-zoom (or tap Orbit)
          </div>
        </div>
      )}
      {!isTourActive && !isWelcomeShowcase && showHud && activeFrame.box && (
        <Hud selectedBuildingId={selectedBuildingId} selectedFloor={selectedFloor} routePoints={routePoints} />
      )}
      {!activeFrame.box && <div className="absolute inset-0 z-30"><LoadingState /></div>}
    </div>
  )
}

function ModelFallback() {
  return <LoadingState />
}

export function Campus3D({
  selectedBuildingId,
  selectedFloor,
  routePoints,
  activeStepPoint,
  simulatedPosition,
  simulatedAccuracyRadius,
  completedPoints,
  remainingPoints,
  isSimulating,
  userLocationPoint,
  userLocationAccuracyRadius,
  userLocationIsSimulated,
  userLocationLabel,
  viewTarget = 'campus',
  preset,
  isWelcomeShowcase = false,
  showHud = true,
  showInstructionBadge = true,
  className,
  labelVisibilityMode = 'major',
  categoryFilter = 'All',
  onLabelVisibilityModeChange,
  onBuildingSelect,
  onSelectionChange,
  onModelReady,
  onResetView,
  isTourActive = false,
  activeTourStop = null,
  onTourCameraArrived,
  suppressLabels = false,
  isPlacingIssue = false,
  issuePlacementPoint = null,
  onLocationPick,
  showIssuePins = false,
  issueReports = [],
  selectedIssueId,
  onIssueSelect,
  isApproachRoute,
  approachDestinationName,
  originName,
  targetDestinationPoint,
  targetDestinationName,
}: Campus3DProps) {
  const [error, setError] = useState<Error | null>(null)
  const [retryKey, setRetryKey] = useState<number>(0)

  const handleRetry = useCallback(() => {
    try {
      useGLTF.clear(MODEL_PATH)
    } catch {
      // cache clear fallback
    }
    setError(null)
    setRetryKey((k) => k + 1)
  }, [])

  return (
    <ModelErrorBoundary key={`boundary-${retryKey}`} onError={setError}>
      {error ? (
        <ErrorState error={error} onRetry={handleRetry} />
      ) : (
        <Suspense fallback={<ModelFallback />}>
          <CampusCanvas
            key={`canvas-${retryKey}`}
            selectedBuildingId={selectedBuildingId}
            selectedFloor={selectedFloor}
            routePoints={routePoints}
            activeStepPoint={activeStepPoint}
            simulatedPosition={simulatedPosition}
            simulatedAccuracyRadius={simulatedAccuracyRadius}
            completedPoints={completedPoints}
            remainingPoints={remainingPoints}
            isSimulating={isSimulating}
            userLocationPoint={userLocationPoint}
            userLocationAccuracyRadius={userLocationAccuracyRadius}
            userLocationIsSimulated={userLocationIsSimulated}
            userLocationLabel={userLocationLabel}
            viewTarget={viewTarget}
            preset={preset}
            isWelcomeShowcase={isWelcomeShowcase}
            showHud={showHud}
            showInstructionBadge={showInstructionBadge}
            className={className}
            labelVisibilityMode={labelVisibilityMode}
            categoryFilter={categoryFilter}
            onLabelVisibilityModeChange={onLabelVisibilityModeChange}
            onBuildingSelect={onBuildingSelect}
            onSelectionChange={onSelectionChange}
            onModelReady={onModelReady}
            onResetView={onResetView}
            onSceneError={setError}
            isTourActive={isTourActive}
            activeTourStop={activeTourStop}
            onTourCameraArrived={onTourCameraArrived}
            suppressLabels={suppressLabels}
            isPlacingIssue={isPlacingIssue}
            issuePlacementPoint={issuePlacementPoint}
            onLocationPick={onLocationPick}
            showIssuePins={showIssuePins}
            issueReports={issueReports}
            selectedIssueId={selectedIssueId}
            onIssueSelect={onIssueSelect}
            isApproachRoute={isApproachRoute}
            approachDestinationName={approachDestinationName}
            originName={originName}
            targetDestinationPoint={targetDestinationPoint}
            targetDestinationName={targetDestinationName}
          />
        </Suspense>
      )}
    </ModelErrorBoundary>
  )
}

