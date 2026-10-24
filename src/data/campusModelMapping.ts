export type CampusBuildingId =
  | 'mechanical-block'
  | 'it-block'
  | 'boys-hostel'
  | 'mnm-school-of-architecture'
  | 'main-block'
  | 'first-year-block'
  | 'civil-block'
  | 'l-shape-block'
  | 'physics-department'
  | 'english-department'
  | 'maths-department'
  | 'jain-mess'
  | 'non-jain-mess'
  | 'canteen'
  | 'open-air-theatre'
  | 'library'
  | 'apollo-shine'
  | 'xerox-shop'

export type FloorKey = 'G' | '1' | '2' | '3' | 'elevated'

export interface CampusModelMappingEntry {
  buildingId: CampusBuildingId
  displayName: string
  knownFloorLabel: string
  objectNames: string[]
  floorObjects: Partial<Record<FloorKey, string[]>>
  interactionObjects?: string[]
  indoorAvailable: boolean
}

export const CAMPUS_MODEL_CONFIG = {
  activeModelPath: '/models/MNMJEC_Campus_Stage_E3_Web.glb',
  rollbackModelPath: '/models/MNMJEC_Campus_Web.glb',
  activeVersion: 'Stage_E3' as const,
  modelName: 'MNMJEC_Campus_Stage_E3_Web.glb',
  fileSizeBytes: 2029316,
  sha256: 'E00597449DAF26C072F429213FD90F302F1556A9367C985137F4AB52641BDD7D',
} as const

export const campusModelMapping: CampusModelMappingEntry[] = [
  ...([
    {
      buildingId: 'mechanical-block',
      displayName: 'Mechanical Block',
      prefix: 'MECHANICAL_BLOCK',
      interactionObjects: [
        'MECHANICAL_BLOCK_ENTRANCE_ANCHOR',
        'MECHANICAL_ACCESS_EAST_CANOPY',
        'MECHANICAL_ACCESS_EAST_DOOR',
        'MECHANICAL_ACCESS_EAST_THRESHOLD',
        'MECHANICAL_ACCESS_EAST_APPROACH',
        'MECHANICAL_ACCESS_EAST_FRAME',
        'MECHANICAL_ACCESS_EAST_SIGN',
      ],
    },
    {
      buildingId: 'it-block',
      displayName: 'IT Block',
      prefix: 'IT_BLOCK',
      interactionObjects: [
        'IT_BLOCK_ENTRANCE_ANCHOR',
        'IT_ACCESS_NORTH_CANOPY',
        'IT_ACCESS_NORTH_DOOR',
        'IT_ACCESS_NORTH_THRESHOLD',
        'IT_ACCESS_NORTH_APPROACH',
        'IT_ACCESS_NORTH_FRAME',
        'IT_ACCESS_NORTH_SIGN',
      ],
    },
    {
      buildingId: 'boys-hostel',
      displayName: 'Boys Hostel',
      prefix: 'BOYS_HOSTEL',
      interactionObjects: [
        'BOYS_HOSTEL_ENTRANCE_ANCHOR',
        'BOYS_HOSTEL_ENTRY_THRESHOLD',
      ],
    },
    {
      buildingId: 'mnm-school-of-architecture',
      displayName: 'MNM School of Architecture',
      prefix: 'MNM_SCHOOL_OF_ARCHITECTURE',
      interactionObjects: [
        'MNM_SCHOOL_OF_ARCHITECTURE_ENTRANCE_ANCHOR',
        'MNM_SCHOOL_OF_ARCHITECTURE_ENTRY_THRESHOLD',
      ],
    },
  ] as const).map(({ buildingId, displayName, prefix, interactionObjects }) => ({
    buildingId: buildingId as CampusBuildingId,
    displayName: displayName as string,
    knownFloorLabel: 'Floor count unverified',
    objectNames: [prefix + '_FOOTPRINT'],
    floorObjects: {},
    interactionObjects: [...interactionObjects],
    indoorAvailable: false,
  })),
  {
    buildingId: 'main-block',
    displayName: 'Main Block',
    knownFloorLabel: 'G+1',
    objectNames: ['MAIN_BLOCK_FLOOR_G', 'MAIN_BLOCK_FLOOR_1', 'MAIN_BLOCK_ROOF', 'MAIN_BLOCK_ENTRY_THRESHOLD', 'MAIN_BLOCK_ENTRANCE_PROVISIONAL'],
    floorObjects: {
      G: ['MAIN_BLOCK_FLOOR_G', 'MAIN_BLOCK_FLOOR_G_MESH', 'MAIN_BLOCK_FLOOR_G_MESH_1'],
      1: ['MAIN_BLOCK_FLOOR_1', 'MAIN_BLOCK_FLOOR_1_MESH', 'MAIN_BLOCK_FLOOR_1_MESH_1'],
    },
    interactionObjects: ['MAIN_BLOCK_ENTRANCE_ANCHOR', 'MAIN_ENTRANCE_MARKER', 'LABEL_MAIN_ENTRANCE', 'C_MAIN_BLOCK_ENTRY_SIGN'],
    indoorAvailable: true,
  },
  {
    buildingId: 'first-year-block',
    displayName: 'First Year Block',
    knownFloorLabel: 'G+3',
    objectNames: ['FIRST_YEAR_BLOCK_FLOOR_G', 'FIRST_YEAR_BLOCK_FLOOR_1', 'FIRST_YEAR_BLOCK_FLOOR_2', 'FIRST_YEAR_BLOCK_FLOOR_3', 'FIRST_YEAR_BLOCK_ROOF'],
    floorObjects: {
      G: ['FIRST_YEAR_BLOCK_FLOOR_G', 'FIRST_YEAR_BLOCK_FLOOR_G_MESH', 'FIRST_YEAR_BLOCK_FLOOR_G_MESH_1'],
      1: ['FIRST_YEAR_BLOCK_FLOOR_1', 'FIRST_YEAR_BLOCK_FLOOR_1_MESH', 'FIRST_YEAR_BLOCK_FLOOR_1_MESH_1'],
      2: ['FIRST_YEAR_BLOCK_FLOOR_2', 'FIRST_YEAR_BLOCK_FLOOR_2_MESH', 'FIRST_YEAR_BLOCK_FLOOR_2_MESH_1'],
      3: ['FIRST_YEAR_BLOCK_FLOOR_3', 'FIRST_YEAR_BLOCK_FLOOR_3_MESH', 'FIRST_YEAR_BLOCK_FLOOR_3_MESH_1'],
    },
    interactionObjects: [
      'FIRST_YEAR_BLOCK_ENTRANCE_ANCHOR',
      'FIRST_YEAR_ACCESS_EAST_CANOPY',
      'FIRST_YEAR_ACCESS_EAST_DOOR',
      'FIRST_YEAR_ACCESS_EAST_THRESHOLD',
      'FIRST_YEAR_ACCESS_EAST_APPROACH',
      'FIRST_YEAR_ACCESS_EAST_FRAME',
      'FIRST_YEAR_ACCESS_EAST_SIGN',
      'FIRST_YEAR_BLOCK_ENTRANCE_PROVISIONAL',
      'C_FIRST_YEAR_BLOCK_ENTRY_SIGN',
    ],
    indoorAvailable: true,
  },
  {
    buildingId: 'civil-block',
    displayName: 'Civil Block',
    knownFloorLabel: 'G+2',
    objectNames: ['CIVIL_BLOCK_FLOOR_G', 'CIVIL_BLOCK_FLOOR_1', 'CIVIL_BLOCK_FLOOR_2', 'CIVIL_BLOCK_ROOF'],
    floorObjects: {
      G: ['CIVIL_BLOCK_FLOOR_G', 'CIVIL_BLOCK_FLOOR_G_MESH', 'CIVIL_BLOCK_FLOOR_G_MESH_1'],
      1: ['CIVIL_BLOCK_FLOOR_1', 'CIVIL_BLOCK_FLOOR_1_MESH', 'CIVIL_BLOCK_FLOOR_1_MESH_1'],
      2: ['CIVIL_BLOCK_FLOOR_2', 'CIVIL_BLOCK_FLOOR_2_MESH', 'CIVIL_BLOCK_FLOOR_2_MESH_1'],
    },
    interactionObjects: [
      'CIVIL_BLOCK_ENTRANCE_ANCHOR',
      'CIVIL_BLOCK_ENTRANCE_ANCHOR_02',
      'CIVIL_ACCESS_WEST_LOWER_CANOPY',
      'CIVIL_ACCESS_WEST_LOWER_DOOR',
      'CIVIL_ACCESS_WEST_LOWER_THRESHOLD',
      'CIVIL_ACCESS_WEST_UPPER_CANOPY',
      'CIVIL_ACCESS_WEST_UPPER_DOOR',
      'CIVIL_ACCESS_WEST_UPPER_THRESHOLD',
      'CIVIL_BLOCK_ENTRANCE_PROVISIONAL',
      'C_CIVIL_BLOCK_ENTRY_SIGN',
    ],
    indoorAvailable: true,
  },
  {
    buildingId: 'l-shape-block',
    displayName: 'L Shape Block',
    knownFloorLabel: 'G+2',
    objectNames: ['L_SHAPE_BLOCK_FLOOR_G', 'L_SHAPE_BLOCK_FLOOR_1', 'L_SHAPE_BLOCK_FLOOR_2', 'L_SHAPE_BLOCK_ROOF'],
    floorObjects: {
      G: ['L_SHAPE_BLOCK_FLOOR_G', 'L_SHAPE_BLOCK_FLOOR_G_MESH', 'L_SHAPE_BLOCK_FLOOR_G_MESH_1'],
      1: ['L_SHAPE_BLOCK_FLOOR_1', 'L_SHAPE_BLOCK_FLOOR_1_MESH', 'L_SHAPE_BLOCK_FLOOR_1_MESH_1'],
      2: ['L_SHAPE_BLOCK_FLOOR_2', 'L_SHAPE_BLOCK_FLOOR_2_MESH', 'L_SHAPE_BLOCK_FLOOR_2_MESH_1'],
    },
    interactionObjects: [
      'L_SHAPE_BLOCK_ENTRANCE_ANCHOR',
      'L_SHAPE_ACCESS_INNER_WEST_CANOPY',
      'L_SHAPE_ACCESS_INNER_WEST_DOOR',
      'L_SHAPE_ACCESS_INNER_WEST_THRESHOLD',
      'L_SHAPE_ACCESS_INNER_WEST_APPROACH',
      'L_SHAPE_ACCESS_INNER_WEST_FRAME',
      'L_SHAPE_ACCESS_INNER_WEST_SIGN',
      'L_SHAPE_BLOCK_ENTRANCE_PROVISIONAL',
      'C_L_SHAPE_BLOCK_ENTRY_SIGN',
    ],
    indoorAvailable: true,
  },
  {
    buildingId: 'physics-department',
    displayName: 'Physics Department',
    knownFloorLabel: 'Single elevated occupied level',
    objectNames: ['PHYSICS_DEPARTMENT_FLOOR_ELEVATED', 'PHYSICS_DEPARTMENT_ROOF'],
    floorObjects: {
      elevated: ['PHYSICS_DEPARTMENT_FLOOR_ELEVATED', 'PHYSICS_DEPARTMENT_FLOOR_ELEVATED_MESH', 'PHYSICS_DEPARTMENT_FLOOR_ELEVATED_MESH_1'],
    },
    interactionObjects: ['PHYSICS_DEPARTMENT_ENTRANCE_ANCHOR', 'PHYSICS_DEPARTMENT_ENTRANCE_PROVISIONAL', 'C_PHYSICS_DEPARTMENT_ENTRY_SIGN'],
    indoorAvailable: false,
  },
  {
    buildingId: 'english-department',
    displayName: 'English Department',
    knownFloorLabel: 'Single elevated occupied level',
    objectNames: ['ENGLISH_DEPARTMENT_FLOOR_ELEVATED', 'ENGLISH_DEPARTMENT_ROOF'],
    floorObjects: {
      elevated: ['ENGLISH_DEPARTMENT_FLOOR_ELEVATED', 'ENGLISH_DEPARTMENT_FLOOR_ELEVATED_MESH', 'ENGLISH_DEPARTMENT_FLOOR_ELEVATED_MESH_1'],
    },
    interactionObjects: ['ENGLISH_DEPARTMENT_ENTRANCE_ANCHOR', 'ENGLISH_DEPARTMENT_ENTRANCE_PROVISIONAL', 'C_ENGLISH_DEPARTMENT_ENTRY_SIGN'],
    indoorAvailable: false,
  },
  {
    buildingId: 'maths-department',
    displayName: 'Maths Department',
    knownFloorLabel: 'Ground only',
    objectNames: ['MATHS_DEPARTMENT_FLOOR_G', 'MATHS_DEPARTMENT_ROOF'],
    floorObjects: {
      G: ['MATHS_DEPARTMENT_FLOOR_G', 'MATHS_DEPARTMENT_FLOOR_G_MESH', 'MATHS_DEPARTMENT_FLOOR_G_MESH_1'],
    },
    interactionObjects: ['MATHS_DEPARTMENT_ENTRANCE_ANCHOR', 'MATHS_DEPARTMENT_ENTRANCE_PROVISIONAL', 'C_MATHS_DEPARTMENT_ENTRY_SIGN'],
    indoorAvailable: false,
  },
  {
    buildingId: 'jain-mess',
    displayName: 'Jain Mess',
    knownFloorLabel: 'Ground only',
    objectNames: ['JAIN_MESS_FLOOR_G', 'JAIN_MESS_ROOF'],
    floorObjects: {
      G: ['JAIN_MESS_FLOOR_G', 'JAIN_MESS_FLOOR_G_MESH', 'JAIN_MESS_FLOOR_G_MESH_1'],
    },
    interactionObjects: ['JAIN_MESS_ENTRANCE_ANCHOR', 'JAIN_MESS_ENTRANCE_PROVISIONAL', 'C_JAIN_MESS_ENTRY_SIGN'],
    indoorAvailable: false,
  },
  {
    buildingId: 'non-jain-mess',
    displayName: 'Non-Jain Mess',
    knownFloorLabel: 'Ground only',
    objectNames: ['NON_JAIN_MESS_FLOOR_G', 'NON_JAIN_MESS_ROOF'],
    floorObjects: {
      G: ['NON_JAIN_MESS_FLOOR_G', 'NON_JAIN_MESS_FLOOR_G_MESH', 'NON_JAIN_MESS_FLOOR_G_MESH_1'],
    },
    interactionObjects: ['NON_JAIN_MESS_ENTRANCE_ANCHOR', 'NON_JAIN_MESS_ENTRANCE_PROVISIONAL', 'C_NON_JAIN_MESS_ENTRY_SIGN'],
    indoorAvailable: false,
  },
  {
    buildingId: 'canteen',
    displayName: 'Canteen',
    knownFloorLabel: 'Ground only',
    objectNames: ['CANTEEN_FLOOR_G', 'CANTEEN_ROOF'],
    floorObjects: {
      G: ['CANTEEN_FLOOR_G', 'CANTEEN_FLOOR_G_MESH', 'CANTEEN_FLOOR_G_MESH_1'],
    },
    interactionObjects: [
      'CANTEEN_ENTRANCE_ANCHOR',
      'CANTEEN_ACCESS_NORTH_CANOPY',
      'CANTEEN_ACCESS_NORTH_DOOR',
      'CANTEEN_ACCESS_NORTH_THRESHOLD',
      'CANTEEN_ACCESS_NORTH_FRAME',
      'CANTEEN_ACCESS_NORTH_SIGN',
      'CANTEEN_ENTRANCE_PROVISIONAL',
      'C_CANTEEN_ENTRY_SIGN',
    ],
    indoorAvailable: false,
  },
  {
    buildingId: 'open-air-theatre',
    displayName: 'Open Air Theatre',
    knownFloorLabel: 'Outdoor Amphitheatre',
    objectNames: ['OAT_FOOTPRINT', 'C_OAT_STAGE_PROVISIONAL', 'C_OAT_CURVED_SEATING_PROVISIONAL', 'C_OAT_STAGE_STEPS'],
    floorObjects: {},
    interactionObjects: ['C_EDGE_WALK_OAT', 'WALK_OAT'],
    indoorAvailable: false,
  },
  {
    buildingId: 'library',
    displayName: 'Dr. C. L. Mehta Central Library',
    knownFloorLabel: 'Provisional single-floor hall',
    objectNames: [
      'E2_LIBRARY_152_BASE_SLAB',
      'E2_LIBRARY_152_FLAT_ROOF',
      'E2_LIBRARY_152_SHELL',
    ],
    floorObjects: {
      G: ['E2_LIBRARY_152_BASE_SLAB', 'E2_LIBRARY_152_SHELL', 'E2_LIBRARY_152_FLAT_ROOF'],
    },
    interactionObjects: [
      'E2_LIBRARY_152_BASE_SLAB',
      'E2_LIBRARY_152_FLAT_ROOF',
      'E2_LIBRARY_152_SHELL',
    ],
    indoorAvailable: false,
  },
]

export const campusModelMapById: Record<CampusBuildingId, CampusModelMappingEntry> = {
  ...Object.fromEntries(campusModelMapping.map((entry) => [entry.buildingId, entry])),
  'apollo-shine': {
    buildingId: 'apollo-shine',
    displayName: 'Apollo Shine',
    knownFloorLabel: 'Provisional wellness clinic facility',
    objectNames: ['E2_APOLLO_BUILDING', 'E2_APOLLO_BUILDING_MESH'],
    floorObjects: { G: ['E2_APOLLO_BUILDING'] },
    interactionObjects: ['E2_APOLLO_BUILDING'],
    indoorAvailable: false,
  },
  'xerox-shop': {
    buildingId: 'xerox-shop',
    displayName: 'Xerox Shop',
    knownFloorLabel: 'Provisional reprographics facility',
    objectNames: ['E2_XEROX_SHOP', 'E2_XEROX_SHOP_MESH'],
    floorObjects: { G: ['E2_XEROX_SHOP'] },
    interactionObjects: ['E2_XEROX_SHOP'],
    indoorAvailable: false,
  },
} as Record<CampusBuildingId, CampusModelMappingEntry>

export const campusObjectToBuildingId = new Map<string, CampusBuildingId>(
  Object.values(campusModelMapById).flatMap((entry) => entry.objectNames.concat(entry.interactionObjects ?? [], Object.values(entry.floorObjects).flat()).map((name) => [name, entry.buildingId] as const)),
)

// Exterior meshes (windows, roof edges, canopies) use the same authored prefix.
// glTF material primitives can be children of a named floor; callers walk parents too.
export function resolveCampusBuilding(name: string): CampusBuildingId | null {
  const exact = campusObjectToBuildingId.get(name)
  if (exact) return exact

  // Specific corrected entrance and reconstructed prefix routing
  if (name.startsWith('MECHANICAL_ACCESS_')) return 'mechanical-block'
  if (name.startsWith('IT_ACCESS_')) return 'it-block'
  if (name.startsWith('CIVIL_ACCESS_')) return 'civil-block'
  if (name.startsWith('FIRST_YEAR_ACCESS_')) return 'first-year-block'
  if (name.startsWith('L_SHAPE_ACCESS_')) return 'l-shape-block'
  if (name.startsWith('CANTEEN_ACCESS_')) return 'canteen'
  if (name.startsWith('E2_ARCHITECTURE_')) return 'mnm-school-of-architecture'
  if (name.startsWith('E2_BOYS_HOSTEL_')) return 'boys-hostel'
  if (name.startsWith('E2_CIVIL_')) return 'civil-block'
  if (name.startsWith('E2_LIBRARY_') || name.startsWith('LIBRARY_') || name.includes('LIBRARY')) return 'library'
  if (name.startsWith('E2_APOLLO_') || name.includes('APOLLO')) return 'apollo-shine'
  if (name.startsWith('E2_XEROX_') || name.includes('XEROX')) return 'xerox-shop'

  for (const entry of campusModelMapping) {
    const prefix = entry.buildingId.replaceAll('-', '_').toUpperCase()
    if (
      name.startsWith(prefix + '_') ||
      name.startsWith('C_' + prefix + '_') ||
      name.startsWith('C_WIN_' + prefix + '_') ||
      name.includes('_' + prefix + '_') ||
      name.endsWith('_' + prefix)
    ) {
      return entry.buildingId
    }
  }
  return null
}

export function getKnownFloorCount(buildingId: CampusBuildingId) {
  return campusModelMapById[buildingId].knownFloorLabel
}
