import { ArrowUpRight, BookmarkPlus, Building2, Compass, History, Info, MapPin, Search, Star, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { buildings } from '../data/buildings'
import { useSavedLocations } from '../hooks/useSavedLocations'

const SEARCH_CATEGORIES = ['All', 'Academic', 'Department', 'Facility'] as const
type SearchCategory = (typeof SEARCH_CATEGORIES)[number]

const QUICK_SUGGESTIONS = [
  { id: 'main-block', name: 'Main Block', subtitle: 'Admin & Principal Office' },
  { id: 'it-block', name: 'IT Block', subtitle: 'Information Technology' },
  { id: 'canteen', name: 'Canteen', subtitle: 'Campus Dining & Cafeteria' },
  { id: 'first-year-block', name: 'First Year Block', subtitle: 'Science & Humanities' },
]

export function SearchScreen() {
  const [query, setQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<SearchCategory>('All')
  const { isSaved, toggle } = useSavedLocations()

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return buildings.filter((building) => {
      const matchesCategory = selectedCategory === 'All' || building.category === selectedCategory
      if (!matchesCategory) return false
      if (!normalized) return true

      const matchesName = building.name.toLowerCase().includes(normalized)
      const matchesCat = building.category.toLowerCase().includes(normalized)
      const matchesAlias = building.aliases?.some((alias) => alias.toLowerCase().includes(normalized)) ?? false
      return matchesName || matchesCat || matchesAlias
    })
  }, [query, selectedCategory])

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 md:p-6 bg-[#E8DDF2] text-[#352A47] min-h-[calc(100vh-4rem)]">
      {/* Search Header Bar */}
      <div className="rounded-3xl border border-[#C9B6DF] bg-[#FBF8FD] shadow-dream-card">
        <div className="border-b border-[#C9B6DF] p-4 md:p-5">
          <div className="flex items-center gap-3 rounded-2xl border border-[#C9B6DF] bg-[#E8DDF2]/60 px-3.5 py-2.5 focus-within:border-[#352A47] focus-within:ring-2 focus-within:ring-[#D2BEE7] transition-all">
            <Search size={18} className="text-[#352A47] shrink-0" />
            <input
              type="search"
              placeholder="Search campus buildings, blocks, departments, or aliases (e.g. Admin, IT, CSE)..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="w-full bg-transparent text-sm text-[#352A47] outline-none placeholder:text-[#51465F]/70 font-sans"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="rounded-full p-1 text-[#51465F] hover:text-[#352A47]"
                title="Clear search query"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Category Filter Pills */}
          <div className="mt-3 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {SEARCH_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`rounded-2xl px-3.5 py-1.5 text-xs font-heading font-bold transition-all whitespace-nowrap cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-[#352A47] text-white shadow-dream-elevated'
                    : 'bg-[#E8DDF2] text-[#51465F] hover:bg-[#D2BEE7] hover:text-[#352A47] border border-[#C9B6DF]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Quick Suggestions based on genuine campus locations */}
        {!query && (
          <div className="p-4 md:p-5">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-heading font-bold uppercase tracking-wider text-[#51465F]">
                <History size={15} className="text-[#7A4465]" />
                <span>Frequently Visited Campus Blocks</span>
              </div>
            </div>

            <div className="grid gap-2.5 sm:grid-cols-2">
              {QUICK_SUGGESTIONS.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setQuery(item.name)}
                  className="flex items-center justify-between rounded-2xl border border-[#C9B6DF] bg-[#E8DDF2]/50 p-3 shadow-xs hover:border-[#352A47] hover:bg-[#D2BEE7]/60 transition-all cursor-pointer"
                >
                  <div className="min-w-0 pr-2">
                    <div className="text-sm font-heading font-bold text-[#352A47] truncate">{item.name}</div>
                    <div className="text-xs font-sans text-[#51465F] truncate">{item.subtitle}</div>
                  </div>
                  <ArrowUpRight size={16} className="text-[#352A47] shrink-0" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Buildings Results Grid */}
      {filtered.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-2">
          {filtered.map((building) => (
            <article
              key={building.id}
              className="rounded-3xl border border-[#C9B6DF] bg-[#FBF8FD] p-5 shadow-dream-soft hover:border-[#352A47] transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#D9B4A3] bg-[#E8C8B9] text-[#352A47] shadow-xs">
                    <Building2 size={22} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-[#C9B6DF] bg-[#DFD1EC] px-2.5 py-0.5 text-[10px] font-heading font-bold uppercase tracking-wider text-[#352A47]">
                        <MapPin size={11} />
                        {building.category}
                      </span>
                      <span className="rounded-full border border-[#C9B6DF] bg-[#E8DDF2] px-2 py-0.5 text-[10px] font-sans text-[#51465F]">
                        {building.floorInfo.label}
                      </span>
                    </div>
                    <h3 className="mt-1.5 text-base font-heading font-extrabold text-[#352A47] truncate">{building.name}</h3>
                    {building.aliases && building.aliases.length > 0 && (
                      <p className="mt-0.5 text-xs font-sans text-[#51465F] truncate">
                        <span className="text-[#51465F]/80">Also known as:</span> {building.aliases.join(', ')}
                      </p>
                    )}
                    {building.knownEntrance && (
                      <p className="mt-0.5 text-[11px] font-heading font-bold text-[#7A4465] flex items-center gap-1 truncate">
                        <span>Approach:</span> {building.knownEntrance}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => toggle(building.id)}
                    className={`rounded-2xl border p-2 transition-all shrink-0 cursor-pointer ${
                      isSaved(building.id)
                        ? 'border-[#D9B4A3] bg-[#E8C8B9] text-[#9E563A] shadow-xs'
                        : 'border-[#C9B6DF] bg-[#E8DDF2] text-[#51465F] hover:bg-[#D2BEE7] hover:text-[#352A47]'
                    }`}
                    aria-label={isSaved(building.id) ? 'Remove from saved locations' : 'Save location'}
                    title={isSaved(building.id) ? 'Remove from saved' : 'Save location'}
                  >
                    {isSaved(building.id) ? <Star size={16} fill="currentColor" /> : <BookmarkPlus size={16} />}
                  </button>
                </div>
              </div>

              <div className="mt-4 flex gap-2 pt-3 border-t border-[#C9B6DF]">
                <Link
                  to={`/navigation?to=${building.id}`}
                  className="flex-1 rounded-2xl bg-[#352A47] hover:bg-[#231B30] px-3 py-2 text-center text-xs font-heading font-bold text-white shadow-dream-soft transition-all"
                >
                  Directions
                </Link>
                <Link
                  to={`/explore?focus=${building.id}`}
                  className="flex-1 rounded-2xl border border-[#C9B6DF] bg-[#E8DDF2] px-3 py-2 text-center text-xs font-heading font-bold text-[#352A47] hover:bg-[#D2BEE7] transition-all flex items-center justify-center gap-1 shadow-xs"
                >
                  <Compass size={13} />
                  <span>3D View</span>
                </Link>
                <Link
                  to={`/building/${building.id}`}
                  className="rounded-2xl border border-[#C9B6DF] bg-[#FBF8FD] px-3 py-2 text-center text-xs font-heading font-bold text-[#51465F] hover:text-[#352A47] hover:bg-[#E8DDF2] transition-all shadow-xs"
                >
                  Details
                </Link>
              </div>
            </article>
          ))}
        </div>
      ) : (
        /* Empty Search State */
        <div className="rounded-3xl border border-[#C9B6DF] bg-[#FBF8FD] p-8 text-center shadow-dream-card">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#DFD1EC] text-[#352A47] border border-[#C9B6DF]">
            <Building2 size={28} />
          </div>
          <h3 className="mt-4 text-base font-heading font-extrabold text-[#352A47]">No buildings found</h3>
          <p className="mt-1 text-sm font-sans text-[#51465F]">
            No campus blocks match &quot;{query}&quot; in category &quot;{selectedCategory}&quot;.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {['Main Block', 'Canteen', 'IT Block', 'Hostel', 'Architecture'].map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => {
                  setQuery(name)
                  setSelectedCategory('All')
                }}
                className="rounded-2xl border border-[#C9B6DF] bg-[#E8DDF2] px-3 py-1.5 text-xs font-heading font-bold text-[#352A47] hover:bg-[#D2BEE7] cursor-pointer shadow-xs"
              >
                Try &quot;{name}&quot;
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Honest Campus Notice */}
      <div className="rounded-3xl border border-[#C9B6DF] bg-[#FBF8FD] p-4 shadow-dream-card">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[#E8C8B9] text-[#352A47] border border-[#D9B4A3] shadow-xs">
            <Info size={18} />
          </div>
          <div>
            <div className="text-sm font-heading font-bold text-[#352A47]">Campus Building Registry</div>
            <p className="mt-1 text-xs font-sans text-[#51465F] leading-relaxed">
              All displayed buildings and entrances match the authorized MNMJEC campus 3D model and verified walkway graph. Detailed indoor floor layouts remain provisional pending field survey mapping.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
