import { useMemo, useState } from 'react'
import { SurfaceCard } from '../components/SurfaceCard'
import { buildings } from '../data/buildings'

export function NavigationScreen() {
  const [from, setFrom] = useState(buildings[0]?.id ?? '')
  const [to, setTo] = useState(buildings[1]?.id ?? '')
  const [expanded, setExpanded] = useState(false)

  const summary = useMemo(() => {
    const start = buildings.find((building) => building.id === from)
    const end = buildings.find((building) => building.id === to)
    if (!start || !end) {
      return null
    }

    return {
      start,
      end,
      note: 'Route geometry and distance will be available after campus model and route graph verification.',
    }
  }, [from, to])

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 md:p-6">
      <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
        <div className="relative min-h-[370px] bg-slate-100">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(42,157,143,0.10),transparent_30%),radial-gradient(circle_at_80%_30%,rgba(231,111,81,0.12),transparent_28%),linear-gradient(to_bottom,#e4eaf3,#f8fafc)]" />

          <div className="absolute inset-0 opacity-40">
            <svg viewBox="0 0 390 370" className="h-full w-full">
              <path d="M 50 320 L 120 250 L 215 195 L 255 130 L 300 80" fill="none" stroke="#2A9D8F" strokeWidth="6" strokeDasharray="10 8" strokeLinecap="round" />
              <circle cx="50" cy="320" r="8" fill="#2A9D8F" />
              <circle cx="300" cy="80" r="8" fill="#E76F51" />
            </svg>
          </div>

          <div className="absolute left-4 right-4 top-4 rounded-2xl bg-white/95 p-3 shadow-lg ring-1 ring-slate-200 backdrop-blur-xl md:left-6 md:right-auto md:w-[390px]">
            <div className="flex items-center justify-between">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-[#2A9D8F]/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-[#2A9D8F]">
                <span className="material-symbols-outlined text-[13px]" style={{ fontVariationSettings: `'FILL' 1` }}>verified</span>
                Verified Direct Route
              </div>
              <div className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
                <span className="material-symbols-outlined text-[13px] text-[#2A9D8F]">accessible</span>
                Step-free
              </div>
            </div>

            <div className="mt-3 flex items-center gap-2">
              <div className="flex flex-col items-center justify-center py-1">
                <span className="h-3 w-3 rounded-full border-2 border-white bg-[#2A9D8F] shadow-sm" />
                <span className="my-1 h-6 w-0.5 bg-slate-300" />
                <span className="h-3 w-3 rounded-full border-2 border-white bg-[#E76F51] shadow-sm" />
              </div>
              <div className="flex-1 space-y-1.5">
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <div className="text-[10px] uppercase tracking-wider text-slate-400">Starting Point</div>
                  <div className="truncate text-sm font-semibold text-slate-900">Main Entrance (Gate 1)</div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <div className="text-[10px] uppercase tracking-wider text-slate-400">Destination</div>
                  <div className="truncate text-sm font-semibold text-slate-900">IT Block (Ground Portico)</div>
                </div>
              </div>
            </div>
          </div>

          <div className="absolute bottom-4 left-4 rounded-2xl bg-white/95 px-4 py-3 shadow-lg ring-1 ring-slate-200 backdrop-blur-xl">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#2A9D8F] text-white">
                <span className="material-symbols-outlined text-[20px]">directions_walk</span>
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-900">320 m • ~4 mins</div>
                <div className="text-xs text-slate-500">Flat paved pathway</div>
              </div>
            </div>
          </div>

          <div className="absolute right-4 top-1/2 flex -translate-y-1/2 flex-col gap-2">
            <button type="button" className="flex h-10 w-10 items-center justify-center rounded-full bg-white/95 shadow-lg ring-1 ring-slate-200 backdrop-blur-xl">
              <span className="material-symbols-outlined text-[18px] text-[#E76F51]">explore</span>
            </button>
            <button type="button" className="flex h-10 w-10 items-center justify-center rounded-full bg-white/95 shadow-lg ring-1 ring-slate-200 backdrop-blur-xl">
              <span className="material-symbols-outlined text-[18px] text-[#2A9D8F]">near_me</span>
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
        <div className="border-b border-slate-200 p-4 md:p-5">
          <div className="grid gap-3 md:grid-cols-[1fr_auto_1fr] md:items-end">
            <label className="text-sm">
              <span className="mb-1 block font-medium text-slate-700">From</span>
              <select value={from} onChange={(event) => setFrom(event.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm">
                {buildings.map((building) => (
                  <option key={building.id} value={building.id}>
                    {building.name}
                  </option>
                ))}
              </select>
            </label>

            <button type="button" className="mx-auto rounded-full bg-slate-100 p-3 text-slate-600">
              <span className="material-symbols-outlined text-[20px]">swap_vert</span>
            </button>

            <label className="text-sm">
              <span className="mb-1 block font-medium text-slate-700">To</span>
              <select value={to} onChange={(event) => setTo(event.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm">
                {buildings.map((building) => (
                  <option key={building.id} value={building.id}>
                    {building.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="p-4 md:p-5">
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className="mb-4 w-full rounded-xl bg-[#2A9D8F] px-4 py-3 text-sm font-semibold text-white shadow-sm"
          >
            Start Turn-by-Turn Navigation
          </button>

          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold uppercase tracking-wider text-[#2A9D8F]">Next Turn</div>
              <div className="text-xs text-slate-500">Step 1 of 4</div>
            </div>
            <div className="mt-3 flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#2A9D8F] text-white">
                <span className="material-symbols-outlined text-[22px]">straight</span>
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-900">Head straight from Main Entrance</div>
                <div className="mt-0.5 text-sm text-slate-500">Walk along the central boulevard past security booth</div>
                <div className="mt-1 text-sm font-semibold text-[#2A9D8F]">80 meters</div>
              </div>
            </div>
          </div>

          {expanded && summary && (
            <div className="mt-4 space-y-2 rounded-2xl border border-slate-200 bg-white p-4">
              <div className="text-sm font-semibold text-slate-900">Detailed Waypoints</div>
              <div className="space-y-2 text-sm text-slate-600">
                <div className="rounded-xl bg-slate-50 p-3">Main Entrance (Gate 1) — 0 m</div>
                <div className="rounded-xl bg-slate-50 p-3">Turn right before Civil Block — 110 m</div>
                <div className="rounded-xl bg-slate-50 p-3">Proceed past L-Shape Block — 90 m</div>
                <div className="rounded-xl bg-slate-50 p-3">Arrive at IT Block Main Entrance — 40 m</div>
              </div>
              <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{summary.note}</p>
            </div>
          )}
        </div>
      </div>

      <SurfaceCard title="Landmarks Along Route" subtitle="Verified examples from Stitch direction flow">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">First Year Block</div>
          <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">Civil Block</div>
        </div>
      </SurfaceCard>
    </div>
  )
}
