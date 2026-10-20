import type { ReactNode } from 'react'

interface SurfaceCardProps {
  title: string
  subtitle?: string
  action?: ReactNode
  children: ReactNode
}

export function SurfaceCard({ title, subtitle, action, children }: SurfaceCardProps) {
  return (
    <section className="rounded-2xl border border-white/10 bg-[#111827]/80 p-5 shadow-xl shadow-black/30 backdrop-blur-xl transition-all hover:border-white/20">
      <header className="mb-3.5 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-white tracking-tight">{title}</h2>
          {subtitle && <p className="text-xs font-medium text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </header>
      {children}
    </section>
  )
}
