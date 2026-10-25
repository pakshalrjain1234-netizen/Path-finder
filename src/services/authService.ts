import { isSupabaseConfigured, supabase } from '../lib/supabaseClient.ts'
import type { AuthSession, RolePermissions, User, UserRole } from '../types/auth'

const AUTH_STORAGE_KEY = 'pathfinder_auth_session'
const VISITOR_SESSION_KEY = 'pathfinder_visitor_session'

// Demonstration User Accounts (clearly designated for local prototype testing)
export const DEMO_USERS: Record<Exclude<UserRole, 'visitor'>, User> = {
  admin: {
    id: 'usr-admin-01',
    name: 'Dr. K. Ramanathan (Estate Officer)',
    email: 'admin@mnmjec.ac.in',
    role: 'admin',
    department: 'Campus Estate & Operations',
  },
  student: {
    id: 'usr-student-01',
    name: 'Aditya Sundaram',
    email: 'aditya.s@student.mnmjec.ac.in',
    role: 'student',
    department: 'Computer Science & Engineering',
    studentId: '311822104018',
  },
}

export const VISITOR_USER: User = {
  id: 'usr-visitor-guest',
  name: 'Campus Visitor',
  email: 'guest@visitor.mnmjec.ac.in',
  role: 'visitor',
}

// Local demonstration credentials (not production passwords)
const DEMO_CREDENTIALS = {
  admin: {
    username: 'admin',
    password: 'admin@demo2026',
  },
  student: {
    username: 'student',
    password: 'student@demo2026',
  },
}

export function getRolePermissions(role: UserRole): RolePermissions {
  switch (role) {
    case 'admin':
      return {
        canExploreCampus: true,
        canTakeTour: true,
        canSearchBuildings: true,
        canUseNavigation: true,
        canSubmitFeedback: true,
        canSubmitIssue: true,
        canViewOwnIssues: true,
        canViewAllIssues: true,
        canManageIssues: true,
        canViewFeedbackDashboard: true,
        canViewIssue3DMarkers: true,
      }
    case 'student':
      return {
        canExploreCampus: true,
        canTakeTour: true,
        canSearchBuildings: true,
        canUseNavigation: true,
        canSubmitFeedback: true,
        canSubmitIssue: true,
        canViewOwnIssues: true,
        canViewAllIssues: false,
        canManageIssues: false,
        canViewFeedbackDashboard: false,
        canViewIssue3DMarkers: false,
      }
    case 'visitor':
    default:
      return {
        canExploreCampus: true,
        canTakeTour: true,
        canSearchBuildings: true,
        canUseNavigation: true,
        canSubmitFeedback: true,
        canSubmitIssue: false,
        canViewOwnIssues: false,
        canViewAllIssues: false,
        canManageIssues: false,
        canViewFeedbackDashboard: false,
        canViewIssue3DMarkers: false,
      }
  }
}

class AuthService {
  private currentSession: AuthSession | null = null
  private listeners: Array<(session: AuthSession | null) => void> = []
  private initPromise: Promise<void>

  constructor() {
    this.initPromise = this.restoreSession()
    this.initSupabaseListener()
  }

  public async waitForInit(): Promise<void> {
    return this.initPromise
  }

  private initSupabaseListener() {
    if (!isSupabaseConfigured || !supabase) return

    supabase.auth.onAuthStateChange(async (event, sbSession) => {
      if (event === 'SIGNED_OUT' || !sbSession) {
        if (this.currentSession && this.currentSession.user.role !== 'visitor') {
          this.currentSession = null
          this.notify()
        }
      } else if (sbSession && sbSession.user) {
        // Only load if not visitor or different user
        if (this.currentSession?.user.role !== 'visitor') {
          await this.loadUserProfile(sbSession.user.id, sbSession.access_token, sbSession.expires_at)
        }
      }
    })
  }

  private async loadUserProfile(userId: string, accessToken: string, expiresAt?: number) {
    if (!supabase) return

    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (!error && profile) {
        const user: User = {
          id: profile.id,
          name: profile.display_name,
          email: profile.email,
          role: profile.role as UserRole,
          department: profile.department || undefined,
          studentId: profile.student_id || undefined,
          avatarUrl: profile.avatar_url || undefined,
        }

        const session: AuthSession = {
          user,
          token: accessToken,
          expiresAt: expiresAt ? expiresAt * 1000 : Date.now() + 3600000,
          isDemo: false,
        }

        this.currentSession = session
        this.notify()
      }
    } catch (e) {
      console.warn('Failed to load user profile from Supabase:', e)
    }
  }

  private async restoreSession() {
    if (typeof window === 'undefined') return

    // 1. If Supabase is configured, check Supabase Auth session first
    if (isSupabaseConfigured && supabase) {
      try {
        const { data } = await supabase.auth.getSession()
        if (data.session && data.session.user) {
          await this.loadUserProfile(
            data.session.user.id,
            data.session.access_token,
            data.session.expires_at
          )
          return
        }
      } catch {
        // continue to local check
      }
    }

    // 2. Check local storage for active student/admin demo accounts ONLY
    // Purge any stale visitor session stored in localStorage from earlier builds
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY)
      if (stored) {
        const parsed: AuthSession = JSON.parse(stored)
        if (parsed?.user?.role === 'visitor') {
          // Clear stale or conflicting visitor-session state safely
          localStorage.removeItem(AUTH_STORAGE_KEY)
        } else if (parsed.expiresAt > Date.now()) {
          // If Supabase is configured, we do NOT restore mock student/admin accounts from localStorage!
          if (isSupabaseConfigured && parsed.isDemo) {
            localStorage.removeItem(AUTH_STORAGE_KEY)
            this.currentSession = null
          } else {
            this.currentSession = parsed
            return
          }
        } else {
          localStorage.removeItem(AUTH_STORAGE_KEY)
          this.currentSession = null
        }
      }
    } catch {
      this.currentSession = null
    }

    // 3. Check sessionStorage for active visitor session within this specific tab ONLY
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        const visitorStored = sessionStorage.getItem(VISITOR_SESSION_KEY)
        if (visitorStored) {
          const parsed: AuthSession = JSON.parse(visitorStored)
          if (parsed?.user?.role === 'visitor' && parsed.expiresAt > Date.now()) {
            this.currentSession = parsed
            return
          } else {
            sessionStorage.removeItem(VISITOR_SESSION_KEY)
          }
        }
      }
    } catch {
      // ignore
    }

    this.currentSession = null
  }

  public getSession(): AuthSession | null {
    return this.currentSession
  }

  public getUser(): User | null {
    return this.currentSession?.user ?? null
  }

  public getRole(): UserRole {
    return this.currentSession?.user.role ?? 'visitor'
  }

  public isAuthenticated(): boolean {
    return Boolean(this.currentSession && this.currentSession.user.role !== 'visitor')
  }

  public onAuthChange(listener: (session: AuthSession | null) => void): () => void {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener)
    }
  }

  private notify() {
    this.listeners.forEach((l) => l(this.currentSession))
  }

  public async login(
    role: 'admin' | 'student',
    usernameInput?: string,
    passwordInput?: string
  ): Promise<{ success: boolean; error?: string; session?: AuthSession }> {
    const rawUser = (usernameInput ?? '').trim()
    const password = passwordInput ?? ''

    // Supplying Supabase Real Authentication when configured
    if (isSupabaseConfigured && supabase) {
      if (!rawUser || !password) {
        return { success: false, error: 'Please enter your username and password.' }
      }

      // Convert username or handle to email address
      let email = rawUser
      if (!email.includes('@')) {
        if (rawUser.toLowerCase() === 'admin') email = 'admin@gmail.com'
        else if (rawUser.toLowerCase() === 'student') email = 'student@gmail.com'
        else email = `${rawUser}@gmail.com`
      }

      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error || !data.user || !data.session) {
          const errMsg = error?.message || 'Authentication failed.'
          if (
            errMsg.toLowerCase().includes('invalid login credentials') ||
            errMsg.toLowerCase().includes('invalid grant')
          ) {
            return {
              success: false,
              error: 'Invalid login credentials. Please verify your email and password.',
            }
          }
          return {
            success: false,
            error: errMsg,
          }
        }

        // Fetch verified role from profiles table
        const { data: profile, error: profileErr } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single()

        if (profileErr || !profile) {
          return {
            success: false,
            error: 'Authentication failed: User profile not found in campus database.',
          }
        }

        // Validate role access
        if (role === 'admin' && profile.role !== 'admin') {
          await supabase.auth.signOut()
          return {
            success: false,
            error: `Authorization Pending: Account '${profile.email}' is authenticated, but its database role in public.profiles is currently '${profile.role}'. Administrator role provisioning must be completed in Supabase before accessing the Admin Command Center.`,
          }
        }

        if (role === 'student' && profile.role !== 'student' && profile.role !== 'admin') {
          await supabase.auth.signOut()
          return {
            success: false,
            error: `Access Denied: Account '${profile.email}' has role '${profile.role}', which is not authorized for the Student Issue Passport.`,
          }
        }

        const user: User = {
          id: profile.id,
          name: profile.display_name,
          email: profile.email,
          role: profile.role as UserRole,
          department: profile.department || undefined,
          studentId: profile.student_id || undefined,
          avatarUrl: profile.avatar_url || undefined,
        }

        const session: AuthSession = {
          user,
          token: data.session.access_token,
          expiresAt: data.session.expires_at ? data.session.expires_at * 1000 : Date.now() + 3600000,
          isDemo: false,
        }

        this.currentSession = session
        try {
          if (typeof window !== 'undefined' && window.sessionStorage) {
            sessionStorage.removeItem(VISITOR_SESSION_KEY)
          }
        } catch {
          // ignore
        }
        this.notify()
        return { success: true, session }
      } catch (err: any) {
        return {
          success: false,
          error: err.message || 'Network error connecting to Supabase Auth service.',
        }
      }
    }

    // Offline / Demo Fallback Mode (Only active when Supabase is NOT configured)
    if (rawUser || password) {
      const creds = DEMO_CREDENTIALS[role]
      const userClean = rawUser.toLowerCase()
      const isUserMatch =
        userClean === creds.username.toLowerCase() ||
        userClean === DEMO_USERS[role].email.toLowerCase()
      const isPassMatch = password === creds.password

      if (!isUserMatch || !isPassMatch) {
        return {
          success: false,
          error: `Invalid credentials for ${role === 'admin' ? 'Administrator' : 'Student'} account.`,
        }
      }
    }

    const user = DEMO_USERS[role]
    const session: AuthSession = {
      user,
      token: `demo-token-${role}-${Date.now()}`,
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
      isDemo: true,
    }

    this.currentSession = session
    try {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session))
      if (typeof window !== 'undefined' && window.sessionStorage) {
        sessionStorage.removeItem(VISITOR_SESSION_KEY)
      }
    } catch {
      // ignore
    }

    this.notify()
    return { success: true, session }
  }

  public loginAsVisitor(): AuthSession {
    const session: AuthSession = {
      user: VISITOR_USER,
      token: `visitor-token-${Date.now()}`,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
      isDemo: false,
    }

    this.currentSession = session
    // Store visitor session ONLY in sessionStorage for the active tab session.
    // Never persist visitor mode into localStorage so fresh visits return to Role Selection.
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        sessionStorage.setItem(VISITOR_SESSION_KEY, JSON.stringify(session))
      }
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = localStorage.getItem(AUTH_STORAGE_KEY)
        if (stored) {
          const parsed = JSON.parse(stored)
          if (parsed?.user?.role === 'visitor') {
            localStorage.removeItem(AUTH_STORAGE_KEY)
          }
        }
      }
    } catch {
      // ignore
    }

    // Sign out from Supabase if an authenticated session was previously active
    if (isSupabaseConfigured && supabase) {
      supabase.auth.signOut().catch(() => {})
    }

    this.notify()
    return session
  }

  public async logout() {
    this.currentSession = null
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(AUTH_STORAGE_KEY)
        if (window.sessionStorage) {
          sessionStorage.removeItem(VISITOR_SESSION_KEY)
        }
      }
    } catch {
      // ignore
    }

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.auth.signOut()
      } catch {
        // ignore
      }
    }

    this.notify()
  }

  public getDemoCredentials() {
    return DEMO_CREDENTIALS
  }
}

export const authService = new AuthService()
