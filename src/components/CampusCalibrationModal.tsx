import {
  AlertCircle,
  AlertTriangle,
  Compass,
  FlaskConical,
  Plus,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react'
import { useState } from 'react'
import {
  REAL_WORLD_CAMPUS_REFERENCE,
  SYNTHETIC_GPS_PRESETS,
  TEST_MODE_CONTROL_POINTS,
} from '../data/campusCalibrationData.ts'
import type { CalibrationModel, GroundControlPoint } from '../types/gps'

interface CampusCalibrationModalProps {
  isOpen: boolean
  onClose: () => void
  calibrationModel: CalibrationModel
  onUpdateControlPoints: (points: GroundControlPoint[]) => void
  onResetCalibration: () => void
  isTestMode: boolean
  onToggleTestMode: (enabled?: boolean) => void
  onInjectTestPosition: (lat: number, lon: number, accuracy?: number) => void
}

export function CampusCalibrationModal({
  isOpen,
  onClose,
  calibrationModel,
  onUpdateControlPoints,
  onResetCalibration,
  isTestMode,
  onToggleTestMode,
  onInjectTestPosition,
}: CampusCalibrationModalProps) {
  const [activeTab, setActiveTab] = useState<'benchmarks' | 'test-mode'>('benchmarks')

  // Benchmark form state
  const [name, setName] = useState('')
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')
  const [modelX, setModelX] = useState('')
  const [modelZ, setModelZ] = useState('')
  const [source, setSource] = useState<GroundControlPoint['source']>('Field Benchmark')
  const [verificationStatus, setVerificationStatus] = useState<GroundControlPoint['verificationStatus']>('provisional')

  // Test mode custom coordinate injection (default to MNMJEC Gate 1 simulated coords)
  const [testLat, setTestLat] = useState('12.945040')
  const [testLon, setTestLon] = useState('80.243780')
  const [testAccuracy, setTestAccuracy] = useState('6')

  if (!isOpen) return null

  const { status, controlPoints, helmertParams, residuals, rmse, warning } = calibrationModel

  const handleAddBenchmark = (e: React.FormEvent) => {
    e.preventDefault()
    const lat = parseFloat(latitude)
    const lon = parseFloat(longitude)
    const x = parseFloat(modelX)
    const z = parseFloat(modelZ)

    if (isNaN(lat) || isNaN(lon) || isNaN(x) || isNaN(z) || !name.trim()) {
      alert('Please enter valid numeric coordinates and landmark name.')
      return
    }

    const newPoint: GroundControlPoint = {
      id: `gcp-${Date.now()}`,
      name: name.trim(),
      latitude: lat,
      longitude: lon,
      modelPosition: [x, 0.25, z],
      source,
      verificationStatus,
    }

    onUpdateControlPoints([...controlPoints, newPoint])
    setName('')
    setLatitude('')
    setLongitude('')
    setModelX('')
    setModelZ('')
  }

  const handleDeleteBenchmark = (id: string) => {
    onUpdateControlPoints(controlPoints.filter((p) => p.id !== id))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 md:p-6 overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-3xl bg-white shadow-2xl ring-1 ring-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#2A9D8F] text-white shadow-sm">
              <Compass size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 leading-tight">
                Campus Map Calibration & GPS Utility
              </h2>
              <p className="text-[11px] text-slate-500">
                Helmert 4-Parameter Conformal Alignment & Test Simulation
              </p>
            </div>
          </div>
          <button
            id="btn-modal-close-x"
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-100 bg-slate-50/50 px-5 pt-2 text-xs">
          <button
            id="calibration-tab-benchmarks"
            type="button"
            onClick={() => setActiveTab('benchmarks')}
            className={`border-b-2 px-4 py-2 font-semibold transition ${
              activeTab === 'benchmarks'
                ? 'border-[#2A9D8F] text-[#2A9D8F]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Ground Control Points ({controlPoints.length})
          </button>
          <button
            id="calibration-tab-test-mode"
            type="button"
            onClick={() => setActiveTab('test-mode')}
            className={`flex items-center gap-1.5 border-b-2 px-4 py-2 font-semibold transition ${
              activeTab === 'test-mode'
                ? 'border-[#E76F51] text-[#E76F51]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FlaskConical size={14} />
            <span>GPS Test Mode</span>
            {isTestMode && (
              <span className="rounded-full bg-amber-500/20 px-1.5 py-0.2 text-[9px] font-bold uppercase text-amber-800">
                Active
              </span>
            )}
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs text-slate-700">
          {activeTab === 'benchmarks' && (
            <div className="space-y-4">
              {/* Calibration Status Overview */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200/80">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Status</span>
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                      status === 'calibrated'
                        ? 'bg-emerald-100 text-emerald-800'
                        : status === 'provisional'
                          ? 'bg-blue-100 text-blue-800'
                          : status === 'high_error' || status === 'degenerate'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {status}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Orientation</span>
                  <span className="font-semibold text-slate-800">
                    {helmertParams ? `${helmertParams.rotationDeg.toFixed(1)}°` : '—'}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Scale Factor</span>
                  <span className="font-semibold text-slate-800">
                    {helmertParams ? helmertParams.scale.toFixed(4) : '—'}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">RMSE Error</span>
                  <span className="font-semibold text-slate-800">
                    {rmse !== null ? `±${rmse} m` : '—'}
                  </span>
                </div>
              </div>

              {/* Warning Banner */}
              {warning && (
                <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50/70 p-2.5 text-[11px] text-amber-800">
                  <AlertTriangle size={15} className="text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>{warning}</div>
                </div>
              )}

              {/* Benchmark List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">Active Ground Control Points</span>
                  <div className="flex gap-2">
                    <button
                      id="btn-load-test-points"
                      type="button"
                      onClick={() => onUpdateControlPoints(TEST_MODE_CONTROL_POINTS)}
                      className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50"
                      title="Load built-in test benchmarks for algorithm testing"
                    >
                      Load Test Points
                    </button>
                    <button
                      id="btn-reset-calibration"
                      type="button"
                      onClick={onResetCalibration}
                      className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50"
                      title="Reset to empty production default"
                    >
                      <RotateCcw size={12} />
                      <span>Reset</span>
                    </button>
                  </div>
                </div>

                {/* Reference Geography Notice */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-[11px] text-slate-600">
                  <div className="flex items-center justify-between font-bold text-slate-800 mb-1">
                    <span>MNMJEC Reference Geography</span>
                    <span className="text-[9px] uppercase font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-200">
                      Field Survey Required
                    </span>
                  </div>
                  <p className="text-slate-500 text-[11px] leading-relaxed">
                    OpenStreetMap reference: ~{REAL_WORLD_CAMPUS_REFERENCE.approxGateLatitude}°N, {REAL_WORLD_CAMPUS_REFERENCE.approxGateLongitude}°E.
                    Approximate online coordinates must not be used as survey control points. Real campus 3D positioning remains strictly disabled until certified on-site benchmarks are surveyed.
                  </p>
                </div>

                {controlPoints.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-slate-500">
                    <AlertCircle size={20} className="mx-auto text-slate-400 mb-1" />
                    <p className="font-semibold text-slate-700">No field control points configured</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      GPS coordinates will report "Calibration pending" until real surveyed campus benchmarks are entered.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
                        <tr>
                          <th className="py-2 px-3">Landmark</th>
                          <th className="py-2 px-3">Lat / Lon</th>
                          <th className="py-2 px-3">Model [X, Z]</th>
                          <th className="py-2 px-3">Status</th>
                          <th className="py-2 px-3">Residual</th>
                          <th className="py-2 px-2 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {controlPoints.map((cp) => {
                          const res = residuals.find((r) => r.pointId === cp.id)
                          return (
                            <tr key={cp.id} className="hover:bg-slate-50/60">
                              <td className="py-2 px-3 font-semibold text-slate-900">{cp.name}</td>
                              <td className="py-2 px-3 font-mono text-slate-600">
                                {cp.latitude.toFixed(5)}, {cp.longitude.toFixed(5)}
                              </td>
                              <td className="py-2 px-3 font-mono text-slate-600">
                                [{cp.modelPosition[0]}, {cp.modelPosition[2]}]
                              </td>
                              <td className="py-2 px-3">
                                <span
                                  className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                                    cp.verificationStatus === 'verified'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-amber-100 text-amber-800'
                                  }`}
                                >
                                  {cp.verificationStatus}
                                </span>
                              </td>
                              <td className="py-2 px-3 font-mono text-slate-600">
                                {res ? `${res.errorMeters}m` : '—'}
                              </td>
                              <td className="py-2 px-2 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteBenchmark(cp.id)}
                                  className="text-slate-400 hover:text-red-500 p-1 rounded transition"
                                  title="Delete control point"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Add Benchmark Form */}
              <form onSubmit={handleAddBenchmark} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-3">
                <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <Plus size={14} className="text-[#2A9D8F]" />
                  <span>Enter New Field Benchmark Point</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                      Landmark Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Main Gate Center"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                      Source & Verification
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      <select
                        value={source}
                        onChange={(e) => setSource(e.target.value as GroundControlPoint['source'])}
                        className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs"
                      >
                        <option value="Field Benchmark">Field Benchmark</option>
                        <option value="RTK-GNSS">RTK-GNSS</option>
                        <option value="Survey">Total Station Survey</option>
                        <option value="Provisional Mobile GNSS">Mobile GNSS</option>
                      </select>
                      <select
                        value={verificationStatus}
                        onChange={(e) => setVerificationStatus(e.target.value as GroundControlPoint['verificationStatus'])}
                        className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs"
                      >
                        <option value="provisional">Provisional</option>
                        <option value="verified">Verified</option>
                        <option value="unverified">Unverified</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                      Geographic Coordinates (WGS-84)
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      <input
                        type="number"
                        step="any"
                        placeholder="Latitude (°)"
                        value={latitude}
                        onChange={(e) => setLatitude(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-mono"
                      />
                      <input
                        type="number"
                        step="any"
                        placeholder="Longitude (°)"
                        value={longitude}
                        onChange={(e) => setLongitude(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                      3D Model Coordinates [X, Z] (m)
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      <input
                        type="number"
                        step="any"
                        placeholder="Model X"
                        value={modelX}
                        onChange={(e) => setModelX(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-mono"
                      />
                      <input
                        type="number"
                        step="any"
                        placeholder="Model Z"
                        value={modelZ}
                        onChange={(e) => setModelZ(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    className="flex items-center gap-1.5 rounded-xl bg-[#2A9D8F] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#238276] shadow-sm transition"
                  >
                    <Plus size={14} />
                    <span>Add Control Point</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'test-mode' && (
            <div className="space-y-4">
              {/* Test Mode Warning Banner */}
              <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-3.5 text-amber-900">
                <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-amber-800 text-[11px]">
                  <ShieldAlert size={16} className="text-amber-600" />
                  <span>DEVELOPMENT GPS TEST MODE — SIMULATED READINGS</span>
                </div>
                <p className="mt-1 text-[11px] text-amber-800 leading-relaxed">
                  Allows testing location UI, coordinate conversion, and boundary checks without requiring physical outdoor GPS or faking real satellite accuracy.
                </p>
              </div>

              {/* Toggle Test Mode */}
              <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
                <div>
                  <div className="font-semibold text-slate-900">Simulated Geolocation Provider</div>
                  <div className="text-[11px] text-slate-500">Inject simulated fixes into the GPS service pipeline</div>
                </div>
                <button
                  id="btn-toggle-test-mode"
                  type="button"
                  onClick={() => onToggleTestMode()}
                  className={`rounded-xl px-4 py-2 font-semibold text-xs shadow-sm transition ${
                    isTestMode
                      ? 'bg-amber-600 text-white hover:bg-amber-700'
                      : 'bg-[#2A9D8F] text-white hover:bg-[#238276]'
                  }`}
                >
                  {isTestMode ? 'Disable Test Mode' : 'Enable Test Mode'}
                </button>
              </div>

              {/* Quick Presets */}
              <div className="space-y-2">
                <span className="font-bold text-slate-800">Simulated Landmark Test Presets</span>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {SYNTHETIC_GPS_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      id={`btn-${preset.id}`}
                      type="button"
                      onClick={() => onInjectTestPosition(preset.latitude, preset.longitude, preset.accuracy)}
                      className="flex flex-col items-start p-2.5 rounded-xl border border-slate-200 bg-white hover:border-[#2A9D8F] text-left transition"
                    >
                      <span className="font-semibold text-slate-900 leading-snug">{preset.label}</span>
                      <span
                        className={`text-[10px] font-medium mt-0.5 ${
                          preset.accuracyColor === 'emerald'
                            ? 'text-emerald-600'
                            : preset.accuracyColor === 'blue'
                              ? 'text-blue-600'
                              : preset.accuracyColor === 'rose'
                                ? 'text-rose-600'
                                : 'text-amber-600'
                        }`}
                      >
                        {preset.accuracyBadge}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Injection Form */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-2.5">
                <span className="font-semibold text-slate-800">Inject Custom Coordinates</span>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Latitude</label>
                    <input
                      type="number"
                      step="any"
                      value={testLat}
                      onChange={(e) => setTestLat(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Longitude</label>
                    <input
                      type="number"
                      step="any"
                      value={testLon}
                      onChange={(e) => setTestLon(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Accuracy (m)</label>
                    <input
                      type="number"
                      step="any"
                      value={testAccuracy}
                      onChange={(e) => setTestAccuracy(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    id="btn-inject-custom-pos"
                    type="button"
                    onClick={() => {
                      const lat = parseFloat(testLat)
                      const lon = parseFloat(testLon)
                      const acc = parseFloat(testAccuracy)
                      if (!isNaN(lat) && !isNaN(lon) && !isNaN(acc)) {
                        onInjectTestPosition(lat, lon, acc)
                      }
                    }}
                    className="flex items-center gap-1.5 rounded-xl bg-[#E76F51] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#d45d3f] shadow-sm transition"
                  >
                    <Sparkles size={14} />
                    <span>Inject Simulated Position</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-slate-100 bg-slate-50/50 px-5 py-3">
          <button
            id="btn-close-modal"
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-300 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
