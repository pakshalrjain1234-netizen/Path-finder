import type { Point3 } from '../types/navigation'

export interface CampusLandmark {
  id: string
  label: string
  fallbackPosition: Point3
  type: 'entrance' | 'academic' | 'facility' | 'department'
  priorityTier: 1 | 2 | 3
}

export const CAMPUS_LANDMARKS: CampusLandmark[] = [
  // Tier 1: Major Academic Blocks & Main Gate (Visible across all zoom levels)
  { id: 'main-gate-1', label: 'Main Entrance (Gate 1)', fallbackPosition: [181.0, 2.2, -6.2], type: 'entrance', priorityTier: 1 },
  { id: 'main-block', label: 'Main Block', fallbackPosition: [193.5, 7.5, -65.8], type: 'academic', priorityTier: 1 },
  { id: 'first-year-block', label: 'First Year Block', fallbackPosition: [166.8, 14.0, -73.1], type: 'academic', priorityTier: 1 },
  { id: 'civil-block', label: 'Civil Block', fallbackPosition: [144.5, 11.0, -68.2], type: 'academic', priorityTier: 1 },
  { id: 'it-block', label: 'IT Block', fallbackPosition: [96.9, 4.0, -50.5], type: 'academic', priorityTier: 1 },
  { id: 'mechanical-block', label: 'Mechanical Block', fallbackPosition: [56.9, 4.0, -75.6], type: 'academic', priorityTier: 1 },
  { id: 'mnm-school-of-architecture', label: 'School of Architecture', fallbackPosition: [18.3, 4.0, -123.1], type: 'academic', priorityTier: 1 },

  // Tier 2: Key Campus Facilities, Central Library & West Gate (Visible in Medium & Close zoom, or when selected)
  { id: 'library', label: 'Central Library', fallbackPosition: [193.5, 8.8, -73.1], type: 'facility', priorityTier: 2 },
  { id: 'canteen', label: 'Canteen', fallbackPosition: [37.3, 4.5, -9.1], type: 'facility', priorityTier: 2 },
  { id: 'boys-hostel', label: 'Boys Hostel', fallbackPosition: [29.7, 4.0, -191.0], type: 'facility', priorityTier: 2 },
  { id: 'l-shape-block', label: 'L Shape Block', fallbackPosition: [222.5, 10.1, -90.3], type: 'academic', priorityTier: 2 },
  { id: 'open-air-theatre', label: 'Open Air Theatre', fallbackPosition: [227.5, 2.5, -60.9], type: 'facility', priorityTier: 2 },
  { id: 'west-entrance', label: 'Gate 2 (West Entrance)', fallbackPosition: [54.2, 3.7, -99.5], type: 'entrance', priorityTier: 2 },

  // Tier 3: Specific Departments & Dining Halls (Visible in Close zoom, or when selected)
  { id: 'physics-department', label: 'Physics Dept', fallbackPosition: [14.4, 7.5, -53.3], type: 'department', priorityTier: 3 },
  { id: 'english-department', label: 'English Dept', fallbackPosition: [70.7, 7.5, -31.0], type: 'department', priorityTier: 3 },
  { id: 'maths-department', label: 'Maths Dept', fallbackPosition: [96.7, 4.5, -31.6], type: 'department', priorityTier: 3 },
  { id: 'jain-mess', label: 'Jain Mess', fallbackPosition: [40.3, 4.5, -31.3], type: 'facility', priorityTier: 3 },
  { id: 'non-jain-mess', label: 'Non-Jain Mess', fallbackPosition: [13.4, 4.5, -31.3], type: 'facility', priorityTier: 3 },
]

export type LabelVisibilityMode = 'all' | 'major' | 'selected'

/**
 * Determines whether a landmark label should be rendered based on user selection,
 * hover state, camera distance zoom tier, and active LabelVisibilityMode.
 *
 * - 'all': displays all known, correctly mapped campus labels.
 * - 'major': displays important blocks & entrances with intelligent decluttering (default).
 * - 'selected': displays only the currently selected building label.
 */
export function isLandmarkVisible(
  landmark: CampusLandmark,
  selectedId: string | null | undefined,
  hoveredId: string | null | undefined,
  zoomTier: 1 | 2 | 3,
  visibilityMode: LabelVisibilityMode = 'major',
  categoryFilter: string = 'All'
): boolean {
  const isSelected = Boolean(selectedId && landmark.id === selectedId)
  const isHovered = Boolean(hoveredId && landmark.id === hoveredId)

  // Selected or hovered label ALWAYS prioritized and visible
  if (isSelected || isHovered) {
    return true
  }

  // In SELECTED ONLY mode: only show selected or hovered label
  if (visibilityMode === 'selected') {
    return false
  }

  // Category filter refinement
  if (categoryFilter && categoryFilter !== 'All') {
    const matchesCategory =
      (categoryFilter === 'Academic' && landmark.type === 'academic') ||
      (categoryFilter === 'Department' && landmark.type === 'department') ||
      (categoryFilter === 'Facility' && (landmark.type === 'facility' || landmark.type === 'entrance'))
    if (!matchesCategory) {
      return false
    }
  }

  // In ALL PLACES mode: display all known correctly mapped campus labels matching category
  if (visibilityMode === 'all') {
    return true
  }

  // In MAJOR BLOCKS mode (default):
  // Declutter based on zoom tier
  return landmark.priorityTier <= zoomTier
}

/**
 * Compute the LOD zoom tier from camera distance using hysteresis to prevent jitter.
 */
export function calculateZoomTierWithHysteresis(
  distance: number,
  currentTier: 1 | 2 | 3,
  isMobile: boolean = false
): 1 | 2 | 3 {
  let next = currentTier

  if (currentTier === 1) {
    if (distance < 155) next = 2
  } else if (currentTier === 2) {
    if (distance > 185) next = 1
    else if (distance < 80) next = 3
  } else if (currentTier === 3) {
    if (distance > 95) next = 2
  }

  // On compact mobile viewports, keep conservative view until closer
  if (isMobile && next === 2 && distance > 120) {
    next = 1
  }

  return next
}
