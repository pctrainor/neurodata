/**
 * Fetch Trending YouTube Videos - Build-time Script
 * 
 * This script runs during `npm run build` to fetch trending YouTube videos
 * and store them in Supabase. Data refreshes on each deployment.
 * 
 * Usage: npx tsx scripts/fetch-trending-videos.ts
 */

import { createClient } from '@supabase/supabase-js'

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

interface YouTubeVideo {
  id: string
  snippet: {
    title: string
    channelTitle: string
    channelId: string
    description: string
    thumbnails: {
      high?: { url: string }
      medium?: { url: string }
      default?: { url: string }
    }
    publishedAt: string
    categoryId: string
  }
  statistics?: {
    viewCount?: string
    likeCount?: string
    commentCount?: string
  }
}

interface YouTubeResponse {
  items: YouTubeVideo[]
}

// Map YouTube category IDs to our categories
const categoryMap: Record<string, string> = {
  '1': 'entertainment',
  '2': 'autos',
  '10': 'music',
  '15': 'pets',
  '17': 'sports',
  '18': 'short-movies',
  '19': 'travel',
  '20': 'gaming',
  '21': 'videoblogging',
  '22': 'people',
  '23': 'comedy',
  '24': 'entertainment',
  '25': 'news',
  '26': 'howto',
  '27': 'education',
  '28': 'science',
  '29': 'activism',
  '30': 'movies',
  '31': 'anime',
  '32': 'action',
  '33': 'classics',
  '34': 'comedy',
  '35': 'documentary',
  '36': 'drama',
  '37': 'family',
  '38': 'foreign',
  '39': 'horror',
  '40': 'scifi',
  '41': 'thriller',
  '42': 'shorts',
  '43': 'shows',
  '44': 'trailers',
}

async function fetchTrendingVideos(): Promise<void> {
  console.log('🎬 Fetching trending YouTube videos...')
  
  // Validate environment variables
  if (!YOUTUBE_API_KEY) {
    console.log('⚠️  YOUTUBE_API_KEY not set - skipping trending video fetch')
    console.log('   Set this in Vercel Environment Variables to enable trending videos')
    return
  }
  
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.log('⚠️  Supabase credentials not set - skipping trending video fetch')
    return
  }
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  
  try {
    // Fetch trending videos from YouTube
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&chart=mostPopular&regionCode=US&maxResults=50&key=${YOUTUBE_API_KEY}`
    )
    
    if (!response.ok) {
      const error = await response.text()
      console.error('❌ YouTube API error:', error)
      return
    }
    
    const data: YouTubeResponse = await response.json()
    
    if (!data.items || data.items.length === 0) {
      console.log('⚠️  No trending videos returned from YouTube')
      return
    }
    
    console.log(`📺 Found ${data.items.length} trending videos`)
    
    // Transform to our schema
    const videos = data.items.map((video, index) => ({
      video_id: video.id,
      title: video.snippet.title,
      channel_name: video.snippet.channelTitle,
      channel_id: video.snippet.channelId,
      description: video.snippet.description?.substring(0, 500) || '',
      thumbnail_url: video.snippet.thumbnails.high?.url || 
                     video.snippet.thumbnails.medium?.url || 
                     video.snippet.thumbnails.default?.url || '',
      view_count: parseInt(video.statistics?.viewCount || '0', 10),
      like_count: parseInt(video.statistics?.likeCount || '0', 10),
      comment_count: parseInt(video.statistics?.commentCount || '0', 10),
      category: categoryMap[video.snippet.categoryId] || 'general',
      trending_rank: index + 1,
      region_code: 'US',
      published_at: video.snippet.publishedAt,
      fetched_at: new Date().toISOString(),
    }))
    
    // Check if table exists by trying to query it
    const { error: tableCheckError } = await supabase
      .from('trending_videos')
      .select('id')
      .limit(1)
    
    if (tableCheckError && tableCheckError.code === '42P01') {
      console.log('⚠️  trending_videos table does not exist yet')
      console.log('   Run the migration in Supabase SQL Editor first')
      return
    }
    
    // Delete today's existing entries to avoid duplicates
    const today = new Date().toISOString().split('T')[0]
    const { error: deleteError } = await supabase
      .from('trending_videos')
      .delete()
      .gte('fetched_at', `${today}T00:00:00Z`)
      .lt('fetched_at', `${today}T23:59:59Z`)
    
    if (deleteError) {
      console.log('⚠️  Could not clear old entries:', deleteError.message)
    }
    
    // Insert new videos
    const { error: insertError } = await supabase
      .from('trending_videos')
      .insert(videos)
    
    if (insertError) {
      console.error('❌ Failed to insert videos:', insertError.message)
      return
    }
    
    console.log(`✅ Successfully stored ${videos.length} trending videos`)
    
  } catch (error) {
    console.error('❌ Error fetching trending videos:', error)
  }
}

// Run the script
fetchTrendingVideos()
  .then(() => {
    console.log('🏁 Trending video fetch complete')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
