import type { Point3 } from '../types/navigation'

/**
 * Structured observation model for Phase 9A GPSTest field survey dataset.
 * Sourced from actual field observations on MNMJEC campus.
 *
 * SOURCING AUDIT NOTICE:
 * All field observations recorded with GPSTest are PROVISIONAL.
 * The device-reported horizontal accuracy (1-sigma circular error probable)
 * does not constitute geodetic certification. Live navigation remains locked.
 */
export interface GpsSurveyObservation {
  id: string
  locationName: string
  latitude: number
  longitude: number
  horizontalAccuracyMeters: number
  verificationStatus: 'provisional'
  instrumentType: 'GPSTest Mobile GNSS'
  targetFeatureType: 'entrance' | 'corridor' | 'courtyard' | 'facility' | 'gate'
  stageE3ReferenceNode: string
  stageE3GroundPosition: Point3
  roofAnchorId?: string
  roofAnchorPosition?: Point3
  notes: string
}

export interface UncollectedSurveyTarget {
  id: string
  locationName: string
  reason: string
  stageE3ReferenceNode: string
  stageE3GroundPosition: Point3
  notes: string
}

/**
 * Phase 9A authoritative 17-point GPSTest field survey dataset.
 * All coordinates in WGS84 (EPSG:4326) decimal degrees.
 */
export const CAMPUS_GPS_SURVEY_OBSERVATIONS: GpsSurveyObservation[] = [
  {
    id: 'survey-physics-dept',
    locationName: 'Physics Department',
    latitude: 12.9457830,
    longitude: 80.2464979,
    horizontalAccuracyMeters: 3.8,
    verificationStatus: 'provisional',
    instrumentType: 'GPSTest Mobile GNSS',
    targetFeatureType: 'entrance',
    stageE3ReferenceNode: 'PHYSICS_DEPARTMENT_ENTRANCE_ANCHOR',
    stageE3GroundPosition: [14.2, 0.2, -47.2],
    roofAnchorId: 'physics-department',
    roofAnchorPosition: [14.4, 7.3, -54.4],
    notes: 'Ground approach stairs leading up to elevated department level.',
  },
  {
    id: 'survey-it-block',
    locationName: 'IT Block',
    latitude: 12.9459183,
    longitude: 80.2461224,
    horizontalAccuracyMeters: 3.8,
    verificationStatus: 'provisional',
    instrumentType: 'GPSTest Mobile GNSS',
    targetFeatureType: 'entrance',
    stageE3ReferenceNode: 'IT_BLOCK_ENTRANCE_ANCHOR',
    stageE3GroundPosition: [105.6, 0.2, -56.8],
    roofAnchorId: 'it-block',
    roofAnchorPosition: [96.9, 10.4, -51.2],
    notes: 'North entrance canopy and approach portal facing central avenue.',
  },
  {
    id: 'survey-mech-block',
    locationName: 'Mechanical Block',
    latitude: 12.9455578,
    longitude: 80.2459645,
    horizontalAccuracyMeters: 3.8,
    verificationStatus: 'provisional',
    instrumentType: 'GPSTest Mobile GNSS',
    targetFeatureType: 'entrance',
    stageE3ReferenceNode: 'MECHANICAL_BLOCK_ENTRANCE_ANCHOR',
    stageE3GroundPosition: [62.3, 0.2, -78.0],
    roofAnchorId: 'mechanical-block',
    roofAnchorPosition: [32.0, 12.5, -76.3],
    notes: 'East canopy entrance approach portal facing central road.',
  },
  {
    id: 'survey-architecture-block',
    locationName: 'Architecture Block',
    latitude: 12.9453658,
    longitude: 80.2459234,
    horizontalAccuracyMeters: 3.8,
    verificationStatus: 'provisional',
    instrumentType: 'GPSTest Mobile GNSS',
    targetFeatureType: 'entrance',
    stageE3ReferenceNode: 'MNM_SCHOOL_OF_ARCHITECTURE_ENTRANCE_ANCHOR',
    stageE3GroundPosition: [22.2, 0.2, -101.6],
    roofAnchorId: 'mnm-school-of-architecture',
    roofAnchorPosition: [18.3, 10.6, -123.8],
    notes: 'Observed reading collected in the courtyard south of Mech Block; differs significantly from Stage E3 western block position. Requires re-survey.',
  },
  {
    id: 'survey-civil-block',
    locationName: 'Civil Block',
    latitude: 12.9455970,
    longitude: 80.2457751,
    horizontalAccuracyMeters: 5.2,
    verificationStatus: 'provisional',
    instrumentType: 'GPSTest Mobile GNSS',
    targetFeatureType: 'entrance',
    stageE3ReferenceNode: 'CIVIL_BLOCK_ENTRANCE_ANCHOR',
    stageE3GroundPosition: [136.2, 0.2, -78.2],
    roofAnchorId: 'civil-block',
    roofAnchorPosition: [144.5, 10.6, -64.8],
    notes: 'Ground floor west lower canopy entrance steps. Notice: physically joined to L-Shape Block in reality.',
  },
  {
    id: 'survey-first-year-block',
    locationName: 'First Year Block',
    latitude: 12.9459361,
    longitude: 80.2454560,
    horizontalAccuracyMeters: 3.8,
    verificationStatus: 'provisional',
    instrumentType: 'GPSTest Mobile GNSS',
    targetFeatureType: 'entrance',
    stageE3ReferenceNode: 'FIRST_YEAR_BLOCK_ENTRANCE_ANCHOR',
    stageE3GroundPosition: [176.6, 0.2, -72.4],
    roofAnchorId: 'first-year-block',
    roofAnchorPosition: [166.8, 13.9, -73.8],
    notes: 'East canopy foyer entrance steps adjacent to foundational lecture halls.',
  },
  {
    id: 'survey-l-shape-block-oat',
    locationName: 'L-Shape Block OAT-side entrance',
    latitude: 12.9463154,
    longitude: 80.2447659,
    horizontalAccuracyMeters: 3.8,
    verificationStatus: 'provisional',
    instrumentType: 'GPSTest Mobile GNSS',
    targetFeatureType: 'entrance',
    stageE3ReferenceNode: 'L_SHAPE_BLOCK_ENTRANCE_ANCHOR',
    stageE3GroundPosition: [248.6, 0.2, -41.6],
    roofAnchorId: 'l-shape-block',
    roofAnchorPosition: [222.5, 10.6, -90.3],
    notes: 'East facade ground entrance facing the Open Air Theatre amphitheatre plaza.',
  },
  {
    id: 'survey-oat',
    locationName: 'Open Air Theatre',
    latitude: 12.9459243,
    longitude: 80.2451393,
    horizontalAccuracyMeters: 4.0,
    verificationStatus: 'provisional',
    instrumentType: 'GPSTest Mobile GNSS',
    targetFeatureType: 'facility',
    stageE3ReferenceNode: 'OAT_FOOTPRINT',
    stageE3GroundPosition: [227.5, 0.325, -66.5],
    roofAnchorId: 'open-air-theatre',
    roofAnchorPosition: [227.5, 2.7, -60.9],
    notes: 'Amphitheatre ground plaza and stage approach corridor.',
  },
  {
    id: 'survey-central-library-approach',
    locationName: 'Central Library corridor approach',
    latitude: 12.9458329,
    longitude: 80.2454447,
    horizontalAccuracyMeters: 3.8,
    verificationStatus: 'provisional',
    instrumentType: 'GPSTest Mobile GNSS',
    targetFeatureType: 'corridor',
    stageE3ReferenceNode: 'E2_LIBRARY_152_BASE_SLAB',
    stageE3GroundPosition: [193.5, 0.08, -73.1],
    roofAnchorId: 'library',
    roofAnchorPosition: [193.5, 8.5, -73.1],
    notes: 'Paved approach corridor between Main Block and library hall. Entrance door geometry pending physical audit.',
  },
  {
    id: 'survey-maths-dept',
    locationName: 'Mathematics Department',
    latitude: 12.9461738,
    longitude: 80.2460064,
    horizontalAccuracyMeters: 3.8,
    verificationStatus: 'provisional',
    instrumentType: 'GPSTest Mobile GNSS',
    targetFeatureType: 'entrance',
    stageE3ReferenceNode: 'MATHS_DEPARTMENT_ENTRANCE_ANCHOR',
    stageE3GroundPosition: [96.6, 0.2, -23.2],
    roofAnchorId: 'maths-department',
    roofAnchorPosition: [96.7, 4.0, -32.0],
    notes: 'North walkway ground entrance threshold.',
  },
  {
    id: 'survey-english-dept',
    locationName: 'English Department',
    latitude: 12.9461326,
    longitude: 80.2463240,
    horizontalAccuracyMeters: 3.8,
    verificationStatus: 'provisional',
    instrumentType: 'GPSTest Mobile GNSS',
    targetFeatureType: 'entrance',
    stageE3ReferenceNode: 'ENGLISH_DEPARTMENT_ENTRANCE_ANCHOR',
    stageE3GroundPosition: [70.6, 0.2, -23.2],
    roofAnchorId: 'english-department',
    roofAnchorPosition: [70.7, 7.3, -32.0],
    notes: 'North walkway ground entrance threshold.',
  },
  {
    id: 'survey-canteen',
    locationName: 'Canteen',
    latitude: 12.9461534,
    longitude: 80.2463815,
    horizontalAccuracyMeters: 3.8,
    verificationStatus: 'provisional',
    instrumentType: 'GPSTest Mobile GNSS',
    targetFeatureType: 'entrance',
    stageE3ReferenceNode: 'CANTEEN_ENTRANCE_ANCHOR',
    stageE3GroundPosition: [39.0, 0.2, -16.6],
    roofAnchorId: 'canteen',
    roofAnchorPosition: [37.3, 4.0, -9.8],
    notes: 'North dining hall canopy portal and food court approach.',
  },
  {
    id: 'survey-jain-mess',
    locationName: 'Jain Mess',
    latitude: 12.9460812,
    longitude: 80.2463026,
    horizontalAccuracyMeters: 3.8,
    verificationStatus: 'provisional',
    instrumentType: 'GPSTest Mobile GNSS',
    targetFeatureType: 'entrance',
    stageE3ReferenceNode: 'JAIN_MESS_ENTRANCE_ANCHOR',
    stageE3GroundPosition: [40.4, 0.2, -23.2],
    roofAnchorId: 'jain-mess',
    roofAnchorPosition: [40.3, 4.0, -32.0],
    notes: 'North corridor ground dining entrance.',
  },
  {
    id: 'survey-non-jain-mess',
    locationName: 'Non-Jain Mess',
    latitude: 12.9461511,
    longitude: 80.2466243,
    horizontalAccuracyMeters: 4.6,
    verificationStatus: 'provisional',
    instrumentType: 'GPSTest Mobile GNSS',
    targetFeatureType: 'entrance',
    stageE3ReferenceNode: 'NON_JAIN_MESS_ENTRANCE_ANCHOR',
    stageE3GroundPosition: [13.4, 0.2, -23.2],
    roofAnchorId: 'non-jain-mess',
    roofAnchorPosition: [13.4, 3.7, -32.0],
    notes: 'North corridor ground dining entrance.',
  },
  {
    id: 'survey-main-block',
    locationName: 'Main Block',
    latitude: 12.9462303,
    longitude: 80.2453678,
    horizontalAccuracyMeters: 3.8,
    verificationStatus: 'provisional',
    instrumentType: 'GPSTest Mobile GNSS',
    targetFeatureType: 'entrance',
    stageE3ReferenceNode: 'MAIN_BLOCK_ENTRANCE_ANCHOR',
    stageE3GroundPosition: [193.6, 0.2, -48.4],
    roofAnchorId: 'main-block',
    roofAnchorPosition: [193.5, 7.3, -58.5],
    notes: 'Survey reading clustered near Gate 1/front driveway (15m from Gate 1). Severe multipath or front-curb reading; 3D model entrance is setback 44m from gate. Identified as outlier.',
  },
  {
    id: 'survey-apollo-xerox',
    locationName: 'Apollo Shine + Xerox Shop shared approach',
    latitude: 12.9462264,
    longitude: 80.2454089,
    horizontalAccuracyMeters: 3.8,
    verificationStatus: 'provisional',
    instrumentType: 'GPSTest Mobile GNSS',
    targetFeatureType: 'corridor',
    stageE3ReferenceNode: 'E2_APOLLO_BUILDING_SLAB',
    stageE3GroundPosition: [147.5, 0.2, -18.7],
    notes: 'Paved shared approach between student health center and reprographics facility west of Main Gate. Exact door thresholds pending verification.',
  },
  {
    id: 'survey-main-gate-1',
    locationName: 'Main Entrance Gate 1',
    latitude: 12.9462708,
    longitude: 80.2455018,
    horizontalAccuracyMeters: 3.8,
    verificationStatus: 'provisional',
    instrumentType: 'GPSTest Mobile GNSS',
    targetFeatureType: 'gate',
    stageE3ReferenceNode: 'MAIN_ENTRANCE_MARKER',
    stageE3GroundPosition: [181.0, 0.2, -6.2],
    roofAnchorId: 'main-gate-1',
    roofAnchorPosition: [181.0, 2.6, -6.2],
    notes: 'Center point between Entrance Piers 1 & 2 facing Rajiv Gandhi Salai (OMR). Primary campus geographic benchmark candidate.',
  },
]

/**
 * Known campus landmarks with uncollected GPS readings in Phase 9A.
 */
export const UNCOLLECTED_SURVEY_TARGETS: UncollectedSurveyTarget[] = [
  {
    id: 'uncollected-gate-2',
    locationName: 'Gate 2 (West Entrance - School of Architecture)',
    reason: 'Exact GPS reading has not yet been collected in field survey.',
    stageE3ReferenceNode: 'WEST_ENTRANCE_MARKER',
    stageE3GroundPosition: [54.4, 0.2, -97.8],
    notes: 'Primary entrance to the School of Architecture campus and western access lane. High priority for Phase 9B survey.',
  },
  {
    id: 'uncollected-boys-hostel',
    locationName: 'Boys Hostel Approach Portal',
    reason: 'Field survey did not include residential south campus quadrant.',
    stageE3ReferenceNode: 'BOYS_HOSTEL_ENTRANCE_ANCHOR',
    stageE3GroundPosition: [24.4, 0.2, -183.0],
    notes: 'South campus residential walkway entry. High priority for Phase 9B survey.',
  },
]

export function getSurveyObservationById(id: string): GpsSurveyObservation | undefined {
  return CAMPUS_GPS_SURVEY_OBSERVATIONS.find((obs) => obs.id === id)
}

export function getSurveyObservationsByFeature(
  featureType: GpsSurveyObservation['targetFeatureType']
): GpsSurveyObservation[] {
  return CAMPUS_GPS_SURVEY_OBSERVATIONS.filter((obs) => obs.targetFeatureType === featureType)
}
