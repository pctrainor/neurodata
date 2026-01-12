import { NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(request: Request) {
  try {
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

    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get the onboarding data from the request
    const body = await request.json()
    const { full_name, institution, role, research_interests } = body

    // Update user_profiles table
    const { error: profileError } = await supabase
      .from('user_profiles')
      .upsert({
        id: user.id,
        email: user.email,
        full_name,
        institution,
        role,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'id'
      })

    if (profileError) {
      console.error('Error updating user profile:', profileError)
      // Continue anyway - user_profiles might not exist yet
    }

    // Update user_settings table to mark onboarding as complete
    const { error: settingsError } = await supabase
      .from('user_settings')
      .upsert({
        user_id: user.id,
        onboarding_completed: true,
        preferences: {
          research_interests,
        },
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id'
      })

    if (settingsError) {
      console.error('Error updating user settings:', settingsError)
      // Continue anyway
    }

    // Update auth user metadata
    const { error: metadataError } = await supabase.auth.updateUser({
      data: {
        full_name,
        institution,
        role,
        onboarding_completed: true,
      }
    })

    if (metadataError) {
      console.error('Error updating user metadata:', metadataError)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Onboarding error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  try {
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

    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if onboarding is completed
    const { data: settings } = await supabase
      .from('user_settings')
      .select('onboarding_completed')
      .eq('user_id', user.id)
      .single()

    // Also check user metadata as fallback
    const onboardingCompleted = settings?.onboarding_completed || 
      user.user_metadata?.onboarding_completed || 
      false

    return NextResponse.json({ 
      onboarding_completed: onboardingCompleted,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name,
      }
    })
  } catch (error) {
    console.error('Error checking onboarding status:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
