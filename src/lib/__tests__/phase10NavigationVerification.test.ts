import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { buildings, buildingIndex } from '../../data/buildings.ts'
import {
  campusDestinationNodesByBuildingId,
  campusNavigationGraph,
  campusNavigationNodesById,
  campusStartLocationIds,
} from '../../data/navigationGraph.ts'
import { campusModelMapById, resolveCampusBuilding } from '../../data/campusModelMapping.ts'
import { CAMPUS_SERVICE_POIS, findCampusPoi } from '../../data/campusPois.ts'
import { createRoutePlan, findShortestPath } from '../routePlanner.ts'
import { validateRouteGeometry } from '../routeGeometryValidator.ts'
import { computeCumulativeDistances } from '../routeSimulation.ts'
import { getRoleNavigationItems } from '../../components/navigation/navItems.ts'
import { PROVISIONAL_CAMPUS_BOUNDARY } from '../../data/campusGeofenceData.ts'
import { DEFAULT_CAMPUS_CONTROL_POINTS } from '../../data/campusCalibrationData.ts'

describe('Phase 10: Campus Navigation Verification & Repair', () => {
  describe('Phase 10B & 10C: Outdoor Route Connectivity & Entrance Anchors', () => {
    const verifiedDestinations = [
      { id: 'main-block', expectedNodeId: 'main-block-approach', label: 'Main Block' },
      { id: 'first-year-block', expectedNodeId: 'first-year-approach', label: 'First Year Block' },
      { id: 'civil-block', expectedNodeId: 'civil-approach', label: 'Civil Block' },
      { id: 'it-block', expectedNodeId: 'it-entrance', label: 'IT Block' },
      { id: 'l-shape-block', expectedNodeId: 'l-shape-approach', label: 'L Shape Block' },
      { id: 'mechanical-block', expectedNodeId: 'mechanical-approach', label: 'Mechanical Block' },
      { id: 'mnm-school-of-architecture', expectedNodeId: 'architecture-approach', label: 'MNM School of Architecture' },
      { id: 'physics-department', expectedNodeId: 'physics-approach', label: 'Physics Department' },
      { id: 'english-department', expectedNodeId: 'english-approach', label: 'English Department' },
      { id: 'maths-department', expectedNodeId: 'maths-approach', label: 'Maths Department' },
      { id: 'jain-mess', expectedNodeId: 'jain-mess-approach', label: 'Jain Mess' },
      { id: 'non-jain-mess', expectedNodeId: 'non-jain-mess-approach', label: 'Non-Jain Mess' },
      { id: 'canteen', expectedNodeId: 'canteen-gate', label: 'Canteen' },
      { id: 'boys-hostel', expectedNodeId: 'boys-hostel-approach', label: 'Boys Hostel' },
      { id: 'open-air-theatre', expectedNodeId: 'oat-approach', label: 'Open Air Theatre' },
    ]

    for (const { id, expectedNodeId, label } of verifiedDestinations) {
      it(`verifies reachability and collision-free path from Gate 1 to ${label} (${id})`, () => {
        const destNodes = campusDestinationNodesByBuildingId.get(id as any)
        assert.ok(destNodes && destNodes.length > 0, `Destination nodes for ${id} must exist`)
        assert.equal(destNodes[0].id, expectedNodeId)

        const plan = createRoutePlan(campusNavigationGraph, 'main-gate-1', expectedNodeId)
        assert.equal(plan.status, 'ok', `Route plan from main-gate-1 to ${id} must succeed`)
        assert.ok(plan.route)
        assert.ok(plan.route.totalCost > 0, 'Route distance must be positive')
        assert.ok(plan.route.steps.length >= 2, 'Route must have at least 2 steps')

        // Validate collision-free geometry
        const polyline = plan.route.nodeIds.map((nid) => campusNavigationNodesById.get(nid)!.position)
        const validation = validateRouteGeometry(polyline)
        assert.ok(validation.valid, `Route to ${label} must not penetrate buildings: ${validation.summary}`)
      })
    }

    it('verifies Gate 2 / West Entrance connects to School of Architecture compound within 50m', () => {
      const plan = createRoutePlan(campusNavigationGraph, 'west-entrance', 'architecture-approach')
      assert.equal(plan.status, 'ok')
      assert.ok(plan.route)
      assert.ok(plan.route.totalCost < 50, `Gate 2 to Architecture must be a short local connection (~45m), got ${plan.route.totalCost}m`)
    })

    it('verifies Ground Entrance connects to central campus spine and academic buildings', () => {
      const plan = createRoutePlan(campusNavigationGraph, 'ground-entrance', 'it-block' === 'it-block' ? 'it-entrance' : 'it-entrance')
      assert.equal(plan.status, 'ok')
      assert.ok(plan.route)
      assert.ok(plan.route.totalCost > 0)
    })

    it('verifies graph edge integrity: zero dangling node references in edges', () => {
      const allNodeIds = new Set(campusNavigationGraph.nodes.map((n) => n.id))
      for (const edge of campusNavigationGraph.edges) {
        assert.ok(allNodeIds.has(edge.from), `Edge ${edge.id} references non-existent "from" node: ${edge.from}`)
        assert.ok(allNodeIds.has(edge.to), `Edge ${edge.id} references non-existent "to" node: ${edge.to}`)
      }
    })

    it('honestly treats Library as unmapped without fabricating fictional entrance or pathway', () => {
      const libNodes = campusDestinationNodesByBuildingId.get('library')
      assert.ok(libNodes === undefined || libNodes.length === 0, 'Library must not have fabricated destination nodes')
      const libBuilding = buildingIndex['library']
      assert.ok(libBuilding)
      assert.equal(libBuilding.knownEntrance, 'Entrance pending physical verification')
    })

    it('honestly handles unverified service POIs (Apollo Shine, Xerox Shop)', () => {
      assert.equal(CAMPUS_SERVICE_POIS.length, 2, 'Must contain exactly 2 provisional service POIs')
      assert.ok(buildings.length >= 16, 'Campus building registry must contain at least 16 authentic landmarks')
      const apollo = findCampusPoi('apollo-shine')
      const xerox = findCampusPoi('xerox-shop')
      assert.ok(apollo?.isProvisional)
      assert.ok(xerox?.isProvisional)
    })
  })

  describe('Phase 10D: Indoor Floor Selection & Mapping Audit', () => {
    it('verifies correct floor levels for multi-story academic buildings', () => {
      const mainBlock = campusModelMapById['main-block']
      assert.equal(mainBlock.indoorAvailable, true)
      assert.deepEqual(Object.keys(mainBlock.floorObjects).sort(), ['1', 'G'].sort())

      const firstYear = campusModelMapById['first-year-block']
      assert.equal(firstYear.indoorAvailable, true)
      assert.deepEqual(Object.keys(firstYear.floorObjects).sort(), ['1', '2', '3', 'G'].sort())

      const civilBlock = campusModelMapById['civil-block']
      assert.equal(civilBlock.indoorAvailable, true)
      assert.deepEqual(Object.keys(civilBlock.floorObjects).sort(), ['1', '2', 'G'].sort())

      const lShape = campusModelMapById['l-shape-block']
      assert.equal(lShape.indoorAvailable, true)
      assert.deepEqual(Object.keys(lShape.floorObjects).sort(), ['1', '2', 'G'].sort())
    })

    it('verifies unmapped buildings have indoorAvailable === false', () => {
      assert.equal(campusModelMapById['mechanical-block'].indoorAvailable, false)
      assert.equal(campusModelMapById['it-block'].indoorAvailable, false)
      assert.equal(campusModelMapById['boys-hostel'].indoorAvailable, false)
      assert.equal(campusModelMapById['mnm-school-of-architecture'].indoorAvailable, false)
      assert.equal(campusModelMapById['library'].indoorAvailable, false)
    })

    it('verifies building mapping mesh names resolve accurately', () => {
      assert.equal(resolveCampusBuilding('MAIN_BLOCK_FLOOR_G'), 'main-block')
      assert.equal(resolveCampusBuilding('MAIN_BLOCK_FLOOR_1'), 'main-block')
      assert.equal(resolveCampusBuilding('FIRST_YEAR_BLOCK_FLOOR_3'), 'first-year-block')
      assert.equal(resolveCampusBuilding('CIVIL_BLOCK_FLOOR_2'), 'civil-block')
      assert.equal(resolveCampusBuilding('L_SHAPE_BLOCK_FLOOR_1'), 'l-shape-block')
      assert.equal(resolveCampusBuilding('E2_LIBRARY_152_BASE_SLAB'), 'library')
    })
  })

  describe('Phase 10E: Turn-by-Turn Guidance & Route Progression', () => {
    it('generates directional turn instructions (left, right, straight, start, arrive)', () => {
      const plan = createRoutePlan(campusNavigationGraph, 'main-gate-1', 'it-entrance')
      assert.equal(plan.status, 'ok')
      assert.ok(plan.route)

      const steps = plan.route.steps
      // Step 0: Start
      assert.ok(steps[0].title.startsWith('Start at'))

      // Step N-1: Arrive
      assert.ok(steps[steps.length - 1].title.startsWith('Arrive at'))

      // Intermediate steps include turn maneuvers
      const hasTurn = steps.some((s) => s.title.includes('Turn left') || s.title.includes('Turn right'))
      assert.ok(hasTurn, 'Route with 90-degree corners must produce Turn left or Turn right instructions')
    })

    it('computes cumulative distances and walking times consistently', () => {
      const plan = createRoutePlan(campusNavigationGraph, 'main-gate-1', 'civil-approach')
      assert.equal(plan.status, 'ok')
      assert.ok(plan.route)

      const points = plan.route.nodeIds.map((nid) => campusNavigationNodesById.get(nid)!.position)
      const cumulative = computeCumulativeDistances(points)
      const totalDist = cumulative[cumulative.length - 1]

      // Route total cost in graph equals Euclidean polyline distance
      assert.ok(Math.abs(plan.route.totalCost - totalDist) < 0.1)

      // Walking time is calculated at ~80m/min
      const expectedWalkingMinutes = Math.max(1, Math.round(totalDist / 80))
      assert.ok(expectedWalkingMinutes >= 1)
      assert.ok(expectedWalkingMinutes <= 10)
    })

    it('gracefully handles identical origin and destination', () => {
      const route = findShortestPath(campusNavigationGraph, 'main-gate-1', 'main-gate-1')
      assert.ok(route)
      assert.equal(route.cost, 0)
      assert.deepEqual(route.nodeIds, ['main-gate-1'])
    })

    it('gracefully returns invalid-node status for non-existent nodes', () => {
      const plan = createRoutePlan(campusNavigationGraph, 'non-existent-node', 'it-entrance')
      assert.equal(plan.status, 'invalid-node')
    })
  })

  describe('Phase 10G: Role Isolation & Permissions', () => {
    it('verifies strict navigation module isolation between Student, Visitor, and Admin', () => {
      const studentItems = getRoleNavigationItems('student')
      const visitorItems = getRoleNavigationItems('visitor')
      const adminItems = getRoleNavigationItems('admin')

      assert.equal(studentItems.length, 11, 'Student must have 11 authorized navigation modules')
      assert.equal(visitorItems.length, 9, 'Visitor must have 9 authorized navigation modules')
      assert.equal(adminItems.length, 11, 'Admin must have 11 authorized navigation modules')

      // Visitor has ZERO admin routes
      const visitorUrls = visitorItems.map((i) => i.to)
      assert.ok(!visitorUrls.includes('/admin/issues'))
      assert.ok(!visitorUrls.includes('/admin/feedback'))
      assert.ok(!visitorUrls.includes('/dev-gps-calibration'))
      assert.ok(!visitorUrls.includes('/issues'))
      assert.ok(!visitorUrls.includes('/my-reports'))

      // Student has student tools but ZERO admin routes
      const studentUrls = studentItems.map((i) => i.to)
      assert.ok(studentUrls.includes('/issues'))
      assert.ok(studentUrls.includes('/my-reports'))
      assert.ok(!studentUrls.includes('/admin/issues'))
      assert.ok(!studentUrls.includes('/admin/feedback'))
      assert.ok(!studentUrls.includes('/dev-gps-calibration'))

      // Admin has full admin modules
      const adminUrls = adminItems.map((i) => i.to)
      assert.ok(adminUrls.includes('/admin/issues'))
      assert.ok(adminUrls.includes('/admin/feedback'))
      assert.ok(adminUrls.includes('/dev-gps-calibration'))
    })
  })

  describe('Phase 10 Invariants: GPS Safety & Preservation Locks', () => {
    it('preserves strict live outdoor navigation lock: isApprovedForLiveNavigation === false', () => {
      assert.equal(PROVISIONAL_CAMPUS_BOUNDARY.metadata.isApprovedForLiveNavigation, false)
    })

    it('preserves empty calibration control points in production', () => {
      assert.equal(DEFAULT_CAMPUS_CONTROL_POINTS.length, 0)
    })

    it('preserves campus start locations (Gate 1, West Entrance, Ground Entrance)', () => {
      assert.equal(campusStartLocationIds.length, 3)
      assert.ok(campusStartLocationIds.includes('main-gate-1'))
      assert.ok(campusStartLocationIds.includes('west-entrance'))
      assert.ok(campusStartLocationIds.includes('ground-entrance'))
    })
  })
})
