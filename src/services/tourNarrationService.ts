const MUTE_STORAGE_KEY = 'pathfinder_tour_narration_muted'
const VOICE_STORAGE_KEY = 'pathfinder_tour_narration_voice_uri'
const RATE_STORAGE_KEY = 'pathfinder_tour_narration_rate'

export interface NarrationVoiceOption {
  name: string
  lang: string
  voiceURI: string
  isNatural: boolean
  isIndian: boolean
  isFemale: boolean
  isDefault: boolean
  displayName: string
}

export interface VoiceStatus {
  voiceName: string
  lang: string
  isFemale: boolean
  isIndianEnglish: boolean
  isNatural: boolean
  tier: 1 | 2 | 3
  tierDescription: string
}

export interface TourNarrationProvider {
  isSupported(): boolean
  isSpeaking(): boolean
  speak(
    text: string,
    onStartOrOptions?: (() => void) | { onStart?: () => void; onEnd?: () => void; onError?: (err: any) => void },
    onEnd?: () => void,
    onError?: (err: any) => void
  ): void
  cancel(): void
  pause(): void
  resume(): void
}

// Female voice identification markers across Windows, Android, iOS, macOS, Chrome, Edge
const FEMALE_VOICE_MARKERS = [
  'female',
  'woman',
  // Indian English female voices
  'neerja',
  'aditi',
  'heera',
  'priya',
  'veena',
  'ananya',
  'kavya',
  'shruti',
  'sangeeta',
  'isha',
  'swara',
  'jaya',
  // Microsoft Natural / Neural female voices
  'zira',
  'jenny',
  'aria',
  'sonia',
  'libby',
  'hazel',
  'susan',
  'michelle',
  'mia',
  'ana',
  'clara',
  'ava',
  'emma',
  // Apple female voices
  'samantha',
  'victoria',
  'karen',
  'moira',
  'tessa',
  'fiona',
  'serena',
  'stephanie',
  'alice',
  'kate',
  'allison',
  // Google female voices
  'google uk english female',
  'google us english female',
]

const MALE_VOICE_MARKERS = [
  'male',
  'man',
  'david',
  'mark',
  'george',
  'guy',
  'ravi',
  'prabhat',
  'james',
  'richard',
  'daniel',
  'stefan',
  'ryan',
  'eric',
  'oliver',
  'paul',
  'brian',
  'andrew',
  'thomas',
  'michael',
  'christopher',
  'alex',
  'fred',
  'albert',
]

export function isVoiceIdentifiedFemale(voice: SpeechSynthesisVoice): boolean {
  const nameLower = voice.name.toLowerCase()
  return FEMALE_VOICE_MARKERS.some((marker) => nameLower.includes(marker))
}

export function isVoiceIdentifiedMale(voice: SpeechSynthesisVoice): boolean {
  const nameLower = voice.name.toLowerCase()
  return MALE_VOICE_MARKERS.some((marker) => nameLower.includes(marker))
}

class TourNarrationService implements TourNarrationProvider {
  private muted: boolean = false
  private currentUtterance: SpeechSynthesisUtterance | null = null
  private preferredVoice: SpeechSynthesisVoice | null = null
  private savedVoiceURI: string | null = null
  private speechRate: number = 0.95
  private sequenceCounter: number = 0
  private heartbeatTimer: NodeJS.Timeout | null = null
  private voices: SpeechSynthesisVoice[] = []
  private voiceListeners: Array<(voices: NarrationVoiceOption[]) => void> = []

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        const storedMute = localStorage.getItem(MUTE_STORAGE_KEY)
        this.muted = storedMute === 'true'

        const storedVoice = localStorage.getItem(VOICE_STORAGE_KEY)
        if (storedVoice) this.savedVoiceURI = storedVoice

        const storedRate = localStorage.getItem(RATE_STORAGE_KEY)
        if (storedRate) {
          const parsedRate = Number.parseFloat(storedRate)
          if (!Number.isNaN(parsedRate) && parsedRate >= 0.75 && parsedRate <= 1.3) {
            this.speechRate = parsedRate
          }
        }
      } catch {
        this.muted = false
      }

      if ('speechSynthesis' in window) {
        this.loadVoices()
        window.speechSynthesis.onvoiceschanged = () => {
          this.loadVoices()
        }
      }
    }
  }

  /**
   * Evaluates voice quality and classifies into preference tiers:
   * Tier 1: Natural Indian English female voice (highest priority)
   * Tier 2: Natural English female voice (second priority)
   * Tier 3: Best available English voice (honest fallback)
   */
  public analyzeVoice(voice: SpeechSynthesisVoice): {
    tier: 1 | 2 | 3
    isFemale: boolean
    isIndian: boolean
    isNatural: boolean
    score: number
  } {
    const nameLower = voice.name.toLowerCase()
    const langLower = voice.lang.toLowerCase()

    const isEnglish = langLower.startsWith('en') || langLower.includes('en-') || langLower.includes('en_')
    if (!isEnglish) {
      return { tier: 3, isFemale: false, isIndian: false, isNatural: false, score: -1000 }
    }

    const isIndian = langLower.includes('in') || nameLower.includes('india') || nameLower.includes('hindi')
    const isFemale = isVoiceIdentifiedFemale(voice)
    const isMale = isVoiceIdentifiedMale(voice)

    const isNatural =
      nameLower.includes('natural') ||
      nameLower.includes('neural') ||
      nameLower.includes('online') ||
      nameLower.includes('google') ||
      nameLower.includes('premium') ||
      nameLower.includes('enhanced') ||
      nameLower.includes('wavenet')

    let score = 0
    if (isNatural) score += 150
    if (isIndian) score += 80
    if (nameLower.includes('espeak') || nameLower.includes('compact') || nameLower.includes('legacy')) {
      score -= 100
    }

    // Determine tier strictly
    if (isFemale && !isMale) {
      if (isIndian) {
        return { tier: 1, isFemale: true, isIndian: true, isNatural, score: score + 1000 }
      }
      return { tier: 2, isFemale: true, isIndian: false, isNatural, score: score + 500 }
    }

    // Tier 3: Honest fallback when no female voice is detected
    return { tier: 3, isFemale: false, isIndian, isNatural, score }
  }

  public loadVoices() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    const rawVoices = window.speechSynthesis.getVoices()
    if (!rawVoices || rawVoices.length === 0) return

    this.voices = rawVoices

    // Filter English voices
    const englishVoices = rawVoices.filter(
      (v) => v.lang.startsWith('en') || v.lang.includes('en-') || v.lang.includes('en_')
    )

    if (englishVoices.length === 0) {
      this.preferredVoice = rawVoices[0] ?? null
      this.notifyVoiceListeners()
      return
    }

    // Check if a saved voice URI exists and is valid
    if (this.savedVoiceURI) {
      const match = englishVoices.find((v) => v.voiceURI === this.savedVoiceURI)
      if (match) {
        this.preferredVoice = match
        this.notifyVoiceListeners()
        return
      }
    }

    // Sort strictly by preference tiers: Tier 1 > Tier 2 > Tier 3, then by score
    const analyzed = englishVoices.map((voice) => ({
      voice,
      ...this.analyzeVoice(voice),
    }))

    analyzed.sort((a, b) => {
      if (a.tier !== b.tier) return a.tier - b.tier
      return b.score - a.score
    })

    this.preferredVoice = analyzed[0].voice
    this.notifyVoiceListeners()
  }

  public getVoiceStatus(): VoiceStatus {
    if (!this.preferredVoice) {
      return {
        voiceName: 'Default System Voice',
        lang: 'en-US',
        isFemale: false,
        isIndianEnglish: false,
        isNatural: false,
        tier: 3,
        tierDescription: 'Browser default speech synthesis',
      }
    }

    const analysis = this.analyzeVoice(this.preferredVoice)
    const tierDescription =
      analysis.tier === 1
        ? 'Natural Indian English Female Voice'
        : analysis.tier === 2
          ? 'Natural English Female Voice'
          : 'Standard English Voice (Female voice not installed on device)'

    return {
      voiceName: this.preferredVoice.name,
      lang: this.preferredVoice.lang,
      isFemale: analysis.isFemale,
      isIndianEnglish: analysis.isIndian,
      isNatural: analysis.isNatural,
      tier: analysis.tier,
      tierDescription,
    }
  }

  private notifyVoiceListeners() {
    const options = this.getAvailableVoices()
    this.voiceListeners.forEach((listener) => {
      try {
        listener(options)
      } catch {
        // ignore listener errors
      }
    })
  }

  public onVoicesChanged(listener: (voices: NarrationVoiceOption[]) => void): () => void {
    this.voiceListeners.push(listener)
    listener(this.getAvailableVoices())
    return () => {
      this.voiceListeners = this.voiceListeners.filter((l) => l !== listener)
    }
  }

  public getAvailableVoices(): NarrationVoiceOption[] {
    const englishVoices = this.voices.filter(
      (v) => v.lang.startsWith('en') || v.lang.includes('en-') || v.lang.includes('en_')
    )

    return englishVoices.map((v) => {
      const analysis = this.analyzeVoice(v)
      const isSelected = this.preferredVoice ? this.preferredVoice.voiceURI === v.voiceURI : false

      let displayName = v.name
        .replace(/microsoft\s*/i, '')
        .replace(/google\s*/i, 'Google ')
        .replace(/\s*online\s*\(/i, ' (')

      return {
        name: v.name,
        displayName: `${displayName} (${v.lang})${analysis.isNatural ? ' • Natural' : ''}${analysis.isFemale ? ' • Female' : ''}`,
        lang: v.lang,
        voiceURI: v.voiceURI,
        isNatural: analysis.isNatural,
        isIndian: analysis.isIndian,
        isFemale: analysis.isFemale,
        isDefault: isSelected,
      }
    })
  }

  public getSelectedVoice(): NarrationVoiceOption | null {
    if (!this.preferredVoice) return null
    const analysis = this.analyzeVoice(this.preferredVoice)
    return {
      name: this.preferredVoice.name,
      displayName: this.preferredVoice.name,
      lang: this.preferredVoice.lang,
      voiceURI: this.preferredVoice.voiceURI,
      isNatural: analysis.isNatural,
      isIndian: analysis.isIndian,
      isFemale: analysis.isFemale,
      isDefault: true,
    }
  }

  public setSelectedVoice(voiceURI: string) {
    this.setSelectedVoiceURI(voiceURI)
  }

  public setSelectedVoiceURI(voiceURI: string | null) {
    if (!voiceURI) {
      this.savedVoiceURI = null
      this.preferredVoice = null
      try {
        localStorage.removeItem(VOICE_STORAGE_KEY)
      } catch {
        // storage unavailable
      }
      this.loadVoices()
      return
    }
    const match = this.voices.find((v) => v.voiceURI === voiceURI)
    if (match) {
      this.preferredVoice = match
      this.savedVoiceURI = voiceURI
      try {
        localStorage.setItem(VOICE_STORAGE_KEY, voiceURI)
      } catch {
        // storage unavailable
      }
      this.notifyVoiceListeners()
    } else {
      this.savedVoiceURI = voiceURI
    }
  }

  public getSelectedVoiceURI(): string | null {
    return this.preferredVoice?.voiceURI ?? this.savedVoiceURI
  }

  public getRate(): number {
    return this.speechRate
  }

  public setRate(rate: number) {
    const clamped = Math.max(0.75, Math.min(1.25, rate))
    this.speechRate = clamped
    try {
      localStorage.setItem(RATE_STORAGE_KEY, clamped.toString())
    } catch {
      // storage unavailable
    }
  }

  public previewVoice(voiceURI?: string) {
    if (voiceURI) {
      this.setSelectedVoice(voiceURI)
    }
    const sample =
      'Welcome to Misrimal Navajee Munoth Jain Engineering College. This is a demonstration of our natural campus tour narration.'
    this.speak(sample)
  }

  public isSupported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window
  }

  public getIsMuted(): boolean {
    return this.muted
  }

  public isMuted(): boolean {
    return this.muted
  }

  public setMuted(muted: boolean) {
    this.muted = muted
    try {
      localStorage.setItem(MUTE_STORAGE_KEY, muted ? 'true' : 'false')
    } catch {
      // storage unavailable
    }
    if (muted) {
      this.cancel()
    }
  }

  public toggleMute(): boolean {
    this.setMuted(!this.muted)
    return this.muted
  }

  public pause() {
    if (this.isSupported()) {
      try {
        window.speechSynthesis.pause()
      } catch {
        // ignore
      }
    }
  }

  public resume() {
    if (this.isSupported()) {
      try {
        window.speechSynthesis.resume()
      } catch {
        // ignore
      }
    }
  }

  private clearHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }

  private startHeartbeat() {
    this.clearHeartbeat()
    // On mobile / Android Chrome, calling pause()/resume() freezes the native TTS engine.
    // We only perform non-destructive liveness checks and rely on GC retention.
    const isMobileDevice =
      typeof window !== 'undefined' &&
      (('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent))

    if (isMobileDevice) {
      return
    }

    // Desktop Chromium 15s utterance keep-alive
    this.heartbeatTimer = setInterval(() => {
      if (this.isSupported() && window.speechSynthesis.speaking) {
        try {
          window.speechSynthesis.pause()
          window.speechSynthesis.resume()
        } catch {
          // ignore
        }
      } else {
        this.clearHeartbeat()
      }
    }, 9000)
  }

  /**
   * Speaks narration text.
   * Gated strictly by actual utterance completion.
   * Cancellations and voice errors are distinguished from natural completion.
   */
  public speak(
    text: string,
    onStartOrOptions?: (() => void) | { onStart?: () => void; onEnd?: () => void; onError?: (err: any) => void },
    onEnd?: () => void,
    onError?: (err: any) => void
  ) {
    if (!this.isSupported() || this.muted || !text.trim()) {
      return
    }

    let startCb: (() => void) | undefined
    let endCb: (() => void) | undefined
    let errorCb: ((err: any) => void) | undefined

    if (typeof onStartOrOptions === 'function') {
      startCb = onStartOrOptions
      endCb = onEnd
      errorCb = onError
    } else if (onStartOrOptions && typeof onStartOrOptions === 'object') {
      startCb = onStartOrOptions.onStart
      endCb = onStartOrOptions.onEnd
      errorCb = onStartOrOptions.onError
    }

    // Sequence token invalidates all prior speech events
    const currentSeq = ++this.sequenceCounter

    this.cancelInternal()

    try {
      const utterance = new SpeechSynthesisUtterance(text)
      if (this.preferredVoice) {
        utterance.voice = this.preferredVoice
      }

      // Maintain natural speaking rate and authentic pitch (1.0)
      utterance.rate = this.speechRate
      utterance.pitch = 1.0
      utterance.volume = 1.0

      // Retain strong global reference to prevent premature V8 garbage collection on Android Chrome
      if (typeof window !== 'undefined') {
        ;(window as any).__pathfinderActiveUtterance = utterance
      }

      let hasFinished = false

      utterance.onstart = () => {
        if (this.sequenceCounter !== currentSeq) return
        startCb?.()
      }

      // Natural audio completion: the ONLY valid completion signal
      utterance.onend = () => {
        if (hasFinished || this.sequenceCounter !== currentSeq) return
        hasFinished = true
        this.clearHeartbeat()
        this.currentUtterance = null
        if (typeof window !== 'undefined') {
          delete (window as any).__pathfinderActiveUtterance
        }
        endCb?.()
      }

      utterance.onerror = (e) => {
        if (hasFinished || this.sequenceCounter !== currentSeq) return
        hasFinished = true
        this.clearHeartbeat()
        this.currentUtterance = null
        if (typeof window !== 'undefined') {
          delete (window as any).__pathfinderActiveUtterance
        }

        // Cancellation or intentional interruption must NEVER count as completed speech
        if (e.error === 'canceled' || e.error === 'interrupted') {
          return
        }

        // Real synthesis error
        errorCb?.(e)
      }

      this.currentUtterance = utterance
      this.startHeartbeat()
      window.speechSynthesis.speak(utterance)
    } catch (err) {
      this.clearHeartbeat()
      this.currentUtterance = null
      if (typeof window !== 'undefined') {
        delete (window as any).__pathfinderActiveUtterance
      }
      errorCb?.(err)
    }
  }

  private cancelInternal() {
    this.clearHeartbeat()
    if (this.isSupported()) {
      try {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume()
        }
        window.speechSynthesis.cancel()
      } catch {
        // ignore
      }
    }
    this.currentUtterance = null
    if (typeof window !== 'undefined') {
      try {
        delete (window as any).__pathfinderActiveUtterance
      } catch {
        // ignore
      }
    }
  }

  public cancel() {
    this.sequenceCounter++
    this.cancelInternal()
  }

  public isSpeaking(): boolean {
    return this.currentUtterance !== null || (this.isSupported() && window.speechSynthesis.speaking)
  }
}

export const tourNarrationService = new TourNarrationService()
