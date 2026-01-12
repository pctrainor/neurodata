import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { GoogleGenerativeAI } from '@google/generative-ai'

// Support both env variable names for backward compatibility
const geminiApiKey = process.env.GOOGLE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || ''
const genAI = geminiApiKey ? new GoogleGenerativeAI(geminiApiKey) : null

// YouTube Data API key
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || process.env.GOOGLE_GEMINI_API_KEY || ''

interface DiscoverRequest {
  background: string
  experience_level: string
  content_interests: string[]
  platforms: string[]
  content_goals: string[]
}

interface VideoSuggestion {
  title: string
  creator: string
  url: string
  thumbnailUrl?: string
  viewCount?: string
  reason: string
  category: string
  videoId: string
}

interface YouTubeSearchResult {
  id: { videoId: string }
  snippet: {
    title: string
    channelTitle: string
    description: string
    thumbnails: {
      medium?: { url: string }
      high?: { url: string }
    }
  }
}

interface YouTubeVideoStats {
  id: string
  statistics: {
    viewCount: string
    likeCount: string
  }
}

// Map content interests to YouTube search queries
const INTEREST_QUERIES: Record<string, string[]> = {
  tech_reviews: ['tech review 2025', 'best gadgets review', 'smartphone review'],
  gaming: ['gaming highlights', 'best games 2025', 'gameplay walkthrough'],
  business: ['business tips', 'entrepreneurship', 'startup advice'],
  education: ['learn online', 'educational content', 'how to tutorial'],
  entertainment: ['viral video', 'trending entertainment', 'comedy sketch'],
  sports: ['sports highlights', 'best plays', 'athlete training'],
  music: ['music video', 'song cover', 'music production'],
  lifestyle: ['lifestyle vlog', 'day in my life', 'productivity tips'],
  news: ['news analysis', 'current events', 'documentary'],
  science: ['science explained', 'scientific discovery', 'space exploration'],
  finance: ['personal finance', 'investing tips', 'money management'],
  travel: ['travel vlog', 'destination guide', 'travel tips'],
}

// Reasons based on goals
const GOAL_REASONS: Record<string, string> = {
  grow_audience: 'This video exemplifies excellent audience growth strategies with compelling hooks and shareable content.',
  increase_engagement: 'Notice the high engagement tactics - strong CTAs, community interaction, and conversation starters.',
  improve_quality: 'Study the production value, editing style, and visual storytelling techniques used here.',
  learn_trends: 'This represents current trending formats and topics that are resonating with audiences.',
  competitor_analysis: 'Analyze how top creators in this niche structure their content and engage viewers.',
  monetization: 'This creator demonstrates effective monetization strategies while maintaining viewer trust.',
}

async function searchYouTubeVideos(query: string, maxResults: number = 5): Promise<YouTubeSearchResult[]> {
  if (!YOUTUBE_API_KEY) {
    console.error('No YouTube API key configured')
    return []
  }

  const url = new URL('https://www.googleapis.com/youtube/v3/search')
  url.searchParams.set('part', 'snippet')
  url.searchParams.set('q', query)
  url.searchParams.set('type', 'video')
  url.searchParams.set('order', 'viewCount')
  url.searchParams.set('maxResults', maxResults.toString())
  url.searchParams.set('videoDuration', 'medium')
  url.searchParams.set('relevanceLanguage', 'en')
  url.searchParams.set('safeSearch', 'moderate')
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
    console.error('YouTube search error:', error)
    return []
  }
}

async function getVideoStats(videoIds: string[]): Promise<Map<string, YouTubeVideoStats>> {
  if (!YOUTUBE_API_KEY || videoIds.length === 0) {
    return new Map()
  }

  const url = new URL('https://www.googleapis.com/youtube/v3/videos')
  url.searchParams.set('part', 'statistics')
  url.searchParams.set('id', videoIds.join(','))
  url.searchParams.set('key', YOUTUBE_API_KEY)

  try {
    const response = await fetch(url.toString())
    if (!response.ok) {
      return new Map()
    }
    const data = await response.json()
    const statsMap = new Map<string, YouTubeVideoStats>()
    for (const item of data.items || []) {
      statsMap.set(item.id, item)
    }
    return statsMap
  } catch (error) {
    console.error('YouTube stats error:', error)
    return new Map()
  }
}

function formatViewCount(count: string): string {
  const num = parseInt(count, 10)
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M views`
  } else if (num >= 1000) {
    return `${(num / 1000).toFixed(0)}K views`
  }
  return `${num} views`
}

async function discoverWithYouTubeAPI(
  content_interests: string[],
  content_goals: string[]
): Promise<VideoSuggestion[]> {
  const queries: string[] = []
  for (const interest of content_interests) {
    const interestQueries = INTEREST_QUERIES[interest]
    if (interestQueries) {
      queries.push(interestQueries[Math.floor(Math.random() * interestQueries.length)])
    }
  }

  if (queries.length === 0) {
    queries.push('trending video 2025', 'viral content', 'popular creator')
  }

  const allResults: { result: YouTubeSearchResult; category: string }[] = []
  
  for (let i = 0; i < Math.min(queries.length, 3); i++) {
    const query = queries[i]
    const category = content_interests[i] || 'entertainment'
    const results = await searchYouTubeVideos(query, 3)
    
    for (const result of results) {
      allResults.push({ result, category })
    }
  }

  if (allResults.length === 0) {
    return []
  }

  const videoIds = allResults.map(r => r.result.id.videoId)
  const statsMap = await getVideoStats(videoIds)

  const suggestions: VideoSuggestion[] = []
  const seenCreators = new Set<string>()

  for (const { result, category } of allResults) {
    if (seenCreators.has(result.snippet.channelTitle)) {
      continue
    }
    seenCreators.add(result.snippet.channelTitle)

    const stats = statsMap.get(result.id.videoId)
    const primaryGoal = content_goals[0] || 'learn_trends'
    
    suggestions.push({
      title: result.snippet.title,
      creator: result.snippet.channelTitle,
      url: `https://www.youtube.com/watch?v=${result.id.videoId}`,
      thumbnailUrl: result.snippet.thumbnails.medium?.url || result.snippet.thumbnails.high?.url,
      viewCount: stats ? formatViewCount(stats.statistics.viewCount) : undefined,
      reason: GOAL_REASONS[primaryGoal] || GOAL_REASONS.learn_trends,
      category,
      videoId: result.id.videoId,
    })

    if (suggestions.length >= 3) {
      break
    }
  }

  return suggestions
}

async function discoverWithGemini(
  background: string,
  experience_level: string,
  content_interests: string[],
  content_goals: string[]
): Promise<VideoSuggestion[]> {
  if (!genAI) {
    return []
  }

  const interestsText = content_interests.length > 0 
    ? content_interests.map(i => i.replace(/_/g, ' ')).join(', ')
    : 'general content'
  
  const goalsText = content_goals.length > 0
    ? content_goals.map(g => g.replace(/_/g, ' ')).join(', ')
    : 'content improvement'

  const prompt = `You are a content discovery assistant. Suggest 3 REAL YouTube videos for content strategy analysis.

User Profile:
- Background: ${background?.replace(/_/g, ' ') || 'content creator'}
- Experience Level: ${experience_level?.replace(/_/g, ' ') || 'intermediate'}
- Content Interests: ${interestsText}
- Goals: ${goalsText}

Return valid JSON array only:
[{"title": "Title", "creator": "Channel", "url": "https://www.youtube.com/results?search_query=...", "reason": "Why analyze this", "category": "interest_id", "videoId": ""}]`

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })
    const result = await model.generateContent(prompt)
    const response = result.response.text()
    
    let jsonStr = response.trim()
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '')
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/```\n?/g, '')
    }
    
    return JSON.parse(jsonStr)
  } catch (error) {
    console.error('Gemini discovery error:', error)
    return []
  }
}

function getDefaultSuggestions(interests: string[]): VideoSuggestion[] {
  const defaultVideos: Record<string, VideoSuggestion> = {
    tech_reviews: {
      title: "iPhone 16 Pro Max Review: The Real Story",
      creator: "MKBHD",
      url: "https://www.youtube.com/results?search_query=mkbhd+iphone+16+pro+max+review",
      reason: "Marques Brownlee sets the gold standard for tech reviews with cinematic quality",
      category: "tech_reviews",
      videoId: ""
    },
    gaming: {
      title: "I Spent 100 Days in Minecraft Hardcore",
      creator: "Luke TheNotable",
      url: "https://www.youtube.com/results?search_query=luke+thenotable+100+days+minecraft",
      reason: "The '100 days' format created an entirely new genre of gaming content",
      category: "gaming",
      videoId: ""
    },
    business: {
      title: "$100M Offers: How to Make Irresistible Offers",
      creator: "Alex Hormozi",
      url: "https://www.youtube.com/results?search_query=alex+hormozi+100m+offers",
      reason: "Direct, value-packed business content that converts viewers into fans",
      category: "business",
      videoId: ""
    },
    entertainment: {
      title: "I Gave My 100,000,000th Subscriber An Island",
      creator: "MrBeast",
      url: "https://www.youtube.com/results?search_query=mrbeast+100+million+subscriber+island",
      reason: "Master of retention, hooks, and viral mechanics",
      category: "entertainment",
      videoId: ""
    },
    education: {
      title: "How The Economic Machine Works",
      creator: "Principles by Ray Dalio",
      url: "https://www.youtube.com/results?search_query=ray+dalio+economic+machine+works",
      reason: "Complex topics explained simply with engaging visuals",
      category: "education",
      videoId: ""
    },
    science: {
      title: "The Egg - A Short Story",
      creator: "Kurzgesagt",
      url: "https://www.youtube.com/results?search_query=kurzgesagt+the+egg",
      reason: "Stunning animation and storytelling that makes complex ideas shareable",
      category: "science",
      videoId: ""
    },
    finance: {
      title: "How To Invest For Beginners",
      creator: "Graham Stephan",
      url: "https://www.youtube.com/results?search_query=graham+stephan+invest+beginners",
      reason: "Engaging personal finance content with excellent retention",
      category: "finance",
      videoId: ""
    },
    lifestyle: {
      title: "My Morning Routine for Maximum Productivity",
      creator: "Matt D'Avella",
      url: "https://www.youtube.com/results?search_query=matt+davella+morning+routine",
      reason: "Cinematic vlog style that inspires action",
      category: "lifestyle",
      videoId: ""
    }
  }

  const matched: VideoSuggestion[] = []
  for (const interest of interests) {
    if (defaultVideos[interest]) {
      matched.push(defaultVideos[interest])
    }
  }
  
  if (matched.length === 0) {
    return [
      defaultVideos.entertainment,
      defaultVideos.business,
      defaultVideos.tech_reviews
    ]
  }

  return matched.slice(0, 3)
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
            cookiesToSet.forEach((cookie) => {
              cookieStore.set(cookie)
            })
          },
        },
      }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: DiscoverRequest = await request.json()
    const { background, experience_level, content_interests, platforms, content_goals } = body

    console.log('Video discovery request:', { background, experience_level, content_interests, content_goals })
    console.log('YouTube API key configured:', !!YOUTUBE_API_KEY)
    console.log('Gemini API key configured:', !!geminiApiKey)

    let suggestions: VideoSuggestion[] = []

    // Try YouTube Data API first (real videos)
    if (YOUTUBE_API_KEY) {
      console.log('Attempting YouTube API discovery...')
      suggestions = await discoverWithYouTubeAPI(content_interests, content_goals)
      console.log(`YouTube API returned ${suggestions.length} suggestions`)
    }

    // Fall back to Gemini if YouTube API didn't work
    if (suggestions.length === 0 && genAI) {
      console.log('Falling back to Gemini discovery...')
      suggestions = await discoverWithGemini(background, experience_level, content_interests, content_goals)
      console.log(`Gemini returned ${suggestions.length} suggestions`)
    }

    // Final fallback to static defaults
    if (suggestions.length === 0) {
      console.log('Using default suggestions...')
      suggestions = getDefaultSuggestions(content_interests)
    }

    // Save user interests to database (non-blocking)
    try {
      await supabase
        .from('user_interests')
        .upsert({
          user_id: user.id,
          background,
          experience_level,
          content_interests,
          platforms,
          content_goals,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id'
        })
    } catch (dbError) {
      console.error('Database error (non-fatal):', dbError)
    }

    return NextResponse.json({ 
      success: true,
      suggestions 
    })

  } catch (error) {
    console.error('Video discovery error:', error)
    
    // Return default suggestions even on error
    const defaultSuggestions = getDefaultSuggestions([])
    return NextResponse.json({ 
      success: true,
      suggestions: defaultSuggestions,
      fallback: true
    })
  }
}

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
            cookiesToSet.forEach((cookie) => {
              cookieStore.set(cookie)
            })
          },
        },
      }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: interests, error } = await supabase
      .from('user_interests')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (error && error.code !== 'PGRST116') {
      throw error
    }

    return NextResponse.json({ interests })
  } catch (error) {
    console.error('Error fetching interests:', error)
    return NextResponse.json({ error: 'Failed to fetch interests' }, { status: 500 })
  }
}
