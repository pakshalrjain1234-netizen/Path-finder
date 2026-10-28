import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Compass,
  Eye,
  EyeOff,
  GraduationCap,
  KeyRound,
  Layers,
  Lock,
  LogOut,
  MapPin,
  Shield,
  ShieldCheck,
  Users,
} from 'lucide-react'
import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { isSupabaseConfigured } from '../lib/supabaseClient'

type LoginView = 'portal' | 'student' | 'admin'

export function LoginRoleScreen() {
  const navigate = useNavigate()
  const location = useLocation()
  const { session, isAuthenticated, isInitializing, login, loginAsVisitor, logout } = useAuth()

  // Dedicated multi-screen navigation state
  const [viewMode, setViewMode] = useState<LoginView>('portal')

  // Dedicated student credential state
  const [studentUsername, setStudentUsername] = useState('')
  const [studentPassword, setStudentPassword] = useState('')
  const [showStudentPassword, setShowStudentPassword] = useState(false)

  // Dedicated administrator credential state
  const [adminUsername, setAdminUsername] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [showAdminPassword, setShowAdminPassword] = useState(false)

  // Common submission states
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Redirect target if previously blocked by ProtectedRoute
  const from = (location.state as any)?.from || ''
  const wasUnauthorized = Boolean((location.state as any)?.unauthorized)

  // Navigate to dedicated student login view with complete state wipe
  const handleOpenStudentView = () => {
    setError(null)
    setStudentUsername('')
    setStudentPassword('')
    setShowStudentPassword(false)
    setViewMode('student')
  }

  // Navigate to dedicated administrator login view with complete state wipe
  const handleOpenAdminView = () => {
    setError(null)
    setAdminUsername('')
    setAdminPassword('')
    setShowAdminPassword(false)
    setViewMode('admin')
  }

  // Return to access portal root with complete destruction of form values
  const handleBackToPortal = () => {
    setError(null)
    setStudentUsername('')
    setStudentPassword('')
    setShowStudentPassword(false)
    setAdminUsername('')
    setAdminPassword('')
    setShowAdminPassword(false)
    setViewMode('portal')
  }

  // Student Sign-in submission
  const handleStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!studentUsername.trim() || !studentPassword) {
      setError('Please enter your student institutional email or register number.')
      return
    }

    setLoading(true)
    try {
      const res = await login('student', studentUsername.trim(), studentPassword)
      if (res.success) {
        setStudentPassword('')
        setShowStudentPassword(false)
        const target = from && !from.startsWith('/admin') ? from : '/issues'
        navigate(target, { replace: true })
      } else {
        setError(res.error || 'Authentication failed. Please verify your credentials.')
      }
    } catch (err: any) {
      setError(err?.message || 'A network error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Administrator Sign-in submission
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!adminUsername.trim() || !adminPassword) {
      setError('Please enter your administrator email or staff identifier.')
      return
    }

    setLoading(true)
    try {
      const res = await login('admin', adminUsername.trim(), adminPassword)
      if (res.success) {
        setAdminPassword('')
        setShowAdminPassword(false)
        const target = from || '/admin/issues'
        navigate(target, { replace: true })
      } else {
        setError(res.error || 'Administrator verification failed. Unauthorized.')
      }
    } catch (err: any) {
      setError(err?.message || 'A network error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Anonymous Visitor Entry
  const handleVisitorEntry = async () => {
    setError(null)
    setLoading(true)
    try {
      await loginAsVisitor()
      const target = from && !from.startsWith('/admin') && !from.startsWith('/issues') && !from.startsWith('/my-reports')
        ? from
        : '/welcome'
      navigate(target, { replace: true })
    } catch {
      navigate('/welcome', { replace: true })
    } finally {
      setLoading(false)
    }
  }

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-[#E8DDF2] flex items-center justify-center p-6 text-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#352A47] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-[#51465F] font-heading font-bold tracking-wide">
            Verifying Campus Session...
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full bg-[#E8DDF2] text-[#352A47] flex flex-col justify-between relative overflow-x-hidden font-sans">
      {/* Main Two-Column Container (Desktop) / Fluid Stack (Mobile) */}
      <div className="relative z-10 w-full max-w-6xl mx-auto flex-1 flex items-center justify-center p-4 sm:p-6 md:p-8 lg:p-12">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 rounded-3xl border border-[#C9B6DF] bg-[#FBF8FD] shadow-dream-elevated overflow-hidden min-h-[600px]">
          {/* ========================================================= */}
          {/* LEFT COLUMN: BRANDING & DIGITAL TWIN SHOWCASE PANEL       */}
          {/* ========================================================= */}
          <div className="lg:col-span-5 bg-[#DFD1EC] text-[#352A47] p-6 sm:p-8 lg:p-10 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-[#C9B6DF]">
            <div>
              {/* College Insignia & Badge */}
              <div className="flex items-center gap-3 mb-6">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#E8C8B9] text-[#352A47] border border-[#D9B4A3] shadow-xs">
                  <Compass size={24} />
                </div>
                <div>
                  <div className="text-[10px] font-heading font-bold uppercase tracking-wider text-[#7A4465]">
                    Autonomous Campus Navigation
                  </div>
                  <div className="text-xs font-heading font-semibold text-[#51465F] leading-tight">
                    Misrimal Navajee Munoth Jain Engineering College
                  </div>
                </div>
              </div>

              {/* Title & Platform Introduction */}
              <h1 className="font-editorial text-3xl sm:text-4xl font-extrabold text-[#352A47] tracking-tight leading-tight">
                PATH FINDER
              </h1>
              <p className="mt-1 text-sm font-heading font-bold text-[#7A4465]">
                Stage E3 3D Campus Digital Twin &amp; Operations
              </p>
              <p className="mt-4 text-xs sm:text-sm text-[#51465F] leading-relaxed font-sans">
                Welcome to MNMJEC's authoritative spatial intelligence platform. Explore genuine 3D architectural
                models, navigate campus walkways, experience guided cinematic audio tours, and coordinate
                estate maintenance workflows.
              </p>

              {/* Core Platform Capabilities */}
              <div className="hidden lg:block mt-8 space-y-3">
                <div className="flex items-start gap-3 rounded-2xl bg-[#FBF8FD] border border-[#C9B6DF] p-3.5 text-xs shadow-xs">
                  <Layers className="text-[#7A4465] shrink-0 mt-0.5" size={16} />
                  <div>
                    <span className="font-heading font-bold text-[#352A47] block">Certified Stage E3 3D Geometry</span>
                    <span className="text-[#51465F] text-[11px]">
                      True-to-scale campus digital twin with 7 entrance assemblies and independent Library zoning.
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-2xl bg-[#FBF8FD] border border-[#C9B6DF] p-3.5 text-xs shadow-xs">
                  <MapPin className="text-[#1E583F] shrink-0 mt-0.5" size={16} />
                  <div>
                    <span className="font-heading font-bold text-[#352A47] block">Dijkstra Pedestrian Wayfinding</span>
                    <span className="text-[#51465F] text-[11px]">
                      Safe collision-free route computation across all campus blocks, walkways, and departments.
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-2xl bg-[#FBF8FD] border border-[#C9B6DF] p-3.5 text-xs shadow-xs">
                  <Shield className="text-[#7A4465] shrink-0 mt-0.5" size={16} />
                  <div>
                    <span className="font-heading font-bold text-[#352A47] block">Campus Issue Passport &amp; Operations</span>
                    <span className="text-[#51465F] text-[11px]">
                      Student-to-admin hazard reporting with 3D pin precision and photographic evidence tracking.
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Status Indicator */}
            <div className="mt-8 pt-4 border-t border-[#C9B6DF] flex items-center justify-between text-[11px] text-[#51465F] font-sans">
              <span className="flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${isSupabaseConfigured ? 'bg-[#1E583F]' : 'bg-[#9E563A]'} animate-pulse`} />
                <span>{isSupabaseConfigured ? 'Cloud Backend Connected' : 'Local Prototype'}</span>
              </span>
              <span>Chennai • Tamil Nadu</span>
            </div>
          </div>

          {/* ========================================================= */}
          {/* RIGHT COLUMN: DYNAMIC ACCESS PORTAL OR AUTHENTICATION     */}
          {/* ========================================================= */}
          <div className="lg:col-span-7 bg-[#FBF8FD] p-6 sm:p-8 lg:p-12 flex flex-col justify-center">
            {/* Active Session Notification (if already logged in) */}
            {isAuthenticated && (
              <div className="mb-6 rounded-2xl border border-[#94BCA7] bg-[#BCD8C9]/40 p-4 text-xs text-[#1E583F] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={18} className="text-[#1E583F] shrink-0" />
                  <span>
                    Currently active session: <strong>{session?.user.name}</strong> ({session?.user.role.toUpperCase()})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => navigate('/welcome')}
                    className="px-3 py-1.5 rounded-xl bg-[#352A47] hover:bg-[#231B30] text-white font-heading font-bold text-[11px] transition cursor-pointer shadow-xs"
                  >
                    Enter Campus
                  </button>
                  <button
                    type="button"
                    onClick={logout}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#FBF8FD] border border-[#C9B6DF] text-[#51465F] hover:text-[#352A47] hover:bg-[#E8DDF2] font-heading font-medium text-[11px] transition cursor-pointer"
                  >
                    <LogOut size={12} />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}

            {/* Unauthorized Redirect Notification */}
            {wasUnauthorized && !isAuthenticated && (
              <div className="mb-6 rounded-2xl border border-[#D7A894] bg-[#E8C8B9]/40 p-4 text-xs text-[#9E563A] flex items-center gap-2.5 shadow-xs font-sans">
                <AlertCircle size={18} className="text-[#9E563A] shrink-0" />
                <span>Restricted Access: The requested resource requires an authorized Student or Administrator session.</span>
              </div>
            )}

            {/* ========================================================= */}
            {/* VIEW 1: PATH FINDER ACCESS PORTAL (NO CREDENTIAL INPUTS)  */}
            {/* ========================================================= */}
            {viewMode === 'portal' && (
              <div className="space-y-6">
                <div>
                  <h2 className="font-editorial text-2xl sm:text-3xl font-extrabold text-[#352A47] tracking-tight">
                    Select Your Campus Role
                  </h2>
                  <p className="mt-1 text-xs sm:text-sm text-[#51465F] font-sans">
                    Choose an authorized gateway to enter your tailored digital campus environment.
                  </p>
                </div>

                {/* 3 Interactive Access Choices */}
                <div className="space-y-3">
                  {/* Choice 1: Student Login */}
                  <button
                    type="button"
                    id="btn-choice-student-login"
                    data-testid="btn-choice-student-login"
                    onClick={handleOpenStudentView}
                    className="w-full text-left rounded-2xl border border-[#C9B6DF] bg-[#E8DDF2]/50 hover:border-[#352A47] hover:bg-[#D2BEE7]/60 p-4 sm:p-5 transition-all duration-200 group flex items-center justify-between gap-3 sm:gap-4 cursor-pointer shadow-xs hover:shadow-dream-soft"
                  >
                    <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                      <div className="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-2xl bg-[#E8C8B9] border border-[#D9B4A3] text-[#352A47] shrink-0 shadow-xs">
                        <GraduationCap size={22} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-heading font-bold text-[#352A47] group-hover:text-[#7A4465] transition-colors">
                            Student Login
                          </h3>
                          <span className="rounded-full bg-[#DFD1EC] border border-[#C9B6DF] px-2 py-0.5 text-[9px] font-heading font-bold text-[#352A47] uppercase shrink-0">
                            Passport
                          </span>
                        </div>
                        <p className="text-xs text-[#51465F] mt-0.5 leading-snug font-sans">
                          Log campus maintenance issues on 3D pins and track resolution progress in My Reports.
                        </p>
                      </div>
                    </div>
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FBF8FD] border border-[#C9B6DF] text-[#51465F] group-hover:border-[#352A47] group-hover:text-[#352A47] transition-colors shrink-0">
                      <ArrowRight size={16} />
                    </div>
                  </button>

                  {/* Choice 2: Admin Login */}
                  <button
                    type="button"
                    id="btn-choice-admin-login"
                    data-testid="btn-choice-admin-login"
                    onClick={handleOpenAdminView}
                    className="w-full text-left rounded-2xl border border-[#C9B6DF] bg-[#E8DDF2]/50 hover:border-[#352A47] hover:bg-[#D2BEE7]/60 p-4 sm:p-5 transition-all duration-200 group flex items-center justify-between gap-3 sm:gap-4 cursor-pointer shadow-xs hover:shadow-dream-soft"
                  >
                    <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                      <div className="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-2xl bg-[#DFD1EC] border border-[#C9B6DF] text-[#352A47] shrink-0 shadow-xs">
                        <ShieldCheck size={22} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-heading font-bold text-[#352A47] group-hover:text-[#7A4465] transition-colors">
                            Admin Login
                          </h3>
                          <span className="rounded-full bg-[#E8C8B9] border border-[#D9B4A3] px-2 py-0.5 text-[9px] font-heading font-bold text-[#9E563A] uppercase shrink-0">
                            Operations
                          </span>
                        </div>
                        <p className="text-xs text-[#51465F] mt-0.5 leading-snug font-sans">
                          Manage campus operations, dispatch maintenance crews, and audit resolution history.
                        </p>
                      </div>
                    </div>
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FBF8FD] border border-[#C9B6DF] text-[#51465F] group-hover:border-[#352A47] group-hover:text-[#352A47] transition-colors shrink-0">
                      <ArrowRight size={16} />
                    </div>
                  </button>

                  {/* Choice 3: Continue as Visitor */}
                  <button
                    type="button"
                    id="btn-continue-as-visitor"
                    data-testid="btn-continue-as-visitor"
                    onClick={handleVisitorEntry}
                    className="w-full text-left rounded-2xl border border-[#C9B6DF] bg-[#E8DDF2]/50 hover:border-[#352A47] hover:bg-[#D2BEE7]/60 p-4 sm:p-5 transition-all duration-200 group flex items-center justify-between gap-3 sm:gap-4 cursor-pointer shadow-xs hover:shadow-dream-soft"
                  >
                    <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                      <div className="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-2xl bg-[#BCD8C9] border border-[#94BCA7] text-[#1E583F] shrink-0 shadow-xs">
                        <Users size={22} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-heading font-bold text-[#352A47] group-hover:text-[#1E583F] transition-colors">
                            Continue as Visitor
                          </h3>
                          <span className="rounded-full bg-[#BCD8C9] border border-[#94BCA7] px-2 py-0.5 text-[9px] font-heading font-bold text-[#1E583F] uppercase shrink-0">
                            Public
                          </span>
                        </div>
                        <p className="text-xs text-[#51465F] mt-0.5 leading-snug font-sans">
                          No credentials required. Open the 3D campus directly for wayfinding, cinematic tour &amp; feedback.
                        </p>
                      </div>
                    </div>
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FBF8FD] border border-[#C9B6DF] text-[#51465F] group-hover:border-[#352A47] group-hover:text-[#352A47] transition-colors shrink-0">
                      <ArrowRight size={16} />
                    </div>
                  </button>
                </div>

                <div className="pt-2 text-center text-xs text-[#51465F] font-sans">
                  Protected under Misrimal Navajee Munoth Jain Engineering College IT Guidelines
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* VIEW 2: DEDICATED STUDENT LOGIN (ISOLATED FORM INSTANCE)  */}
            {/* ========================================================= */}
            {viewMode === 'student' && (
              <div className="space-y-6">
                {/* Back to Portal Bar */}
                <button
                  type="button"
                  onClick={handleBackToPortal}
                  className="inline-flex items-center gap-2 text-xs font-heading font-bold text-[#51465F] hover:text-[#352A47] transition-colors cursor-pointer"
                >
                  <ArrowLeft size={14} />
                  <span>Back to Role Selection</span>
                </button>

                <div>
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#E8C8B9] border border-[#D9B4A3] text-[#352A47] shadow-xs">
                      <GraduationCap size={22} />
                    </div>
                    <div>
                      <span className="text-[10px] font-heading font-bold uppercase tracking-wider text-[#7A4465]">
                        Student Portal
                      </span>
                      <h2 className="font-editorial text-2xl font-extrabold text-[#352A47] tracking-tight">
                        Student Sign In
                      </h2>
                    </div>
                  </div>
                  <p className="text-xs text-[#51465F] font-sans">
                    Sign in to report campus maintenance issues via 3D coordinates and review resolution progress.
                  </p>
                </div>

                {/* Dedicated Student Form */}
                <form onSubmit={handleStudentLogin} className="space-y-4">
                  <div>
                    <label htmlFor="student-account-email" className="block text-xs font-heading font-bold text-[#352A47] mb-1.5">
                      Student Email or Register Number
                    </label>
                    <input
                      id="student-account-email"
                      name="student_account_email"
                      data-testid="input-username"
                      type="text"
                      autoComplete="username"
                      disabled={loading}
                      value={studentUsername}
                      onChange={(e) => setStudentUsername(e.target.value)}
                      placeholder="e.g. 311822104018 or student@mnmjec.ac.in"
                      className="w-full rounded-2xl border border-[#C9B6DF] bg-[#E8DDF2]/40 px-4 py-2.5 text-xs text-[#352A47] placeholder:text-[#51465F]/70 focus:border-[#352A47] focus:ring-2 focus:ring-[#D2BEE7] focus:outline-none transition shadow-2xs font-sans"
                    />
                  </div>

                  <div>
                    <label htmlFor="student-security-key" className="block text-xs font-heading font-bold text-[#352A47] mb-1.5">
                      Student Password
                    </label>
                    <div className="relative">
                      <input
                        id="student-security-key"
                        name="student_security_key"
                        data-testid="input-password"
                        type={showStudentPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        disabled={loading}
                        value={studentPassword}
                        onChange={(e) => setStudentPassword(e.target.value)}
                        placeholder="Enter student account password"
                        className="w-full rounded-2xl border border-[#C9B6DF] bg-[#E8DDF2]/40 pl-4 pr-11 py-2.5 text-xs text-[#352A47] placeholder:text-[#51465F]/70 focus:border-[#352A47] focus:ring-2 focus:ring-[#D2BEE7] focus:outline-none transition shadow-2xs font-sans"
                      />
                      <button
                        type="button"
                        id="btn-toggle-student-password"
                        data-testid="btn-toggle-student-password"
                        onClick={() => setShowStudentPassword((prev) => !prev)}
                        aria-label={showStudentPassword ? 'Hide password' : 'Show password'}
                        aria-pressed={showStudentPassword}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center justify-center h-7 w-7 rounded-xl text-[#51465F] hover:text-[#352A47] hover:bg-[#E8DDF2] focus:outline-none transition-colors cursor-pointer"
                      >
                        {showStudentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <div className="flex items-start gap-2.5 rounded-2xl border border-[#D7A894] bg-[#E8C8B9]/40 p-3.5 text-xs text-[#9E563A] font-sans">
                      <AlertCircle size={16} className="text-[#9E563A] shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </div>
                  )}

                  <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <span className="text-[11px] text-[#51465F] font-sans">
                      Verified via Supabase Authentication &amp; RLS
                    </span>

                    <button
                      type="submit"
                      data-testid="btn-submit-login"
                      disabled={loading}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-[#352A47] hover:bg-[#231B30] px-6 py-2.5 text-xs font-heading font-bold text-white shadow-dream-soft transition disabled:opacity-50 cursor-pointer"
                    >
                      <KeyRound size={15} />
                      <span>{loading ? 'Authenticating...' : 'Sign In as Student'}</span>
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* ========================================================= */}
            {/* VIEW 3: DEDICATED ADMIN LOGIN (ISOLATED FORM INSTANCE)    */}
            {/* ========================================================= */}
            {viewMode === 'admin' && (
              <div className="space-y-6">
                {/* Back to Portal Bar */}
                <button
                  type="button"
                  onClick={handleBackToPortal}
                  className="inline-flex items-center gap-2 text-xs font-heading font-bold text-[#51465F] hover:text-[#352A47] transition-colors cursor-pointer"
                >
                  <ArrowLeft size={14} />
                  <span>Back to Role Selection</span>
                </button>

                <div>
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#DFD1EC] border border-[#C9B6DF] text-[#352A47] shadow-xs">
                      <ShieldCheck size={22} />
                    </div>
                    <div>
                      <span className="text-[10px] font-heading font-bold uppercase tracking-wider text-[#7A4465]">
                        Operations Command
                      </span>
                      <h2 className="font-editorial text-2xl font-extrabold text-[#352A47] tracking-tight">
                        Administrator Sign In
                      </h2>
                    </div>
                  </div>
                  <p className="text-xs text-[#51465F] font-sans">
                    Authorized staff sign-in for estate management, crew dispatch, and campus issue resolution.
                  </p>
                </div>

                {/* Dedicated Admin Form */}
                <form onSubmit={handleAdminLogin} className="space-y-4">
                  <div>
                    <label htmlFor="admin-account-email" className="block text-xs font-heading font-bold text-[#352A47] mb-1.5">
                      Administrator Email or Staff ID
                    </label>
                    <input
                      id="admin-account-email"
                      name="admin_account_email"
                      data-testid="input-username"
                      type="text"
                      autoComplete="username"
                      disabled={loading}
                      value={adminUsername}
                      onChange={(e) => setAdminUsername(e.target.value)}
                      placeholder="e.g. admin@mnmjec.ac.in or estate-admin"
                      className="w-full rounded-2xl border border-[#C9B6DF] bg-[#E8DDF2]/40 px-4 py-2.5 text-xs text-[#352A47] placeholder:text-[#51465F]/70 focus:border-[#352A47] focus:ring-2 focus:ring-[#D2BEE7] focus:outline-none transition shadow-2xs font-sans"
                    />
                  </div>

                  <div>
                    <label htmlFor="admin-security-key" className="block text-xs font-heading font-bold text-[#352A47] mb-1.5">
                      Administrator Password
                    </label>
                    <div className="relative">
                      <input
                        id="admin-security-key"
                        name="admin_security_key"
                        data-testid="input-password"
                        type={showAdminPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        disabled={loading}
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        placeholder="Enter administrator password"
                        className="w-full rounded-2xl border border-[#C9B6DF] bg-[#E8DDF2]/40 pl-4 pr-11 py-2.5 text-xs text-[#352A47] placeholder:text-[#51465F]/70 focus:border-[#352A47] focus:ring-2 focus:ring-[#D2BEE7] focus:outline-none transition shadow-2xs font-sans"
                      />
                      <button
                        type="button"
                        id="btn-toggle-admin-password"
                        data-testid="btn-toggle-admin-password"
                        onClick={() => setShowAdminPassword((prev) => !prev)}
                        aria-label={showAdminPassword ? 'Hide password' : 'Show password'}
                        aria-pressed={showAdminPassword}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center justify-center h-7 w-7 rounded-xl text-[#51465F] hover:text-[#352A47] hover:bg-[#E8DDF2] focus:outline-none transition-colors cursor-pointer"
                      >
                        {showAdminPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <div className="flex items-start gap-2.5 rounded-2xl border border-[#D7A894] bg-[#E8C8B9]/40 p-3.5 text-xs text-[#9E563A] font-sans">
                      <AlertCircle size={16} className="text-[#9E563A] shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </div>
                  )}

                  <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <span className="text-[11px] text-[#51465F] font-sans">
                      Role authorization strictly verified via database profiles
                    </span>

                    <button
                      type="submit"
                      data-testid="btn-submit-login"
                      disabled={loading}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-[#352A47] hover:bg-[#231B30] px-6 py-2.5 text-xs font-heading font-bold text-white shadow-dream-soft transition disabled:opacity-50 cursor-pointer"
                    >
                      <Lock size={15} />
                      <span>{loading ? 'Authenticating...' : 'Sign In to Operations'}</span>
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Institutional Legal & Ownership Footer */}
      <footer className="relative z-10 text-center py-4 text-[11px] text-[#51465F] border-t border-[#C9B6DF]">
        PATH FINDER • Misrimal Navajee Munoth Jain Engineering College, Chennai. All rights reserved.
      </footer>
    </div>
  )
}
