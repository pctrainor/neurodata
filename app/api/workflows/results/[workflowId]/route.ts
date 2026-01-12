import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workflowId: string }> }
) {
  try {
    const { workflowId } = await params
    const supabase = getSupabase()

    // Fetch all per-node results for this workflow run
    // Note: The column is 'workflow_execution_id' not 'workflow_id'
    const { data, error } = await supabase
      .from('workflow_node_results')
      .select('*')
      .eq('workflow_execution_id', workflowId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching workflow results:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ results: data || [] })
  } catch (error) {
    console.error('Internal error fetching workflow results:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
