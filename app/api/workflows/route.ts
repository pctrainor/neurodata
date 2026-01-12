import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Create untyped Supabase client for tables not in generated types
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

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

// Types for the workflow graph from React Flow
interface FlowNode {
  id: string
  type: string
  position: { x: number; y: number }
  data: Record<string, unknown>
}

interface FlowEdge {
  id: string
  source: string
  target: string
  sourceHandle?: string
  targetHandle?: string
}

interface SaveWorkflowPayload {
  workflowId?: string
  name: string
  description?: string
  tags?: string[]
  is_template?: boolean
  is_public?: boolean
  nodes: FlowNode[]
  edges: FlowEdge[]
  canvas_zoom?: number
  canvas_offset_x?: number
  canvas_offset_y?: number
}

// Map React Flow node types to database categories
const nodeTypeToCategory: Record<string, string> = {
  brainNode: 'ml_inference',
  dataNode: 'input_source',
  preprocessingNode: 'preprocessing',
  analysisNode: 'analysis',
  mlNode: 'ml_inference',
  outputNode: 'output_sink',
  computeNode: 'preprocessing',
}

// Check if database is available (tables exist)
async function isDatabaseAvailable(supabase: ReturnType<typeof getSupabase>): Promise<boolean> {
  try {
    const { error } = await supabase.from('workflows').select('id').limit(1)
    return !error
  } catch {
    return false
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase()
    
    // Check if database is available
    const dbAvailable = await isDatabaseAvailable(supabase)
    if (!dbAvailable) {
      return NextResponse.json(
        { 
          error: 'Database not configured', 
          message: 'Workflow saving requires database setup. Please configure Supabase and run migrations.',
          demoMode: true 
        },
        { status: 503 }
      )
    }
    
    // Try cookie-based auth first
    const supabaseAuth = await getSupabaseAuth()
    const { data: { user: sessionUser } } = await supabaseAuth.auth.getUser()
    
    // Fallback to header-based auth
    const authHeader = request.headers.get('authorization')
    
    // Verify user
    const DEV_MODE = process.env.NEXT_PUBLIC_DEV_MODE === 'true'
    let userId: string

    if (sessionUser) {
      userId = sessionUser.id
    } else if (DEV_MODE) {
      userId = process.env.DEV_MODE_USER_ID || '00000000-0000-0000-0000-000000000001'
    } else if (authHeader) {
      const token = authHeader.replace('Bearer ', '')
      if (token === 'dev-mode') {
        userId = '00000000-0000-0000-0000-000000000001'
      } else {
        const { data: { user }, error } = await supabase.auth.getUser(token)
        if (error || !user) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
        userId = user.id
      }
    } else {
      return NextResponse.json({ error: 'Unauthorized - please sign in' }, { status: 401 })
    }

    const payload: SaveWorkflowPayload = await request.json()

    if (!payload.name || !payload.nodes) {
      return NextResponse.json(
        { error: 'Missing required fields: name, nodes' },
        { status: 400 }
      )
    }

    let workflowId = payload.workflowId

    if (workflowId) {
      // UPDATE existing workflow
      const { error: updateError } = await supabase
        .from('workflows')
        .update({
          name: payload.name,
          description: payload.description,
          tags: payload.tags,
          is_template: payload.is_template ?? false,
          is_public: payload.is_public ?? false,
          canvas_zoom: payload.canvas_zoom ?? 1,
          canvas_offset_x: payload.canvas_offset_x ?? 0,
          canvas_offset_y: payload.canvas_offset_y ?? 0,
          updated_at: new Date().toISOString(),
        })
        .eq('id', workflowId)
        .eq('user_id', userId)

      if (updateError) {
        console.error('Error updating workflow:', updateError)
        return NextResponse.json({ error: 'Failed to update workflow' }, { status: 500 })
      }

      // Delete existing nodes and edges
      await supabase.from('node_edges').delete().eq('workflow_id', workflowId)
      await supabase.from('compute_nodes').delete().eq('workflow_id', workflowId)

    } else {
      // CREATE new workflow
      const { data: newWorkflow, error: insertError } = await supabase
        .from('workflows')
        .insert({
          user_id: userId,
          name: payload.name,
          description: payload.description,
          tags: payload.tags,
          is_template: payload.is_template ?? false,
          is_public: payload.is_public ?? false,
          status: 'draft',
          canvas_zoom: payload.canvas_zoom ?? 1,
          canvas_offset_x: payload.canvas_offset_x ?? 0,
          canvas_offset_y: payload.canvas_offset_y ?? 0,
        })
        .select('id')
        .single()

      if (insertError || !newWorkflow) {
        console.error('Error creating workflow:', insertError)
        return NextResponse.json({ error: 'Failed to create workflow' }, { status: 500 })
      }

      workflowId = newWorkflow.id
    }

    // Map React Flow IDs to DB IDs
    const nodeIdMap = new Map<string, string>()

    // Insert nodes
    for (const node of payload.nodes) {
      const category = nodeTypeToCategory[node.type] || 'preprocessing'
      
      const { data: dbNode, error: nodeError } = await supabase
        .from('compute_nodes')
        .insert({
          workflow_id: workflowId,
          name: (node.data.label as string) || node.type,
          description: node.data.description as string || null,
          category: category,
          color: (node.data.color as string) || '#6366f1',
          icon: (node.data.icon as string) || 'cpu',
          position_x: node.position.x,
          position_y: node.position.y,
          config_values: node.data,
          status: 'idle',
        })
        .select('id')
        .single()

      if (nodeError || !dbNode) {
        console.error('Error creating node:', nodeError)
        continue
      }

      nodeIdMap.set(node.id, dbNode.id)
    }

    // Insert edges
    for (const edge of payload.edges) {
      const sourceDbId = nodeIdMap.get(edge.source)
      const targetDbId = nodeIdMap.get(edge.target)

      if (!sourceDbId || !targetDbId) {
        console.warn(`Skipping edge ${edge.id}: missing node reference`)
        continue
      }

      await supabase
        .from('node_edges')
        .insert({
          workflow_id: workflowId,
          source_node_id: sourceDbId,
          target_node_id: targetDbId,
          source_handle: edge.sourceHandle || 'output',
          target_handle: edge.targetHandle || 'input',
          is_valid: true,
        })
    }

    return NextResponse.json({
      success: true,
      workflowId,
      nodeCount: payload.nodes.length,
      edgeCount: payload.edges.length,
    })

  } catch (error) {
    console.error('Save workflow error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET - Load a workflow
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase()
    const { searchParams } = new URL(request.url)
    const workflowId = searchParams.get('id')

    if (!workflowId) {
      return NextResponse.json({ error: 'Missing workflow ID' }, { status: 400 })
    }

    // Get workflow
    const { data: workflow, error: wfError } = await supabase
      .from('workflows')
      .select('*')
      .eq('id', workflowId)
      .single()

    if (wfError || !workflow) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 })
    }

    // Get nodes
    const { data: nodes } = await supabase
      .from('compute_nodes')
      .select('*')
      .eq('workflow_id', workflowId)

    // Get edges
    const { data: edges } = await supabase
      .from('node_edges')
      .select('*')
      .eq('workflow_id', workflowId)

    // Convert back to React Flow format
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const flowNodes = (nodes || []).map((node: any) => ({
      id: node.id,
      type: categoryToNodeType(node.category),
      position: { x: node.position_x, y: node.position_y },
      data: {
        ...node.config_values,
        label: node.name,
        status: node.status,
        progress: node.progress,
      },
    }))

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nodeIdSet = new Set((nodes || []).map((n: any) => n.id))

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const flowEdges = (edges || [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((edge: any) => nodeIdSet.has(edge.source_node_id) && nodeIdSet.has(edge.target_node_id))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((edge: any) => ({
        id: edge.id,
        source: edge.source_node_id,
        target: edge.target_node_id,
        // Only include handles if they're non-default values (our nodes use default handles)
        ...(edge.source_handle && edge.source_handle !== 'output' ? { sourceHandle: edge.source_handle } : {}),
        ...(edge.target_handle && edge.target_handle !== 'input' ? { targetHandle: edge.target_handle } : {}),
      }))

    return NextResponse.json({
      workflow,
      nodes: flowNodes,
      edges: flowEdges,
    })

  } catch (error) {
    console.error('Load workflow error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Helper to convert category back to node type
function categoryToNodeType(category: string): string {
  const map: Record<string, string> = {
    input_source: 'dataNode',
    preprocessing: 'preprocessingNode',
    analysis: 'analysisNode',
    ml_inference: 'mlNode',
    ml_training: 'mlNode',
    visualization: 'analysisNode',
    output_sink: 'outputNode',
  }
  return map[category] || 'computeNode'
}
