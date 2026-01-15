-- =============================================================================
-- ANALYSIS WORKBENCH SCHEMA
-- Stores results from the Interactive Analysis Workbench modal
-- Includes grounding suggestions, Python code, and final output
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Table: workflow_analysis_sessions
-- Tracks an analysis session for a workflow output node
-- A user can have multiple analysis sessions per workflow run
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.workflow_analysis_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  
  -- Link to workflow and user
  user_id uuid NOT NULL,
  workflow_id uuid,
  workflow_run_id uuid,  -- Links to a specific execution
  output_node_id text NOT NULL,
  output_node_name text,
  
  -- Session metadata
  session_name text,
  description text,
  
  -- Status tracking
  status text DEFAULT 'draft' CHECK (status = ANY (ARRAY['draft', 'grounded', 'completed', 'archived'])),
  
  -- Node context at time of analysis
  connected_nodes_count integer DEFAULT 0,
  completed_nodes_count integer DEFAULT 0,
  node_types jsonb DEFAULT '[]'::jsonb,
  node_names jsonb DEFAULT '[]'::jsonb,
  
  -- Timestamps
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone,
  
  -- Constraints
  CONSTRAINT workflow_analysis_sessions_pkey PRIMARY KEY (id),
  CONSTRAINT workflow_analysis_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT workflow_analysis_sessions_workflow_id_fkey FOREIGN KEY (workflow_id) REFERENCES public.workflows(id) ON DELETE SET NULL
);

-- Index for fast user lookups
CREATE INDEX IF NOT EXISTS idx_analysis_sessions_user_id ON public.workflow_analysis_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_analysis_sessions_workflow_id ON public.workflow_analysis_sessions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_analysis_sessions_status ON public.workflow_analysis_sessions(status);

-- -----------------------------------------------------------------------------
-- Table: analysis_grounding_suggestions
-- Stores the "Step 1" grounding suggestions that define user intent
-- These are templates created BEFORE workflow runs, used to ground final output
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.analysis_grounding_suggestions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  
  -- Link to analysis session
  session_id uuid NOT NULL,
  
  -- User's original intent/request
  user_intent text NOT NULL,
  original_prompt text,
  
  -- AI-suggested Python code template
  suggested_python_code text,
  
  -- AI-suggested output format template
  suggested_output_format text,
  format_type text DEFAULT 'markdown' CHECK (format_type = ANY (ARRAY['markdown', 'html', 'json', 'csv'])),
  
  -- AI explanation of the suggestion
  explanation text,
  
  -- Whether user approved this grounding
  is_approved boolean DEFAULT false,
  approved_at timestamp with time zone,
  
  -- Version tracking (users can refine suggestions)
  version integer DEFAULT 1,
  
  -- Timestamps
  created_at timestamp with time zone DEFAULT now(),
  
  -- Constraints
  CONSTRAINT analysis_grounding_suggestions_pkey PRIMARY KEY (id),
  CONSTRAINT analysis_grounding_suggestions_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.workflow_analysis_sessions(id) ON DELETE CASCADE
);

-- Index for session lookups
CREATE INDEX IF NOT EXISTS idx_grounding_suggestions_session_id ON public.analysis_grounding_suggestions(session_id);

-- -----------------------------------------------------------------------------
-- Table: analysis_outputs
-- Stores the final generated outputs from the Analysis Workbench
-- These are the "Step 2" results using actual workflow data + grounding
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.analysis_outputs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  
  -- Link to analysis session and grounding
  session_id uuid NOT NULL,
  grounding_suggestion_id uuid,
  
  -- Output type
  output_type text NOT NULL CHECK (output_type = ANY (ARRAY['natural_language', 'python', 'display'])),
  
  -- Natural language analysis results
  nl_prompt text,
  nl_response text,
  nl_tokens_used integer,
  
  -- Python code (user-edited or AI-generated)
  python_code text,
  python_output text,
  python_execution_status text CHECK (python_execution_status = ANY (ARRAY['pending', 'success', 'error'])),
  python_error_message text,
  
  -- Display/render output
  display_content text,
  display_format text DEFAULT 'markdown' CHECK (display_format = ANY (ARRAY['markdown', 'html', 'json', 'csv', 'chart'])),
  display_config jsonb DEFAULT '{}'::jsonb,  -- Chart configs, styling, etc.
  
  -- Export metadata
  is_exported boolean DEFAULT false,
  export_format text,
  export_url text,
  exported_at timestamp with time zone,
  
  -- Rating/feedback
  user_rating integer CHECK (user_rating >= 1 AND user_rating <= 5),
  user_feedback text,
  
  -- Timestamps
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  
  -- Constraints
  CONSTRAINT analysis_outputs_pkey PRIMARY KEY (id),
  CONSTRAINT analysis_outputs_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.workflow_analysis_sessions(id) ON DELETE CASCADE,
  CONSTRAINT analysis_outputs_grounding_id_fkey FOREIGN KEY (grounding_suggestion_id) REFERENCES public.analysis_grounding_suggestions(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_analysis_outputs_session_id ON public.analysis_outputs(session_id);
CREATE INDEX IF NOT EXISTS idx_analysis_outputs_type ON public.analysis_outputs(output_type);

-- -----------------------------------------------------------------------------
-- Table: workflow_execution_results  
-- Enhanced version of workflow_node_results - stores full execution context
-- Links workflow runs to their complete results for the Analysis Workbench
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.workflow_execution_results (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  
  -- Links
  user_id uuid NOT NULL,
  workflow_id uuid,
  workflow_name text,
  
  -- Execution context
  execution_id text NOT NULL,  -- Unique ID for this run
  
  -- Input data
  input_nodes jsonb DEFAULT '[]'::jsonb,
  input_edges jsonb DEFAULT '[]'::jsonb,
  input_config jsonb DEFAULT '{}'::jsonb,
  
  -- Raw AI response
  raw_response text,
  response_length integer,
  
  -- Parsed results
  summary text,
  per_node_results jsonb DEFAULT '[]'::jsonb,
  per_node_results_count integer DEFAULT 0,
  
  -- Execution metadata
  model_used text DEFAULT 'gemini-2.0-flash',
  tokens_input integer,
  tokens_output integer,
  execution_time_ms integer,
  
  -- Status
  status text DEFAULT 'completed' CHECK (status = ANY (ARRAY['running', 'completed', 'failed', 'partial'])),
  error_message text,
  
  -- Mapping diagnostics (from the debug we just added)
  mapping_success_rate numeric,  -- e.g., 0.95 = 95% of nodes matched
  mapping_diagnostics jsonb DEFAULT '{}'::jsonb,  -- Store mapping debug info
  
  -- Timestamps
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  
  -- Constraints
  CONSTRAINT workflow_execution_results_pkey PRIMARY KEY (id),
  CONSTRAINT workflow_execution_results_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT workflow_execution_results_workflow_id_fkey FOREIGN KEY (workflow_id) REFERENCES public.workflows(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_execution_results_user_id ON public.workflow_execution_results(user_id);
CREATE INDEX IF NOT EXISTS idx_execution_results_workflow_id ON public.workflow_execution_results(workflow_id);
CREATE INDEX IF NOT EXISTS idx_execution_results_execution_id ON public.workflow_execution_results(execution_id);
CREATE INDEX IF NOT EXISTS idx_execution_results_created_at ON public.workflow_execution_results(created_at DESC);

-- -----------------------------------------------------------------------------
-- RLS (Row Level Security) Policies
-- -----------------------------------------------------------------------------

-- Enable RLS on all new tables
ALTER TABLE public.workflow_analysis_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_grounding_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_outputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_execution_results ENABLE ROW LEVEL SECURITY;

-- Policies: Users can only access their own data
CREATE POLICY "Users can view own analysis sessions" ON public.workflow_analysis_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own analysis sessions" ON public.workflow_analysis_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own analysis sessions" ON public.workflow_analysis_sessions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own analysis sessions" ON public.workflow_analysis_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- Grounding suggestions inherit access from session
CREATE POLICY "Users can manage own grounding suggestions" ON public.analysis_grounding_suggestions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.workflow_analysis_sessions s 
      WHERE s.id = session_id AND s.user_id = auth.uid()
    )
  );

-- Analysis outputs inherit access from session  
CREATE POLICY "Users can manage own analysis outputs" ON public.analysis_outputs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.workflow_analysis_sessions s 
      WHERE s.id = session_id AND s.user_id = auth.uid()
    )
  );

-- Execution results
CREATE POLICY "Users can view own execution results" ON public.workflow_execution_results
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own execution results" ON public.workflow_execution_results
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- Updated triggers for updated_at
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_workflow_analysis_sessions_updated_at
  BEFORE UPDATE ON public.workflow_analysis_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_analysis_outputs_updated_at
  BEFORE UPDATE ON public.analysis_outputs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- -----------------------------------------------------------------------------
-- Comments for documentation
-- -----------------------------------------------------------------------------
COMMENT ON TABLE public.workflow_analysis_sessions IS 'Analysis Workbench sessions - tracks user analysis of workflow outputs';
COMMENT ON TABLE public.analysis_grounding_suggestions IS 'Step 1 grounding suggestions - templates for final output generation';
COMMENT ON TABLE public.analysis_outputs IS 'Step 2 final outputs - generated analysis using grounding + actual results';
COMMENT ON TABLE public.workflow_execution_results IS 'Complete workflow execution results with diagnostics';

COMMENT ON COLUMN public.workflow_analysis_sessions.status IS 'draft=just created, grounded=has approved suggestion, completed=has final output, archived=no longer active';
COMMENT ON COLUMN public.analysis_grounding_suggestions.version IS 'Incremented when user refines the suggestion';
COMMENT ON COLUMN public.workflow_execution_results.mapping_success_rate IS 'Percentage of workflow nodes that matched AI-returned nodeIds';
