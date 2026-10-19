import { Link } from 'react-router-dom'
import { SurfaceCard } from '../components/SurfaceCard'

export function WelcomeScreen() {
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 md:p-6">
      <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
        <div className="grid gap-6 p-5 md:grid-cols-[1.2fr_0.8fr] md:p-6">
          <div className="flex flex-col justify-between gap-5">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full bg-[#2A9D8F]/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[#2A9D8F]">
                MNMJEC • Campus Wayfinding
              </div>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">PATH FINDER</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 md:text-base">
                  Interactive 3D indoor and outdoor campus navigation for Misrimal Navajee Munoth Jain Engineering College.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link to="/explore" className="rounded-xl bg-[#2A9D8F] px-4 py-3 text-sm font-semibold text-white shadow-sm">
                Explore Campus
              </Link>
              <Link to="/search" className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700">
                Destination Search
              </Link>
              <Link to="/navigation" className="rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700">
                Route Navigation
              </Link>
            </div>
          </div>

          <div className="rounded-3xl bg-[#F8FAFC] p-4 ring-1 ring-slate-200">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-100 to-white p-4 shadow-sm ring-1 ring-slate-200">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Live Campus Preview</span>
                <span className="rounded-full bg-[#2A9D8F]/10 px-2 py-1 text-[#2A9D8F]">3D Ready</span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200">
                  <div className="h-24 rounded-xl bg-gradient-to-br from-[#2A9D8F]/20 to-slate-100" />
                  <p className="mt-2 text-xs font-medium text-slate-700">Campus Explorer</p>
                </div>
                <div className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200">
                  <div className="h-24 rounded-xl bg-gradient-to-br from-[#E76F51]/20 to-slate-100" />
                  <p className="mt-2 text-xs font-medium text-slate-700">Route & Floor Flow</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <SurfaceCard title="Campus Features" subtitle="Converted from Stitch UI">
          <ul className="space-y-2 text-sm text-slate-600">
            <li>Mobile-first 3D campus explorer with interactive 3D model viewer.</li>
            <li>Destination search with campus location details.</li>
            <li>Route guidance with turn-by-turn waypoints.</li>
          </ul>
        </SurfaceCard>

        <SurfaceCard title="Design Rules" subtitle="Preserved palette and layout tokens">
          <ul className="space-y-2 text-sm text-slate-600">
            <li>Teal, white, slate, and coral colors kept intact.</li>
            <li>Frosted glass surfaces and rounded cards reflected in components.</li>
            <li>Desktop uses a persistent sidebar; mobile uses a bottom nav.</li>
          </ul>
        </SurfaceCard>

        <SurfaceCard title="Data Guardrails" subtitle="No fabricated campus facts">
          <ul className="space-y-2 text-sm text-slate-600">
            <li>Unknown floors remain unknown.</li>
            <li>Library model position stays pending verification.</li>
            <li>No classroom numbers, distances, or walking times are invented.</li>
          </ul>
        </SurfaceCard>
      </div>
    </div>
  )
}
