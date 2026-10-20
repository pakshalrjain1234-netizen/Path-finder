import type { CampusBoundaryPolygon, GeofencePreset } from '../types/geofence.ts'

/**
 * Standard user copy required by Phase 4A.1 geofencing specification
 */
export const GEOFENCE_MESSAGES = {
  INSIDE: 'You appear to be inside MNMJEC.',
  OUTSIDE: 'You appear to be outside MNMJEC. You can still explore the campus and preview routes.',
  UNCERTAIN: 'Unable to confirm whether you are inside the campus. Try again outdoors.',
  BOUNDARY_UNAPPROVED: 'Campus boundary calibration pending.'
} as const;

/**
 * Provisional MNMJEC campus boundary extracted from OpenStreetMap Way 35457616.
 *
 * SAFETY GUARDRAIL:
 * isApprovedForLiveNavigation is strictly FALSE until ground-truth cadastral
 * or RTK-GNSS surveyed perimeter boundary markers are established.
 */
export const PROVISIONAL_CAMPUS_BOUNDARY: CampusBoundaryPolygon = {
  metadata: {
    id: 'osm_way_35457616',
    name: 'MNM Jain Engineering College (OSM Way 35457616)',
    source: 'OpenStreetMap Way 35457616',
    osmWayId: 35457616,
    retrievedAt: '2026-10-20T07:15:00Z',
    confidenceLevel: 'provisional',
    isApprovedForLiveNavigation: false,
    notes: 'Provisional community-contributed educational boundary polygon. Not verified against government cadastral or RTK-GNSS surveyed boundary.'
  },
  coordinates: [
    [80.2461435, 12.9428555],
    [80.2433293, 12.9434546],
    [80.2433547, 12.9450586],
    [80.2435305, 12.9459492],
    [80.2428648, 12.9460769],
    [80.2404579, 12.9465384],
    [80.2406591, 12.9472154],
    [80.2413189, 12.9470586],
    [80.2441353, 12.9466194],
    [80.2470937, 12.9461779],
    [80.2468964, 12.9451293],
    [80.2466032, 12.9451884],
    [80.2461435, 12.9428555]
  ]
};

/**
 * Deterministic test presets for geofence validation and simulation
 */
export const GEOFENCE_PRESETS: GeofencePreset[] = [
  {
    id: 'inside_campus_center',
    label: 'Inside MNMJEC (Central Courtyard)',
    description: 'Central campus open area with high accuracy (6m). Safely inside boundary.',
    expectedStatus: 'inside',
    latitude: 12.94504,
    longitude: 80.24378,
    accuracy: 6
  },
  {
    id: 'inside_college_building',
    label: 'Inside MNMJEC (Academic Block)',
    description: 'Academic block area with good accuracy (8m). Strictly inside boundary.',
    expectedStatus: 'inside',
    latitude: 12.94592,
    longitude: 80.24523,
    accuracy: 8
  },
  {
    id: 'outside_distant_south',
    label: 'Outside MNMJEC (Displaced South)',
    description: 'Latitude 12.8715°N, 8.2 km south of college. Clear outside classification.',
    expectedStatus: 'outside',
    latitude: 12.8715,
    longitude: 80.2195,
    accuracy: 10
  },
  {
    id: 'outside_nearby_road',
    label: 'Outside MNMJEC (West Approach Road)',
    description: 'Adjacent road junction ~300m west of college with 8m accuracy.',
    expectedStatus: 'outside',
    latitude: 12.94600,
    longitude: 80.23700,
    accuracy: 8
  },
  {
    id: 'uncertain_boundary_overlap',
    label: 'Uncertain (Accuracy Circle Straddles Boundary)',
    description: 'Point located 15m from boundary edge with 30m accuracy circle crossing perimeter.',
    expectedStatus: 'uncertain',
    latitude: 12.94675,
    longitude: 80.24200,
    accuracy: 30
  },
  {
    id: 'uncertain_poor_accuracy',
    label: 'Uncertain (Poor Satellite Accuracy 55m)',
    description: 'Point inside campus but GPS accuracy radius exceeds acceptable threshold (>30m).',
    expectedStatus: 'uncertain',
    latitude: 12.94504,
    longitude: 80.24378,
    accuracy: 55
  }
];
