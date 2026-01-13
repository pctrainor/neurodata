-- =============================================
-- QUICK FIX: Rename execution_id to workflow_execution_id
-- Run this in Supabase SQL Editor to fix the column name
-- =============================================

-- Check if the old column exists and rename it
DO $$
BEGIN
    -- Check if execution_id exists (old name)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'workflow_node_results' 
        AND column_name = 'execution_id'
    ) THEN
        -- Rename the column
        ALTER TABLE public.workflow_node_results 
        RENAME COLUMN execution_id TO workflow_execution_id;
        RAISE NOTICE 'Renamed execution_id to workflow_execution_id in workflow_node_results';
    ELSIF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'workflow_node_results' 
        AND column_name = 'workflow_execution_id'
    ) THEN
        RAISE NOTICE 'Column workflow_execution_id already exists - no action needed';
    ELSE
        RAISE NOTICE 'Neither column exists - table may need to be created';
    END IF;
END $$;

-- Recreate the index with correct column name
DROP INDEX IF EXISTS idx_node_results_execution;
CREATE INDEX IF NOT EXISTS idx_node_results_execution 
ON public.workflow_node_results(workflow_execution_id);

-- Update the RLS policy
DROP POLICY IF EXISTS "Users can view node results of own executions" ON public.workflow_node_results;

CREATE POLICY "Users can view node results of own executions" ON public.workflow_node_results
  FOR SELECT USING (
    workflow_execution_id IN (SELECT id FROM workflow_executions WHERE user_id = auth.uid())
  );

-- Recreate the aggregate function with correct column name
CREATE OR REPLACE FUNCTION aggregate_execution_results(p_execution_id UUID)
RETURNS void AS $$
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
  WHERE workflow_execution_id = p_execution_id
    AND persona_category IS NOT NULL
  GROUP BY persona_category, demographic_id, node_label;
  
  -- Update execution with overall metrics
  UPDATE workflow_executions SET
    overall_score = (
      SELECT AVG(engagement_score) FROM workflow_node_results WHERE workflow_execution_id = p_execution_id
    ),
    completed_nodes = (
      SELECT COUNT(*) FROM workflow_node_results WHERE workflow_execution_id = p_execution_id AND status = 'completed'
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
      FROM workflow_node_results WHERE workflow_execution_id = p_execution_id
    ),
    updated_at = NOW()
  WHERE id = p_execution_id;
END;
$$ LANGUAGE plpgsql;

-- Verify the fix
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'workflow_node_results' 
AND table_schema = 'public'
ORDER BY ordinal_position;
