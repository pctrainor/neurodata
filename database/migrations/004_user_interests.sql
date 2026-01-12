-- ============================================================================
-- USER INTERESTS & CONTENT PREFERENCES
-- Migration 004: Add user interests for personalized content discovery
-- ============================================================================

-- User interests for content discovery and personalization
CREATE TABLE IF NOT EXISTS public.user_interests (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Background & Experience
  background text CHECK (background IN (
    'marketing', 'content_creator', 'business_owner', 'student', 
    'researcher', 'agency', 'freelancer', 'other'
  )),
  experience_level text CHECK (experience_level IN (
    'beginner', 'intermediate', 'advanced', 'expert'
  )),
  
  -- Content Focus Areas
  content_interests text[] DEFAULT '{}',
  -- Options: 'tech_reviews', 'gaming', 'business', 'education', 'entertainment',
  --          'sports', 'music', 'lifestyle', 'news', 'science', 'health',
  --          'food', 'travel', 'fashion', 'finance', 'marketing', 'vlogs'
  
  -- Platform Preferences
  platforms text[] DEFAULT '{}',
  -- Options: 'youtube', 'tiktok', 'instagram', 'twitter', 'linkedin'
  
  -- Content Goals
  content_goals text[] DEFAULT '{}',
  -- Options: 'grow_audience', 'increase_engagement', 'improve_quality',
  --          'learn_trends', 'competitor_analysis', 'monetization'
  
  -- Demo preferences
  demo_video_url text,
  demo_completed boolean DEFAULT false,
  demo_completed_at timestamptz,
  
  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add column to user_settings for storing last recommended video
ALTER TABLE public.user_settings 
ADD COLUMN IF NOT EXISTS last_recommended_video jsonb DEFAULT NULL;

-- Enable RLS
ALTER TABLE public.user_interests ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can read own interests" ON public.user_interests;
DROP POLICY IF EXISTS "Users can insert own interests" ON public.user_interests;
DROP POLICY IF EXISTS "Users can update own interests" ON public.user_interests;

-- RLS Policies
CREATE POLICY "Users can read own interests" ON public.user_interests
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own interests" ON public.user_interests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own interests" ON public.user_interests
  FOR UPDATE USING (auth.uid() = user_id);

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_user_interests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_user_interests_updated_at ON public.user_interests;
CREATE TRIGGER update_user_interests_updated_at
  BEFORE UPDATE ON public.user_interests
  FOR EACH ROW EXECUTE FUNCTION update_user_interests_updated_at();

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_interests_user_id ON public.user_interests(user_id);

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE public.user_interests IS 'Stores user content interests for personalized video discovery during onboarding';
COMMENT ON COLUMN public.user_interests.background IS 'User professional background (marketing, creator, etc)';
COMMENT ON COLUMN public.user_interests.experience_level IS 'Content creation experience level';
COMMENT ON COLUMN public.user_interests.content_interests IS 'Array of content categories user is interested in';
COMMENT ON COLUMN public.user_interests.demo_video_url IS 'YouTube URL discovered for user demo based on their interests';
