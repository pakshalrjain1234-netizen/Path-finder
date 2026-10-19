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
      <div className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
        <div className="border-b border-slate-200 p-4 md:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-900">Campus Accessibility &amp; Help</div>
              <div className="text-xs text-slate-500">Offline navigation guide and support contacts</div>
            </div>
            <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${isOnline ? 'bg-[#2A9D8F]/10 text-[#2A9D8F]' : 'bg-[#E76F51]/10 text-[#E76F51]'}`}>
              <span className="h-2 w-2 rounded-full bg-current" />
              {isOnline ? 'Online' : 'Offline'}
            </div>
          </div>
        </div>

        <div className="grid gap-4 p-4 md:p-5 xl:grid-cols-2">
          <SurfaceCard title="PWA Status" subtitle="Offline readiness">
            <div className="space-y-2 text-sm text-slate-600">
              <p>App shell and static assets are cached for offline startup.</p>
              <p>3D campus rendering offline support depends on GLB and route data availability.</p>
              <p>Use desktop sidebar or mobile floating controls to access all modules.</p>
            </div>
          </SurfaceCard>

          <SurfaceCard title="Wheelchair &amp; Step-Free Routes" subtitle="Accessibility toggle scaffold">
            <label className="flex items-center justify-between rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
              <div>
                <div className="text-sm font-medium text-slate-900">Prioritize ramp-enabled pathways</div>
                <div className="text-xs text-slate-500">Elevator-equipped buildings and flat corridors</div>
              </div>
              <span className="inline-flex h-6 w-11 items-center rounded-full bg-[#2A9D8F] p-1">
                <span className="h-4 w-4 rounded-full bg-white" />
              </span>
            </label>

            <div className="mt-3 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
              <div className="text-sm font-semibold text-slate-900">Offline Navigation Guide</div>
              <div className="mt-3 space-y-2 text-sm text-slate-600">
                <p>1. Campus model geometry can be cached once data is available.</p>
                <p>2. Compass and device orientation can assist navigation orientation.</p>
                <p>3. Indoor room codes will follow campus prefixes once mapped.</p>
              </div>
            </div>
          </SurfaceCard>

          <SurfaceCard title="Campus Emergency Support" subtitle="24/7 rapid response personnel">
            <div className="grid gap-2 sm:grid-cols-2">
              <a className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200" href="tel:+914424501111">
                <div className="text-xs text-slate-500">Main Gate Security</div>
                <div className="mt-1 text-sm font-semibold text-[#2A9D8F]">+91 44-2450-1111</div>
              </a>
              <a className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200" href="tel:+914424502222">
                <div className="text-xs text-slate-500">Campus Health Clinic</div>
                <div className="mt-1 text-sm font-semibold text-[#E76F51]">+91 44-2450-2222</div>
              </a>
            </div>
          </SurfaceCard>

          <SurfaceCard title="Unmapped Room Feedback" subtitle="Submit new locations for review">
            <div className="space-y-3">
              <input className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm" placeholder="Room / Lab name" />
              <div className="grid grid-cols-2 gap-2">
                <input className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm" placeholder="Block" />
                <input className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm" placeholder="Floor" />
              </div>
              <button type="button" className="w-full rounded-xl bg-[#2A9D8F] px-4 py-3 text-sm font-semibold text-white">
                Submit to Spatial Admin
              </button>
            </div>
          </SurfaceCard>
        </div>
      </div>
    </div>
  )
}
