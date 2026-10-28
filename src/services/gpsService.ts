import type {
  GeolocationProvider,
  GpsCoordinates,
  GpsServiceStatus,
} from '../types/gps'

export interface GpsServiceListener {
  onPosition: (coords: GpsCoordinates) => void
  onError: (status: GpsServiceStatus, message: string) => void
}

/**
 * Default browser Geolocation provider wrapping `navigator.geolocation`.
 */
export function createBrowserGeolocationProvider(): GeolocationProvider | null {
  if (typeof window === 'undefined' || !navigator.geolocation) {
    return null
  }

  return {
    getCurrentPosition(success, error, options) {
      navigator.geolocation.getCurrentPosition(success, error, options)
    },
    watchPosition(success, error, options) {
      return navigator.geolocation.watchPosition(success, error, options)
    },
    clearWatch(watchId: number) {
      navigator.geolocation.clearWatch(watchId)
    },
  }
}

/**
 * Mock Geolocation provider for unit tests and Test Mode simulation.
 */
export class MockGeolocationProvider implements GeolocationProvider {
  private activeWatchId = 0
  private watchers = new Map<number, (position: GeolocationPosition) => void>()
  private errorWatchers = new Map<number, (error: GeolocationPositionError) => void>()

  getCurrentPosition(
    success: (position: GeolocationPosition) => void,
    _error: (error: GeolocationPositionError) => void,
    _options?: PositionOptions
  ): void {
    // Default mock response at campus gate
    success(this.createMockPosition(12.8715, 80.2195, 8))
  }

  watchPosition(
    success: (position: GeolocationPosition) => void,
    error: (error: GeolocationPositionError) => void,
    _options?: PositionOptions
  ): number {
    this.activeWatchId += 1
    const id = this.activeWatchId
    this.watchers.set(id, success)
    this.errorWatchers.set(id, error)
    return id
  }

  clearWatch(watchId: number): void {
    this.watchers.delete(watchId)
    this.errorWatchers.delete(watchId)
  }

  /**
   * Test helper: inject position update to all active watchers.
   */
  emitPosition(lat: number, lon: number, accuracy?: number): void {
    const safeAccuracy = accuracy !== undefined ? accuracy : 8
    const pos = this.createMockPosition(lat, lon, safeAccuracy)
    this.watchers.forEach((cb) => cb(pos))
  }

  /**
   * Test helper: inject error to all active watchers.
   */
  emitError(code: number, message: string): void {
    const err: GeolocationPositionError = {
      code,
      message,
      PERMISSION_DENIED: 1,
      POSITION_UNAVAILABLE: 2,
      TIMEOUT: 3,
    }
    this.errorWatchers.forEach((cb) => cb(err))
  }

  get watcherCount(): number {
    return this.watchers.size
  }

  private createMockPosition(latitude: number, longitude: number, accuracy: number): GeolocationPosition {
    const coords: GeolocationCoordinates = {
      latitude,
      longitude,
      accuracy,
      altitude: 12,
      altitudeAccuracy: 3,
      heading: null,
      speed: null,
      toJSON: () => ({
        latitude,
        longitude,
        accuracy,
        altitude: 12,
        altitudeAccuracy: 3,
        heading: null,
        speed: null,
      }),
    }
    return {
      coords,
      timestamp: Date.now(),
      toJSON: () => ({}),
    }
  }
}

/**
 * Reusable GPS location service.
 * Manages Geolocation API watcher lifecycle, error mapping, and privacy safeguards.
 */
export class GpsLocationService {
  private provider: GeolocationProvider | null
  private activeWatchId: number | null = null
  private listeners: Set<GpsServiceListener> = new Set()
  private currentStatus: GpsServiceStatus = 'idle'
  private lastCoordinates: GpsCoordinates | null = null

  constructor(customProvider?: GeolocationProvider | null) {
    this.provider = customProvider !== undefined ? customProvider : createBrowserGeolocationProvider()
    if (!this.provider) {
      this.currentStatus = 'unsupported'
    }
  }

  /**
   * Swaps the active geolocation provider (used when switching to GPS Test Mode).
   */
  setProvider(newProvider: GeolocationProvider | null): void {
    const wasTracking = this.isTracking()
    this.stopTracking()
    this.provider = newProvider
    if (!this.provider) {
      this.currentStatus = 'unsupported'
    } else {
      this.currentStatus = 'idle'
      if (wasTracking) {
        this.startTracking()
      }
    }
  }

  /**
   * Adds a position and error listener.
   */
  addListener(listener: GpsServiceListener): () => void {
    this.listeners.add(listener)
    // If we already have a recent coordinate and are active, emit immediately
    if (this.lastCoordinates && this.currentStatus === 'active') {
      listener.onPosition(this.lastCoordinates)
    }
    return () => {
      this.listeners.delete(listener)
      if (this.listeners.size === 0) {
        this.stopTracking()
      }
    }
  }

  /**
   * Starts real-time location tracking using the configured provider.
   * Prevents duplicate active watchers.
   */
  startTracking(options?: PositionOptions): void {
    if (!this.provider) {
      this.notifyError('unsupported', 'Geolocation is not supported by this browser.')
      return
    }

    // Prevent duplicate active watchers
    if (this.activeWatchId !== null) {
      return
    }

    this.currentStatus = 'requesting'
    const positionOptions: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
      ...options,
    }

    try {
      this.activeWatchId = this.provider.watchPosition(
        (position: GeolocationPosition) => {
          this.handlePositionSuccess(position)
        },
        (error: GeolocationPositionError) => {
          this.handlePositionError(error)
        },
        positionOptions
      )
    } catch (e) {
      this.notifyError('position_unavailable', e instanceof Error ? e.message : 'Unable to initialize GPS watcher.')
    }
  }

  /**
   * Stops active tracking and cleans up the watcher immediately.
   */
  stopTracking(): void {
    if (this.activeWatchId !== null && this.provider) {
      this.provider.clearWatch(this.activeWatchId)
      this.activeWatchId = null
    }
    this.currentStatus = 'idle'
  }

  isTracking(): boolean {
    return this.activeWatchId !== null
  }

  getStatus(): GpsServiceStatus {
    return this.currentStatus
  }

  getLastCoordinates(): GpsCoordinates | null {
    return this.lastCoordinates
  }

  private handlePositionSuccess(position: GeolocationPosition): void {
    // Reject invalid coordinates: latitude and longitude must be finite numbers
    if (
      !position ||
      !position.coords ||
      !Number.isFinite(position.coords.latitude) ||
      !Number.isFinite(position.coords.longitude)
    ) {
      return
    }

    // Reject stale updates (older than 30 seconds)
    const now = Date.now()
    if (position.timestamp && now - position.timestamp > 30000) {
      return
    }

    this.currentStatus = 'active'
    const hasAccuracy =
      typeof position.coords.accuracy === 'number' &&
      Number.isFinite(position.coords.accuracy) &&
      position.coords.accuracy >= 0

    const coords: GpsCoordinates = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: hasAccuracy ? position.coords.accuracy : (NaN as unknown as number),
      altitude: position.coords.altitude ?? null,
      altitudeAccuracy: position.coords.altitudeAccuracy ?? null,
      heading: position.coords.heading ?? null,
      speed: position.coords.speed ?? null,
      timestamp: position.timestamp || now,
    }

    this.lastCoordinates = coords
    this.listeners.forEach((listener) => listener.onPosition(coords))
  }

  private handlePositionError(error: GeolocationPositionError): void {
    let mappedStatus: GpsServiceStatus = 'position_unavailable'
    let friendlyMessage = 'Location unavailable. Please check your device location settings.'

    switch (error.code) {
      case error.PERMISSION_DENIED:
        mappedStatus = 'permission_denied'
        friendlyMessage = 'Location permission was denied. Please allow location access in your browser.'
        this.stopTracking()
        break
      case error.POSITION_UNAVAILABLE:
        mappedStatus = 'position_unavailable'
        friendlyMessage = 'GPS signal unavailable. Ensure location services are enabled on your device.'
        break
      case error.TIMEOUT:
        mappedStatus = 'timeout'
        friendlyMessage = 'Location request timed out. Retrying GPS fix...'
        break
    }

    this.notifyError(mappedStatus, friendlyMessage)
  }

  private notifyError(status: GpsServiceStatus, message: string): void {
    this.currentStatus = status
    this.listeners.forEach((listener) => listener.onError(status, message))
  }
}

// Global singleton instance for app-wide sharing
export const defaultGpsService = new GpsLocationService()
