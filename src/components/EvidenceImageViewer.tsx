import { AlertTriangle, ImageIcon, Loader2, Maximize2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { evidenceStorageService } from '../services/evidenceStorageService'
import type { UserRole } from '../types/auth'

export interface EvidenceImageViewerProps {
  photoUrl?: string | null
  role: UserRole
  alt?: string
  className?: string
  imageClassName?: string
  allowEnlarge?: boolean
  onEnlarge?: (resolvedUrl: string) => void
  showCaption?: boolean
  caption?: string
}

export function EvidenceImageViewer({
  photoUrl,
  role,
  alt = 'Photographic evidence',
  className = '',
  imageClassName = 'h-48 w-full object-cover',
  allowEnlarge = true,
  onEnlarge,
  showCaption = false,
  caption,
}: EvidenceImageViewerProps) {
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(Boolean(photoUrl && role !== 'visitor'))
  const [hasError, setHasError] = useState<boolean>(false)

  useEffect(() => {
    let isCancelled = false

    if (!photoUrl || role === 'visitor') {
      setResolvedUrl(null)
      setIsLoading(false)
      setHasError(false)
      return
    }

    // Direct preview URLs (data: or http:)
    if (photoUrl.startsWith('data:') || photoUrl.startsWith('http://') || photoUrl.startsWith('https://')) {
      setResolvedUrl(photoUrl)
      setIsLoading(false)
      setHasError(false)
      return
    }

    setIsLoading(true)
    setHasError(false)

    evidenceStorageService
      .getResolvedPhotoUrl(photoUrl, role)
      .then((url) => {
        if (isCancelled) return
        if (url) {
          setResolvedUrl(url)
          setHasError(false)
        } else {
          setResolvedUrl(null)
          setHasError(true)
        }
      })
      .catch(() => {
        if (isCancelled) return
        setResolvedUrl(null)
        setHasError(true)
      })
      .finally(() => {
        if (!isCancelled) setIsLoading(false)
      })

    return () => {
      isCancelled = true
    }
  }, [photoUrl, role])

  if (!photoUrl) {
    return null
  }

  if (role === 'visitor') {
    return (
      <div className={`rounded-2xl border border-[#293A50] bg-[#162235]/60 p-4 text-center ${className}`}>
        <div className="flex items-center justify-center gap-2 text-xs text-amber-400 font-semibold">
          <AlertTriangle size={15} />
          <span>Private Evidence Protected</span>
        </div>
        <p className="text-[11px] text-[#94A3B8] mt-1">
          Photographic maintenance evidence is confidential and restricted to authenticated students and administrators.
        </p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className={`flex flex-col items-center justify-center rounded-2xl border border-[#293A50] bg-[#162235]/60 p-6 min-h-[140px] text-center ${className}`}>
        <Loader2 className="h-6 w-6 animate-spin text-[#38BDF8] mb-2" />
        <span className="text-xs font-semibold text-[#F1F5F9]">Authenticating Evidence Access...</span>
        <span className="text-[10px] text-[#94A3B8] mt-0.5">Retrieving secure cloud image token</span>
      </div>
    )
  }

  if (hasError || !resolvedUrl) {
    return (
      <div className={`rounded-2xl border border-dashed border-[#293A50] bg-[#162235]/40 p-4 text-center ${className}`}>
        <div className="flex items-center justify-center gap-2 text-xs text-[#94A3B8] font-semibold">
          <ImageIcon size={16} className="text-slate-500" />
          <span>Evidence Photo Unavailable</span>
        </div>
        <p className="text-[10px] text-[#94A3B8]/80 mt-1 max-w-sm mx-auto">
          The photographic evidence file could not be retrieved from private cloud storage. Access may have expired or requires administrative permissions.
        </p>
      </div>
    )
  }

  return (
    <div className={`group relative overflow-hidden rounded-2xl border border-[#293A50] bg-[#0F172A] shadow-md transition-all ${className}`}>
      <img
        src={resolvedUrl}
        alt={alt}
        className={`${imageClassName} transition-transform duration-300 group-hover:scale-102 cursor-pointer`}
        onClick={() => {
          if (allowEnlarge && onEnlarge && resolvedUrl) {
            onEnlarge(resolvedUrl)
          }
        }}
        onError={() => setHasError(true)}
      />

      {allowEnlarge && onEnlarge && (
        <button
          type="button"
          onClick={() => onEnlarge(resolvedUrl)}
          className="absolute right-3 top-3 flex items-center gap-1 rounded-xl bg-black/70 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/90 shadow-lg cursor-pointer"
          aria-label="Enlarge evidence photo"
        >
          <Maximize2 size={12} />
          <span>Enlarge</span>
        </button>
      )}

      {showCaption && (
        <div className="border-t border-[#293A50] bg-[#162235]/95 px-3 py-2 text-[11px] text-[#94A3B8]">
          {caption || 'Photographic evidence securely verified via private Supabase Storage.'}
        </div>
      )}
    </div>
  )
}
