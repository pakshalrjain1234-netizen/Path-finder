import { Bookmark, Cloud, Star, User } from 'lucide-react'
import { Link } from 'react-router-dom'
import { buildings } from '../data/buildings'
import { useSavedLocations } from '../hooks/useSavedLocations'

export function SavedLocationsScreen() {
  const { savedIds, remove } = useSavedLocations()
  const savedBuildings = buildings.filter((building) => savedIds.includes(building.id))

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 md:p-6">
      <div className="rounded-3xl border border-white/10 bg-[#0B1220]/90 shadow-2xl backdrop-blur-xl">
        <div className="border-b border-white/10 p-4 md:p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white shadow-sm shadow-cyan-500/20">
                <User size={20} />
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-slate-100">Arun K. (Student)</div>
                <div className="truncate text-xs text-slate-400">Dept. of Computer Science • 3rd Year</div>
              </div>
            </div>
            <div className="rounded-full border border-cyan-500/30 bg-cyan-950/40 px-3 py-1 text-xs font-semibold text-cyan-300">
              Locally Cached
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
            <Cloud size={16} className="text-cyan-400" />
            PWA Offline Ready: MNMJEC Map Data
          </div>
        </div>

        <div className="p-4 md:p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
              <Bookmark size={18} className="text-cyan-400" />
              Quick Access &amp; Saved Places
            </div>
            <span className="text-xs text-slate-400">{savedBuildings.length} Bookmarks</span>
          </div>

          {savedBuildings.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-[#111827]/60 p-4 text-sm text-slate-400">
              No saved locations yet. Add locations from Destination Search.
            </div>
          ) : (
            <div className="space-y-3">
              {savedBuildings.map((building, index) => (
                <article
                  key={building.id}
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-[#111827]/80 p-3 hover:border-cyan-500/30 transition-all"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className={`flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 ${
                        index % 2 === 0 ? 'bg-cyan-500/10 text-cyan-400' : 'bg-indigo-500/10 text-indigo-400'
                      }`}
                    >
                      <Star size={20} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold text-slate-100">{building.name}</p>
                        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-slate-400">
                          {building.floorInfo.label}
                        </span>
                      </div>
                      <p className="truncate text-xs text-slate-400">Quick access bookmark</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/navigation?to=${building.id}`}
                      className="rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:from-blue-500 hover:to-cyan-400 transition-all"
                    >
                      Navigate
                    </Link>
                    <button
                      type="button"
                      onClick={() => remove(building.id)}
                      className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-500/20 transition-all"
                    >
                      Remove
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-[#111827]/80 p-4">
              <div className="text-sm font-semibold text-slate-200">Recent Routes</div>
              <div className="mt-3 space-y-2 text-sm text-slate-400">
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                  Main Gate 1 → Physics Dept
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                  Mechanical Block → Non-Jain Mess
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-[#111827]/80 p-4">
              <div className="text-sm font-semibold text-slate-200">Campus Highlights</div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-300">
                <div className="rounded-xl border border-white/10 bg-[#162033]/80 p-3">Central Academic Quad</div>
                <div className="rounded-xl border border-white/10 bg-[#162033]/80 p-3">IT &amp; Research Wings</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
