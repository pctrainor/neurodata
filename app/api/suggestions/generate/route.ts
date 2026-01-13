import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createSuggestionService } from '@/lib/personalized-suggestions'

/**
 * POST /api/suggestions/generate
 * 
 * Called after user completes onboarding to generate personalized suggestions.
 * This should be called from the onboarding completion flow.
 */
export async function POST(request: NextRequest) {
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
            cookiesToSet.forEach((cookie) => {
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

    // Get onboarding data from request body
    const body = await request.json()
    const { 
      background, 
      experience_level, 
      content_interests, 
      content_goals,
      full_name,
      institution 
    } = body

    // Validate required fields
    if (!background || !content_interests || content_interests.length === 0) {
      return NextResponse.json(
        { error: 'Missing required onboarding data' },
        { status: 400 }
      )
    }

    // Generate personalized suggestions
    const suggestionService = createSuggestionService()
    const suggestions = await suggestionService.generateSuggestionsForUser(user.id, {
      background,
      experience_level: experience_level || 'beginner',
      content_interests: content_interests || [],
      content_goals: content_goals || [],
      full_name,
      institution,
    })

    if (!suggestions) {
      // Log the error but don't fail the request - onboarding should still complete
      console.error('Failed to generate suggestions for user:', user.id)
      return NextResponse.json({ 
        success: true, 
        suggestions: null,
        message: 'Onboarding completed but suggestions generation failed. Suggestions will be generated on next login.'
      })
    }

    return NextResponse.json({
      success: true,
      suggestions: {
        id: suggestions.id,
        promptCount: suggestions.suggested_prompts?.length || 0,
        workflowCount: suggestions.suggested_workflows?.length || 0,
        searchCount: suggestions.suggested_searches?.length || 0,
        customPromptCount: suggestions.custom_prompts?.length || 0,
      }
    })
  } catch (error) {
    console.error('Error generating suggestions:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/suggestions/generate
 * 
 * Get the current user's personalized suggestions.
 */
export async function GET(request: NextRequest) {
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
            cookiesToSet.forEach((cookie) => {
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

    // Get user's suggestions
    const suggestionService = createSuggestionService()
    const suggestions = await suggestionService.getUserSuggestions(user.id)

    if (!suggestions) {
      return NextResponse.json({
        success: true,
        suggestions: null,
        message: 'No suggestions found. Complete onboarding to generate personalized suggestions.'
      })
    }

    return NextResponse.json({
      success: true,
      suggestions
    })
  } catch (error) {
    console.error('Error getting suggestions:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
