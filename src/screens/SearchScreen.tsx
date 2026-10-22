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
    <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 md:p-6">
      {/* Search Header Bar */}
      <div className="rounded-3xl border border-white/10 bg-[#0B1220]/90 shadow-2xl backdrop-blur-xl">
        <div className="border-b border-white/10 p-4 md:p-5">
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#111827]/80 px-3 py-2.5 focus-within:border-cyan-500/50 focus-within:ring-1 focus-within:ring-cyan-500/50">
            <Search size={18} className="text-cyan-400 shrink-0" />
            <input
              type="search"
              placeholder="Search campus buildings, blocks, departments, or aliases (e.g. Admin, Hostel, CSE)..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="w-full bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-400"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="rounded-full p-1 text-slate-400 hover:text-white"
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
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all whitespace-nowrap ${
                  selectedCategory === cat
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30 border border-blue-400/40'
                    : 'bg-[#162033] text-slate-300 hover:bg-[#1B2540] hover:text-white border border-white/5'
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
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                <History size={15} className="text-cyan-400" />
                <span>Frequently Visited Campus Blocks</span>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              {QUICK_SUGGESTIONS.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setQuery(item.name)}
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-[#162033]/80 p-3 shadow-sm hover:border-cyan-500/40 hover:bg-[#1B2540] transition-all cursor-pointer"
                >
                  <div className="min-w-0 pr-2">
                    <div className="text-sm font-semibold text-slate-100 truncate">{item.name}</div>
                    <div className="text-xs text-slate-400 truncate">{item.subtitle}</div>
                  </div>
                  <ArrowUpRight size={16} className="text-cyan-400 shrink-0" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Buildings Results Grid */}
      {filtered.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-2">
          {filtered.map((building, index) => (
            <article
              key={building.id}
              className="rounded-2xl border border-white/10 bg-[#0B1220]/90 p-4 shadow-glass backdrop-blur-xl hover:border-cyan-500/30 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start gap-3">
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 ${
                      index % 2 === 0
                        ? 'bg-cyan-500/10 text-cyan-400'
                        : 'bg-indigo-500/10 text-indigo-400'
                    }`}
                  >
                    <Building2 size={22} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-cyan-950/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-cyan-300">
                        <MapPin size={11} />
                        {building.category}
                      </span>
                      <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-slate-400">
                        {building.floorInfo.label}
                      </span>
                    </div>
                    <h3 className="mt-1.5 text-base font-bold text-slate-100 truncate">{building.name}</h3>
                    {building.aliases && building.aliases.length > 0 && (
                      <p className="mt-0.5 text-xs text-slate-400 truncate">
                        <span className="text-slate-500">Also known as:</span> {building.aliases.join(', ')}
                      </p>
                    )}
                    {building.knownEntrance && (
                      <p className="mt-0.5 text-[11px] text-cyan-300/80 flex items-center gap-1 truncate">
                        <span>Approach:</span> {building.knownEntrance}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => toggle(building.id)}
                    className={`rounded-xl border p-2 transition-all shrink-0 ${
                      isSaved(building.id)
                        ? 'border-amber-500/40 bg-amber-500/20 text-amber-300 shadow-sm'
                        : 'border-white/10 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                    }`}
                    aria-label={isSaved(building.id) ? 'Remove from saved locations' : 'Save location'}
                    title={isSaved(building.id) ? 'Remove from saved' : 'Save location'}
                  >
                    {isSaved(building.id) ? <Star size={16} fill="currentColor" /> : <BookmarkPlus size={16} />}
                  </button>
                </div>
              </div>

              <div className="mt-4 flex gap-2 pt-2 border-t border-white/5">
                <Link
                  to={`/navigation?to=${building.id}`}
                  className="flex-1 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 px-3 py-2 text-center text-xs font-bold text-white shadow-sm hover:from-blue-500 hover:to-cyan-400 transition-all"
                >
                  Directions
                </Link>
                <Link
                  to={`/explore?focus=${building.id}`}
                  className="flex-1 rounded-xl border border-cyan-500/30 bg-cyan-950/30 px-3 py-2 text-center text-xs font-semibold text-cyan-300 hover:bg-cyan-900/40 transition-all flex items-center justify-center gap-1"
                >
                  <Compass size={13} />
                  <span>3D View</span>
                </Link>
                <Link
                  to={`/building/${building.id}`}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-center text-xs font-semibold text-slate-300 hover:bg-white/10 transition-all"
                >
                  Details
                </Link>
              </div>
            </article>
          ))}
        </div>
      ) : (
        /* Empty Search State */
        <div className="rounded-3xl border border-white/10 bg-[#0B1220]/90 p-8 text-center shadow-glass backdrop-blur-xl">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 text-slate-400 border border-white/10">
            <Building2 size={28} />
          </div>
          <h3 className="mt-4 text-base font-bold text-white">No buildings found</h3>
          <p className="mt-1 text-sm text-slate-400">
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
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-cyan-300 hover:bg-white/10"
              >
                Try &quot;{name}&quot;
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Honest Campus Notice */}
      <div className="rounded-2xl border border-cyan-500/20 bg-cyan-950/20 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cyan-500/20 text-cyan-300">
            <Info size={18} />
          </div>
          <div>
            <div className="text-sm font-semibold text-cyan-200">Campus Building Registry</div>
            <p className="mt-1 text-xs text-slate-400 leading-relaxed">
              All displayed buildings and entrances match the authorized MNMJEC campus 3D model and verified walkway graph. Detailed indoor floor layouts remain provisional pending field survey mapping.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
