import {
  ClipboardList,
  GraduationCap,
  HelpCircle,
  Home,
  Layers3,
  MapPin,
  MessageSquare,
  Route,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Wrench,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { UserRole } from '../../types/auth'

export interface NavItemConfig {
  to: string
  label: string
  subtitle: string
  shortLabel: string
  icon: LucideIcon
  badge?: string
  // Coordinated pastel color classes for the icon container
  iconBg: string
  iconBorder: string
  iconColor: string
  // Active pill gradient accent
  activeGradient?: string
}

/**
 * Returns role-permitted navigation destinations with dedicated dreamscape pastel styling.
 * Strictly enforces role isolation:
 * - Student: Student services, issue passport, my reports, feedback, exploration
 * - Visitor: Pure campus discovery, 3D explorer, navigation, cinematic tour, visitor feedback (zero issue routes/admin tools)
 * - Admin: Full command center, issue management, feedback analytics, GPS calibration, exploration
 */
export function getRoleNavigationItems(role: UserRole): NavItemConfig[] {
  // Common exploration foundation
  const welcomeItem: NavItemConfig = {
    to: '/welcome',
    label: 'Home',
    subtitle: 'Campus Overview',
    shortLabel: 'Home',
    icon: Home,
    iconBg: 'bg-[#EDE7F6]',
    iconBorder: 'border-[#D6C7EC]',
    iconColor: 'text-[#6C5CE7]',
  }

  const explorerItem: NavItemConfig = {
    to: '/explore',
    label: '3D Explorer',
    subtitle: '3D Campus Explorer',
    shortLabel: '3D Map',
    icon: Layers3,
    iconBg: 'bg-[#E0F2FE]',
    iconBorder: 'border-[#BAE6FD]',
    iconColor: 'text-[#0284C7]',
  }

  const navigationItem: NavItemConfig = {
    to: '/navigation',
    label: 'Navigation',
    subtitle: 'Find your way',
    shortLabel: 'Route',
    icon: Route,
    iconBg: 'bg-[#FFEDD5]',
    iconBorder: 'border-[#FED7AA]',
    iconColor: 'text-[#EA580C]',
  }

  const discoverItem: NavItemConfig = {
    to: '/discover',
    label: 'Discover MNMJEC',
    subtitle: 'Buildings & Places',
    shortLabel: 'Discover',
    icon: GraduationCap,
    iconBg: 'bg-[#D1FAE5]',
    iconBorder: 'border-[#A7F3D0]',
    iconColor: 'text-[#059669]',
  }

  const cinematicTourItem: NavItemConfig = {
    to: '/explore?tour=true',
    label: 'Cinematic Tour',
    subtitle: 'Audio & Visual Tour',
    shortLabel: 'Tour',
    icon: Sparkles,
    iconBg: 'bg-[#FFE4E6]',
    iconBorder: 'border-[#FECDD3]',
    iconColor: 'text-[#E11D48]',
  }

  const searchItem: NavItemConfig = {
    to: '/search',
    label: 'Search',
    subtitle: 'Campus Directory',
    shortLabel: 'Search',
    icon: Search,
    iconBg: 'bg-[#E8EFFE]',
    iconBorder: 'border-[#C7DBFB]',
    iconColor: 'text-[#2563EB]',
  }

  const savedLocationsItem: NavItemConfig = {
    to: '/saved',
    label: 'Saved Locations',
    subtitle: 'Quick Access',
    shortLabel: 'Saved',
    icon: Star,
    iconBg: 'bg-[#FCE7F3]',
    iconBorder: 'border-[#FBCFE8]',
    iconColor: 'text-[#DB2777]',
  }

  const helpItem: NavItemConfig = {
    to: '/help',
    label: 'Help',
    subtitle: 'Get Support & Offline',
    shortLabel: 'Help',
    icon: HelpCircle,
    iconBg: 'bg-[#E0F2FE]',
    iconBorder: 'border-[#BAE6FD]',
    iconColor: 'text-[#0284C7]',
  }

  if (role === 'admin') {
    return [
      {
        to: '/admin/issues',
        label: 'Admin Dashboard',
        subtitle: 'Campus Issue Command Center',
        shortLabel: 'Admin',
        icon: ShieldCheck,
        iconBg: 'bg-[#EDE9FE]',
        iconBorder: 'border-[#DDD6FE]',
        iconColor: 'text-[#6D28D9]',
        badge: 'Admin',
      },
      {
        to: '/issues',
        label: 'Campus Issues',
        subtitle: 'Review & Resolve',
        shortLabel: 'Issues',
        icon: ClipboardList,
        iconBg: 'bg-[#F5E8FF]',
        iconBorder: 'border-[#E5D0FA]',
        iconColor: 'text-[#8B5CF6]',
      },
      {
        to: '/admin/feedback',
        label: 'Feedback Management',
        subtitle: 'Visitor & Student Analytics',
        shortLabel: 'Feedback',
        icon: MessageSquare,
        iconBg: 'bg-[#F3E8FF]',
        iconBorder: 'border-[#E9D5FF]',
        iconColor: 'text-[#9333EA]',
      },
      explorerItem,
      navigationItem,
      discoverItem,
      searchItem,
      cinematicTourItem,
      {
        to: '/dev-gps-calibration',
        label: 'GPS Calibration',
        subtitle: 'Campus Location Setup',
        shortLabel: 'GPS Fix',
        icon: MapPin,
        iconBg: 'bg-[#FEF3C7]',
        iconBorder: 'border-[#FDE68A]',
        iconColor: 'text-[#D97706]',
      },
      savedLocationsItem,
      helpItem,
    ]
  }

  if (role === 'student') {
    return [
      welcomeItem,
      explorerItem,
      navigationItem,
      discoverItem,
      cinematicTourItem,
      searchItem,
      {
        to: '/issues',
        label: 'Campus Issue Passport',
        subtitle: 'Report & Track',
        shortLabel: 'Passport',
        icon: Wrench,
        iconBg: 'bg-[#EDE9FE]',
        iconBorder: 'border-[#DDD6FE]',
        iconColor: 'text-[#7C3AED]',
      },
      {
        to: '/my-reports',
        label: 'My Reports',
        subtitle: 'Your Submissions',
        shortLabel: 'Reports',
        icon: ClipboardList,
        iconBg: 'bg-[#E0F7FA]',
        iconBorder: 'border-[#B2EBF2]',
        iconColor: 'text-[#00838F]',
      },
      {
        to: '/feedback',
        label: 'Feedback Center',
        subtitle: 'Share Your Thoughts',
        shortLabel: 'Feedback',
        icon: MessageSquare,
        iconBg: 'bg-[#F3E8FF]',
        iconBorder: 'border-[#E9D5FF]',
        iconColor: 'text-[#9333EA]',
      },
      savedLocationsItem,
      helpItem,
    ]
  }

  // Visitor Role: STRICT ISOLATION — No student tickets, no reports, no admin controls
  return [
    welcomeItem,
    explorerItem,
    navigationItem,
    discoverItem,
    cinematicTourItem,
    searchItem,
    {
      to: '/feedback',
      label: 'Visitor Feedback',
      subtitle: 'Share Your Thoughts',
      shortLabel: 'Feedback',
      icon: MessageSquare,
      iconBg: 'bg-[#F3E8FF]',
      iconBorder: 'border-[#E9D5FF]',
      iconColor: 'text-[#9333EA]',
    },
    savedLocationsItem,
    helpItem,
  ]
}

/**
 * Curated 5-item mobile bottom navigation bar preventing viewport overcrowding.
 */
export const MOBILE_BOTTOM_NAV_ITEMS: Array<{
  to: string
  label: string
  icon: LucideIcon
  iconBg: string
  iconColor: string
}> = [
  { to: '/welcome', label: 'Home', icon: Home, iconBg: 'bg-[#EDE7F6]', iconColor: 'text-[#6C5CE7]' },
  { to: '/explore', label: '3D Map', icon: Layers3, iconBg: 'bg-[#E0F2FE]', iconColor: 'text-[#0284C7]' },
  { to: '/discover', label: 'Discover', icon: GraduationCap, iconBg: 'bg-[#D1FAE5]', iconColor: 'text-[#059669]' },
  { to: '/navigation', label: 'Route', icon: Route, iconBg: 'bg-[#FFEDD5]', iconColor: 'text-[#EA580C]' },
  { to: '/explore?tour=true', label: 'Tour', icon: Sparkles, iconBg: 'bg-[#FFE4E6]', iconColor: 'text-[#E11D48]' },
]
