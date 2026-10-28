import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { BookmarkPlus, Compass, Info, Star } from 'lucide-react'
import { FloorSelector } from '../components/FloorSelector'
import { SurfaceCard } from '../components/SurfaceCard'
import { buildings, buildingIndex } from '../data/buildings'
import { useSavedLocations } from '../hooks/useSavedLocations'

function floorsFromLabel(label: string) {
  const normalized = label.toLowerCase()

  if (normalized.startsWith('g+')) {
    const top = Number(normalized.replace('g+', ''))
    if (!Number.isFinite(top)) {
      return ['Unknown']
    }
    return ['Ground', ...Array.from({ length: top }, (_, index) => `${index + 1} Floor`)]
  }

  if (normalized.includes('ground only')) {
    return ['Ground']
  }

  if (normalized.includes('single elevated')) {
    return ['Elevated Level']
  }

  return ['Unknown']
}

export function BuildingDetailsScreen() {
  const { buildingId } = useParams()
  const building = buildingId ? buildingIndex[buildingId] : undefined
  const floors = useMemo(() => floorsFromLabel(building?.floorInfo.label ?? 'Unknown'), [building?.floorInfo.label])
  const [selectedFloor, setSelectedFloor] = useState(floors[0])
  const { isSaved, toggle } = useSavedLocations()

  if (!building) {
    return (
      <div className="mx-auto flex max-w-4xl flex-col gap-4 p-4 md:p-6 bg-[#E8DDF2] text-[#352A47] min-h-[calc(100vh-4rem)]">
        <SurfaceCard title="Building Details">
          <p className="text-sm font-sans text-[#51465F]">Building not found.</p>
          <Link to="/search" className="mt-3 inline-block text-sm font-heading font-bold text-[#7A4465] hover:text-[#352A47] underline">
            Go back to search
          </Link>
        </SurfaceCard>
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 md:p-6 bg-[#E8DDF2] text-[#352A47] min-h-[calc(100vh-4rem)] font-sans">
      <div className="grid gap-4 xl:grid-cols-[420px_1fr]">
        <section className="rounded-3xl border border-[#C9B6DF] bg-[#FBF8FD] shadow-dream-card">
          <div className="border-b border-[#C9B6DF] p-4 md:p-5">
            <nav className="flex items-center gap-1.5 text-xs text-[#51465F]">
              <Link to="/explore" className="hover:text-[#352A47] transition-colors font-medium">Campus Explorer</Link>
              <span>›</span>
              <span>{building.category}</span>
              <span>›</span>
              <span className="font-heading font-bold text-[#352A47]">{building.name}</span>
            </nav>
          </div>

          <div className="space-y-4 p-4 md:p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="rounded-full border border-[#D9B4A3] bg-[#E8C8B9] px-2.5 py-0.5 text-[11px] font-heading font-bold text-[#352A47]">
                  Campus Model Available
                </span>
                <span className="rounded-full border border-[#C9B6DF] bg-[#DFD1EC] px-2 py-0.5 text-[11px] font-heading font-semibold text-[#51465F]">
                  {building.floorInfo.label}
                </span>
              </div>
              <span className="text-xs font-mono text-[#51465F]">ID: {building.id.toUpperCase()}</span>
            </div>

            <div>
              <h1 className="font-editorial text-2xl sm:text-3xl font-extrabold tracking-tight text-[#352A47]">{building.name}</h1>
              <p className="mt-1 text-sm font-sans text-[#51465F]">{building.category}</p>
              {building.aliases && building.aliases.length > 0 && (
                <p className="mt-1 text-xs font-sans text-[#51465F]">
                  <span className="text-[#7A4465] font-bold">Known aliases:</span> {building.aliases.join(', ')}
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-[#C9B6DF] bg-[#E8DDF2]/60 p-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-xs font-heading font-bold uppercase tracking-wider text-[#51465F]">Entrance</div>
                  <div className="mt-1 font-medium text-[#352A47] text-xs">
                    {building.knownEntrance ?? 'Entrance approach via campus walkway'}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-heading font-bold uppercase tracking-wider text-[#51465F]">Vertical Span</div>
                  <div className="mt-1 font-medium text-[#352A47] text-xs">{building.floorInfo.label}</div>
                </div>
                <div>
                  <div className="text-xs font-heading font-bold uppercase tracking-wider text-[#51465F]">Indoor Navigation</div>
                  <div className="mt-1 font-medium text-[#9E563A] text-xs">Not mapped yet</div>
                </div>
                <div>
                  <div className="text-xs font-heading font-bold uppercase tracking-wider text-[#51465F]">Connectivity</div>
                  <div className="mt-1 font-medium text-[#352A47] text-xs">Campus Network</div>
                </div>
              </div>
            </div>

            {building.notes && (
              <div className="rounded-2xl border border-[#D7A894] bg-[#E8C8B9]/30 p-3 text-sm text-[#9E563A] font-sans">
                {building.notes}
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Link
                to={`/navigation?to=${building.id}`}
                className="flex flex-1 items-center justify-center rounded-2xl bg-[#352A47] hover:bg-[#231B30] px-4 py-3 text-sm font-heading font-bold text-white shadow-dream-soft transition-all min-w-[120px]"
              >
                Directions
              </Link>
              <Link
                to={`/explore?focus=${building.id}`}
                className="flex items-center justify-center gap-1.5 rounded-2xl border border-[#C9B6DF] bg-[#E8DDF2] px-4 py-3 text-sm font-heading font-bold text-[#352A47] hover:bg-[#D2BEE7] transition-colors shadow-xs"
              >
                <Compass size={16} />
                <span>3D View</span>
              </Link>
              <button
                type="button"
                onClick={() => toggle(building.id)}
                className={`flex items-center justify-center gap-1.5 rounded-2xl border px-3 py-3 text-sm font-heading font-bold transition-colors cursor-pointer shadow-xs ${
                  isSaved(building.id)
                    ? 'border-[#D9B4A3] bg-[#E8C8B9] text-[#9E563A]'
                    : 'border-[#C9B6DF] bg-[#E8DDF2] text-[#51465F] hover:text-[#352A47] hover:bg-[#D2BEE7]'
                }`}
                title={isSaved(building.id) ? 'Remove from saved' : 'Save location'}
              >
                {isSaved(building.id) ? <Star size={16} fill="currentColor" /> : <BookmarkPlus size={16} />}
                <span>{isSaved(building.id) ? 'Saved' : 'Save'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({ title: building.name, url: window.location.href }).catch(() => {})
                  } else {
                    navigator.clipboard.writeText(window.location.href)
                    alert('Building link copied to clipboard!')
                  }
                }}
                className="rounded-2xl border border-[#C9B6DF] bg-[#FBF8FD] px-3 py-3 text-sm font-heading font-bold text-[#51465F] hover:text-[#352A47] hover:bg-[#E8DDF2] transition-colors cursor-pointer shadow-xs"
              >
                Share
              </button>
            </div>

            <div className="rounded-2xl border border-[#C9B6DF] bg-[#E8DDF2]/60 p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-xs font-heading font-bold uppercase tracking-wider text-[#51465F]">Floor Directory</div>
                <div className="text-xs font-sans text-[#51465F]">{building.floorInfo.label}</div>
              </div>
              <FloorSelector floors={floors} selectedFloor={selectedFloor} onSelectFloor={setSelectedFloor} />
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="rounded-3xl border border-[#C9B6DF] bg-[#FBF8FD] p-4 shadow-dream-card md:p-5">
            <div className="flex items-center justify-between border-b border-[#C9B6DF] pb-3 mb-3">
              <div>
                <div className="text-sm font-heading font-bold text-[#352A47]">Floor Level Status</div>
                <div className="text-xs text-[#51465F]">Mapping and accessibility status per level</div>
              </div>
              <span className="text-xs font-heading font-bold text-[#352A47] rounded-full bg-[#DFD1EC] border border-[#C9B6DF] px-2.5 py-0.5">
                {floors.length} {floors.length === 1 ? 'Level' : 'Levels'}
              </span>
            </div>
            <div className="grid gap-2">
              {floors.map((floor) => (
                <div
                  key={floor}
                  onClick={() => setSelectedFloor(floor)}
                  className={`rounded-2xl p-3 border transition-all cursor-pointer ${
                    floor === selectedFloor
                      ? 'border-[#352A47] bg-[#352A47] text-white shadow-dream-soft'
                      : 'border-[#C9B6DF] bg-[#E8DDF2]/60 text-[#51465F] hover:border-[#352A47] hover:text-[#352A47]'
                  }`}
                >
                  <div className="text-sm font-heading font-bold">{floor}</div>
                  <div className={`text-xs ${floor === selectedFloor ? 'text-[#FAF6FD]/80' : 'text-[#51465F]'}`}>
                    Indoor map not mapped yet
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-[#C9B6DF] bg-[#FBF8FD] p-4 shadow-dream-card md:p-5">
            <div className="text-sm font-heading font-bold text-[#352A47]">Adjacent Campus Blocks</div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {buildings
                .filter((b) => b.id !== building.id && (b.category === building.category || b.category === 'Academic'))
                .slice(0, 4)
                .map((b) => (
                  <Link
                    key={b.id}
                    to={`/building/${b.id}`}
                    className="rounded-2xl border border-[#C9B6DF] bg-[#E8DDF2]/50 p-3 hover:border-[#352A47] hover:bg-[#D2BEE7]/60 transition-all block shadow-xs"
                  >
                    <div className="text-sm font-heading font-bold text-[#352A47] truncate">{b.name}</div>
                    <div className="text-xs font-sans text-[#7A4465] mt-0.5">{b.floorInfo.label}</div>
                  </Link>
                ))}
            </div>
          </div>

          <div className="rounded-3xl border border-[#C9B6DF] bg-[#FBF8FD] p-4 shadow-dream-card md:p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[#E8C8B9] text-[#352A47] border border-[#D9B4A3] shadow-xs">
                <Info size={18} />
              </div>
              <p className="text-xs leading-relaxed text-[#51465F] font-sans">
                Floor counts and vertical spans provided based on campus 3D model. Detailed room maps remain pending until mapped.
              </p>
            </div>
          </div>
        </section>
      </div>

      <SurfaceCard title="Selected Floor" subtitle={`Current selection: ${selectedFloor}`}>
        <p className="text-sm text-[#51465F] font-sans">
          This is a layout scaffold only; indoor room numbers and anchor points will remain pending until verified against future GLB updates.
        </p>
      </SurfaceCard>
    </div>
  )
}
