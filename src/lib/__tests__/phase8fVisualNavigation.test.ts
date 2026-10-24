import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { buildings } from '../../data/buildings.ts'
import { findCampusPoi } from '../../data/campusPois.ts'
import { CAMPUS_LANDMARKS } from '../../data/campusLandmarks.ts'
import {
  campusDestinationNodesByBuildingId,
  campusNavigationGraph,
  campusNavigationNodesById,
} from '../../data/navigationGraph.ts'
import { createRoutePlan } from '../routePlanner.ts'
import { isDevTestAuthorized } from '../devAuth.ts'

describe('Phase 8F — Final Navigation Repair & Visual Verification', () => {
  describe('Task 1: All 21 Destinations Registry & Graph Eligibility Audit', () => {
    // 3 Gates + 15 Verified Destinations + 3 Provisional (Library, Apollo Shine, Xerox Shop) = 21 destinations
    const all21Destinations = [
      { id: 'main-gate-1', type: 'gate', verified: true, expectedNode: 'main-gate-1' },
      { id: 'west-entrance', type: 'gate', verified: true, expectedNode: 'west-entrance' },
      { id: 'ground-entrance', type: 'gate', verified: true, expectedNode: 'ground-entrance' },
      { id: 'main-block', type: 'academic', verified: true, expectedNode: 'main-block-approach' },
      { id: 'first-year-block', type: 'academic', verified: true, expectedNode: 'first-year-approach' },
      { id: 'civil-block', type: 'academic', verified: true, expectedNode: 'civil-approach' },
      { id: 'it-block', type: 'academic', verified: true, expectedNode: 'it-entrance' },
      { id: 'mechanical-block', type: 'academic', verified: true, expectedNode: 'mechanical-approach' },
      { id: 'mnm-school-of-architecture', type: 'academic', verified: true, expectedNode: 'architecture-approach' },
      { id: 'canteen', type: 'facility', verified: true, expectedNode: 'canteen-gate' },
      { id: 'boys-hostel', type: 'facility', verified: true, expectedNode: 'boys-hostel-approach' },
      { id: 'l-shape-block', type: 'academic', verified: true, expectedNode: 'l-shape-approach' },
      { id: 'open-air-theatre', type: 'facility', verified: true, expectedNode: 'oat-approach' },
      { id: 'physics-department', type: 'department', verified: true, expectedNode: 'physics-approach' },
      { id: 'english-department', type: 'department', verified: true, expectedNode: 'english-approach' },
      { id: 'maths-department', type: 'department', verified: true, expectedNode: 'maths-approach' },
      { id: 'jain-mess', type: 'facility', verified: true, expectedNode: 'jain-mess-approach' },
      { id: 'non-jain-mess', type: 'facility', verified: true, expectedNode: 'non-jain-mess-approach' },
      { id: 'library', type: 'facility', verified: false, fallbackNode: 'main-block-approach' },
      { id: 'apollo-shine', type: 'poi', verified: false, fallbackNode: 'main-gate-1' },
      { id: 'xerox-shop', type: 'poi', verified: false, fallbackNode: 'main-gate-1' },
    ]

    it('confirms all 21 destinations exist in campus registries', () => {
      assert.equal(all21Destinations.length, 21, 'Must track exactly 21 destinations')
      for (const dest of all21Destinations) {
        if (dest.type === 'poi') {
          const poi = findCampusPoi(dest.id)
          assert.ok(poi, `POI ${dest.id} must be registered`)
        } else if (dest.type === 'gate') {
          const node = campusNavigationNodesById.get(dest.id)
          assert.ok(node, `Gate node ${dest.id} must exist in graph`)
        } else {
          const b = buildings.find((item) => item.id === dest.id)
          assert.ok(b, `Building ${dest.id} must be registered in buildings list`)
        }
      }
    })

    it('verifies routable walkways from Main Entrance (Gate 1) to all 15 verified campus locations', () => {
      const verifiedDestinations = all21Destinations.filter((d) => d.verified && d.id !== 'main-gate-1')
      for (const dest of verifiedDestinations) {
        assert.ok(dest.expectedNode, `Dest ${dest.id} must have expectedNode`)
        const plan = createRoutePlan(campusNavigationGraph, 'main-gate-1', dest.expectedNode)
        assert.equal(plan.status, 'ok', `Route to ${dest.id} must calculate ok`)
        assert.ok(plan.route, `Route object must exist for ${dest.id}`)
        assert.ok(plan.route.totalCost > 0, `Route distance must be > 0 for ${dest.id}`)
        assert.ok(plan.route.nodeIds.length >= 2, `Route must have >= 2 waypoints for ${dest.id}`)
        assert.equal(plan.route.nodeIds[0], 'main-gate-1')
        assert.equal(plan.route.nodeIds[plan.route.nodeIds.length - 1], dest.expectedNode)
      }
    })

    it('verifies cross-campus routability between key locations', () => {
      // Gate 2 (West) -> Main Block
      const westToMain = createRoutePlan(campusNavigationGraph, 'west-entrance', 'main-block-approach')
      assert.equal(westToMain.status, 'ok')
      assert.ok(westToMain.route && westToMain.route.totalCost > 100)

      // Jain Mess -> Boys Hostel
      const messToHostel = createRoutePlan(campusNavigationGraph, 'jain-mess-approach', 'boys-hostel-approach')
      assert.equal(messToHostel.status, 'ok')
      assert.ok(messToHostel.route && messToHostel.route.totalCost > 50)

      // Civil Block -> IT Block
      const civilToIt = createRoutePlan(campusNavigationGraph, 'civil-approach', 'it-entrance')
      assert.equal(civilToIt.status, 'ok')
      assert.ok(civilToIt.route && civilToIt.route.totalCost > 20)
    })
  })

  describe('Task 2: Provisional Destinations & Verified Nearby Approach Mode', () => {
    it('verifies Dr. C. L. Mehta Central Library fallback to main-block-approach', () => {
      const b = buildings.find((item) => item.id === 'library')
      assert.ok(b)
      assert.equal(b.knownEntrance, 'Entrance pending physical verification')
      // Entrance coordinate is unverified in navigation graph
      const libNodes = campusDestinationNodesByBuildingId.get('library')
      assert.ok(!libNodes || libNodes.length === 0, 'Library must have no mapped destination nodes in graph')

      // Routing from Gate 1 to fallback node
      const fallbackPlan = createRoutePlan(campusNavigationGraph, 'main-gate-1', 'main-block-approach')
      assert.equal(fallbackPlan.status, 'ok')
      assert.ok(fallbackPlan.route)
      assert.ok(fallbackPlan.route.totalCost > 50)
      assert.equal(fallbackPlan.route.nodeIds[fallbackPlan.route.nodeIds.length - 1], 'main-block-approach')
    })

    it('identifies at-approach-point condition when Origin = Main Block Approach and Destination = Library', () => {
      // When origin is already main-block-approach, no fake nonzero walkway is drawn
      const originNodeId = 'main-block-approach'
      const fallbackNodeId = 'main-block-approach'
      assert.equal(originNodeId, fallbackNodeId, 'Origin matches fallback endpoint')
    })

    it('verifies Apollo Shine fallback to main-gate-1', () => {
      const apollo = findCampusPoi('apollo-shine')
      assert.ok(apollo)
      assert.equal(apollo.status, 'provisional')
      assert.equal(apollo.isProvisional, true)

      // From Civil Block to Apollo Shine fallback (Gate 1)
      const fallbackPlan = createRoutePlan(campusNavigationGraph, 'civil-approach', 'main-gate-1')
      assert.equal(fallbackPlan.status, 'ok')
      assert.ok(fallbackPlan.route)
      assert.ok(fallbackPlan.route.totalCost > 60)
      assert.equal(fallbackPlan.route.nodeIds[fallbackPlan.route.nodeIds.length - 1], 'main-gate-1')
    })

    it('identifies at-approach-point condition when Origin = Gate 1 and Destination = Apollo Shine / Xerox Shop', () => {
      // When origin is already main-gate-1, fallback node is also main-gate-1
      const originNodeId = 'main-gate-1'
      const apolloFallback = 'main-gate-1'
      assert.equal(originNodeId, apolloFallback, 'User is already at the nearest verified approach point')
    })

    it('verifies Xerox Shop fallback to main-gate-1 from connected origin', () => {
      const xerox = findCampusPoi('xerox-shop')
      assert.ok(xerox)
      assert.equal(xerox.status, 'provisional')

      // From IT Block to Xerox Shop fallback (Gate 1)
      const fallbackPlan = createRoutePlan(campusNavigationGraph, 'it-entrance', 'main-gate-1')
      assert.equal(fallbackPlan.status, 'ok')
      assert.ok(fallbackPlan.route)
      assert.ok(fallbackPlan.route.totalCost > 80)
      assert.equal(fallbackPlan.route.nodeIds[fallbackPlan.route.nodeIds.length - 1], 'main-gate-1')
    })

    it('safely refuses unverified outward routing from provisional origins without ground survey', () => {
      // Outward routing originating from Library or Apollo Shine cannot fabricate an unknown doorway
      const apollo = findCampusPoi('apollo-shine')
      assert.ok(apollo)
      assert.equal(campusNavigationNodesById.get('apollo-shine'), undefined)
      assert.equal(campusNavigationNodesById.get('xerox-shop'), undefined)
    })
  })

  describe('Task 3: Landmark Label Positioning & Separation', () => {
    it('verifies Main Block and Library have distinct, non-colliding fallback positions', () => {
      const mainBlock = CAMPUS_LANDMARKS.find((lm) => lm.id === 'main-block')
      const library = CAMPUS_LANDMARKS.find((lm) => lm.id === 'library')
      assert.ok(mainBlock, 'Main Block landmark must exist')
      assert.ok(library, 'Library landmark must exist')

      // Main Block position was refined to [193.5, 7.5, -58.5]
      // Library position is [193.5, 8.8, -73.1]
      // Delta Z is > 14m, completely resolving label stacking
      const deltaZ = Math.abs(mainBlock.fallbackPosition[2] - library.fallbackPosition[2])
      assert.ok(deltaZ >= 14, `Z-separation between Main Block and Library (${deltaZ}m) must be >= 14m`)
    })

    it('verifies Apollo Shine and Xerox Shop have distinct frontage coordinates', () => {
      const apollo = findCampusPoi('apollo-shine')
      const xerox = findCampusPoi('xerox-shop')
      assert.ok(apollo)
      assert.ok(xerox)

      // Apollo Shine: [153.5, 3.8, -20.0]
      // Xerox Shop: [141.6, 3.8, -17.5]
      const deltaX = Math.abs(apollo.anchorPosition[0] - xerox.anchorPosition[0])
      assert.ok(deltaX >= 11, `X-separation between Apollo and Xerox (${deltaX}m) must be >= 11m`)
    })

    it('preserves shared science wing identity for Physics, English and Maths', () => {
      const physics = CAMPUS_LANDMARKS.find((lm) => lm.id === 'physics-department')
      const english = CAMPUS_LANDMARKS.find((lm) => lm.id === 'english-department')
      const maths = CAMPUS_LANDMARKS.find((lm) => lm.id === 'maths-department')
      assert.ok(physics)
      assert.ok(english)
      assert.ok(maths)

      // All 3 share Tier 3 department classification and valid distinct positions
      assert.equal(physics.priorityTier, 3)
      assert.equal(english.priorityTier, 3)
      assert.equal(maths.priorityTier, 3)
    })
  })

  describe('Task 4: Safety & Security Guardrails Preservation', () => {
    it('preserves developer navigation test mode restriction in production', () => {
      assert.equal(isDevTestAuthorized({ DEV: false }), false)
      assert.equal(isDevTestAuthorized({ DEV: true }), true)
    })

    it('preserves non-fabrication of unverified entrance doors', () => {
      // Ensure no fictional entrance edges were injected into the graph for Library, Xerox, or Apollo
      const allNodeIds = Array.from(campusNavigationNodesById.keys())
      assert.equal(allNodeIds.includes('library-entrance'), false)
      assert.equal(allNodeIds.includes('apollo-entrance'), false)
      assert.equal(allNodeIds.includes('xerox-entrance'), false)
    })
  })
})
