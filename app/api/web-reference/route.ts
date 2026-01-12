import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

// Initialize Gemini
const geminiApiKey = 
  process.env.GOOGLE_GEMINI_API_KEY || 
  process.env.GEMINI_API_KEY || 
  process.env.GOOGLE_GENERATIVE_AI_API_KEY || 
  ''

const genAI = geminiApiKey ? new GoogleGenerativeAI(geminiApiKey) : null

export interface WebContentResult {
  url: string
  title: string
  content: string
  summary: string
  keyPoints: string[]
  sentiment: 'positive' | 'negative' | 'neutral' | 'mixed'
  topics: string[]
  entities: string[]
  publishedDate?: string
  author?: string
  sourceType: 'news' | 'blog' | 'academic' | 'social' | 'other'
  error?: string
}

/**
 * Fetch raw content from a URL
 */
async function fetchContent(url: string, timeout: number = 30000): Promise<string | null> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; NeuroDataPlatform/1.0)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      console.error(`HTTP error fetching ${url}: ${response.status}`)
      return null
    }

    const contentType = response.headers.get('content-type') || ''
    if (!contentType.includes('text/html') && !contentType.includes('text/plain')) {
      console.error(`Unsupported content type: ${contentType}`)
      return null
    }

    const html = await response.text()
    return extractTextFromHtml(html)
  } catch (error) {
    console.error(`Failed to fetch ${url}:`, error)
    return null
  }
}

/**
 * Extract readable text from HTML
 */
function extractTextFromHtml(html: string): string {
  // Remove scripts and styles
  let text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
  
  // Replace common block elements with newlines
  text = text
    .replace(/<(p|div|br|h[1-6]|li|tr)[^>]*>/gi, '\n')
    .replace(/<\/?(p|div|h[1-6]|li|ul|ol|tr|table)[^>]*>/gi, '\n')
  
  // Remove all remaining HTML tags
  text = text.replace(/<[^>]+>/g, ' ')
  
  // Decode HTML entities
  text = text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#(\d+);/gi, (match, num) => String.fromCharCode(parseInt(num)))
  
  // Clean up whitespace
  text = text
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n/g, '\n\n')
    .trim()
  
  // Truncate if too long
  const maxLength = 50000
  if (text.length > maxLength) {
    return text.substring(0, maxLength) + '...'
  }
  
  return text
}

/**
 * Detect source type from URL
 */
function detectSourceType(url: string): 'news' | 'blog' | 'academic' | 'social' | 'other' {
  const urlLower = url.toLowerCase()
  
  const newsSites = ['nytimes', 'washingtonpost', 'cnn', 'bbc', 'reuters', 'apnews', 
                     'theguardian', 'wsj', 'bloomberg', 'forbes', 'news', 'article']
  if (newsSites.some(site => urlLower.includes(site))) return 'news'
  
  const academicSites = ['pubmed', 'arxiv', 'nature.com', 'science.org', 'scholar', 
                        'doi.org', 'nih.gov', '.edu']
  if (academicSites.some(site => urlLower.includes(site))) return 'academic'
  
  const socialSites = ['twitter', 'x.com', 'facebook', 'linkedin', 'reddit', 'instagram']
  if (socialSites.some(site => urlLower.includes(site))) return 'social'
  
  const blogIndicators = ['blog', 'medium.com', 'substack', 'wordpress', 'blogger']
  if (blogIndicators.some(site => urlLower.includes(site))) return 'blog'
  
  return 'other'
}

/**
 * Analyze content with Gemini AI
 */
async function analyzeWithAI(url: string, content: string): Promise<WebContentResult> {
  if (!genAI || !geminiApiKey) {
    // Fallback without AI
    return {
      url,
      title: content.split('\n').filter(l => l.trim())[0]?.substring(0, 100) || '',
      content: content.substring(0, 1000),
      summary: content.substring(0, 500),
      keyPoints: [],
      sentiment: 'neutral',
      topics: [],
      entities: [],
      sourceType: detectSourceType(url),
    }
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })
    
    const prompt = `Analyze the following web content and extract structured information.

URL: ${url}

Content:
${content.substring(0, 30000)}

Respond with a JSON object containing:
{
  "title": "The article/page title",
  "summary": "A 2-3 sentence summary of the main content",
  "keyPoints": ["Key point 1", "Key point 2", "Key point 3"] (up to 5 key points),
  "sentiment": "positive" | "negative" | "neutral" | "mixed",
  "topics": ["topic1", "topic2", "topic3"] (main topics discussed),
  "entities": ["entity1", "entity2"] (people, companies, products mentioned),
  "publishedDate": "YYYY-MM-DD if detectable, otherwise null",
  "author": "Author name if detectable, otherwise null",
  "sourceType": "news" | "blog" | "academic" | "social" | "other"
}

Respond ONLY with the JSON object, no additional text.`

    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()
    
    // Parse JSON response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('No JSON found in response')
    }
    
    const parsed = JSON.parse(jsonMatch[0])
    
    return {
      url,
      title: parsed.title || '',
      content: content.substring(0, 2000),
      summary: parsed.summary || '',
      keyPoints: parsed.keyPoints || [],
      sentiment: parsed.sentiment || 'neutral',
      topics: parsed.topics || [],
      entities: parsed.entities || [],
      publishedDate: parsed.publishedDate || undefined,
      author: parsed.author || undefined,
      sourceType: parsed.sourceType || 'other',
    }
  } catch (error) {
    console.error('AI analysis error:', error)
    return {
      url,
      title: content.split('\n').filter(l => l.trim())[0]?.substring(0, 100) || '',
      content: content.substring(0, 1000),
      summary: content.substring(0, 500),
      keyPoints: [],
      sentiment: 'neutral',
      topics: [],
      entities: [],
      sourceType: detectSourceType(url),
      error: error instanceof Error ? error.message : 'AI analysis failed',
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { url, urls } = body

    // Handle single URL or array of URLs
    const urlsToProcess: string[] = urls || (url ? [url] : [])
    
    if (urlsToProcess.length === 0) {
      return NextResponse.json(
        { error: 'No URL(s) provided. Pass "url" for single or "urls" for multiple.' },
        { status: 400 }
      )
    }

    // Process all URLs
    const results: WebContentResult[] = []
    
    for (const targetUrl of urlsToProcess) {
      console.log(`🌐 Analyzing: ${targetUrl}`)
      
      // Validate URL
      try {
        new URL(targetUrl)
      } catch {
        results.push({
          url: targetUrl,
          title: '',
          content: '',
          summary: '',
          keyPoints: [],
          sentiment: 'neutral',
          topics: [],
          entities: [],
          sourceType: 'other',
          error: 'Invalid URL format',
        })
        continue
      }

      // Fetch content
      const content = await fetchContent(targetUrl)
      
      if (!content) {
        results.push({
          url: targetUrl,
          title: '',
          content: '',
          summary: 'Failed to fetch content',
          keyPoints: [],
          sentiment: 'neutral',
          topics: [],
          entities: [],
          sourceType: 'other',
          error: 'Failed to fetch content from URL',
        })
        continue
      }

      // Analyze with AI
      const analysis = await analyzeWithAI(targetUrl, content)
      results.push(analysis)
    }

    // Return single result or array based on input
    if (urls) {
      return NextResponse.json({ results })
    } else {
      return NextResponse.json(results[0])
    }
  } catch (error) {
    console.error('Web reference API error:', error)
    return NextResponse.json(
      { error: 'Failed to analyze web content', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ready',
    message: 'Web Reference API. POST with { url: "..." } or { urls: [...] }',
    hasAI: !!geminiApiKey,
  })
}
