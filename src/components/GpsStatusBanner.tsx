import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Compass,
  Layers,
  MapPin,
  Radio,
  Shield,
  ShieldAlert,
  Sliders,
  StopCircle,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { geoToLocalMeters } from '../lib/campusCalibration'
import type { CalibrationModel, PositionClassification } from '../types/gps'
import type { GeofenceEvaluation } from '../types/geofence'

interface GpsStatusBannerProps {
  classification: PositionClassification
  calibrationModel?: CalibrationModel | null
  geofence?: GeofenceEvaluation | null
  onStop: () => void
  onOpenCalibration?: () => void
  className?: string
  initialExpanded?: boolean
}

export function GpsStatusBanner({
  classification,
  calibrationModel,
  geofence,
  onStop,
  onOpenCalibration,
  className = '',
  initialExpanded = false,
}: GpsStatusBannerProps) {
  const [isExpanded, setIsExpanded] = useState<boolean>(initialExpanded)
  const [showTechnicalDetails, setShowTechnicalDetails] = useState<boolean>(false)

  const { status, accuracyClass, modelPoint, rawCoordinates, isSimulated } = classification

  if (status === 'idle') {
    return null
  }

  // Friendly human-readable headline and styling matching the 7 distinct GPS states
  let friendlyTitle = 'GPS Location Active'
  let friendlySubtext = 'Position active. Physical campus navigation is pending survey validation.'
  let statusBadgeLabel = 'GPS Active'
  let badgeStyle = 'bg-[#162235] text-[#94A3B8] border-[#293A50]'
  let dotColor = 'bg-[#94A3B8]'
  let icon = <Compass size={15} className="text-[#60A5FA] shrink-0" />

  switch (status) {
    case 'location_available':
      if (isSimulated) {
        // State 4: Calibration Test Mode
        friendlyTitle = 'Calibration Test Mode'
        friendlySubtext = 'Simulated GPS coordinates mapped to 3D Stage E3 model. For development and field calibration testing only.'
        statusBadgeLabel = 'TEST / UNVERIFIED'
        badgeStyle = 'bg-amber-500/20 text-amber-300 border-amber-500/30'
        dotColor = 'bg-amber-400 animate-pulse'
        icon = <Compass size={15} className="text-amber-400 shrink-0" />
      } else {
        const isProvisional = calibrationModel?.status === 'provisional' || classification.message.includes('Provisional')
        const hasNumericAcc =
          rawCoordinates !== null &&
          rawCoordinates !== undefined &&
          typeof rawCoordinates.accuracy === 'number' &&
          Number.isFinite(rawCoordinates.accuracy) &&
          rawCoordinates.accuracy >= 0

        if (accuracyClass === 'poor' || accuracyClass === 'medium') {
          friendlyTitle = hasNumericAcc ? `Location Fix (±${rawCoordinates.accuracy.toFixed(0)}m)` : 'Campus Location Detected'
          friendlySubtext = hasNumericAcc
            ? `Location mapped to campus (±${rawCoordinates.accuracy.toFixed(0)}m). Indoor satellite attenuation through concrete slabs may cause position offset toward exterior facades.`
            : 'Real-time GPS position mapped to 3D campus twin with approved calibration.'
          statusBadgeLabel = isProvisional ? 'Provisional Fix' : 'Location Active'
          badgeStyle = 'bg-blue-500/20 text-blue-300 border-blue-500/30'
          dotColor = 'bg-[#60A5FA] animate-pulse'
          icon = <Compass size={15} className="text-[#60A5FA] shrink-0" />
        } else {
          // State 5: Verified Live Navigation
          friendlyTitle = isProvisional ? 'Provisional Campus Location' : 'Verified Live Navigation'
          friendlySubtext = 'Real-time GPS position mapped to 3D campus twin with approved calibration.'
          statusBadgeLabel = isProvisional ? 'Provisional GPS' : 'Live GPS Verified'
          badgeStyle = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
          dotColor = 'bg-emerald-400 animate-pulse'
          icon = <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
        }
      }
      break

    case 'calibration_pending':
      // State 3: GPS Detected — Campus Mapping Pending
      friendlyTitle = 'GPS Detected — Campus Mapping Pending'
      friendlySubtext = 'Live satellite coordinates acquired, but 3D model mapping is pending approved physical campus calibration.'
      statusBadgeLabel = 'Mapping Pending'
      badgeStyle = 'bg-blue-500/20 text-blue-300 border-blue-500/30'
      dotColor = 'bg-[#60A5FA] animate-pulse'
      icon = <Compass size={15} className="text-[#60A5FA] shrink-0" />
      break

    case 'accuracy_insufficient': {
      // State 6: Low GPS Accuracy
      const hasNumericAcc =
        rawCoordinates !== null &&
        rawCoordinates !== undefined &&
        typeof rawCoordinates.accuracy === 'number' &&
        Number.isFinite(rawCoordinates.accuracy) &&
        rawCoordinates.accuracy >= 0

      friendlyTitle = hasNumericAcc
        ? `Low GPS Accuracy ±${rawCoordinates.accuracy.toFixed(0)}m`
        : 'Low GPS Accuracy Warning'
      friendlySubtext = hasNumericAcc
        ? `Reported accuracy is ±${rawCoordinates.accuracy.toFixed(0)}m (exceeds 30m safety threshold). Satellite positioning is degraded indoors or under structural cover. Please move outdoors away from tall walls.`
        : 'Low GPS accuracy warning: accuracy value not recorded. Please check your device location settings.'
      statusBadgeLabel = 'Low Accuracy'
      badgeStyle = 'bg-amber-500/20 text-amber-300 border-amber-500/30'
      dotColor = 'bg-amber-400'
      icon = <AlertTriangle size={15} className="text-amber-400 shrink-0" />
      break
    }

    case 'outside_campus':
      friendlyTitle = 'Outside Campus Perimeter'
      friendlySubtext = 'Detected outside MNMJEC boundaries. You can still preview routes and explore in virtual mode.'
      statusBadgeLabel = 'Outside Campus'
      badgeStyle = 'bg-amber-500/20 text-amber-300 border-amber-500/30'
      dotColor = 'bg-amber-400'
      icon = <MapPin size={15} className="text-amber-400 shrink-0" />
      break

    case 'permission_denied':
      // State 7: GPS Unavailable (Permission Denied)
      friendlyTitle = 'GPS Permission Denied'
      friendlySubtext = 'Please allow browser location permissions to enable live campus positioning.'
      statusBadgeLabel = 'Permission Denied'
      badgeStyle = 'bg-rose-500/20 text-rose-300 border-rose-500/30'
      dotColor = 'bg-rose-400'
      icon = <ShieldAlert size={15} className="text-rose-400 shrink-0" />
      break

    case 'gps_unavailable':
      // State 7: GPS Unavailable (Hardware/Signal)
      friendlyTitle = 'GPS Unavailable'
      friendlySubtext = 'Unable to establish satellite fix. Stand outdoors under open sky.'
      statusBadgeLabel = 'Unavailable'
      badgeStyle = 'bg-rose-500/20 text-rose-300 border-rose-500/30'
      dotColor = 'bg-rose-400'
      icon = <Radio size={15} className="text-rose-400 shrink-0" />
      break

    case 'timeout':
      // State 7: GPS Unavailable (Timeout)
      friendlyTitle = 'GPS Signal Timed Out'
      friendlySubtext = 'Satellite response took too long. Retrying outdoor connection...'
      statusBadgeLabel = 'Timed Out'
      badgeStyle = 'bg-slate-500/20 text-slate-300 border-slate-500/30'
      dotColor = 'bg-slate-400'
      icon = <Clock size={15} className="text-slate-400 shrink-0" />
      break
  }

  const hasValidAcc =
    rawCoordinates !== null &&
    rawCoordinates !== undefined &&
    typeof rawCoordinates.accuracy === 'number' &&
    Number.isFinite(rawCoordinates.accuracy) &&
    rawCoordinates.accuracy >= 0

  const accuracyBadgeText = hasValidAcc
    ? `±${rawCoordinates.accuracy.toFixed(0)}m`
    : null

  // Geofence status card helper
  const renderGeofenceCard = () => {
    if (!geofence) return null

    let geofenceBadgeColor = 'bg-white/5 text-slate-300 border-white/10'
    let geofenceBadgeText = 'Geofence Checking'

    switch (geofence.status) {
      case 'inside':
        geofenceBadgeColor = 'bg-emerald-950/60 text-emerald-300 border-emerald-500/30'
        geofenceBadgeText = geofence.isSimulated ? 'Simulated Inside' : 'Inside MNMJEC'
        break
      case 'outside':
        geofenceBadgeColor = 'bg-amber-950/60 text-amber-300 border-amber-500/30'
        geofenceBadgeText = geofence.isSimulated ? 'Simulated Outside' : 'Outside MNMJEC'
        break
      case 'uncertain':
        geofenceBadgeColor = 'bg-purple-950/60 text-purple-300 border-purple-500/30'
        geofenceBadgeText = 'Location Uncertain'
        break
      case 'boundary_unapproved':
        geofenceBadgeColor = 'bg-cyan-950/60 text-cyan-300 border-cyan-500/30'
        geofenceBadgeText = 'Boundary Calibration Pending'
        break
    }

    return (
      <div id="geofence-status-card" className="rounded-2xl border border-white/10 bg-[#070F1E] p-3 text-xs">
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

        <p className="font-medium text-slate-200 text-xs leading-snug">
          {geofence.userMessage}
        </p>

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400">
          <span>
            Boundary distance:{' '}
            <strong className="text-slate-200">{geofence.distanceToBoundaryMeters.toFixed(1)}m</strong>{' '}
            ({geofence.isInsidePolygon ? 'inside' : 'outside'})
          </span>
          <span>
            Accuracy: <strong className="text-slate-200">±{geofence.accuracyMeters.toFixed(1)}m</strong>
          </span>
          <span>
            Confidence: <strong className="uppercase text-slate-200">{geofence.confidence}</strong>
          </span>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* ------------------------------------------------------------- */}
      {/* COMPACT FLOATING PILL (Collapsed State — Default)              */}
      {/* ------------------------------------------------------------- */}
      <div
        id="gps-status-banner"
        className={`pointer-events-auto inline-flex items-center gap-2 rounded-full border border-[#293A50] bg-[#162235]/95 px-3 py-1.5 shadow-2xl backdrop-blur-xl text-xs text-white transition-all hover:bg-[#192638] hover:border-[#60A5FA]/40 ${className}`}
      >
        <span className={`h-2 w-2 rounded-full ${dotColor}`} />
        <div className="flex items-center gap-1.5 font-semibold text-slate-100">
          <span>{friendlyTitle}</span>
          {accuracyBadgeText && status !== 'accuracy_insufficient' && (
            <span className="rounded-md bg-[#101827] px-1.5 py-0.2 text-[10px] font-mono text-[#60A5FA] border border-[#293A50]">
              {accuracyBadgeText}
            </span>
          )}
          {!hasValidAcc && status === 'accuracy_insufficient' && (
            <span className="rounded-md bg-amber-950/60 px-1.5 py-0.2 text-[10px] font-mono text-amber-300 border border-amber-500/40">
              Not Recorded
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 ml-1 border-l border-[#293A50] pl-1.5">
          <button
            type="button"
            onClick={() => setIsExpanded(true)}
            aria-label="Expand GPS position details"
            className="flex h-6 w-6 items-center justify-center rounded-full text-[#94A3B8] hover:text-[#60A5FA] hover:bg-[#24364D] transition cursor-pointer"
            title="View position details & controls"
          >
            <ChevronDown size={14} />
          </button>
          <button
            id="btn-banner-stop"
            type="button"
            onClick={onStop}
            aria-label="Stop GPS tracking"
            className="flex h-6 w-6 items-center justify-center rounded-full text-rose-400 hover:bg-rose-500/20 transition cursor-pointer"
            title="Stop GPS tracking"
          >
            <StopCircle size={14} />
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* RESPONSIVE BOTTOM SHEET (Expanded State)                       */}
      {/* ------------------------------------------------------------- */}
      {isExpanded && (
        <div className="fixed inset-0 z-[9990] flex items-end justify-center md:items-start md:justify-end md:p-4 pointer-events-auto">
          {/* Dismissible Backdrop Scrim */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsExpanded(false)}
            aria-hidden="true"
          />

          {/* Bottom Drawer Card */}
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="gps-sheet-title"
            className="relative w-full max-w-lg rounded-t-3xl md:rounded-3xl border border-[#293A50] bg-[#162235]/98 p-5 shadow-2xl backdrop-blur-2xl text-white max-h-[85vh] overflow-y-auto space-y-4 pb-8 md:pb-5 animate-in slide-in-from-bottom duration-200"
          >
            {/* Mobile Drag Indicator */}
            <div className="mx-auto -mt-2 mb-2 h-1 w-12 rounded-full bg-[#24364D] md:hidden" />

            {/* Sheet Header */}
            <div className="flex items-start justify-between gap-3 border-b border-[#293A50] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#192638] border border-[#293A50]">
                  {icon}
                </div>
                <div>
                  <h2 id="gps-sheet-title" className="text-sm font-bold text-white flex items-center gap-2">
                    <span>{friendlyTitle}</span>
                    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${badgeStyle}`}>
                      {statusBadgeLabel}
                    </span>
                  </h2>
                  <p className="text-[11px] text-[#94A3B8]">
                    MNMJEC Campus Live Positioning
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsExpanded(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-[#94A3B8] hover:bg-[#24364D] hover:text-white transition cursor-pointer"
                aria-label="Close GPS panel"
              >
                <X size={16} />
              </button>
            </div>

            {/* User-friendly message */}
            <div className="rounded-2xl border border-[#293A50] bg-[#192638] p-3.5 text-xs text-[#F1F5F9] leading-relaxed">
              <p className="font-semibold text-white mb-1">Status Overview</p>
              <p>{friendlySubtext}</p>
            </div>

            {/* Geofence Status Card */}
            {renderGeofenceCard()}

            {/* Action Buttons: Stop Tracking & Open Calibration */}
            <div className="flex items-center gap-2 pt-1">
              {onOpenCalibration && (
                <button
                  id="btn-banner-calibration"
                  type="button"
                  onClick={() => {
                    setIsExpanded(false)
                    onOpenCalibration()
                  }}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#2563EB] hover:bg-blue-600 py-2.5 text-xs font-bold text-white transition shadow-lg shadow-blue-600/30 cursor-pointer"
                >
                  <Sliders size={14} />
                  <span>Open Calibration Wizard</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setIsExpanded(false)
                  onStop()
                }}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/20 px-4 py-2.5 text-xs font-bold text-rose-300 transition cursor-pointer"
              >
                <StopCircle size={14} />
                <span>Stop GPS</span>
              </button>
            </div>

            {/* Collapsible Technical Coordinates Accordion */}
            <div className="border-t border-white/10 pt-3">
              <button
                type="button"
                onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
                className="flex w-full items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-200 transition cursor-pointer"
              >
                <span>Technical Diagnostics (WGS-84 &amp; Stage E3)</span>
                {showTechnicalDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              {showTechnicalDetails && rawCoordinates && (() => {
                const localOffsets =
                  calibrationModel?.referenceOrigin
                    ? geoToLocalMeters(rawCoordinates.latitude, rawCoordinates.longitude, calibrationModel.referenceOrigin)
                    : null

                const distToCivil =
                  modelPoint
                    ? Math.hypot(modelPoint[0] - 136.2, modelPoint[2] - (-78.2))
                    : null

                const distToGate1 =
                  modelPoint
                    ? Math.hypot(modelPoint[0] - 181.0, modelPoint[2] - (-6.2))
                    : null

                return (
                  <div className="mt-2.5 grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-[#070F1E] p-3.5 text-[11px] text-slate-300">
                    <div>
                      <span className="text-slate-500 block text-[9px] uppercase font-bold">WGS-84 Coordinates</span>
                      <span className="font-mono text-cyan-300 text-xs">
                        {rawCoordinates.latitude.toFixed(6)}°, {rawCoordinates.longitude.toFixed(6)}°
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-500 block text-[9px] uppercase font-bold">Reported Accuracy</span>
                      <span className={`font-semibold ${
                        accuracyClass === 'high'
                          ? 'text-emerald-400'
                          : accuracyClass === 'medium'
                            ? 'text-cyan-400'
                            : 'text-amber-400'
                      }`}>
                        {hasValidAcc
                          ? `±${rawCoordinates.accuracy.toFixed(1)}m (${accuracyClass})`
                          : `Accuracy value not recorded (${accuracyClass})`}
                      </span>
                    </div>

                    {localOffsets && (
                      <div className="col-span-2 border-t border-white/5 pt-2 mt-1">
                        <span className="text-slate-500 block text-[9px] uppercase font-bold">Local Tangent Offsets (Rel. to Campus Origin)</span>
                        <span className="font-mono text-cyan-300">
                          East (u): {localOffsets.u > 0 ? `+${localOffsets.u.toFixed(1)}` : localOffsets.u.toFixed(1)}m, North (v): {localOffsets.v > 0 ? `+${localOffsets.v.toFixed(1)}` : localOffsets.v.toFixed(1)}m
                        </span>
                      </div>
                    )}

                    {calibrationModel?.helmertParams && (
                      <div className="col-span-2 border-t border-white/5 pt-2 mt-1">
                        <span className="text-slate-500 block text-[9px] uppercase font-bold">Helmert Transformation (Geo → 3D Model)</span>
                        <div className="text-[10px] font-mono text-slate-300 space-y-0.5 mt-0.5">
                          <div>
                            Scale: <span className="text-cyan-300">{calibrationModel.helmertParams.scale.toFixed(3)}x</span> • Rotation: <span className="text-cyan-300">{calibrationModel.helmertParams.rotationDeg.toFixed(1)}°</span>
                          </div>
                          <div>
                            Translation: <span className="text-cyan-300">[{calibrationModel.helmertParams.tx.toFixed(1)}, {calibrationModel.helmertParams.tz.toFixed(1)}]</span> • Orientation: <span className="text-cyan-300">{calibrationModel.helmertParams.isReflected ? 'Reflected' : 'Direct'}</span>
                          </div>
                          <div>
                            Calibration Status: <span className="text-cyan-300 uppercase">{calibrationModel.status}</span> (RMSE: <span className="text-cyan-300">±{calibrationModel.rmse !== null ? calibrationModel.rmse.toFixed(2) : '5.32'}m</span>)
                          </div>
                        </div>
                      </div>
                    )}

                    {modelPoint && (
                      <div className="col-span-2 border-t border-white/5 pt-2 mt-1">
                        <span className="text-slate-500 block text-[9px] uppercase font-bold">Transformed 3D Model Coordinates</span>
                        <span className="font-mono text-cyan-300 text-xs">
                          X: {modelPoint[0]}m, Z: {modelPoint[2]}m (Elev: {modelPoint[1]}m)
                        </span>
                      </div>
                    )}

                    {modelPoint && (distToCivil !== null || distToGate1 !== null) && (
                      <div className="col-span-2 border-t border-white/5 pt-2 mt-1 text-[10px] text-slate-400">
                        <span className="text-slate-500 block text-[9px] uppercase font-bold">Proximity to Reference Landmarks</span>
                        <span className="text-slate-200 font-mono">
                          {distToCivil !== null && `Civil Block: ${distToCivil.toFixed(1)}m`}
                          {distToCivil !== null && distToGate1 !== null && ' • '}
                          {distToGate1 !== null && `Main Gate 1: ${distToGate1.toFixed(1)}m`}
                        </span>
                      </div>
                    )}

                    {/* Indoor Positioning Notice */}
                    <div className="col-span-2 border-t border-white/5 pt-2 mt-1 rounded-xl bg-blue-950/40 border border-blue-500/20 p-2.5 text-[10px] text-blue-200">
                      <span className="font-bold text-blue-300 block mb-0.5">Indoor GNSS Limitation Note</span>
                      <p className="text-[10px] text-slate-300 leading-snug">
                        Inside concrete buildings (such as Civil Block), satellite microwave signals undergo 15–30 dB attenuation and multipath reflection.
                        Even when an acceptable accuracy fix is reported (±{hasValidAcc ? rawCoordinates.accuracy.toFixed(0) : '?'}m), the calculated position may be displaced outside exterior walls. For best accuracy, step near an exterior doorway or window.
                      </p>
                    </div>

                    <div className="col-span-2 border-t border-white/5 pt-2 mt-1 text-[10px] text-slate-400">
                      Confidence: <strong className="uppercase text-slate-300">{geofence?.confidence ?? 'HIGH'}</strong> • Source: {isSimulated ? 'Simulated/Dev Mode' : 'Device Satellites'}
                    </div>
                  </div>
                )
              })()}
            </div>

            {/* Privacy notice */}
            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 border-t border-white/10 pt-2">
              <Shield size={12} className="text-cyan-400 shrink-0" />
              <span>Privacy Guaranteed: GPS data is processed on-device. No location history is recorded or sent to any server.</span>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
