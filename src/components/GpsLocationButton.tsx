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
        className={`flex items-center gap-2 rounded-xl border border-[#293A50] bg-[#162235] px-3.5 py-2 text-xs font-semibold text-[#94A3B8] transition-all ${className}`}
      >
        <Loader2 size={15} className="animate-spin text-[#60A5FA]" />
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
                ? 'border-blue-500/40 bg-blue-950/50 text-blue-300 hover:bg-blue-900/50'
                : 'border-[#293A50] bg-[#162235] text-[#F1F5F9] hover:bg-[#24364D]'
        } ${className}`}
        title="Stop GPS tracking"
      >
        <LocateFixed size={15} className={isTestMode ? 'text-amber-400 animate-pulse' : 'text-[#60A5FA] animate-pulse'} />
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
      className={`flex items-center gap-2 rounded-xl border border-[#293A50] bg-[#162235] px-3.5 py-2 text-xs font-semibold text-[#F1F5F9] shadow-lg hover:border-[#60A5FA]/40 hover:text-[#60A5FA] hover:bg-[#24364D] transition-all cursor-pointer ${className}`}
      title="Request location permission and locate on campus"
    >
      <Crosshair size={15} className="text-[#60A5FA]" />
      <span>{compact ? 'Locate' : 'Find My Location'}</span>
    </button>
  )
}
