import {
  Compass,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Volume2,
  VolumeX,
  X,
  ChevronLeft,
  ChevronRight,
  ListFilter,
  Eye,
  CheckCircle2,
  Radio,
  AlertCircle,
} from 'lucide-react'
import { useState } from 'react'
import type { UseCampusTourReturn } from '../hooks/useCampusTour'

interface CampusTourOverlayProps {
  tour: UseCampusTourReturn
}

export function CampusTourOverlay({ tour }: CampusTourOverlayProps) {
  const [isJumpMenuOpen, setIsJumpMenuOpen] = useState(false)

  if (!tour.isTourActive) {
    return null
  }

  const {
    currentStop,
    currentStopIndex,
    totalStops,
    phase,
    isPlaying,
    isPaused,
    isMuted,
    isFullscreen,
    autoplay,
    progress,
    tourMode,
    stops,
    nextStop,
    prevStop,
    pauseTour,
    resumeTour,
    restartTour,
    exitTour,
    toggleMute,
    toggleFullscreen,
    goToStop,
    setTourMode,
  } = tour

  // Completed Screen
  if (phase === 'completed') {
    return (
      <div className="pointer-events-auto absolute inset-0 z-50 flex items-center justify-center bg-[#352A47]/60 p-4 backdrop-blur-md animate-fade-in text-[#352A47]">
        <div className="relative w-full max-w-lg rounded-3xl border border-[#C9B6DF] bg-[#FBF8FD] p-6 md:p-8 text-center shadow-dream-elevated">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E8C8B9] text-[#352A47] border border-[#D7A894] shadow-2xs">
            <Sparkles className="h-7 w-7 text-[#352A47]" />
          </div>

          <span className="mt-4 inline-block rounded-full border border-[#C9B6DF] bg-[#D2BEE7]/60 px-3.5 py-1 text-xs font-heading font-bold uppercase tracking-wider text-[#352A47]">
            Tour Complete
          </span>

          <h2 className="mt-3 font-editorial text-3xl md:text-4xl font-bold tracking-tight text-[#352A47]">
            Tour Completed!
          </h2>

          <p className="mt-2 text-sm text-[#51465F] font-sans leading-relaxed">
            You have experienced the complete {tourMode === 'full' ? '16-stop campus tour' : '8-stop highlights tour'} of Misrimal Navajee Munoth Jain Engineering College.
          </p>

          <div className="mt-6 grid grid-cols-2 gap-3 text-left">
            <div className="rounded-2xl border border-[#C9B6DF] bg-[#E8DDF2] p-4">
              <div className="text-[10px] font-heading font-bold uppercase tracking-wider text-[#51465F]">Landmarks Explored</div>
              <div className="mt-1 font-editorial italic text-2xl font-bold text-[#352A47]">{totalStops} / {totalStops}</div>
            </div>
            <div className="rounded-2xl border border-[#C9B6DF] bg-[#E8DDF2] p-4">
              <div className="text-[10px] font-heading font-bold uppercase tracking-wider text-[#51465F]">Tour Experience</div>
              <div className="mt-1 font-editorial italic text-2xl font-bold text-[#352A47] capitalize">{tourMode} Tour</div>
            </div>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              id="btn-tour-complete-replay"
              onClick={restartTour}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-[#352A47] hover:bg-[#433659] px-6 py-3 text-xs font-heading font-bold text-[#FAF6FD] shadow-dream-soft transition cursor-pointer"
            >
              <RotateCcw size={15} />
              <span>Replay Tour</span>
            </button>

            {tourMode === 'full' ? (
              <button
                type="button"
                id="btn-tour-switch-highlights"
                onClick={() => {
                  setTourMode('highlights')
                  restartTour()
                }}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl border border-[#D7A894] bg-[#E8C8B9] hover:bg-[#DEC0B0] px-5 py-3 text-xs font-heading font-bold text-[#352A47] transition cursor-pointer shadow-2xs"
              >
                <Sparkles size={15} className="text-[#352A47]" />
                <span>Highlights Tour</span>
              </button>
            ) : (
              <button
                type="button"
                id="btn-tour-switch-full"
                onClick={() => {
                  setTourMode('full')
                  restartTour()
                }}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl border border-[#D7A894] bg-[#E8C8B9] hover:bg-[#DEC0B0] px-5 py-3 text-xs font-heading font-bold text-[#352A47] transition cursor-pointer shadow-2xs"
              >
                <span>Full 16-Stop Tour</span>
              </button>
            )}

            <button
              type="button"
              id="btn-tour-complete-explore"
              onClick={exitTour}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl border border-[#C9B6DF] bg-[#E8DDF2] hover:bg-[#D2BEE7] px-5 py-3 text-xs font-heading font-bold text-[#352A47] transition cursor-pointer shadow-2xs"
            >
              <span>Explore Campus</span>
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!currentStop) {
    return null
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-40 flex flex-col justify-between p-3 md:p-6 overflow-hidden text-[#352A47]">
      {/* Top Header: Stop Counter, Mode Selector, Audio, Settings & Fullscreen Controls */}
      <div className="pointer-events-auto flex items-center justify-between gap-2">
        {/* Left: Tour Brand, Stop Counter, and Autoplay Pill */}
        <div className="flex items-center gap-2.5 rounded-2xl border border-[#C9B6DF] bg-[#FBF8FD]/95 px-4 py-2.5 shadow-dream-card backdrop-blur-md">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#352A47] text-[#FAF6FD] shadow-xs">
            <Compass className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-heading font-bold tracking-wider uppercase text-[#352A47]">
                Cinematic Campus Tour
              </span>
              <span className="h-1.5 w-1.5 rounded-full bg-[#352A47] animate-pulse" />
            </div>
            <div className="flex items-center gap-2 font-sans">
              <span className="text-xs font-bold text-[#352A47]">
                Stop {currentStopIndex + 1} <span className="text-[#51465F] font-normal">of {totalStops}</span>
              </span>
              {autoplay ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#BCD8C9] px-2.5 py-0.5 text-[9px] font-heading font-bold uppercase text-[#1E583F] border border-[#94BCA7]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#1E583F] animate-pulse" />
                  Autoplay ON
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#E8DDF2] px-2.5 py-0.5 text-[9px] font-heading font-bold uppercase text-[#51465F] border border-[#C9B6DF]">
                  Manual
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right Tools: Tour Mode Selector, Voice Settings, Audio, Fullscreen, and Exit */}
        <div className="flex items-center gap-2 rounded-2xl border border-[#C9B6DF] bg-[#FBF8FD]/95 p-1.5 shadow-dream-card backdrop-blur-md">
          {/* Mode Selector Pill */}
          <div className="hidden sm:flex items-center rounded-xl bg-[#E8DDF2] p-1 border border-[#C9B6DF]">
            <button
              type="button"
              id="btn-tour-mode-full"
              onClick={() => setTourMode('full')}
              className={`rounded-lg px-3 py-1 text-[11px] font-heading font-bold transition-all cursor-pointer ${
                tourMode === 'full'
                  ? 'bg-[#352A47] text-[#FAF6FD] shadow-2xs'
                  : 'text-[#51465F] hover:text-[#352A47]'
              }`}
            >
              Full Tour
            </button>
            <button
              type="button"
              id="btn-tour-mode-highlights"
              onClick={() => setTourMode('highlights')}
              className={`rounded-lg px-3 py-1 text-[11px] font-heading font-bold transition-all cursor-pointer flex items-center gap-1 ${
                tourMode === 'highlights'
                  ? 'bg-[#352A47] text-[#FAF6FD] shadow-2xs'
                  : 'text-[#51465F] hover:text-[#352A47]'
              }`}
            >
              <Sparkles size={11} className="text-[#E8C8B9]" />
              <span>Highlights</span>
            </button>
          </div>

          {/* Jump to Stop Menu Toggle */}
          <div className="relative">
            <button
              type="button"
              id="btn-tour-jump-menu"
              onClick={() => {
                setIsJumpMenuOpen(!isJumpMenuOpen)
              }}
              className={`flex h-8 items-center gap-1.5 rounded-xl border px-3 text-xs font-heading font-bold transition cursor-pointer ${
                isJumpMenuOpen
                  ? 'border-[#352A47] bg-[#352A47] text-[#FAF6FD]'
                  : 'border-[#C9B6DF] bg-[#E8DDF2] text-[#51465F] hover:bg-[#D2BEE7] hover:text-[#352A47]'
              }`}
              title="Jump to landmark"
            >
              <ListFilter size={13} />
              <span className="hidden md:inline">Stops</span>
            </button>

            {/* Jump Menu Dropdown */}
            {isJumpMenuOpen && (
              <div className="absolute right-0 top-10 w-64 max-h-72 overflow-y-auto rounded-2xl border border-[#C9B6DF] bg-[#FBF8FD] p-2 shadow-dream-elevated backdrop-blur-2xl text-[#352A47] z-50">
                <div className="px-2.5 py-1.5 text-[10px] font-heading font-bold uppercase tracking-wider text-[#51465F] border-b border-[#C9B6DF]">
                  Select Campus Stop
                </div>
                <div className="mt-1 flex flex-col gap-1">
                  {stops.map((stop, idx) => (
                    <button
                      key={stop.id}
                      type="button"
                      onClick={() => {
                        goToStop(idx)
                        setIsJumpMenuOpen(false)
                      }}
                      className={`flex items-center justify-between rounded-xl px-2.5 py-1.5 text-left text-xs transition cursor-pointer ${
                        idx === currentStopIndex
                          ? 'bg-[#352A47] font-heading font-bold text-[#FAF6FD] shadow-2xs'
                          : 'text-[#51465F] hover:bg-[#E8DDF2] hover:text-[#352A47]'
                      }`}
                    >
                      <span className="truncate pr-2 font-sans font-medium">
                        {idx + 1}. {stop.title}
                      </span>
                      <span className="text-[10px] opacity-75 shrink-0 uppercase font-heading">{stop.category}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Tour Restart Button */}
          <button
            type="button"
            id="btn-tour-header-restart"
            onClick={restartTour}
            className="flex h-8 items-center gap-1.5 rounded-xl border border-[#C9B6DF] bg-[#E8DDF2] px-2.5 text-xs font-heading font-bold text-[#352A47] hover:bg-[#D2BEE7] transition cursor-pointer"
            title="Restart tour from beginning"
            aria-label="Restart tour from beginning"
          >
            <RotateCcw size={13} />
            <span className="hidden sm:inline">Restart</span>
          </button>

          {/* Narration Mute / Unmute */}
          <button
            type="button"
            id="btn-tour-toggle-mute"
            onClick={toggleMute}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#C9B6DF] bg-[#E8DDF2] text-[#352A47] hover:bg-[#D2BEE7] transition cursor-pointer"
            title={isMuted ? 'Unmute voice narration' : 'Mute voice narration'}
            aria-label={isMuted ? 'Unmute voice narration' : 'Mute voice narration'}
          >
            {isMuted ? <VolumeX size={14} className="text-rose-500" /> : <Volume2 size={14} className="text-[#352A47]" />}
          </button>

          {/* Fullscreen Toggle */}
          <button
            type="button"
            id="btn-tour-toggle-fullscreen"
            onClick={toggleFullscreen}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#C9B6DF] bg-[#E8DDF2] text-[#352A47] hover:bg-[#D2BEE7] transition cursor-pointer"
            title={isFullscreen ? 'Exit fullscreen' : 'View fullscreen'}
            aria-label={isFullscreen ? 'Exit fullscreen' : 'View fullscreen'}
          >
            {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>

          {/* Exit Tour */}
          <button
            type="button"
            id="btn-tour-exit"
            onClick={exitTour}
            className="flex h-8 items-center gap-1 rounded-xl bg-rose-100 hover:bg-rose-200 border border-rose-300 px-3 text-xs font-heading font-bold text-rose-800 transition cursor-pointer shadow-2xs"
            title="Exit tour and return to campus explorer"
          >
            <X size={14} />
            <span className="hidden sm:inline">Exit</span>
          </button>
        </div>
      </div>

      {/* Bottom Cinematic Landmark Information Card & Navigation Controls */}
      <div className="pointer-events-auto mx-auto w-full max-w-2xl mb-[calc(4.75rem+env(safe-area-inset-bottom,0px))] md:mb-0">
        <div className="rounded-3xl border border-[#C9B6DF] bg-[#FBF8FD]/95 p-4 sm:p-5 shadow-dream-card backdrop-blur-md text-[#352A47]">
          {/* Animated Phase & Dwell-Time Progress Bar */}
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#E8DDF2] border border-[#C9B6DF] mb-3">
            <div
              className="h-full bg-[#352A47] transition-all duration-150 ease-linear shadow-xs"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>

          {/* Active Landmark Information */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-[#D2BEE7] px-2.5 py-0.5 text-[10px] font-heading font-bold tracking-wider text-[#352A47] uppercase border border-[#C9B6DF]">
                  {currentStop.category}
                </span>

                {/* Playback Phase Indicator */}
                {(phase === 'flying' || phase === 'transitioning') && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#C6DCE4] px-2.5 py-0.5 text-[10px] font-heading font-bold text-[#265A6E] border border-[#9FBECB]">
                    <Compass size={10} className="animate-spin" />
                    <span>Flying to Landmark...</span>
                  </span>
                )}
                {phase === 'camera_settled' && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#BCD8C9] px-2.5 py-0.5 text-[10px] font-heading font-bold text-[#1E583F] border border-[#94BCA7]">
                    <CheckCircle2 size={10} />
                    <span>Arrived • Settling</span>
                  </span>
                )}
                {phase === 'narrating' && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#E8C8B9] px-2.5 py-0.5 text-[10px] font-heading font-bold text-[#9E563A] border border-[#D7A894]">
                    {isMuted ? <Radio size={10} /> : <Volume2 size={10} className="animate-pulse" />}
                    <span>{isMuted ? 'Reading...' : 'Voice Narration...'}</span>
                  </span>
                )}
                {(phase === 'dwelling' || phase === 'narration_finished') && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#E8DDF2] px-2.5 py-0.5 text-[10px] font-heading font-bold text-[#51465F] border border-[#C9B6DF]">
                    <Eye size={10} />
                    <span>Viewing Landmark</span>
                  </span>
                )}
                {phase === 'paused' && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#F5E6DF] px-2.5 py-0.5 text-[10px] font-heading font-bold text-[#9E563A] border border-[#E8C8B9]">
                    <Pause size={10} />
                    <span>Paused</span>
                  </span>
                )}
                {phase === 'error' && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-[10px] font-heading font-bold text-rose-800 border border-rose-300">
                    <AlertCircle size={10} />
                    <span>Narration Issue</span>
                  </span>
                )}

                <span className="text-[11px] font-sans font-medium text-[#51465F] truncate">
                  {currentStop.subtitle}
                </span>
              </div>

              <h2 className="mt-1.5 font-heading text-lg md:text-xl font-extrabold tracking-tight text-[#352A47] truncate">
                {currentStop.title}
              </h2>

              {/* Spoken Narration Subtitle / Caption */}
              <p className="mt-1 text-xs md:text-sm text-[#51465F] font-sans leading-relaxed line-clamp-2 md:line-clamp-3">
                {currentStop.narration}
              </p>

              {/* Recoverable Narration Error Notification */}
              {phase === 'error' && (
                <div className="mt-2.5 flex items-center justify-between gap-2 rounded-2xl bg-[#F5E6DF] border border-[#E8C8B9] px-3.5 py-2 text-xs text-[#9E563A]">
                  <div className="flex items-center gap-1.5 min-w-0 truncate font-sans">
                    <AlertCircle size={14} className="text-[#9E563A] shrink-0" />
                    <span className="truncate">{tour.narrationError || 'Voice narration paused or unavailable.'}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={tour.retryNarration}
                      className="px-3 py-1 rounded-xl bg-[#E8C8B9] hover:bg-[#DEC0B0] text-[#352A47] font-heading font-bold text-[10px] transition cursor-pointer"
                    >
                      Retry
                    </button>
                    <button
                      type="button"
                      onClick={tour.skipToNextStop}
                      className="px-3 py-1 rounded-xl bg-[#E8DDF2] hover:bg-[#D2BEE7] text-[#352A47] border border-[#C9B6DF] font-heading font-bold text-[10px] transition cursor-pointer"
                    >
                      Skip
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Tour Playback Controls Bar */}
          <div className="mt-3 sm:mt-4 flex items-center justify-between border-t border-[#C9B6DF] pt-3 sm:pt-3.5 gap-2">
            {/* Left: Previous Stop */}
            <button
              type="button"
              id="btn-tour-prev"
              onClick={prevStop}
              disabled={currentStopIndex === 0}
              className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-heading font-bold transition cursor-pointer ${
                currentStopIndex === 0
                  ? 'border-[#C9B6DF]/50 text-slate-400 cursor-not-allowed opacity-40'
                  : 'border-[#C9B6DF] bg-[#E8DDF2] text-[#352A47] hover:bg-[#D2BEE7] shadow-2xs'
              }`}
              title="Previous landmark"
            >
              <ChevronLeft size={15} />
              <span className="hidden sm:inline">Previous</span>
            </button>

            {/* Center: Restart / Play / Pause */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                id="btn-tour-restart"
                onClick={restartTour}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#C9B6DF] bg-[#E8DDF2] text-[#352A47] hover:bg-[#D2BEE7] transition cursor-pointer shadow-2xs"
                title="Restart tour from beginning"
              >
                <RotateCcw size={14} />
              </button>

              {isPaused || !isPlaying ? (
                <button
                  type="button"
                  id="btn-tour-resume"
                  onClick={resumeTour}
                  className="flex h-9 items-center gap-1.5 rounded-xl bg-[#352A47] hover:bg-[#433659] px-4 text-xs font-heading font-bold text-[#FAF6FD] shadow-dream-soft transition cursor-pointer"
                >
                  <Play size={14} fill="currentColor" />
                  <span>Resume</span>
                </button>
              ) : (
                <button
                  type="button"
                  id="btn-tour-pause"
                  onClick={pauseTour}
                  className="flex h-9 items-center gap-1.5 rounded-xl bg-[#E8C8B9] hover:bg-[#DEC0B0] border border-[#D7A894] px-4 text-xs font-heading font-bold text-[#352A47] transition cursor-pointer shadow-2xs"
                >
                  <Pause size={14} fill="currentColor" />
                  <span>Pause</span>
                </button>
              )}
            </div>

            {/* Right: Next Stop */}
            <button
              type="button"
              id="btn-tour-next"
              onClick={nextStop}
              disabled={currentStopIndex === totalStops - 1}
              className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-heading font-bold transition cursor-pointer ${
                currentStopIndex === totalStops - 1
                  ? 'border-[#C9B6DF]/50 text-slate-400 cursor-not-allowed opacity-40'
                  : 'border-[#C9B6DF] bg-[#352A47] text-[#FAF6FD] hover:bg-[#433659] shadow-dream-soft'
              }`}
              title="Next landmark"
            >
              <span className="hidden sm:inline">Next</span>
              {currentStopIndex === totalStops - 1 ? <CheckCircle2 size={14} /> : <ChevronRight size={15} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
