import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Create untyped Supabase client for tables not in generated types
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: workflowId } = await params
    const supabase = getSupabase()
    const DEV_MODE = process.env.NEXT_PUBLIC_DEV_MODE === 'true'

    // Get auth header
    const authHeader = request.headers.get('authorization')
    let userId: string | null = null

    if (DEV_MODE) {
      userId = process.env.DEV_MODE_USER_ID || '00000000-0000-0000-0000-000000000001'
    } else if (authHeader) {
      const token = authHeader.replace('Bearer ', '')
      const { data: { user }, error } = await supabase.auth.getUser(token)
      if (!error && user) {
        userId = user.id
      }
    }

    // Fetch workflow
    let query = supabase
      .from('workflows')
      .select('*')
      .eq('id', workflowId)

    // In production, verify ownership or public access
    if (!DEV_MODE && userId) {
      query = query.or(`user_id.eq.${userId},is_public.eq.true`)
    }

    const { data: workflow, error: workflowError } = await query.single()

    if (workflowError || !workflow) {
      console.error('Workflow not found:', workflowError)
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      )
    }

    // Fetch nodes
    const { data: nodes, error: nodesError } = await supabase
      .from('compute_nodes')
      .select('*')
      .eq('workflow_id', workflowId)
      .order('created_at', { ascending: true })

    if (nodesError) {
      console.error('Error fetching nodes:', nodesError)
    }

    // Fetch edges
    const { data: edges, error: edgesError } = await supabase
      .from('node_edges')
      .select('*')
      .eq('workflow_id', workflowId)

    if (edgesError) {
      console.error('Error fetching edges:', edgesError)
    }

    return NextResponse.json({
      ...workflow,
      nodes: nodes || [],
      edges: edges || [],
    })
  } catch (error) {
    console.error('Error fetching workflow:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: workflowId } = await params
    const supabase = getSupabase()
    const DEV_MODE = process.env.NEXT_PUBLIC_DEV_MODE === 'true'

    // Get auth header
    const authHeader = request.headers.get('authorization')
    let userId: string

    if (DEV_MODE) {
      userId = process.env.DEV_MODE_USER_ID || '00000000-0000-0000-0000-000000000001'
    } else if (authHeader) {
      const token = authHeader.replace('Bearer ', '')
      const { data: { user }, error } = await supabase.auth.getUser(token)
      if (error || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      userId = user.id
    } else {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Delete edges first (foreign key constraint)
    await supabase
      .from('node_edges')
      .delete()
      .eq('workflow_id', workflowId)

    // Delete nodes
    await supabase
      .from('compute_nodes')
      .delete()
      .eq('workflow_id', workflowId)

    // Delete workflow (verify ownership)
    const { error: deleteError } = await supabase
      .from('workflows')
      .delete()
      .eq('id', workflowId)
      .eq('user_id', userId)

    if (deleteError) {
      console.error('Error deleting workflow:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete workflow' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting workflow:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
