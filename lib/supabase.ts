import { createClient } from '@supabase/supabase-js'
import { createBrowserClient as createSSRBrowserClient } from '@supabase/ssr'

// Singleton pattern for server-side Supabase client
let supabaseClient: ReturnType<typeof createClient> | null = null
let lastKey: string | null = null

// Dev mode mock user ID
const DEV_MODE_USER_ID = process.env.DEV_MODE_USER_ID || '00000000-0000-0000-0000-000000000001'

/**
 * Helper to get the current user from the Supabase client
 * In dev mode, returns the mock dev user
 */
export async function getCurrentUser(supabase: any) {
  const DEV_MODE = process.env.NEXT_PUBLIC_DEV_MODE === 'true'
  
  if (DEV_MODE && supabase.__dev_user_id) {
    return {
      data: {
        user: {
          id: DEV_MODE_USER_ID,
          email: 'dev@test.local',
          aud: 'authenticated',
          role: 'authenticated',
        }
      },
      error: null
    }
  }
  
  return await supabase.auth.getUser()
}

/**
 * Get the server-side Supabase client (uses service role key)
 * This should ONLY be used in API routes and agents, never in client components
 */
export function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (supabaseClient && lastKey === supabaseKey) {
    return supabaseClient
  }

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      'Missing Supabase configuration. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.'
    )
  }

  lastKey = supabaseKey
  supabaseClient = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  return supabaseClient
}

/**
 * Create a client-side Supabase client with SSR support
 * Use this in client components
 * Uses @supabase/ssr to properly handle cookies for server-side auth
 */
let browserClient: ReturnType<typeof createSSRBrowserClient> | null = null

export function createBrowserClient() {
  if (browserClient) {
    return browserClient
  }
  
  browserClient = createSSRBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  
  return browserClient
}
