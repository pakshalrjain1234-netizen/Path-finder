import type { DiscoverCategoryData, DiscoverCategoryId } from '../types/discover.ts'

/**
 * Authoritative Discover MNMJEC Information Dataset.
 *
 * INSTITUTIONAL AUDIT COMPLIANCE (Phase 9C.2):
 * 1. Official college catalogs, accredited syllabus details, scholarship concession circulars,
 *    and placement audit reports are currently undergoing administrative verification.
 * 2. All categories are marked 'isOfficialDataLoaded: false' with explicit "Official information coming soon" notices.
 * 3. All visitor-facing text is audited: no unverified assertions regarding specific government scholarship
 *    schemes, approvals, admission eligibility cutoffs, recruiter names, or salary metrics are claimed.
 * 4. Prepared typed data architecture allows zero-friction population once officially certified.
 */

export const DISCOVER_CATEGORIES: DiscoverCategoryData[] = [
  {
    id: 'courses',
    title: 'Academic Programs & Departments',
    shortTitle: 'Courses',
    tagline: 'Undergraduate, Postgraduate & Foundational Engineering Curricula',
    description:
      'Explore academic departments, engineering disciplines, foundational science faculties, and specialized laboratories across the MNMJEC campus.',
    badge: 'Academic Overview • Official Details Pending Verification',
    iconName: 'BookOpen',
    isOfficialDataLoaded: false,
    statusNotice:
      'Official curriculum listings, intake quotas, and specialization guides approved by the MNMJEC Academic Council are currently being cataloged and will be published shortly.',
    narrationText:
      'Welcome to the Discover MNMJEC academic overview. Misrimal Navajee Munoth Jain Engineering College comprises engineering faculties, foundational science departments, and specialized campus facilities across our academic blocks. Official course catalogs, degree curricula, intake figures, and admission guidelines approved by the college administration are currently being compiled and will be published here once verified. In the meantime, you can explore the physical department buildings and facilities directly in our 3D Campus Explorer.',
    narrationSummary:
      'Overview of engineering disciplines, foundational science departments, and laboratory facilities across the campus blocks.',
    previewTopics: [
      {
        title: 'Undergraduate Engineering (B.E. / B.Tech)',
        subtitle: 'Four-Year Professional Engineering Degrees',
        description:
          'Engineering curricula providing foundational principles, laboratory experiments, project work, and emerging technological specializations.',
        iconName: 'Cpu',
        bulletPoints: [
          'Academic foundation spanning engineering sciences and applied technology',
          'Departmental laboratory and practical workshop access across campus blocks',
          'Curriculum structure overview pending official syllabus publication',
        ],
      },
      {
        title: 'Science & Humanities Foundation',
        subtitle: 'Foundational Academic Infrastructure',
        description:
          'Dedicated foundational faculties in Mathematics, Physics, Chemistry, and English providing scientific grounding for incoming students.',
        iconName: 'GraduationCap',
        bulletPoints: [
          'Lecture halls and seminar facilities across the First Year Block',
          'Basic science and experimental laboratory facilities',
          'Curriculum schedules published per academic calendar notices',
        ],
      },
      {
        title: 'School of Architecture',
        subtitle: 'Architectural & Spatial Design Studies',
        description:
          'Specialized campus compound dedicated to architectural design, urban planning principles, building construction technology, and studio critique.',
        iconName: 'Building2',
        bulletPoints: [
          'Independent architectural precinct accessible via Gate 2',
          'Studio spaces, drafting facilities, and design critique halls',
          'Studio guidelines and regulatory affiliation records pending administrative update',
        ],
      },
    ],
    associatedBuildings: [
      {
        buildingId: 'first-year-block',
        buildingName: 'First Year Block',
        modelPosition: [176.6, 0.2, -72.4],
        description: 'Houses foundational lectures, science departments, and lecture halls for first-year engineering students.',
        floorCountLabel: 'G+3 Floors',
      },
      {
        buildingId: 'it-block',
        buildingName: 'IT Block',
        modelPosition: [105.6, 0.2, -56.8],
        description: 'Home to Information Technology, Computer Science faculties, and software development laboratories.',
        floorCountLabel: 'Multi-Floor Facility',
      },
      {
        buildingId: 'civil-block',
        buildingName: 'Civil Block',
        modelPosition: [136.2, 0.2, -78.2],
        description: 'Equipped with structural testing, surveying, materials testing, and environmental laboratories.',
        floorCountLabel: 'G+2 Floors',
      },
      {
        buildingId: 'mechanical-block',
        buildingName: 'Mechanical Block',
        modelPosition: [62.3, 0.2, -78.0],
        description: 'Contains manufacturing workshops, thermal engineering labs, and mechanical design facilities.',
        floorCountLabel: 'Multi-Floor Facility',
      },
      {
        buildingId: 'mnm-school-of-architecture',
        buildingName: 'MNM School of Architecture',
        modelPosition: [22.2, 0.2, -101.6],
        description: 'Dedicated architectural compound with design studios and drafting halls, entered via Gate 2.',
        floorCountLabel: 'Architectural Wing',
      },
    ],
    officialContact: {
      officeName: 'Academic Affairs & Admissions Office',
      locationDescription: 'Main Block Ground Floor Administration Portico',
      buildingId: 'main-block',
      recommendedContactMethod: 'Visit the Administrative Office during working hours (9:00 AM – 4:30 PM)',
    },
  },
  {
    id: 'scholarships',
    title: 'Scholarships & Financial Assistance',
    shortTitle: 'Scholarships',
    tagline: 'Merit Rewards, Government Endowments & Institutional Assistance',
    description:
      'Learn about financial support mechanisms, government scholarships, merit recognition, and institutional assistance programs supporting deserving students at MNMJEC.',
    badge: 'Financial Aid Overview • Details Pending Official Release',
    iconName: 'Award',
    isOfficialDataLoaded: false,
    statusNotice:
      'Official scholarship concession matrices, eligibility cutoffs, and application deadlines for the upcoming academic cycle are currently being compiled by the College Trust and Office of Student Welfare.',
    narrationText:
      'Misrimal Navajee Munoth Jain Engineering College provides support for students seeking financial assistance and academic recognitions. Various welfare schemes and institutional assistance guidelines are administered through the college administrative office. Official scholarship schemes, eligibility requirements, concession matrices, and application deadlines are currently being compiled by the administration and will be published here once certified. Please consult the administrative office in the Main Block for active circulars.',
    narrationSummary:
      'Information regarding government welfare schemes, institutional endowments, and merit-based tuition fee concessions.',
    previewTopics: [
      {
        title: 'Government Welfare Schemes',
        subtitle: 'Statutory Financial Assistance Coordination',
        description:
          'Coordination and facilitation of statutory scholarship schemes for eligible applicants in accordance with applicable government directives.',
        iconName: 'ShieldCheck',
        bulletPoints: [
          'Statutory welfare schemes facilitated per applicable government orders and college notices',
          'Tuition assistance information pending official circular release by the administration',
          'Application windows and portal submission procedures will be published upon official notification',
        ],
      },
      {
        title: 'Institutional & Trust Assistance',
        subtitle: 'Munoth Jain Educational Trust Endowments',
        description:
          'Educational assistance initiatives provided through the Trust to encourage diligent students requiring financial consideration.',
        iconName: 'HeartHandshake',
        bulletPoints: [
          'Trust concession considerations subject to verified administrative application',
          'Endowment details and eligibility criteria subject to official Trust notifications',
          'Application procedures to be published upon administrative clearance',
        ],
      },
      {
        title: 'Merit & Sports Recognitions',
        subtitle: 'Academic & Athletic Recognitions',
        description:
          'Encouragement and institutional felicitations for students achieving distinguished standing in academic and athletic pursuits.',
        iconName: 'Trophy',
        bulletPoints: [
          'Academic recognition guidelines and eligibility cutoffs pending official release',
          'Sports quota and athletics assistance terms subject to college verification',
          'External foundation scholarship guidance provided by the Administrative Office',
        ],
      },
    ],
    associatedBuildings: [
      {
        buildingId: 'main-block',
        buildingName: 'Main Block (Administration)',
        modelPosition: [193.6, 0.2, -48.4],
        description: 'Administrative Office handles student scholarship documentation, government verifications, and trust submissions.',
        floorCountLabel: 'G+1 Floors',
      },
    ],
    officialContact: {
      officeName: 'Student Welfare & Scholarship Section',
      locationDescription: 'Main Block Administrative Wing (Near Principal Office)',
      buildingId: 'main-block',
      recommendedContactMethod: 'Contact the Scholarship Desk in Main Block for official government application deadlines.',
    },
  },
  {
    id: 'placements',
    title: 'Training & Career Placements',
    shortTitle: 'Placements',
    tagline: 'Career Development, Industry Drives & Employability Enhancement',
    description:
      'Discover the Career Guidance and Placement Cell, campus recruitment procedures, industry collaboration initiatives, and pre-placement training modules.',
    badge: 'Placement Overview • Official Records Pending Verification',
    iconName: 'Briefcase',
    isOfficialDataLoaded: false,
    statusNotice:
      'Official placement statistics, audited recruiter directories, and corporate tie-up listings for recent graduating batches are being verified by the Placement Cell and will be released here.',
    narrationText:
      'Welcome to the career guidance and placement overview for Misrimal Navajee Munoth Jain Engineering College. The Placement Cell coordinates pre-placement preparation, aptitude development, and campus recruitment drives. Official recruitment statistics, verified recruiter directories, salary distributions, and training schedules are undergoing administrative audit and will be published here upon official clearance. For current placement updates, please contact the Placement Cell in the Main Block.',
    narrationSummary:
      'Overview of placement cell activities, corporate recruitment processes, and pre-placement skill development programs.',
    previewTopics: [
      {
        title: 'Employability Skill Enhancement',
        subtitle: 'Career Readiness & Professional Preparation',
        description:
          'Pre-placement training modules designed to strengthen problem-solving capabilities, professional communication, and technical aptitude.',
        iconName: 'CheckCircle2',
        bulletPoints: [
          'Aptitude training, logical reasoning exercises, and verbal communication workshops',
          'Foundational programming exercises and technical interview preparation',
          'Resume writing guidance and mock interview practice sessions',
        ],
      },
      {
        title: 'On-Campus Recruitment Drives',
        subtitle: 'Recruitment Procedures & Corporate Engagement',
        description:
          'Facilitation of campus recruitment drives, company presentations, assessment rounds, and interview scheduling.',
        iconName: 'Building',
        bulletPoints: [
          'Campus recruitment procedures and corporate engagement frameworks detailed upon verification',
          'Recruitment drives and company visit schedules published per administrative placement calendar',
          'Internship and pre-placement guidelines subject to Placement Cell circulars',
        ],
      },
      {
        title: 'Industry Institute Partnerships',
        subtitle: 'Professional Engagement & Technical Activities',
        description:
          'Academic-industry interaction initiatives, guest technical sessions, and student professional development activities.',
        iconName: 'Handshake',
        bulletPoints: [
          'Industry interaction programs and professional society activities pending official documentation',
          'Collaborative initiatives and technical seminars subject to departmental notification',
          'Alumni interaction sessions and graduate career guidance opportunities',
        ],
      },
    ],
    associatedBuildings: [
      {
        buildingId: 'main-block',
        buildingName: 'Main Block (Placement Cell & Auditory Halls)',
        modelPosition: [193.6, 0.2, -48.4],
        description: 'Hosts the centralized Placement Cell, corporate interview chambers, and pre-placement presentation auditoria.',
        floorCountLabel: 'G+1 Floors',
      },
      {
        buildingId: 'open-air-theatre',
        buildingName: 'Open Air Theatre (OAT)',
        modelPosition: [227.5, 0.33, -66.5],
        description: 'Large outdoor amphitheatre used for college-wide career assemblies, annual gatherings, and celebratory events.',
        floorCountLabel: 'Outdoor Amphitheatre',
      },
    ],
    officialContact: {
      officeName: 'Career Guidance & Placement Cell',
      locationDescription: 'Main Block First Floor / Corporate Training Suite',
      buildingId: 'main-block',
      recommendedContactMethod: 'Direct inquiries to the Placement Officer during academic hours.',
    },
  },
]

export function getDiscoverCategoryById(id: DiscoverCategoryId): DiscoverCategoryData | undefined {
  return DISCOVER_CATEGORIES.find((cat) => cat.id === id)
}
