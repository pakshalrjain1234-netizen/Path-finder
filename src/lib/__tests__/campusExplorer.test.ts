import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { buildings, buildingIndex } from '../../data/buildings.ts'
import {
  campusModelMapById,
  campusModelMapping,
  resolveCampusBuilding,
} from '../../data/campusModelMapping.ts'
import { PROVISIONAL_CAMPUS_BOUNDARY } from '../../data/campusGeofenceData.ts'
import { DEFAULT_CAMPUS_CONTROL_POINTS } from '../../data/campusCalibrationData.ts'

describe('Phase 5C: 3D Campus Explorer & Building Discovery', () => {
  describe('Building Search & Known Aliases', () => {
    it('finds buildings by exact and partial names case-insensitively', () => {
      const query = 'main'
      const matches = buildings.filter((b) => b.name.toLowerCase().includes(query))
      assert.ok(matches.length > 0)
      assert.ok(matches.some((b) => b.id === 'main-block'))
    })

    it('matches authentic campus aliases for key blocks', () => {
      const search = (q: string) => {
        const normalized = q.toLowerCase()
        return buildings.filter(
          (b) =>
            b.name.toLowerCase().includes(normalized) ||
            b.category.toLowerCase().includes(normalized) ||
            b.aliases?.some((a) => a.toLowerCase().includes(normalized))
        )
      }

      // Test "Admin" alias -> Main Block
      const adminMatches = search('admin')
      assert.ok(adminMatches.some((b) => b.id === 'main-block'))

      // Test "Hostel" alias -> Boys Hostel
      const hostelMatches = search('hostel')
      assert.ok(hostelMatches.some((b) => b.id === 'boys-hostel'))

      // Test "CSE" or "Computer Science" -> IT Block
      const cseMatches = search('cse')
      assert.ok(cseMatches.some((b) => b.id === 'it-block'))

      // Test "Cafeteria" -> Canteen
      const cafeMatches = search('cafeteria')
      assert.ok(cafeMatches.some((b) => b.id === 'canteen'))

      // Test "Architecture" / "B.Arch" / "SOA" -> MNM School of Architecture
      const archMatches = search('soa')
      assert.ok(archMatches.some((b) => b.id === 'mnm-school-of-architecture'))

      // Test "Library" / "Central Library" -> Library
      const libMatches = search('central library')
      assert.ok(libMatches.some((b) => b.id === 'library'))
    })

    it('filters accurately by campus categories (Academic, Department, Facility)', () => {
      const academic = buildings.filter((b) => b.category === 'Academic')
      const departments = buildings.filter((b) => b.category === 'Department')
      const facilities = buildings.filter((b) => b.category === 'Facility')

      assert.ok(academic.length >= 6)
      assert.equal(departments.length, 3) // Physics, English, Maths
      assert.ok(facilities.length >= 4) // Canteen, Jain Mess, Non-Jain Mess, Boys Hostel

      const validCategories = new Set(['Academic', 'Department', 'Facility'])
      for (const b of buildings) {
        assert.ok(validCategories.has(b.category))
      }
    })

    it('returns empty results cleanly when no match exists without throwing', () => {
      const q = 'nonexistent-mars-laboratory'
      const matches = buildings.filter(
        (b) =>
          b.name.toLowerCase().includes(q) ||
          b.aliases?.some((a) => a.toLowerCase().includes(q))
      )
      assert.deepEqual(matches, [])
    })
  })

  describe('Floor Availability & Ground Data Authenticity', () => {
    it('provides valid floor structures for mapped multi-story academic blocks', () => {
      const mainBlock = campusModelMapById['main-block']
      assert.equal(mainBlock.indoorAvailable, true)
      assert.ok(mainBlock.floorObjects['G'])
      assert.ok(mainBlock.floorObjects['1'])

      const firstYear = campusModelMapById['first-year-block']
      assert.equal(firstYear.indoorAvailable, true)
      assert.ok(firstYear.floorObjects['G'])
      assert.ok(firstYear.floorObjects['1'])
      assert.ok(firstYear.floorObjects['2'])
      assert.ok(firstYear.floorObjects['3'])

      const civilBlock = campusModelMapById['civil-block']
      assert.equal(civilBlock.indoorAvailable, true)
      assert.ok(civilBlock.floorObjects['G'])
      assert.ok(civilBlock.floorObjects['1'])
      assert.ok(civilBlock.floorObjects['2'])
    })

    it('marks unmapped buildings and provisional floors truthfully', () => {
      const mechBlock = campusModelMapById['mechanical-block']
      assert.equal(mechBlock.indoorAvailable, false)
      assert.equal(Object.keys(mechBlock.floorObjects).length, 0)

      const archBlock = campusModelMapById['mnm-school-of-architecture']
      assert.equal(archBlock.indoorAvailable, false)
    })

    it('does not invent fictional laboratories, rooms, or floors', () => {
      for (const b of buildings) {
        assert.ok(b.floorInfo.label)
        assert.ok(!/room\s+\d+/i.test(b.floorInfo.label))
        assert.ok(!/lab\s+\d+/i.test(b.floorInfo.label))
      }
    })
  })

  describe('Model Mapping & Building Resolution', () => {
    it('resolves glTF mesh names to correct CampusBuildingId', () => {
      assert.equal(resolveCampusBuilding('MAIN_BLOCK_FLOOR_G'), 'main-block')
      assert.equal(resolveCampusBuilding('MAIN_BLOCK_ROOF'), 'main-block')
      assert.equal(resolveCampusBuilding('FIRST_YEAR_BLOCK_FLOOR_2'), 'first-year-block')
      assert.equal(resolveCampusBuilding('CIVIL_BLOCK_FLOOR_1'), 'civil-block')
      assert.equal(resolveCampusBuilding('IT_BLOCK_FOOTPRINT'), 'it-block')
      assert.equal(resolveCampusBuilding('CANTEEN_FLOOR_G'), 'canteen')
      assert.equal(resolveCampusBuilding('PHYSICS_DEPARTMENT_ROOF'), 'physics-department')
    })

    it('returns null for unmapped terrain, road, or generic scene meshes', () => {
      assert.equal(resolveCampusBuilding('ROAD_CENTRAL_SPINE'), null)
      assert.equal(resolveCampusBuilding('TERRAIN_GROUND_LAWN'), null)
      assert.equal(resolveCampusBuilding('UNKNOWN_OBJECT_XYZ'), null)
    })

    it('contains all 16 authored campus entries in campusModelMapping', () => {
      assert.equal(campusModelMapping.length, 16)
      const mappedIds = new Set(campusModelMapping.map((e) => e.buildingId))
      assert.ok(mappedIds.has('main-block'))
      assert.ok(mappedIds.has('first-year-block'))
      assert.ok(mappedIds.has('civil-block'))
      assert.ok(mappedIds.has('it-block'))
      assert.ok(mappedIds.has('canteen'))
      assert.ok(mappedIds.has('open-air-theatre'))
      assert.ok(mappedIds.has('library'))
    })
  })

  describe('Building Entrances & Known Approaches', () => {
    it('provides verified entrance approach strings for all key campus buildings', () => {
      const buildingsWithEntrances = buildings.filter((b) => b.knownEntrance)
      assert.ok(buildingsWithEntrances.length >= 14)

      const mainBlock = buildingIndex['main-block']
      assert.ok(mainBlock.knownEntrance?.includes('Main Block Entrance'))

      const canteen = buildingIndex['canteen']
      assert.ok(canteen.knownEntrance?.includes('Canteen Gate'))

      const itBlock = buildingIndex['it-block']
      assert.ok(itBlock.knownEntrance?.includes('IT Block'))
    })
  })

  describe('Safety & Navigation Integrity Preservation', () => {
    it('keeps live GPS navigation approval strictly locked', () => {
      assert.equal(PROVISIONAL_CAMPUS_BOUNDARY.metadata.isApprovedForLiveNavigation, false)
    })

    it('ensures campus calibration control points remain empty/uncalibrated by default', () => {
      assert.equal(DEFAULT_CAMPUS_CONTROL_POINTS.length, 0)
    })
  })
})
