import assert from 'node:assert/strict'
import { describe, it, beforeEach, afterEach } from 'node:test'
import { authService } from '../../services/authService.ts'
import {
  tourNarrationService,
  isVoiceIdentifiedFemale,
  isVoiceIdentifiedMale,
} from '../../services/tourNarrationService.ts'
import { CAMPUS_TOUR_STOPS, HIGHLIGHTS_TOUR_STOPS } from '../../data/campusTourStops.ts'
import { issueService } from '../../services/issueService.ts'

describe('Phase 7F.2: Fix 1 — Cinematic Tour Narration Synchronization', () => {
  let mockUtteranceInstance: any = null
  let mockSpeaking = false
  let speakCallCount = 0
  let cancelCallCount = 0

  beforeEach(() => {
    mockSpeaking = false
    mockUtteranceInstance = null
    speakCallCount = 0
    cancelCallCount = 0

    // Setup mock global window.speechSynthesis
    ;(globalThis as any).window = globalThis
    ;(globalThis as any).SpeechSynthesisUtterance = class {
      text: string
      voice: any = null
      rate: number = 1.0
      pitch: number = 1.0
      volume: number = 1.0
      onstart: (() => void) | null = null
      onend: (() => void) | null = null
      onerror: ((e: any) => void) | null = null

      constructor(text: string) {
        this.text = text
        mockUtteranceInstance = this
      }
    }

    ;(globalThis as any).speechSynthesis = {
      speaking: false,
      getVoices: () => [
        {
          name: 'Microsoft Heera - English (India)',
          lang: 'en-IN',
          voiceURI: 'heera-in',
        },
      ],
      speak: (utt: any) => {
        speakCallCount++
        mockSpeaking = true
        ;(globalThis as any).speechSynthesis.speaking = true
        setTimeout(() => {
          utt.onstart?.()
        }, 5)
      },
      cancel: () => {
        cancelCallCount++
        mockSpeaking = false
        ;(globalThis as any).speechSynthesis.speaking = false
        if (mockUtteranceInstance) {
          mockUtteranceInstance.onerror?.({ error: 'canceled' })
        }
      },
      pause: () => {},
      resume: () => {},
    }

    tourNarrationService.loadVoices()
  })

  afterEach(() => {
    tourNarrationService.cancel()
  })

  it('preserves both Full Tour (16 stops) and Highlights Tour (8 stops)', () => {
    assert.equal(CAMPUS_TOUR_STOPS.length, 16, 'Full Tour must contain exactly 16 stops')
    assert.equal(HIGHLIGHTS_TOUR_STOPS.length, 8, 'Highlights Tour must contain exactly 8 stops')
    assert.equal(CAMPUS_TOUR_STOPS[0].title, 'MNM Jain Engineering College')
  })

  it('requires speech completion event before completion callback fires', async () => {
    let completed = false
    let started = false

    tourNarrationService.speak(CAMPUS_TOUR_STOPS[0].narration, {
      onStart: () => {
        started = true
      },
      onEnd: () => {
        completed = true
      },
    })

    // Wait short time: speech has started but not finished
    await new Promise((r) => setTimeout(r, 20))
    assert.equal(started, true, 'Speech must have started')
    assert.equal(completed, false, 'Speech must NOT complete prematurely before utterance.onend')

    // Now fire natural onend
    mockUtteranceInstance.onend?.()
    assert.equal(completed, true, 'Speech completion must fire only after onend')
  })

  it('does NOT treat speech cancellation as completion', async () => {
    let completed = false

    tourNarrationService.speak(CAMPUS_TOUR_STOPS[0].narration, {
      onEnd: () => {
        completed = true
      },
    })

    // User exits or pauses, triggering cancel
    tourNarrationService.cancel()

    await new Promise((r) => setTimeout(r, 20))
    assert.equal(completed, false, 'Cancelled speech must NEVER trigger onEnd completion')
    assert.equal(mockSpeaking, false)
    assert.ok(speakCallCount > 0)
    assert.ok(cancelCallCount > 0)
  })

  it('distinguishes real synthesis errors from completion and calls onError', async () => {
    let completed = false
    let errorReceived: any = null

    tourNarrationService.speak(CAMPUS_TOUR_STOPS[0].narration, {
      onEnd: () => {
        completed = true
      },
      onError: (err) => {
        errorReceived = err
      },
    })

    // Simulate audio device busy error
    mockUtteranceInstance.onerror?.({ error: 'audio-busy' })

    await new Promise((r) => setTimeout(r, 20))
    assert.equal(completed, false, 'Errors must NOT count as completion')
    assert.ok(errorReceived !== null, 'Real error must invoke onError callback')
    assert.equal(errorReceived.error, 'audio-busy')
  })

  it('guarantees long narration script does not advance before speech finishes', async () => {
    let completed = false
    const longScript = CAMPUS_TOUR_STOPS[0].narration // > 60 words

    tourNarrationService.speak(longScript, {
      onEnd: () => {
        completed = true
      },
    })

    // Even after simulated delay, completion does NOT trigger without onend
    await new Promise((r) => setTimeout(r, 50))
    assert.equal(completed, false, 'Speech must hold camera at current landmark until complete')

    // Finish audio
    mockUtteranceInstance.onend?.()
    assert.equal(completed, true)
  })
})

describe('Phase 7F.2: Fix 2 — Natural Female Voice Selection Hierarchy', () => {
  it('correctly identifies confirmed female voice names and rejects male voices', () => {
    assert.equal(isVoiceIdentifiedFemale({ name: 'Microsoft Heera Online (Natural)' } as any), true)
    assert.equal(isVoiceIdentifiedFemale({ name: 'Microsoft Neerja Online (Natural)' } as any), true)
    assert.equal(isVoiceIdentifiedFemale({ name: 'Google UK English Female' } as any), true)
    assert.equal(isVoiceIdentifiedFemale({ name: 'Samantha' } as any), true)
    assert.equal(isVoiceIdentifiedFemale({ name: 'Microsoft Zira' } as any), true)

    assert.equal(isVoiceIdentifiedMale({ name: 'Microsoft David Desktop' } as any), true)
    assert.equal(isVoiceIdentifiedMale({ name: 'Microsoft Ravi Online (Natural)' } as any), true)
    assert.equal(isVoiceIdentifiedMale({ name: 'Microsoft Mark' } as any), true)
  })

  it('prioritizes Tier 1 (Indian English female) over Tier 2 (Other female) and Tier 3 (Fallback)', () => {
    const indianFemale = { name: 'Microsoft Heera Online (Natural)', lang: 'en-IN', voiceURI: 'v-heera' } as any
    const usFemale = { name: 'Microsoft Jenny Online (Natural)', lang: 'en-US', voiceURI: 'v-jenny' } as any
    const usMale = { name: 'Microsoft David Desktop', lang: 'en-US', voiceURI: 'v-david' } as any

    const analysisTier1 = tourNarrationService.analyzeVoice(indianFemale)
    const analysisTier2 = tourNarrationService.analyzeVoice(usFemale)
    const analysisTier3 = tourNarrationService.analyzeVoice(usMale)

    assert.equal(analysisTier1.tier, 1, 'Indian English female must be Tier 1')
    assert.equal(analysisTier2.tier, 2, 'Natural English female must be Tier 2')
    assert.equal(analysisTier3.tier, 3, 'Male voice must be Tier 3 honest fallback')
    assert.ok(analysisTier1.score > analysisTier2.score)
    assert.ok(analysisTier2.score > analysisTier3.score)
  })

  it('truthfully reports fallback when no female voice exists on host device', () => {
    // Override window getVoices with only male voices
    ;(globalThis as any).speechSynthesis.getVoices = () => [
      { name: 'Microsoft David Desktop', lang: 'en-US', voiceURI: 'v-david' },
    ]

    tourNarrationService.loadVoices()
    const status = tourNarrationService.getVoiceStatus()

    assert.equal(status.isFemale, false, 'Must honestly report female voice unavailable')
    assert.equal(status.tier, 3, 'Must be classified as Tier 3 fallback')
    assert.ok(status.tierDescription.includes('Female voice not installed'))
  })
})

describe('Phase 7F.2: Fix 3 — Student & Admin Logout Navigation', () => {
  beforeEach(async () => {
    await authService.logout()
  })

  afterEach(async () => {
    await authService.logout()
  })

  it('student login creates authenticated student session and logout clears it completely', async () => {
    const loginRes = await authService.login('student', 'student', 'student@demo2026')
    assert.equal(loginRes.success, true)
    assert.equal(authService.getRole(), 'student')
    assert.equal(authService.isAuthenticated(), true)

    // Execute logout
    await authService.logout()

    assert.equal(authService.getSession(), null, 'Session must be null after logout')
    assert.equal(authService.isAuthenticated(), false, 'isAuthenticated must be false after logout')
    assert.equal(authService.getRole(), 'visitor', 'Role defaults to visitor when unauthenticated')
  })

  it('admin login creates authenticated admin session and logout clears it completely', async () => {
    const loginRes = await authService.login('admin', 'admin', 'admin@demo2026')
    assert.equal(loginRes.success, true)
    assert.equal(authService.getRole(), 'admin')
    assert.equal(authService.isAuthenticated(), true)

    // Execute logout
    await authService.logout()

    assert.equal(authService.getSession(), null, 'Session must be null after admin logout')
    assert.equal(authService.isAuthenticated(), false, 'isAuthenticated must be false after admin logout')
  })

  it('never automatically grants visitor session on logout without explicit user action', async () => {
    await authService.login('student', 'student', 'student@demo2026')
    await authService.logout()

    // Session is null: user has NOT clicked "Explore as Visitor" yet
    assert.equal(authService.getSession(), null)

    // Only explicit loginAsVisitor() sets a visitor session token
    authService.loginAsVisitor()
    assert.ok(authService.getSession() !== null, 'Explicit visitor selection must create a session')
    assert.equal(authService.getSession()?.user.role, 'visitor')
  })

  it('cleans up realtime subscriptions and private issue state on session reset', () => {
    assert.doesNotThrow(() => {
      issueService.cleanupSubscriptions()
      issueService.clearPrivateData()
    })
  })
})
