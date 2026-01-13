-- Migration 011: Fix workflow_runs table for execution tracking
-- This table is used to count monthly workflow executions for tier limits

-- Step 1: Check what columns exist and add missing ones
-- The table may already exist but without user_id column

-- Add user_id column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'workflow_runs' 
    AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.workflow_runs ADD COLUMN user_id UUID;
  END IF;
END $$;

-- Add status column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'workflow_runs' 
    AND column_name = 'status'
  ) THEN
    ALTER TABLE public.workflow_runs ADD COLUMN status TEXT DEFAULT 'completed';
  END IF;
END $$;

-- Add started_at column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'workflow_runs' 
    AND column_name = 'started_at'
  ) THEN
    ALTER TABLE public.workflow_runs ADD COLUMN started_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- Add completed_at column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'workflow_runs' 
    AND column_name = 'completed_at'
  ) THEN
    ALTER TABLE public.workflow_runs ADD COLUMN completed_at TIMESTAMPTZ;
  END IF;
END $$;

-- Add created_at column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'workflow_runs' 
    AND column_name = 'created_at'
  ) THEN
    ALTER TABLE public.workflow_runs ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- Step 2: Enable RLS
ALTER TABLE workflow_runs ENABLE ROW LEVEL SECURITY;

-- Step 3: Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view own workflow runs" ON workflow_runs;
DROP POLICY IF EXISTS "Users can insert own workflow runs" ON workflow_runs;
DROP POLICY IF EXISTS "Users can update own workflow runs" ON workflow_runs;
DROP POLICY IF EXISTS "Users can delete own workflow runs" ON workflow_runs;
DROP POLICY IF EXISTS "Service role can manage all workflow runs" ON workflow_runs;

-- Step 4: Create comprehensive RLS policies
CREATE POLICY "Users can view own workflow runs" ON workflow_runs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own workflow runs" ON workflow_runs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own workflow runs" ON workflow_runs
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own workflow runs" ON workflow_runs
  FOR DELETE USING (auth.uid() = user_id);

-- Service role policy for backend operations
CREATE POLICY "Service role can manage all workflow runs" ON workflow_runs
  FOR ALL USING (auth.role() = 'service_role');

-- Step 5: Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_workflow_runs_user ON workflow_runs(user_id);
CREATE INDEX IF NOT EXISTS idx_workflow_runs_user_created ON workflow_runs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_workflow_runs_status ON workflow_runs(status);

-- Step 6: Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON workflow_runs TO authenticated;
GRANT ALL ON workflow_runs TO service_role;

-- Step 7: Verify the table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'workflow_runs'
ORDER BY ordinal_position;
