import { NavLink, useLocation } from 'react-router-dom'
import { MOBILE_BOTTOM_NAV_ITEMS } from './navItems'

export function MobileBottomNav() {
  const location = useLocation()

  return (
    <nav
      aria-label="Mobile Bottom Navigation"
      className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom,0px))] z-40 flex items-center justify-around rounded-full p-1.5 shadow-[0_12px_36px_rgba(139,92,246,0.2)] backdrop-blur-2xl md:hidden border border-white/90 bg-[#FBF8FD]/92 text-[#352A47] transition-all"
    >
      {MOBILE_BOTTOM_NAV_ITEMS.map((item) => {
        const isActive =
          item.to.includes('tour=true')
            ? location.pathname === '/explore' && location.search.includes('tour=true')
            : item.to === '/explore'
              ? location.pathname === '/explore' && !location.search.includes('tour=true')
              : location.pathname === item.to

        return (
          <NavLink
            key={item.to}
            to={item.to}
            aria-label={item.label}
            className={`group relative flex min-w-[56px] min-h-[44px] flex-1 flex-col items-center justify-center rounded-full py-1 text-[10px] font-semibold transition-all duration-200 ${
              isActive
                ? 'bg-gradient-to-r from-white via-[#F8F1FC] to-[#ECE0F7] text-[#2A1D3B] border border-white/90 shadow-[0_4px_14px_rgba(124,92,191,0.22)]'
                : 'text-[#51465F] hover:text-[#2A1D3B]'
            }`}
          >
            <div
              className={`flex h-6 w-6 items-center justify-center rounded-full transition-transform ${
                isActive
                  ? 'bg-gradient-to-br from-[#7C5CBF] to-[#5B3E9E] text-white shadow-2xs scale-105'
                  : `${item.iconBg} ${item.iconColor} group-hover:scale-105`
              }`}
            >
              <item.icon size={14} className={isActive ? 'text-white' : item.iconColor} />
            </div>
            <span
              className={`mt-0.5 truncate tracking-tight text-[9px] font-heading ${
                isActive ? 'font-bold text-[#2A1D3B]' : 'text-[#6E6280]'
              }`}
            >
              {item.label}
            </span>
          </NavLink>
        )
      })}
    </nav>
  )
}
