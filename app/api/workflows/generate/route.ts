import { NextRequest, NextResponse } from 'next/server'

// Demographic profiles for generating diverse virtual agents
const DEMOGRAPHIC_PROFILES = {
  ageGroups: [
    { id: 'gen-z', label: 'Gen Z (13-24)', traits: ['digital native', 'short attention span', 'values authenticity'] },
    { id: 'millennial', label: 'Millennial (25-40)', traits: ['tech savvy', 'work-life balance', 'experience-focused'] },
    { id: 'gen-x', label: 'Gen X (41-56)', traits: ['independent', 'skeptical', 'values quality'] },
    { id: 'boomer', label: 'Boomer (57-75)', traits: ['brand loyal', 'detail oriented', 'traditional values'] },
    { id: 'senior', label: 'Senior (75+)', traits: ['health conscious', 'family focused', 'wisdom seeker'] },
  ],
  personalityTypes: [
    { id: 'analytical', traits: ['data-driven', 'logical', 'detail-oriented'] },
    { id: 'creative', traits: ['imaginative', 'innovative', 'artistic'] },
    { id: 'social', traits: ['collaborative', 'empathetic', 'community-focused'] },
    { id: 'driver', traits: ['results-oriented', 'decisive', 'competitive'] },
  ]
}

// Available node types and their descriptions for the AI
const NODE_CATALOG = {
  // Content/Media Input Nodes
  contentUrlInputNode: {
    description: 'Universal media URL input - supports YouTube, TikTok, Instagram Reels, Twitter/X videos, Reddit posts, Vimeo, and any web content. Use for any video/content analysis workflows.',
    platforms: ['youtube', 'tiktok', 'instagram', 'twitter', 'reddit', 'vimeo', 'web'],
    useCases: ['video analysis', 'content reaction', 'social media analysis', 'viral content study', 'ad testing'],
    payloadFields: ['url', 'label', 'platform']
  },
  
  // Data Input Nodes
  dataNode: {
    description: 'General data input - files, text, or API data. Use descriptive labels.',
    subTypes: ['file', 'text', 'bids', 's3', 'web', 'api'],
    useCases: ['documents', 'spreadsheets', 'user input', 'uploaded files', 'text prompts'],
    labelGuidelines: 'Label should describe the data (e.g., "Customer Reviews", "Sales Data", "User Prompt")'
  },
  referenceDatasetNode: {
    description: 'Large reference datasets for comparison (HCP 1200, OpenNeuro, Allen Brain Atlas)',
    sources: ['hcp', 'openneuro', 'allen', 'ukbiobank', 'adni'],
    useCases: ['healthy controls', 'normative data', 'population baselines', 'gene expression']
  },
  brainRegionNode: {
    description: 'Specific brain regions from Allen Atlas (204 regions available)',
    useCases: ['targeted analysis', 'ROI studies', 'regional comparisons', 'lesion mapping']
  },

  // Processing Nodes
  preprocessingNode: {
    description: 'Data preprocessing steps',
    operations: ['motion_correction', 'skull_stripping', 'normalization', 'filtering', 'artifact_removal'],
    useCases: ['clean data', 'standardize scans', 'remove artifacts', 'prepare for analysis']
  },
  analysisNode: {
    description: 'Statistical and analytical operations with descriptive labels',
    operations: ['connectivity', 'activation_mapping', 'volumetric', 'spectral', 'trend_analysis', 'sentiment'],
    useCases: ['data analysis', 'pattern detection', 'statistical testing', 'aggregation']
  },
  mlNode: {
    description: 'Machine learning inference and classification',
    models: ['classification', 'segmentation', 'prediction', 'clustering', 'sentiment'],
    useCases: ['classification', 'prediction', 'clustering', 'anomaly detection']
  },

  // Comparison & AI Nodes
  comparisonAgentNode: {
    description: 'Compare data against reference populations or baselines',
    comparisonTypes: ['deviation', 'zscore', 'percentile', 'correlation', 'ab_test'],
    useCases: ['deviation detection', 'percentile ranking', 'A/B testing', 'benchmark comparison']
  },
  brainNode: {
    description: 'AI-powered agent (Gemini) - the core processing unit. Use for simulating individual people/viewers/users who analyze content and provide reactions. Each node can represent a unique persona with demographics.',
    payloadFields: ['label', 'demographic', 'traits', 'persona'],
    useCases: [
      'simulate viewer reactions', 
      'represent individual people in focus groups',
      'analyze content from different perspectives',
      'generate personalized responses',
      'aggregate opinions from diverse demographics'
    ]
  },

  // Output Nodes
  outputNode: {
    description: 'Output and visualization nodes - final results',
    outputTypes: ['report', 'dashboard', 'export', 'visualization', 'summary'],
    useCases: ['generate reports', 'export results', 'visualize data', 'create dashboards']
  }
}


// Build the system prompt with available resources
function buildSystemPrompt(): string {
  return `You are the NeuroData Hub Workflow Wizard. You help users create powerful AI-driven workflows by selecting and connecting the right nodes.

AVAILABLE NODE TYPES:
${Object.entries(NODE_CATALOG).map(([type, info]) => 
  `- ${type}: ${info.description}
   Use cases: ${info.useCases.join(', ')}`
).join('\n')}

DEMOGRAPHIC PROFILES FOR VIRTUAL AGENTS:
When creating multiple brainNode agents to simulate diverse people, use these profiles:
${DEMOGRAPHIC_PROFILES.ageGroups.map(g => `- ${g.label}: ${g.traits.join(', ')}`).join('\n')}
Personality Types: ${DEMOGRAPHIC_PROFILES.personalityTypes.map(p => p.id).join(', ')}

CONTENT URL NODE (contentUrlInputNode):
Use this node for ANY video or web content analysis. It automatically handles:
- YouTube videos and Shorts
- TikTok videos
- Instagram Reels and posts
- Twitter/X videos and posts
- Reddit posts and comments
- Any web article or blog post
- Vimeo videos

CRITICAL - MULTI-AGENT WORKFLOWS:
When users request multiple people/viewers/agents (e.g., "100 teenagers react to video", "50 people from each age group"):
1. Create ONE contentUrlInputNode for the shared content
2. Create MULTIPLE brainNode agents - generate THE EXACT COUNT the user requested
   - Label: Include name and demographic (e.g., "Viewer 1 - Alex (Gen Z)")
   - Payload with demographic, traits, and persona
   - Use varied names from diverse backgrounds
3. Connect all brainNodes to the content input
4. Create ONE analysisNode to aggregate responses (e.g., "Response Aggregator")
5. Create ONE outputNode for the final report

IMPORTANT: Generate exactly the number of agent nodes the user requests.
- If user asks for 100 students, create 100 brainNode agents
- If user asks for 50 viewers per age group, create 50 per group
- If user asks for 1000 agents, create 1000 brainNode agents
- There is NO LIMIT on the number of nodes you can generate
- The system is designed to handle thousands of parallel agents

For very large counts (1000+), ensure variety by:
- Using a wide range of names from different cultures
- Mixing demographic profiles appropriately
- Varying personality traits within each group

WORKFLOW RULES:
1. Every workflow needs at least one input (dataNode, contentUrlInputNode, or referenceDatasetNode)
2. For video/content analysis, ALWAYS use contentUrlInputNode (not dataNode)
3. brainNode represents individual AI agents - each should have unique identity
4. Connect multiple parallel brainNodes to shared inputs and outputs
5. Use analysisNode to aggregate results from multiple agents
6. outputNode should be the final node for results
7. Generate a unique kebab-case ID based on the workflow purpose

NODE LABELING BEST PRACTICES:
- contentUrlInputNode: "YouTube Video", "TikTok Content", "Social Media Post"
- brainNode (as person): "Viewer 1 - Sarah (Millennial)", "Teenager - Jake (Gen Z)"
- brainNode (as analyzer): "Sentiment Analyzer", "Content Reviewer"
- analysisNode: "Response Aggregator", "Trend Analysis", "Consensus Builder"
- outputNode: "Focus Group Report", "Reaction Summary", "Analysis Dashboard"

OUTPUT FORMAT (JSON):
{
  "id": "unique-kebab-case-id",
  "name": "Short Descriptive Name",
  "description": "One sentence describing the workflow (include full agent count if sampled)",
  "category": "research" | "clinical" | "comparison" | "analysis",
  "nodes": [
    { "type": "nodeType", "label": "Display Label", "payload": { "label": "...", ...props } }
  ],
  "connections": [
    { "from": 0, "to": 1 }  // indices into nodes array
  ]
}

Respond ONLY with valid JSON. No markdown, no explanation.`
}

// Fetch discovered datasets to include in prompt
async function fetchDiscoveredDatasets(baseUrl: string): Promise<string> {
  try {
    const response = await fetch(`${baseUrl}/api/datasets/discover?format=summary`, {
      next: { revalidate: 1800 },
    })
    
    if (response.ok) {
      const data = await response.json()
      if (data.datasets && data.datasets.length > 0) {
        const datasetList = data.datasets
          .slice(0, 15)
          .map((d: { name: string; source: string; id: string }) => 
            `- ${d.name} (${d.source}) [ID: ${d.id}]`
          )
          .join('\n')
        
        return `\n\nDYNAMICALLY DISCOVERED DATASETS (available now):\n${datasetList}\n\nWhen the user's query mentions a topic that matches one of these datasets, prefer using it as a data source in the workflow.`
      }
    }
  } catch (error) {
    console.error('Failed to fetch discovered datasets:', error)
  }
  return ''
}

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json()

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      )
    }

    const apiKey = process.env.GOOGLE_GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Gemini API key not configured' },
        { status: 500 }
      )
    }

    // Get base URL for internal API calls
    const baseUrl = new URL(request.url).origin
    
    // Fetch discovered datasets to enhance the prompt
    const discoveredDatasetsPrompt = await fetchDiscoveredDatasets(baseUrl)

    // Call Gemini to generate workflow
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: `${buildSystemPrompt()}${discoveredDatasetsPrompt}\n\nUser request: "${query}"` }]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 65536,  // Maximum allowed for large agent counts
          }
        })
      }
    )

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text()
      console.error('Gemini API error:', errorText)
      return NextResponse.json(
        { error: 'Failed to generate workflow' },
        { status: 500 }
      )
    }

    const geminiData = await geminiResponse.json()
    const responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text

    if (!responseText) {
      return NextResponse.json(
        { error: 'No response from AI' },
        { status: 500 }
      )
    }

    // Parse the JSON response (handle markdown code blocks if present)
    let cleanedResponse = responseText.trim()
    if (cleanedResponse.startsWith('```json')) {
      cleanedResponse = cleanedResponse.slice(7)
    } else if (cleanedResponse.startsWith('```')) {
      cleanedResponse = cleanedResponse.slice(3)
    }
    if (cleanedResponse.endsWith('```')) {
      cleanedResponse = cleanedResponse.slice(0, -3)
    }
    cleanedResponse = cleanedResponse.trim()

    try {
      const suggestion = JSON.parse(cleanedResponse)
      
      // Validate the structure
      if (!suggestion.id || !suggestion.name || !suggestion.nodes || !suggestion.connections) {
        throw new Error('Invalid workflow structure')
      }

      return NextResponse.json({
        success: true,
        suggestion,
        query
      })
    } catch (parseError) {
      console.error('Failed to parse AI response:', cleanedResponse)
      return NextResponse.json(
        { error: 'Failed to parse generated workflow', raw: cleanedResponse },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Workflow generation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
