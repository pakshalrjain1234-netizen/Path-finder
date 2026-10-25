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
      <div className="mx-auto flex max-w-4xl flex-col gap-4 p-4 md:p-6">
        <SurfaceCard title="Building Details">
          <p className="text-sm text-[#94A3B8]">Building not found.</p>
          <Link to="/search" className="mt-3 inline-block text-sm text-[#60A5FA] hover:text-[#93C5FD] transition-colors">
            Go back to search
          </Link>
        </SurfaceCard>
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 md:p-6 text-[#F1F5F9]">
      <div className="grid gap-4 xl:grid-cols-[420px_1fr]">
        <section className="rounded-2xl border border-[#293A50] bg-[#162235] shadow-xl">
          <div className="border-b border-[#293A50] p-4 md:p-5">
            <nav className="flex items-center gap-1.5 text-xs text-[#94A3B8]">
              <Link to="/explore" className="hover:text-[#60A5FA] transition-colors">Campus Explorer</Link>
              <span>›</span>
              <span>{building.category}</span>
              <span>›</span>
              <span className="font-semibold text-[#60A5FA]">{building.name}</span>
            </nav>
          </div>

          <div className="space-y-4 p-4 md:p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="rounded-full border border-[#60A5FA]/30 bg-[#60A5FA]/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-[#93C5FD]">
                  Campus Model Available
                </span>
                <span className="rounded-full border border-[#293A50] bg-[#192638] px-2 py-0.5 text-[11px] text-[#94A3B8]">
                  {building.floorInfo.label}
                </span>
              </div>
              <span className="text-xs font-mono text-[#94A3B8]">ID: {building.id.toUpperCase()}</span>
            </div>

            <div>
              <h1 className="text-2xl font-bold tracking-tight text-[#F1F5F9]">{building.name}</h1>
              <p className="mt-1 text-sm text-[#94A3B8]">{building.category}</p>
              {building.aliases && building.aliases.length > 0 && (
                <p className="mt-1 text-xs text-[#94A3B8]">
                  <span className="text-[#64748B] font-medium">Known aliases:</span> {building.aliases.join(', ')}
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-[#293A50] bg-[#192638]/90 p-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-xs uppercase tracking-wider text-[#94A3B8]">Entrance</div>
                  <div className="mt-1 font-medium text-[#F1F5F9] text-xs">
                    {building.knownEntrance ?? 'Entrance approach via campus walkway'}
                  </div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wider text-[#94A3B8]">Vertical Span</div>
                  <div className="mt-1 font-medium text-[#F1F5F9] text-xs">{building.floorInfo.label}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wider text-[#94A3B8]">Indoor Navigation</div>
                  <div className="mt-1 font-medium text-amber-300/90 text-xs">Not mapped yet</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wider text-[#94A3B8]">Connectivity</div>
                  <div className="mt-1 font-medium text-[#F1F5F9] text-xs">Campus Network</div>
                </div>
              </div>
            </div>

            {building.notes && (
              <div className="rounded-2xl border border-amber-500/25 bg-amber-950/30 p-3 text-sm text-amber-200">
                {building.notes}
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Link
                to={`/navigation?to=${building.id}`}
                className="flex flex-1 items-center justify-center rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition-all min-w-[120px]"
              >
                Directions
              </Link>
              <Link
                to={`/explore?focus=${building.id}`}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-[#293A50] bg-[#192638] px-4 py-3 text-sm font-semibold text-[#60A5FA] hover:border-[#60A5FA]/40 hover:bg-[#162235] transition-colors"
              >
                <Compass size={16} />
                <span>3D View</span>
              </Link>
              <button
                type="button"
                onClick={() => toggle(building.id)}
                className={`flex items-center justify-center gap-1.5 rounded-xl border px-3 py-3 text-sm font-semibold transition-colors ${
                  isSaved(building.id)
                    ? 'border-amber-400/50 bg-amber-500/20 text-amber-300'
                    : 'border-[#293A50] bg-[#192638] text-[#94A3B8] hover:text-[#F1F5F9] hover:border-[#60A5FA]/30'
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
                className="rounded-xl border border-[#293A50] bg-[#192638] px-3 py-3 text-sm font-semibold text-[#94A3B8] hover:text-[#F1F5F9] hover:border-[#60A5FA]/30 transition-colors"
              >
                Share
              </button>
            </div>

            <div className="rounded-2xl border border-[#293A50] bg-[#192638]/90 p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-xs font-semibold uppercase tracking-wider text-[#94A3B8]">Floor Directory</div>
                <div className="text-xs text-[#64748B]">{building.floorInfo.label}</div>
              </div>
              <FloorSelector floors={floors} selectedFloor={selectedFloor} onSelectFloor={setSelectedFloor} />
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="rounded-2xl border border-[#293A50] bg-[#162235] p-4 shadow-xl md:p-5">
            <div className="flex items-center justify-between border-b border-[#293A50] pb-3 mb-3">
              <div>
                <div className="text-sm font-semibold text-[#F1F5F9]">Floor Level Status</div>
                <div className="text-xs text-[#94A3B8]">Mapping and accessibility status per level</div>
              </div>
              <span className="text-xs text-[#60A5FA] font-medium rounded-full bg-blue-500/10 border border-blue-500/20 px-2.5 py-0.5">
                {floors.length} {floors.length === 1 ? 'Level' : 'Levels'}
              </span>
            </div>
            <div className="grid gap-2">
              {floors.map((floor) => (
                <div
                  key={floor}
                  onClick={() => setSelectedFloor(floor)}
                  className={`rounded-xl p-3 border transition-all cursor-pointer ${
                    floor === selectedFloor
                      ? 'border-[#60A5FA]/50 bg-[#60A5FA]/10 text-[#93C5FD]'
                      : 'border-[#293A50] bg-[#192638] text-[#94A3B8] hover:border-[#60A5FA]/30 hover:text-[#F1F5F9]'
                  }`}
                >
                  <div className="text-sm font-medium">{floor}</div>
                  <div className={`text-xs ${floor === selectedFloor ? 'text-[#93C5FD]/80' : 'text-[#64748B]'}`}>
                    Indoor map not mapped yet
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-[#293A50] bg-[#162235] p-4 shadow-xl md:p-5">
            <div className="text-sm font-semibold text-[#F1F5F9]">Adjacent Campus Blocks</div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {buildings
                .filter((b) => b.id !== building.id && (b.category === building.category || b.category === 'Academic'))
                .slice(0, 4)
                .map((b) => (
                  <Link
                    key={b.id}
                    to={`/building/${b.id}`}
                    className="rounded-xl border border-[#293A50] bg-[#192638] p-3 hover:border-[#60A5FA]/40 hover:bg-[#1E2E44] transition-all block"
                  >
                    <div className="text-sm font-medium text-[#F1F5F9] truncate">{b.name}</div>
                    <div className="text-xs text-[#60A5FA] mt-0.5">{b.floorInfo.label}</div>
                  </Link>
                ))}
            </div>
          </div>

          <div className="rounded-2xl border border-[#293A50] bg-[#162235] p-4 shadow-xl md:p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#60A5FA]/10 text-[#60A5FA] border border-[#60A5FA]/20">
                <Info size={18} />
              </div>
              <p className="text-xs leading-relaxed text-[#94A3B8]">
                Floor counts and vertical spans provided based on campus 3D model. Detailed room maps remain pending until mapped.
              </p>
            </div>
          </div>
        </section>
      </div>

      <SurfaceCard title="Selected Floor" subtitle={`Current selection: ${selectedFloor}`}>
        <p className="text-sm text-[#94A3B8]">
          This is a layout scaffold only; indoor room numbers and anchor points will remain pending until verified against future GLB updates.
        </p>
      </SurfaceCard>
    </div>
  )
}
