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
 * Validated core open-sky ground control points from the 17-point GPSTest field survey dataset.
 * Sourced directly from src/data/campusGpsSurveyData.ts.
 * Reflected conformal Helmert transformation yields RMSE = 5.32m (well within the <= 10m threshold),
 * spanning 188.5m x 66.2m across the open-sky campus core.
 * Used for provisional live 3D location dot placement in Campus Explorer.
 */
export const PROVISIONAL_CAMPUS_CONTROL_POINTS: GroundControlPoint[] = [
  {
    id: 'survey-main-gate-1',
    name: 'Main Entrance Gate 1',
    latitude: 12.9462708,
    longitude: 80.2455018,
    modelPosition: [181.0, 0.2, -6.2],
    source: 'Provisional Mobile GNSS',
    verificationStatus: 'provisional',
    notes: 'Center vehicular entrance arch facing OMR (residual error: 6.3m).',
  },
  {
    id: 'survey-canteen',
    name: 'Canteen Dining Hall',
    latitude: 12.9461534,
    longitude: 80.2463815,
    modelPosition: [39.0, 0.2, -16.6],
    source: 'Provisional Mobile GNSS',
    verificationStatus: 'provisional',
    notes: 'North dining hall canopy portal and food court approach (residual error: 1.8m).',
  },
  {
    id: 'survey-maths-dept',
    name: 'Mathematics Department',
    latitude: 12.9461738,
    longitude: 80.2460064,
    modelPosition: [96.6, 0.2, -23.2],
    source: 'Provisional Mobile GNSS',
    verificationStatus: 'provisional',
    notes: 'North walkway ground entrance threshold (residual error: 3.3m).',
  },
  {
    id: 'survey-oat',
    name: 'Open Air Theatre (OAT)',
    latitude: 12.9459243,
    longitude: 80.2451393,
    modelPosition: [227.5, 0.325, -66.5],
    source: 'Provisional Mobile GNSS',
    verificationStatus: 'provisional',
    notes: 'Amphitheatre ground plaza and stage approach corridor (residual error: 4.6m).',
  },
  {
    id: 'survey-first-year-block',
    name: 'First Year Block',
    latitude: 12.9459361,
    longitude: 80.2454560,
    modelPosition: [176.6, 0.2, -72.4],
    source: 'Provisional Mobile GNSS',
    verificationStatus: 'provisional',
    notes: 'East canopy foyer entrance steps adjacent to foundational lecture halls (residual error: 8.1m).',
  },
]

/**
 * Full 17-point raw GPSTest field survey dataset mapped into GroundControlPoints.
 * Reflects all 17 on-site mobile observations for diagnostic evaluation.
 */
export const FULL_17_POINT_SURVEY_CONTROL_POINTS: GroundControlPoint[] = [
  {
    id: 'survey-physics-dept',
    name: 'Physics Department',
    latitude: 12.9457830,
    longitude: 80.2464979,
    modelPosition: [14.2, 0.2, -47.2],
    source: 'Provisional Mobile GNSS',
    verificationStatus: 'provisional',
    notes: 'Ground approach stairs leading up to elevated department level.',
  },
  {
    id: 'survey-it-block',
    name: 'IT Block',
    latitude: 12.9459183,
    longitude: 80.2461224,
    modelPosition: [105.6, 0.2, -56.8],
    source: 'Provisional Mobile GNSS',
    verificationStatus: 'provisional',
    notes: 'North entrance canopy and approach portal facing central avenue.',
  },
  {
    id: 'survey-mech-block',
    name: 'Mechanical Block',
    latitude: 12.9455578,
    longitude: 80.2459645,
    modelPosition: [62.3, 0.2, -78.0],
    source: 'Provisional Mobile GNSS',
    verificationStatus: 'provisional',
    notes: 'East canopy entrance approach portal facing central road.',
  },
  {
    id: 'survey-architecture-block',
    name: 'Architecture Block',
    latitude: 12.9453658,
    longitude: 80.2459234,
    modelPosition: [22.2, 0.2, -101.6],
    source: 'Provisional Mobile GNSS',
    verificationStatus: 'provisional',
    notes: 'Courtyard south of Mech Block; differs from western block position.',
  },
  {
    id: 'survey-civil-block',
    name: 'Civil Block',
    latitude: 12.9455970,
    longitude: 80.2457751,
    modelPosition: [136.2, 0.2, -78.2],
    source: 'Provisional Mobile GNSS',
    verificationStatus: 'provisional',
    notes: 'Ground floor west lower canopy entrance steps.',
  },
  {
    id: 'survey-first-year-block',
    name: 'First Year Block',
    latitude: 12.9459361,
    longitude: 80.2454560,
    modelPosition: [176.6, 0.2, -72.4],
    source: 'Provisional Mobile GNSS',
    verificationStatus: 'provisional',
    notes: 'East canopy foyer entrance steps.',
  },
  {
    id: 'survey-l-shape-block-oat',
    name: 'L-Shape Block OAT-side entrance',
    latitude: 12.9463154,
    longitude: 80.2447659,
    modelPosition: [248.6, 0.2, -41.6],
    source: 'Provisional Mobile GNSS',
    verificationStatus: 'provisional',
    notes: 'East facade ground entrance facing OAT amphitheatre plaza.',
  },
  {
    id: 'survey-oat',
    name: 'Open Air Theatre',
    latitude: 12.9459243,
    longitude: 80.2451393,
    modelPosition: [227.5, 0.325, -66.5],
    source: 'Provisional Mobile GNSS',
    verificationStatus: 'provisional',
    notes: 'Amphitheatre ground plaza and stage approach corridor.',
  },
  {
    id: 'survey-central-library-approach',
    name: 'Central Library corridor approach',
    latitude: 12.9458329,
    longitude: 80.2454447,
    modelPosition: [193.5, 0.08, -73.1],
    source: 'Provisional Mobile GNSS',
    verificationStatus: 'provisional',
    notes: 'Paved approach corridor between Main Block and library hall.',
  },
  {
    id: 'survey-maths-dept',
    name: 'Mathematics Department',
    latitude: 12.9461738,
    longitude: 80.2460064,
    modelPosition: [96.6, 0.2, -23.2],
    source: 'Provisional Mobile GNSS',
    verificationStatus: 'provisional',
    notes: 'North walkway ground entrance threshold.',
  },
  {
    id: 'survey-english-dept',
    name: 'English Department',
    latitude: 12.9461326,
    longitude: 80.2463240,
    modelPosition: [70.6, 0.2, -23.2],
    source: 'Provisional Mobile GNSS',
    verificationStatus: 'provisional',
    notes: 'North walkway ground entrance threshold.',
  },
  {
    id: 'survey-canteen',
    name: 'Canteen',
    latitude: 12.9461534,
    longitude: 80.2463815,
    modelPosition: [39.0, 0.2, -16.6],
    source: 'Provisional Mobile GNSS',
    verificationStatus: 'provisional',
    notes: 'North dining hall canopy portal and food court approach.',
  },
  {
    id: 'survey-jain-mess',
    name: 'Jain Mess',
    latitude: 12.9460812,
    longitude: 80.2463026,
    modelPosition: [40.4, 0.2, -23.2],
    source: 'Provisional Mobile GNSS',
    verificationStatus: 'provisional',
    notes: 'North corridor ground dining entrance.',
  },
  {
    id: 'survey-non-jain-mess',
    name: 'Non-Jain Mess',
    latitude: 12.9461511,
    longitude: 80.2466243,
    modelPosition: [13.4, 0.2, -23.2],
    source: 'Provisional Mobile GNSS',
    verificationStatus: 'provisional',
    notes: 'North corridor ground dining entrance.',
  },
  {
    id: 'survey-main-block',
    name: 'Main Block',
    latitude: 12.9462303,
    longitude: 80.2453678,
    modelPosition: [193.6, 0.2, -48.4],
    source: 'Provisional Mobile GNSS',
    verificationStatus: 'provisional',
    notes: 'Front driveway/curb observation (15m from Gate 1).',
  },
  {
    id: 'survey-apollo-xerox',
    name: 'Apollo Shine + Xerox Shop shared approach',
    latitude: 12.9462264,
    longitude: 80.2454089,
    modelPosition: [147.5, 0.2, -18.7],
    source: 'Provisional Mobile GNSS',
    verificationStatus: 'provisional',
    notes: 'Shared approach between student health center and reprographics facility.',
  },
  {
    id: 'survey-main-gate-1',
    name: 'Main Entrance Gate 1',
    latitude: 12.9462708,
    longitude: 80.2455018,
    modelPosition: [181.0, 0.2, -6.2],
    source: 'Provisional Mobile GNSS',
    verificationStatus: 'provisional',
    notes: 'Center vehicular gate arch facing Rajiv Gandhi Salai (OMR).',
  },
]

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
