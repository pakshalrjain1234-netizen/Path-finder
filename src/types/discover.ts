import type { CampusBuildingId } from '../data/campusModelMapping.ts'
import type { Point3 } from './navigation.ts'

export type DiscoverCategoryId = 'courses' | 'scholarships' | 'placements'

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
}

export type NarrationPlaybackState = 'idle' | 'playing' | 'paused' | 'ended'
