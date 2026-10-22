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
          <p className="text-sm text-slate-300">Building not found.</p>
          <Link to="/search" className="mt-3 inline-block text-sm text-cyan-400 underline">
            Go back to search
          </Link>
        </SurfaceCard>
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 md:p-6">
      <div className="grid gap-4 xl:grid-cols-[420px_1fr]">
        <section className="rounded-3xl border border-white/10 bg-[#0B1220]/90 shadow-2xl backdrop-blur-xl">
          <div className="border-b border-white/10 p-4 md:p-5">
            <nav className="flex items-center gap-1.5 text-xs text-slate-400">
              <Link to="/explore" className="hover:text-cyan-300 transition-colors">Campus Explorer</Link>
              <span>›</span>
              <span>{building.category}</span>
              <span>›</span>
              <span className="font-semibold text-cyan-400">{building.name}</span>
            </nav>
          </div>

          <div className="space-y-4 p-4 md:p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="rounded-full border border-cyan-500/30 bg-cyan-950/40 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-cyan-300">
                  Campus model available
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-slate-400">
                  {building.floorInfo.label}
                </span>
              </div>
              <span className="text-xs font-mono text-slate-500">ID: {building.id.toUpperCase()}</span>
            </div>

            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-100">{building.name}</h1>
              <p className="mt-1 text-sm text-slate-400">{building.category}</p>
              {building.aliases && building.aliases.length > 0 && (
                <p className="mt-1 text-xs text-slate-400">
                  <span className="text-slate-500 font-medium">Known aliases:</span> {building.aliases.join(', ')}
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#111827]/80 p-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-xs uppercase tracking-wider text-slate-500">Entrance</div>
                  <div className="mt-1 font-medium text-slate-200 text-xs">
                    {building.knownEntrance ?? 'Entrance approach via campus walkway'}
                  </div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wider text-slate-500">Vertical Span</div>
                  <div className="mt-1 font-medium text-slate-200 text-xs">{building.floorInfo.label}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wider text-slate-500">Indoor Navigation</div>
                  <div className="mt-1 font-medium text-amber-300/90 text-xs">Not mapped yet</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wider text-slate-500">Connectivity</div>
                  <div className="mt-1 font-medium text-slate-200 text-xs">Campus Network</div>
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
                className="flex flex-1 items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 hover:from-blue-500 hover:to-cyan-400 transition-all min-w-[120px]"
              >
                Directions
              </Link>
              <Link
                to={`/explore?focus=${building.id}`}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-cyan-500/30 bg-cyan-950/30 px-4 py-3 text-sm font-semibold text-cyan-300 hover:bg-cyan-900/40 transition-colors"
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
                    : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
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
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm font-semibold text-slate-300 hover:bg-white/10 transition-colors"
              >
                Share
              </button>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#111827]/80 p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Floor Directory</div>
                <div className="text-xs text-slate-500">{building.floorInfo.label}</div>
              </div>
              <FloorSelector floors={floors} selectedFloor={selectedFloor} onSelectFloor={setSelectedFloor} />
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="rounded-3xl border border-white/10 bg-[#0B1220]/90 p-4 shadow-glass backdrop-blur-xl md:p-5">
            <div className="text-sm font-semibold text-slate-100">Floor Directory</div>
            <div className="mt-3 grid gap-2">
              {floors.map((floor) => (
                <div
                  key={floor}
                  onClick={() => setSelectedFloor(floor)}
                  className={`rounded-2xl p-3 border transition-all cursor-pointer ${
                    floor === selectedFloor
                      ? 'border-cyan-500/50 bg-cyan-950/50 text-cyan-200'
                      : 'border-white/5 bg-[#111827]/60 text-slate-300 hover:bg-white/5'
                  }`}
                >
                  <div className="text-sm font-medium">{floor}</div>
                  <div className={`text-xs ${floor === selectedFloor ? 'text-cyan-300/80' : 'text-slate-500'}`}>
                    Indoor map not mapped yet
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-[#0B1220]/90 p-4 shadow-glass backdrop-blur-xl md:p-5">
            <div className="text-sm font-semibold text-slate-100">Adjacent Blocks</div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {buildings
                .filter((b) => b.id !== building.id && (b.category === building.category || b.category === 'Academic'))
                .slice(0, 4)
                .map((b) => (
                  <Link
                    key={b.id}
                    to={`/building/${b.id}`}
                    className="rounded-2xl border border-white/10 bg-[#111827]/80 p-3 hover:border-cyan-500/40 hover:bg-[#162033] transition-all block"
                  >
                    <div className="text-sm font-medium text-slate-200 truncate">{b.name}</div>
                    <div className="text-xs text-cyan-400">{b.floorInfo.label}</div>
                  </Link>
                ))}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-[#0B1220]/90 p-4 shadow-glass backdrop-blur-xl md:p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <Info size={20} />
              </div>
              <p className="text-sm text-slate-400">
                Floor counts and vertical spans provided based on campus 3D model. Detailed room maps remain pending until mapped.
              </p>
            </div>
          </div>
        </section>
      </div>

      <SurfaceCard title="Selected Floor" subtitle={`Current selection: ${selectedFloor}`}>
        <p className="text-sm text-slate-400">
          This is a layout scaffold only; indoor room numbers and anchor points will remain pending until verified against future GLB updates.
        </p>
      </SurfaceCard>
    </div>
  )
}
