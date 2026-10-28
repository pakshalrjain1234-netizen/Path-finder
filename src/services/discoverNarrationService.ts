import type { DiscoverCategoryId, NarrationPlaybackState } from '../types/discover.ts'
import { tourNarrationService } from './tourNarrationService.ts'

export interface DiscoverNarrationState {
  playbackState: NarrationPlaybackState
  activeCategoryId: DiscoverCategoryId | null
  activeText: string | null
}

export type DiscoverNarrationListener = (state: DiscoverNarrationState) => void

class DiscoverNarrationService {
  private playbackState: NarrationPlaybackState = 'idle'
  private activeCategoryId: DiscoverCategoryId | null = null
  private activeText: string | null = null
  private activeUtterance: SpeechSynthesisUtterance | null = null
  private sequenceCounter: number = 0
  private listeners: DiscoverNarrationListener[] = []

  constructor() {
    // Mutual exclusivity: whenever Cinematic Tour begins speaking, immediately halt Discover narration
    if (tourNarrationService.onBeforeSpeak) {
      tourNarrationService.onBeforeSpeak(() => {
        this.stop()
      })
    }
  }

  public isSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      'speechSynthesis' in window &&
      'SpeechSynthesisUtterance' in window
    )
  }

  public isSpeaking(): boolean {
    return this.playbackState === 'playing' || this.activeUtterance !== null
  }

  public getState(): DiscoverNarrationState {
    return {
      playbackState: this.playbackState,
      activeCategoryId: this.activeCategoryId,
      activeText: this.activeText,
    }
  }

  public subscribe(listener: DiscoverNarrationListener): () => void {
    this.listeners.push(listener)
    listener(this.getState())
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener)
    }
  }

  private notifyListeners() {
    const state = this.getState()
    this.listeners.forEach((listener) => {
      try {
        listener(state)
      } catch {
        // ignore listener errors
      }
    })
  }

  public play(text: string, categoryId: DiscoverCategoryId) {
    if (!this.isSupported() || !text.trim()) {
      return
    }

    // If currently paused on the exact same text, resume directly
    if (
      this.playbackState === 'paused' &&
      this.activeCategoryId === categoryId &&
      this.activeText === text
    ) {
      this.resume()
      return
    }

    const currentSeq = ++this.sequenceCounter
    this.stopInternal()

    this.activeCategoryId = categoryId
    this.activeText = text
    this.playbackState = 'playing'
    this.notifyListeners()

    try {
      // Discontinue any prior tour speech so audio streams NEVER overlap
      if (tourNarrationService.isSpeaking()) {
        tourNarrationService.cancel()
      }

      // Safe cancellation of any prior speech synthesis in browser
      if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
        window.speechSynthesis.cancel()
      }

      const utterance = new SpeechSynthesisUtterance(text)

      // Inherit voice configuration from TourNarrationService if available
      const voiceUri = tourNarrationService.getSelectedVoiceURI()
      if (voiceUri && 'speechSynthesis' in window) {
        const voices = window.speechSynthesis.getVoices()
        const matched = voices.find((v) => v.voiceURI === voiceUri)
        if (matched) {
          utterance.voice = matched
        }
      }

      utterance.rate = tourNarrationService.getRate() || 0.95
      utterance.pitch = 1.0
      utterance.volume = 1.0

      // Retain strong references on both class instance and global window
      // Prevents premature V8 garbage collection on Android Chrome without artificial pause/resume polling
      this.activeUtterance = utterance
      if (typeof window !== 'undefined') {
        ;(window as any).__discoverActiveUtterance = utterance
      }

      let hasFinished = false

      utterance.onstart = () => {
        if (this.sequenceCounter !== currentSeq) return
        this.playbackState = 'playing'
        this.notifyListeners()
      }

      utterance.onpause = () => {
        if (this.sequenceCounter !== currentSeq) return
        this.playbackState = 'paused'
        this.notifyListeners()
      }

      utterance.onresume = () => {
        if (this.sequenceCounter !== currentSeq) return
        this.playbackState = 'playing'
        this.notifyListeners()
      }

      utterance.onend = () => {
        if (hasFinished || this.sequenceCounter !== currentSeq) return
        hasFinished = true
        this.activeUtterance = null
        if (typeof window !== 'undefined') {
          ;(window as any).__discoverActiveUtterance = null
        }
        this.playbackState = 'ended'
        this.notifyListeners()
      }

      utterance.onerror = (e) => {
        if (hasFinished || this.sequenceCounter !== currentSeq) return
        hasFinished = true
        this.activeUtterance = null
        if (typeof window !== 'undefined') {
          ;(window as any).__discoverActiveUtterance = null
        }

        // Interrupted or canceled are normal lifecycle events during navigation, stop, or tab switch
        if (e.error === 'interrupted' || e.error === 'canceled') {
          return
        }

        this.playbackState = 'idle'
        this.notifyListeners()
      }

      window.speechSynthesis.speak(utterance)
    } catch {
      this.activeUtterance = null
      if (typeof window !== 'undefined') {
        ;(window as any).__discoverActiveUtterance = null
      }
      this.playbackState = 'idle'
      this.notifyListeners()
    }
  }

  public pause() {
    if (!this.isSupported() || this.playbackState !== 'playing') {
      return
    }

    try {
      window.speechSynthesis.pause()
      this.playbackState = 'paused'
      this.notifyListeners()
    } catch {
      // ignore
    }
  }

  public resume() {
    if (!this.isSupported() || this.playbackState !== 'paused') {
      return
    }

    try {
      window.speechSynthesis.resume()
      this.playbackState = 'playing'
      this.notifyListeners()
    } catch {
      // Mobile Chrome safe recovery: if native resume throws, restart playback safely
      if (this.activeText && this.activeCategoryId) {
        this.play(this.activeText, this.activeCategoryId)
      }
    }
  }

  public replay(text?: string, categoryId?: DiscoverCategoryId) {
    const targetText = text ?? this.activeText
    const targetCat = categoryId ?? this.activeCategoryId
    if (targetText && targetCat) {
      this.stop()
      this.play(targetText, targetCat)
    }
  }

  public stop() {
    this.stopInternal()
    this.playbackState = 'idle'
    this.activeCategoryId = null
    this.activeText = null
    this.notifyListeners()
  }

  private stopInternal() {
    if (this.isSupported()) {
      try {
        if (window.speechSynthesis.speaking || window.speechSynthesis.pending || window.speechSynthesis.paused) {
          window.speechSynthesis.cancel()
        }
      } catch {
        // ignore
      }
    }
    this.activeUtterance = null
    if (typeof window !== 'undefined') {
      ;(window as any).__discoverActiveUtterance = null
    }
  }

  /**
   * Safe cleanup called on navigation unmount or tab hide
   */
  public cleanup() {
    this.stop()
  }
}

export const discoverNarrationService = new DiscoverNarrationService()
