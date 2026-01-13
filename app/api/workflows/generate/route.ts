import { NextRequest, NextResponse } from 'next/server'

// Available node types and their descriptions for the AI
const NODE_CATALOG = {
  // Data Input Nodes
  dataNode: {
    description: 'Input data sources - should have descriptive labels that explain what data is being fed in (e.g., "Game Performance Data", "Player Biometrics", "Match Statistics")',
    subTypes: ['file', 'bids', 's3', 'web', 'api'],
    useCases: ['patient scans', 'research datasets', 'external data', 'file uploads', 'game data', 'performance metrics'],
    labelGuidelines: 'The label should clearly describe the data being input, not just "Data" or "Input". Examples: "Lacrosse Game Data", "Player Heart Rate Sensors", "Match Video Feed"'
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
    description: 'Statistical and analytical operations - should have descriptive labels (e.g., "Performance Trend Analysis", "Reaction Time Study")',
    operations: ['connectivity', 'activation_mapping', 'volumetric', 'spectral', 'parcellation'],
    useCases: ['brain connectivity', 'activation patterns', 'volume measurements', 'frequency analysis']
  },
  mlNode: {
    description: 'Machine learning inference and classification',
    models: ['classification', 'segmentation', 'prediction', 'clustering'],
    useCases: ['disease classification', 'tissue segmentation', 'outcome prediction', 'phenotype clustering']
  },

  // Comparison & AI Nodes
  comparisonAgentNode: {
    description: 'Compare patient data against reference populations',
    comparisonTypes: ['deviation', 'zscore', 'percentile', 'correlation'],
    useCases: ['TBI analysis', 'deviation detection', 'percentile ranking', 'phenotype matching']
  },
  brainNode: {
    description: 'AI-powered interpretation and analysis (Gemini) - use for simulating individual viewers, players, or entities that need to analyze/react to content',
    useCases: ['interpret results', 'generate insights', 'explain findings', 'clinical summary', 'simulate viewer reactions', 'player analysis']
  },

  // Output Nodes
  outputNode: {
    description: 'Output and visualization nodes - should have descriptive labels (e.g., "Performance Report", "Team Dashboard", "Alert System")',
    outputTypes: ['report', '3d_visualization', 'export', 'dashboard', 'notification'],
    useCases: ['generate reports', '3D brain maps', 'export data', 'visualize results']
  }
}

// Build the system prompt with available resources
function buildSystemPrompt(): string {
  return `You are the NeuroData Hub Workflow Wizard. You help users create brain imaging analysis workflows by selecting and connecting the right nodes.

AVAILABLE NODE TYPES:
${Object.entries(NODE_CATALOG).map(([type, info]) => 
  `- ${type}: ${info.description}
   Use cases: ${info.useCases.join(', ')}`
).join('\n')}

AVAILABLE REFERENCE DATASETS:
- HCP 1200: Human Connectome Project with 1,200 healthy adult subjects (DTI, fMRI, structural MRI)
- OpenNeuro: 800+ open datasets covering various conditions and modalities
- Allen Brain Atlas: Gene expression and anatomical reference data
- UK Biobank: 500,000+ subjects with health and imaging data
- ADNI: Alzheimer's Disease Neuroimaging Initiative

AVAILABLE BRAIN REGIONS (204 from Allen Atlas):
- Frontal lobe regions (prefrontal cortex, motor cortex, Broca's area, etc.)
- Temporal lobe regions (hippocampus, amygdala, auditory cortex, etc.)
- Parietal lobe regions (somatosensory cortex, posterior parietal, etc.)
- Occipital lobe regions (visual cortex V1-V5, etc.)
- Subcortical structures (thalamus, basal ganglia, brainstem, cerebellum)
- White matter tracts (corpus callosum, arcuate fasciculus, etc.)

CRITICAL - NODE LABELING:
All nodes should have DESCRIPTIVE, MEANINGFUL labels that clearly explain their purpose:
- dataNode: Label should describe the data (e.g., "Lacrosse Game Data", "Player Biometrics Feed", "Match Statistics")
- analysisNode: Label should describe what's being analyzed (e.g., "Performance Trend Analysis", "Spectral Analysis")
- outputNode: Label should describe the output (e.g., "Brain Activity Reports", "Performance Dashboard", "Alert System")
- brainNode: When representing people/entities, include name and role (e.g., "Player 1 - Alex Thompson", "Viewer - Sarah Chen")

CRITICAL - HANDLING COUNT/QUANTITY REQUESTS:
When the user requests a specific NUMBER of something (e.g., "10 students", "5 brain regions", "100 simulated viewers"), you MUST generate EXACTLY that many individual nodes. Each node should be unique with:
- Unique label (e.g., "Student 1 - Sarah Chen", "Student 2 - Marcus Johnson", etc.)
- Unique payload data (demographics, characteristics, etc.)
- Appropriate connections to shared input/output nodes

Examples:
- "10 students taking a test" → Generate 10 separate brainNode nodes, each with unique student name/demographics
- "5 brain regions" → Generate 5 separate brainRegionNode nodes for different regions
- "100 diverse viewers" → Generate 100 brainNode nodes with varied demographic profiles
- "10 lacrosse players" → Generate a dataNode for game data, 10 brainNodes for each player, and an outputNode for reports

WORKFLOW RULES:
1. Every workflow needs at least one input (dataNode or referenceDatasetNode)
2. Analysis nodes process data from input nodes
3. comparisonAgentNode requires TWO inputs: patient data AND reference data
4. brainNode (AI) should come after analysis for interpretation
5. outputNode should be the final node to produce results
6. Connect nodes logically based on data flow
7. Generate a unique kebab-case ID for the workflow based on its purpose
8. When generating multiple parallel nodes (like multiple students/viewers), connect them all to the shared input and output nodes
9. For large counts (>20 nodes), you may generate a representative sample and indicate the pattern
10. For dataNode payloads, include a "sampleDataDescription" field explaining what sample data would contain

OUTPUT FORMAT (JSON):
{
  "id": "unique-kebab-case-id",
  "name": "Short Descriptive Name",
  "description": "One sentence describing the workflow",
  "category": "research" | "clinical" | "comparison" | "analysis",
  "nodes": [
    { "type": "nodeType", "label": "Descriptive Display Label", "payload": { "label": "...", "sampleDataDescription": "...", ...otherProps } }
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
            maxOutputTokens: 2048,
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
