import { Bookmark, Cloud, Star, User } from 'lucide-react'
import { Link } from 'react-router-dom'
import { buildings } from '../data/buildings'
import { useSavedLocations } from '../hooks/useSavedLocations'

export function SavedLocationsScreen() {
  const { savedIds, remove } = useSavedLocations()
  const savedBuildings = buildings.filter((building) => savedIds.includes(building.id))

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 md:p-6 text-[#F1F5F9]">
      <div className="rounded-3xl border border-[#293A50] bg-[#162235]/90 shadow-2xl backdrop-blur-xl">
        <div className="border-b border-[#293A50] p-4 md:p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#2563EB] text-white shadow-sm shadow-blue-500/20">
                <User size={20} />
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-[#F1F5F9]">Campus Member (Student)</div>
                <div className="truncate text-xs text-[#94A3B8]">MNMJEC Digital Campus • Student Portal</div>
              </div>
            </div>
            <div className="rounded-full border border-[#60A5FA]/30 bg-[#60A5FA]/10 px-3 py-1 text-xs font-semibold text-[#93C5FD]">
              Locally Cached
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs text-[#94A3B8]">
            <Cloud size={16} className="text-[#60A5FA]" />
            PWA Offline Ready: MNMJEC Map Data
          </div>
        </div>

        <div className="p-4 md:p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#F1F5F9]">
              <Bookmark size={18} className="text-[#60A5FA]" />
              Quick Access &amp; Saved Places
            </div>
            <span className="text-xs text-[#94A3B8]">{savedBuildings.length} Bookmarks</span>
          </div>

          {savedBuildings.length === 0 ? (
            <div className="rounded-2xl border border-[#293A50] bg-[#192638]/60 p-4 text-sm text-[#94A3B8]">
              No saved locations yet. Add locations from Destination Search.
            </div>
          ) : (
            <div className="space-y-3">
              {savedBuildings.map((building) => (
                <article
                  key={building.id}
                  className="flex items-center justify-between rounded-2xl border border-[#293A50] bg-[#192638]/80 p-3 hover:border-[#60A5FA]/30 transition-all"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#293A50] bg-[#60A5FA]/10 text-[#60A5FA]">
                      <Star size={20} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold text-[#F1F5F9]">{building.name}</p>
                        <span className="rounded-full border border-[#293A50] bg-[#162235] px-2 py-0.5 text-[11px] text-[#94A3B8]">
                          {building.floorInfo.label}
                        </span>
                      </div>
                      <p className="truncate text-xs text-[#94A3B8]">Quick access bookmark</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/navigation?to=${building.id}`}
                      className="rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition-all"
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
            <div className="rounded-2xl border border-[#293A50] bg-[#192638]/80 p-4">
              <div className="text-sm font-semibold text-[#F1F5F9]">Recent Routes</div>
              <div className="mt-3 space-y-2 text-sm text-[#94A3B8]">
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#60A5FA]" />
                  Main Gate 1 → Physics Dept
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#60A5FA]" />
                  Mechanical Block → Non-Jain Mess
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-[#293A50] bg-[#192638]/80 p-4">
              <div className="text-sm font-semibold text-[#F1F5F9]">Campus Highlights</div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-[#94A3B8]">
                <div className="rounded-xl border border-[#293A50] bg-[#162235] p-3 text-[#F1F5F9]">Central Academic Quad</div>
                <div className="rounded-xl border border-[#293A50] bg-[#162235] p-3 text-[#F1F5F9]">IT &amp; Research Wings</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
