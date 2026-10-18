import type { Building } from '../types/campus'

export const buildings: Building[] = [
  { id: 'mechanical-block', name: 'Mechanical Block', category: 'Academic', floorInfo: { status: 'unknown', label: 'Unknown' } },
  { id: 'it-block', name: 'IT Block', category: 'Academic', floorInfo: { status: 'unknown', label: 'Unknown' } },
  { id: 'boys-hostel', name: 'Boys Hostel', category: 'Facility', floorInfo: { status: 'unknown', label: 'Unknown' } },
  { id: 'mnm-school-of-architecture', name: 'MNM School of Architecture', category: 'Academic', floorInfo: { status: 'unknown', label: 'Unknown' } },
  { id: 'main-block', name: 'Main Block', category: 'Academic', floorInfo: { status: 'known', label: 'G+1' } },
  { id: 'first-year-block', name: 'First Year Block', category: 'Academic', floorInfo: { status: 'known', label: 'G+3' } },
  { id: 'civil-block', name: 'Civil Block', category: 'Academic', floorInfo: { status: 'known', label: 'G+2' } },
  { id: 'l-shape-block', name: 'L Shape Block', category: 'Academic', floorInfo: { status: 'known', label: 'G+2' } },
  {
    id: 'physics-department',
    name: 'Physics Department',
    category: 'Department',
    floorInfo: { status: 'known', label: 'Single elevated occupied level' },
  },
  {
    id: 'english-department',
    name: 'English Department',
    category: 'Department',
    floorInfo: { status: 'known', label: 'Single elevated occupied level' },
  },
  { id: 'maths-department', name: 'Maths Department', category: 'Department', floorInfo: { status: 'known', label: 'Ground only' } },
  { id: 'jain-mess', name: 'Jain Mess', category: 'Facility', floorInfo: { status: 'known', label: 'Ground only' } },
  {
    id: 'non-jain-mess',
    name: 'Non-Jain Mess',
    category: 'Facility',
    floorInfo: { status: 'known', label: 'Ground only' },
  },
  { id: 'canteen', name: 'Canteen', category: 'Facility', floorInfo: { status: 'known', label: 'Ground only' } },
  {
    id: 'library',
    name: 'Library',
    category: 'Facility',
    floorInfo: { status: 'known', label: 'Ground only' },
    notes: 'Exact model position pending verification.',
  },
]

export const buildingIndex: Record<string, Building> = Object.fromEntries(buildings.map((building) => [building.id, building]))
