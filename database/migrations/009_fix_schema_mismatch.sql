-- =============================================
-- FIX MIGRATION: Align database schema with API expectations
-- =============================================
-- Current state:
--   workflow_node_results has: workflow_id (should be workflow_execution_id)
--   user_credits has: balance_usd (should be credits_balance)
-- =============================================

-- =============================================
-- FIX 1: workflow_node_results - Add workflow_execution_id column
-- =============================================
-- The API uses workflow_execution_id, but table has workflow_id
-- We'll add the new column and optionally copy data

DO $$
BEGIN
    -- Add workflow_execution_id if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'workflow_node_results' 
        AND column_name = 'workflow_execution_id'
    ) THEN
        ALTER TABLE public.workflow_node_results 
        ADD COLUMN workflow_execution_id UUID;
        
        -- Copy existing workflow_id values to workflow_execution_id
        UPDATE public.workflow_node_results 
        SET workflow_execution_id = workflow_id 
        WHERE workflow_execution_id IS NULL AND workflow_id IS NOT NULL;
        
        RAISE NOTICE 'Added workflow_execution_id column to workflow_node_results';
    ELSE
        RAISE NOTICE 'workflow_execution_id already exists';
    END IF;
END $$;

-- Create index on the new column
CREATE INDEX IF NOT EXISTS idx_workflow_node_results_execution_id 
ON public.workflow_node_results(workflow_execution_id);

-- =============================================
-- FIX 2: user_credits - Add credits_balance column
-- =============================================
-- The API uses credits_balance, but table has balance_usd

DO $$
BEGIN
    -- Add credits_balance if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_credits' 
        AND column_name = 'credits_balance'
    ) THEN
        ALTER TABLE public.user_credits 
        ADD COLUMN credits_balance DECIMAL(10, 2) DEFAULT 50;
        
        -- Copy existing balance_usd values to credits_balance
        UPDATE public.user_credits 
        SET credits_balance = COALESCE(balance_usd, 50);
        
        RAISE NOTICE 'Added credits_balance column to user_credits';
    ELSE
        RAISE NOTICE 'credits_balance already exists';
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
    
    -- Add id if missing (some schemas use user_id as PK)
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
END $$;

-- =============================================
-- FIX 3: Create/update get_or_create_user_credits function
-- =============================================

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
    SELECT uc.* INTO v_record FROM public.user_credits uc WHERE uc.user_id = p_user_id;
    
    IF NOT FOUND THEN
        -- Create new record with defaults
        INSERT INTO public.user_credits (user_id, credits_balance, monthly_allocation, bonus_credits, credits_used_this_month)
        VALUES (p_user_id, 50, 50, 0, 0)
        RETURNING * INTO v_record;
    ELSE
        -- Check if month needs reset
        IF v_record.month_reset_date IS NOT NULL AND v_record.month_reset_date < NOW() THEN
            UPDATE public.user_credits uc SET
                credits_balance = COALESCE(uc.monthly_allocation, 50) + COALESCE(uc.bonus_credits, 0),
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
        COALESCE(v_record.credits_balance, 50::DECIMAL(10,2)),
        COALESCE(v_record.monthly_allocation, 50::DECIMAL(10,2)),
        COALESCE(v_record.credits_used_this_month, 0::DECIMAL(10,2)),
        COALESCE(v_record.bonus_credits, 0::DECIMAL(10,2)),
        v_record.month_reset_date,
        v_record.created_at,
        v_record.updated_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- VERIFY THE FIX
-- =============================================

-- Check workflow_node_results columns
SELECT 'workflow_node_results' as table_name, column_name, data_type
FROM information_schema.columns 
WHERE table_name = 'workflow_node_results' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check user_credits columns  
SELECT 'user_credits' as table_name, column_name, data_type
FROM information_schema.columns 
WHERE table_name = 'user_credits' AND table_schema = 'public'
ORDER BY ordinal_position;
