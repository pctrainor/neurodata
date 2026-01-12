// ============================================
// CORE DATA TYPES
// ============================================

export interface User {
  id: string
  email: string
  full_name?: string
  avatar_url?: string
  subscription_tier: 'free' | 'researcher' | 'clinical'
  subscription_status?: string
  created_at: string
  updated_at: string
}

export interface UserSettings {
  id: string
  user_id: string
  timezone: string
  theme: 'light' | 'dark' | 'system'
  compact_view: boolean
  notifications_enabled: boolean
  email_digest: 'none' | 'daily' | 'weekly' | 'monthly'
  onboarding_completed: boolean
  preferences: Record<string, any>
  created_at: string
  updated_at: string
}

export interface Category {
  id: string
  user_id?: string
  name: string
  slug: string
  description?: string
  icon?: string
  color?: string
  parent_id?: string
  display_order: number
  is_system: boolean
  metadata: Record<string, any>
  created_at: string
  updated_at: string
}

export interface Item {
  id: string
  user_id?: string
  category_id?: string
  
  // Core fields
  name: string
  slug?: string
  description?: string
  summary?: string
  
  // Flexible data storage
  data: Record<string, any>
  
  // Media
  image_url?: string
  thumbnail_url?: string
  images: string[]
  
  // Source tracking
  source_url?: string
  source_name?: string
  source_id?: string
  
  // AI enrichment
  ai_summary?: string
  ai_tags: string[]
  ai_metadata: Record<string, any>
  enrichment_status: 'pending' | 'processing' | 'completed' | 'failed' | 'skipped'
  enriched_at?: string
  
  // Quality metrics
  quality_score: number
  completeness_score: number
  verification_status: 'unverified' | 'verified' | 'disputed' | 'outdated'
  verified_at?: string
  verified_by?: string
  
  // Status
  status: 'draft' | 'active' | 'archived' | 'deleted'
  is_featured: boolean
  is_public: boolean
  
  // Engagement
  view_count: number
  like_count: number
  share_count: number
  
  // Timestamps
  published_at?: string
  created_at: string
  updated_at: string
  
  // Relations (when joined)
  category?: Category
  attributes?: ItemAttribute[]
  tags?: Tag[]
}

export interface ItemAttribute {
  id: string
  item_id: string
  key: string
  value?: string
  value_type: 'string' | 'number' | 'boolean' | 'date' | 'json' | 'url'
  display_order: number
  is_searchable: boolean
  created_at: string
}

export interface Tag {
  id: string
  user_id?: string
  name: string
  slug: string
  color?: string
  usage_count: number
  created_at: string
}

export interface Collection {
  id: string
  user_id: string
  name: string
  description?: string
  cover_image_url?: string
  is_public: boolean
  item_count: number
  created_at: string
  updated_at: string
  
  // Relations
  items?: Item[]
}

// ============================================
// DATA SOURCE & AGENT TYPES
// ============================================

export interface DataSource {
  id: string
  name: string
  slug: string
  description?: string
  source_type: 'api' | 'web_scrape' | 'file_upload' | 'manual' | 'webhook'
  
  base_url?: string
  api_key_env_var?: string
  headers: Record<string, string>
  
  fetch_endpoint?: string
  fetch_params: Record<string, any>
  rate_limit_per_minute: number
  
  field_mapping: Record<string, string>
  transform_script?: string
  
  is_active: boolean
  last_fetch_at?: string
  last_fetch_count: number
  total_items_fetched: number
  last_error?: string
  
  created_at: string
  updated_at: string
}

export interface Agent {
  id: string
  name: string
  slug: string
  description?: string
  agent_type: 'fetcher' | 'enricher' | 'quality_checker' | 'custom'
  
  config: Record<string, any>
  prompt_template?: string
  model_name: string
  
  is_active: boolean
  schedule_cron?: string
  last_run_at?: string
  next_run_at?: string
  
  total_runs: number
  successful_runs: number
  failed_runs: number
  items_processed: number
  
  created_at: string
  updated_at: string
}

export interface AgentRun {
  id: string
  agent_id: string
  
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  started_at: string
  completed_at?: string
  
  items_processed: number
  items_succeeded: number
  items_failed: number
  
  input_data?: Record<string, any>
  output_data?: Record<string, any>
  error_message?: string
  
  tokens_used: number
  cost_estimate: number
  
  created_at: string
}

export interface AgentTask {
  id: string
  agent_id: string
  item_id?: string
  
  task_type: string
  priority: number
  
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
  attempts: number
  max_attempts: number
  
  input_data?: Record<string, any>
  output_data?: Record<string, any>
  error_message?: string
  
  scheduled_at: string
  started_at?: string
  completed_at?: string
  
  created_at: string
}

// ============================================
// ANALYTICS & ENGAGEMENT TYPES
// ============================================

export interface PageView {
  id: string
  item_id?: string
  user_id?: string
  session_id?: string
  page_path?: string
  referrer?: string
  user_agent?: string
  created_at: string
}

export interface Favorite {
  user_id: string
  item_id: string
  created_at: string
}

export interface Comment {
  id: string
  item_id: string
  user_id: string
  parent_id?: string
  content: string
  is_edited: boolean
  is_deleted: boolean
  created_at: string
  updated_at: string
  
  // Relations
  user?: User
  replies?: Comment[]
}

// ============================================
// API RESPONSE TYPES
// ============================================

export interface ApiResponse<T> {
  data?: T
  error?: string
  message?: string
  timestamp?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  page_size: number
  has_more: boolean
}

export interface DashboardSummary {
  total_items: number
  items_by_status: Record<string, number>
  items_by_category: Record<string, number>
  recent_items: Item[]
  top_items: Item[]
  quality_overview: {
    average_score: number
    verified_count: number
    pending_enrichment: number
  }
  agent_activity: {
    last_24h_runs: number
    items_processed_today: number
    pending_tasks: number
  }
}

// ============================================
// SEARCH & FILTER TYPES
// ============================================

export interface SearchParams {
  query?: string
  category_id?: string
  tags?: string[]
  status?: Item['status']
  verification_status?: Item['verification_status']
  min_quality_score?: number
  sort_by?: 'created_at' | 'updated_at' | 'name' | 'quality_score' | 'view_count'
  sort_order?: 'asc' | 'desc'
  page?: number
  page_size?: number
}

export interface FilterOption {
  value: string
  label: string
  count?: number
}
