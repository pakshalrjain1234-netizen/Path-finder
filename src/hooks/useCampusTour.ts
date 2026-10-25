import { useCallback, useEffect, useRef, useState } from 'react'
import {
  CAMPUS_TOUR_STOPS,
  HIGHLIGHTS_TOUR_STOPS,
  type CampusTourStop,
} from '../data/campusTourStops'
import {
  tourNarrationService,
  type NarrationVoiceOption,
  type VoiceStatus,
} from '../services/tourNarrationService'

export type TourMode = 'full' | 'highlights'

/**
 * Coordinated Tour State Machine Phases:
 * FLYING_TO_STOP -> CAMERA_SETTLED -> NARRATING_STOP -> NARRATION_FINISHED -> SHORT_TRANSITION_PAUSE -> FLYING_TO_NEXT_STOP
 */
export type TourPlaybackPhase =
  | 'idle'
  | 'flying'             // Camera flying towards landmark (FLYING_TO_STOP)
  | 'transitioning'     // Alias for 'flying' for backwards compatibility
  | 'camera_settled'     // Camera arrived and settled at landmark (CAMERA_SETTLED)
  | 'narrating'          // Voice actively speaking landmark script (NARRATING_STOP)
  | 'narration_finished' // Natural speech ended completely (NARRATION_FINISHED)
  | 'dwelling'           // 0-1s cinematic viewing pause before flying to next stop (SHORT_TRANSITION_PAUSE)
  | 'paused'             // Tour paused by user
  | 'error'              // Narration error (provides retry/skip)
  | 'completed'          // All stops completed

export interface UseCampusTourReturn {
  isTourActive: boolean
  tourMode: TourMode
  phase: TourPlaybackPhase
  currentStopIndex: number
  totalStops: number
  currentStop: CampusTourStop | null
  activeStop: CampusTourStop | null
  isPlaying: boolean
  isPaused: boolean
  isMuted: boolean
  isFullscreen: boolean
  autoplay: boolean
  progress: number
  stops: CampusTourStop[]
  speechRate: number
  availableVoices: NarrationVoiceOption[]
  selectedVoiceURI: string | null
  voiceStatus: VoiceStatus
  narrationError: string | null
  startTour: (mode?: TourMode) => void
  exitTour: () => void
  pauseTour: () => void
  resumeTour: () => void
  nextStop: () => void
  prevStop: () => void
  goToStop: (index: number) => void
  restartTour: () => void
  retryNarration: () => void
  skipToNextStop: () => void
  toggleMute: () => void
  toggleFullscreen: () => void
  setTourMode: (mode: TourMode) => void
  setAutoplay: (autoplay: boolean) => void
  setSpeechRate: (rate: number) => void
  setSelectedVoiceURI: (uri: string) => void
  previewVoice: (uri?: string) => void
  handleCameraArrived: (stopId: string) => void
}

const AUTOPLAY_STORAGE_KEY = 'pathfinder_tour_autoplay'

function getInitialAutoplay(): boolean {
  if (typeof window === 'undefined') return true
  try {
    const saved = localStorage.getItem(AUTOPLAY_STORAGE_KEY)
    if (saved !== null) {
      return saved === 'true'
    }
  } catch {
    // ignore
  }
  return true
}

export function useCampusTour(
  onBuildingSelect?: (buildingId: string | null) => void
): UseCampusTourReturn {
  const [isTourActive, setIsTourActive] = useState<boolean>(false)
  const [tourMode, setTourModeState] = useState<TourMode>('full')
  const [phase, setPhase] = useState<TourPlaybackPhase>('idle')
  const [currentStopIndex, setCurrentStopIndex] = useState<number>(0)
  const [isPlaying, setIsPlaying] = useState<boolean>(false)
  const [isPaused, setIsPaused] = useState<boolean>(false)
  const [isMuted, setIsMuted] = useState<boolean>(tourNarrationService.getIsMuted())
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false)
  const [autoplay, setAutoplayState] = useState<boolean>(getInitialAutoplay)
  const [progress, setProgress] = useState<number>(0)
  const [speechRate, setSpeechRateState] = useState<number>(tourNarrationService.getRate())
  const [availableVoices, setAvailableVoices] = useState<NarrationVoiceOption[]>([])
  const [selectedVoiceURI, setSelectedVoiceURIState] = useState<string | null>(
    tourNarrationService.getSelectedVoiceURI()
  )
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus>(tourNarrationService.getVoiceStatus())
  const [narrationError, setNarrationError] = useState<string | null>(null)

  const stops = tourMode === 'highlights' ? HIGHLIGHTS_TOUR_STOPS : CAMPUS_TOUR_STOPS
  const currentStop: CampusTourStop | null =
    isTourActive && stops[currentStopIndex] ? stops[currentStopIndex] : null

  // Persistent sequence tokens and timer refs
  const sequenceIdRef = useRef<number>(0)
  const cameraArrivalGuardTimerRef = useRef<NodeJS.Timeout | null>(null)
  const settleTimerRef = useRef<NodeJS.Timeout | null>(null)
  const dwellTimerRef = useRef<NodeJS.Timeout | null>(null)
  const readingTimerRef = useRef<NodeJS.Timeout | null>(null)
  const narrationWatchdogTimerRef = useRef<NodeJS.Timeout | null>(null)
  const progressAnimRef = useRef<number | null>(null)
  const phaseBeforePauseRef = useRef<TourPlaybackPhase>('idle')
  const narrationStartTimeRef = useRef<number>(0)
  const estimatedReadingMsRef = useRef<number>(5000)

  // Stable references for async callbacks
  const onBuildingSelectRef = useRef(onBuildingSelect)
  const currentStopRef = useRef(currentStop)
  const stopsRef = useRef(stops)
  const autoplayRef = useRef(autoplay)
  const isMutedRef = useRef(isMuted)
  const phaseRef = useRef(phase)
  const isTourActiveRef = useRef(isTourActive)
  const isPausedRef = useRef(isPaused)

  useEffect(() => {
    onBuildingSelectRef.current = onBuildingSelect
    currentStopRef.current = currentStop
    stopsRef.current = stops
    autoplayRef.current = autoplay
    isMutedRef.current = isMuted
    phaseRef.current = phase
    isTourActiveRef.current = isTourActive
    isPausedRef.current = isPaused
  })

  // Discover and sync voices asynchronously
  useEffect(() => {
    const updateVoices = () => {
      const voices = tourNarrationService.getAvailableVoices()
      setAvailableVoices(voices)
      setSelectedVoiceURIState(tourNarrationService.getSelectedVoiceURI())
      setVoiceStatus(tourNarrationService.getVoiceStatus())
    }
    updateVoices()
    const unsubscribe = tourNarrationService.onVoicesChanged(updateVoices)
    return () => {
      unsubscribe()
    }
  }, [])

  // Sync fullscreen change event
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement))
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [])

  // Clear all pending timers and progress animation frames
  const clearAllTimers = useCallback(() => {
    if (cameraArrivalGuardTimerRef.current) {
      clearTimeout(cameraArrivalGuardTimerRef.current)
      cameraArrivalGuardTimerRef.current = null
    }
    if (settleTimerRef.current) {
      clearTimeout(settleTimerRef.current)
      settleTimerRef.current = null
    }
    if (dwellTimerRef.current) {
      clearTimeout(dwellTimerRef.current)
      dwellTimerRef.current = null
    }
    if (readingTimerRef.current) {
      clearTimeout(readingTimerRef.current)
      readingTimerRef.current = null
    }
    if (narrationWatchdogTimerRef.current) {
      clearTimeout(narrationWatchdogTimerRef.current)
      narrationWatchdogTimerRef.current = null
    }
    if (progressAnimRef.current) {
      cancelAnimationFrame(progressAnimRef.current)
      progressAnimRef.current = null
    }
  }, [])

  // Immediate speech cessation when component unmounts or user navigates away from tour
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        tourNarrationService.cancel()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      clearAllTimers()
      tourNarrationService.cancel()
    }
  }, [clearAllTimers])

  const setAutoplay = useCallback((value: boolean) => {
    setAutoplayState(value)
    try {
      localStorage.setItem(AUTOPLAY_STORAGE_KEY, String(value))
    } catch {
      // ignore
    }
  }, [])

  const setSpeechRate = useCallback((rate: number) => {
    tourNarrationService.setRate(rate)
    setSpeechRateState(tourNarrationService.getRate())
  }, [])

  const setSelectedVoiceURI = useCallback((uri: string) => {
    tourNarrationService.setSelectedVoiceURI(uri)
    setSelectedVoiceURIState(uri)
    setVoiceStatus(tourNarrationService.getVoiceStatus())
  }, [])

  const previewVoice = useCallback((uri?: string) => {
    tourNarrationService.previewVoice(uri)
  }, [])

  const toggleMute = useCallback(() => {
    const next = tourNarrationService.toggleMute()
    setIsMuted(next)
  }, [])

  const toggleFullscreen = useCallback(() => {
    if (typeof document === 'undefined') return
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {})
    } else {
      document.exitFullscreen().catch(() => {})
    }
  }, [])

  /**
   * Called STRICTLY upon verified speech completion (or reading timer if muted).
   * Sequence: NARRATION_FINISHED -> SHORT_TRANSITION_PAUSE (0-1s) -> FLYING_TO_NEXT_STOP
   */
  const handleNarrationCompleted = useCallback((targetSeqId: number) => {
    if (targetSeqId !== sequenceIdRef.current) return
    clearAllTimers()
    setProgress(1)

    // Transition to NARRATION_FINISHED
    setPhase('narration_finished')

    // Transition to SHORT_TRANSITION_PAUSE (dwelling)
    setPhase('dwelling')

    if (autoplayRef.current) {
      // Wait crisp 0-1s (850ms) before camera moves to next building
      dwellTimerRef.current = setTimeout(() => {
        if (targetSeqId !== sequenceIdRef.current) return
        setCurrentStopIndex((prev) => {
          const allStops = stopsRef.current
          if (prev < allStops.length - 1) {
            setPhase('flying')
            return prev + 1
          }
          // Completed all stops!
          setPhase('completed')
          setIsPlaying(false)
          return prev
        })
      }, 850)
    }
  }, [clearAllTimers])

  /**
   * Phase transition: NARRATING_STOP
   * Begins voice narration only AFTER camera has settled at the landmark.
   * Gated strictly by actual audio completion callback.
   */
  const transitionToNarrating = useCallback((targetSeqId: number) => {
    if (targetSeqId !== sequenceIdRef.current) return
    const activeCurrentStop = currentStopRef.current
    if (!activeCurrentStop) return
    clearAllTimers()
    setNarrationError(null)

    setPhase('narrating')
    setProgress(0.15)

    const words = activeCurrentStop.narration.split(/\s+/).filter(Boolean).length
    const currentRate = tourNarrationService.getRate()
    const estReadingMs = Math.round(Math.max(4000, (words / (2.2 * currentRate)) * 1000))
    estimatedReadingMsRef.current = estReadingMs
    narrationStartTimeRef.current = Date.now()

    // Smooth visual progress indicator
    const updateProgress = () => {
      if (targetSeqId !== sequenceIdRef.current) return
      const elapsed = Date.now() - narrationStartTimeRef.current
      const pct = Math.min(0.96, 0.15 + (elapsed / estReadingMs) * 0.81)
      setProgress(pct)
      if (pct < 0.96) {
        progressAnimRef.current = requestAnimationFrame(updateProgress)
      }
    }
    progressAnimRef.current = requestAnimationFrame(updateProgress)

    if (!isMutedRef.current && tourNarrationService.isSupported()) {
      // Safe recovery watchdog for Android Chrome:
      // If voice narration stalls, freezes, or onEnd never fires, advance safely after reading estimate + safety margin
      const maxSafetyMs = Math.max(6500, estReadingMs + 3200)
      narrationWatchdogTimerRef.current = setTimeout(() => {
        if (targetSeqId === sequenceIdRef.current) {
          console.warn('Speech synthesis safety recovery triggered for:', activeCurrentStop.title)
          tourNarrationService.cancel()
          handleNarrationCompleted(targetSeqId)
        }
      }, maxSafetyMs)

      // Natural voice speech playback with strict completion callback
      tourNarrationService.speak(activeCurrentStop.narration, {
        onStart: () => {
          // Narration successfully commenced
        },
        onEnd: () => {
          if (narrationWatchdogTimerRef.current) {
            clearTimeout(narrationWatchdogTimerRef.current)
            narrationWatchdogTimerRef.current = null
          }
          // Authoritative audio completion signal: advance only now
          if (targetSeqId === sequenceIdRef.current) {
            handleNarrationCompleted(targetSeqId)
          }
        },
        onError: (err) => {
          if (narrationWatchdogTimerRef.current) {
            clearTimeout(narrationWatchdogTimerRef.current)
            narrationWatchdogTimerRef.current = null
          }
          if (targetSeqId !== sequenceIdRef.current) return
          console.warn('Speech synthesis error on landmark:', activeCurrentStop.title, err)
          // Safe recovery: advance after a brief reading pause rather than freezing the tour
          setNarrationError('Voice narration paused; continuing visual tour.')
          readingTimerRef.current = setTimeout(() => {
            if (targetSeqId === sequenceIdRef.current) {
              handleNarrationCompleted(targetSeqId)
            }
          }, 2200)
        },
      })
    } else {
      // Audio muted or unsupported: advance based on reading time
      readingTimerRef.current = setTimeout(() => {
        if (targetSeqId === sequenceIdRef.current) {
          handleNarrationCompleted(targetSeqId)
        }
      }, estReadingMs)
    }
  }, [clearAllTimers, handleNarrationCompleted])

  /**
   * Camera arrival handler:
   * Called by 3D canvas when camera lerp completes and settles at landmark.
   * Sequence: FLYING_TO_STOP -> CAMERA_SETTLED -> NARRATING_STOP
   */
  const handleCameraArrived = useCallback((stopId: string) => {
    if (
      !isTourActiveRef.current ||
      isPausedRef.current ||
      (phaseRef.current !== 'flying' && phaseRef.current !== 'transitioning')
    ) {
      return
    }

    const activeCurrentStop = currentStopRef.current
    if (activeCurrentStop && activeCurrentStop.id === stopId) {
      if (cameraArrivalGuardTimerRef.current) {
        clearTimeout(cameraArrivalGuardTimerRef.current)
        cameraArrivalGuardTimerRef.current = null
      }

      const seq = sequenceIdRef.current
      setPhase('camera_settled')

      // Crisp 200ms camera settle hold before narration begins
      settleTimerRef.current = setTimeout(() => {
        if (seq === sequenceIdRef.current) {
          transitionToNarrating(seq)
        }
      }, 200)
    }
  }, [transitionToNarrating])

  // Lifecycle driver: triggers when currentStopIndex changes or tour mode/active status changes
  useEffect(() => {
    if (!isTourActive || !currentStop || isPaused || !isPlaying) {
      return
    }

    const currentSeqId = ++sequenceIdRef.current
    clearAllTimers()
    tourNarrationService.cancel()
    setNarrationError(null)

    // Highlight building in 3D scene
    if (currentStop.buildingId) {
      onBuildingSelectRef.current?.(currentStop.buildingId)
    } else {
      onBuildingSelectRef.current?.(null)
    }

    // Step 1: FLYING_TO_STOP
    setPhase('flying')
    setProgress(0.05)

    // Safety guard for camera flight (e.g. non-WebGL or delayed canvas event)
    const cameraFlightGuardMs = 3200
    cameraArrivalGuardTimerRef.current = setTimeout(() => {
      if (currentSeqId === sequenceIdRef.current) {
        setPhase('camera_settled')
        settleTimerRef.current = setTimeout(() => {
          if (currentSeqId === sequenceIdRef.current) {
            transitionToNarrating(currentSeqId)
          }
        }, 200)
      }
    }, cameraFlightGuardMs)

    return () => {
      clearAllTimers()
    }
  }, [
    isTourActive,
    currentStopIndex,
    tourMode,
    isPaused,
    isPlaying,
    currentStop,
    clearAllTimers,
    transitionToNarrating,
  ])

  // Start tour from the beginning
  const startTour = useCallback(
    (mode: TourMode = 'full') => {
      clearAllTimers()
      tourNarrationService.cancel()
      sequenceIdRef.current++

      setTourModeState(mode)
      setCurrentStopIndex(0)
      setProgress(0)
      setIsTourActive(true)
      setIsPlaying(true)
      setIsPaused(false)
      setNarrationError(null)
      setPhase('flying')
    },
    [clearAllTimers]
  )

  // Exit tour completely and restore normal controls
  const exitTour = useCallback(() => {
    sequenceIdRef.current++
    clearAllTimers()
    tourNarrationService.cancel()

    setIsTourActive(false)
    setIsPlaying(false)
    setIsPaused(false)
    setNarrationError(null)
    setPhase('idle')
    setProgress(0)
    onBuildingSelectRef.current?.(null)
  }, [clearAllTimers])

  // Pause playback
  const pauseTour = useCallback(() => {
    if (!isPlaying || isPaused) return
    clearAllTimers()
    tourNarrationService.pause()

    phaseBeforePauseRef.current = phaseRef.current
    setIsPaused(true)
    setIsPlaying(false)
    setPhase('paused')
  }, [isPlaying, isPaused, clearAllTimers])

  // Resume playback smoothly without skipping the current building
  const resumeTour = useCallback(() => {
    if (!isTourActiveRef.current || !isPausedRef.current) return
    const newSeqId = ++sequenceIdRef.current
    setIsPaused(false)
    setIsPlaying(true)

    const prevPhase = phaseBeforePauseRef.current
    if (prevPhase === 'dwelling' || prevPhase === 'narration_finished') {
      handleNarrationCompleted(newSeqId)
    } else if (prevPhase === 'narrating') {
      transitionToNarrating(newSeqId)
    } else {
      // Resume camera flight
      setPhase('flying')
      cameraArrivalGuardTimerRef.current = setTimeout(() => {
        if (newSeqId === sequenceIdRef.current) {
          transitionToNarrating(newSeqId)
        }
      }, 2500)
    }
  }, [handleNarrationCompleted, transitionToNarrating])

  // Manual Next stop override
  const nextStop = useCallback(() => {
    sequenceIdRef.current++
    clearAllTimers()
    tourNarrationService.cancel()
    setNarrationError(null)

    setProgress(0)
    setIsPlaying(true)
    setIsPaused(false)
    setPhase('flying')
    setCurrentStopIndex((prev) => Math.min(stopsRef.current.length - 1, prev + 1))
  }, [clearAllTimers])

  // Manual Previous stop override
  const prevStop = useCallback(() => {
    sequenceIdRef.current++
    clearAllTimers()
    tourNarrationService.cancel()
    setNarrationError(null)

    setProgress(0)
    setIsPlaying(true)
    setIsPaused(false)
    setPhase('flying')
    setCurrentStopIndex((prev) => Math.max(0, prev - 1))
  }, [clearAllTimers])

  // Manual jump to specific stop
  const goToStop = useCallback(
    (index: number) => {
      const allStops = stopsRef.current
      if (index < 0 || index >= allStops.length) return
      sequenceIdRef.current++
      clearAllTimers()
      tourNarrationService.cancel()
      setNarrationError(null)

      setProgress(0)
      setIsPlaying(true)
      setIsPaused(false)
      setPhase('flying')
      setCurrentStopIndex(index)
    },
    [clearAllTimers]
  )

  // Restart tour cleanly from stop 1
  const restartTour = useCallback(() => {
    sequenceIdRef.current++
    clearAllTimers()
    tourNarrationService.cancel()
    setNarrationError(null)

    setProgress(0)
    setCurrentStopIndex(0)
    setIsPlaying(true)
    setIsPaused(false)
    setPhase('flying')
  }, [clearAllTimers])

  // Retry narration for current stop if speech failed
  const retryNarration = useCallback(() => {
    const seq = ++sequenceIdRef.current
    transitionToNarrating(seq)
  }, [transitionToNarrating])

  // Skip current stop and proceed to next
  const skipToNextStop = useCallback(() => {
    nextStop()
  }, [nextStop])

  // Switch tour mode ('full' or 'highlights')
  const setTourMode = useCallback(
    (mode: TourMode) => {
      sequenceIdRef.current++
      clearAllTimers()
      tourNarrationService.cancel()
      setNarrationError(null)

      setTourModeState(mode)
      setCurrentStopIndex(0)
      setProgress(0)
      setIsPlaying(true)
      setIsPaused(false)
      setPhase('flying')
    },
    [clearAllTimers]
  )

  return {
    isTourActive,
    tourMode,
    phase,
    currentStopIndex,
    totalStops: stops.length,
    currentStop,
    activeStop: currentStop,
    isPlaying,
    isPaused,
    isMuted,
    isFullscreen,
    autoplay,
    progress,
    stops,
    speechRate,
    availableVoices,
    selectedVoiceURI,
    voiceStatus,
    narrationError,
    startTour,
    exitTour,
    pauseTour,
    resumeTour,
    nextStop,
    prevStop,
    goToStop,
    restartTour,
    retryNarration,
    skipToNextStop,
    toggleMute,
    toggleFullscreen,
    setTourMode,
    setAutoplay,
    setSpeechRate,
    setSelectedVoiceURI,
    previewVoice,
    handleCameraArrived,
  }
}
