/**
 * Developer Results API
 * 
 * Provides structured access to workflow node results for building custom dashboards.
 * This is the core API that developers use to fetch results from the 101 brain nodes.
 * 
 * Endpoints:
 * - GET /api/developer/results/[executionId] - Get full results for an execution
 * - GET /api/developer/results/[executionId]/nodes - Get all node results
 * - GET /api/developer/results/[executionId]/aggregates - Get demographic aggregates
 * - GET /api/developer/results/[executionId]/summary - Get summary for dashboards
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

export interface NodeResult {
  nodeId: string
  nodeType: string
  nodeLabel: string
  demographicId: string | null
  demographicTraits: string[]
  personaCategory: string | null
  
  // Scores (0-100)
  scores: {
    engagement: number
    attention: number
    emotionalIntensity: number
    memoryEncoding: number
    shareLikelihood: number
    purchaseIntent: number
    trustLevel: number
  }
  
  // Categorical
  primaryEmotion: string
  emotionalValence: 'positive' | 'negative' | 'neutral' | 'mixed'
  wouldShare: boolean
  wouldSubscribe: boolean
  wouldPurchase: boolean
  
  // Detailed data
  attentionMoments: Array<{
    timestamp: string
    type: 'hook' | 'drop' | 'peak' | 'recovery'
    intensity: number
  }>
  emotionalJourney: Array<{
    timestamp: string
    emotion: string
    intensity: number
  }>
  keyInsights: string[]
  recommendations: string[]
}

export interface DemographicAggregate {
  category: string
  segment: string
  segmentLabel: string
  sampleSize: number
  
  averages: {
    engagement: number
    attention: number
    emotionalIntensity: number
    memoryEncoding: number
    shareLikelihood: number
    purchaseIntent: number
  }
  
  counts: {
    wouldShare: number
    wouldSubscribe: number
    wouldPurchase: number
  }
  
  dominantEmotion: string
  keyInsights: string[]
}

export interface ExecutionSummary {
  executionId: string
  workflowName: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  
  content: {
    url: string
    title: string
    platform: string
  }
  
  overallScore: number
  viralPotential: 'low' | 'medium' | 'high' | 'viral'
  
  nodeStats: {
    total: number
    completed: number
    failed: number
  }
  
  aggregatedMetrics: {
    avgEngagement: number
    avgAttention: number
    avgEmotionalIntensity: number
    shareRate: number
    purchaseRate: number
    topEmotion: string
  }
  
  executionTimeMs: number
  creditsUsed: number
  
  timestamps: {
    started: string
    completed: string | null
  }
}

export interface DeveloperResultsResponse {
  success: boolean
  execution: ExecutionSummary
  nodes?: NodeResult[]
  aggregates?: DemographicAggregate[]
  
  // Metadata for developers
  api: {
    version: string
    documentation: string
    schema: string
  }
}

// Helper to create Supabase client
async function getSupabaseClient() {
  const cookieStore = await cookies()
  
  return createServerClient(
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
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ executionId: string }> }
) {
  try {
    const supabase = await getSupabaseClient()
    
    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { executionId } = await params
    const searchParams = request.nextUrl.searchParams
    const include = searchParams.get('include')?.split(',') || ['summary']
    const format = searchParams.get('format') || 'json'
    
    // Fetch execution
    const { data: execution, error: execError } = await supabase
      .from('workflow_executions')
      .select('*')
      .eq('id', executionId)
      .eq('user_id', user.id)
      .single()
    
    if (execError || !execution) {
      return NextResponse.json(
        { error: 'Execution not found' },
        { status: 404 }
      )
    }
    
    // Build response
    const response: DeveloperResultsResponse = {
      success: true,
      execution: {
        executionId: execution.id,
        workflowName: execution.workflow_name,
        status: execution.status,
        content: {
          url: execution.content_url || '',
          title: execution.content_title || '',
          platform: execution.content_platform || '',
        },
        overallScore: execution.overall_score || 0,
        viralPotential: execution.viral_potential || 'low',
        nodeStats: {
          total: execution.total_nodes || 0,
          completed: execution.completed_nodes || 0,
          failed: execution.failed_nodes || 0,
        },
        aggregatedMetrics: execution.aggregated_metrics || {},
        executionTimeMs: execution.execution_time_ms || 0,
        creditsUsed: execution.credits_used || 0,
        timestamps: {
          started: execution.started_at,
          completed: execution.completed_at,
        },
      },
      api: {
        version: '1.0.0',
        documentation: '/docs/developer/results-api',
        schema: '/api/developer/schema',
      },
    }
    
    // Include nodes if requested
    if (include.includes('nodes') || include.includes('all')) {
      const { data: nodes } = await supabase
        .from('workflow_node_results')
        .select('*')
        .eq('execution_id', executionId)
        .order('created_at', { ascending: true })
      
      if (nodes) {
        response.nodes = nodes.map(node => ({
          nodeId: node.node_id,
          nodeType: node.node_type,
          nodeLabel: node.node_label,
          demographicId: node.demographic_id,
          demographicTraits: node.demographic_traits || [],
          personaCategory: node.persona_category,
          scores: {
            engagement: node.engagement_score || 0,
            attention: node.attention_score || 0,
            emotionalIntensity: node.emotional_intensity || 0,
            memoryEncoding: node.memory_encoding || 0,
            shareLikelihood: node.share_likelihood || 0,
            purchaseIntent: node.purchase_intent || 0,
            trustLevel: node.trust_level || 0,
          },
          primaryEmotion: node.primary_emotion || 'neutral',
          emotionalValence: node.emotional_valence || 'neutral',
          wouldShare: node.would_share || false,
          wouldSubscribe: node.would_subscribe || false,
          wouldPurchase: node.would_purchase || false,
          attentionMoments: node.attention_moments || [],
          emotionalJourney: node.emotional_journey || [],
          keyInsights: node.key_insights || [],
          recommendations: node.recommendations || [],
        }))
      }
    }
    
    // Include aggregates if requested
    if (include.includes('aggregates') || include.includes('all')) {
      const { data: aggregates } = await supabase
        .from('workflow_demographic_aggregates')
        .select('*')
        .eq('execution_id', executionId)
        .order('category', { ascending: true })
      
      if (aggregates) {
        response.aggregates = aggregates.map(agg => ({
          category: agg.category,
          segment: agg.segment,
          segmentLabel: agg.segment_label,
          sampleSize: agg.sample_size || 0,
          averages: {
            engagement: agg.avg_engagement || 0,
            attention: agg.avg_attention || 0,
            emotionalIntensity: agg.avg_emotional_intensity || 0,
            memoryEncoding: agg.avg_memory_encoding || 0,
            shareLikelihood: agg.avg_share_likelihood || 0,
            purchaseIntent: agg.avg_purchase_intent || 0,
          },
          counts: {
            wouldShare: agg.would_share_count || 0,
            wouldSubscribe: agg.would_subscribe_count || 0,
            wouldPurchase: agg.would_purchase_count || 0,
          },
          dominantEmotion: agg.dominant_emotion || 'neutral',
          keyInsights: agg.key_insights || [],
        }))
      }
    }
    
    // Format response based on request
    if (format === 'csv') {
      // Convert to CSV
      const csv = convertToCSV(response)
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="results-${executionId}.csv"`,
        },
      })
    }
    
    return NextResponse.json(response)
    
  } catch (error) {
    console.error('Developer results API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch results' },
      { status: 500 }
    )
  }
}

// Helper to convert results to CSV
function convertToCSV(response: DeveloperResultsResponse): string {
  if (!response.nodes || response.nodes.length === 0) {
    return 'No node results available'
  }
  
  const headers = [
    'Node ID',
    'Node Label',
    'Demographic ID',
    'Persona Category',
    'Engagement Score',
    'Attention Score',
    'Emotional Intensity',
    'Memory Encoding',
    'Share Likelihood',
    'Purchase Intent',
    'Primary Emotion',
    'Would Share',
    'Would Subscribe',
    'Would Purchase',
    'Key Insights',
  ]
  
  const rows = response.nodes.map(node => [
    node.nodeId,
    node.nodeLabel,
    node.demographicId || '',
    node.personaCategory || '',
    node.scores.engagement,
    node.scores.attention,
    node.scores.emotionalIntensity,
    node.scores.memoryEncoding,
    node.scores.shareLikelihood,
    node.scores.purchaseIntent,
    node.primaryEmotion,
    node.wouldShare ? 'Yes' : 'No',
    node.wouldSubscribe ? 'Yes' : 'No',
    node.wouldPurchase ? 'Yes' : 'No',
    node.keyInsights.join('; '),
  ])
  
  return [headers.join(','), ...rows.map(row => row.join(','))].join('\n')
}
