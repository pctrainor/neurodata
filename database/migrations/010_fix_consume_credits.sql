-- =============================================
-- FIX: Ensure consume_credits and get_or_create_user_credits functions exist
-- Run this in Supabase SQL Editor
-- =============================================

-- Drop existing functions first to allow signature changes
DROP FUNCTION IF EXISTS public.get_or_create_user_credits(uuid);
DROP FUNCTION IF EXISTS public.consume_credits(uuid, decimal, uuid, text, text, jsonb);

-- First, add missing columns to user_credits if they don't exist
DO $$
BEGIN
    -- Add month_reset_date if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_credits' 
        AND column_name = 'month_reset_date'
    ) THEN
        ALTER TABLE public.user_credits 
        ADD COLUMN month_reset_date TIMESTAMPTZ DEFAULT (date_trunc('month', now()) + interval '1 month');
        RAISE NOTICE 'Added month_reset_date column';
    END IF;
    
    -- Add credits_used_this_month if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_credits' 
        AND column_name = 'credits_used_this_month'
    ) THEN
        ALTER TABLE public.user_credits 
        ADD COLUMN credits_used_this_month DECIMAL(10, 2) DEFAULT 0;
        RAISE NOTICE 'Added credits_used_this_month column';
    END IF;
    
    -- Add monthly_allocation if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_credits' 
        AND column_name = 'monthly_allocation'
    ) THEN
        ALTER TABLE public.user_credits 
        ADD COLUMN monthly_allocation DECIMAL(10, 2) DEFAULT 50;
        RAISE NOTICE 'Added monthly_allocation column';
    END IF;
    
    -- Add bonus_credits if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_credits' 
        AND column_name = 'bonus_credits'
    ) THEN
        ALTER TABLE public.user_credits 
        ADD COLUMN bonus_credits DECIMAL(10, 2) DEFAULT 0;
        RAISE NOTICE 'Added bonus_credits column';
    END IF;
    
    -- Add credits_balance if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_credits' 
        AND column_name = 'credits_balance'
    ) THEN
        ALTER TABLE public.user_credits 
        ADD COLUMN credits_balance DECIMAL(10, 2) DEFAULT 50;
        -- Copy from balance_usd if it exists
        UPDATE public.user_credits SET credits_balance = COALESCE(balance_usd, 50);
        RAISE NOTICE 'Added credits_balance column';
    END IF;
    
    -- Add updated_at if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_credits' 
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE public.user_credits 
        ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();
        RAISE NOTICE 'Added updated_at column';
    END IF;
    
    -- Add created_at if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_credits' 
        AND column_name = 'created_at'
    ) THEN
        ALTER TABLE public.user_credits 
        ADD COLUMN created_at TIMESTAMPTZ DEFAULT now();
        RAISE NOTICE 'Added created_at column';
    END IF;
    
    -- Add id if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_credits' 
        AND column_name = 'id'
    ) THEN
        ALTER TABLE public.user_credits 
        ADD COLUMN id UUID DEFAULT gen_random_uuid();
        RAISE NOTICE 'Added id column';
    END IF;
END $$;

-- Recreate get_or_create_user_credits function with all expected fields
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
    v_id UUID;
    v_credits_balance DECIMAL(10,2);
    v_monthly_allocation DECIMAL(10,2);
    v_credits_used DECIMAL(10,2);
    v_bonus_credits DECIMAL(10,2);
    v_month_reset TIMESTAMPTZ;
    v_created TIMESTAMPTZ;
    v_updated TIMESTAMPTZ;
BEGIN
    -- Try to get existing record
    SELECT 
        uc.id,
        COALESCE(uc.credits_balance, uc.balance_usd, 50),
        COALESCE(uc.monthly_allocation, 50),
        COALESCE(uc.credits_used_this_month, 0),
        COALESCE(uc.bonus_credits, 0),
        COALESCE(uc.month_reset_date, date_trunc('month', now()) + interval '1 month'),
        COALESCE(uc.created_at, now()),
        COALESCE(uc.updated_at, uc.last_updated, now())
    INTO v_id, v_credits_balance, v_monthly_allocation, v_credits_used, v_bonus_credits, v_month_reset, v_created, v_updated
    FROM public.user_credits uc 
    WHERE uc.user_id = p_user_id;
    
    IF NOT FOUND THEN
        -- Create new record with defaults
        v_id := gen_random_uuid();
        v_credits_balance := 50;
        v_monthly_allocation := 50;
        v_credits_used := 0;
        v_bonus_credits := 0;
        v_month_reset := date_trunc('month', now()) + interval '1 month';
        v_created := now();
        v_updated := now();
        
        INSERT INTO public.user_credits (id, user_id, credits_balance, monthly_allocation, credits_used_this_month, bonus_credits, month_reset_date, created_at, updated_at)
        VALUES (v_id, p_user_id, v_credits_balance, v_monthly_allocation, v_credits_used, v_bonus_credits, v_month_reset, v_created, v_updated)
        ON CONFLICT (user_id) DO UPDATE SET updated_at = now()
        RETURNING user_credits.id INTO v_id;
    ELSE
        -- Check if month needs reset
        IF v_month_reset < NOW() THEN
            v_credits_balance := v_monthly_allocation + v_bonus_credits;
            v_credits_used := 0;
            v_month_reset := date_trunc('month', NOW()) + interval '1 month';
            v_updated := now();
            
            UPDATE public.user_credits uc SET
                credits_balance = v_credits_balance,
                credits_used_this_month = 0,
                month_reset_date = v_month_reset,
                updated_at = v_updated
            WHERE uc.user_id = p_user_id;
        END IF;
    END IF;
    
    -- Return the record
    RETURN QUERY SELECT 
        v_id,
        p_user_id,
        v_credits_balance,
        v_monthly_allocation,
        v_credits_used,
        v_bonus_credits,
        v_month_reset,
        v_created,
        v_updated;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create or replace the consume_credits function
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
    v_credits_balance DECIMAL(10, 2);
    v_new_balance DECIMAL(10, 2);
    v_credits_used DECIMAL(10, 2);
BEGIN
    -- Get current balance (using columns that actually exist)
    SELECT 
        COALESCE(credits_balance, balance_usd, 50),
        COALESCE(credits_used_this_month, 0)
    INTO v_credits_balance, v_credits_used
    FROM public.user_credits 
    WHERE user_id = p_user_id;
    
    -- If no record exists, create one with default balance
    IF NOT FOUND THEN
        INSERT INTO public.user_credits (user_id, credits_balance, monthly_allocation, credits_used_this_month, bonus_credits, month_reset_date)
        VALUES (p_user_id, 50, 50, 0, 0, date_trunc('month', now()) + interval '1 month')
        ON CONFLICT (user_id) DO NOTHING;
        
        v_credits_balance := 50;
        v_credits_used := 0;
    END IF;
    
    -- Check if sufficient credits
    IF v_credits_balance < p_amount THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Insufficient credits',
            'required', p_amount,
            'available', v_credits_balance
        );
    END IF;
    
    -- Deduct credits
    v_new_balance := v_credits_balance - p_amount;
    
    -- Update user_credits (handle both old and new column names)
    UPDATE public.user_credits SET
        credits_balance = v_new_balance,
        credits_used_this_month = COALESCE(credits_used_this_month, 0) + p_amount,
        updated_at = now()
    WHERE user_id = p_user_id;
    
    -- Also update balance_usd if it exists (for compatibility)
    BEGIN
        UPDATE public.user_credits SET balance_usd = v_new_balance WHERE user_id = p_user_id;
    EXCEPTION WHEN undefined_column THEN
        NULL;
    END;
    
    -- Log usage if usage_log table exists
    BEGIN
        INSERT INTO public.usage_log (user_id, workflow_id, action_type, resource_type, resource_details, credits_consumed)
        VALUES (p_user_id, p_workflow_id, p_action_type, p_resource_type, COALESCE(p_resource_details, '{}'::jsonb), p_amount);
    EXCEPTION WHEN undefined_table THEN
        NULL;
    WHEN undefined_column THEN
        NULL;
    END;
    
    RETURN jsonb_build_object(
        'success', true,
        'credits_consumed', p_amount,
        'new_balance', v_new_balance,
        'credits_used_this_month', v_credits_used + p_amount
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_or_create_user_credits TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_or_create_user_credits TO service_role;
GRANT EXECUTE ON FUNCTION public.consume_credits TO authenticated;
GRANT EXECUTE ON FUNCTION public.consume_credits TO service_role;

-- Verify columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_credits' 
AND table_schema = 'public'
ORDER BY ordinal_position;
