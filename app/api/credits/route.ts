import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { CREDIT_COSTS } from '@/lib/credit-costs'

export const dynamic = 'force-dynamic'

// Tier-based workflow limits
const TIER_WORKFLOW_LIMITS: Record<string, number> = {
  free: 3,
  researcher: -1, // Unlimited
  clinical: -1,   // Unlimited
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

// Helper to get current month start/end dates
function getCurrentMonthRange() {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  return { monthStart, monthEnd }
}

// GET - Get user's credit balance and usage
export async function GET() {
  try {
    const user = await getSessionUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = getSupabaseAdmin()
    const { monthStart, monthEnd } = getCurrentMonthRange()

    // Get user's subscription tier (try multiple sources)
    let subscriptionTier: string = 'free'
    
    // Try 1: Get from users table (set by Stripe webhook/sync)
    try {
      const { data: userData } = await supabase
        .from('users')
        .select('subscription_tier, subscription_status')
        .eq('id', user.id)
        .single()
      
      if (userData?.subscription_tier && userData.subscription_tier !== 'free') {
        // Verify the subscription is active
        if (!userData.subscription_status || userData.subscription_status === 'active' || userData.subscription_status === 'trialing') {
          subscriptionTier = userData.subscription_tier
        }
      }
    } catch {
      // Table might not exist
    }
    
    // Try 2: Get from Stripe subscriptions table (legacy)
    if (subscriptionTier === 'free') {
      try {
        const { data: subscription } = await supabase
          .from('stripe_subscriptions')
          .select('tier, status')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .single()
        
        if (subscription?.tier) {
          subscriptionTier = subscription.tier
        }
      } catch {
        // Table might not exist, try user profile
      }
    }
    
    // Try 3: Get from user profile (fallback)
    if (subscriptionTier === 'free') {
      try {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('subscription_tier')
          .eq('id', user.id)
          .single()
        
        if (profile?.subscription_tier) {
          subscriptionTier = profile.subscription_tier
        }
      } catch {
        // Profile might not exist
      }
    }
    
    console.log('[credits] User tier resolved:', { userId: user.id, tier: subscriptionTier })

    // Tier-based monthly allocations
    const TIER_ALLOCATIONS: Record<string, number> = {
      free: 50,
      researcher: 500,
      clinical: 2000,
    }

    // Count workflow runs this month
    let workflowsExecutedThisMonth = 0
    try {
      const { count } = await supabase
        .from('workflow_runs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', monthStart.toISOString())
        .lt('created_at', monthEnd.toISOString())
      
      workflowsExecutedThisMonth = count ?? 0
    } catch {
      // Table might not exist
    }

    // Get or create user credits (legacy support)
    let credits = null
    let creditsError = null
    
    try {
      const result = await supabase.rpc('get_or_create_user_credits', { p_user_id: user.id })
      credits = result.data
      creditsError = result.error
    } catch {
      creditsError = { message: 'RPC function not available' }
    }

    // If RPC failed, try direct table access
    if (creditsError || !credits) {
      const { data: directCredits } = await supabase
        .from('user_credits')
        .select('*')
        .eq('user_id', user.id)
        .single()
      
      credits = directCredits
    }

    const workflowsLimit = TIER_WORKFLOW_LIMITS[subscriptionTier] ?? 3
    const expectedAllocation = TIER_ALLOCATIONS[subscriptionTier] || 50

    // Fix credits if premium user has wrong allocation or zero balance
    if (credits && subscriptionTier !== 'free') {
      const needsUpdate = 
        credits.monthly_allocation !== expectedAllocation ||
        (credits.credits_balance === 0 && credits.credits_used_this_month === 0)
      
      if (needsUpdate) {
        console.log('[credits] Fixing credits for premium user:', { 
          userId: user.id, 
          tier: subscriptionTier,
          oldAllocation: credits.monthly_allocation,
          newAllocation: expectedAllocation
        })
        
        const newBalance = Math.max(credits.credits_balance, expectedAllocation) + (credits.bonus_credits || 0)
        
        await supabase
          .from('user_credits')
          .update({
            credits_balance: newBalance,
            monthly_allocation: expectedAllocation,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id)
        
        credits = { 
          ...credits, 
          credits_balance: newBalance, 
          monthly_allocation: expectedAllocation 
        }
      }
    } else if (!credits && subscriptionTier !== 'free') {
      // Create credits record for premium user
      console.log('[credits] Creating credits for premium user:', { userId: user.id, tier: subscriptionTier })
      
      const { data: newCredits, error: insertError } = await supabase
        .from('user_credits')
        .insert({
          user_id: user.id,
          credits_balance: expectedAllocation,
          monthly_allocation: expectedAllocation,
          credits_used_this_month: 0,
          bonus_credits: 0,
          month_reset_date: monthEnd.toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()
      
      if (!insertError && newCredits) {
        credits = newCredits
      }
    }

    if (!credits) {
      // If still no credits, return default values with workflow tracking
      console.error('Credits not found:', creditsError)
      return NextResponse.json({
        credits_balance: expectedAllocation,
        monthly_allocation: expectedAllocation,
        credits_used_this_month: 0,
        bonus_credits: 0,
        // New workflow execution tracking
        workflows_executed_this_month: workflowsExecutedThisMonth,
        workflows_limit: workflowsLimit,
        subscription_tier: subscriptionTier,
        month_reset_date: monthEnd.toISOString(),
        tier_limits: {
          max_nodes_per_workflow: subscriptionTier === 'free' ? 10 : 100,
          max_concurrent_workflows: subscriptionTier === 'free' ? 1 : 10,
          priority_queue: subscriptionTier !== 'free',
        },
        costs: CREDIT_COSTS,
      })
    }

    // Get tier limits
    const { data: tierLimits } = await supabase
      .from('tier_credit_allocations')
      .select('*')
      .eq('tier', subscriptionTier)
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
      // New workflow execution tracking
      workflows_executed_this_month: workflowsExecutedThisMonth ?? 0,
      workflows_limit: workflowsLimit,
      subscription_tier: subscriptionTier,
      month_reset_date: monthEnd.toISOString(),
      tier_limits: tierLimits || {
        max_nodes_per_workflow: subscriptionTier === 'free' ? 10 : 100,
        max_concurrent_workflows: subscriptionTier === 'free' ? 1 : 10,
        priority_queue: subscriptionTier !== 'free',
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
