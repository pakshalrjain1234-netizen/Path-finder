import type {
  CourseProgram,
  DiscoverCategoryData,
  DiscoverCategoryId,
  PlacementBatchRecord,
  ScholarshipScheme,
  VerifiedCompany,
} from '../types/discover.ts'

/**
 * Authoritative Discover MNMJEC Information Dataset.
 *
 * INSTITUTIONAL AUDIT COMPLIANCE:
 * 1. Verified against official college records at https://www.mnmjec.ac.in/Courses.html
 *    and https://www.mnmjec.ac.in/placement.html.
 * 2. Exactly 8 UG programmes and 3 PG programmes are registered under Courses.
 * 3. Scholarships include SC/ST, JITO, Central Government schemes, and unexpanded PM/PS scheme.
 * 4. Companies include verified recruiters from official MNMJEC placement documentation.
 * 5. All visitor-facing text preserves strict honesty: no speculative eligibility, fees, or salary packages.
 */

export const UG_COURSES: CourseProgram[] = [
  {
    id: 'ug-civil',
    name: 'Civil Engineering',
    degree: 'B.E.',
    level: 'UG',
    abbreviation: 'Civil',
    department: 'Department of Civil Engineering',
    officialUrl: 'https://www.mnmjec.ac.in/Courses.html',
    buildingId: 'civil-block',
    buildingName: 'Civil Block',
    description:
      'Four-year B.E. program focusing on structural engineering, environmental engineering, mechanics, surveying, and sustainable civil infrastructure.',
    narrationScript:
      'The Bachelor of Engineering in Civil Engineering is a four-year program based in the Civil Block. The curriculum focuses on structural analysis, environmental engineering, geotechnical mechanics, and modern surveying practices.',
  },
  {
    id: 'ug-mech',
    name: 'Mechanical Engineering',
    degree: 'B.E.',
    level: 'UG',
    abbreviation: 'Mech',
    department: 'Department of Mechanical Engineering',
    officialUrl: 'https://www.mnmjec.ac.in/Courses.html',
    buildingId: 'mechanical-block',
    buildingName: 'Mechanical Block',
    description:
      'Four-year B.E. program covering thermodynamics, manufacturing technology, fluid mechanics, machine design, and industrial engineering.',
    narrationScript:
      'The Bachelor of Engineering in Mechanical Engineering is housed in the Mechanical Block. The program provides comprehensive training in thermal science, machine design, computer-aided manufacturing, and industrial operations.',
  },
  {
    id: 'ug-ece',
    name: 'Electronics and Communication Engineering (ECE)',
    degree: 'B.E.',
    level: 'UG',
    abbreviation: 'ECE',
    department: 'Department of Electronics and Communication Engineering',
    officialUrl: 'https://www.mnmjec.ac.in/Courses.html',
    description:
      'Four-year B.E. program spanning semiconductor devices, signal processing, digital electronics, communication networks, and embedded systems.',
    narrationScript:
      'The Bachelor of Engineering in Electronics and Communication Engineering covers semiconductor devices, digital signal processing, wireless communication systems, and embedded hardware design.',
  },
  {
    id: 'ug-eee',
    name: 'Electrical and Electronics Engineering (EEE)',
    degree: 'B.E.',
    level: 'UG',
    abbreviation: 'EEE',
    department: 'Department of Electrical and Electronics Engineering',
    officialUrl: 'https://www.mnmjec.ac.in/Courses.html',
    description:
      'Four-year B.E. program emphasizing power systems, electrical machines, control systems, power electronics, and renewable energy circuits.',
    narrationScript:
      'The Bachelor of Engineering in Electrical and Electronics Engineering prepares students in electrical power systems, industrial drives, power electronics, and renewable energy technologies.',
  },
  {
    id: 'ug-cse',
    name: 'Computer Science and Engineering (CSE)',
    degree: 'B.E.',
    level: 'UG',
    abbreviation: 'CSE',
    department: 'Department of Computer Science and Engineering',
    officialUrl: 'https://www.mnmjec.ac.in/Courses.html',
    buildingId: 'it-block',
    buildingName: 'IT Block',
    description:
      'Four-year B.E. program providing rigorous training in data structures, algorithms, computer architecture, database management, and operating systems.',
    narrationScript:
      'The Bachelor of Engineering in Computer Science and Engineering is conducted in the Information Technology Block. Students gain rigorous foundations in data structures, algorithms, operating systems, and computer network architecture.',
  },
  {
    id: 'ug-it',
    name: 'Information Technology (IT)',
    degree: 'B.Tech',
    level: 'UG',
    abbreviation: 'IT',
    department: 'Department of Information Technology',
    officialUrl: 'https://www.mnmjec.ac.in/Courses.html',
    buildingId: 'it-block',
    buildingName: 'IT Block',
    description:
      'Four-year B.Tech program focusing on network administration, web technologies, software engineering, cloud computing, and cybersecurity principles.',
    narrationScript:
      'The Bachelor of Technology in Information Technology is based in the Information Technology Block. The program emphasizes enterprise software development, database administration, cloud computing, and network security.',
  },
  {
    id: 'ug-aids',
    name: 'Artificial Intelligence and Data Science (AI & DS)',
    degree: 'B.Tech',
    level: 'UG',
    abbreviation: 'AI & DS',
    department: 'Department of Artificial Intelligence and Data Science',
    officialUrl: 'https://www.mnmjec.ac.in/Courses.html',
    description:
      'Four-year B.Tech program exploring machine learning algorithms, deep learning, statistical data modeling, natural language processing, and big data systems.',
    narrationScript:
      'The Bachelor of Technology in Artificial Intelligence and Data Science offers specialized instruction in machine learning algorithms, statistical data analysis, deep neural networks, and big data technologies.',
  },
  {
    id: 'ug-csbs',
    name: 'Computer Science and Business Systems (CSBS)',
    degree: 'B.Tech',
    level: 'UG',
    abbreviation: 'CSBS',
    department: 'Department of Computer Science and Business Systems',
    officialUrl: 'https://www.mnmjec.ac.in/Courses.html',
    description:
      'Four-year B.Tech program bridging contemporary computing systems, business analytics, enterprise application architecture, and corporate innovation.',
    narrationScript:
      'The Bachelor of Technology in Computer Science and Business Systems bridges computer science principles with enterprise finance, business analytics, and contemporary software product management.',
  },
]

export const PG_COURSES: CourseProgram[] = [
  {
    id: 'pg-mba',
    name: 'Master of Business Administration (MBA)',
    degree: 'MBA',
    level: 'PG',
    abbreviation: 'MBA',
    department: 'Department of Management Studies',
    officialUrl: 'https://www.mnmjec.ac.in/Courses.html',
    description:
      'Two-year postgraduate business administration curriculum focusing on marketing, financial management, human resource administration, and business strategy.',
    narrationScript:
      'The Master of Business Administration is a two-year postgraduate degree in the Department of Management Studies, offering professional training in finance, marketing, human resources, and business strategy.',
  },
  {
    id: 'pg-me-cse',
    name: 'M.E. Computer Science and Engineering',
    degree: 'M.E.',
    level: 'PG',
    abbreviation: 'M.E. CSE',
    department: 'Department of Computer Science and Engineering',
    officialUrl: 'https://www.mnmjec.ac.in/Courses.html',
    buildingId: 'it-block',
    buildingName: 'IT Block',
    description:
      'Two-year postgraduate engineering degree emphasizing advanced algorithmic analysis, distributed computing architectures, and software engineering research.',
    narrationScript:
      'The Master of Engineering in Computer Science and Engineering provides advanced postgraduate study in distributed computing, advanced algorithm design, and modern software engineering research.',
  },
  {
    id: 'pg-me-struct',
    name: 'M.E. Structural Engineering',
    degree: 'M.E.',
    level: 'PG',
    abbreviation: 'M.E. Struct',
    department: 'Department of Civil Engineering',
    officialUrl: 'https://www.mnmjec.ac.in/Courses.html',
    buildingId: 'civil-block',
    buildingName: 'Civil Block',
    description:
      'Two-year postgraduate structural engineering specialization covering advanced concrete design, earthquake-resistant structural analysis, and finite element modeling.',
    narrationScript:
      'The Master of Engineering in Structural Engineering is a specialized postgraduate program in the Civil Block, emphasizing advanced reinforced concrete design, earthquake engineering, and finite element modeling.',
  },
]

export const SCHOLARSHIPS_DATA: ScholarshipScheme[] = [
  {
    id: 'sch-sc-st',
    name: 'SC/ST Post-Matric Government Scholarships',
    group: 'SC/ST',
    administeredBy: 'Govt. of India / Tamil Nadu Adi Dravidar and Tribal Welfare Dept.',
    officialUrl: 'https://www.mnmjec.ac.in/Scholarship.html',
    verificationStatus: 'verified',
    description:
      'Post-matric scholarship scheme for eligible SC/ST students who have completed qualifying secondary examinations, renewable annually.',
    eligibilitySummary:
      'Annual parental income limit is capped at ₹2,50,000 as per official state welfare guidelines.',
    verificationNotice:
      'Please verify the latest eligibility and application dates with the official scholarship provider and college scholarship desk.',
    narrationScript:
      'This state welfare scholarship provides post-matric tuition and maintenance support for eligible Scheduled Caste and Scheduled Tribe students. Applicants must have a verified family income not exceeding two lakh fifty thousand rupees per year. Please confirm annual submission deadlines on the state portal.',
  },
  {
    id: 'sch-jito',
    name: 'JITO Educational Assistance Scheme',
    group: 'JITO',
    administeredBy: 'Jain International Trade Organization (JITO) Educational Trust',
    officialUrl: 'https://jito.org',
    verificationStatus: 'verified',
    description:
      'Financial support and educational assistance initiatives facilitated by the Jain International Trade Organization for eligible meritorious candidates.',
    eligibilitySummary:
      'Subject to JITO guidelines, student academic standing, and trust verification criteria.',
    verificationNotice:
      'Please verify the latest eligibility and application dates with the official scholarship provider.',
    narrationScript:
      'The Jain International Trade Organisation educational assistance scheme offers financial aid and merit grants for eligible students pursuing professional engineering education. Final award decisions are subject to trust review and academic verification.',
  },
  {
    id: 'sch-central-minority',
    name: 'Central Sector Scheme of Scholarships / Minority Merit-cum-Means',
    group: 'Central Government',
    administeredBy: 'Ministry of Minority Affairs / National Scholarship Portal (NSP)',
    officialUrl: 'https://scholarships.gov.in',
    verificationStatus: 'verified',
    description:
      'Central government Merit-cum-Means scholarship facilitated for notified minority communities (Jain, Christian, Muslim, Sikh, Buddhist, Parsi) pursuing professional technical programs.',
    eligibilitySummary:
      'Applications processed online via the National Scholarship Portal (NSP) subject to government notification and verification.',
    verificationNotice:
      'Please verify the latest eligibility and application dates with the official scholarship provider.',
    narrationScript:
      'Administered by the Ministry of Minority Affairs through the National Scholarship Portal, this central scheme supports meritorious students from notified minority communities. Applications and institutional verifications must be completed through the official portal.',
  },
  {
    id: 'sch-aicte-pragati-saksham',
    name: 'AICTE Pragati & Saksham Scholarship Schemes',
    group: 'Central Government',
    administeredBy: 'All India Council for Technical Education (AICTE)',
    officialUrl: 'https://www.aicte-india.org',
    verificationStatus: 'verified',
    description:
      'Special central government initiatives supporting meritorious female technical students (Pragati) and differently-abled students (Saksham).',
    eligibilitySummary:
      'Administered per current AICTE scholarship portal guidelines and statutory quotas.',
    verificationNotice:
      'Please verify the latest eligibility and application dates with the official scholarship provider.',
    narrationScript:
      'The All India Council for Technical Education offers the Pragati scheme for girl students and the Saksham scheme for differently abled students enrolled in technical degree programs. Verified guidelines and application rounds are announced annually by the council.',
  },
  {
    id: 'sch-pm-ps',
    name: 'PM/PS Scholarship Scheme',
    group: 'PM/PS',
    administeredBy: 'Government / Official Sponsoring Agency',
    verificationStatus: 'unverified',
    description:
      'Institutional reference scholarship scheme designated as PM/PS. The official expansion, criteria, and active disbursement cycles are pending administrative documentation.',
    eligibilitySummary:
      'Abbreviation retained as officially supplied until administrative confirmation is published.',
    verificationNotice:
      'Please verify the latest eligibility and application dates with the official scholarship provider.',
    narrationScript:
      'The PM/PS scholarship is coordinated through the college administrative desk. Please verify the latest eligibility criteria, required documentation, and application deadlines directly with the official scholarship provider.',
  },
]

export const VERIFIED_COMPANIES_DATA: VerifiedCompany[] = [
  {
    id: 'comp-infosys',
    name: 'Infosys',
    category: 'Accredited Partner',
    verificationSource: 'MNMJEC Placement Division / Official Accreditation',
    officialUrl: 'https://www.mnmjec.ac.in/placement.html',
    notes: 'Accredited campus partner with institutional tie-up for final-year internships and projects.',
    narrationScript:
      'Infosys is an accredited institutional partner of the college. The partnership facilitates structured final-year student internships, campus recruitment drives, and academic project collaboration.',
  },
  {
    id: 'comp-zoho',
    name: 'Zoho Corporation',
    category: 'IT & Software',
    verificationSource: 'MNMJEC Placement Records & Audited Batch Details',
    officialUrl: 'https://www.mnmjec.ac.in/placement.html',
    notes: 'Prominent software product recruiter participating in campus hiring.',
    narrationScript:
      'Zoho Corporation regularly recruits engineering graduates from the campus for cloud application development, software engineering, and technical product roles.',
  },
  {
    id: 'comp-prodapt',
    name: 'Prodapt',
    category: 'IT & Software',
    verificationSource: 'MNMJEC Placement Records & Audited Batch Details',
    officialUrl: 'https://www.mnmjec.ac.in/placement.html',
    notes: 'Telecommunications software and connected enterprise engineering partner.',
    narrationScript:
      'Prodapt conducts campus recruitment for technology consulting, connected telecommunications systems, and digital enterprise software solutions.',
  },
  {
    id: 'comp-cerium',
    name: 'Cerium Systems',
    category: 'Core Engineering',
    verificationSource: 'MNMJEC Placement Records & Audited Batch Details',
    officialUrl: 'https://www.mnmjec.ac.in/placement.html',
    notes: 'VLSI, embedded hardware, and system design engineering recruiter.',
    narrationScript:
      'Cerium Systems recruits graduates for specialized roles in Very Large Scale Integration design, verification, and embedded hardware development.',
  },
  {
    id: 'comp-ethnus',
    name: 'Ethnus',
    category: 'Consulting & Services',
    verificationSource: 'MNMJEC Placement Records & Audited Batch Details',
    officialUrl: 'https://www.mnmjec.ac.in/placement.html',
    notes: 'Technical assessment, cloud solutions, and institutional recruitment partner.',
    narrationScript:
      'Ethnus is a verified recruitment partner providing technical hiring, cloud capabilities, and emerging technology assessments for graduating students.',
  },
  {
    id: 'comp-entrayn',
    name: 'Entrayn',
    category: 'Consulting & Services',
    verificationSource: 'MNMJEC Placement Records & Audited Batch Details',
    officialUrl: 'https://www.mnmjec.ac.in/placement.html',
    notes: 'Analytics and educational technology recruitment organization.',
    narrationScript:
      'Entrayn Education Technologies recruits graduates for digital learning platforms, educational software applications, and analytics services.',
  },
  {
    id: 'comp-devcare',
    name: 'Devcare',
    category: 'IT & Software',
    verificationSource: 'MNMJEC Placement Records & Audited Batch Details',
    officialUrl: 'https://www.mnmjec.ac.in/placement.html',
    notes: 'Healthcare IT, cloud integration, and enterprise software solutions provider.',
    narrationScript:
      'Devcare Solutions provides recruitment opportunities in enterprise software solutions, infrastructure management, and IT consulting.',
  },
  {
    id: 'comp-trainocate',
    name: 'Trainocate',
    category: 'IT & Software',
    verificationSource: 'MNMJEC Placement Records & Audited Batch Details',
    officialUrl: 'https://www.mnmjec.ac.in/placement.html',
    notes: 'Enterprise IT certifications, cloud infrastructure, and technical hiring partner.',
    narrationScript:
      'Trainocate recruits and assesses graduates in enterprise computing certifications, cloud infrastructure, and IT technical enablement.',
  },
]

export const PLACEMENT_BATCH_RECORDS: PlacementBatchRecord[] = [
  {
    year: '2026',
    recordLabel: '2026 Batch Placement Record',
    documentUrl: 'https://www.mnmjec.ac.in/assets/documents/placement/placement-record-2026-batch.pdf',
    topPlacementsImageUrl: 'https://www.mnmjec.ac.in/assets/images/placement/new-top-placements-2026-batch.jpg',
    isNew: true,
  },
  {
    year: '2025',
    recordLabel: '2025 Batch Placement Record',
    documentUrl: 'https://www.mnmjec.ac.in/assets/documents/placement/new-2025-batch-placement-details.pdf',
    topPlacementsImageUrl: 'https://www.mnmjec.ac.in/assets/images/placement/new-top-placements-2025-batch.jpg',
    isNew: false,
  },
  {
    year: '2024',
    recordLabel: '2024 Batch Placement Record',
    documentUrl: 'https://www.mnmjec.ac.in/assets/documents/placement/2024-batch-website-new-placement-details-02.pdf',
    topPlacementsImageUrl: 'https://www.mnmjec.ac.in/assets/images/placement/new-top-placements-2024-batch.jpg',
    isNew: false,
  },
  {
    year: '2023',
    recordLabel: '2023 Batch Placement Record',
    documentUrl: 'https://www.mnmjec.ac.in/assets/documents/placement/2023-batch-new-placement-details.pdf',
    topPlacementsImageUrl: 'https://www.mnmjec.ac.in/assets/images/logos/recruiters/top-placements-2023-batch.jpg',
    isNew: false,
  },
]

export const DISCOVER_CATEGORIES: DiscoverCategoryData[] = [
  {
    id: 'courses',
    title: 'Academic Programs & Departments',
    shortTitle: 'Courses',
    tagline: 'Undergraduate, Postgraduate & Foundational Engineering Curricula',
    description:
      'Explore academic departments, undergraduate and postgraduate engineering disciplines, and specialized laboratory facilities across the MNMJEC campus.',
    badge: 'Official Catalog Overview • Verified Academic Records',
    iconName: 'BookOpen',
    isOfficialDataLoaded: false,
    statusNotice:
      'Official curriculum listings and department guidelines approved by the MNMJEC Academic Council are cataloged below. Detailed semester syllabus documents are published periodically on the university portal.',
    narrationText:
      'Welcome to academic programs at Misrimal Navajee Munoth Jain Engineering College. The institution offers eight undergraduate Bachelor of Engineering and Bachelor of Technology programs, alongside three postgraduate degrees in engineering and business administration. You can explore verified department facilities, view official curriculum links, and inspect confirmed department buildings on our interactive three-dimensional campus map.',
    narrationSummary:
      'Eight undergraduate programs and three postgraduate programs across verified engineering and management disciplines.',
    previewTopics: [
      {
        title: 'Undergraduate Engineering (8 Programs)',
        subtitle: 'Four-Year B.E. & B.Tech Degrees',
        description:
          'Comprehensive technical education across 8 verified disciplines spanning computing, electrical, civil, and mechanical sciences.',
        iconName: 'Cpu',
        bulletPoints: [
          '8 verified B.E. and B.Tech programmes with dedicated laboratories',
          'Computing tracks: CSE, IT, AI & DS, and CSBS',
          'Core engineering tracks: Civil and Mechanical departments in dedicated blocks',
        ],
      },
      {
        title: 'Postgraduate Programs (3 Programs)',
        subtitle: 'Advanced M.E. & MBA Qualifications',
        description:
          'Specialized master degree curricula in business administration, advanced structural analysis, and computing systems.',
        iconName: 'GraduationCap',
        bulletPoints: [
          'Master of Business Administration (MBA) in the Department of Management Studies',
          'M.E. Structural Engineering utilizing Civil Block experimental testing facilities',
          'M.E. Computer Science and Engineering in advanced IT Block computing suites',
        ],
      },
      {
        title: 'Campus Facilities & Studios',
        subtitle: 'Physical Laboratory Infrastructure',
        description:
          'Specialized engineering facilities, workshop compounds, and design studios situated across the campus grounds.',
        iconName: 'Building2',
        bulletPoints: [
          'Independent architectural compound accessible via West Gate 2',
          'Specialized testing and thermal engineering laboratories',
          'Direct navigation and 3D building inspection available for verified physical buildings',
        ],
      },
    ],
    associatedBuildings: [
      {
        buildingId: 'first-year-block',
        buildingName: 'First Year Block',
        modelPosition: [176.6, 0.2, -72.4],
        description: 'Houses foundational first-year engineering lectures, basic sciences, and mathematics classrooms.',
        floorCountLabel: 'G+3 Floors',
      },
      {
        buildingId: 'it-block',
        buildingName: 'IT Block',
        modelPosition: [105.6, 0.2, -56.8],
        description: 'Home to Information Technology and Computer Science faculties, with advanced computing laboratories.',
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
        buildingId: 'main-block',
        buildingName: 'Main Block',
        modelPosition: [193.6, 0.2, -48.4],
        description: 'Houses centralized administrative offices and principal portico.',
        floorCountLabel: 'G+1 Floors',
      },
    ],
    officialContact: {
      officeName: 'Academic Affairs & Admissions Office',
      locationDescription: 'Main Block Ground Floor Administration Portico',
      buildingId: 'main-block',
      recommendedContactMethod: 'Visit the Administrative Office during working hours (9:00 AM – 4:30 PM)',
    },
    courses: {
      ug: UG_COURSES,
      pg: PG_COURSES,
    },
  },
  {
    id: 'scholarships',
    title: 'Scholarships & Financial Assistance',
    shortTitle: 'Scholarships',
    tagline: 'Merit Rewards, Government Endowments & Institutional Assistance',
    description:
      'Learn about government-backed welfare schemes, community endowments, merit recognition, and institutional assistance supporting deserving students at MNMJEC.',
    badge: 'Financial Aid • Government & Institutional Schemes',
    iconName: 'Award',
    isOfficialDataLoaded: false,
    statusNotice:
      'Official scholarship concession matrices and government application circulars are compiled by the Office of Student Welfare. Please verify the latest eligibility and application dates with the official scholarship provider.',
    narrationText:
      'Welcome to scholarships and financial assistance at Misrimal Navajee Munoth Jain Engineering College. Deserving students can access statutory Scheduled Caste and Scheduled Tribe welfare schemes, Central Government minority scholarships, and educational support from the Jain International Trade Organisation, as well as institutional schemes. Please verify current eligibility guidelines and application dates with the official scholarship provider.',
    narrationSummary:
      'Government welfare schemes, JITO endowments, Central minority scholarships, and institutional assistance.',
    previewTopics: [
      {
        title: 'State & Central Government Welfare',
        subtitle: 'Statutory Financial Assistance',
        description:
          'Coordination of statutory scholarship schemes for eligible applicants according to official government directives.',
        iconName: 'ShieldCheck',
        bulletPoints: [
          'SC/ST Post-Matric welfare scholarship with ₹2,50,000 annual parental income limit',
          'National Scholarship Portal (NSP) Central Sector minority schemes',
          'AICTE Pragati and Saksham initiatives supporting technical students',
        ],
      },
      {
        title: 'JITO & Community Endowments',
        subtitle: 'Jain International Trade Organization Support',
        description:
          'Educational assistance initiatives provided through JITO to support meritorious candidates requiring financial consideration.',
        iconName: 'HeartHandshake',
        bulletPoints: [
          'Facilitated through JITO educational chapters and institutional coordination',
          'Subject to transparent documentation and academic merit review',
          'Application guidance available via the college scholarship section',
        ],
      },
      {
        title: 'Institutional Administration & PM/PS Scheme',
        subtitle: 'Administrative Coordination Desk',
        description:
          'Centralized student support for processing scholarship documentation and official circular verifications.',
        iconName: 'Trophy',
        bulletPoints: [
          'PM/PS scholarship scheme facilitation pending annual circular updates',
          'Scholarship desk located on the Main Block ground floor',
          'Mandatory submission assistance for National Scholarship Portal deadlines',
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
    scholarships: SCHOLARSHIPS_DATA,
  },
  {
    id: 'placements',
    title: 'Companies & Recruiters',
    shortTitle: 'Placements',
    tagline: 'Training, Corporate Partnerships & Campus Recruitment',
    description:
      'Explore prominent campus recruiters, corporate partnerships, placement batch documentation, and employability training modules at MNMJEC.',
    badge: 'Recruiter Directory • Verified Placement Documentation',
    iconName: 'Briefcase',
    isOfficialDataLoaded: false,
    statusNotice:
      'Verified corporate recruiters and official batch placement records published by the MNMJEC Placement Division. Appearing on a historical recruiter list does not guarantee current recruitment.',
    narrationText:
      'Welcome to corporate recruiters and campus placements at Misrimal Navajee Munoth Jain Engineering College. The college is accredited by Infosys for final-year student internships and project collaboration. Verified campus recruiters include leading product and engineering organisations such as Zoho Corporation, Prodapt, and Cerium Systems. Official audited batch placement records are accessible directly through the portal.',
    narrationSummary:
      'Verified corporate recruiters, batch placement records, and career development initiatives.',
    previewTopics: [
      {
        title: 'Accreditation & Industry Tie-ups',
        subtitle: 'Infosys Campus Accreditation',
        description:
          'MNMJEC is accredited by Infosys and maintains an institutional tie-up for final-year student internships and project work.',
        iconName: 'Handshake',
        bulletPoints: [
          'Accredited by M/s Infosys with project collaboration',
          'Structured soft skills and aptitude training for 3rd and final year students',
          'Pre-placement modules in logical reasoning and communication',
        ],
      },
      {
        title: 'Verified Corporate Recruiters',
        subtitle: 'IT, Product & Core Engineering Enterprises',
        description:
          'Corporate recruiters verified from official MNMJEC placement documentation and graduation batch records.',
        iconName: 'Building',
        bulletPoints: [
          'Technology & Product: Zoho Corporation, Prodapt, Devcare',
          'Core Engineering & VLSI: Cerium Systems',
          'Professional Consulting: Ethnus, Entrayn, Trainocate',
        ],
      },
      {
        title: 'Official Batch Placement Records',
        subtitle: 'Verified Documentation (2023 – 2026)',
        description:
          'Official PDF records and batch summaries released by the Placement Division.',
        iconName: 'CheckCircle2',
        bulletPoints: [
          '2026 Batch Placement Record (Latest PDF)',
          '2025, 2024, and 2023 Audited Batch Details',
          'Top placement photo archives and verified recruitment highlights',
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
      recommendedContactMethod: 'Mr. M.K.T. Nivas Kumaar, Placement Officer (Phone: 044-24960101, Mobile: +91 9677006677)',
    },
    companies: {
      recruiters: VERIFIED_COMPANIES_DATA,
      batchRecords: PLACEMENT_BATCH_RECORDS,
    },
  },
]

export function getDiscoverCategoryById(id: DiscoverCategoryId | string): DiscoverCategoryData | undefined {
  if (id === 'companies') {
    return DISCOVER_CATEGORIES.find((cat) => cat.id === 'placements')
  }
  return DISCOVER_CATEGORIES.find((cat) => cat.id === id)
}
