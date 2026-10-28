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
import { Badge } from '../components/Badge'
import { Campus3D } from '../components/Campus3D'
import { useAuth } from '../context/AuthContext'

const FEATURED_CAMPUS_HUBS = [
  {
    id: 'it-block',
    name: 'IT Block',
    category: 'Computing & Research',
    description: 'Information Technology, Computer Science laboratories, and advanced computing centers.',
    tintClass: 'bg-[#C6DCE4] border-[#9FBECB] text-[#265A6E]',
    accentDot: 'bg-[#265A6E]',
  },
  {
    id: 'main-block',
    name: 'Main Block',
    category: 'Administration & Senate',
    description: 'Principal office, administrative deans, conference halls, and central student services.',
    tintClass: 'bg-[#D2BEE7] border-[#C9B6DF] text-[#352A47]',
    accentDot: 'bg-[#352A47]',
  },
  {
    id: 'first-year-block',
    name: 'First Year Block',
    category: 'Foundational Studies',
    description: 'Multi-level lecture halls, basic science labs, and foundational engineering classrooms.',
    tintClass: 'bg-[#BCD8C9] border-[#94BCA7] text-[#1E583F]',
    accentDot: 'bg-[#1E583F]',
  },
  {
    id: 'civil-block',
    name: 'Civil Block',
    category: 'Civil & Structural',
    description: 'Civil engineering design studios, structural testing facilities, and departmental faculty.',
    tintClass: 'bg-[#E8C8B9] border-[#D7A894] text-[#9E563A]',
    accentDot: 'bg-[#9E563A]',
  },
  {
    id: 'canteen',
    name: 'Campus Dining Plaza',
    category: 'Student Amenities',
    description: 'Central student cafeteria, shaded outdoor dining verandas, and daily refreshment services.',
    tintClass: 'bg-[#F5E6DF] border-[#E8C8B9] text-[#9E563A]',
    accentDot: 'bg-[#9E563A]',
  },
]

export function WelcomeScreen() {
  const { role, user, isAuthenticated } = useAuth()

  const roleGreeting = (() => {
    if (role === 'admin') return 'Administrator Operations'
    if (role === 'student') return `Student: ${user.name ? user.name.split(' ')[0] : 'Enrolled'}`
    return 'Campus Visitor'
  })()

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-12 px-4 py-8 md:p-10 lg:p-12 bg-[#E8DDF2] text-[#352A47] font-sans selection:bg-[#D2BEE7]">
      {/* =========================================================================
         1. HERO SECTION: Expressive Editorial Fraunces & Syne Showcase
         ========================================================================= */}
      <section className="relative overflow-hidden rounded-[2.5rem] border border-[#C9B6DF] bg-gradient-to-br from-[#FBF8FD] via-[#F3ECF8] to-[#E8DDF2] p-7 md:p-10 lg:p-12 shadow-dream-card">
        {/* Soft Dreamscape Atmospheric Aura */}
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-[#D2BEE7]/35 blur-3xl" />
        <div className="pointer-events-none absolute -left-20 -bottom-20 h-80 w-80 rounded-full bg-[#E8C8B9]/30 blur-3xl" />

        <div className="relative z-10 grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          {/* Hero Copy (Fraunces Editorial Headline + Plus Jakarta Sans Body) */}
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#C9B6DF] bg-[#D2BEE7]/60 px-3.5 py-1 text-[11px] font-heading font-bold tracking-wider uppercase text-[#352A47] shadow-2xs">
                <Compass size={13} className="text-[#352A47]" />
                <span>MNMJEC Chennai • Autonomous 3D Twin</span>
              </span>

              <Badge
                id="welcome-role-badge"
                variant={role === 'admin' ? 'admin' : role === 'student' ? 'student' : 'visitor'}
                icon={
                  role === 'admin' ? (
                    <ShieldCheck size={13} className="text-[#352A47]" />
                  ) : role === 'student' ? (
                    <GraduationCap size={13} className="text-[#265A6E]" />
                  ) : (
                    <Users size={13} className="text-[#1E583F]" />
                  )
                }
                size="md"
              >
                <span>{roleGreeting}</span>
              </Badge>
            </div>

            <div className="space-y-4">
              <h1 className="font-editorial text-5xl sm:text-6xl lg:text-[68px] font-bold text-[#352A47] leading-[1.03] tracking-[-0.03em]">
                Campus Wayfinding, <br />
                <span className="italic font-normal text-[#51465F] tracking-[-0.015em]">
                  reimagined in space.
                </span>
              </h1>
              <p className="max-w-xl text-base sm:text-lg leading-relaxed text-[#51465F] font-sans font-normal tracking-[-0.01em]">
                An authentic spatial companion for Misrimal Navajee Munoth Jain Engineering College. Surveyed pedestrian corridors, living 3D architectural geometry, and intelligent turn-by-turn guidance.
              </p>
            </div>

            {/* Primary Action Buttons (Syne Font) */}
            <div className="flex flex-wrap items-center gap-3.5 pt-2">
              <Link
                to="/explore"
                id="btn-welcome-explore"
                className="inline-flex items-center gap-3 rounded-2xl bg-[#352A47] hover:bg-[#433659] px-7 py-4 text-sm font-heading font-bold text-[#FAF6FD] shadow-dream-soft transition-all hover:-translate-y-0.5 active:translate-y-0 group cursor-pointer"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-white/15 text-[#FAF6FD]">
                  <Layers3 size={16} />
                </div>
                <span>Explore 3D Campus</span>
                <ArrowRight size={16} className="text-[#E8C8B9] group-hover:translate-x-1 transition-transform" />
              </Link>

              <Link
                to="/navigation"
                id="btn-welcome-directions"
                className="inline-flex items-center gap-2.5 rounded-2xl border border-[#D7A894] bg-[#E8C8B9] hover:bg-[#DEC0B0] px-7 py-4 text-sm font-heading font-bold text-[#352A47] shadow-2xs transition-all hover:-translate-y-0.5 active:translate-y-0 group cursor-pointer"
              >
                <Route size={16} className="text-[#352A47]" />
                <span>Plan Walkway Route</span>
                <ArrowRight size={15} className="text-[#352A47] group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            {/* Secondary Editorial Stats (Fraunces Display Italics) */}
            <div className="grid grid-cols-3 gap-3.5 border-t border-[#C9B6DF]/70 pt-6 text-left">
              <div className="rounded-2xl bg-[#E8DDF2]/60 p-3.5 border border-[#C9B6DF]/60">
                <div className="font-editorial italic text-2xl font-bold text-[#352A47]">Surveyed</div>
                <div className="text-[11px] font-sans font-medium text-[#51465F] mt-0.5">Walkway Mesh</div>
              </div>
              <div className="rounded-2xl bg-[#E8DDF2]/60 p-3.5 border border-[#C9B6DF]/60">
                <div className="font-editorial italic text-2xl font-bold text-[#352A47]">Stage E3</div>
                <div className="text-[11px] font-sans font-medium text-[#51465F] mt-0.5">Certified Model</div>
              </div>
              <div className="rounded-2xl bg-[#E8DDF2]/60 p-3.5 border border-[#C9B6DF]/60">
                <div className="font-editorial italic text-2xl font-bold text-[#352A47]">Offline</div>
                <div className="text-[11px] font-sans font-medium text-[#51465F] mt-0.5">PWA Ready</div>
              </div>
            </div>
          </div>

          {/* 3D Campus Showcase Centerpiece */}
          <div className="relative overflow-hidden rounded-[2.5rem] border border-[#C9B6DF] bg-[#DFD0EF] p-3 shadow-dream-elevated group">
            {/* Architectural Model Canvas Frame */}
            <div className="relative h-[420px] sm:h-[500px] w-full overflow-hidden rounded-[2rem] bg-gradient-to-b from-[#E3D9ED] to-[#C9BBD9]">
              <Campus3D
                className="h-full w-full"
                showHud={false}
                showInstructionBadge={false}
                isWelcomeShowcase={true}
                preset="welcome-showcase"
              />

              {/* Floating Architectural Badge Top */}
              <div className="pointer-events-none absolute left-4 top-4 z-20 flex items-center gap-2 rounded-full border border-[#C9B6DF] bg-[#FBF8FD]/90 px-3.5 py-1.5 shadow-dream-soft backdrop-blur-md">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#1E583F] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#1E583F]" />
                </span>
                <span className="text-[11px] font-heading font-bold text-[#352A47] tracking-tight">
                  Stage E3 Digital Twin
                </span>
              </div>

              {/* Enter Full Explorer Overlay Bar */}
              <Link
                to="/explore"
                id="btn-welcome-showcase-enter"
                aria-label="Open Full 3D Campus Explorer"
                className="absolute inset-x-4 bottom-4 z-20 flex items-center justify-between rounded-2xl border border-[#C9B6DF] bg-[#FBF8FD]/95 px-4 py-3 text-[#352A47] shadow-dream-card backdrop-blur-md transition-all hover:bg-white hover:border-[#352A47]"
              >
                <div className="flex items-center gap-2">
                  <Layers3 size={16} className="text-[#352A47]" />
                  <span className="text-xs font-heading font-bold text-[#352A47] tracking-tight">
                    Interactive 3D Campus • Pan, Orbit &amp; Zoom
                  </span>
                </div>
                <div className="flex items-center gap-1 text-xs font-heading font-bold text-[#352A47]">
                  <span>Launch 3D</span>
                  <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
         2. ASYMMETRICAL SPATIAL GATEWAY TILES (Syne Headings)
         ========================================================================= */}
      <section className="space-y-4">
        <div className="flex items-end justify-between px-1">
          <div>
            <h2 className="font-heading text-2xl sm:text-3xl font-extrabold tracking-[-0.02em] text-[#352A47]">
              Campus Gateways
            </h2>
            <p className="text-xs text-[#51465F] mt-1 font-sans">
              Choose your spatial mode to navigate, tour, explore, or share community feedback
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Tile 1: Cinematic Audio Tour (Lilac Well) */}
          <Link
            to="/explore?tour=true"
            id="btn-welcome-take-tour"
            className="flex flex-col justify-between rounded-3xl border border-[#C9B6DF] bg-[#D2BEE7] p-6 shadow-dream-soft transition-all hover:shadow-dream-card hover:-translate-y-1 group cursor-pointer"
          >
            <div>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#FBF8FD] text-[#352A47] mb-4 shadow-2xs">
                <Sparkles size={20} />
              </div>
              <h3 className="font-heading text-base font-bold text-[#352A47] tracking-tight">
                Cinematic Audio Tour
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-[#352A47]/80 font-sans">
                Guided architectural walkthrough with live voice narration and automated camera sequencing.
              </p>
            </div>
            <div className="mt-6 flex items-center gap-1.5 text-xs font-heading font-bold text-[#352A47]">
              <span>Begin Tour</span>
              <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Tile 2: Discover MNMJEC (Dusty Peach Well) */}
          <Link
            to="/discover"
            id="btn-welcome-discover-mnmjec"
            className="flex flex-col justify-between rounded-3xl border border-[#D7A894] bg-[#E8C8B9] p-6 shadow-dream-soft transition-all hover:shadow-dream-card hover:-translate-y-1 group cursor-pointer"
          >
            <div>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#FBF8FD] text-[#9E563A] mb-4 shadow-2xs">
                <GraduationCap size={20} />
              </div>
              <h3 className="font-heading text-base font-bold text-[#352A47] tracking-tight">
                Discover MNMJEC
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-[#352A47]/80 font-sans">
                Departmental courses, academic history, campus leadership, and engineering achievements.
              </p>
            </div>
            <div className="mt-6 flex items-center gap-1.5 text-xs font-heading font-bold text-[#352A47]">
              <span>Discover</span>
              <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Tile 3: Campus Directory (Powder Blue Well) */}
          <Link
            to="/search"
            className="flex flex-col justify-between rounded-3xl border border-[#9FBECB] bg-[#C6DCE4] p-6 shadow-dream-soft transition-all hover:shadow-dream-card hover:-translate-y-1 group cursor-pointer"
          >
            <div>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#FBF8FD] text-[#265A6E] mb-4 shadow-2xs">
                <Search size={20} />
              </div>
              <h3 className="font-heading text-base font-bold text-[#352A47] tracking-tight">
                Campus Directory
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-[#352A47]/80 font-sans">
                Search academic blocks, research labs, lecture halls, Xerox, clinic, and amenities.
              </p>
            </div>
            <div className="mt-6 flex items-center gap-1.5 text-xs font-heading font-bold text-[#352A47]">
              <span>Search Directory</span>
              <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Tile 4: Community Feedback (Muted Sage Well) */}
          <Link
            to="/feedback"
            id="btn-welcome-feedback-center"
            className="flex flex-col justify-between rounded-3xl border border-[#94BCA7] bg-[#BCD8C9] p-6 shadow-dream-soft transition-all hover:shadow-dream-card hover:-translate-y-1 group cursor-pointer"
          >
            <div>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#FBF8FD] text-[#1E583F] mb-4 shadow-2xs">
                <MessageSquare size={20} />
              </div>
              <h3 className="font-heading text-base font-bold text-[#352A47] tracking-tight">
                Visitor Feedback
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-[#352A47]/80 font-sans">
                Help improve wayfinding accuracy, rating experience, or reporting infrastructure questions.
              </p>
            </div>
            <div className="mt-6 flex items-center gap-1.5 text-xs font-heading font-bold text-[#352A47]">
              <span>Feedback</span>
              <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        </div>
      </section>

      {/* =========================================================================
         3. ROLE OPERATIONS (Understated & Non-Intrusive)
         ========================================================================= */}
      {role === 'admin' && (
        <section className="rounded-3xl border border-[#C9B6DF] bg-[#DFD0EF] p-6 shadow-dream-soft">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#352A47] text-[#FAF6FD]">
                <ShieldCheck size={20} />
              </div>
              <div>
                <h3 className="font-heading text-sm font-bold text-[#352A47]">Administrator Command Center</h3>
                <p className="text-xs text-[#51465F] font-sans">Direct operational dispatch and maintenance audit</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                to="/admin/issues"
                id="btn-admin-command-center"
                className="inline-flex items-center gap-2 rounded-2xl bg-[#352A47] hover:bg-[#433659] px-4 py-2 text-xs font-heading font-bold text-[#FAF6FD] shadow-2xs transition"
              >
                <Wrench size={14} />
                <span>Issue Command Center</span>
              </Link>
              <Link
                to="/admin/feedback"
                id="btn-admin-feedback-center"
                className="inline-flex items-center gap-2 rounded-2xl border border-[#C9B6DF] bg-[#FBF8FD] hover:bg-white px-4 py-2 text-xs font-heading font-bold text-[#352A47] shadow-2xs transition"
              >
                <MessageSquare size={14} />
                <span>Feedback Dashboard</span>
              </Link>
            </div>
          </div>
        </section>
      )}

      {role === 'student' && (
        <section className="rounded-3xl border border-[#9FBECB] bg-[#E4EFF3] p-6 shadow-dream-soft">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#265A6E] text-white">
                <GraduationCap size={20} />
              </div>
              <div>
                <h3 className="font-heading text-sm font-bold text-[#265A6E]">Student Campus Passport</h3>
                <p className="text-xs text-[#265A6E]/80 font-sans">Log campus hazard pins or review your filed issue status</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <Link
                to="/issues"
                id="btn-student-report-issue"
                className="inline-flex items-center gap-2 rounded-2xl bg-[#265A6E] hover:bg-[#1f4a5b] px-4 py-2 text-xs font-heading font-bold text-white shadow-2xs transition"
              >
                <Wrench size={14} />
                <span>Issue Passport</span>
              </Link>
              <Link
                to="/my-reports"
                id="btn-student-my-reports"
                className="inline-flex items-center gap-2 rounded-2xl border border-[#9FBECB] bg-[#FBF8FD] hover:bg-white px-4 py-2 text-xs font-heading font-bold text-[#265A6E] shadow-2xs transition"
              >
                <ClipboardList size={14} />
                <span>My Reports</span>
              </Link>
              <Link
                to="/feedback"
                id="btn-student-feedback-center"
                className="inline-flex items-center gap-2 rounded-2xl border border-[#9FBECB] bg-[#FBF8FD] hover:bg-white px-4 py-2 text-xs font-heading font-bold text-[#265A6E] shadow-2xs transition"
              >
                <MessageSquare size={14} />
                <span>Student Feedback</span>
              </Link>
            </div>
          </div>
        </section>
      )}

      {!isAuthenticated && (
        <section className="rounded-3xl border border-[#C9B6DF] bg-[#FBF8FD] p-6 shadow-dream-soft">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#D2BEE7] text-[#352A47]">
                <Users size={18} />
              </div>
              <div>
                <h3 className="font-heading text-sm font-bold text-[#352A47]">MNMJEC Student or Faculty Member?</h3>
                <p className="text-xs text-[#51465F] font-sans">Sign in to access your Issue Passport or campus management tools.</p>
              </div>
            </div>
            <Link
              to="/login"
              id="btn-welcome-login-role"
              data-testid="btn-welcome-login-role"
              className="inline-flex items-center gap-2 rounded-2xl bg-[#352A47] hover:bg-[#433659] px-5 py-2.5 text-xs font-heading font-bold text-[#FAF6FD] shadow-dream-soft transition"
            >
              <span>Sign In</span>
              <ArrowRight size={13} />
            </Link>
          </div>
        </section>
      )}

      {/* =========================================================================
         4. FEATURED CAMPUS DESTINATIONS (Syne Headings)
         ========================================================================= */}
      <section className="space-y-4">
        <div className="flex items-end justify-between px-1">
          <div>
            <h2 className="font-heading text-2xl sm:text-3xl font-extrabold tracking-[-0.02em] text-[#352A47]">
              Key Academic &amp; Research Centers
            </h2>
            <p className="text-xs text-[#51465F] mt-1 font-sans">
              Instant destination inspection with walkway route calculation
            </p>
          </div>
          <Link
            to="/search"
            className="hidden sm:inline-flex items-center gap-1.5 text-xs font-heading font-bold text-[#352A47] hover:underline"
          >
            <span>View all 20+ locations</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURED_CAMPUS_HUBS.map((hub) => (
            <div
              key={hub.id}
              className="group relative flex flex-col justify-between rounded-3xl border border-[#C9B6DF] bg-[#FBF8FD] p-6 shadow-dream-soft transition-all hover:border-[#352A47] hover:shadow-dream-card hover:-translate-y-1"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className={`rounded-full px-3 py-0.5 text-[11px] font-sans font-semibold border ${hub.tintClass}`}>
                    {hub.category}
                  </span>
                  <div className={`h-2.5 w-2.5 rounded-full ${hub.accentDot}`} />
                </div>
                <h3 className="mt-3.5 font-heading text-base font-bold text-[#352A47] tracking-tight group-hover:text-[#9E563A] transition-colors">
                  {hub.name}
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-[#51465F] font-sans">
                  {hub.description}
                </p>
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-[#C9B6DF]/60 pt-3.5">
                <Link
                  to={`/building/${hub.id}`}
                  className="text-xs font-sans font-semibold text-[#51465F] hover:text-[#352A47]"
                >
                  Building details
                </Link>
                <Link
                  to={`/navigation?to=${hub.id}`}
                  className="inline-flex items-center gap-1 text-xs font-heading font-bold text-[#352A47] hover:text-[#9E563A]"
                >
                  <span>Route</span>
                  <ArrowRight size={13} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* =========================================================================
         5. CAMPUS PILLARS: Sculptural Dreamscape Architecture
         ========================================================================= */}
      <section className="grid gap-4 md:grid-cols-3">
        <div className="flex flex-col justify-start rounded-3xl border border-[#94BCA7] bg-[#BCD8C9] p-6 shadow-dream-soft">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#FBF8FD] text-[#1E583F] mb-4 shadow-2xs">
            <Footprints size={20} />
          </div>
          <h2 className="font-heading text-base font-bold text-[#352A47] tracking-tight">Walkway-Accurate Network</h2>
          <p className="mt-2 text-xs leading-relaxed text-[#352A47]/85 font-sans">
            Wayfinding follows surveyed pedestrian corridors and paved avenues, preventing shortcut errors through building obstacles.
          </p>
        </div>

        <div className="flex flex-col justify-start rounded-3xl border border-[#9FBECB] bg-[#C6DCE4] p-6 shadow-dream-soft">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#FBF8FD] text-[#265A6E] mb-4 shadow-2xs">
            <RefreshCw size={20} />
          </div>
          <h2 className="font-heading text-base font-bold text-[#352A47] tracking-tight">Intelligent Rerouting</h2>
          <p className="mt-2 text-xs leading-relaxed text-[#352A47]/85 font-sans">
            Automatic off-route state machine recalculates the path instantly if you diverge from the designated campus walkway.
          </p>
        </div>

        <div className="flex flex-col justify-start rounded-3xl border border-[#C9B6DF] bg-[#D2BEE7] p-6 shadow-dream-soft">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#FBF8FD] text-[#352A47] mb-4 shadow-2xs">
            <Layers3 size={20} />
          </div>
          <h2 className="font-heading text-base font-bold text-[#352A47] tracking-tight">Indoor-Outdoor Continuity</h2>
          <p className="mt-2 text-xs leading-relaxed text-[#352A47]/85 font-sans">
            Seamless guidance from the campus entrance gates directly to specific academic block entries and floor plans.
          </p>
        </div>
      </section>

      {/* =========================================================================
         6. TOPOLOGY & SAFETY GUARDRAIL NOTICE
         ========================================================================= */}
      <section className="rounded-3xl border border-[#94BCA7] bg-[#BCD8C9]/80 p-5 text-xs text-[#1E583F] flex items-start gap-3.5 shadow-dream-soft">
        <ShieldCheck size={22} className="text-[#1E583F] flex-shrink-0 mt-0.5" />
        <div className="font-sans">
          <span className="font-bold text-[#1E583F]">Certified Campus Topology:</span>{' '}
          All pathways and building entries reflect authoritative MNMJEC campus coordinates. Outdoor live GPS navigation is safely guarded behind verified on-site calibration locks to prevent inaccurate positioning.
        </div>
      </section>

      {/* =========================================================================
         7. INSTITUTIONAL FOOTER
         ========================================================================= */}
      <footer className="border-t border-[#C9B6DF] pt-8 pb-4 text-center text-xs text-[#51465F] space-y-2">
        <p className="font-heading font-bold text-[#352A47] text-sm">
          Misrimal Navajee Munoth Jain Engineering College (MNMJEC), Chennai
        </p>
        <p className="text-[11px] text-[#51465F] font-sans">
          PATH FINDER • Editorial Dreamscape Pastel 3D Experience • Certified Stage E3 Campus Model
        </p>
      </footer>
    </div>
  )
}
