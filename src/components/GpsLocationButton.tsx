import { Crosshair, Loader2, LocateFixed, ShieldAlert } from 'lucide-react'
import type { GpsServiceStatus, PositionStatus } from '../types/gps'

interface GpsLocationButtonProps {
  isTracking: boolean
  serviceStatus: GpsServiceStatus
  positionStatus?: PositionStatus
  isTestMode?: boolean
  onStart: () => void
  onStop: () => void
  className?: string
  compact?: boolean
}

export function GpsLocationButton({
  isTracking,
  serviceStatus,
  positionStatus,
  isTestMode = false,
  onStart,
  onStop,
  className = '',
  compact = false,
}: GpsLocationButtonProps) {
  if (serviceStatus === 'requesting') {
    return (
      <button
        id="gps-location-button"
        type="button"
        disabled
        className={`flex items-center gap-2 rounded-xl border border-white/10 bg-[#162033]/90 px-3.5 py-2 text-xs font-semibold text-slate-300 transition-all ${className}`}
      >
        <Loader2 size={15} className="animate-spin text-cyan-400" />
        <span>{compact ? 'Locating...' : 'Acquiring GPS Signal...'}</span>
      </button>
    )
  }

  if (isTracking) {
    const isCalibrated = positionStatus === 'location_available'
    const isPending = positionStatus === 'calibration_pending'

    return (
      <button
        id="gps-location-button"
        type="button"
        onClick={onStop}
        className={`flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold shadow-lg transition-all ${
          isTestMode
            ? 'border-amber-500/40 bg-amber-950/50 text-amber-300 hover:bg-amber-900/50'
            : isCalibrated
              ? 'border-emerald-500/40 bg-emerald-950/50 text-emerald-300 hover:bg-emerald-900/50'
              : isPending
                ? 'border-cyan-500/40 bg-cyan-950/50 text-cyan-300 hover:bg-cyan-900/50'
                : 'border-white/10 bg-[#162033]/90 text-slate-200 hover:bg-[#1f2d47]'
        } ${className}`}
        title="Stop GPS tracking"
      >
        <LocateFixed size={15} className={isTestMode ? 'text-amber-400 animate-pulse' : 'text-cyan-400 animate-pulse'} />
        <span>{compact ? 'Tracking' : isTestMode ? 'Test GPS Active (Stop)' : 'Live GPS Active (Stop)'}</span>
      </button>
    )
  }

  if (serviceStatus === 'permission_denied') {
    return (
      <button
        id="gps-location-button"
        type="button"
        onClick={onStart}
        className={`flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-950/40 px-3.5 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-900/40 transition-all ${className}`}
        title="Location permission was denied. Click to retry."
      >
        <ShieldAlert size={15} className="text-rose-400" />
        <span>{compact ? 'Retry GPS' : 'Permission Denied (Retry)'}</span>
      </button>
    )
  }

  return (
    <button
      id="gps-location-button"
      type="button"
      onClick={onStart}
      className={`flex items-center gap-2 rounded-xl border border-white/10 bg-[#162033]/90 px-3.5 py-2 text-xs font-semibold text-slate-200 shadow-lg hover:border-cyan-500/40 hover:text-cyan-300 hover:bg-[#1f2d47] transition-all ${className}`}
      title="Request location permission and locate on campus"
    >
      <Crosshair size={15} className="text-cyan-400" />
      <span>{compact ? 'Locate' : 'Find My Location'}</span>
    </button>
  )
}
