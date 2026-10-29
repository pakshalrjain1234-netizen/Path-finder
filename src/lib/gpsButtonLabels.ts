import type { GpsServiceStatus, PositionStatus } from '../types/gps'

export interface GpsButtonLabels {
  mobileText: string
  desktopText: string
  ariaLabel: string
  title: string
  disabled: boolean
}

/**
 * Computes responsive, accessible labels and metadata for the GPS location button.
 * Enforces concise labels on mobile viewports (320px–430px) and rich descriptive labels on desktop.
 */
export function getGpsButtonLabels(
  serviceStatus: GpsServiceStatus,
  isTracking: boolean,
  positionStatus?: PositionStatus,
  isTestMode = false,
  compact = false
): GpsButtonLabels {
  if (serviceStatus === 'requesting') {
    return {
      mobileText: 'Locating...',
      desktopText: compact ? 'Locating...' : 'Acquiring GPS Signal...',
      ariaLabel: 'Acquiring GPS Signal...',
      title: 'Acquiring GPS Signal...',
      disabled: true,
    }
  }

  if (isTracking) {
    const isLowAccuracy = positionStatus === 'accuracy_insufficient'
    const desktopTrackingText = isTestMode ? 'Test GPS Active (Stop)' : 'Live GPS Active (Stop)'
    return {
      mobileText: 'Tracking',
      desktopText: compact ? 'Tracking' : desktopTrackingText,
      ariaLabel: isTestMode ? 'Stop Test GPS tracking' : 'Stop Live GPS tracking',
      title: isLowAccuracy ? 'Low GPS accuracy — click to stop tracking' : 'Stop GPS tracking',
      disabled: false,
    }
  }

  if (serviceStatus === 'permission_denied') {
    return {
      mobileText: 'Retry GPS',
      desktopText: compact ? 'Retry GPS' : 'Permission Denied (Retry)',
      ariaLabel: 'Location permission denied. Click to retry.',
      title: 'Location permission was denied. Click to retry.',
      disabled: false,
    }
  }

  return {
    mobileText: 'Locate',
    desktopText: compact ? 'Locate' : 'Find My Location',
    ariaLabel: 'Find my location on campus',
    title: 'Request location permission and locate on campus',
    disabled: false,
  }
}
