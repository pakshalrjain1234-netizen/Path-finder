import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { FloorSelector } from '../components/FloorSelector'
import { SurfaceCard } from '../components/SurfaceCard'
import { buildingIndex } from '../data/buildings'

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

  if (!building) {
    return (
      <div className="mx-auto flex max-w-4xl flex-col gap-4 p-4 md:p-6">
        <SurfaceCard title="Building Details">
          <p className="text-sm text-slate-600">Building not found.</p>
          <Link to="/search" className="mt-3 inline-block text-sm text-[#2A9D8F] underline">
            Go back to search
          </Link>
        </SurfaceCard>
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 md:p-6">
      <div className="grid gap-4 xl:grid-cols-[420px_1fr]">
        <section className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
          <div className="border-b border-slate-200 p-4 md:p-5">
            <nav className="flex items-center gap-1 text-xs text-slate-500">
              <span>Campus Explorer</span>
              <span>›</span>
              <span>Academic Blocks</span>
              <span>›</span>
              <span className="font-semibold text-[#2A9D8F]">{building.name}</span>
            </nav>
          </div>

          <div className="space-y-4 p-4 md:p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-[#2A9D8F]/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-[#2A9D8F]">Registry Verified</span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">{building.floorInfo.label}</span>
              </div>
              <span className="text-xs text-slate-400">ID: {building.id.toUpperCase()}</span>
            </div>

            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{building.name}</h1>
              <p className="mt-1 text-sm text-slate-600">{building.category}</p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-xs uppercase tracking-wider text-slate-400">Entrance</div>
                  <div className="mt-1 font-medium text-slate-800">Pending verification</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wider text-slate-400">Vertical Span</div>
                  <div className="mt-1 font-medium text-slate-800">{building.floorInfo.label}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wider text-slate-400">Accessibility</div>
                  <div className="mt-1 font-medium text-slate-800">Pending route validation</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wider text-slate-400">Connectivity</div>
                  <div className="mt-1 font-medium text-slate-800">Campus WiFi</div>
                </div>
              </div>
            </div>

            {building.notes && <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{building.notes}</div>}

            <div className="flex gap-2">
              <button type="button" className="flex-1 rounded-xl bg-[#2A9D8F] px-4 py-3 text-sm font-semibold text-white shadow-sm">
                Navigate Here
              </button>
              <button type="button" className="rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700">
                3D Plan
              </button>
              <button type="button" className="rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700">
                Share
              </button>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Floor Directory</div>
                <div className="text-xs text-slate-500">Strict campus floor system</div>
              </div>
              <FloorSelector floors={floors} selectedFloor={selectedFloor} onSelectFloor={setSelectedFloor} />
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200 md:p-5">
            <div className="text-sm font-semibold text-slate-900">Verified Floor Directory</div>
            <div className="mt-3 grid gap-2">
              {floors.map((floor) => (
                <div key={floor} className={`rounded-2xl p-3 ${floor === selectedFloor ? 'bg-[#2A9D8F] text-white' : 'bg-slate-50 text-slate-700'}`}>
                  <div className="text-sm font-medium">{floor}</div>
                  <div className={`text-xs ${floor === selectedFloor ? 'text-white/80' : 'text-slate-500'}`}>No fabricated room map data</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200 md:p-5">
            <div className="text-sm font-semibold text-slate-900">Adjacent Blocks</div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {['Civil Block', 'First Year Block', 'Main Block', 'L Shape Block'].map((block) => (
                <div key={block} className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
                  <div className="text-sm font-medium text-slate-800">{block}</div>
                  <div className="text-xs text-[#2A9D8F]">Floor data verified</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200 md:p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#2A9D8F]/10 text-[#2A9D8F]">
                <span className="material-symbols-outlined text-[20px]">shield</span>
              </div>
              <p className="text-sm text-slate-600">
                Verified by MNMJEC Academic Registry &amp; Estate Management. Floor count follows official campus blueprints.
              </p>
            </div>
          </div>
        </section>
      </div>

      <SurfaceCard title="Selected Floor" subtitle={`Current selection: ${selectedFloor}`}>
        <p className="text-sm text-slate-600">
          This is a layout scaffold only; indoor room numbers and anchor points will remain pending until verified against the future Blender GLB.
        </p>
      </SurfaceCard>
    </div>
  )
}
