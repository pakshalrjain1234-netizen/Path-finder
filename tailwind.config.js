/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Primary Palette tokens
        'base-dark': '#061018',
        'base-card': '#0B1220',
        'base-slate': '#0F172A',
        'surface-1': '#111827',
        'surface-2': '#162033',
        'surface-3': '#1B2540',
        'accent-blue': '#3B82F6',
        'accent-cyan': '#22D3EE',
        'accent-teal': '#14B8A6',
        'accent-violet': '#8B5CF6',
        'text-primary': '#F8FAFC',
        'text-secondary': '#CBD5E1',
        'text-muted': '#94A3B8',
        midnight: '#0B1220',
        deepBlue: '#162033',
        electric: '#3B82F6',
        violetAccent: '#8B5CF6',
        softWhite: '#F8FAFC',
        tealAccent: '#14B8A6',
        textPrimary: '#F8FAFC',
        mutedText: '#94A3B8',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        glass: '0 8px 32px 0 rgba(11, 18, 38, 0.08)',
        'glass-dark': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        glow: '0 0 25px -5px rgba(37, 99, 235, 0.3)',
        'glow-teal': '0 0 25px -5px rgba(20, 184, 166, 0.3)',
      },
    },
  },
  plugins: [],
}
