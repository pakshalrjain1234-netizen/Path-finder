import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Point3, RoutePlan } from '../types/navigation'
import type { CalibrationModel } from '../types/gps'
import { LiveNavigationEngine } from '../lib/liveNavigationEngine.ts'
import type {
  LiveNavigationState,
  LocationObservation,
  ScenarioId,
} from '../types/liveNavigation.ts'
import { NAVIGATION_SCENARIOS } from '../data/navigationScenarios.ts'

interface UseLiveNavigationProps {
  route: RoutePlan | null
  routePoints: Point3[]
  calibration: CalibrationModel
  liveCoordinates: { latitude: number; longitude: number; accuracy: number } | null
  isSimulated: boolean
}

export function useLiveNavigation({
  route,
  routePoints,
  calibration,
  liveCoordinates,
  isSimulated,
}: UseLiveNavigationProps) {
  const engine = useMemo(() => new LiveNavigationEngine(), [])

  // Current active scenario (if running simulated test scenario)
  const [activeScenarioId, setActiveScenarioId] = useState<ScenarioId | null>(null)
  const [scenarioStepIndex, setScenarioStepIndex] = useState<number>(0)
  const [isScenarioPlaying, setIsScenarioPlaying] = useState<boolean>(false)

  // Initialize route in engine
  useEffect(() => {
    engine.setRoute(route, routePoints)
  }, [route, routePoints, engine])

  // Initial dummy state
  const [navState, setNavState] = useState<LiveNavigationState>(() => {
    return engine.processObservation(
      {
        latitude: 12.94504,
        longitude: 80.24378,
        accuracy: 10,
        timestamp: Date.now(),
      },
      calibration,
      isSimulated
    )
  })

  // Feed Live GPS Coordinates when in live/tracking mode
  useEffect(() => {
    if (activeScenarioId || !liveCoordinates) return

    const obs: LocationObservation = {
      latitude: liveCoordinates.latitude,
      longitude: liveCoordinates.longitude,
      accuracy: liveCoordinates.accuracy,
      timestamp: Date.now(),
    }

    const state = engine.processObservation(obs, calibration, isSimulated)
    setNavState(state)
  }, [liveCoordinates, calibration, isSimulated, activeScenarioId, engine])

  // Periodic Signal Loss Timeout Check
  useEffect(() => {
    const timer = setInterval(() => {
      const timeoutState = engine.checkSignalTimeout(Date.now(), isSimulated)
      if (timeoutState) {
        setNavState(timeoutState)
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [engine, isSimulated])

  // Scenario Playback Loop
  useEffect(() => {
    if (!isScenarioPlaying || !activeScenarioId) return

    const scenario = NAVIGATION_SCENARIOS.find((s) => s.id === activeScenarioId)
    if (!scenario || scenario.observations.length === 0) return

    const interval = setInterval(() => {
      setScenarioStepIndex((prevIdx) => {
        const nextIdx = prevIdx + 1
        if (nextIdx >= scenario.observations.length) {
          setIsScenarioPlaying(false)
          return prevIdx
        }

        const obs = scenario.observations[nextIdx]
        const state = engine.processObservation(obs, calibration, true)
        setNavState(state)
        return nextIdx
      })
    }, 1800)

    return () => clearInterval(interval)
  }, [isScenarioPlaying, activeScenarioId, calibration, engine])

  // Start navigation
  const startNavigation = useCallback(() => {
    engine.startNavigation()
    if (activeScenarioId) {
      setIsScenarioPlaying(true)
    }
  }, [engine, activeScenarioId])

  // Pause navigation
  const pauseNavigation = useCallback(() => {
    engine.pauseNavigation()
    setIsScenarioPlaying(false)
  }, [engine])

  // Resume navigation
  const resumeNavigation = useCallback(() => {
    engine.resumeNavigation()
    if (activeScenarioId) {
      setIsScenarioPlaying(true)
    }
  }, [engine, activeScenarioId])

  // Stop navigation
  const stopNavigation = useCallback(() => {
    engine.stopNavigation()
    setIsScenarioPlaying(false)
    setActiveScenarioId(null)
    setScenarioStepIndex(0)
    // Refresh state
    if (liveCoordinates) {
      const obs: LocationObservation = {
        latitude: liveCoordinates.latitude,
        longitude: liveCoordinates.longitude,
        accuracy: liveCoordinates.accuracy,
        timestamp: Date.now(),
      }
      setNavState(engine.processObservation(obs, calibration, isSimulated))
    }
  }, [engine, liveCoordinates, calibration, isSimulated])

  // Start a specific scenario
  const runScenario = useCallback(
    (scenarioId: ScenarioId) => {
      const scenario = NAVIGATION_SCENARIOS.find((s) => s.id === scenarioId)
      if (!scenario || scenario.observations.length === 0) return

      engine.reset()
      engine.startNavigation()
      setActiveScenarioId(scenarioId)
      setScenarioStepIndex(0)

      const firstObs = scenario.observations[0]
      const state = engine.processObservation(firstObs, calibration, true)
      setNavState(state)
      setIsScenarioPlaying(true)
    },
    [engine, calibration]
  )

  // Step manually through scenario observations
  const stepScenario = useCallback(
    (direction: 'next' | 'prev') => {
      if (!activeScenarioId) return
      const scenario = NAVIGATION_SCENARIOS.find((s) => s.id === activeScenarioId)
      if (!scenario) return

      setIsScenarioPlaying(false)
      const nextIdx =
        direction === 'next'
          ? Math.min(scenario.observations.length - 1, scenarioStepIndex + 1)
          : Math.max(0, scenarioStepIndex - 1)

      setScenarioStepIndex(nextIdx)
      const obs = scenario.observations[nextIdx]
      const state = engine.processObservation(obs, calibration, true)
      setNavState(state)
    },
    [activeScenarioId, scenarioStepIndex, engine, calibration]
  )

  const activeScenario = useMemo(() => {
    return NAVIGATION_SCENARIOS.find((s) => s.id === activeScenarioId) ?? null
  }, [activeScenarioId])

  return {
    navState,
    activeScenario,
    scenarioStepIndex,
    isScenarioPlaying,
    startNavigation,
    pauseNavigation,
    resumeNavigation,
    stopNavigation,
    runScenario,
    stepScenario,
    scenarios: NAVIGATION_SCENARIOS,
  }
}
