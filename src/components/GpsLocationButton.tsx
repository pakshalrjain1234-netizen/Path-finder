import { Crosshair, Loader2, LocateFixed, ShieldAlert } from 'lucide-react'
import type { GpsServiceStatus, PositionStatus } from '../types/gps'
import { getGpsButtonLabels } from '../lib/gpsButtonLabels'

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
  const labels = getGpsButtonLabels(
    serviceStatus,
    isTracking,
    positionStatus,
    isTestMode,
    compact
  )

  if (serviceStatus === 'requesting') {
    return (
      <button
        id="gps-location-button"
        type="button"
        disabled
        aria-label={labels.ariaLabel}
        title={labels.title}
        className={`flex min-h-[38px] sm:min-h-[36px] items-center gap-2 rounded-xl border border-[#293A50] bg-[#162235] px-3 sm:px-3.5 py-2 text-xs font-semibold text-[#94A3B8] transition-all touch-manipulation cursor-wait ${className}`}
      >
        <Loader2 size={15} className="animate-spin text-[#60A5FA] shrink-0" />
        {compact ? (
          <span>{labels.mobileText}</span>
        ) : (
          <>
            <span className="md:hidden">{labels.mobileText}</span>
            <span className="hidden md:inline">{labels.desktopText}</span>
          </>
        )}
      </button>
    )
  }

  if (isTracking) {
    const isCalibrated = positionStatus === 'location_available'
    const isPending = positionStatus === 'calibration_pending'
    const isLowAccuracy = positionStatus === 'accuracy_insufficient'

    return (
      <button
        id="gps-location-button"
        type="button"
        onClick={onStop}
        aria-label={labels.ariaLabel}
        className={`flex min-h-[38px] sm:min-h-[36px] items-center gap-2 rounded-xl border px-3 sm:px-3.5 py-2 text-xs font-semibold shadow-lg transition-all touch-manipulation cursor-pointer ${
          isTestMode
            ? 'border-amber-500/40 bg-amber-950/50 text-amber-300 hover:bg-amber-900/50'
            : isCalibrated
              ? 'border-emerald-500/40 bg-emerald-950/50 text-emerald-300 hover:bg-emerald-900/50'
              : isPending
                ? 'border-blue-500/40 bg-blue-950/50 text-blue-300 hover:bg-blue-900/50'
                : isLowAccuracy
                  ? 'border-amber-500/40 bg-amber-950/40 text-amber-200 hover:bg-amber-900/40'
                  : 'border-[#293A50] bg-[#162235] text-[#F1F5F9] hover:bg-[#24364D]'
        } ${className}`}
        title={labels.title}
      >
        <LocateFixed size={15} className={`shrink-0 ${isTestMode || isLowAccuracy ? 'text-amber-400 animate-pulse' : 'text-[#60A5FA] animate-pulse'}`} />
        {compact ? (
          <span>{labels.mobileText}</span>
        ) : (
          <>
            <span className="md:hidden">{labels.mobileText}</span>
            <span className="hidden md:inline">{labels.desktopText}</span>
          </>
        )}
      </button>
    )
  }

  if (serviceStatus === 'permission_denied') {
    return (
      <button
        id="gps-location-button"
        type="button"
        onClick={onStart}
        aria-label={labels.ariaLabel}
        className={`flex min-h-[38px] sm:min-h-[36px] items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-950/40 px-3 sm:px-3.5 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-900/40 transition-all touch-manipulation cursor-pointer ${className}`}
        title={labels.title}
      >
        <ShieldAlert size={15} className="text-rose-400 shrink-0" />
        {compact ? (
          <span>{labels.mobileText}</span>
        ) : (
          <>
            <span className="md:hidden">{labels.mobileText}</span>
            <span className="hidden md:inline">{labels.desktopText}</span>
          </>
        )}
      </button>
    )
  }

  return (
    <button
      id="gps-location-button"
      type="button"
      onClick={onStart}
      aria-label={labels.ariaLabel}
      className={`flex min-h-[38px] sm:min-h-[36px] items-center gap-2 rounded-xl border border-[#293A50] bg-[#162235] px-3 sm:px-3.5 py-2 text-xs font-semibold text-[#F1F5F9] shadow-lg hover:border-[#60A5FA]/40 hover:text-[#60A5FA] hover:bg-[#24364D] transition-all touch-manipulation cursor-pointer ${className}`}
      title={labels.title}
    >
      <Crosshair size={15} className="text-[#60A5FA] shrink-0" />
      {compact ? (
        <span>{labels.mobileText}</span>
      ) : (
        <>
          <span className="md:hidden">{labels.mobileText}</span>
          <span className="hidden md:inline">{labels.desktopText}</span>
        </>
      )}
    </button>
  )
}
