import { Bookmark, Cloud, Star, User } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { buildings } from '../data/buildings'
import { useSavedLocations } from '../hooks/useSavedLocations'

export function SavedLocationsScreen() {
  const { user, role } = useAuth()
  const { savedIds, remove } = useSavedLocations()
  const savedBuildings = buildings.filter((building) => savedIds.includes(building.id))

  const userDisplayName =
    role === 'admin'
      ? 'Campus Administrator'
      : role === 'student'
        ? user.name
        : 'Campus Guest (Visitor)'

  const userSubtitle =
    role === 'admin'
      ? 'MNMJEC Digital Campus • System Command'
      : role === 'student'
        ? 'MNMJEC Digital Campus • Student Portal'
        : 'MNMJEC Digital Campus • Guest Explorer'

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 md:p-6 bg-[#E8DDF2] text-[#352A47] min-h-[calc(100vh-4rem)] font-sans">
      <div className="rounded-3xl border border-[#C9B6DF] bg-[#FBF8FD] shadow-dream-card">
        <div className="border-b border-[#C9B6DF] p-4 md:p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#E8C8B9] text-[#352A47] border border-[#D9B4A3] shadow-xs">
                <User size={20} />
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-heading font-extrabold text-[#352A47]">{userDisplayName}</div>
                <div className="truncate text-xs font-sans text-[#51465F]">{userSubtitle}</div>
              </div>
            </div>
            <div className="rounded-full border border-[#C9B6DF] bg-[#DFD1EC] px-3 py-1 text-xs font-heading font-bold text-[#352A47] shrink-0">
              Locally Cached
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs font-sans text-[#51465F]">
            <Cloud size={16} className="text-[#7A4465] shrink-0" />
            <span>PWA Offline Ready: MNMJEC Map Data</span>
          </div>
        </div>

        <div className="p-4 md:p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-heading font-bold text-[#352A47]">
              <Bookmark size={18} className="text-[#7A4465]" />
              Quick Access &amp; Saved Places
            </div>
            <span className="text-xs font-heading font-bold text-[#51465F]">{savedBuildings.length} Bookmarks</span>
          </div>

          {savedBuildings.length === 0 ? (
            <div className="rounded-2xl border border-[#C9B6DF] bg-[#E8DDF2]/50 p-6 text-center text-sm font-sans text-[#51465F]">
              No saved locations yet. Add locations from Destination Search or 3D Explorer.
            </div>
          ) : (
            <div className="space-y-3">
              {savedBuildings.map((building) => (
                <article
                  key={building.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-[#C9B6DF] bg-[#E8DDF2]/60 p-3.5 hover:border-[#352A47] transition-all shadow-xs"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[#D9B4A3] bg-[#E8C8B9] text-[#9E563A]">
                      <Star size={18} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="truncate text-sm font-heading font-bold text-[#352A47]">{building.name}</p>
                        <span className="rounded-full border border-[#C9B6DF] bg-[#DFD1EC] px-2 py-0.5 text-[10px] font-sans text-[#51465F]">
                          {building.floorInfo.label}
                        </span>
                      </div>
                      <p className="truncate text-xs font-sans text-[#51465F] mt-0.5">Quick access bookmark</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <Link
                      to={`/navigation?to=${building.id}`}
                      className="rounded-xl bg-[#352A47] hover:bg-[#231B30] px-3.5 py-1.5 text-xs font-heading font-bold text-white shadow-dream-soft transition-all"
                    >
                      Navigate
                    </Link>
                    <button
                      type="button"
                      onClick={() => remove(building.id)}
                      className="rounded-xl border border-[#D7A894] bg-[#E8C8B9]/30 px-3 py-1.5 text-xs font-heading font-bold text-[#9E563A] hover:bg-[#E8C8B9]/60 transition-all cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-[#C9B6DF] bg-[#E8DDF2]/50 p-4">
              <div className="text-sm font-heading font-bold text-[#352A47]">Recent Routes</div>
              <div className="mt-3 space-y-2 text-sm font-sans text-[#51465F]">
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#7A4465]" />
                  Main Gate 1 → Physics Dept
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#7A4465]" />
                  Mechanical Block → Non-Jain Mess
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-[#C9B6DF] bg-[#E8DDF2]/50 p-4">
              <div className="text-sm font-heading font-bold text-[#352A47]">Campus Highlights</div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-sans text-[#51465F]">
                <div className="rounded-xl border border-[#C9B6DF] bg-[#FBF8FD] p-3 text-[#352A47] font-medium">Central Academic Quad</div>
                <div className="rounded-xl border border-[#C9B6DF] bg-[#FBF8FD] p-3 text-[#352A47] font-medium">IT &amp; Research Wings</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
