import type {
  CampusBoundaryPolygon,
  GeofenceEvaluation,
  GeofenceStatus,
} from '../types/geofence.ts'
import { GEOFENCE_MESSAGES, PROVISIONAL_CAMPUS_BOUNDARY } from '../data/campusGeofenceData.ts'

/**
 * Metric conversion constants around Chennai latitude (~12.945°N)
 * WGS-84 ellipsoid parameters
 */
const CHENNAI_LAT_RAD = (12.945 * Math.PI) / 180;
const METERS_PER_DEG_LAT = 111132.95 - 559.82 * Math.cos(2 * CHENNAI_LAT_RAD) + 1.175 * Math.cos(4 * CHENNAI_LAT_RAD);
const METERS_PER_DEG_LON = 111412.84 * Math.cos(CHENNAI_LAT_RAD) - 93.5 * Math.cos(3 * CHENNAI_LAT_RAD);

/**
 * Accuracy thresholds in metres
 */
export const GEOFENCE_THRESHOLDS = {
  /**
   * Any GPS reading with accuracy radius greater than 30m is considered
   * too noisy to reliably determine campus geofence status.
   */
  MAX_ACCURACY_THRESHOLD_METERS: 30,
  /**
   * Accuracy threshold for HIGH confidence classification
   */
  HIGH_CONFIDENCE_ACCURACY_METERS: 12
};

/**
 * Point-in-polygon test using ray-casting algorithm.
 * Handles standard GeoJSON [longitude, latitude] coordinates.
 *
 * @param point [longitude, latitude]
 * @param polygonRing Array of [longitude, latitude] coordinates forming a closed ring
 */
export function isPointInPolygon(point: [number, number], polygonRing: [number, number][]): boolean {
  if (!polygonRing || polygonRing.length < 3) {
    return false;
  }

  const [px, py] = point;
  let inside = false;

  for (let i = 0, j = polygonRing.length - 1; i < polygonRing.length; j = i++) {
    const [xi, yi] = polygonRing[i];
    const [xj, yj] = polygonRing[j];

    const intersect = ((yi > py) !== (yj > py)) &&
      (px < ((xj - xi) * (py - yi)) / (yj - yi) + xi);

    if (intersect) {
      inside = !inside;
    }
  }

  return inside;
}

/**
 * Calculates the shortest distance in metres from a point [lon, lat]
 * to the boundary edges of a polygon ring.
 */
export function distanceToPolygonBoundaryMeters(
  point: [number, number],
  polygonRing: [number, number][]
): number {
  if (!polygonRing || polygonRing.length < 2) {
    return Infinity;
  }

  const [px, py] = point;
  let minDistance = Infinity;

  for (let i = 0, j = polygonRing.length - 1; i < polygonRing.length; j = i++) {
    const [x1, y1] = polygonRing[j];
    const [x2, y2] = polygonRing[i];

    // Project points into local metric cartesian coordinates centered at point (px, py)
    const ax = (x1 - px) * METERS_PER_DEG_LON;
    const ay = (y1 - py) * METERS_PER_DEG_LAT;
    const bx = (x2 - px) * METERS_PER_DEG_LON;
    const by = (y2 - py) * METERS_PER_DEG_LAT;

    const dx = bx - ax;
    const dy = by - ay;
    const segLenSq = dx * dx + dy * dy;

    let dist: number;

    if (segLenSq === 0) {
      // Degenerate segment (point)
      dist = Math.sqrt(ax * ax + ay * ay);
    } else {
      // Projection of point (0, 0) onto segment AB:
      // t = - (A . (B - A)) / |B - A|^2
      const t = Math.max(0, Math.min(1, -(ax * dx + ay * dy) / segLenSq));
      const projX = ax + t * dx;
      const projY = ay + t * dy;
      dist = Math.sqrt(projX * projX + projY * projY);
    }

    if (dist < minDistance) {
      minDistance = dist;
    }
  }

  return minDistance;
}

export interface GeofenceEvaluationOptions {
  polygon?: CampusBoundaryPolygon;
  isSimulated?: boolean;
  /**
   * If true, bypasses the boundary approval guardrail (for testing or simulation previews)
   */
  bypassApprovalGuard?: boolean;
}

/**
 * Evaluates whether a GPS position is inside, outside, or uncertain relative to the campus boundary.
 *
 * Implements safety rules:
 * 1. Boundary Approval Guardrail: If real GPS is used and polygon is not approved,
 *    returns 'boundary_unapproved' with message "Campus boundary calibration pending."
 * 2. Accuracy Threshold: If GPS accuracy > 30m, position is UNCERTAIN.
 * 3. Boundary Overlap Rule: If distance to perimeter < accuracy radius, position is UNCERTAIN.
 * 4. Clear Decision: If distance to perimeter >= accuracy radius, returns INSIDE or OUTSIDE.
 */
export function evaluateCampusGeofence(
  latitude: number,
  longitude: number,
  accuracyMeters: number = 10,
  options: GeofenceEvaluationOptions = {}
): GeofenceEvaluation {
  const polygon = options.polygon || PROVISIONAL_CAMPUS_BOUNDARY;
  const isSimulated = options.isSimulated ?? false;
  const bypassApprovalGuard = options.bypassApprovalGuard ?? false;
  const isApproved = polygon.metadata.isApprovedForLiveNavigation;

  // Real-world GPS guardrail: Do not make live navigation assertions on unverified boundary
  if (!isSimulated && !isApproved && !bypassApprovalGuard) {
    return {
      status: 'boundary_unapproved',
      isInsidePolygon: false,
      distanceToBoundaryMeters: 0,
      accuracyMeters,
      confidence: 'unverified',
      userMessage: GEOFENCE_MESSAGES.BOUNDARY_UNAPPROVED,
      details: 'Provisional OSM boundary polygon (Way 35457616) has not been verified with cadastral or RTK-GNSS survey.',
      isSimulated,
      isApprovedForLiveNavigation: false
    };
  }

  const point: [number, number] = [longitude, latitude];
  const ring = polygon.coordinates;
  const isInside = isPointInPolygon(point, ring);
  const distance = distanceToPolygonBoundaryMeters(point, ring);

  let status: GeofenceStatus;
  let userMessage: string;
  let details: string;
  let confidence: 'high' | 'medium' | 'low' | 'unverified';

  // Rule 1: Insufficient satellite precision (>30m)
  if (accuracyMeters > GEOFENCE_THRESHOLDS.MAX_ACCURACY_THRESHOLD_METERS) {
    status = 'uncertain';
    confidence = 'low';
    userMessage = GEOFENCE_MESSAGES.UNCERTAIN;
    details = `GPS accuracy radius (±${accuracyMeters.toFixed(1)}m) exceeds reliable geofence threshold (${GEOFENCE_THRESHOLDS.MAX_ACCURACY_THRESHOLD_METERS}m).`;
  }
  // Rule 2: Uncertainty circle intersects boundary perimeter (distance < accuracy)
  else if (distance < accuracyMeters) {
    status = 'uncertain';
    confidence = 'medium';
    userMessage = GEOFENCE_MESSAGES.UNCERTAIN;
    details = `Position is ${distance.toFixed(1)}m from boundary, within GPS uncertainty radius of ±${accuracyMeters.toFixed(1)}m. Boundary overlap detected.`;
  }
  // Rule 3: Confidently inside
  else if (isInside) {
    status = 'inside';
    confidence = accuracyMeters <= GEOFENCE_THRESHOLDS.HIGH_CONFIDENCE_ACCURACY_METERS ? 'high' : 'medium';
    userMessage = GEOFENCE_MESSAGES.INSIDE;
    details = `Position is safely inside campus (${distance.toFixed(1)}m from perimeter, ±${accuracyMeters.toFixed(1)}m accuracy).`;
  }
  // Rule 4: Confidently outside
  else {
    status = 'outside';
    confidence = accuracyMeters <= GEOFENCE_THRESHOLDS.HIGH_CONFIDENCE_ACCURACY_METERS ? 'high' : 'medium';
    userMessage = GEOFENCE_MESSAGES.OUTSIDE;
    details = `Position is outside campus (${distance.toFixed(1)}m from perimeter, ±${accuracyMeters.toFixed(1)}m accuracy).`;
  }

  return {
    status,
    isInsidePolygon: isInside,
    distanceToBoundaryMeters: distance,
    accuracyMeters,
    confidence,
    userMessage,
    details,
    isSimulated,
    isApprovedForLiveNavigation: isApproved
  };
}
