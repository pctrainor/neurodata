// =============================================
// NeuroData Hub - TypeScript Types
// =============================================

// User & Subscription Types
export type SubscriptionTier = 'free' | 'pro' | 'research' | 'enterprise'
export type UserRole = 'researcher' | 'student' | 'educator' | 'enthusiast' | 'enterprise'

export interface UserProfile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  institution: string | null
  role: UserRole
  subscription_tier: SubscriptionTier
  subscription_status: 'active' | 'canceled' | 'past_due'
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  monthly_api_calls: number
  monthly_downloads: number
  papers_viewed_this_month: number
  created_at: string
  updated_at: string
}

export interface SubscriptionPlan {
  id: string
  name: SubscriptionTier
  display_name: string
  price_monthly: number
  price_yearly: number
  papers_per_month: number | null
  api_calls_per_month: number | null
  downloads_per_month: number | null
  max_collections: number | null
  features: {
    ai_summaries: boolean
    '3d_explorer': 'basic' | 'full'
    api_access: boolean
    bulk_download: boolean
    collaboration?: boolean
    white_label?: boolean
    dedicated_support?: boolean
  }
  stripe_price_id_monthly: string | null
  stripe_price_id_yearly: string | null
}

// Brain & Neuroscience Types
export interface BrainRegion {
  id: string
  name: string
  abbreviation: string | null
  atlas: 'HCP' | 'AAL' | 'Brodmann' | 'Desikan-Killiany'
  parent_region_id: string | null
  hemisphere: 'left' | 'right' | 'bilateral' | null
  mni_x: number | null
  mni_y: number | null
  mni_z: number | null
  description: string | null
  functions: string[]
  related_conditions: string[]
  mesh_file_url: string | null
  created_at: string
}

export interface DataSource {
  id: string
  name: string
  short_name: string | null
  description: string | null
  url: string | null
  data_types: string[]
  total_subjects: number | null
  total_size_tb: number | null
  license: string | null
  citation: string | null
  access_level: 'public' | 'registration' | 'application' | 'restricted'
  last_synced_at: string | null
  created_at: string
}

export type Modality = 'fMRI' | 'dMRI' | 'structural MRI' | 'EEG' | 'MEG' | 'PET' | 'CT' | 'histology' | 'gene expression'
export type ClinicalCondition = 'healthy' | 'depression' | 'anxiety' | 'schizophrenia' | 'alzheimer' | 'parkinson' | 'autism' | 'adhd' | 'ptsd' | 'bipolar' | 'ocd' | 'stroke' | 'tbi' | 'epilepsy' | 'ms' | 'other'

export interface Study {
  id: string
  source_id: string
  external_id: string | null
  title: string
  authors: string[]
  abstract: string | null
  doi: string | null
  pubmed_id: string | null
  publication_date: string | null
  journal: string | null
  keywords: string[]
  
  // AI-generated enrichments
  ai_summary: string | null
  ai_key_findings: string[] | null
  ai_methodology: string | null
  ai_limitations: string | null
  ai_future_directions: string | null
  
  // Metadata
  sample_size: number | null
  age_range: string | null
  conditions: ClinicalCondition[]
  modalities: Modality[]
  brain_regions_studied: string[] | null
  
  // Access control
  access_level: 'free' | 'pro' | 'research'
  view_count: number
  download_count: number
  
  created_at: string
  updated_at: string
  
  // Joined data
  source?: DataSource
}

export interface Dataset {
  id: string
  study_id: string | null
  source_id: string
  name: string
  description: string | null
  
  // File info
  file_type: 'nifti' | 'csv' | 'edf' | 'mat' | 'json' | 'tsv' | 'bids'
  file_size_mb: number | null
  file_url: string | null
  s3_bucket: string | null
  s3_key: string | null
  
  // Data characteristics
  modality: Modality | null
  preprocessing_level: 'raw' | 'minimally_processed' | 'fully_processed'
  resolution: string | null
  subjects_count: number | null
  
  // Access control
  access_level: 'free' | 'pro' | 'research'
  requires_agreement: boolean
  download_count: number
  
  created_at: string
  
  // Joined data
  study?: Study
  source?: DataSource
}

export interface BrainScan {
  id: string
  dataset_id: string
  subject_id: string
  
  // Demographics (de-identified)
  age_group: string | null
  sex: 'male' | 'female' | 'other' | null
  handedness: 'right' | 'left' | 'ambidextrous' | null
  
  // Scan info
  modality: Modality
  scanner_type: string | null
  field_strength: '1.5T' | '3T' | '7T' | null
  acquisition_date: string | null
  
  // Conditions/tasks
  condition: 'resting_state' | 'task_fmri' | 'anatomical' | 'diffusion' | null
  task_name: string | null
  clinical_group: 'control' | 'patient' | null
  diagnosis: string[] | null
  
  // Quality metrics
  quality_score: number | null
  motion_mm: number | null
  snr: number | null
  
  // File reference
  file_url: string | null
  thumbnail_url: string | null
  
  created_at: string
}

export interface Connectome {
  id: string
  brain_scan_id: string
  atlas: string
  connectivity_type: 'structural' | 'functional' | 'effective'
  
  // Matrix data
  matrix_size: number | null
  matrix_data_url: string | null
  
  // Metrics
  global_efficiency: number | null
  modularity: number | null
  small_worldness: number | null
  mean_clustering: number | null
  
  // Visualization
  visualization_url: string | null
  
  created_at: string
}

// User Interaction Types
export interface UserCollection {
  id: string
  user_id: string
  name: string
  description: string | null
  is_public: boolean
  created_at: string
  items?: CollectionItem[]
}

export interface CollectionItem {
  id: string
  collection_id: string
  study_id: string | null
  dataset_id: string | null
  notes: string | null
  created_at: string
  study?: Study
  dataset?: Dataset
}

export interface SearchHistory {
  id: string
  user_id: string
  query: string
  filters: SearchFilters | null
  results_count: number | null
  created_at: string
}

export interface DownloadHistory {
  id: string
  user_id: string
  dataset_id: string
  file_size_mb: number | null
  created_at: string
  dataset?: Dataset
}

export interface ApiUsage {
  id: string
  user_id: string
  endpoint: string
  method: string | null
  response_time_ms: number | null
  created_at: string
}

// Search & Filter Types
export interface SearchFilters {
  query?: string
  modalities?: Modality[]
  conditions?: ClinicalCondition[]
  brain_regions?: string[]
  sources?: string[]
  date_from?: string
  date_to?: string
  sample_size_min?: number
  has_ai_summary?: boolean
  access_level?: ('free' | 'pro' | 'research')[]
}

export interface SearchResults {
  studies: Study[]
  total_count: number
  page: number
  page_size: number
  facets: {
    modalities: { name: string; count: number }[]
    conditions: { name: string; count: number }[]
    sources: { name: string; count: number }[]
    years: { year: number; count: number }[]
  }
}

// Dashboard Types
export interface DashboardSummary {
  total_studies: number
  total_datasets: number
  total_brain_scans: number
  total_connectomes: number
  
  // User stats
  papers_viewed: number
  papers_limit: number | null
  downloads_used: number
  downloads_limit: number | null
  api_calls_used: number
  api_calls_limit: number | null
  collections_count: number
  collections_limit: number | null
  
  // Recent activity
  recent_searches: SearchHistory[]
  recent_downloads: DownloadHistory[]
  
  // Trending
  trending_studies: Study[]
  new_datasets: Dataset[]
}

// API Response Types
export interface ApiResponse<T> {
  data: T | null
  error: string | null
  meta?: {
    page?: number
    page_size?: number
    total_count?: number
  }
}

// Quota Check
export interface QuotaStatus {
  papers: { used: number; limit: number | null; remaining: number | null }
  downloads: { used: number; limit: number | null; remaining: number | null }
  api_calls: { used: number; limit: number | null; remaining: number | null }
  collections: { used: number; limit: number | null; remaining: number | null }
  can_view_paper: boolean
  can_download: boolean
  can_use_api: boolean
  upgrade_needed: boolean
}

// 3D Visualization Types
export interface BrainMesh {
  region_id: string
  vertices: number[]
  faces: number[]
  color: string
  opacity: number
}

export interface BrainVisualization {
  regions: BrainMesh[]
  connections: {
    from_region: string
    to_region: string
    strength: number
  }[]
  highlights: string[]
}

// =============================================
// NEUROCOMPUTE INFRASTRUCTURE
// Brain Node Orchestration System
// =============================================

// Enums matching database types
export type NodeCategory = 
  | 'input_source'      // Data ingestion (EEG/fMRI/BCI device input)
  | 'preprocessing'     // Signal cleaning, artifact removal
  | 'analysis'          // Statistical analysis, feature extraction
  | 'ml_inference'      // ML model inference
  | 'ml_training'       // ML model training (GPU nodes)
  | 'visualization'     // Real-time visualization output
  | 'output_sink'       // File export, database storage

export type WorkflowStatus = 
  | 'draft'             // Still being edited
  | 'ready'             // Validated and ready to run
  | 'running'           // Currently executing
  | 'paused'            // Manually paused
  | 'completed'         // Finished successfully
  | 'failed'            // Failed with error
  | 'cancelled'         // User cancelled

export type NodeStatus = 
  | 'idle'              // Not started
  | 'queued'            // Waiting for resources
  | 'initializing'      // Container spinning up
  | 'running'           // Actively processing
  | 'completed'         // Finished successfully
  | 'failed'            // Failed with error
  | 'skipped'           // Skipped due to upstream failure

// Algorithm Library (pre-built node templates)
export interface Algorithm {
  id: string
  name: string
  description: string | null
  category: NodeCategory
  tags: string[] | null
  
  // Container Definition
  container_image: string
  container_registry: string
  default_config: Record<string, unknown>
  config_schema: Record<string, unknown>
  
  // Data Contracts
  input_schema: Record<string, unknown>
  output_schema: Record<string, unknown>
  
  // Documentation
  documentation_url: string | null
  paper_doi: string | null
  example_workflow_id: string | null
  
  // Resource Recommendations
  recommended_cpu: number
  recommended_memory_gb: number
  requires_gpu: boolean
  
  // Metadata
  version: string
  author: string | null
  license: string
  downloads: number
  rating: number | null
  
  // Access
  is_official: boolean
  is_public: boolean
  
  created_at: string
  updated_at: string
}

// Workflows (collections of connected brain nodes)
export interface Workflow {
  id: string
  user_id: string
  
  // Metadata
  name: string
  description: string | null
  tags: string[] | null
  
  // Template/sharing
  is_template: boolean
  is_public: boolean
  forked_from_id: string | null
  
  // BIDS compliance
  bids_dataset_name: string | null
  bids_output_path: string | null
  
  // Execution state
  status: WorkflowStatus
  started_at: string | null
  completed_at: string | null
  error_message: string | null
  
  // Resource allocation
  total_cpu_hours: number
  total_gpu_hours: number
  estimated_cost: number
  
  // Canvas position (for UI)
  canvas_zoom: number
  canvas_offset_x: number
  canvas_offset_y: number
  
  created_at: string
  updated_at: string
  
  // Joined data
  nodes?: ComputeNode[]
  edges?: NodeEdge[]
}

// Compute Nodes (Brain Nodes - the core compute units)
export interface ComputeNode {
  id: string
  workflow_id: string
  
  // Identity
  name: string
  description: string | null
  category: NodeCategory
  
  // Template reference
  algorithm_id: string | null
  agent_id: string | null
  
  // Biological Metaphor (for visualization)
  brain_region: string | null
  brain_region_id: string | null
  color: string
  icon: string
  
  // Infrastructure Reality (Docker/Container)
  container_image: string | null
  container_registry: string
  container_tag: string
  entrypoint: string | null
  command: string[] | null
  environment: Record<string, string>
  
  // Resource Limits
  resource_cpu: number
  resource_memory_gb: number
  resource_gpu: number
  resource_gpu_type: string | null
  resource_storage_gb: number
  timeout_seconds: number
  
  // Data Contract (BIDS/NWB aligned)
  input_schema: Record<string, unknown>
  output_schema: Record<string, unknown>
  
  // Configuration (algorithm-specific parameters)
  config_schema: Record<string, unknown>
  config_values: Record<string, unknown>
  
  // Execution State
  status: NodeStatus
  progress: number
  started_at: string | null
  completed_at: string | null
  error_message: string | null
  logs_url: string | null
  
  // Canvas Position (for workflow editor UI)
  position_x: number
  position_y: number
  
  // Metrics (after execution)
  execution_time_ms: number | null
  cpu_time_ms: number | null
  memory_peak_mb: number | null
  data_processed_mb: number | null
  
  created_at: string
  updated_at: string
  
  // Joined data
  algorithm?: Algorithm
}

// Node Edges (Synapses - data flow between nodes)
export interface NodeEdge {
  id: string
  workflow_id: string
  
  // Connection
  source_node_id: string
  target_node_id: string
  
  // Data Mapping
  data_mapping: Record<string, string>
  
  // Validation
  is_valid: boolean
  validation_error: string | null
  
  // Visual
  source_handle: string
  target_handle: string
  
  created_at: string
}

// React Flow Node Data Types (for canvas rendering)
export interface BrainNodeData {
  label: string
  category: NodeCategory
  algorithm?: Algorithm
  computeNode?: ComputeNode
  icon: string
  color: string
  status: NodeStatus
  progress: number
  config: Record<string, unknown>
  isOrchestrator?: boolean
  prompt?: string
}

export interface WorkflowCanvasState {
  workflow: Workflow | null
  nodes: ComputeNode[]
  edges: NodeEdge[]
  selectedNodeId: string | null
  isRunning: boolean
  isSaving: boolean
}
