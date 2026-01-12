-- =============================================
-- NeuroData Hub - Database Schema
-- A platform for democratizing neuroscience research
-- =============================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- For fuzzy text search

-- =============================================
-- CORE TABLES
-- =============================================

-- Users table (extends Supabase auth.users)
CREATE TABLE public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  institution TEXT,
  role TEXT DEFAULT 'researcher', -- researcher, student, educator, enthusiast, enterprise
  subscription_tier TEXT DEFAULT 'free', -- free, pro, research, enterprise
  subscription_status TEXT DEFAULT 'active',
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  monthly_api_calls INTEGER DEFAULT 0,
  monthly_downloads INTEGER DEFAULT 0,
  papers_viewed_this_month INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- RESEARCH DATA
-- =============================================

-- Brain Regions (standardized atlas)
CREATE TABLE public.brain_regions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  abbreviation TEXT,
  atlas TEXT NOT NULL, -- 'HCP', 'AAL', 'Brodmann', 'Desikan-Killiany'
  parent_region_id UUID REFERENCES brain_regions(id),
  hemisphere TEXT, -- 'left', 'right', 'bilateral'
  mni_x DECIMAL,
  mni_y DECIMAL,
  mni_z DECIMAL,
  description TEXT,
  functions TEXT[], -- array of known functions
  related_conditions TEXT[], -- conditions associated with this region
  mesh_file_url TEXT, -- 3D model for visualization
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Data Sources (HCP, Allen, OpenNeuro, etc.)
CREATE TABLE public.data_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  short_name TEXT,
  description TEXT,
  url TEXT,
  data_types TEXT[], -- 'fMRI', 'dMRI', 'EEG', 'genetics', 'histology'
  total_subjects INTEGER,
  total_size_tb DECIMAL,
  license TEXT,
  citation TEXT,
  access_level TEXT DEFAULT 'public', -- public, registration, application, restricted
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Studies/Papers
CREATE TABLE public.studies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_id UUID REFERENCES data_sources(id),
  external_id TEXT, -- ID in the original database
  title TEXT NOT NULL,
  authors TEXT[],
  abstract TEXT,
  doi TEXT,
  pubmed_id TEXT,
  publication_date DATE,
  journal TEXT,
  keywords TEXT[],
  
  -- AI-generated enrichments
  ai_summary TEXT,
  ai_key_findings TEXT[],
  ai_methodology TEXT,
  ai_limitations TEXT,
  ai_future_directions TEXT,
  
  -- Metadata
  sample_size INTEGER,
  age_range TEXT,
  conditions TEXT[], -- 'healthy', 'depression', 'alzheimer', etc.
  modalities TEXT[], -- 'fMRI', 'dMRI', 'EEG', 'PET'
  brain_regions_studied UUID[],
  
  -- Access control
  access_level TEXT DEFAULT 'free', -- free, pro, research
  view_count INTEGER DEFAULT 0,
  download_count INTEGER DEFAULT 0,
  
  -- Search optimization
  search_vector TSVECTOR,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Datasets (downloadable data files)
CREATE TABLE public.datasets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  study_id UUID REFERENCES studies(id),
  source_id UUID REFERENCES data_sources(id),
  name TEXT NOT NULL,
  description TEXT,
  
  -- File info
  file_type TEXT, -- 'nifti', 'csv', 'edf', 'mat', 'json'
  file_size_mb DECIMAL,
  file_url TEXT,
  s3_bucket TEXT,
  s3_key TEXT,
  
  -- Data characteristics
  modality TEXT,
  preprocessing_level TEXT, -- 'raw', 'minimally_processed', 'fully_processed'
  resolution TEXT,
  subjects_count INTEGER,
  
  -- Access control
  access_level TEXT DEFAULT 'pro', -- free, pro, research
  requires_agreement BOOLEAN DEFAULT FALSE,
  download_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Brain Scans (individual subject data - metadata only)
CREATE TABLE public.brain_scans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dataset_id UUID REFERENCES datasets(id),
  subject_id TEXT, -- anonymized subject ID
  
  -- Demographics (de-identified)
  age_group TEXT, -- '18-25', '26-35', etc.
  sex TEXT,
  handedness TEXT,
  
  -- Scan info
  modality TEXT NOT NULL,
  scanner_type TEXT,
  field_strength TEXT, -- '3T', '7T'
  acquisition_date DATE,
  
  -- Conditions/tasks
  condition TEXT, -- 'resting_state', 'task_fmri', etc.
  task_name TEXT,
  clinical_group TEXT, -- 'control', 'patient'
  diagnosis TEXT[],
  
  -- Quality metrics
  quality_score DECIMAL,
  motion_mm DECIMAL,
  snr DECIMAL,
  
  -- File reference
  file_url TEXT,
  thumbnail_url TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- CONNECTOME DATA
-- =============================================

-- Connectivity matrices
CREATE TABLE public.connectomes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brain_scan_id UUID REFERENCES brain_scans(id),
  atlas TEXT NOT NULL, -- which parcellation was used
  connectivity_type TEXT NOT NULL, -- 'structural', 'functional', 'effective'
  
  -- Matrix data (stored as JSON or reference to file)
  matrix_size INTEGER,
  matrix_data_url TEXT, -- link to actual matrix file
  
  -- Metrics
  global_efficiency DECIMAL,
  modularity DECIMAL,
  small_worldness DECIMAL,
  mean_clustering DECIMAL,
  
  -- Visualization
  visualization_url TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- USER INTERACTIONS
-- =============================================

-- User's saved research items
CREATE TABLE public.user_collections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.collection_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  collection_id UUID REFERENCES user_collections(id) ON DELETE CASCADE,
  study_id UUID REFERENCES studies(id),
  dataset_id UUID REFERENCES datasets(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Search history (for recommendations)
CREATE TABLE public.search_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  filters JSONB,
  results_count INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Download history (for tracking quotas)
CREATE TABLE public.download_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  dataset_id UUID REFERENCES datasets(id),
  file_size_mb DECIMAL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- API usage tracking
CREATE TABLE public.api_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  method TEXT,
  response_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- SUBSCRIPTION & BILLING
-- =============================================

CREATE TABLE public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL, -- 'free', 'pro', 'research', 'enterprise'
  display_name TEXT NOT NULL,
  price_monthly DECIMAL,
  price_yearly DECIMAL,
  
  -- Limits
  papers_per_month INTEGER, -- NULL = unlimited
  api_calls_per_month INTEGER,
  downloads_per_month INTEGER,
  max_collections INTEGER,
  
  -- Features
  features JSONB,
  
  stripe_price_id_monthly TEXT,
  stripe_price_id_yearly TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default plans
INSERT INTO subscription_plans (name, display_name, price_monthly, price_yearly, papers_per_month, api_calls_per_month, downloads_per_month, max_collections, features) VALUES
('free', 'Free', 0, 0, 10, 100, 3, 3, '{"ai_summaries": false, "3d_explorer": "basic", "api_access": false, "bulk_download": false}'::jsonb),
('pro', 'Pro', 29, 290, NULL, 1000, 50, 25, '{"ai_summaries": true, "3d_explorer": "full", "api_access": true, "bulk_download": false}'::jsonb),
('research', 'Research', 99, 990, NULL, 10000, NULL, NULL, '{"ai_summaries": true, "3d_explorer": "full", "api_access": true, "bulk_download": true, "collaboration": true}'::jsonb),
('enterprise', 'Enterprise', 499, 4990, NULL, NULL, NULL, NULL, '{"ai_summaries": true, "3d_explorer": "full", "api_access": true, "bulk_download": true, "collaboration": true, "white_label": true, "dedicated_support": true}'::jsonb);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE download_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage ENABLE ROW LEVEL SECURITY;

-- Users can only see their own profile
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

-- Users can manage their own collections
CREATE POLICY "Users can manage own collections" ON user_collections
  FOR ALL USING (auth.uid() = user_id);

-- Public collections are viewable by all
CREATE POLICY "Public collections are viewable" ON user_collections
  FOR SELECT USING (is_public = TRUE);

-- Collection items follow collection permissions
CREATE POLICY "Users can manage own collection items" ON collection_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_collections 
      WHERE id = collection_items.collection_id 
      AND user_id = auth.uid()
    )
  );

-- Search/download/API history is private
CREATE POLICY "Users can view own search history" ON search_history
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own download history" ON download_history
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own API usage" ON api_usage
  FOR ALL USING (auth.uid() = user_id);

-- Public data tables are readable by all
ALTER TABLE brain_regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE studies ENABLE ROW LEVEL SECURITY;
ALTER TABLE datasets ENABLE ROW LEVEL SECURITY;
ALTER TABLE brain_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE connectomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brain regions are public" ON brain_regions FOR SELECT USING (TRUE);
CREATE POLICY "Data sources are public" ON data_sources FOR SELECT USING (TRUE);
CREATE POLICY "Subscription plans are public" ON subscription_plans FOR SELECT USING (TRUE);

-- Studies access based on tier
CREATE POLICY "Studies access by tier" ON studies
  FOR SELECT USING (
    access_level = 'free' 
    OR EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND subscription_tier IN ('pro', 'research', 'enterprise')
    )
  );

-- Datasets access based on tier  
CREATE POLICY "Datasets access by tier" ON datasets
  FOR SELECT USING (
    access_level = 'free'
    OR (access_level = 'pro' AND EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND subscription_tier IN ('pro', 'research', 'enterprise')
    ))
    OR (access_level = 'research' AND EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND subscription_tier IN ('research', 'enterprise')
    ))
  );

-- Brain scans and connectomes follow dataset permissions
CREATE POLICY "Brain scans access" ON brain_scans FOR SELECT USING (TRUE);
CREATE POLICY "Connectomes access" ON connectomes FOR SELECT USING (TRUE);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

CREATE INDEX idx_studies_search ON studies USING GIN(search_vector);
CREATE INDEX idx_studies_conditions ON studies USING GIN(conditions);
CREATE INDEX idx_studies_modalities ON studies USING GIN(modalities);
CREATE INDEX idx_studies_keywords ON studies USING GIN(keywords);
CREATE INDEX idx_studies_source ON studies(source_id);
CREATE INDEX idx_studies_access ON studies(access_level);

CREATE INDEX idx_datasets_study ON datasets(study_id);
CREATE INDEX idx_datasets_source ON datasets(source_id);
CREATE INDEX idx_datasets_modality ON datasets(modality);

CREATE INDEX idx_brain_scans_dataset ON brain_scans(dataset_id);
CREATE INDEX idx_brain_scans_modality ON brain_scans(modality);
CREATE INDEX idx_brain_scans_condition ON brain_scans(condition);

CREATE INDEX idx_connectomes_scan ON connectomes(brain_scan_id);

CREATE INDEX idx_user_collections_user ON user_collections(user_id);
CREATE INDEX idx_download_history_user ON download_history(user_id);
CREATE INDEX idx_api_usage_user ON api_usage(user_id);

-- =============================================
-- FUNCTIONS
-- =============================================

-- Update search vector on study insert/update
CREATE OR REPLACE FUNCTION update_study_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.abstract, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(array_to_string(NEW.keywords, ' '), '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(NEW.ai_summary, '')), 'D');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_study_search_vector
  BEFORE INSERT OR UPDATE ON studies
  FOR EACH ROW
  EXECUTE FUNCTION update_study_search_vector();

-- Check user quota before download
CREATE OR REPLACE FUNCTION check_download_quota(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_tier TEXT;
  v_limit INTEGER;
  v_used INTEGER;
BEGIN
  SELECT subscription_tier INTO v_tier FROM user_profiles WHERE id = p_user_id;
  SELECT downloads_per_month INTO v_limit FROM subscription_plans WHERE name = v_tier;
  
  IF v_limit IS NULL THEN
    RETURN TRUE; -- Unlimited
  END IF;
  
  SELECT COUNT(*) INTO v_used 
  FROM download_history 
  WHERE user_id = p_user_id 
  AND created_at >= date_trunc('month', NOW());
  
  RETURN v_used < v_limit;
END;
$$ LANGUAGE plpgsql;

-- Increment view count
CREATE OR REPLACE FUNCTION increment_study_view(p_study_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE studies SET view_count = view_count + 1 WHERE id = p_study_id;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- SEED DATA - Brain Regions (sample)
-- =============================================

INSERT INTO brain_regions (name, abbreviation, atlas, hemisphere, description, functions) VALUES
('Prefrontal Cortex', 'PFC', 'Brodmann', 'bilateral', 'Front part of the frontal lobe, involved in executive functions', ARRAY['decision making', 'planning', 'personality', 'social behavior']),
('Hippocampus', 'HIP', 'AAL', 'bilateral', 'Critical for memory formation and spatial navigation', ARRAY['memory consolidation', 'spatial navigation', 'learning']),
('Amygdala', 'AMY', 'AAL', 'bilateral', 'Almond-shaped structure involved in emotion processing', ARRAY['fear processing', 'emotional memory', 'threat detection']),
('Primary Visual Cortex', 'V1', 'Brodmann', 'bilateral', 'First cortical area to receive visual input', ARRAY['visual processing', 'edge detection', 'orientation']),
('Primary Motor Cortex', 'M1', 'Brodmann', 'bilateral', 'Responsible for voluntary movement execution', ARRAY['movement control', 'motor planning']),
('Anterior Cingulate Cortex', 'ACC', 'Brodmann', 'bilateral', 'Involved in error detection and conflict monitoring', ARRAY['error monitoring', 'attention', 'emotion regulation']),
('Insula', 'INS', 'AAL', 'bilateral', 'Deep cortical structure involved in interoception', ARRAY['interoception', 'emotion', 'self-awareness', 'taste']),
('Thalamus', 'THA', 'AAL', 'bilateral', 'Relay station for sensory and motor signals', ARRAY['sensory relay', 'consciousness', 'sleep regulation']),
('Cerebellum', 'CER', 'AAL', 'bilateral', 'Coordinates voluntary movements and balance', ARRAY['motor coordination', 'balance', 'motor learning']),
('Basal Ganglia', 'BG', 'AAL', 'bilateral', 'Group of nuclei involved in movement and reward', ARRAY['movement initiation', 'reward processing', 'habit formation']);

-- =============================================
-- SEED DATA - Data Sources
-- =============================================

INSERT INTO data_sources (name, short_name, description, url, data_types, total_subjects, total_size_tb, license, access_level) VALUES
('Human Connectome Project', 'HCP', 'Large-scale project mapping human brain connectivity using advanced neuroimaging', 'https://www.humanconnectome.org', ARRAY['fMRI', 'dMRI', 'structural MRI', 'MEG'], 1200, 1200, 'Open Access (with DUA)', 'registration'),
('Allen Brain Atlas', 'Allen', 'Comprehensive gene expression and connectivity atlas of the brain', 'https://portal.brain-map.org', ARRAY['gene expression', 'histology', 'connectivity'], 500, 100, 'Allen Institute Terms', 'public'),
('OpenNeuro', 'OpenNeuro', 'Free and open platform for sharing neuroimaging data', 'https://openneuro.org', ARRAY['fMRI', 'EEG', 'MEG', 'PET'], 50000, 50, 'CC0/PDDL', 'public'),
('UK Biobank Brain Imaging', 'UKBB', 'Large-scale biomedical database with brain imaging on 100K+ participants', 'https://www.ukbiobank.ac.uk', ARRAY['structural MRI', 'fMRI', 'dMRI'], 100000, 500, 'Restricted', 'application'),
('ENIGMA Consortium', 'ENIGMA', 'Worldwide network analyzing brain imaging and genetics', 'https://enigma.ini.usc.edu', ARRAY['structural MRI', 'dMRI', 'genetics'], 100000, 200, 'Collaborative', 'application'),
('ADNI', 'ADNI', 'Alzheimer''s Disease Neuroimaging Initiative - tracking disease progression', 'https://adni.loni.usc.edu', ARRAY['PET', 'MRI', 'genetics', 'biomarkers'], 2000, 20, 'ADNI DUA', 'registration');

-- =============================================
-- NEUROCOMPUTE INFRASTRUCTURE
-- Brain Node Orchestration System
-- =============================================

-- Node categories (biological metaphor → infrastructure reality)
CREATE TYPE node_category AS ENUM (
  'input_source',      -- Data ingestion (EEG/fMRI/BCI device input)
  'preprocessing',     -- Signal cleaning, artifact removal
  'analysis',          -- Statistical analysis, feature extraction
  'ml_inference',      -- ML model inference
  'ml_training',       -- ML model training (GPU nodes)
  'visualization',     -- Real-time visualization output
  'output_sink'        -- File export, database storage
);

-- Workflow execution status
CREATE TYPE workflow_status AS ENUM (
  'draft',             -- Still being edited
  'ready',             -- Validated and ready to run
  'running',           -- Currently executing
  'paused',            -- Manually paused
  'completed',         -- Finished successfully
  'failed',            -- Failed with error
  'cancelled'          -- User cancelled
);

-- Node execution status
CREATE TYPE node_status AS ENUM (
  'idle',              -- Not started
  'queued',            -- Waiting for resources
  'initializing',      -- Container spinning up
  'running',           -- Actively processing
  'completed',         -- Finished successfully
  'failed',            -- Failed with error
  'skipped'            -- Skipped due to upstream failure
);

-- Workflows (collections of connected brain nodes)
CREATE TABLE public.workflows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  
  -- Metadata
  name TEXT NOT NULL,
  description TEXT,
  tags TEXT[],
  
  -- Template/sharing
  is_template BOOLEAN DEFAULT FALSE,
  is_public BOOLEAN DEFAULT FALSE,
  forked_from_id UUID REFERENCES workflows(id),
  
  -- BIDS compliance
  bids_dataset_name TEXT,           -- e.g., "sub-001_task-rest"
  bids_output_path TEXT,            -- derivatives output folder
  
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

-- Compute Nodes (Brain Nodes - the core compute units)
CREATE TABLE public.compute_nodes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE NOT NULL,
  
  -- Identity
  name TEXT NOT NULL,                       -- e.g., "Bandpass Filter"
  description TEXT,
  category node_category NOT NULL,
  
  -- THE BRIDGE: Link to Templates (Algorithm Library or AI Agent)
  -- A node can be based on an algorithm OR an AI agent, not both
  algorithm_id UUID REFERENCES algorithm_library(id), -- Template from library
  agent_id UUID,                             -- References agents(id) from schema.sql
  -- Note: agent_id is not FK'd here since agents is in separate schema
  -- Validate in application layer: exactly one of algorithm_id OR agent_id should be set
  
  -- Biological Metaphor (for visualization)
  brain_region TEXT,                        -- e.g., 'ACC', 'PFC' - maps to brain_regions
  brain_region_id UUID REFERENCES brain_regions(id),
  color TEXT DEFAULT '#6366f1',             -- Node color for canvas
  icon TEXT DEFAULT 'cpu',                  -- Lucide icon name
  
  -- Infrastructure Reality (Docker/Container) - overrides from algorithm_library
  container_image TEXT,                     -- e.g., 'mne-python:1.6', 'fsl:6.0.5'
  container_registry TEXT DEFAULT 'ghcr.io/neurodata-hub',
  container_tag TEXT DEFAULT 'latest',
  entrypoint TEXT,                          -- Override container entrypoint
  command TEXT[],                           -- Command arguments
  environment JSONB DEFAULT '{}',           -- Environment variables
  
  -- Resource Limits
  resource_cpu DECIMAL DEFAULT 1.0,         -- vCPU units
  resource_memory_gb DECIMAL DEFAULT 2.0,   -- RAM in GB
  resource_gpu INTEGER DEFAULT 0,           -- GPU count
  resource_gpu_type TEXT,                   -- e.g., 'nvidia-t4', 'nvidia-a100'
  resource_storage_gb DECIMAL DEFAULT 10.0, -- Ephemeral storage
  timeout_seconds INTEGER DEFAULT 3600,     -- Max execution time
  
  -- Data Contract (BIDS/NWB aligned)
  input_schema JSONB DEFAULT '{}',          -- Expected input format
  output_schema JSONB DEFAULT '{}',         -- Output format specification
  -- Example input_schema: {"type": "bids-raw", "modality": "eeg", "format": ".edf"}
  -- Example output_schema: {"type": "bids-derivative", "modality": "eeg", "format": ".fif"}
  
  -- Configuration (algorithm-specific parameters)
  config_schema JSONB DEFAULT '{}',         -- JSON Schema for parameters
  config_values JSONB DEFAULT '{}',         -- Actual parameter values
  -- Example config_values: {"low_freq": 0.1, "high_freq": 40, "notch_freq": 60}
  
  -- Execution State
  status node_status DEFAULT 'idle',
  progress INTEGER DEFAULT 0,               -- 0-100 percentage
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  logs_url TEXT,                            -- S3/storage URL for logs
  
  -- Canvas Position (for workflow editor UI)
  position_x DECIMAL DEFAULT 0,
  position_y DECIMAL DEFAULT 0,
  
  -- Metrics (after execution)
  execution_time_ms INTEGER,
  cpu_time_ms INTEGER,
  memory_peak_mb INTEGER,
  data_processed_mb DECIMAL,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Node Edges (Synapses - data flow between nodes)
CREATE TABLE public.node_edges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
  
  -- Connection
  source_node_id UUID REFERENCES compute_nodes(id) ON DELETE CASCADE,
  target_node_id UUID REFERENCES compute_nodes(id) ON DELETE CASCADE,
  
  -- Data Mapping (which output field maps to which input)
  data_mapping JSONB DEFAULT '{}',
  -- Example: {"source_output": "cleaned_eeg", "target_input": "raw_data"}
  
  -- Validation
  is_valid BOOLEAN DEFAULT TRUE,            -- Schema compatibility check
  validation_error TEXT,
  
  -- Visual (for canvas bezier curves)
  source_handle TEXT DEFAULT 'output',      -- Handle position on source
  target_handle TEXT DEFAULT 'input',       -- Handle position on target
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Algorithm Library (pre-built node templates)
CREATE TABLE public.algorithm_library (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Identity
  name TEXT NOT NULL,
  description TEXT,
  category node_category NOT NULL,
  tags TEXT[],
  
  -- Container Definition
  container_image TEXT NOT NULL,
  container_registry TEXT DEFAULT 'ghcr.io/neurodata-hub',
  default_config JSONB DEFAULT '{}',
  config_schema JSONB DEFAULT '{}',         -- JSON Schema for validation
  
  -- Data Contracts
  input_schema JSONB NOT NULL,
  output_schema JSONB NOT NULL,
  
  -- Documentation
  documentation_url TEXT,
  paper_doi TEXT,                           -- Original paper if applicable
  example_workflow_id UUID REFERENCES workflows(id),
  
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
  is_official BOOLEAN DEFAULT FALSE,        -- NeuroData Hub verified
  is_public BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workflow Runs (execution history)
CREATE TABLE public.workflow_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  
  -- Execution
  status workflow_status DEFAULT 'running',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  
  -- Snapshot of workflow state at run time
  workflow_snapshot JSONB,                  -- Full workflow config at execution
  
  -- Results
  output_files JSONB DEFAULT '[]',          -- List of output file URLs
  logs_url TEXT,
  
  -- Resource Usage
  total_cpu_seconds INTEGER,
  total_gpu_seconds INTEGER,
  total_memory_gb_seconds INTEGER,
  estimated_cost DECIMAL,
  
  -- Error handling
  error_message TEXT,
  failed_node_id UUID REFERENCES compute_nodes(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- BCI Device Registry (future - for hardware integration)
CREATE TABLE public.bci_devices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  
  -- Device Info
  name TEXT NOT NULL,                       -- User-defined name
  device_type TEXT NOT NULL,                -- 'openbci', 'emotiv', 'muse', 'neurosky'
  model TEXT,
  serial_number TEXT,
  
  -- Connection
  connection_type TEXT,                     -- 'usb', 'bluetooth', 'wifi'
  last_connected_at TIMESTAMPTZ,
  is_connected BOOLEAN DEFAULT FALSE,
  
  -- Capabilities
  channels INTEGER,
  sampling_rate INTEGER,
  supported_modalities TEXT[],              -- ['eeg', 'emg', 'ecg']
  
  -- Calibration
  calibration_data JSONB,
  last_calibrated_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- COMPUTE RLS POLICIES
-- =============================================

ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE compute_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE node_edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE algorithm_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE bci_devices ENABLE ROW LEVEL SECURITY;

-- Workflows: users can manage their own, view public/templates
CREATE POLICY "Users can manage own workflows" ON workflows
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Public workflows are viewable" ON workflows
  FOR SELECT USING (is_public = TRUE OR is_template = TRUE);

-- Compute nodes: follow workflow permissions
CREATE POLICY "Users can manage nodes in own workflows" ON compute_nodes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM workflows 
      WHERE id = compute_nodes.workflow_id 
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Public workflow nodes are viewable" ON compute_nodes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workflows 
      WHERE id = compute_nodes.workflow_id 
      AND (is_public = TRUE OR is_template = TRUE)
    )
  );

-- Node edges: follow workflow permissions
CREATE POLICY "Users can manage edges in own workflows" ON node_edges
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM workflows 
      WHERE id = node_edges.workflow_id 
      AND user_id = auth.uid()
    )
  );

-- Algorithm library: public read, restricted write
CREATE POLICY "Algorithm library is public" ON algorithm_library
  FOR SELECT USING (is_public = TRUE);

-- Workflow runs: users see own runs
CREATE POLICY "Users can view own workflow runs" ON workflow_runs
  FOR ALL USING (auth.uid() = user_id);

-- BCI devices: users manage own devices
CREATE POLICY "Users can manage own BCI devices" ON bci_devices
  FOR ALL USING (auth.uid() = user_id);

-- =============================================
-- COMPUTE INDEXES
-- =============================================

CREATE INDEX idx_workflows_user ON workflows(user_id);
CREATE INDEX idx_workflows_status ON workflows(status);
CREATE INDEX idx_workflows_template ON workflows(is_template) WHERE is_template = TRUE;

CREATE INDEX idx_compute_nodes_workflow ON compute_nodes(workflow_id);
CREATE INDEX idx_compute_nodes_category ON compute_nodes(category);
CREATE INDEX idx_compute_nodes_status ON compute_nodes(status);
CREATE INDEX idx_compute_nodes_brain_region ON compute_nodes(brain_region);

CREATE INDEX idx_node_edges_workflow ON node_edges(workflow_id);
CREATE INDEX idx_node_edges_source ON node_edges(source_node_id);
CREATE INDEX idx_node_edges_target ON node_edges(target_node_id);

CREATE INDEX idx_algorithm_library_category ON algorithm_library(category);
CREATE INDEX idx_algorithm_library_tags ON algorithm_library USING GIN(tags);

CREATE INDEX idx_workflow_runs_workflow ON workflow_runs(workflow_id);
CREATE INDEX idx_workflow_runs_user ON workflow_runs(user_id);
CREATE INDEX idx_workflow_runs_status ON workflow_runs(status);

CREATE INDEX idx_bci_devices_user ON bci_devices(user_id);

-- =============================================
-- COMPUTE FUNCTIONS
-- =============================================

-- Validate edge compatibility (check input/output schemas match)
CREATE OR REPLACE FUNCTION validate_node_edge()
RETURNS TRIGGER AS $$
DECLARE
  source_output JSONB;
  target_input JSONB;
BEGIN
  SELECT output_schema INTO source_output FROM compute_nodes WHERE id = NEW.source_node_id;
  SELECT input_schema INTO target_input FROM compute_nodes WHERE id = NEW.target_node_id;
  
  -- Basic type compatibility check
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

CREATE TRIGGER trigger_update_workflow_on_node
  AFTER INSERT OR UPDATE OR DELETE ON compute_nodes
  FOR EACH ROW
  EXECUTE FUNCTION update_workflow_timestamp();

-- Calculate estimated workflow cost
CREATE OR REPLACE FUNCTION calculate_workflow_cost(p_workflow_id UUID)
RETURNS DECIMAL AS $$
DECLARE
  v_total_cost DECIMAL := 0;
  v_cpu_rate DECIMAL := 0.0486;  -- $ per vCPU-hour
  v_gpu_rate DECIMAL := 0.35;     -- $ per GPU-hour
  v_memory_rate DECIMAL := 0.005; -- $ per GB-hour
BEGIN
  SELECT 
    SUM(
      (resource_cpu * v_cpu_rate) +
      (resource_gpu * v_gpu_rate) +
      (resource_memory_gb * v_memory_rate)
    )
  INTO v_total_cost
  FROM compute_nodes
  WHERE workflow_id = p_workflow_id;
  
  RETURN COALESCE(v_total_cost, 0);
END;
$$ LANGUAGE plpgsql;
