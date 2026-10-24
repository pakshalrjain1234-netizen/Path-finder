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
      <div className="pointer-events-auto absolute inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md animate-fade-in text-[#F1F5F9]">
        <div className="relative w-full max-w-lg rounded-3xl border border-[#293A50] bg-[#192638] p-6 md:p-8 text-center shadow-2xl">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500/10 text-[#60A5FA] border border-blue-500/20 shadow-sm">
            <Sparkles className="h-8 w-8 text-[#60A5FA]" />
          </div>

          <span className="mt-4 inline-block rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#60A5FA]">
            Tour Complete
          </span>

          <h2 className="mt-2 text-2xl md:text-3xl font-extrabold tracking-tight text-white">
            Tour Completed!
          </h2>

          <p className="mt-2 text-sm text-[#94A3B8] leading-relaxed">
            You have experienced the complete {tourMode === 'full' ? '16-stop campus tour' : '8-stop highlights tour'} of Misrimal Navajee Munoth Jain Engineering College.
          </p>

          <div className="mt-6 grid grid-cols-2 gap-3 text-left">
            <div className="rounded-2xl border border-[#293A50] bg-[#162235] p-3.5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">Landmarks Explored</div>
              <div className="mt-1 text-xl font-black text-[#60A5FA]">{totalStops} / {totalStops}</div>
            </div>
            <div className="rounded-2xl border border-[#293A50] bg-[#162235] p-3.5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">Tour Experience</div>
              <div className="mt-1 text-xl font-black text-white capitalize">{tourMode} Tour</div>
            </div>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              id="btn-tour-complete-replay"
              onClick={restartTour}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-[#2563EB] hover:bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition cursor-pointer"
            >
              <RotateCcw size={16} />
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
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-[#293A50] bg-[#162235] hover:bg-[#24364D] px-5 py-3 text-sm font-semibold text-white transition cursor-pointer shadow-sm"
              >
                <Sparkles size={16} className="text-amber-400" />
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
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-[#293A50] bg-[#162235] hover:bg-[#24364D] px-5 py-3 text-sm font-semibold text-white transition cursor-pointer shadow-sm"
              >
                <span>Full 16-Stop Tour</span>
              </button>
            )}

            <button
              type="button"
              id="btn-tour-complete-explore"
              onClick={exitTour}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-[#293A50] bg-[#162235] hover:bg-[#24364D] px-5 py-3 text-sm font-semibold text-[#94A3B8] hover:text-white transition cursor-pointer shadow-sm"
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
    <div className="pointer-events-none absolute inset-0 z-40 flex flex-col justify-between p-3 md:p-6 overflow-hidden text-[#F1F5F9]">
      {/* Top Header: Stop Counter, Mode Selector, Audio, Settings & Fullscreen Controls */}
      <div className="pointer-events-auto flex items-center justify-between gap-2">
        {/* Left: Tour Brand, Stop Counter, and Autoplay Pill */}
        <div className="flex items-center gap-2 rounded-2xl border border-[#293A50] bg-[#162235]/95 px-3.5 py-2 shadow-lg backdrop-blur-md">
          <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-[#2563EB] text-white shadow-sm">
            <Compass className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-extrabold tracking-wider uppercase text-[#60A5FA]">
                Cinematic Campus Tour
              </span>
              <span className="h-1.5 w-1.5 rounded-full bg-[#60A5FA] animate-pulse" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white">
                Stop {currentStopIndex + 1} <span className="text-[#94A3B8] font-normal">of {totalStops}</span>
              </span>
              {autoplay ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] font-extrabold uppercase text-[#34D399] border border-emerald-500/20">
                  <span className="h-1 w-1 rounded-full bg-[#34D399] animate-pulse" />
                  Autoplay ON
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#192638] px-2 py-0.5 text-[9px] font-extrabold uppercase text-[#94A3B8] border border-[#293A50]">
                  Manual
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right Tools: Tour Mode Selector, Voice Settings, Audio, Fullscreen, and Exit */}
        <div className="flex items-center gap-1.5 rounded-2xl border border-[#293A50] bg-[#162235]/95 p-1.5 shadow-lg backdrop-blur-md">
          {/* Mode Selector Pill */}
          <div className="hidden sm:flex items-center rounded-xl bg-[#192638] p-0.5 border border-[#293A50]">
            <button
              type="button"
              id="btn-tour-mode-full"
              onClick={() => setTourMode('full')}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all cursor-pointer ${
                tourMode === 'full'
                  ? 'bg-[#2563EB] text-white shadow-sm'
                  : 'text-[#94A3B8] hover:text-white'
              }`}
            >
              Full Tour
            </button>
            <button
              type="button"
              id="btn-tour-mode-highlights"
              onClick={() => setTourMode('highlights')}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                tourMode === 'highlights'
                  ? 'bg-[#2563EB] text-white shadow-sm'
                  : 'text-[#94A3B8] hover:text-white'
              }`}
            >
              <Sparkles size={11} className="text-amber-400" />
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
              className={`flex h-8 items-center gap-1.5 rounded-xl border px-2.5 text-xs font-semibold transition cursor-pointer ${
                isJumpMenuOpen
                  ? 'border-[#60A5FA] bg-blue-500/20 text-[#60A5FA]'
                  : 'border-[#293A50] text-[#94A3B8] hover:bg-[#24364D] hover:text-white'
              }`}
              title="Jump to landmark"
            >
              <ListFilter size={13} />
              <span className="hidden md:inline">Stops</span>
            </button>

            {/* Jump Menu Dropdown */}
            {isJumpMenuOpen && (
              <div className="absolute right-0 top-10 w-64 max-h-72 overflow-y-auto rounded-2xl border border-[#293A50] bg-[#162235] p-1.5 shadow-2xl backdrop-blur-2xl text-white z-50">
                <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#94A3B8] border-b border-[#293A50]">
                  Select Campus Stop
                </div>
                <div className="mt-1 flex flex-col gap-0.5">
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
                          ? 'bg-[#2563EB] font-bold text-white shadow-sm'
                          : 'text-[#94A3B8] hover:bg-[#24364D] hover:text-white'
                      }`}
                    >
                      <span className="truncate pr-2">
                        {idx + 1}. {stop.title}
                      </span>
                      <span className="text-[10px] opacity-75 shrink-0 uppercase">{stop.category}</span>
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
            className="flex h-8 items-center gap-1.5 rounded-xl border border-[#293A50] bg-[#192638] px-2.5 text-xs font-semibold text-[#94A3B8] hover:bg-[#24364D] hover:text-white transition cursor-pointer"
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
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#293A50] bg-[#192638] text-[#94A3B8] hover:bg-[#24364D] hover:text-white transition cursor-pointer"
            title={isMuted ? 'Unmute voice narration' : 'Mute voice narration'}
            aria-label={isMuted ? 'Unmute voice narration' : 'Mute voice narration'}
          >
            {isMuted ? <VolumeX size={14} className="text-rose-400" /> : <Volume2 size={14} className="text-[#60A5FA]" />}
          </button>

          {/* Fullscreen Toggle */}
          <button
            type="button"
            id="btn-tour-toggle-fullscreen"
            onClick={toggleFullscreen}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#293A50] bg-[#192638] text-[#94A3B8] hover:bg-[#24364D] hover:text-white transition cursor-pointer"
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
            className="flex h-8 items-center gap-1 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 px-2.5 text-xs font-bold text-rose-300 transition cursor-pointer shadow-sm"
            title="Exit tour and return to campus explorer"
          >
            <X size={14} />
            <span className="hidden sm:inline">Exit</span>
          </button>
        </div>
      </div>

      {/* Bottom Cinematic Landmark Information Card & Navigation Controls */}
      <div className="pointer-events-auto mx-auto w-full max-w-2xl mb-1 sm:mb-0">
        <div className="rounded-2xl sm:rounded-3xl border border-[#293A50] bg-[#192638]/95 p-3 sm:p-4 shadow-2xl backdrop-blur-md text-[#F1F5F9]">
          {/* Animated Phase & Dwell-Time Progress Bar */}
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#162235] mb-2 sm:mb-3">
            <div
              className="h-full bg-[#2563EB] transition-all duration-150 ease-linear shadow-sm"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>

          {/* Active Landmark Information */}
          <div className="flex items-start justify-between gap-2 sm:gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-blue-500/10 px-2 py-0.5 text-[10px] font-extrabold tracking-wider text-[#60A5FA] uppercase border border-blue-500/20">
                  {currentStop.category}
                </span>

                {/* Playback Phase Indicator */}
                {(phase === 'flying' || phase === 'transitioning') && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold text-[#60A5FA] border border-blue-500/20">
                    <Compass size={10} className="animate-spin" />
                    <span>Flying to Landmark...</span>
                  </span>
                )}
                {phase === 'camera_settled' && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-[#34D399] border border-emerald-500/20">
                    <CheckCircle2 size={10} />
                    <span>Arrived • Settling</span>
                  </span>
                )}
                {phase === 'narrating' && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold text-[#60A5FA] border border-blue-500/20">
                    {isMuted ? <Radio size={10} /> : <Volume2 size={10} className="animate-pulse" />}
                    <span>{isMuted ? 'Reading...' : 'Voice Narration...'}</span>
                  </span>
                )}
                {(phase === 'dwelling' || phase === 'narration_finished') && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-[#162235] px-2 py-0.5 text-[10px] font-bold text-[#94A3B8] border border-[#293A50]">
                    <Eye size={10} />
                    <span>Viewing Landmark</span>
                  </span>
                )}
                {phase === 'paused' && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-300 border border-amber-500/20">
                    <Pause size={10} />
                    <span>Paused</span>
                  </span>
                )}
                {phase === 'error' && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-rose-500/10 px-2 py-0.5 text-[10px] font-bold text-rose-300 border border-rose-500/20">
                    <AlertCircle size={10} />
                    <span>Narration Issue</span>
                  </span>
                )}

                <span className="text-[11px] font-medium text-[#94A3B8] truncate">
                  {currentStop.subtitle}
                </span>
              </div>

              <h2 className="mt-1 text-base md:text-lg font-black tracking-tight text-white truncate">
                {currentStop.title}
              </h2>

              {/* Spoken Narration Subtitle / Caption */}
              <p className="mt-1 text-xs text-[#94A3B8] leading-relaxed line-clamp-2 md:line-clamp-3">
                {currentStop.narration}
              </p>

              {/* Recoverable Narration Error Notification */}
              {phase === 'error' && (
                <div className="mt-2 flex items-center justify-between gap-2 rounded-xl bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 text-xs text-amber-200">
                  <div className="flex items-center gap-1.5 min-w-0 truncate">
                    <AlertCircle size={14} className="text-amber-400 shrink-0" />
                    <span className="truncate">{tour.narrationError || 'Voice narration paused or unavailable.'}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={tour.retryNarration}
                      className="px-2 py-1 rounded bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] transition cursor-pointer"
                    >
                      Retry
                    </button>
                    <button
                      type="button"
                      onClick={tour.skipToNextStop}
                      className="px-2 py-1 rounded bg-[#24364D] hover:bg-[#2D3F59] text-white font-bold text-[10px] transition cursor-pointer"
                    >
                      Skip
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Tour Playback Controls Bar */}
          <div className="mt-2.5 sm:mt-3.5 flex items-center justify-between border-t border-[#293A50] pt-2.5 sm:pt-3 gap-2">
            {/* Left: Previous Stop */}
            <button
              type="button"
              id="btn-tour-prev"
              onClick={prevStop}
              disabled={currentStopIndex === 0}
              className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                currentStopIndex === 0
                  ? 'border-[#293A50] text-slate-600 cursor-not-allowed opacity-50'
                  : 'border-[#293A50] bg-[#162235] text-[#94A3B8] hover:bg-[#24364D] hover:text-white shadow-sm'
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
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#293A50] bg-[#162235] text-[#94A3B8] hover:bg-[#24364D] hover:text-white transition cursor-pointer shadow-sm"
                title="Restart tour from beginning"
              >
                <RotateCcw size={14} />
              </button>

              {isPaused || !isPlaying ? (
                <button
                  type="button"
                  id="btn-tour-resume"
                  onClick={resumeTour}
                  className="flex h-9 items-center gap-1.5 rounded-xl bg-[#2563EB] hover:bg-blue-600 px-4 text-xs font-bold text-white shadow-sm transition cursor-pointer"
                >
                  <Play size={14} fill="currentColor" />
                  <span>Resume</span>
                </button>
              ) : (
                <button
                  type="button"
                  id="btn-tour-pause"
                  onClick={pauseTour}
                  className="flex h-9 items-center gap-1.5 rounded-xl bg-[#162235] hover:bg-[#24364D] border border-[#293A50] px-4 text-xs font-bold text-white transition cursor-pointer"
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
              className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                currentStopIndex === totalStops - 1
                  ? 'border-[#293A50] text-slate-600 cursor-not-allowed opacity-50'
                  : 'border-[#293A50] bg-[#162235] text-[#60A5FA] hover:bg-[#24364D] hover:text-white shadow-sm'
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
