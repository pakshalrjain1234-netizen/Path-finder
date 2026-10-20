import type { GroundControlPoint } from '../types/gps'

/**
 * Standard MNMJEC 3D Campus bounding box in Blender model coordinates.
 * Extracted from GLB road and building geometries.
 */
export const CAMPUS_MODEL_BOUNDS = {
  minX: -25.0,
  maxX: 265.0,
  minZ: -215.0,
  maxZ: 25.0,
  elevationGround: 0.25,
  elevationBuffer: 15.0,
}

/**
 * Real-world geographic reference metadata for MNM Jain Engineering College (MNMJEC),
 * Rajiv Gandhi Salai (OMR), Thoraipakkam, Chennai.
 *
 * SOURCING AUDIT NOTICE:
 * Public OpenStreetMap references place the college entrance at approx 12.94504°N, 80.24378°E,
 * and academic building centroids near 12.94592°N, 80.24523°E.
 *
 * CRITICAL CALIBRATION SAFETY RULE:
 * This reference is informational only. In accordance with safety review requirements:
 * 1. Online map coordinates must NOT automatically be used as ground control points.
 * 2. Real campus calibration remains strictly DISABLED until matching landmark positions
 *    and acceptable residual errors (RMSE <= 5m) are verified by on-site field survey (RTK-GNSS).
 */
export const REAL_WORLD_CAMPUS_REFERENCE = {
  institution: 'Misrimal Navajee Munoth Jain Engineering College (MNMJEC)',
  location: 'Thoraipakkam, Chennai, Tamil Nadu, India',
  approxGateLatitude: 12.94504,
  approxGateLongitude: 80.24378,
  approxBuildingLatitude: 12.94592,
  approxBuildingLongitude: 80.24523,
  calibrationReadiness: 'UNSURVEYED - Field RTK-GNSS verification required',
} as const

/**
 * Production Ground Control Points (GCPs).
 *
 * Kept strictly EMPTY. Real campus calibration is disabled until
 * certified on-site benchmarks with acceptable residual error are surveyed.
 * Ensures the app NEVER fabricates an uncalibrated GPS position on the 3D model.
 */
export const DEFAULT_CAMPUS_CONTROL_POINTS: GroundControlPoint[] = []

/**
 * Synthetic development origin used exclusively in GPS Test Mode.
 * Aligned to MNMJEC's approximate geographic reference area (~12.94504°N, 80.24378°E).
 */
export const SYNTHETIC_DEV_ORIGIN = {
  latitude: 12.945040,
  longitude: 80.243780,
} as const

/**
 * Synthetic development control points used strictly in GPS Test Mode.
 * Mathematically derived from 3D model landmark coordinates via exact conformal mapping
 * to achieve RMSE = 0.0m for algorithm and UI verification.
 *
 * All entries are explicitly tagged with '[SIMULATED]' to prevent confusion with real survey data.
 */
export const SYNTHETIC_DEV_CONTROL_POINTS: GroundControlPoint[] = [
  {
    id: 'synthetic-gcp-main-gate',
    name: '[SIMULATED] Main Entrance (Gate 1)',
    latitude: 12.945040,
    longitude: 80.243780,
    modelPosition: [181.0, 0.25, -6.2],
    source: 'Test Mode Benchmark',
    verificationStatus: 'verified',
    notes: 'Synthetic development benchmark for Gate 1 simulation (RMSE: 0m).',
  },
  {
    id: 'synthetic-gcp-main-block',
    name: '[SIMULATED] Main Block Portico',
    latitude: 12.944861,
    longitude: 80.243985,
    modelPosition: [203.2, 0.25, -26.0],
    source: 'Test Mode Benchmark',
    verificationStatus: 'verified',
    notes: 'Synthetic development benchmark for Main Block simulation (RMSE: 0m).',
  },
  {
    id: 'synthetic-gcp-mech-block',
    name: '[SIMULATED] Mechanical Block Entrance',
    latitude: 12.944588,
    longitude: 80.242927,
    modelPosition: [88.5, 0.25, -56.2],
    source: 'Test Mode Benchmark',
    verificationStatus: 'verified',
    notes: 'Synthetic development benchmark for Mechanical Block simulation (RMSE: 0m).',
  },
  {
    id: 'synthetic-gcp-boys-hostel',
    name: '[SIMULATED] Boys Hostel Approach',
    latitude: 12.943441,
    longitude: 80.242339,
    modelPosition: [24.6, 0.25, -183.0],
    source: 'Test Mode Benchmark',
    verificationStatus: 'verified',
    notes: 'Synthetic development benchmark for Hostel simulation (RMSE: 0m).',
  },
]

// Backward-compatible alias for existing imports
export const TEST_MODE_CONTROL_POINTS = SYNTHETIC_DEV_CONTROL_POINTS

/**
 * Standard test presets for GPS Test Mode simulation.
 * All presets are clearly labeled as simulated with their testing purpose.
 */
export const SYNTHETIC_GPS_PRESETS = [
  {
    id: 'preset-gate1',
    label: '[SIMULATED] Main Entrance (Gate 1)',
    accuracyBadge: '±6m High Accuracy',
    accuracyColor: 'emerald',
    latitude: 12.945040,
    longitude: 80.243780,
    accuracy: 6,
    expectedBehavior: 'Maps to Gate 1 [181.0, -6.2]',
  },
  {
    id: 'preset-main-block',
    label: '[SIMULATED] Main Block Portico',
    accuracyBadge: '±10m High Accuracy',
    accuracyColor: 'emerald',
    latitude: 12.944861,
    longitude: 80.243985,
    accuracy: 10,
    expectedBehavior: 'Maps to Main Block [203.2, -26.0]',
  },
  {
    id: 'preset-mech-block',
    label: '[SIMULATED] Mechanical Block Entrance',
    accuracyBadge: '±8m High Accuracy',
    accuracyColor: 'emerald',
    latitude: 12.944588,
    longitude: 80.242927,
    accuracy: 8,
    expectedBehavior: 'Maps to Mechanical Block [88.5, -56.2]',
  },
  {
    id: 'preset-hostel',
    label: '[SIMULATED] Boys Hostel Approach',
    accuracyBadge: '±12m Moderate Accuracy',
    accuracyColor: 'blue',
    latitude: 12.943441,
    longitude: 80.242339,
    accuracy: 12,
    expectedBehavior: 'Maps to Hostel [24.6, -183.0]',
  },
  {
    id: 'preset-coarse',
    label: '[SIMULATED TEST] Coarse GPS (±48m)',
    accuracyBadge: '±48m (Must be Rejected)',
    accuracyColor: 'amber',
    latitude: 12.945040,
    longitude: 80.243780,
    accuracy: 48,
    expectedBehavior: 'Triggers ACCURACY INSUFFICIENT; suppresses 3D marker',
  },
  {
    id: 'preset-offcampus',
    label: '[SIMULATED TEST] Displaced Southern Location (~12.8715°N)',
    accuracyBadge: 'Off-Campus Test (~8km South)',
    accuracyColor: 'rose',
    latitude: 12.871500,
    longitude: 80.219500,
    accuracy: 8,
    expectedBehavior: 'Triggers OUTSIDE CAMPUS; suppresses 3D marker',
  },
] as const
