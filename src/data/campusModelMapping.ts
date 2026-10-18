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

export const campusModelMapping: CampusModelMappingEntry[] = [
  ...[
    ['mechanical-block', 'Mechanical Block', 'MECHANICAL_BLOCK'],
    ['it-block', 'IT Block', 'IT_BLOCK'],
    ['boys-hostel', 'Boys Hostel', 'BOYS_HOSTEL'],
    ['mnm-school-of-architecture', 'MNM School of Architecture', 'MNM_SCHOOL_OF_ARCHITECTURE'],
  ].map(([buildingId, displayName, prefix]) => ({
    buildingId: buildingId as CampusBuildingId,
    displayName,
    knownFloorLabel: 'Floor count unverified',
    objectNames: [prefix + '_FOOTPRINT'],
    floorObjects: {},
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
    interactionObjects: ['FIRST_YEAR_BLOCK_ENTRANCE_ANCHOR', 'FIRST_YEAR_BLOCK_ENTRANCE_PROVISIONAL', 'C_FIRST_YEAR_BLOCK_ENTRY_SIGN'],
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
    interactionObjects: ['CIVIL_BLOCK_ENTRANCE_ANCHOR', 'CIVIL_BLOCK_ENTRANCE_PROVISIONAL', 'C_CIVIL_BLOCK_ENTRY_SIGN'],
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
    interactionObjects: ['L_SHAPE_BLOCK_ENTRANCE_ANCHOR', 'L_SHAPE_BLOCK_ENTRANCE_PROVISIONAL', 'C_L_SHAPE_BLOCK_ENTRY_SIGN'],
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
    interactionObjects: ['CANTEEN_ENTRANCE_ANCHOR', 'CANTEEN_ENTRANCE_PROVISIONAL', 'C_CANTEEN_ENTRY_SIGN'],
    indoorAvailable: false,
  },
]

export const campusModelMapById = Object.fromEntries(campusModelMapping.map((entry) => [entry.buildingId, entry])) as Record<CampusBuildingId, CampusModelMappingEntry>

export const campusObjectToBuildingId = new Map<string, CampusBuildingId>(
  campusModelMapping.flatMap((entry) => entry.objectNames.concat(entry.interactionObjects ?? [], Object.values(entry.floorObjects).flat()).map((name) => [name, entry.buildingId] as const)),
)

// Exterior meshes (windows, roof edges, canopies) use the same authored prefix.
// glTF material primitives can be children of a named floor; callers walk parents too.
export function resolveCampusBuilding(name: string): CampusBuildingId | null {
  const exact = campusObjectToBuildingId.get(name)
  if (exact) return exact
  for (const entry of campusModelMapping) {
    const prefix = entry.buildingId.replaceAll('-', '_').toUpperCase()
    if (name.startsWith(prefix + '_') || name.startsWith('C_' + prefix + '_') || name.startsWith('C_WIN_' + prefix + '_')) return entry.buildingId
  }
  return null
}

export function getKnownFloorCount(buildingId: CampusBuildingId) {
  return campusModelMapById[buildingId].knownFloorLabel
}
