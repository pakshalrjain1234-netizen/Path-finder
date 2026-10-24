import type { Point3 } from '../types/navigation'

/**
 * Certified MNMJEC outdoor survey reference landmarks
 * Stage E3 local [X, Y, Z] model coordinates from certified Blender geometry
 */
export const OFFICIAL_SURVEY_TARGETS: Array<{
  id: string
  name: string
  modelPosition: Point3
  description: string
}> = [
  {
    id: 'target-main-gate-1',
    name: 'Main Entrance (Gate 1 - East)',
    modelPosition: [181.0, 0.25, -6.2],
    description: 'Central vehicular gate pillars facing Rajiv Gandhi Salai (OMR).',
  },
  {
    id: 'target-main-block',
    name: 'Main Block Entrance Portico',
    modelPosition: [203.2, 0.25, -26.0],
    description: 'Ground floor administration portico steps and main academic foyer.',
  },
  {
    id: 'target-mech-block',
    name: 'Mechanical Block Walkway Portal',
    modelPosition: [88.5, 0.25, -56.2],
    description: 'North-East pedestrian entrance facing central avenue.',
  },
  {
    id: 'target-first-year-block',
    name: 'First Year Block Quad Entrance',
    modelPosition: [140.0, 0.25, -35.0],
    description: 'Covered foyer entrance adjacent to foundational lecture halls.',
  },
  {
    id: 'target-civil-block',
    name: 'Civil Block Entrance Steps',
    modelPosition: [122.0, 0.25, -84.0],
    description: 'Ground floor main laboratory entrance walkway.',
  },
  {
    id: 'target-canteen-plaza',
    name: 'Central Dining Plaza Veranda',
    modelPosition: [142.0, 0.25, -125.0],
    description: 'Outdoor paved courtyard and cafeteria approach.',
  },
  {
    id: 'target-boys-hostel',
    name: 'Boys Hostel Approach Gate',
    modelPosition: [165.0, 0.25, -180.0],
    description: 'South campus residential walkway entry.',
  },
  {
    id: 'target-west-gate-2',
    name: 'West Gate (Gate 2 - Rear)',
    modelPosition: [40.0, 0.25, -188.0],
    description: 'Secondary western perimeter gate and service lane.',
  },
]
