import {
  Award,
  BookOpen,
  Briefcase,
  Building,
  Building2,
  CheckCircle2,
  Clock,
  Compass,
  Cpu,
  GraduationCap,
  Handshake,
  HeartHandshake,
  Info,
  MapPin,
  Route,
  ShieldCheck,
  Sparkles,
  Trophy,
} from 'lucide-react'
import { useEffect, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { DiscoverNarrationPlayer } from '../components/DiscoverNarrationPlayer.tsx'
import { DISCOVER_CATEGORIES, getDiscoverCategoryById } from '../data/discoverData.ts'
import { discoverNarrationService } from '../services/discoverNarrationService.ts'
import type { DiscoverCategoryId, DiscoverPreviewTopic } from '../types/discover.ts'

function getIconComponent(iconName: string) {
  switch (iconName) {
    case 'BookOpen':
      return BookOpen
    case 'Award':
      return Award
    case 'Briefcase':
      return Briefcase
    case 'Cpu':
      return Cpu
    case 'GraduationCap':
      return GraduationCap
    case 'Building2':
      return Building2
    case 'Building':
      return Building
    case 'ShieldCheck':
      return ShieldCheck
    case 'HeartHandshake':
      return HeartHandshake
    case 'Trophy':
      return Trophy
    case 'CheckCircle2':
      return CheckCircle2
    case 'Handshake':
      return Handshake
    default:
      return Sparkles
  }
}

export function DiscoverScreen() {
  const [searchParams, setSearchParams] = useSearchParams()

  const currentTab = (searchParams.get('tab') as DiscoverCategoryId) || 'courses'

  const activeCategory = useMemo(() => {
    return getDiscoverCategoryById(currentTab) || DISCOVER_CATEGORIES[0]
  }, [currentTab])

  // Stop narration on unmount and pause on document hide/minimize
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        discoverNarrationService.pause()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      discoverNarrationService.cleanup()
    }
  }, [])

  const handleTabChange = (tabId: DiscoverCategoryId) => {
    // When switching category tabs, stop existing category audio cleanly
    discoverNarrationService.stop()
    setSearchParams({ tab: tabId }, { replace: true })
  }

  const CategoryIcon = getIconComponent(activeCategory.iconName)

  return (
    <div className="min-h-screen bg-[#E8DDF2] text-[#352A47] pb-24 md:pb-12">
      {/* Top Banner / Hero Header */}
      <div className="border-b border-[#C9B6DF] bg-[#FBF8FD]/95 backdrop-blur-xl px-4 py-6 sm:px-8 sm:py-8 shadow-dream-card">
        <div className="max-w-6xl mx-auto">
          {/* Institutional Badge */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#D9B4A3] bg-[#E8C8B9] px-3 py-0.5 text-[11px] font-heading font-bold text-[#352A47]">
              <Compass size={13} />
              <span>Discover MNMJEC</span>
            </span>
            <span className="rounded-full border border-[#C9B6DF] bg-[#DFD1EC] px-2.5 py-0.5 text-[10px] font-heading font-semibold text-[#51465F]">
              Virtual Campus Directory
            </span>
          </div>

          <h1 className="font-editorial text-2xl sm:text-4xl font-extrabold tracking-tight text-[#352A47] leading-tight">
            Discover <span className="italic font-normal">Misrimal Navajee Munoth Jain</span> Engineering College
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-[#51465F] max-w-3xl leading-relaxed font-sans">
            Explore academic departments, engineering programs, institutional financial aid, and career placement services.
            All official curriculum catalogs and statistics are synchronized directly with administrative clearance.
          </p>

          {/* Category Tabs Navigation */}
          <div className="mt-6 flex flex-wrap gap-2 sm:gap-3" role="tablist" aria-label="Discover Categories">
            {DISCOVER_CATEGORIES.map((cat) => {
              const TabIcon = getIconComponent(cat.iconName)
              const isActive = cat.id === activeCategory.id
              return (
                <button
                  key={cat.id}
                  type="button"
                  role="tab"
                  id={`tab-${cat.id}`}
                  aria-selected={isActive}
                  aria-controls={`panel-${cat.id}`}
                  onClick={() => handleTabChange(cat.id)}
                  className={`flex min-h-[44px] items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-heading font-bold transition-all cursor-pointer shadow-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-[#352A47] ${
                    isActive
                      ? 'bg-[#352A47] text-white shadow-dream-elevated ring-1 ring-[#352A47]'
                      : 'border border-[#C9B6DF] bg-[#FBF8FD] text-[#51465F] hover:bg-[#D2BEE7] hover:text-[#352A47]'
                  }`}
                >
                  <TabIcon size={16} />
                  <span>{cat.title}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Main Content Area: Accessible Tab Panel */}
      <main
        id={`panel-${activeCategory.id}`}
        role="tabpanel"
        aria-labelledby={`tab-${activeCategory.id}`}
        tabIndex={0}
        className="max-w-6xl mx-auto px-4 py-6 sm:px-8 space-y-6 focus:outline-none font-sans"
      >
        {/* Category Header Card */}
        <div className="rounded-3xl border border-[#C9B6DF] bg-[#FBF8FD] p-5 sm:p-6 shadow-dream-card relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#D2BEE7]/40 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#E8C8B9] border border-[#D9B4A3] text-[#352A47] shrink-0 shadow-xs">
                <CategoryIcon size={24} />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg sm:text-2xl font-heading font-extrabold text-[#352A47] tracking-tight">
                    {activeCategory.title}
                  </h2>
                  <span className="rounded-full border border-[#D9B4A3] bg-[#E8C8B9] px-2.5 py-0.5 text-[10px] font-heading font-bold text-[#352A47]">
                    {activeCategory.badge}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-[#51465F] font-medium mt-0.5">
                  {activeCategory.tagline}
                </p>
              </div>
            </div>
          </div>

          <p className="mt-4 text-xs sm:text-sm text-[#352A47] leading-relaxed">
            {activeCategory.description}
          </p>

          {/* Official Verification Notice Banner (Honest Coming Soon state) */}
          <div className="mt-4 rounded-2xl border border-[#D7A894] bg-[#E8C8B9]/30 p-3.5 flex items-start gap-3">
            <Info size={17} className="text-[#9E563A] shrink-0 mt-0.5" />
            <div className="text-xs">
              <span className="font-heading font-bold text-[#9E563A] block mb-0.5">
                Official Information Coming Soon
              </span>
              <p className="text-[#51465F] leading-relaxed">
                {activeCategory.statusNotice} To prevent misinformation, no speculative course matrices, scholarship amounts, or unverified placement statistics are displayed.
              </p>
            </div>
          </div>
        </div>

        {/* Audio Narration Component */}
        <section aria-label={`${activeCategory.title} Audio Narration`}>
          <DiscoverNarrationPlayer
            key={activeCategory.id}
            categoryId={activeCategory.id}
            categoryTitle={activeCategory.title}
            narrationText={activeCategory.narrationText}
            narrationSummary={activeCategory.narrationSummary}
          />
        </section>

        {/* Structured Topic Previews */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-heading font-bold uppercase tracking-wider text-[#51465F] flex items-center gap-2">
              <Sparkles size={14} className="text-[#7A4465]" />
              <span>Program &amp; Services Overview</span>
            </h3>
            <span className="text-[10px] text-[#51465F] font-heading font-bold">
              3 Modules Listed
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {activeCategory.previewTopics.map((topic: DiscoverPreviewTopic, idx: number) => {
              const TopicIcon = getIconComponent(topic.iconName)
              return (
                <div
                  key={idx}
                  className="rounded-3xl border border-[#C9B6DF] bg-[#FBF8FD] p-5 flex flex-col justify-between hover:border-[#352A47] transition-all shadow-dream-soft group"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#E8DDF2] text-[#352A47] border border-[#C9B6DF] group-hover:bg-[#352A47] group-hover:text-white transition-colors">
                        <TopicIcon size={18} />
                      </div>
                      <span className="text-[9px] font-heading font-bold text-[#51465F] uppercase tracking-wider bg-[#DFD1EC] px-2 py-0.5 rounded-full border border-[#C9B6DF]">
                        Preview Module
                      </span>
                    </div>

                    <h4 className="text-sm font-heading font-bold text-[#352A47] group-hover:text-[#7A4465] transition-colors">
                      {topic.title}
                    </h4>
                    <p className="text-[11px] font-heading font-bold text-[#7A4465] mt-0.5 mb-2">
                      {topic.subtitle}
                    </p>
                    <p className="text-xs text-[#51465F] leading-relaxed mb-3">
                      {topic.description}
                    </p>
                  </div>

                  <ul className="border-t border-[#C9B6DF] pt-3 space-y-1.5 text-[11px] text-[#352A47]">
                    {topic.bulletPoints.map((bp: string, bpIdx: number) => (
                      <li key={bpIdx} className="flex items-start gap-1.5">
                        <CheckCircle2 size={13} className="text-[#1E583F] shrink-0 mt-0.5" />
                        <span>{bp}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
        </div>

        {/* 3D Campus Integration: Academic Buildings Linking */}
        {activeCategory.associatedBuildings.length > 0 && (
          <div className="rounded-3xl border border-[#C9B6DF] bg-[#FBF8FD] p-5 sm:p-6 shadow-dream-card">
            <div className="flex items-center justify-between mb-3.5">
              <div>
                <h3 className="text-sm font-heading font-extrabold uppercase tracking-wider text-[#352A47] flex items-center gap-2">
                  <Building size={15} className="text-[#7A4465]" />
                  <span>Physical Facilities &amp; Department Buildings</span>
                </h3>
                <p className="text-xs text-[#51465F] mt-0.5">
                  Locate and inspect physical campus buildings associated with {activeCategory.title.toLowerCase()} in the 3D model.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {activeCategory.associatedBuildings.map((bldg) => (
                <div
                  key={bldg.buildingId}
                  className="rounded-2xl border border-[#C9B6DF] bg-[#E8DDF2]/60 p-4 flex flex-col justify-between hover:border-[#352A47] transition shadow-xs"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-heading font-bold text-[#352A47]">{bldg.buildingName}</span>
                      {bldg.floorCountLabel && (
                        <span className="rounded-full bg-[#DFD1EC] px-2 py-0.5 text-[9px] font-heading font-bold text-[#51465F] border border-[#C9B6DF]">
                          {bldg.floorCountLabel}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#51465F] mt-1 line-clamp-2">
                      {bldg.description}
                    </p>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-[#C9B6DF] flex items-center gap-2">
                    <Link
                      to={`/explore?building=${bldg.buildingId}`}
                      className="inline-flex min-h-[36px] items-center gap-1.5 rounded-xl bg-[#352A47] hover:bg-[#231B30] text-white px-3 py-1.5 text-xs font-heading font-bold transition cursor-pointer shadow-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-[#352A47]"
                    >
                      <Compass size={13} />
                      <span>View in 3D</span>
                    </Link>
                    <Link
                      to={`/navigation?to=${bldg.buildingId}`}
                      className="inline-flex min-h-[36px] items-center gap-1.5 rounded-xl border border-[#C9B6DF] bg-[#FBF8FD] hover:bg-[#D2BEE7] px-3 py-1.5 text-xs font-heading font-bold text-[#352A47] transition cursor-pointer shadow-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-[#352A47]"
                    >
                      <Route size={13} />
                      <span>Route</span>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Official Admissions & Academic Office Contact */}
        <div className="rounded-3xl border border-[#C9B6DF] bg-[#FBF8FD] p-4.5 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-dream-card">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#E8C8B9] text-[#352A47] border border-[#D9B4A3] shrink-0 shadow-xs">
              <MapPin size={20} />
            </div>
            <div>
              <div className="text-xs font-heading font-bold text-[#352A47]">
                {activeCategory.officialContact.officeName}
              </div>
              <div className="text-[11px] text-[#51465F]">
                {activeCategory.officialContact.locationDescription}
              </div>
              <div className="text-[10px] text-[#7A4465] flex items-center gap-1 mt-0.5 font-heading font-bold">
                <Clock size={11} />
                <span>{activeCategory.officialContact.recommendedContactMethod}</span>
              </div>
            </div>
          </div>

          <Link
            to={`/explore?building=${activeCategory.officialContact.buildingId}`}
            className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-2xl bg-[#352A47] hover:bg-[#231B30] px-4 py-2 text-xs font-heading font-bold text-white shadow-dream-soft transition shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#352A47]"
          >
            <Compass size={14} />
            <span>Locate Office in 3D</span>
          </Link>
        </div>
      </main>
    </div>
  )
}
