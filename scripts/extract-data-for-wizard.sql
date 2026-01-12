-- ============================================================
-- NEURODATA HUB: Full Data Extraction Script
-- Purpose: Extract all data for AI Wizard analysis
-- Run this in Supabase SQL Editor and export results
-- ============================================================

-- 1. BRAIN REGIONS (204 regions from Allen Atlas)
SELECT 
  'brain_regions' as table_name,
  json_agg(json_build_object(
    'id', id,
    'name', name,
    'abbreviation', abbreviation,
    'atlas', atlas,
    'hemisphere', hemisphere,
    'description', description,
    'functions', functions,
    'related_conditions', related_conditions,
    'mni_x', mni_x,
    'mni_y', mni_y,
    'mni_z', mni_z
  )) as data
FROM brain_regions;

-- 2. ALGORITHMS LIBRARY (available analysis tools)
SELECT 
  'algorithm_library' as table_name,
  json_agg(json_build_object(
    'id', id,
    'name', name,
    'description', description,
    'category', category,
    'tags', tags,
    'container_image', container_image,
    'input_schema', input_schema,
    'output_schema', output_schema,
    'requires_gpu', requires_gpu,
    'is_official', is_official
  )) as data
FROM algorithm_library
WHERE is_public = true;

-- 3. DATA SOURCES (OpenNeuro, HCP, Allen, etc.)
SELECT 
  'data_sources' as table_name,
  json_agg(json_build_object(
    'id', id,
    'name', name,
    'short_name', short_name,
    'description', description,
    'url', url,
    'data_types', data_types,
    'total_subjects', total_subjects,
    'total_size_tb', total_size_tb,
    'access_level', access_level
  )) as data
FROM data_sources;

-- 4. DATASETS (available brain scan datasets)
SELECT 
  'datasets' as table_name,
  json_agg(json_build_object(
    'id', id,
    'name', name,
    'description', description,
    'modality', modality,
    'subjects_count', subjects_count,
    'preprocessing_level', preprocessing_level,
    'access_level', access_level
  )) as data
FROM datasets
LIMIT 500;

-- 5. STUDIES (research papers and studies)
SELECT 
  'studies' as table_name,
  json_agg(json_build_object(
    'id', id,
    'title', title,
    'abstract', LEFT(abstract, 500),
    'conditions', conditions,
    'modalities', modalities,
    'brain_regions_studied', brain_regions_studied,
    'sample_size', sample_size,
    'ai_key_findings', ai_key_findings
  )) as data
FROM studies
LIMIT 200;

-- 6. WORKFLOW TEMPLATES (existing templates users can fork)
SELECT 
  'workflow_templates' as table_name,
  json_agg(json_build_object(
    'id', id,
    'name', name,
    'description', description,
    'tags', tags,
    'is_template', is_template
  )) as data
FROM workflows
WHERE is_template = true OR is_public = true;

-- 7. COMPUTE NODE TYPES (what nodes are commonly used)
SELECT 
  'compute_node_categories' as table_name,
  json_agg(json_build_object(
    'category', category,
    'node_count', node_count
  )) as data
FROM (
  SELECT category, COUNT(*) as node_count
  FROM compute_nodes
  GROUP BY category
  ORDER BY node_count DESC
) subq;

-- 8. AGENTS (AI agents available)
SELECT 
  'agents' as table_name,
  json_agg(json_build_object(
    'id', id,
    'name', name,
    'slug', slug,
    'description', description,
    'agent_type', agent_type,
    'model_name', model_name,
    'is_active', is_active
  )) as data
FROM agents
WHERE is_active = true;

-- 9. CATEGORIES (for organizing items)
SELECT 
  'categories' as table_name,
  json_agg(json_build_object(
    'id', id,
    'name', name,
    'slug', slug,
    'description', description,
    'icon', icon
  )) as data
FROM categories
WHERE is_system = true OR parent_id IS NULL;

-- 10. SUMMARY STATISTICS
SELECT 
  'summary_stats' as table_name,
  json_build_object(
    'total_brain_regions', (SELECT COUNT(*) FROM brain_regions),
    'total_algorithms', (SELECT COUNT(*) FROM algorithm_library WHERE is_public = true),
    'total_data_sources', (SELECT COUNT(*) FROM data_sources),
    'total_datasets', (SELECT COUNT(*) FROM datasets),
    'total_studies', (SELECT COUNT(*) FROM studies),
    'total_workflows', (SELECT COUNT(*) FROM workflows),
    'total_workflow_templates', (SELECT COUNT(*) FROM workflows WHERE is_template = true),
    'total_agents', (SELECT COUNT(*) FROM agents WHERE is_active = true),
    'total_brain_scans', (SELECT COUNT(*) FROM brain_scans),
    'total_connectomes', (SELECT COUNT(*) FROM connectomes)
  ) as data;
