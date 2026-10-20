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
        className={`flex items-center gap-2 rounded-xl bg-slate-100 px-3.5 py-2 text-xs font-semibold text-slate-600 transition-all ${className}`}
      >
        <Loader2 size={15} className="animate-spin text-[#2A9D8F]" />
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
        className={`flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold shadow-sm transition-all ${
          isTestMode
            ? 'border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100'
            : isCalibrated
              ? 'border-emerald-300 bg-emerald-50 text-emerald-900 hover:bg-emerald-100'
              : isPending
                ? 'border-blue-300 bg-blue-50 text-blue-900 hover:bg-blue-100'
                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
        } ${className}`}
        title="Stop GPS tracking"
      >
        <LocateFixed size={15} className={isTestMode ? 'text-amber-600 animate-pulse' : 'text-[#2A9D8F] animate-pulse'} />
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
        className={`flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-semibold text-red-800 hover:bg-red-100 transition-all ${className}`}
        title="Location permission was denied. Click to retry."
      >
        <ShieldAlert size={15} className="text-red-600" />
        <span>{compact ? 'Retry GPS' : 'Permission Denied (Retry)'}</span>
      </button>
    )
  }

  return (
    <button
      id="gps-location-button"
      type="button"
      onClick={onStart}
      className={`flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:border-[#2A9D8F] hover:text-[#2A9D8F] hover:bg-slate-50/80 transition-all ${className}`}
      title="Request location permission and locate on campus"
    >
      <Crosshair size={15} className="text-[#2A9D8F]" />
      <span>{compact ? 'Locate' : 'Find My Location'}</span>
    </button>
  )
}
