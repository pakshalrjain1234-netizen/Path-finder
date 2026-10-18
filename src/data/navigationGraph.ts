import { campusModelMapById, type CampusBuildingId } from './campusModelMapping'
import type { NavigationEdge, NavigationGraph, NavigationNode, Point3 } from '../types/navigation'

function point(x: number, y: number, z: number): Point3 {
  return [x, y, z]
}

function entranceNote(label: string) {
  return `${label} entrance pending verification.`
}

const campusEntranceBuildingMap: Array<[string, CampusBuildingId, string, Point3, 'verified' | 'provisional', string?]> = [
  ['main-gate-1', 'main-block', 'Main Entrance (Gate 1)', point(181, 0.2, -6.2), 'verified', 'Main gate marker extracted from the GLB.'],
  ['west-entrance', 'boys-hostel', 'West Entrance', point(54.4, 0.2, -97.8), 'verified', 'West gate marker extracted from the GLB.'],
  ['ground-entrance', 'main-block', 'Ground Entrance', point(113.4, 0.2, -93.4), 'verified', 'Ground entrance marker extracted from the GLB.'],
  ['main-block-approach', 'main-block', 'Main Block', point(193.6, 1.35, -57.188), 'provisional', entranceNote('Main Block')],
  ['first-year-approach', 'first-year-block', 'First Year Block', point(166.8, 1.35, -64.788), 'provisional', entranceNote('First Year Block')],
  ['civil-approach', 'civil-block', 'Civil Block', point(144.6, 1.35, -54.788), 'provisional', entranceNote('Civil Block')],
  ['it-entrance', 'it-block', 'IT Block', point(96.8, 0.2, -45.8), 'verified', 'IT Block entrance anchor extracted from the GLB.'],
  ['l-shape-approach', 'l-shape-block', 'L Shape Block', point(165.8, 1.35, -85.588), 'provisional', entranceNote('L Shape Block')],
  ['physics-approach', 'physics-department', 'Physics Department', point(14.2, 4.65, -47.788), 'verified', 'Physics Department entrance anchor extracted from the GLB.'],
  ['english-approach', 'english-department', 'English Department', point(70.6, 4.65, -23.788), 'verified', 'English Department entrance anchor extracted from the GLB.'],
  ['maths-approach', 'maths-department', 'Maths Department', point(96.6, 1.35, -23.788), 'verified', 'Maths Department entrance anchor extracted from the GLB.'],
  ['jain-mess-approach', 'jain-mess', 'Jain Mess', point(40.4, 1.35, -23.788), 'verified', 'Jain Mess entrance anchor extracted from the GLB.'],
  ['non-jain-mess-approach', 'non-jain-mess', 'Non-Jain Mess', point(13.4, 1.35, -23.788), 'verified', 'Non-Jain Mess entrance anchor extracted from the GLB.'],
  ['canteen-gate', 'canteen', 'Canteen', point(37.4, 0.2, 0), 'verified', 'Canteen gate marker extracted from the GLB.'],
  ['canteen-approach', 'canteen', 'Canteen Approach', point(37.5, 0.0425, -1.4), 'verified', 'Walkway segment beside the canteen extracted from the GLB.'],
  ['mechanical-approach', 'mechanical-block', 'Mechanical Block', point(56.8, 1.025, -66.188), 'provisional', entranceNote('Mechanical Block')],
  ['architecture-approach', 'mnm-school-of-architecture', 'MNM School of Architecture', point(22.2, 1.025, -102.188), 'provisional', entranceNote('MNM School of Architecture')],
  ['boys-hostel-approach', 'boys-hostel', 'Boys Hostel', point(24.4, 1.025, -183.788), 'provisional', entranceNote('Boys Hostel')],
]

const campusWaypointNodes: Array<[string, string, Point3, 'verified' | 'provisional', string?]> = [
  ['central-road', 'Central Campus Road', point(172.8, 0.092, -61.7), 'verified', 'Central road connection toward the main entrance.'],
  ['walk-main', 'Main Block Walkway', point(193.7, 0.042, -51.6), 'verified', 'Authored walkway segment beside the main block.'],
  ['walk-first-year', 'First Year Block Walkway', point(166.5, 0.042, -55.4), 'verified', 'Authored walkway segment beside the first year block.'],
  ['walk-civil', 'Civil Block Walkway', point(145.2, 0.042, -50.4), 'verified', 'Authored walkway segment beside the civil block.'],
  ['walk-it', 'IT Block Walkway', point(96.6, 0.042, -46), 'verified', 'Authored walkway segment beside the IT block.'],
  ['walk-mess-departments', 'Departments Walkway', point(57.3, 0.042, -42.9), 'verified', 'Authored walkway segment linking the academic and mess zone.'],
  ['walk-jain', 'Jain Mess Walkway', point(40.2, 0.042, -22.8), 'verified', 'Authored walkway segment beside the Jain Mess.'],
  ['walk-non-jain', 'Non-Jain Mess Walkway', point(13.6, 0.042, -22.8), 'verified', 'Authored walkway segment beside the Non-Jain Mess.'],
  ['walk-canteen-north', 'Canteen North Walkway', point(51.8, 0.042, -19), 'verified', 'Authored walkway segment north of the canteen.'],
  ['walk-canteen-approach', 'Canteen Approach', point(37.5, 0.042, -1.4), 'verified', 'Authored walkway segment approaching the canteen.'],
  ['road-west-cross-campus', 'West Campus Road', point(58.5, 0.092, -93), 'verified', 'West-to-east road connection across the campus.'],
  ['road-north-south-link', 'North-South Link Road', point(74.9, 0.092, -109.6), 'verified', 'North-south road connection through the campus core.'],
  ['road-mechanical-south', 'Mechanical South Road', point(53.1, 0.092, -56.2), 'verified', 'Road connection near the mechanical block.'],
  ['road-mechanical-east', 'Mechanical East Road', point(99.9, 0.092, -72.6), 'verified', 'Road connection near the academic core.'],
  ['road-mechanical-west', 'Mechanical West Road', point(12.3, 0.092, -76), 'verified', 'Road connection near the mechanical block and western approach.'],
  ['road-hostel-to-ground', 'Hostel to Ground Road', point(59.3, 0.092, -152.4), 'verified', 'Road connection from the hostel zone to the lower campus.'],
  ['walk-english', 'English Approach Walkway', point(70.7, 0.042, -11.9), 'verified', 'Authored walkway segment beside the English Department.'],
  ['walk-architecture-east', 'Architecture East Walkway', point(38.6, 0.042, -105.5), 'verified', 'Authored walkway segment east of the architecture block.'],
  ['walk-architecture-south', 'Architecture South Walkway', point(22.3, 0.042, -99.6), 'verified', 'Authored walkway segment south of the architecture block.'],
  ['walk-l-shape', 'L Shape Block Walkway', point(165.8, 0.042, -84.2), 'verified', 'Authored walkway segment beside the L Shape block.'],
  ['walk-oat', 'Open Air Theatre Walkway', point(227.7, 0.042, -51.6), 'verified', 'Authored walkway segment toward the open air theatre area.'],
]

const campusNodes: NavigationNode[] = [
  ...campusEntranceBuildingMap.map(([id, buildingId, label, position, verificationStatus, notes]) => ({
    id,
    label,
    position,
    kind: id.endsWith('entrance') || id.endsWith('approach') ? 'destination' : 'start',
    buildingId,
    sourceObjectName:
      id === 'main-gate-1'
        ? 'MAIN_ENTRANCE_MARKER'
        : id === 'west-entrance'
          ? 'WEST_ENTRANCE_MARKER'
          : id === 'ground-entrance'
            ? 'GROUND_ENTRANCE_MARKER'
            : id === 'it-entrance'
              ? 'IT_BLOCK_ENTRANCE_ANCHOR'
              : id === 'physics-approach'
                ? 'PHYSICS_DEPARTMENT_ENTRANCE_ANCHOR'
                : id === 'english-approach'
                  ? 'ENGLISH_DEPARTMENT_ENTRANCE_ANCHOR'
                  : id === 'maths-approach'
                    ? 'MATHS_DEPARTMENT_ENTRANCE_ANCHOR'
                    : id === 'jain-mess-approach'
                      ? 'JAIN_MESS_ENTRANCE_ANCHOR'
                      : id === 'non-jain-mess-approach'
                        ? 'NON_JAIN_MESS_ENTRANCE_ANCHOR'
                        : id === 'canteen-gate'
                          ? 'CANTEEN_GATE_MARKER'
                          : id === 'mechanical-approach'
                            ? 'MECHANICAL_BLOCK_ENTRANCE_PROVISIONAL'
                            : id === 'architecture-approach'
                              ? 'MNM_SCHOOL_OF_ARCHITECTURE_ENTRANCE_PROVISIONAL'
                              : id === 'boys-hostel-approach'
                                ? 'BOYS_HOSTEL_ENTRANCE_PROVISIONAL'
                                : id === 'main-block-approach'
                                  ? 'MAIN_BLOCK_ENTRANCE_PROVISIONAL'
                                  : id === 'first-year-approach'
                                    ? 'FIRST_YEAR_BLOCK_ENTRANCE_PROVISIONAL'
                                    : id === 'civil-approach'
                                      ? 'CIVIL_BLOCK_ENTRANCE_PROVISIONAL'
                                      : id === 'l-shape-approach'
                                        ? 'L_SHAPE_BLOCK_ENTRANCE_PROVISIONAL'
                                        : id === 'canteen-approach'
                                          ? 'CANTEEN_ENTRANCE_PROVISIONAL'
                                          : 'UNKNOWN',
    verificationStatus,
    notes,
  })),
  ...campusWaypointNodes.map(([id, label, position, verificationStatus, notes]) => ({
    id,
    label,
    position,
    kind: 'waypoint',
    sourceObjectName:
      id === 'central-road'
        ? 'ROAD_CENTRAL_AND_MAIN_ENTRANCE'
        : id === 'walk-main'
          ? 'WALK_MAIN'
          : id === 'walk-first-year'
            ? 'WALK_FIRST_YEAR'
            : id === 'walk-civil'
              ? 'WALK_CIVIL'
              : id === 'walk-it'
                ? 'WALK_IT'
                : id === 'walk-mess-departments'
                  ? 'WALK_MESS_DEPARTMENTS'
                  : id === 'walk-jain'
                    ? 'WALK_JAIN_MESS'
                    : id === 'walk-non-jain'
                      ? 'WALK_NON_JAIN_MESS'
                      : id === 'walk-canteen-north'
                        ? 'WALK_CANTEEN_NORTH'
                        : id === 'walk-canteen-approach'
                          ? 'WALK_CANTEEN_APPROACH'
                          : id === 'road-west-cross-campus'
                            ? 'ROAD_WEST_CROSS_CAMPUS'
                            : id === 'road-north-south-link'
                              ? 'ROAD_NORTH_SOUTH_LINK'
                              : id === 'road-mechanical-south'
                                ? 'ROAD_MECHANICAL_SOUTH'
                                : id === 'road-mechanical-east'
                                  ? 'ROAD_MECHANICAL_EAST'
                                  : id === 'road-mechanical-west'
                                    ? 'ROAD_MECHANICAL_WEST'
                                    : id === 'road-hostel-to-ground'
                                      ? 'ROAD_HOSTEL_TO_GROUND'
                                      : id === 'walk-english'
                                        ? 'WALK_ENGLISH_APPROACH'
                                        : id === 'walk-architecture-east'
                                          ? 'WALK_ARCHITECTURE_EAST'
                                          : id === 'walk-architecture-south'
                                            ? 'WALK_ARCHITECTURE_SOUTH'
                                            : id === 'walk-l-shape'
                                              ? 'WALK_L_SHAPE_ENTRANCE'
                                              : id === 'walk-oat'
                                                ? 'WALK_OAT'
                                                : 'UNKNOWN',
    verificationStatus,
    notes,
  })),
]

const campusNodeById = new Map(campusNodes.map((node) => [node.id, node] as const))

function edge(from: string, to: string, verificationStatus: 'verified' | 'provisional', notes?: string): NavigationEdge {
  return {
    id: `${from}__${to}`,
    from,
    to,
    sourceObjectName: `${from}↔${to}`,
    verificationStatus,
    notes,
  }
}

const campusEdges: NavigationEdge[] = [
  edge('main-gate-1', 'central-road', 'verified', 'Main gate marker connected to the central campus road.'),
  edge('central-road', 'walk-main', 'verified', 'Central road connects into the main block walkway.'),
  edge('walk-main', 'main-block-approach', 'provisional', 'Main block entrance position remains pending verification.'),
  edge('central-road', 'main-block-approach', 'provisional', 'Route into the main block entrance is surveyed but not fully verified.'),
  edge('walk-main', 'walk-first-year', 'verified', 'Surveyed walkway between the main block and the first year block.'),
  edge('walk-first-year', 'first-year-approach', 'provisional', 'First Year Block entrance position remains pending verification.'),
  edge('walk-first-year', 'walk-civil', 'verified', 'Surveyed walkway toward the civil block.'),
  edge('walk-civil', 'civil-approach', 'provisional', 'Civil block entrance position remains pending verification.'),
  edge('walk-civil', 'walk-it', 'verified', 'Surveyed connection from civil to IT.'),
  edge('walk-it', 'it-entrance', 'verified', 'IT Block entrance anchor is identifiable in the GLB.'),
  edge('walk-it', 'walk-mess-departments', 'verified', 'Surveyed connection into the departments and mess zone.'),
  edge('walk-mess-departments', 'jain-mess-approach', 'verified', 'Surveyed approach to the Jain Mess.'),
  edge('walk-mess-departments', 'non-jain-mess-approach', 'verified', 'Surveyed approach to the Non-Jain Mess.'),
  edge('walk-mess-departments', 'maths-approach', 'verified', 'Surveyed approach to the Maths Department.'),
  edge('walk-mess-departments', 'english-approach', 'verified', 'Surveyed approach to the English Department.'),
  edge('walk-mess-departments', 'physics-approach', 'verified', 'Surveyed approach to the Physics Department.'),
  edge('walk-mess-departments', 'walk-canteen-north', 'verified', 'Surveyed connection toward the canteen zone.'),
  edge('walk-canteen-north', 'walk-canteen-approach', 'verified', 'Surveyed connection into the canteen approach.'),
  edge('walk-canteen-approach', 'canteen-gate', 'verified', 'Canteen gate marker is identifiable in the GLB.'),
  edge('road-west-cross-campus', 'west-entrance', 'verified', 'West entrance connects into the west campus road.'),
  edge('road-west-cross-campus', 'road-north-south-link', 'verified', 'West campus road meets the north-south link.'),
  edge('road-north-south-link', 'ground-entrance', 'verified', 'North-south link reaches the ground entrance marker.'),
  edge('road-west-cross-campus', 'road-mechanical-south', 'verified', 'West campus road connects to the mechanical south road.'),
  edge('road-mechanical-south', 'mechanical-approach', 'verified', 'Mechanical block entrance anchor is identifiable in the GLB.'),
  edge('road-mechanical-south', 'jain-mess-approach', 'verified', 'Mechanical south road also serves the mess zone.'),
  edge('road-mechanical-south', 'non-jain-mess-approach', 'verified', 'Mechanical south road also serves the mess zone.'),
  edge('road-mechanical-east', 'walk-it', 'verified', 'Mechanical east road meets the IT walkway.'),
  edge('road-mechanical-east', 'walk-civil', 'verified', 'Mechanical east road meets the civil walkway.'),
  edge('road-mechanical-east', 'walk-mess-departments', 'verified', 'Mechanical east road links into the departments walkway.'),
  edge('road-mechanical-west', 'mechanical-approach', 'verified', 'Mechanical west road meets the mechanical block approach.'),
  edge('road-hostel-to-ground', 'boys-hostel-approach', 'verified', 'Hostel road reaches the boys hostel approach.'),
  edge('road-hostel-to-ground', 'ground-entrance', 'verified', 'Hostel road reaches the ground entrance marker.'),
  edge('walk-architecture-east', 'architecture-approach', 'provisional', 'Architecture entrance location remains pending verification.'),
  edge('walk-architecture-south', 'architecture-approach', 'provisional', 'Architecture entrance location remains pending verification.'),
  edge('walk-l-shape', 'l-shape-approach', 'provisional', 'L Shape block entrance location remains pending verification.'),
  edge('walk-english', 'english-approach', 'verified', 'English Department approach is identifiable in the GLB.'),
  edge('walk-jain', 'jain-mess-approach', 'verified', 'Jain Mess approach is identifiable in the GLB.'),
  edge('walk-non-jain', 'non-jain-mess-approach', 'verified', 'Non-Jain Mess approach is identifiable in the GLB.'),
  edge('walk-oat', 'central-road', 'provisional', 'OAT connection is modeled, but the survey is incomplete.'),
]

export const campusNavigationGraph: NavigationGraph = {
  nodes: campusNodes,
  edges: campusEdges,
}

export const campusNavigationNodesById = campusNodeById
export const campusStartLocationIds = ['main-gate-1', 'west-entrance', 'ground-entrance'] as const

export const campusStartLocations = campusStartLocationIds
  .map((id) => campusNodeById.get(id))
  .filter((node): node is NavigationNode => Boolean(node))

export const campusDestinationNodes = campusNodes.filter((node) => node.kind === 'destination')

export const campusDestinationNodesByBuildingId = new Map<CampusBuildingId, NavigationNode[]>(
  Object.entries(campusModelMapById).map(([buildingId]) => [
    buildingId as CampusBuildingId,
    campusNodes.filter((node) => node.buildingId === buildingId && node.kind === 'destination'),
  ]),
)

export function getCampusNavigationNode(nodeId: string) {
  return campusNavigationNodesById.get(nodeId) ?? null
}

export function getCampusNavigationNodeLabel(nodeId: string) {
  return getCampusNavigationNode(nodeId)?.label ?? nodeId
}
