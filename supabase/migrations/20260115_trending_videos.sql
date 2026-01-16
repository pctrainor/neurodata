-- Migration: Create trending_videos table
-- This table stores daily trending YouTube videos fetched by cron job

CREATE TABLE IF NOT EXISTS trending_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Video metadata
  video_id TEXT NOT NULL,
  title TEXT NOT NULL,
  channel_name TEXT NOT NULL,
  channel_id TEXT,
  description TEXT,
  thumbnail_url TEXT,
  
  -- Stats (at time of fetch)
  view_count BIGINT DEFAULT 0,
  like_count BIGINT DEFAULT 0,
  comment_count BIGINT DEFAULT 0,
  
  -- Categorization
  category TEXT DEFAULT 'general',
  tags TEXT[] DEFAULT '{}',
  
  -- Trending data
  trending_rank INTEGER, -- Position in trending list (1-50)
  region_code TEXT DEFAULT 'US',
  
  -- Timestamps
  published_at TIMESTAMPTZ,
  fetched_at TIMESTAMPTZ DEFAULT NOW(),
  -- Generated column for date-based uniqueness (stored, not virtual)
  fetched_date DATE GENERATED ALWAYS AS ((fetched_at AT TIME ZONE 'UTC')::date) STORED
);

-- Create unique index on (video_id, fetched_date) for one entry per video per day
CREATE UNIQUE INDEX IF NOT EXISTS idx_trending_videos_video_date 
  ON trending_videos (video_id, fetched_date);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_trending_videos_fetched_at ON trending_videos(fetched_at DESC);
CREATE INDEX IF NOT EXISTS idx_trending_videos_category ON trending_videos(category);
CREATE INDEX IF NOT EXISTS idx_trending_videos_region ON trending_videos(region_code);
CREATE INDEX IF NOT EXISTS idx_trending_videos_rank ON trending_videos(trending_rank);

-- Function to get today's trending videos
CREATE OR REPLACE FUNCTION get_todays_trending_videos(
  p_limit INTEGER DEFAULT 10,
  p_category TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  video_id TEXT,
  title TEXT,
  channel_name TEXT,
  thumbnail_url TEXT,
  view_count BIGINT,
  category TEXT,
  trending_rank INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    tv.id,
    tv.video_id,
    tv.title,
    tv.channel_name,
    tv.thumbnail_url,
    tv.view_count,
    tv.category,
    tv.trending_rank
  FROM trending_videos tv
  WHERE tv.fetched_date = CURRENT_DATE
    AND (p_category IS NULL OR tv.category = p_category)
  ORDER BY tv.trending_rank ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- RLS policies
ALTER TABLE trending_videos ENABLE ROW LEVEL SECURITY;

-- Anyone can read trending videos (public data)
DROP POLICY IF EXISTS "Anyone can view trending videos" ON trending_videos;
CREATE POLICY "Anyone can view trending videos"
  ON trending_videos
  FOR SELECT
  USING (true);

-- Only service role can insert/update (via cron job)
DROP POLICY IF EXISTS "Service role can manage trending videos" ON trending_videos;
CREATE POLICY "Service role can manage trending videos"
  ON trending_videos
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Cleanup old data (keep 7 days)
CREATE OR REPLACE FUNCTION cleanup_old_trending_videos()
RETURNS void AS $$
BEGIN
  DELETE FROM trending_videos
  WHERE fetched_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;
