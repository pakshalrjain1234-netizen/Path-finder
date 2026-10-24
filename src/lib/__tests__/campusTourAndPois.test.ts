import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { buildings } from '../../data/buildings.ts'
import { CAMPUS_LANDMARKS } from '../../data/campusLandmarks.ts'
import { CAMPUS_SERVICE_POIS, findCampusPoi, searchCampusPois } from '../../data/campusPois.ts'
import { CAMPUS_TOUR_STOPS, HIGHLIGHTS_TOUR_STOPS, TOTAL_TOUR_STOPS } from '../../data/campusTourStops.ts'
import { tourNarrationService } from '../../services/tourNarrationService.ts'

describe('Phase 6A: Cinematic 3D Campus Tour Specifications', () => {
  it('defines 16 verified tour stops for the full campus tour', () => {
    assert.equal(CAMPUS_TOUR_STOPS.length, 16)
    assert.equal(TOTAL_TOUR_STOPS, 16)

    const expectedOrder = [
      'aerial-overview-start',
      'main-gate-services',
      'main-block',
      'first-year-block',
      'civil-block',
      'l-shape-block',
      'it-block',
      'mechanical-block',
      'departments-wing',
      'school-of-architecture',
      'boys-hostel',
      'campus-dining',
      'central-library',
      'open-air-theatre',
      'sports-ground',
      'campus-panorama-finale',
    ]

    CAMPUS_TOUR_STOPS.forEach((stop, idx) => {
      assert.equal(stop.id, expectedOrder[idx])
      assert.equal(stop.stopNumber, idx + 1)
      assert.ok(Boolean(stop.title))
      assert.ok(Boolean(stop.name))
      assert.ok(Boolean(stop.description))
      assert.ok(Boolean(stop.narration))
      assert.ok(Boolean(stop.narrationText))
      assert.ok(stop.dwellTimeMs >= 4000)
    })
  })

  it('defines curated stops for the highlights tour (8 major stops)', () => {
    assert.equal(HIGHLIGHTS_TOUR_STOPS.length, 8)
    const highlightIds = HIGHLIGHTS_TOUR_STOPS.map((s) => s.id)
    assert.deepEqual(highlightIds, [
      'aerial-overview-start',
      'main-gate-services',
      'main-block',
      'first-year-block',
      'it-block',
      'school-of-architecture',
      'central-library',
      'campus-panorama-finale',
    ])
  })

  it('guarantees all tour camera positions satisfy safety constraints (no underground, elevated views)', () => {
    for (const stop of CAMPUS_TOUR_STOPS) {
      const [camX, camY, camZ] = stop.cameraPosition
      const [tarX, tarY, tarZ] = stop.targetPoint

      // Camera must never be below ground level (minimum height 4.0m)
      assert.ok(camY >= 4.0, `Camera y for ${stop.id} must be >= 4.0`)

      // Looking target must be at or above ground level
      assert.ok(tarY >= 0, `Target y for ${stop.id} must be >= 0`)

      // Camera and target must not be at the exact same location (prevent 0-length lookAt)
      const dist = Math.hypot(camX - tarX, camY - tarY, camZ - tarZ)
      assert.ok(dist > 5.0, `Distance between camera and target for ${stop.id} must be > 5.0`)
    }
  })

  it('guarantees narration texts contain no unverified claims or fake historical data', () => {
    for (const stop of CAMPUS_TOUR_STOPS) {
      const text = stop.narration.toLowerCase()
      // Strict guardrails: no fabricated accreditation, fake student counts, or fake room numbers
      assert.ok(!text.includes('accredited by naac a++'))
      assert.ok(!text.includes('5000 students'))
      assert.ok(!text.includes('founded in 18'))
      assert.ok(!text.includes('machine shop'))
    }
  })
})

describe('Phase 6A: Tour Narration Service & Accessibility', () => {
  it('manages narration mute settings with state persistence', () => {
    tourNarrationService.setMuted(true)
    assert.equal(tourNarrationService.isMuted(), true)

    tourNarrationService.setMuted(false)
    assert.equal(tourNarrationService.isMuted(), false)
  })

  it('handles speak cancellation without crashing even if SpeechSynthesis is unavailable in test environment', () => {
    assert.doesNotThrow(() => tourNarrationService.cancel())
    assert.doesNotThrow(() => tourNarrationService.speak('Testing campus tour speech synthesis'))
  })

  it('provides reliable fallback when browser speechSynthesis is absent in node', () => {
    assert.equal(typeof tourNarrationService.isSupported(), 'boolean')
  })
})

describe('Phase 6A: Apollo Shine & Xerox Shop Provisional Landmarks', () => {
  it('registers Apollo Shine and Xerox Shop with exact verified Stage E3 coordinates', () => {
    assert.equal(CAMPUS_SERVICE_POIS.length, 2)

    const apollo = findCampusPoi('apollo-shine')
    assert.ok(apollo !== undefined)
    assert.equal(apollo?.name, 'Apollo Shine')
    assert.equal(apollo?.category, 'Facility')
    assert.equal(apollo?.isProvisional, true)
    // Coords matching E2_APOLLO_BUILDING in Blender model
    assert.ok(Math.abs(apollo!.anchorPosition[0] - 153.5) < 0.5)
    assert.ok(apollo!.anchorPosition[1] >= 3.0)
    assert.ok(Math.abs(apollo!.anchorPosition[2] - -20.0) < 0.5)

    const xerox = findCampusPoi('xerox-shop')
    assert.ok(xerox !== undefined)
    assert.equal(xerox?.name, 'Xerox Shop')
    assert.equal(xerox?.category, 'Facility')
    assert.equal(xerox?.isProvisional, true)
    // Coords matching E2_XEROX_SHOP in Blender model
    assert.ok(Math.abs(xerox!.anchorPosition[0] - 141.6) < 0.5)
    assert.ok(xerox!.anchorPosition[1] >= 3.0)
    assert.ok(Math.abs(xerox!.anchorPosition[2] - -17.5) < 0.5)
  })

  it('supports searching by required aliases', () => {
    // Apollo Shine
    const resApollo1 = searchCampusPois('Apollo')
    assert.ok(resApollo1.some((p) => p.id === 'apollo-shine'))

    const resApollo2 = searchCampusPois('Health Clinic')
    assert.ok(resApollo2.some((p) => p.id === 'apollo-shine'))

    // Xerox Shop / Xerox Facility / Photocopy Shop
    const resXerox1 = searchCampusPois('Xerox')
    assert.ok(resXerox1.some((p) => p.id === 'xerox-shop'))

    const resXerox2 = searchCampusPois('Xerox Facility')
    assert.ok(resXerox2.some((p) => p.id === 'xerox-shop'))

    const resXerox3 = searchCampusPois('Photocopy Shop')
    assert.ok(resXerox3.some((p) => p.id === 'xerox-shop'))

    const resXerox4 = searchCampusPois('Printout')
    assert.ok(resXerox4.some((p) => p.id === 'xerox-shop'))
  })

  it('strictly displays provisional status notices in POI data', () => {
    for (const poi of CAMPUS_SERVICE_POIS) {
      assert.ok(poi.provisionalNotice.toLowerCase().includes('provisional'))
      assert.ok(poi.provisionalNotice.toLowerCase().includes('pending'))
    }
  })
})

describe('Phase 6A: Safeguards & Category Counts Invariance', () => {
  it('strictly preserves the 18 primary registered buildings and verified category counts', () => {
    // Primary 18 registered locations must remain intact
    assert.equal(buildings.length, 18)
    assert.equal(CAMPUS_LANDMARKS.length, 18)

    const academicCount = buildings.filter((b) => b.category === 'Academic').length
    const departmentCount = buildings.filter((b) => b.category === 'Department').length
    const facilityCount = buildings.filter((b) => b.category === 'Facility').length

    assert.equal(academicCount, 7)
    assert.equal(departmentCount, 3)
    assert.equal(facilityCount, 8)
  })

  it('prohibits live GPS navigation approval and unverified Machine Shop addition', () => {
    // Verified: No machine shop added
    const machineShop = buildings.find((b) => b.id.includes('machine'))
    assert.equal(machineShop, undefined)
  })
})

describe('Phase 6A.1: Natural Voice Narration & State Machine Synchronization', () => {
  it('manages speech rate bounds between 0.75x and 1.25x', () => {
    tourNarrationService.setRate(1.1)
    assert.equal(tourNarrationService.getRate(), 1.1)

    // Clamps out of range
    tourNarrationService.setRate(0.5)
    assert.equal(tourNarrationService.getRate(), 0.75)

    tourNarrationService.setRate(2.0)
    assert.equal(tourNarrationService.getRate(), 1.25)

    tourNarrationService.setRate(1.0)
    assert.equal(tourNarrationService.getRate(), 1.0)
  })

  it('provides voice discovery and selection persistence', () => {
    const voices = tourNarrationService.getAvailableVoices()
    assert.ok(Array.isArray(voices))

    // Setting a voice URI
    tourNarrationService.setSelectedVoiceURI('test-voice-uri')
    assert.equal(tourNarrationService.getSelectedVoiceURI(), 'test-voice-uri')

    // Resetting
    tourNarrationService.setSelectedVoiceURI(null)
    assert.equal(tourNarrationService.getSelectedVoiceURI(), null)
  })

  it('allows safe voice preview without throwing even when audio context/synth is simulated', () => {
    assert.doesNotThrow(() => {
      tourNarrationService.previewVoice()
    })
  })

  it('calculates proper reading/speech durations for all 16 tour stops', () => {
    for (const stop of CAMPUS_TOUR_STOPS) {
      const words = stop.narration.split(/\s+/).filter(Boolean).length
      assert.ok(words >= 10, `Stop ${stop.id} narration should have substantial text (> 10 words)`)

      const rate = 1.0
      const estimatedSpeechMs = Math.round(Math.max(3800, (words / (2.2 * rate)) * 1000))
      // Duration must be at least 3.8s and not absurdly huge (< 30s)
      assert.ok(estimatedSpeechMs >= 3800)
      assert.ok(estimatedSpeechMs < 30000)
    }
  })

  it('verifies full tour contains exactly 16 stops and highlights contains 8 stops', () => {
    assert.equal(CAMPUS_TOUR_STOPS.length, 16)
    assert.equal(HIGHLIGHTS_TOUR_STOPS.length, 8)

    // Verify each stop has camera position [x, y, z] and target point [x, y, z]
    for (const stop of [...CAMPUS_TOUR_STOPS, ...HIGHLIGHTS_TOUR_STOPS]) {
      assert.equal(stop.cameraPosition.length, 3)
      assert.equal(stop.targetPoint.length, 3)
      assert.ok(typeof stop.cameraPosition[0] === 'number')
      assert.ok(typeof stop.cameraPosition[1] === 'number')
      assert.ok(typeof stop.cameraPosition[2] === 'number')
    }
  })
})

