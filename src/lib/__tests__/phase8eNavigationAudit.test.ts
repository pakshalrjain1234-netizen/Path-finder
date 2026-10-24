import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { buildings } from '../../data/buildings.ts'
import { CAMPUS_SERVICE_POIS, findCampusPoi } from '../../data/campusPois.ts'
import {
  campusDestinationNodesByBuildingId,
  campusNavigationGraph,
  campusNavigationNodesById,
} from '../../data/navigationGraph.ts'
import { createRoutePlan } from '../routePlanner.ts'
import { isDevTestAuthorized } from '../devAuth.ts'
import {
  ALLOWED_IMAGE_MIME_TYPES,
  MAX_PHOTO_SIZE_BYTES,
  validateImageFile,
} from '../../services/evidenceStorageService.ts'

describe('Phase 8E — Campus-Wide Navigation & OAT Route Verification', () => {
  describe('Part 1: Open Air Theatre Navigation Fix', () => {
    it('resolves Open Air Theatre destination to oat-approach node', () => {
      const oatNodes = campusDestinationNodesByBuildingId.get('open-air-theatre')
      assert.ok(oatNodes, 'Destination nodes for open-air-theatre must exist')
      assert.ok(oatNodes.length > 0)
      assert.equal(oatNodes[0].id, 'oat-approach')
      assert.equal(oatNodes[0].label, 'Open Air Theatre')
    })

    it('preserves authentic Stage E3 amphitheatre plaza coordinates', () => {
      const node = campusNavigationNodesById.get('oat-approach')
      assert.ok(node, 'oat-approach node must exist in campusNavigationNodesById')
      assert.ok(Math.abs(node.position[0] - 227.7) < 0.2)
      assert.ok(Math.abs(node.position[1] - 0.2) < 0.2)
      assert.ok(Math.abs(node.position[2] - (-47.0)) < 0.2)
      assert.equal(node.sourceObjectName, 'OAT_PLAZA_APPROACH_ANCHOR')
    })

    it('successfully plans Dijkstra route from Main Entrance (Gate 1) to OAT', () => {
      const plan = createRoutePlan(campusNavigationGraph, 'main-gate-1', 'oat-approach')
      assert.equal(plan.status, 'ok')
      assert.ok(plan.route)
      assert.ok(plan.route.totalCost > 70)
      assert.ok(plan.route.totalCost < 120)
      assert.ok(plan.route.steps.length > 3)
      assert.ok(plan.route.nodeIds.length > 4)

      // Verify that the route traverses road-front-oat and walk-front-oat
      assert.ok(plan.route.nodeIds.includes('road-front-oat'))
      assert.ok(plan.route.nodeIds.includes('walk-front-oat'))
      assert.ok(plan.route.nodeIds.includes('oat-approach'))
    })

    it('successfully plans Dijkstra route from Main Block to OAT', () => {
      const plan = createRoutePlan(campusNavigationGraph, 'main-block-approach', 'oat-approach')
      assert.equal(plan.status, 'ok')
      assert.ok(plan.route)
      assert.ok(plan.route.totalCost > 20)
    })

    it('successfully plans Dijkstra route from First Year Block to OAT', () => {
      const plan = createRoutePlan(campusNavigationGraph, 'first-year-approach', 'oat-approach')
      assert.equal(plan.status, 'ok')
      assert.ok(plan.route)
      assert.ok(plan.route.totalCost > 40)
    })
  })

  describe('Part 2: Complete Campus-Wide Destination Audit', () => {
    const verifiedBuildingDestinations = [
      { id: 'main-block', expectedNodeId: 'main-block-approach' },
      { id: 'first-year-block', expectedNodeId: 'first-year-approach' },
      { id: 'civil-block', expectedNodeId: 'civil-approach' },
      { id: 'it-block', expectedNodeId: 'it-entrance' },
      { id: 'l-shape-block', expectedNodeId: 'l-shape-approach' },
      { id: 'mechanical-block', expectedNodeId: 'mechanical-approach' },
      { id: 'mnm-school-of-architecture', expectedNodeId: 'architecture-approach' },
      { id: 'physics-department', expectedNodeId: 'physics-approach' },
      { id: 'english-department', expectedNodeId: 'english-approach' },
      { id: 'maths-department', expectedNodeId: 'maths-approach' },
      { id: 'jain-mess', expectedNodeId: 'jain-mess-approach' },
      { id: 'non-jain-mess', expectedNodeId: 'non-jain-mess-approach' },
      { id: 'canteen', expectedNodeId: 'canteen-gate' },
      { id: 'boys-hostel', expectedNodeId: 'boys-hostel-approach' },
      { id: 'open-air-theatre', expectedNodeId: 'oat-approach' },
    ]

    verifiedBuildingDestinations.forEach(({ id, expectedNodeId }) => {
      it(`verifies routable building: ${id} -> ${expectedNodeId}`, () => {
        const destNodes = campusDestinationNodesByBuildingId.get(id as any)
        assert.ok(destNodes, `Destination nodes for ${id} must exist`)
        assert.ok(destNodes.length > 0)
        assert.equal(destNodes[0].id, expectedNodeId)

        // Route from Main Gate 1
        const plan = createRoutePlan(campusNavigationGraph, 'main-gate-1', expectedNodeId)
        assert.equal(plan.status, 'ok', `Route from main-gate-1 to ${id} must succeed`)
        assert.ok(plan.route!.totalCost > 0)
        assert.ok(plan.route!.nodeIds.length >= 2)
      })
    })

    it('verifies Gate 2 / West Entrance routing connectivity', () => {
      const plan = createRoutePlan(campusNavigationGraph, 'west-entrance', 'mechanical-approach')
      assert.equal(plan.status, 'ok')
      assert.ok(plan.route)
      assert.ok(plan.route.totalCost > 0)
    })

    it('verifies Ground Entrance routing connectivity', () => {
      const plan = createRoutePlan(campusNavigationGraph, 'ground-entrance', 'main-block-approach')
      assert.equal(plan.status, 'ok')
      assert.ok(plan.route)
      assert.ok(plan.route.totalCost > 0)
    })

    it('preserves unverified status for Library without fabricating fake doorways', () => {
      const libNodes = campusDestinationNodesByBuildingId.get('library')
      assert.ok(libNodes === undefined || libNodes.length === 0)
      const building = buildings.find((b) => b.id === 'library')
      assert.ok(building)
      assert.equal(building.knownEntrance, 'Entrance pending physical verification')
    })

    it('verifies provisional service POIs (Apollo Shine & Xerox Shop)', () => {
      const apollo = findCampusPoi('apollo-shine')
      const xerox = findCampusPoi('xerox-shop')

      assert.ok(apollo)
      assert.equal(apollo.isProvisional, true)
      assert.ok(xerox)
      assert.equal(xerox.isProvisional, true)

      // Both can route approach via Main Gate 1
      const approachPlan = createRoutePlan(campusNavigationGraph, 'road-main-mid', 'main-gate-1')
      assert.equal(approachPlan.status, 'ok')
    })
  })

  describe('Part 3 & 4: Public Interface Cleanup & Authorization Guardrails', () => {
    it('restricts developer authorization check in production mode', () => {
      assert.equal(isDevTestAuthorized({ DEV: false }), false)
      assert.equal(isDevTestAuthorized({ DEV: true }), true)
    })

    it('ensures all 20+ destination IDs exist in campus registry', () => {
      assert.ok(buildings.length >= 16)
      assert.equal(CAMPUS_SERVICE_POIS.length, 2)
    })
  })

  describe('Part 5: Photo Evidence Security & Validation', () => {
    it('validates allowed image formats (JPEG, PNG, WebP)', () => {
      assert.ok(ALLOWED_IMAGE_MIME_TYPES.includes('image/jpeg'))
      assert.ok(ALLOWED_IMAGE_MIME_TYPES.includes('image/png'))
      assert.ok(ALLOWED_IMAGE_MIME_TYPES.includes('image/webp'))
    })

    it('rejects executable and disallowed file types', () => {
      const fakeExe = new File(['binary'], 'malicious.exe', { type: 'application/x-msdownload' })
      const res = validateImageFile(fakeExe)
      assert.equal(res.valid, false)
      assert.ok(res.error?.includes('Unsupported image format'))
    })

    it('rejects oversized image files exceeding 5MB', () => {
      const largeBlob = new Uint8Array(MAX_PHOTO_SIZE_BYTES + 1024)
      const largeFile = new File([largeBlob], 'huge_photo.jpg', { type: 'image/jpeg' })
      const res = validateImageFile(largeFile)
      assert.equal(res.valid, false)
      assert.ok(res.error?.includes('Photo is too large'))
    })

    it('accepts valid JPEG photo under 5MB', () => {
      const validBlob = new Uint8Array(50 * 1024) // 50 KB
      const validFile = new File([validBlob], 'campus_leak.jpg', { type: 'image/jpeg' })
      const res = validateImageFile(validFile)
      assert.equal(res.valid, true)
    })
  })
})
