/**
 * Quality Checker Agent
 * 
 * Validates data quality, checks for missing fields, and flags issues.
 * 
 * Run with: npm run agent:quality
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Item } from '../types'

interface QualityCheck {
  field: string
  required: boolean
  weight: number
  validate?: (value: any) => boolean
}

const QUALITY_CHECKS: QualityCheck[] = [
  { field: 'name', required: true, weight: 20 },
  { field: 'description', required: false, weight: 15 },
  { field: 'summary', required: false, weight: 10 },
  { field: 'category_id', required: false, weight: 10 },
  { field: 'image_url', required: false, weight: 10, validate: (v) => v && v.startsWith('http') },
  { field: 'source_url', required: false, weight: 5, validate: (v) => v && v.startsWith('http') },
  { field: 'ai_summary', required: false, weight: 15 },
  { field: 'ai_tags', required: false, weight: 10, validate: (v) => Array.isArray(v) && v.length > 0 },
  { field: 'data', required: false, weight: 5, validate: (v) => v && Object.keys(v).length > 0 },
]

export class QualityChecker {
  private supabase: SupabaseClient

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase
  }

  async run(batchSize: number = 50): Promise<void> {
    console.log(`✅ Quality Checker starting with batch size ${batchSize}`)

    // Get items that haven't been checked recently (or ever)
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

    const { data: items, error } = await this.supabase
      .from('items')
      .select('*')
      .or(`verified_at.is.null,verified_at.lt.${oneWeekAgo.toISOString()}`)
      .order('created_at', { ascending: true })
      .limit(batchSize)

    if (error) {
      throw new Error(`Failed to fetch items: ${error.message}`)
    }

    if (!items || items.length === 0) {
      console.log('No items to check')
      return
    }

    console.log(`Found ${items.length} items to check`)

    let checkedCount = 0
    let issueCount = 0

    for (const item of items as Item[]) {
      const result = await this.checkItem(item)
      checkedCount++
      if (result.issues.length > 0) {
        issueCount++
      }
    }

    console.log(`✅ Checked ${checkedCount} items, found issues in ${issueCount}`)
  }

  private async checkItem(item: Item): Promise<{ score: number; issues: string[] }> {
    const issues: string[] = []
    let totalWeight = 0
    let earnedScore = 0

    for (const check of QUALITY_CHECKS) {
      totalWeight += check.weight
      const value = (item as any)[check.field]

      // Check if field has a value
      const hasValue = value !== null && value !== undefined && value !== ''
      
      if (check.required && !hasValue) {
        issues.push(`Missing required field: ${check.field}`)
        continue
      }

      if (!hasValue) {
        continue // Optional field without value - just don't add points
      }

      // Run custom validation if defined
      if (check.validate && !check.validate(value)) {
        issues.push(`Invalid value for field: ${check.field}`)
        continue
      }

      // Field is valid
      earnedScore += check.weight
    }

    const qualityScore = Math.round((earnedScore / totalWeight) * 100)
    const completenessScore = Math.round(
      (QUALITY_CHECKS.filter(c => {
        const v = (item as any)[c.field]
        return v !== null && v !== undefined && v !== ''
      }).length / QUALITY_CHECKS.length) * 100
    )

    // Determine verification status
    let verificationStatus: Item['verification_status'] = 'unverified'
    if (qualityScore >= 80 && issues.length === 0) {
      verificationStatus = 'verified'
    } else if (issues.length > 0) {
      verificationStatus = 'disputed'
    }

    // Update item
    const { error } = await this.supabase
      .from('items')
      .update({
        quality_score: qualityScore,
        completeness_score: completenessScore,
        verification_status: verificationStatus,
        verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', item.id)

    if (error) {
      console.error(`Failed to update item ${item.id}:`, error)
    }

    if (issues.length > 0) {
      console.log(`  ⚠️ ${item.name?.substring(0, 30)}: ${issues.length} issues, score ${qualityScore}`)
    }

    return { score: qualityScore, issues }
  }
}

// Run if called directly
if (require.main === module) {
  const { getSupabaseClient } = require('../lib/supabase')
  const supabase = getSupabaseClient()
  const checker = new QualityChecker(supabase)
  checker.run().catch(console.error)
}
