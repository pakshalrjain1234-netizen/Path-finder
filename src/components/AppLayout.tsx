import {
  Compass,
  LogIn,
  LogOut,
  MessageSquare,
  Search,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { defaultGpsService } from '../services/gpsService.ts'
import type { GpsServiceStatus } from '../types/gps.ts'
import { CurvedPastelSidebar } from './navigation/CurvedPastelSidebar'
import { MobileBottomNav } from './navigation/MobileBottomNav'
import { VisitorFeedbackModal } from './VisitorFeedbackModal'

export function AppLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { session, role, user, isAuthenticated, isInitializing, logout } = useAuth()
  const [gpsStatus, setGpsStatus] = useState<GpsServiceStatus>(defaultGpsService.getStatus())
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false)

  // Responsive sidebar collapse state with local storage persistence
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('pathfinder_sidebar_collapsed') === 'true'
    } catch {
      return false
    }
  })

  // Responsive tablet rail detection (768px <= width < 1024px)
  const [isTablet, setIsTablet] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return window.innerWidth >= 768 && window.innerWidth < 1024
  })

  useEffect(() => {
    const handleResize = () => {
      setIsTablet(window.innerWidth >= 768 && window.innerWidth < 1024)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const effectiveCollapsed = isSidebarCollapsed || isTablet

  const handleToggleCollapse = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem('pathfinder_sidebar_collapsed', String(next))
      } catch {
        // Ignore storage exceptions
      }
      return next
    })
  }

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

  // Prevent flash or redirect before auth initialization finishes
  if (isInitializing) {
    return (
      <div className="min-h-screen bg-[#E8DDF2] flex items-center justify-center p-6 text-center font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#352A47] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-[#51465F] font-semibold tracking-wide">
            Entering Campus Dreamscape...
          </span>
        </div>
      </div>
    )
  }

  // Opening without an authenticated session or explicit visitor choice displays Login / Role Selection
  if (!session) {
    const fromPath = location.pathname === '/' ? '/welcome' : location.pathname
    return <Navigate to="/login" state={{ from: fromPath }} replace />
  }

  return (
    <div
      className={`min-h-screen bg-[#E8DDF2] text-[#352A47] font-sans transition-all duration-300 md:grid ${
        effectiveCollapsed
          ? 'md:grid-cols-[80px_minmax(0,1fr)]'
          : 'md:grid-cols-[80px_minmax(0,1fr)] lg:grid-cols-[285px_minmax(0,1fr)] xl:grid-cols-[305px_minmax(0,1fr)]'
      }`}
    >
      {/* ============================================================== */}
      {/* MOBILE TOP HEADER: Dreamscape Frosted Lilac Glass              */}
      {/* ============================================================== */}
      <header className="fixed inset-x-0 top-0 z-50 md:hidden backdrop-blur-xl border-b border-white/80 bg-white/85 text-[#352A47] shadow-[0_2px_12px_rgba(139,92,246,0.08)] transition-all">
        <div className="flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-[#FAF5FF] via-[#EDE4F9] to-[#DFD0EF] text-[#6C5CE7] border border-white shadow-2xs">
              <Compass size={18} />
            </div>
            <div>
              <div className="text-sm font-bold tracking-tight text-[#2A1D3B] font-heading flex items-center gap-1.5">
                PATH FINDER
                <span className="rounded-full bg-[#EDE9FE] text-[#6D28D9] border border-[#DDD6FE] px-1.5 py-0.2 text-[9px] font-bold">
                  3D
                </span>
              </div>
              <div className="text-[10px] font-semibold text-[#7E708E]">
                {role === 'admin'
                  ? 'Administrator'
                  : role === 'student'
                    ? 'Student Portal'
                    : 'Visitor Mode'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <NavLink
              to="/search"
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/80 bg-white/70 text-[#51465F] hover:text-[#2A1D3B] hover:bg-white transition shadow-2xs"
              title="Search Campus Directory"
            >
              <Search size={14} className="text-[#352A47]" />
            </NavLink>

            <button
              type="button"
              onClick={() => setIsFeedbackOpen(true)}
              className="flex h-8 items-center gap-1 px-2.5 rounded-xl border border-[#FED7AA] bg-[#FFF7ED] hover:bg-[#FFEDD5] text-[#2A1D3B] text-[11px] font-semibold transition shadow-2xs"
              title="Give Visitor Feedback"
            >
              <MessageSquare size={13} className="text-[#EA580C]" />
              <span>Feedback</span>
            </button>

            {isAuthenticated ? (
              <button
                type="button"
                onClick={handleSignOut}
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/80 bg-white/70 text-[#51465F] hover:text-rose-700 hover:bg-rose-50 transition shadow-2xs"
                title="Sign Out"
              >
                <LogOut size={14} />
              </button>
            ) : (
              <NavLink
                to="/login"
                className="flex h-8 items-center gap-1 px-3 rounded-xl bg-[#352A47] hover:bg-[#433659] text-white text-[11px] font-semibold transition shadow-dream-soft"
              >
                <LogIn size={13} />
                <span>Sign In</span>
              </NavLink>
            )}
          </div>
        </div>
      </header>

      {/* ============================================================== */}
      {/* DESKTOP & TABLET: Universal Curved Pastel Navigation Sidebar   */}
      {/* ============================================================== */}
      <CurvedPastelSidebar
        role={role}
        user={user}
        isAuthenticated={isAuthenticated}
        gpsStatus={gpsStatus}
        gpsStatusText={gpsStatusText}
        isCollapsed={effectiveCollapsed}
        onToggleCollapse={handleToggleCollapse}
        onSignOut={handleSignOut}
        onOpenFeedback={() => setIsFeedbackOpen(true)}
      />

      {/* ============================================================== */}
      {/* MAIN CONTENT AREA                                              */}
      {/* ============================================================== */}
      <main className="min-w-0 pb-[calc(5rem+env(safe-area-inset-bottom,0px))] pt-14 md:col-start-2 md:pb-0 md:pt-0 bg-[#E8DDF2] text-[#352A47] transition-colors duration-300">
        <Outlet />
      </main>

      {/* ============================================================== */}
      {/* MOBILE FLOATING BOTTOM NAV: Dreamscape Pastel Pill             */}
      {/* ============================================================== */}
      <MobileBottomNav />

      {/* Accessible Visitor Feedback Modal */}
      <VisitorFeedbackModal isOpen={isFeedbackOpen} onClose={() => setIsFeedbackOpen(false)} />
    </div>
  )
}
