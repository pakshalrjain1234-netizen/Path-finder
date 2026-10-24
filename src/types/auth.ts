export type UserRole = 'admin' | 'student' | 'visitor'

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  department?: string
  studentId?: string
  avatarUrl?: string
}

export interface AuthSession {
  user: User
  token: string
  expiresAt: number
  isDemo: boolean
}

export interface AuthState {
  user: User | null
  role: UserRole
  isAuthenticated: boolean
  isDemo: boolean
  isLoading: boolean
}

export interface RolePermissions {
  canExploreCampus: boolean
  canTakeTour: boolean
  canSearchBuildings: boolean
  canUseNavigation: boolean
  canSubmitFeedback: boolean
  canSubmitIssue: boolean
  canViewOwnIssues: boolean
  canViewAllIssues: boolean
  canManageIssues: boolean
  canViewFeedbackDashboard: boolean
  canViewIssue3DMarkers: boolean
}
