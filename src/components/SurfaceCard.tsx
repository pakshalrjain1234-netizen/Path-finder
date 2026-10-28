import type { ReactNode } from 'react'

export interface SurfaceCardProps {
  title?: string
  subtitle?: string
  action?: ReactNode
  children: ReactNode
  variant?:
    | 'dream'
    | 'peach'
    | 'powder'
    | 'sage'
    | 'lilac'
    | 'pastel'
    | 'lavender'
    | 'obsidian'
    | 'ivory'
    | 'immersive'
    | 'adaptive'
    | 'elevated'
    | 'glass'
  interactive?: boolean
  className?: string
  headerClassName?: string
  onClick?: () => void
  id?: string
  'data-testid'?: string
}

export function SurfaceCard({
  title,
  subtitle,
  action,
  children,
  variant = 'dream',
  interactive = false,
  className = '',
  headerClassName = '',
  onClick,
  id,
  'data-testid': testId,
}: SurfaceCardProps) {
  const variantStyles = {
    dream: 'bg-[#FBF8FD] border border-[#C9B6DF] text-[#352A47] shadow-dream-soft',
    peach: 'bg-[#F5E6DF] border border-[#E8C8B9] text-[#352A47] shadow-dream-soft',
    powder: 'bg-[#E4EFF3] border border-[#C6DCE4] text-[#352A47] shadow-dream-soft',
    sage: 'bg-[#DFEDE5] border border-[#BCD8C9] text-[#352A47] shadow-dream-soft',
    lilac: 'bg-[#DFD0EF] border border-[#C9B6DF] text-[#352A47] shadow-dream-soft',
    pastel: 'bg-[#FBF8FD] border border-[#C9B6DF] text-[#352A47] shadow-dream-soft',
    lavender: 'bg-[#DFD0EF] border border-[#C9B6DF] text-[#352A47] shadow-dream-soft',
    ivory: 'bg-[#FBF8FD] border border-[#C9B6DF] text-[#352A47] shadow-dream-soft',
    adaptive: 'bg-[#FBF8FD] border border-[#C9B6DF] text-[#352A47] shadow-dream-soft',
    obsidian: 'bg-[#FBF8FD] border border-[#C9B6DF] text-[#352A47] shadow-dream-soft',
    immersive: 'bg-[#FBF8FD] border border-[#C9B6DF] text-[#352A47] shadow-dream-soft',
    elevated: 'bg-[#FBF8FD] border border-[#C9B6DF] text-[#352A47] shadow-dream-card',
    glass: 'bg-[#FBF8FD]/90 backdrop-blur-md border border-[#C9B6DF] text-[#352A47] shadow-dream-card',
  }[variant]

  const interactiveStyles = interactive
    ? 'cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:border-[#B39FCB] hover:shadow-dream-card'
    : ''

  return (
    <section
      id={id}
      data-testid={testId}
      onClick={onClick}
      className={`rounded-3xl p-6 ${variantStyles} ${interactiveStyles} ${className}`}
    >
      {(title || subtitle || action) && (
        <header className={`mb-4 flex items-start justify-between gap-3 ${headerClassName}`}>
          <div>
            {title && (
              <h2 className="text-base font-bold tracking-tight text-[#352A47] font-heading">
                {title}
              </h2>
            )}
            {subtitle && <p className="text-xs text-[#51465F] mt-0.5">{subtitle}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </header>
      )}
      {children}
    </section>
  )
}
