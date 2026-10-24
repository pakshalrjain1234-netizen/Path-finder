import {
  ClipboardList,
  Compass,
  GraduationCap,
  HelpCircle,
  Layers3,
  LogIn,
  LogOut,
  MapPin,
  MessageSquare,
  Route,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
  Wrench,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { defaultGpsService } from '../services/gpsService.ts'
import type { GpsServiceStatus } from '../types/gps.ts'
import { VisitorFeedbackModal } from './VisitorFeedbackModal'

export function AppLayout() {
  const navigate = useNavigate()
  const { role, user, isAuthenticated, logout } = useAuth()
  const [gpsStatus, setGpsStatus] = useState<GpsServiceStatus>(defaultGpsService.getStatus())
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false)

  const handleSignOut = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

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

  // Dynamic role-filtered navigation items aligned to Phase 8A
  const navigationItems = useMemo(() => {
    const baseItems = [
      { to: '/welcome', label: 'Welcome', icon: Compass },
      { to: '/explore', label: '3D Explorer', icon: Layers3 },
      { to: '/search', label: 'Search', icon: Search },
      { to: '/navigation', label: 'Navigation', icon: Route },
      { to: '/explore?tour=true', label: 'Cinematic Tour', icon: Sparkles },
    ]

    if (role === 'admin') {
      return [
        ...baseItems,
        { to: '/admin/issues', label: 'Campus Issue Command Center', icon: Wrench },
        { to: '/admin/feedback', label: 'Visitor Feedback Dashboard', icon: MessageSquare },
        { to: '/dev-gps-calibration', label: 'Campus Location Setup', icon: MapPin },
        { to: '/saved', label: 'Saved', icon: Star },
        { to: '/help', label: 'Help', icon: HelpCircle },
      ]
    }

    if (role === 'student') {
      return [
        ...baseItems,
        { to: '/issues', label: 'Campus Issue Passport', icon: Wrench },
        { to: '/my-reports', label: 'My Reports', icon: ClipboardList },
        { to: '/saved', label: 'Saved', icon: Star },
        { to: '/help', label: 'Help', icon: HelpCircle },
      ]
    }

    // Visitor role: STRICT ISOLATION — zero issue routes, markers, or private reports
    return [
      ...baseItems,
      { to: '/saved', label: 'Saved', icon: Star },
      { to: '/help', label: 'Help', icon: HelpCircle },
    ]
  }, [role])

  return (
    <div className="min-h-screen bg-[#101827] text-[#F1F5F9] md:grid md:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[290px_minmax(0,1fr)]">
      {/* Mobile Top Header */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-[#293A50] bg-[#162235]/95 backdrop-blur-xl md:hidden shadow-md">
        <div className="flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#2563EB] text-white shadow-sm shadow-blue-600/20 border border-[#60A5FA]/30">
              <Compass size={18} />
            </div>
            <div>
              <div className="text-sm font-extrabold tracking-tight text-[#F1F5F9] flex items-center gap-1.5">
                PATH FINDER
                <span className="rounded-full bg-blue-500/10 px-1.5 py-0.2 text-[9px] font-bold text-[#60A5FA] border border-blue-500/20">
                  3D
                </span>
              </div>
              <div className="text-[10px] font-medium text-[#94A3B8]">
                {role === 'admin' ? 'Administrator' : role === 'student' ? 'Student Portal' : 'Visitor Mode'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsFeedbackOpen(true)}
              className="flex h-8 items-center gap-1 px-2.5 rounded-lg border border-[#293A50] bg-[#192638] hover:bg-[#24364D] text-[#94A3B8] hover:text-[#F1F5F9] text-[11px] font-semibold transition"
              title="Give Visitor Feedback"
            >
              <MessageSquare size={13} className="text-[#60A5FA]" />
              <span>Feedback</span>
            </button>

            {isAuthenticated ? (
              <button
                type="button"
                onClick={handleSignOut}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#293A50] bg-[#192638] text-[#94A3B8] hover:text-red-400 hover:border-red-500/30 transition"
                title="Sign Out"
              >
                <LogOut size={15} />
              </button>
            ) : (
              <NavLink
                to="/login"
                className="flex h-8 items-center gap-1 px-2.5 rounded-lg bg-[#2563EB] hover:bg-blue-600 text-white text-[11px] font-bold transition shadow-sm"
              >
                <LogIn size={13} />
                <span>Sign In</span>
              </NavLink>
            )}
          </div>
        </div>
      </header>

      {/* Desktop Persistent Sidebar */}
      <aside className="hidden border-r border-[#293A50] bg-[#162235] md:fixed md:inset-y-0 md:left-0 md:flex md:w-[280px] md:flex-col md:overflow-hidden xl:w-[290px] shadow-lg">
        {/* Brand Header */}
        <div className="border-b border-[#293A50] bg-[#162235] p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#2563EB] text-white shadow-md shadow-blue-600/20 border border-[#60A5FA]/30">
              <Compass size={22} />
            </div>
            <div className="min-w-0">
              <div className="text-base font-extrabold tracking-tight text-white flex items-center gap-1.5">
                PATH FINDER
                <span className="rounded-full bg-blue-500/10 px-1.5 py-0.5 text-[9px] font-bold text-[#60A5FA] border border-blue-500/20">
                  3D
                </span>
              </div>
              <div className="text-[11px] font-medium text-[#94A3B8] truncate">
                MNM Jain Engineering College
              </div>
            </div>
          </div>

          {/* Active Role Status Badge */}
          <div className="mt-4 flex items-center justify-between rounded-xl border border-[#293A50] bg-[#192638] px-3 py-2 text-xs shadow-sm">
            <div className="flex items-center gap-2 font-medium text-slate-200 min-w-0">
              {role === 'admin' ? (
                <ShieldCheck size={14} className="text-[#60A5FA] shrink-0" />
              ) : role === 'student' ? (
                <GraduationCap size={14} className="text-indigo-400 shrink-0" />
              ) : (
                <Users size={14} className="text-[#34D399] shrink-0" />
              )}
              <span className="truncate text-[11px] font-semibold text-[#F1F5F9]">
                {role === 'admin'
                  ? 'Administrator'
                  : role === 'student'
                    ? user.name.split(' ')[0]
                    : 'Guest Visitor'}
              </span>
            </div>
            <span
              className={`rounded-md px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase border shrink-0 ${
                role === 'admin'
                  ? 'bg-blue-500/10 text-[#60A5FA] border-blue-500/20'
                  : role === 'student'
                    ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20'
                    : 'bg-emerald-500/10 text-[#34D399] border-emerald-500/20'
              }`}
            >
              {role}
            </span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto p-3.5 space-y-1">
          <div className="px-2 pb-1.5 text-[10px] font-bold tracking-wider uppercase text-[#94A3B8] flex items-center justify-between">
            <span>Navigation Modules</span>
            {role !== 'visitor' && (
              <span className="text-[9px] text-[#60A5FA] font-semibold">Role: {role}</span>
            )}
          </div>
          {navigationItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-[#2563EB] text-white shadow-md shadow-blue-500/20'
                    : 'text-[#94A3B8] hover:bg-[#192638] hover:text-[#F1F5F9]'
                }`
              }
            >
              <item.icon size={16} />
              <span className="truncate">{item.label}</span>
            </NavLink>
          ))}

          {/* Quick Feedback Card in Sidebar */}
          <div className="pt-3">
            <button
              type="button"
              onClick={() => setIsFeedbackOpen(true)}
              className="w-full flex items-center justify-between rounded-xl border border-[#293A50] bg-[#192638] hover:bg-[#24364D] px-3 py-2 text-xs text-[#94A3B8] transition group cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <MessageSquare size={14} className="text-[#60A5FA]" />
                <span className="font-medium text-[#F1F5F9]">Visitor Feedback</span>
              </div>
              <span className="text-[10px] font-semibold text-[#60A5FA] group-hover:underline">
                Give Rating
              </span>
            </button>
          </div>

          <div className="pt-3 px-2 pb-1.5 text-[10px] font-bold tracking-wider uppercase text-[#94A3B8]">
            Platform Info
          </div>
          <div className="rounded-2xl border border-[#293A50] bg-[#192638] p-3 text-xs">
            <div className="flex items-center gap-2 text-[11px] font-bold text-white">
              <Layers3 size={14} className="text-[#60A5FA]" />
              Stage E3 Campus Model
            </div>
            <p className="mt-1 text-[10px] leading-relaxed text-[#94A3B8]">
              Interactive 3D geometry, turn-by-turn guidance, provisional POIs, and role-based maintenance dispatch.
            </p>
          </div>
        </nav>

        {/* Footer: User Account & GPS Status */}
        <div className="border-t border-[#293A50] bg-[#162235] p-3 space-y-2">
          {isAuthenticated ? (
            <div className="flex items-center justify-between text-xs">
              <div className="min-w-0 pr-2">
                <div className="font-semibold text-white truncate text-[11px]">{user.name}</div>
                <div className="text-[10px] text-[#94A3B8] truncate">{user.email}</div>
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                className="flex items-center gap-1 rounded-lg border border-[#293A50] bg-[#192638] hover:bg-rose-950/40 hover:border-rose-500/30 hover:text-rose-300 px-2 py-1 text-[10px] font-semibold text-[#94A3B8] transition shrink-0 cursor-pointer"
                title="Logout from session"
              >
                <LogOut size={12} />
                <span>Logout</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="text-[11px] text-[#94A3B8]">Visitor session</div>
              <NavLink
                to="/login"
                className="flex items-center gap-1 rounded-lg bg-[#2563EB] hover:bg-blue-600 px-2.5 py-1 text-[11px] font-bold text-white transition shadow-sm"
              >
                <LogIn size={12} />
                <span>Sign In / Role</span>
              </NavLink>
            </div>
          )}

          <div className="flex items-center justify-between text-[10px] pt-1.5 border-t border-[#293A50]">
            <span className="font-medium text-[#94A3B8]">Main Campus</span>
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
              <span id="app-sidebar-gps-status" className="text-[#94A3B8] truncate max-w-[120px] font-medium">
                {gpsStatusText}
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="min-w-0 pb-[calc(5rem+env(safe-area-inset-bottom,0px))] pt-14 md:col-start-2 md:pb-0 md:pt-0 bg-[#101827]">
        <Outlet />
      </main>

      {/* Mobile Floating Bottom Navigation */}
      <nav className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom,0px))] z-40 flex items-center justify-around rounded-2xl border border-[#293A50] bg-[#162235]/95 p-1.5 shadow-2xl shadow-black/40 backdrop-blur-xl md:hidden">
        {navigationItems.slice(0, 5).map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex min-w-0 flex-1 flex-col items-center justify-center rounded-xl py-1 text-[10px] font-semibold transition-all ${
                isActive
                  ? 'bg-[#24364D] text-[#60A5FA]'
                  : 'text-[#94A3B8] hover:text-white'
              }`
            }
          >
            <item.icon size={17} />
            <span className="mt-0.5 truncate tracking-tight text-[10px]">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Accessible Visitor Feedback Modal */}
      <VisitorFeedbackModal isOpen={isFeedbackOpen} onClose={() => setIsFeedbackOpen(false)} />
    </div>
  )
}
