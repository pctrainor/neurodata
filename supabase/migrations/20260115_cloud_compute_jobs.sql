-- ============================================================================
-- CLOUD COMPUTE JOB QUEUE
-- Enables serverless workflow execution on cloud VMs/containers
-- ============================================================================

-- Job status enum
CREATE TYPE cloud_job_status AS ENUM (
  'pending',      -- Job submitted, waiting to be picked up
  'queued',       -- Job in queue, container starting
  'running',      -- Container processing the workflow
  'completed',    -- Successfully finished
  'failed',       -- Execution failed
  'cancelled'     -- User cancelled the job
);

-- Main job queue table
CREATE TABLE IF NOT EXISTS cloud_compute_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Job metadata
  job_name TEXT, -- Optional friendly name
  node_count INTEGER NOT NULL DEFAULT 0,
  estimated_duration_seconds INTEGER, -- Estimated time based on node count
  
  -- Workflow data (serialized)
  workflow_data JSONB NOT NULL, -- Full workflow: nodes, edges, config
  workflow_hash TEXT, -- Hash for deduplication/caching
  
  -- Execution status
  status cloud_job_status NOT NULL DEFAULT 'pending',
  progress INTEGER DEFAULT 0, -- 0-100 percentage
  current_node TEXT, -- Which node is currently being processed
  
  -- Results
  result JSONB, -- Full workflow results when completed
  per_node_results JSONB, -- Results mapped by node ID
  error_message TEXT, -- Error details if failed
  
  -- Compute resource info
  container_id TEXT, -- Azure Container ID for tracking
  compute_tier TEXT DEFAULT 'standard', -- 'standard', 'high_memory', 'gpu'
  
  -- Timing
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ, -- When container started processing
  completed_at TIMESTAMPTZ, -- When job finished
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'), -- Results retention
  
  -- Credits
  credits_charged INTEGER DEFAULT 0, -- Credits used for this job
  credits_refunded BOOLEAN DEFAULT FALSE -- If failed, were credits refunded?
);

-- Index for fast lookups
CREATE INDEX idx_cloud_jobs_user_status ON cloud_compute_jobs(user_id, status);
CREATE INDEX idx_cloud_jobs_pending ON cloud_compute_jobs(status, created_at) WHERE status = 'pending';
CREATE INDEX idx_cloud_jobs_created ON cloud_compute_jobs(created_at DESC);

-- Enable RLS
ALTER TABLE cloud_compute_jobs ENABLE ROW LEVEL SECURITY;

-- Users can only see their own jobs
DROP POLICY IF EXISTS "Users can view own jobs" ON cloud_compute_jobs;
CREATE POLICY "Users can view own jobs" ON cloud_compute_jobs
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own jobs
DROP POLICY IF EXISTS "Users can create jobs" ON cloud_compute_jobs;
CREATE POLICY "Users can create jobs" ON cloud_compute_jobs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can cancel their own pending/queued jobs
DROP POLICY IF EXISTS "Users can cancel own jobs" ON cloud_compute_jobs;
CREATE POLICY "Users can cancel own jobs" ON cloud_compute_jobs
  FOR UPDATE USING (
    auth.uid() = user_id 
    AND status IN ('pending', 'queued')
  );

-- Service role can update any job (for the worker container)
DROP POLICY IF EXISTS "Service can update jobs" ON cloud_compute_jobs;
CREATE POLICY "Service can update jobs" ON cloud_compute_jobs
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- USER PREFERENCES FOR CLOUD COMPUTE
-- ============================================================================

-- Add cloud compute preference to user settings (if table exists)
DO $$
BEGIN
  -- Check if user_settings table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_settings') THEN
    -- Add column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_settings' AND column_name = 'prefer_cloud_compute') THEN
      ALTER TABLE user_settings ADD COLUMN prefer_cloud_compute BOOLEAN DEFAULT FALSE;
    END IF;
  END IF;
END $$;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to estimate job duration based on node count
CREATE OR REPLACE FUNCTION estimate_job_duration(node_count INTEGER)
RETURNS INTEGER AS $$
BEGIN
  -- Rough estimate: 2 seconds per node + 10 second overhead
  RETURN 10 + (node_count * 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to calculate credits for a cloud job
CREATE OR REPLACE FUNCTION calculate_cloud_job_credits(node_count INTEGER, compute_tier TEXT DEFAULT 'standard')
RETURNS INTEGER AS $$
DECLARE
  base_credits INTEGER;
  tier_multiplier NUMERIC;
BEGIN
  -- Base: 1 credit per 5 nodes, minimum 2 credits
  base_credits := GREATEST(2, CEIL(node_count::NUMERIC / 5));
  
  -- Tier multiplier
  tier_multiplier := CASE compute_tier
    WHEN 'high_memory' THEN 1.5
    WHEN 'gpu' THEN 3.0
    ELSE 1.0
  END;
  
  RETURN CEIL(base_credits * tier_multiplier);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to get next pending job (for worker)
CREATE OR REPLACE FUNCTION get_next_pending_job()
RETURNS UUID AS $$
DECLARE
  job_id UUID;
BEGIN
  -- Get and lock the oldest pending job
  SELECT id INTO job_id
  FROM cloud_compute_jobs
  WHERE status = 'pending'
  ORDER BY created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;
  
  -- Mark it as queued
  IF job_id IS NOT NULL THEN
    UPDATE cloud_compute_jobs
    SET status = 'queued', started_at = NOW()
    WHERE id = job_id;
  END IF;
  
  RETURN job_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- REALTIME SUBSCRIPTIONS
-- ============================================================================

-- Enable realtime for job status updates
ALTER PUBLICATION supabase_realtime ADD TABLE cloud_compute_jobs;

-- ============================================================================
-- CLEANUP POLICY
-- ============================================================================

-- Function to clean up expired jobs
CREATE OR REPLACE FUNCTION cleanup_expired_jobs()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM cloud_compute_jobs
  WHERE expires_at < NOW()
  AND status IN ('completed', 'failed', 'cancelled');
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Note: Schedule this with pg_cron or an external scheduler
-- SELECT cron.schedule('cleanup-cloud-jobs', '0 3 * * *', 'SELECT cleanup_expired_jobs()');
