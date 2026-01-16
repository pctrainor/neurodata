import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { GoogleGenerativeAI } from '@google/generative-ai'
import 'dotenv/config'

// =============================================================================
// CONFIGURATION
// =============================================================================

const SUPABASE_URL = process.env.SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY! // Service role for full access
const GEMINI_API_KEY = process.env.GEMINI_API_KEY!

const POLL_INTERVAL_MS = 5000 // Poll every 5 seconds
const MAX_CONCURRENT_JOBS = 3 // Process up to 3 jobs at once
const NODE_TIMEOUT_MS = 30000 // 30 seconds per node

// =============================================================================
// TYPES
// =============================================================================

interface WorkflowNode {
  id: string
  type: string
  data: {
    label?: string
    behavior?: string
    category?: string
    subType?: string
  }
  position: { x: number; y: number }
}

interface WorkflowEdge {
  id: string
  source: string
  target: string
}

interface WorkflowData {
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  workflowName?: string
}

interface CloudJob {
  id: string
  user_id: string
  workflow_data: WorkflowData
  node_count: number
  status: string
  compute_tier: string
}

interface NodeResult {
  nodeId: string
  result: string | object
  status: 'completed' | 'error'
  processingTime: number
  error?: string
}

// =============================================================================
// INITIALIZE CLIENTS
// =============================================================================

const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false }
})

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)

// Track active jobs
const activeJobs = new Set<string>()

// =============================================================================
// AI PROCESSING
// =============================================================================

async function processNode(
  node: WorkflowNode,
  connectedResults: Record<string, string>,
  workflowContext: string
): Promise<NodeResult> {
  const startTime = Date.now()
  
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
    
    // Build prompt based on node type
    const prompt = buildNodePrompt(node, connectedResults, workflowContext)
    
    const result = await model.generateContent(prompt)
    const response = result.response.text()
    
    return {
      nodeId: node.id,
      result: response,
      status: 'completed',
      processingTime: Date.now() - startTime
    }
  } catch (error) {
    console.error(`Error processing node ${node.id}:`, error)
    return {
      nodeId: node.id,
      result: '',
      status: 'error',
      processingTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

function buildNodePrompt(
  node: WorkflowNode,
  connectedResults: Record<string, string>,
  workflowContext: string
): string {
  const nodeLabel = node.data?.label || node.type || 'Node'
  const nodeBehavior = node.data?.behavior || ''
  const nodeCategory = node.data?.category || ''
  
  let contextFromPreviousNodes = ''
  if (Object.keys(connectedResults).length > 0) {
    contextFromPreviousNodes = `
Previous node results to incorporate:
${Object.entries(connectedResults).map(([id, result]) => `- ${id}: ${result.substring(0, 500)}`).join('\n')}
`
  }
  
  // Customize prompt based on node type/category
  if (nodeCategory === 'analysis' || node.type?.includes('analysis')) {
    return `You are an AI agent performing data analysis in a neuroscience workflow.

Workflow: ${workflowContext}
Current Node: ${nodeLabel}
${nodeBehavior ? `Instructions: ${nodeBehavior}` : ''}
${contextFromPreviousNodes}

Analyze the data and provide insights. Be concise but thorough. Format with clear sections.`
  }
  
  if (nodeCategory === 'data' || node.type?.includes('data')) {
    return `You are an AI agent processing data in a neuroscience workflow.

Workflow: ${workflowContext}
Current Node: ${nodeLabel}
${nodeBehavior ? `Instructions: ${nodeBehavior}` : ''}
${contextFromPreviousNodes}

Process and transform the data as specified. Output structured results.`
  }
  
  if (nodeCategory === 'output_sink' || node.type === 'outputNode') {
    return `You are an AI agent creating a final summary for a neuroscience workflow.

Workflow: ${workflowContext}
Current Node: ${nodeLabel}
${contextFromPreviousNodes}

Synthesize all previous results into a comprehensive summary. Include:
1. Key findings
2. Main insights
3. Actionable recommendations
4. Any limitations or caveats

Format the output clearly with sections and bullet points.`
  }
  
  // Default prompt for brain/processing nodes
  return `You are an AI agent in a neuroscience data workflow.

Workflow: ${workflowContext}
Current Node: ${nodeLabel}
Type: ${node.type}
${nodeBehavior ? `Instructions: ${nodeBehavior}` : ''}
${contextFromPreviousNodes}

Execute the task for this node. Provide clear, structured output that can be used by downstream nodes.`
}

// =============================================================================
// WORKFLOW EXECUTION
// =============================================================================

async function executeWorkflow(job: CloudJob): Promise<{
  success: boolean
  perNodeResults: Record<string, NodeResult>
  finalResult: string | object
  error?: string
}> {
  const { workflow_data, node_count } = job
  const { nodes, edges, workflowName } = workflow_data
  
  const perNodeResults: Record<string, NodeResult> = {}
  const workflowContext = workflowName || `Workflow with ${node_count} nodes`
  
  // Build dependency graph
  const nodeById = new Map(nodes.map(n => [n.id, n]))
  const incomingEdges = new Map<string, string[]>()
  
  edges.forEach(edge => {
    const existing = incomingEdges.get(edge.target) || []
    existing.push(edge.source)
    incomingEdges.set(edge.target, existing)
  })
  
  // Find output nodes (process last)
  const outputNodeIds = new Set(
    nodes
      .filter(n => n.type === 'outputNode' || n.data?.category === 'output_sink')
      .map(n => n.id)
  )
  
  // Sort nodes by position (left to right, top to bottom) for processing order
  const processingOrder = nodes
    .filter(n => !outputNodeIds.has(n.id))
    .sort((a, b) => {
      if (Math.abs(a.position.x - b.position.x) > 100) {
        return a.position.x - b.position.x
      }
      return a.position.y - b.position.y
    })
  
  // Add output nodes at the end
  processingOrder.push(...nodes.filter(n => outputNodeIds.has(n.id)))
  
  console.log(`Processing ${processingOrder.length} nodes in order...`)
  
  // Process nodes
  for (let i = 0; i < processingOrder.length; i++) {
    const node = processingOrder[i]
    const progress = Math.round((i / processingOrder.length) * 100)
    
    // Update progress
    await supabase
      .from('cloud_compute_jobs')
      .update({
        progress,
        current_node: node.data?.label || node.id
      })
      .eq('id', job.id)
    
    console.log(`[${progress}%] Processing node: ${node.data?.label || node.id}`)
    
    // Collect results from connected upstream nodes
    const connectedResults: Record<string, string> = {}
    const upstreamIds = incomingEdges.get(node.id) || []
    
    upstreamIds.forEach(upId => {
      if (perNodeResults[upId]?.result) {
        const result = perNodeResults[upId].result
        connectedResults[upId] = typeof result === 'string' ? result : JSON.stringify(result)
      }
    })
    
    // Process the node
    const result = await processNode(node, connectedResults, workflowContext)
    perNodeResults[node.id] = result
    
    // Small delay to avoid rate limiting
    if (i < processingOrder.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 200))
    }
  }
  
  // Determine final result (from output node or last processed)
  const outputNode = processingOrder.find(n => outputNodeIds.has(n.id))
  const finalResult = outputNode
    ? perNodeResults[outputNode.id]?.result || 'No output generated'
    : perNodeResults[processingOrder[processingOrder.length - 1]?.id]?.result || 'Workflow completed'
  
  const hasErrors = Object.values(perNodeResults).some(r => r.status === 'error')
  
  return {
    success: !hasErrors,
    perNodeResults,
    finalResult,
    error: hasErrors ? 'Some nodes failed to process' : undefined
  }
}

// =============================================================================
// JOB PROCESSOR
// =============================================================================

async function processJob(job: CloudJob): Promise<void> {
  console.log(`\n${'='.repeat(60)}`)
  console.log(`Starting job: ${job.id}`)
  console.log(`Nodes: ${job.node_count}, Tier: ${job.compute_tier}`)
  console.log(`${'='.repeat(60)}\n`)
  
  activeJobs.add(job.id)
  
  try {
    // Mark as running
    await supabase
      .from('cloud_compute_jobs')
      .update({
        status: 'running',
        started_at: new Date().toISOString(),
        progress: 0
      })
      .eq('id', job.id)
    
    // Execute the workflow
    const result = await executeWorkflow(job)
    
    // Store results
    await supabase
      .from('cloud_compute_jobs')
      .update({
        status: result.success ? 'completed' : 'failed',
        progress: 100,
        result: result.finalResult,
        per_node_results: result.perNodeResults,
        error_message: result.error,
        completed_at: new Date().toISOString(),
        current_node: null
      })
      .eq('id', job.id)
    
    console.log(`\n✅ Job ${job.id} completed ${result.success ? 'successfully' : 'with errors'}`)
    
  } catch (error) {
    console.error(`\n❌ Job ${job.id} failed:`, error)
    
    // Mark as failed
    await supabase
      .from('cloud_compute_jobs')
      .update({
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error',
        completed_at: new Date().toISOString(),
        current_node: null
      })
      .eq('id', job.id)
    
    // Refund credits
    await refundCredits(job)
    
  } finally {
    activeJobs.delete(job.id)
  }
}

async function refundCredits(job: CloudJob): Promise<void> {
  try {
    // Get current credits
    const { data: creditsData } = await supabase
      .from('user_credits')
      .select('credits')
      .eq('user_id', job.user_id)
      .single()
    
    if (creditsData) {
      // Refund
      const { data: jobData } = await supabase
        .from('cloud_compute_jobs')
        .select('credits_charged')
        .eq('id', job.id)
        .single()
      
      const refundAmount = jobData?.credits_charged || 0
      
      if (refundAmount > 0) {
        await supabase
          .from('user_credits')
          .update({ credits: creditsData.credits + refundAmount })
          .eq('user_id', job.user_id)
        
        await supabase
          .from('cloud_compute_jobs')
          .update({ credits_refunded: true })
          .eq('id', job.id)
        
        console.log(`Refunded ${refundAmount} credits to user ${job.user_id}`)
      }
    }
  } catch (error) {
    console.error('Failed to refund credits:', error)
  }
}

// =============================================================================
// POLLING LOOP
// =============================================================================

async function pollForJobs(): Promise<void> {
  if (activeJobs.size >= MAX_CONCURRENT_JOBS) {
    return // At capacity
  }
  
  try {
    // Get pending jobs (oldest first)
    const { data: jobs, error } = await supabase
      .from('cloud_compute_jobs')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(MAX_CONCURRENT_JOBS - activeJobs.size)
    
    if (error) {
      console.error('Error fetching jobs:', error)
      return
    }
    
    if (jobs && jobs.length > 0) {
      console.log(`Found ${jobs.length} pending job(s)`)
      
      // Mark as queued and process
      for (const job of jobs) {
        if (!activeJobs.has(job.id)) {
          await supabase
            .from('cloud_compute_jobs')
            .update({ status: 'queued' })
            .eq('id', job.id)
          
          // Process job (don't await - run concurrently)
          processJob(job as CloudJob).catch(err => {
            console.error(`Unhandled error in job ${job.id}:`, err)
          })
        }
      }
    }
  } catch (error) {
    console.error('Polling error:', error)
  }
}

// =============================================================================
// MAIN
// =============================================================================

async function main(): Promise<void> {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║           Neurodata Cloud Compute Worker v1.0                ║
║           Processing large-scale AI workflows                ║
╚══════════════════════════════════════════════════════════════╝
`)
  
  console.log('Configuration:')
  console.log(`  - Poll interval: ${POLL_INTERVAL_MS}ms`)
  console.log(`  - Max concurrent jobs: ${MAX_CONCURRENT_JOBS}`)
  console.log(`  - Supabase URL: ${SUPABASE_URL?.substring(0, 30)}...`)
  console.log(`  - Gemini API: ${GEMINI_API_KEY ? 'Configured' : 'MISSING!'}`)
  console.log('')
  
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !GEMINI_API_KEY) {
    console.error('Missing required environment variables!')
    console.error('Required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GEMINI_API_KEY')
    process.exit(1)
  }
  
  console.log('Starting polling loop...\n')
  
  // Initial poll
  await pollForJobs()
  
  // Set up polling interval
  setInterval(pollForJobs, POLL_INTERVAL_MS)
  
  // Keep process alive
  process.on('SIGTERM', () => {
    console.log('\nReceived SIGTERM, shutting down gracefully...')
    process.exit(0)
  })
  
  process.on('SIGINT', () => {
    console.log('\nReceived SIGINT, shutting down gracefully...')
    process.exit(0)
  })
}

main().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
