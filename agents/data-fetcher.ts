/**
 * Data Fetcher Agent
 * 
 * Fetches data from configured external sources (APIs, web scraping, etc.)
 * and inserts new items into the database.
 * 
 * Run with: npm run agent:fetch
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { DataSource, Item } from '../types'

export class DataFetcher {
  private supabase: SupabaseClient

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase
  }

  async run(batchSize: number = 100): Promise<void> {
    console.log(`📥 Data Fetcher starting with batch size ${batchSize}`)

    // Get active data sources
    const { data: sources, error } = await this.supabase
      .from('data_sources')
      .select('*')
      .eq('is_active', true)

    if (error) {
      throw new Error(`Failed to fetch data sources: ${error.message}`)
    }

    if (!sources || sources.length === 0) {
      console.log('No active data sources configured')
      return
    }

    console.log(`Found ${sources.length} active data source(s)`)

    for (const source of sources as DataSource[]) {
      try {
        await this.fetchFromSource(source, batchSize)
      } catch (err) {
        console.error(`Error fetching from ${source.name}:`, err)
        
        // Update source with error
        await this.supabase
          .from('data_sources')
          .update({ 
            last_error: err instanceof Error ? err.message : 'Unknown error',
            updated_at: new Date().toISOString()
          })
          .eq('id', source.id)
      }
    }
  }

  private async fetchFromSource(source: DataSource, batchSize: number): Promise<void> {
    console.log(`\n🔗 Fetching from: ${source.name} (${source.source_type})`)

    let items: Partial<Item>[] = []

    switch (source.source_type) {
      case 'api':
        items = await this.fetchFromApi(source, batchSize)
        break
      case 'web_scrape':
        items = await this.fetchFromWebScrape(source, batchSize)
        break
      case 'file_upload':
        console.log('File upload sources must be triggered manually')
        return
      default:
        console.log(`Unsupported source type: ${source.source_type}`)
        return
    }

    if (items.length === 0) {
      console.log('No new items to insert')
      return
    }

    // Insert items
    const { data, error } = await this.supabase
      .from('items')
      .upsert(
        items.map(item => ({
          ...item,
          source_name: source.name,
          enrichment_status: 'pending',
        })),
        { onConflict: 'source_id' }
      )
      .select()

    if (error) {
      throw new Error(`Failed to insert items: ${error.message}`)
    }

    const insertedCount = data?.length || 0
    console.log(`✅ Inserted/updated ${insertedCount} items from ${source.name}`)

    // Update source stats
    await this.supabase
      .from('data_sources')
      .update({
        last_fetch_at: new Date().toISOString(),
        last_fetch_count: insertedCount,
        total_items_fetched: (source.total_items_fetched || 0) + insertedCount,
        last_error: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', source.id)
  }

  private async fetchFromApi(source: DataSource, limit: number): Promise<Partial<Item>[]> {
    if (!source.base_url || !source.fetch_endpoint) {
      throw new Error('API source must have base_url and fetch_endpoint configured')
    }

    const url = new URL(source.fetch_endpoint, source.base_url)
    
    // Add any configured params
    if (source.fetch_params) {
      Object.entries(source.fetch_params).forEach(([key, value]) => {
        url.searchParams.set(key, String(value))
      })
    }

    // Get API key from environment if configured
    const headers: Record<string, string> = { ...source.headers }
    if (source.api_key_env_var) {
      const apiKey = process.env[source.api_key_env_var]
      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`
      }
    }

    console.log(`Fetching from: ${url.toString()}`)
    
    const response = await fetch(url.toString(), { headers })
    
    if (!response.ok) {
      throw new Error(`API returned ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()
    
    // Apply field mapping to transform API response to items
    return this.mapToItems(data, source.field_mapping, limit)
  }

  private async fetchFromWebScrape(source: DataSource, limit: number): Promise<Partial<Item>[]> {
    // Placeholder for web scraping implementation
    // You would use a library like puppeteer, playwright, or cheerio here
    console.log('Web scraping not yet implemented - add your scraping logic here')
    return []
  }

  private mapToItems(
    data: any, 
    fieldMapping: Record<string, string>, 
    limit: number
  ): Partial<Item>[] {
    // Handle both array and object with results property
    const items = Array.isArray(data) ? data : (data.results || data.data || data.items || [])
    
    return items.slice(0, limit).map((raw: any) => {
      const item: Partial<Item> = {
        data: raw, // Store raw data
      }

      // Apply field mapping
      for (const [targetField, sourcePath] of Object.entries(fieldMapping)) {
        const value = this.getNestedValue(raw, sourcePath)
        if (value !== undefined) {
          (item as any)[targetField] = value
        }
      }

      return item
    })
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj)
  }
}

// Run if called directly
if (require.main === module) {
  const { getSupabaseClient } = require('../lib/supabase')
  const supabase = getSupabaseClient()
  const fetcher = new DataFetcher(supabase)
  fetcher.run().catch(console.error)
}
