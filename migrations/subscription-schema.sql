-- ============================================================
-- NEURODATA HUB: Subscription & Usage Tracking Schema
-- Run this in Supabase SQL Editor to set up billing infrastructure
-- ============================================================

-- 1. ADD SUBSCRIPTION COLUMNS TO USERS TABLE
-- (Run this if users table already exists, otherwise these are already in the main schema)
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'researcher', 'clinical'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'active';
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_period_end TIMESTAMPTZ;

-- Index for Stripe lookups
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer ON users(stripe_customer_id);

-- 2. WORKFLOW USAGE TRACKING TABLE
CREATE TABLE IF NOT EXISTS workflow_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workflow_id UUID REFERENCES workflows(id) ON DELETE SET NULL,
  
  -- Usage metrics
  action TEXT NOT NULL CHECK (action IN ('create', 'run', 'ai_generate')),
  node_count INT DEFAULT 0,
  execution_time_ms INT,
  ai_tokens_used INT,
  
  -- Billing period tracking
  billing_period_start DATE NOT NULL DEFAULT date_trunc('month', CURRENT_DATE),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for usage queries
CREATE INDEX IF NOT EXISTS idx_workflow_usage_user ON workflow_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_workflow_usage_period ON workflow_usage(user_id, billing_period_start);
CREATE INDEX IF NOT EXISTS idx_workflow_usage_action ON workflow_usage(action);

-- 3. SUBSCRIPTION LIMITS TABLE (for easy configuration)
CREATE TABLE IF NOT EXISTS subscription_limits (
  tier TEXT PRIMARY KEY CHECK (tier IN ('free', 'researcher', 'clinical')),
  
  -- Workflow limits
  workflows_per_month INT NOT NULL,  -- -1 for unlimited
  ai_generations_per_month INT NOT NULL,  -- -1 for unlimited
  
  -- Feature flags
  can_use_hcp BOOLEAN DEFAULT false,
  can_use_allen BOOLEAN DEFAULT false,
  can_use_comparison_agents BOOLEAN DEFAULT false,
  can_export_bids BOOLEAN DEFAULT false,
  can_use_tbi_reports BOOLEAN DEFAULT false,
  
  -- Compute limits
  max_nodes_per_workflow INT DEFAULT 20,
  max_concurrent_workflows INT DEFAULT 1,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default limits
INSERT INTO subscription_limits (tier, workflows_per_month, ai_generations_per_month, can_use_hcp, can_use_allen, can_use_comparison_agents, can_export_bids, can_use_tbi_reports, max_nodes_per_workflow, max_concurrent_workflows)
VALUES 
  ('free', 3, 5, false, false, false, false, false, 10, 1),
  ('researcher', -1, -1, true, true, true, true, false, 50, 5),
  ('clinical', -1, -1, true, true, true, true, true, 100, 10)
ON CONFLICT (tier) DO UPDATE SET
  workflows_per_month = EXCLUDED.workflows_per_month,
  ai_generations_per_month = EXCLUDED.ai_generations_per_month,
  can_use_hcp = EXCLUDED.can_use_hcp,
  can_use_allen = EXCLUDED.can_use_allen,
  can_use_comparison_agents = EXCLUDED.can_use_comparison_agents,
  can_export_bids = EXCLUDED.can_export_bids,
  can_use_tbi_reports = EXCLUDED.can_use_tbi_reports,
  max_nodes_per_workflow = EXCLUDED.max_nodes_per_workflow,
  max_concurrent_workflows = EXCLUDED.max_concurrent_workflows;

-- 4. FUNCTION: Get user's current month usage
CREATE OR REPLACE FUNCTION get_user_monthly_usage(p_user_id UUID)
RETURNS TABLE (
  workflow_count BIGINT,
  ai_generation_count BIGINT,
  total_runs BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) FILTER (WHERE action = 'create') as workflow_count,
    COUNT(*) FILTER (WHERE action = 'ai_generate') as ai_generation_count,
    COUNT(*) FILTER (WHERE action = 'run') as total_runs
  FROM workflow_usage
  WHERE user_id = p_user_id
    AND billing_period_start = date_trunc('month', CURRENT_DATE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. FUNCTION: Check if user can perform action
CREATE OR REPLACE FUNCTION can_user_perform_action(
  p_user_id UUID,
  p_action TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_tier TEXT;
  v_limit INT;
  v_current_count BIGINT;
BEGIN
  -- Get user's tier
  SELECT subscription_tier INTO v_tier
  FROM users
  WHERE id = p_user_id;
  
  IF v_tier IS NULL THEN
    v_tier := 'free';
  END IF;
  
  -- Get limit for action
  IF p_action = 'create' THEN
    SELECT workflows_per_month INTO v_limit FROM subscription_limits WHERE tier = v_tier;
  ELSIF p_action = 'ai_generate' THEN
    SELECT ai_generations_per_month INTO v_limit FROM subscription_limits WHERE tier = v_tier;
  ELSE
    RETURN true; -- No limit on other actions
  END IF;
  
  -- Unlimited
  IF v_limit = -1 THEN
    RETURN true;
  END IF;
  
  -- Count current usage
  SELECT COUNT(*) INTO v_current_count
  FROM workflow_usage
  WHERE user_id = p_user_id
    AND action = p_action
    AND billing_period_start = date_trunc('month', CURRENT_DATE);
  
  RETURN v_current_count < v_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. FUNCTION: Record usage (call this from API)
CREATE OR REPLACE FUNCTION record_workflow_usage(
  p_user_id UUID,
  p_workflow_id UUID,
  p_action TEXT,
  p_node_count INT DEFAULT 0,
  p_execution_time_ms INT DEFAULT NULL,
  p_ai_tokens_used INT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO workflow_usage (user_id, workflow_id, action, node_count, execution_time_ms, ai_tokens_used)
  VALUES (p_user_id, p_workflow_id, p_action, p_node_count, p_execution_time_ms, p_ai_tokens_used)
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. VIEW: User subscription status with usage
CREATE OR REPLACE VIEW user_subscription_status AS
SELECT 
  u.id as user_id,
  u.email,
  u.subscription_tier,
  u.subscription_status,
  u.subscription_period_end,
  sl.workflows_per_month as workflow_limit,
  sl.ai_generations_per_month as ai_limit,
  COALESCE(wu.workflow_count, 0) as workflows_used,
  COALESCE(wu.ai_count, 0) as ai_generations_used,
  CASE 
    WHEN sl.workflows_per_month = -1 THEN -1
    ELSE sl.workflows_per_month - COALESCE(wu.workflow_count, 0)
  END as workflows_remaining
FROM users u
LEFT JOIN subscription_limits sl ON sl.tier = COALESCE(u.subscription_tier, 'free')
LEFT JOIN (
  SELECT 
    user_id,
    COUNT(*) FILTER (WHERE action = 'create') as workflow_count,
    COUNT(*) FILTER (WHERE action = 'ai_generate') as ai_count
  FROM workflow_usage
  WHERE billing_period_start = date_trunc('month', CURRENT_DATE)
  GROUP BY user_id
) wu ON wu.user_id = u.id;

-- 8. RLS POLICIES
ALTER TABLE workflow_usage ENABLE ROW LEVEL SECURITY;

-- Users can only see their own usage
CREATE POLICY "Users can view own usage" ON workflow_usage
  FOR SELECT USING (auth.uid() = user_id);

-- Only service role can insert usage (via API)
CREATE POLICY "Service role can insert usage" ON workflow_usage
  FOR INSERT WITH CHECK (true);

-- Grant access
GRANT SELECT ON user_subscription_status TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_monthly_usage TO authenticated;
GRANT EXECUTE ON FUNCTION can_user_perform_action TO authenticated;

-- ============================================================
-- DONE! Your subscription infrastructure is ready.
-- 
-- Next steps:
-- 1. Set up Stripe products in dashboard
-- 2. Update lib/stripe-config.ts with real product/price IDs
-- 3. Set environment variables:
--    - STRIPE_SECRET_KEY
--    - STRIPE_WEBHOOK_SECRET
--    - NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
-- ============================================================
