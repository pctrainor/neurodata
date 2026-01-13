-- ============================================
-- MIGRATION 007: Fix Missing Columns
-- ============================================
-- This migration fixes schema inconsistencies between
-- what the API expects and what exists in the database.
--
-- Issues fixed:
-- 1. workflow_node_results.workflow_execution_id column missing
-- 2. user_credits.credits_balance column missing
-- ============================================

-- ============================================
-- FIX 1: workflow_node_results table
-- ============================================
-- The API expects 'workflow_execution_id' but migration 006 created 'execution_id'

-- First, check if the table exists at all
DO $$
BEGIN
    -- Check if workflow_node_results table exists
    IF NOT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'workflow_node_results'
    ) THEN
        -- Create the table with correct schema
        CREATE TABLE public.workflow_node_results (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            workflow_execution_id UUID NOT NULL,
            node_id VARCHAR(64) NOT NULL,
            node_name VARCHAR(128) NOT NULL,
            node_type TEXT,
            status TEXT DEFAULT 'completed',
            result JSONB NOT NULL DEFAULT '{}',
            execution_time_ms INTEGER,
            
            -- Additional fields for brain simulation results
            demographic_id TEXT,
            demographic_traits TEXT[],
            persona_category TEXT,
            engagement_score DECIMAL(5,2),
            attention_score DECIMAL(5,2),
            emotional_intensity DECIMAL(5,2),
            memory_encoding DECIMAL(5,2),
            share_likelihood DECIMAL(5,2),
            purchase_intent DECIMAL(5,2),
            trust_level DECIMAL(5,2),
            primary_emotion TEXT,
            emotional_valence TEXT,
            
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        RAISE NOTICE 'Created workflow_node_results table';
    ELSE
        -- Table exists, check if we need to add/rename columns
        
        -- Check if 'workflow_execution_id' column exists
        IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'workflow_node_results' 
            AND column_name = 'workflow_execution_id'
        ) THEN
            -- Check if 'execution_id' exists and rename it
            IF EXISTS (
                SELECT FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name = 'workflow_node_results' 
                AND column_name = 'execution_id'
            ) THEN
                ALTER TABLE public.workflow_node_results 
                RENAME COLUMN execution_id TO workflow_execution_id;
                RAISE NOTICE 'Renamed execution_id to workflow_execution_id';
            ELSE
                -- Neither column exists, add it
                ALTER TABLE public.workflow_node_results 
                ADD COLUMN workflow_execution_id UUID;
                RAISE NOTICE 'Added workflow_execution_id column';
            END IF;
        END IF;
        
        -- Ensure node_name column exists (some schemas might be missing it)
        IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'workflow_node_results' 
            AND column_name = 'node_name'
        ) THEN
            ALTER TABLE public.workflow_node_results 
            ADD COLUMN node_name VARCHAR(128);
            RAISE NOTICE 'Added node_name column';
        END IF;
        
        -- Ensure result column exists
        IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'workflow_node_results' 
            AND column_name = 'result'
        ) THEN
            ALTER TABLE public.workflow_node_results 
            ADD COLUMN result JSONB DEFAULT '{}';
            RAISE NOTICE 'Added result column';
        END IF;
    END IF;
END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_workflow_node_results_execution_id 
ON public.workflow_node_results(workflow_execution_id);

CREATE INDEX IF NOT EXISTS idx_workflow_node_results_node_id 
ON public.workflow_node_results(node_id);

-- ============================================
-- FIX 2: user_credits table
-- ============================================
-- Ensure the user_credits table exists with correct columns

DO $$
BEGIN
    -- Check if user_credits table exists
    IF NOT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'user_credits'
    ) THEN
        -- Create the table
        CREATE TABLE public.user_credits (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            credits_balance DECIMAL(10, 2) NOT NULL DEFAULT 50,
            monthly_allocation DECIMAL(10, 2) NOT NULL DEFAULT 50,
            credits_used_this_month DECIMAL(10, 2) NOT NULL DEFAULT 0,
            month_reset_date TIMESTAMPTZ NOT NULL DEFAULT (date_trunc('month', now()) + interval '1 month'),
            bonus_credits DECIMAL(10, 2) NOT NULL DEFAULT 0,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            UNIQUE(user_id)
        );
        
        RAISE NOTICE 'Created user_credits table';
    ELSE
        -- Table exists, ensure credits_balance column exists
        IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'user_credits' 
            AND column_name = 'credits_balance'
        ) THEN
            -- Check for alternative column names
            IF EXISTS (
                SELECT FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name = 'user_credits' 
                AND column_name = 'balance'
            ) THEN
                ALTER TABLE public.user_credits 
                RENAME COLUMN balance TO credits_balance;
                RAISE NOTICE 'Renamed balance to credits_balance';
            ELSIF EXISTS (
                SELECT FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name = 'user_credits' 
                AND column_name = 'credit_balance'
            ) THEN
                ALTER TABLE public.user_credits 
                RENAME COLUMN credit_balance TO credits_balance;
                RAISE NOTICE 'Renamed credit_balance to credits_balance';
            ELSE
                -- Add the column
                ALTER TABLE public.user_credits 
                ADD COLUMN credits_balance DECIMAL(10, 2) NOT NULL DEFAULT 50;
                RAISE NOTICE 'Added credits_balance column';
            END IF;
        END IF;
        
        -- Ensure monthly_allocation exists
        IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'user_credits' 
            AND column_name = 'monthly_allocation'
        ) THEN
            ALTER TABLE public.user_credits 
            ADD COLUMN monthly_allocation DECIMAL(10, 2) NOT NULL DEFAULT 50;
            RAISE NOTICE 'Added monthly_allocation column';
        END IF;
        
        -- Ensure bonus_credits exists
        IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'user_credits' 
            AND column_name = 'bonus_credits'
        ) THEN
            ALTER TABLE public.user_credits 
            ADD COLUMN bonus_credits DECIMAL(10, 2) NOT NULL DEFAULT 0;
            RAISE NOTICE 'Added bonus_credits column';
        END IF;
    END IF;
END $$;

-- ============================================
-- FIX 3: get_or_create_user_credits function
-- ============================================
-- Recreate the function to ensure it works with our schema

CREATE OR REPLACE FUNCTION public.get_or_create_user_credits(p_user_id UUID)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    credits_balance DECIMAL(10,2),
    monthly_allocation DECIMAL(10,2),
    credits_used_this_month DECIMAL(10,2),
    bonus_credits DECIMAL(10,2),
    month_reset_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
) AS $$
DECLARE
    v_record RECORD;
BEGIN
    -- Try to get existing record
    SELECT * INTO v_record FROM public.user_credits uc WHERE uc.user_id = p_user_id;
    
    IF NOT FOUND THEN
        -- Create new record with defaults
        INSERT INTO public.user_credits (user_id, credits_balance, monthly_allocation)
        VALUES (p_user_id, 50, 50)
        RETURNING * INTO v_record;
    ELSE
        -- Check if month needs reset
        IF v_record.month_reset_date < NOW() THEN
            UPDATE public.user_credits uc SET
                credits_balance = uc.monthly_allocation + uc.bonus_credits,
                credits_used_this_month = 0,
                month_reset_date = date_trunc('month', NOW()) + interval '1 month',
                updated_at = NOW()
            WHERE uc.user_id = p_user_id
            RETURNING * INTO v_record;
        END IF;
    END IF;
    
    -- Return the record
    RETURN QUERY SELECT 
        v_record.id,
        v_record.user_id,
        v_record.credits_balance,
        v_record.monthly_allocation,
        v_record.credits_used_this_month,
        v_record.bonus_credits,
        v_record.month_reset_date,
        v_record.created_at,
        v_record.updated_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FIX 4: Enable RLS with proper policies
-- ============================================

-- Enable RLS on tables
ALTER TABLE public.workflow_node_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Users can view own credits" ON public.user_credits;
DROP POLICY IF EXISTS "System can manage credits" ON public.user_credits;

-- Create policies for user_credits
CREATE POLICY "Users can view own credits" ON public.user_credits
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can manage credits" ON public.user_credits
    FOR ALL USING (true);

-- ============================================
-- VERIFICATION QUERY (for manual check)
-- ============================================
-- Run this to verify the fix worked:
-- 
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'workflow_node_results' 
-- AND table_schema = 'public';
--
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'user_credits' 
-- AND table_schema = 'public';
