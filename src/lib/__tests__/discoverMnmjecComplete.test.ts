import assert from 'node:assert/strict'
import fs from 'node:fs'
import { describe, it } from 'node:test'
import {
  DISCOVER_CATEGORIES,
  getDiscoverCategoryById,
  PG_COURSES,
  PLACEMENT_BATCH_RECORDS,
  SCHOLARSHIPS_DATA,
  UG_COURSES,
  VERIFIED_COMPANIES_DATA,
} from '../../data/discoverData.ts'
import { discoverNarrationService } from '../../services/discoverNarrationService.ts'
import { buildingIndex } from '../../data/buildings.ts'

describe('Discover MNMJEC Complete Implementation Verification', () => {
  describe('1. Top-Level Category Structure', () => {
    it('contains exactly the 3 mandated top-level categories', () => {
      const categoryIds = DISCOVER_CATEGORIES.map((c) => c.id)
      assert.equal(categoryIds.length, 3)
      assert.deepEqual(categoryIds, ['courses', 'scholarships', 'placements'])
    })

    it('supports looking up Companies via both "companies" and "placements" identifiers', () => {
      const byCompanies = getDiscoverCategoryById('companies')
      const byPlacements = getDiscoverCategoryById('placements')

      assert.ok(byCompanies, 'Category should be found with id="companies"')
      assert.ok(byPlacements, 'Category should be found with id="placements"')
      assert.equal(byCompanies.id, byPlacements.id)
    })
  })

  describe('2. Courses Category & UG/PG Programmes', () => {
    it('provides exactly 8 UG programmes with official names and degrees', () => {
      assert.equal(UG_COURSES.length, 8, 'Must have exactly 8 UG programmes')

      const expectedUGNames = [
        'Civil Engineering',
        'Mechanical Engineering',
        'Electronics and Communication Engineering (ECE)',
        'Electrical and Electronics Engineering (EEE)',
        'Computer Science and Engineering (CSE)',
        'Information Technology (IT)',
        'Artificial Intelligence and Data Science (AI & DS)',
        'Computer Science and Business Systems (CSBS)',
      ]

      const actualUGNames = UG_COURSES.map((c) => c.name)
      assert.deepEqual(actualUGNames, expectedUGNames)

      for (const course of UG_COURSES) {
        assert.equal(course.level, 'UG')
        assert.ok(course.degree === 'B.E.' || course.degree === 'B.Tech')
        assert.ok(course.officialUrl.includes('Courses.html'))
        if (course.buildingId) {
          assert.ok(course.buildingId in buildingIndex, `Building ${course.buildingId} must exist in campus building index`)
        }
        assert.ok(course.description.length > 20)
        assert.ok(course.narrationScript && course.narrationScript.length > 20, `${course.name} must have a professional narration script`)
      }
    })

    it('provides exactly 3 PG programmes with official names and degrees', () => {
      assert.equal(PG_COURSES.length, 3, 'Must have exactly 3 PG programmes')

      const expectedPGNames = [
        'Master of Business Administration (MBA)',
        'M.E. Computer Science and Engineering',
        'M.E. Structural Engineering',
      ]

      const actualPGNames = PG_COURSES.map((c) => c.name)
      assert.deepEqual(actualPGNames, expectedPGNames)

      for (const course of PG_COURSES) {
        assert.equal(course.level, 'PG')
        assert.ok(course.degree === 'MBA' || course.degree === 'M.E.')
        assert.ok(course.officialUrl.includes('Courses.html'))
        if (course.buildingId) {
          assert.ok(course.buildingId in buildingIndex, `Building ${course.buildingId} must exist in campus building index`)
        }
        assert.ok(course.description.length > 20)
        assert.ok(course.narrationScript && course.narrationScript.length > 20, `${course.name} must have a professional narration script`)
      }
    })

    it('preserves verified building links only for programmes with confirmed physical locations', () => {
      // Confirmed mapped programmes
      const civil = UG_COURSES.find((c) => c.abbreviation === 'Civil')!
      const mech = UG_COURSES.find((c) => c.abbreviation === 'Mech')!
      const cse = UG_COURSES.find((c) => c.abbreviation === 'CSE')!
      const it = UG_COURSES.find((c) => c.abbreviation === 'IT')!
      const meCse = PG_COURSES.find((c) => c.abbreviation === 'M.E. CSE')!
      const meStruct = PG_COURSES.find((c) => c.abbreviation === 'M.E. Struct')!

      assert.equal(civil.buildingId, 'civil-block')
      assert.equal(mech.buildingId, 'mechanical-block')
      assert.equal(cse.buildingId, 'it-block')
      assert.equal(it.buildingId, 'it-block')
      assert.equal(meCse.buildingId, 'it-block')
      assert.equal(meStruct.buildingId, 'civil-block')
    })

    it('strictly removes 3D building and navigation links for unmapped programmes', () => {
      // Unmapped programmes without verified physical department blocks
      const aids = UG_COURSES.find((c) => c.abbreviation === 'AI & DS')!
      const csbs = UG_COURSES.find((c) => c.abbreviation === 'CSBS')!
      const ece = UG_COURSES.find((c) => c.abbreviation === 'ECE')!
      const eee = UG_COURSES.find((c) => c.abbreviation === 'EEE')!
      const mba = PG_COURSES.find((c) => c.abbreviation === 'MBA')!

      assert.equal(aids.buildingId, undefined, 'AI & DS must not have a fallback buildingId')
      assert.equal(aids.buildingName, undefined, 'AI & DS must not have a fallback buildingName')
      assert.equal(csbs.buildingId, undefined, 'CSBS must not have a fallback buildingId')
      assert.equal(csbs.buildingName, undefined, 'CSBS must not have a fallback buildingName')
      assert.equal(ece.buildingId, undefined, 'ECE must not have a fallback buildingId')
      assert.equal(ece.buildingName, undefined, 'ECE must not have a fallback buildingName')
      assert.equal(eee.buildingId, undefined, 'EEE must not have a fallback buildingId')
      assert.equal(eee.buildingName, undefined, 'EEE must not have a fallback buildingName')
      assert.equal(mba.buildingId, undefined, 'MBA must not have a fallback buildingId')
      assert.equal(mba.buildingName, undefined, 'MBA must not have a fallback buildingName')

      // Official URLs and narration must remain available for all unmapped programmes
      for (const prog of [aids, csbs, ece, eee, mba]) {
        assert.ok(prog.officialUrl.includes('Courses.html'))
        assert.ok(prog.narrationScript && prog.narrationScript.length > 20)
      }
    })

    it('verifies that NO course card renders a 3D Building action, while valid Campus Navigation actions remain available and unmapped courses remain without navigation actions', () => {
      const screenSource = fs.readFileSync('src/screens/DiscoverScreen.tsx', 'utf-8')

      // Extract the Courses View card rendering block
      const coursesViewStart = screenSource.indexOf('{/* 1. COURSES VIEW:')
      const scholarshipsViewStart = screenSource.indexOf('{/* 2. SCHOLARSHIPS VIEW:')
      assert.ok(coursesViewStart > 0 && scholarshipsViewStart > coursesViewStart)

      const courseCardSection = screenSource.substring(coursesViewStart, scholarshipsViewStart)

      // 1. NO course card renders a "3D Building" action
      assert.ok(
        !courseCardSection.includes('3D Building'),
        'Course cards section must NOT contain any "3D Building" action'
      )
      assert.ok(
        !courseCardSection.includes('/explore?building=${course.buildingId}'),
        'Course cards must NOT contain explore links to 3D buildings'
      )

      // 2. Valid Campus Navigation actions remain available for mapped courses
      assert.ok(
        courseCardSection.includes('Campus Navigation'),
        'Course cards must retain "Campus Navigation" action for mapped courses'
      )
      assert.ok(
        courseCardSection.includes('/navigation?to=${course.buildingId}'),
        'Course cards must link to /navigation?to=${course.buildingId} for mapped courses'
      )

      // 3. Unmapped courses remain without navigation actions and display pending verification notice
      assert.ok(
        courseCardSection.includes('Campus location pending physical verification'),
        'Unmapped courses must display pending verification notice without navigation actions'
      )
    })
  })

  describe('3. Scholarships Category & Verification Standards', () => {
    it('includes SC/ST, JITO, Central Government, and PM/PS scheme entries', () => {
      const groups = new Set(SCHOLARSHIPS_DATA.map((s) => s.group))
      assert.ok(groups.has('SC/ST'), 'Must contain SC/ST group')
      assert.ok(groups.has('JITO'), 'Must contain JITO group')
      assert.ok(groups.has('Central Government'), 'Must contain Central Government group')
      assert.ok(groups.has('PM/PS'), 'Must contain PM/PS group')
    })

    it('preserves the abbreviation "PM/PS" strictly as supplied without guessing', () => {
      const pmPs = SCHOLARSHIPS_DATA.find((s) => s.group === 'PM/PS')
      assert.ok(pmPs, 'PM/PS entry must exist')
      assert.ok(pmPs.name.includes('PM/PS'))
      assert.equal(pmPs.verificationStatus, 'unverified')
      assert.ok(
        pmPs.verificationNotice.includes('Please verify the latest eligibility and application dates with the official scholarship provider'),
        'Must display official verification advisory'
      )
    })

    it('enforces verified advisory notices across all scholarship schemes without fabricated benefits', () => {
      for (const sch of SCHOLARSHIPS_DATA) {
        assert.ok(
          sch.verificationNotice.includes('Please verify the latest eligibility and application dates with the official scholarship provider'),
          `${sch.name} must include provider verification notice`
        )
        assert.ok(sch.administeredBy.length > 0)
        assert.ok(sch.description.length > 20)
        assert.ok(sch.narrationScript && sch.narrationScript.length > 20, `${sch.name} must have a professional narration script`)
      }

      // Check SC/ST scheme income cap
      const scSt = SCHOLARSHIPS_DATA.find((s) => s.group === 'SC/ST')!
      assert.ok(scSt.eligibilitySummary?.includes('2,50,000'))
    })
  })

  describe('4. Companies and Recruiters Category', () => {
    it('displays verified recruiters from official MNMJEC placement documentation', () => {
      assert.ok(VERIFIED_COMPANIES_DATA.length >= 8, 'Must include at least 8 verified recruiters')

      const companyNames = VERIFIED_COMPANIES_DATA.map((c) => c.name)
      assert.ok(companyNames.includes('Infosys'))
      assert.ok(companyNames.includes('Zoho Corporation'))
      assert.ok(companyNames.includes('Prodapt'))
      assert.ok(companyNames.includes('Cerium Systems'))
      assert.ok(companyNames.includes('Ethnus'))
      assert.ok(companyNames.includes('Entrayn'))
      assert.ok(companyNames.includes('Devcare'))
      assert.ok(companyNames.includes('Trainocate'))

      for (const comp of VERIFIED_COMPANIES_DATA) {
        assert.ok(comp.officialUrl.includes('placement.html'))
        assert.ok(comp.verificationSource.includes('MNMJEC Placement'))
        assert.ok(comp.narrationScript && comp.narrationScript.length > 20, `${comp.name} must have a professional narration script`)
      }

      // Infosys must be designated as accredited partner
      const infosys = VERIFIED_COMPANIES_DATA.find((c) => c.name === 'Infosys')!
      assert.equal(infosys.category, 'Accredited Partner')
      assert.ok(infosys.notes?.includes('Accredited'))
    })

    it('provides links to official batch placement records (2023 - 2026)', () => {
      assert.equal(PLACEMENT_BATCH_RECORDS.length, 4)
      const years = PLACEMENT_BATCH_RECORDS.map((r) => r.year)
      assert.deepEqual(years, ['2026', '2025', '2024', '2023'])

      for (const rec of PLACEMENT_BATCH_RECORDS) {
        assert.ok(rec.documentUrl.includes('placement'))
        assert.ok(rec.documentUrl.endsWith('.pdf'))
      }

      const batch2026 = PLACEMENT_BATCH_RECORDS.find((r) => r.year === '2026')!
      assert.equal(batch2026.isNew, true)
    })
  })

  describe('5. Professional Discover Narration Architecture', () => {
    it('supports Listen, Pause, Resume, Stop, and cleanup lifecycle on Discover narration service', () => {
      assert.equal(typeof discoverNarrationService.play, 'function')
      assert.equal(typeof discoverNarrationService.pause, 'function')
      assert.equal(typeof discoverNarrationService.resume, 'function')
      assert.equal(typeof discoverNarrationService.stop, 'function')
      assert.equal(typeof discoverNarrationService.cleanup, 'function')
    })

    it('provides complete natural narration scripts across all three main categories', () => {
      for (const cat of DISCOVER_CATEGORIES) {
        assert.ok(cat.narrationText && cat.narrationText.length > 50, `${cat.title} must have comprehensive narration text`)
        assert.ok(cat.narrationSummary && cat.narrationSummary.length > 10, `${cat.title} must have a narration summary`)
      }
    })
  })
})
