import type { ReactNode } from 'react'

interface SurfaceCardProps {
  title: string
  subtitle?: string
  action?: ReactNode
  children: ReactNode
}

export function SurfaceCard({ title, subtitle, action, children }: SurfaceCardProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <header className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-[#1E293B]">{title}</h2>
          {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
        </div>
        {action}
      </header>
      {children}
    </section>
  )
}
