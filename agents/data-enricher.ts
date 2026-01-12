/**
 * Data Enricher Agent
 * 
 * Uses AI (Google Gemini) to enrich items with summaries, tags, and metadata.
 * 
 * Run with: npm run agent:enrich
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { GoogleGenerativeAI } from '@google/generative-ai'
import type { Item } from '../types'

export class DataEnricher {
  private supabase: SupabaseClient
  private genAI: GoogleGenerativeAI | null = null

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase
    
    const apiKey = process.env.GEMINI_API_KEY
    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey)
    } else {
      console.warn('⚠️ GEMINI_API_KEY not set - enrichment will be skipped')
    }
  }

  async run(batchSize: number = 10): Promise<void> {
    console.log(`🧠 Data Enricher starting with batch size ${batchSize}`)

    if (!this.genAI) {
      console.log('Skipping enrichment - no API key configured')
      return
    }

    // Get items pending enrichment
    const { data: items, error } = await this.supabase
      .from('items')
      .select('*')
      .eq('enrichment_status', 'pending')
      .order('created_at', { ascending: true })
      .limit(batchSize)

    if (error) {
      throw new Error(`Failed to fetch items: ${error.message}`)
    }

    if (!items || items.length === 0) {
      console.log('No items pending enrichment')
      return
    }

    console.log(`Found ${items.length} items to enrich`)

    let successCount = 0
    let failCount = 0

    for (const item of items as Item[]) {
      try {
        await this.enrichItem(item)
        successCount++
      } catch (err) {
        console.error(`Failed to enrich item ${item.id}:`, err)
        failCount++
        
        // Mark as failed
        await this.supabase
          .from('items')
          .update({ 
            enrichment_status: 'failed',
            updated_at: new Date().toISOString()
          })
          .eq('id', item.id)
      }
    }

    console.log(`✅ Enriched ${successCount} items, ${failCount} failed`)
  }

  private async enrichItem(item: Item): Promise<void> {
    console.log(`  Enriching: ${item.name?.substring(0, 50)}...`)

    const model = this.genAI!.getGenerativeModel({ model: 'gemini-2.0-flash' })

    const prompt = `Analyze the following data item and provide enrichment in JSON format:

Item Name: ${item.name}
Description: ${item.description || 'N/A'}
Data: ${JSON.stringify(item.data, null, 2).substring(0, 2000)}

Provide a JSON response with:
{
  "summary": "A concise 2-3 sentence summary of this item",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "quality_score": 0-100,
  "quality_notes": "Brief notes on data completeness/accuracy",
  "enriched_data": {
    "key_facts": ["fact1", "fact2"],
    "category_suggestion": "suggested category name",
    "related_topics": ["topic1", "topic2"]
  }
}

Only respond with valid JSON, no markdown or explanation.`

    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()

    // Parse the JSON response
    let enrichment
    try {
      // Remove any markdown code blocks if present
      const cleanedText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      enrichment = JSON.parse(cleanedText)
    } catch (e) {
      throw new Error(`Failed to parse AI response: ${text.substring(0, 200)}`)
    }

    // Update the item with enrichment data
    const { error } = await this.supabase
      .from('items')
      .update({
        ai_summary: enrichment.summary,
        ai_tags: enrichment.tags || [],
        ai_metadata: enrichment.enriched_data || {},
        quality_score: enrichment.quality_score || 0,
        enrichment_status: 'completed',
        enriched_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', item.id)

    if (error) {
      throw new Error(`Failed to update item: ${error.message}`)
    }
  }
}

// Run if called directly
if (require.main === module) {
  const { getSupabaseClient } = require('../lib/supabase')
  const supabase = getSupabaseClient()
  const enricher = new DataEnricher(supabase)
  enricher.run().catch(console.error)
}
