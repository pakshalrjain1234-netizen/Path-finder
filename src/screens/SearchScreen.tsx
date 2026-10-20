import { ArrowUpRight, BookmarkPlus, Building2, History, Info, MapPin, Search, Star } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { buildings } from '../data/buildings'
import { useSavedLocations } from '../hooks/useSavedLocations'

export function SearchScreen() {
  const [query, setQuery] = useState('')
  const { isSaved, toggle } = useSavedLocations()

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) {
      return buildings
    }

    return buildings.filter(
      (building) =>
        building.name.toLowerCase().includes(normalized) ||
        building.category.toLowerCase().includes(normalized)
    )
  }, [query])

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 md:p-6">
      <div className="rounded-3xl border border-white/10 bg-[#0B1220]/90 shadow-2xl backdrop-blur-xl">
        <div className="border-b border-white/10 p-4 md:p-5">
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#111827]/80 px-3 py-2 focus-within:border-cyan-500/50 focus-within:ring-1 focus-within:ring-cyan-500/50">
            <button type="button" className="rounded-lg p-2 text-cyan-400">
              <Search size={18} />
            </button>
            <input
              type="search"
              placeholder="Search classrooms, labs, departments, blocks..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="w-full bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-400"
            />
          </div>
        </div>

        <div className="p-4 md:p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
              <History size={18} className="text-cyan-400" />
              Recent Searches
            </div>
            <button type="button" className="text-xs font-medium text-cyan-400 hover:text-cyan-300">
              Clear
            </button>
          </div>

          <div className="space-y-2 rounded-2xl border border-white/10 bg-[#111827]/60 p-3">
            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-[#162033]/80 p-3 shadow-sm hover:border-cyan-500/30 transition-all cursor-pointer">
              <div>
                <div className="text-sm font-medium text-slate-100">IT Block - Computer Lab 3</div>
                <div className="text-xs text-slate-400">Floor 2 • bookmarked</div>
              </div>
              <ArrowUpRight size={16} className="text-slate-400" />
            </div>
            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-[#162033]/80 p-3 shadow-sm hover:border-cyan-500/30 transition-all cursor-pointer">
              <div>
                <div className="text-sm font-medium text-slate-100">Civil Block - Surveying Lab</div>
                <div className="text-xs text-slate-400">Ground floor • bookmarked</div>
              </div>
              <ArrowUpRight size={16} className="text-slate-400" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-2">
        {filtered.map((building, index) => (
          <article
            key={building.id}
            className="rounded-2xl border border-white/10 bg-[#0B1220]/90 p-4 shadow-glass backdrop-blur-xl hover:border-cyan-500/30 transition-all"
          >
            <div className="flex items-start gap-3">
              <div
                className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/10 ${
                  index % 2 === 0
                    ? 'bg-cyan-500/10 text-cyan-400'
                    : 'bg-indigo-500/10 text-indigo-400'
                }`}
              >
                <Building2 size={24} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-cyan-950/40 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-cyan-300">
                    <MapPin size={12} />
                    Campus model available
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-slate-400">
                    {building.floorInfo.label}
                  </span>
                </div>
                <h3 className="mt-2 text-sm font-semibold text-slate-100">{building.name}</h3>
                <p className="mt-0.5 text-xs text-slate-400">{building.category}</p>
              </div>
              <button
                type="button"
                onClick={() => toggle(building.id)}
                className={`rounded-xl border p-2 transition-all ${
                  isSaved(building.id)
                    ? 'border-amber-500/40 bg-amber-500/20 text-amber-300 shadow-sm'
                    : 'border-white/10 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                }`}
                aria-label={isSaved(building.id) ? 'Remove from saved locations' : 'Save location'}
              >
                {isSaved(building.id) ? <Star size={16} fill="currentColor" /> : <BookmarkPlus size={16} />}
              </button>
            </div>

            <div className="mt-4 flex gap-2">
              <Link
                to={`/navigation?to=${building.id}`}
                className="flex-1 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:from-blue-500 hover:to-cyan-400 transition-all"
              >
                Directions
              </Link>
              <Link
                to={`/building/${building.id}`}
                className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-center text-sm font-semibold text-cyan-300 hover:bg-white/10 transition-all"
              >
                3D View
              </Link>
            </div>
          </article>
        ))}
      </div>

      <div className="rounded-2xl border border-amber-500/25 bg-amber-950/30 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-amber-300">
            <Info size={18} />
          </div>
          <div>
            <div className="text-sm font-semibold text-amber-200">Search Notice • Survey Sync</div>
            <p className="mt-1 text-sm text-amber-300/80">
              Unverified or pending locations will remain marked as pending until the campus survey and Blender GLB positions are confirmed.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
