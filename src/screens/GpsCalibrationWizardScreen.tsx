import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Compass,
  Download,
  MapPin,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Campus3D } from '../components/Campus3D'
import { useAuth } from '../context/AuthContext'
import {
  SYNTHETIC_DEV_CONTROL_POINTS,
  SYNTHETIC_DEV_ORIGIN,
} from '../data/campusCalibrationData'
import {
  buildCalibrationModel,
  geoToModelCoordinates,
  MAX_ACCEPTABLE_CALIBRATION_RMSE_METERS,
} from '../lib/campusCalibration'
import { defaultGpsService } from '../services/gpsService'
import type {
  CalibrationModel,
  GroundControlPoint,
  GpsCoordinates,
} from '../types/gps'
import type { Point3 } from '../types/navigation'

import { OFFICIAL_SURVEY_TARGETS } from '../data/campusSurveyTargets'
export { OFFICIAL_SURVEY_TARGETS }

type WizardStep = 'intro' | 'select_landmark' | 'capture_gps' | 'benchmarks_list' | 'alignment_results' | 'preview_3d'

interface MultiSampleReading {
  latitude: number
  longitude: number
  accuracy: number
  timestamp: number
}

export function GpsCalibrationWizardScreen() {
  const { role, isAuthenticated } = useAuth()

  // Strict Authorized Developer Verification:
  // Strictly permitted only in Vite DEV mode or by authenticated Admin users.
  // Insecure query-string bypasses (e.g. ?token=...) have been removed.
  const isAuthorized = useMemo(() => {
    if (import.meta.env.DEV) return true
    if (role === 'admin' && isAuthenticated) return true
    return false
  }, [role, isAuthenticated])

  const [currentStep, setCurrentStep] = useState<WizardStep>('intro')

  // Active collected ground control points
  const [controlPoints, setControlPoints] = useState<GroundControlPoint[]>(() => {
    try {
      const saved = localStorage.getItem('pathfinder_field_calibration_gcps')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) return parsed
      }
    } catch {
      // ignore storage errors
    }
    return []
  })

  // Selected landmark target for measurement
  const [selectedTargetId, setSelectedTargetId] = useState<string>(OFFICIAL_SURVEY_TARGETS[0].id)
  const activeTarget = useMemo(() => {
    return OFFICIAL_SURVEY_TARGETS.find((t) => t.id === selectedTargetId) || OFFICIAL_SURVEY_TARGETS[0]
  }, [selectedTargetId])

  // Multi-sample stationary GPS acquisition state
  const [isCapturing, setIsCapturing] = useState<boolean>(false)
  const [samples, setSamples] = useState<MultiSampleReading[]>([])
  const [captureProgress, setCaptureProgress] = useState<number>(0)
  const [gpsError, setGpsError] = useState<string | null>(null)
  const [hasSampleDataWarning, setHasSampleDataWarning] = useState<boolean>(false)

  // Real-time live GPS preview on 3D map
  const [isLivePreviewActive, setIsLivePreviewActive] = useState<boolean>(false)
  const [liveCoords, setLiveCoords] = useState<GpsCoordinates | null>(null)

  const watchIdRef = useRef<number | null>(null)
  const samplesTargetRef = useRef<number>(6) // Target 6 readings over ~6-8 seconds

  // Auto-save control points to local storage
  useEffect(() => {
    try {
      localStorage.setItem('pathfinder_field_calibration_gcps', JSON.stringify(controlPoints))
    } catch {
      // ignore
    }
  }, [controlPoints])

  // Compute calibration model using 2D Conformal Helmert Transformation
  const calibrationModel: CalibrationModel = useMemo(() => {
    return buildCalibrationModel(controlPoints)
  }, [controlPoints])

  // Listen to live GPS if 3D preview is enabled
  useEffect(() => {
    if (!isLivePreviewActive) return
    defaultGpsService.startTracking({ enableHighAccuracy: true })
    const unsubscribe = defaultGpsService.addListener({
      onPosition: (pos) => {
        setLiveCoords(pos)
      },
      onError: (status, message) => {
        setGpsError(`Live GPS error: ${message} (${status})`)
      },
    })
    return () => {
      unsubscribe()
      defaultGpsService.stopTracking()
    }
  }, [isLivePreviewActive])

  // Transformed 3D point of live GPS if calibrated
  const liveTransformedPoint = useMemo<Point3 | null>(() => {
    if (!liveCoords || calibrationModel.status !== 'calibrated' || !calibrationModel.helmertParams) {
      return null
    }
    const res = geoToModelCoordinates(liveCoords.latitude, liveCoords.longitude, calibrationModel)
    return res ? res.modelPoint : null
  }, [liveCoords, calibrationModel])

  // Aggregate multi-sample statistics
  const sampleStats = useMemo(() => {
    if (samples.length === 0) return null

    const sumLat = samples.reduce((acc, s) => acc + s.latitude, 0)
    const sumLon = samples.reduce((acc, s) => acc + s.longitude, 0)
    const sumAcc = samples.reduce((acc, s) => acc + s.accuracy, 0)

    const meanLat = sumLat / samples.length
    const meanLon = sumLon / samples.length
    const meanAcc = sumAcc / samples.length

    // Standard deviation / horizontal dispersion in meters
    // Approximation: 1 deg lat ~ 111,000m, 1 deg lon ~ 108,000m at Chennai 12.9°N
    const variances = samples.map((s) => {
      const dLatM = (s.latitude - meanLat) * 111132
      const dLonM = (s.longitude - meanLon) * 108390
      return dLatM * dLatM + dLonM * dLonM
    })
    const dispersionMeters = Math.sqrt(variances.reduce((a, b) => a + b, 0) / samples.length)

    // Quality verdict
    let quality: 'EXCELLENT' | 'GOOD' | 'UNACCEPTABLE' = 'GOOD'
    if (meanAcc <= 4.0 && dispersionMeters <= 2.0) {
      quality = 'EXCELLENT'
    } else if (meanAcc > 12.0 || dispersionMeters > 5.0) {
      quality = 'UNACCEPTABLE'
    }

    return {
      meanLat,
      meanLon,
      meanAcc,
      dispersionMeters,
      quality,
      count: samples.length,
    }
  }, [samples])

  // Stop active GPS multi-sample watch
  const stopCapture = useCallback(() => {
    if (watchIdRef.current !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    setIsCapturing(false)
  }, [])

  // Start continuous multi-sample GPS acquisition
  const startMultiSampleCapture = useCallback(() => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setGpsError('Geolocation is not supported on this browser.')
      return
    }

    setGpsError(null)
    setSamples([])
    setCaptureProgress(0)
    setIsCapturing(true)

    const targetSamples = 6
    samplesTargetRef.current = targetSamples
    let collected: MultiSampleReading[] = []

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        // Discard readings with accuracy worse than 25m as unusable noise
        if (position.coords.accuracy > 25) {
          return
        }

        const reading: MultiSampleReading = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp || Date.now(),
        }

        collected = [...collected, reading]
        setSamples(collected)
        setCaptureProgress(Math.min(100, Math.round((collected.length / targetSamples) * 100)))

        if (collected.length >= targetSamples) {
          if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current)
            watchIdRef.current = null
          }
          setIsCapturing(false)
        }
      },
      (error) => {
        stopCapture()
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setGpsError('Location permission denied. Please allow location in browser settings.')
            break
          case error.POSITION_UNAVAILABLE:
            setGpsError('GPS signal unavailable. Ensure location is enabled and sky is visible.')
            break
          case error.TIMEOUT:
            setGpsError('GPS request timed out. Stand outdoors in open area and retry.')
            break
          default:
            setGpsError(error.message || 'Failed to capture GPS signal.')
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 0,
      }
    )
  }, [stopCapture])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCapture()
    }
  }, [stopCapture])

  // Save averaged benchmark point
  const handleSaveBenchmark = () => {
    if (!sampleStats) {
      setGpsError('No GPS observation collected yet.')
      return
    }

    if (sampleStats.quality === 'UNACCEPTABLE') {
      const confirmSave = window.confirm(
        'Warning: The reported accuracy or spread is poor (>12m or high dispersion). It is recommended to retake. Save anyway?'
      )
      if (!confirmSave) return
    }

    const newGcp: GroundControlPoint = {
      id: `gcp-${activeTarget.id}-${Date.now()}`,
      name: activeTarget.name,
      latitude: sampleStats.meanLat,
      longitude: sampleStats.meanLon,
      modelPosition: activeTarget.modelPosition,
      source: 'Field Benchmark',
      verificationStatus: sampleStats.quality === 'EXCELLENT' ? 'verified' : 'provisional',
    }

    // Replace if target already exists, or append
    const updated = controlPoints.filter((p) => p.name !== activeTarget.name)
    setControlPoints([...updated, newGcp])
    setCurrentStep('benchmarks_list')
  }

  // Load certified synthetic test benchmarks for developer verification
  const handleLoadSampleData = () => {
    setControlPoints([...SYNTHETIC_DEV_CONTROL_POINTS])
    setHasSampleDataWarning(true)
    setCurrentStep('alignment_results')
  }

  const handleClearAll = () => {
    if (window.confirm('Clear all surveyed benchmarks and reset to uncalibrated?')) {
      setControlPoints([])
      setHasSampleDataWarning(false)
      try {
        localStorage.removeItem('pathfinder_field_calibration_gcps')
      } catch {
        // ignore
      }
    }
  }

  const handleExportJson = () => {
    const payload = {
      format: 'PATH_FINDER_GPS_CALIBRATION_V1',
      institution: 'Misrimal Navajee Munoth Jain Engineering College (MNMJEC)',
      exportedAt: new Date().toISOString(),
      referenceOrigin: SYNTHETIC_DEV_ORIGIN,
      controlPoints,
      calibrationModel: {
        status: calibrationModel.status,
        rmse: calibrationModel.rmse,
        helmertParams: calibrationModel.helmertParams,
      },
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `mnmjec-field-survey-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string)
        if (Array.isArray(parsed.controlPoints) && parsed.controlPoints.length > 0) {
          setControlPoints(parsed.controlPoints)
          setCurrentStep('alignment_results')
        } else {
          alert('Invalid survey file: No valid control points found.')
        }
      } catch {
        alert('Failed to parse survey JSON file.')
      }
    }
    reader.readAsText(file)
  }

  // Security gate
  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-[#101827] text-[#F1F5F9] flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl border border-rose-500/30 bg-[#192638] p-6 text-center shadow-lg">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-950/60 text-rose-400 mx-auto mb-4 border border-rose-500/30">
            <ShieldAlert size={36} />
          </div>
          <h2 className="text-xl font-bold text-[#F1F5F9] mb-2">Developer Access Required</h2>
          <p className="text-xs text-[#94A3B8] mb-6 leading-relaxed">
            The GPS Calibration Wizard is restricted to authorized field surveyors and administrators to ensure real-world positional safety.
          </p>
          <Link
            to="/welcome"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#60A5FA] hover:bg-blue-400 px-6 py-2.5 text-xs font-bold text-[#0F172A] transition shadow-sm"
          >
            <ChevronLeft size={16} />
            <span>Return to Welcome</span>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#101827] text-[#F1F5F9] flex flex-col font-sans">
      {/* Top Header */}
      <header className="sticky top-0 z-40 border-b border-[#293A50] bg-[#101827]/95 px-4 py-3 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Link
              to="/welcome"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#293A50] bg-[#162235] text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-[#24364D] transition"
              title="Return to Welcome"
            >
              <ChevronLeft size={18} />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold text-[#F1F5F9]">Campus Location Setup</h1>
                <span className="rounded bg-[#162235] px-1.5 py-0.5 text-[9px] font-bold text-[#60A5FA] uppercase border border-[#293A50]">
                  Field Calibration
                </span>
              </div>
              <p className="text-[11px] text-[#94A3B8]">
                Campus Location Setup • Stage E3 Model Alignment
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
              calibrationModel.status === 'calibrated'
                ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/30'
                : calibrationModel.status === 'provisional'
                  ? 'bg-amber-950/60 text-amber-300 border-amber-500/30'
                  : 'bg-[#162235] text-[#94A3B8] border-[#293A50]'
            }`}>
              {calibrationModel.status}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 md:p-6 flex flex-col gap-5">
        {/* Step Indicator Pills */}
        <div className="flex items-center justify-between gap-1 overflow-x-auto pb-1 text-xs">
          <button
            type="button"
            onClick={() => setCurrentStep('intro')}
            className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition cursor-pointer ${
              currentStep === 'intro' ? 'bg-[#60A5FA] text-[#0F172A] shadow-sm' : 'bg-[#162235] border border-[#293A50] text-[#94A3B8] hover:text-[#F1F5F9]'
            }`}
          >
            1. Intro
          </button>
          <ChevronRight size={14} className="text-[#94A3B8] shrink-0" />
          <button
            type="button"
            onClick={() => setCurrentStep('select_landmark')}
            className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition cursor-pointer ${
              currentStep === 'select_landmark' ? 'bg-[#60A5FA] text-[#0F172A] shadow-sm' : 'bg-[#162235] border border-[#293A50] text-[#94A3B8] hover:text-[#F1F5F9]'
            }`}
          >
            2. Choose Landmark
          </button>
          <ChevronRight size={14} className="text-[#94A3B8] shrink-0" />
          <button
            type="button"
            onClick={() => setCurrentStep('capture_gps')}
            className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition cursor-pointer ${
              currentStep === 'capture_gps' ? 'bg-[#60A5FA] text-[#0F172A] shadow-sm' : 'bg-[#162235] border border-[#293A50] text-[#94A3B8] hover:text-[#F1F5F9]'
            }`}
          >
            3. Multi-Sample GPS
          </button>
          <ChevronRight size={14} className="text-[#94A3B8] shrink-0" />
          <button
            type="button"
            onClick={() => setCurrentStep('benchmarks_list')}
            className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition cursor-pointer ${
              currentStep === 'benchmarks_list' ? 'bg-[#60A5FA] text-[#0F172A] shadow-sm' : 'bg-[#162235] border border-[#293A50] text-[#94A3B8] hover:text-[#F1F5F9]'
            }`}
          >
            4. Benchmarks ({controlPoints.length})
          </button>
          <ChevronRight size={14} className="text-[#94A3B8] shrink-0" />
          <button
            type="button"
            onClick={() => setCurrentStep('alignment_results')}
            className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition cursor-pointer ${
              currentStep === 'alignment_results' ? 'bg-[#60A5FA] text-[#0F172A] shadow-sm' : 'bg-[#162235] border border-[#293A50] text-[#94A3B8] hover:text-[#F1F5F9]'
            }`}
          >
            5. Alignment
          </button>
          <ChevronRight size={14} className="text-[#94A3B8] shrink-0" />
          <button
            type="button"
            onClick={() => setCurrentStep('preview_3d')}
            className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition cursor-pointer ${
              currentStep === 'preview_3d' ? 'bg-[#60A5FA] text-[#0F172A] shadow-sm' : 'bg-[#162235] border border-[#293A50] text-[#94A3B8] hover:text-[#F1F5F9]'
            }`}
          >
            6. 3D Preview
          </button>
        </div>

        {/* Global Warning if Synthetic Sample Data Loaded */}
        {hasSampleDataWarning && (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-950/40 p-4 text-xs text-amber-200 flex items-start gap-2.5">
            <AlertTriangle size={18} className="text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-amber-300 font-bold block mb-0.5">SAMPLE TEST DATA LOADED — NOT CERTIFIED PHYSICAL BENCHMARKS</strong>
              <span className="text-amber-200/80">
                These points are mathematical test coordinates for development verification. Real-world live navigation remains safety locked until certified on-site measurements are recorded.
              </span>
            </div>
          </div>
        )}

        {/* STEP 1: INTRODUCTION */}
        {currentStep === 'intro' && (
          <div className="rounded-2xl border border-[#293A50] bg-[#192638] p-6 shadow-sm space-y-5">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#162235] text-[#60A5FA] border border-[#293A50]">
                <Compass size={28} />
              </div>
              <div>
                <h2 className="text-base font-bold text-[#F1F5F9]">Campus Geographic Calibration Protocol</h2>
                <p className="text-xs text-[#94A3B8]">
                  Aligning WGS-84 Satellite GPS with the Certified Stage E3 3D Model
                </p>
              </div>
            </div>

            <p className="text-xs text-[#94A3B8] leading-relaxed">
              PATH FINDER uses a 2D Conformal Helmert Transformation to accurately translate outdoor satellite latitude and longitude into authentic Blender 3D campus coordinates [X, Z].
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="rounded-xl border border-[#293A50] bg-[#162235] p-4 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-[#60A5FA]">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-950/80 text-[#60A5FA] border border-blue-500/30 text-[10px]">1</span>
                  <span>Minimum 3 Points</span>
                </div>
                <p className="text-[#94A3B8] leading-snug">
                  At least 3 geographically separated campus landmarks are required to calculate translation, orientation, and metric scale.
                </p>
              </div>

              <div className="rounded-xl border border-[#293A50] bg-[#162235] p-4 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-[#60A5FA]">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-950/80 text-[#60A5FA] border border-blue-500/30 text-[10px]">2</span>
                  <span>Multi-Sample Averaging</span>
                </div>
                <p className="text-[#94A3B8] leading-snug">
                  Never use a single noisy GPS point. The wizard collects multiple readings to compute mean position and horizontal dispersion.
                </p>
              </div>

              <div className="rounded-xl border border-[#293A50] bg-[#162235] p-4 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-[#60A5FA]">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-950/80 text-[#60A5FA] border border-blue-500/30 text-[10px]">3</span>
                  <span>Safety Guardrail</span>
                </div>
                <p className="text-[#94A3B8] leading-snug">
                  Live navigation lock remains active (<code className="text-[#60A5FA] font-bold">isApproved = false</code>) until field verification is approved.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-[#293A50]">
              <button
                type="button"
                onClick={handleLoadSampleData}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-amber-500/30 bg-amber-950/40 px-4 py-2.5 text-xs font-bold text-amber-300 hover:bg-amber-900/50 transition cursor-pointer"
              >
                <Sparkles size={14} className="text-amber-400" />
                <span>Load Synthetic Sample Data (Test Mode)</span>
              </button>

              <button
                type="button"
                onClick={() => setCurrentStep('select_landmark')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-[#60A5FA] hover:bg-blue-400 px-6 py-2.5 text-xs font-bold text-[#0F172A] transition shadow-sm cursor-pointer"
              >
                <span>Begin Field Survey</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: CHOOSE LANDMARK */}
        {currentStep === 'select_landmark' && (
          <div className="rounded-2xl border border-[#293A50] bg-[#192638] p-6 shadow-sm space-y-4">
            <div>
              <h2 className="text-base font-bold text-[#F1F5F9]">Step 2: Select Campus Landmark</h2>
              <p className="text-xs text-[#94A3B8]">
                Choose the physical landmark you are currently standing at or will measure next.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {OFFICIAL_SURVEY_TARGETS.map((target) => {
                const isMeasured = controlPoints.some((p) => p.name === target.name)
                const isSelected = selectedTargetId === target.id

                return (
                  <button
                    key={target.id}
                    type="button"
                    onClick={() => setSelectedTargetId(target.id)}
                    className={`text-left rounded-xl p-4 border transition cursor-pointer ${
                      isSelected
                        ? 'border-[#60A5FA] bg-[#162235] ring-2 ring-[#60A5FA]/30'
                        : 'border-[#293A50] bg-[#162235] hover:bg-[#24364D]/50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2 font-bold text-sm text-[#F1F5F9]">
                        <MapPin size={16} className={isSelected ? 'text-[#60A5FA]' : 'text-[#94A3B8]'} />
                        <span>{target.name}</span>
                      </div>
                      {isMeasured ? (
                        <span className="rounded-full bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 text-[9px] font-bold text-emerald-400 uppercase">
                          Surveyed
                        </span>
                      ) : (
                        <span className="rounded-full bg-[#192638] border border-[#293A50] px-2 py-0.5 text-[9px] font-bold text-[#94A3B8] uppercase">
                          Pending
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#94A3B8] leading-snug mb-2">{target.description}</p>
                    <div className="text-[10px] font-mono text-[#60A5FA]">
                      Model Coordinates [X, Z]: [{target.modelPosition[0]}, {target.modelPosition[2]}]
                    </div>
                  </button>
                )
              })}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-[#293A50]">
              <button
                type="button"
                onClick={() => setCurrentStep('intro')}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#293A50] bg-[#162235] px-4 py-2 text-xs font-semibold text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-[#24364D] transition cursor-pointer"
              >
                <ChevronLeft size={16} />
                <span>Back</span>
              </button>

              <button
                type="button"
                onClick={() => setCurrentStep('capture_gps')}
                className="inline-flex items-center gap-2 rounded-xl bg-[#60A5FA] hover:bg-blue-400 px-6 py-2.5 text-xs font-bold text-[#0F172A] transition shadow-sm cursor-pointer"
              >
                <span>Proceed to Measure &quot;{activeTarget.name}&quot;</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: MULTI-SAMPLE GPS CAPTURE */}
        {currentStep === 'capture_gps' && (
          <div className="rounded-2xl border border-[#293A50] bg-[#192638] p-6 shadow-sm space-y-5">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-[#60A5FA] mb-1">
                <span>Target:</span>
                <strong className="text-[#F1F5F9]">{activeTarget.name}</strong>
              </div>
              <h2 className="text-base font-bold text-[#F1F5F9]">Step 3: Stationary Multi-Reading GPS Observation</h2>
              <p className="text-xs text-[#94A3B8]">
                Stand directly at this landmark with clear sky visibility. Hold phone stationary to avoid artificial jitter.
              </p>
            </div>

            {/* Live Capture Controls & Progress */}
            <div className="rounded-xl border border-[#293A50] bg-[#162235] p-4 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[#F1F5F9]">Sample Acquisition Progress</span>
                <span className="font-mono text-[#60A5FA] font-bold">{samples.length} / 6 Samples ({captureProgress}%)</span>
              </div>

              {/* Progress Bar */}
              <div className="h-2 w-full rounded-full bg-[#101827] overflow-hidden">
                <div
                  className="h-full bg-[#60A5FA] transition-all duration-300"
                  style={{ width: `${captureProgress}%` }}
                />
              </div>

              <div className="flex gap-2 pt-2">
                {isCapturing ? (
                  <button
                    type="button"
                    onClick={stopCapture}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-amber-600 hover:bg-amber-500 py-3 text-xs font-bold text-white transition shadow-sm cursor-pointer"
                  >
                    <RefreshCw size={15} className="animate-spin" />
                    <span>Collecting Stationary GPS Readings... (Press to Cancel)</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={startMultiSampleCapture}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-[#60A5FA] hover:bg-blue-400 py-3 text-xs font-bold text-[#0F172A] transition shadow-sm cursor-pointer"
                  >
                    <Activity size={15} />
                    <span>{samples.length > 0 ? 'Retake Multi-Sample Observation' : 'Start Multi-Sample Observation (6 Readings)'}</span>
                  </button>
                )}
              </div>
            </div>

            {gpsError && (
              <div className="rounded-xl border border-rose-500/40 bg-rose-950/60 p-3 text-xs text-rose-300">
                {gpsError}
              </div>
            )}

            {/* Multi-sample Statistics Review */}
            {sampleStats && (
              <div className="rounded-xl border border-[#293A50] bg-[#162235] p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-[#293A50] pb-2">
                  <span className="text-xs font-bold text-[#F1F5F9]">Aggregated Observation Verdict</span>
                  <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                    sampleStats.quality === 'EXCELLENT'
                      ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/30'
                      : sampleStats.quality === 'GOOD'
                        ? 'bg-blue-950/60 text-[#60A5FA] border-blue-500/30'
                        : 'bg-rose-950/60 text-rose-300 border-rose-500/30'
                  }`}>
                    Quality: {sampleStats.quality}
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                  <div className="rounded-xl bg-[#192638] p-2.5 border border-[#293A50]">
                    <span className="text-[#94A3B8] block text-[9px] uppercase font-bold">Mean Latitude</span>
                    <span className="font-mono text-[#60A5FA]">{sampleStats.meanLat.toFixed(6)}° N</span>
                  </div>
                  <div className="rounded-xl bg-[#192638] p-2.5 border border-[#293A50]">
                    <span className="text-[#94A3B8] block text-[9px] uppercase font-bold">Mean Longitude</span>
                    <span className="font-mono text-[#60A5FA]">{sampleStats.meanLon.toFixed(6)}° E</span>
                  </div>
                  <div className="rounded-xl bg-[#192638] p-2.5 border border-[#293A50]">
                    <span className="text-[#94A3B8] block text-[9px] uppercase font-bold">Avg Accuracy</span>
                    <span className="font-bold text-[#F1F5F9]">±{sampleStats.meanAcc.toFixed(1)}m</span>
                  </div>
                  <div className="rounded-xl bg-[#192638] p-2.5 border border-[#293A50]">
                    <span className="text-[#94A3B8] block text-[9px] uppercase font-bold">Dispersion (Spread)</span>
                    <span className="font-bold text-[#F1F5F9]">{sampleStats.dispersionMeters.toFixed(1)}m</span>
                  </div>
                </div>

                <p className="text-[11px] text-[#94A3B8]">
                  {sampleStats.quality === 'EXCELLENT' && 'High precision reading with minimal dispersion. Excellent for Helmert alignment.'}
                  {sampleStats.quality === 'GOOD' && 'Acceptable field observation within standard civilian smartphone GPS tolerances.'}
                  {sampleStats.quality === 'UNACCEPTABLE' && 'High dispersion detected. Recommended to retake observation under clear sky.'}
                </p>
              </div>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-[#293A50]">
              <button
                type="button"
                onClick={() => setCurrentStep('select_landmark')}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#293A50] bg-[#162235] px-4 py-2 text-xs font-semibold text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-[#24364D] transition cursor-pointer"
              >
                <ChevronLeft size={16} />
                <span>Back</span>
              </button>

              <button
                type="button"
                disabled={!sampleStats || isCapturing}
                onClick={handleSaveBenchmark}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-2.5 text-xs font-bold text-white transition shadow-sm cursor-pointer"
              >
                <Check size={16} />
                <span>Save Benchmark to Dataset</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: BENCHMARKS LIST */}
        {currentStep === 'benchmarks_list' && (
          <div className="rounded-2xl border border-[#293A50] bg-[#192638] p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-[#F1F5F9]">Active Survey Benchmarks ({controlPoints.length})</h2>
                <p className="text-xs text-[#94A3B8]">
                  Minimum 3 non-collinear landmarks required for complete 2D Helmert conformal alignment.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCurrentStep('select_landmark')}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#60A5FA] hover:bg-blue-400 px-3.5 py-1.5 text-xs font-bold text-[#0F172A] transition cursor-pointer"
              >
                <span>+ Add Landmark</span>
              </button>
            </div>

            {controlPoints.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#293A50] bg-[#162235] p-6 text-center text-xs text-[#94A3B8]">
                No benchmarks recorded yet. Select a landmark to capture your first measurement.
              </div>
            ) : (
              <div className="space-y-2">
                {controlPoints.map((pt) => (
                  <div
                    key={pt.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-[#293A50] bg-[#162235] p-3.5 text-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2 font-bold text-[#F1F5F9]">
                        <MapPin size={14} className="text-[#60A5FA]" />
                        <span>{pt.name}</span>
                        <span className="rounded bg-[#192638] border border-[#293A50] px-1.5 py-0.5 text-[9px] font-mono text-[#94A3B8]">
                          {pt.source}
                        </span>
                      </div>
                      <div className="text-[11px] font-mono text-[#94A3B8]">
                        GPS: {pt.latitude.toFixed(6)}°, {pt.longitude.toFixed(6)}° • Model [X, Z]: [{pt.modelPosition[0]}, {pt.modelPosition[2]}]
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setControlPoints(controlPoints.filter((p) => p.id !== pt.id))}
                      className="self-end sm:self-center flex h-7 w-7 items-center justify-center rounded-lg text-rose-400 hover:bg-rose-950/60 transition cursor-pointer"
                      title="Remove benchmark"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-[#293A50]">
              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleExportJson}
                  disabled={controlPoints.length === 0}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#293A50] bg-[#162235] px-3 py-2 text-xs font-semibold text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-[#24364D] disabled:opacity-50 cursor-pointer"
                >
                  <Download size={13} />
                  <span>Export JSON</span>
                </button>
                <label className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#293A50] bg-[#162235] px-3 py-2 text-xs font-semibold text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-[#24364D] cursor-pointer">
                  <Upload size={13} />
                  <span>Import JSON</span>
                  <input type="file" accept=".json" onChange={handleImportJson} className="hidden" />
                </label>
                <button
                  type="button"
                  onClick={handleClearAll}
                  disabled={controlPoints.length === 0}
                  className="inline-flex items-center justify-center rounded-xl border border-rose-500/30 bg-rose-950/40 px-3 py-2 text-xs font-semibold text-rose-400 hover:bg-rose-900/60 disabled:opacity-50 cursor-pointer"
                  title="Clear all"
                >
                  <Trash2 size={13} />
                </button>
              </div>

              <button
                type="button"
                onClick={() => setCurrentStep('alignment_results')}
                disabled={controlPoints.length < 2}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-[#60A5FA] hover:bg-blue-400 disabled:opacity-50 px-6 py-2.5 text-xs font-bold text-[#0F172A] transition shadow-sm cursor-pointer"
              >
                <span>Calculate Helmert Alignment</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 5: ALIGNMENT RESULTS */}
        {currentStep === 'alignment_results' && (
          <div className="rounded-2xl border border-[#293A50] bg-[#192638] p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-[#293A50] pb-3">
              <div>
                <h2 className="text-base font-bold text-[#F1F5F9]">Campus Location Alignment &amp; Metrics</h2>
                <p className="text-xs text-[#94A3B8]">
                  Transformation metrics and residual accuracy across MNMJEC ground control points (Helmert 4-parameter model)
                </p>
              </div>
              <span className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${
                calibrationModel.status === 'calibrated'
                  ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/30'
                  : 'bg-amber-950/60 text-amber-300 border-amber-500/30'
              }`}>
                {calibrationModel.status}
              </span>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div className="rounded-xl border border-[#293A50] bg-[#162235] p-3.5 space-y-1">
                <span className="text-[#94A3B8] block text-[10px] uppercase font-bold">RMSE Residual</span>
                <span className={`text-base font-bold ${
                  calibrationModel.rmse !== null && calibrationModel.rmse <= 2.5
                    ? 'text-emerald-400'
                    : calibrationModel.rmse !== null && calibrationModel.rmse <= 5.0
                      ? 'text-[#60A5FA]'
                      : 'text-amber-400'
                }`}>
                  {calibrationModel.rmse !== null ? `${calibrationModel.rmse.toFixed(2)}m` : '—'}
                </span>
                <span className="text-[10px] text-[#94A3B8]/70 block">Threshold: &lt;{MAX_ACCEPTABLE_CALIBRATION_RMSE_METERS}m</span>
              </div>

              <div className="rounded-xl border border-[#293A50] bg-[#162235] p-3.5 space-y-1">
                <span className="text-[#94A3B8] block text-[10px] uppercase font-bold">Conformal Scale</span>
                <span className="text-base font-bold text-[#60A5FA] font-mono">
                  {calibrationModel.helmertParams ? calibrationModel.helmertParams.scale.toFixed(4) : '—'}
                </span>
                <span className="text-[10px] text-[#94A3B8]/70 block">Nominal: ~1.0000</span>
              </div>

              <div className="rounded-xl border border-[#293A50] bg-[#162235] p-3.5 space-y-1">
                <span className="text-[#94A3B8] block text-[10px] uppercase font-bold">Rotation Angle</span>
                <span className="text-base font-bold text-[#F1F5F9] font-mono">
                  {calibrationModel.helmertParams
                    ? `${calibrationModel.helmertParams.rotationDeg.toFixed(2)}°`
                    : '—'}
                </span>
                <span className="text-[10px] text-[#94A3B8]/70 block">Relative to WGS-84 North</span>
              </div>

              <div className="rounded-xl border border-[#293A50] bg-[#162235] p-3.5 space-y-1">
                <span className="text-[#94A3B8] block text-[10px] uppercase font-bold">Translation [Tx, Tz]</span>
                <span className="text-xs font-bold text-[#F1F5F9] font-mono block truncate">
                  {calibrationModel.helmertParams
                    ? `[${calibrationModel.helmertParams.tx.toFixed(1)}m, ${calibrationModel.helmertParams.tz.toFixed(1)}m]`
                    : '—'}
                </span>
                <span className="text-[10px] text-[#94A3B8]/70 block">Blender Model Offset</span>
              </div>
            </div>

            {/* Residuals Table */}
            {calibrationModel.residuals && calibrationModel.residuals.length > 0 && (
              <div className="rounded-xl border border-[#293A50] bg-[#162235] p-4 space-y-2">
                <span className="text-xs font-bold text-[#F1F5F9] block">Individual Landmark Residuals</span>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#293A50] text-[10px] uppercase text-[#94A3B8]">
                        <th className="py-1.5 px-2">Landmark</th>
                        <th className="py-1.5 px-2">Surveyed [Lat, Lon]</th>
                        <th className="py-1.5 px-2">Model [X, Z]</th>
                        <th className="py-1.5 px-2">Error</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#24364D] text-[#F1F5F9] font-mono text-[11px]">
                      {calibrationModel.residuals.map((r) => {
                        const pt = controlPoints.find((p) => p.id === r.pointId || p.name === r.pointName)
                        return (
                          <tr key={r.pointId}>
                            <td className="py-2 px-2 font-sans font-semibold text-[#F1F5F9]">{r.pointName}</td>
                            <td className="py-2 px-2 text-[#94A3B8]">
                              {pt ? `${pt.latitude.toFixed(5)}°, ${pt.longitude.toFixed(5)}°` : 'Survey Point'}
                            </td>
                            <td className="py-2 px-2 text-[#60A5FA]">
                              {pt ? `[${pt.modelPosition[0]}, ${pt.modelPosition[2]}]` : '—'}
                            </td>
                            <td className="py-2 px-2">
                              <span className={r.errorMeters <= 2.5 ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                                {r.errorMeters.toFixed(2)}m
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-[#293A50]">
              <button
                type="button"
                onClick={() => setCurrentStep('benchmarks_list')}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#293A50] bg-[#162235] px-4 py-2 text-xs font-semibold text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-[#24364D] transition cursor-pointer"
              >
                <ChevronLeft size={16} />
                <span>Back to Benchmarks</span>
              </button>

              <button
                type="button"
                onClick={() => setCurrentStep('preview_3d')}
                className="inline-flex items-center gap-2 rounded-xl bg-[#60A5FA] hover:bg-blue-400 px-6 py-2.5 text-xs font-bold text-[#0F172A] transition shadow-sm cursor-pointer"
              >
                <span>Preview 3D Campus Alignment</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 6: 3D PREVIEW */}
        {currentStep === 'preview_3d' && (
          <div className="rounded-2xl border border-[#293A50] bg-[#192638] p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-[#F1F5F9]">Step 6: Authentic 3D Campus Preview</h2>
                <p className="text-xs text-[#94A3B8]">
                  Visual validation of calibrated landmarks on certified Stage E3 Blender geometry
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsLivePreviewActive(!isLivePreviewActive)}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                    isLivePreviewActive
                      ? 'bg-emerald-600 text-white'
                      : 'border border-[#293A50] bg-[#162235] text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-[#24364D]'
                  }`}
                >
                  <Activity size={13} className={isLivePreviewActive ? 'animate-pulse' : ''} />
                  <span>{isLivePreviewActive ? 'Live GPS Active' : 'Start Live GPS Follower'}</span>
                </button>
              </div>
            </div>

            {/* 3D Viewport container */}
            <div className="relative h-[480px] w-full rounded-2xl border border-[#293A50] overflow-hidden bg-[#101827]">
              <Campus3D
                className="h-full w-full"
                showHud={true}
                userLocationPoint={liveTransformedPoint}
                userLocationAccuracyRadius={liveCoords?.accuracy}
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[#293A50]">
              <button
                type="button"
                onClick={() => setCurrentStep('alignment_results')}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#293A50] bg-[#162235] px-4 py-2 text-xs font-semibold text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-[#24364D] transition cursor-pointer"
              >
                <ChevronLeft size={16} />
                <span>Back to Alignment</span>
              </button>

              <Link
                to="/welcome"
                className="inline-flex items-center gap-2 rounded-xl bg-[#60A5FA] hover:bg-blue-400 px-6 py-2.5 text-xs font-bold text-[#0F172A] transition shadow-sm"
              >
                <Check size={16} />
                <span>Finish &amp; Return to Campus</span>
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
