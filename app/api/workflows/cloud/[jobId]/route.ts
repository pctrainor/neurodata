import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

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

interface RouteParams {
  params: Promise<{ jobId: string }>
}

// GET job status and results
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await getSupabaseAuth()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { jobId } = await params

    if (!jobId) {
      return NextResponse.json({ error: 'Job ID required' }, { status: 400 })
    }

    // Fetch job (RLS ensures only own jobs are returned)
    const { data: job, error } = await supabase
      .from('cloud_compute_jobs')
      .select('*')
      .eq('id', jobId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Job not found' }, { status: 404 })
      }
      console.error('Error fetching job:', error)
      return NextResponse.json({ error: 'Failed to fetch job' }, { status: 500 })
    }

    // For completed jobs, include full results
    // For running jobs, include progress info
    const response: Record<string, unknown> = {
      id: job.id,
      jobName: job.job_name,
      nodeCount: job.node_count,
      status: job.status,
      progress: job.progress || 0,
      currentNode: job.current_node,
      computeTier: job.compute_tier,
      creditsCharged: job.credits_charged,
      createdAt: job.created_at,
      startedAt: job.started_at,
      completedAt: job.completed_at,
      estimatedDuration: job.estimated_duration_seconds
    }

    if (job.status === 'completed') {
      response.result = job.result
      response.perNodeResults = job.per_node_results
    }

    if (job.status === 'failed') {
      response.errorMessage = job.error_message
      response.creditsRefunded = job.credits_refunded
    }

    // Calculate elapsed/remaining time
    if (job.started_at) {
      const started = new Date(job.started_at).getTime()
      const now = Date.now()
      const elapsed = Math.floor((now - started) / 1000)
      response.elapsedSeconds = elapsed
      
      if (job.status === 'running' && job.estimated_duration_seconds) {
        response.remainingSeconds = Math.max(0, job.estimated_duration_seconds - elapsed)
      }
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Job status error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE/PATCH to cancel a pending/queued job
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await getSupabaseAuth()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { jobId } = await params

    // Get the job first to check status and credits
    const { data: job, error: fetchError } = await supabase
      .from('cloud_compute_jobs')
      .select('id, status, credits_charged, user_id')
      .eq('id', jobId)
      .single()

    if (fetchError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    // Only cancel pending or queued jobs
    if (!['pending', 'queued'].includes(job.status)) {
      return NextResponse.json({ 
        error: `Cannot cancel job with status: ${job.status}` 
      }, { status: 400 })
    }

    // Update job status
    const { error: updateError } = await supabase
      .from('cloud_compute_jobs')
      .update({ 
        status: 'cancelled',
        completed_at: new Date().toISOString(),
        credits_refunded: true
      })
      .eq('id', jobId)
      .eq('user_id', user.id)

    if (updateError) {
      console.error('Error cancelling job:', updateError)
      return NextResponse.json({ error: 'Failed to cancel job' }, { status: 500 })
    }

    // Refund credits
    if (job.credits_charged > 0) {
      const { data: creditsData } = await supabase
        .from('user_credits')
        .select('credits')
        .eq('user_id', user.id)
        .single()

      const currentCredits = creditsData?.credits || 0

      await supabase
        .from('user_credits')
        .update({ 
          credits: currentCredits + job.credits_charged,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)

      // Log refund
      await supabase
        .from('credit_transactions')
        .insert({
          user_id: user.id,
          amount: job.credits_charged,
          type: 'refund',
          description: 'Cloud compute job cancelled - refund',
          metadata: { job_id: jobId }
        })
    }

    return NextResponse.json({ 
      success: true,
      message: 'Job cancelled and credits refunded',
      creditsRefunded: job.credits_charged
    })

  } catch (error) {
    console.error('Job cancel error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
