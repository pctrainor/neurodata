/**
 * Main Agent Orchestrator
 * 
 * This is the main entry point for running all agents.
 * Run with: npm run agent
 */

import { DataFetcher } from './data-fetcher'
import { DataEnricher } from './data-enricher'
import { QualityChecker } from './quality-checker'
import { getSupabaseClient } from '../lib/supabase'

interface AgentConfig {
  name: string
  enabled: boolean
  batchSize: number
}

const config: AgentConfig[] = [
  { name: 'fetcher', enabled: true, batchSize: 100 },
  { name: 'enricher', enabled: true, batchSize: 10 },
  { name: 'quality', enabled: true, batchSize: 50 },
]

async function runAgents() {
  console.log('🤖 Starting Agent Orchestrator...\n')
  
  const supabase = getSupabaseClient()
  
  for (const agentConfig of config) {
    if (!agentConfig.enabled) {
      console.log(`⏭️  Skipping ${agentConfig.name} agent (disabled)`)
      continue
    }

    console.log(`\n🔄 Running ${agentConfig.name} agent...`)
    
    try {
      switch (agentConfig.name) {
        case 'fetcher':
          const fetcher = new DataFetcher(supabase)
          await fetcher.run(agentConfig.batchSize)
          break
          
        case 'enricher':
          const enricher = new DataEnricher(supabase)
          await enricher.run(agentConfig.batchSize)
          break
          
        case 'quality':
          const checker = new QualityChecker(supabase)
          await checker.run(agentConfig.batchSize)
          break
      }
      
      console.log(`✅ ${agentConfig.name} agent completed`)
    } catch (error) {
      console.error(`❌ ${agentConfig.name} agent failed:`, error)
    }
  }
  
  console.log('\n🏁 Agent run complete!')
}

// Run if called directly
runAgents().catch(console.error)
