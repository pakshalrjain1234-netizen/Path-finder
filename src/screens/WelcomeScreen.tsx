import {
  ArrowRight,
  Footprints,
  Layers3,
  RefreshCw,
  Route,
  Search,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { Campus3D } from '../components/Campus3D'

const FEATURED_CAMPUS_HUBS = [
  {
    id: 'it-block',
    name: 'IT Block',
    category: 'Computing & Laboratories',
    description: 'Home to Information Technology, Computer Science labs, and advanced computing centers.',
    accent: 'from-blue-600 to-indigo-600',
  },
  {
    id: 'main-block',
    name: 'Main Block',
    category: 'Administration & Academic',
    description: 'Principal office, administrative deans, conference halls, and central student services.',
    accent: 'from-indigo-600 to-purple-600',
  },
  {
    id: 'first-year-block',
    name: 'First Year Block',
    category: 'Foundational Studies',
    description: 'Multi-level lecture halls, science laboratories, and foundational engineering departments.',
    accent: 'from-purple-600 to-pink-600',
  },
  {
    id: 'civil-block',
    name: 'Civil Block',
    category: 'Civil & Environmental',
    description: 'Civil engineering design studios, structural testing facilities, and departmental faculty.',
    accent: 'from-teal-600 to-emerald-600',
  },
  {
    id: 'canteen',
    name: 'Campus Dining Plaza',
    category: 'Student Amenities',
    description: 'Central student cafeteria, outdoor dining verandas, and daily refreshment services.',
    accent: 'from-amber-600 to-orange-600',
  },
]

export function WelcomeScreen() {
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-5 md:p-8">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#0B1220]/90 p-6 shadow-2xl backdrop-blur-2xl md:p-10 lg:p-12">
        {/* Ambient Gradient Glows */}
        <div className="pointer-events-none absolute -left-20 -top-20 h-96 w-96 rounded-full bg-blue-600/20 blur-3xl" />
        <div className="pointer-events-none absolute -right-20 -bottom-20 h-96 w-96 rounded-full bg-cyan-500/15 blur-3xl" />

        <div className="relative z-10 grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          {/* Hero Copy */}
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-cyan-300 backdrop-blur-md">
              <Sparkles size={13} className="text-cyan-400" />
              <span>MNMJEC Chennai • 3D Campus Navigation</span>
            </div>

            <div className="space-y-3">
              <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl leading-[1.12]">
                Discover Your Campus.{' '}
                <span className="bg-gradient-to-r from-blue-400 via-cyan-300 to-indigo-300 bg-clip-text text-transparent">
                  Navigate With Confidence.
                </span>
              </h1>
              <p className="max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base md:text-lg">
                Interactive 3D indoor and outdoor navigation engineered for Misrimal Navajee Munoth Jain Engineering College. Walkway-accurate route planning, live turn-by-turn guidance, and automatic rerouting.
              </p>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                to="/explore"
                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-600/30 transition-all hover:scale-[1.02] hover:shadow-cyan-500/30 active:scale-[0.98]"
              >
                <span>Explore Campus in 3D</span>
                <ArrowRight size={16} />
              </Link>
              <Link
                to="/navigation"
                className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-6 py-3.5 text-sm font-bold text-white backdrop-blur-md transition-all hover:bg-white/15 hover:border-white/30 active:scale-[0.98]"
              >
                <Route size={16} className="text-cyan-300" />
                <span>Get Directions</span>
              </Link>
              <Link
                to="/search"
                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-[#162033]/80 px-5 py-3.5 text-sm font-semibold text-slate-300 hover:bg-[#1B2540] hover:text-white transition"
              >
                <Search size={15} />
                <span>Find Facility</span>
              </Link>
            </div>

            {/* Technical Feature Highlights */}
            <div className="grid grid-cols-3 gap-3 border-t border-white/10 pt-5">
              <div>
                <div className="text-base font-extrabold text-white">Graph-Based</div>
                <div className="text-[11px] font-medium text-slate-400">Pedestrian Pathways</div>
              </div>
              <div>
                <div className="text-base font-extrabold text-white">67 Tests</div>
                <div className="text-[11px] font-medium text-slate-400">Safety &amp; Guardrail Checks</div>
              </div>
              <div>
                <div className="text-base font-extrabold text-white">Adaptive</div>
                <div className="text-[11px] font-medium text-slate-400">Automatic Rerouting</div>
              </div>
            </div>
          </div>

          {/* 3D Model Preview Showcase */}
          <div className="relative overflow-hidden rounded-3xl border border-white/15 bg-[#061018]/90 p-2.5 shadow-2xl backdrop-blur-xl">
            <div className="relative h-[340px] sm:h-[400px] w-full overflow-hidden rounded-2xl bg-[#0B1220]">
              <Campus3D
                className="h-full w-full"
                showHud={false}
                showInstructionBadge={false}
              />
              {/* Showcase Bezel Badge */}
              <div className="pointer-events-none absolute bottom-3 left-3 flex items-center gap-2 rounded-xl border border-white/15 bg-[#0B1220]/90 px-3 py-1.5 shadow-lg backdrop-blur-md">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400" />
                </span>
                <span className="text-[11px] font-bold text-white tracking-wide">
                  Live 3D Campus Model • Interactive View
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Campus Pillars Showcase */}
      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-white/10 bg-[#0B1220]/80 p-6 shadow-xl backdrop-blur-xl transition-all hover:border-white/20">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-950/80 text-cyan-400 border border-cyan-500/30 mb-4">
            <Footprints size={24} />
          </div>
          <h2 className="text-lg font-bold text-white tracking-tight">Walkway-Accurate Network</h2>
          <p className="mt-2 text-xs leading-relaxed text-slate-400">
            Navigation strictly follows surveyed pedestrian walkways and paved campus avenues, avoiding building obstacles, walls, and restricted areas.
          </p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-[#0B1220]/80 p-6 shadow-xl backdrop-blur-xl transition-all hover:border-white/20">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-950/80 text-teal-400 border border-teal-500/30 mb-4">
            <RefreshCw size={24} />
          </div>
          <h2 className="text-lg font-bold text-white tracking-tight">Intelligent Rerouting</h2>
          <p className="mt-2 text-xs leading-relaxed text-slate-400">
            Equipped with Phase 4C automatic off-route detection. If a student takes a wrong turn, PATH FINDER recalculates the route smoothly within seconds.
          </p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-[#0B1220]/80 p-6 shadow-xl backdrop-blur-xl transition-all hover:border-white/20">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-950/80 text-indigo-400 border border-indigo-500/30 mb-4">
            <Layers3 size={24} />
          </div>
          <h2 className="text-lg font-bold text-white tracking-tight">Outdoor-to-Indoor Continuity</h2>
          <p className="mt-2 text-xs leading-relaxed text-slate-400">
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
            <p className="text-xs font-medium text-slate-400 mt-0.5">
              Select a prominent block to inspect details or calculate an instant route
            </p>
          </div>
          <Link
            to="/search"
            className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold text-cyan-400 hover:text-cyan-300"
          >
            <span>View all locations</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURED_CAMPUS_HUBS.map((hub) => (
            <div
              key={hub.id}
              className="group relative flex flex-col justify-between rounded-2xl border border-white/10 bg-[#0B1220]/80 p-5 shadow-xl backdrop-blur-xl transition-all hover:border-cyan-500/40 hover:shadow-cyan-500/10"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-md bg-[#162033] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-cyan-300 border border-cyan-500/20">
                    {hub.category}
                  </span>
                  <div className={`h-2.5 w-2.5 rounded-full bg-gradient-to-r ${hub.accent}`} />
                </div>
                <h3 className="mt-3 text-base font-bold text-white tracking-tight group-hover:text-cyan-400 transition-colors">
                  {hub.name}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-400">
                  {hub.description}
                </p>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3">
                <Link
                  to={`/building/${hub.id}`}
                  className="text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Building details
                </Link>
                <Link
                  to={`/navigation?to=${hub.id}`}
                  className="inline-flex items-center gap-1 text-xs font-bold text-cyan-400 hover:text-cyan-300"
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
      <section className="rounded-3xl border border-white/10 bg-[#0B1220]/90 p-6 md:p-8 backdrop-blur-xl">
        <div className="text-center max-w-xl mx-auto mb-8">
          <span className="rounded-full bg-blue-950/80 px-3 py-1 text-xs font-bold text-cyan-300 uppercase tracking-wider border border-cyan-500/30">
            How It Works
          </span>
          <h2 className="mt-2 text-2xl font-extrabold text-white tracking-tight">
            Seamless Campus Navigation in 3 Steps
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Designed for students, faculty, and campus visitors alike.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-[#111827]/80 p-5 shadow-lg">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white font-black text-sm mb-3">
              01
            </div>
            <h3 className="text-sm font-bold text-white">Choose Starting Point & Destination</h3>
            <p className="mt-1 text-xs text-slate-400 leading-relaxed">
              Select your origin from Main Gate 1 or your current location, and pick any academic department or facility.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#111827]/80 p-5 shadow-lg">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white font-black text-sm mb-3">
              02
            </div>
            <h3 className="text-sm font-bold text-white">Follow 3D Walkway Path</h3>
            <p className="mt-1 text-xs text-slate-400 leading-relaxed">
              View the continuous 3D polyline rendered directly on the campus model, complete with turn guidance and distance.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#111827]/80 p-5 shadow-lg">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-600 text-white font-black text-sm mb-3">
              03
            </div>
            <h3 className="text-sm font-bold text-white">Smart Rerouting & Arrival</h3>
            <p className="mt-1 text-xs text-slate-400 leading-relaxed">
              If you take a wrong turn, PATH FINDER detects the deviation automatically and recalculates the best available walkway path.
            </p>
          </div>
        </div>
      </section>

      {/* Safety & Verification Guardrail Notice */}
      <section className="rounded-2xl border border-cyan-500/30 bg-cyan-950/30 p-4 text-xs text-slate-300 flex items-start gap-3 backdrop-blur-md">
        <ShieldCheck size={20} className="text-cyan-400 flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-white">Verified Campus Topology:</span>{' '}
          All pathways and building entries in PATH FINDER reflect actual MNMJEC campus walkways. Real-world outdoor GPS tracking remains gated behind on-site calibration verification for maximum positional integrity.
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 pt-6 pb-2 text-center text-xs text-slate-400 space-y-2">
        <p className="font-semibold text-slate-300">
          Misrimal Navajee Munoth Jain Engineering College (MNMJEC), Chennai
        </p>
        <p className="text-[11px] text-slate-500">
          PATH FINDER • Interactive 3D Campus Wayfinding & Navigation Platform • PWA Ready
        </p>
      </footer>
    </div>
  )
}
