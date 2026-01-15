'use server'

import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Initialize Gemini
const geminiApiKey = 
  process.env.GOOGLE_GEMINI_API_KEY || 
  process.env.GEMINI_API_KEY || 
  process.env.GOOGLE_GENERATIVE_AI_API_KEY || 
  ''

const genAI = geminiApiKey ? new GoogleGenerativeAI(geminiApiKey) : null

// Initialize Supabase Admin
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

// Tier-based workflow limits
const TIER_WORKFLOW_LIMITS: Record<string, number> = {
  free: 3,
  researcher: -1, // Unlimited
  clinical: -1,   // Unlimited
}

// Get user from session cookies
async function getSessionUser() {
  try {
    const cookieStore = await cookies()
    const supabaseClient = createServerClient(
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
    
    const { data: { user } } = await supabaseClient.auth.getUser()
    return user
  } catch {
    return null
  }
}

// Get current month range for execution counting
function getCurrentMonthRange() {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  return { monthStart, monthEnd }
}

// Check if user can execute a workflow (based on tier limits)
async function canExecuteWorkflow(userId: string): Promise<{ allowed: boolean; reason?: string; remaining?: number }> {
  const { monthStart, monthEnd } = getCurrentMonthRange()
  
  // Get user's subscription tier (try multiple sources)
  let subscriptionTier = 'free'
  
  // Try 1: Get from users table (primary source - set by Stripe webhook)
  try {
    const { data: userData } = await supabase
      .from('users')
      .select('subscription_tier, subscription_status')
      .eq('id', userId)
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
  
  // Try 2: Get from stripe_subscriptions table (legacy)
  if (subscriptionTier === 'free') {
    try {
      const { data: subscription } = await supabase
        .from('stripe_subscriptions')
        .select('tier, status')
        .eq('user_id', userId)
        .eq('status', 'active')
        .single()
      
      if (subscription?.tier) {
        subscriptionTier = subscription.tier
      }
    } catch {
      // Table might not exist
    }
  }
  
  // Try 3: Get from user_profiles (fallback)
  if (subscriptionTier === 'free') {
    try {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('subscription_tier')
        .eq('id', userId)
        .single()
      
      if (profile?.subscription_tier) {
        subscriptionTier = profile.subscription_tier
      }
    } catch {
      // Default to free tier
    }
  }
  
  console.log('[canExecuteWorkflow] User tier resolved:', { userId, tier: subscriptionTier })
  
  const limit = TIER_WORKFLOW_LIMITS[subscriptionTier] ?? 3
  
  // Unlimited tier
  if (limit === -1) {
    return { allowed: true, remaining: -1 }
  }
  
  // Count executions this month from workflow_runs table
  let executedCount = 0
  try {
    const { count } = await supabase
      .from('workflow_runs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', monthStart.toISOString())
      .lt('created_at', monthEnd.toISOString())
    
    executedCount = count ?? 0
  } catch {
    // Table might not exist, allow execution
    return { allowed: true, remaining: limit }
  }
  
  const remaining = Math.max(0, limit - executedCount)
  
  if (executedCount >= limit) {
    return { 
      allowed: false, 
      reason: `You've used all ${limit} workflow executions for this month. Upgrade to get unlimited workflows.`,
      remaining: 0
    }
  }
  
  return { allowed: true, remaining: remaining - 1 } // -1 because we're about to execute
}

// Record a workflow execution and deduct credits
async function recordWorkflowExecution(userId: string, workflowId: string, workflowName: string, nodesCount: number) {
  try {
    // Calculate credits based on node count (1 credit per node, minimum 1)
    const creditsToDeduct = Math.max(1, nodesCount)
    
    console.log(`🔄 Recording workflow execution for user ${userId}:`, {
      workflowId,
      workflowName,
      nodesCount,
      creditsToDeduct
    })
    
    // Deduct credits using the consume_credits function
    // Note: workflow_id must be NULL for the RPC if it's not a valid UUID
    const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(workflowId)
    
    const { data: creditResult, error: creditError } = await supabase
      .rpc('consume_credits', {
        p_user_id: userId,
        p_amount: creditsToDeduct,
        p_workflow_id: isValidUUID ? workflowId : null,
        p_action_type: 'workflow_run',
        p_resource_type: 'ai_analysis',
        p_resource_details: {
          workflow_name: workflowName,
          nodes_count: nodesCount,
          timestamp: new Date().toISOString()
        }
      })
    
    if (creditError) {
      console.warn('❌ Failed to deduct credits:', creditError)
      // Continue anyway - don't block workflow execution for credit errors
    } else if (creditResult && !creditResult.success) {
      console.warn('⚠️ Insufficient credits:', creditResult)
      // Could throw here to block execution, but for now just warn
    } else {
      console.log(`✅ Deducted ${creditsToDeduct} credits for workflow run. New balance:`, creditResult?.new_balance)
    }
    
    // Record the execution in workflow_runs table
    // Schema: run_id (auto), user_id, status, started_at, completed_at, created_at
    const { error: insertError } = await supabase.from('workflow_runs').insert({
      user_id: userId,
      status: 'completed',
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    })
    
    if (insertError) {
      console.error('❌ Failed to insert workflow_run:', insertError)
      return false
    }
    
    console.log(`✅ Recorded workflow run successfully`)
    return true
  } catch (error) {
    console.error('❌ Failed to record workflow execution:', error)
    return false
  }
}

interface WorkflowNode {
  id: string
  type: string
  data: {
    label: string
    description?: string
    regionId?: string
    regionName?: string
    regionAbbreviation?: string
    dataSource?: string
    analysisType?: string
    [key: string]: unknown
  }
  position: { x: number; y: number }
}

interface WorkflowEdge {
  id: string
  source: string
  target: string
}

interface WorkflowPayload {
  workflowId?: string
  workflowName?: string
  name?: string // Frontend sends 'name'
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
}

// Build a context-aware prompt based on workflow nodes
function buildPrompt(nodes: WorkflowNode[], edges: WorkflowEdge[]): string {
  // Categorize nodes by type
  const regionNodes = nodes.filter(n => n.type === 'brainRegion' || n.data.regionId)
  const dataNodes = nodes.filter(n => n.type === 'data' || n.type === 'dataNode')
  const analysisNodes = nodes.filter(n => n.type === 'analysis' || n.type === 'brain' || n.type === 'analysisNode')
  const outputNodes = nodes.filter(n => n.type === 'output' || n.type === 'outputNode')
  
  // NEW: Content Impact Analyzer detection
  const brainNodes = nodes.filter(n => n.type === 'brainNode')
  const contentUrlNodes = nodes.filter(n => n.type === 'contentUrlInputNode' || n.data.subType === 'url')
  const newsArticleNodes = nodes.filter(n => n.type === 'newsArticleNode')
  const preprocessingNodes = nodes.filter(n => n.type === 'preprocessingNode')
  const referenceDataNodes = nodes.filter(n => n.type === 'referenceDatasetNode')
  const aggregatorNodes = nodes.filter(n => n.data.label?.includes('Aggregator') || n.data.label?.includes('Consensus'))
  
  // NEW: Specialized node detection
  const referenceNodes = nodes.filter(n => n.type === 'reference' || n.type === 'referenceDatasetNode' || n.data.label?.includes('HCP') || n.data.label?.includes('Reference'))
  const comparisonNodes = nodes.filter(n => n.type === 'comparison' || n.type === 'comparisonAgentNode' || n.data.label?.includes('Deviation') || n.data.label?.includes('Comparison'))
  const tbiNodes = nodes.filter(n => n.data.label?.toLowerCase().includes('tbi') || n.data.label?.toLowerCase().includes('traumatic'))
  const patientNodes = nodes.filter(n => n.data.label?.toLowerCase().includes('patient') || n.data.label?.toLowerCase().includes('upload'))

  // === GENERAL-PURPOSE AI WORKFLOW DETECTION ===
  // Check if this is a general-purpose workflow (no neuroscience-specific nodes)
  const hasNeuroNodes = regionNodes.length > 0 || referenceNodes.length > 0 || 
                        comparisonNodes.length > 0 || tbiNodes.length > 0 ||
                        preprocessingNodes.some(n => 
                          n.data.label?.toLowerCase().includes('fmri') || 
                          n.data.label?.toLowerCase().includes('eeg') ||
                          n.data.label?.toLowerCase().includes('mri')
                        )
  
  // Check if any brainNode is in general mode
  const hasGeneralAI = brainNodes.some(n => n.data.mode === 'general' || n.data.label === 'AI Assistant')
  
  // If no neuro nodes and we have general AI nodes, use general-purpose prompt
  if (!hasNeuroNodes && (hasGeneralAI || brainNodes.length > 0)) {
    // Build context from data nodes - including file content
    const inputContext = dataNodes.map(d => {
      const label = d.data.label || 'Input'
      
      // Check for file content first (uploaded JSON/CSV files)
      if (d.data.fileContent) {
        const fileName = d.data.fileName || 'uploaded file'
        const content = typeof d.data.fileContent === 'string' 
          ? d.data.fileContent 
          : JSON.stringify(d.data.fileContent, null, 2)
        // Truncate if very large
        const truncatedContent = content.length > 10000 
          ? content.substring(0, 10000) + '\n... (truncated)'
          : content
        return `**${label}** (from ${fileName}):\n\`\`\`json\n${truncatedContent}\n\`\`\``
      }
      
      // Fallback to other data sources
      const value = d.data.value || d.data.textContent || d.data.description || ''
      if (!value) {
        // Skip empty inputs or mark as optional
        return `**${label}**: (no specific constraints - use your best judgment)`
      }
      return `**${label}**: ${value}`
    }).filter(Boolean).join('\n\n')
    
    // Get the AI node's intended purpose from its label
    const aiNodeLabels = brainNodes.map(n => n.data.label || 'AI').join(', ')
    
    return `You are a helpful, versatile AI assistant performing a specific task. DO NOT ask for more information - work with what you have and generate the best possible output NOW.

## Your Role
${aiNodeLabels}

## Input Data
${inputContext || 'No specific constraints - use your creativity and best judgment.'}

## CRITICAL INSTRUCTION
You MUST generate complete, actionable output immediately. Do NOT:
- Say you are "waiting for input"
- Ask clarifying questions
- Say you need more information
- Respond with meta-commentary about what you would do

Instead, DO:
- Use any provided data fully
- Make reasonable assumptions for missing information
- Generate creative, complete output
- Deliver a finished result

## Task Guidelines
Based on your role "${aiNodeLabels}", generate appropriate output:
- For recipe tasks: Create complete recipes with ingredients, steps, and tips
- For grading tasks: Provide scores, detailed feedback, and improvement suggestions
- For creative tasks: Generate complete, polished creative content
- For analysis tasks: Deliver thorough, structured analysis
- For planning tasks: Create organized plans with clear steps and timelines

## Output Format
Provide your response in well-organized markdown with clear sections, bullet points, and formatting as appropriate for the task.`
  }
  
  // === CONTENT IMPACT ANALYZER WORKFLOW ===
  const isContentImpactAnalyzer = brainNodes.length >= 10 && (contentUrlNodes.length > 0 || newsArticleNodes.length > 0)
  
  if (isContentImpactAnalyzer) {
    // Extract content URL - try video first, then news article
    const contentUrl = contentUrlNodes[0]?.data?.url || contentUrlNodes[0]?.data?.value || 
                       newsArticleNodes[0]?.data?.url || 'Content'
    const videoTitle = contentUrlNodes[0]?.data?.videoTitle || 
                       newsArticleNodes[0]?.data?.label || 'Submitted Content'
    
    // Group brain nodes by their layer/function
    const emotionNodes = brainNodes.filter(n => n.data.label?.includes('Emotion') || n.data.label?.includes('Amygdala') || n.data.label?.includes('Insula'))
    const attentionNodes = brainNodes.filter(n => n.data.label?.includes('Attention') || n.data.label?.includes('ACC') || n.data.label?.includes('Parietal'))
    const rewardNodes = brainNodes.filter(n => n.data.label?.includes('Reward') || n.data.label?.includes('Nucleus') || n.data.label?.includes('Dopamine'))
    const memoryNodes = brainNodes.filter(n => n.data.label?.includes('Memory') || n.data.label?.includes('Hippocampus'))
    const socialNodes = brainNodes.filter(n => n.data.label?.includes('Social') || n.data.label?.includes('TPJ') || n.data.label?.includes('STS'))
    const decisionNodes = brainNodes.filter(n => n.data.label?.includes('Decision') || n.data.label?.includes('DLPFC') || n.data.label?.includes('vmPFC'))
    const languageNodes = brainNodes.filter(n => n.data.label?.includes('Language') || n.data.label?.includes('Broca') || n.data.label?.includes('Wernicke'))
    const motorNodes = brainNodes.filter(n => n.data.label?.includes('Motor') || n.data.label?.includes('SMA') || n.data.label?.includes('Mirror'))
    
    // Build a comprehensive content analysis prompt
    return `You are an advanced neuromarketing AI that simulates ${brainNodes.length} distinct brain processing nodes to analyze content impact.

## Content Being Analyzed
**URL**: ${contentUrl}
**Title**: ${videoTitle}

## Brain Processing Simulation
You are simulating ${brainNodes.length} brain region processors in parallel:

### Emotional Processing Layer (${emotionNodes.length} nodes)
${emotionNodes.map(n => `- ${n.data.label}: ${n.data.description || 'Analyzing emotional valence and arousal'}`).join('\n')}

### Attention Network (${attentionNodes.length} nodes)  
${attentionNodes.map(n => `- ${n.data.label}: ${n.data.description || 'Tracking attentional capture and sustained focus'}`).join('\n')}

### Reward Circuit (${rewardNodes.length} nodes)
${rewardNodes.map(n => `- ${n.data.label}: ${n.data.description || 'Evaluating dopaminergic response and motivation'}`).join('\n')}

### Memory Systems (${memoryNodes.length} nodes)
${memoryNodes.map(n => `- ${n.data.label}: ${n.data.description || 'Predicting memory encoding strength'}`).join('\n')}

### Social Cognition (${socialNodes.length} nodes)
${socialNodes.map(n => `- ${n.data.label}: ${n.data.description || 'Evaluating social relevance and virality potential'}`).join('\n')}

### Decision/Executive (${decisionNodes.length} nodes)
${decisionNodes.map(n => `- ${n.data.label}: ${n.data.description || 'Analyzing call-to-action effectiveness'}`).join('\n')}

### Language Processing (${languageNodes.length} nodes)
${languageNodes.map(n => `- ${n.data.label}: ${n.data.description || 'Evaluating message clarity and persuasion'}`).join('\n')}

### Motor/Action (${motorNodes.length} nodes)
${motorNodes.map(n => `- ${n.data.label}: ${n.data.description || 'Predicting physical engagement and mimicry'}`).join('\n')}

${referenceDataNodes.length > 0 ? `
## Reference Baselines
${referenceDataNodes.map(n => `- ${n.data.label}: ${n.data.description || 'Normative comparison data'}`).join('\n')}
` : ''}

## Your Task: Generate Comprehensive Content Impact Report

Analyze the content as if ${brainNodes.length} brain processing units are evaluating it in parallel. Provide:

### 1. Executive Summary
- Overall Engagement Score (0-100)
- Key Strengths
- Key Weaknesses
- Viral Potential Rating

### 2. Emotional Response Profile
- Primary emotions triggered
- Emotional intensity (1-10)
- Emotional arc through the content
- Valence (positive/negative balance)

### 3. Attention Analysis
- First 3-second hook effectiveness
- Attention sustaining elements
- Drop-off risk moments
- Pattern interrupt frequency

### 4. Reward & Motivation
- Dopamine trigger points
- Reward anticipation elements
- Satisfaction payoff
- Re-watch motivation

### 5. Memory & Recall
- Memory encoding strength
- Key memorable moments
- Brand/message association strength
- 24-hour recall prediction

### 6. Social & Sharing
- Social proof elements
- Share motivation type (pride, humor, info)
- Comment/debate triggers
- Community alignment

### 7. Action & Conversion
- Call-to-action clarity
- Purchase/subscribe intent
- Next-step friction analysis
- Urgency perception

### 8. Per-Node Analysis Summary
Provide a table showing each major brain region's activation level (0-10) and key insight.

### 9. Optimization Recommendations
- Top 3 improvements for engagement
- Specific timing/edit suggestions
- A/B testing ideas

Be specific, quantitative where possible, and actionable. Reference actual content elements.`
  }
  
  // Detect workflow type/persona
  const isPatientComparison = patientNodes.length > 0 && referenceNodes.length > 0
  const isTBIAnalysis = tbiNodes.length > 0
  const isDeviationAnalysis = comparisonNodes.length > 0
  const isResearchMode = !isPatientComparison && !isTBIAnalysis

  // Extract region context
  const regionContext = regionNodes.length > 0
    ? regionNodes.map(r => {
        const name = r.data.regionName || r.data.label || 'Unknown Region'
        const abbrev = r.data.regionAbbreviation || ''
        return `- ${name}${abbrev ? ` (${abbrev})` : ''}`
      }).join('\n')
    : null

  // Extract reference dataset context
  const referenceContext = referenceNodes.length > 0
    ? referenceNodes.map(r => {
        const label = r.data.label || 'Reference Dataset'
        const subjects = r.data.subjects || r.data.description || ''
        return `- ${label}${subjects ? `: ${subjects}` : ''}`
      }).join('\n')
    : null

  // Extract comparison/analysis context
  const comparisonContext = comparisonNodes.length > 0
    ? comparisonNodes.map(c => {
        const label = c.data.label || 'Comparison'
        const type = c.data.comparisonType || 'deviation'
        return `- ${label} (${type} analysis)`
      }).join('\n')
    : null

  // Extract data source context
  const dataContext = dataNodes.length > 0
    ? dataNodes.map(d => `- ${d.data.label}: ${d.data.description || 'No description'}`).join('\n')
    : null

  // Extract analysis context
  const analysisContext = analysisNodes.length > 0
    ? analysisNodes.map(a => `- ${a.data.label}: ${a.data.description || 'Neural analysis'}`).join('\n')
    : null

  // Build the prompt based on workflow type
  let prompt = ''
  
  // === PATIENT COMPARISON WORKFLOW (Regular Person / Legal) ===
  if (isPatientComparison || isDeviationAnalysis) {
    prompt = `You are a clinical neuroscience assistant specializing in individual patient analysis against normative databases.

## Workflow Type: Patient vs. Control Group Comparison

`
    if (referenceContext) {
      prompt += `## Reference Datasets (Healthy Controls)
${referenceContext}

These normative datasets provide the baseline for comparison. The patient's data will be statistically compared against these healthy populations.

`
    }

    if (regionContext) {
      prompt += `## Target Brain Regions
${regionContext}

Focus the deviation analysis on these specific regions.

`
    }

    if (comparisonContext) {
      prompt += `## Comparison Methods
${comparisonContext}

`
    }

    // TBI-specific additions
    if (isTBIAnalysis) {
      prompt += `## TBI Analysis Mode
This analysis is configured for Traumatic Brain Injury assessment. Focus on:
- White matter tract integrity (DTI/Tractography)
- Common TBI-affected regions: Corpus Callosum, Frontal-Temporal connections
- Axonal shearing patterns
- Functional implications of detected deviations

`
    }

    prompt += `## Task: Generate Patient Deviation Report
Provide a structured clinical report including:

1. **Executive Summary**: Brief overview of key findings
2. **Deviation Analysis**: 
   - Which regions/tracts show significant deviation from healthy controls
   - Statistical significance (z-scores, percentile rankings)
   - "Your [region] connectivity is in the Xth percentile compared to healthy adults"
3. **Clinical Implications**: What these deviations might mean functionally
4. **Comparison to Literature**: How these patterns compare to published findings
5. **Recommendations**: Suggested follow-up assessments or interventions

Format the output to be:
- Understandable by a patient (use plain language explanations)
- Defensible in court (cite statistical methods)
- Actionable for clinicians (suggest next steps)

Be specific with percentiles and z-scores where appropriate.`

  // === TBI-SPECIFIC WORKFLOW ===
  } else if (isTBIAnalysis) {
    prompt = `You are a forensic neuroscience expert specializing in Traumatic Brain Injury documentation and analysis.

## Workflow Type: TBI Evidence Generation

`
    if (regionContext) {
      prompt += `## Target Brain Regions
${regionContext}

`
    }

    if (referenceContext) {
      prompt += `## Normative Reference
${referenceContext}

`
    }

    prompt += `## Task: Generate TBI Evidence Report
Provide a medico-legal report including:

1. **Injury Pattern Analysis**: Describe typical TBI patterns in the specified regions
2. **White Matter Assessment**: Focus on major fiber bundles (Corpus Callosum, Arcuate Fasciculus, Corticospinal Tract)
3. **Deviation Quantification**: Statistical evidence of abnormality vs healthy population
4. **Functional Correlates**: Link structural findings to symptoms (cognitive fog, memory issues, etc.)
5. **Causation Opinion**: How findings relate to reported mechanism of injury
6. **Prognosis**: Expected recovery trajectory based on deviation severity

This report should be suitable for:
- Personal injury litigation
- Insurance claims
- Disability documentation

Cite relevant neuroscience literature and use precise statistical language.`

  // === RESEARCH/DISCOVERY WORKFLOW ===
  } else {
    prompt = `You are a neuroscience research assistant specializing in brain imaging analysis.

`

    if (regionContext) {
      prompt += `## Target Brain Regions
The analysis should focus specifically on the following brain regions:
${regionContext}

Provide region-specific insights, known functions, connectivity patterns, and relevant research findings for these areas.

`
    }

    if (dataContext) {
      prompt += `## Data Sources
The following data sources are being used:
${dataContext}

Consider data quality, preprocessing requirements, and compatibility with the specified brain regions.

`
    }

    if (analysisContext) {
      prompt += `## Analysis Pipeline
The following analyses have been configured:
${analysisContext}

`
    }

    prompt += `## Task
Based on the workflow configuration above, provide:
1. **Region Overview**: Key anatomical and functional characteristics of the target regions
2. **Analysis Recommendations**: Specific methodological approaches for these regions
3. **Expected Findings**: What patterns or results might be expected based on the literature
4. **Quality Considerations**: Potential artifacts or issues to watch for
5. **Related Research**: Key studies or datasets that might be relevant

Be specific, cite relevant neuroscience concepts, and provide actionable guidance.`
  }

  return prompt
}

// Detect simulation-type workflows (students taking tests, agents processing data, etc.)
function detectSimulationWorkflow(nodes: WorkflowNode[], workflowName: string): {
  isSimulation: boolean
  simulationType: 'test' | 'agents' | 'parallel' | null
  dataSourceNode: WorkflowNode | null
  agentNodes: WorkflowNode[]
  analysisNode: WorkflowNode | null
  outputNode: WorkflowNode | null
} {
  const dataNodes = nodes.filter(n => n.type === 'dataNode' || n.type === 'data')
  
  // Detect agent nodes by type OR by label patterns
  const orchestratorNodes = nodes.filter(n => {
    // Match by node type
    if (n.type === 'brainOrchestratorNode' || n.type === 'brainNode') return true
    
    // Match by label pattern
    const label = n.data?.label?.toLowerCase() || ''
    const agentPatterns = [
      'student', 'agent', 'participant', 'player', 'viewer', 
      'user', 'person', 'tester', 'respondent', 'reviewer',
      'analyst', 'evaluator', 'grader', 'worker'
    ]
    return agentPatterns.some(pattern => label.includes(pattern))
  })
  
  const analysisNodes = nodes.filter(n => 
    n.type === 'analysisNode' || 
    n.data?.label?.toLowerCase().includes('analysis') ||
    n.data?.label?.toLowerCase().includes('aggregator') ||
    n.data?.label?.toLowerCase().includes('summary')
  )
  const outputNodes = nodes.filter(n => n.type === 'outputNode' || n.data?.label?.toLowerCase().includes('output'))
  
  // Check for test/exam simulation patterns
  const isTestSimulation = (
    workflowName.toLowerCase().includes('test') ||
    workflowName.toLowerCase().includes('exam') ||
    workflowName.toLowerCase().includes('sat') ||
    workflowName.toLowerCase().includes('simulation') ||
    dataNodes.some(n => 
      n.data?.label?.toLowerCase().includes('question') ||
      n.data?.label?.toLowerCase().includes('exam') ||
      n.data?.label?.toLowerCase().includes('test')
    )
  ) && orchestratorNodes.length >= 2
  
  // Check for parallel agent processing
  const isAgentSimulation = orchestratorNodes.length >= 3 && dataNodes.length >= 1
  
  if (isTestSimulation || isAgentSimulation) {
    return {
      isSimulation: true,
      simulationType: isTestSimulation ? 'test' : 'agents',
      dataSourceNode: dataNodes[0] || null,
      agentNodes: orchestratorNodes,
      analysisNode: analysisNodes[0] || null,
      outputNode: outputNodes[0] || null
    }
  }
  
  return {
    isSimulation: false,
    simulationType: null,
    dataSourceNode: null,
    agentNodes: [],
    analysisNode: null,
    outputNode: null
  }
}

// Build a simulation workflow prompt
function buildSimulationPrompt(
  nodes: WorkflowNode[], 
  edges: WorkflowEdge[],
  simulation: ReturnType<typeof detectSimulationWorkflow>,
  workflowName: string
): string {
  const { dataSourceNode, agentNodes, analysisNode, outputNode } = simulation
  
  // Build list of agent node IDs for per-node results
  const agentNodeList = agentNodes.map((n, i) => 
    `  - nodeId: "${n.id}", nodeName: "${n.data?.label || `Agent ${i + 1}`}"`
  ).join('\n')
  
  const dataDescription = dataSourceNode?.data?.label || 'Input Data'
  
  // Get actual file content if available
  let dataDetails = dataSourceNode?.data?.sampleDataDescription || dataSourceNode?.data?.description || 'Sample dataset'
  
  // Include file content if present
  let actualDataContent = ''
  if (dataSourceNode?.data?.fileContent) {
    const content = typeof dataSourceNode.data.fileContent === 'string' 
      ? dataSourceNode.data.fileContent 
      : JSON.stringify(dataSourceNode.data.fileContent, null, 2)
    // Truncate if very large
    actualDataContent = content.length > 8000 
      ? content.substring(0, 8000) + '\n... (truncated)'
      : content
    dataDetails = `${dataSourceNode.data.fileName || 'uploaded file'} - ${dataDetails}`
  } else if (dataSourceNode?.data?.textContent) {
    actualDataContent = String(dataSourceNode.data.textContent)
  } else if (dataSourceNode?.data?.value) {
    actualDataContent = typeof dataSourceNode.data.value === 'string' 
      ? dataSourceNode.data.value 
      : JSON.stringify(dataSourceNode.data.value, null, 2)
  }
  
  if (simulation.simulationType === 'test') {
    return `You are simulating ${agentNodes.length} participants taking a test/exam.

## Simulation Context
**Workflow Name**: ${workflowName}
**Data Source**: ${dataDescription}
**Data Details**: ${dataDetails}
**Number of Participants**: ${agentNodes.length}
${analysisNode ? `**Analysis**: ${analysisNode.data?.label}` : ''}
${outputNode ? `**Output**: ${outputNode.data?.label}` : ''}

${actualDataContent ? `## Actual Input Data
\`\`\`json
${actualDataContent}
\`\`\`
` : ''}
## Participant List (Use these EXACT nodeIds in your response)
${agentNodeList}

## Your Task: Run the Simulation

### Step 1: Generate Sample Test Data
First, generate a realistic set of test questions based on the data source description. For SAT-style tests, include:
- Multiple choice questions with 4 options (A, B, C, D)
- At least 20 sample questions across Math, Reading, and Writing sections
- Varying difficulty levels

### Step 2: Simulate Each Participant
For each participant node listed above, simulate them taking the test with:
- Realistic time spent per question (some faster, some slower)
- Individual performance characteristics (some excel at math, others at reading)
- Natural variation in scores
- Personality traits affecting test-taking style

### Step 3: Generate Individual Results
Create a "perNodeResults" array with an object for EACH participant containing:
- "nodeId": EXACT nodeId from the list above
- "nodeName": Participant name
- "score": Overall percentage score (0-100)
- "mathScore": Math section score
- "readingScore": Reading section score  
- "writingScore": Writing section score
- "timeSpent": Total time in minutes
- "questionsAnswered": Number of questions completed
- "strengths": Array of strong areas
- "weaknesses": Array of areas needing improvement
- "performanceNotes": Brief personality-driven performance narrative

### Step 4: Aggregate Analysis
Provide summary statistics:
- Class average score
- Score distribution (top performers, average, struggling)
- Common missed question types
- Recommendations for improvement

## Output Format
Return a JSON object with:
{
  "summary": "Markdown string with the simulation narrative, test overview, and aggregate analysis",
  "perNodeResults": [array of individual participant results]
}

Make the simulation feel realistic with varied, believable performances.`
  }
  
  // Generic agent simulation
  return `You are simulating ${agentNodes.length} agents processing data in parallel.

## Simulation Context
**Workflow Name**: ${workflowName}
**Data Source**: ${dataDescription}
**Data Details**: ${dataDetails}
**Number of Agents**: ${agentNodes.length}

${actualDataContent ? `## Actual Input Data
\`\`\`json
${actualDataContent}
\`\`\`
` : ''}
## Agent List (Use these EXACT nodeIds in your response)
${agentNodeList}

## Your Task
1. Use the actual input data provided above (do NOT generate sample data if real data is provided)
2. Simulate each agent processing the data with realistic variation
3. Return results for each agent with their unique processing outcomes

## Output Format
Return a JSON object with:
{
  "summary": "Markdown overview of the simulation and aggregate results",
  "perNodeResults": [
    {
      "nodeId": "exact-node-id",
      "nodeName": "Agent Name",
      "status": "completed",
      "processingTime": "time in ms",
      "result": { agent-specific results },
      "insights": "key findings"
    }
  ]
}

Make results realistic and varied across agents.`
}

// Helper to extract YouTube video ID
function extractYoutubeVideoId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([^&?\s]+)/)
  return match ? match[1] : null
}

// Helper to check if URL is a video content URL
function isVideoUrl(url: string): boolean {
  return url.includes('youtube.com') || url.includes('youtu.be') || url.includes('tiktok.com')
}

// Fetch and extract article text from a web page (basic scraper)
async function fetchArticleText(url: string): Promise<string> {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'NeuroData/1.0 (+https://neurodata.example)' } })
    const html = await res.text()
    const text = extractTextFromHtml(html)
    // Truncate to a reasonable size for the model
    return text.slice(0, 20000)
  } catch (err) {
    console.warn('Failed to fetch article URL', url, err)
    return ''
  }
}

function extractTextFromHtml(html: string): string {
  // Remove scripts/styles
  let cleaned = html.replace(/<script[\s\S]*?<\/script>/gi, ' ')
  cleaned = cleaned.replace(/<style[\s\S]*?<\/style>/gi, ' ')

  // Try to extract <article> or <main> content if present
  const articleMatch = cleaned.match(/<article[\s\S]*?<\/article>/i)
  const mainMatch = cleaned.match(/<main[\s\S]*?<\/main>/i)
  const container = articleMatch?.[0] || mainMatch?.[0] || cleaned

  // Extract paragraphs
  const paragraphs = Array.from(container.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)).map(m => m[1])
  let text = paragraphs.length > 0 ? paragraphs.join('\n\n') : container.replace(/<[^>]+>/g, ' ')
  text = text.replace(/\s+/g, ' ').trim()
  text = decodeHTMLEntities(text)
  return text
}

function decodeHTMLEntities(text: string): string {
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

function tryParseJSONFromText(text: string): any | null {
  // First attempt: code block marked as json
  const jsonBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  let jsonText: string | null = jsonBlockMatch ? jsonBlockMatch[1].trim() : null

  // Second attempt: find first { ... } block
  if (!jsonText) {
    const firstBrace = text.indexOf('{')
    const lastBrace = text.lastIndexOf('}')
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      jsonText = text.substring(firstBrace, lastBrace + 1)
    }
  }

  if (!jsonText) return null

  try {
    return JSON.parse(jsonText)
  } catch (e) {
    console.warn('Failed to parse JSON from AI response:', e)
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: WorkflowPayload = await request.json()
    const { nodes, edges, workflowId, workflowName, name } = body
    const finalWorkflowName = workflowName || name || 'Untitled Workflow'

    // Validate input
    if (!nodes || nodes.length === 0) {
      return NextResponse.json(
        { error: 'No nodes provided in workflow' },
        { status: 400 }
      )
    }

    // Get current user for execution tracking
    const user = await getSessionUser()
    const userId = user?.id
    
    // Check execution limits if user is authenticated
    if (userId) {
      const executionCheck = await canExecuteWorkflow(userId)
      if (!executionCheck.allowed) {
        return NextResponse.json(
          { 
            error: 'Execution limit reached',
            message: executionCheck.reason,
            remaining: executionCheck.remaining,
            requiresUpgrade: true
          },
          { status: 402 } // Payment Required
        )
      }
    }

    // Check if Gemini is available
    if (!genAI || !geminiApiKey) {
      console.error('Gemini API key not configured')
      return NextResponse.json(
        { 
          error: 'AI service not configured',
          message: 'GOOGLE_GEMINI_API_KEY is not set in environment variables',
          mode: 'offline'
        },
        { status: 503 }
      )
    }

    // === WORKFLOW DETECTION DEBUG ===
    console.log('=== WORKFLOW RUN DEBUG ===')
    console.log('Workflow name:', finalWorkflowName)
    console.log('Total nodes:', nodes.length)
    console.log('Node types:', nodes.map(n => n.type))
    console.log('Node labels:', nodes.map(n => n.data?.label))
    console.log('Node IDs:', nodes.map(n => n.id))

    // Detect Content Impact Analyzer workflow with video or news articles
    const brainNodes = nodes.filter(n => n.type === 'brainNode')
    const contentUrlNodes = nodes.filter(n => n.type === 'contentUrlInputNode' || n.data.subType === 'url')
    const newsArticleNodes = nodes.filter(n => n.type === 'newsArticleNode')
    const analysisNodes = nodes.filter(n => n.type === 'preprocessingNode' || n.type === 'analysisNode' || 
      String(n.data?.label || '').toLowerCase().includes('bias') ||
      String(n.data?.label || '').toLowerCase().includes('fact') ||
      String(n.data?.label || '').toLowerCase().includes('manipulation'))
    
    console.log('brainNodes:', brainNodes.length)
    console.log('contentUrlNodes:', contentUrlNodes.length)
    console.log('newsArticleNodes:', newsArticleNodes.length)
    console.log('analysisNodes:', analysisNodes.length)
    
    // Broaden detection: if we have content input + any analysis processing
    const hasContentInput = contentUrlNodes.length > 0 || newsArticleNodes.length > 0
    const hasAnalysisProcessing = brainNodes.length >= 5 || analysisNodes.length >= 2
    const isContentImpactAnalyzer = hasContentInput && hasAnalysisProcessing
    
    console.log('isContentImpactAnalyzer:', isContentImpactAnalyzer)
    console.log('=== END DETECTION DEBUG ===')
    
  let result
  let text: string
  let parsedResult: any = null
  let perNodeResults: any[] = []

  if (isContentImpactAnalyzer && hasContentInput) {
      // Get the content URL - prefer video, fallback to news article
      const videoUrl = (contentUrlNodes[0]?.data?.url || contentUrlNodes[0]?.data?.value || 
                        newsArticleNodes[0]?.data?.url || '') as string
      const videoTitle = (contentUrlNodes[0]?.data?.videoTitle || 
                          newsArticleNodes[0]?.data?.label || 'Content') as string
      const youtubeVideoId = extractYoutubeVideoId(videoUrl)
      const isNewsArticle = newsArticleNodes.length > 0 && contentUrlNodes.length === 0
      
      console.log('Content Impact Analyzer detected, URL:', videoUrl)
      console.log('YouTube Video ID:', youtubeVideoId)
      console.log('Is News Article:', isNewsArticle)
      // If it looks like a news article, attempt to fetch and extract article text so the model has the content to analyze
      let articleText = ''
      if (isNewsArticle && videoUrl) {
        articleText = await fetchArticleText(videoUrl)
        if (!articleText) {
          console.log('No article text fetched for URL', videoUrl)
        } else {
          console.log('Fetched article text length', articleText.length)
        }
      }
      
  // Use Gemini 2.0 Flash with video understanding and a conservative generation config for consistency
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash', generationConfig: { temperature: 0.25, topP: 0.9, maxOutputTokens: 3000 } })
      
      // Build list of actual brain node IDs and labels for the prompt
      const brainNodeList = brainNodes.map((n, i) => `  - nodeId: "${n.id}", nodeName: "${n.data.label || `Brain Node ${i + 1}`}"`).join('\n')
      
      // Build multimodal prompt with video
      const videoAnalysisPrompt = `You are an advanced neuromarketing AI simulating ${brainNodes.length} distinct brain processing units analyzing video content.

## CRITICAL: You MUST watch and analyze the ACTUAL video content at this URL:
**Video URL**: ${videoUrl}
**Title**: ${videoTitle}

## IMPORTANT: Use EXACT Node IDs
The following are the actual brain node IDs and names from the workflow. You MUST use these EXACT nodeId values in your perNodeResults response:
${brainNodeList}

## Your Task
Watch the entire video carefully and analyze it from the perspective of these ${brainNodes.length} brain personas.

## Analyze the ACTUAL video content and provide:

### 1. Executive Summary
- Overall Engagement Score (0-100) - based on what you ACTUALLY SEE in the video
- Key Strengths - specific elements from the video
- Key Weaknesses - specific issues you observe
- Viral Potential Rating with reasoning

### 2. Emotional Response Profile (based on actual video content)
- Primary emotions the video triggers (describe specific moments)
- Emotional intensity (1-10) with timestamps if possible
- Emotional arc through the video
- Valence analysis

### 3. Attention Analysis
- First 3-second hook effectiveness - what ACTUALLY happens in those seconds
- Attention-sustaining elements you observed
- Drop-off risk moments (specific timestamps)
- Pattern interrupt frequency

### 4. Reward & Motivation
- Dopamine trigger points (specific moments in the video)
- Reward anticipation elements
- Satisfaction payoff
- Re-watch motivation

### 5. Memory & Recall
- Memory encoding strength
- Key memorable moments (describe them specifically)
- Brand/message association strength
- 24-hour recall prediction

### 6. Social & Sharing Analysis
- Social proof elements in the video
- Share motivation type
- Comment/debate triggers
- Community alignment

### 7. Action & Conversion
- Call-to-action clarity (if any)
- Purchase/subscribe intent driver
- Next-step friction
- Urgency perception

### 8. Per-Node Reaction Summary (CRITICAL: Use exact nodeIds from above!)
Provide a JSON array of objects, one for EACH brain node listed in the "IMPORTANT: Use EXACT Node IDs" section above. Each object MUST have:
- "nodeId": MUST be the exact nodeId from the list above (e.g., "brainNode-abc123")
- "nodeName": The nodeName from the list above
- "engagement": Engagement score (1-10)
- "primaryReaction": A brief description of the primary emotional/cognitive reaction
- "wouldShare": "Yes" or "No"
- "keyInsight": A concise insight into this persona's response

### 9. Optimization Recommendations
Based on what you ACTUALLY observed in the video:
1. Top 3 specific improvements
2. Specific timing/edit suggestions with timestamps
3. A/B testing ideas

BE SPECIFIC. Reference actual content from the video. Do not make assumptions - analyze what you see and hear.

Your entire response MUST be a single JSON object with two top-level keys: "summary" (containing the Executive Summary, Emotional Response Profile, Attention Analysis, Reward & Motivation, Memory & Recall, Social & Sharing Analysis, Action & Conversion, and Optimization Recommendations as a single markdown string) and "perNodeResults" (containing the JSON array of per-persona reactions as described in section 8).
`

      // If this is a news article workflow, prepare an article-specific prompt that includes extracted text (truncated)
      let articleAnalysisPrompt: string | null = null
      if (isNewsArticle) {
        const sample = articleText ? articleText.slice(0, 10000) : '[Article text not available - will attempt to analyze based on URL context]'
        
        // Extract analysis module names from the workflow nodes
        const allProcessingNodes = nodes.filter(n => 
          n.type === 'preprocessingNode' || 
          n.type === 'analysisNode' || 
          n.type === 'brainNode' ||
          String(n.data?.label || '').toLowerCase().includes('detector') ||
          String(n.data?.label || '').toLowerCase().includes('checker') ||
          String(n.data?.label || '').toLowerCase().includes('scanner') ||
          String(n.data?.label || '').toLowerCase().includes('analyzer')
        )
        const moduleList = allProcessingNodes.map(n => `- ${n.data?.label || n.type}`).join('\n')
        
        // Build list of ALL node IDs for per-node results
        const allNodeList = nodes.map(n => `  - nodeId: "${n.id}", nodeName: "${n.data?.label || n.type}"`).join('\n')
        
        articleAnalysisPrompt = `You are an advanced media bias and content impact analyst powered by a multi-node AI pipeline.

## ANALYSIS PIPELINE MODULES
The following analysis modules have been configured for this workflow:
${moduleList || '- General Content Analyzer'}

## ARTICLE TO ANALYZE
**Title**: ${videoTitle}
**URL**: ${videoUrl}

## ARTICLE TEXT
${sample}

## IMPORTANT: Use EXACT Node IDs in your response
The following are the actual node IDs from the workflow. Use these EXACT nodeId values in perNodeResults:
${allNodeList}

## YOUR TASK
Analyze the article using each configured analysis module. Provide:

### 1. Executive Summary
- Overall bias rating (Left-Strong, Left-Lean, Center, Right-Lean, Right-Strong)
- Credibility score (0-100)
- Key findings in 2-3 sentences

### 2. Bias Detection Analysis
- Political leaning indicators (with specific quotes/examples)
- Word choice analysis (loaded language, euphemisms, framing)
- Source diversity assessment
- Perspective balance

### 3. Manipulation Tactics Scan
- Emotional manipulation techniques detected
- Logical fallacies identified
- Misleading statistics or cherry-picked data
- Fear/outrage triggers

### 4. Fact Check Summary
- Verifiable claims identified
- Accuracy assessment for each major claim
- Missing context or omissions
- Recommended fact-check sources

### 5. Audience Impact Prediction
- Target demographic analysis
- Likely emotional response
- Share/viral potential
- Opinion shift risk

### 6. Per-Node Results (CRITICAL: Use exact nodeIds!)
Provide a JSON array with one object per node. Each must include:
- "nodeId": EXACT nodeId from the list above
- "nodeName": The node name
- "engagement": Score 1-10
- "primaryReaction": Brief reaction description
- "wouldShare": "Yes" or "No"  
- "keyInsight": Concise insight

Your ENTIRE response MUST be a single JSON object with:
- "summary": markdown string containing sections 1-5
- "perNodeResults": JSON array as described in section 6

Be specific. Quote the article directly when identifying bias or manipulation.
`
      }

      // For YouTube videos, we can pass the URL directly to Gemini 2.0 Flash
      // Gemini 2.0 Flash can understand video content from YouTube URLs
      if (youtubeVideoId) {
        console.log('Analyzing YouTube video with Gemini 2.0 Flash multimodal...')
        
        try {
          // Try with the video URL as a file reference
          result = await model.generateContent([
            videoAnalysisPrompt,
            {
              fileData: {
                mimeType: 'video/mp4',
                fileUri: `https://www.youtube.com/watch?v=${youtubeVideoId}`
              }
            }
          ])
        } catch (videoError) {
          console.log('Direct video analysis failed, trying with URL in prompt...')
          // Fallback: Gemini can still understand YouTube content from the URL
          result = await model.generateContent(videoAnalysisPrompt)
        }
      } else {
        // For non-YouTube URLs (including news articles), use appropriate prompt
        if (isNewsArticle && articleAnalysisPrompt) {
          result = await model.generateContent(articleAnalysisPrompt)
        } else {
          result = await model.generateContent(videoAnalysisPrompt)
        }
      }
      
      const response = await result.response
      text = response.text()
      
      // Try to parse as JSON for perNodeResults
      // Handle both raw JSON and markdown-wrapped JSON
      try {
        // Remove markdown code blocks if present
        let jsonText = text
        const jsonBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
        if (jsonBlockMatch) {
          jsonText = jsonBlockMatch[1].trim()
        }
        
        parsedResult = JSON.parse(jsonText)
        if (parsedResult && parsedResult.perNodeResults) {
          perNodeResults = parsedResult.perNodeResults
          console.log(`Parsed ${perNodeResults.length} perNodeResults from AI response`)
        }
        // Use summary as the main text if available
        if (parsedResult && parsedResult.summary) {
          text = parsedResult.summary
        }
      } catch (e) {
        // Not JSON, fallback to plain text
        console.log('AI response was not valid JSON, using as plain text')
        parsedResult = null
      }
    } else {
      // Check for simulation workflows (students, agents, parallel processing)
      const simulation = detectSimulationWorkflow(nodes, finalWorkflowName)
      
      console.log('=== SIMULATION DETECTION ===')
      console.log('isSimulation:', simulation.isSimulation)
      console.log('simulationType:', simulation.simulationType)
      console.log('agentNodes count:', simulation.agentNodes.length)
      console.log('agentNodes IDs:', simulation.agentNodes.map(n => n.id))
      console.log('agentNodes labels:', simulation.agentNodes.map(n => n.data?.label))
      console.log('=== END SIMULATION DETECTION ===')
      
      let prompt: string
      if (simulation.isSimulation) {
        console.log(`Simulation workflow detected: ${simulation.simulationType} with ${simulation.agentNodes.length} agents`)
        prompt = buildSimulationPrompt(nodes, edges, simulation, finalWorkflowName)
      } else {
        // Standard workflow processing (non-video)
        prompt = buildPrompt(nodes, edges)
      }
      
      console.log('=== PROMPT BEING SENT ===')
      console.log('Prompt length:', prompt.length)
      console.log('Prompt preview:', prompt.substring(0, 1000) + '...')
      console.log('=== END PROMPT ===')
      
      // Calculate max tokens based on simulation size - need more tokens for large agent groups
      const simulationMaxTokens = simulation.isSimulation 
        ? Math.min(8192, 2000 + (simulation.agentNodes.length * 30)) // Scale with agent count
        : 3000
      console.log(`Using maxOutputTokens: ${simulationMaxTokens} for ${simulation.agentNodes.length} agents`)
      
      const model = genAI.getGenerativeModel({ 
        model: 'gemini-2.0-flash',
        generationConfig: simulation.isSimulation 
          ? { temperature: 0.7, topP: 0.9, maxOutputTokens: simulationMaxTokens }
          : { temperature: 0.3, topP: 0.9, maxOutputTokens: 3000 }
      })
      result = await model.generateContent(prompt)
      const response = await result.response
      text = response.text()
      
      console.log('=== AI RESPONSE DEBUG ===')
      console.log('Response length:', text.length)
      console.log('Response preview:', text.substring(0, 500))
      console.log('Response ends with:', text.substring(text.length - 200))
      
      // Try to parse as JSON for perNodeResults
      try {
        // Remove markdown code blocks if present
        let jsonText = text
        const jsonBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
        if (jsonBlockMatch) {
          console.log('Found JSON in code block')
          jsonText = jsonBlockMatch[1].trim()
        } else {
          console.log('No code block found, trying raw JSON parse')
        }
        
        // Try to find JSON object boundaries if not valid JSON
        if (!jsonText.trim().startsWith('{')) {
          const jsonStart = jsonText.indexOf('{')
          if (jsonStart > -1) {
            jsonText = jsonText.substring(jsonStart)
            console.log('Found JSON object starting at index:', jsonStart)
          }
        }
        
        // Check if JSON might be truncated (missing closing braces)
        const openBraces = (jsonText.match(/{/g) || []).length
        const closeBraces = (jsonText.match(/}/g) || []).length
        if (openBraces > closeBraces) {
          console.warn(`JSON appears truncated! Open braces: ${openBraces}, Close braces: ${closeBraces}`)
          // Try to repair by adding closing braces
          for (let i = 0; i < (openBraces - closeBraces); i++) {
            if (jsonText.includes('perNodeResults') && !jsonText.endsWith(']')) {
              jsonText += ']}' // Close array and object
            } else {
              jsonText += '}'
            }
          }
          console.log('Attempted JSON repair')
        }
        
        parsedResult = JSON.parse(jsonText)
        console.log('JSON parsed successfully. Keys:', Object.keys(parsedResult))
        
        if (parsedResult && parsedResult.perNodeResults) {
          perNodeResults = parsedResult.perNodeResults
          console.log(`Parsed ${perNodeResults.length} perNodeResults from AI response`)
          console.log('perNodeResults nodeIds:', perNodeResults.map((r: any) => r.nodeId))
          console.log('perNodeResults nodeNames:', perNodeResults.map((r: any) => r.nodeName))
          // Log first result structure for debugging
          if (perNodeResults.length > 0) {
            console.log('First result keys:', Object.keys(perNodeResults[0]))
            console.log('First result sample:', JSON.stringify(perNodeResults[0]).substring(0, 500))
          }
        } else {
          console.log('No perNodeResults in parsed JSON:', Object.keys(parsedResult || {}))
        }
        // Use summary as the main text if available
        if (parsedResult && parsedResult.summary) {
          text = parsedResult.summary
        }
      } catch (e) {
        console.log('Failed to parse AI response as JSON:', e instanceof Error ? e.message : 'Unknown error')
        parsedResult = null
      }
      console.log('=== END AI RESPONSE DEBUG ===')
    }

    // Log workflow execution to Supabase (optional)
    if (workflowId) {
      try {
        await supabase.from('workflow_runs').insert({
          workflow_id: workflowId,
          status: 'completed',
          result_summary: text.substring(0, 500),
          nodes_executed: nodes.length,
          executed_at: new Date().toISOString()
        })
      } catch (dbError) {
        // Don't fail the request if logging fails
        console.warn('Failed to log workflow run:', dbError)
      }
      // Save per-node results if available
      if (perNodeResults && Array.isArray(perNodeResults) && perNodeResults.length > 0) {
        try {
          // Insert each node result
          const inserts = perNodeResults.map((nodeRes: any) => ({
            workflow_execution_id: workflowId,
            node_id: nodeRes.nodeId || nodeRes.id || '',
            node_name: nodeRes.nodeName || nodeRes.label || '',
            result: nodeRes,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }))
          if (inserts.length > 0) {
            await supabase.from('workflow_node_results').insert(inserts)
          }
        } catch (err) {
          console.warn('Failed to save per-node results:', err)
        }
      }
    }

    // Record the workflow execution for tracking (deduct from monthly limit)
    if (userId) {
      await recordWorkflowExecution(
        userId,
        workflowId || `exec-${Date.now()}`,
        finalWorkflowName,
        nodes.length
      )
    }

    // Generate execution ID for tracking
    const executionId = `exec-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`

    return NextResponse.json({
      success: true,
      workflowId,
      executionId, // Unique ID for this run
      workflowName: finalWorkflowName,
      result: text,
      analysis: text, // Frontend expects this field
      perNodeResults: perNodeResults,
      creditsRefresh: true, // Signal to frontend to refresh credits display
      metadata: {
        model: 'gemini-2.0-flash',
        nodesProcessed: nodes.length,
        edgesProcessed: edges.length,
        perNodeResultsCount: perNodeResults.length,
        timestamp: new Date().toISOString(),
        regionsAnalyzed: nodes.filter(n => n.type === 'brainRegion' || n.data.regionId).length
      }
    })

  } catch (error) {
    console.error('Workflow execution error:', error)
    
    // Check for specific Gemini errors
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    if (errorMessage.includes('API_KEY') || errorMessage.includes('API key')) {
      return NextResponse.json(
        { error: 'Invalid API key', message: errorMessage },
        { status: 401 }
      )
    }
    
    if (errorMessage.includes('QUOTA') || errorMessage.includes('rate limit') || errorMessage.includes('RATE_LIMIT')) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', message: 'Please try again in a moment' },
        { status: 429 }
      )
    }

    return NextResponse.json(
      { error: 'Workflow execution failed', message: errorMessage },
      { status: 500 }
    )
  }
}

// GET endpoint to check API health
export async function GET() {
  const hasApiKey = !!geminiApiKey
  
  return NextResponse.json({
    status: hasApiKey ? 'ready' : 'offline',
    message: hasApiKey 
      ? 'Workflow API is ready' 
      : 'GOOGLE_GEMINI_API_KEY not configured',
    timestamp: new Date().toISOString()
  })
}
