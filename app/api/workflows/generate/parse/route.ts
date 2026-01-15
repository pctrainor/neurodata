import { NextRequest, NextResponse } from 'next/server'

/**
 * Universal Intent Parser API
 * 
 * First step of the multi-step wizard. Parses user's natural language
 * request to understand what kind of workflow they want.
 * 
 * NOW UNIVERSAL: Works with ANY agent type, not just hardcoded keywords.
 * Examples that now work:
 * - "500 chefs rating a recipe"
 * - "200 lawyers reviewing a contract"
 * - "1000 teenagers reacting to a meme"
 * - "50 aliens evaluating Earth culture"
 * - "300 medieval knights judging combat techniques"
 */

// =============================================================================
// TYPES
// =============================================================================

interface ParsedIntent {
  workflowType: 'parallel-agents' | 'sequential' | 'simple' | 'content-analysis'
  agentCount: number
  agentNoun: string  // The raw noun (scientist, chef, alien, knight, etc.)
  agentNounPlural: string  // Plural form for display
  namingStyle: 'professional' | 'casual' | 'fantasy' | 'numbered'
  taskDescription: string
  taskVerb: string  // The main action verb (rating, reviewing, solving, etc.)
  taskType: 'rating' | 'reaction' | 'analysis' | 'testing' | 'creation' | 'voting' | 'debate' | 'custom'
  inputType: 'test' | 'video' | 'article' | 'document' | 'data' | 'food' | 'product' | 'custom'
  outputType: 'scores' | 'reactions' | 'analysis' | 'grades' | 'selections' | 'consensus' | 'summary'
  aggregationType: 'average' | 'sentiment' | 'consensus' | 'grades' | 'best-of' | 'majority' | 'synthesis'
  demographicMix?: string[]
}

// =============================================================================
// UNIVERSAL DETECTION SYSTEMS
// =============================================================================

// Professional nouns that should get titles like "Dr." or "Prof."
const PROFESSIONAL_NOUNS = [
  'scientist', 'researcher', 'doctor', 'professor', 'lawyer', 'engineer',
  'analyst', 'expert', 'specialist', 'consultant', 'physician', 'surgeon',
  'architect', 'director', 'manager', 'executive', 'officer', 'administrator',
  'therapist', 'psychologist', 'psychiatrist', 'pharmacist', 'nurse',
  'attorney', 'judge', 'economist', 'statistician', 'mathematician',
  'biologist', 'chemist', 'physicist', 'geologist', 'astronomer'
]

// Fantasy/fictional nouns that need special naming
const FANTASY_NOUNS = [
  'alien', 'robot', 'android', 'cyborg', 'ai', 'wizard', 'witch', 'mage',
  'knight', 'dragon', 'elf', 'dwarf', 'orc', 'goblin', 'troll', 'giant',
  'vampire', 'werewolf', 'zombie', 'ghost', 'demon', 'angel', 'god', 'titan',
  'monster', 'creature', 'beast', 'spirit', 'fairy', 'pixie', 'gnome',
  'samurai', 'ninja', 'pirate', 'viking', 'gladiator', 'spartan', 'warrior',
  'superhero', 'villain', 'mutant', 'jedi', 'sith', 'wizard'
]

// Task verbs grouped by type
const TASK_VERB_PATTERNS = {
  rating: ['rate', 'rating', 'score', 'scoring', 'rank', 'ranking', 'evaluate', 'evaluating', 'grade', 'grading', 'judge', 'judging', 'assess', 'assessing'],
  reaction: ['react', 'reacting', 'watch', 'watching', 'view', 'viewing', 'respond', 'responding', 'experience', 'experiencing', 'feel', 'feeling'],
  analysis: ['analyze', 'analyzing', 'analyse', 'analysing', 'solve', 'solving', 'review', 'reviewing', 'examine', 'examining', 'investigate', 'investigating', 'study', 'studying', 'research', 'researching'],
  testing: ['test', 'testing', 'take', 'taking', 'answer', 'answering', 'complete', 'completing', 'attempt', 'attempting', 'try', 'trying'],
  creation: ['create', 'creating', 'write', 'writing', 'generate', 'generating', 'design', 'designing', 'compose', 'composing', 'build', 'building', 'make', 'making', 'produce', 'producing'],
  voting: ['vote', 'voting', 'choose', 'choosing', 'select', 'selecting', 'pick', 'picking', 'decide', 'deciding', 'prefer', 'preferring'],
  debate: ['debate', 'debating', 'discuss', 'discussing', 'argue', 'arguing', 'deliberate', 'deliberating', 'consider', 'considering']
}

// Input type detection words
const INPUT_TYPE_PATTERNS = {
  test: ['test', 'exam', 'quiz', 'assessment', 'sat', 'act', 'gre', 'gmat', 'lsat', 'mcat', 'homework', 'assignment', 'worksheet', 'problem set', 'final', 'midterm'],
  video: ['video', 'youtube', 'tiktok', 'clip', 'movie', 'film', 'ad', 'advertisement', 'commercial', 'trailer', 'music video', 'vlog', 'stream', 'broadcast'],
  article: ['article', 'news', 'blog', 'post', 'story', 'essay', 'opinion', 'editorial', 'column'],
  document: ['document', 'file', 'pdf', 'paper', 'report', 'contract', 'agreement', 'legal', 'brief', 'manuscript', 'thesis', 'dissertation'],
  food: ['recipe', 'dish', 'meal', 'food', 'cuisine', 'ingredient', 'cooking', 'restaurant', 'menu', 'flavor', 'taste'],
  product: ['product', 'item', 'app', 'website', 'service', 'feature', 'software', 'game', 'tool', 'device', 'gadget', 'brand'],
  data: ['data', 'dataset', 'spreadsheet', 'csv', 'json', 'numbers', 'statistics', 'metrics', 'analytics']
}

// Demographic detection
const DEMOGRAPHIC_PATTERNS = {
  'gen-z': ['gen z', 'gen-z', 'teenager', 'teenagers', 'teen', 'teens', 'young', 'youth', 'zoomer', 'zoomers', '13-24', 'high school', 'college'],
  'millennial': ['millennial', 'millennials', '20s', '30s', 'young adult', 'young adults', '25-40'],
  'gen-x': ['gen x', 'gen-x', '40s', '50s', 'middle age', 'middle-aged', '41-56'],
  'boomer': ['boomer', 'boomers', 'baby boomer', 'older adult', '60s', '70s', '57-75'],
  'senior': ['senior', 'seniors', 'elderly', 'retired', '75+', '80s', '90s']
}

// =============================================================================
// EXTRACTION FUNCTIONS
// =============================================================================

/**
 * Extract count from query - handles numbers and word numbers
 */
function extractCount(query: string): number {
  const lowerQuery = query.toLowerCase()
  
  // Direct number match (e.g., "1000 scientists")
  const directMatch = lowerQuery.match(/(\d+)\s+\w+/)
  if (directMatch) {
    return parseInt(directMatch[1], 10)
  }
  
  // Word numbers
  const wordNumbers: Record<string, number> = {
    'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
    'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
    'eleven': 11, 'twelve': 12, 'thirteen': 13, 'fourteen': 14, 'fifteen': 15,
    'sixteen': 16, 'seventeen': 17, 'eighteen': 18, 'nineteen': 19, 'twenty': 20,
    'thirty': 30, 'forty': 40, 'fifty': 50, 'sixty': 60, 'seventy': 70, 'eighty': 80, 'ninety': 90,
    'hundred': 100, 'thousand': 1000, 'million': 1000000,
    'dozen': 12, 'score': 20, 'gross': 144
  }
  
  // "X hundred" or "X thousand" pattern
  const multiplierPattern = /(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s*(hundred|thousand|million)/i
  const multiplierMatch = lowerQuery.match(multiplierPattern)
  if (multiplierMatch) {
    const base = wordNumbers[multiplierMatch[1].toLowerCase()] || parseInt(multiplierMatch[1], 10)
    const multiplier = wordNumbers[multiplierMatch[2].toLowerCase()]
    return base * multiplier
  }
  
  // Single word number
  for (const [word, num] of Object.entries(wordNumbers)) {
    if (lowerQuery.includes(word)) {
      return num
    }
  }
  
  // Fallback
  return 10
}

/**
 * Universal pattern to extract agent noun from ANY query
 * Pattern: [NUMBER] [AGENT_NOUN(s)] [DOING_SOMETHING]
 */
function extractAgentNoun(query: string): { noun: string; plural: string } {
  const lowerQuery = query.toLowerCase()
  
  // Pattern: number followed by word(s) followed by verb/gerund
  // e.g., "1000 scientists solving", "500 chefs rating", "50 aliens watching"
  const pattern = /(?:\d+|hundred|thousand|million)\s+(\w+(?:\s+\w+)?)\s+(?:who\s+are\s+)?(?:\w+ing|\w+s?\s+(?:a|an|the))/i
  const match = lowerQuery.match(pattern)
  
  if (match) {
    let noun = match[1].trim()
    // Remove trailing 's' to get singular form
    const singular = noun.endsWith('s') && noun.length > 2 ? noun.slice(0, -1) : noun
    const plural = noun.endsWith('s') ? noun : noun + 's'
    return { noun: singular, plural }
  }
  
  // Simpler fallback: just get the word after the number
  const simplePattern = /(?:\d+|hundred|thousand|million)\s+(\w+)/i
  const simpleMatch = lowerQuery.match(simplePattern)
  
  if (simpleMatch) {
    let noun = simpleMatch[1].trim()
    const singular = noun.endsWith('s') && noun.length > 3 ? noun.slice(0, -1) : noun
    const plural = noun.endsWith('s') ? noun : noun + 's'
    return { noun: singular, plural }
  }
  
  return { noun: 'agent', plural: 'agents' }
}

/**
 * Determine naming style based on agent noun
 */
function getNamingStyle(agentNoun: string): 'professional' | 'casual' | 'fantasy' | 'numbered' {
  const lowerNoun = agentNoun.toLowerCase()
  
  if (PROFESSIONAL_NOUNS.some(p => lowerNoun.includes(p))) {
    return 'professional'
  }
  
  if (FANTASY_NOUNS.some(f => lowerNoun.includes(f))) {
    return 'fantasy'
  }
  
  // Age-based nouns get casual naming
  const AGE_NOUNS = ['kid', 'child', 'teenager', 'teen', 'adult', 'elder', 'senior', 'baby', 'toddler', 'youth']
  if (AGE_NOUNS.some(a => lowerNoun.includes(a))) {
    return 'casual'
  }
  
  return 'casual'
}

/**
 * Detect task type from query
 */
function detectTaskType(query: string): { taskType: ParsedIntent['taskType']; taskVerb: string } {
  const lowerQuery = query.toLowerCase()
  
  for (const [type, verbs] of Object.entries(TASK_VERB_PATTERNS)) {
    for (const verb of verbs) {
      if (lowerQuery.includes(verb)) {
        return { 
          taskType: type as ParsedIntent['taskType'], 
          taskVerb: verb 
        }
      }
    }
  }
  
  return { taskType: 'custom', taskVerb: 'processing' }
}

/**
 * Detect input type from query context
 */
function detectInputType(query: string): ParsedIntent['inputType'] {
  const lowerQuery = query.toLowerCase()
  
  for (const [type, patterns] of Object.entries(INPUT_TYPE_PATTERNS)) {
    for (const pattern of patterns) {
      if (lowerQuery.includes(pattern)) {
        return type as ParsedIntent['inputType']
      }
    }
  }
  
  return 'custom'
}

/**
 * Detect demographics from query
 */
function detectDemographics(query: string): string[] | undefined {
  const lowerQuery = query.toLowerCase()
  const detected: string[] = []
  
  for (const [demo, patterns] of Object.entries(DEMOGRAPHIC_PATTERNS)) {
    for (const pattern of patterns) {
      if (lowerQuery.includes(pattern)) {
        detected.push(demo)
        break
      }
    }
  }
  
  return detected.length > 0 ? detected : undefined
}

/**
 * Determine output and aggregation types based on task
 */
function determineOutputTypes(taskType: ParsedIntent['taskType']): { 
  outputType: ParsedIntent['outputType']
  aggregationType: ParsedIntent['aggregationType'] 
} {
  const mapping: Record<string, { outputType: ParsedIntent['outputType']; aggregationType: ParsedIntent['aggregationType'] }> = {
    rating: { outputType: 'scores', aggregationType: 'average' },
    reaction: { outputType: 'reactions', aggregationType: 'sentiment' },
    analysis: { outputType: 'analysis', aggregationType: 'consensus' },
    testing: { outputType: 'grades', aggregationType: 'grades' },
    creation: { outputType: 'selections', aggregationType: 'best-of' },
    voting: { outputType: 'consensus', aggregationType: 'majority' },
    debate: { outputType: 'summary', aggregationType: 'synthesis' },
    custom: { outputType: 'summary', aggregationType: 'synthesis' }
  }
  
  return mapping[taskType] || mapping.custom
}

// =============================================================================
// WORKFLOW SKELETON GENERATOR
// =============================================================================

function generateWorkflowSkeleton(intent: ParsedIntent) {
  const nodes: Array<{ type: string; label: string; payload: Record<string, unknown> }> = []
  const connections: Array<{ from: number; to: number }> = []
  
  // Input node based on input type
  const inputNodeIndex = 0
  const inputNodeConfig = getInputNodeConfig(intent.inputType)
  nodes.push(inputNodeConfig)
  
  // Placeholder for agents (will be filled by batch generation)
  const agentPlaceholderIndex = nodes.length
  nodes.push({
    type: '_agentPlaceholder',
    label: `${intent.agentCount} ${intent.agentNounPlural}`,
    payload: {
      agentCount: intent.agentCount,
      agentNoun: intent.agentNoun,
      agentNounPlural: intent.agentNounPlural,
      namingStyle: intent.namingStyle,
      taskType: intent.taskType,
      taskVerb: intent.taskVerb,
      demographicMix: intent.demographicMix,
    }
  })
  
  // Aggregator node based on task type
  const aggregatorIndex = nodes.length
  const aggregatorConfig = getAggregatorNodeConfig(intent)
  nodes.push(aggregatorConfig)
  
  // Output node
  const outputIndex = nodes.length
  const outputConfig = getOutputNodeConfig(intent)
  nodes.push(outputConfig)
  
  // Connections (placeholder, will be updated when agents are generated)
  connections.push({ from: inputNodeIndex, to: agentPlaceholderIndex })
  connections.push({ from: agentPlaceholderIndex, to: aggregatorIndex })
  connections.push({ from: aggregatorIndex, to: outputIndex })
  
  return {
    id: `${intent.agentNoun}-${intent.taskType}-workflow-${Date.now()}`,
    name: generateWorkflowName(intent),
    description: `${intent.agentCount} ${intent.agentNounPlural}: ${intent.taskDescription}`,
    category: 'analysis',
    nodes,
    connections,
  }
}

/**
 * Get input node configuration based on detected input type
 */
function getInputNodeConfig(inputType: ParsedIntent['inputType']): { type: string; label: string; payload: Record<string, unknown> } {
  const configs: Record<string, { type: string; label: string; payload: Record<string, unknown> }> = {
    test: {
      type: 'dataNode',
      label: 'Test Questions',
      payload: { label: 'Test Questions', subType: 'file', description: 'Upload test/exam questions' }
    },
    video: {
      type: 'contentUrlInputNode',
      label: 'Video Content',
      payload: { label: 'Video Content', description: 'Paste video URL' }
    },
    article: {
      type: 'contentUrlInputNode',
      label: 'Article',
      payload: { label: 'Article', description: 'Paste article URL' }
    },
    document: {
      type: 'dataNode',
      label: 'Document',
      payload: { label: 'Document', subType: 'file', description: 'Upload document for review' }
    },
    food: {
      type: 'dataNode',
      label: 'Recipe / Dish',
      payload: { label: 'Recipe / Dish', subType: 'text', description: 'Enter recipe or dish details' }
    },
    product: {
      type: 'dataNode',
      label: 'Product Details',
      payload: { label: 'Product Details', subType: 'text', description: 'Enter product information' }
    },
    data: {
      type: 'dataNode',
      label: 'Data Input',
      payload: { label: 'Data Input', subType: 'file', description: 'Upload your data' }
    },
    custom: {
      type: 'dataNode',
      label: 'Input',
      payload: { label: 'Input', subType: 'text', description: 'Enter your input data' }
    }
  }
  
  return configs[inputType] || configs.custom
}

/**
 * Get aggregator node configuration based on task type
 */
function getAggregatorNodeConfig(intent: ParsedIntent): { type: string; label: string; payload: Record<string, unknown> } {
  const labels: Record<ParsedIntent['aggregationType'], string> = {
    'average': 'Score Calculator',
    'sentiment': 'Sentiment Aggregator',
    'consensus': 'Consensus Builder',
    'grades': 'Grade Calculator',
    'best-of': 'Best-of Selector',
    'majority': 'Vote Tally',
    'synthesis': 'Argument Synthesizer'
  }
  
  const descriptions: Record<ParsedIntent['aggregationType'], string> = {
    'average': `Calculates average scores from all ${intent.agentCount} ${intent.agentNounPlural}`,
    'sentiment': `Analyzes sentiment patterns from all ${intent.agentCount} ${intent.agentNounPlural}`,
    'consensus': `Identifies common conclusions from all ${intent.agentCount} ${intent.agentNounPlural}`,
    'grades': `Computes grades/scores from all ${intent.agentCount} ${intent.agentNounPlural}`,
    'best-of': `Selects top outputs from all ${intent.agentCount} ${intent.agentNounPlural}`,
    'majority': `Tallies votes from all ${intent.agentCount} ${intent.agentNounPlural}`,
    'synthesis': `Synthesizes perspectives from all ${intent.agentCount} ${intent.agentNounPlural}`
  }
  
  return {
    type: 'analysisNode',
    label: labels[intent.aggregationType],
    payload: {
      label: labels[intent.aggregationType],
      analysisType: 'aggregation',
      aggregationType: intent.aggregationType,
      description: descriptions[intent.aggregationType]
    }
  }
}

/**
 * Get output node configuration
 */
function getOutputNodeConfig(intent: ParsedIntent): { type: string; label: string; payload: Record<string, unknown> } {
  const labels: Record<ParsedIntent['outputType'], string> = {
    'scores': 'Score Report',
    'reactions': 'Reaction Summary',
    'analysis': 'Analysis Report',
    'grades': 'Grade Report',
    'selections': 'Top Selections',
    'consensus': 'Final Decision',
    'summary': 'Summary Report'
  }
  
  return {
    type: 'outputNode',
    label: labels[intent.outputType],
    payload: {
      label: labels[intent.outputType],
      outputType: intent.outputType,
    }
  }
}

/**
 * Generate a descriptive workflow name
 */
function generateWorkflowName(intent: ParsedIntent): string {
  const nounLabel = intent.agentNoun.charAt(0).toUpperCase() + intent.agentNoun.slice(1)
  const verbLabel = intent.taskVerb.charAt(0).toUpperCase() + intent.taskVerb.slice(1)
  
  // Special cases for common patterns
  if (intent.taskType === 'testing' && intent.inputType === 'test') {
    return `${intent.agentCount} ${nounLabel}s Test Simulation`
  }
  
  if (intent.taskType === 'reaction' && intent.inputType === 'video') {
    return `${intent.agentCount} ${nounLabel}s Video Reaction`
  }
  
  if (intent.taskType === 'rating') {
    return `${intent.agentCount} ${nounLabel}s ${verbLabel} Session`
  }
  
  return `${intent.agentCount} ${nounLabel}s ${verbLabel} Workflow`
}

// =============================================================================
// API HANDLER
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json()
    
    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 })
    }
    
    // Universal parsing - works with ANY agent type
    const agentCount = extractCount(query)
    const { noun: agentNoun, plural: agentNounPlural } = extractAgentNoun(query)
    const namingStyle = getNamingStyle(agentNoun)
    const { taskType, taskVerb } = detectTaskType(query)
    const inputType = detectInputType(query)
    const demographicMix = detectDemographics(query)
    const { outputType, aggregationType } = determineOutputTypes(taskType)
    
    // Determine workflow type
    let workflowType: ParsedIntent['workflowType'] = 'simple'
    if (agentCount > 1) {
      workflowType = 'parallel-agents'
    }
    if (inputType === 'video') {
      workflowType = 'content-analysis'
    }
    
    const intent: ParsedIntent = {
      workflowType,
      agentCount,
      agentNoun,
      agentNounPlural,
      namingStyle,
      taskDescription: query,
      taskVerb,
      taskType,
      inputType,
      outputType,
      aggregationType,
      demographicMix,
    }
    
    // Generate workflow skeleton
    const skeleton = generateWorkflowSkeleton(intent)
    
    console.log('[Parse API] Parsed intent:', {
      agentCount,
      agentNoun,
      namingStyle,
      taskType,
      inputType,
      aggregationType
    })
    
    return NextResponse.json({
      success: true,
      intent,
      skeleton,
      needsBatchGeneration: agentCount > 1,
      estimatedBatches: Math.ceil(agentCount / 25),
    })
    
  } catch (error) {
    console.error('Intent parsing error:', error)
    return NextResponse.json({ error: 'Failed to parse intent' }, { status: 500 })
  }
}
