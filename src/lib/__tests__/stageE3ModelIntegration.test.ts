import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { describe, it } from 'node:test'
import {
  CAMPUS_MODEL_CONFIG,
  campusModelMapById,
  resolveCampusBuilding,
} from '../../data/campusModelMapping.ts'
import { PROVISIONAL_CAMPUS_BOUNDARY } from '../../data/campusGeofenceData.ts'
import { DEFAULT_CAMPUS_CONTROL_POINTS } from '../../data/campusCalibrationData.ts'
import { buildingIndex } from '../../data/buildings.ts'
import { findShortestPath } from '../routePlanner.ts'
import { validateRouteGeometry } from '../routeGeometryValidator.ts'
import type { NavigationEdge, NavigationGraph, NavigationNode, Point3 } from '../../types/navigation.ts'

// Parse campus navigation graph from navigationGraph.ts
function loadCampusGraphFromSource(): NavigationGraph {
  const sourcePath = path.resolve(process.cwd(), 'src/data/navigationGraph.ts')
  const text = fs.readFileSync(sourcePath, 'utf8')

  const nodes: NavigationNode[] = []

  // campusEntranceBuildingMap: ['id', 'buildingId', 'label', point(x, y, z), ...]
  const entranceRegex =
    /\['([a-zA-Z0-9_-]+)',\s*'([a-zA-Z0-9_-]+)',\s*'([^']+)',\s*point\(([-\d.]+),\s*([-\d.]+),\s*([-\d.]+)\)/g
  let match: RegExpExecArray | null
  while ((match = entranceRegex.exec(text)) !== null) {
    nodes.push({
      id: match[1],
      buildingId: match[2] as NavigationNode['buildingId'],
      label: match[3],
      position: [parseFloat(match[4]), parseFloat(match[5]), parseFloat(match[6])] as Point3,
      kind:
        match[1].includes('gate') || (match[1].includes('entrance') && !match[1].includes('approach'))
          ? 'start'
          : 'destination',
      verificationStatus: 'verified',
      sourceObjectName: 'CAMPUS_ENTRANCE_NODE',
    })
  }

  // campusWaypointNodes: ['id', 'label', point(x, y, z), ...]
  const waypointRegex =
    /\['([a-zA-Z0-9_-]+)',\s*'([^']+)',\s*point\(([-\d.]+),\s*([-\d.]+),\s*([-\d.]+)\)/g
  while ((match = waypointRegex.exec(text)) !== null) {
    nodes.push({
      id: match[1],
      label: match[2],
      position: [parseFloat(match[3]), parseFloat(match[4]), parseFloat(match[5])] as Point3,
      kind: 'waypoint',
      verificationStatus: 'verified',
      sourceObjectName: 'CAMPUS_WAYPOINT_NODE',
    })
  }

  // Parse edges: edge('from', 'to', ...)
  const edges: NavigationEdge[] = []
  const edgeRegex = /edge\('([a-zA-Z0-9_-]+)',\s*'([a-zA-Z0-9_-]+)'/g
  let edgeIdx = 1
  const nodeMap = new Map(nodes.map((n) => [n.id, n]))

  while ((match = edgeRegex.exec(text)) !== null) {
    const from = match[1]
    const to = match[2]
    const n1 = nodeMap.get(from)
    const n2 = nodeMap.get(to)
    let cost = 1
    if (n1 && n2) {
      const dx = n1.position[0] - n2.position[0]
      const dy = n1.position[1] - n2.position[1]
      const dz = n1.position[2] - n2.position[2]
      cost = Math.hypot(dx, dy, dz)
    }
    edges.push({
      id: `e_${edgeIdx++}`,
      from,
      to,
      cost,
      verificationStatus: 'verified',
      sourceObjectName: `${from}↔${to}`,
    })
  }

  return { nodes, edges }
}

describe('Phase 5D: Blender Stage E3 GLB Integration & Verification', () => {
  describe('Authoritative Model Configuration & Rollback Availability', () => {
    it('configures Stage E3 GLB as active authoritative model', () => {
      assert.equal(CAMPUS_MODEL_CONFIG.activeModelPath, '/models/MNMJEC_Campus_Stage_E3_Web.glb')
      assert.equal(CAMPUS_MODEL_CONFIG.activeVersion, 'Stage_E3')
      assert.equal(CAMPUS_MODEL_CONFIG.modelName, 'MNMJEC_Campus_Stage_E3_Web.glb')
      assert.equal(CAMPUS_MODEL_CONFIG.fileSizeBytes, 2029316)
    })

    it('maintains original Stage C GLB as rollback path', () => {
      assert.equal(CAMPUS_MODEL_CONFIG.rollbackModelPath, '/models/MNMJEC_Campus_Web.glb')
    })

    it('confirms both active Stage E3 and rollback Stage C GLB files exist on disk with correct sizes', () => {
      const activePath = path.resolve(process.cwd(), 'public/models/MNMJEC_Campus_Stage_E3_Web.glb')
      const rollbackPath = path.resolve(process.cwd(), 'public/models/MNMJEC_Campus_Web.glb')

      assert.ok(fs.existsSync(activePath), 'Active Stage E3 GLB must exist in public/models/')
      assert.ok(fs.existsSync(rollbackPath), 'Original rollback GLB must exist in public/models/')

      const activeStats = fs.statSync(activePath)
      const rollbackStats = fs.statSync(rollbackPath)

      assert.equal(activeStats.size, 2029316, 'Active Stage E3 GLB size must match validated 2,029,316 bytes')
      assert.equal(rollbackStats.size, 2150888, 'Rollback Stage C GLB size must match original 2,150,888 bytes')
    })
  })

  describe('Seven Corrected Entrance Assemblies & Retired Meshes Exclusion', () => {
    it('verifies all 7 corrected entrance assemblies are registered in building mappings', () => {
      // 1. Mechanical Block entrance
      const mech = campusModelMapById['mechanical-block']
      assert.ok(mech.interactionObjects?.includes('MECHANICAL_BLOCK_ENTRANCE_ANCHOR'))
      assert.ok(mech.interactionObjects?.includes('MECHANICAL_ACCESS_EAST_CANOPY'))
      assert.ok(mech.interactionObjects?.includes('MECHANICAL_ACCESS_EAST_DOOR'))

      // 2. IT Block entrance
      const itBlock = campusModelMapById['it-block']
      assert.ok(itBlock.interactionObjects?.includes('IT_BLOCK_ENTRANCE_ANCHOR'))
      assert.ok(itBlock.interactionObjects?.includes('IT_ACCESS_NORTH_CANOPY'))
      assert.ok(itBlock.interactionObjects?.includes('IT_ACCESS_NORTH_DOOR'))

      // 3 & 4. Civil Block upper and lower entrances
      const civil = campusModelMapById['civil-block']
      assert.ok(civil.interactionObjects?.includes('CIVIL_BLOCK_ENTRANCE_ANCHOR'))
      assert.ok(civil.interactionObjects?.includes('CIVIL_BLOCK_ENTRANCE_ANCHOR_02'))
      assert.ok(civil.interactionObjects?.includes('CIVIL_ACCESS_WEST_LOWER_CANOPY'))
      assert.ok(civil.interactionObjects?.includes('CIVIL_ACCESS_WEST_UPPER_CANOPY'))

      // 5. First Year Block entrance
      const firstYear = campusModelMapById['first-year-block']
      assert.ok(firstYear.interactionObjects?.includes('FIRST_YEAR_BLOCK_ENTRANCE_ANCHOR'))
      assert.ok(firstYear.interactionObjects?.includes('FIRST_YEAR_ACCESS_EAST_CANOPY'))
      assert.ok(firstYear.interactionObjects?.includes('FIRST_YEAR_ACCESS_EAST_DOOR'))

      // 6. L-Shape Block entrance
      const lShape = campusModelMapById['l-shape-block']
      assert.ok(lShape.interactionObjects?.includes('L_SHAPE_BLOCK_ENTRANCE_ANCHOR'))
      assert.ok(lShape.interactionObjects?.includes('L_SHAPE_ACCESS_INNER_WEST_CANOPY'))
      assert.ok(lShape.interactionObjects?.includes('L_SHAPE_ACCESS_INNER_WEST_DOOR'))

      // 7. Canteen entrance
      const canteen = campusModelMapById['canteen']
      assert.ok(canteen.interactionObjects?.includes('CANTEEN_ENTRANCE_ANCHOR'))
      assert.ok(canteen.interactionObjects?.includes('CANTEEN_ACCESS_NORTH_CANOPY'))
      assert.ok(canteen.interactionObjects?.includes('CANTEEN_ACCESS_NORTH_DOOR'))
    })

    it('verifies Stage E3 GLB contains corrected entrances and excludes retired provisional entrance meshes', () => {
      const activePath = path.resolve(process.cwd(), 'public/models/MNMJEC_Campus_Stage_E3_Web.glb')
      const buf = fs.readFileSync(activePath)
      const chunk0Length = buf.readUInt32LE(12)
      const jsonText = buf.toString('utf8', 20, 20 + chunk0Length)
      const gltf = JSON.parse(jsonText)
      const nodeNames = new Set((gltf.nodes || []).map((n: { name?: string }) => n.name).filter(Boolean))

      // Preserved entrance anchors
      assert.ok(nodeNames.has('MECHANICAL_BLOCK_ENTRANCE_ANCHOR'))
      assert.ok(nodeNames.has('IT_BLOCK_ENTRANCE_ANCHOR'))
      assert.ok(nodeNames.has('CIVIL_BLOCK_ENTRANCE_ANCHOR'))
      assert.ok(nodeNames.has('CIVIL_BLOCK_ENTRANCE_ANCHOR_02'))
      assert.ok(nodeNames.has('FIRST_YEAR_BLOCK_ENTRANCE_ANCHOR'))
      assert.ok(nodeNames.has('L_SHAPE_BLOCK_ENTRANCE_ANCHOR'))
      assert.ok(nodeNames.has('CANTEEN_ENTRANCE_ANCHOR'))

      // Corrected entrance assemblies in model
      assert.ok(nodeNames.has('MECHANICAL_ACCESS_EAST_CANOPY'))
      assert.ok(nodeNames.has('IT_ACCESS_NORTH_CANOPY'))
      assert.ok(nodeNames.has('CIVIL_ACCESS_WEST_LOWER_CANOPY'))
      assert.ok(nodeNames.has('CIVIL_ACCESS_WEST_UPPER_CANOPY'))
      assert.ok(nodeNames.has('FIRST_YEAR_ACCESS_EAST_CANOPY'))
      assert.ok(nodeNames.has('L_SHAPE_ACCESS_INNER_WEST_CANOPY'))
      assert.ok(nodeNames.has('CANTEEN_ACCESS_NORTH_CANOPY'))

      // Excluded retired provisional entrances
      assert.ok(!nodeNames.has('MECHANICAL_BLOCK_ENTRANCE_PROVISIONAL'), 'Retired Mech provisional entrance must be excluded')
      assert.ok(!nodeNames.has('IT_BLOCK_ENTRANCE_PROVISIONAL'), 'Retired IT provisional entrance must be excluded')
      assert.ok(!nodeNames.has('CIVIL_BLOCK_ENTRANCE_PROVISIONAL'), 'Retired Civil provisional entrance must be excluded')
      assert.ok(!nodeNames.has('FIRST_YEAR_BLOCK_ENTRANCE_PROVISIONAL'), 'Retired First Year provisional entrance must be excluded')
      assert.ok(!nodeNames.has('L_SHAPE_BLOCK_ENTRANCE_PROVISIONAL'), 'Retired L-Shape provisional entrance must be excluded')
      assert.ok(!nodeNames.has('CANTEEN_ENTRANCE_PROVISIONAL'), 'Retired Canteen provisional entrance must be excluded')
    })
  })

  describe('Building Mapping Compatibility & Library Separation', () => {
    it('preserves resolution for all existing building meshes', () => {
      assert.equal(resolveCampusBuilding('MAIN_BLOCK_FLOOR_G'), 'main-block')
      assert.equal(resolveCampusBuilding('MAIN_BLOCK_ROOF'), 'main-block')
      assert.equal(resolveCampusBuilding('FIRST_YEAR_BLOCK_FLOOR_1'), 'first-year-block')
      assert.equal(resolveCampusBuilding('CIVIL_BLOCK_FLOOR_2'), 'civil-block')
      assert.equal(resolveCampusBuilding('IT_BLOCK_FOOTPRINT'), 'it-block')
      assert.equal(resolveCampusBuilding('MECHANICAL_BLOCK_FOOTPRINT'), 'mechanical-block')
      assert.equal(resolveCampusBuilding('CANTEEN_FLOOR_G'), 'canteen')
      assert.equal(resolveCampusBuilding('PHYSICS_DEPARTMENT_ROOF'), 'physics-department')
    })

    it('resolves newly introduced Stage E3 entrance assemblies and structures', () => {
      assert.equal(resolveCampusBuilding('MECHANICAL_ACCESS_EAST_CANOPY'), 'mechanical-block')
      assert.equal(resolveCampusBuilding('IT_ACCESS_NORTH_DOOR'), 'it-block')
      assert.equal(resolveCampusBuilding('CIVIL_ACCESS_WEST_UPPER_CANOPY'), 'civil-block')
      assert.equal(resolveCampusBuilding('CIVIL_ACCESS_WEST_LOWER_DOOR'), 'civil-block')
      assert.equal(resolveCampusBuilding('FIRST_YEAR_ACCESS_EAST_CANOPY'), 'first-year-block')
      assert.equal(resolveCampusBuilding('L_SHAPE_ACCESS_INNER_WEST_CANOPY'), 'l-shape-block')
      assert.equal(resolveCampusBuilding('CANTEEN_ACCESS_NORTH_DOOR'), 'canteen')
      assert.equal(resolveCampusBuilding('E2_ARCHITECTURE_WALL_EAST'), 'mnm-school-of-architecture')
      assert.equal(resolveCampusBuilding('E2_BOYS_HOSTEL_LEVEL_1_SLAB'), 'boys-hostel')
    })

    it('ensures Library geometry is isolated and never falsely assigned to Main Block', () => {
      assert.notEqual(resolveCampusBuilding('E2_LIBRARY_152_BASE_SLAB'), 'main-block')
      assert.notEqual(resolveCampusBuilding('E2_LIBRARY_152_FLAT_ROOF'), 'main-block')
      assert.notEqual(resolveCampusBuilding('E2_LIBRARY_152_SHELL'), 'main-block')

      const mainBlock = campusModelMapById['main-block']
      assert.ok(!mainBlock.objectNames.some((o) => o.toLowerCase().includes('library')))
      assert.ok(!mainBlock.interactionObjects?.some((o) => o.toLowerCase().includes('library')))

      const mainBuilding = buildingIndex['main-block']
      assert.ok(!mainBuilding?.aliases?.some((a) => a.toLowerCase().includes('library')))
    })
  })

  describe('Route Integrity Across All 7 Key Campus Destinations', () => {
    const graph = loadCampusGraphFromSource()
    const nodeMap = new Map(graph.nodes.map((n) => [n.id, n]))

    const routeDestinations: Array<{ destId: string; name: string }> = [
      { destId: 'it-entrance', name: 'IT Block' },
      { destId: 'civil-approach', name: 'Civil Block' },
      { destId: 'first-year-approach', name: 'First Year Block' },
      { destId: 'mechanical-approach', name: 'Mechanical Block' },
      { destId: 'canteen-approach', name: 'Canteen' },
      { destId: 'main-block-approach', name: 'Main Block' },
      { destId: 'l-shape-approach', name: 'L Shape Block' },
    ]

    const startId = 'main-gate-1'

    for (const { destId, name } of routeDestinations) {
      it(`calculates a continuous, collision-free route from Main Gate to ${name}`, () => {
        const destNode = nodeMap.get(destId)
        assert.ok(destNode, `Destination node ${destId} must exist in graph for ${name}`)

        const route = findShortestPath(graph, startId, destId)
        assert.ok(route, `Valid route must exist from ${startId} to ${destId} (${name})`)
        assert.ok(route.nodeIds.length >= 2, `Route to ${name} must contain at least start and end nodes`)
        assert.ok(route.cost > 0, `Route distance must be positive (${route.cost}m)`)

        const polyline = route.nodeIds.map((nodeId) => {
          const node = nodeMap.get(nodeId)
          assert.ok(node, `Node ${nodeId} must exist in navigation graph`)
          return node.position
        })

        const validation = validateRouteGeometry(polyline)
        assert.ok(validation.valid, `Route polyline to ${name} must have valid geometry without building penetration`)
      })
    }
  })

  describe('Preservation of Navigation Safety Guardrails', () => {
    it('preserves strict live outdoor navigation lock (isApprovedForLiveNavigation === false)', () => {
      assert.strictEqual(
        PROVISIONAL_CAMPUS_BOUNDARY.metadata.isApprovedForLiveNavigation,
        false,
        'Live outdoor navigation must remain strictly unapproved in production'
      )
    })

    it('preserves empty calibration control points in production', () => {
      assert.strictEqual(
        DEFAULT_CAMPUS_CONTROL_POINTS.length,
        0,
        'Campus calibration control points must remain empty until physical survey'
      )
    })

    it('does not fabricate access nodes for Library, Xerox, or Apollo in navigation graph', () => {
      const graph = loadCampusGraphFromSource()
      const allGraphNodeIds = new Set(graph.nodes.map((n) => n.id.toLowerCase()))
      const allGraphNodeLabels = graph.nodes.map((n) => n.label.toLowerCase())

      assert.ok(!allGraphNodeIds.has('library-approach'), 'Library approach node must not be fabricated')
      assert.ok(!allGraphNodeIds.has('xerox-approach'), 'Xerox approach node must not be fabricated')
      assert.ok(!allGraphNodeIds.has('apollo-approach'), 'Apollo approach node must not be fabricated')

      assert.ok(!allGraphNodeLabels.some((l) => l.includes('xerox')), 'Xerox node label must not exist in graph')
      assert.ok(!allGraphNodeLabels.some((l) => l.includes('apollo')), 'Apollo node label must not exist in graph')
    })
  })
})
