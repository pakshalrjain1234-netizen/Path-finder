import {
  AlertCircle,
  Camera,
  Check,
  CheckCircle2,
  FileText,
  Image as ImageIcon,
  MapPin,
  Maximize2,
  PlusCircle,
  RefreshCw,
  Send,
  Trash2,
  VideoOff,
  Wrench,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Campus3D } from '../components/Campus3D'
import { EvidenceImageViewer } from '../components/EvidenceImageViewer'
import { useAuth } from '../context/AuthContext'
import { CAMPUS_LANDMARKS } from '../data/campusLandmarks'
import {
  evidenceStorageService,
  optimizeImageForUpload,
  validateImageFile,
  type OptimizedPhotoResult,
} from '../services/evidenceStorageService'
import { issueService } from '../services/issueService'
import type { CampusIssueReport, IssueCategory, IssueStatus } from '../types/issues'
import type { Point3 } from '../types/navigation'

const ISSUE_CATEGORIES: IssueCategory[] = [
  'Cleanliness',
  'Garbage accumulation',
  'Electrical / outdoor lighting',
  'Water leakage',
  'Waterlogging',
  'Damaged walkway',
  'Building exterior damage',
  'Accessibility obstruction',
  'General maintenance',
  'Other',
]

const STATUS_STEPS: IssueStatus[] = [
  'SUBMITTED',
  'UNDER_REVIEW',
  'ASSIGNED',
  'IN_PROGRESS',
  'RESOLVED',
]

export function StudentIssueScreen() {
  const { user, role } = useAuth()
  const [activeTab, setActiveTab] = useState<'report' | 'my-reports'>('report')

  // Form states
  const [category, setCategory] = useState<IssueCategory>('General maintenance')
  const [description, setDescription] = useState('')
  const [locationName, setLocationName] = useState('')
  const [selectedBuildingId, setSelectedBuildingId] = useState('')
  const [pickedPoint, setPickedPoint] = useState<Point3 | null>([50.0, 3.8, 10.0])

  // Photo Evidence states
  const [optimizedPhoto, setOptimizedPhoto] = useState<OptimizedPhotoResult | null>(null)
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [enlargedPhotoUrl, setEnlargedPhotoUrl] = useState<string | null>(null)

  // Submission states
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploadStatusText, setUploadStatusText] = useState<string>('')
  const [submittedReport, setSubmittedReport] = useState<CampusIssueReport | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  // My Reports list
  const [myReports, setMyReports] = useState<CampusIssueReport[]>([])
  const [selectedReport, setSelectedReport] = useState<CampusIssueReport | null>(null)
  const [filterCategory, setFilterCategory] = useState<string>('All')

  // In-app webcam preview states (Desktop)
  const [isWebcamOpen, setIsWebcamOpen] = useState(false)
  const [webcamStream, setWebcamStream] = useState<MediaStream | null>(null)
  const [webcamError, setWebcamError] = useState<string | null>(null)
  const [capturedSnapshot, setCapturedSnapshot] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)

  // Storage notification state for unprovisioned bucket
  const [storageNotice, setStorageNotice] = useState<string | null>(null)
  const [photoUploadError, setPhotoUploadError] = useState<string | null>(null)

  // File input refs
  const cameraInputRef = useRef<HTMLInputElement | null>(null)
  const galleryInputRef = useRef<HTMLInputElement | null>(null)

  // Load student reports
  const reloadReports = () => {
    const list = issueService.getIssuesForRole(role, user.id)
    setMyReports(list)
    if (list.length > 0 && !selectedReport) {
      setSelectedReport(list[0])
    }
  }

  useEffect(() => {
    reloadReports()
    const unsubscribe = issueService.onChange(() => {
      reloadReports()
    })
    return () => unsubscribe()
  }, [role, user.id])

  // Stop camera tracks cleanly
  const stopWebcamTracks = useCallback(() => {
    if (webcamStream) {
      webcamStream.getTracks().forEach((track) => track.stop())
      setWebcamStream(null)
    }
  }, [webcamStream])

  // Cleanup webcam stream on unmount
  useEffect(() => {
    return () => {
      if (webcamStream) {
        webcamStream.getTracks().forEach((track) => track.stop())
      }
    }
  }, [webcamStream])

  // Sync stream to video element when stream changes
  useEffect(() => {
    if (videoRef.current && webcamStream) {
      videoRef.current.srcObject = webcamStream
      videoRef.current.play().catch(() => {})
    }
  }, [webcamStream])

  const handleOpenCamera = async () => {
    const isMobile = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0)
    if (isMobile && cameraInputRef.current) {
      cameraInputRef.current.click()
      return
    }

    setWebcamError(null)
    setCapturedSnapshot(null)
    setIsWebcamOpen(true)

    if (!navigator.mediaDevices?.getUserMedia) {
      setWebcamError('Camera hardware access is not supported by your browser. Please choose an image from your gallery.')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      })
      setWebcamStream(stream)
    } catch (err: any) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setWebcamError('Camera permission was denied. Please allow camera permissions in your browser address bar or select from gallery.')
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setWebcamError('No camera was detected on this device. You can choose a photo from your gallery instead.')
      } else {
        setWebcamError(`Camera error: ${err.message || 'Unable to start camera'}. You can choose from your gallery.`)
      }
    }
  }

  const handleCaptureSnapshot = () => {
    const video = videoRef.current
    if (!video) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth || 1280
    canvas.height = video.videoHeight || 720
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9)
    setCapturedSnapshot(dataUrl)
  }

  const handleRetakeSnapshot = () => {
    setCapturedSnapshot(null)
  }

  const handleUseSnapshot = async () => {
    if (!capturedSnapshot) return
    setIsProcessingPhoto(true)
    try {
      const res = await fetch(capturedSnapshot)
      const blob = await res.blob()
      const file = new File([blob], `campus_photo_${Date.now()}.jpg`, { type: 'image/jpeg' })
      const optimized = await optimizeImageForUpload(file)
      setOptimizedPhoto(optimized)
      setCapturedSnapshot(null)
      stopWebcamTracks()
      setIsWebcamOpen(false)
    } catch {
      setPhotoError('Failed to process webcam snapshot. Please try again.')
    } finally {
      setIsProcessingPhoto(false)
    }
  }

  const handleCloseWebcam = () => {
    stopWebcamTracks()
    setCapturedSnapshot(null)
    setWebcamError(null)
    setIsWebcamOpen(false)
  }

  // Handle location picking on 3D canvas
  const handleLocationPick = (point: Point3, nearestBuilding?: string) => {
    setPickedPoint(point)
    if (nearestBuilding) {
      setSelectedBuildingId(nearestBuilding)
      const landmark = CAMPUS_LANDMARKS.find((l) => l.id === nearestBuilding)
      if (landmark) {
        setLocationName(`Near ${landmark.label}`)
      }
    } else {
      setLocationName(`Outdoor Ground Point [${point[0].toFixed(1)}, ${point[2].toFixed(1)}]`)
    }
  }

  const handleBuildingSelectFromDropdown = (buildingId: string) => {
    setSelectedBuildingId(buildingId)
    const landmark = CAMPUS_LANDMARKS.find((l) => l.id === buildingId)
    if (landmark) {
      setLocationName(`Near ${landmark.label}`)
      setPickedPoint(landmark.fallbackPosition)
    }
  }

  // Handle Photo selection from Camera or Gallery
  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setPhotoError(null)

    // 1. Validation
    const validation = validateImageFile(file)
    if (!validation.valid) {
      setPhotoError(validation.error || 'Invalid photo file.')
      e.target.value = ''
      return
    }

    // 2. Optimization (Downscale large phone photos and strip EXIF for privacy)
    setIsProcessingPhoto(true)
    try {
      const optimized = await optimizeImageForUpload(file)
      setOptimizedPhoto(optimized)
    } catch {
      setPhotoError('Failed to process image. Please try selecting a different photo.')
    } finally {
      setIsProcessingPhoto(false)
      e.target.value = ''
    }
  }

  const handleRemovePhoto = () => {
    setOptimizedPhoto(null)
    setPhotoError(null)
  }

  // Handle Issue Submission with explicit photo failure and retry controls
  const handleSubmit = async (e?: React.FormEvent, forceSkipPhoto = false) => {
    if (e) e.preventDefault()
    setFormError(null)
    setStorageNotice(null)
    setPhotoUploadError(null)

    if (!description.trim()) {
      setFormError('Please describe the campus maintenance problem.')
      return
    }

    if (!pickedPoint) {
      setFormError('Please click a location on the 3D campus model.')
      return
    }

    setIsSubmitting(true)
    setUploadStatusText('Preparing issue submission...')

    try {
      let finalPhotoUrl: string | undefined = undefined

      // If a photo was selected, upload it via the evidence storage service
      if (optimizedPhoto && !forceSkipPhoto) {
        setUploadStatusText('Uploading evidence photograph to secure storage...')
        const tempTrackingId = `MNM-${Date.now()}`
        const uploadRes = await evidenceStorageService.uploadIssuePhoto(
          optimizedPhoto.file,
          user.id,
          tempTrackingId,
          role
        )

        if (uploadRes.success && uploadRes.photoUrl) {
          finalPhotoUrl = uploadRes.photoUrl
          if (uploadRes.isLocalFallback) {
            setStorageNotice(
              'Photo stored locally in prototype session. Cloud persistence requires active Supabase connection.'
            )
          }
        } else {
          // Explicit photo failure handling per Phase 8E/8G specifications
          setIsSubmitting(false)
          setUploadStatusText('')
          setPhotoUploadError(
            uploadRes.error ||
              'Campus evidence cloud storage (campus-issue-photos) could not complete photo upload.'
          )
          return
        }
      }

      setUploadStatusText('Saving campus issue report...')
      const res = await issueService.createIssue(
        {
          category,
          description: description.trim(),
          locationName: locationName.trim() || 'Outdoor Campus Grounds',
          buildingId: selectedBuildingId || undefined,
          modelCoordinates: [pickedPoint[0], pickedPoint[1], pickedPoint[2]],
          photoUrl: finalPhotoUrl,
        },
        role,
        user
      )

      if (res.success && res.issue) {
        setSubmittedReport(res.issue)
        setSelectedReport(res.issue)
        setDescription('')
        setOptimizedPhoto(null)
        setPhotoUploadError(null)
        reloadReports()
      } else {
        // Safe cleanup: If issue creation failed after photo upload, remove orphaned storage file
        if (finalPhotoUrl && !finalPhotoUrl.startsWith('data:') && !finalPhotoUrl.startsWith('blob:')) {
          await evidenceStorageService.deleteIssuePhoto(finalPhotoUrl)
        }
        setFormError(res.error || 'Failed to submit report. Please try again.')
      }
    } catch {
      setFormError('An unexpected network error occurred during submission.')
    } finally {
      setIsSubmitting(false)
      setUploadStatusText('')
    }
  }

  const filteredReports = myReports.filter((r) => {
    if (filterCategory === 'All') return true
    return r.category === filterCategory
  })

  return (
    <div className="min-h-screen bg-[#101827] text-[#F1F5F9] p-3 md:p-6 lg:p-8">
      {/* Top Banner */}
      <div className="max-w-7xl mx-auto mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#293A50] pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#60A5FA] mb-1">
            <span className="rounded-md bg-blue-500/10 px-2 py-0.5 border border-blue-500/20 text-[10px] uppercase font-bold tracking-wider">
              Student Passport
            </span>
            <span>MNM Jain Engineering College</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <Wrench className="text-[#60A5FA]" size={28} />
            Campus Issue Passport
          </h1>
          <p className="text-xs text-[#94A3B8] mt-1">
            Pinpoint maintenance issues on the Stage E3 campus model and attach photographic evidence.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex rounded-2xl bg-[#162235] p-1 border border-[#293A50] shadow-sm self-start md:self-auto">
          <button
            type="button"
            data-testid="tab-report-issue"
            onClick={() => {
              setActiveTab('report')
              setSubmittedReport(null)
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'report'
                ? 'bg-[#2563EB] text-white shadow-sm'
                : 'text-[#94A3B8] hover:text-white'
            }`}
          >
            <PlusCircle size={15} />
            <span>Report Issue</span>
          </button>
          <button
            type="button"
            data-testid="tab-my-reports"
            onClick={() => {
              setActiveTab('my-reports')
              reloadReports()
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'my-reports'
                ? 'bg-[#2563EB] text-white shadow-sm'
                : 'text-[#94A3B8] hover:text-white'
            }`}
          >
            <FileText size={15} />
            <span>My Reports ({myReports.length})</span>
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto">
        {activeTab === 'report' ? (
          <div>
            {/* ------------------------------------------------------------- */}
            {/* SUCCESS CONFIRMATION SCREEN AFTER DATABASE CONFIRMATION       */}
            {/* ------------------------------------------------------------- */}
            {submittedReport ? (
              <div className="rounded-3xl border border-emerald-500/30 bg-[#192638] p-6 md:p-10 text-center max-w-2xl mx-auto shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 mx-auto mb-4 border border-emerald-500/20">
                  <CheckCircle2 size={36} />
                </div>
                <h2 className="text-xl md:text-2xl font-bold text-white mb-1">Your Issue Has Been Submitted</h2>
                <p className="text-xs text-[#94A3B8] mb-6 leading-relaxed">
                  Your campus issue has been logged into the operational queue with certified 3D model coordinates.
                </p>

                {/* Submitted Summary Card */}
                <div className="rounded-2xl border border-[#293A50] bg-[#162235] p-4 text-left space-y-3 mb-6">
                  <div className="flex items-center justify-between border-b border-[#293A50] pb-2.5">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-[#94A3B8]">Tracking Reference</span>
                      <div className="text-lg font-mono font-bold text-[#60A5FA] tracking-wider">
                        {submittedReport.id}
                      </div>
                    </div>
                    <span className="rounded-full bg-blue-500/20 border border-blue-500/30 px-3 py-1 text-xs font-bold text-[#60A5FA] uppercase">
                      {submittedReport.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[#94A3B8] block text-[10px] uppercase font-bold">Category</span>
                      <span className="font-semibold text-white">{submittedReport.category}</span>
                    </div>
                    <div>
                      <span className="text-[#94A3B8] block text-[10px] uppercase font-bold">Location</span>
                      <span className="font-semibold text-white">{submittedReport.locationName}</span>
                    </div>
                  </div>

                  {/* Photo Evidence Preview if attached */}
                  {submittedReport.photoUrl && (
                    <div className="border-t border-[#293A50] pt-2.5">
                      <span className="text-[#94A3B8] block text-[10px] uppercase font-bold mb-1.5">
                        Attached Photographic Evidence
                      </span>
                      <EvidenceImageViewer
                        photoUrl={submittedReport.photoUrl}
                        alt="Submitted evidence photograph"
                        role={role}
                      />
                    </div>
                  )}

                  {/* Notice if photo attachment was omitted due to unconfigured cloud bucket */}
                  {storageNotice && (
                    <div className="border-t border-amber-500/30 pt-2.5">
                      <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-2.5 text-xs text-amber-200 flex items-start gap-2">
                        <AlertCircle size={15} className="shrink-0 text-amber-400 mt-0.5" />
                        <div>
                          <strong className="block font-semibold text-amber-300">Photo Storage Notice</strong>
                          <span className="text-[11px] text-amber-200/90 leading-tight">
                            {storageNotice}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => setSubmittedReport(null)}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-semibold bg-[#162235] hover:bg-[#24364D] text-[#F1F5F9] border border-[#293A50] transition cursor-pointer"
                  >
                    Report Another Issue
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('my-reports')
                      setSelectedReport(submittedReport)
                    }}
                    className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs font-bold bg-[#2563EB] hover:bg-blue-600 text-white transition shadow-md shadow-blue-500/20 cursor-pointer"
                  >
                    View in My Reports
                  </button>
                </div>
              </div>
            ) : (
              /* ------------------------------------------------------------- */
              /* MAIN REPORTING INTERFACE (Left: 3D Pin, Right: Form)          */
              /* ------------------------------------------------------------- */
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* 3D Model Coordinate Pin Picker (Left 7 cols) */}
                <div className="lg:col-span-7 flex flex-col gap-3">
                  <div className="rounded-3xl border border-[#293A50] bg-[#192638] p-4 shadow-xl">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-300 mb-2">
                      <div className="flex items-center gap-2">
                        <MapPin size={16} className="text-[#60A5FA]" />
                        <span>Step 1: Click Approximate Location on 3D Campus</span>
                      </div>
                      <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-mono text-[#60A5FA] border border-blue-500/20">
                        {pickedPoint ? `[${pickedPoint[0].toFixed(1)}, ${pickedPoint[2].toFixed(1)}]` : 'Click Map'}
                      </span>
                    </div>

                    <div className="relative h-[340px] md:h-[440px] w-full rounded-2xl overflow-hidden border border-[#293A50] bg-[#101827]">
                      <Campus3D
                        className="h-full w-full"
                        showHud={false}
                        isPlacingIssue={true}
                        issuePlacementPoint={pickedPoint}
                        onLocationPick={handleLocationPick}
                        suppressLabels={Boolean(enlargedPhotoUrl || isWebcamOpen)}
                      />

                      {/* Floating Placement Instruction Pill */}
                      <div className="pointer-events-none absolute bottom-3 inset-x-3 flex justify-center">
                        <div className="pointer-events-auto rounded-full bg-[#162235]/95 border border-[#293A50] px-3.5 py-1 text-[11px] font-medium text-[#94A3B8] shadow-md backdrop-blur-md text-center">
                          Tap ground or building to anchor coordinate marker
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Reporting Form (Right 5 cols) */}
                <div className="lg:col-span-5">
                  <form
                    onSubmit={handleSubmit}
                    className="rounded-3xl border border-[#293A50] bg-[#192638] p-5 md:p-6 shadow-xl space-y-4"
                  >
                    <div>
                      <h2 className="text-base font-bold text-white flex items-center gap-2">
                        <FileText size={18} className="text-[#60A5FA]" />
                        <span>Step 2: Issue Details &amp; Evidence</span>
                      </h2>
                      <p className="text-xs text-[#94A3B8] mt-0.5">
                        Reports are prioritized and dispatched to relevant campus maintenance squads.
                      </p>
                    </div>

                    {/* Category */}
                    <div>
                      <label htmlFor="issue-category" className="block text-xs font-semibold text-slate-300 mb-1.5">
                        Problem Category *
                      </label>
                      <select
                        id="issue-category"
                        value={category}
                        onChange={(e) => setCategory(e.target.value as IssueCategory)}
                        className="w-full rounded-xl border border-[#293A50] bg-[#162235] px-3 py-2.5 text-xs text-[#F1F5F9] focus:border-[#60A5FA] focus:outline-none shadow-sm cursor-pointer"
                      >
                        {ISSUE_CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Landmark Dropdown */}
                    <div>
                      <label htmlFor="issue-building" className="block text-xs font-semibold text-slate-300 mb-1.5">
                        Nearby Building / Landmark Reference
                      </label>
                      <select
                        id="issue-building"
                        value={selectedBuildingId}
                        onChange={(e) => handleBuildingSelectFromDropdown(e.target.value)}
                        className="w-full rounded-xl border border-[#293A50] bg-[#162235] px-3 py-2.5 text-xs text-[#F1F5F9] focus:border-[#60A5FA] focus:outline-none shadow-sm cursor-pointer"
                      >
                        <option value="">-- Outdoor / General Campus Grounds --</option>
                        {CAMPUS_LANDMARKS.map((lm) => (
                          <option key={lm.id} value={lm.id}>
                            {lm.label} ({lm.type})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Location Description */}
                    <div>
                      <label htmlFor="issue-location" className="block text-xs font-semibold text-slate-300 mb-1.5">
                        Location Description
                      </label>
                      <input
                        id="issue-location"
                        type="text"
                        value={locationName}
                        onChange={(e) => setLocationName(e.target.value)}
                        placeholder="e.g. Near Canteen east door / Civil Block walkway"
                        className="w-full rounded-xl border border-[#293A50] bg-[#162235] px-3 py-2.5 text-xs text-[#F1F5F9] placeholder:text-[#64748B] focus:border-[#60A5FA] focus:outline-none shadow-sm"
                      />
                    </div>

                    {/* Problem Description */}
                    <div>
                      <label htmlFor="issue-desc" className="block text-xs font-semibold text-slate-300 mb-1.5">
                        Description of Problem *
                      </label>
                      <textarea
                        id="issue-desc"
                        rows={3}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Please describe the issue, hazard, or repair requirement in detail..."
                        className="w-full rounded-xl border border-[#293A50] bg-[#162235] px-3 py-2.5 text-xs text-[#F1F5F9] placeholder:text-[#64748B] focus:border-[#60A5FA] focus:outline-none resize-none shadow-sm"
                      />
                    </div>

                    {/* --------------------------------------------------------- */}
                    {/* PHOTOGRAPHIC EVIDENCE SECTION (Camera & Gallery)           */}
                    {/* --------------------------------------------------------- */}
                    <div className="border-t border-[#293A50] pt-3 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-semibold text-slate-300">
                          Photo Evidence <span className="text-[#94A3B8] font-normal">(Optional but Recommended)</span>
                        </label>
                        {optimizedPhoto && (
                          <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[9px] font-bold text-emerald-300 uppercase border border-emerald-500/30">
                            Photo Ready
                          </span>
                        )}
                      </div>

                      {/* Hidden File Inputs */}
                      <input
                        ref={cameraInputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handlePhotoSelect}
                        className="hidden"
                      />
                      <input
                        ref={galleryInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoSelect}
                        className="hidden"
                      />

                      {/* Action Buttons: OPEN CAMERA vs CHOOSE FROM GALLERY */}
                      {!optimizedPhoto && (
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            id="btn-open-camera"
                            onClick={handleOpenCamera}
                            disabled={isProcessingPhoto}
                            className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-blue-500/30 bg-blue-950/40 p-3.5 text-center hover:bg-blue-900/40 transition cursor-pointer shadow-sm"
                          >
                            <Camera size={20} className="text-[#60A5FA]" />
                            <span className="text-xs font-bold text-white">Open Camera</span>
                            <span className="text-[10px] text-[#60A5FA]">Live camera / webcam</span>
                          </button>

                          <button
                            type="button"
                            id="btn-open-gallery"
                            onClick={() => galleryInputRef.current?.click()}
                            disabled={isProcessingPhoto}
                            className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-[#293A50] bg-[#162235] p-3.5 text-center hover:bg-[#24364D] transition cursor-pointer shadow-sm"
                          >
                            <ImageIcon size={20} className="text-slate-300" />
                            <span className="text-xs font-bold text-white">From Gallery</span>
                            <span className="text-[10px] text-[#94A3B8]">Choose file (JPG/PNG)</span>
                          </button>
                        </div>
                      )}

                      {/* Photo Processing Spinner */}
                      {isProcessingPhoto && (
                        <div className="rounded-2xl border border-[#293A50] bg-[#162235] p-4 flex items-center justify-center gap-2 text-xs text-[#60A5FA]">
                          <RefreshCw size={14} className="animate-spin" />
                          <span>Optimizing photo &amp; sanitizing metadata...</span>
                        </div>
                      )}

                      {/* Large Photo Preview Card */}
                      {optimizedPhoto && (
                        <div className="rounded-2xl border border-[#293A50] bg-[#162235] p-3 space-y-2.5 animate-in fade-in duration-200">
                          <div className="relative rounded-xl overflow-hidden border border-[#293A50] bg-black max-h-48 flex items-center justify-center">
                            <img
                              src={optimizedPhoto.dataUrl}
                              alt="Evidence Preview"
                              className="w-full h-44 object-cover cursor-pointer hover:opacity-95 transition"
                              onClick={() => setEnlargedPhotoUrl(optimizedPhoto.dataUrl)}
                            />
                            <button
                              type="button"
                              onClick={() => setEnlargedPhotoUrl(optimizedPhoto.dataUrl)}
                              className="absolute right-2 bottom-2 rounded-lg bg-black/70 p-1.5 text-white hover:bg-black/90 transition shadow-sm"
                              title="Enlarge photo"
                            >
                              <Maximize2 size={14} />
                            </button>
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-[#94A3B8]">
                            <span>
                              {optimizedPhoto.width} × {optimizedPhoto.height} px • {(optimizedPhoto.sizeBytes / 1024).toFixed(0)} KB
                            </span>
                            <span className="text-[#60A5FA] font-medium">Privacy EXIF Cleaned</span>
                          </div>

                          <div className="flex items-center gap-2 pt-1">
                            <button
                              type="button"
                              onClick={handleOpenCamera}
                              className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-[#293A50] bg-[#192638] py-2 text-xs font-semibold text-slate-200 hover:bg-[#24364D] transition cursor-pointer shadow-sm"
                            >
                              <RefreshCw size={12} />
                              <span>Replace Photo</span>
                            </button>
                            <button
                              type="button"
                              onClick={handleRemovePhoto}
                              className="flex items-center justify-center gap-1 rounded-xl border border-rose-500/30 bg-rose-950/40 px-3 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-900/40 transition cursor-pointer shadow-sm"
                            >
                              <Trash2 size={13} />
                              <span>Remove</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {photoError && (
                        <div className="rounded-xl border border-rose-500/30 bg-rose-950/40 p-2.5 text-xs text-rose-300 flex items-start gap-1.5">
                          <AlertCircle size={14} className="text-rose-400 shrink-0 mt-0.5" />
                          <span>{photoError}</span>
                        </div>
                      )}
                    </div>

                    {formError && (
                      <div className="rounded-xl border border-rose-500/30 bg-rose-950/40 p-3 text-xs text-rose-300 flex items-start gap-2">
                        <AlertCircle size={15} className="text-rose-400 shrink-0 mt-0.5" />
                        <span>{formError}</span>
                      </div>
                    )}

                    {photoUploadError && (
                      <div className="rounded-2xl border border-amber-500/30 bg-amber-950/30 p-3.5 space-y-2.5">
                        <div className="flex items-start gap-2 text-xs text-amber-300">
                          <AlertCircle size={16} className="text-amber-400 shrink-0 mt-0.5" />
                          <div>
                            <div className="font-bold text-amber-200">Photo Upload Notice</div>
                            <div className="text-[11px] text-amber-200/90 mt-0.5 leading-relaxed">{photoUploadError}</div>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => handleSubmit(undefined, false)}
                            disabled={isSubmitting}
                            className="flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 px-3 py-1.5 text-xs font-bold text-white transition cursor-pointer shadow-sm disabled:opacity-50"
                          >
                            <RefreshCw size={13} className={isSubmitting ? 'animate-spin' : ''} />
                            <span>Retry Photo Upload</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSubmit(undefined, true)}
                            disabled={isSubmitting}
                            className="flex items-center gap-1.5 rounded-xl border border-[#293A50] bg-[#162235] hover:bg-[#24364D] px-3 py-1.5 text-xs font-medium text-slate-300 transition cursor-pointer shadow-sm disabled:opacity-50"
                          >
                            <span>Submit Report Without Photo</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full flex items-center justify-center gap-2 rounded-2xl bg-[#2563EB] hover:bg-blue-600 active:bg-blue-700 disabled:opacity-50 py-3.5 text-xs font-extrabold text-white shadow-md shadow-blue-500/20 transition cursor-pointer"
                    >
                      {isSubmitting ? (
                        <>
                          <RefreshCw size={15} className="animate-spin" />
                          <span>{uploadStatusText || 'Submitting Issue Report...'}</span>
                        </>
                      ) : (
                        <>
                          <Send size={15} />
                          <span>Submit Campus Issue Passport</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ------------------------------------------------------------- */
          /* MY REPORTS TAB                                                */
          /* ------------------------------------------------------------- */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Reports List (Left 5 cols) */}
            <div className="lg:col-span-5 space-y-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Your Reports ({filteredReports.length})
                </span>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="rounded-xl border border-[#293A50] bg-[#162235] px-2.5 py-1 text-xs text-[#F1F5F9] focus:outline-none shadow-sm cursor-pointer"
                >
                  <option value="All">All Categories</option>
                  {ISSUE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {filteredReports.length === 0 ? (
                <div className="rounded-2xl border border-[#293A50] bg-[#192638] p-8 text-center text-xs text-[#94A3B8] shadow-sm">
                  No reports submitted yet in this category.
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredReports.map((report) => {
                    const isSelected = selectedReport?.id === report.id
                    return (
                      <button
                        key={report.id}
                        type="button"
                        onClick={() => setSelectedReport(report)}
                        className={`w-full text-left rounded-2xl p-3.5 border transition cursor-pointer ${
                          isSelected
                            ? 'border-[#60A5FA] bg-[#24364D] ring-1 ring-[#60A5FA]/40 shadow-lg'
                            : 'border-[#293A50] bg-[#192638] hover:bg-[#24364D] shadow-sm'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="font-mono text-xs font-bold text-[#60A5FA]">{report.id}</span>
                          <span className="rounded-full bg-[#162235] border border-[#293A50] px-2 py-0.5 text-[9px] font-bold text-[#60A5FA] uppercase">
                            {report.status}
                          </span>
                        </div>
                        <h3 className="font-semibold text-white text-xs truncate">{report.locationName}</h3>
                        <p className="text-[11px] text-[#94A3B8] line-clamp-1 mt-0.5">{report.description}</p>
                        <div className="mt-2 flex items-center justify-between text-[10px] text-[#64748B]">
                          <span>{report.category}</span>
                          <span>{new Date(report.createdAt).toLocaleDateString()}</span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Selected Report Detail View (Right 7 cols) */}
            <div className="lg:col-span-7">
              {selectedReport ? (
                <div className="rounded-3xl border border-[#293A50] bg-[#192638] p-6 shadow-xl space-y-5">
                  <div className="flex items-start justify-between gap-3 border-b border-[#293A50] pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold text-[#60A5FA]">{selectedReport.id}</span>
                        <span className="text-[#64748B] text-xs">•</span>
                        <span className="text-xs text-[#94A3B8]">{selectedReport.category}</span>
                      </div>
                      <h2 className="text-lg font-bold text-white mt-1">{selectedReport.locationName}</h2>
                    </div>

                    <span className="rounded-full bg-blue-500/20 border border-blue-500/30 px-3 py-1 text-xs font-bold text-[#60A5FA] uppercase">
                      {selectedReport.status}
                    </span>
                  </div>

                  {/* Operational Status Progression Steps */}
                  <div className="rounded-2xl border border-[#293A50] bg-[#162235] p-4 space-y-2">
                    <span className="text-[10px] uppercase font-bold text-[#94A3B8] block mb-2">
                      Operational Resolution Lifecycle
                    </span>
                    <div className="flex items-center justify-between gap-1 overflow-x-auto pb-1">
                      {STATUS_STEPS.map((step, idx) => {
                        const currentIdx = STATUS_STEPS.indexOf(selectedReport.status)
                        const isDone = currentIdx >= idx
                        const isCurrent = currentIdx === idx

                        return (
                          <div key={step} className="flex-1 flex flex-col items-center min-w-[70px] text-center">
                            <div
                              className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold mb-1 transition ${
                                isDone
                                  ? 'bg-[#2563EB] text-white shadow-sm'
                                  : 'bg-[#24364D] text-[#94A3B8]'
                              } ${isCurrent ? 'ring-2 ring-[#60A5FA] animate-pulse' : ''}`}
                            >
                              {idx + 1}
                            </div>
                            <span className={`text-[9px] font-semibold leading-tight ${isDone ? 'text-white' : 'text-[#64748B]'}`}>
                              {step.replace('_', ' ')}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Description */}
                  <div className="rounded-2xl border border-[#293A50] bg-[#162235] p-4 space-y-1.5 text-xs">
                    <span className="text-[#94A3B8] block text-[10px] uppercase font-bold">Reported Problem</span>
                    <p className="text-slate-200 leading-relaxed">{selectedReport.description}</p>
                    <div className="pt-2 flex flex-wrap gap-4 text-[11px] text-[#94A3B8] border-t border-[#293A50]">
                      <div>3D Coordinates: <strong className="font-mono text-[#60A5FA]">[{selectedReport.modelCoordinates.join(', ')}]</strong></div>
                      <div>Submitted: <strong className="text-slate-300">{new Date(selectedReport.createdAt).toLocaleString()}</strong></div>
                    </div>
                  </div>

                  {/* Photo Evidence in My Reports */}
                  {selectedReport.photoUrl ? (
                    <div className="rounded-2xl border border-[#293A50] bg-[#162235] p-4 space-y-2">
                      <span className="text-[10px] uppercase font-bold text-[#94A3B8] block">
                        Attached Photographic Evidence
                      </span>
                      <EvidenceImageViewer
                        photoUrl={selectedReport.photoUrl}
                        alt={`Evidence for ${selectedReport.id}`}
                        role={role}
                      />
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-[#293A50]/60 bg-[#162235]/40 p-3 text-xs text-[#94A3B8] flex items-center gap-2">
                      <ImageIcon size={15} className="text-[#64748B] shrink-0" />
                      <span>No photographic evidence attached to this report.</span>
                    </div>
                  )}

                  {/* Assigned Team & Remarks if present */}
                  {selectedReport.assignedTeam && (
                    <div className="rounded-2xl border border-blue-500/30 bg-blue-950/40 p-4 text-xs space-y-1">
                      <span className="text-[#60A5FA] block text-[10px] uppercase font-bold">Assigned Maintenance Team</span>
                      <p className="font-bold text-white text-sm">{selectedReport.assignedTeam}</p>
                      {selectedReport.resolutionNotes && (
                        <p className="text-slate-300 mt-1">{selectedReport.resolutionNotes}</p>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-3xl border border-[#293A50] bg-[#192638] p-8 text-center text-xs text-[#94A3B8] shadow-sm">
                  Select a report from the list to view tracking details and evidence.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* MODAL ENLARGED PHOTO EVIDENCE VIEWER                             */}
      {/* ----------------------------------------------------------------- */}
      {enlargedPhotoUrl && (
        <div className="fixed inset-0 z-[9999] isolate flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative max-w-4xl w-full flex flex-col items-center">
            <button
              type="button"
              onClick={() => setEnlargedPhotoUrl(null)}
              className="absolute -top-12 right-0 rounded-full bg-white/10 hover:bg-white/20 p-2 text-white transition cursor-pointer"
              aria-label="Close photo preview"
            >
              <X size={22} />
            </button>
            <div className="rounded-3xl overflow-hidden border border-[#293A50] bg-black shadow-2xl max-h-[80vh] flex items-center justify-center">
              <img
                src={enlargedPhotoUrl}
                alt="Enlarged Campus Maintenance Evidence"
                className="max-h-[80vh] w-auto max-w-full object-contain"
              />
            </div>
            <p className="mt-3 text-xs text-[#94A3B8] text-center">
              Campus Issue Photographic Evidence • Tap anywhere outside or Close to exit
            </p>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* IN-APP LIVE WEBCAM CAPTURE MODAL (Desktop & Supported Devices)    */}
      {/* ----------------------------------------------------------------- */}
      {isWebcamOpen && (
        <div className="fixed inset-0 z-[9999] isolate flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative max-w-lg w-full rounded-3xl border border-[#293A50] bg-[#162235] p-5 shadow-2xl flex flex-col gap-4 text-[#F1F5F9]">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#293A50] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 border border-blue-500/20 text-[#60A5FA]">
                  <Camera size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Live Camera Preview</h3>
                  <p className="text-[11px] text-[#94A3B8]">Capture photographic evidence for maintenance dispatch</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseWebcam}
                className="rounded-full bg-white/10 hover:bg-white/20 p-1.5 text-slate-300 hover:text-white transition cursor-pointer"
                aria-label="Close camera"
              >
                <X size={16} />
              </button>
            </div>

            {/* Error State if Camera Denied / Not Found */}
            {webcamError ? (
              <div className="rounded-2xl border border-amber-500/30 bg-amber-950/40 p-5 text-center space-y-3">
                <VideoOff size={32} className="mx-auto text-amber-400" />
                <div className="text-xs font-semibold text-white">Camera Access Notice</div>
                <p className="text-xs text-amber-200/90 leading-relaxed max-w-md mx-auto">
                  {webcamError}
                </p>
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      handleCloseWebcam()
                      galleryInputRef.current?.click()
                    }}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#2563EB] hover:bg-blue-600 px-4 py-2 text-xs font-bold text-white transition cursor-pointer"
                  >
                    <ImageIcon size={14} />
                    <span>Choose from Gallery</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleCloseWebcam}
                    className="inline-flex items-center gap-2 rounded-xl border border-[#293A50] bg-[#192638] hover:bg-[#24364D] px-4 py-2 text-xs font-semibold text-slate-300 transition cursor-pointer"
                  >
                    <span>Cancel</span>
                  </button>
                </div>
              </div>
            ) : capturedSnapshot ? (
              /* Still Snapshot Preview State */
              <div className="space-y-4">
                <div className="relative rounded-2xl overflow-hidden border border-[#293A50] bg-black aspect-video flex items-center justify-center">
                  <img
                    src={capturedSnapshot}
                    alt="Captured snapshot"
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute top-3 left-3 rounded-md bg-black/70 px-2 py-0.5 text-[10px] font-bold text-[#60A5FA] border border-blue-500/30">
                    Photo Captured
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3 pt-1">
                  <button
                    type="button"
                    onClick={handleRetakeSnapshot}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-[#293A50] bg-[#192638] hover:bg-[#24364D] px-4 py-2.5 text-xs font-semibold text-white transition cursor-pointer"
                  >
                    <RefreshCw size={14} />
                    <span>Retake Photo</span>
                  </button>
                  <button
                    type="button"
                    id="btn-use-webcam-photo"
                    onClick={handleUseSnapshot}
                    disabled={isProcessingPhoto}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-[#2563EB] hover:bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-blue-600/30 transition cursor-pointer disabled:opacity-50"
                  >
                    <Check size={14} />
                    <span>{isProcessingPhoto ? 'Optimizing...' : 'Use This Photo'}</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Live Stream Viewfinder State */
              <div className="space-y-4">
                <div className="relative rounded-2xl overflow-hidden border border-[#293A50] bg-black aspect-video flex items-center justify-center">
                  <video
                    ref={videoRef}
                    playsInline
                    autoPlay
                    muted
                    className="w-full h-full object-cover"
                  />
                  {/* Viewfinder crosshairs */}
                  <div className="pointer-events-none absolute inset-4 border border-white/20 rounded-xl" />
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div className="h-6 w-6 border border-[#60A5FA]/60 rounded-full" />
                  </div>
                  <span className="absolute top-3 left-3 rounded-md bg-black/70 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Live Viewfinder
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3 pt-1">
                  <button
                    type="button"
                    onClick={handleCloseWebcam}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#293A50] bg-[#192638] hover:bg-[#24364D] px-4 py-2.5 text-xs font-semibold text-slate-300 transition cursor-pointer"
                  >
                    <span>Cancel</span>
                  </button>
                  <button
                    type="button"
                    id="btn-capture-webcam-photo"
                    onClick={handleCaptureSnapshot}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-[#2563EB] hover:bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-blue-600/30 transition cursor-pointer"
                  >
                    <Camera size={15} />
                    <span>Capture Photo</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
