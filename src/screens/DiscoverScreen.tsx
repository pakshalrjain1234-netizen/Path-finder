import {
  Award,
  BookOpen,
  Briefcase,
  Building,
  CheckCircle2,
  Clock,
  Compass,
  ExternalLink,
  FileText,
  Info,
  MapPin,
  Route,
  Volume2,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { DiscoverNarrationPlayer } from '../components/DiscoverNarrationPlayer.tsx'
import {
  DISCOVER_CATEGORIES,
  getDiscoverCategoryById,
  PG_COURSES,
  PLACEMENT_BATCH_RECORDS,
  SCHOLARSHIPS_DATA,
  UG_COURSES,
  VERIFIED_COMPANIES_DATA,
} from '../data/discoverData.ts'
import { discoverNarrationService } from '../services/discoverNarrationService.ts'
import type {
  CourseProgram,
  DiscoverCategoryId,
  PlacementBatchRecord,
  ScholarshipScheme,
  VerifiedCompany,
} from '../types/discover.ts'

export function DiscoverScreen() {
  const [searchParams, setSearchParams] = useSearchParams()

  // Handle category tab from URL (?tab=courses, scholarships, companies or placements)
  const rawTab = searchParams.get('tab') || 'courses'
  const currentTab: DiscoverCategoryId =
    rawTab === 'companies' ? 'placements' : (rawTab as DiscoverCategoryId)

  const activeCategory = useMemo(() => {
    return getDiscoverCategoryById(currentTab) || DISCOVER_CATEGORIES[0]
  }, [currentTab])

  // Subcategory state for Courses: 'UG' | 'PG'
  const [courseLevel, setCourseLevel] = useState<'UG' | 'PG'>('UG')

  // Scholarship filter group state: 'all' | 'SC/ST' | 'JITO' | 'Central Government' | 'PM/PS'
  const [scholarshipGroup, setScholarshipGroup] = useState<string>('all')

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
    const targetQuery = tabId === 'placements' ? 'companies' : tabId
    setSearchParams({ tab: targetQuery }, { replace: true })
  }

  const handleSpeakItem = (text: string, catId: DiscoverCategoryId) => {
    discoverNarrationService.play(text, catId)
  }

  // Filter scholarships by group
  const filteredScholarships = useMemo(() => {
    if (scholarshipGroup === 'all') return SCHOLARSHIPS_DATA
    return SCHOLARSHIPS_DATA.filter((s) => s.group === scholarshipGroup)
  }, [scholarshipGroup])

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
              Official Academic &amp; Career Directory
            </span>
          </div>

          <h1 className="font-editorial text-2xl sm:text-4xl font-extrabold tracking-tight text-[#352A47] leading-tight">
            Discover <span className="italic font-normal">Misrimal Navajee Munoth Jain</span> Engineering College
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-[#51465F] max-w-3xl leading-relaxed font-sans">
            Explore verified undergraduate and postgraduate engineering courses, institutional scholarships, and corporate recruiters.
            All academic catalogs and placement documents are aligned directly with official MNMJEC sources.
          </p>

          {/* Three Distinct Top-Level Categories Navigation */}
          <div className="mt-6 flex flex-wrap gap-2.5 sm:gap-3" role="tablist" aria-label="Discover Categories">
            {/* 1. Courses Tab */}
            <button
              type="button"
              role="tab"
              id="tab-courses"
              data-testid="tab-courses"
              aria-selected={activeCategory.id === 'courses'}
              aria-controls="panel-courses"
              onClick={() => handleTabChange('courses')}
              className={`flex min-h-[46px] items-center gap-2 rounded-2xl px-5 py-2.5 text-xs font-heading font-bold transition-all cursor-pointer shadow-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-[#352A47] ${
                activeCategory.id === 'courses'
                  ? 'bg-[#352A47] text-white shadow-dream-elevated ring-1 ring-[#352A47]'
                  : 'border border-[#C9B6DF] bg-[#FBF8FD] text-[#51465F] hover:bg-[#D2BEE7] hover:text-[#352A47]'
              }`}
            >
              <BookOpen size={16} />
              <span>Courses</span>
              <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[10px]">11</span>
            </button>

            {/* 2. Scholarships Tab */}
            <button
              type="button"
              role="tab"
              id="tab-scholarships"
              data-testid="tab-scholarships"
              aria-selected={activeCategory.id === 'scholarships'}
              aria-controls="panel-scholarships"
              onClick={() => handleTabChange('scholarships')}
              className={`flex min-h-[46px] items-center gap-2 rounded-2xl px-5 py-2.5 text-xs font-heading font-bold transition-all cursor-pointer shadow-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-[#352A47] ${
                activeCategory.id === 'scholarships'
                  ? 'bg-[#352A47] text-white shadow-dream-elevated ring-1 ring-[#352A47]'
                  : 'border border-[#C9B6DF] bg-[#FBF8FD] text-[#51465F] hover:bg-[#D2BEE7] hover:text-[#352A47]'
              }`}
            >
              <Award size={16} />
              <span>Scholarships</span>
              <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[10px]">5</span>
            </button>

            {/* 3. Companies Tab */}
            <button
              type="button"
              role="tab"
              id="tab-companies"
              data-testid="tab-companies"
              aria-selected={activeCategory.id === 'placements'}
              aria-controls="panel-companies"
              onClick={() => handleTabChange('placements')}
              className={`flex min-h-[46px] items-center gap-2 rounded-2xl px-5 py-2.5 text-xs font-heading font-bold transition-all cursor-pointer shadow-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-[#352A47] ${
                activeCategory.id === 'placements'
                  ? 'bg-[#352A47] text-white shadow-dream-elevated ring-1 ring-[#352A47]'
                  : 'border border-[#C9B6DF] bg-[#FBF8FD] text-[#51465F] hover:bg-[#D2BEE7] hover:text-[#352A47]'
              }`}
            >
              <Briefcase size={16} />
              <span>Companies</span>
              <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[10px]">8+</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area: Accessible Tab Panel */}
      <main
        id={`panel-${activeCategory.id === 'placements' ? 'companies' : activeCategory.id}`}
        role="tabpanel"
        aria-labelledby={`tab-${activeCategory.id === 'placements' ? 'companies' : activeCategory.id}`}
        tabIndex={0}
        className="max-w-6xl mx-auto px-4 py-6 sm:px-8 space-y-6 focus:outline-none font-sans"
      >
        {/* Category Header Card */}
        <div className="rounded-3xl border border-[#C9B6DF] bg-[#FBF8FD] p-5 sm:p-6 shadow-dream-card relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#D2BEE7]/40 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#E8C8B9] border border-[#D9B4A3] text-[#352A47] shrink-0 shadow-xs">
                {activeCategory.id === 'courses' ? (
                  <BookOpen size={24} />
                ) : activeCategory.id === 'scholarships' ? (
                  <Award size={24} />
                ) : (
                  <Briefcase size={24} />
                )}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg sm:text-2xl font-heading font-extrabold text-[#352A47] tracking-tight">
                    {activeCategory.id === 'placements' ? 'Companies & Recruiters' : activeCategory.title}
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

          {/* Official Verification Notice Banner */}
          <div className="mt-4 rounded-2xl border border-[#D7A894] bg-[#E8C8B9]/30 p-3.5 flex items-start gap-3">
            <Info size={17} className="text-[#9E563A] shrink-0 mt-0.5" />
            <div className="text-xs">
              <span className="font-heading font-bold text-[#9E563A] block mb-0.5">
                Official Information &amp; Direct Verification
              </span>
              <p className="text-[#51465F] leading-relaxed">
                {activeCategory.statusNotice}
              </p>
            </div>
          </div>
        </div>

        {/* Audio Narration Component: Listen, Pause, Resume, Stop */}
        <section aria-label={`${activeCategory.title} Audio Narration`}>
          <DiscoverNarrationPlayer
            key={activeCategory.id}
            categoryId={activeCategory.id}
            categoryTitle={activeCategory.id === 'placements' ? 'Companies' : activeCategory.title}
            narrationText={activeCategory.narrationText}
            narrationSummary={activeCategory.narrationSummary}
          />
        </section>

        {/* ============================================================== */}
        {/* 1. COURSES VIEW: Dedicated UG and PG Subcategories */}
        {/* ============================================================== */}
        {activeCategory.id === 'courses' && (
          <div className="space-y-6">
            {/* Subcategory Toggle (UG / PG) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#FBF8FD] p-3 rounded-2xl border border-[#C9B6DF] shadow-xs">
              <div className="flex items-center gap-2">
                <span className="text-xs font-heading font-bold uppercase tracking-wider text-[#51465F]">
                  Select Level:
                </span>
                <div className="inline-flex rounded-xl p-1 bg-[#E8DDF2] border border-[#C9B6DF]" role="group" aria-label="Course Level">
                  <button
                    type="button"
                    onClick={() => setCourseLevel('UG')}
                    className={`min-h-[38px] px-4 py-1.5 rounded-lg text-xs font-heading font-bold transition cursor-pointer ${
                      courseLevel === 'UG'
                        ? 'bg-[#352A47] text-white shadow-xs'
                        : 'text-[#51465F] hover:text-[#352A47]'
                    }`}
                  >
                    Undergraduate (UG — 8 Programmes)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCourseLevel('PG')}
                    className={`min-h-[38px] px-4 py-1.5 rounded-lg text-xs font-heading font-bold transition cursor-pointer ${
                      courseLevel === 'PG'
                        ? 'bg-[#352A47] text-white shadow-xs'
                        : 'text-[#51465F] hover:text-[#352A47]'
                    }`}
                  >
                    Postgraduate (PG — 3 Programmes)
                  </button>
                </div>
              </div>

              <a
                href="https://www.mnmjec.ac.in/Courses.html"
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-1.5 text-xs font-heading font-bold text-[#7A4465] hover:text-[#352A47] underline cursor-pointer"
              >
                <span>Official Course Portal</span>
                <ExternalLink size={12} />
              </a>
            </div>

            {/* Courses Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(courseLevel === 'UG' ? UG_COURSES : PG_COURSES).map((course: CourseProgram) => (
                <div
                  key={course.id}
                  className="rounded-3xl border border-[#C9B6DF] bg-[#FBF8FD] p-5 flex flex-col justify-between hover:border-[#352A47] transition-all shadow-dream-soft group"
                >
                  <div>
                    {/* Header with Degree Badge and Listen Button */}
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-[#DFD1EC] px-2.5 py-0.5 text-[10px] font-heading font-bold text-[#352A47] border border-[#C9B6DF]">
                          {course.degree}
                        </span>
                        <span className="rounded-full bg-[#E8DDF2] px-2 py-0.5 text-[9px] font-heading font-semibold text-[#51465F]">
                          {course.abbreviation}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          handleSpeakItem(
                            course.narrationScript ||
                              `${course.name}. ${course.degree} degree program in the ${course.department}. ${course.description}`,
                            'courses'
                          )
                        }
                        title={`Listen to ${course.name} overview`}
                        className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#C9B6DF] bg-[#E8DDF2] text-[#352A47] hover:bg-[#352A47] hover:text-white transition cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#352A47]"
                        aria-label={`Listen to ${course.name} narration`}
                      >
                        <Volume2 size={13} />
                      </button>
                    </div>

                    <h3 className="text-sm font-heading font-extrabold text-[#352A47] group-hover:text-[#7A4465] transition-colors leading-snug">
                      {course.name}
                    </h3>
                    <p className="text-[11px] font-heading font-medium text-[#7A4465] mt-0.5 mb-2">
                      {course.department}
                    </p>
                    <p className="text-xs text-[#51465F] leading-relaxed mb-4">
                      {course.description}
                    </p>
                  </div>

                  {/* Actions: Campus Navigation (Only for verified physical buildings), plus Official Syllabus Link */}
                  <div className="border-t border-[#C9B6DF] pt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                    {course.buildingId ? (
                      <Link
                        to={`/navigation?to=${course.buildingId}`}
                        className="inline-flex min-h-[34px] items-center gap-1.5 rounded-xl border border-[#C9B6DF] bg-[#E8DDF2] hover:bg-[#D2BEE7] text-[#352A47] px-3 py-1 text-xs font-heading font-bold transition shadow-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-[#352A47]"
                        aria-label={`Navigate route to ${course.name} department building`}
                      >
                        <Route size={12} />
                        <span>Campus Navigation</span>
                      </Link>
                    ) : (
                      <div className="text-[11px] text-[#7A4465]/80 font-sans italic">
                        Campus location pending physical verification
                      </div>
                    )}

                    <a
                      href={course.officialUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="inline-flex items-center gap-1 text-[11px] font-heading font-bold text-[#51465F] hover:text-[#352A47] ml-auto focus:outline-none focus-visible:ring-2 focus-visible:ring-[#352A47] rounded-md px-1"
                    >
                      <span>Syllabus Info</span>
                      <ExternalLink size={11} />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* 2. SCHOLARSHIPS VIEW: Dedicated Groups (SC/ST, JITO, Central, PM/PS) */}
        {/* ============================================================== */}
        {activeCategory.id === 'scholarships' && (
          <div className="space-y-6">
            {/* Filter chips */}
            <div className="flex flex-wrap items-center gap-2 bg-[#FBF8FD] p-3 rounded-2xl border border-[#C9B6DF] shadow-xs">
              <span className="text-xs font-heading font-bold uppercase tracking-wider text-[#51465F] mr-1">
                Filter Scheme:
              </span>
              {['all', 'SC/ST', 'JITO', 'Central Government', 'PM/PS'].map((grp) => (
                <button
                  key={grp}
                  type="button"
                  onClick={() => setScholarshipGroup(grp)}
                  className={`min-h-[34px] px-3 py-1 rounded-xl text-xs font-heading font-bold transition cursor-pointer border ${
                    scholarshipGroup === grp
                      ? 'bg-[#352A47] text-white border-[#352A47] shadow-xs'
                      : 'border-[#C9B6DF] bg-[#E8DDF2] text-[#51465F] hover:text-[#352A47]'
                  }`}
                >
                  {grp === 'all' ? 'All Schemes (5)' : grp}
                </button>
              ))}
            </div>

            {/* Scholarships Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredScholarships.map((sch: ScholarshipScheme) => (
                <div
                  key={sch.id}
                  className="rounded-3xl border border-[#C9B6DF] bg-[#FBF8FD] p-5 flex flex-col justify-between hover:border-[#352A47] transition shadow-dream-soft"
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <span className="rounded-full bg-[#DFD1EC] px-2.5 py-0.5 text-[10px] font-heading font-bold text-[#352A47] border border-[#C9B6DF]">
                        {sch.group}
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          handleSpeakItem(
                            sch.narrationScript ||
                              `${sch.name}. Administered by ${sch.administeredBy}. ${sch.description} ${sch.verificationNotice}`,
                            'scholarships'
                          )
                        }
                        title={`Listen to ${sch.name} details`}
                        className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#C9B6DF] bg-[#E8DDF2] text-[#352A47] hover:bg-[#352A47] hover:text-white transition cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#352A47]"
                        aria-label={`Listen to ${sch.name} narration`}
                      >
                        <Volume2 size={13} />
                      </button>
                    </div>

                    <h3 className="text-sm font-heading font-extrabold text-[#352A47] leading-snug">
                      {sch.name}
                    </h3>
                    <p className="text-[11px] font-heading font-medium text-[#7A4465] mt-0.5 mb-2">
                      Administered by: {sch.administeredBy}
                    </p>
                    <p className="text-xs text-[#51465F] leading-relaxed mb-3">
                      {sch.description}
                    </p>

                    {sch.eligibilitySummary && (
                      <div className="rounded-xl bg-[#E8DDF2]/70 border border-[#C9B6DF] p-2.5 text-[11px] text-[#352A47] mb-3">
                        <span className="font-heading font-bold block mb-0.5">Eligibility Guideline:</span>
                        <span>{sch.eligibilitySummary}</span>
                      </div>
                    )}

                    <div className="rounded-xl bg-[#E8C8B9]/30 border border-[#D7A894] p-2.5 text-[11px] text-[#9E563A] mb-3 flex items-start gap-2">
                      <Info size={13} className="shrink-0 mt-0.5" />
                      <span>{sch.verificationNotice}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="border-t border-[#C9B6DF] pt-3 flex items-center justify-between gap-2">
                    {sch.officialUrl ? (
                      <a
                        href={sch.officialUrl}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="inline-flex min-h-[34px] items-center gap-1.5 rounded-xl bg-[#352A47] hover:bg-[#231B30] text-white px-3 py-1 text-xs font-heading font-bold transition shadow-xs"
                      >
                        <span>Official Source Portal</span>
                        <ExternalLink size={12} />
                      </a>
                    ) : (
                      <span className="text-[11px] text-[#51465F] italic">Official portal pending circular</span>
                    )}

                    <Link
                      to="/explore?building=main-block"
                      className="inline-flex min-h-[34px] items-center gap-1 text-[11px] font-heading font-bold text-[#51465F] hover:text-[#352A47]"
                    >
                      <MapPin size={11} />
                      <span>Scholarship Desk</span>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* 3. COMPANIES VIEW: Verified Recruiters & Placement Records */}
        {/* ============================================================== */}
        {activeCategory.id === 'placements' && (
          <div className="space-y-6">
            {/* Accreditation Highlight Banner */}
            <div className="rounded-3xl border border-[#94BCA7] bg-[#BCD8C9]/40 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#1E583F] text-white shrink-0 shadow-xs">
                  <CheckCircle2 size={20} />
                </div>
                <div>
                  <span className="text-[10px] font-heading font-bold uppercase tracking-wider text-[#1E583F]">
                    Accreditation &amp; Project Tie-up
                  </span>
                  <h3 className="text-sm sm:text-base font-heading font-extrabold text-[#1E583F]">
                    Accredited by M/s. Infosys
                  </h3>
                  <p className="text-xs text-[#1E583F]/90 mt-0.5 leading-relaxed">
                    MNMJEC has been accredited by Infosys and maintains an institutional tie-up for final year internships and industry project training.
                  </p>
                </div>
              </div>

              <a
                href="https://www.mnmjec.ac.in/placement.html"
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-[#1E583F] hover:bg-[#143d2c] text-white px-4 py-2 text-xs font-heading font-bold transition shadow-xs shrink-0 cursor-pointer"
              >
                <span>Official Placement Source</span>
                <ExternalLink size={13} />
              </a>
            </div>

            {/* Verified Recruiters Directory */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-heading font-bold uppercase tracking-wider text-[#51465F] flex items-center gap-2">
                  <Briefcase size={14} className="text-[#7A4465]" />
                  <span>Prominent Verified Corporate Recruiters (Official Records)</span>
                </h3>
                <span className="text-[10px] text-[#51465F] font-heading font-bold">
                  8 Verified Companies
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                {VERIFIED_COMPANIES_DATA.map((company: VerifiedCompany) => (
                  <div
                    key={company.id}
                    className="rounded-2xl border border-[#C9B6DF] bg-[#FBF8FD] p-4 flex flex-col justify-between hover:border-[#352A47] transition shadow-xs group"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="rounded-full bg-[#DFD1EC] px-2 py-0.5 text-[9px] font-heading font-bold text-[#352A47] border border-[#C9B6DF]">
                          {company.category}
                        </span>

                        <button
                          type="button"
                          onClick={() =>
                            handleSpeakItem(
                              company.narrationScript ||
                                `${company.name}. Category: ${company.category}. ${company.notes || ''}. Verified from MNMJEC placement records.`,
                              'placements'
                            )
                          }
                          title={`Listen to ${company.name} profile`}
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#C9B6DF] bg-[#E8DDF2] text-[#352A47] hover:bg-[#352A47] hover:text-white transition cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#352A47]"
                          aria-label={`Listen to ${company.name} narration`}
                        >
                          <Volume2 size={12} />
                        </button>
                      </div>

                      <h4 className="text-sm font-heading font-extrabold text-[#352A47] group-hover:text-[#7A4465] transition-colors">
                        {company.name}
                      </h4>
                      {company.notes && (
                        <p className="text-[11px] text-[#51465F] mt-1 line-clamp-2">
                          {company.notes}
                        </p>
                      )}
                    </div>

                    <div className="mt-3 pt-2 border-t border-[#C9B6DF] flex items-center justify-between text-[10px] text-[#51465F]">
                      <span className="truncate">{company.verificationSource}</span>
                      <a
                        href={company.officialUrl}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="text-[#7A4465] hover:text-[#352A47]"
                        title="View official placement record"
                      >
                        <ExternalLink size={11} />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Official Placement Documentation by Batch */}
            <div className="rounded-3xl border border-[#C9B6DF] bg-[#FBF8FD] p-5 sm:p-6 shadow-dream-card">
              <h3 className="text-sm font-heading font-extrabold uppercase tracking-wider text-[#352A47] flex items-center gap-2 mb-2">
                <FileText size={15} className="text-[#7A4465]" />
                <span>Audited Batch Placement Records (PDF Documents)</span>
              </h3>
              <p className="text-xs text-[#51465F] mb-4">
                Official documents published by the Training &amp; Placement Cell grouped by graduation batch:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {PLACEMENT_BATCH_RECORDS.map((batch: PlacementBatchRecord) => (
                  <a
                    key={batch.year}
                    href={batch.documentUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="flex items-center justify-between p-3.5 rounded-2xl border border-[#C9B6DF] bg-[#E8DDF2]/60 hover:bg-[#D2BEE7] text-[#352A47] transition shadow-xs group"
                  >
                    <div className="flex items-center gap-2.5">
                      <FileText size={16} className="text-[#7A4465] group-hover:text-[#352A47]" />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-heading font-bold">{batch.recordLabel}</span>
                          {batch.isNew && (
                            <span className="rounded-full bg-[#E63946] text-white px-1.5 py-0.2 text-[8px] font-heading font-bold">
                              NEW
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-[#51465F]">Official PDF</span>
                      </div>
                    </div>
                    <ExternalLink size={13} className="text-[#51465F] group-hover:text-[#352A47]" />
                  </a>
                ))}
              </div>

              {/* Disclaimer */}
              <p className="mt-4 text-[11px] text-[#51465F] italic border-t border-[#C9B6DF] pt-3">
                * Note: Placement records reflect historical campus hiring documentation. Appearing on historical recruiter lists does not imply guaranteed ongoing recruitment or fixed future hiring quotas.
              </p>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* Physical Facilities & Department Buildings in 3D */}
        {/* ============================================================== */}
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
