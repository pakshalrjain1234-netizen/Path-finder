import { Link } from 'react-router-dom'
import { buildings } from '../data/buildings'
import { useSavedLocations } from '../hooks/useSavedLocations'

export function SavedLocationsScreen() {
  const { savedIds, remove } = useSavedLocations()
  const savedBuildings = buildings.filter((building) => savedIds.includes(building.id))

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 md:p-6">
      <div className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
        <div className="border-b border-slate-200 p-4 md:p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#2A9D8F] text-white">
                <span className="material-symbols-outlined text-[20px]">account_circle</span>
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-slate-900">Arun K. (Student)</div>
                <div className="truncate text-xs text-slate-500">Dept. of Computer Science • 3rd Year</div>
              </div>
            </div>
            <div className="rounded-full bg-[#2A9D8F]/10 px-3 py-1 text-xs font-semibold text-[#2A9D8F]">100% Cached</div>
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
            <span className="material-symbols-outlined text-[16px] text-[#2A9D8F]">cloud_done</span>
            PWA Offline Ready: MNMJEC Map Data
          </div>
        </div>

        <div className="p-4 md:p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <span className="material-symbols-outlined text-[18px] text-[#2A9D8F]" style={{ fontVariationSettings: `'FILL' 1` }}>bookmark</span>
              Quick Access &amp; Saved Places
            </div>
            <span className="text-xs text-slate-500">{savedBuildings.length} Bookmarks</span>
          </div>

          {savedBuildings.length === 0 ? (
            <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 ring-1 ring-slate-200">
              No saved locations yet. Add locations from Destination Search.
            </div>
          ) : (
            <div className="space-y-3">
              {savedBuildings.map((building, index) => (
                <article key={building.id} className="flex items-center justify-between rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${index % 2 === 0 ? 'bg-[#2A9D8F]/10 text-[#2A9D8F]' : 'bg-[#E76F51]/10 text-[#E76F51]'}`}>
                      <span className="material-symbols-outlined text-[22px]">star</span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold text-slate-900">{building.name}</p>
                        <span className="rounded-full bg-[#2A9D8F]/10 px-2 py-0.5 text-[11px] text-[#2A9D8F]">{building.floorInfo.label}</span>
                      </div>
                      <p className="truncate text-xs text-slate-500">Quick access bookmark</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link to={`/building/${building.id}`} className="rounded-xl bg-[#2A9D8F] px-3 py-2 text-xs font-semibold text-white">
                      Navigate
                    </Link>
                    <button type="button" onClick={() => remove(building.id)} className="rounded-xl bg-white px-3 py-2 text-xs font-semibold text-[#E76F51] ring-1 ring-[#E76F51]/30">
                      Remove
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
              <div className="text-sm font-semibold text-slate-900">Recent Routes</div>
              <div className="mt-3 space-y-2 text-sm text-slate-600">
                <div>Main Gate 1 → Physics Dept</div>
                <div>Mechanical Block → Non-Jain Mess</div>
              </div>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
              <div className="text-sm font-semibold text-slate-900">Campus Highlights</div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-500">
                <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200">Central Academic Quad</div>
                <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200">IT &amp; Research Wings</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
