import {
  Info,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Square,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import {
  discoverNarrationService,
  type DiscoverNarrationState,
} from '../services/discoverNarrationService.ts'
import { tourNarrationService } from '../services/tourNarrationService.ts'
import type { DiscoverCategoryId } from '../types/discover.ts'

interface DiscoverNarrationPlayerProps {
  categoryId: DiscoverCategoryId
  categoryTitle: string
  narrationText: string
  narrationSummary: string
  className?: string
}

export function DiscoverNarrationPlayer({
  categoryId,
  categoryTitle,
  narrationText,
  narrationSummary,
  className = '',
}: DiscoverNarrationPlayerProps) {
  const [narrationState, setNarrationState] = useState<DiscoverNarrationState>(
    discoverNarrationService.getState()
  )
  const [isTranscriptVisible, setIsTranscriptVisible] = useState(true)

  const isSupported = discoverNarrationService.isSupported()
  const isThisCategoryActive = narrationState.activeCategoryId === categoryId
  const playbackState = isThisCategoryActive ? narrationState.playbackState : 'idle'

  useEffect(() => {
    const unsubscribe = discoverNarrationService.subscribe((state) => {
      setNarrationState(state)
    })
    return () => {
      unsubscribe()
    }
  }, [])

  const voiceStatus = tourNarrationService.getVoiceStatus()

  const handlePlay = () => {
    discoverNarrationService.play(narrationText, categoryId)
  }

  const handlePause = () => {
    discoverNarrationService.pause()
  }

  const handleResume = () => {
    discoverNarrationService.resume()
  }

  const handleReplay = () => {
    discoverNarrationService.replay(narrationText, categoryId)
  }

  const handleStop = () => {
    discoverNarrationService.stop()
  }

  return (
    <div
      className={`rounded-3xl border border-[#C9B6DF] bg-[#FBF8FD] p-4.5 sm:p-5 shadow-dream-card backdrop-blur-md transition-all ${className}`}
    >
      {/* Header with Title, Voice Badge, and Status */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#C9B6DF]">
        <div className="flex items-center gap-2.5">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-2xl transition-all shadow-xs ${
              playbackState === 'playing'
                ? 'bg-[#352A47] text-white animate-pulse shadow-dream-soft'
                : 'bg-[#DFD1EC] text-[#352A47] border border-[#C9B6DF]'
            }`}
          >
            {playbackState === 'playing' ? (
              <Volume2 size={19} className="animate-pulse" />
            ) : isSupported ? (
              <Volume2 size={19} />
            ) : (
              <VolumeX size={19} className="text-[#51465F]" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-heading text-xs font-bold uppercase tracking-wider text-[#352A47]">
                Audio Overview
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-[9px] font-heading font-bold uppercase tracking-wide border ${
                  playbackState === 'playing'
                    ? 'bg-[#BCD8C9] text-[#1E583F] border-[#94BCA7]'
                    : playbackState === 'paused'
                      ? 'bg-[#E8C8B9] text-[#9E563A] border-[#D7A894]'
                      : playbackState === 'ended'
                        ? 'bg-[#D2BEE7] text-[#352A47] border-[#C9B6DF]'
                        : 'bg-[#E8DDF2] text-[#51465F] border-[#C9B6DF]'
                }`}
              >
                {playbackState === 'playing'
                  ? 'Playing'
                  : playbackState === 'paused'
                    ? 'Paused'
                    : playbackState === 'ended'
                      ? 'Completed'
                      : 'Ready'}
              </span>
            </div>
            <p className="font-sans text-[11px] text-[#51465F] line-clamp-1">{narrationSummary}</p>
          </div>
        </div>

        {/* Voice Quality Indicator */}
        <div className="flex items-center gap-1.5 rounded-xl border border-[#C9B6DF] bg-[#E8DDF2] px-2.5 py-1 text-[10px] font-sans font-medium text-[#51465F]">
          <Sparkles size={11} className="text-[#7A4465]" />
          <span className="truncate max-w-[150px] sm:max-w-[200px]" title={voiceStatus.tierDescription}>
            {voiceStatus.tier === 1
              ? 'Indian English Voice'
              : voiceStatus.isFemale
                ? 'Natural Female Voice'
                : 'Standard Voice'}
          </span>
        </div>
      </div>

      {/* Speech-Unavailable Fallback Banner */}
      {!isSupported && (
        <div className="mt-3.5 rounded-2xl border border-[#D7A894] bg-[#E8C8B9]/30 p-3 flex items-center gap-2.5 text-xs text-[#352A47] font-sans">
          <Info size={16} className="text-[#9E563A] shrink-0" />
          <span>
            Voice narration is unavailable in this browser environment. You can read the full overview in the transcript below.
          </span>
        </div>
      )}

      {/* Playback Controls Toolbar */}
      <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {/* Main Action: Play / Pause / Resume */}
          {playbackState === 'playing' ? (
            <button
              type="button"
              onClick={handlePause}
              disabled={!isSupported}
              id={`btn-pause-narration-${categoryId}`}
              aria-label={`Pause ${categoryTitle} narration`}
              className="flex min-h-[44px] items-center gap-2 rounded-2xl bg-[#E8C8B9] border border-[#D9B4A3] hover:bg-[#DFC0B1] text-[#352A47] px-4 py-2.5 text-xs font-heading font-bold transition shadow-xs active:scale-95 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#352A47]"
            >
              <Pause size={15} className="fill-current" />
              <span>Pause</span>
            </button>
          ) : playbackState === 'paused' ? (
            <button
              type="button"
              onClick={handleResume}
              disabled={!isSupported}
              id={`btn-resume-narration-${categoryId}`}
              aria-label={`Resume ${categoryTitle} narration`}
              className="flex min-h-[44px] items-center gap-2 rounded-2xl bg-[#352A47] hover:bg-[#231B30] text-white px-4 py-2.5 text-xs font-heading font-bold transition shadow-dream-soft active:scale-95 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#352A47]"
            >
              <Play size={15} className="fill-current" />
              <span>Resume</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handlePlay}
              disabled={!isSupported}
              id={`btn-play-narration-${categoryId}`}
              aria-label={`Play ${categoryTitle} narration`}
              className="flex min-h-[44px] items-center gap-2 rounded-2xl bg-[#352A47] hover:bg-[#231B30] text-white px-4 py-2.5 text-xs font-heading font-bold transition shadow-dream-soft active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-[#352A47]"
            >
              <Play size={15} className="fill-current" />
              <span>{playbackState === 'ended' ? 'Play Again' : 'Listen Overview'}</span>
            </button>
          )}

          {/* Replay Button */}
          <button
            type="button"
            onClick={handleReplay}
            disabled={!isSupported}
            id={`btn-replay-narration-${categoryId}`}
            aria-label={`Replay ${categoryTitle} narration from beginning`}
            title="Replay from beginning"
            className="flex min-h-[44px] items-center gap-1.5 rounded-2xl border border-[#C9B6DF] bg-[#E8DDF2] hover:bg-[#D2BEE7] text-[#352A47] px-3.5 py-2.5 text-xs font-heading font-bold transition active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-[#352A47]"
          >
            <RotateCcw size={14} />
            <span className="hidden sm:inline">Replay</span>
          </button>

          {/* Stop Button */}
          {(playbackState === 'playing' || playbackState === 'paused') && (
            <button
              type="button"
              onClick={handleStop}
              id={`btn-stop-narration-${categoryId}`}
              aria-label={`Stop ${categoryTitle} narration`}
              title="Stop audio"
              className="flex min-h-[44px] items-center gap-1.5 rounded-2xl border border-[#D7A894] bg-[#E8C8B9]/30 hover:bg-[#E8C8B9]/50 text-[#9E563A] px-3.5 py-2.5 text-xs font-heading font-bold transition active:scale-95 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#9E563A]"
            >
              <Square size={13} className="fill-current" />
              <span className="hidden sm:inline">Stop</span>
            </button>
          )}
        </div>

        {/* Toggle Transcript View Button */}
        <button
          type="button"
          onClick={() => setIsTranscriptVisible(!isTranscriptVisible)}
          id={`btn-toggle-transcript-${categoryId}`}
          aria-expanded={isTranscriptVisible}
          aria-controls={`narration-transcript-${categoryId}`}
          className="min-h-[44px] flex items-center text-xs font-heading font-bold text-[#7A4465] hover:text-[#352A47] underline cursor-pointer ml-auto focus:outline-none focus-visible:ring-2 focus-visible:ring-[#352A47] rounded-lg px-2"
        >
          {isTranscriptVisible ? 'Hide Transcript' : 'Show Transcript'}
        </button>
      </div>

      {/* Visible Narration Transcript with Accessible Read-Along Container */}
      {isTranscriptVisible && (
        <div
          id={`narration-transcript-${categoryId}`}
          role="region"
          aria-label={`Narration transcript for ${categoryTitle}`}
          className="mt-3.5 rounded-2xl border border-[#C9B6DF] bg-[#E8DDF2]/60 p-3.5 text-xs text-[#352A47] leading-relaxed relative"
        >
          <div className="flex items-center justify-between text-[10px] font-heading font-bold text-[#51465F] uppercase tracking-wider mb-1.5">
            <span>Narration Transcript</span>
            {playbackState === 'playing' && (
              <span className="text-[#1E583F] flex items-center gap-1 font-heading font-bold normal-case">
                <span className="w-1.5 h-1.5 rounded-full bg-[#1E583F] animate-ping" />
                Narrating audio
              </span>
            )}
          </div>
          <p className="text-[12px] sm:text-[13px] text-[#352A47] leading-relaxed italic border-l-2 border-[#352A47] pl-3 py-0.5 font-sans">
            &ldquo;{narrationText}&rdquo;
          </p>
        </div>
      )}
    </div>
  )
}
