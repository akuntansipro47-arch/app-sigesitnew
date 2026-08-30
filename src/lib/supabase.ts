import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Log configuration for debugging
console.log('Supabase Configuration:', {
  url: url ? 'SET' : 'NOT SET',
  anonKey: anonKey ? 'SET' : 'NOT SET',
  configured: !!(url && anonKey)
})

export const supabase = url && anonKey ? createClient(url, anonKey) : null

export const supabaseConfigured = supabase !== null

// Test connection on initialization
if (supabase) {
  console.log('Supabase client initialized successfully')
  supabase.auth.getSession().then(({ data, error }) => {
    console.log('Initial session check:', { session: !!data.session, error: error?.message })
  })
} else {
  console.warn('Supabase client not initialized - check environment variables')
}
