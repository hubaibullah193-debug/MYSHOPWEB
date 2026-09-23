import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Only validate env vars at runtime, not during build
const getSupabaseClient = () => {
  if (!supabaseUrl || !supabaseAnonKey) {
    if (typeof window === 'undefined') {
      // Server-side during build - return null
      return null
    }
    throw new Error('Missing Supabase environment variables')
  }
  return createClient(supabaseUrl, supabaseAnonKey)
}

export const supabase = getSupabaseClient() || ({} as any)

// Server-side client (with service role key for admin operations)
const getSupabaseAdmin = () => {
  if (!supabaseUrl || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return null
  }
  return createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

export const supabaseAdmin = getSupabaseAdmin() || ({} as any)

