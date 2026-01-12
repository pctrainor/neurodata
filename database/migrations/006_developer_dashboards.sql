-- =============================================
-- Migration: Workflow Node Results for Developer Dashboards
-- Stores structured output from each of the 101 brain simulation nodes
-- Enables developers to build custom dashboards and marketplace items
-- =============================================

-- Workflow execution runs (extends existing workflow_runs)
CREATE TABLE IF NOT EXISTS public.workflow_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  workflow_id UUID,
  workflow_name TEXT NOT NULL,
  
  -- Execution metadata
  status TEXT DEFAULT 'pending', -- pending, running, completed, failed
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  execution_time_ms INTEGER,
  
  -- Content being analyzed
  content_url TEXT,
  content_title TEXT,
  content_platform TEXT, -- youtube, tiktok, instagram, etc.
  
  -- Summary results
  overall_score DECIMAL(5,2), -- 0-100 engagement score
  viral_potential TEXT, -- low, medium, high, viral
  
  -- Full analysis (markdown)
  full_analysis TEXT,
  
  -- Aggregated metrics (JSON for flexibility)
  aggregated_metrics JSONB DEFAULT '{}'::jsonb,
  
  -- Node counts
  total_nodes INTEGER,
  completed_nodes INTEGER DEFAULT 0,
  failed_nodes INTEGER DEFAULT 0,
  
  -- Credits/billing
  credits_used INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Individual node results from each of the 101 brain simulations
CREATE TABLE IF NOT EXISTS public.workflow_node_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID REFERENCES workflow_executions(id) ON DELETE CASCADE,
  
  -- Node identification
  node_id TEXT NOT NULL, -- e.g., "brain-sim-42"
  node_type TEXT NOT NULL, -- brainNode, analysisNode, etc.
  node_label TEXT, -- "Gen Z (18-24) #2"
  
  -- Demographic/persona info (for brain nodes)
  demographic_id TEXT, -- e.g., "gen-z-18-24"
  demographic_traits TEXT[], -- ['digital native', 'short attention span']
  persona_category TEXT, -- age, personality, political, education, stress
  
  -- Execution status
  status TEXT DEFAULT 'pending', -- pending, running, completed, failed
  executed_at TIMESTAMPTZ,
  execution_time_ms INTEGER,
  
  -- Structured output scores (0-100 or 1-10 scale)
  engagement_score DECIMAL(5,2),
  attention_score DECIMAL(5,2),
  emotional_intensity DECIMAL(5,2),
  memory_encoding DECIMAL(5,2),
  share_likelihood DECIMAL(5,2),
  purchase_intent DECIMAL(5,2),
  trust_level DECIMAL(5,2),
  
  -- Categorical outputs
  primary_emotion TEXT, -- joy, fear, anger, sadness, surprise, disgust
  emotional_valence TEXT, -- positive, negative, neutral, mixed
  would_share BOOLEAN,
  would_subscribe BOOLEAN,
  would_purchase BOOLEAN,
  
  -- Detailed analysis (can be queried)
  attention_moments JSONB DEFAULT '[]'::jsonb, -- [{timestamp: "0:15", type: "hook", intensity: 9}]
  emotional_journey JSONB DEFAULT '[]'::jsonb, -- [{timestamp: "0:30", emotion: "surprise", intensity: 8}]
  key_insights TEXT[], -- Array of insights for this persona
  recommendations TEXT[], -- Specific recs for this demographic
  
  -- Full text response (for custom parsing)
  raw_response TEXT,
  
  -- Error info if failed
  error_message TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Aggregated results by demographic category
CREATE TABLE IF NOT EXISTS public.workflow_demographic_aggregates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID REFERENCES workflow_executions(id) ON DELETE CASCADE,
  
  -- Demographic grouping
  category TEXT NOT NULL, -- 'age', 'personality', 'political', 'education', 'stress', 'consumer'
  segment TEXT NOT NULL, -- 'gen-z', 'high-openness', 'progressive-urban', etc.
  segment_label TEXT, -- 'Gen Z (18-24)', 'High Openness', etc.
  
  -- Aggregated scores (averages across personas in this segment)
  avg_engagement DECIMAL(5,2),
  avg_attention DECIMAL(5,2),
  avg_emotional_intensity DECIMAL(5,2),
  avg_memory_encoding DECIMAL(5,2),
  avg_share_likelihood DECIMAL(5,2),
  avg_purchase_intent DECIMAL(5,2),
  
  -- Counts
  sample_size INTEGER,
  would_share_count INTEGER,
  would_subscribe_count INTEGER,
  would_purchase_count INTEGER,
  
  -- Dominant patterns
  dominant_emotion TEXT,
  dominant_reaction TEXT,
  
  -- Segment-specific insights
  key_insights TEXT[],
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Developer dashboard configurations (marketplace items)
CREATE TABLE IF NOT EXISTS public.developer_dashboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Dashboard info
  name TEXT NOT NULL,
  description TEXT,
  slug TEXT UNIQUE,
  
  -- Dashboard type
  dashboard_type TEXT DEFAULT 'custom', -- custom, template, marketplace
  
  -- Code/config
  html_template TEXT, -- Custom HTML for rendering
  css_styles TEXT, -- Custom CSS
  javascript_code TEXT, -- Custom JS for data processing
  python_code TEXT, -- Optional Python for server-side processing
  
  -- Expected input (node result schema)
  expected_node_types TEXT[], -- ['brainNode']
  expected_output_schema JSONB, -- JSON schema of expected node outputs
  
  -- Configuration options (for users of this dashboard)
  config_schema JSONB, -- JSON schema for dashboard configuration
  default_config JSONB,
  
  -- Marketplace info
  is_public BOOLEAN DEFAULT false,
  is_marketplace BOOLEAN DEFAULT false,
  price_credits INTEGER DEFAULT 0, -- Price in platform credits
  category TEXT, -- 'analytics', 'visualization', 'export', 'reporting'
  tags TEXT[],
  
  -- Stats
  usage_count INTEGER DEFAULT 0,
  rating DECIMAL(3,2),
  rating_count INTEGER DEFAULT 0,
  
  -- Version control
  version TEXT DEFAULT '1.0.0',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Dashboard usage/instances
CREATE TABLE IF NOT EXISTS public.dashboard_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dashboard_id UUID REFERENCES developer_dashboards(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  execution_id UUID REFERENCES workflow_executions(id) ON DELETE SET NULL,
  
  -- User's configuration for this dashboard
  config JSONB,
  
  -- Rendered output (cached)
  rendered_html TEXT,
  rendered_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_workflow_executions_user ON workflow_executions(user_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_status ON workflow_executions(status);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_created ON workflow_executions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_node_results_execution ON workflow_node_results(execution_id);
CREATE INDEX IF NOT EXISTS idx_node_results_demographic ON workflow_node_results(demographic_id);
CREATE INDEX IF NOT EXISTS idx_node_results_persona_cat ON workflow_node_results(persona_category);
CREATE INDEX IF NOT EXISTS idx_node_results_scores ON workflow_node_results(engagement_score, attention_score);

CREATE INDEX IF NOT EXISTS idx_demographic_aggregates_execution ON workflow_demographic_aggregates(execution_id);
CREATE INDEX IF NOT EXISTS idx_demographic_aggregates_category ON workflow_demographic_aggregates(category, segment);

CREATE INDEX IF NOT EXISTS idx_developer_dashboards_marketplace ON developer_dashboards(is_marketplace, category) WHERE is_marketplace = true;
CREATE INDEX IF NOT EXISTS idx_developer_dashboards_creator ON developer_dashboards(creator_id);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

ALTER TABLE workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_node_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_demographic_aggregates ENABLE ROW LEVEL SECURITY;
ALTER TABLE developer_dashboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_instances ENABLE ROW LEVEL SECURITY;

-- Users can only see their own executions
CREATE POLICY "Users can view own executions" ON workflow_executions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own executions" ON workflow_executions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own executions" ON workflow_executions
  FOR UPDATE USING (auth.uid() = user_id);

-- Node results inherit from execution
CREATE POLICY "Users can view node results of own executions" ON workflow_node_results
  FOR SELECT USING (
    execution_id IN (SELECT id FROM workflow_executions WHERE user_id = auth.uid())
  );

CREATE POLICY "Service role can insert node results" ON workflow_node_results
  FOR INSERT WITH CHECK (true);

-- Demographic aggregates inherit from execution  
CREATE POLICY "Users can view aggregates of own executions" ON workflow_demographic_aggregates
  FOR SELECT USING (
    execution_id IN (SELECT id FROM workflow_executions WHERE user_id = auth.uid())
  );

-- Developer dashboards
CREATE POLICY "Users can view public dashboards" ON developer_dashboards
  FOR SELECT USING (is_public = true OR creator_id = auth.uid());

CREATE POLICY "Users can create dashboards" ON developer_dashboards
  FOR INSERT WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Users can update own dashboards" ON developer_dashboards
  FOR UPDATE USING (auth.uid() = creator_id);

CREATE POLICY "Users can delete own dashboards" ON developer_dashboards
  FOR DELETE USING (auth.uid() = creator_id);

-- Dashboard instances
CREATE POLICY "Users can view own dashboard instances" ON dashboard_instances
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own dashboard instances" ON dashboard_instances
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =============================================
-- FUNCTIONS
-- =============================================

-- Function to aggregate node results into demographic summaries
CREATE OR REPLACE FUNCTION aggregate_execution_results(p_execution_id UUID)
RETURNS void AS $$
DECLARE
  v_category TEXT;
  v_segment TEXT;
BEGIN
  -- Delete existing aggregates for this execution
  DELETE FROM workflow_demographic_aggregates WHERE execution_id = p_execution_id;
  
  -- Insert new aggregates grouped by persona category
  INSERT INTO workflow_demographic_aggregates (
    execution_id, category, segment, segment_label,
    avg_engagement, avg_attention, avg_emotional_intensity,
    avg_memory_encoding, avg_share_likelihood, avg_purchase_intent,
    sample_size, would_share_count, would_subscribe_count, would_purchase_count,
    dominant_emotion
  )
  SELECT 
    p_execution_id,
    persona_category,
    demographic_id,
    node_label,
    AVG(engagement_score),
    AVG(attention_score),
    AVG(emotional_intensity),
    AVG(memory_encoding),
    AVG(share_likelihood),
    AVG(purchase_intent),
    COUNT(*),
    COUNT(*) FILTER (WHERE would_share = true),
    COUNT(*) FILTER (WHERE would_subscribe = true),
    COUNT(*) FILTER (WHERE would_purchase = true),
    MODE() WITHIN GROUP (ORDER BY primary_emotion)
  FROM workflow_node_results
  WHERE execution_id = p_execution_id
    AND persona_category IS NOT NULL
  GROUP BY persona_category, demographic_id, node_label;
  
  -- Update execution with overall metrics
  UPDATE workflow_executions SET
    overall_score = (
      SELECT AVG(engagement_score) FROM workflow_node_results WHERE execution_id = p_execution_id
    ),
    completed_nodes = (
      SELECT COUNT(*) FROM workflow_node_results WHERE execution_id = p_execution_id AND status = 'completed'
    ),
    aggregated_metrics = (
      SELECT jsonb_build_object(
        'avg_engagement', AVG(engagement_score),
        'avg_attention', AVG(attention_score),
        'avg_emotional_intensity', AVG(emotional_intensity),
        'share_rate', AVG(CASE WHEN would_share THEN 100 ELSE 0 END),
        'purchase_rate', AVG(CASE WHEN would_purchase THEN 100 ELSE 0 END),
        'top_emotion', MODE() WITHIN GROUP (ORDER BY primary_emotion)
      )
      FROM workflow_node_results WHERE execution_id = p_execution_id
    ),
    updated_at = NOW()
  WHERE id = p_execution_id;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON TABLE workflow_executions IS 'Stores metadata about workflow runs including the 101 brain node executions';
COMMENT ON TABLE workflow_node_results IS 'Individual results from each brain simulation node - core data for developer dashboards';
COMMENT ON TABLE workflow_demographic_aggregates IS 'Pre-computed aggregates by demographic category for fast querying';
COMMENT ON TABLE developer_dashboards IS 'Custom dashboard configurations that developers can create and sell on marketplace';
COMMENT ON TABLE dashboard_instances IS 'User instances of developer dashboards applied to specific workflow executions';
