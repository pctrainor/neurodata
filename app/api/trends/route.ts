import { NextResponse } from 'next/server'

// Neuroscience-specific fallback examples
const NEURO_FALLBACKS = [
  'Analyze fMRI data for Alzheimer\'s detection',
  'Study hippocampus activity during memory tasks',
  'Compare EEG patterns in meditation vs rest',
  'Detect early signs of Parkinson\'s from brain scans',
  'Analyze prefrontal cortex in ADHD patients',
  'Study amygdala response to emotional stimuli',
  'Map neural pathways in autism spectrum disorder',
  'Analyze brain connectivity in depression',
  'Study motor cortex in stroke rehabilitation',
  'Detect TBI patterns from CT scans',
  'Analyze sleep stage transitions from EEG',
  'Study visual cortex response to stimuli',
  'Compare brain activity in bilingual speakers',
  'Analyze neural markers of anxiety disorders',
  'Study brain plasticity in learning tasks',
]

export async function GET(request: Request) {
  const debugInfo: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    attempts: [],
  }

  try {
    // First, try to get dynamic examples from the dataset discovery API
    const baseUrl = new URL(request.url).origin
    const discoverResponse = await fetch(`${baseUrl}/api/datasets/discover?format=prompts`, {
      next: { revalidate: 1800 }, // Cache for 30 minutes
    })

    if (discoverResponse.ok) {
      const discoverData = await discoverResponse.json()
      
      if (discoverData.prompts && discoverData.prompts.length > 0) {
        // Mix discovered dataset prompts with fallbacks for variety
        const mixed = [...discoverData.prompts.slice(0, 10), ...NEURO_FALLBACKS.slice(0, 5)]
        const shuffled = mixed.sort(() => Math.random() - 0.5)

        return NextResponse.json({
          examples: shuffled.slice(0, 15),
          source: 'dataset-discovery',
          debug: debugInfo,
          datasetsFound: discoverData.count,
        })
      }
    }

    ;(debugInfo.attempts as unknown[]).push({
      source: 'dataset-discovery',
      ok: discoverResponse.ok,
      status: discoverResponse.status,
    })

    // Fallback: Try Google Trends RSS
    const trendsUrl = 'https://trends.google.com/trending/rss?geo=US'
    const trendsResponse = await fetch(trendsUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      }
    })

    ;(debugInfo.attempts as unknown[]).push({
      source: 'google-trends',
      url: trendsUrl,
      status: trendsResponse.status,
      ok: trendsResponse.ok,
    })

    if (trendsResponse.ok) {
      const xmlText = await trendsResponse.text()
      
      // Check for different XML title formats
      let titles: string[] = []
      
      // Try CDATA format
      const cdataMatches = xmlText.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/g)
      if (cdataMatches && cdataMatches.length > 1) {
        titles = cdataMatches.slice(1, 11).map(match => {
          const m = match.match(/<!\[CDATA\[(.*?)\]\]>/)
          return m ? m[1] : ''
        }).filter(Boolean)
      }
      
      // Try plain title format
      if (titles.length === 0) {
        const plainMatches = xmlText.match(/<title>([^<]+)<\/title>/g)
        if (plainMatches && plainMatches.length > 1) {
          titles = plainMatches.slice(1, 11).map(match => {
            const m = match.match(/<title>([^<]+)<\/title>/)
            return m ? m[1] : ''
          }).filter(Boolean)
        }
      }

      ;(debugInfo as Record<string, unknown>).trendsFound = titles.length

      if (titles.length > 0) {
        const trendPrompts = titles.map(t => `Study brain activity related to ${t}`)
        const mixed = [...trendPrompts, ...NEURO_FALLBACKS.slice(0, 5)]
        const shuffled = mixed.sort(() => Math.random() - 0.5)

        return NextResponse.json({
          examples: shuffled.slice(0, 15),
          source: 'google-trends',
          debug: debugInfo,
        })
      }
    }

    // All sources failed, use fallbacks
    throw new Error('All external sources failed')
    
  } catch (error) {
    ;(debugInfo as Record<string, unknown>).error = error instanceof Error ? error.message : 'Unknown error'
    
    console.log('[Trends API] Using fallbacks:', debugInfo)
    
    
    return NextResponse.json({
      examples: NEURO_FALLBACKS.sort(() => Math.random() - 0.5),
      source: 'fallback',
      debug: debugInfo,
    })
  }
}
