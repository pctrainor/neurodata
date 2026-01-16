import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Public API to get today's trending videos
// Used by the "Try With Trending Content" section

export const dynamic = 'force-dynamic'
export const revalidate = 3600 // Revalidate every hour

interface TrendingVideo {
  id: string
  video_id: string
  title: string
  channel_name: string
  thumbnail_url: string
  view_count: number
  category: string
  trending_rank: number
  url: string
}

// Fallback trending content if database is empty
const FALLBACK_TRENDING: TrendingVideo[] = [
  {
    id: 'fallback-1',
    video_id: 'dQw4w9WgXcQ',
    title: 'Rick Astley - Never Gonna Give You Up',
    channel_name: 'Rick Astley',
    thumbnail_url: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
    view_count: 1500000000,
    category: 'Music',
    trending_rank: 1,
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  },
  {
    id: 'fallback-2',
    video_id: 'jNQXAC9IVRw',
    title: 'Me at the zoo',
    channel_name: 'jawed',
    thumbnail_url: 'https://i.ytimg.com/vi/jNQXAC9IVRw/hqdefault.jpg',
    view_count: 300000000,
    category: 'People & Blogs',
    trending_rank: 2,
    url: 'https://www.youtube.com/watch?v=jNQXAC9IVRw',
  },
  {
    id: 'fallback-3',
    video_id: '9bZkp7q19f0',
    title: 'PSY - GANGNAM STYLE',
    channel_name: 'officialpsy',
    thumbnail_url: 'https://i.ytimg.com/vi/9bZkp7q19f0/hqdefault.jpg',
    view_count: 5000000000,
    category: 'Music',
    trending_rank: 3,
    url: 'https://www.youtube.com/watch?v=9bZkp7q19f0',
  },
]

function formatViewCount(count: number): string {
  if (count >= 1000000000) {
    return `${(count / 1000000000).toFixed(1)}B views`
  } else if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M views`
  } else if (count >= 1000) {
    return `${(count / 1000).toFixed(0)}K views`
  }
  return `${count} views`
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const limit = Math.min(parseInt(searchParams.get('limit') || '10', 10), 50)
  const category = searchParams.get('category') || null

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get today's trending videos
    let query = supabase
      .from('trending_videos')
      .select('id, video_id, title, channel_name, thumbnail_url, view_count, category, trending_rank')
      .gte('fetched_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString())
      .order('trending_rank', { ascending: true })
      .limit(limit)

    if (category) {
      query = query.eq('category', category)
    }

    const { data, error } = await query

    if (error) {
      console.error('Database error:', error)
      // Return fallback content
      return NextResponse.json({
        videos: FALLBACK_TRENDING.slice(0, limit).map(v => ({
          ...v,
          viewCountFormatted: formatViewCount(v.view_count),
        })),
        source: 'fallback',
        message: 'Using fallback content',
      })
    }

    if (!data || data.length === 0) {
      // Try yesterday's data as fallback
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      
      let yesterdayQuery = supabase
        .from('trending_videos')
        .select('id, video_id, title, channel_name, thumbnail_url, view_count, category, trending_rank')
        .gte('fetched_at', new Date(yesterday.setHours(0, 0, 0, 0)).toISOString())
        .lt('fetched_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString())
        .order('trending_rank', { ascending: true })
        .limit(limit)

      if (category) {
        yesterdayQuery = yesterdayQuery.eq('category', category)
      }

      const { data: yesterdayData } = await yesterdayQuery

      if (yesterdayData && yesterdayData.length > 0) {
        return NextResponse.json({
          videos: yesterdayData.map(v => ({
            ...v,
            url: `https://www.youtube.com/watch?v=${v.video_id}`,
            viewCountFormatted: formatViewCount(v.view_count),
          })),
          source: 'yesterday',
          count: yesterdayData.length,
        })
      }

      // Return static fallback
      return NextResponse.json({
        videos: FALLBACK_TRENDING.slice(0, limit).map(v => ({
          ...v,
          viewCountFormatted: formatViewCount(v.view_count),
        })),
        source: 'fallback',
        message: 'No trending data available, using fallback',
      })
    }

    // Return today's trending videos
    return NextResponse.json({
      videos: data.map(v => ({
        ...v,
        url: `https://www.youtube.com/watch?v=${v.video_id}`,
        viewCountFormatted: formatViewCount(v.view_count),
      })),
      source: 'database',
      count: data.length,
      fetchedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Trending videos API error:', error)
    return NextResponse.json({
      videos: FALLBACK_TRENDING.slice(0, limit).map(v => ({
        ...v,
        viewCountFormatted: formatViewCount(v.view_count),
      })),
      source: 'fallback',
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
