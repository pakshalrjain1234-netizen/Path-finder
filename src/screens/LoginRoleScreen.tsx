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
  Sparkles,
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
        // Clear transient password from memory immediately
        setStudentPassword('')
        setShowStudentPassword(false)
        const target = from && !from.startsWith('/admin') ? from : '/issues'
        navigate(target, { replace: true })
      } else {
        setError(res.error || 'Authentication failed. Please check your student credentials.')
      }
    } catch {
      setError('A network or server error occurred during student authentication.')
    } finally {
      setLoading(false)
    }
  }

  // Administrator Sign-in submission
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!adminUsername.trim() || !adminPassword) {
      setError('Please enter your administrator email or staff ID.')
      return
    }

    setLoading(true)
    try {
      const res = await login('admin', adminUsername.trim(), adminPassword)
      if (res.success) {
        // Clear transient password from memory immediately
        setAdminPassword('')
        setShowAdminPassword(false)
        navigate(from || '/admin/issues', { replace: true })
      } else {
        setError(res.error || 'Authentication failed. Please verify administrator credentials.')
      }
    } catch {
      setError('A network or server error occurred during administrator authentication.')
    } finally {
      setLoading(false)
    }
  }

  // Public visitor entry (credentials not required)
  const handleVisitorEntry = () => {
    loginAsVisitor()
    const target =
      from && !from.startsWith('/admin') && !from.startsWith('/issues') && !from.startsWith('/my-reports')
        ? from
        : '/welcome'
    navigate(target, { replace: true })
  }

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-[#101827] flex items-center justify-center p-6 text-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#60A5FA] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-[#94A3B8] font-semibold tracking-wide">
            Verifying Campus Session...
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full bg-[#101827] text-[#F1F5F9] flex flex-col justify-between relative overflow-x-hidden">
      {/* Background Subtle Gradient Accents */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 -left-40 w-[550px] h-[550px] bg-[#162235]/80 rounded-full blur-[140px]" />
        <div className="absolute top-1/2 -right-40 w-[600px] h-[600px] bg-[#192638]/60 rounded-full blur-[150px]" />
      </div>

      {/* Main Two-Column Container (Desktop) / Fluid Stack (Mobile) */}
      <div className="relative z-10 w-full max-w-7xl mx-auto flex-1 flex items-center justify-center p-4 sm:p-6 md:p-8 lg:p-12">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 rounded-3xl border border-[#293A50] bg-[#162235]/80 backdrop-blur-xl shadow-2xl overflow-hidden min-h-[620px]">
          {/* ========================================================= */}
          {/* LEFT COLUMN: BRANDING & DIGITAL TWIN SHOWCASE PANEL       */}
          {/* ========================================================= */}
          <div className="lg:col-span-5 bg-gradient-to-br from-[#162235] via-[#101827] to-[#192638] p-6 sm:p-8 lg:p-10 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-[#293A50]">
            <div>
              {/* College Insignia & Badge */}
              <div className="flex items-center gap-3 mb-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#60A5FA] text-[#0F172A] shadow-lg shadow-blue-500/20 font-black">
                  <Compass size={28} />
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#60A5FA]">
                    Autonomous Campus Navigation
                  </div>
                  <div className="text-xs font-semibold text-[#94A3B8] leading-tight">
                    Misrimal Navajee Munoth Jain Engineering College
                  </div>
                </div>
              </div>

              {/* Title & Platform Introduction */}
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#F1F5F9] tracking-tight leading-tight">
                PATH FINDER
              </h1>
              <p className="mt-1 text-sm font-medium text-[#60A5FA]">
                Stage E3 3D Campus Digital Twin &amp; Operations
              </p>
              <p className="mt-4 text-xs sm:text-sm text-[#94A3B8] leading-relaxed">
                Welcome to MNMJEC's next-generation digital twin platform. Explore authentic 3D architectural
                models, navigate campus walkways, experience guided cinematic audio tours, and coordinate
                estate maintenance workflows.
              </p>

              {/* Core Platform Capabilities (Visible on desktop; collapsed on mobile to bring role options above the fold) */}
              <div className="hidden lg:block mt-8 space-y-3.5">
                <div className="flex items-start gap-3 rounded-xl bg-[#192638]/70 border border-[#293A50] p-3 text-xs">
                  <Layers className="text-[#60A5FA] shrink-0 mt-0.5" size={17} />
                  <div>
                    <span className="font-bold text-[#F1F5F9] block">Certified Stage E3 3D Geometry</span>
                    <span className="text-[#94A3B8] text-[11px]">
                      True-to-scale campus digital twin with 7 entrance assemblies and independent Library zoning.
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-xl bg-[#192638]/70 border border-[#293A50] p-3 text-xs">
                  <MapPin className="text-[#34D399] shrink-0 mt-0.5" size={17} />
                  <div>
                    <span className="font-bold text-[#F1F5F9] block">Dijkstra Pedestrian Wayfinding</span>
                    <span className="text-[#94A3B8] text-[11px]">
                      Safe collision-free route computation across all campus blocks, walkways, and departments.
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-xl bg-[#192638]/70 border border-[#293A50] p-3 text-xs">
                  <Shield className="text-[#60A5FA] shrink-0 mt-0.5" size={17} />
                  <div>
                    <span className="font-bold text-[#F1F5F9] block">Campus Issue Passport &amp; Operations</span>
                    <span className="text-[#94A3B8] text-[11px]">
                      Student-to-admin hazard reporting with 3D pin precision and photographic evidence tracking.
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Status Indicator */}
            <div className="mt-8 pt-4 border-t border-[#293A50]/70 flex items-center justify-between text-[11px] text-[#94A3B8]">
              <span className="flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${isSupabaseConfigured ? 'bg-[#34D399]' : 'bg-amber-400'} animate-pulse`} />
                <span>{isSupabaseConfigured ? 'Cloud Backend Connected' : 'Local Prototype'}</span>
              </span>
              <span>Chennai • Tamil Nadu</span>
            </div>
          </div>

          {/* ========================================================= */}
          {/* RIGHT COLUMN: DYNAMIC ACCESS PORTAL OR AUTHENTICATION     */}
          {/* ========================================================= */}
          <div className="lg:col-span-7 bg-[#101827] p-6 sm:p-8 lg:p-12 flex flex-col justify-center">
            {/* Active Session Notification (if already logged in) */}
            {isAuthenticated && (
              <div className="mb-6 rounded-2xl border border-emerald-500/30 bg-emerald-950/40 p-4 text-xs text-emerald-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
                  <span>
                    Currently active session: <strong>{session?.user.name}</strong> ({session?.user.role.toUpperCase()})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => navigate('/welcome')}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] transition cursor-pointer"
                  >
                    Enter Campus
                  </button>
                  <button
                    type="button"
                    onClick={logout}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#162235] border border-[#293A50] text-[#94A3B8] hover:text-[#F1F5F9] font-medium text-[11px] transition cursor-pointer"
                  >
                    <LogOut size={12} />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}

            {/* Unauthorized Redirect Notification */}
            {wasUnauthorized && !isAuthenticated && (
              <div className="mb-6 rounded-2xl border border-amber-500/30 bg-amber-950/40 p-4 text-xs text-amber-300 flex items-center gap-2.5 shadow-md">
                <AlertCircle size={18} className="text-amber-400 shrink-0" />
                <span>Restricted Access: The requested resource requires an authorized Student or Administrator session.</span>
              </div>
            )}

            {/* ========================================================= */}
            {/* VIEW 1: PATH FINDER ACCESS PORTAL (NO CREDENTIAL INPUTS)  */}
            {/* ========================================================= */}
            {viewMode === 'portal' && (
              <div className="space-y-6">
                <div>
                  <div className="inline-flex items-center gap-1.5 rounded-md bg-[#162235] border border-[#293A50] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#60A5FA] mb-2">
                    <Sparkles size={12} />
                    <span>Access Portal</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-[#F1F5F9] tracking-tight">
                    Select Your Campus Role
                  </h2>
                  <p className="mt-1 text-xs sm:text-sm text-[#94A3B8]">
                    Choose an authorized gateway to enter your tailored digital campus environment.
                  </p>
                </div>

                {/* 3 Interactive Access Choices */}
                <div className="space-y-3.5">
                  {/* Choice 1: Student Login */}
                  <button
                    type="button"
                    id="btn-choice-student-login"
                    data-testid="btn-choice-student-login"
                    onClick={handleOpenStudentView}
                    className="w-full text-left rounded-2xl border border-[#293A50] bg-[#192638] hover:border-[#60A5FA] hover:bg-[#192638]/90 p-4 sm:p-5 transition-all duration-200 group flex items-center justify-between gap-3 sm:gap-4 cursor-pointer shadow-sm hover:shadow-lg hover:shadow-blue-500/10"
                  >
                    <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                      <div className="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-2xl bg-blue-500/10 border border-blue-500/20 text-[#60A5FA] group-hover:scale-105 transition-transform shrink-0">
                        <GraduationCap size={24} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold text-[#F1F5F9] group-hover:text-[#60A5FA] transition-colors">
                            Student Login
                          </h3>
                          <span className="rounded-full bg-blue-500/10 border border-blue-500/20 px-2 py-0.2 text-[9px] font-bold text-[#60A5FA] uppercase shrink-0">
                            Passport
                          </span>
                        </div>
                        <p className="text-xs text-[#94A3B8] mt-0.5 leading-snug">
                          Log campus maintenance issues on 3D pins and track resolution progress in My Reports.
                        </p>
                      </div>
                    </div>
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#162235] border border-[#293A50] text-[#94A3B8] group-hover:border-[#60A5FA] group-hover:text-[#60A5FA] transition-colors shrink-0">
                      <ArrowRight size={16} />
                    </div>
                  </button>

                  {/* Choice 2: Admin Login */}
                  <button
                    type="button"
                    id="btn-choice-admin-login"
                    data-testid="btn-choice-admin-login"
                    onClick={handleOpenAdminView}
                    className="w-full text-left rounded-2xl border border-[#293A50] bg-[#192638] hover:border-[#60A5FA] hover:bg-[#192638]/90 p-4 sm:p-5 transition-all duration-200 group flex items-center justify-between gap-3 sm:gap-4 cursor-pointer shadow-sm hover:shadow-lg hover:shadow-blue-500/10"
                  >
                    <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                      <div className="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 group-hover:scale-105 transition-transform shrink-0">
                        <ShieldCheck size={24} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold text-[#F1F5F9] group-hover:text-[#60A5FA] transition-colors">
                            Admin Login
                          </h3>
                          <span className="rounded-full bg-purple-500/10 border border-purple-500/20 px-2 py-0.2 text-[9px] font-bold text-purple-300 uppercase shrink-0">
                            Operations
                          </span>
                        </div>
                        <p className="text-xs text-[#94A3B8] mt-0.5 leading-snug">
                          Manage campus operations, dispatch maintenance crews, and audit resolution history.
                        </p>
                      </div>
                    </div>
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#162235] border border-[#293A50] text-[#94A3B8] group-hover:border-[#60A5FA] group-hover:text-[#60A5FA] transition-colors shrink-0">
                      <ArrowRight size={16} />
                    </div>
                  </button>

                  {/* Choice 3: Continue as Visitor */}
                  <button
                    type="button"
                    id="btn-continue-as-visitor"
                    data-testid="btn-continue-as-visitor"
                    onClick={handleVisitorEntry}
                    className="w-full text-left rounded-2xl border border-[#293A50] bg-[#192638] hover:border-[#34D399] hover:bg-[#192638]/90 p-4 sm:p-5 transition-all duration-200 group flex items-center justify-between gap-3 sm:gap-4 cursor-pointer shadow-sm hover:shadow-lg hover:shadow-emerald-500/10"
                  >
                    <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                      <div className="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-[#34D399] group-hover:scale-105 transition-transform shrink-0">
                        <Users size={24} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold text-[#F1F5F9] group-hover:text-[#34D399] transition-colors">
                            Continue as Visitor
                          </h3>
                          <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.2 text-[9px] font-bold text-[#34D399] uppercase shrink-0">
                            Public
                          </span>
                        </div>
                        <p className="text-xs text-[#94A3B8] mt-0.5 leading-snug">
                          No credentials required. Open the 3D campus directly for wayfinding, cinematic tour &amp; feedback.
                        </p>
                      </div>
                    </div>
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#162235] border border-[#293A50] text-[#94A3B8] group-hover:border-[#34D399] group-hover:text-[#34D399] transition-colors shrink-0">
                      <ArrowRight size={16} />
                    </div>
                  </button>
                </div>

                <div className="pt-2 text-center text-xs text-[#94A3B8]/70">
                  Protected under Misrimal Navajee Munoth Jain Engineering College IT Guidelines
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* VIEW 2: DEDICATED STUDENT LOGIN (ISOLATED FORM INSTANCE)  */}
            {/* ========================================================= */}
            {viewMode === 'student' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                {/* Back to Portal Bar */}
                <button
                  type="button"
                  onClick={handleBackToPortal}
                  className="inline-flex items-center gap-2 text-xs font-semibold text-[#94A3B8] hover:text-[#60A5FA] transition-colors cursor-pointer"
                >
                  <ArrowLeft size={14} />
                  <span>Back to Role Selection</span>
                </button>

                <div>
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 border border-blue-500/20 text-[#60A5FA]">
                      <GraduationCap size={22} />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#60A5FA]">
                        Student Portal
                      </span>
                      <h2 className="text-2xl font-extrabold text-[#F1F5F9] tracking-tight">
                        Student Sign In
                      </h2>
                    </div>
                  </div>
                  <p className="text-xs text-[#94A3B8]">
                    Sign in to report campus maintenance issues via 3D coordinates and review resolution progress.
                  </p>
                </div>

                {/* Dedicated Student Form: Independent Form Elements and Unique IDs */}
                <form onSubmit={handleStudentLogin} className="space-y-4">
                  <div>
                    <label htmlFor="student-account-email" className="block text-xs font-semibold text-[#F1F5F9] mb-1.5">
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
                      className="w-full rounded-xl border border-[#293A50] bg-[#162235] px-4 py-2.5 text-xs text-[#F1F5F9] placeholder:text-[#94A3B8]/60 focus:border-[#60A5FA] focus:outline-none transition shadow-sm"
                    />
                  </div>

                  <div>
                    <label htmlFor="student-security-key" className="block text-xs font-semibold text-[#F1F5F9] mb-1.5">
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
                        className="w-full rounded-xl border border-[#293A50] bg-[#162235] pl-4 pr-11 py-2.5 text-xs text-[#F1F5F9] placeholder:text-[#94A3B8]/60 focus:border-[#60A5FA] focus:outline-none transition shadow-sm"
                      />
                      <button
                        type="button"
                        id="btn-toggle-student-password"
                        data-testid="btn-toggle-student-password"
                        onClick={() => setShowStudentPassword((prev) => !prev)}
                        aria-label={showStudentPassword ? 'Hide password' : 'Show password'}
                        aria-pressed={showStudentPassword}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center justify-center h-7 w-7 rounded-lg text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-[#192638] focus:outline-none focus:ring-1 focus:ring-[#60A5FA] transition-colors cursor-pointer"
                      >
                        {showStudentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <div className="flex items-start gap-2.5 rounded-xl border border-rose-500/40 bg-rose-950/50 p-3.5 text-xs text-rose-300">
                      <AlertCircle size={16} className="text-rose-400 shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </div>
                  )}

                  <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <span className="text-[11px] text-[#94A3B8]">
                      Verified via Supabase Authentication &amp; RLS
                    </span>

                    <button
                      type="submit"
                      data-testid="btn-submit-login"
                      disabled={loading}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-[#60A5FA] hover:bg-blue-400 px-6 py-2.5 text-xs font-bold text-[#0F172A] shadow-sm transition disabled:opacity-50 cursor-pointer"
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
              <div className="space-y-6 animate-in fade-in duration-200">
                {/* Back to Portal Bar */}
                <button
                  type="button"
                  onClick={handleBackToPortal}
                  className="inline-flex items-center gap-2 text-xs font-semibold text-[#94A3B8] hover:text-[#60A5FA] transition-colors cursor-pointer"
                >
                  <ArrowLeft size={14} />
                  <span>Back to Role Selection</span>
                </button>

                <div>
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
                      <ShieldCheck size={22} />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400">
                        Operations Command
                      </span>
                      <h2 className="text-2xl font-extrabold text-[#F1F5F9] tracking-tight">
                        Administrator Sign In
                      </h2>
                    </div>
                  </div>
                  <p className="text-xs text-[#94A3B8]">
                    Authorized staff sign-in for estate management, crew dispatch, and campus issue resolution.
                  </p>
                </div>

                {/* Dedicated Admin Form: Independent Form Elements and Unique IDs */}
                <form onSubmit={handleAdminLogin} className="space-y-4">
                  <div>
                    <label htmlFor="admin-account-email" className="block text-xs font-semibold text-[#F1F5F9] mb-1.5">
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
                      className="w-full rounded-xl border border-[#293A50] bg-[#162235] px-4 py-2.5 text-xs text-[#F1F5F9] placeholder:text-[#94A3B8]/60 focus:border-[#60A5FA] focus:outline-none transition shadow-sm"
                    />
                  </div>

                  <div>
                    <label htmlFor="admin-security-key" className="block text-xs font-semibold text-[#F1F5F9] mb-1.5">
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
                        className="w-full rounded-xl border border-[#293A50] bg-[#162235] pl-4 pr-11 py-2.5 text-xs text-[#F1F5F9] placeholder:text-[#94A3B8]/60 focus:border-[#60A5FA] focus:outline-none transition shadow-sm"
                      />
                      <button
                        type="button"
                        id="btn-toggle-admin-password"
                        data-testid="btn-toggle-admin-password"
                        onClick={() => setShowAdminPassword((prev) => !prev)}
                        aria-label={showAdminPassword ? 'Hide password' : 'Show password'}
                        aria-pressed={showAdminPassword}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center justify-center h-7 w-7 rounded-lg text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-[#192638] focus:outline-none focus:ring-1 focus:ring-[#60A5FA] transition-colors cursor-pointer"
                      >
                        {showAdminPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <div className="flex items-start gap-2.5 rounded-xl border border-rose-500/40 bg-rose-950/50 p-3.5 text-xs text-rose-300">
                      <AlertCircle size={16} className="text-rose-400 shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </div>
                  )}

                  <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <span className="text-[11px] text-[#94A3B8]">
                      Role authorization strictly verified via database profiles
                    </span>

                    <button
                      type="submit"
                      data-testid="btn-submit-login"
                      disabled={loading}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-[#60A5FA] hover:bg-blue-400 px-6 py-2.5 text-xs font-bold text-[#0F172A] shadow-sm transition disabled:opacity-50 cursor-pointer"
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
      <footer className="relative z-10 text-center py-4 text-[11px] text-[#94A3B8]/70 border-t border-[#293A50]/40">
        PATH FINDER • Misrimal Navajee Munoth Jain Engineering College, Chennai. All rights reserved.
      </footer>
    </div>
  )
}
