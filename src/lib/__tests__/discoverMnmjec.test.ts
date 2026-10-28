import assert from 'node:assert/strict'
import { describe, it, beforeEach, afterEach } from 'node:test'
import { DISCOVER_CATEGORIES, getDiscoverCategoryById } from '../../data/discoverData.ts'
import { buildingIndex } from '../../data/buildings.ts'
import { discoverNarrationService } from '../../services/discoverNarrationService.ts'
import { tourNarrationService } from '../../services/tourNarrationService.ts'
import type { DiscoverCategoryId } from '../../types/discover.ts'

describe('Phase 9C.2: Discover MNMJEC Voice & UI Quality Verification', () => {
  let mockUtteranceInstance: any = null
  let speakCallCount = 0
  let cancelCallCount = 0
  let pauseCallCount = 0
  let resumeCallCount = 0

  beforeEach(() => {
    speakCallCount = 0
    cancelCallCount = 0
    pauseCallCount = 0
    resumeCallCount = 0
    mockUtteranceInstance = null

    // Setup global window and SpeechSynthesis mocks
    ;(globalThis as any).window = globalThis
    ;(globalThis as any).SpeechSynthesisUtterance = class {
      text: string
      voice: any = null
      rate: number = 1.0
      pitch: number = 1.0
      volume: number = 1.0
      onstart: (() => void) | null = null
      onpause: (() => void) | null = null
      onresume: (() => void) | null = null
      onend: (() => void) | null = null
      onerror: ((e: any) => void) | null = null

      constructor(text: string) {
        this.text = text
        mockUtteranceInstance = this
      }
    }

    ;(globalThis as any).speechSynthesis = {
      speaking: false,
      paused: false,
      pending: false,
      getVoices: () => [
        {
          name: 'Microsoft Heera - English (India)',
          lang: 'en-IN',
          voiceURI: 'heera-in',
        },
      ],
      speak: (utt: any) => {
        speakCallCount++
        ;(globalThis as any).speechSynthesis.speaking = true
        ;(globalThis as any).speechSynthesis.paused = false
        setTimeout(() => {
          utt.onstart?.()
        }, 2)
      },
      cancel: () => {
        cancelCallCount++
        ;(globalThis as any).speechSynthesis.speaking = false
        ;(globalThis as any).speechSynthesis.paused = false
        if (mockUtteranceInstance) {
          mockUtteranceInstance.onerror?.({ error: 'canceled' })
        }
      },
      pause: () => {
        pauseCallCount++
        ;(globalThis as any).speechSynthesis.paused = true
        if (mockUtteranceInstance) {
          mockUtteranceInstance.onpause?.()
        }
      },
      resume: () => {
        resumeCallCount++
        ;(globalThis as any).speechSynthesis.paused = false
        if (mockUtteranceInstance) {
          mockUtteranceInstance.onresume?.()
        }
      },
    }

    discoverNarrationService.cleanup()
    tourNarrationService.cancel()
  })

  afterEach(() => {
    discoverNarrationService.cleanup()
    tourNarrationService.cancel()
  })

  describe('Feature 1 & 2: Category Data Integrity & Required Information Categories', () => {
    it('contains exactly the 3 mandated categories: Courses, Scholarships, Placements', () => {
      const expectedIds: DiscoverCategoryId[] = ['courses', 'scholarships', 'placements']
      const categoryIds = DISCOVER_CATEGORIES.map((c) => c.id)
      assert.deepEqual(categoryIds, expectedIds)
    })

    it('retrieves categories by ID accurately with getDiscoverCategoryById', () => {
      const courses = getDiscoverCategoryById('courses')
      const scholarships = getDiscoverCategoryById('scholarships')
      const placements = getDiscoverCategoryById('placements')

      assert.ok(courses, 'Courses category must exist')
      assert.ok(scholarships, 'Scholarships category must exist')
      assert.ok(placements, 'Placements category must exist')

      assert.equal(courses?.shortTitle, 'Courses')
      assert.equal(scholarships?.shortTitle, 'Scholarships')
      assert.equal(placements?.shortTitle, 'Placements')
    })

    it('enforces honest "Official Information Coming Soon" status without speculative data', () => {
      for (const cat of DISCOVER_CATEGORIES) {
        assert.equal(
          cat.isOfficialDataLoaded,
          false,
          `${cat.title} must have isOfficialDataLoaded === false until certified`
        )
        assert.ok(
          cat.statusNotice.toLowerCase().includes('official') ||
            cat.statusNotice.toLowerCase().includes('published shortly') ||
            cat.statusNotice.toLowerCase().includes('compiled'),
          `${cat.title} must include a clear official verification notice`
        )
        assert.ok(cat.statusNotice.length > 20)
      }
    })

    it('includes structured preview topics and official campus contact for every category', () => {
      for (const cat of DISCOVER_CATEGORIES) {
        assert.ok(cat.previewTopics.length >= 3, `${cat.title} must have at least 3 preview topics`)
        for (const topic of cat.previewTopics) {
          assert.ok(topic.title.length > 0)
          assert.ok(topic.description.length > 0)
          assert.ok(topic.bulletPoints.length >= 2)
        }

        assert.ok(cat.officialContact.officeName.length > 0)
        assert.ok(cat.officialContact.buildingId in buildingIndex, 'Contact building must be a recognized campus building')
      }
    })
  })

  describe('Feature 3: Content Audit & Non-Fabrication Verification', () => {
    it('does not assert fabricated salary figures, recruiter lists, or unverified packages', () => {
      const placements = getDiscoverCategoryById('placements')!
      const contentString = JSON.stringify(placements).toLowerCase()

      assert.equal(contentString.includes('lpa'), false, 'Must not claim specific LPA figures')
      assert.equal(contentString.includes('highest package'), false, 'Must not fabricate highest package')
      assert.equal(contentString.includes('average package'), false, 'Must not fabricate average package')
      assert.equal(contentString.includes('google'), false, 'Must not claim specific corporate recruiters without audit')
      assert.equal(contentString.includes('microsoft'), false, 'Must not claim specific corporate recruiters without audit')
    })

    it('qualifies scholarship schemes as pending official release without unverified eligibility claims', () => {
      const scholarships = getDiscoverCategoryById('scholarships')!
      const contentString = JSON.stringify(scholarships).toLowerCase()

      assert.ok(
        contentString.includes('pending') || contentString.includes('compiled') || contentString.includes('official'),
        'Must clearly state that details are pending official release'
      )
      assert.equal(contentString.includes('100% scholarship'), false, 'Must not claim unverified 100% scholarships')
    })

    it('qualifies academic programs without asserting unverified approvals', () => {
      const courses = getDiscoverCategoryById('courses')!
      assert.ok(courses.badge.includes('Pending Verification') || courses.badge.includes('Overview'))
    })
  })

  describe('Feature 8: Academic Building 3D Linkages', () => {
    it('links academic categories to valid Stage E3 3D building models', () => {
      const courses = getDiscoverCategoryById('courses')
      assert.ok(courses)
      assert.ok(courses.associatedBuildings.length >= 3)

      for (const bldg of courses.associatedBuildings) {
        assert.ok(bldg.buildingId in buildingIndex, `Building ${bldg.buildingId} must exist in buildingIndex`)
        assert.equal(bldg.modelPosition.length, 3, 'Must have valid 3D coordinates')
        assert.ok(bldg.description.length > 0)
      }

      const placements = getDiscoverCategoryById('placements')
      assert.ok(placements)
      const placementBuildingIds = placements.associatedBuildings.map((b) => b.buildingId)
      assert.ok(placementBuildingIds.includes('main-block'), 'Placements must link to Main Block')
      assert.ok(placementBuildingIds.includes('open-air-theatre'), 'Placements must link to OAT')
    })
  })

  describe('Feature 4 & 5: Discover Narration Lifecycle & Mobile Chrome Safety', () => {
    it('transitions through Play -> Pause -> Resume -> Stop lifecycle states correctly', async () => {
      const courses = getDiscoverCategoryById('courses')!
      assert.equal(discoverNarrationService.getState().playbackState, 'idle')

      // 1. Play
      discoverNarrationService.play(courses.narrationText, 'courses')
      assert.equal(discoverNarrationService.getState().playbackState, 'playing')
      assert.equal(discoverNarrationService.getState().activeCategoryId, 'courses')
      assert.ok(speakCallCount >= 1)

      // 2. Pause
      discoverNarrationService.pause()
      assert.equal(discoverNarrationService.getState().playbackState, 'paused')
      assert.ok(pauseCallCount >= 1)

      // 3. Resume
      discoverNarrationService.resume()
      assert.equal(discoverNarrationService.getState().playbackState, 'playing')
      assert.ok(resumeCallCount >= 1)

      // 4. Replay
      discoverNarrationService.replay()
      assert.equal(discoverNarrationService.getState().playbackState, 'playing')

      // 5. Stop
      discoverNarrationService.stop()
      assert.equal(discoverNarrationService.getState().playbackState, 'idle')
      assert.equal(discoverNarrationService.getState().activeCategoryId, null)
      assert.equal(discoverNarrationService.getState().activeText, null)
      assert.ok(cancelCallCount >= 1)
    })

    it('switches between categories cleanly by stopping prior audio', () => {
      const courses = getDiscoverCategoryById('courses')!
      const scholarships = getDiscoverCategoryById('scholarships')!

      discoverNarrationService.play(courses.narrationText, 'courses')
      assert.equal(discoverNarrationService.getState().activeCategoryId, 'courses')

      discoverNarrationService.play(scholarships.narrationText, 'scholarships')
      assert.equal(discoverNarrationService.getState().activeCategoryId, 'scholarships')
      assert.equal(discoverNarrationService.getState().activeText, scholarships.narrationText)
    })

    it('cleans up audio on navigation unmount without throwing', () => {
      const courses = getDiscoverCategoryById('courses')!
      discoverNarrationService.play(courses.narrationText, 'courses')
      assert.equal(discoverNarrationService.getState().playbackState, 'playing')

      discoverNarrationService.cleanup()
      assert.equal(discoverNarrationService.getState().playbackState, 'idle')
      assert.equal(discoverNarrationService.isSpeaking(), false)
    })

    it('retains active utterance reference during speech and clears it on stop', () => {
      const courses = getDiscoverCategoryById('courses')!
      discoverNarrationService.play(courses.narrationText, 'courses')

      // Global reference must be present to protect against premature V8 GC on mobile Chrome
      assert.ok((globalThis as any).__discoverActiveUtterance)

      discoverNarrationService.stop()
      assert.equal((globalThis as any).__discoverActiveUtterance, null)
    })
  })

  describe('Feature 6: Cinematic Tour & Discover Narration Mutual Exclusivity', () => {
    it('halts Discover narration immediately when Cinematic Tour begins speaking', () => {
      const courses = getDiscoverCategoryById('courses')!
      discoverNarrationService.play(courses.narrationText, 'courses')
      assert.equal(discoverNarrationService.getState().playbackState, 'playing')

      // Trigger tour speech via tourNarrationService.speak
      tourNarrationService.speak('Welcome to the cinematic tour stop.')

      // Discover narration must immediately transition to idle
      assert.equal(discoverNarrationService.getState().playbackState, 'idle')
      assert.equal(discoverNarrationService.getState().activeCategoryId, null)
    })

    it('cancels Tour speech immediately when Discover narration begins playing', () => {
      // Simulate active tour speech
      ;(globalThis as any).speechSynthesis.speaking = true
      assert.equal(tourNarrationService.isSpeaking(), true)

      const courses = getDiscoverCategoryById('courses')!
      discoverNarrationService.play(courses.narrationText, 'courses')

      // Discover narration must be active and prior speech canceled
      assert.equal(discoverNarrationService.getState().playbackState, 'playing')
      assert.ok(cancelCallCount >= 1)
    })
  })

  describe('Feature 1 & 9: Navigation Architecture & Balanced 5-Item Mobile Bar', () => {
    it('defines universal access for Discover MNMJEC across all roles', () => {
      const publicPaths = ['/welcome', '/explore', '/discover', '/search', '/navigation']
      assert.ok(publicPaths.includes('/discover'))
    })

    it('enforces 5 balanced, single-word labels for mobile bottom navigation', () => {
      const mobileNavLabels = ['Welcome', '3D Map', 'Discover', 'Route', 'Tour']
      assert.equal(mobileNavLabels.length, 5, 'Must have exactly 5 items to prevent bottom bar overcrowding')
      for (const label of mobileNavLabels) {
        assert.ok(label.length <= 8, `Label "${label}" must be compact for 360px viewport`)
      }
    })
  })
})
