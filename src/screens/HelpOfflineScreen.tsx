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
    <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 md:p-6 bg-[#E8DDF2] text-[#352A47] min-h-[calc(100vh-4rem)] font-sans">
      <div className="rounded-3xl border border-[#C9B6DF] bg-[#FBF8FD] shadow-dream-card">
        <div className="border-b border-[#C9B6DF] p-4 md:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-heading font-extrabold text-[#352A47]">Campus Accessibility &amp; Help</div>
              <div className="text-xs text-[#51465F]">Offline navigation guide and support contacts</div>
            </div>
            <div
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-heading font-bold ${
                isOnline
                  ? 'border-[#94BCA7] bg-[#BCD8C9] text-[#1E583F]'
                  : 'border-[#D7A894] bg-[#E8C8B9] text-[#9E563A]'
              }`}
            >
              <span className="h-2 w-2 rounded-full bg-current animate-pulse" />
              {isOnline ? 'Online' : 'Offline'}
            </div>
          </div>
        </div>

        <div className="grid gap-4 p-4 md:p-5 xl:grid-cols-2">
          <SurfaceCard title="PWA Status" subtitle="Offline readiness">
            <div className="space-y-2 text-sm text-[#51465F] font-sans">
              <p>App shell and static assets are cached for offline startup.</p>
              <p>3D campus rendering offline support depends on GLB and route data availability.</p>
              <p>Use desktop sidebar or mobile floating controls to access all modules.</p>
            </div>
          </SurfaceCard>

          <SurfaceCard title="Wheelchair &amp; Step-Free Routes" subtitle="Accessibility toggle scaffold">
            <label className="flex items-center justify-between rounded-2xl border border-[#C9B6DF] bg-[#E8DDF2]/60 p-3.5 cursor-pointer">
              <div>
                <div className="text-sm font-heading font-bold text-[#352A47]">Prioritize ramp-enabled pathways</div>
                <div className="text-xs text-[#51465F]">Elevator-equipped buildings and flat corridors</div>
              </div>
              <span className="inline-flex h-6 w-11 items-center rounded-full bg-[#352A47] p-1 shadow-xs">
                <span className="h-4 w-4 rounded-full bg-white ml-auto shadow-sm" />
              </span>
            </label>

            <div className="mt-3 rounded-2xl border border-[#C9B6DF] bg-[#E8DDF2]/50 p-4">
              <div className="text-sm font-heading font-bold text-[#352A47]">Offline Navigation Guide</div>
              <div className="mt-3 space-y-2 text-sm text-[#51465F] font-sans">
                <p>1. Campus model geometry can be cached once data is available.</p>
                <p>2. Compass and device orientation can assist navigation orientation.</p>
                <p>3. Indoor room codes will follow campus prefixes once mapped.</p>
              </div>
            </div>
          </SurfaceCard>

          <SurfaceCard title="Campus Emergency Support" subtitle="24/7 rapid response personnel">
            <div className="grid gap-2 sm:grid-cols-2">
              <a
                className="rounded-2xl border border-[#C9B6DF] bg-[#E8DDF2]/60 p-3.5 hover:border-[#352A47] hover:bg-[#D2BEE7]/60 transition-all shadow-xs"
                href="tel:+914424501111"
              >
                <div className="text-xs text-[#51465F]">Main Gate Security</div>
                <div className="mt-1 text-sm font-heading font-bold text-[#352A47]">+91 44-2450-1111</div>
              </a>
              <a
                className="rounded-2xl border border-[#D7A894] bg-[#E8C8B9]/40 p-3.5 hover:border-[#9E563A] hover:bg-[#E8C8B9]/60 transition-all shadow-xs"
                href="tel:+914424502222"
              >
                <div className="text-xs text-[#9E563A]">Campus Health Clinic</div>
                <div className="mt-1 text-sm font-heading font-bold text-[#9E563A]">+91 44-2450-2222</div>
              </a>
            </div>
          </SurfaceCard>

          <SurfaceCard title="Unmapped Room Feedback" subtitle="Submit new locations for review">
            <div className="space-y-3 font-sans">
              <input
                className="w-full rounded-2xl border border-[#C9B6DF] bg-[#E8DDF2]/50 px-3.5 py-2.5 text-sm text-[#352A47] placeholder:text-[#51465F]/70 outline-none focus:border-[#352A47] focus:ring-2 focus:ring-[#D2BEE7] transition-colors"
                placeholder="Room / Lab name"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  className="rounded-2xl border border-[#C9B6DF] bg-[#E8DDF2]/50 px-3.5 py-2.5 text-sm text-[#352A47] placeholder:text-[#51465F]/70 outline-none focus:border-[#352A47] focus:ring-2 focus:ring-[#D2BEE7] transition-colors"
                  placeholder="Block"
                />
                <input
                  className="rounded-2xl border border-[#C9B6DF] bg-[#E8DDF2]/50 px-3.5 py-2.5 text-sm text-[#352A47] placeholder:text-[#51465F]/70 outline-none focus:border-[#352A47] focus:ring-2 focus:ring-[#D2BEE7] transition-colors"
                  placeholder="Floor"
                />
              </div>
              <button
                type="button"
                className="w-full rounded-2xl bg-[#352A47] hover:bg-[#231B30] px-4 py-3 text-sm font-heading font-bold text-white shadow-dream-soft transition-all active:scale-[0.99] cursor-pointer"
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
