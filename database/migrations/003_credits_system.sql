-- Credits and Usage Tracking System
-- Run this migration to add compute credits functionality

-- ============================================
-- CREDITS CONFIGURATION BY TIER
-- ============================================
-- Free: 50 credits/month (enough for ~10 small workflows or 1 big one)
-- Researcher: 500 credits/month (enough for ~100 small workflows or 10 big ones)
-- Clinical: 2000 credits/month (enough for ~400 small workflows or 40 big ones)

-- Credit costs:
-- Brain node (Gemini Flash): 1 credit
-- Brain node (GPT-4o): 5 credits
-- Brain node (Claude Sonnet): 5 credits
-- Preprocessing node: 0.5 credits
-- Analysis node: 0.5 credits
-- Reference dataset query: 0.5 credits

-- ============================================
-- USER CREDITS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_credits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Current balance
    credits_balance DECIMAL(10, 2) NOT NULL DEFAULT 50,
    
    -- Monthly allocation based on tier
    monthly_allocation DECIMAL(10, 2) NOT NULL DEFAULT 50,
    
    -- Tracking
    credits_used_this_month DECIMAL(10, 2) NOT NULL DEFAULT 0,
    month_reset_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (date_trunc('month', now()) + interval '1 month'),
    
    -- Bonus credits (purchased or promotional)
    bonus_credits DECIMAL(10, 2) NOT NULL DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    
    UNIQUE(user_id)
);

-- ============================================
-- USAGE LOG TABLE (for billing/analytics)
-- ============================================
CREATE TABLE IF NOT EXISTS public.usage_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    workflow_id UUID REFERENCES public.workflows(id) ON DELETE SET NULL,
    
    -- What was used
    action_type TEXT NOT NULL, -- 'workflow_run', 'node_execution', 'api_call'
    resource_type TEXT NOT NULL, -- 'brain_node', 'preprocessing', 'analysis', 'reference_data'
    resource_details JSONB, -- Model used, node count, etc.
    
    -- Credits consumed
    credits_consumed DECIMAL(10, 2) NOT NULL,
    
    -- Metadata
    execution_time_ms INTEGER,
    tokens_used INTEGER,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ============================================
-- CREDIT PACKAGES (for purchases)
-- ============================================
CREATE TABLE IF NOT EXISTS public.credit_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    credits INTEGER NOT NULL,
    price_cents INTEGER NOT NULL,
    stripe_price_id TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default packages
INSERT INTO public.credit_packages (name, credits, price_cents, is_active) VALUES
    ('100 Credits', 100, 999, true),      -- $9.99
    ('500 Credits', 500, 3999, true),     -- $39.99 (20% bonus value)
    ('1000 Credits', 1000, 6999, true),   -- $69.99 (30% bonus value)
    ('5000 Credits', 5000, 29999, true)   -- $299.99 (40% bonus value)
ON CONFLICT DO NOTHING;

-- ============================================
-- TIER CREDIT ALLOCATIONS
-- ============================================
CREATE TABLE IF NOT EXISTS public.tier_credit_allocations (
    tier TEXT PRIMARY KEY,
    monthly_credits DECIMAL(10, 2) NOT NULL,
    max_nodes_per_workflow INTEGER NOT NULL,
    max_concurrent_workflows INTEGER NOT NULL,
    priority_queue BOOLEAN NOT NULL DEFAULT false
);

INSERT INTO public.tier_credit_allocations (tier, monthly_credits, max_nodes_per_workflow, max_concurrent_workflows, priority_queue) VALUES
    ('free', 50, 10, 1, false),
    ('researcher', 500, 100, 5, false),
    ('clinical', 2000, 500, 20, true)
ON CONFLICT (tier) DO UPDATE SET
    monthly_credits = EXCLUDED.monthly_credits,
    max_nodes_per_workflow = EXCLUDED.max_nodes_per_workflow,
    max_concurrent_workflows = EXCLUDED.max_concurrent_workflows,
    priority_queue = EXCLUDED.priority_queue;

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to get or create user credits
CREATE OR REPLACE FUNCTION public.get_or_create_user_credits(p_user_id UUID)
RETURNS public.user_credits AS $$
DECLARE
    v_credits public.user_credits;
    v_tier TEXT;
    v_monthly_allocation DECIMAL(10, 2);
BEGIN
    -- Try to get existing credits
    SELECT * INTO v_credits FROM public.user_credits WHERE user_id = p_user_id;
    
    IF v_credits IS NULL THEN
        -- Get user's tier
        SELECT COALESCE(subscription_tier, 'free') INTO v_tier 
        FROM public.users WHERE id = p_user_id;
        
        -- Get allocation for tier
        SELECT monthly_credits INTO v_monthly_allocation 
        FROM public.tier_credit_allocations WHERE tier = COALESCE(v_tier, 'free');
        
        -- Create new credits record
        INSERT INTO public.user_credits (user_id, credits_balance, monthly_allocation)
        VALUES (p_user_id, COALESCE(v_monthly_allocation, 50), COALESCE(v_monthly_allocation, 50))
        RETURNING * INTO v_credits;
    END IF;
    
    -- Check if month needs reset
    IF v_credits.month_reset_date <= now() THEN
        UPDATE public.user_credits SET
            credits_balance = monthly_allocation + bonus_credits,
            credits_used_this_month = 0,
            month_reset_date = date_trunc('month', now()) + interval '1 month',
            updated_at = now()
        WHERE user_id = p_user_id
        RETURNING * INTO v_credits;
    END IF;
    
    RETURN v_credits;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to consume credits
CREATE OR REPLACE FUNCTION public.consume_credits(
    p_user_id UUID,
    p_amount DECIMAL(10, 2),
    p_workflow_id UUID DEFAULT NULL,
    p_action_type TEXT DEFAULT 'workflow_run',
    p_resource_type TEXT DEFAULT 'brain_node',
    p_resource_details JSONB DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_credits public.user_credits;
    v_new_balance DECIMAL(10, 2);
BEGIN
    -- Get current credits (with auto-reset if needed)
    SELECT * INTO v_credits FROM public.get_or_create_user_credits(p_user_id);
    
    -- Check if sufficient credits
    IF v_credits.credits_balance < p_amount THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Insufficient credits',
            'required', p_amount,
            'available', v_credits.credits_balance
        );
    END IF;
    
    -- Deduct credits
    v_new_balance := v_credits.credits_balance - p_amount;
    
    UPDATE public.user_credits SET
        credits_balance = v_new_balance,
        credits_used_this_month = credits_used_this_month + p_amount,
        updated_at = now()
    WHERE user_id = p_user_id;
    
    -- Log usage
    INSERT INTO public.usage_log (user_id, workflow_id, action_type, resource_type, resource_details, credits_consumed)
    VALUES (p_user_id, p_workflow_id, p_action_type, p_resource_type, p_resource_details, p_amount);
    
    RETURN jsonb_build_object(
        'success', true,
        'credits_consumed', p_amount,
        'new_balance', v_new_balance,
        'credits_used_this_month', v_credits.credits_used_this_month + p_amount
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add bonus credits
CREATE OR REPLACE FUNCTION public.add_bonus_credits(
    p_user_id UUID,
    p_amount DECIMAL(10, 2),
    p_reason TEXT DEFAULT 'purchase'
)
RETURNS public.user_credits AS $$
DECLARE
    v_credits public.user_credits;
BEGIN
    -- Ensure user credits exist
    PERFORM public.get_or_create_user_credits(p_user_id);
    
    -- Add bonus credits
    UPDATE public.user_credits SET
        bonus_credits = bonus_credits + p_amount,
        credits_balance = credits_balance + p_amount,
        updated_at = now()
    WHERE user_id = p_user_id
    RETURNING * INTO v_credits;
    
    -- Log the addition
    INSERT INTO public.usage_log (user_id, action_type, resource_type, resource_details, credits_consumed)
    VALUES (p_user_id, 'credit_addition', p_reason, jsonb_build_object('amount', p_amount), -p_amount);
    
    RETURN v_credits;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update allocation when tier changes
CREATE OR REPLACE FUNCTION public.update_user_credits_for_tier()
RETURNS TRIGGER AS $$
DECLARE
    v_new_allocation DECIMAL(10, 2);
BEGIN
    -- Only run if subscription_tier changed
    IF OLD.subscription_tier IS DISTINCT FROM NEW.subscription_tier THEN
        -- Get new allocation
        SELECT monthly_credits INTO v_new_allocation 
        FROM public.tier_credit_allocations 
        WHERE tier = COALESCE(NEW.subscription_tier, 'free');
        
        -- Update user credits
        UPDATE public.user_credits SET
            monthly_allocation = COALESCE(v_new_allocation, 50),
            -- Add the difference to current balance if upgrading
            credits_balance = CASE 
                WHEN COALESCE(v_new_allocation, 50) > monthly_allocation 
                THEN credits_balance + (COALESCE(v_new_allocation, 50) - monthly_allocation)
                ELSE credits_balance
            END,
            updated_at = now()
        WHERE user_id = NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update credits when tier changes
DROP TRIGGER IF EXISTS on_user_tier_change ON public.users;
CREATE TRIGGER on_user_tier_change
    AFTER UPDATE OF subscription_tier ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.update_user_credits_for_tier();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tier_credit_allocations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first (idempotent)
DROP POLICY IF EXISTS "Users can view own credits" ON public.user_credits;
DROP POLICY IF EXISTS "Users can view own usage" ON public.usage_log;
DROP POLICY IF EXISTS "Service role full access on credits" ON public.user_credits;
DROP POLICY IF EXISTS "Service role full access on usage" ON public.usage_log;
DROP POLICY IF EXISTS "Anyone can view credit packages" ON public.credit_packages;
DROP POLICY IF EXISTS "Anyone can view tier allocations" ON public.tier_credit_allocations;

-- Users can only see their own credits
CREATE POLICY "Users can view own credits" ON public.user_credits
    FOR SELECT USING (auth.uid() = user_id);

-- Users can only see their own usage
CREATE POLICY "Users can view own usage" ON public.usage_log
    FOR SELECT USING (auth.uid() = user_id);

-- Service role can do everything
CREATE POLICY "Service role full access on credits" ON public.user_credits
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access on usage" ON public.usage_log
    FOR ALL USING (auth.role() = 'service_role');

-- Credit packages and tier allocations are publicly readable
CREATE POLICY "Anyone can view credit packages" ON public.credit_packages
    FOR SELECT USING (true);

CREATE POLICY "Anyone can view tier allocations" ON public.tier_credit_allocations
    FOR SELECT USING (true);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_user_credits_user_id ON public.user_credits(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_log_user_id ON public.usage_log(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_log_created_at ON public.usage_log(created_at);
CREATE INDEX IF NOT EXISTS idx_usage_log_workflow_id ON public.usage_log(workflow_id);

-- ============================================
-- GRANTS
-- ============================================
GRANT SELECT ON public.user_credits TO authenticated;
GRANT SELECT ON public.usage_log TO authenticated;
GRANT SELECT ON public.credit_packages TO authenticated;
GRANT SELECT ON public.tier_credit_allocations TO authenticated;
