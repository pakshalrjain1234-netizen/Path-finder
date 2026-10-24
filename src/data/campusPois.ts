import type { Point3 } from '../types/navigation'

export interface CampusServicePoi {
  id: string
  name: string
  category: 'Facility' | 'Services'
  aliases: string[]
  description: string
  locationDescription: string
  anchorPosition: Point3
  provisionalPosition: Point3
  status: 'provisional'
  isProvisional: boolean
  notes: string
  provisionalNotice: string
}

export const CAMPUS_SERVICE_POIS: CampusServicePoi[] = [
  {
    id: 'apollo-shine',
    name: 'Apollo Shine',
    category: 'Facility',
    aliases: [
      'Apollo Clinic',
      'Apollo Health',
      'Health Clinic',
      'Campus Health Center',
      'Student Wellness',
      'First Aid',
      'Medical Center',
    ],
    description:
      'Campus student wellness and first-aid healthcare clinic facility providing medical assistance.',
    locationDescription: 'Service frontage to the left (west) of Main Gate (Gate 1).',
    anchorPosition: [153.5, 3.8, -20.0],
    provisionalPosition: [153.5, 3.8, -20.0],
    status: 'provisional',
    isProvisional: true,
    notes:
      'Provisional Stage E3 3D placement in the service-frontage block west of the Main Entrance. Exact door coordinate and navigation node are pending physical surveyor verification.',
    provisionalNotice:
      'Provisional Stage E3 3D placement in the service-frontage block west of the Main Entrance. Exact door coordinate and navigation node are pending physical surveyor verification.',
  },
  {
    id: 'xerox-shop',
    name: 'Xerox Shop',
    category: 'Facility',
    aliases: [
      'Xerox Facility',
      'Photocopy Shop',
      'Reprographics',
      'Printing Center',
      'Printout',
      'Stationery Shop',
      'Xerox Center',
    ],
    description:
      'Campus student document copying, printing, and reprographic services facility.',
    locationDescription: 'Service frontage adjoining Apollo Shine west of Main Gate (Gate 1).',
    anchorPosition: [141.6, 3.8, -17.5],
    provisionalPosition: [141.6, 3.8, -17.5],
    status: 'provisional',
    isProvisional: true,
    notes:
      'Provisional Stage E3 3D placement adjoining Apollo Shine. Exact entrance coordinate and navigation routing are pending physical surveyor verification.',
    provisionalNotice:
      'Provisional Stage E3 3D placement adjoining Apollo Shine. Exact entrance coordinate and navigation routing are pending physical surveyor verification.',
  },
]

export function findCampusPoi(id: string): CampusServicePoi | undefined {
  return CAMPUS_SERVICE_POIS.find((poi) => poi.id === id)
}

export function searchCampusPois(query: string): CampusServicePoi[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  return CAMPUS_SERVICE_POIS.filter(
    (poi) =>
      poi.name.toLowerCase().includes(q) ||
      poi.category.toLowerCase().includes(q) ||
      poi.aliases.some((alias) => alias.toLowerCase().includes(q))
  )
}
