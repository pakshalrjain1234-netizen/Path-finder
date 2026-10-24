export const ISSUE_CATEGORIES = [
  'Cleanliness',
  'Garbage accumulation',
  'Electrical / outdoor lighting',
  'Water leakage',
  'Waterlogging',
  'Damaged walkway',
  'Building exterior damage',
  'Accessibility obstruction',
  'General maintenance',
  'Other',
] as const

export type IssueCategory = (typeof ISSUE_CATEGORIES)[number]

export const ISSUE_STATUSES = [
  'SUBMITTED',
  'UNDER_REVIEW',
  'ASSIGNED',
  'IN_PROGRESS',
  'RESOLVED',
  'REJECTED',
] as const

export type IssueStatus = (typeof ISSUE_STATUSES)[number]

export const MAINTENANCE_TEAMS = [
  'Campus Electrical Works',
  'Civil & Walkways Team',
  'Sanitation & Housekeeping',
  'Plumbing & Water Supply Unit',
  'Estate & Horticulture Unit',
  'General Maintenance Crew',
] as const

export type MaintenanceTeam = (typeof MAINTENANCE_TEAMS)[number]

export interface IssueStatusUpdate {
  status: IssueStatus
  timestamp: string
  actorName: string
  actorRole: 'admin' | 'student' | 'system'
  notes?: string
  assignedTeam?: MaintenanceTeam | string
}

export interface CampusIssueReport {
  id: string
  reporterId: string
  reporterName: string
  reporterRole: 'student' | 'admin'
  category: IssueCategory
  description: string
  locationName: string
  buildingId?: string
  modelCoordinates: [number, number, number]
  photoUrl?: string
  createdAt: string
  updatedAt: string
  status: IssueStatus
  assignedTeam?: MaintenanceTeam | string
  resolutionNotes?: string
  history: IssueStatusUpdate[]
}

export interface CreateIssueInput {
  category: IssueCategory
  description: string
  locationName: string
  buildingId?: string
  modelCoordinates: [number, number, number]
  photoUrl?: string
}

export interface IssueStatistics {
  total: number
  submitted: number
  underReview: number
  assigned: number
  inProgress: number
  resolved: number
  rejected: number
  byCategory: Record<IssueCategory, number>
  byLocation: Record<string, number>
}
