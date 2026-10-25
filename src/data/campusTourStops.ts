import type { Point3 } from '../types/navigation'

export interface CampusTourStop {
  id: string
  stopNumber: number
  title: string
  name: string
  subtitle: string
  category: 'Overview' | 'Academic' | 'Department' | 'Facility' | 'Recreation'
  description: string
  narration: string
  narrationText: string
  cameraPosition: Point3
  targetPoint: Point3
  buildingId?: string
  poiId?: string
  dwellTimeMs: number
  isHighlight: boolean
}

const RAW_TOUR_STOPS: Omit<CampusTourStop, 'name' | 'narrationText'>[] = [
  {
    id: 'aerial-overview-start',
    stopNumber: 1,
    title: 'MNM Jain Engineering College',
    subtitle: 'Campus Aerial Overview',
    category: 'Overview',
    description:
      'Welcome to Misrimal Navajee Munoth Jain Engineering College, Chennai. Spread across an expansive campus, this interactive 3D tour guides you through our academic blocks, research facilities, and student life amenities.',
    narration:
      'Welcome to Misrimal Navajee Munoth Jain Engineering College. Let us explore our campus in an interactive three-dimensional tour.',
    cameraPosition: [275.0, 78.0, 65.0],
    targetPoint: [140.0, 5.0, -90.0],
    dwellTimeMs: 7500,
    isHighlight: true,
  },
  {
    id: 'main-gate-services',
    stopNumber: 2,
    title: 'Main Entrance & Service Frontage',
    subtitle: 'Gate 1 Access & Student Amenities',
    category: 'Facility',
    description:
      'The primary gateway to the campus on the eastern perimeter. To the left along the frontage lawn are student services including the Apollo Shine healthcare wellness clinic and the Xerox reprographics facility.',
    narration:
      'This is Main Entrance Gate 1, the primary gateway into the college. Along the front service area to the left are student facilities including Apollo Shine wellness clinic and the Xerox center.',
    cameraPosition: [220.0, 22.0, 42.0],
    targetPoint: [168.0, 3.0, -12.0],
    buildingId: 'main-gate-1',
    dwellTimeMs: 7000,
    isHighlight: true,
  },
  {
    id: 'main-block',
    stopNumber: 3,
    title: 'Main Block',
    subtitle: 'Administrative & Academic Center (G+1)',
    category: 'Academic',
    description:
      'The central administrative landmark of the institution, housing the principal and administrative offices, central conference facilities, and key academic departments.',
    narration:
      'This is the Main Block, the central administrative landmark of the college, housing administrative offices and conference halls.',
    cameraPosition: [238.0, 28.0, -18.0],
    targetPoint: [193.5, 3.5, -56.0],
    buildingId: 'main-block',
    dwellTimeMs: 6500,
    isHighlight: true,
  },
  {
    id: 'first-year-block',
    stopNumber: 4,
    title: 'First Year Block',
    subtitle: 'Science & Humanities (G+3)',
    category: 'Academic',
    description:
      'A prominent four-storey academic structure dedicated to foundational engineering sciences, modern lecture halls, and foundational laboratories for freshman students.',
    narration:
      'Next is the First Year Block, a multi-storey academic facility dedicated to science and humanities, lecture classrooms, and foundation laboratories.',
    cameraPosition: [218.0, 32.0, -26.0],
    targetPoint: [167.0, 6.5, -73.5],
    buildingId: 'first-year-block',
    dwellTimeMs: 6500,
    isHighlight: true,
  },
  {
    id: 'civil-block',
    stopNumber: 5,
    title: 'Civil Block',
    subtitle: 'Civil Engineering Department (G+2)',
    category: 'Academic',
    description:
      'Home to the Department of Civil Engineering, featuring specialized testing laboratories, structural design studios, and survey equipment facilities.',
    narration:
      'This is the Civil Block, home to the Civil Engineering department with specialized structural engineering and materials testing laboratories.',
    cameraPosition: [194.0, 32.0, -18.0],
    targetPoint: [140.0, 5.0, -66.0],
    buildingId: 'civil-block',
    dwellTimeMs: 6000,
    isHighlight: false,
  },
  {
    id: 'l-shape-block',
    stopNumber: 6,
    title: 'L Shape Block',
    subtitle: 'Advanced Academic Wing (G+2)',
    category: 'Academic',
    description:
      'A comprehensive dual-wing architectural complex spanning the northern and eastern quadrants, accommodating multimedia classrooms, seminar rooms, and specialized computing centres.',
    narration:
      'The L Shape Block is a large two-wing academic complex that provides multimedia classrooms, departmental seminar halls, and laboratory facilities.',
    cameraPosition: [282.0, 48.0, -12.0],
    targetPoint: [212.0, 6.0, -74.0],
    buildingId: 'l-shape-block',
    dwellTimeMs: 6500,
    isHighlight: false,
  },
  {
    id: 'it-block',
    stopNumber: 7,
    title: 'IT Block',
    subtitle: 'Information Technology & Computing',
    category: 'Academic',
    description:
      'A technologically advanced academic building housing computing laboratories, networking centres, software engineering workspaces, and smart lecture rooms.',
    narration:
      'Here is the IT Block, housing advanced computer laboratories, software research environments, and networking facilities.',
    cameraPosition: [142.0, 26.0, -14.0],
    targetPoint: [96.9, 5.0, -52.0],
    buildingId: 'it-block',
    dwellTimeMs: 6500,
    isHighlight: true,
  },
  {
    id: 'mechanical-block',
    stopNumber: 8,
    title: 'Mechanical Block',
    subtitle: 'Mechanical Engineering Complex',
    category: 'Academic',
    description:
      'Dedicated to mechanical engineering studies with heavy machinery laboratories, thermal engineering setups, CAD/CAM studios, and fabrication spaces.',
    narration:
      'This is the Mechanical Block, equipped with engineering laboratories, CAD studios, thermal science setups, and machinery spaces.',
    cameraPosition: [104.0, 34.0, -28.0],
    targetPoint: [40.0, 5.5, -76.0],
    buildingId: 'mechanical-block',
    dwellTimeMs: 6000,
    isHighlight: false,
  },
  {
    id: 'departments-wing',
    stopNumber: 9,
    title: 'Physics, English & Maths Departments',
    subtitle: 'Science & Humanities Corridors',
    category: 'Department',
    description:
      'Dedicated departmental wings housing faculty offices, research consultation rooms, and specialized physics laboratory facilities.',
    narration:
      'Along this avenue are the Physics, English, and Mathematics departmental wings, supporting interdisciplinary research and fundamental sciences.',
    cameraPosition: [112.0, 32.0, 2.0],
    targetPoint: [62.0, 5.0, -36.0],
    buildingId: 'physics-department',
    dwellTimeMs: 6000,
    isHighlight: false,
  },
  {
    id: 'school-of-architecture',
    stopNumber: 10,
    title: 'MNM School of Architecture',
    subtitle: 'Dedicated Architecture Campus (B.Arch)',
    category: 'Academic',
    description:
      'A distinctive three-storey architectural block featuring open-plan design studios, climatology labs, model-making workshops, and an architectural library.',
    narration:
      'This is the MNM School of Architecture, a dedicated building designed with bright studios, workshops, and creative learning spaces.',
    cameraPosition: [76.0, 34.0, -82.0],
    targetPoint: [22.0, 5.0, -124.0],
    buildingId: 'mnm-school-of-architecture',
    dwellTimeMs: 6500,
    isHighlight: true,
  },
  {
    id: 'boys-hostel',
    stopNumber: 11,
    title: 'Boys Hostel',
    subtitle: 'Student Residential Complex',
    category: 'Facility',
    description:
      'Residential quarters for students situated in a quiet southern enclave of the campus, featuring ground courtyards, study rooms, and 24/7 security.',
    narration:
      'The Boys Hostel provides on-campus residential accommodation for students, situated in a quiet sector of the grounds.',
    cameraPosition: [82.0, 32.0, -148.0],
    targetPoint: [29.7, 6.0, -191.0],
    buildingId: 'boys-hostel',
    dwellTimeMs: 6000,
    isHighlight: false,
  },
  {
    id: 'campus-dining',
    stopNumber: 12,
    title: 'Canteen & Dining Messes',
    subtitle: 'Jain Mess, Non-Jain Mess & Cafeteria',
    category: 'Facility',
    description:
      'The central campus dining pavilion featuring the Main Canteen cafeteria alongside dedicated Jain vegetarian and general dining halls serving students and faculty daily.',
    narration:
      'The campus dining complex includes the main Canteen cafeteria alongside separate Jain vegetarian and general dining mess halls.',
    cameraPosition: [90.0, 28.0, 18.0],
    targetPoint: [36.0, 4.0, -22.0],
    buildingId: 'canteen',
    dwellTimeMs: 6500,
    isHighlight: false,
  },
  {
    id: 'central-library',
    stopNumber: 13,
    title: 'Dr. C. L. Mehta Central Library',
    subtitle: 'Knowledge Center & Reading Hall',
    category: 'Facility',
    description:
      'The college central library, providing expansive reading halls, digital repository terminals, journal archives, and textbook reference collections for all departments.',
    narration:
      'Here is the Dr. C. L. Mehta Central Library, the academic resource center of the college, offering reading halls and digital learning collections.',
    cameraPosition: [238.0, 28.0, -36.0],
    targetPoint: [193.5, 5.0, -73.0],
    buildingId: 'library',
    dwellTimeMs: 6500,
    isHighlight: true,
  },
  {
    id: 'open-air-theatre',
    stopNumber: 14,
    title: 'Open Air Theatre (OAT)',
    subtitle: 'Cultural Amphitheatre & Stage Plaza',
    category: 'Facility',
    description:
      'An expansive outdoor amphitheatre venue with tiered seating and an elevated stage, hosting college symposiums, cultural fests, student assemblies, and graduation events.',
    narration:
      'This is the Open Air Theatre, our outdoor amphitheatre and stage used for college celebrations, technical symposiums, and cultural festivals.',
    cameraPosition: [266.0, 24.0, -26.0],
    targetPoint: [227.5, 2.0, -61.0],
    buildingId: 'open-air-theatre',
    dwellTimeMs: 6000,
    isHighlight: false,
  },
  {
    id: 'sports-ground',
    stopNumber: 15,
    title: 'Football Ground & Sports Arena',
    subtitle: 'Athletics & Physical Education Grounds',
    category: 'Recreation',
    description:
      'The main sporting arena featuring a regulation football pitch, running track corridors, and open outdoor recreational grounds for campus tournaments.',
    narration:
      'Here are the college sports and football grounds, providing space for athletics, team sports, and annual tournaments.',
    cameraPosition: [226.0, 52.0, -90.0],
    targetPoint: [155.0, 2.0, -150.0],
    dwellTimeMs: 6000,
    isHighlight: false,
  },
  {
    id: 'campus-panorama-finale',
    stopNumber: 16,
    title: 'MNMJEC Campus Panorama',
    subtitle: 'Excellence in Engineering Education',
    category: 'Overview',
    description:
      'Thank you for experiencing the interactive 3D tour of Misrimal Navajee Munoth Jain Engineering College. You are now free to explore any building or calculate step-by-step navigation routes.',
    narration:
      'Thank you for touring Misrimal Navajee Munoth Jain Engineering College. You can now freely explore any building in three dimensions or calculate navigation routes.',
    cameraPosition: [280.0, 80.0, 70.0],
    targetPoint: [140.0, 5.0, -90.0],
    dwellTimeMs: 7000,
    isHighlight: true,
  },
]

export const CAMPUS_TOUR_STOPS: CampusTourStop[] = RAW_TOUR_STOPS.map((stop) => ({
  ...stop,
  name: stop.title,
  narrationText: stop.narration,
}))

export const TOTAL_TOUR_STOPS = CAMPUS_TOUR_STOPS.length

export const HIGHLIGHTS_TOUR_STOPS: CampusTourStop[] = CAMPUS_TOUR_STOPS.filter((stop) => stop.isHighlight).map(
  (stop, idx) => ({
    ...stop,
    stopNumber: idx + 1,
  })
)
