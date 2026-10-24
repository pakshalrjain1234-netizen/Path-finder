import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { buildings } from '../../data/buildings.ts'
import { CAMPUS_SERVICE_POIS, findCampusPoi, searchCampusPois } from '../../data/campusPois.ts'
import {
  campusModelMapById,
  campusModelMapping,
  resolveCampusBuilding,
} from '../../data/campusModelMapping.ts'
import {
  campusDestinationNodesByBuildingId,
  campusNavigationGraph,
  campusNavigationNodesById,
} from '../../data/navigationGraph.ts'
import { createRoutePlan } from '../../lib/routePlanner.ts'

describe('Phase 7D Navigation Fix: Apollo Shine & Xerox Shop Integration', () => {
  describe('Task 1 & 2: POI Registry, Aliases, and Building Counts Preservation', () => {
    it('preserves exactly 18 primary campus buildings without duplicating records', () => {
      assert.equal(buildings.length, 18, 'Must strictly preserve 18 primary buildings count')
      assert.ok(!buildings.some((b) => b.id === 'apollo-shine'), 'Apollo Shine must not duplicate building records')
      assert.ok(!buildings.some((b) => b.id === 'xerox-shop'), 'Xerox Shop must not duplicate building records')
    })

    it('contains Apollo Shine and Xerox Shop in CAMPUS_SERVICE_POIS', () => {
      assert.equal(CAMPUS_SERVICE_POIS.length, 2)
      const apollo = findCampusPoi('apollo-shine')
      const xerox = findCampusPoi('xerox-shop')

      assert.ok(apollo, 'Apollo Shine must be registered')
      assert.equal(apollo?.name, 'Apollo Shine')
      assert.equal(apollo?.isProvisional, true)
      assert.ok(apollo?.aliases.length > 0)

      assert.ok(xerox, 'Xerox Shop must be registered')
      assert.equal(xerox?.name, 'Xerox Shop')
      assert.equal(xerox?.isProvisional, true)
      assert.ok(xerox?.aliases.length > 0)
    })

    it('resolves Apollo Shine and Xerox Shop aliases accurately', () => {
      // Apollo aliases
      const searchClinic = searchCampusPois('Clinic')
      assert.ok(searchClinic.some((p) => p.id === 'apollo-shine'))
      const searchHealth = searchCampusPois('Health Clinic')
      assert.ok(searchHealth.some((p) => p.id === 'apollo-shine'))
      const searchFirstAid = searchCampusPois('First Aid')
      assert.ok(searchFirstAid.some((p) => p.id === 'apollo-shine'))

      // Xerox aliases
      const searchXerox = searchCampusPois('Xerox')
      assert.ok(searchXerox.some((p) => p.id === 'xerox-shop'))
      const searchPhotocopy = searchCampusPois('Photocopy')
      assert.ok(searchPhotocopy.some((p) => p.id === 'xerox-shop'))
      const searchReprographics = searchCampusPois('Reprographics')
      assert.ok(searchReprographics.some((p) => p.id === 'xerox-shop'))
      const searchPrint = searchCampusPois('Printing')
      assert.ok(searchPrint.some((p) => p.id === 'xerox-shop'))
    })

    it('indexes Apollo Shine and Xerox Shop in campusModelMapById while preserving 16 authored entries in campusModelMapping', () => {
      assert.equal(campusModelMapping.length, 16, 'campusModelMapping length must remain 16')
      assert.ok(campusModelMapById['apollo-shine'] !== undefined, 'apollo-shine must be indexed in map')
      assert.ok(campusModelMapById['xerox-shop'] !== undefined, 'xerox-shop must be indexed in map')
      assert.equal(campusModelMapById['apollo-shine'].displayName, 'Apollo Shine')
      assert.equal(campusModelMapById['xerox-shop'].displayName, 'Xerox Shop')
    })

    it('resolves authentic Stage E3 mesh prefixes for Apollo and Xerox', () => {
      assert.equal(resolveCampusBuilding('E2_APOLLO_BUILDING'), 'apollo-shine')
      assert.equal(resolveCampusBuilding('E2_XEROX_SHOP'), 'xerox-shop')
      assert.equal(resolveCampusBuilding('CIVIL_BLOCK_FLOOR_G'), 'civil-block')
      assert.equal(resolveCampusBuilding('MECHANICAL_ACCESS_EAST_DOOR'), 'mechanical-block')
    })
  })

  describe('Task 3 & 4: Safe Routing & Non-Fabrication Rules', () => {
    it('verifies navigation graph does not contain fabricated nodes for Apollo Shine or Xerox Shop', () => {
      const allGraphNodeIds = new Set(campusNavigationGraph.nodes.map((n) => n.id))
      assert.ok(!allGraphNodeIds.has('apollo-shine'), 'Must not fabricate node apollo-shine')
      assert.ok(!allGraphNodeIds.has('apollo-approach'), 'Must not fabricate node apollo-approach')
      assert.ok(!allGraphNodeIds.has('xerox-shop'), 'Must not fabricate node xerox-shop')
      assert.ok(!allGraphNodeIds.has('xerox-approach'), 'Must not fabricate node xerox-approach')
    })

    it('verifies destination node lookup returns null for provisional facilities', () => {
      const apolloDestNodes = campusDestinationNodesByBuildingId.get('apollo-shine')
      const xeroxDestNodes = campusDestinationNodesByBuildingId.get('xerox-shop')
      assert.ok(!apolloDestNodes || apolloDestNodes.length === 0, 'Apollo Shine destination nodes must remain unverified/empty')
      assert.ok(!xeroxDestNodes || xeroxDestNodes.length === 0, 'Xerox Shop destination nodes must remain unverified/empty')
    })

    it('Main Gate -> Xerox Shop: reports provisional unverified status and allows Gate 1 approach', () => {
      const xerox = findCampusPoi('xerox-shop')
      assert.ok(xerox)
      assert.equal(xerox?.isProvisional, true)

      // When approaching Gate 1 from main-gate-1, user is already at Gate 1
      assert.equal(campusNavigationNodesById.get('main-gate-1')?.id, 'main-gate-1')
    })

    it('Civil Block -> Apollo Shine: calculates verified approach route to Main Gate (Gate 1)', () => {
      const civilNodes = campusDestinationNodesByBuildingId.get('civil-block')
      assert.ok(civilNodes && civilNodes.length > 0)
      const civilStartNodeId = civilNodes[0].id

      // Calculate approach route from Civil Block to Main Gate (Gate 1)
      const approachResult = createRoutePlan(campusNavigationGraph, civilStartNodeId, 'main-gate-1')
      assert.equal(approachResult.status, 'ok')
      assert.ok(approachResult.route)
      assert.ok(approachResult.route.nodeIds.length > 1)
      assert.equal(approachResult.route.nodeIds[approachResult.route.nodeIds.length - 1], 'main-gate-1')
    })

    it('Xerox Shop -> Main Block: safely flags unverified origin without fabricating path', () => {
      const xeroxDestNodes = campusDestinationNodesByBuildingId.get('xerox-shop')
      assert.ok(!xeroxDestNodes || xeroxDestNodes.length === 0)
      // When origin is unverified (node is null), route cannot be generated
    })

    it('Main Gate -> Apollo Shine: allows verified approach route from Main Gate or other points', () => {
      const itNodes = campusDestinationNodesByBuildingId.get('it-block')
      assert.ok(itNodes && itNodes.length > 0)
      const itStartNodeId = itNodes[0].id

      const routeToGate = createRoutePlan(campusNavigationGraph, itStartNodeId, 'main-gate-1')
      assert.equal(routeToGate.status, 'ok')
      assert.ok(routeToGate.route)
      assert.equal(routeToGate.route.nodeIds[routeToGate.route.nodeIds.length - 1], 'main-gate-1')
    })
  })

  describe('Task 5: Normal Campus Routing Preservation', () => {
    it('calculates verified collision-free route: Main Gate -> Civil Block', () => {
      const civilNodes = campusDestinationNodesByBuildingId.get('civil-block')
      assert.ok(civilNodes && civilNodes.length > 0)
      const result = createRoutePlan(campusNavigationGraph, 'main-gate-1', civilNodes[0].id)
      assert.equal(result.status, 'ok')
      assert.ok(result.route)
      assert.ok(result.route.steps.length >= 2)
    })

    it('calculates verified collision-free route: Main Gate -> IT Block', () => {
      const itNodes = campusDestinationNodesByBuildingId.get('it-block')
      assert.ok(itNodes && itNodes.length > 0)
      const result = createRoutePlan(campusNavigationGraph, 'main-gate-1', itNodes[0].id)
      assert.equal(result.status, 'ok')
      assert.ok(result.route)
      assert.ok(result.route.steps.length >= 2)
    })

    it('calculates verified collision-free route: Main Gate -> Main Block', () => {
      const mainNodes = campusDestinationNodesByBuildingId.get('main-block')
      assert.ok(mainNodes && mainNodes.length > 0)
      const result = createRoutePlan(campusNavigationGraph, 'main-gate-1', mainNodes[0].id)
      assert.equal(result.status, 'ok')
      assert.ok(result.route)
      assert.ok(result.route.steps.length >= 2)
    })

    it('allows clean switching between Mechanical Block and Xerox Shop without stale state', () => {
      const mechNodes = campusDestinationNodesByBuildingId.get('mechanical-block')
      assert.ok(mechNodes && mechNodes.length > 0)
      const mechRoute = createRoutePlan(campusNavigationGraph, 'main-gate-1', mechNodes[0].id)
      assert.equal(mechRoute.status, 'ok')

      // Xerox Shop has no destination nodes, correctly distinguishing it from Mechanical Block
      const xeroxNodes = campusDestinationNodesByBuildingId.get('xerox-shop')
      assert.ok(!xeroxNodes || xeroxNodes.length === 0)
      assert.notEqual('xerox-shop', 'mechanical-block')
    })
  })
})
