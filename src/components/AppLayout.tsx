import { Compass, HelpCircle, Layers3, Route, Search, Star } from 'lucide-react'
import { useEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { defaultGpsService } from '../services/gpsService.ts'
import type { GpsServiceStatus } from '../types/gps.ts'

const navigationItems = [
  { to: '/welcome', label: 'Welcome', icon: Compass },
  { to: '/explore', label: '3D Explorer', icon: Layers3 },
  { to: '/search', label: 'Search', icon: Search },
  { to: '/navigation', label: 'Route', icon: Route },
  { to: '/saved', label: 'Saved', icon: Star },
  { to: '/help', label: 'Help', icon: HelpCircle },
]

export function AppLayout() {
  const [gpsStatus, setGpsStatus] = useState<GpsServiceStatus>(defaultGpsService.getStatus())

  useEffect(() => {
    const unsubscribe = defaultGpsService.addListener({
      onPosition: () => {
        setGpsStatus('active')
      },
      onError: (status) => {
        setGpsStatus(status)
      },
    })
    return () => unsubscribe()
  }, [])

  const gpsStatusText = (() => {
    switch (gpsStatus) {
      case 'active':
        return 'GPS active'
      case 'requesting':
        return 'Acquiring GPS fix...'
      case 'permission_denied':
        return 'Location permission denied'
      case 'position_unavailable':
        return 'GPS signal unavailable'
      case 'timeout':
        return 'GPS timed out'
      case 'unsupported':
        return 'Geolocation unsupported'
      case 'idle':
      default:
        return 'Location permission not requested'
    }
  })()

  return (
    <div className="min-h-screen bg-[#061018] text-[#F8FAFC] md:grid md:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[300px_minmax(0,1fr)]">
      {/* Mobile Top Header */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[#0B1220]/90 backdrop-blur-xl md:hidden">
        <div className="flex h-15 items-center justify-between px-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 text-white shadow-sm shadow-blue-600/30">
              <Compass size={18} />
            </div>
            <div>
              <div className="text-sm font-extrabold tracking-tight text-white flex items-center gap-1.5">
                PATH FINDER
                <span className="rounded-full bg-blue-900/60 px-1.5 py-0.2 text-[9px] font-bold text-blue-300 border border-blue-500/30">3D</span>
              </div>
              <div className="text-[10px] font-medium text-slate-400">MNMJEC Chennai</div>
            </div>
          </div>
          <NavLink
            to="/help"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 hover:text-white hover:bg-white/10 transition"
            aria-label="Help & Information"
          >
            <HelpCircle size={18} />
          </NavLink>
        </div>
      </header>

      {/* Desktop Persistent Sidebar */}
      <aside className="hidden border-r border-white/10 bg-[#0B1220]/95 backdrop-blur-2xl md:fixed md:inset-y-0 md:left-0 md:flex md:w-[280px] md:flex-col md:overflow-hidden xl:w-[300px]">
        {/* Brand Header */}
        <div className="border-b border-white/10 bg-gradient-to-b from-[#0B1220] to-[#0D1728] p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 text-white shadow-lg shadow-blue-600/30">
              <Compass size={22} />
            </div>
            <div className="min-w-0">
              <div className="text-base font-extrabold tracking-tight text-white flex items-center gap-1.5">
                PATH FINDER
                <span className="rounded-full bg-blue-900/60 px-1.5 py-0.5 text-[9px] font-bold text-blue-300 border border-blue-500/30">3D</span>
              </div>
              <div className="text-[11px] font-medium text-slate-400 truncate">
                MNM Jain Engineering College
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between rounded-xl border border-white/10 bg-[#162033]/80 px-3 py-2 text-xs shadow-inner">
            <span className="inline-flex items-center gap-2 font-medium text-slate-300">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
              </span>
              Campus Interactive
            </span>
            <span className="rounded-md bg-blue-950/80 px-2 py-0.5 text-[10px] font-bold tracking-wider text-cyan-300 uppercase border border-cyan-500/30">
              Chennai
            </span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto p-3.5 space-y-1">
          <div className="px-2 pb-1.5 text-[10px] font-bold tracking-wider uppercase text-slate-500">
            Navigation Modules
          </div>
          {navigationItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white shadow-lg shadow-blue-500/25 border border-blue-400/30'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              <item.icon size={16} />
              <span className="truncate">{item.label}</span>
            </NavLink>
          ))}

          <div className="pt-4 px-2 pb-1.5 text-[10px] font-bold tracking-wider uppercase text-slate-500">
            Platform Overview
          </div>
          <div className="rounded-2xl border border-white/10 bg-[#111827]/70 p-3.5 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
              <Layers3 size={15} className="text-cyan-400" />
              Walkway Precision
            </div>
            <p className="mt-1.5 text-[11px] leading-relaxed text-slate-400">
              Explore 3D buildings, pedestrian corridors, turn-by-turn guidance, and real-time rerouting on campus.
            </p>
          </div>
        </nav>

        {/* Footer Status */}
        <div className="border-t border-white/10 bg-[#061018]/90 p-3.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-300">Gate 1 • Main Campus</span>
            <div className="flex items-center gap-1.5">
              <span
                className={`h-2 w-2 rounded-full ${
                  gpsStatus === 'active'
                    ? 'bg-emerald-400 animate-pulse'
                    : gpsStatus === 'requesting'
                      ? 'bg-amber-400 animate-pulse'
                      : gpsStatus === 'permission_denied'
                        ? 'bg-red-400'
                        : 'bg-slate-500'
                }`}
              />
              <span id="app-sidebar-gps-status" className="text-slate-400 text-[11px] font-medium truncate max-w-[120px]">
                {gpsStatusText}
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="min-w-0 pb-24 pt-16 md:col-start-2 md:pb-0 md:pt-0 bg-[#061018]">
        <Outlet />
      </main>

      {/* Mobile Floating Bottom Navigation */}
      <nav className="fixed inset-x-3 bottom-3 z-40 flex items-center justify-around rounded-2xl border border-white/10 bg-[#0B1220]/95 p-1.5 shadow-2xl shadow-black/60 backdrop-blur-2xl md:hidden">
        {navigationItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex min-w-0 flex-1 flex-col items-center justify-center rounded-xl py-1.5 text-[10px] font-semibold transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/30 border border-blue-400/30'
                  : 'text-slate-400 hover:text-white'
              }`
            }
          >
            <item.icon size={16} />
            <span className="mt-0.5 truncate tracking-tight">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
