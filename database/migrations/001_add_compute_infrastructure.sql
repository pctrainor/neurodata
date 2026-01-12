-- =============================================
-- NeuroCompute Platform - MIGRATION Script
-- Run this to ADD compute infrastructure to existing database
-- Safe to run multiple times (uses IF NOT EXISTS / ON CONFLICT)
-- =============================================

-- =============================================
-- STEP 1: Create ENUMs (if not exist)
-- =============================================

DO $$ BEGIN
  CREATE TYPE node_category AS ENUM (
    'input_source',
    'preprocessing',
    'analysis',
    'ml_inference',
    'ml_training',
    'visualization',
    'output_sink'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE workflow_status AS ENUM (
    'draft',
    'ready',
    'running',
    'paused',
    'completed',
    'failed',
    'cancelled'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE node_status AS ENUM (
    'idle',
    'queued',
    'initializing',
    'running',
    'completed',
    'failed',
    'skipped'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- =============================================
-- STEP 2: Create Algorithm Library Table
-- =============================================

CREATE TABLE IF NOT EXISTS public.algorithm_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identity
  name TEXT NOT NULL,
  description TEXT,
  category node_category NOT NULL,
  tags TEXT[],
  
  -- Container Definition
  container_image TEXT NOT NULL,
  container_registry TEXT DEFAULT 'ghcr.io/neurodata-hub',
  default_config JSONB DEFAULT '{}',
  config_schema JSONB DEFAULT '{}',
  
  -- Data Contracts
  input_schema JSONB NOT NULL DEFAULT '{}',
  output_schema JSONB NOT NULL DEFAULT '{}',
  
  -- Documentation
  documentation_url TEXT,
  paper_doi TEXT,
  
  -- Resource Recommendations
  recommended_cpu DECIMAL DEFAULT 1.0,
  recommended_memory_gb DECIMAL DEFAULT 2.0,
  requires_gpu BOOLEAN DEFAULT FALSE,
  
  -- Metadata
  version TEXT DEFAULT '1.0.0',
  author TEXT,
  license TEXT DEFAULT 'MIT',
  downloads INTEGER DEFAULT 0,
  rating DECIMAL,
  
  -- Access
  is_official BOOLEAN DEFAULT FALSE,
  is_public BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add unique constraint for name (if not exists)
DO $$ BEGIN
  ALTER TABLE algorithm_library ADD CONSTRAINT algorithm_library_name_key UNIQUE (name);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- =============================================
-- STEP 3: Create Workflows Table (Blueprints)
-- =============================================

CREATE TABLE IF NOT EXISTS public.workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Metadata
  name TEXT NOT NULL,
  description TEXT,
  tags TEXT[],
  
  -- Template/sharing
  is_template BOOLEAN DEFAULT FALSE,
  is_public BOOLEAN DEFAULT FALSE,
  forked_from_id UUID REFERENCES public.workflows(id),
  
  -- BIDS compliance
  bids_dataset_name TEXT,
  bids_output_path TEXT,
  
  -- Execution state
  status workflow_status DEFAULT 'draft',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  
  -- Resource allocation
  total_cpu_hours DECIMAL DEFAULT 0,
  total_gpu_hours DECIMAL DEFAULT 0,
  estimated_cost DECIMAL DEFAULT 0,
  
  -- Canvas position (for UI)
  canvas_zoom DECIMAL DEFAULT 1.0,
  canvas_offset_x DECIMAL DEFAULT 0,
  canvas_offset_y DECIMAL DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- STEP 4: Create Compute Nodes Table (Brain Nodes)
-- =============================================

CREATE TABLE IF NOT EXISTS public.compute_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID REFERENCES public.workflows(id) ON DELETE CASCADE NOT NULL,
  
  -- Identity
  name TEXT NOT NULL,
  description TEXT,
  category node_category NOT NULL,
  
  -- THE BRIDGE: Link to Templates
  algorithm_id UUID REFERENCES public.algorithm_library(id),
  agent_id UUID, -- References agents(id) - no FK for flexibility
  
  -- Biological Metaphor (for visualization)
  brain_region TEXT,
  brain_region_id UUID REFERENCES public.brain_regions(id),
  color TEXT DEFAULT '#6366f1',
  icon TEXT DEFAULT 'cpu',
  
  -- Infrastructure Reality (Docker/Container)
  container_image TEXT,
  container_registry TEXT DEFAULT 'ghcr.io/neurodata-hub',
  container_tag TEXT DEFAULT 'latest',
  entrypoint TEXT,
  command TEXT[],
  environment JSONB DEFAULT '{}',
  
  -- Resource Limits
  resource_cpu DECIMAL DEFAULT 1.0,
  resource_memory_gb DECIMAL DEFAULT 2.0,
  resource_gpu INTEGER DEFAULT 0,
  resource_gpu_type TEXT,
  resource_storage_gb DECIMAL DEFAULT 10.0,
  timeout_seconds INTEGER DEFAULT 3600,
  
  -- Data Contract (BIDS/NWB aligned)
  input_schema JSONB DEFAULT '{}',
  output_schema JSONB DEFAULT '{}',
  
  -- Configuration
  config_schema JSONB DEFAULT '{}',
  config_values JSONB DEFAULT '{}',
  
  -- Execution State
  status node_status DEFAULT 'idle',
  progress INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  logs_url TEXT,
  
  -- Canvas Position
  position_x DECIMAL DEFAULT 0,
  position_y DECIMAL DEFAULT 0,
  
  -- Metrics
  execution_time_ms INTEGER,
  cpu_time_ms INTEGER,
  memory_peak_mb INTEGER,
  data_processed_mb DECIMAL,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- STEP 5: Create Node Edges Table (Synapses)
-- =============================================

CREATE TABLE IF NOT EXISTS public.node_edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID REFERENCES public.workflows(id) ON DELETE CASCADE,
  
  -- Connection
  source_node_id UUID REFERENCES public.compute_nodes(id) ON DELETE CASCADE,
  target_node_id UUID REFERENCES public.compute_nodes(id) ON DELETE CASCADE,
  
  -- Data Mapping
  data_mapping JSONB DEFAULT '{}',
  
  -- Validation
  is_valid BOOLEAN DEFAULT TRUE,
  validation_error TEXT,
  
  -- Visual
  source_handle TEXT DEFAULT 'output',
  target_handle TEXT DEFAULT 'input',
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- STEP 6: Create Workflow Runs Table (Execution History)
-- Note: You already have workflow_runs with different schema
-- Creating compute_workflow_runs to avoid conflict
-- =============================================

CREATE TABLE IF NOT EXISTS public.compute_workflow_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID REFERENCES public.workflows(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Execution
  status workflow_status DEFAULT 'running',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  
  -- Snapshot
  workflow_snapshot JSONB,
  
  -- Results
  output_files JSONB DEFAULT '[]',
  logs_url TEXT,
  
  -- Resource Usage
  total_cpu_seconds INTEGER,
  total_gpu_seconds INTEGER,
  total_memory_gb_seconds INTEGER,
  estimated_cost DECIMAL,
  
  -- Error handling
  error_message TEXT,
  failed_node_id UUID REFERENCES public.compute_nodes(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- STEP 7: Create BCI Devices Table (Future)
-- =============================================

CREATE TABLE IF NOT EXISTS public.bci_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Device Info
  name TEXT NOT NULL,
  device_type TEXT NOT NULL,
  model TEXT,
  serial_number TEXT,
  
  -- Connection
  connection_type TEXT,
  last_connected_at TIMESTAMPTZ,
  is_connected BOOLEAN DEFAULT FALSE,
  
  -- Capabilities
  channels INTEGER,
  sampling_rate INTEGER,
  supported_modalities TEXT[],
  
  -- Calibration
  calibration_data JSONB,
  last_calibrated_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- STEP 8: Enable RLS
-- =============================================

ALTER TABLE algorithm_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE compute_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE node_edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE compute_workflow_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE bci_devices ENABLE ROW LEVEL SECURITY;

-- =============================================
-- STEP 9: Create RLS Policies
-- =============================================

-- Algorithm library: public read
DROP POLICY IF EXISTS "Algorithm library is public" ON algorithm_library;
CREATE POLICY "Algorithm library is public" ON algorithm_library
  FOR SELECT USING (is_public = TRUE);

-- Workflows: users manage own, view public/templates
DROP POLICY IF EXISTS "Users can manage own workflows" ON workflows;
CREATE POLICY "Users can manage own workflows" ON workflows
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Public workflows are viewable" ON workflows;
CREATE POLICY "Public workflows are viewable" ON workflows
  FOR SELECT USING (is_public = TRUE OR is_template = TRUE);

-- Compute nodes: follow workflow permissions
DROP POLICY IF EXISTS "Users can manage nodes in own workflows" ON compute_nodes;
CREATE POLICY "Users can manage nodes in own workflows" ON compute_nodes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM workflows 
      WHERE id = compute_nodes.workflow_id 
      AND user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Public workflow nodes are viewable" ON compute_nodes;
CREATE POLICY "Public workflow nodes are viewable" ON compute_nodes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workflows 
      WHERE id = compute_nodes.workflow_id 
      AND (is_public = TRUE OR is_template = TRUE)
    )
  );

-- Node edges: follow workflow permissions
DROP POLICY IF EXISTS "Users can manage edges in own workflows" ON node_edges;
CREATE POLICY "Users can manage edges in own workflows" ON node_edges
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM workflows 
      WHERE id = node_edges.workflow_id 
      AND user_id = auth.uid()
    )
  );

-- Workflow runs
DROP POLICY IF EXISTS "Users can view own workflow runs" ON compute_workflow_runs;
CREATE POLICY "Users can view own workflow runs" ON compute_workflow_runs
  FOR ALL USING (auth.uid() = user_id);

-- BCI devices
DROP POLICY IF EXISTS "Users can manage own BCI devices" ON bci_devices;
CREATE POLICY "Users can manage own BCI devices" ON bci_devices
  FOR ALL USING (auth.uid() = user_id);

-- =============================================
-- STEP 10: Create Indexes
-- =============================================

CREATE INDEX IF NOT EXISTS idx_algorithm_library_category ON algorithm_library(category);
CREATE INDEX IF NOT EXISTS idx_algorithm_library_tags ON algorithm_library USING GIN(tags);

CREATE INDEX IF NOT EXISTS idx_workflows_user ON workflows(user_id);
CREATE INDEX IF NOT EXISTS idx_workflows_status ON workflows(status);
CREATE INDEX IF NOT EXISTS idx_workflows_template ON workflows(is_template) WHERE is_template = TRUE;

CREATE INDEX IF NOT EXISTS idx_compute_nodes_workflow ON compute_nodes(workflow_id);
CREATE INDEX IF NOT EXISTS idx_compute_nodes_category ON compute_nodes(category);
CREATE INDEX IF NOT EXISTS idx_compute_nodes_status ON compute_nodes(status);
CREATE INDEX IF NOT EXISTS idx_compute_nodes_brain_region ON compute_nodes(brain_region);

CREATE INDEX IF NOT EXISTS idx_node_edges_workflow ON node_edges(workflow_id);
CREATE INDEX IF NOT EXISTS idx_node_edges_source ON node_edges(source_node_id);
CREATE INDEX IF NOT EXISTS idx_node_edges_target ON node_edges(target_node_id);

CREATE INDEX IF NOT EXISTS idx_compute_workflow_runs_workflow ON compute_workflow_runs(workflow_id);
CREATE INDEX IF NOT EXISTS idx_compute_workflow_runs_user ON compute_workflow_runs(user_id);
CREATE INDEX IF NOT EXISTS idx_compute_workflow_runs_status ON compute_workflow_runs(status);

CREATE INDEX IF NOT EXISTS idx_bci_devices_user ON bci_devices(user_id);

-- =============================================
-- STEP 11: Create Helper Functions
-- =============================================

-- Validate edge compatibility
CREATE OR REPLACE FUNCTION validate_node_edge()
RETURNS TRIGGER AS $$
DECLARE
  source_output JSONB;
  target_input JSONB;
BEGIN
  SELECT output_schema INTO source_output FROM compute_nodes WHERE id = NEW.source_node_id;
  SELECT input_schema INTO target_input FROM compute_nodes WHERE id = NEW.target_node_id;
  
  IF source_output->>'type' IS DISTINCT FROM target_input->>'type' THEN
    NEW.is_valid := FALSE;
    NEW.validation_error := format('Type mismatch: source outputs %s but target expects %s',
      source_output->>'type', target_input->>'type');
  ELSE
    NEW.is_valid := TRUE;
    NEW.validation_error := NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger (drop first if exists)
DROP TRIGGER IF EXISTS trigger_validate_node_edge ON node_edges;
CREATE TRIGGER trigger_validate_node_edge
  BEFORE INSERT OR UPDATE ON node_edges
  FOR EACH ROW
  EXECUTE FUNCTION validate_node_edge();

-- Update workflow timestamp on node changes
CREATE OR REPLACE FUNCTION update_workflow_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE workflows SET updated_at = NOW() WHERE id = NEW.workflow_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_workflow_on_node ON compute_nodes;
CREATE TRIGGER trigger_update_workflow_on_node
  AFTER INSERT OR UPDATE ON compute_nodes
  FOR EACH ROW
  EXECUTE FUNCTION update_workflow_timestamp();

-- =============================================
-- DONE!
-- =============================================

SELECT 'Migration completed successfully!' AS status;
SELECT 
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'algorithm_library') AS algorithm_library_exists,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'workflows') AS workflows_exists,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'compute_nodes') AS compute_nodes_exists,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'node_edges') AS node_edges_exists,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'bci_devices') AS bci_devices_exists;
