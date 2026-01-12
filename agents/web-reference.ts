/**
 * Web Reference Agent
 * 
 * Fetches web content (news articles, blog posts, etc.) and extracts relevant information
 * for use in workflow analysis.
 * 
 * Run with: npm run agent:web-reference
 */

import { GoogleGenerativeAI } from '@google/generative-ai'

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

export interface WebReferenceConfig {
  geminiApiKey?: string
  maxContentLength?: number
  timeout?: number
}

const DEFAULT_CONFIG: Required<WebReferenceConfig> = {
  geminiApiKey: process.env.GOOGLE_GEMINI_API_KEY || 
                process.env.GEMINI_API_KEY || 
                process.env.GOOGLE_GENERATIVE_AI_API_KEY || '',
  maxContentLength: 50000,
  timeout: 30000,
}

export class WebReferenceAgent {
  private config: Required<WebReferenceConfig>
  private genAI: GoogleGenerativeAI | null

  constructor(config: WebReferenceConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.genAI = this.config.geminiApiKey 
      ? new GoogleGenerativeAI(this.config.geminiApiKey) 
      : null
  }

  /**
   * Fetch and analyze web content from a URL
   */
  async analyze(url: string): Promise<WebContentResult> {
    console.log(`🌐 WebReferenceAgent analyzing: ${url}`)

    try {
      // Fetch the web content
      const rawContent = await this.fetchContent(url)
      
      if (!rawContent) {
        return {
          url,
          title: '',
          content: '',
          summary: 'Failed to fetch content',
          keyPoints: [],
          sentiment: 'neutral',
          topics: [],
          entities: [],
          sourceType: 'other',
          error: 'Failed to fetch content from URL',
        }
      }

      // Use Gemini to analyze the content
      const analysis = await this.analyzeWithAI(url, rawContent)
      
      return {
        url,
        ...analysis,
      }
    } catch (error) {
      console.error(`Error analyzing ${url}:`, error)
      return {
        url,
        title: '',
        content: '',
        summary: 'Error analyzing content',
        keyPoints: [],
        sentiment: 'neutral',
        topics: [],
        entities: [],
        sourceType: 'other',
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Analyze multiple URLs in parallel
   */
  async analyzeBatch(urls: string[]): Promise<WebContentResult[]> {
    console.log(`🌐 WebReferenceAgent analyzing batch of ${urls.length} URLs`)
    return Promise.all(urls.map(url => this.analyze(url)))
  }

  /**
   * Fetch raw content from a URL
   */
  private async fetchContent(url: string): Promise<string | null> {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout)

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; WebReferenceAgent/1.0)',
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
      
      // Basic HTML to text extraction (strip tags, decode entities)
      const text = this.extractTextFromHtml(html)
      
      // Truncate if too long
      if (text.length > this.config.maxContentLength) {
        return text.substring(0, this.config.maxContentLength) + '...'
      }
      
      return text
    } catch (error) {
      console.error(`Failed to fetch ${url}:`, error)
      return null
    }
  }

  /**
   * Extract readable text from HTML
   */
  private extractTextFromHtml(html: string): string {
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
    
    return text
  }

  /**
   * Use Gemini to analyze content
   */
  private async analyzeWithAI(url: string, content: string): Promise<Omit<WebContentResult, 'url'>> {
    if (!this.genAI) {
      // Fallback without AI
      return {
        title: this.extractTitle(content),
        content: content.substring(0, 1000),
        summary: content.substring(0, 500),
        keyPoints: [],
        sentiment: 'neutral',
        topics: [],
        entities: [],
        sourceType: this.detectSourceType(url),
      }
    }

    try {
      const model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })
      
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
      // Fallback
      return {
        title: this.extractTitle(content),
        content: content.substring(0, 1000),
        summary: content.substring(0, 500),
        keyPoints: [],
        sentiment: 'neutral',
        topics: [],
        entities: [],
        sourceType: this.detectSourceType(url),
      }
    }
  }

  /**
   * Extract title from content (simple heuristic)
   */
  private extractTitle(content: string): string {
    // Look for common title patterns
    const lines = content.split('\n').filter(l => l.trim())
    if (lines.length > 0) {
      return lines[0].substring(0, 100)
    }
    return ''
  }

  /**
   * Detect source type from URL
   */
  private detectSourceType(url: string): 'news' | 'blog' | 'academic' | 'social' | 'other' {
    const urlLower = url.toLowerCase()
    
    // News sources
    const newsSites = ['nytimes', 'washingtonpost', 'cnn', 'bbc', 'reuters', 'apnews', 
                       'theguardian', 'wsj', 'bloomberg', 'forbes', 'news', 'article']
    if (newsSites.some(site => urlLower.includes(site))) {
      return 'news'
    }
    
    // Academic
    const academicSites = ['pubmed', 'arxiv', 'nature.com', 'science.org', 'scholar', 
                          'doi.org', 'nih.gov', '.edu']
    if (academicSites.some(site => urlLower.includes(site))) {
      return 'academic'
    }
    
    // Social
    const socialSites = ['twitter', 'x.com', 'facebook', 'linkedin', 'reddit', 'instagram']
    if (socialSites.some(site => urlLower.includes(site))) {
      return 'social'
    }
    
    // Blog
    const blogIndicators = ['blog', 'medium.com', 'substack', 'wordpress', 'blogger']
    if (blogIndicators.some(site => urlLower.includes(site))) {
      return 'blog'
    }
    
    return 'other'
  }
}

// CLI runner
async function main() {
  const args = process.argv.slice(2)
  
  if (args.length === 0) {
    console.log('Usage: npm run agent:web-reference <url> [url2] [url3] ...')
    process.exit(1)
  }

  const agent = new WebReferenceAgent()
  const results = await agent.analyzeBatch(args)
  
  for (const result of results) {
    console.log('\n' + '='.repeat(60))
    console.log(`URL: ${result.url}`)
    console.log(`Title: ${result.title}`)
    console.log(`Type: ${result.sourceType}`)
    console.log(`Sentiment: ${result.sentiment}`)
    console.log(`Summary: ${result.summary}`)
    console.log(`Topics: ${result.topics.join(', ')}`)
    console.log(`Entities: ${result.entities.join(', ')}`)
    console.log(`Key Points:`)
    result.keyPoints.forEach((kp, i) => console.log(`  ${i + 1}. ${kp}`))
    if (result.error) {
      console.log(`Error: ${result.error}`)
    }
  }
}

if (require.main === module) {
  main().catch(console.error)
}
