-- =============================================
-- DIAGNOSTIC: Check current database state
-- Run this FIRST to see what exists
-- =============================================

-- 1. Check if workflow_node_results table exists and its columns
SELECT 
    'workflow_node_results' as table_name,
    column_name, 
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'workflow_node_results' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Check if user_credits table exists and its columns
SELECT 
    'user_credits' as table_name,
    column_name, 
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_credits' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Check if workflow_executions table exists
SELECT 
    'workflow_executions' as table_name,
    column_name, 
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'workflow_executions' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 4. List all public tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;
