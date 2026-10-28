import type { ReactNode } from 'react'

export interface BadgeProps {
  children: ReactNode
  variant?:
    | 'primary'
    | 'success'
    | 'warning'
    | 'danger'
    | 'neutral'
    | 'student'
    | 'admin'
    | 'visitor'
    | 'slate'
  size?: 'sm' | 'md'
  mode?: 'dream' | 'pastel' | 'obsidian' | 'ivory' | 'atlas' | 'immersive'
  icon?: ReactNode
  className?: string
  id?: string
}

export function Badge({
  children,
  variant = 'primary',
  size = 'sm',
  mode: _mode = 'dream',
  icon,
  className = '',
  id,
}: BadgeProps) {
  const dreamStyles = {
    primary: 'bg-[#D2BEE7] text-[#352A47] border-[#C9B6DF]',
    success: 'bg-[#BCD8C9] text-[#1E583F] border-[#94BCA7]',
    warning: 'bg-[#E8C8B9] text-[#9E563A] border-[#D7A894]',
    danger: 'bg-[#F5D0D0] text-[#8C2B2B] border-[#E8AEAE]',
    neutral: 'bg-[#DFD0EF] text-[#352A47] border-[#C9B6DF]',
    student: 'bg-[#C6DCE4] text-[#265A6E] border-[#9FBECB] font-semibold',
    admin: 'bg-[#D2BEE7] text-[#352A47] border-[#B39FCB] font-semibold',
    visitor: 'bg-[#BCD8C9] text-[#1E583F] border-[#94BCA7] font-semibold',
    slate: 'bg-[#E8DDF2] text-[#352A47] border-[#C9B6DF]',
  }

  const variantStyles = dreamStyles[variant] || dreamStyles.neutral

  const sizeStyles = {
    sm: 'px-2.5 py-0.5 text-[11px] gap-1',
    md: 'px-3 py-1 text-xs gap-1.5',
  }

  return (
    <span
      id={id}
      className={`inline-flex items-center font-medium rounded-full border transition-all ${variantStyles} ${sizeStyles[size]} ${className}`}
    >
      {icon && <span className="inline-flex shrink-0">{icon}</span>}
      <span>{children}</span>
    </span>
  )
}
