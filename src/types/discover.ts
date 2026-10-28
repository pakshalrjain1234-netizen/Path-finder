import type { CampusBuildingId } from '../data/campusModelMapping.ts'
import type { Point3 } from './navigation.ts'

export type DiscoverCategoryId = 'courses' | 'scholarships' | 'placements' | 'companies'

export type DiscoverContentStatus = 'official' | 'pending_official'

export interface AcademicDepartmentLink {
  buildingId: CampusBuildingId
  buildingName: string
  modelPosition: Point3
  description: string
  floorCountLabel?: string
}

export interface DiscoverPreviewTopic {
  title: string
  subtitle: string
  description: string
  iconName: string
  bulletPoints: string[]
}

export interface DiscoverOfficialContact {
  officeName: string
  locationDescription: string
  buildingId: CampusBuildingId
  recommendedContactMethod: string
}

export interface CourseProgram {
  id: string
  name: string
  degree: 'B.E.' | 'B.Tech' | 'M.E.' | 'MBA'
  level: 'UG' | 'PG'
  abbreviation: string
  department: string
  officialUrl: string
  buildingId?: CampusBuildingId
  buildingName?: string
  description: string
  narrationScript?: string
}

export interface ScholarshipScheme {
  id: string
  name: string
  group: 'SC/ST' | 'JITO' | 'Central Government' | 'PM/PS'
  administeredBy: string
  officialUrl?: string
  verificationStatus: 'verified' | 'unverified'
  description: string
  eligibilitySummary?: string
  verificationNotice: string
  narrationScript?: string
}

export interface VerifiedCompany {
  id: string
  name: string
  category: 'IT & Software' | 'Core Engineering' | 'Consulting & Services' | 'Accredited Partner'
  verificationSource: string
  officialUrl: string
  notes?: string
  narrationScript?: string
}

export interface PlacementBatchRecord {
  year: string
  recordLabel: string
  documentUrl: string
  topPlacementsImageUrl?: string
  isNew?: boolean
}

export interface DiscoverCategoryData {
  id: DiscoverCategoryId
  title: string
  shortTitle: string
  tagline: string
  description: string
  badge: string
  iconName: string
  isOfficialDataLoaded: boolean
  statusNotice: string
  narrationText: string
  narrationSummary: string
  previewTopics: DiscoverPreviewTopic[]
  associatedBuildings: AcademicDepartmentLink[]
  officialContact: DiscoverOfficialContact
  courses?: {
    ug: CourseProgram[]
    pg: CourseProgram[]
  }
  scholarships?: ScholarshipScheme[]
  companies?: {
    recruiters: VerifiedCompany[]
    batchRecords: PlacementBatchRecord[]
  }
}

export type NarrationPlaybackState = 'idle' | 'playing' | 'paused' | 'ended'

