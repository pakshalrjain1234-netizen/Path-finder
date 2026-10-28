import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Compass,
  MessageSquare,
  Sparkles,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import type { User, UserRole } from '../../types/auth'
import type { GpsServiceStatus } from '../../types/gps'
import { getRoleNavigationItems, type NavItemConfig } from './navItems'
import { SidebarProfileCard } from './SidebarProfileCard'

interface CurvedPastelSidebarProps {
  role: UserRole
  user: User
  isAuthenticated: boolean
  gpsStatus: GpsServiceStatus
  gpsStatusText: string
  isCollapsed: boolean
  onToggleCollapse: () => void
  onSignOut: () => void
  onOpenFeedback: () => void
}

export function CurvedPastelSidebar({
  role,
  user,
  isAuthenticated,
  gpsStatus,
  gpsStatusText,
  isCollapsed,
  onToggleCollapse,
  onSignOut,
  onOpenFeedback,
}: CurvedPastelSidebarProps) {
  const location = useLocation()
  const navigationItems = getRoleNavigationItems(role)

  // Determine if a specific nav item is active, with query-param awareness for Cinematic Tour
  const isItemActive = useCallback(
    (item: NavItemConfig) => {
      if (item.to.includes('tour=true')) {
        return location.pathname === '/explore' && location.search.includes('tour=true')
      }
      if (item.to === '/explore') {
        return location.pathname === '/explore' && !location.search.includes('tour=true')
      }
      return location.pathname === item.to
    },
    [location.pathname, location.search],
  )

  // Find index of currently active navigation item
  const activeIndex = useMemo(() => {
    const idx = navigationItems.findIndex(isItemActive)
    return idx >= 0 ? idx : 0
  }, [navigationItems, isItemActive])

  // Rotational state: current rotational center offset along the navigation arc
  const [rotationOffset, setRotationOffset] = useState<number>(activeIndex)
  const [isDragging, setIsDragging] = useState<boolean>(false)
  const [isArcMode, setIsArcMode] = useState<boolean>(true)
  const dragStartYRef = useRef<number>(0)
  const dragStartOffsetRef = useRef<number>(0)
  const navContainerRef = useRef<HTMLElement>(null)
  const isPointerDownRef = useRef<boolean>(false)
  const hasDraggedRef = useRef<boolean>(false)
  const pointerIdRef = useRef<number | null>(null)
  const activeTargetRef = useRef<HTMLElement | null>(null)

  // Reduced motion preference
  const prefersReducedMotion = useMemo(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false
  }, [])

  // Auto-align arc to the active item whenever the route or active item changes
  useEffect(() => {
    setRotationOffset(activeIndex)
  }, [activeIndex])

  // Drag interaction handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isCollapsed) return
    if (e.button !== 0 && e.pointerType === 'mouse') return
    isPointerDownRef.current = true
    hasDraggedRef.current = false
    dragStartYRef.current = e.clientY
    dragStartOffsetRef.current = rotationOffset
    pointerIdRef.current = e.pointerId
    activeTargetRef.current = e.currentTarget as HTMLElement
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isPointerDownRef.current) return
    const deltaY = e.clientY - dragStartYRef.current
    // Activate drag only after exceeding threshold (6px) to allow standard clicks
    if (!hasDraggedRef.current && Math.abs(deltaY) > 6) {
      hasDraggedRef.current = true
      setIsDragging(true)
      if (activeTargetRef.current && pointerIdRef.current !== null) {
        try {
          activeTargetRef.current.setPointerCapture(pointerIdRef.current)
        } catch {
          // safe fallback
        }
      }
    }
    if (hasDraggedRef.current) {
      // 52px drag corresponds to 1 item step on the arc
      const rawOffset = dragStartOffsetRef.current - deltaY / 52
      const clamped = Math.max(0, Math.min(navigationItems.length - 1, rawOffset))
      setRotationOffset(clamped)
    }
  }

  const handlePointerUp = (_e: React.PointerEvent<HTMLDivElement>) => {
    if (!isPointerDownRef.current) return
    isPointerDownRef.current = false

    if (hasDraggedRef.current) {
      setIsDragging(false)
      if (activeTargetRef.current && pointerIdRef.current !== null) {
        try {
          activeTargetRef.current.releasePointerCapture(pointerIdRef.current)
        } catch {
          // safe fallback
        }
      }
      // Snap to nearest integer item when gesture ends
      setRotationOffset((curr) => Math.max(0, Math.min(navigationItems.length - 1, Math.round(curr))))
      // Keep hasDraggedRef true momentarily so click events from drag release are suppressed
      setTimeout(() => {
        hasDraggedRef.current = false
      }, 50)
    }
    pointerIdRef.current = null
    activeTargetRef.current = null
  }

  const handleContainerClickCapture = (e: React.MouseEvent<HTMLDivElement>) => {
    if (hasDraggedRef.current) {
      e.preventDefault()
      e.stopPropagation()
    }
  }

  // Mouse wheel rotation
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (isCollapsed) return
    e.preventDefault()
    const step = e.deltaY > 0 ? 1 : -1
    setRotationOffset((curr) => {
      const target = Math.round(curr) + step
      return Math.max(0, Math.min(navigationItems.length - 1, target))
    })
  }

  // Keyboard navigation for rotation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      rotateNext()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      rotatePrev()
    } else if (e.key === 'PageDown') {
      e.preventDefault()
      setRotationOffset((c) => Math.min(navigationItems.length - 1, Math.round(c) + 3))
    } else if (e.key === 'PageUp') {
      e.preventDefault()
      setRotationOffset((c) => Math.max(0, Math.round(c) - 3))
    } else if (e.key === 'Home') {
      e.preventDefault()
      setRotationOffset(0)
    } else if (e.key === 'End') {
      e.preventDefault()
      setRotationOffset(navigationItems.length - 1)
    }
  }

  const rotatePrev = () => {
    setRotationOffset((c) => Math.max(0, Math.round(c) - 1))
  }

  const rotateNext = () => {
    setRotationOffset((c) => Math.min(navigationItems.length - 1, Math.round(c) + 1))
  }

  return (
    <aside
      aria-label="Universal Curved Navigation"
      className={`hidden md:fixed md:inset-y-0 md:left-0 md:flex md:flex-col z-30 transition-all duration-300 ease-out select-none ${
        isCollapsed ? 'w-20' : 'w-[285px] xl:w-[305px]'
      }`}
    >
      {/* ============================================================== */}
      {/* 1. SCULPTED ORGANIC CURVED BACKGROUND & LUMINOUS GLASS GLOW    */}
      {/* ============================================================== */}
      {!isCollapsed ? (
        <div className="absolute inset-0 pointer-events-none -z-10 overflow-visible">
          {/* Frosted Glass SVG with Refined Organic Curve Silhouette */}
          <svg
            className="w-full h-full overflow-visible drop-shadow-[0_12px_32px_rgba(139,92,246,0.18)]"
            preserveAspectRatio="none"
            viewBox="0 0 300 1000"
            aria-hidden="true"
          >
            <defs>
              {/* Luminous Dreamscape Glass Gradient */}
              <linearGradient id="sidebarGlassGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.94" />
                <stop offset="25%" stopColor="#FAF4FD" stopOpacity="0.88" />
                <stop offset="65%" stopColor="#F3E7FB" stopOpacity="0.84" />
                <stop offset="100%" stopColor="#ECE0F7" stopOpacity="0.92" />
              </linearGradient>

              {/* Pearl Highlight Gradient */}
              <linearGradient id="pearlShine" x1="20%" y1="20%" x2="80%" y2="80%">
                <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
                <stop offset="50%" stopColor="#EDE2F8" stopOpacity="0.85" />
                <stop offset="100%" stopColor="#D8C2F0" stopOpacity="0.75" />
              </linearGradient>

              {/* Blush Pearl Gradient */}
              <linearGradient id="blushPearlShine" x1="20%" y1="20%" x2="80%" y2="80%">
                <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
                <stop offset="50%" stopColor="#FEE4E2" stopOpacity="0.85" />
                <stop offset="100%" stopColor="#F8C0BC" stopOpacity="0.75" />
              </linearGradient>

              {/* Arc Central Axis Guide Gradient */}
              <linearGradient id="arcAxisGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#7C5CBF" stopOpacity="0.05" />
                <stop offset="20%" stopColor="#7C5CBF" stopOpacity="0.35" />
                <stop offset="50%" stopColor="#38BDF8" stopOpacity="0.55" />
                <stop offset="80%" stopColor="#7C5CBF" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#7C5CBF" stopOpacity="0.05" />
              </linearGradient>
            </defs>

            {/* Sculpted Flowing Curved Sidebar Body */}
            <path
              d="M 0,0 L 255,0 C 290,120 315,320 305,520 C 292,720 272,870 255,1000 L 0,1000 Z"
              fill="url(#sidebarGlassGrad)"
              stroke="rgba(255, 255, 255, 0.95)"
              strokeWidth="1.5"
            />

            {/* Inner Refraction Highlight Contour */}
            <path
              d="M 252,2 C 286,122 311,320 301,520 C 288,720 268,870 252,998"
              fill="none"
              stroke="rgba(255, 255, 255, 0.7)"
              strokeWidth="0.8"
            />

            {/* Subtle Ethereal Floating Pearls / Bubbles Along Outer Curve */}
            <circle cx="282" cy="115" r="7" fill="url(#pearlShine)" filter="drop-shadow(0 2px 6px rgba(124,92,191,0.25))" />
            <circle cx="286" cy="112" r="2.2" fill="#FFFFFF" opacity="0.9" />

            <circle cx="310" cy="330" r="10" fill="url(#pearlShine)" filter="drop-shadow(0 3px 8px rgba(124,92,191,0.22))" />
            <circle cx="314" cy="326" r="3.2" fill="#FFFFFF" opacity="0.9" />

            <circle cx="304" cy="540" r="6.5" fill="url(#blushPearlShine)" filter="drop-shadow(0 2px 6px rgba(225,29,72,0.2))" />
            <circle cx="306" cy="538" r="2" fill="#FFFFFF" opacity="0.9" />

            <circle cx="280" cy="740" r="8.5" fill="url(#pearlShine)" filter="drop-shadow(0 2px 6px rgba(124,92,191,0.2))" />
            <circle cx="283" cy="737" r="2.5" fill="#FFFFFF" opacity="0.9" />

            {/* Soft Ambient Lilac Leaf / Petal Hint at Top Left */}
            <path
              d="M 6,24 C 20,18 32,28 30,42 C 16,40 4,34 6,24 Z"
              fill="rgba(224, 206, 246, 0.45)"
              stroke="rgba(255, 255, 255, 0.6)"
              strokeWidth="0.75"
            />
            {/* Soft Ambient Lilac Leaf Hint at Bottom Left */}
            <path
              d="M 10,960 C 26,950 40,962 38,980 C 20,980 8,972 10,960 Z"
              fill="rgba(224, 206, 246, 0.4)"
              stroke="rgba(255, 255, 255, 0.5)"
              strokeWidth="0.75"
            />
          </svg>
        </div>
      ) : (
        /* Compact Tablet Rail Backdrop */
        <div className="absolute inset-0 pointer-events-none -z-10 rounded-r-3xl bg-white/85 backdrop-blur-2xl border-r border-white/90 shadow-[0_8px_32px_rgba(139,92,246,0.15)]" />
      )}

      {/* ============================================================== */}
      {/* 2. BRAND HEADER WITH STYLIZED EMBLEM & COLLAPSE CONTROLS      */}
      {/* ============================================================== */}
      <div
        className={`pt-5 pb-2 transition-all ${
          isCollapsed ? 'px-2 flex flex-col items-center' : 'px-5'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            {/* Stylized Dreamscape Squircle Brand Emblem */}
            <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#FAF5FF] via-[#EDE4F9] to-[#DFD0EF] text-[#6C5CE7] border border-white shadow-[0_4px_14px_rgba(108,92,231,0.2)]">
              <Compass size={22} className="text-[#6C5CE7]" />
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-gradient-to-br from-[#7C5CBF] to-[#5B3E9E] text-[8px] font-black text-white shadow-2xs">
                3D
              </span>
            </div>

            {!isCollapsed && (
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-heading font-black text-base text-[#2A1D3B] tracking-tight">
                    PATH FINDER
                  </span>
                  {/* Subtle Pastel Wavy Flourish */}
                  <svg className="w-5 h-3 text-[#B39FCB]" viewBox="0 0 24 12" fill="none">
                    <path
                      d="M 2,6 Q 6,0 12,6 T 22,6"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] font-semibold tracking-wider text-[#7E708E]">
                  <span>MNMJEC</span>
                  <span className="h-1 w-1 rounded-full bg-[#B39FCB]" />
                  <span className="uppercase text-[9px] font-bold text-[#6C5CE7]">
                    {role}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Desktop Collapse / Expand Toggle Button */}
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={isCollapsed ? 'Expand sidebar navigation' : 'Collapse sidebar navigation'}
            title={isCollapsed ? 'Expand navigation' : 'Collapse navigation'}
            className="flex h-7 w-7 items-center justify-center rounded-xl bg-white/70 hover:bg-white text-[#6E6280] hover:text-[#2A1D3B] transition border border-white/80 shadow-2xs cursor-pointer"
          >
            {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 3. ROTATABLE CIRCULAR NAVIGATION ARC (ROLE FILTERED)           */}
      {/* ============================================================== */}
      {!isCollapsed && (
        <div className="px-5 pt-1 pb-1 flex items-center justify-between text-[9px] font-extrabold uppercase tracking-widest text-[#8C809E]">
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[#7C5CBF] animate-pulse" />
            <span>Circular Arc Navigation</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setIsArcMode((m) => !m)}
              className="text-[9px] font-bold text-[#6C5CE7] hover:underline cursor-pointer"
              title="Toggle between Circular Arc layout and Standard List layout"
            >
              {isArcMode ? 'Arc View' : 'List View'}
            </button>
            <span className="text-[#B39FCB]">•</span>
            <span className="font-bold text-[#6C5CE7]">{navigationItems.length}</span>
          </div>
        </div>
      )}

      {/* Navigation Arc Container with Subtle Central Axis and Controls */}
      <nav
        ref={navContainerRef}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        aria-label="Main Campus Navigation"
        className={`relative flex-1 min-h-0 flex flex-col focus:outline-none ${
          isCollapsed ? 'px-2 py-2 overflow-y-auto' : 'px-3 xl:px-4'
        }`}
      >
        {isCollapsed ? (
          /* Compact Tablet Rail Navigation (Icons Centered) */
          <div className="space-y-2 py-1">
            {navigationItems.map((item) => {
              const active = isItemActive(item)
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  title={`${item.label} — ${item.subtitle}`}
                  aria-label={item.label}
                  className={`relative flex h-11 w-11 items-center justify-center mx-auto rounded-2xl transition-all duration-200 ${
                    active
                      ? 'bg-gradient-to-br from-[#7C5CBF] to-[#5B3E9E] text-white shadow-[0_4px_16px_rgba(124,92,191,0.35)]'
                      : 'bg-white/60 hover:bg-white text-[#51465F] hover:text-[#2A1D3B] border border-white/80 shadow-2xs'
                  }`}
                >
                  <item.icon size={19} className={active ? 'text-white' : item.iconColor} />
                  {active && (
                    <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-[#E09067] border-2 border-white animate-pulse" />
                  )}
                </NavLink>
              )
            })}
          </div>
        ) : (
          /* Full Desktop Rotatable Circular Navigation Arc */
          <div className="relative flex-1 flex flex-col min-h-0">
            {/* Top Arc Rotation Control Button */}
            <div className="flex items-center justify-center pb-1">
              <button
                type="button"
                onClick={rotatePrev}
                disabled={rotationOffset <= 0.05}
                aria-label="Previous navigation modules (rotate arc up)"
                title="Rotate arc up"
                className={`flex items-center gap-1 px-3 py-0.5 rounded-full text-[10px] font-bold border transition-all cursor-pointer ${
                  rotationOffset <= 0.05
                    ? 'opacity-30 border-transparent text-slate-400 cursor-not-allowed'
                    : 'bg-white/75 hover:bg-white text-[#6C5CE7] border-white/90 shadow-2xs hover:scale-105'
                }`}
              >
                <ChevronUp size={13} />
                <span>Prev</span>
              </button>
            </div>

            {/* Central Circular Arc Surface with Pointer Drag & Wheel Listener */}
            <div
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              onClickCapture={handleContainerClickCapture}
              onWheel={handleWheel}
              className={`relative flex-1 min-h-0 overflow-hidden cursor-grab active:cursor-grabbing touch-none select-none rounded-2xl ${
                isDragging ? 'cursor-grabbing' : ''
              }`}
            >
              {/* Subtle Central Visual Axis (Luminous SVG Arc Line & Guide Ticks) */}
              <div className="absolute left-3 inset-y-0 w-8 pointer-events-none -z-0">
                <svg
                  className="w-full h-full overflow-visible"
                  preserveAspectRatio="none"
                  viewBox="0 0 32 400"
                  aria-hidden="true"
                >
                  {/* Vertical Circular Arc Guide Line curving gently outward */}
                  <path
                    d="M 6,10 Q 24,200 6,390"
                    fill="none"
                    stroke="url(#arcAxisGrad)"
                    strokeWidth="1.5"
                    strokeDasharray="2 3"
                  />
                  {/* Orbital Pivot Node tracking the current rotation offset */}
                  <circle
                    cx={6 + 18 * (1 - Math.pow(((rotationOffset / (navigationItems.length - 1 || 1)) * 2 - 1), 2))}
                    cy={20 + (360 * rotationOffset) / (navigationItems.length - 1 || 1)}
                    r="4"
                    fill="#7C5CBF"
                    opacity="0.8"
                    filter="drop-shadow(0 0 4px #A78BFA)"
                  />
                  <circle
                    cx={6 + 18 * (1 - Math.pow(((rotationOffset / (navigationItems.length - 1 || 1)) * 2 - 1), 2))}
                    cy={20 + (360 * rotationOffset) / (navigationItems.length - 1 || 1)}
                    r="1.5"
                    fill="#FFFFFF"
                  />
                </svg>
              </div>

              {/* Navigation Items Arranged Along the Vertical Circular Arc */}
              <div className="relative w-full h-full">
                {navigationItems.map((item, idx) => {
                  const active = isItemActive(item)
                  const diff = idx - rotationOffset

                  // Vertical spacing: 52px per module
                  // Arc curve: items near center push outward to the right following the sidebar silhouette
                  const verticalOffset = diff * 52
                  // Circular arc horizontal projection: cos curve
                  const normalizedDist = Math.max(-1, Math.min(1, diff / 4.2))
                  const arcAngle = Math.asin(normalizedDist * 0.85)
                  const horizontalOffset = Math.cos(arcAngle) * 18 - 4

                  // Depth and scale effect: items at apex are 1.0, items towards edges scale slightly
                  const scale = Math.max(0.9, 1 - 0.03 * Math.abs(diff))
                  const opacity = Math.max(0.2, 1 - 0.18 * Math.abs(diff))

                  // Center position in the viewport
                  const centerY = 'calc(50% - 24px)'

                  return (
                    <div
                      key={item.to}
                      style={{
                        position: 'absolute',
                        top: centerY,
                        left: 0,
                        right: 0,
                        transform: `translate3d(${horizontalOffset}px, ${verticalOffset}px, 0) scale(${scale})`,
                        opacity,
                        zIndex: active ? 20 : 10 - Math.min(9, Math.round(Math.abs(diff))),
                        transition: isDragging || prefersReducedMotion ? 'none' : 'transform 0.32s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.24s ease',
                      }}
                      className="pr-2"
                    >
                      <NavLink
                        to={item.to}
                        onClick={() => {
                          setRotationOffset(idx)
                        }}
                        className={`group relative flex items-center gap-3 rounded-2xl p-2 transition-all duration-200 ${
                          active
                            ? 'bg-gradient-to-r from-white/95 via-[#F8F1FC]/90 to-[#EDE2F8]/85 border border-white/95 shadow-[0_8px_20px_-4px_rgba(124,92,191,0.2),0_2px_6px_rgba(124,92,191,0.08)]'
                            : 'border border-transparent hover:border-white/70 hover:bg-white/55 text-[#51465F] hover:text-[#2A1D3B]'
                        }`}
                      >
                        {/* Coordinated Pastel Icon Container */}
                        <div
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border transition-all duration-200 ${
                            active
                              ? 'bg-gradient-to-br from-[#7C5CBF] to-[#5B3E9E] border-white text-white shadow-[0_4px_12px_rgba(124,92,191,0.3)]'
                              : `${item.iconBg} ${item.iconBorder} ${item.iconColor} shadow-2xs group-hover:scale-105`
                          }`}
                        >
                          <item.icon size={17} className={active ? 'text-white' : item.iconColor} />
                        </div>

                        {/* Two-Line Label & Subtitle: Kept Strictly Horizontal for Clear Readability */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`text-xs truncate font-heading ${
                                active ? 'font-bold text-[#2A1D3B]' : 'font-semibold text-[#352A47]'
                              }`}
                            >
                              {item.label}
                            </span>
                            {item.badge && (
                              <span className="rounded-full bg-[#EDE9FE] text-[#6D28D9] border border-[#DDD6FE] px-1.5 py-0.2 text-[8px] font-bold">
                                {item.badge}
                              </span>
                            )}
                          </div>
                          <div
                            className={`text-[10px] truncate ${
                              active ? 'font-medium text-[#645378]' : 'text-[#6E6280]'
                            }`}
                          >
                            {item.subtitle}
                          </div>
                        </div>

                        {/* Active Sparkle Star Indicator */}
                        {active && (
                          <div className="shrink-0 pr-1" aria-hidden="true">
                            <Sparkles size={14} className="text-[#E09067] animate-pulse" />
                          </div>
                        )}
                      </NavLink>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Bottom Arc Rotation Control Button */}
            <div className="flex items-center justify-center pt-1">
              <button
                type="button"
                onClick={rotateNext}
                disabled={rotationOffset >= navigationItems.length - 1.05}
                aria-label="Next navigation modules (rotate arc down)"
                title="Rotate arc down"
                className={`flex items-center gap-1 px-3 py-0.5 rounded-full text-[10px] font-bold border transition-all cursor-pointer ${
                  rotationOffset >= navigationItems.length - 1.05
                    ? 'opacity-30 border-transparent text-slate-400 cursor-not-allowed'
                    : 'bg-white/75 hover:bg-white text-[#6C5CE7] border-white/90 shadow-2xs hover:scale-105'
                }`}
              >
                <span>Next</span>
                <ChevronDown size={13} />
              </button>
            </div>
          </div>
        )}

        {/* Quick Feedback Shortcut for Visitors */}
        {role === 'visitor' && !isCollapsed && (
          <div className="pt-2 px-1">
            <button
              type="button"
              onClick={onOpenFeedback}
              className="w-full flex items-center justify-between rounded-2xl border border-[#FED7AA] bg-[#FFF7ED]/80 hover:bg-[#FFEDD5] px-3.5 py-2 text-xs text-[#2A1D3B] transition shadow-2xs group cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <MessageSquare size={14} className="text-[#EA580C]" />
                <span className="font-heading font-bold text-xs text-[#2A1D3B]">
                  Visitor Feedback
                </span>
              </div>
              <span className="text-[10px] font-bold text-[#EA580C] group-hover:underline">
                Rate Campus
              </span>
            </button>
          </div>
        )}
      </nav>

      {/* ============================================================== */}
      {/* 4. FOOTER: CAMPUS GPS STATUS & FLOATING PROFILE CARD          */}
      {/* ============================================================== */}
      <div
        className={`pb-4 pt-2 transition-all ${
          isCollapsed ? 'px-2 space-y-2' : 'px-4 pr-7 space-y-2'
        }`}
      >
        {/* GPS Status Indicator (Preserves #app-sidebar-gps-status for tests/accessibility) */}
        {!isCollapsed && (
          <div className="flex items-center justify-between rounded-xl bg-white/45 border border-white/60 px-2.5 py-1.5 text-[10px] shadow-2xs">
            <span className="font-semibold text-[#6E6280]">Campus GPS</span>
            <div className="flex items-center gap-1.5 min-w-0" title={gpsStatusText}>
              <span
                className={`h-2 w-2 shrink-0 rounded-full ${
                  gpsStatus === 'active'
                    ? 'bg-[#1E583F] animate-pulse'
                    : gpsStatus === 'requesting'
                      ? 'bg-[#EA580C] animate-pulse'
                      : gpsStatus === 'permission_denied'
                        ? 'bg-rose-500'
                        : 'bg-slate-400'
                }`}
              />
              <span
                id="app-sidebar-gps-status"
                className="font-medium text-[#51465F] truncate max-w-[140px]"
              >
                {gpsStatusText}
              </span>
            </div>
          </div>
        )}

        {/* Profile Card */}
        <SidebarProfileCard
          user={user}
          role={role}
          isAuthenticated={isAuthenticated}
          isCollapsed={isCollapsed}
          onSignOut={onSignOut}
        />
      </div>
    </aside>
  )
}

