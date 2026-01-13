-- ============================================
-- PERSONALIZED SUGGESTIONS SYSTEM DDL
-- ============================================
-- This schema supports tailored prompts, workflow templates, and search suggestions
-- based on user onboarding preferences (background, interests, goals, experience level)
-- 
-- Run this in your Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. PROMPT TEMPLATES TABLE
-- ============================================
-- Master table of all available prompt templates that can be suggested to users
-- These are pre-written prompts that users can one-click to generate workflows

CREATE TABLE IF NOT EXISTS prompt_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Core content
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  prompt_text TEXT NOT NULL,  -- The actual prompt to send to AI wizard
  
  -- Categorization for matching
  category TEXT NOT NULL,  -- Primary category: 'content_creation', 'marketing', 'research', 'education', etc.
  subcategory TEXT,        -- More specific: 'youtube', 'tiktok', 'podcast', etc.
  
  -- Targeting arrays (for matching with user preferences)
  target_backgrounds TEXT[] DEFAULT '{}',      -- marketing, content_creator, business_owner, agency, student, researcher
  target_interests TEXT[] DEFAULT '{}',        -- tech_reviews, gaming, business, education, entertainment, etc.
  target_goals TEXT[] DEFAULT '{}',            -- grow_audience, increase_engagement, improve_quality, etc.
  target_experience_levels TEXT[] DEFAULT '{}', -- beginner, intermediate, advanced, expert
  
  -- Metadata
  icon TEXT DEFAULT 'sparkles',  -- Lucide icon name
  gradient TEXT DEFAULT 'from-indigo-500 to-purple-600',  -- Tailwind gradient classes
  difficulty TEXT DEFAULT 'beginner' CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  estimated_time TEXT DEFAULT '5-10 min',  -- Estimated time to complete workflow
  
  -- Engagement tracking
  use_count INTEGER DEFAULT 0,
  success_rate NUMERIC(3,2) DEFAULT 0.00,  -- 0.00 to 1.00
  avg_rating NUMERIC(2,1) DEFAULT 0.0,     -- 0.0 to 5.0
  
  -- Status
  is_featured BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  display_order INTEGER DEFAULT 100,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_prompt_templates_category ON prompt_templates(category);
CREATE INDEX IF NOT EXISTS idx_prompt_templates_backgrounds ON prompt_templates USING GIN(target_backgrounds);
CREATE INDEX IF NOT EXISTS idx_prompt_templates_interests ON prompt_templates USING GIN(target_interests);
CREATE INDEX IF NOT EXISTS idx_prompt_templates_goals ON prompt_templates USING GIN(target_goals);
CREATE INDEX IF NOT EXISTS idx_prompt_templates_featured ON prompt_templates(is_featured) WHERE is_featured = TRUE;
CREATE INDEX IF NOT EXISTS idx_prompt_templates_active ON prompt_templates(is_active) WHERE is_active = TRUE;

-- ============================================
-- 2. WORKFLOW TEMPLATES TABLE  
-- ============================================
-- Pre-built workflow configurations that can be instantly loaded

CREATE TABLE IF NOT EXISTS workflow_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Core content
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  
  -- Workflow configuration (JSON blob matching React Flow format)
  nodes JSONB NOT NULL DEFAULT '[]',
  edges JSONB NOT NULL DEFAULT '[]',
  viewport JSONB DEFAULT '{"x": 0, "y": 0, "zoom": 1}',
  
  -- Categorization
  category TEXT NOT NULL,
  subcategory TEXT,
  
  -- Targeting (same as prompt_templates)
  target_backgrounds TEXT[] DEFAULT '{}',
  target_interests TEXT[] DEFAULT '{}',
  target_goals TEXT[] DEFAULT '{}',
  target_experience_levels TEXT[] DEFAULT '{}',
  
  -- Metadata
  icon TEXT DEFAULT 'workflow',
  gradient TEXT DEFAULT 'from-blue-500 to-cyan-600',
  difficulty TEXT DEFAULT 'beginner' CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  node_count INTEGER DEFAULT 0,
  estimated_time TEXT DEFAULT '5-10 min',
  
  -- Preview
  thumbnail_url TEXT,
  preview_gif_url TEXT,
  
  -- Engagement
  use_count INTEGER DEFAULT 0,
  fork_count INTEGER DEFAULT 0,
  avg_rating NUMERIC(2,1) DEFAULT 0.0,
  
  -- Status
  is_featured BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  is_system BOOLEAN DEFAULT TRUE,  -- System templates vs user-created
  display_order INTEGER DEFAULT 100,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workflow_templates_category ON workflow_templates(category);
CREATE INDEX IF NOT EXISTS idx_workflow_templates_backgrounds ON workflow_templates USING GIN(target_backgrounds);
CREATE INDEX IF NOT EXISTS idx_workflow_templates_interests ON workflow_templates USING GIN(target_interests);

-- ============================================
-- 3. SEARCH SUGGESTIONS TABLE
-- ============================================
-- Pre-generated search/analysis suggestions tailored to user interests

CREATE TABLE IF NOT EXISTS search_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Core content
  title TEXT NOT NULL,
  description TEXT,
  search_query TEXT NOT NULL,  -- The actual search/URL to analyze
  search_type TEXT NOT NULL CHECK (search_type IN ('youtube_url', 'tiktok_url', 'article_url', 'topic_search', 'competitor_channel', 'hashtag')),
  
  -- Categorization
  category TEXT NOT NULL,
  subcategory TEXT,
  
  -- Targeting
  target_backgrounds TEXT[] DEFAULT '{}',
  target_interests TEXT[] DEFAULT '{}',
  target_goals TEXT[] DEFAULT '{}',
  
  -- Metadata
  icon TEXT DEFAULT 'search',
  platform TEXT,  -- youtube, tiktok, twitter, web, etc.
  content_type TEXT,  -- video, article, channel, hashtag, etc.
  
  -- Example content (for display purposes)
  example_thumbnail TEXT,
  example_creator TEXT,
  example_title TEXT,
  
  -- Engagement
  use_count INTEGER DEFAULT 0,
  conversion_rate NUMERIC(3,2) DEFAULT 0.00,  -- How often users actually use this suggestion
  
  -- Status
  is_trending BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  expires_at TIMESTAMPTZ,  -- For time-sensitive suggestions
  display_order INTEGER DEFAULT 100,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_search_suggestions_category ON search_suggestions(category);
CREATE INDEX IF NOT EXISTS idx_search_suggestions_type ON search_suggestions(search_type);
CREATE INDEX IF NOT EXISTS idx_search_suggestions_interests ON search_suggestions USING GIN(target_interests);
CREATE INDEX IF NOT EXISTS idx_search_suggestions_trending ON search_suggestions(is_trending) WHERE is_trending = TRUE;

-- ============================================
-- 4. USER PERSONALIZED SUGGESTIONS TABLE
-- ============================================
-- Stores the computed suggestions for each user after onboarding

CREATE TABLE IF NOT EXISTS user_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- User's onboarding data snapshot (for debugging/analytics)
  user_background TEXT,
  user_experience_level TEXT,
  user_interests TEXT[] DEFAULT '{}',
  user_goals TEXT[] DEFAULT '{}',
  
  -- Suggested content (ordered by relevance)
  suggested_prompts UUID[] DEFAULT '{}',      -- References to prompt_templates
  suggested_workflows UUID[] DEFAULT '{}',    -- References to workflow_templates
  suggested_searches UUID[] DEFAULT '{}',     -- References to search_suggestions
  
  -- Personalized prompt texts (AI-generated specifically for this user)
  custom_prompts JSONB DEFAULT '[]',  -- Array of {title, description, prompt_text, reason}
  
  -- Discovery content (YouTube videos, trending topics, etc.)
  discovery_content JSONB DEFAULT '[]',
  
  -- Engagement tracking
  prompts_used TEXT[] DEFAULT '{}',    -- Track which suggestions they've used
  workflows_used TEXT[] DEFAULT '{}',
  searches_used TEXT[] DEFAULT '{}',
  last_interaction_at TIMESTAMPTZ,
  
  -- Status
  is_stale BOOLEAN DEFAULT FALSE,  -- Mark as stale when user updates preferences
  generation_version INTEGER DEFAULT 1,
  
  -- Timestamps
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_suggestions_user ON user_suggestions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_suggestions_background ON user_suggestions(user_background);

-- ============================================
-- 5. SUGGESTION ANALYTICS TABLE
-- ============================================
-- Track engagement with suggestions for optimization

CREATE TABLE IF NOT EXISTS suggestion_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- What was interacted with
  suggestion_type TEXT NOT NULL CHECK (suggestion_type IN ('prompt', 'workflow', 'search', 'custom')),
  suggestion_id UUID,  -- Reference to the template
  suggestion_content TEXT,  -- Store the actual content for custom suggestions
  
  -- Interaction details
  action TEXT NOT NULL CHECK (action IN ('viewed', 'clicked', 'used', 'completed', 'rated', 'dismissed')),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  
  -- Context
  source_page TEXT,  -- Where the suggestion was shown
  user_background TEXT,
  user_interests TEXT[],
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_suggestion_analytics_user ON suggestion_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_suggestion_analytics_type ON suggestion_analytics(suggestion_type);
CREATE INDEX IF NOT EXISTS idx_suggestion_analytics_date ON suggestion_analytics(created_at DESC);

-- ============================================
-- 6. TRENDING TOPICS TABLE
-- ============================================
-- Store trending topics discovered by background jobs

CREATE TABLE IF NOT EXISTS trending_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Content
  topic TEXT NOT NULL,
  description TEXT,
  platform TEXT NOT NULL,  -- youtube, tiktok, twitter, general
  category TEXT NOT NULL,
  
  -- Metrics
  trend_score NUMERIC(5,2) DEFAULT 0.00,
  growth_rate NUMERIC(5,2) DEFAULT 0.00,  -- Percentage growth
  volume INTEGER DEFAULT 0,  -- Search volume, video count, etc.
  
  -- Related content
  related_keywords TEXT[] DEFAULT '{}',
  sample_content JSONB DEFAULT '[]',  -- Sample videos, articles, etc.
  
  -- Targeting
  target_interests TEXT[] DEFAULT '{}',
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  discovered_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trending_topics_platform ON trending_topics(platform);
CREATE INDEX IF NOT EXISTS idx_trending_topics_category ON trending_topics(category);
CREATE INDEX IF NOT EXISTS idx_trending_topics_score ON trending_topics(trend_score DESC);

-- ============================================
-- 7. ROW LEVEL SECURITY POLICIES
-- ============================================

ALTER TABLE prompt_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE suggestion_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE trending_topics ENABLE ROW LEVEL SECURITY;

-- Public templates are readable by everyone
CREATE POLICY "Anyone can read active prompt templates" ON prompt_templates
FOR SELECT USING (is_active = TRUE);

CREATE POLICY "Anyone can read active workflow templates" ON workflow_templates
FOR SELECT USING (is_active = TRUE);

CREATE POLICY "Anyone can read active search suggestions" ON search_suggestions
FOR SELECT USING (is_active = TRUE);

CREATE POLICY "Anyone can read trending topics" ON trending_topics
FOR SELECT USING (is_active = TRUE);

-- Users can only see their own suggestions
CREATE POLICY "Users can read own suggestions" ON user_suggestions
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own suggestions" ON user_suggestions
FOR UPDATE USING (auth.uid() = user_id);

-- Analytics - users can insert their own, service role can read all
CREATE POLICY "Users can insert own analytics" ON suggestion_analytics
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role manages analytics" ON suggestion_analytics
FOR ALL USING (auth.role() = 'service_role');

-- Service role can manage all tables
CREATE POLICY "Service role manages prompt templates" ON prompt_templates
FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role manages workflow templates" ON workflow_templates
FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role manages search suggestions" ON search_suggestions
FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role manages user suggestions" ON user_suggestions
FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role manages trending topics" ON trending_topics
FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- 8. HELPER FUNCTIONS
-- ============================================

-- Function to get personalized prompts for a user
CREATE OR REPLACE FUNCTION get_personalized_prompts(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  prompt_text TEXT,
  category TEXT,
  icon TEXT,
  gradient TEXT,
  difficulty TEXT,
  match_score NUMERIC
) AS $$
DECLARE
  v_background TEXT;
  v_interests TEXT[];
  v_goals TEXT[];
  v_experience TEXT;
BEGIN
  -- Get user's preferences
  SELECT 
    us.user_background,
    us.user_interests,
    us.user_goals,
    us.user_experience_level
  INTO v_background, v_interests, v_goals, v_experience
  FROM user_suggestions us
  WHERE us.user_id = p_user_id;

  RETURN QUERY
  SELECT 
    pt.id,
    pt.title,
    pt.description,
    pt.prompt_text,
    pt.category,
    pt.icon,
    pt.gradient,
    pt.difficulty,
    -- Calculate match score based on overlapping arrays
    (
      COALESCE(array_length(ARRAY(SELECT unnest(pt.target_backgrounds) INTERSECT SELECT v_background), 1), 0) * 3 +
      COALESCE(array_length(ARRAY(SELECT unnest(pt.target_interests) INTERSECT SELECT unnest(v_interests)), 1), 0) * 2 +
      COALESCE(array_length(ARRAY(SELECT unnest(pt.target_goals) INTERSECT SELECT unnest(v_goals)), 1), 0) * 2 +
      COALESCE(array_length(ARRAY(SELECT unnest(pt.target_experience_levels) INTERSECT SELECT v_experience), 1), 0) * 1 +
      CASE WHEN pt.is_featured THEN 2 ELSE 0 END
    )::NUMERIC AS match_score
  FROM prompt_templates pt
  WHERE pt.is_active = TRUE
  ORDER BY match_score DESC, pt.use_count DESC, pt.display_order ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate user suggestions after onboarding
CREATE OR REPLACE FUNCTION generate_user_suggestions(
  p_user_id UUID,
  p_background TEXT,
  p_experience_level TEXT,
  p_interests TEXT[],
  p_goals TEXT[]
)
RETURNS UUID AS $$
DECLARE
  v_suggestion_id UUID;
  v_prompt_ids UUID[];
  v_workflow_ids UUID[];
  v_search_ids UUID[];
BEGIN
  -- Get top matching prompts
  SELECT ARRAY_AGG(id ORDER BY match_score DESC)
  INTO v_prompt_ids
  FROM (
    SELECT pt.id,
      (
        COALESCE(array_length(ARRAY(SELECT unnest(pt.target_backgrounds) INTERSECT SELECT p_background), 1), 0) * 3 +
        COALESCE(array_length(ARRAY(SELECT unnest(pt.target_interests) INTERSECT SELECT unnest(p_interests)), 1), 0) * 2 +
        COALESCE(array_length(ARRAY(SELECT unnest(pt.target_goals) INTERSECT SELECT unnest(p_goals)), 1), 0) * 2
      ) AS match_score
    FROM prompt_templates pt
    WHERE pt.is_active = TRUE
    ORDER BY match_score DESC
    LIMIT 20
  ) sub;

  -- Get top matching workflows
  SELECT ARRAY_AGG(id ORDER BY match_score DESC)
  INTO v_workflow_ids
  FROM (
    SELECT wt.id,
      (
        COALESCE(array_length(ARRAY(SELECT unnest(wt.target_backgrounds) INTERSECT SELECT p_background), 1), 0) * 3 +
        COALESCE(array_length(ARRAY(SELECT unnest(wt.target_interests) INTERSECT SELECT unnest(p_interests)), 1), 0) * 2
      ) AS match_score
    FROM workflow_templates wt
    WHERE wt.is_active = TRUE
    ORDER BY match_score DESC
    LIMIT 10
  ) sub;

  -- Get top matching search suggestions
  SELECT ARRAY_AGG(id ORDER BY match_score DESC)
  INTO v_search_ids
  FROM (
    SELECT ss.id,
      (
        COALESCE(array_length(ARRAY(SELECT unnest(ss.target_backgrounds) INTERSECT SELECT p_background), 1), 0) * 3 +
        COALESCE(array_length(ARRAY(SELECT unnest(ss.target_interests) INTERSECT SELECT unnest(p_interests)), 1), 0) * 2
      ) AS match_score
    FROM search_suggestions ss
    WHERE ss.is_active = TRUE
    ORDER BY match_score DESC
    LIMIT 15
  ) sub;

  -- Insert or update user suggestions
  INSERT INTO user_suggestions (
    user_id,
    user_background,
    user_experience_level,
    user_interests,
    user_goals,
    suggested_prompts,
    suggested_workflows,
    suggested_searches,
    generated_at,
    updated_at
  )
  VALUES (
    p_user_id,
    p_background,
    p_experience_level,
    p_interests,
    p_goals,
    COALESCE(v_prompt_ids, '{}'),
    COALESCE(v_workflow_ids, '{}'),
    COALESCE(v_search_ids, '{}'),
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    user_background = EXCLUDED.user_background,
    user_experience_level = EXCLUDED.user_experience_level,
    user_interests = EXCLUDED.user_interests,
    user_goals = EXCLUDED.user_goals,
    suggested_prompts = EXCLUDED.suggested_prompts,
    suggested_workflows = EXCLUDED.suggested_workflows,
    suggested_searches = EXCLUDED.suggested_searches,
    is_stale = FALSE,
    generation_version = user_suggestions.generation_version + 1,
    updated_at = NOW()
  RETURNING id INTO v_suggestion_id;

  RETURN v_suggestion_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_personalized_prompts(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION generate_user_suggestions(UUID, TEXT, TEXT, TEXT[], TEXT[]) TO authenticated;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE prompt_templates IS 'Master library of AI wizard prompt templates that can be suggested based on user preferences';
COMMENT ON TABLE workflow_templates IS 'Pre-built workflow configurations that can be instantly loaded for different use cases';
COMMENT ON TABLE search_suggestions IS 'Suggested content URLs and search queries tailored to user interests';
COMMENT ON TABLE user_suggestions IS 'Computed personalized suggestions for each user based on their onboarding preferences';
COMMENT ON TABLE suggestion_analytics IS 'Analytics tracking for suggestion engagement and optimization';
COMMENT ON TABLE trending_topics IS 'Trending topics discovered by background jobs for timely suggestions';

COMMENT ON FUNCTION get_personalized_prompts IS 'Returns prompts ranked by relevance to user preferences';
COMMENT ON FUNCTION generate_user_suggestions IS 'Generates and stores personalized suggestions after user completes onboarding';
