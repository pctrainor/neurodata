import { cookies } from 'next/headers'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { getSupabaseClient } from './supabase'

// Dev mode mock user ID
const DEV_MODE_USER_ID = process.env.DEV_MODE_USER_ID || '00000000-0000-0000-0000-000000000001'

/**
 * Get authenticated Supabase client for API routes
 * This respects RLS policies and user sessions
 * In DEV_MODE, returns a client that bypasses auth checks
 * 
 * NOTE: This file should ONLY be imported in Server Components and API routes
 */
export async function getAuthenticatedSupabaseClient() {
  const DEV_MODE = process.env.NEXT_PUBLIC_DEV_MODE === 'true'

  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          cookiesToSet.forEach((cookie: { name: string; value: string; options?: CookieOptions }) => {
            cookieStore.set(cookie)
          })
        },
      },
    }
  )
  
  // Verify session is actually loaded
  const { data: { session } } = await supabase.auth.getSession()

  if (DEV_MODE && !session) {
    const client = getSupabaseClient()
    ;(client as any).__dev_user_id = DEV_MODE_USER_ID
    return client
  }
  
  return supabase
}
