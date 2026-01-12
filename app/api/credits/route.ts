import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

// Credit costs for different operations
export const CREDIT_COSTS = {
  // Brain nodes by model
  brain_node_flash: 1,      // Gemini 2.0 Flash
  brain_node_haiku: 1.5,    // Claude 3 Haiku
  brain_node_gpt4_mini: 2,  // GPT-4o-mini
  brain_node_sonnet: 5,     // Claude 3.5 Sonnet
  brain_node_gpt4: 5,       // GPT-4o
  brain_node_opus: 10,      // Claude 3 Opus
  
  // Other nodes
  preprocessing_node: 0.5,
  analysis_node: 0.5,
  reference_data_query: 0.5,
  output_node: 0.25,
  
  // Workflow templates
  content_impact_analyzer: 110,  // 100 brain nodes + processing
  media_bias_analyzer: 15,
  ad_effectiveness_tester: 12,
  neuro_psych_screener: 8,
}

// Get Supabase admin client
function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// Get user from cookies
async function getSessionUser() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options as Parameters<typeof cookieStore.set>[2])
            )
          } catch {
            // Ignore
          }
        },
      },
    }
  )
  
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// GET - Get user's credit balance and usage
export async function GET() {
  try {
    const user = await getSessionUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = getSupabaseAdmin()

    // Get or create user credits
    const { data: credits, error: creditsError } = await supabase
      .rpc('get_or_create_user_credits', { p_user_id: user.id })

    if (creditsError) {
      // If function doesn't exist, return default values
      console.error('Credits function error:', creditsError)
      return NextResponse.json({
        credits_balance: 50,
        monthly_allocation: 50,
        credits_used_this_month: 0,
        bonus_credits: 0,
        tier_limits: {
          max_nodes_per_workflow: 10,
          max_concurrent_workflows: 1,
        },
        costs: CREDIT_COSTS,
      })
    }

    // Get tier limits
    const { data: tierLimits } = await supabase
      .from('tier_credit_allocations')
      .select('*')
      .eq('tier', credits?.subscription_tier || 'free')
      .single()

    // Get recent usage (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const { data: recentUsage } = await supabase
      .from('usage_log')
      .select('action_type, resource_type, credits_consumed, created_at')
      .eq('user_id', user.id)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(50)

    return NextResponse.json({
      credits_balance: credits?.credits_balance ?? 50,
      monthly_allocation: credits?.monthly_allocation ?? 50,
      credits_used_this_month: credits?.credits_used_this_month ?? 0,
      bonus_credits: credits?.bonus_credits ?? 0,
      month_reset_date: credits?.month_reset_date,
      tier_limits: tierLimits || {
        max_nodes_per_workflow: 10,
        max_concurrent_workflows: 1,
        priority_queue: false,
      },
      recent_usage: recentUsage || [],
      costs: CREDIT_COSTS,
    })
  } catch (error) {
    console.error('[credits] Error:', error)
    return NextResponse.json({ error: 'Failed to get credits' }, { status: 500 })
  }
}

// POST - Consume credits (called before workflow execution)
export async function POST(request: Request) {
  try {
    const user = await getSessionUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      amount, 
      workflow_id, 
      action_type = 'workflow_run',
      resource_type = 'brain_node',
      resource_details = {}
    } = body

    if (typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json({ error: 'Invalid credit amount' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    // Try to consume credits
    const { data: result, error } = await supabase
      .rpc('consume_credits', {
        p_user_id: user.id,
        p_amount: amount,
        p_workflow_id: workflow_id || null,
        p_action_type: action_type,
        p_resource_type: resource_type,
        p_resource_details: resource_details,
      })

    if (error) {
      console.error('Consume credits error:', error)
      return NextResponse.json({ error: 'Failed to consume credits' }, { status: 500 })
    }

    if (!result?.success) {
      return NextResponse.json({
        error: result?.error || 'Insufficient credits',
        required: result?.required,
        available: result?.available,
      }, { status: 402 }) // Payment Required
    }

    return NextResponse.json({
      success: true,
      credits_consumed: result.credits_consumed,
      new_balance: result.new_balance,
      credits_used_this_month: result.credits_used_this_month,
    })
  } catch (error) {
    console.error('[credits] POST error:', error)
    return NextResponse.json({ error: 'Failed to consume credits' }, { status: 500 })
  }
}
