import { isSupabaseConfigured, supabase } from '../lib/supabaseClient.ts'
import type { UserRole } from '../types/auth'

export const EVIDENCE_BUCKET_NAME = 'campus-issue-photos'
export const MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024 // 5 MB
export const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp']
export const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp']

export interface PhotoValidationResult {
  valid: boolean
  error?: string
}

export interface OptimizedPhotoResult {
  file: Blob
  dataUrl: string
  width: number
  height: number
  sizeBytes: number
  fileName: string
}

export interface PhotoUploadResult {
  success: boolean
  photoUrl?: string
  storagePath?: string
  signedUrl?: string
  isLocalFallback?: boolean
  error?: string
  isBucketMissing?: boolean
}

/**
 * Validates selected or captured image file before upload.
 */
export function validateImageFile(file: File): PhotoValidationResult {
  if (!file) {
    return { valid: false, error: 'No file provided.' }
  }

  // Check MIME type
  if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `Unsupported image format (${file.type || 'unknown'}). Please provide a JPG, PNG, or WebP photo.`,
    }
  }

  // Check file extension to prevent spoofing
  const lowerName = file.name.toLowerCase()
  const hasValidExt = ALLOWED_EXTENSIONS.some((ext) => lowerName.endsWith(ext))
  if (!hasValidExt) {
    return {
      valid: false,
      error: 'Invalid file extension. Please select a valid .jpg, .png, or .webp image.',
    }
  }

  // Check file size
  if (file.size > MAX_PHOTO_SIZE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1)
    return {
      valid: false,
      error: `Photo is too large (${sizeMb} MB). Maximum allowed size is 5 MB.`,
    }
  }

  // Check for executable or dangerous filenames
  if (/[<>:"/\\|?*\x00-\x1F]/.test(file.name) || lowerName.includes('.exe') || lowerName.includes('.sh')) {
    return {
      valid: false,
      error: 'File name contains prohibited characters.',
    }
  }

  return { valid: true }
}

/**
 * Optimizes an image for web and mobile upload:
 * - Downscales large smartphone photos (e.g. 12MP/48MP) to max 1600px dimension
 * - Re-encodes as JPEG/WebP to strip unnecessary EXIF GPS metadata for privacy
 * - Generates both an optimized Blob and a preview dataUrl
 */
export async function optimizeImageForUpload(
  file: File,
  maxDimension = 1600,
  quality = 0.85
): Promise<OptimizedPhotoResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Failed to read image file.'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('Failed to decode image data.'))
      img.onload = () => {
        let width = img.width
        let height = img.height

        // Downscale while preserving aspect ratio
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width)
            width = maxDimension
          } else {
            width = Math.round((width * maxDimension) / height)
            height = maxDimension
          }
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Canvas rendering context unavailable.'))
          return
        }

        // Draw image onto canvas (strips native EXIF metadata)
        ctx.drawImage(img, 0, 0, width, height)

        const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg'
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to compress image.'))
              return
            }

            const dataUrl = canvas.toDataURL(mimeType, quality)
            const baseName = file.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_')
            const ext = mimeType === 'image/png' ? '.png' : '.jpg'
            const fileName = `${baseName}_optimized${ext}`

            resolve({
              file: blob,
              dataUrl,
              width,
              height,
              sizeBytes: blob.size,
              fileName,
            })
          },
          mimeType,
          quality
        )
      }
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
  })
}

/**
 * Generates an authorized storage path conforming to Supabase Storage RLS:
 * {userId}/{issueTrackingId}/{timestamp}_{random}.{ext}
 */
export function buildStoragePath(userId: string, issueTrackingId: string, ext = 'jpg'): string {
  const timestamp = Date.now()
  const safeTrackingId = issueTrackingId.replace(/[^a-zA-Z0-9_-]/g, '_')
  const randomSuffix = Math.random().toString(36).substring(2, 10)
  return `${userId}/${safeTrackingId}/${timestamp}_${randomSuffix}.${ext}`
}

/**
 * Evidence Storage Service for MNMJEC Campus Issue Passport.
 */
class EvidenceStorageService {
  private signedUrlCache = new Map<string, { url: string; expiresAt: number }>()

  /**
   * Uploads an evidence photo for a student issue report.
   * Format: <authenticated-user-id>/<issue-id>/<random-image-id>.<ext>
   * Conforms with Supabase RLS: (storage.foldername(name))[1] = auth.uid()::TEXT
   */
  public async uploadIssuePhoto(
    blob: Blob,
    userId: string,
    issueTrackingId: string,
    role: UserRole
  ): Promise<PhotoUploadResult> {
    if (role === 'visitor') {
      return {
        success: false,
        error: 'Visitors are not authorized to upload campus maintenance evidence.',
      }
    }

    if (!userId || !issueTrackingId) {
      return {
        success: false,
        error: 'Invalid reporter ID or tracking ID for evidence upload.',
      }
    }

    // Determine extension and mime type
    const mimeType = blob.type && ALLOWED_IMAGE_MIME_TYPES.includes(blob.type) ? blob.type : 'image/jpeg'
    const ext = mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg'
    const filePath = buildStoragePath(userId, issueTrackingId, ext)

    // If Supabase is configured and client exists, attempt upload to private storage bucket
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.storage
          .from(EVIDENCE_BUCKET_NAME)
          .upload(filePath, blob, {
            contentType: mimeType,
            cacheControl: '3600',
            upsert: false,
          })

        if (!error && data) {
          // Obtain short-lived signed URL for immediate UI preview (valid for 1 hour)
          const { data: signedData } = await supabase.storage
            .from(EVIDENCE_BUCKET_NAME)
            .createSignedUrl(filePath, 3600)

          if (signedData?.signedUrl) {
            this.signedUrlCache.set(filePath, {
              url: signedData.signedUrl,
              expiresAt: Date.now() + 50 * 60 * 1000,
            })
          }

          return {
            success: true,
            photoUrl: filePath, // Stores the persistent private storage path in PostgreSQL
            storagePath: filePath,
            signedUrl: signedData?.signedUrl,
            isLocalFallback: false,
          }
        }

        const isBucketNotFound =
          error?.message?.toLowerCase().includes('bucket') ||
          error?.message?.toLowerCase().includes('not found') ||
          (error as any)?.statusCode === '404' ||
          (error as any)?.code === 'NoSuchBucket'

        console.warn('Supabase Storage upload error:', error?.message)
        return {
          success: false,
          error: isBucketNotFound
            ? 'Campus evidence storage bucket (campus-issue-photos) is awaiting administrator creation on Supabase.'
            : error?.message || 'Failed to upload photo evidence to private storage.',
          isBucketMissing: isBucketNotFound,
        }
      } catch (err: any) {
        console.warn('Supabase Storage connection failed:', err)
        return {
          success: false,
          error: err?.message || 'Storage connection error occurred.',
        }
      }
    }

    // Mock environment when Supabase is completely unconfigured
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        resolve({
          success: true,
          photoUrl: reader.result as string,
          storagePath: `mock://${filePath}`,
          signedUrl: reader.result as string,
          isLocalFallback: true,
        })
      }
      reader.onerror = () => {
        resolve({
          success: false,
          error: 'Failed to process evidence photo for local test.',
        })
      }
      reader.readAsDataURL(blob)
    })
  }

  /**
   * Resolves a photo URL for display in Student or Admin screen.
   * If the stored photoUrl is a storage path (e.g. userId/issueId/file.jpg), requests a fresh short-lived signed URL with caching.
   * If it's already a full URL or data URL, returns it directly.
   */
  public async getResolvedPhotoUrl(photoUrl: string | undefined, role: UserRole): Promise<string | null> {
    if (!photoUrl || role === 'visitor') return null

    if (photoUrl.startsWith('data:') || photoUrl.startsWith('http://') || photoUrl.startsWith('https://')) {
      return photoUrl
    }

    if (photoUrl.startsWith('local://')) {
      return null
    }

    if (photoUrl.startsWith('mock://')) {
      return null
    }

    // Check signed URL in-memory cache
    const cached = this.signedUrlCache.get(photoUrl)
    if (cached && cached.expiresAt > Date.now()) {
      return cached.url
    }

    // Request a fresh signed URL from private storage bucket
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.storage
          .from(EVIDENCE_BUCKET_NAME)
          .createSignedUrl(photoUrl, 3600) // 1-hour expiration

        if (!error && data?.signedUrl) {
          this.signedUrlCache.set(photoUrl, {
            url: data.signedUrl,
            expiresAt: Date.now() + 50 * 60 * 1000, // 50 min cache TTL
          })
          return data.signedUrl
        }
      } catch {
        // Return null on failure
      }
    }

    return null
  }

  /**
   * Deletes an orphaned or removed evidence photo from the private storage bucket.
   */
  public async deleteIssuePhoto(storagePath: string, role: UserRole = 'student'): Promise<boolean> {
    if (!storagePath || role === 'visitor') return false

    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase.storage
          .from(EVIDENCE_BUCKET_NAME)
          .remove([storagePath])

        this.signedUrlCache.delete(storagePath)
        return !error
      } catch {
        return false
      }
    }

    return true
  }

  /**
   * Clears the signed URL cache (called on logout or session reset).
   */
  public clearCache() {
    this.signedUrlCache.clear()
  }
}

export const evidenceStorageService = new EvidenceStorageService()
