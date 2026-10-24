import { createClient } from '@supabase/supabase-js'

const env: any =
  (typeof import.meta !== 'undefined' && (import.meta as any).env) ||
  (typeof process !== 'undefined' && process.env) ||
  {}

const supabaseUrl =
  env.VITE_SUPABASE_URL || 'https://lqqqrqajeqzdtvkfvrnp.supabase.co'
const supabaseKey =
  env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  env.VITE_SUPABASE_ANON_KEY ||
  ''

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey)

// Singleton Supabase Client for PATH FINDER
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: typeof window !== 'undefined',
        autoRefreshToken: typeof window !== 'undefined',
        detectSessionInUrl: typeof window !== 'undefined',
      },
    })
  : null
