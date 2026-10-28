import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  DEFAULT_CAMPUS_CONTROL_POINTS,
  PROVISIONAL_CAMPUS_CONTROL_POINTS,
  TEST_MODE_CONTROL_POINTS,
} from '../data/campusCalibrationData'
import { buildCalibrationModel } from '../lib/campusCalibration'
import { classifyGpsPosition } from '../lib/gpsAccuracy'
import {
  defaultGpsService,
  MockGeolocationProvider,
  createBrowserGeolocationProvider,
} from '../services/gpsService'
import { evaluateCampusGeofence } from '../lib/campusGeofence'
import type {
  CalibrationModel,
  GpsCoordinates,
  GpsServiceStatus,
  GroundControlPoint,
  PositionClassification,
} from '../types/gps'
import type { GeofenceEvaluation } from '../types/geofence'

const LIVE_FALLBACK_CONTROL_POINTS =
  DEFAULT_CAMPUS_CONTROL_POINTS.length > 0
    ? DEFAULT_CAMPUS_CONTROL_POINTS
    : PROVISIONAL_CAMPUS_CONTROL_POINTS

export interface UseGpsLocationResult {
  isTracking: boolean
  serviceStatus: GpsServiceStatus
  coords: GpsCoordinates | null
  classification: PositionClassification
  calibrationModel: CalibrationModel
  geofence: GeofenceEvaluation | null
  isTestMode: boolean
  startLocation: () => void
  stopLocation: () => void
  toggleTestMode: (enabled?: boolean) => void
  injectTestPosition: (lat: number, lon: number, accuracy?: number) => void
  updateControlPoints: (points: GroundControlPoint[]) => void
  resetToDefaultCalibration: () => void
}

export function useGpsLocation(): UseGpsLocationResult {
  const [isTestMode, setIsTestMode] = useState<boolean>(false)
  const [serviceStatus, setServiceStatus] = useState<GpsServiceStatus>('idle')
  const [coords, setCoords] = useState<GpsCoordinates | null>(null)
  const [controlPoints, setControlPoints] = useState<GroundControlPoint[]>(LIVE_FALLBACK_CONTROL_POINTS)

  const mockProviderRef = useRef<MockGeolocationProvider | null>(null)

  // Compute calibration model whenever control points change
  const calibrationModel = useMemo<CalibrationModel>(() => {
    return buildCalibrationModel(controlPoints)
  }, [controlPoints])

  // Classify current position
  const classification = useMemo<PositionClassification>(() => {
    return classifyGpsPosition(coords, serviceStatus, calibrationModel, isTestMode)
  }, [coords, serviceStatus, calibrationModel, isTestMode])

  // Evaluate campus geofence polygon boundary
  const geofence = useMemo<GeofenceEvaluation | null>(() => {
    if (!coords) return null
    return evaluateCampusGeofence(coords.latitude, coords.longitude, coords.accuracy, {
      isSimulated: isTestMode,
    })
  }, [coords, isTestMode])

  // Subscribe to GPS service
  useEffect(() => {
    const unsubscribe = defaultGpsService.addListener({
      onPosition: (newCoords) => {
        setCoords(newCoords)
        setServiceStatus('active')
      },
      onError: (status) => {
        setServiceStatus(status)
      },
    })

    return () => {
      unsubscribe()
    }
  }, [])

  // Start tracking
  const startLocation = useCallback(() => {
    setServiceStatus('requesting')
    defaultGpsService.startTracking()
  }, [])

  // Stop tracking
  const stopLocation = useCallback(() => {
    defaultGpsService.stopTracking()
    setServiceStatus('idle')
    setCoords(null)
  }, [])

  // Toggle Test Mode (Development simulation)
  const toggleTestMode = useCallback(
    (enabled?: boolean) => {
      const targetMode = enabled !== undefined ? enabled : !isTestMode
      setIsTestMode(targetMode)

      if (targetMode) {
        if (!mockProviderRef.current) {
          mockProviderRef.current = new MockGeolocationProvider()
        }
        defaultGpsService.setProvider(mockProviderRef.current)
        // Automatically load test mode benchmarks so coordinate conversion can be evaluated
        setControlPoints(TEST_MODE_CONTROL_POINTS)
        // Inject initial test position at Main Gate (Simulated)
        mockProviderRef.current.emitPosition(12.945040, 80.243780, 6)
      } else {
        const browserProvider = createBrowserGeolocationProvider()
        defaultGpsService.setProvider(browserProvider)
        // Revert to calibrated benchmarks in live mode
        setControlPoints(LIVE_FALLBACK_CONTROL_POINTS)
        setCoords(null)
        setServiceStatus('idle')
      }
    },
    [isTestMode]
  )

  // Inject arbitrary simulated position (when in Test Mode)
  const injectTestPosition = useCallback(
    (lat: number, lon: number, accuracy: number = 8) => {
      if (!isTestMode) {
        toggleTestMode(true)
      }
      if (mockProviderRef.current) {
        mockProviderRef.current.emitPosition(lat, lon, accuracy)
      }
    },
    [isTestMode, toggleTestMode]
  )

  // Update control points dynamically (via Calibration Modal)
  const updateControlPoints = useCallback((newPoints: GroundControlPoint[]) => {
    setControlPoints(newPoints)
  }, [])

  // Reset to default
  const resetToDefaultCalibration = useCallback(() => {
    setControlPoints(isTestMode ? TEST_MODE_CONTROL_POINTS : LIVE_FALLBACK_CONTROL_POINTS)
  }, [isTestMode])

  const isTracking = serviceStatus === 'active' || serviceStatus === 'requesting'

  return {
    isTracking,
    serviceStatus,
    coords,
    classification,
    calibrationModel,
    geofence,
    isTestMode,
    startLocation,
    stopLocation,
    toggleTestMode,
    injectTestPosition,
    updateControlPoints,
    resetToDefaultCalibration,
  }
}
