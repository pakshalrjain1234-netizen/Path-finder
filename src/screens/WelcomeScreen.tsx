import {
  ArrowRight,
  ClipboardList,
  Compass,
  Footprints,
  GraduationCap,
  Layers3,
  MessageSquare,
  RefreshCw,
  Route,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
  Wrench,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { Campus3D } from '../components/Campus3D'
import { useAuth } from '../context/AuthContext'

const FEATURED_CAMPUS_HUBS = [
  {
    id: 'it-block',
    name: 'IT Block',
    category: 'Computing & Laboratories',
    description: 'Home to Information Technology, Computer Science labs, and advanced computing centers.',
    accent: 'from-blue-600 to-indigo-600',
    tagBg: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  {
    id: 'main-block',
    name: 'Main Block',
    category: 'Administration & Academic',
    description: 'Principal office, administrative deans, conference halls, and central student services.',
    accent: 'from-indigo-600 to-purple-600',
    tagBg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  },
  {
    id: 'first-year-block',
    name: 'First Year Block',
    category: 'Foundational Studies',
    description: 'Multi-level lecture halls, science laboratories, and foundational engineering departments.',
    accent: 'from-purple-600 to-pink-600',
    tagBg: 'bg-purple-50 text-purple-700 border-purple-200',
  },
  {
    id: 'civil-block',
    name: 'Civil Block',
    category: 'Civil & Environmental',
    description: 'Civil engineering design studios, structural testing facilities, and departmental faculty.',
    accent: 'from-teal-600 to-emerald-600',
    tagBg: 'bg-teal-50 text-teal-700 border-teal-200',
  },
  {
    id: 'canteen',
    name: 'Campus Dining Plaza',
    category: 'Student Amenities',
    description: 'Central student cafeteria, outdoor dining verandas, and daily refreshment services.',
    accent: 'from-amber-600 to-orange-600',
    tagBg: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
  },
]

export function WelcomeScreen() {
  const { role, user, isAuthenticated } = useAuth()

  const roleGreeting = (() => {
    if (role === 'admin') return 'Welcome, Administrator'
    if (role === 'student') return `Welcome, Student ${user.name ? `(${user.name.split(' ')[0]})` : ''}`
    return 'Welcome to PATH FINDER'
  })()

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-6 md:p-8 bg-[#101827] text-[#F1F5F9]">
      {/* University Hero Section */}
      <section className="relative overflow-hidden rounded-3xl border border-[#293A50] bg-[#192638] p-6 shadow-xl md:p-10 lg:p-12">
        {/* Subtle Dark University Background Accents */}
        <div className="pointer-events-none absolute -right-20 -top-20 h-96 w-96 rounded-full bg-[#162235]/60 blur-3xl" />
        <div className="pointer-events-none absolute -left-20 -bottom-20 h-96 w-96 rounded-full bg-[#24364D]/40 blur-3xl" />

        <div className="relative z-10 grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          {/* Hero Copy */}
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#293A50] bg-[#162235] px-3.5 py-1 text-xs font-bold text-[#60A5FA]">
                <Compass size={14} className="text-[#60A5FA]" />
                <span>Misrimal Navajee Munoth Jain Engineering College • Chennai</span>
              </div>

              {/* Role Indicator Badge */}
              <div
                id="welcome-role-badge"
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold border ${
                  role === 'admin'
                    ? 'border-blue-500/20 bg-blue-500/10 text-[#60A5FA]'
                    : role === 'student'
                      ? 'border-indigo-500/20 bg-indigo-500/10 text-indigo-300'
                      : 'border-emerald-500/20 bg-emerald-500/10 text-[#34D399]'
                }`}
              >
                {role === 'admin' ? (
                  <ShieldCheck size={13} className="text-[#60A5FA]" />
                ) : role === 'student' ? (
                  <GraduationCap size={13} className="text-indigo-400" />
                ) : (
                  <Users size={13} className="text-[#34D399]" />
                )}
                <span>{roleGreeting}</span>
              </div>
            </div>

            <div className="space-y-3">
              <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl leading-[1.15]">
                Discover Your Campus.{' '}
                <span className="bg-gradient-to-r from-[#60A5FA] via-[#38BDF8] to-[#34D399] bg-clip-text text-transparent">
                  Navigate With Confidence.
                </span>
              </h1>
              <p className="max-w-2xl text-sm leading-relaxed text-[#94A3B8] sm:text-base md:text-lg">
                Interactive 3D digital twin engineered for MNMJEC. Experience surveyed walkway paths, smart turn-by-turn guidance, building directories, and virtual cinematic tours.
              </p>
            </div>

            {/* 4 Primary Action CTAs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {/* CTA 1: Explore 3D Campus */}
              <Link
                to="/explore"
                id="btn-welcome-explore"
                className="flex items-center justify-between rounded-2xl bg-[#2563EB] hover:bg-blue-600 p-4 text-white shadow-lg shadow-blue-600/20 transition-all hover:scale-[1.01] active:scale-[0.99] group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white">
                    <Layers3 size={20} />
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-bold">Explore 3D Campus</div>
                    <div className="text-xs text-blue-100">Interactive digital twin</div>
                  </div>
                </div>
                <ArrowRight size={18} className="text-white/80 group-hover:translate-x-1 transition-transform" />
              </Link>

              {/* CTA 2: Start Navigation */}
              <Link
                to="/navigation"
                id="btn-welcome-directions"
                className="flex items-center justify-between rounded-2xl bg-[#1E3A5F] hover:bg-[#24364D] border border-[#293A50] p-4 text-white shadow-md transition-all hover:scale-[1.01] active:scale-[0.99] group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white">
                    <Route size={20} />
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-bold">Start Navigation</div>
                    <div className="text-xs text-slate-300">Turn-by-turn walking path</div>
                  </div>
                </div>
                <ArrowRight size={18} className="text-white/80 group-hover:translate-x-1 transition-transform" />
              </Link>

              {/* CTA 3: Find a Building */}
              <Link
                to="/search"
                className="flex items-center justify-between rounded-2xl border border-[#293A50] bg-[#162235] hover:bg-[#192638] hover:border-[#60A5FA]/40 p-4 text-white shadow-sm transition-all hover:scale-[1.01] active:scale-[0.99] group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-[#60A5FA]">
                    <Search size={18} />
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-bold">Find a Building</div>
                    <div className="text-xs text-[#94A3B8]">Search departments &amp; halls</div>
                  </div>
                </div>
                <ArrowRight size={16} className="text-[#94A3B8] group-hover:text-[#60A5FA] group-hover:translate-x-1 transition-all" />
              </Link>

              {/* CTA 4: Cinematic Campus Tour */}
              <Link
                to="/explore?tour=true"
                id="btn-welcome-take-tour"
                className="flex items-center justify-between rounded-2xl border border-amber-500/30 bg-amber-950/40 hover:bg-amber-900/40 hover:border-amber-400/40 p-4 text-amber-200 shadow-sm transition-all hover:scale-[1.01] active:scale-[0.99] group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400">
                    <Sparkles size={18} />
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-bold text-white">Cinematic Tour</div>
                    <div className="text-xs text-amber-300">Guided audio exploration</div>
                  </div>
                </div>
                <ArrowRight size={16} className="text-amber-400 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            {/* Role-Specific Direct Operational Access Banners */}
            {role === 'admin' && (
              <div className="rounded-2xl border border-blue-500/30 bg-[#162235] p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#60A5FA]">
                    <ShieldCheck size={15} className="text-[#60A5FA]" />
                    <span>Administrator Operations Command</span>
                  </div>
                  <span className="text-[10px] text-blue-300 font-semibold bg-blue-500/20 px-2 py-0.5 rounded-md">
                    MANAGEMENT ACCESS
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <Link
                    to="/admin/issues"
                    id="btn-admin-command-center"
                    className="inline-flex items-center gap-2 rounded-xl bg-[#2563EB] hover:bg-blue-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition"
                  >
                    <Wrench size={14} />
                    <span>Campus Issue Command Center</span>
                  </Link>
                  <Link
                    to="/admin/feedback"
                    id="btn-admin-feedback-center"
                    className="inline-flex items-center gap-2 rounded-xl border border-[#293A50] bg-[#192638] hover:bg-[#24364D] px-3.5 py-2 text-xs font-bold text-[#60A5FA] transition"
                  >
                    <MessageSquare size={14} className="text-[#60A5FA]" />
                    <span>Visitor Feedback Dashboard</span>
                  </Link>
                </div>
              </div>
            )}

            {role === 'student' && (
              <div className="rounded-2xl border border-indigo-500/30 bg-[#162235] p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-300">
                    <GraduationCap size={15} className="text-indigo-400" />
                    <span>Student Campus Services</span>
                  </div>
                  <span className="text-[10px] text-indigo-300 font-semibold bg-indigo-500/20 px-2 py-0.5 rounded-md">
                    STUDENT PORTAL
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <Link
                    to="/issues"
                    id="btn-student-report-issue"
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition"
                  >
                    <Wrench size={14} />
                    <span>Campus Issue Passport</span>
                  </Link>
                  <Link
                    to="/my-reports"
                    id="btn-student-my-reports"
                    className="inline-flex items-center gap-2 rounded-xl border border-[#293A50] bg-[#192638] hover:bg-[#24364D] px-3.5 py-2 text-xs font-bold text-indigo-300 transition"
                  >
                    <ClipboardList size={14} className="text-indigo-400" />
                    <span>My Reports</span>
                  </Link>
                </div>
              </div>
            )}

            {!isAuthenticated && (
              <div className="flex items-center justify-between rounded-2xl border border-[#293A50] bg-[#162235] p-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-[#60A5FA]">
                    <Users size={16} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">Student or Faculty Member?</div>
                    <div className="text-[11px] text-[#94A3B8]">Sign in to access your Issue Passport or Admin controls.</div>
                  </div>
                </div>
                <Link
                  to="/login"
                  id="btn-welcome-login-role"
                  data-testid="btn-welcome-login-role"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#24364D] hover:bg-[#2D3F59] border border-[#293A50] px-3.5 py-1.5 text-xs font-bold text-white shadow-sm transition"
                >
                  <span>Sign In</span>
                  <ArrowRight size={13} />
                </Link>
              </div>
            )}

            {/* University Stats Summary */}
            <div className="grid grid-cols-3 gap-3 border-t border-[#293A50] pt-4">
              <div>
                <div className="text-base font-extrabold text-white">Surveyed</div>
                <div className="text-[11px] font-medium text-[#94A3B8]">Walkway Network</div>
              </div>
              <div>
                <div className="text-base font-extrabold text-white">Stage E3</div>
                <div className="text-[11px] font-medium text-[#94A3B8]">3D Digital Twin</div>
              </div>
              <div>
                <div className="text-base font-extrabold text-white">Instant</div>
                <div className="text-[11px] font-medium text-[#94A3B8]">Dynamic Rerouting</div>
              </div>
            </div>
          </div>

          {/* 3D Model Preview Showcase */}
          <div className="relative overflow-hidden rounded-3xl border border-[#293A50] bg-[#162235] p-2.5 shadow-xl group">
            <div className="relative h-[360px] sm:h-[440px] w-full overflow-hidden rounded-2xl bg-[#101827]">
              <Campus3D
                className="h-full w-full"
                showHud={false}
                showInstructionBadge={false}
                isWelcomeShowcase={true}
                preset="welcome-showcase"
              />

              {/* Click to Enter Full Explorer Overlay */}
              <Link
                to="/explore"
                id="btn-welcome-showcase-enter"
                aria-label="Open Full 3D Campus Explorer"
                className="absolute inset-x-3 bottom-3 z-20 flex items-center justify-between rounded-xl border border-[#293A50] bg-[#162235]/95 px-3.5 py-2 text-white shadow-lg backdrop-blur-md transition-all hover:border-[#60A5FA]/60 hover:bg-[#192638] group-hover:scale-[1.01]"
              >
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#34D399] opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#34D399]" />
                  </span>
                  <span className="text-xs font-bold text-white tracking-wide">
                    Live 3D Campus Twin • Click to Enter Explorer
                  </span>
                </div>
                <div className="flex items-center gap-1 text-xs font-semibold text-[#60A5FA]">
                  <span>Open Full 3D</span>
                  <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                </div>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Campus Pillars Showcase */}
      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-[#293A50] bg-[#192638] p-6 shadow-sm transition-all hover:border-[#60A5FA]/40">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10 text-[#60A5FA] mb-4">
            <Footprints size={22} />
          </div>
          <h2 className="text-base font-bold text-white tracking-tight">Walkway-Accurate Network</h2>
          <p className="mt-1.5 text-xs leading-relaxed text-[#94A3B8]">
            Navigation strictly follows surveyed pedestrian walkways and paved campus avenues, avoiding building walls, obstacles, and restricted areas.
          </p>
        </div>

        <div className="rounded-2xl border border-[#293A50] bg-[#192638] p-6 shadow-sm transition-all hover:border-[#34D399]/40">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-[#34D399] mb-4">
            <RefreshCw size={22} />
          </div>
          <h2 className="text-base font-bold text-white tracking-tight">Intelligent Rerouting</h2>
          <p className="mt-1.5 text-xs leading-relaxed text-[#94A3B8]">
            Equipped with automatic off-route detection. If a student takes a wrong turn, PATH FINDER recalculates the route smoothly within seconds.
          </p>
        </div>

        <div className="rounded-2xl border border-[#293A50] bg-[#192638] p-6 shadow-sm transition-all hover:border-indigo-500/40">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 mb-4">
            <Layers3 size={22} />
          </div>
          <h2 className="text-base font-bold text-white tracking-tight">Outdoor-to-Indoor Continuity</h2>
          <p className="mt-1.5 text-xs leading-relaxed text-[#94A3B8]">
            Seamless transition from campus entrance gates to individual academic blocks, floor levels, lecture halls, and specialized research facilities.
          </p>
        </div>
      </section>

      {/* Featured Campus Destinations */}
      <section className="space-y-4">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-xl font-extrabold tracking-tight text-white">
              Popular Campus Destinations
            </h2>
            <p className="text-xs font-medium text-[#94A3B8] mt-0.5">
              Select a prominent block to inspect details or calculate an instant route
            </p>
          </div>
          <Link
            to="/search"
            className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold text-[#60A5FA] hover:text-blue-300"
          >
            <span>View all locations</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURED_CAMPUS_HUBS.map((hub) => (
            <div
              key={hub.id}
              className="group relative flex flex-col justify-between rounded-2xl border border-[#293A50] bg-[#192638] p-5 shadow-sm transition-all hover:border-[#60A5FA]/40"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${hub.tagBg}`}>
                    {hub.category}
                  </span>
                  <div className={`h-2.5 w-2.5 rounded-full bg-gradient-to-r ${hub.accent}`} />
                </div>
                <h3 className="mt-3 text-base font-bold text-white tracking-tight group-hover:text-[#60A5FA] transition-colors">
                  {hub.name}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-[#94A3B8]">
                  {hub.description}
                </p>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-[#293A50] pt-3">
                <Link
                  to={`/building/${hub.id}`}
                  className="text-xs font-semibold text-[#94A3B8] hover:text-white"
                >
                  Building details
                </Link>
                <Link
                  to={`/navigation?to=${hub.id}`}
                  className="inline-flex items-center gap-1 text-xs font-bold text-[#60A5FA] hover:text-blue-300"
                >
                  <span>Directions</span>
                  <ArrowRight size={13} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works Flow */}
      <section className="rounded-3xl border border-[#293A50] bg-[#192638] p-6 md:p-8 shadow-xl">
        <div className="text-center max-w-xl mx-auto mb-8">
          <span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-bold text-[#60A5FA] uppercase tracking-wider border border-blue-500/20">
            How It Works
          </span>
          <h2 className="mt-2 text-2xl font-extrabold text-white tracking-tight">
            Seamless Campus Navigation in 3 Steps
          </h2>
          <p className="mt-1 text-xs text-[#94A3B8]">
            Designed for students, faculty, and campus visitors alike.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl border border-[#293A50] bg-[#162235] p-5 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#2563EB] text-white font-black text-sm mb-3">
              01
            </div>
            <h3 className="text-sm font-bold text-white">Choose Starting Point &amp; Destination</h3>
            <p className="mt-1 text-xs text-[#94A3B8] leading-relaxed">
              Select your origin from Main Gate 1 or your current location, and pick any academic department or facility.
            </p>
          </div>

          <div className="rounded-2xl border border-[#293A50] bg-[#162235] p-5 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1E3A5F] text-white font-black text-sm mb-3">
              02
            </div>
            <h3 className="text-sm font-bold text-white">Follow 3D Walkway Path</h3>
            <p className="mt-1 text-xs text-[#94A3B8] leading-relaxed">
              View the continuous 3D polyline rendered directly on the campus model, complete with turn guidance and distance.
            </p>
          </div>

          <div className="rounded-2xl border border-[#293A50] bg-[#162235] p-5 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#059669] text-white font-black text-sm mb-3">
              03
            </div>
            <h3 className="text-sm font-bold text-white">Smart Rerouting &amp; Arrival</h3>
            <p className="mt-1 text-xs text-[#94A3B8] leading-relaxed">
              If you take a wrong turn, PATH FINDER detects the deviation automatically and recalculates the best available walkway path.
            </p>
          </div>
        </div>
      </section>

      {/* Safety & Verification Guardrail Notice */}
      <section className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4 text-xs text-[#94A3B8] flex items-start gap-3">
        <ShieldCheck size={20} className="text-[#60A5FA] flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-white">Verified Campus Topology:</span>{' '}
          All pathways and building entries in PATH FINDER reflect actual MNMJEC campus walkways. Real-world outdoor GPS tracking remains gated behind on-site calibration verification for maximum positional integrity.
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#293A50] pt-6 pb-2 text-center text-xs text-[#64748B] space-y-2">
        <p className="font-semibold text-slate-300">
          Misrimal Navajee Munoth Jain Engineering College (MNMJEC), Chennai
        </p>
        <p className="text-[11px] text-[#64748B]">
          PATH FINDER • Interactive 3D Campus Wayfinding &amp; Navigation Platform • PWA Ready
        </p>
      </footer>
    </div>
  )
}
