import { ArrowUpRight, BookmarkPlus, Search, Star } from 'lucide-react'
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

    return buildings.filter((building) => building.name.toLowerCase().includes(normalized) || building.category.toLowerCase().includes(normalized))
  }, [query])

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 md:p-6">
      <div className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
        <div className="border-b border-slate-200 p-4 md:p-5">
          <div className="flex items-center gap-3 rounded-2xl bg-slate-50 px-3 py-2 ring-1 ring-slate-200 focus-within:ring-[#2A9D8F]/30">
            <button type="button" className="rounded-lg p-2 text-slate-500">
              <Search size={18} />
            </button>
            <input
              type="search"
              placeholder="Search classrooms, labs, departments, blocks..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
            />
          </div>
        </div>

        <div className="p-4 md:p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <span className="material-symbols-outlined text-[18px] text-[#2A9D8F]">history</span>
              Recent Searches
            </div>
            <button type="button" className="text-xs font-medium text-[#2A9D8F]">
              Clear
            </button>
          </div>

          <div className="space-y-2 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
            <div className="flex items-center justify-between rounded-xl bg-white p-3 shadow-sm ring-1 ring-slate-200">
              <div>
                <div className="text-sm font-medium text-slate-800">IT Block - Computer Lab 3</div>
                <div className="text-xs text-slate-500">Floor 2 • bookmarked</div>
              </div>
              <ArrowUpRight size={16} className="text-slate-400" />
            </div>
            <div className="flex items-center justify-between rounded-xl bg-white p-3 shadow-sm ring-1 ring-slate-200">
              <div>
                <div className="text-sm font-medium text-slate-800">Civil Block - Surveying Lab</div>
                <div className="text-xs text-slate-500">Ground floor • bookmarked</div>
              </div>
              <ArrowUpRight size={16} className="text-slate-400" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-2">
        {filtered.map((building, index) => (
          <article key={building.id} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <div className="flex items-start gap-3">
              <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${index % 2 === 0 ? 'bg-[#2A9D8F]/10 text-[#2A9D8F]' : 'bg-[#E76F51]/10 text-[#E76F51]'}`}>
                <span className="material-symbols-outlined text-[24px]">apartment</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#2A9D8F]/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-[#2A9D8F]">
                    <span className="material-symbols-outlined text-[13px]" style={{ fontVariationSettings: `'FILL' 1` }}>verified</span>
                    Verified
                  </span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">{building.floorInfo.label}</span>
                </div>
                <h3 className="mt-2 text-sm font-semibold text-slate-900">{building.name}</h3>
                <p className="mt-0.5 text-xs text-slate-500">{building.category}</p>
              </div>
              <button
                type="button"
                onClick={() => toggle(building.id)}
                className={`rounded-xl p-2 ${isSaved(building.id) ? 'bg-[#E76F51] text-white' : 'bg-slate-100 text-slate-600'}`}
                aria-label={isSaved(building.id) ? 'Remove from saved locations' : 'Save location'}
              >
                {isSaved(building.id) ? <Star size={16} fill="currentColor" /> : <BookmarkPlus size={16} />}
              </button>
            </div>

            <div className="mt-4 flex gap-2">
              <Link to={`/building/${building.id}`} className="flex-1 rounded-xl bg-[#2A9D8F] px-3 py-2 text-center text-sm font-semibold text-white shadow-sm">
                Directions
              </Link>
              <Link to={`/building/${building.id}`} className="flex-1 rounded-xl bg-slate-100 px-3 py-2 text-center text-sm font-semibold text-[#2A9D8F]">
                3D View
              </Link>
            </div>
          </article>
        ))}
      </div>

      <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#E76F51]/10 text-[#E76F51]">
            <span className="material-symbols-outlined text-[20px]">info</span>
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-900">Search Notice • Survey Sync</div>
            <p className="mt-1 text-sm text-slate-600">
              Unverified or pending locations will remain marked as pending until the campus survey and Blender GLB positions are confirmed.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
