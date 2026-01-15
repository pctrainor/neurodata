import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

// Get authenticated user's Supabase client
async function getAuthenticatedSupabase() {
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
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options as Parameters<typeof cookieStore.set>[2])
          )
        },
      },
    }
  )
}

// Service role client for inserts
function getServiceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// =============================================================================
// GET - Retrieve analysis sessions for a workflow
// =============================================================================
export async function GET(request: NextRequest) {
  try {
    const supabase = await getAuthenticatedSupabase()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const workflowId = searchParams.get('workflowId')
    const sessionId = searchParams.get('sessionId')

    // If specific session requested
    if (sessionId) {
      const { data: session, error } = await supabase
        .from('workflow_analysis_sessions')
        .select(`
          *,
          grounding_suggestions:analysis_grounding_suggestions(*),
          outputs:analysis_outputs(*)
        `)
        .eq('id', sessionId)
        .eq('user_id', user.id)
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ session })
    }

    // List sessions for workflow
    let query = supabase
      .from('workflow_analysis_sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (workflowId) {
      query = query.eq('workflow_id', workflowId)
    }

    const { data: sessions, error } = await query.limit(50)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ sessions: sessions || [] })

  } catch (error) {
    console.error('Error fetching analysis sessions:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// =============================================================================
// POST - Create or update analysis session/output
// =============================================================================
export async function POST(request: NextRequest) {
  try {
    const supabase = await getAuthenticatedSupabase()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action } = body

    // Use service role for inserts to bypass RLS during development
    const serviceSupabase = getServiceSupabase()

    switch (action) {
      // -----------------------------------------------------------------------
      // CREATE SESSION - Start a new analysis session
      // -----------------------------------------------------------------------
      case 'create_session': {
        const {
          workflowId,
          workflowRunId,
          outputNodeId,
          outputNodeName,
          connectedNodesCount,
          completedNodesCount,
          nodeTypes,
          nodeNames,
          sessionName
        } = body

        const { data: session, error } = await serviceSupabase
          .from('workflow_analysis_sessions')
          .insert({
            user_id: user.id,
            workflow_id: workflowId || null,
            workflow_run_id: workflowRunId || null,
            output_node_id: outputNodeId,
            output_node_name: outputNodeName,
            session_name: sessionName || `Analysis ${new Date().toLocaleDateString()}`,
            connected_nodes_count: connectedNodesCount || 0,
            completed_nodes_count: completedNodesCount || 0,
            node_types: nodeTypes || [],
            node_names: nodeNames || [],
            status: 'draft'
          })
          .select()
          .single()

        if (error) {
          console.error('Error creating session:', error)
          // Check if table doesn't exist
          if (error.message?.includes('schema cache') || error.code === '42P01') {
            return NextResponse.json({ 
              error: 'Table does not exist - run migration first',
              migrationNeeded: true 
            }, { status: 500 })
          }
          return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ success: true, session })

        if (error) {
          console.error('Error creating session:', error)
          return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ success: true, session })
      }

      // -----------------------------------------------------------------------
      // SAVE GROUNDING - Save step 1 grounding suggestion
      // -----------------------------------------------------------------------
      case 'save_grounding': {
        const {
          sessionId,
          userIntent,
          originalPrompt,
          suggestedPythonCode,
          suggestedOutputFormat,
          formatType,
          explanation
        } = body

        if (!sessionId) {
          return NextResponse.json({ error: 'sessionId is required' }, { status: 400 })
        }

        // Insert grounding suggestion
        const { data: grounding, error: groundingError } = await serviceSupabase
          .from('analysis_grounding_suggestions')
          .insert({
            session_id: sessionId,
            user_intent: userIntent,
            original_prompt: originalPrompt,
            suggested_python_code: suggestedPythonCode,
            suggested_output_format: suggestedOutputFormat,
            format_type: formatType || 'markdown',
            explanation
          })
          .select()
          .single()

        if (groundingError) {
          console.error('Error saving grounding:', groundingError)
          return NextResponse.json({ error: groundingError.message }, { status: 500 })
        }

        // Update session status to 'grounded'
        await serviceSupabase
          .from('workflow_analysis_sessions')
          .update({ status: 'grounded', updated_at: new Date().toISOString() })
          .eq('id', sessionId)

        return NextResponse.json({ success: true, grounding })
      }

      // -----------------------------------------------------------------------
      // SAVE OUTPUT - Save step 2 final analysis output
      // -----------------------------------------------------------------------
      case 'save_output': {
        const {
          sessionId,
          groundingSuggestionId,
          outputType,
          nlPrompt,
          nlResponse,
          nlTokensUsed,
          pythonCode,
          pythonOutput,
          pythonExecutionStatus,
          pythonErrorMessage,
          displayContent,
          displayFormat,
          displayConfig
        } = body

        if (!sessionId) {
          return NextResponse.json({ error: 'sessionId is required' }, { status: 400 })
        }

        // Insert analysis output
        const { data: output, error: outputError } = await serviceSupabase
          .from('analysis_outputs')
          .insert({
            session_id: sessionId,
            grounding_suggestion_id: groundingSuggestionId || null,
            output_type: outputType || 'natural_language',
            nl_prompt: nlPrompt,
            nl_response: nlResponse,
            nl_tokens_used: nlTokensUsed,
            python_code: pythonCode,
            python_output: pythonOutput,
            python_execution_status: pythonExecutionStatus,
            python_error_message: pythonErrorMessage,
            display_content: displayContent,
            display_format: displayFormat || 'markdown',
            display_config: displayConfig || {}
          })
          .select()
          .single()

        if (outputError) {
          console.error('Error saving output:', outputError)
          return NextResponse.json({ error: outputError.message }, { status: 500 })
        }

        // Update session status to 'completed'
        await serviceSupabase
          .from('workflow_analysis_sessions')
          .update({ 
            status: 'completed', 
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString() 
          })
          .eq('id', sessionId)

        return NextResponse.json({ success: true, output })
      }

      // -----------------------------------------------------------------------
      // SAVE EXECUTION - Save full workflow execution results
      // -----------------------------------------------------------------------
      case 'save_execution': {
        const {
          workflowId,
          workflowName,
          executionId,
          inputNodes,
          inputEdges,
          inputConfig,
          rawResponse,
          summary,
          perNodeResults,
          modelUsed,
          tokensInput,
          tokensOutput,
          executionTimeMs,
          status,
          errorMessage,
          mappingSuccessRate,
          mappingDiagnostics,
          startedAt,
          completedAt
        } = body

        const { data: execution, error: execError } = await serviceSupabase
          .from('workflow_execution_results')
          .insert({
            user_id: user.id,
            workflow_id: workflowId || null,
            workflow_name: workflowName,
            execution_id: executionId || `exec-${Date.now()}`,
            input_nodes: inputNodes || [],
            input_edges: inputEdges || [],
            input_config: inputConfig || {},
            raw_response: rawResponse,
            response_length: rawResponse?.length || 0,
            summary,
            per_node_results: perNodeResults || [],
            per_node_results_count: perNodeResults?.length || 0,
            model_used: modelUsed || 'gemini-2.0-flash',
            tokens_input: tokensInput,
            tokens_output: tokensOutput,
            execution_time_ms: executionTimeMs,
            status: status || 'completed',
            error_message: errorMessage,
            mapping_success_rate: mappingSuccessRate,
            mapping_diagnostics: mappingDiagnostics || {},
            started_at: startedAt,
            completed_at: completedAt || new Date().toISOString()
          })
          .select()
          .single()

        if (execError) {
          console.error('Error saving execution:', execError)
          return NextResponse.json({ error: execError.message }, { status: 500 })
        }

        return NextResponse.json({ success: true, execution })
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
    }

  } catch (error) {
    console.error('Error in analysis save:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// =============================================================================
// DELETE - Delete an analysis session
// =============================================================================
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await getAuthenticatedSupabase()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 })
    }

    const serviceSupabase = getServiceSupabase()

    // Cascade delete will remove grounding suggestions and outputs
    const { error } = await serviceSupabase
      .from('workflow_analysis_sessions')
      .delete()
      .eq('id', sessionId)
      .eq('user_id', user.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error deleting session:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
