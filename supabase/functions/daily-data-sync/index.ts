// Daily Data Sync Edge Function
// Runs daily to discover new neuroscience studies and datasets using Gemini
// Triggered by Supabase cron job

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { GoogleGenerativeAI } from 'https://esm.sh/@google/generative-ai@0.2.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface DiscoveredStudy {
  title: string
  authors: string[]
  abstract: string
  doi: string | null
  source: string
  modalities: string[]
  sample_size: number | null
  publication_date: string | null
  url: string | null
}

interface NewsItem {
  title: string
  summary: string
  category: string
  source: string
  url: string | null
  published_at: string
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize clients
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const genAI = new GoogleGenerativeAI(Deno.env.get('GOOGLE_GEMINI_API_KEY') ?? '')
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' })

    console.log('Starting daily data sync...')

    // 1. Discover new neuroscience studies
    const studiesPrompt = `You are a neuroscience research database curator. Search for and identify 5-10 recently published (last 7 days) neuroscience studies that include neuroimaging data (fMRI, MRI, EEG, MEG, PET, etc.).

For each study, provide:
1. Title
2. Authors (list of names)
3. Brief abstract/summary (2-3 sentences)
4. DOI if available
5. Data source (OpenNeuro, HCP, NIMH Data Archive, etc.)
6. Imaging modalities used
7. Sample size if mentioned
8. Publication/preprint date

Focus on studies that:
- Have publicly available datasets
- Use neuroimaging techniques
- Are from reputable sources (Nature, Science, PNAS, bioRxiv, etc.)

Return as JSON array with this structure:
[{
  "title": "Study title",
  "authors": ["Author 1", "Author 2"],
  "abstract": "Brief summary",
  "doi": "10.xxxx/xxxxx" or null,
  "source": "OpenNeuro",
  "modalities": ["fMRI", "structural MRI"],
  "sample_size": 100,
  "publication_date": "2026-01-10",
  "url": "https://..."
}]

Only return the JSON array, no other text.`

    const studiesResult = await model.generateContent(studiesPrompt)
    const studiesText = studiesResult.response.text()
    
    let discoveredStudies: DiscoveredStudy[] = []
    try {
      // Extract JSON from response
      const jsonMatch = studiesText.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        discoveredStudies = JSON.parse(jsonMatch[0])
      }
    } catch (e) {
      console.error('Failed to parse studies JSON:', e)
    }

    console.log(`Discovered ${discoveredStudies.length} new studies`)

    // 2. Get neuroscience news and trends
    const newsPrompt = `You are a neuroscience news curator. Identify 5-7 significant neuroscience news items, breakthroughs, or developments from the past week.

Categories to include:
- Research breakthroughs
- New datasets released
- Tool/software updates (FSL, FreeSurfer, BIDS, etc.)
- Funding announcements
- Conference highlights
- Policy/open science initiatives

For each item provide:
1. Headline/title
2. Brief summary (2-3 sentences)
3. Category
4. Source publication/website
5. URL if available
6. Date

Return as JSON array:
[{
  "title": "Headline",
  "summary": "Brief summary of the news",
  "category": "Research Breakthrough",
  "source": "Nature Neuroscience",
  "url": "https://...",
  "published_at": "2026-01-10"
}]

Only return the JSON array, no other text.`

    const newsResult = await model.generateContent(newsPrompt)
    const newsText = newsResult.response.text()
    
    let newsItems: NewsItem[] = []
    try {
      const jsonMatch = newsText.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        newsItems = JSON.parse(jsonMatch[0])
      }
    } catch (e) {
      console.error('Failed to parse news JSON:', e)
    }

    console.log(`Found ${newsItems.length} news items`)

    // 3. Store discovered studies in database
    const syncResults = {
      studies_found: discoveredStudies.length,
      studies_added: 0,
      news_items: newsItems.length,
      errors: [] as string[]
    }

    for (const study of discoveredStudies) {
      // Check if study already exists (by DOI or title)
      const { data: existing } = await supabase
        .from('studies')
        .select('id')
        .or(`doi.eq.${study.doi},title.eq.${study.title}`)
        .single()

      if (!existing) {
        // Get or create data source
        let sourceId = null
        if (study.source) {
          const { data: source } = await supabase
            .from('data_sources')
            .select('id')
            .eq('short_name', study.source)
            .single()
          
          if (source) {
            sourceId = source.id
          }
        }

        // Insert new study
        const { error } = await supabase
          .from('studies')
          .insert({
            title: study.title,
            authors: study.authors,
            abstract: study.abstract,
            doi: study.doi,
            source_id: sourceId,
            modalities: study.modalities,
            sample_size: study.sample_size,
            access_level: 'free',
            discovered_at: new Date().toISOString(),
            discovery_source: 'gemini_daily_sync'
          })

        if (error) {
          syncResults.errors.push(`Failed to insert study: ${study.title}`)
        } else {
          syncResults.studies_added++
        }
      }
    }

    // 4. Store news items in a news table
    // First, ensure the news table exists by trying to insert
    for (const news of newsItems) {
      await supabase
        .from('neuroscience_news')
        .insert({
          title: news.title,
          summary: news.summary,
          category: news.category,
          source: news.source,
          url: news.url,
          published_at: news.published_at,
          discovered_at: new Date().toISOString()
        })
        .onConflict('title')
        .ignore()
    }

    // 5. Log sync results
    await supabase
      .from('sync_logs')
      .insert({
        sync_type: 'daily_data_sync',
        results: syncResults,
        completed_at: new Date().toISOString()
      })

    console.log('Daily sync completed:', syncResults)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Daily data sync completed',
        results: syncResults
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Daily sync error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})
