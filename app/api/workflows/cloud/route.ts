import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import crypto from 'crypto'

// Create cookie-based auth client
async function getSupabaseAuth() {
  const cookieStore = await cookies()
  return createServerClient(
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
            // Ignore errors in server context
          }
        },
      },
    }
  )
}

// Calculate credits for cloud job
function calculateCredits(nodeCount: number, computeTier: string = 'standard'): number {
  // Base: 1 credit per 5 nodes, minimum 2 credits
  const baseCredits = Math.max(2, Math.ceil(nodeCount / 5))
  
  // Tier multiplier
  const tierMultiplier = computeTier === 'high_memory' ? 1.5 : computeTier === 'gpu' ? 3.0 : 1.0
  
  return Math.ceil(baseCredits * tierMultiplier)
}

// Estimate job duration in seconds
function estimateDuration(nodeCount: number): number {
  // Much faster: ~0.3 seconds per node + 5 second overhead for cloud compute
  // 100 nodes = ~35 seconds, 1000 nodes = ~5 minutes
  return Math.ceil(5 + (nodeCount * 0.3))
}

// Create workflow hash for deduplication
function hashWorkflow(workflowData: object): string {
  const json = JSON.stringify(workflowData)
  return crypto.createHash('sha256').update(json).digest('hex').substring(0, 16)
}

// Helper to create job after credits check (for fallback path)
async function createJobWithCredits(
  supabase: ReturnType<typeof createServerClient>,
  userId: string,
  workflowData: { nodes: unknown[], edges?: unknown[], workflowName?: string },
  jobName: string | undefined,
  computeTier: string,
  nodeCount: number,
  creditsNeeded: number,
  currentCredits: number
) {
  // Deduct credits
  const { error: deductError } = await supabase
    .from('user_credits')
    .update({ 
      credits_balance: currentCredits - creditsNeeded,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId)

  if (deductError) {
    console.error('Error deducting credits:', deductError)
    return NextResponse.json({ 
      error: 'Failed to deduct credits' 
    }, { status: 500 })
  }

  // Create the job
  const workflowHash = hashWorkflow(workflowData)
  const estimatedDuration = estimateDuration(nodeCount)

  const { data: job, error: jobError } = await supabase
    .from('cloud_compute_jobs')
    .insert({
      user_id: userId,
      job_name: jobName || `Workflow (${nodeCount} nodes)`,
      node_count: nodeCount,
      estimated_duration_seconds: estimatedDuration,
      workflow_data: workflowData,
      workflow_hash: workflowHash,
      status: 'pending',
      compute_tier: computeTier,
      credits_charged: creditsNeeded
    })
    .select()
    .single()

  if (jobError) {
    console.error('Error creating job:', jobError)
    
    // Refund credits on failure
    await supabase
      .from('user_credits')
      .update({ credits_balance: currentCredits })
      .eq('user_id', userId)
    
    return NextResponse.json({ 
      error: 'Failed to create job' 
    }, { status: 500 })
  }

  // Log credit transaction
  await supabase
    .from('credit_transactions')
    .insert({
      user_id: userId,
      amount: -creditsNeeded,
      type: 'cloud_compute',
      description: `Cloud compute job: ${nodeCount} nodes`,
      metadata: { job_id: job.id, compute_tier: computeTier }
    })

  return NextResponse.json({
    success: true,
    job: {
      id: job.id,
      status: job.status,
      nodeCount: job.node_count,
      estimatedDuration: job.estimated_duration_seconds,
      creditsCharged: job.credits_charged,
      createdAt: job.created_at
    },
    message: `Job submitted! Processing ${nodeCount} nodes in the cloud.`
  })
}

// Create admin client for bypassing RLS
function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

// Check user's subscription tier (uses admin client to bypass RLS)
async function getSubscriptionTier(userId: string): Promise<string> {
  const supabaseAdmin = getSupabaseAdmin()
  let subscriptionTier = 'free'
  
  // Try 1: Get from users table (primary source - set by Stripe webhook)
  try {
    const { data: userData, error } = await supabaseAdmin
      .from('users')
      .select('subscription_tier, subscription_status')
      .eq('id', userId)
      .single()
    
    console.log('[Cloud Compute] Users table query:', { userId, userData, error: error?.message })
    
    if (userData?.subscription_tier && userData.subscription_tier !== 'free') {
      // Verify the subscription is active
      if (!userData.subscription_status || userData.subscription_status === 'active' || userData.subscription_status === 'trialing') {
        console.log('[Cloud Compute] Found active subscription:', userData.subscription_tier)
        return userData.subscription_tier
      }
    }
  } catch (e) {
    console.error('[Cloud Compute] Error querying users table:', e)
  }
  
  // Try 2: Get from stripe_subscriptions table (legacy)
  try {
    const { data: subscription, error } = await supabaseAdmin
      .from('stripe_subscriptions')
      .select('tier, status')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single()
    
    console.log('[Cloud Compute] stripe_subscriptions query:', { subscription, error: error?.message })
    
    if (subscription?.tier) {
      return subscription.tier
    }
  } catch (e) {
    console.error('[Cloud Compute] Error querying stripe_subscriptions:', e)
  }
  
  // Try 3: Get from user_profiles (fallback)
  try {
    const { data: profile, error } = await supabaseAdmin
      .from('user_profiles')
      .select('subscription_tier')
      .eq('id', userId)
      .single()
    
    console.log('[Cloud Compute] user_profiles query:', { profile, error: error?.message })
    
    if (profile?.subscription_tier) {
      return profile.subscription_tier
    }
  } catch (e) {
    console.error('[Cloud Compute] Error querying user_profiles:', e)
  }
  
  console.log('[Cloud Compute] No subscription found, defaulting to free')
  return subscriptionTier
}

// Check if tier has unlimited cloud compute
function hasUnlimitedCloudCompute(tier: string): boolean {
  const paidTiers = ['researcher', 'clinical', 'enterprise', 'pro', 'team']
  return paidTiers.includes(tier.toLowerCase())
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await getSupabaseAuth()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request body
    const body = await request.json()
    const { 
      workflowData,  // { nodes, edges, workflowName }
      jobName,       // Optional friendly name
      computeTier = 'standard' // 'standard', 'high_memory', 'gpu'
    } = body

    if (!workflowData || !workflowData.nodes) {
      return NextResponse.json({ 
        error: 'Invalid workflow data - nodes required' 
      }, { status: 400 })
    }

    const nodeCount = workflowData.nodes.length
    
    // Validate node count
    if (nodeCount < 1) {
      return NextResponse.json({ 
        error: 'Workflow must have at least 1 node' 
      }, { status: 400 })
    }
    
    if (nodeCount > 100000) {
      return NextResponse.json({ 
        error: 'Workflow exceeds maximum of 100,000 nodes' 
      }, { status: 400 })
    }

    // Check user's subscription tier FIRST (uses admin client to bypass RLS)
    const subscriptionTier = await getSubscriptionTier(user.id)
    console.log('[Cloud Compute] User subscription tier:', subscriptionTier)
    
    // If user has a paid subscription, skip credit check entirely
    if (hasUnlimitedCloudCompute(subscriptionTier)) {
      console.log('[Cloud Compute] User has unlimited cloud compute (paid tier)')
      
      // Create the job without charging credits
      const workflowHash = hashWorkflow(workflowData)
      const estimatedDuration = estimateDuration(nodeCount)

      const { data: job, error: jobError } = await supabase
        .from('cloud_compute_jobs')
        .insert({
          user_id: user.id,
          job_name: jobName || `Workflow (${nodeCount} nodes)`,
          node_count: nodeCount,
          estimated_duration_seconds: estimatedDuration,
          workflow_data: workflowData,
          workflow_hash: workflowHash,
          status: 'pending',
          compute_tier: computeTier,
          credits_charged: 0 // No credits charged for paid subscribers
        })
        .select()
        .single()

      if (jobError) {
        console.error('Error creating job:', jobError)
        return NextResponse.json({ 
          error: 'Failed to create job' 
        }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        job: {
          id: job.id,
          status: job.status,
          nodeCount: job.node_count,
          estimatedDuration: job.estimated_duration_seconds,
          creditsCharged: 0,
          createdAt: job.created_at
        },
        message: `Job submitted! Processing ${nodeCount} nodes in the cloud. (Included with ${subscriptionTier} plan)`
      })
    }

    // For free users, check credits
    const creditsNeeded = calculateCredits(nodeCount, computeTier)
    
    // Check user credits - use get_or_create function to ensure row exists
    const { data: creditsData, error: creditsError } = await supabase
      .rpc('get_or_create_user_credits', { p_user_id: user.id })
      .single()

    if (creditsError) {
      console.error('Error fetching credits:', creditsError)
      // Fallback: try direct query with credits_balance column
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('user_credits')
        .select('credits_balance, credits')
        .eq('user_id', user.id)
        .single()
      
      if (fallbackError) {
        console.error('Fallback credits query also failed:', fallbackError)
        return NextResponse.json({ 
          error: 'Failed to check credits. Please try again.' 
        }, { status: 500 })
      }
      
      const currentCredits = fallbackData?.credits_balance || fallbackData?.credits || 0
      
      if (currentCredits < creditsNeeded) {
        return NextResponse.json({ 
          error: `Insufficient credits. Need ${creditsNeeded}, have ${currentCredits}`,
          creditsNeeded,
          currentCredits
        }, { status: 402 })
      }
      
      // Continue with job creation using fallback credits
      return await createJobWithCredits(supabase, user.id, workflowData, jobName, computeTier, nodeCount, creditsNeeded, currentCredits)
    }

    const currentCredits = (creditsData as { credits_balance?: number })?.credits_balance || 0
    
    if (currentCredits < creditsNeeded) {
      return NextResponse.json({ 
        error: `Insufficient credits. Need ${creditsNeeded}, have ${currentCredits}`,
        creditsNeeded,
        currentCredits
      }, { status: 402 }) // Payment Required
    }

    // Deduct credits (use credits_balance column)
    const { error: deductError } = await supabase
      .from('user_credits')
      .update({ 
        credits_balance: currentCredits - creditsNeeded,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id)

    if (deductError) {
      console.error('Error deducting credits:', deductError)
      return NextResponse.json({ 
        error: 'Failed to deduct credits' 
      }, { status: 500 })
    }

    // Create the job
    const workflowHash = hashWorkflow(workflowData)
    const estimatedDuration = estimateDuration(nodeCount)

    const { data: job, error: jobError } = await supabase
      .from('cloud_compute_jobs')
      .insert({
        user_id: user.id,
        job_name: jobName || `Workflow (${nodeCount} nodes)`,
        node_count: nodeCount,
        estimated_duration_seconds: estimatedDuration,
        workflow_data: workflowData,
        workflow_hash: workflowHash,
        status: 'pending',
        compute_tier: computeTier,
        credits_charged: creditsNeeded
      })
      .select()
      .single()

    if (jobError) {
      console.error('Error creating job:', jobError)
      
      // Refund credits on failure
      await supabase
        .from('user_credits')
        .update({ credits_balance: currentCredits })
        .eq('user_id', user.id)
      
      return NextResponse.json({ 
        error: 'Failed to create job' 
      }, { status: 500 })
    }

    // Log credit transaction
    await supabase
      .from('credit_transactions')
      .insert({
        user_id: user.id,
        amount: -creditsNeeded,
        type: 'cloud_compute',
        description: `Cloud compute job: ${nodeCount} nodes`,
        metadata: { job_id: job.id, compute_tier: computeTier }
      })

    return NextResponse.json({
      success: true,
      job: {
        id: job.id,
        status: job.status,
        nodeCount: job.node_count,
        estimatedDuration: job.estimated_duration_seconds,
        creditsCharged: job.credits_charged,
        createdAt: job.created_at
      },
      message: `Job submitted! Processing ${nodeCount} nodes in the cloud.`
    })

  } catch (error) {
    console.error('Cloud submit error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

// GET endpoint to fetch user's recent jobs
export async function GET(request: NextRequest) {
  try {
    const supabase = await getSupabaseAuth()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') // Optional filter
    const limit = parseInt(searchParams.get('limit') || '10')

    let query = supabase
      .from('cloud_compute_jobs')
      .select('id, job_name, node_count, status, progress, created_at, started_at, completed_at, credits_charged, error_message')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(Math.min(limit, 50))

    if (status) {
      query = query.eq('status', status)
    }

    const { data: jobs, error } = await query

    if (error) {
      console.error('Error fetching jobs:', error)
      return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 })
    }

    return NextResponse.json({ jobs })

  } catch (error) {
    console.error('Jobs fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
