import { Html, Line, OrbitControls, useGLTF } from '@react-three/drei'
import { Canvas, useThree } from '@react-three/fiber'
import type { ThreeEvent } from '@react-three/fiber'
import { AlertCircle, Box, Compass as CompassIcon, Loader2, Maximize2, RefreshCcw, Target, ZoomIn, ZoomOut } from 'lucide-react'
import { Component, Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Mesh, Object3D } from 'three'
import { ACESFilmicToneMapping, Box3, Color, Matrix4, PCFSoftShadowMap, PerspectiveCamera, Vector3 } from 'three'
import { buildings } from '../data/buildings'
import {
  campusModelMapById,
  resolveCampusBuilding,
  type CampusBuildingId,
  type CampusModelMappingEntry,
  type FloorKey,
} from '../data/campusModelMapping'
import type { Point3 } from '../types/navigation'

const MODEL_PATH = '/models/MNMJEC_Campus_Web.glb'
// Load within Suspense so readiness reflects the actual scene.

type CameraPreset = 'framed' | 'top-down' | 'isometric'

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
  viewTarget?: 'campus' | 'route'
  showHud?: boolean
  showInstructionBadge?: boolean
  className?: string
  onBuildingSelect?: (buildingId: string) => void
  onSelectionChange?: (buildingId: string | null) => void
  onModelReady?: (availableBuildings: CampusBuildingId[]) => void
  onResetView?: () => void
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
    isometricPosition: [center.x + radius * 1.35, center.y + radius * 1.05, center.z + radius * 1.35],
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

function ErrorState({ error }: { error: Error | null }) {
  return (
    <div className="flex h-full min-h-[420px] items-center justify-center rounded-2xl border border-rose-500/30 bg-[#0B1220]/90 px-6 text-center backdrop-blur-xl">
      <div>
        <AlertCircle className="mx-auto text-rose-400" size={28} />
        <h3 className="mt-3 text-base font-semibold text-white">Unable to load the 3D campus model</h3>
        <p className="mt-1 text-sm text-slate-400">
          {error ? error.message : 'The GLB file could not be parsed. Verify the Blender export and try again.'}
        </p>
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
}: {
  points: Point3[]
  activeStepPoint?: Point3 | null
  simulatedPosition?: Point3 | null
  simulatedAccuracyRadius?: number | null
  completedPoints?: Point3[]
  remainingPoints?: Point3[]
  isSimulating?: boolean
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
      {/* If simulating: render completed path in subdued slate, remaining in radiant electric cyan */}
      {isSimulating && elevatedCompleted && (
        <Line points={elevatedCompleted} color="#475569" lineWidth={4} opacity={0.4} transparent />
      )}
      {isSimulating && elevatedRemaining ? (
        <Line points={elevatedRemaining} color="#22D3EE" lineWidth={6} />
      ) : (
        <Line points={elevatedAllPoints} color="#22D3EE" lineWidth={6} />
      )}

      {start && (
        <mesh position={[start[0], start[1] + 0.5, start[2]]}>
          <sphereGeometry args={[0.9, 20, 20]} />
          <meshStandardMaterial color="#0284C7" emissive="#38BDF8" emissiveIntensity={1} />
        </mesh>
      )}

      {points.slice(1, -1).map(([x, y, z], index) => (
        <mesh key={`waypoint-${index}`} position={[x, y + 0.35, z]}>
          <sphereGeometry args={[0.3, 12, 12]} />
          <meshStandardMaterial color="#22D3EE" emissive="#38BDF8" emissiveIntensity={0.6} opacity={0.9} transparent />
        </mesh>
      ))}

      {destination && (
        <mesh position={[destination[0], destination[1] + 0.6, destination[2]]}>
          <sphereGeometry args={[1.1, 20, 20]} />
          <meshStandardMaterial color="#E11D48" emissive="#FB7185" emissiveIntensity={1} />
        </mesh>
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
}: {
  position: Point3
  accuracyRadius?: number | null
}) {
  const [x, y, z] = position
  const safeRadius = Math.max(accuracyRadius || 5, 2)

  return (
    <group position={[x, y + 0.5, z]} name="user-location-marker">
      {/* Accuracy disc on the ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.45, 0]}>
        <ringGeometry args={[0, safeRadius, 32]} />
        <meshBasicMaterial color="#3B82F6" opacity={0.15} transparent side={2} depthWrite={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.44, 0]}>
        <ringGeometry args={[Math.max(0, safeRadius - 0.3), safeRadius, 32]} />
        <meshBasicMaterial color="#2563EB" opacity={0.45} transparent side={2} depthWrite={false} />
      </mesh>

      {/* Blue location glowing sphere */}
      <mesh position={[0, 0.4, 0]}>
        <sphereGeometry args={[0.85, 24, 24]} />
        <meshStandardMaterial color="#1D4ED8" emissive="#3B82F6" emissiveIntensity={0.9} />
      </mesh>

      {/* Inner white core */}
      <mesh position={[0, 0.4, 0]}>
        <sphereGeometry args={[0.35, 16, 16]} />
        <meshStandardMaterial color="#FFFFFF" emissive="#FFFFFF" emissiveIntensity={1} />
      </mesh>

      {/* Pulsating ground wave ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.2, 0]}>
        <ringGeometry args={[1.0, 1.6, 32]} />
        <meshBasicMaterial color="#60A5FA" opacity={0.7} transparent side={2} />
      </mesh>
    </group>
  )
}

const CAMPUS_LANDMARKS: Array<{ id: string; label: string; position: Point3; type: 'entrance' | 'academic' | 'facility' }> = [
  { id: 'main-gate-1', label: 'Main Entrance (Gate 1)', position: [181.0, 1.8, -6.2], type: 'entrance' },
  { id: 'main-block', label: 'Main Block', position: [180.2, 8.5, -38.6], type: 'academic' },
  { id: 'first-year-block', label: 'First Year Block', position: [166.5, 12.0, -38.6], type: 'academic' },
  { id: 'civil-block', label: 'Civil Block', position: [145.2, 10.0, -38.6], type: 'academic' },
  { id: 'it-block', label: 'IT Block', position: [96.8, 8.5, -45.8], type: 'academic' },
  { id: 'canteen', label: 'Canteen & Mess', position: [37.4, 5.0, 2.0], type: 'facility' },
]

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
  onBuildingSelect,
  onSelectionChange,
  onModelReady,
  onFrameReady,
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
  onBuildingSelect?: (buildingId: string) => void
  onSelectionChange?: (buildingId: string | null) => void
  onModelReady?: (availableBuildings: CampusBuildingId[]) => void
  onFrameReady: (frame: ModelFrame) => void
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

      // Architectural materials calibration
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      materials.forEach((m) => {
        if ('roughness' in m && typeof m.roughness === 'number') {
          if (isRoadOrWalkway) {
            m.roughness = 0.86
            if ('metalness' in m) (m as any).metalness = 0.02
          } else if (isGround) {
            m.roughness = 0.92
            if ('metalness' in m) (m as any).metalness = 0.01
          } else {
            m.roughness = 0.58
            if ('metalness' in m) (m as any).metalness = 0.05
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
  const [localSelectedId, setLocalSelectedId] = useState<string | null>(selectedBuildingId ?? null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  useEffect(() => {
    onFrameReady(frame)
  }, [frame, onFrameReady])

  useEffect(() => {
    const found = new Set<CampusBuildingId>()
    scene.traverse((object) => { const id = resolveBuildingIdFromObject(object); if (id) found.add(id) })
    onModelReady?.([...found])
  }, [scene, onModelReady])

  useEffect(() => {
    restore()
    const activeBuildingId = (selectedBuildingId !== undefined ? selectedBuildingId : localSelectedId) as CampusBuildingId | null
    const targetBuildingId = activeBuildingId || hoveredId
    const isHoverOnly = !activeBuildingId && Boolean(hoveredId)
    if (!targetBuildingId) return

    const entry = campusModelMapById[targetBuildingId as CampusBuildingId]
    if (!entry) return
    const activeNames = new Set<string>([...entry.objectNames, ...(entry.interactionObjects ?? [])])
    const activeFloorNames = selectedFloorKey ? new Set(entry.floorObjects[selectedFloorKey] ?? []) : null

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
          if (activeFloorNames.has(current.name)) { isFloor = true; break }
        }
        // Palette: Electric Blue (#3B82F6) for building, Violet (#8B5CF6) for floor, Cyan (#22D3EE) for hover
        // Preserve base texture & colors (no solid paint override) to keep architectural identity intact
        const highlightColor = isFloor ? '#8B5CF6' : isHoverOnly ? '#22D3EE' : '#3B82F6'
        if ('emissive' in material) {
          ;(material as any).emissive = new Color(highlightColor)
          ;(material as any).emissiveIntensity = isHoverOnly ? 0.32 : isFloor ? 0.72 : 0.48
        }
      })
    })
  }, [capture, hoveredId, localSelectedId, restore, scene, selectedBuildingId, selectedFloorKey])

  return (
    <group>
      <primitive
        object={scene}
        dispose={null}
        onClick={(event: ThreeEvent<MouseEvent>) => {
          if (event.delta > 5) return
          event.stopPropagation()
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
      {/* 3D Floating Landmark Badges for Quick Orientation when not navigating */}
      {(!routePoints || routePoints.length === 0) &&
        CAMPUS_LANDMARKS.map((landmark) => (
          <Html
            key={landmark.id}
            position={[landmark.position[0], landmark.position[1], landmark.position[2]]}
            center
            distanceFactor={140}
          >
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
              className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold shadow-lg backdrop-blur-xl transition-all hover:scale-105 cursor-pointer select-none whitespace-nowrap ${
                (selectedBuildingId ?? localSelectedId) === landmark.id
                  ? 'bg-blue-600/95 text-white border-blue-400 ring-2 ring-cyan-400/60 shadow-blue-500/50 scale-105'
                  : 'bg-[#0B1220]/90 text-slate-200 border-white/20 hover:border-cyan-400 hover:text-white'
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${landmark.type === 'entrance' ? 'bg-emerald-400' : 'bg-cyan-400'}`} />
              <span>{landmark.label}</span>
            </button>
          </Html>
        ))}
      {routePoints && routePoints.length >= 2 && (
        <RouteOverlay
          points={routePoints}
          activeStepPoint={activeStepPoint}
          simulatedPosition={simulatedPosition}
          simulatedAccuracyRadius={simulatedAccuracyRadius}
          completedPoints={completedPoints}
          remainingPoints={remainingPoints}
          isSimulating={isSimulating}
        />
      )}
      {userLocationPoint && (
        <UserLocationMarker
          position={userLocationPoint}
          accuracyRadius={userLocationAccuracyRadius}
        />
      )}
    </group>
  )
}

function CameraRig({ frame, preset, controlsRef, revision }: { frame: ModelFrame; preset: CameraPreset; controlsRef: React.RefObject<any>; revision: number }) {
  const { camera, size } = useThree()
  useEffect(() => {
    if (!frame.box || !(camera instanceof PerspectiveCamera)) return
    // Fit actual corners to both viewport axes. Move only the camera, never the model.
    const direction = preset === 'top-down' ? new Vector3(0, 1, 0.00001) : new Vector3(1, 1.3, 1.2).normalize()
    const rotation = new Matrix4().lookAt(direction, new Vector3(), camera.up)
    const right = new Vector3().setFromMatrixColumn(rotation, 0)
    const up = new Vector3().setFromMatrixColumn(rotation, 1)
    const tanY = Math.tan(camera.fov * Math.PI / 360)
    const tanX = tanY * size.width / Math.max(size.height, 1)
    let distance = 0
    for (const x of [frame.box.min.x, frame.box.max.x]) for (const y of [frame.box.min.y, frame.box.max.y]) for (const z of [frame.box.min.z, frame.box.max.z]) {
      const point = new Vector3(x, y, z).sub(frame.center)
      distance = Math.max(distance, point.dot(direction) + 1.15 * Math.max(Math.abs(point.dot(right)) / tanX, Math.abs(point.dot(up)) / tanY))
    }
    camera.far = Math.max(5000, distance + frame.radius * 20)
    camera.position.copy(frame.center).addScaledVector(direction, distance)
    camera.lookAt(frame.center)
    camera.updateProjectionMatrix()
    if (controlsRef.current) {
      controlsRef.current.target.copy(frame.center)
      controlsRef.current.update()
    }
  }, [camera, size.width, size.height, frame, preset, revision, controlsRef])
  return null
}

function ControlsLayer({
  preset,
  setPreset,
  controlsRef,
  hasRoute,
  onFitRoute,
  onResetView,
}: {
  preset: CameraPreset
  setPreset: (preset: CameraPreset) => void
  controlsRef: React.RefObject<any>
  hasRoute?: boolean
  onFitRoute?: () => void
  onResetView?: () => void
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
      {/* Top-Right Camera Modes & Tools */}
      <div className="pointer-events-none absolute right-3 top-3 z-20 flex flex-col items-end gap-2 md:right-4 md:top-4">
        <div className="pointer-events-auto flex flex-col items-center gap-1.5 rounded-2xl border border-white/10 bg-[#0B1220]/90 p-1.5 shadow-2xl backdrop-blur-xl">
          <button
            type="button"
            onClick={() => {
              setPreset('framed')
              onResetView?.()
            }}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-300 hover:bg-white/10 hover:text-white transition"
            aria-label="Reset camera"
            title="Reset camera to entire campus"
          >
            <RefreshCcw size={15} />
          </button>

          {hasRoute && (
            <button
              type="button"
              onClick={onFitRoute}
              className="flex h-9 items-center gap-1.5 rounded-xl bg-cyan-950/70 px-2.5 text-[11px] font-bold text-cyan-300 hover:bg-cyan-900/80 transition border border-cyan-500/40"
              aria-label="Fit entire route"
              title="Fit entire route within view"
            >
              <Maximize2 size={13} className="text-cyan-400" />
              <span>Fit Route</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setPreset('isometric')
            }}
            className={`flex h-9 items-center gap-1.5 rounded-xl px-2.5 text-[11px] font-bold transition ${
              preset === 'isometric'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/40 border border-blue-400/40'
                : 'text-slate-300 hover:bg-white/10 hover:text-white'
            }`}
            aria-label="Isometric view"
            title="3D Isometric perspective"
          >
            <Box size={14} />
            <span>3D</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setPreset('top-down')
            }}
            className={`flex h-9 items-center gap-1.5 rounded-xl px-2.5 text-[11px] font-bold transition ${
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
        </div>

        {/* North Compass Indicator */}
        <div className="pointer-events-auto flex items-center gap-1.5 rounded-full border border-white/10 bg-[#0B1220]/90 px-2.5 py-1 text-[10px] font-bold text-slate-300 shadow-xl backdrop-blur-md">
          <CompassIcon size={12} className="text-rose-400" />
          <span>NORTH</span>
        </div>
      </div>

      {/* Bottom-Right Zoom Controls */}
      <div className="pointer-events-none absolute bottom-4 right-3 z-20 flex flex-col gap-1.5 md:right-4">
        <div className="pointer-events-auto flex flex-col rounded-2xl border border-white/10 bg-[#0B1220]/90 p-1 shadow-2xl backdrop-blur-xl">
          <button
            type="button"
            onClick={() => zoom(0.82)}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-300 hover:bg-white/10 hover:text-white transition"
            aria-label="Zoom in"
            title="Zoom in"
          >
            <ZoomIn size={16} />
          </button>
          <div className="mx-1.5 h-px bg-white/10" />
          <button
            type="button"
            onClick={() => zoom(1.22)}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-300 hover:bg-white/10 hover:text-white transition"
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
  viewTarget,
  showHud = true,
  showInstructionBadge = true,
  className,
  onBuildingSelect,
  onSelectionChange,
  onModelReady,
  onSceneError,
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
  viewTarget?: 'campus' | 'route'
  showHud?: boolean
  showInstructionBadge?: boolean
  className?: string
  onBuildingSelect?: (buildingId: string) => void
  onSelectionChange?: (buildingId: string | null) => void
  onModelReady?: (availableBuildings: CampusBuildingId[]) => void
  onSceneError: (error: Error) => void
}) {
  const controlsRef = useRef<any>(null)
  const [campusFrame, setCampusFrame] = useState<ModelFrame>(DEFAULT_FRAME)
  const [frameMode, setFrameMode] = useState<'campus' | 'route'>(viewTarget === 'route' ? 'route' : 'campus')
  const [preset, setPreset] = useState<CameraPreset>('framed')
  const [revision, setRevision] = useState(0)

  const routeFrame = useMemo(() => {
    if (routePoints && routePoints.length > 0) {
      return buildFrameFromPoints(routePoints)
    }
    return null
  }, [routePoints])

  // Sync frame mode when viewTarget or route changes
  useEffect(() => {
    if (viewTarget === 'route' && routeFrame) {
      setFrameMode('route')
      setRevision((r) => r + 1)
    }
  }, [viewTarget, routeFrame])

  const activeFrame = frameMode === 'route' && routeFrame ? routeFrame : campusFrame
  const containerClasses = className ?? 'relative h-[62svh] min-h-[360px] w-full min-w-0 md:h-[calc(100dvh-200px)] md:min-h-[480px] overflow-hidden rounded-3xl border border-slate-200/80 bg-gradient-to-b from-slate-100 to-slate-200 shadow-sm'

  const handleFitRoute = useCallback(() => {
    if (routeFrame) {
      setFrameMode('route')
      setRevision((r) => r + 1)
    }
  }, [routeFrame])

  const handleResetCamera = useCallback(() => {
    setFrameMode('campus')
    setPreset('framed')
    setRevision((r) => r + 1)
  }, [])

  return (
    <div className={containerClasses}>
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: activeFrame.framedPosition, fov: 42, near: 0.2, far: 4000 }}
        onCreated={({ gl }) => {
          gl.setClearColor('#0B1220', 1)
          gl.toneMapping = ACESFilmicToneMapping
          gl.toneMappingExposure = 1.14
          gl.shadowMap.enabled = true
          gl.shadowMap.type = PCFSoftShadowMap
        }}
      >
        <fog attach="fog" args={['#0B1220', 160, 500]} />
        <ambientLight intensity={0.5} color="#1E293B" />
        <hemisphereLight args={['#38BDF8', '#061018', 0.85]} />
        <directionalLight
          position={[50, 90, 45]}
          intensity={1.85}
          color="#FFFDF5"
          castShadow
          shadow-mapSize={[1024, 1024]}
          shadow-camera-near={10}
          shadow-camera-far={380}
          shadow-camera-left={-130}
          shadow-camera-right={130}
          shadow-camera-top={130}
          shadow-camera-bottom={-130}
          shadow-bias={-0.0003}
        />
        <directionalLight position={[-45, 30, -50]} intensity={0.45} color="#818CF8" />

        {/* Sleek architectural dark ground base */}
        <mesh position={[activeFrame.center.x, -0.08, activeFrame.center.z]} receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[800, 800]} />
          <meshStandardMaterial color="#080F1D" roughness={0.92} metalness={0.05} />
        </mesh>

        {/* Soft shadow-receiving ground plane */}
        <mesh position={[activeFrame.center.x, -0.06, activeFrame.center.z]} receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[800, 800]} />
          <shadowMaterial opacity={0.35} />
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
              onBuildingSelect={onBuildingSelect}
              onSelectionChange={onSelectionChange}
              onModelReady={onModelReady}
              onFrameReady={setCampusFrame}
            />
          </ModelErrorBoundary>
        </Suspense>
        <OrbitControls
          ref={controlsRef}
          makeDefault
          enableDamping
          dampingFactor={0.06}
          enablePan
          enableZoom
          enableRotate
          rotateSpeed={0.65}
          zoomSpeed={0.9}
          panSpeed={0.7}
          maxPolarAngle={Math.PI / 2 - 0.05}
          minPolarAngle={0.05}
          minDistance={10}
          maxDistance={320}
          touches={{ ONE: 0, TWO: 2 }}
        />
        <CameraRig frame={activeFrame} preset={preset} controlsRef={controlsRef} revision={revision} />
      </Canvas>
      <ControlsLayer
        preset={preset}
        setPreset={(value) => { setPreset(value); setRevision((n) => n + 1) }}
        controlsRef={controlsRef}
        hasRoute={Boolean(routePoints && routePoints.length >= 2)}
        onFitRoute={handleFitRoute}
        onResetView={handleResetCamera}
      />
      {showInstructionBadge && (
        <div className="pointer-events-none absolute bottom-4 left-3 z-20 max-w-[calc(100%-6.5rem)] rounded-xl border border-white/10 bg-[#0B1220]/90 px-3 py-1.5 shadow-lg backdrop-blur-xl md:left-4">
          <div className="flex items-center gap-2 text-[11px] font-medium text-slate-300">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse shadow-sm shadow-cyan-400/50" />
            Drag to orbit • Right-drag to pan • Pinch/scroll to zoom
          </div>
        </div>
      )}
      {showHud && activeFrame.box && (
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
  viewTarget = 'campus',
  showHud = true,
  showInstructionBadge = true,
  className,
  onBuildingSelect,
  onSelectionChange,
  onModelReady,
}: Campus3DProps) {
  const [error, setError] = useState<Error | null>(null)

  return (
    <ModelErrorBoundary onError={setError}>
      {error ? (
        <ErrorState error={error} />
      ) : (
        <Suspense fallback={<ModelFallback />}>
          <CampusCanvas
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
            viewTarget={viewTarget}
            showHud={showHud}
            showInstructionBadge={showInstructionBadge}
            className={className}
            onBuildingSelect={onBuildingSelect}
            onSelectionChange={onSelectionChange}
            onModelReady={onModelReady}
            onSceneError={setError}
          />
        </Suspense>
      )}
    </ModelErrorBoundary>
  )
}
