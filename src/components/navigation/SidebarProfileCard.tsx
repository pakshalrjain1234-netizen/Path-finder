import { LogIn, LogOut, Shield, User as UserIcon, Users } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import type { User, UserRole } from '../../types/auth'

interface SidebarProfileCardProps {
  user: User
  role: UserRole
  isAuthenticated: boolean
  isCollapsed?: boolean
  onSignOut: () => void
}

export function SidebarProfileCard({
  user,
  role,
  isAuthenticated,
  isCollapsed = false,
  onSignOut,
}: SidebarProfileCardProps) {
  // Derive concise display label and secondary text
  const displayName = (() => {
    if (role === 'admin') {
      return user.name || 'Administrator'
    }
    if (role === 'student') {
      return user.name || 'Student'
    }
    return 'Guest Visitor'
  })()

  const displaySubtitle = (() => {
    if (role === 'admin') {
      return user.email || 'Campus Administration'
    }
    if (role === 'student') {
      return user.email || 'Verified Student'
    }
    return 'Campus Explorer'
  })()

  // Avatar initial or icon
  const avatarInitials = (() => {
    if (!user.name || role === 'visitor') return null
    const parts = user.name.trim().split(/\s+/)
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    }
    return parts[0].slice(0, 2).toUpperCase()
  })()

  // Coordinated role badge color styling
  const roleBadgeStyle = (() => {
    switch (role) {
      case 'admin':
        return 'bg-[#EDE9FE] text-[#6D28D9] border-[#DDD6FE]'
      case 'student':
        return 'bg-[#E0F2FE] text-[#0369A1] border-[#BAE6FD]'
      case 'visitor':
      default:
        return 'bg-[#DFEDE5] text-[#1E583F] border-[#BCD8C9]'
    }
  })()

  if (isCollapsed) {
    return (
      <div className="flex flex-col items-center gap-2 pt-2 border-t border-white/60">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-2xl border shadow-xs ${
            role === 'admin'
              ? 'bg-[#EDE9FE] border-[#DDD6FE] text-[#6D28D9]'
              : role === 'student'
                ? 'bg-[#E0F2FE] border-[#BAE6FD] text-[#0369A1]'
                : 'bg-[#DFEDE5] border-[#BCD8C9] text-[#1E583F]'
          }`}
          title={`${displayName} (${role.toUpperCase()})`}
        >
          {role === 'admin' ? (
            <Shield size={18} />
          ) : role === 'student' ? (
            avatarInitials ? (
              <span className="text-xs font-bold font-heading">{avatarInitials}</span>
            ) : (
              <UserIcon size={18} />
            )
          ) : (
            <Users size={18} />
          )}
        </div>

        {isAuthenticated ? (
          <button
            type="button"
            onClick={onSignOut}
            aria-label="Sign out from session"
            title="Sign out"
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/60 hover:bg-rose-100 hover:text-rose-700 text-[#6E6280] transition border border-white/70 shadow-2xs cursor-pointer"
          >
            <LogOut size={14} />
          </button>
        ) : (
          <NavLink
            to="/login"
            aria-label="Sign in"
            title="Sign in"
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#352A47] hover:bg-[#433659] text-white transition shadow-2xs"
          >
            <LogIn size={14} />
          </NavLink>
        )}
      </div>
    )
  }

  return (
    <div className="relative rounded-2xl bg-white/75 backdrop-blur-md border border-white/85 p-2.5 shadow-[0_4px_16px_rgba(53,42,71,0.06)] transition-all">
      <div className="flex items-center gap-2.5">
        {/* User Avatar */}
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border shadow-2xs ${
            role === 'admin'
              ? 'bg-gradient-to-br from-[#EDE9FE] to-[#DDD6FE] border-white text-[#6D28D9]'
              : role === 'student'
                ? 'bg-gradient-to-br from-[#E0F2FE] to-[#BAE6FD] border-white text-[#0369A1]'
                : 'bg-gradient-to-br from-[#DFEDE5] to-[#BCD8C9] border-white text-[#1E583F]'
          }`}
        >
          {role === 'admin' ? (
            <Shield size={18} />
          ) : role === 'student' ? (
            avatarInitials ? (
              <span className="text-xs font-bold font-heading">{avatarInitials}</span>
            ) : (
              <UserIcon size={18} />
            )
          ) : (
            <Users size={18} />
          )}
        </div>

        {/* User Identity Details */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="font-heading font-bold text-xs text-[#2A1D3B] truncate">
              {displayName}
            </span>
            <span
              className={`rounded-full px-1.5 py-0.2 text-[8px] font-bold uppercase tracking-wider border shrink-0 ${roleBadgeStyle}`}
            >
              {role}
            </span>
          </div>
          <div className="text-[10px] text-[#6E6280] truncate font-medium">
            {displaySubtitle}
          </div>
        </div>

        {/* Action Button: Logout or Sign In */}
        {isAuthenticated ? (
          <button
            type="button"
            onClick={onSignOut}
            aria-label="Sign out from session"
            title="Sign out"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/60 hover:bg-rose-100 hover:border-rose-200 hover:text-rose-700 text-[#6E6280] transition border border-white/70 shadow-2xs cursor-pointer group"
          >
            <LogOut size={14} className="group-hover:translate-x-0.5 transition-transform" />
          </button>
        ) : (
          <NavLink
            to="/login"
            aria-label="Sign in"
            title="Sign in / Switch Role"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#352A47] hover:bg-[#433659] text-white transition shadow-dream-soft cursor-pointer"
          >
            <LogIn size={14} />
          </NavLink>
        )}
      </div>
    </div>
  )
}
