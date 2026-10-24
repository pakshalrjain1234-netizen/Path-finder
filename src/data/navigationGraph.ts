import { campusModelMapById, type CampusBuildingId } from './campusModelMapping.ts'
import type { NavigationEdge, NavigationGraph, NavigationNode, NavigationNodeKind, Point3 } from '../types/navigation'

function point(x: number, y: number, z: number): Point3 {
  return [x, y, z]
}

function entranceNote(label: string) {
  return `${label} entrance anchor extracted from campus 3D model.`
}

const campusEntranceBuildingMap: Array<[string, CampusBuildingId, string, Point3, 'verified' | 'provisional', string?]> = [
  ['main-gate-1', 'main-block', 'Main Entrance (Gate 1)', point(181, 0.2, -6.2), 'provisional', 'Main gate marker from campus GLB.'],
  ['west-entrance', 'boys-hostel', 'West Entrance', point(54.4, 0.2, -97.8), 'provisional', 'West gate marker from campus GLB.'],
  ['ground-entrance', 'main-block', 'Ground Entrance', point(113.4, 0.2, -93.4), 'provisional', 'Ground entrance marker from campus GLB.'],
  ['main-block-approach', 'main-block', 'Main Block', point(193.6, 0.2, -56.4), 'provisional', entranceNote('Main Block')],
  ['first-year-approach', 'first-year-block', 'First Year Block', point(166.8, 0.2, -64.2), 'provisional', entranceNote('First Year Block')],
  ['civil-approach', 'civil-block', 'Civil Block', point(144.6, 0.2, -54.2), 'provisional', entranceNote('Civil Block')],
  ['it-entrance', 'it-block', 'IT Block', point(96.8, 0.2, -45.8), 'provisional', entranceNote('IT Block')],
  ['l-shape-approach', 'l-shape-block', 'L Shape Block', point(165.8, 0.2, -85.0), 'provisional', entranceNote('L Shape Block')],
  ['physics-approach', 'physics-department', 'Physics Department', point(14.2, 0.2, -47.2), 'provisional', entranceNote('Physics Department')],
  ['english-approach', 'english-department', 'English Department', point(70.6, 0.2, -23.2), 'provisional', entranceNote('English Department')],
  ['maths-approach', 'maths-department', 'Maths Department', point(96.6, 0.2, -23.2), 'provisional', entranceNote('Maths Department')],
  ['jain-mess-approach', 'jain-mess', 'Jain Mess', point(40.4, 0.2, -23.2), 'provisional', entranceNote('Jain Mess')],
  ['non-jain-mess-approach', 'non-jain-mess', 'Non-Jain Mess', point(13.4, 0.2, -23.2), 'provisional', entranceNote('Non-Jain Mess')],
  ['canteen-gate', 'canteen', 'Canteen Gate', point(37.4, 0.2, 0), 'provisional', 'Canteen gate marker from campus GLB.'],
  ['canteen-approach', 'canteen', 'Canteen', point(37.4, 0.2, -3.2), 'provisional', entranceNote('Canteen')],
  ['mechanical-approach', 'mechanical-block', 'Mechanical Block', point(56.8, 0.2, -65.6), 'provisional', entranceNote('Mechanical Block')],
  ['architecture-approach', 'mnm-school-of-architecture', 'MNM School of Architecture', point(22.2, 0.2, -101.6), 'provisional', entranceNote('MNM School of Architecture')],
  ['boys-hostel-approach', 'boys-hostel', 'Boys Hostel', point(24.4, 0.2, -183.0), 'provisional', entranceNote('Boys Hostel')],
  ['oat-approach', 'open-air-theatre', 'Open Air Theatre', point(227.7, 0.2, -47.0), 'provisional', 'Pedestrian plaza approach to Open Air Theatre outdoor amphitheatre extracted from Stage E3 campus model.'],
]

const campusWaypointNodes: Array<[string, string, Point3, 'verified' | 'provisional', string?]> = [
  // --- Main Entrance Avenue (ROAD_CENTRAL_AND_MAIN_ENTRANCE) ---
  ['road-main-mid', 'Main Entrance Avenue', point(180.2, 0.093, -20.0), 'provisional', 'Paved main access avenue heading north.'],
  ['road-main-academic-junction', 'Main Academic Road Junction', point(180.2, 0.093, -38.6), 'provisional', 'Intersection of main avenue and academic front road.'],
  ['road-south-plaza-main', 'Main Entrance Plaza', point(180.2, 0.093, 2.0), 'provisional', 'Paved southern entrance plaza.'],
  ['road-south-plaza-canteen', 'Canteen Front Plaza', point(37.4, 0.093, 2.0), 'provisional', 'Paved plaza in front of Canteen gate.'],

  // --- Academic Front Road Corridor (Z = -38.6) ---
  ['road-front-main', 'Main Block Front Road', point(193.7, 0.093, -38.6), 'provisional', 'Front road segment south of Main Block.'],
  ['road-front-oat', 'OAT Front Road', point(227.7, 0.093, -38.6), 'provisional', 'Front road segment in front of Open Air Theatre.'],
  ['road-front-first-year', 'First Year Front Road', point(166.5, 0.093, -38.6), 'provisional', 'Front road segment south of First Year Block.'],
  ['road-front-civil', 'Civil Block Front Road', point(145.2, 0.093, -38.6), 'provisional', 'Front road segment south of Civil Block.'],
  ['road-front-bend', 'Academic Road West Bend', point(124.0, 0.093, -38.6), 'provisional', 'Curving roadway transition toward central spine.'],

  // --- Central Spine Road (X = 113.4) ---
  ['road-central-departments-junction', 'Central Spine North Junction', point(113.4, 0.093, -42.8), 'provisional', 'Junction linking front road, departments walkway, and central spine.'],
  ['road-central-spine-mid', 'Central Campus Road', point(113.4, 0.093, -68.0), 'provisional', 'North-south paved road running beside campus ground.'],
  ['road-central-west-junction', 'Ground Entrance Junction', point(113.4, 0.093, -93.0), 'provisional', 'Junction of central road and west cross-campus road.'],
  ['road-central-south', 'Central Spine South Terminal', point(113.4, 0.093, -122.2), 'provisional', 'Southern terminal linking to hostel road network.'],

  // --- Academic Front Walkway (WALK_ACADEMIC_FRONT at Z = -44.4) ---
  ['walk-front-main', 'Main Block Walkway Connector', point(193.7, 0.043, -44.4), 'provisional', 'Paved walkway connector to Main Block.'],
  ['walk-front-first-year', 'First Year Walkway Connector', point(166.5, 0.043, -44.4), 'provisional', 'Paved walkway connector to First Year Block.'],
  ['walk-front-civil', 'Civil Block Walkway Connector', point(145.2, 0.043, -44.4), 'provisional', 'Paved walkway connector to Civil Block.'],
  ['walk-front-oat', 'OAT Walkway Connector', point(227.7, 0.043, -44.4), 'provisional', 'Paved walkway connector to Open Air Theatre.'],
  ['walk-main', 'Main Block Entrance Walkway', point(193.6, 0.043, -50.0), 'provisional', 'Dedicated walkway leading to Main Block entrance.'],
  ['walk-first-year', 'First Year Entrance Walkway', point(166.8, 0.043, -54.0), 'provisional', 'Dedicated walkway leading to First Year Block entrance.'],
  ['walk-civil', 'Civil Block Entrance Walkway', point(144.6, 0.043, -49.0), 'provisional', 'Dedicated walkway leading to Civil Block entrance.'],

  // --- Departments & Mess Walkway (WALK_MESS_DEPARTMENTS at Z = -42.9) ---
  ['walk-mess-east', 'Departments Walkway East', point(113.0, 0.043, -42.9), 'provisional', 'Walkway entering departments zone from central road.'],
  ['walk-it-junction', 'IT Block Walkway Junction', point(96.8, 0.043, -42.9), 'provisional', 'Walkway junction in front of IT Block entrance.'],
  ['walk-english-junction', 'English Dept Junction', point(70.6, 0.043, -42.9), 'provisional', 'Walkway junction south of English Department.'],
  ['walk-departments-mid', 'Departments Walkway Midpoint', point(56.8, 0.043, -42.9), 'provisional', 'Walkway linking departments south walkway.'],
  ['walk-jain-junction', 'Jain Mess South Junction', point(40.4, 0.043, -42.9), 'provisional', 'Walkway junction south of Jain Mess.'],
  ['walk-physics-junction', 'Physics Dept Junction', point(14.2, 0.043, -42.9), 'provisional', 'Walkway junction in front of Physics Department.'],
  ['walk-non-jain-junction', 'Non-Jain Mess South Junction', point(13.4, 0.043, -42.9), 'provisional', 'Walkway junction south of Non-Jain Mess.'],

  // --- North Canteen & Mess Walkways (WALK_CANTEEN_NORTH) ---
  ['walk-canteen-approach', 'Canteen Walkway Approach', point(37.4, 0.043, -1.4), 'provisional', 'Paved walkway approaching canteen gate.'],
  ['walk-canteen-mid', 'Canteen Walkway North Midpoint', point(37.4, 0.043, -19.0), 'provisional', 'Walkway junction north of canteen.'],
  ['walk-canteen-jain', 'Jain Mess North Walkway', point(40.4, 0.043, -19.0), 'provisional', 'Paved walkway into Jain Mess north entrance.'],
  ['walk-canteen-non-jain', 'Non-Jain Mess North Walkway', point(13.4, 0.043, -19.0), 'provisional', 'Paved walkway into Non-Jain Mess north entrance.'],
  ['walk-canteen-english', 'English Dept North Walkway', point(70.6, 0.043, -19.0), 'provisional', 'Paved walkway into English Department entrance.'],
  ['walk-canteen-maths', 'Maths Dept North Walkway', point(96.6, 0.043, -19.0), 'provisional', 'Paved walkway into Maths Department entrance.'],
  ['walk-canteen-east', 'North Walkway East Junction', point(100.8, 0.043, -19.0), 'provisional', 'Eastern terminal of canteen north walkway.'],
  ['walk-canteen-road-connector', 'North Walkway Road Connector', point(113.4, 0.093, -19.0), 'provisional', 'Paved connector from north walkway to central road.'],

  // --- Mechanical Block Road Loop (surrounds Mechanical Block) ---
  ['road-mechanical-north-mid', 'Mechanical Road North Midpoint', point(56.8, 0.093, -56.2), 'provisional', 'Paved road directly facing Mechanical Block entrance.'],
  ['road-mechanical-north-east', 'Mechanical Road North-East Corner', point(99.9, 0.093, -56.2), 'provisional', 'Junction of northern and eastern mechanical roads.'],
  ['road-mechanical-east-mid', 'Mechanical East Road', point(99.9, 0.093, -75.0), 'provisional', 'Paved road running along east face of Mechanical Block.'],
  ['road-west-cross-mechanical-east', 'Mechanical East Road Junction', point(99.9, 0.093, -93.0), 'provisional', 'Junction of mechanical east road with cross-campus road.'],
  ['road-mechanical-west-mid', 'Mechanical West Road', point(12.2, 0.093, -75.0), 'provisional', 'Paved road running along west face of Mechanical Block.'],
  ['road-west-cross-mechanical-west', 'Mechanical West Road Junction', point(12.2, 0.093, -93.0), 'provisional', 'Junction of mechanical west road with cross-campus road.'],

  // --- West Cross-Campus Road (ROAD_WEST_CROSS_CAMPUS at Z = -93.0) ---
  ['road-north-south-junction', 'Hostel Link Road Junction', point(74.9, 0.093, -93.0), 'provisional', 'Cross-campus road junction with north-south hostel road.'],
  ['road-west-entrance', 'West Entrance Road Junction', point(54.4, 0.093, -93.0), 'provisional', 'Cross-campus road directly at West Entrance gate.'],
  ['road-architecture-junction', 'Architecture Road Junction', point(22.3, 0.093, -93.0), 'provisional', 'Cross-campus road junction leading to Architecture block.'],

  // --- Architecture Walkway (WALK_ARCHITECTURE_SOUTH) ---
  ['walk-architecture-south', 'Architecture Walkway', point(22.3, 0.043, -99.6), 'provisional', 'Paved walkway leading directly into Architecture entrance.'],

  // --- North-South Hostel Access Road & Boys Hostel Loop ---
  ['road-north-south-mid', 'Hostel Road North Segment', point(74.9, 0.093, -108.0), 'provisional', 'North-south paved road heading toward hostel corridor.'],
  ['road-hostel-junction', 'Hostel Road Ground Junction', point(74.9, 0.093, -122.2), 'provisional', 'Junction of hostel access road and ground connecting branch.'],
  ['road-hostel-link-ground', 'Hostel-to-Ground Diagonal Link', point(95.0, 0.093, -122.2), 'provisional', 'Road branch connecting hostel access corridor to central spine.'],
  ['road-hostel-turn-west', 'Hostel Road West Bend', point(74.9, 0.093, -154.6), 'provisional', 'Paved road turning west toward Boys Hostel.'],
  ['road-hostel-turn-south', 'Hostel Road South Bend', point(24.6, 0.093, -154.6), 'provisional', 'Paved road turning south directly toward Boys Hostel.'],
  ['road-hostel-approach', 'Hostel Terminal Road', point(24.6, 0.093, -182.6), 'provisional', 'Paved road terminal directly at Boys Hostel entrance.'],

  // --- Rear Academic Walkway & L-Shape ---
  ['walk-courtyard-gap-front', 'Academic Courtyard Gap South', point(211.3, 0.043, -44.4), 'provisional', 'Walkway through open courtyard gap between Main Block and OAT.'],
  ['walk-courtyard-gap-rear', 'Academic Courtyard Gap North', point(211.3, 0.043, -84.0), 'provisional', 'Rear passage entrance behind Main Block.'],
  ['walk-l-shape-rear-mid', 'L Shape Rear Passage', point(165.8, 0.043, -84.0), 'provisional', 'Walkway through clear passage between First Year and L Shape.'],
]

const campusNodes: NavigationNode[] = [
  ...campusEntranceBuildingMap.map(([id, buildingId, label, position, verificationStatus, notes]) => ({
    id,
    label,
    position,
    kind: (['main-gate-1', 'west-entrance', 'ground-entrance'].includes(id) ? 'start' : 'destination') as NavigationNodeKind,
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
                            ? 'MECHANICAL_BLOCK_ENTRANCE_ANCHOR'
                            : id === 'architecture-approach'
                              ? 'MNM_SCHOOL_OF_ARCHITECTURE_ENTRANCE_ANCHOR'
                              : id === 'boys-hostel-approach'
                                ? 'BOYS_HOSTEL_ENTRANCE_ANCHOR'
                                : id === 'main-block-approach'
                                  ? 'MAIN_BLOCK_ENTRANCE_ANCHOR'
                                  : id === 'first-year-approach'
                                    ? 'FIRST_YEAR_BLOCK_ENTRANCE_ANCHOR'
                                    : id === 'civil-approach'
                                      ? 'CIVIL_BLOCK_ENTRANCE_ANCHOR'
                                      : id === 'l-shape-approach'
                                        ? 'L_SHAPE_BLOCK_ENTRANCE_ANCHOR'
                                        : id === 'canteen-approach'
                                          ? 'CANTEEN_ENTRANCE_ANCHOR'
                                          : id === 'oat-approach'
                                            ? 'OAT_PLAZA_APPROACH_ANCHOR'
                                            : 'UNKNOWN',
    verificationStatus,
    notes,
  })),
  ...campusWaypointNodes.map(([id, label, position, verificationStatus, notes]) => ({
    id,
    label,
    position,
    kind: 'waypoint' as NavigationNodeKind,
    sourceObjectName:
      id.startsWith('road-')
        ? 'ROAD_SEGMENT'
        : id.startsWith('walk-')
          ? 'WALK_SEGMENT'
          : 'CAMPUS_NODE',
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
  // 1. Main Entrance Road Spine & South Plaza
  edge('main-gate-1', 'road-main-mid', 'provisional', 'Main gate enters onto paved entrance road.'),
  edge('road-main-mid', 'road-main-academic-junction', 'provisional', 'Entrance avenue proceeds north to academic junction.'),
  edge('main-gate-1', 'road-south-plaza-main', 'provisional', 'Main gate connects to southern entrance plaza.'),
  edge('road-south-plaza-main', 'road-south-plaza-canteen', 'provisional', 'South plaza heads west toward Canteen gate.'),
  edge('road-south-plaza-canteen', 'canteen-gate', 'provisional', 'South plaza connects directly to Canteen gate.'),

  // 2. Academic Front Road Corridor (East-West along Z = -38.6)
  edge('road-main-academic-junction', 'road-front-main', 'provisional', 'Front road extends east toward Main Block.'),
  edge('road-front-main', 'road-front-oat', 'provisional', 'Front road continues east toward OAT.'),
  edge('road-main-academic-junction', 'road-front-first-year', 'provisional', 'Front road extends west toward First Year Block.'),
  edge('road-front-first-year', 'road-front-civil', 'provisional', 'Front road continues west toward Civil Block.'),
  edge('road-front-civil', 'road-front-bend', 'provisional', 'Front road transitions past Civil Block.'),
  edge('road-front-bend', 'road-central-departments-junction', 'provisional', 'Roadway bends into central road spine and departments junction.'),

  // 3. Academic Front Walkway & Entrance Connections
  edge('road-front-main', 'walk-front-main', 'provisional', 'Road connects to Main Block walkway connector.'),
  edge('walk-front-main', 'walk-main', 'provisional', 'Walkway connector enters dedicated Main Block entrance path.'),
  edge('walk-main', 'main-block-approach', 'provisional', 'Walkway reaches Main Block entrance anchor.'),

  edge('road-front-first-year', 'walk-front-first-year', 'provisional', 'Road connects to First Year Block walkway connector.'),
  edge('walk-front-first-year', 'walk-first-year', 'provisional', 'Walkway connector enters dedicated First Year entrance path.'),
  edge('walk-first-year', 'first-year-approach', 'provisional', 'Walkway reaches First Year Block entrance anchor.'),

  edge('road-front-civil', 'walk-front-civil', 'provisional', 'Road connects to Civil Block walkway connector.'),
  edge('walk-front-civil', 'walk-civil', 'provisional', 'Walkway connector enters dedicated Civil Block entrance path.'),
  edge('walk-civil', 'civil-approach', 'provisional', 'Walkway reaches Civil Block entrance anchor.'),

  edge('road-front-oat', 'walk-front-oat', 'provisional', 'Road connects to OAT walkway connector.'),
  edge('walk-front-oat', 'oat-approach', 'provisional', 'Paved walkway connector enters Open Air Theatre pedestrian amphitheatre plaza approach.'),

  // Walkway corridor along academic front (WALK_ACADEMIC_FRONT at Z = -44.4)
  edge('walk-front-main', 'walk-front-first-year', 'provisional', 'Front walkway connects Main Block and First Year Block.'),
  edge('walk-front-first-year', 'walk-front-civil', 'provisional', 'Front walkway connects First Year Block and Civil Block.'),

  // 4. Central Spine Road (Heading South along X = 113.4)
  edge('road-central-departments-junction', 'road-central-spine-mid', 'provisional', 'Central road spine heads south past academic core.'),
  edge('road-central-spine-mid', 'road-central-west-junction', 'provisional', 'Central road reaches Ground Entrance / Cross-Campus junction.'),
  edge('road-central-west-junction', 'ground-entrance', 'provisional', 'Central road connects directly to Ground Entrance.'),
  edge('road-central-west-junction', 'road-central-south', 'provisional', 'Central road continues south toward hostel road link.'),

  // 5. Departments & Mess Walkway (WALK_MESS_DEPARTMENTS at Z = -42.9)
  edge('road-central-departments-junction', 'walk-mess-east', 'provisional', 'Central road connects into departments walkway.'),
  edge('walk-mess-east', 'walk-it-junction', 'provisional', 'Walkway proceeds west to IT Block.'),
  edge('walk-it-junction', 'it-entrance', 'provisional', 'Dedicated branch into IT Block entrance anchor.'),
  edge('walk-it-junction', 'walk-english-junction', 'provisional', 'Departments walkway continues west toward English Department.'),
  edge('walk-english-junction', 'walk-departments-mid', 'provisional', 'Walkway links academic departments south corridor.'),
  edge('walk-departments-mid', 'walk-jain-junction', 'provisional', 'Walkway continues west past Jain Mess.'),
  edge('walk-jain-junction', 'walk-physics-junction', 'provisional', 'Walkway continues west toward Physics Department.'),
  edge('walk-physics-junction', 'physics-approach', 'provisional', 'Dedicated branch into Physics Department entrance anchor.'),
  edge('walk-physics-junction', 'walk-non-jain-junction', 'provisional', 'Walkway continues west toward Non-Jain Mess.'),

  // 6. North Canteen & Mess Walkways
  edge('walk-canteen-approach', 'canteen-approach', 'provisional', 'Walkway leads into Canteen entrance.'),
  edge('walk-canteen-approach', 'canteen-gate', 'provisional', 'Walkway leads to Canteen gate.'),
  edge('walk-canteen-mid', 'walk-canteen-jain', 'provisional', 'North walkway connects to Jain Mess north entrance.'),
  edge('walk-canteen-jain', 'jain-mess-approach', 'provisional', 'North walkway leads into Jain Mess entrance anchor.'),
  edge('walk-canteen-jain', 'walk-canteen-non-jain', 'provisional', 'North walkway continues west toward Non-Jain Mess.'),
  edge('walk-canteen-non-jain', 'non-jain-mess-approach', 'provisional', 'North walkway leads into Non-Jain Mess entrance anchor.'),
  edge('walk-canteen-mid', 'walk-canteen-english', 'provisional', 'North walkway heads east toward English Department.'),
  edge('walk-canteen-english', 'english-approach', 'provisional', 'Walkway leads into English Department entrance anchor.'),
  edge('walk-canteen-english', 'walk-canteen-maths', 'provisional', 'North walkway continues east toward Maths Department.'),
  edge('walk-canteen-maths', 'maths-approach', 'provisional', 'Walkway leads into Maths Department entrance anchor.'),
  edge('walk-canteen-maths', 'walk-canteen-east', 'provisional', 'North walkway reaches eastern junction.'),
  edge('walk-canteen-east', 'walk-canteen-road-connector', 'provisional', 'North walkway reaches plaza road connector.'),
  edge('walk-canteen-road-connector', 'road-front-bend', 'provisional', 'Connector proceeds along paved road to academic front road.'),

  // 7. Mechanical Block Road Loop & Entrance (Accessed via West Cross-Campus Road & Mechanical East Road)
  edge('road-mechanical-north-mid', 'mechanical-approach', 'provisional', 'Paved road directly accesses Mechanical Block entrance anchor.'),
  edge('road-mechanical-north-mid', 'road-mechanical-north-east', 'provisional', 'Road runs east along north face of Mechanical Block.'),
  edge('road-mechanical-north-east', 'road-mechanical-east-mid', 'provisional', 'Road turns south along east face of Mechanical Block.'),
  edge('road-mechanical-east-mid', 'road-west-cross-mechanical-east', 'provisional', 'Mechanical east road meets cross-campus road.'),
  edge('road-mechanical-west-mid', 'road-west-cross-mechanical-west', 'provisional', 'Mechanical west road meets cross-campus road.'),

  // 8. West Cross-Campus Road (ROAD_WEST_CROSS_CAMPUS at Z = -93.0)
  edge('road-central-west-junction', 'road-west-cross-mechanical-east', 'provisional', 'Cross-campus road heads west past Ground Entrance.'),
  edge('road-west-cross-mechanical-east', 'road-north-south-junction', 'provisional', 'Cross-campus road continues west to hostel link junction.'),
  edge('road-north-south-junction', 'road-west-entrance', 'provisional', 'Cross-campus road continues west toward West Entrance.'),
  edge('road-west-entrance', 'west-entrance', 'provisional', 'Cross-campus road connects directly to West Entrance gate.'),
  edge('road-west-entrance', 'road-architecture-junction', 'provisional', 'Cross-campus road heads west to Architecture junction.'),
  edge('road-architecture-junction', 'road-west-cross-mechanical-west', 'provisional', 'Cross-campus road connects to mechanical west road.'),

  // 9. Architecture Block Connection
  edge('road-architecture-junction', 'walk-architecture-south', 'provisional', 'Paved road connects directly to Architecture walkway mesh.'),
  edge('walk-architecture-south', 'architecture-approach', 'provisional', 'Architecture walkway reaches entrance anchor directly.'),

  // 10. North-South Hostel Access Road & Boys Hostel Loop
  edge('road-north-south-junction', 'road-north-south-mid', 'provisional', 'Paved road heads south toward hostel corridor.'),
  edge('road-north-south-mid', 'road-hostel-junction', 'provisional', 'Hostel road reaches southern ground junction.'),
  edge('road-hostel-junction', 'road-hostel-link-ground', 'provisional', 'Ground link road branches east toward central spine.'),
  edge('road-hostel-link-ground', 'road-central-south', 'provisional', 'Ground link road connects directly into central spine.'),
  edge('road-hostel-junction', 'road-hostel-turn-west', 'provisional', 'Hostel road proceeds south along west grass boundary.'),
  edge('road-hostel-turn-west', 'road-hostel-turn-south', 'provisional', 'Hostel road turns west along south lawn.'),
  edge('road-hostel-turn-south', 'road-hostel-approach', 'provisional', 'Hostel road turns south into Boys Hostel terminal.'),
  edge('road-hostel-approach', 'boys-hostel-approach', 'provisional', 'Hostel terminal road connects directly to Boys Hostel entrance anchor.'),

  // 11. Rear Academic Walkway & L-Shape Block (Passage between Main Block and OAT)
  edge('road-front-main', 'walk-courtyard-gap-front', 'provisional', 'Front road connects to academic courtyard passage.'),
  edge('walk-courtyard-gap-front', 'walk-courtyard-gap-rear', 'provisional', 'Passage proceeds north between Main Block and OAT.'),
  edge('walk-courtyard-gap-rear', 'walk-l-shape-rear-mid', 'provisional', 'Rear passage extends west behind First Year Block.'),
  edge('walk-l-shape-rear-mid', 'l-shape-approach', 'provisional', 'Passage reaches L Shape Block entrance anchor.'),
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
