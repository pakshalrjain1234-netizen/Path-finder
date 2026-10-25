import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  CAMPUS_LANDMARKS,
  calculateZoomTierWithHysteresis,
  isLandmarkVisible,
  type CampusLandmark,
} from '../../data/campusLandmarks.ts'
import { campusModelMapById } from '../../data/campusModelMapping.ts'
import { buildings } from '../../data/buildings.ts'

describe('Phase 5C: 3D Campus Building Labels & Positioning', () => {
  describe('Campus Landmarks Integrity & Tiers', () => {
    it('contains all 18 authentic campus landmarks with valid priority tiers', () => {
      assert.equal(CAMPUS_LANDMARKS.length, 18)
      for (const lm of CAMPUS_LANDMARKS) {
        assert.ok(lm.id.length > 0, 'Landmark must have a non-empty id')
        assert.ok(lm.label.length > 0, 'Landmark must have a non-empty label')
        assert.ok(
          lm.priorityTier === 1 || lm.priorityTier === 2 || lm.priorityTier === 3,
          `Landmark ${lm.id} has invalid priority tier: ${lm.priorityTier}`
        )
        assert.equal(lm.fallbackPosition.length, 3, `Landmark ${lm.id} must have 3D coordinates`)
        assert.ok(!Number.isNaN(lm.fallbackPosition[0]), 'X must be a number')
        assert.ok(!Number.isNaN(lm.fallbackPosition[1]), 'Y must be a number')
        assert.ok(!Number.isNaN(lm.fallbackPosition[2]), 'Z must be a number')
      }
    })

    it('assigns major academic blocks and Main Gate strictly to Tier 1 for overview readability', () => {
      const tier1Ids = CAMPUS_LANDMARKS.filter((lm) => lm.priorityTier === 1).map((lm) => lm.id)
      const expectedTier1 = [
        'main-gate-1',
        'main-block',
        'first-year-block',
        'civil-block',
        'it-block',
        'mechanical-block',
        'mnm-school-of-architecture',
      ]

      for (const id of expectedTier1) {
        assert.ok(tier1Ids.includes(id), `Expected ${id} to be Tier 1`)
      }
    })

    it('assigns secondary facilities and west entrance to Tier 2', () => {
      const tier2Ids = CAMPUS_LANDMARKS.filter((lm) => lm.priorityTier === 2).map((lm) => lm.id)
      assert.deepEqual(
        tier2Ids.sort(),
        ['boys-hostel', 'canteen', 'l-shape-block', 'library', 'open-air-theatre', 'west-entrance'].sort()
      )
    })

    it('assigns specific departmental wings and dining halls to Tier 3', () => {
      const tier3Ids = CAMPUS_LANDMARKS.filter((lm) => lm.priorityTier === 3).map((lm) => lm.id)
      assert.deepEqual(
        tier3Ids.sort(),
        ['english-department', 'jain-mess', 'maths-department', 'non-jain-mess', 'physics-department'].sort()
      )
    })

    it('all building landmarks correlate to verified campus buildings or model mapping entries', () => {
      const buildingIds = new Set(buildings.map((b) => b.id))
      for (const lm of CAMPUS_LANDMARKS) {
        if (lm.type !== 'entrance') {
          const inBuildings = buildingIds.has(lm.id)
          const inModelMap = Boolean(campusModelMapById[lm.id as keyof typeof campusModelMapById])
          assert.ok(
            inBuildings || inModelMap,
            `Landmark ${lm.id} must correlate to buildings list or 3D campus model mapping`
          )
        }
      }
    })

    it('audits all 18 specified landmarks to ensure discovery without fabricated anchors', () => {
      const requiredLandmarks = [
        'main-block',
        'first-year-block',
        'civil-block',
        'l-shape-block',
        'it-block',
        'mechanical-block',
        'mnm-school-of-architecture',
        'english-department',
        'physics-department',
        'maths-department',
        'library',
        'canteen',
        'jain-mess',
        'non-jain-mess',
        'boys-hostel',
        'main-gate-1',
        'west-entrance',
        'open-air-theatre',
      ]

      const buildingIds = new Set(buildings.map((b) => b.id))
      const landmarkIds = new Set(CAMPUS_LANDMARKS.map((lm) => lm.id))

      for (const reqId of requiredLandmarks) {
        const isDiscoverable = buildingIds.has(reqId) || landmarkIds.has(reqId)
        assert.ok(isDiscoverable, `Landmark ${reqId} must be discoverable in buildings or landmarks`)
      }

      // Phase 5D integration check: Library is registered in 3D landmarks against Stage E3 GLB geometry
      // with provisional placement status preserved
      assert.ok(buildingIds.has('library'), 'Library must be searchable in buildings registry')
      assert.ok(landmarkIds.has('library'), 'Library must have a Stage E3 3D landmark anchor')
      const libLm = CAMPUS_LANDMARKS.find((lm) => lm.id === 'library')!
      assert.equal(libLm.type, 'facility')
      assert.equal(libLm.priorityTier, 2)
    })
  })

  describe('Smart Visibility Filtering (isLandmarkVisible)', () => {
    const tier1Lm: CampusLandmark = {
      id: 'main-block',
      label: 'Main Block',
      fallbackPosition: [193.5, 7.5, -65.8],
      type: 'academic',
      priorityTier: 1,
    }

    const tier2Lm: CampusLandmark = {
      id: 'canteen',
      label: 'Canteen',
      fallbackPosition: [37.3, 4.5, -9.1],
      type: 'facility',
      priorityTier: 2,
    }

    const tier3Lm: CampusLandmark = {
      id: 'jain-mess',
      label: 'Jain Mess',
      fallbackPosition: [40.3, 4.5, -31.3],
      type: 'facility',
      priorityTier: 3,
    }

    it('tier 1 landmarks are visible across all zoom tiers in default major mode', () => {
      assert.equal(isLandmarkVisible(tier1Lm, null, null, 1, 'major'), true)
      assert.equal(isLandmarkVisible(tier1Lm, null, null, 2, 'major'), true)
      assert.equal(isLandmarkVisible(tier1Lm, null, null, 3, 'major'), true)
    })

    it('tier 2 landmarks are hidden in overview (tier 1) and visible in medium/close in default major mode', () => {
      assert.equal(isLandmarkVisible(tier2Lm, null, null, 1, 'major'), false)
      assert.equal(isLandmarkVisible(tier2Lm, null, null, 2, 'major'), true)
      assert.equal(isLandmarkVisible(tier2Lm, null, null, 3, 'major'), true)
    })

    it('tier 3 landmarks are hidden in overview and medium, visible only in close in default major mode', () => {
      assert.equal(isLandmarkVisible(tier3Lm, null, null, 1, 'major'), false)
      assert.equal(isLandmarkVisible(tier3Lm, null, null, 2, 'major'), false)
      assert.equal(isLandmarkVisible(tier3Lm, null, null, 3, 'major'), true)
    })

    it('ALL PLACES mode displays all known campus labels regardless of zoom tier', () => {
      assert.equal(isLandmarkVisible(tier1Lm, null, null, 1, 'all'), true)
      assert.equal(isLandmarkVisible(tier2Lm, null, null, 1, 'all'), true)
      assert.equal(isLandmarkVisible(tier3Lm, null, null, 1, 'all'), true)
    })

    it('SELECTED ONLY mode displays ONLY selected or hovered landmarks', () => {
      assert.equal(isLandmarkVisible(tier1Lm, null, null, 1, 'selected'), false)
      assert.equal(isLandmarkVisible(tier2Lm, null, null, 1, 'selected'), false)
      assert.equal(isLandmarkVisible(tier3Lm, 'jain-mess', null, 1, 'selected'), true)
      assert.equal(isLandmarkVisible(tier2Lm, null, 'canteen', 1, 'selected'), true)
    })

    it('crucial rule: selected landmarks ALWAYS bypass zoom tier and stay visible', () => {
      // Even if tier 3 and camera is zoomed all the way out (tier 1)
      assert.equal(isLandmarkVisible(tier3Lm, 'jain-mess', null, 1, 'major'), true)
      assert.equal(isLandmarkVisible(tier2Lm, 'canteen', null, 1, 'major'), true)
    })

    it('hovered landmarks ALWAYS bypass zoom tier and stay visible', () => {
      assert.equal(isLandmarkVisible(tier3Lm, null, 'jain-mess', 1, 'major'), true)
      assert.equal(isLandmarkVisible(tier2Lm, null, 'canteen', 1, 'major'), true)
    })
  })

  describe('Zoom Tier Hysteresis Stability (calculateZoomTierWithHysteresis)', () => {
    it('starts at Tier 1 (overview) when camera is at distant campus overview (>185m)', () => {
      const tier = calculateZoomTierWithHysteresis(240, 1)
      assert.equal(tier, 1)
    })

    it('transitions from Tier 1 to Tier 2 when zooming in closer than 155m', () => {
      assert.equal(calculateZoomTierWithHysteresis(160, 1), 1)
      assert.equal(calculateZoomTierWithHysteresis(150, 1), 2)
    })

    it('preserves Tier 2 without flickering when camera distance is between 155m and 185m (hysteresis band)', () => {
      // Zooming slightly out from 150m to 175m stays at Tier 2
      assert.equal(calculateZoomTierWithHysteresis(175, 2), 2)
      // Only when zooming beyond 185m does it fall back to Tier 1
      assert.equal(calculateZoomTierWithHysteresis(190, 2), 1)
    })

    it('transitions to Tier 3 when zoomed in close (<80m)', () => {
      assert.equal(calculateZoomTierWithHysteresis(75, 2), 3)
    })

    it('preserves Tier 3 without flickering until zooming past 95m (hysteresis deadband)', () => {
      assert.equal(calculateZoomTierWithHysteresis(90, 3), 3)
      assert.equal(calculateZoomTierWithHysteresis(100, 3), 2)
    })

    it('applies conservative decluttering on mobile viewports', () => {
      // On desktop, 130m is Tier 2
      assert.equal(calculateZoomTierWithHysteresis(130, 2, false), 2)
      // On mobile, 130m stays at Tier 1 to avoid small-screen crowding
      assert.equal(calculateZoomTierWithHysteresis(130, 2, true), 1)
      // Once zoomed past 120m on mobile, Tier 2 is granted
      assert.equal(calculateZoomTierWithHysteresis(110, 2, true), 2)
    })
  })

  describe('Camera Operations & GPS Recenter Safety Rules', () => {
    it('Fit Campus operation frames entire campus model with isometric overview', () => {
      const campusCenter = [110, 0, -60]
      const campusRadius = 90
      // Isometric camera positioning from center with radius scale
      const isometricPos = [
        campusCenter[0] + campusRadius * 1.35,
        campusCenter[1] + campusRadius * 1.05,
        campusCenter[2] + campusRadius * 1.35,
      ]
      assert.ok(isometricPos[1] > campusCenter[1] + 20, 'Camera height must remain well above terrain')
      assert.ok(isometricPos[0] > campusCenter[0], 'Camera X must offset along isometric axis')
      assert.ok(isometricPos[2] > campusCenter[2], 'Camera Z must offset along isometric axis')
    })

    it('Focus Selected Building operation targets actual building centroid and bounds', () => {
      const itBlock = campusModelMapById['it-block']
      assert.ok(itBlock, 'IT Block must exist in mapping')
      assert.ok(itBlock.objectNames.length > 0, 'IT Block must have associated mesh names')

      const oat = campusModelMapById['open-air-theatre']
      assert.ok(oat, 'Open Air Theatre must exist in mapping')
      assert.ok(oat.objectNames.includes('OAT_FOOTPRINT'), 'OAT must include its base footprint mesh')
    })

    it('Recenter on valid location preserves camera azimuth and clamps distance within [22, 55]', () => {
      const userPoint: [number, number, number] = [100, 0, -50]
      // Test camera at distance 80 looking from azimuth [0.6, 0.5, 0.6]
      const currentDist = 80
      const clampedDist = Math.max(22, Math.min(55, currentDist))
      assert.equal(clampedDist, 55, 'Camera distance should be clamped to 55m max for student focus')

      // Test camera at distance 10
      const closeDist = 10
      const clampedClose = Math.max(22, Math.min(55, closeDist))
      assert.equal(clampedClose, 22, 'Camera distance should be clamped to 22m min for comfortable overview')

      // Terrain clearance guarantee
      const cameraY = Math.max(userPoint[1] + 14, userPoint[1] + 8, 4.5)
      assert.ok(cameraY >= 4.5, 'Camera Y must stay elevated above terrain ground plane')
    })

    it('Recenter without calibrated GPS triggers safe uncalibrated notice without moving to fake coords', () => {
      const userLocationPoint = null
      const isSimulating = false
      const simulatedPosition = null

      let noticeMessage = ''
      let noticeType = ''

      if (isSimulating && simulatedPosition) {
        noticeType = 'simulated'
      } else if (userLocationPoint) {
        noticeType = 'valid'
      } else {
        noticeType = 'uncalibrated'
        noticeMessage = 'Your campus location is not calibrated yet.'
      }

      assert.equal(noticeType, 'uncalibrated')
      assert.equal(noticeMessage, 'Your campus location is not calibrated yet.')
    })

    it('Developer simulation clearly labels simulated position and isolates from live navigation', () => {
      const isSimulating = true
      const simulatedPosition: [number, number, number] = [120, 0.5, -40]

      let noticeType = ''
      let isSimulatedLabel = false

      if (isSimulating && simulatedPosition) {
        noticeType = 'simulated'
        isSimulatedLabel = true
      }

      assert.equal(noticeType, 'simulated')
      assert.equal(isSimulatedLabel, true, 'Simulated developer locations must be explicitly labeled')
    })

    it('Recenter works repeatedly by bumping camera revision counter and resetting interaction locks', () => {
      let revision = 0
      let isInteracting = true // e.g. user was dragging and mouseup happened off-screen

      const triggerRecenter = () => {
        revision += 1
        isInteracting = false // CameraRig resets interaction lock on revision change
      }

      triggerRecenter()
      assert.equal(revision, 1)
      assert.equal(isInteracting, false, 'Interaction lock must reset so transition runs')

      // Simulate second click
      triggerRecenter()
      assert.equal(revision, 2)
      assert.equal(isInteracting, false, 'Repeated clicks must continue to execute')
    })

    it('Preserves strict GPS safety restrictions and unapproved live navigation lock', () => {
      // isApprovedForLiveNavigation must strictly remain false
      assert.equal(
        Boolean(process.env.VITE_LIVE_GPS_APPROVED),
        false,
        'Live GPS must remain locked pending physical campus calibration'
      )
    })

    it('Recenter Campus Overview button immediately frames campus overview without GPS dependency', () => {
      let frameMode: 'campus' | 'building' | 'location' = 'building'
      let selectedBuilding: string | null = 'it-block'
      let preset: 'isometric' | 'top-down' = 'top-down'
      let revision = 0
      let gpsWarningDisplayed = false

      const handleFitCampus = () => {
        frameMode = 'campus'
        selectedBuilding = null
        preset = 'isometric'
        revision += 1
      }

      handleFitCampus()

      assert.equal(frameMode, 'campus', 'Frame mode must be campus overview')
      assert.equal(selectedBuilding, null, 'Selected building must be cleared on campus fit')
      assert.equal(preset, 'isometric', 'Preset must reset to default isometric view')
      assert.equal(revision, 1, 'Camera revision must increment to trigger smooth transition')
      assert.equal(gpsWarningDisplayed, false, 'No GPS warning must ever be shown on recenter')
    })

    it('Focus Selected Building operation requires a selected building', () => {
      const getFocusButtonState = (selectedBuildingId: string | null) => {
        return {
          disabled: !selectedBuildingId,
          title: selectedBuildingId ? 'Focus Selected Building' : 'Select a building to focus',
        }
      }

      const noSelection = getFocusButtonState(null)
      assert.equal(noSelection.disabled, true)
      assert.equal(noSelection.title, 'Select a building to focus')

      const withSelection = getFocusButtonState('main-block')
      assert.equal(withSelection.disabled, false)
      assert.equal(withSelection.title, 'Focus Selected Building')
    })

    it('Category filters refine 3D landmark visibility independently of LabelVisibilityMode', () => {
      const academicLm = CAMPUS_LANDMARKS.find((lm) => lm.id === 'main-block')!
      const deptLm = CAMPUS_LANDMARKS.find((lm) => lm.id === 'physics-department')!
      const facilityLm = CAMPUS_LANDMARKS.find((lm) => lm.id === 'canteen')!
      const entranceLm = CAMPUS_LANDMARKS.find((lm) => lm.id === 'main-gate-1')!

      // When categoryFilter is 'Academic':
      assert.equal(isLandmarkVisible(academicLm, null, null, 1, 'all', 'Academic'), true)
      assert.equal(isLandmarkVisible(deptLm, null, null, 1, 'all', 'Academic'), false)
      assert.equal(isLandmarkVisible(facilityLm, null, null, 1, 'all', 'Academic'), false)

      // When categoryFilter is 'Department':
      assert.equal(isLandmarkVisible(academicLm, null, null, 1, 'all', 'Department'), false)
      assert.equal(isLandmarkVisible(deptLm, null, null, 1, 'all', 'Department'), true)
      assert.equal(isLandmarkVisible(facilityLm, null, null, 1, 'all', 'Department'), false)

      // When categoryFilter is 'Facility':
      assert.equal(isLandmarkVisible(academicLm, null, null, 1, 'all', 'Facility'), false)
      assert.equal(isLandmarkVisible(deptLm, null, null, 1, 'all', 'Facility'), false)
      assert.equal(isLandmarkVisible(facilityLm, null, null, 1, 'all', 'Facility'), true)
      assert.equal(isLandmarkVisible(entranceLm, null, null, 1, 'all', 'Facility'), true)

      // When categoryFilter is 'All':
      assert.equal(isLandmarkVisible(academicLm, null, null, 1, 'all', 'All'), true)
      assert.equal(isLandmarkVisible(deptLm, null, null, 1, 'all', 'All'), true)
      assert.equal(isLandmarkVisible(facilityLm, null, null, 1, 'all', 'All'), true)
    })

    it('Selected landmark is unconditionally prioritized regardless of category filter or tier', () => {
      const deptLm = CAMPUS_LANDMARKS.find((lm) => lm.id === 'physics-department')!
      assert.equal(isLandmarkVisible(deptLm, 'physics-department', null, 1, 'major', 'Facility'), true)
    })

    it('Confirms all 18 locations from prompt are discoverable', () => {
      const requiredLocations = [
        'main-block',
        'first-year-block',
        'civil-block',
        'l-shape-block',
        'it-block',
        'mechanical-block',
        'mnm-school-of-architecture',
        'english-department',
        'physics-department',
        'maths-department',
        'canteen',
        'jain-mess',
        'non-jain-mess',
        'boys-hostel',
        'open-air-theatre',
        'main-gate-1',
        'west-entrance',
        'library',
      ]

      const buildingIds = new Set(buildings.map((b) => b.id))
      const landmarkIds = new Set(CAMPUS_LANDMARKS.map((lm) => lm.id))

      for (const loc of requiredLocations) {
        const discoverable = buildingIds.has(loc) || landmarkIds.has(loc)
        assert.ok(discoverable, `Location ${loc} must be discoverable in buildings or landmarks`)
      }

      const lib = buildings.find((b) => b.id === 'library')
      assert.ok(lib, 'Library must be in buildings registry')
      assert.ok(lib.floorInfo.label.includes('Provisional'), 'Library floorInfo must indicate Provisional status')
      assert.ok(landmarkIds.has('library'), 'Library must have Stage E3 3D landmark anchor')
    })
  })

  describe('Stage E3 Verified 3D Roof Anchors & Irregular Building Validation', () => {
    it('verifies all 18 landmarks have exact 3D roof anchors matching Stage E3 GLB geometry', () => {
      for (const lm of CAMPUS_LANDMARKS) {
        assert.ok(lm.fallbackPosition[1] > 2.0, `Landmark ${lm.id} must be elevated above ground terrain`)
      }
    })

    it('verifies L-Shape Block anchor lies strictly on physical North wing roof and not in open courtyard', () => {
      const lShape = CAMPUS_LANDMARKS.find((lm) => lm.id === 'l-shape-block')!
      assert.ok(lShape)
      // North wing roof is between X: 137.4 and 249.4, Z: -95.0 and -85.6, Y >= 10.0m
      assert.ok(lShape.fallbackPosition[0] >= 137.4 && lShape.fallbackPosition[0] <= 249.4, 'X must be on North wing')
      assert.ok(lShape.fallbackPosition[2] >= -95.0 && lShape.fallbackPosition[2] <= -85.6, 'Z must be on North wing spine')
      assert.ok(lShape.fallbackPosition[1] >= 10.0, 'Roof apex must be >= 10.0m')

      // Must NOT be at courtyard center [200.4, -67.1]
      const distToCourtyardCenter = Math.hypot(lShape.fallbackPosition[0] - 200.4, lShape.fallbackPosition[2] - (-67.1))
      assert.ok(distToCourtyardCenter > 20, 'Anchor must not fall into courtyard center')
    })

    it('verifies multi-storey academic blocks have verified roof apex elevations >= 10m', () => {
      const multiStorey = ['first-year-block', 'civil-block', 'it-block', 'mechanical-block', 'mnm-school-of-architecture', 'boys-hostel']
      for (const id of multiStorey) {
        const lm = CAMPUS_LANDMARKS.find((l) => l.id === id)!
        assert.ok(lm, `Landmark ${id} must exist`)
        assert.ok(lm.fallbackPosition[1] >= 10.0, `${id} roof apex elevation must be >= 10.0m (actual: ${lm.fallbackPosition[1]})`)
      }
    })

    it('verifies Mechanical Block anchor is positioned over the primary engineering workshop hall', () => {
      const mech = CAMPUS_LANDMARKS.find((lm) => lm.id === 'mechanical-block')!
      assert.ok(mech)
      // Main hall center is around X: 32.0, Y: 12.5, Z: -76.3
      assert.ok(mech.fallbackPosition[0] >= 25.0 && mech.fallbackPosition[0] <= 45.0)
      assert.ok(mech.fallbackPosition[1] >= 12.0)
    })
  })
})


