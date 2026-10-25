import { useEffect, useState } from 'react'
import { SurfaceCard } from '../components/SurfaceCard'

export function HelpOfflineScreen() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => {
    const update = () => setIsOnline(navigator.onLine)
    window.addEventListener('online', update)
    window.addEventListener('offline', update)

    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 md:p-6">
      <div className="rounded-2xl border border-[#293A50] bg-[#162235] shadow-xl">
        <div className="border-b border-[#293A50] p-4 md:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-100">Campus Accessibility &amp; Help</div>
              <div className="text-xs text-slate-400">Offline navigation guide and support contacts</div>
            </div>
            <div
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${
                isOnline
                  ? 'border-emerald-500/30 bg-emerald-950/40 text-emerald-300'
                  : 'border-rose-500/30 bg-rose-950/40 text-rose-300'
              }`}
            >
              <span className="h-2 w-2 rounded-full bg-current animate-pulse" />
              {isOnline ? 'Online' : 'Offline'}
            </div>
          </div>
        </div>

        <div className="grid gap-4 p-4 md:p-5 xl:grid-cols-2">
          <SurfaceCard title="PWA Status" subtitle="Offline readiness">
            <div className="space-y-2 text-sm text-slate-300">
              <p>App shell and static assets are cached for offline startup.</p>
              <p>3D campus rendering offline support depends on GLB and route data availability.</p>
              <p>Use desktop sidebar or mobile floating controls to access all modules.</p>
            </div>
          </SurfaceCard>

          <SurfaceCard title="Wheelchair &amp; Step-Free Routes" subtitle="Accessibility toggle scaffold">
            <label className="flex items-center justify-between rounded-2xl border border-[#293A50] bg-[#192638] p-3.5">
              <div>
                <div className="text-sm font-medium text-slate-100">Prioritize ramp-enabled pathways</div>
                <div className="text-xs text-slate-400">Elevator-equipped buildings and flat corridors</div>
              </div>
              <span className="inline-flex h-6 w-11 items-center rounded-full bg-blue-600 p-1">
                <span className="h-4 w-4 rounded-full bg-white ml-auto shadow-sm" />
              </span>
            </label>

            <div className="mt-3 rounded-2xl border border-[#293A50] bg-[#192638] p-4">
              <div className="text-sm font-semibold text-slate-100">Offline Navigation Guide</div>
              <div className="mt-3 space-y-2 text-sm text-slate-300">
                <p>1. Campus model geometry can be cached once data is available.</p>
                <p>2. Compass and device orientation can assist navigation orientation.</p>
                <p>3. Indoor room codes will follow campus prefixes once mapped.</p>
              </div>
            </div>
          </SurfaceCard>

          <SurfaceCard title="Campus Emergency Support" subtitle="24/7 rapid response personnel">
            <div className="grid gap-2 sm:grid-cols-2">
              <a
                className="rounded-2xl border border-[#293A50] bg-[#192638] p-3.5 hover:border-blue-500/50 hover:bg-[#1E2E44] transition-all"
                href="tel:+914424501111"
              >
                <div className="text-xs text-slate-400">Main Gate Security</div>
                <div className="mt-1 text-sm font-semibold text-blue-400">+91 44-2450-1111</div>
              </a>
              <a
                className="rounded-2xl border border-[#293A50] bg-[#192638] p-3.5 hover:border-rose-500/50 hover:bg-[#1E2E44] transition-all"
                href="tel:+914424502222"
              >
                <div className="text-xs text-slate-400">Campus Health Clinic</div>
                <div className="mt-1 text-sm font-semibold text-rose-400">+91 44-2450-2222</div>
              </a>
            </div>
          </SurfaceCard>

          <SurfaceCard title="Unmapped Room Feedback" subtitle="Submit new locations for review">
            <div className="space-y-3">
              <input
                className="w-full rounded-xl border border-[#293A50] bg-[#192638] px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:border-blue-500 transition-colors"
                placeholder="Room / Lab name"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  className="rounded-xl border border-[#293A50] bg-[#192638] px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:border-blue-500 transition-colors"
                  placeholder="Block"
                />
                <input
                  className="rounded-xl border border-[#293A50] bg-[#192638] px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:border-blue-500 transition-colors"
                  placeholder="Floor"
                />
              </div>
              <button
                type="button"
                className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-900/30 hover:bg-blue-500 transition-all active:scale-[0.99]"
              >
                Submit to Spatial Admin
              </button>
            </div>
          </SurfaceCard>
        </div>
      </div>
    </div>
  )
}
