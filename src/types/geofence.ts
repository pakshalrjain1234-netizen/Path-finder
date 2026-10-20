/**
 * Types for Phase 4A.1 Campus Geofencing
 */

export type GeofenceStatus = 'inside' | 'outside' | 'uncertain' | 'boundary_unapproved';

export type BoundaryConfidence = 'provisional' | 'cadastral_survey' | 'rtk_verified';

export interface LatLngPoint {
  latitude: number;
  longitude: number;
}

export interface CampusBoundaryMetadata {
  id: string;
  name: string;
  source: string;
  osmWayId?: number;
  retrievedAt: string;
  confidenceLevel: BoundaryConfidence;
  isApprovedForLiveNavigation: boolean;
  notes: string;
}

export interface CampusBoundaryPolygon {
  metadata: CampusBoundaryMetadata;
  /**
   * Ring of [lon, lat] coordinates according to standard GeoJSON Polygon format
   */
  coordinates: [number, number][];
}

export interface GeofenceEvaluation {
  status: GeofenceStatus;
  isInsidePolygon: boolean;
  /**
   * Shortest Euclidean/metric distance from point to polygon boundary edges in metres
   */
  distanceToBoundaryMeters: number;
  accuracyMeters: number;
  confidence: 'high' | 'medium' | 'low' | 'unverified';
  userMessage: string;
  details: string;
  isSimulated: boolean;
  isApprovedForLiveNavigation: boolean;
}

export interface GeofencePreset {
  id: string;
  label: string;
  description: string;
  expectedStatus: GeofenceStatus;
  latitude: number;
  longitude: number;
  accuracy: number;
}
