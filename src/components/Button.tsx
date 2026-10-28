import { type ButtonHTMLAttributes, forwardRef, type ReactNode } from 'react'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'surface' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  mode?: 'dream' | 'pastel' | 'obsidian' | 'ivory' | 'atlas' | 'immersive'
  isLoading?: boolean
  icon?: ReactNode
  iconPosition?: 'left' | 'right'
  fullWidth?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      mode: _mode = 'dream',
      isLoading = false,
      icon,
      iconPosition = 'left',
      fullWidth = false,
      disabled,
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium transition-all duration-200 cursor-pointer select-none outline-none disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none rounded-2xl font-sans'

    const dreamVariants = {
      primary:
        'bg-[#352A47] hover:bg-[#433659] text-[#FAF6FD] shadow-dream-soft hover:shadow-dream-card active:translate-y-0.5 focus-visible:ring-2 focus-visible:ring-[#352A47] focus-visible:ring-offset-2 focus-visible:ring-offset-[#E8DDF2]',
      secondary:
        'bg-[#FBF8FD] border border-[#C9B6DF] text-[#352A47] hover:bg-[#D2BEE7] shadow-2xs active:translate-y-0.5 focus-visible:ring-2 focus-visible:ring-[#352A47] focus-visible:ring-offset-2 focus-visible:ring-offset-[#E8DDF2]',
      surface:
        'bg-[#E8C8B9] border border-[#D7A894] text-[#352A47] hover:bg-[#DEC0B0]',
      ghost:
        'bg-transparent text-[#51465F] hover:text-[#352A47] hover:bg-[#DFD0EF]/60',
      danger:
        'bg-[#F5D0D0] border border-[#E8AEAE] text-[#8C2B2B] hover:bg-[#ECC2C2]',
    }

    const variantStyles = dreamVariants[variant] || dreamVariants.primary

    const sizeStyles = {
      sm: 'px-3.5 py-1.5 text-xs rounded-xl min-h-[36px] gap-1.5',
      md: 'px-5 py-2.5 text-sm rounded-2xl min-h-[44px] gap-2', // Meets 44px mobile touch envelope
      lg: 'px-7 py-3 text-base rounded-2xl min-h-[48px] gap-2.5',
    }[size]

    const widthStyles = fullWidth ? 'w-full' : ''

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`${baseStyles} ${variantStyles} ${sizeStyles} ${widthStyles} ${className}`}
        {...props}
      >
        {isLoading ? (
          <>
            <svg
              className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span>Loading...</span>
          </>
        ) : (
          <>
            {icon && iconPosition === 'left' && <span className="inline-flex shrink-0">{icon}</span>}
            <span>{children}</span>
            {icon && iconPosition === 'right' && <span className="inline-flex shrink-0">{icon}</span>}
          </>
        )}
      </button>
    )
  }
)

Button.displayName = 'Button'
