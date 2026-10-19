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

export type KnownFloor = {
  status: 'known'
  label: string
}

export type UnknownFloor = {
  status: 'unknown'
  label: 'Unknown'
}

export type FloorInfo = KnownFloor | UnknownFloor

export interface Building {
  id: string
  name: string
  category: string
  floorInfo: FloorInfo
  notes?: string
}

