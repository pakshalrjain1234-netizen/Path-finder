import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Compass,
  Info,
  Layers,
  MapPin,
  Shield,
  ShieldAlert,
  Sliders,
  StopCircle,
} from 'lucide-react'
import type { PositionClassification } from '../types/gps'
import type { GeofenceEvaluation } from '../types/geofence'

interface GpsStatusBannerProps {
  classification: PositionClassification
  geofence?: GeofenceEvaluation | null
  onStop: () => void
  onOpenCalibration?: () => void
  className?: string
}

export function GpsStatusBanner({
  classification,
  geofence,
  onStop,
  onOpenCalibration,
  className = '',
}: GpsStatusBannerProps) {
  const { status, message, accuracyClass, modelPoint, rawCoordinates, isSimulated } = classification

  if (status === 'idle') {
    return null
  }

  // Visual styling based on status
  let containerStyle = 'border-white/10 bg-[#111827]/90 text-slate-200'
  let icon = <Info size={16} className="text-slate-400 flex-shrink-0 mt-0.5" />
  let badgeColor = 'bg-white/10 text-slate-300'
  let badgeLabel = 'GPS Status'

  switch (status) {
    case 'location_available':
      containerStyle = 'border-emerald-500/40 bg-emerald-950/60 text-emerald-200 ring-1 ring-emerald-500/30'
      icon = <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0 mt-0.5" />
      badgeColor = 'bg-emerald-500/20 text-emerald-300'
      badgeLabel = isSimulated ? 'Simulated GPS Available' : 'Location Available'
      break

    case 'calibration_pending':
      containerStyle = 'border-cyan-500/40 bg-cyan-950/60 text-cyan-200 ring-1 ring-cyan-500/30'
      icon = <Compass size={16} className="text-cyan-400 flex-shrink-0 mt-0.5" />
      badgeColor = 'bg-cyan-500/20 text-cyan-300'
      badgeLabel = 'Calibration Pending'
      break

    case 'accuracy_insufficient':
      containerStyle = 'border-amber-500/40 bg-amber-950/60 text-amber-200 ring-1 ring-amber-500/30'
      icon = <AlertTriangle size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
      badgeColor = 'bg-amber-500/20 text-amber-300'
      badgeLabel = 'Accuracy Insufficient'
      break

    case 'outside_campus':
      containerStyle = 'border-amber-500/40 bg-amber-950/60 text-amber-200 ring-1 ring-amber-500/30'
      icon = <MapPin size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
      badgeColor = 'bg-amber-500/20 text-amber-300'
      badgeLabel = 'Outside Campus Boundary'
      break

    case 'permission_denied':
      containerStyle = 'border-rose-500/40 bg-rose-950/60 text-rose-200 ring-1 ring-rose-500/30'
      icon = <ShieldAlert size={16} className="text-rose-400 flex-shrink-0 mt-0.5" />
      badgeColor = 'bg-rose-500/20 text-rose-300'
      badgeLabel = 'Permission Denied'
      break

    case 'gps_unavailable':
      containerStyle = 'border-rose-500/40 bg-rose-950/60 text-rose-200'
      icon = <AlertTriangle size={16} className="text-rose-400 flex-shrink-0 mt-0.5" />
      badgeColor = 'bg-rose-500/20 text-rose-300'
      badgeLabel = 'GPS Unavailable'
      break

    case 'timeout':
      containerStyle = 'border-white/10 bg-[#162033]/80 text-slate-200'
      icon = <Clock size={16} className="text-slate-400 flex-shrink-0 mt-0.5" />
      badgeColor = 'bg-white/10 text-slate-300'
      badgeLabel = 'GPS Timeout'
      break
  }

  // Geofence visual elements
  const renderGeofenceCard = () => {
    if (!geofence) return null

    let geofenceBadgeColor = 'bg-white/5 text-slate-300 border-white/10'
    let geofenceBadgeText = 'Geofence Checking'

    switch (geofence.status) {
      case 'inside':
        geofenceBadgeColor = 'bg-emerald-950/50 text-emerald-300 border-emerald-500/30'
        geofenceBadgeText = geofence.isSimulated ? 'Simulated Inside' : 'Inside MNMJEC'
        break
      case 'outside':
        geofenceBadgeColor = 'bg-amber-950/50 text-amber-300 border-amber-500/30'
        geofenceBadgeText = geofence.isSimulated ? 'Simulated Outside' : 'Outside MNMJEC'
        break
      case 'uncertain':
        geofenceBadgeColor = 'bg-purple-950/50 text-purple-300 border-purple-500/30'
        geofenceBadgeText = 'Location Uncertain'
        break
      case 'boundary_unapproved':
        geofenceBadgeColor = 'bg-cyan-950/50 text-cyan-300 border-cyan-500/30'
        geofenceBadgeText = 'Boundary Calibration Pending'
        break
    }

    return (
      <div id="geofence-status-card" className="mt-2.5 rounded-xl border border-white/10 bg-[#0B1220]/90 p-2.5 shadow-glass backdrop-blur-xl">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-1.5">
            <Layers size={13} className="text-cyan-400" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Campus Geofence (OSM Way 35457616)
            </span>
          </div>
          <span className={`inline-flex rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${geofenceBadgeColor}`}>
            {geofenceBadgeText}
          </span>
        </div>

        {/* Prominent Required User Copy */}
        <p className="font-semibold text-slate-100 text-[12px] leading-snug">
          "{geofence.userMessage}"
        </p>

        {/* Technical Perimeter Metrics */}
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400">
          <span>
            Perimeter distance:{' '}
            <strong className="text-slate-200">
              {geofence.distanceToBoundaryMeters.toFixed(1)} m
            </strong>{' '}
            ({geofence.isInsidePolygon ? 'inside' : 'outside'})
          </span>
          <span>
            Accuracy radius:{' '}
            <strong className="text-slate-200">±{geofence.accuracyMeters.toFixed(1)} m</strong>
          </span>
          <span>
            Confidence:{' '}
            <strong className="uppercase text-slate-200">{geofence.confidence}</strong>
          </span>
        </div>

        {geofence.details && (
          <p className="mt-1 text-[10px] text-slate-400 leading-normal">
            {geofence.details}
          </p>
        )}
      </div>
    )
  }

  return (
    <div id="gps-status-banner" className={`rounded-2xl border p-3 shadow-lg backdrop-blur-xl transition-all text-xs ${containerStyle} ${className}`}>
      {/* Header Row */}
      <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2 mb-2">
        <div className="flex items-center gap-2">
          {icon}
          <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${badgeColor}`}>
            {badgeLabel}
          </span>
          {isSimulated && (
            <span className="inline-flex rounded-full bg-amber-500/20 border border-amber-500/30 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-300">
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
              className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[11px] font-medium text-slate-300 hover:bg-white/10 hover:text-white transition"
              title="Open Campus Calibration & GPS Test Utility"
            >
              <Sliders size={12} className="text-cyan-400" />
              <span>Calibration</span>
            </button>
          )}

          <button
            id="btn-banner-stop"
            type="button"
            onClick={onStop}
            className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[11px] font-medium text-slate-300 hover:bg-white/10 hover:text-white transition"
            title="Stop GPS tracking"
          >
            <StopCircle size={12} className="text-rose-400" />
            <span>Stop</span>
          </button>
        </div>
      </div>

      {/* Main Status Message */}
      <div className="space-y-1">
        <p className="font-semibold text-slate-100 leading-snug">{message}</p>

        {/* Detailed Metrics */}
        {rawCoordinates && (
          <div className="mt-2 grid grid-cols-2 gap-2 rounded-xl border border-white/10 bg-[#0B1220]/90 p-2 text-[11px] text-slate-300">
            <div>
              <span className="text-slate-400 block text-[9px] uppercase font-bold">Coordinates</span>
              <span className="font-mono text-cyan-300">
                {rawCoordinates.latitude.toFixed(6)}°, {rawCoordinates.longitude.toFixed(6)}°
              </span>
            </div>

            <div>
              <span className="text-slate-400 block text-[9px] uppercase font-bold">GPS Accuracy</span>
              <span className={`font-semibold ${
                accuracyClass === 'high'
                  ? 'text-emerald-400'
                  : accuracyClass === 'medium'
                    ? 'text-cyan-400'
                    : 'text-amber-400'
              }`}>
                ±{rawCoordinates.accuracy.toFixed(1)} m ({accuracyClass})
              </span>
            </div>

            {modelPoint && (
              <div className="col-span-2 border-t border-white/10 pt-1 mt-1">
                <span className="text-slate-400 block text-[9px] uppercase font-bold">3D Campus Model Position</span>
                <span className="font-mono text-cyan-300">
                  X: {modelPoint[0]}m, Z: {modelPoint[2]}m (Elev: {modelPoint[1]}m)
                </span>
              </div>
            )}
          </div>
        )}

        {/* Campus Geofence Verdict Card */}
        {renderGeofenceCard()}
      </div>

      {/* Privacy note */}
      <div className="mt-2.5 flex items-center gap-1.5 text-[10px] text-slate-400 border-t border-white/10 pt-1.5">
        <Shield size={11} className="text-cyan-400" />
        <span>Privacy: GPS data is processed purely on-device. No location history is uploaded.</span>
      </div>
    </div>
  )
}
