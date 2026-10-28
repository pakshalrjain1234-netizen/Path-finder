import {
  Info,
  Pause,
  Play,
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

      {/* Playback Controls Toolbar: Explicit Listen, Pause, Resume, Stop */}
      <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* 1. Listen Button */}
          <button
            type="button"
            onClick={handlePlay}
            disabled={!isSupported}
            id={`btn-listen-narration-${categoryId}`}
            aria-label={`Listen to ${categoryTitle} narration from beginning`}
            title="Listen from beginning"
            className={`flex min-h-[44px] items-center gap-1.5 rounded-2xl px-4 py-2 text-xs font-heading font-bold transition shadow-dream-soft active:scale-95 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-[#352A47] focus-visible:ring-offset-2 ${
              playbackState === 'playing'
                ? 'bg-[#352A47] text-white ring-2 ring-[#7A4465]'
                : 'bg-[#352A47] hover:bg-[#231B30] text-white'
            }`}
          >
            <Play size={14} className="fill-current" />
            <span>Listen</span>
          </button>

          {/* 2. Pause Button */}
          <button
            type="button"
            onClick={handlePause}
            disabled={!isSupported || playbackState !== 'playing'}
            id={`btn-pause-narration-${categoryId}`}
            aria-label={`Pause ${categoryTitle} narration`}
            aria-disabled={!isSupported || playbackState !== 'playing'}
            title="Pause narration"
            className={`flex min-h-[44px] items-center gap-1.5 rounded-2xl border px-3.5 py-2 text-xs font-heading font-bold transition active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#9E563A] focus-visible:ring-offset-2 ${
              playbackState === 'playing'
                ? 'bg-[#E8C8B9] border-[#D7A894] hover:bg-[#DFC0B1] text-[#352A47] cursor-pointer shadow-xs'
                : 'bg-[#E8C8B9]/40 border-[#D7A894]/50 text-[#352A47]/40 cursor-not-allowed'
            }`}
          >
            <Pause size={14} className="fill-current" />
            <span>Pause</span>
          </button>

          {/* 3. Resume Button */}
          <button
            type="button"
            onClick={handleResume}
            disabled={!isSupported || playbackState !== 'paused'}
            id={`btn-resume-narration-${categoryId}`}
            aria-label={`Resume ${categoryTitle} narration`}
            aria-disabled={!isSupported || playbackState !== 'paused'}
            title="Resume paused narration"
            className={`flex min-h-[44px] items-center gap-1.5 rounded-2xl border px-3.5 py-2 text-xs font-heading font-bold transition active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#352A47] focus-visible:ring-offset-2 ${
              playbackState === 'paused'
                ? 'bg-[#DFD1EC] border-[#C9B6DF] hover:bg-[#D2BEE7] text-[#352A47] cursor-pointer shadow-dream-soft ring-2 ring-[#7A4465]'
                : 'bg-[#DFD1EC]/40 border-[#C9B6DF]/50 text-[#352A47]/40 cursor-not-allowed'
            }`}
          >
            <Play size={14} className="fill-current" />
            <span>Resume</span>
          </button>

          {/* 4. Stop Button */}
          <button
            type="button"
            onClick={handleStop}
            disabled={!isSupported || playbackState === 'idle'}
            id={`btn-stop-narration-${categoryId}`}
            aria-label={`Stop ${categoryTitle} narration`}
            aria-disabled={!isSupported || playbackState === 'idle'}
            title="Stop audio playback"
            className={`flex min-h-[44px] items-center gap-1.5 rounded-2xl border px-3.5 py-2 text-xs font-heading font-bold transition active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#9E563A] focus-visible:ring-offset-2 ${
              playbackState !== 'idle'
                ? 'bg-[#E8C8B9]/30 border-[#D7A894] hover:bg-[#E8C8B9]/60 text-[#9E563A] cursor-pointer shadow-xs'
                : 'bg-[#E8C8B9]/20 border-[#D7A894]/40 text-[#9E563A]/40 cursor-not-allowed'
            }`}
          >
            <Square size={13} className="fill-current" />
            <span>Stop</span>
          </button>
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
            &ldquo;{isThisCategoryActive && narrationState.activeText ? narrationState.activeText : narrationText}&rdquo;
          </p>
        </div>
      )}
    </div>
  )
}
