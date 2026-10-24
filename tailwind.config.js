/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Dark University Brand Palette tokens (Phase 8B)
        university: {
          bg: '#101827',
          secondary: '#162235',
          card: '#192638',
          elevated: '#24364D',
          blue: '#60A5FA',
          green: '#34D399',
          navy: '#1E3A5F',
          text: '#F1F5F9',
          muted: '#94A3B8',
          border: '#293A50',
        },
        // Legacy / Component tokens for backward compatibility
        'base-dark': '#0B1220',
        'base-card': '#FFFFFF',
        'base-slate': '#1E293B',
        'surface-1': '#FFFFFF',
        'surface-2': '#F8FAFC',
        'surface-3': '#F1F5F9',
        'accent-blue': '#2563EB',
        'accent-cyan': '#0284C7',
        'accent-teal': '#0D9488',
        'accent-violet': '#7C3AED',
        'text-primary': '#1E293B',
        'text-secondary': '#475569',
        'text-muted': '#64748B',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 2px 10px -2px rgba(15, 23, 42, 0.05), 0 1px 3px -1px rgba(15, 23, 42, 0.03)',
        card: '0 4px 20px -2px rgba(15, 23, 42, 0.06), 0 2px 6px -1px rgba(15, 23, 42, 0.04)',
        elevated: '0 10px 30px -4px rgba(15, 23, 42, 0.08), 0 4px 10px -2px rgba(15, 23, 42, 0.04)',
        floating: '0 20px 40px -6px rgba(15, 23, 42, 0.12), 0 8px 16px -4px rgba(15, 23, 42, 0.06)',
      },
    },
  },
  plugins: [],
}
