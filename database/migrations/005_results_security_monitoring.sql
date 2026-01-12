-- ============================================================================
-- WORKFLOW RESULTS, SECURITY AUDIT & USAGE MONITORING
-- Migration 005: Production-ready security and monitoring
-- ============================================================================

-- ============================================================================
-- 1. WORKFLOW RESULTS TABLE
-- Stores the results of workflow executions for user history
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.workflow_results (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workflow_id uuid REFERENCES public.workflows(id) ON DELETE SET NULL,
  
  -- Workflow snapshot (in case original is deleted)
  workflow_name text NOT NULL,
  workflow_config jsonb DEFAULT '{}',
  
  -- Input data
  input_data jsonb DEFAULT '{}',
  input_url text,
  
  -- Results
  analysis_result text,
  structured_result jsonb DEFAULT '{}',
  
  -- Execution metadata
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  started_at timestamptz,
  completed_at timestamptz,
  duration_ms integer,
  node_count integer,
  
  -- AI model used
  model_used text,
  tokens_used integer DEFAULT 0,
  credits_used integer DEFAULT 0,
  
  -- Error tracking
  error_message text,
  error_details jsonb,
  
  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.workflow_results ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can read own results" ON public.workflow_results;
DROP POLICY IF EXISTS "Users can insert own results" ON public.workflow_results;
DROP POLICY IF EXISTS "Users can update own results" ON public.workflow_results;
DROP POLICY IF EXISTS "Users can delete own results" ON public.workflow_results;

CREATE POLICY "Users can read own results" ON public.workflow_results
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own results" ON public.workflow_results
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own results" ON public.workflow_results
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own results" ON public.workflow_results
  FOR DELETE USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_workflow_results_user_id ON public.workflow_results(user_id);
CREATE INDEX IF NOT EXISTS idx_workflow_results_workflow_id ON public.workflow_results(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_results_created_at ON public.workflow_results(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_workflow_results_status ON public.workflow_results(status);

-- Updated at trigger
DROP TRIGGER IF EXISTS update_workflow_results_updated_at ON public.workflow_results;
CREATE TRIGGER update_workflow_results_updated_at
  BEFORE UPDATE ON public.workflow_results
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 2. USAGE TRACKING & RATE LIMITING
-- Tracks API usage per user for rate limiting and abuse detection
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.usage_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Request details
  endpoint text NOT NULL,
  method text NOT NULL,
  ip_address inet,
  user_agent text,
  
  -- Rate limiting
  request_count integer DEFAULT 1,
  window_start timestamptz DEFAULT now(),
  
  -- Resource usage
  tokens_used integer DEFAULT 0,
  credits_used integer DEFAULT 0,
  response_time_ms integer,
  
  -- Status
  status_code integer,
  is_error boolean DEFAULT false,
  error_type text,
  
  -- Metadata
  created_at timestamptz DEFAULT now()
);

-- Enable RLS (admins only for reading logs)
ALTER TABLE public.usage_logs ENABLE ROW LEVEL SECURITY;

-- Users can only insert their own usage logs, not read them
DROP POLICY IF EXISTS "Users can insert own usage" ON public.usage_logs;
CREATE POLICY "Users can insert own usage" ON public.usage_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_usage_logs_user_id ON public.usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_endpoint ON public.usage_logs(endpoint);
CREATE INDEX IF NOT EXISTS idx_usage_logs_created_at ON public.usage_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_logs_window ON public.usage_logs(user_id, endpoint, window_start);

-- Partition by time for efficient cleanup (optional, for high-volume)
-- ALTER TABLE public.usage_logs SET (autovacuum_vacuum_threshold = 50);

-- ============================================================================
-- 3. RATE LIMIT CONFIGURATION
-- Configurable rate limits per tier
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.rate_limits (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tier text NOT NULL UNIQUE,
  
  -- Request limits
  requests_per_minute integer DEFAULT 60,
  requests_per_hour integer DEFAULT 1000,
  requests_per_day integer DEFAULT 10000,
  
  -- Workflow limits
  workflows_per_day integer DEFAULT 10,
  workflows_per_month integer DEFAULT 100,
  
  -- Resource limits
  max_tokens_per_request integer DEFAULT 100000,
  max_nodes_per_workflow integer DEFAULT 200,
  
  -- Feature flags
  can_use_video_analysis boolean DEFAULT false,
  can_export_results boolean DEFAULT true,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Insert default rate limits
INSERT INTO public.rate_limits (tier, requests_per_minute, requests_per_hour, requests_per_day, workflows_per_day, workflows_per_month, can_use_video_analysis)
VALUES 
  ('free', 20, 200, 1000, 3, 15, false),
  ('researcher', 60, 1000, 10000, 50, 500, true),
  ('clinical', 120, 2000, 50000, 200, 5000, true),
  ('enterprise', 300, 10000, 100000, 1000, 50000, true)
ON CONFLICT (tier) DO UPDATE SET
  requests_per_minute = EXCLUDED.requests_per_minute,
  requests_per_hour = EXCLUDED.requests_per_hour,
  requests_per_day = EXCLUDED.requests_per_day,
  workflows_per_day = EXCLUDED.workflows_per_day,
  workflows_per_month = EXCLUDED.workflows_per_month,
  can_use_video_analysis = EXCLUDED.can_use_video_analysis,
  updated_at = now();

-- ============================================================================
-- 4. SECURITY AUDIT - Ensure all tables have RLS enabled
-- ============================================================================

-- Verify RLS is enabled on all user-related tables
DO $$
DECLARE
  table_name text;
BEGIN
  FOR table_name IN 
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename IN (
      'user_settings', 
      'user_profiles', 
      'user_interests', 
      'workflows', 
      'workflow_results',
      'items',
      'categories'
    )
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
  END LOOP;
END $$;

-- ============================================================================
-- 5. ABUSE DETECTION FUNCTION
-- Detects abnormal usage patterns
-- ============================================================================

CREATE OR REPLACE FUNCTION check_rate_limit(
  p_user_id uuid,
  p_endpoint text,
  p_tier text DEFAULT 'free'
) RETURNS boolean AS $$
DECLARE
  v_limit record;
  v_count_minute integer;
  v_count_hour integer;
  v_count_day integer;
BEGIN
  -- Get rate limits for tier
  SELECT * INTO v_limit FROM public.rate_limits WHERE tier = p_tier;
  
  IF v_limit IS NULL THEN
    -- Default to free tier limits
    SELECT * INTO v_limit FROM public.rate_limits WHERE tier = 'free';
  END IF;
  
  -- Count requests in last minute
  SELECT COUNT(*) INTO v_count_minute
  FROM public.usage_logs
  WHERE user_id = p_user_id
    AND endpoint = p_endpoint
    AND created_at > now() - interval '1 minute';
  
  IF v_count_minute >= v_limit.requests_per_minute THEN
    RETURN false;
  END IF;
  
  -- Count requests in last hour
  SELECT COUNT(*) INTO v_count_hour
  FROM public.usage_logs
  WHERE user_id = p_user_id
    AND endpoint = p_endpoint
    AND created_at > now() - interval '1 hour';
  
  IF v_count_hour >= v_limit.requests_per_hour THEN
    RETURN false;
  END IF;
  
  -- Count requests in last day
  SELECT COUNT(*) INTO v_count_day
  FROM public.usage_logs
  WHERE user_id = p_user_id
    AND endpoint = p_endpoint
    AND created_at > now() - interval '1 day';
  
  IF v_count_day >= v_limit.requests_per_day THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 6. CLEANUP OLD LOGS (scheduled job - run daily)
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_old_usage_logs() RETURNS void AS $$
BEGIN
  -- Delete logs older than 30 days
  DELETE FROM public.usage_logs
  WHERE created_at < now() - interval '30 days';
  
  -- Delete old workflow results (keep last 100 per user)
  WITH ranked AS (
    SELECT id, user_id, 
           ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) as rn
    FROM public.workflow_results
  )
  DELETE FROM public.workflow_results
  WHERE id IN (SELECT id FROM ranked WHERE rn > 100);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE public.workflow_results IS 'Stores results of workflow executions for user history';
COMMENT ON TABLE public.usage_logs IS 'Tracks API usage for rate limiting and abuse detection';
COMMENT ON TABLE public.rate_limits IS 'Configurable rate limits per subscription tier';
COMMENT ON FUNCTION check_rate_limit IS 'Checks if a user is within their rate limits';
COMMENT ON FUNCTION cleanup_old_usage_logs IS 'Removes old usage logs and limits stored results per user';
