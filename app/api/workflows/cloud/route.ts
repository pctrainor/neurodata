import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
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
  // 2 seconds per node + 10 second overhead
  return 10 + (nodeCount * 2)
}

// Create workflow hash for deduplication
function hashWorkflow(workflowData: object): string {
  const json = JSON.stringify(workflowData)
  return crypto.createHash('sha256').update(json).digest('hex').substring(0, 16)
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

    // Calculate credits needed
    const creditsNeeded = calculateCredits(nodeCount, computeTier)
    
    // Check user credits
    const { data: creditsData, error: creditsError } = await supabase
      .from('user_credits')
      .select('credits')
      .eq('user_id', user.id)
      .single()

    if (creditsError) {
      console.error('Error fetching credits:', creditsError)
      return NextResponse.json({ 
        error: 'Failed to check credits' 
      }, { status: 500 })
    }

    const currentCredits = creditsData?.credits || 0
    
    if (currentCredits < creditsNeeded) {
      return NextResponse.json({ 
        error: `Insufficient credits. Need ${creditsNeeded}, have ${currentCredits}`,
        creditsNeeded,
        currentCredits
      }, { status: 402 }) // Payment Required
    }

    // Deduct credits
    const { error: deductError } = await supabase
      .from('user_credits')
      .update({ 
        credits: currentCredits - creditsNeeded,
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
        .update({ credits: currentCredits })
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
