import { isSupabaseConfigured, supabase } from '../lib/supabaseClient.ts'
import { authService } from './authService.ts'
import type { User, UserRole } from '../types/auth'
import type {
  CampusIssueReport,
  CreateIssueInput,
  IssueCategory,
  IssueStatistics,
  IssueStatus,
  MaintenanceTeam,
} from '../types/issues'

const ISSUES_STORAGE_KEY = 'pathfinder_campus_issues'

// Initial realistic demonstration campus issues anchored to Stage E3 model coordinates
const SEED_ISSUES: CampusIssueReport[] = [
  {
    id: 'MNM-2026-0038',
    reporterId: 'usr-student-01',
    reporterName: 'Aditya Sundaram (CSE)',
    reporterRole: 'student',
    category: 'Water leakage',
    description: 'Outdoor drinking water faucet leaking near the Canteen east entrance, causing puddling along the pedestrian path.',
    locationName: 'Canteen & Dining Wing',
    buildingId: 'canteen',
    modelCoordinates: [128.4, 3.8, 14.5],
    createdAt: new Date(Date.now() - 36 * 3600 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
    status: 'IN_PROGRESS',
    assignedTeam: 'Plumbing & Water Supply Unit',
    resolutionNotes: 'Plumber dispatched with replacement valve gaskets. Scheduled for completion today.',
    history: [
      {
        status: 'SUBMITTED',
        timestamp: new Date(Date.now() - 36 * 3600 * 1000).toISOString(),
        actorName: 'Aditya Sundaram',
        actorRole: 'student',
        notes: 'Initial issue submitted with approximate location pin.',
      },
      {
        status: 'UNDER_REVIEW',
        timestamp: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
        actorName: 'Dr. K. Ramanathan (Estate Officer)',
        actorRole: 'admin',
        notes: 'Verified location near Canteen walkway. Forwarded to plumbing section.',
      },
      {
        status: 'IN_PROGRESS',
        timestamp: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
        actorName: 'Dr. K. Ramanathan (Estate Officer)',
        actorRole: 'admin',
        assignedTeam: 'Plumbing & Water Supply Unit',
        notes: 'Work order #PL-402 issued. Parts arriving this afternoon.',
      },
    ],
  },
  {
    id: 'MNM-2026-0041',
    reporterId: 'usr-student-01',
    reporterName: 'Aditya Sundaram (CSE)',
    reporterRole: 'student',
    category: 'Damaged walkway',
    description: 'Cracked paver blocks and uneven ground near Civil Block entrance ramp. Poses tripping hazard during rainy conditions.',
    locationName: 'Civil Block West Walkway',
    buildingId: 'civil-block',
    modelCoordinates: [58.2, 3.8, -12.4],
    createdAt: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 8 * 3600 * 1000).toISOString(),
    status: 'ASSIGNED',
    assignedTeam: 'Civil & Walkways Team',
    resolutionNotes: 'Walkway inspection completed. Concrete paving reset scheduled for Saturday.',
    history: [
      {
        status: 'SUBMITTED',
        timestamp: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
        actorName: 'Aditya Sundaram',
        actorRole: 'student',
        notes: 'Initial issue reported.',
      },
      {
        status: 'UNDER_REVIEW',
        timestamp: new Date(Date.now() - 20 * 3600 * 1000).toISOString(),
        actorName: 'Dr. K. Ramanathan (Estate Officer)',
        actorRole: 'admin',
        notes: 'Acknowledged. Safety cone placed temporarily.',
      },
      {
        status: 'ASSIGNED',
        timestamp: new Date(Date.now() - 8 * 3600 * 1000).toISOString(),
        actorName: 'Dr. K. Ramanathan (Estate Officer)',
        actorRole: 'admin',
        assignedTeam: 'Civil & Walkways Team',
        notes: 'Assigned to Civil maintenance crew for weekend repair.',
      },
    ],
  },
  {
    id: 'MNM-2026-0043',
    reporterId: 'usr-student-02',
    reporterName: 'Kavitha R. (ECE)',
    reporterRole: 'student',
    category: 'Electrical / outdoor lighting',
    description: 'Post lamp fixture flickering along the pathway between IT Block and Mechanical Block.',
    locationName: 'Pathway between IT & Mechanical Block',
    buildingId: 'it-block',
    modelCoordinates: [-15.5, 3.8, -22.0],
    createdAt: new Date(Date.now() - 14 * 3600 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
    status: 'SUBMITTED',
    history: [
      {
        status: 'SUBMITTED',
        timestamp: new Date(Date.now() - 14 * 3600 * 1000).toISOString(),
        actorName: 'Kavitha R.',
        actorRole: 'student',
        notes: 'Reported outdoor lighting issue.',
      },
    ],
  },
  {
    id: 'MNM-2026-0035',
    reporterId: 'usr-student-01',
    reporterName: 'Aditya Sundaram (CSE)',
    reporterRole: 'student',
    category: 'Garbage accumulation',
    description: 'Recycling bin overflowing near Xerox Shop and Apollo Shine service corridor.',
    locationName: 'Near Apollo Shine & Xerox Center',
    buildingId: 'apollo-shine',
    modelCoordinates: [146.5, 3.8, -19.0],
    createdAt: new Date(Date.now() - 72 * 3600 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 28 * 3600 * 1000).toISOString(),
    status: 'RESOLVED',
    assignedTeam: 'Sanitation & Housekeeping',
    resolutionNotes: 'Bins emptied and secondary collection bin installed. Area sanitized.',
    history: [
      {
        status: 'SUBMITTED',
        timestamp: new Date(Date.now() - 72 * 3600 * 1000).toISOString(),
        actorName: 'Aditya Sundaram',
        actorRole: 'student',
        notes: 'Initial issue reported.',
      },
      {
        status: 'ASSIGNED',
        timestamp: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
        actorName: 'Dr. K. Ramanathan (Estate Officer)',
        actorRole: 'admin',
        assignedTeam: 'Sanitation & Housekeeping',
        notes: 'Directed housekeeping supervisor to clean and add extra receptacle.',
      },
      {
        status: 'RESOLVED',
        timestamp: new Date(Date.now() - 28 * 3600 * 1000).toISOString(),
        actorName: 'Dr. K. Ramanathan (Estate Officer)',
        actorRole: 'admin',
        notes: 'Sanitation team confirmed clearance. Resolution verified.',
      },
    ],
  },
]

function makeThenable<T extends object>(res: T): Promise<T> & T {
  const p = Promise.resolve(res)
  return Object.assign(p, res)
}

class IssueService {
  private issues: CampusIssueReport[] = []
  private listeners: Array<() => void> = []
  private isSyncing = false

  constructor() {
    this.loadInitialData()
    this.initSupabaseRealtime()
    this.initAuthSync()
  }

  private initAuthSync() {
    if (!isSupabaseConfigured) return
    authService.onAuthChange((session) => {
      if (isSupabaseConfigured) {
        if (session && session.user.role !== 'visitor') {
          this.fetchFromSupabase()
        } else {
          this.issues = []
          this.notify()
        }
      }
    })
  }

  private loadInitialData() {
    if (typeof window === 'undefined') {
      this.issues = isSupabaseConfigured ? [] : [...SEED_ISSUES]
      return
    }

    if (isSupabaseConfigured) {
      this.issues = []
      if (supabase) {
        this.fetchFromSupabase()
      }
    } else {
      try {
        const stored = localStorage.getItem(ISSUES_STORAGE_KEY)
        if (stored) {
          this.issues = JSON.parse(stored)
        } else {
          this.issues = [...SEED_ISSUES]
          localStorage.setItem(ISSUES_STORAGE_KEY, JSON.stringify(this.issues))
        }
      } catch {
        this.issues = [...SEED_ISSUES]
      }
    }
  }

  private realtimeChannel: any = null

  private initSupabaseRealtime() {
    if (!isSupabaseConfigured || !supabase) return

    try {
      this.realtimeChannel = supabase
        .channel('campus_issues_realtime')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'campus_issues' },
          () => {
            this.fetchFromSupabase()
          }
        )
        .subscribe()
    } catch (e) {
      console.warn('Realtime subscription not supported or failed:', e)
    }
  }

  public cleanupSubscriptions() {
    if (this.realtimeChannel && supabase) {
      try {
        supabase.removeChannel(this.realtimeChannel)
      } catch {
        // ignore
      }
      this.realtimeChannel = null
    }
  }

  public clearPrivateData() {
    this.issues = []
    this.notify()
  }

  public loadSeedDataForTest() {
    this.issues = JSON.parse(JSON.stringify(SEED_ISSUES))
    this.notify()
  }

  public async fetchFromSupabase(): Promise<CampusIssueReport[]> {
    if (!isSupabaseConfigured || !supabase || this.isSyncing) {
      return this.issues
    }

    this.isSyncing = true
    try {
      const { data, error } = await supabase
        .from('campus_issues')
        .select(`
          id,
          reporter_id,
          category,
          description,
          location_name,
          building_id,
          model_coordinates,
          photo_url,
          status,
          assigned_team,
          resolution_notes,
          created_at,
          updated_at,
          history:issue_status_history (
            status,
            actor_name,
            actor_role,
            assigned_team,
            notes,
            created_at
          )
        `)
        .order('created_at', { ascending: false })

      if (!error && data) {
        this.issues = data.map((row: any) => {
          const hist = (row.history || []).map((h: any) => ({
            status: h.status as IssueStatus,
            timestamp: h.created_at,
            actorName: h.actor_name,
            actorRole: h.actor_role,
            notes: h.notes || undefined,
            assignedTeam: h.assigned_team || undefined,
          }))

          const firstHist = hist[0]
          return {
            id: row.id,
            reporterId: row.reporter_id,
            reporterName: firstHist?.actorName || 'Campus Student',
            reporterRole: (firstHist?.actorRole === 'admin' ? 'admin' : 'student') as 'student' | 'admin',
            category: row.category as IssueCategory,
            description: row.description,
            locationName: row.location_name,
            buildingId: row.building_id || undefined,
            modelCoordinates: Array.isArray(row.model_coordinates)
              ? (row.model_coordinates as [number, number, number])
              : [50.0, 3.8, 10.0],
            photoUrl: row.photo_url || undefined,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            status: row.status as IssueStatus,
            assignedTeam: row.assigned_team || undefined,
            resolutionNotes: row.resolution_notes || undefined,
            history: hist,
          }
        })
        this.notify()
      }
    } catch (e) {
      console.warn('Error fetching campus issues from Supabase:', e)
    } finally {
      this.isSyncing = false
    }

    return this.issues
  }

  private saveToStorage() {
    if (isSupabaseConfigured) {
      this.notify()
      return
    }
    if (typeof window === 'undefined') return
    try {
      localStorage.setItem(ISSUES_STORAGE_KEY, JSON.stringify(this.issues))
    } catch {
      // storage unavailable
    }
    this.notify()
  }

  public onChange(listener: () => void): () => void {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener)
    }
  }

  private notify() {
    this.listeners.forEach((l) => l())
  }

  /**
   * Role-enforced query for campus issues.
   * VISITOR: Strictly returns empty list [].
   * STUDENT: Strictly returns only reports created by that student.
   * ADMIN: Returns all campus reports.
   */
  public getIssuesForRole(role: UserRole, userId?: string): CampusIssueReport[] {
    if (role === 'visitor') {
      return []
    }
    if (isSupabaseConfigured && supabase && !this.isSyncing) {
      this.fetchFromSupabase()
    }
    if (role === 'student') {
      if (!userId) return []
      return this.issues.filter((i) => i.reporterId === userId)
    }
    if (role === 'admin') {
      return [...this.issues]
    }
    return []
  }

  public getIssueById(id: string, role: UserRole, userId?: string): CampusIssueReport | null {
    if (role === 'visitor') {
      return null
    }
    const issue = this.issues.find((i) => i.id === id) ?? null
    if (!issue) return null

    if (role === 'student' && issue.reporterId !== userId) {
      return null // Student cannot access other students' private issues
    }
    return issue
  }

  public createIssue(
    input: CreateIssueInput,
    role: UserRole,
    user: User
  ): Promise<{ success: boolean; issue?: CampusIssueReport; error?: string }> & {
    success: boolean
    issue?: CampusIssueReport
    error?: string
  } {
    if (role === 'visitor') {
      return makeThenable({
        success: false,
        error: 'Visitors cannot submit maintenance issues. Please sign in as a student.',
      })
    }

    // 1. Supabase-Backed Persistence
    if (isSupabaseConfigured && supabase) {
      const asyncOp = (async () => {
        try {
          const { data, error } = await supabase
            .from('campus_issues')
            .insert({
              category: input.category,
              description: input.description.trim(),
              location_name: input.locationName.trim() || 'Outdoor Campus Grounds',
              building_id: input.buildingId || null,
              model_coordinates: input.modelCoordinates,
              photo_url: input.photoUrl || null,
            })
            .select(`
              id,
              reporter_id,
              category,
              description,
              location_name,
              building_id,
              model_coordinates,
              photo_url,
              status,
              assigned_team,
              resolution_notes,
              created_at,
              updated_at,
              history:issue_status_history (
                status,
                actor_name,
                actor_role,
                assigned_team,
                notes,
                created_at
              )
            `)
            .single()

          if (error || !data) {
            return { success: false, error: error?.message || 'Failed to submit report to Supabase.' }
          }

          const hist = (data.history || []).map((h: any) => ({
            status: h.status as IssueStatus,
            timestamp: h.created_at,
            actorName: h.actor_name,
            actorRole: h.actor_role,
            notes: h.notes || undefined,
            assignedTeam: h.assigned_team || undefined,
          }))

          const newReport: CampusIssueReport = {
            id: data.id,
            reporterId: data.reporter_id,
            reporterName: user.name,
            reporterRole: user.role === 'admin' ? 'admin' : 'student',
            category: data.category as IssueCategory,
            description: data.description,
            locationName: data.location_name,
            buildingId: data.building_id || undefined,
            modelCoordinates: data.model_coordinates as [number, number, number],
            photoUrl: data.photo_url || undefined,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
            status: data.status as IssueStatus,
            assignedTeam: data.assigned_team || undefined,
            resolutionNotes: data.resolution_notes || undefined,
            history: hist,
          }

          this.issues = [newReport, ...this.issues]
          this.notify()
          return { success: true, issue: newReport }
        } catch (err: any) {
          return { success: false, error: err.message || 'Network error submitting campus report.' }
        }
      })()

      return asyncOp as any
    }

    // 2. Offline / Local Demo Fallback Mode
    const counter = this.issues.length + 45
    const id = `MNM-2026-${String(counter).padStart(4, '0')}`
    const now = new Date().toISOString()

    const newReport: CampusIssueReport = {
      id,
      reporterId: user.id,
      reporterName: user.name,
      reporterRole: user.role === 'admin' ? 'admin' : 'student',
      category: input.category,
      description: input.description.trim(),
      locationName: input.locationName.trim() || 'Outdoor Campus Grounds',
      buildingId: input.buildingId,
      modelCoordinates: input.modelCoordinates,
      photoUrl: input.photoUrl,
      createdAt: now,
      updatedAt: now,
      status: 'SUBMITTED',
      history: [
        {
          status: 'SUBMITTED',
          timestamp: now,
          actorName: user.name,
          actorRole: user.role === 'admin' ? 'admin' : 'student',
          notes: 'Report created with 3D campus coordinates.',
        },
      ],
    }

    this.issues = [newReport, ...this.issues]
    this.saveToStorage()

    return makeThenable({ success: true, issue: newReport })
  }

  public updateIssueStatus(
    issueId: string,
    newStatus: IssueStatus,
    role: UserRole,
    user: User,
    notes?: string,
    assignedTeam?: MaintenanceTeam | string
  ): Promise<{ success: boolean; error?: string }> & {
    success: boolean
    error?: string
  } {
    if (role !== 'admin') {
      return makeThenable({
        success: false,
        error: 'Only campus administrators can modify issue status or assignments.',
      })
    }

    // 1. Supabase-Backed Atomic RPC
    if (isSupabaseConfigured && supabase) {
      const asyncOp = (async () => {
        try {
          const { error } = await supabase.rpc('admin_update_issue_status', {
            p_issue_id: issueId,
            p_new_status: newStatus,
            p_assigned_team: assignedTeam || null,
            p_admin_notes: notes?.trim() || null,
            p_is_internal: false,
          })

          if (error) {
            return { success: false, error: error.message }
          }

          await this.fetchFromSupabase()
          return { success: true }
        } catch (err: any) {
          return { success: false, error: err.message || 'Failed to update issue status via Supabase RPC.' }
        }
      })()

      return asyncOp as any
    }

    // 2. Offline / Local Demo Fallback Mode
    const index = this.issues.findIndex((i) => i.id === issueId)
    if (index === -1) {
      return makeThenable({ success: false, error: 'Issue report not found.' })
    }

    const current = this.issues[index]
    const now = new Date().toISOString()

    const historyEntry = {
      status: newStatus,
      timestamp: now,
      actorName: user.name,
      actorRole: 'admin' as const,
      notes: notes?.trim() || `Status updated to ${newStatus}`,
      assignedTeam: assignedTeam ?? current.assignedTeam,
    }

    const updated: CampusIssueReport = {
      ...current,
      status: newStatus,
      updatedAt: now,
      assignedTeam: assignedTeam !== undefined ? assignedTeam : current.assignedTeam,
      resolutionNotes: newStatus === 'RESOLVED' ? (notes?.trim() || current.resolutionNotes) : current.resolutionNotes,
      history: [...current.history, historyEntry],
    }

    this.issues[index] = updated
    this.saveToStorage()

    return makeThenable({ success: true })
  }

  /**
   * Attaches or updates photographic evidence on an existing issue record.
   * Uses RPC student_attach_issue_photo when available, with fallback to direct update or local storage.
   */
  public async attachPhotoToIssue(
    issueId: string,
    photoPath: string,
    role: UserRole,
    user: User
  ): Promise<{ success: boolean; error?: string }> {
    if (role === 'visitor') {
      return { success: false, error: 'Visitors cannot modify campus issues.' }
    }

    if (isSupabaseConfigured && supabase) {
      try {
        // Try RPC first (for student photo attachment)
        const { data: rpcData, error: rpcError } = await supabase.rpc('student_attach_issue_photo', {
          p_issue_id: issueId,
          p_photo_url: photoPath,
        })

        if (!rpcError && rpcData?.success) {
          await this.fetchFromSupabase()
          return { success: true }
        }

        // If RPC is not deployed yet or caller is admin, try direct update
        const { error: updateError } = await supabase
          .from('campus_issues')
          .update({ photo_url: photoPath })
          .eq('id', issueId)

        if (!updateError) {
          await this.fetchFromSupabase()
          return { success: true }
        }

        return {
          success: false,
          error: updateError?.message || rpcError?.message || 'Failed to attach photo to issue record.',
        }
      } catch (err: any) {
        return { success: false, error: err?.message || 'Network error attaching photo to issue.' }
      }
    }

    // Local / Demo mode fallback
    const target = this.issues.find((i) => i.id === issueId)
    if (!target) {
      return { success: false, error: 'Issue not found.' }
    }
    if (role === 'student' && target.reporterId !== user.id) {
      return { success: false, error: 'Unauthorized to modify another student report.' }
    }

    target.photoUrl = photoPath
    target.updatedAt = new Date().toISOString()
    this.saveToStorage()
    return { success: true }
  }

  public getStatistics(role: UserRole): IssueStatistics | null {
    if (role !== 'admin') return null

    const stats: IssueStatistics = {
      total: this.issues.length,
      submitted: 0,
      underReview: 0,
      assigned: 0,
      inProgress: 0,
      resolved: 0,
      rejected: 0,
      byCategory: {} as Record<IssueCategory, number>,
      byLocation: {},
    }

    for (const issue of this.issues) {
      if (issue.status === 'SUBMITTED') stats.submitted++
      else if (issue.status === 'UNDER_REVIEW') stats.underReview++
      else if (issue.status === 'ASSIGNED') stats.assigned++
      else if (issue.status === 'IN_PROGRESS') stats.inProgress++
      else if (issue.status === 'RESOLVED') stats.resolved++
      else if (issue.status === 'REJECTED') stats.rejected++

      stats.byCategory[issue.category] = (stats.byCategory[issue.category] || 0) + 1
      const loc = issue.locationName || 'General Campus'
      stats.byLocation[loc] = (stats.byLocation[loc] || 0) + 1
    }

    return stats
  }

  public resetToDefaultSeed() {
    if (isSupabaseConfigured) {
      if (supabase) {
        this.fetchFromSupabase()
      }
      return
    }
    this.issues = [...SEED_ISSUES]
    this.saveToStorage()
  }
}

export const issueService = new IssueService()
