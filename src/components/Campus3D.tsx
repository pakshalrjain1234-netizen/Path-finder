import { Line, OrbitControls, useGLTF } from '@react-three/drei'
import { Canvas, useThree } from '@react-three/fiber'
import type { ThreeEvent } from '@react-three/fiber'
import { AlertCircle, Box, Loader2, Maximize2, RefreshCcw, Target, ZoomIn, ZoomOut } from 'lucide-react'
import { Component, Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Mesh, Object3D } from 'three'
import { Box3, Color, Matrix4, PerspectiveCamera, Vector3 } from 'three'
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
  completedPoints?: Point3[]
  remainingPoints?: Point3[]
  isSimulating?: boolean
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
    <div className="flex h-full min-h-[420px] items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 text-center">
      <div>
        <Loader2 className="mx-auto animate-spin text-[#2A9D8F]" size={28} />
        <h3 className="mt-3 text-base font-semibold text-slate-900">Loading MNMJEC 3D campus</h3>
        <p className="mt-1 text-sm text-slate-500">Preparing the GLB scene and interactive controls.</p>
      </div>
    </div>
  )
}

function ErrorState({ error }: { error: Error | null }) {
  return (
    <div className="flex h-full min-h-[420px] items-center justify-center rounded-2xl border border-red-200 bg-white px-6 text-center">
      <div>
        <AlertCircle className="mx-auto text-[#E76F51]" size={28} />
        <h3 className="mt-3 text-base font-semibold text-slate-900">Unable to load the 3D campus model</h3>
        <p className="mt-1 text-sm text-slate-500">
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
    <div className="pointer-events-none absolute left-3 top-3 z-20 max-w-[calc(100%-7rem)] rounded-2xl bg-white/90 px-4 py-3 shadow-lg ring-1 ring-slate-200 backdrop-blur-xl md:left-4 md:top-4">
      <div className="flex items-center gap-2">
        <span className="inline-flex rounded-full bg-[#2A9D8F]/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-[#2A9D8F]">
          3D campus
        </span>
        <span className="text-xs text-slate-500">
          {routePoints && routePoints.length > 0 ? `Route active (${routePoints.length} waypoints)` : 'GLB loaded'}
        </span>
      </div>
      <div className="mt-2 text-sm font-semibold text-slate-900">{buildingLabel}</div>
      <div className="mt-1 text-xs text-slate-500">
        {floorCount > 0
          ? `${floorCount} known floor(s)`
          : entry?.knownFloorLabel ?? (routePoints && routePoints.length > 0 ? 'Outdoor Route Navigation' : 'No selected building')}
        {floorLabel}
        {indoorAvailable ? '' : ' • Indoor map not mapped yet'}
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
  completedPoints,
  remainingPoints,
  isSimulating,
}: {
  points: Point3[]
  activeStepPoint?: Point3 | null
  simulatedPosition?: Point3 | null
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
      {/* If simulating: render completed path in subdued color, remaining in vivid teal */}
      {isSimulating && elevatedCompleted && (
        <Line points={elevatedCompleted} color="#94A3B8" lineWidth={3.5} opacity={0.65} transparent />
      )}
      {isSimulating && elevatedRemaining ? (
        <Line points={elevatedRemaining} color="#2A9D8F" lineWidth={5} />
      ) : (
        <Line points={elevatedAllPoints} color="#2A9D8F" lineWidth={5} />
      )}

      {start && (
        <mesh position={[start[0], start[1] + 0.5, start[2]]}>
          <sphereGeometry args={[0.9, 16, 16]} />
          <meshStandardMaterial color="#2A9D8F" emissive="#2A9D8F" emissiveIntensity={0.6} />
        </mesh>
      )}

      {points.slice(1, -1).map(([x, y, z], index) => (
        <mesh key={`waypoint-${index}`} position={[x, y + 0.35, z]}>
          <sphereGeometry args={[0.35, 12, 12]} />
          <meshStandardMaterial color="#2A9D8F" opacity={0.85} transparent />
        </mesh>
      ))}

      {destination && (
        <mesh position={[destination[0], destination[1] + 0.6, destination[2]]}>
          <sphereGeometry args={[1.1, 16, 16]} />
          <meshStandardMaterial color="#E76F51" emissive="#E76F51" emissiveIntensity={0.8} />
        </mesh>
      )}

      {/* Blue location dot for simulation mode */}
      {isSimulating && simulatedPosition && (
        <group position={[simulatedPosition[0], simulatedPosition[1] + 0.55, simulatedPosition[2]]}>
          <mesh>
            <sphereGeometry args={[0.75, 20, 20]} />
            <meshStandardMaterial color="#2563EB" emissive="#60A5FA" emissiveIntensity={0.9} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.15, 0]}>
            <ringGeometry args={[0.9, 1.4, 32]} />
            <meshBasicMaterial color="#38BDF8" opacity={0.8} transparent side={2} />
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

function CampusScene({
  selectedBuildingId,
  selectedFloor,
  routePoints,
  activeStepPoint,
  simulatedPosition,
  completedPoints,
  remainingPoints,
  isSimulating,
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
  completedPoints?: Point3[]
  remainingPoints?: Point3[]
  isSimulating?: boolean
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
      // Geometry and transforms remain shared/intact; highlight materials are per mesh.
      mesh.material = Array.isArray(mesh.material) ? mesh.material.map((m) => m.clone()) : mesh.material.clone()
    })
    return instance
  }, [gltf.scene])
  const frame = useMemo(() => buildFrame(scene), [scene])
  const selectedFloorKey = useMemo(() => toFloorKey(selectedFloor), [selectedFloor])
  const { capture, restore } = useMaterialDefaults(scene)
  const [localSelectedId, setLocalSelectedId] = useState<string | null>(selectedBuildingId ?? null)

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
    if (!activeBuildingId) return

    const entry = campusModelMapById[activeBuildingId]
    if (!entry) return
    const activeNames = new Set<string>([...entry.objectNames, ...(entry.interactionObjects ?? [])])
    const activeFloorNames = selectedFloorKey ? new Set(entry.floorObjects[selectedFloorKey] ?? []) : null

    scene.traverse((object) => {
      if (!('isMesh' in object) || !object.isMesh) return
      const mesh = object as Mesh
      const mapped = resolveBuildingIdFromObject(mesh)
      if (mapped !== activeBuildingId && !activeNames.has(mesh.name)) return

      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      materials.forEach((material) => {
        capture(material)
        let isFloor = false
        for (let current: Object3D | null = mesh; current && activeFloorNames; current = current.parent) {
          if (activeFloorNames.has(current.name)) { isFloor = true; break }
        }
        if ('color' in material) (material as any).color.set(isFloor ? '#E76F51' : '#2A9D8F')
        if ('emissive' in material) {
          ;(material as any).emissive = new Color(isFloor ? '#E76F51' : '#2A9D8F')
          ;(material as any).emissiveIntensity = 0.25
        }
      })
    })
  }, [capture, localSelectedId, restore, scene, selectedBuildingId, selectedFloorKey])

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
      />
      {routePoints && routePoints.length >= 2 && (
        <RouteOverlay
          points={routePoints}
          activeStepPoint={activeStepPoint}
          simulatedPosition={simulatedPosition}
          completedPoints={completedPoints}
          remainingPoints={remainingPoints}
          isSimulating={isSimulating}
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
      <div className="pointer-events-none absolute right-3 top-3 z-20 flex flex-col items-end gap-2 md:right-4 md:top-4">
        <button
          type="button"
          onClick={() => {
            setPreset('framed')
            onResetView?.()
          }}
          className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-slate-700 shadow-md ring-1 ring-slate-200/80 backdrop-blur-xl hover:bg-white hover:text-slate-900 transition"
          aria-label="Reset camera"
          title="Reset camera to entire campus"
        >
          <RefreshCcw size={16} />
        </button>

        {hasRoute && (
          <button
            type="button"
            onClick={onFitRoute}
            className="pointer-events-auto flex h-10 items-center gap-1.5 rounded-full bg-white/95 px-3 text-xs font-semibold text-slate-700 shadow-md ring-1 ring-slate-200/80 backdrop-blur-xl hover:bg-white hover:text-[#2A9D8F] transition"
            aria-label="Fit entire route"
            title="Fit entire route within view"
          >
            <Maximize2 size={14} className="text-[#2A9D8F]" />
            <span>Fit Route</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => {
            setPreset('isometric')
          }}
          className={`pointer-events-auto flex h-10 items-center gap-1.5 rounded-full px-3 text-xs font-semibold shadow-md ring-1 ring-slate-200/80 backdrop-blur-xl transition ${
            preset === 'isometric' ? 'bg-[#2A9D8F] text-white' : 'bg-white/95 text-slate-700 hover:bg-white'
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
          className={`pointer-events-auto flex h-10 items-center gap-1.5 rounded-full px-3 text-xs font-semibold shadow-md ring-1 ring-slate-200/80 backdrop-blur-xl transition ${
            preset === 'top-down' ? 'bg-[#E76F51] text-white' : 'bg-white/95 text-slate-700 hover:bg-white'
          }`}
          aria-label="Top-down view"
          title="Top-down 2D perspective"
        >
          <Target size={14} />
          <span>Top</span>
        </button>
      </div>

      <div className="pointer-events-none absolute bottom-4 right-3 z-20 flex flex-col gap-2 md:right-4">
        <button
          type="button"
          onClick={() => zoom(0.85)}
          className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-slate-700 shadow-md ring-1 ring-slate-200/80 backdrop-blur-xl hover:bg-white hover:text-slate-900 transition"
          aria-label="Zoom in"
          title="Zoom in"
        >
          <ZoomIn size={16} />
        </button>
        <button
          type="button"
          onClick={() => zoom(1.18)}
          className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-slate-700 shadow-md ring-1 ring-slate-200/80 backdrop-blur-xl hover:bg-white hover:text-slate-900 transition"
          aria-label="Zoom out"
          title="Zoom out"
        >
          <ZoomOut size={16} />
        </button>
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
  completedPoints,
  remainingPoints,
  isSimulating,
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
  completedPoints?: Point3[]
  remainingPoints?: Point3[]
  isSimulating?: boolean
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
  const containerClasses = className ?? 'relative h-[62svh] min-h-[360px] w-full min-w-0 md:h-[calc(100dvh-260px)] md:min-h-[460px] overflow-hidden rounded-2xl border border-slate-200 bg-slate-100'

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
        dpr={[1, 1.75]}
        camera={{ position: activeFrame.framedPosition, fov: 45, near: 0.1, far: 5000 }}
        onCreated={({ gl }) => {
          gl.setClearColor('#f8fafc', 1)
        }}
      >
        <ambientLight intensity={0.85} />
        <directionalLight position={[8, 16, 8]} intensity={1.2} />
        <directionalLight position={[-10, 8, -10]} intensity={0.35} />
        <Suspense fallback={null}>
          <ModelErrorBoundary onError={onSceneError}>
            <CampusScene
              selectedBuildingId={selectedBuildingId}
              selectedFloor={selectedFloor}
              routePoints={routePoints}
              activeStepPoint={activeStepPoint}
              simulatedPosition={simulatedPosition}
              completedPoints={completedPoints}
              remainingPoints={remainingPoints}
              isSimulating={isSimulating}
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
          dampingFactor={0.08}
          enablePan
          enableZoom
          enableRotate
          rotateSpeed={0.6}
          zoomSpeed={0.9}
          panSpeed={0.7}
          maxPolarAngle={Math.PI / 2 - 0.03}
          minPolarAngle={0}
          minDistance={activeFrame.radius * 0.05}
          maxDistance={activeFrame.radius * 12}
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
        <div className="pointer-events-none absolute bottom-4 left-3 z-20 max-w-[calc(100%-6.5rem)] rounded-2xl bg-white/90 px-3 py-2 shadow-lg ring-1 ring-slate-200 backdrop-blur-xl md:left-4">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <span className="h-2 w-2 rounded-full bg-[#2A9D8F]" />
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
  completedPoints,
  remainingPoints,
  isSimulating,
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
            completedPoints={completedPoints}
            remainingPoints={remainingPoints}
            isSimulating={isSimulating}
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
