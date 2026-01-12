-- Migration: Add tables for automated data sync and email digest
-- Run this in your Supabase SQL Editor

-- 1. Neuroscience News Table
-- Stores news items discovered by the daily sync
CREATE TABLE IF NOT EXISTS neuroscience_news (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL UNIQUE,
  summary TEXT,
  category TEXT,
  source TEXT,
  url TEXT,
  published_at DATE,
  discovered_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for querying recent news
CREATE INDEX IF NOT EXISTS idx_neuroscience_news_discovered 
ON neuroscience_news(discovered_at DESC);

-- 2. Sync Logs Table
-- Tracks automated sync operations
CREATE TABLE IF NOT EXISTS sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_type TEXT NOT NULL,
  results JSONB,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for querying sync history
CREATE INDEX IF NOT EXISTS idx_sync_logs_type_date 
ON sync_logs(sync_type, created_at DESC);

-- 3. Add columns to studies table for tracking discovery
ALTER TABLE studies 
ADD COLUMN IF NOT EXISTS discovered_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS discovery_source TEXT;

-- 4. Add email preferences to user_profiles
-- First check if user_profiles exists, if not create it
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  avatar_url TEXT,
  research_interests TEXT[],
  preferred_modalities TEXT[],
  institution TEXT,
  email_frequency TEXT DEFAULT 'weekly' CHECK (email_frequency IN ('weekly', 'daily', 'none')),
  email_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- If table exists, just add the columns
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS research_interests TEXT[],
ADD COLUMN IF NOT EXISTS preferred_modalities TEXT[],
ADD COLUMN IF NOT EXISTS email_frequency TEXT DEFAULT 'weekly',
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;

-- 5. Email Digest Tracking
-- Track which digests were sent to which users
CREATE TABLE IF NOT EXISTS email_digest_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  digest_type TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  email_content_hash TEXT,
  open_count INTEGER DEFAULT 0,
  click_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_digest_user 
ON email_digest_history(user_id, sent_at DESC);

-- 6. RLS Policies
ALTER TABLE neuroscience_news ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_digest_history ENABLE ROW LEVEL SECURITY;

-- News is public read
CREATE POLICY "Anyone can read news" ON neuroscience_news
FOR SELECT USING (true);

-- Only service role can insert/update news and sync_logs
CREATE POLICY "Service role can manage news" ON neuroscience_news
FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage sync_logs" ON sync_logs
FOR ALL USING (auth.role() = 'service_role');

-- Users can only see their own digest history
CREATE POLICY "Users see own digest history" ON email_digest_history
FOR SELECT USING (auth.uid() = user_id);

-- 7. Create function to get weekly digest stats
CREATE OR REPLACE FUNCTION get_weekly_digest_stats()
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'new_studies_this_week', (
      SELECT COUNT(*) FROM studies 
      WHERE created_at >= NOW() - INTERVAL '7 days'
    ),
    'new_news_this_week', (
      SELECT COUNT(*) FROM neuroscience_news 
      WHERE discovered_at >= NOW() - INTERVAL '7 days'
    ),
    'total_studies', (SELECT COUNT(*) FROM studies),
    'total_regions', (SELECT COUNT(*) FROM brain_regions),
    'total_datasets', (SELECT COUNT(*) FROM datasets)
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION get_weekly_digest_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION get_weekly_digest_stats() TO anon;

COMMENT ON TABLE neuroscience_news IS 'News items discovered by daily AI sync';
COMMENT ON TABLE sync_logs IS 'Log of automated sync operations';
COMMENT ON TABLE email_digest_history IS 'History of email digests sent to users';
