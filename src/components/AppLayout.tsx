import { Compass, HelpCircle, Layers3, Menu, Route, Search, Star } from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'

const navigationItems = [
  { to: '/welcome', label: 'Welcome', icon: Compass },
  { to: '/explore', label: '3D Explorer', icon: Layers3 },
  { to: '/search', label: 'Search', icon: Search },
  { to: '/navigation', label: 'Route', icon: Route },
  { to: '/saved', label: 'Saved', icon: Star },
  { to: '/help', label: 'Help', icon: HelpCircle },
]

export function AppLayout() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#1E293B] md:grid md:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)]">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-slate-200/70 bg-white/90 backdrop-blur-xl md:hidden">
        <div className="flex h-16 items-center justify-between px-4">
          <button type="button" className="rounded-full p-2 text-slate-600">
            <Menu size={20} />
          </button>
          <div className="text-center">
            <div className="text-sm font-semibold tracking-tight">PATH FINDER</div>
            <div className="text-[11px] text-slate-500">MNMJEC Campus • PWA Ready</div>
          </div>
          <button type="button" className="rounded-full p-2 text-slate-600">
            <HelpCircle size={20} />
          </button>
        </div>
      </header>

      <aside className="hidden border-r border-slate-200 bg-white md:fixed md:inset-y-0 md:left-0 md:flex md:w-[280px] md:flex-col md:overflow-hidden xl:w-[320px]">
        <div className="border-b border-slate-200 bg-white/90 px-5 py-4 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#2A9D8F] text-white shadow-md shadow-emerald-900/10">
              <Compass size={20} />
            </div>
            <div className="min-w-0">
              <div className="text-base font-semibold tracking-tight">PATH FINDER</div>
              <div className="text-xs text-slate-500">Misrimal Navajee Munoth Jain Engineering College</div>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
            <span className="inline-flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#2A9D8F]" />
              Live Campus Map
            </span>
            <span className="rounded-full bg-[#2A9D8F]/10 px-2 py-0.5 text-[#2A9D8F]">PWA Ready</span>
          </div>
        </div>

        <nav className="grid grid-cols-3 gap-1 border-b border-slate-200 bg-slate-100 p-2">
          {navigationItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-xs font-medium transition ${
                  isActive ? 'bg-[#2A9D8F] text-white shadow-sm' : 'bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`
              }
            >
              <item.icon size={14} />
              <span className="truncate">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-3 rounded-2xl bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <Layers3 size={14} className="text-[#2A9D8F]" />
              Active Module View
            </div>
            <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
              <div className="text-sm font-semibold">Interactive Workspace</div>
              <p className="mt-1 text-sm text-slate-500">
                Switch between the 3D campus explorer, route guidance, building details, saved locations, and offline help.
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200 bg-white px-4 py-3">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-slate-800">Main Campus Gate 1</span>
            <span className="text-slate-500">GPS Locked</span>
          </div>
        </div>
      </aside>

      <main className="min-w-0 pb-24 pt-16 md:col-start-2 md:pb-0 md:pt-0">
        <Outlet />
      </main>

      <nav className="fixed inset-x-4 bottom-4 z-40 flex justify-between rounded-2xl bg-white p-2 shadow-lg md:hidden">
        {navigationItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex min-w-0 flex-1 flex-col items-center rounded-xl px-1 py-2 text-[11px] ${
                isActive ? 'bg-[#2A9D8F] text-white' : 'text-slate-600'
              }`
            }
          >
            <item.icon size={14} />
            <span className="mt-1 truncate">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
