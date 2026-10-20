import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Compass,
  Info,
  MapPin,
  Shield,
  ShieldAlert,
  Sliders,
  StopCircle,
} from 'lucide-react'
import type { PositionClassification } from '../types/gps'

interface GpsStatusBannerProps {
  classification: PositionClassification
  onStop: () => void
  onOpenCalibration?: () => void
  className?: string
}

export function GpsStatusBanner({
  classification,
  onStop,
  onOpenCalibration,
  className = '',
}: GpsStatusBannerProps) {
  const { status, message, accuracyClass, modelPoint, rawCoordinates, isSimulated } = classification

  if (status === 'idle') {
    return null
  }

  // Visual styling based on status
  let containerStyle = 'border-slate-200 bg-slate-50 text-slate-800'
  let icon = <Info size={16} className="text-slate-500 flex-shrink-0 mt-0.5" />
  let badgeColor = 'bg-slate-200 text-slate-700'
  let badgeLabel = 'GPS Status'

  switch (status) {
    case 'location_available':
      containerStyle = 'border-emerald-200 bg-emerald-50/70 text-emerald-950 ring-1 ring-emerald-300/60'
      icon = <CheckCircle2 size={16} className="text-[#2A9D8F] flex-shrink-0 mt-0.5" />
      badgeColor = 'bg-[#2A9D8F]/15 text-[#2A9D8F]'
      badgeLabel = isSimulated ? 'Simulated GPS Available' : 'Location Available'
      break

    case 'calibration_pending':
      containerStyle = 'border-blue-200 bg-blue-50/70 text-blue-950 ring-1 ring-blue-300/60'
      icon = <Compass size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
      badgeColor = 'bg-blue-100 text-blue-800'
      badgeLabel = 'Calibration Pending'
      break

    case 'accuracy_insufficient':
      containerStyle = 'border-amber-200 bg-amber-50/70 text-amber-950 ring-1 ring-amber-300/60'
      icon = <AlertTriangle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
      badgeColor = 'bg-amber-100 text-amber-800'
      badgeLabel = 'Accuracy Insufficient'
      break

    case 'outside_campus':
      containerStyle = 'border-amber-200 bg-amber-50/70 text-amber-950 ring-1 ring-amber-300/60'
      icon = <MapPin size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
      badgeColor = 'bg-amber-100 text-amber-800'
      badgeLabel = 'Outside Campus Boundary'
      break

    case 'permission_denied':
      containerStyle = 'border-red-200 bg-red-50/70 text-red-950 ring-1 ring-red-300/60'
      icon = <ShieldAlert size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
      badgeColor = 'bg-red-100 text-red-800'
      badgeLabel = 'Permission Denied'
      break

    case 'gps_unavailable':
      containerStyle = 'border-red-200 bg-red-50/70 text-red-950'
      icon = <AlertTriangle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
      badgeColor = 'bg-red-100 text-red-800'
      badgeLabel = 'GPS Unavailable'
      break

    case 'timeout':
      containerStyle = 'border-slate-200 bg-slate-50 text-slate-800'
      icon = <Clock size={16} className="text-slate-500 flex-shrink-0 mt-0.5" />
      badgeColor = 'bg-slate-200 text-slate-700'
      badgeLabel = 'GPS Timeout'
      break
  }

  return (
    <div id="gps-status-banner" className={`rounded-2xl border p-3 shadow-sm transition-all text-xs ${containerStyle} ${className}`}>
      {/* Header Row */}
      <div className="flex items-center justify-between gap-2 border-b border-black/5 pb-2 mb-2">
        <div className="flex items-center gap-2">
          {icon}
          <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${badgeColor}`}>
            {badgeLabel}
          </span>
          {isSimulated && (
            <span className="inline-flex rounded-full bg-amber-200/80 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-900">
              Test Mode
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {onOpenCalibration && (
            <button
              id="btn-banner-calibration"
              type="button"
              onClick={onOpenCalibration}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50 shadow-xs"
              title="Open Campus Calibration & GPS Test Utility"
            >
              <Sliders size={12} className="text-[#2A9D8F]" />
              <span>Calibration</span>
            </button>
          )}

          <button
            id="btn-banner-stop"
            type="button"
            onClick={onStop}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50 shadow-xs"
            title="Stop GPS tracking"
          >
            <StopCircle size={12} className="text-red-500" />
            <span>Stop</span>
          </button>
        </div>
      </div>

      {/* Main Status Message */}
      <div className="space-y-1">
        <p className="font-semibold text-slate-900 leading-snug">{message}</p>

        {/* Detailed Metrics */}
        {rawCoordinates && (
          <div className="mt-2 grid grid-cols-2 gap-2 rounded-xl bg-white/80 p-2 text-[11px] text-slate-600 ring-1 ring-black/5">
            <div>
              <span className="text-slate-400 block text-[9px] uppercase font-bold">Coordinates</span>
              <span className="font-mono text-slate-800">
                {rawCoordinates.latitude.toFixed(6)}°, {rawCoordinates.longitude.toFixed(6)}°
              </span>
            </div>

            <div>
              <span className="text-slate-400 block text-[9px] uppercase font-bold">GPS Accuracy</span>
              <span className={`font-semibold ${
                accuracyClass === 'high'
                  ? 'text-emerald-700'
                  : accuracyClass === 'medium'
                    ? 'text-blue-700'
                    : 'text-amber-700'
              }`}>
                ±{rawCoordinates.accuracy.toFixed(1)} m ({accuracyClass})
              </span>
            </div>

            {modelPoint && (
              <div className="col-span-2 border-t border-slate-100 pt-1 mt-1">
                <span className="text-slate-400 block text-[9px] uppercase font-bold">3D Campus Model Position</span>
                <span className="font-mono text-slate-800">
                  X: {modelPoint[0]}m, Z: {modelPoint[2]}m (Elev: {modelPoint[1]}m)
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Privacy note */}
      <div className="mt-2.5 flex items-center gap-1.5 text-[10px] text-slate-400 border-t border-black/5 pt-1.5">
        <Shield size={11} className="text-[#2A9D8F]" />
        <span>Privacy: GPS data is processed purely on-device. No location history is uploaded.</span>
      </div>
    </div>
  )
}
