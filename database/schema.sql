-- ============================================================================
-- DATA PLATFORM TEMPLATE - GENERIC DATABASE SCHEMA
-- ============================================================================
-- This schema is designed to be flexible and work with any data domain.
-- Run this SQL in your Supabase SQL Editor to set up the database.
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- USERS & AUTHENTICATION
-- ============================================================================

-- User profiles (extends Supabase auth.users)
CREATE TABLE public.users (
  id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  full_name text,
  avatar_url text,
  subscription_tier text DEFAULT 'free' CHECK (subscription_tier IN ('free', 'researcher', 'clinical')),
  subscription_status text DEFAULT 'active',
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (id)
);

-- User settings/preferences
CREATE TABLE public.user_settings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  timezone text DEFAULT 'America/Chicago',
  theme text DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
  compact_view boolean DEFAULT false,
  notifications_enabled boolean DEFAULT true,
  email_digest text DEFAULT 'weekly' CHECK (email_digest IN ('none', 'daily', 'weekly', 'monthly')),
  onboarding_completed boolean DEFAULT false,
  preferences jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================================
-- CORE DATA ENTITIES
-- ============================================================================

-- Categories for organizing data items
CREATE TABLE public.categories (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  icon text,
  color text,
  parent_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  display_order integer DEFAULT 0,
  is_system boolean DEFAULT false,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, slug)
);

-- Main data items table - flexible structure for any domain
CREATE TABLE public.items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  
  -- Core fields
  name text NOT NULL,
  slug text,
  description text,
  summary text,
  
  -- Flexible data storage
  data jsonb DEFAULT '{}',
  
  -- Media
  image_url text,
  thumbnail_url text,
  images jsonb DEFAULT '[]',
  
  -- Source tracking
  source_url text,
  source_name text,
  source_id text,
  
  -- AI enrichment
  ai_summary text,
  ai_tags text[],
  ai_metadata jsonb DEFAULT '{}',
  enrichment_status text DEFAULT 'pending' CHECK (enrichment_status IN ('pending', 'processing', 'completed', 'failed', 'skipped')),
  enriched_at timestamptz,
  
  -- Quality metrics
  quality_score integer DEFAULT 0 CHECK (quality_score >= 0 AND quality_score <= 100),
  completeness_score integer DEFAULT 0 CHECK (completeness_score >= 0 AND completeness_score <= 100),
  verification_status text DEFAULT 'unverified' CHECK (verification_status IN ('unverified', 'verified', 'disputed', 'outdated')),
  verified_at timestamptz,
  verified_by uuid REFERENCES auth.users(id),
  
  -- Status
  status text DEFAULT 'active' CHECK (status IN ('draft', 'active', 'archived', 'deleted')),
  is_featured boolean DEFAULT false,
  is_public boolean DEFAULT true,
  
  -- Engagement
  view_count integer DEFAULT 0,
  like_count integer DEFAULT 0,
  share_count integer DEFAULT 0,
  
  -- Timestamps
  published_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Full-text search
  search_vector tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(summary, '')), 'C')
  ) STORED
);

-- Create index for full-text search
CREATE INDEX items_search_idx ON public.items USING GIN (search_vector);
CREATE INDEX items_category_idx ON public.items(category_id);
CREATE INDEX items_status_idx ON public.items(status);
CREATE INDEX items_user_idx ON public.items(user_id);

-- Item attributes - key-value pairs for flexible attributes
CREATE TABLE public.item_attributes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id uuid NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  key text NOT NULL,
  value text,
  value_type text DEFAULT 'string' CHECK (value_type IN ('string', 'number', 'boolean', 'date', 'json', 'url')),
  display_order integer DEFAULT 0,
  is_searchable boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(item_id, key)
);

CREATE INDEX item_attributes_item_idx ON public.item_attributes(item_id);
CREATE INDEX item_attributes_key_idx ON public.item_attributes(key);

-- Tags for items
CREATE TABLE public.tags (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  color text,
  usage_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, slug)
);

-- Item-Tag relationship
CREATE TABLE public.item_tags (
  item_id uuid NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (item_id, tag_id)
);

-- ============================================================================
-- COLLECTIONS & LISTS
-- ============================================================================

-- User-created collections of items
CREATE TABLE public.collections (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  cover_image_url text,
  is_public boolean DEFAULT false,
  item_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Collection items
CREATE TABLE public.collection_items (
  collection_id uuid NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  display_order integer DEFAULT 0,
  notes text,
  added_at timestamptz DEFAULT now(),
  PRIMARY KEY (collection_id, item_id)
);

-- ============================================================================
-- DATA SOURCES & INGESTION
-- ============================================================================

-- External data sources configuration
CREATE TABLE public.data_sources (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  source_type text NOT NULL CHECK (source_type IN ('api', 'web_scrape', 'file_upload', 'manual', 'webhook')),
  
  -- API configuration
  base_url text,
  api_key_env_var text,
  headers jsonb DEFAULT '{}',
  
  -- Fetch configuration
  fetch_endpoint text,
  fetch_params jsonb DEFAULT '{}',
  rate_limit_per_minute integer DEFAULT 60,
  
  -- Mapping configuration (how to map source data to items)
  field_mapping jsonb DEFAULT '{}',
  transform_script text,
  
  -- Status
  is_active boolean DEFAULT true,
  last_fetch_at timestamptz,
  last_fetch_count integer DEFAULT 0,
  total_items_fetched integer DEFAULT 0,
  last_error text,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Data import logs
CREATE TABLE public.import_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  data_source_id uuid REFERENCES public.data_sources(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  
  status text NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  
  items_fetched integer DEFAULT 0,
  items_created integer DEFAULT 0,
  items_updated integer DEFAULT 0,
  items_skipped integer DEFAULT 0,
  items_failed integer DEFAULT 0,
  
  error_message text,
  error_details jsonb,
  
  created_at timestamptz DEFAULT now()
);

-- ============================================================================
-- AI AGENT SYSTEM
-- ============================================================================

-- Agent configurations
CREATE TABLE public.agents (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  agent_type text NOT NULL CHECK (agent_type IN ('fetcher', 'enricher', 'quality_checker', 'custom')),
  
  -- Configuration
  config jsonb DEFAULT '{}',
  prompt_template text,
  model_name text DEFAULT 'gemini-2.0-flash',
  
  -- Scheduling
  is_active boolean DEFAULT true,
  schedule_cron text,
  last_run_at timestamptz,
  next_run_at timestamptz,
  
  -- Stats
  total_runs integer DEFAULT 0,
  successful_runs integer DEFAULT 0,
  failed_runs integer DEFAULT 0,
  items_processed integer DEFAULT 0,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Agent run history
CREATE TABLE public.agent_runs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id uuid NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  
  status text NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  
  items_processed integer DEFAULT 0,
  items_succeeded integer DEFAULT 0,
  items_failed integer DEFAULT 0,
  
  input_data jsonb,
  output_data jsonb,
  error_message text,
  
  tokens_used integer DEFAULT 0,
  cost_estimate numeric(10, 6) DEFAULT 0,
  
  created_at timestamptz DEFAULT now()
);

-- Agent task queue
CREATE TABLE public.agent_tasks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id uuid NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  item_id uuid REFERENCES public.items(id) ON DELETE CASCADE,
  
  task_type text NOT NULL,
  priority integer DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
  
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  attempts integer DEFAULT 0,
  max_attempts integer DEFAULT 3,
  
  input_data jsonb,
  output_data jsonb,
  error_message text,
  
  scheduled_at timestamptz DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz,
  
  created_at timestamptz DEFAULT now()
);

CREATE INDEX agent_tasks_status_idx ON public.agent_tasks(status, priority, scheduled_at);
CREATE INDEX agent_tasks_agent_idx ON public.agent_tasks(agent_id);

-- ============================================================================
-- ANALYTICS & ENGAGEMENT
-- ============================================================================

-- Page/item views
CREATE TABLE public.views (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id uuid REFERENCES public.items(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id text,
  page_path text,
  referrer text,
  user_agent text,
  ip_hash text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX views_item_idx ON public.views(item_id);
CREATE INDEX views_created_idx ON public.views(created_at);

-- User favorites/bookmarks
CREATE TABLE public.favorites (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, item_id)
);

-- Comments
CREATE TABLE public.comments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id uuid NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES public.comments(id) ON DELETE CASCADE,
  content text NOT NULL,
  is_edited boolean DEFAULT false,
  is_deleted boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX comments_item_idx ON public.comments(item_id);

-- ============================================================================
-- ADMIN & SYSTEM
-- ============================================================================

-- Admin settings
CREATE TABLE public.admin_settings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  key text NOT NULL UNIQUE,
  value jsonb NOT NULL,
  description text,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- System logs
CREATE TABLE public.system_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  level text NOT NULL CHECK (level IN ('debug', 'info', 'warn', 'error')),
  category text,
  message text NOT NULL,
  metadata jsonb DEFAULT '{}',
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX system_logs_level_idx ON public.system_logs(level);
CREATE INDEX system_logs_created_idx ON public.system_logs(created_at);

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_attributes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.views ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- User settings policies
CREATE POLICY "Users can manage own settings" ON public.user_settings
  FOR ALL USING (auth.uid() = user_id);

-- Categories policies (system categories visible to all, user categories to owner)
CREATE POLICY "Categories viewable by owner or if system" ON public.categories
  FOR SELECT USING (user_id IS NULL OR auth.uid() = user_id);
CREATE POLICY "Users can manage own categories" ON public.categories
  FOR ALL USING (auth.uid() = user_id);

-- Items policies
CREATE POLICY "Public items viewable by all" ON public.items
  FOR SELECT USING (is_public = true AND status = 'active');
CREATE POLICY "Users can view own items" ON public.items
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own items" ON public.items
  FOR ALL USING (auth.uid() = user_id);

-- Item attributes follow item permissions
CREATE POLICY "Attributes follow item access" ON public.item_attributes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.items 
      WHERE items.id = item_id 
      AND (items.is_public = true OR items.user_id = auth.uid())
    )
  );
CREATE POLICY "Users can manage own item attributes" ON public.item_attributes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.items 
      WHERE items.id = item_id 
      AND items.user_id = auth.uid()
    )
  );

-- Tags policies
CREATE POLICY "Users can view and manage own tags" ON public.tags
  FOR ALL USING (user_id IS NULL OR auth.uid() = user_id);

-- Collections policies
CREATE POLICY "Public collections viewable by all" ON public.collections
  FOR SELECT USING (is_public = true OR auth.uid() = user_id);
CREATE POLICY "Users can manage own collections" ON public.collections
  FOR ALL USING (auth.uid() = user_id);

-- Favorites policies
CREATE POLICY "Users can manage own favorites" ON public.favorites
  FOR ALL USING (auth.uid() = user_id);

-- Comments policies
CREATE POLICY "Comments viewable on public items" ON public.comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.items 
      WHERE items.id = item_id 
      AND (items.is_public = true OR items.user_id = auth.uid())
    )
  );
CREATE POLICY "Users can create comments" ON public.comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own comments" ON public.comments
  FOR UPDATE USING (auth.uid() = user_id);

-- Views - anyone can insert, no select for regular users
CREATE POLICY "Anyone can create views" ON public.views
  FOR INSERT WITH CHECK (true);

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to all relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON public.user_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_items_updated_at BEFORE UPDATE ON public.items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_collections_updated_at BEFORE UPDATE ON public.collections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON public.comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_data_sources_updated_at BEFORE UPDATE ON public.data_sources
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON public.agents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  
  INSERT INTO public.user_settings (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update collection item count
CREATE OR REPLACE FUNCTION update_collection_item_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.collections SET item_count = item_count + 1 WHERE id = NEW.collection_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.collections SET item_count = item_count - 1 WHERE id = OLD.collection_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_collection_count
  AFTER INSERT OR DELETE ON public.collection_items
  FOR EACH ROW EXECUTE FUNCTION update_collection_item_count();

-- Function to update item view count
CREATE OR REPLACE FUNCTION increment_view_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.item_id IS NOT NULL THEN
    UPDATE public.items SET view_count = view_count + 1 WHERE id = NEW.item_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER increment_views
  AFTER INSERT ON public.views
  FOR EACH ROW EXECUTE FUNCTION increment_view_count();

-- ============================================================================
-- SEED DATA - DEFAULT CATEGORIES AND AGENTS
-- ============================================================================

-- Insert default agents
INSERT INTO public.agents (name, slug, description, agent_type, config, prompt_template) VALUES
('Data Fetcher', 'data-fetcher', 'Fetches data from configured external sources', 'fetcher', '{"batch_size": 100}', NULL),
('Data Enricher', 'data-enricher', 'Enriches items with AI-generated summaries and tags', 'enricher', '{"batch_size": 10}', 
'Analyze the following item and provide:
1. A concise summary (2-3 sentences)
2. 5-10 relevant tags
3. A quality score from 0-100 based on completeness and accuracy

Item: {{item}}'),
('Quality Checker', 'quality-checker', 'Validates data quality and flags issues', 'quality_checker', '{"batch_size": 50}', 
'Review the following item for quality issues:
1. Check for missing required fields
2. Identify any inconsistencies
3. Flag potential errors or outdated information

Item: {{item}}');



-- =========================================================================
-- WORKFLOW NODE RESULTS (Per-node persistent results for workflows)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.workflow_node_results (
  id SERIAL PRIMARY KEY,
  workflow_execution_id UUID NOT NULL,
  node_id VARCHAR(64) NOT NULL,
  node_name VARCHAR(128) NOT NULL,
  result JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workflow_node_results_execution_id ON public.workflow_node_results(workflow_execution_id);
CREATE INDEX IF NOT EXISTS idx_workflow_node_results_node_id ON public.workflow_node_results(node_id);
