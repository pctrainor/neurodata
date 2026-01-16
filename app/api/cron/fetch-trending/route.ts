import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// This endpoint is called by Vercel Cron to fetch trending YouTube videos daily
// Configure in vercel.json: { "crons": [{ "path": "/api/cron/fetch-trending", "schedule": "0 6 * * *" }] }

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || ''

// YouTube video categories (for better organization)
const YOUTUBE_CATEGORIES: Record<string, string> = {
  '1': 'Film & Animation',
  '2': 'Autos & Vehicles', 
  '10': 'Music',
  '15': 'Pets & Animals',
  '17': 'Sports',
  '18': 'Short Movies',
  '19': 'Travel & Events',
  '20': 'Gaming',
  '21': 'Videoblogging',
  '22': 'People & Blogs',
  '23': 'Comedy',
  '24': 'Entertainment',
  '25': 'News & Politics',
  '26': 'Howto & Style',
  '27': 'Education',
  '28': 'Science & Technology',
  '29': 'Nonprofits & Activism',
  '30': 'Movies',
  '31': 'Anime/Animation',
  '32': 'Action/Adventure',
  '33': 'Classics',
  '34': 'Comedy',
  '35': 'Documentary',
  '36': 'Drama',
  '37': 'Family',
  '38': 'Foreign',
  '39': 'Horror',
  '40': 'Sci-Fi/Fantasy',
  '41': 'Thriller',
  '42': 'Shorts',
  '43': 'Shows',
  '44': 'Trailers',
}

interface YouTubeTrendingVideo {
  id: string
  snippet: {
    title: string
    channelTitle: string
    channelId: string
    description: string
    publishedAt: string
    categoryId: string
    thumbnails: {
      medium?: { url: string }
      high?: { url: string }
      maxres?: { url: string }
    }
    tags?: string[]
  }
  statistics: {
    viewCount: string
    likeCount: string
    commentCount: string
  }
}

async function fetchYouTubeTrending(regionCode: string = 'US', maxResults: number = 50): Promise<YouTubeTrendingVideo[]> {
  if (!YOUTUBE_API_KEY) {
    console.error('No YouTube API key configured')
    return []
  }

  const url = new URL('https://www.googleapis.com/youtube/v3/videos')
  url.searchParams.set('part', 'snippet,statistics')
  url.searchParams.set('chart', 'mostPopular')
  url.searchParams.set('regionCode', regionCode)
  url.searchParams.set('maxResults', maxResults.toString())
  url.searchParams.set('key', YOUTUBE_API_KEY)

  try {
    const response = await fetch(url.toString())
    
    if (!response.ok) {
      const error = await response.text()
      console.error('YouTube API error:', response.status, error)
      return []
    }
    
    const data = await response.json()
    return data.items || []
  } catch (error) {
    console.error('YouTube trending fetch error:', error)
    return []
  }
}

export async function GET(request: Request) {
  // Verify cron secret for security (Vercel sends this header)
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  
  // In development, allow without secret
  if (process.env.NODE_ENV === 'production' && cronSecret) {
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const startTime = Date.now()
  const results: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    status: 'running',
  }

  try {
    // Initialize Supabase admin client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Fetch trending videos from YouTube
    const trendingVideos = await fetchYouTubeTrending('US', 50)
    
    if (trendingVideos.length === 0) {
      results.status = 'no_videos_fetched'
      results.error = 'YouTube API returned no videos'
      return NextResponse.json(results, { status: 500 })
    }

    results.videosFetched = trendingVideos.length

    // Transform and insert into database
    const videosToInsert = trendingVideos.map((video, index) => ({
      video_id: video.id,
      title: video.snippet.title,
      channel_name: video.snippet.channelTitle,
      channel_id: video.snippet.channelId,
      description: video.snippet.description?.substring(0, 500) || '',
      thumbnail_url: video.snippet.thumbnails.maxres?.url 
        || video.snippet.thumbnails.high?.url 
        || video.snippet.thumbnails.medium?.url
        || '',
      view_count: parseInt(video.statistics.viewCount || '0', 10),
      like_count: parseInt(video.statistics.likeCount || '0', 10),
      comment_count: parseInt(video.statistics.commentCount || '0', 10),
      category: YOUTUBE_CATEGORIES[video.snippet.categoryId] || 'Entertainment',
      tags: video.snippet.tags?.slice(0, 10) || [],
      trending_rank: index + 1,
      region_code: 'US',
      published_at: video.snippet.publishedAt,
      fetched_at: new Date().toISOString(),
    }))

    // Upsert videos (update if already exists for today)
    const { data, error } = await supabase
      .from('trending_videos')
      .upsert(videosToInsert, {
        onConflict: 'video_id,fetched_at::date',
        ignoreDuplicates: false,
      })
      .select('id')

    if (error) {
      console.error('Database insert error:', error)
      results.status = 'database_error'
      results.error = error.message
      return NextResponse.json(results, { status: 500 })
    }

    // Cleanup old videos (older than 7 days)
    const { error: cleanupError } = await supabase
      .from('trending_videos')
      .delete()
      .lt('fetched_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())

    if (cleanupError) {
      console.warn('Cleanup warning:', cleanupError)
    }

    results.status = 'success'
    results.videosInserted = data?.length || videosToInsert.length
    results.executionTimeMs = Date.now() - startTime

    return NextResponse.json(results)
  } catch (error) {
    console.error('Cron job error:', error)
    results.status = 'error'
    results.error = error instanceof Error ? error.message : 'Unknown error'
    results.executionTimeMs = Date.now() - startTime
    return NextResponse.json(results, { status: 500 })
  }
}

// Also support POST for manual triggering
export async function POST(request: Request) {
  return GET(request)
}
