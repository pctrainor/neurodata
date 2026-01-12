import { NextRequest, NextResponse } from 'next/server'

/**
 * Data.gov Discovery API
 * 
 * Premium Feature: Agentic service that discovers relevant federal datasets
 * and suggests neuroscience research workflows based on available data.
 * 
 * Categories:
 * - Brain & Neuroscience
 * - Mental Health
 * - Substance Abuse
 * - Aging & Dementia
 * - Traumatic Brain Injury
 * - Clinical Trials
 */

interface DataGovDataset {
  id: string
  name: string
  title: string
  notes: string
  organization: { title: string }
  resources: Array<{
    format: string
    url: string
    name: string
  }>
  tags: Array<{ name: string }>
  metadata_modified: string
}

interface DiscoveredDataset {
  id: string
  title: string
  description: string
  agency: string
  formats: string[]
  tags: string[]
  lastUpdated: string
  suggestedWorkflow: {
    name: string
    description: string
    nodes: string[]
  }
}

// Categories for neuroscience-relevant data
const DISCOVERY_CATEGORIES = {
  'brain-research': {
    query: 'brain+neuroscience+neuroimaging',
    label: 'Brain Research',
    icon: 'brain',
  },
  'mental-health': {
    query: 'mental+health+depression+anxiety+psychiatric',
    label: 'Mental Health',
    icon: 'heart-pulse',
  },
  'substance-abuse': {
    query: 'substance+abuse+addiction+opioid+drug',
    label: 'Substance Abuse',
    icon: 'pill',
  },
  'aging-dementia': {
    query: 'alzheimer+dementia+aging+cognitive+decline',
    label: 'Aging & Dementia',
    icon: 'clock',
  },
  'traumatic-brain-injury': {
    query: 'traumatic+brain+injury+TBI+concussion',
    label: 'Traumatic Brain Injury',
    icon: 'activity',
  },
  'clinical-trials': {
    query: 'clinical+trial+neurology+psychiatry',
    label: 'Clinical Trials',
    icon: 'flask',
  },
}

// Generate workflow suggestion based on dataset
function generateWorkflowSuggestion(dataset: DataGovDataset): { name: string; description: string; nodes: string[] } {
  const title = dataset.title.toLowerCase()
  const tags = dataset.tags?.map(t => t.name.toLowerCase()) || []
  
  // Determine workflow type based on dataset characteristics
  if (title.includes('survey') || title.includes('surveillance')) {
    return {
      name: `${dataset.title.slice(0, 40)} Population Analysis`,
      description: `Analyze population-level patterns from ${dataset.organization?.title || 'federal'} survey data`,
      nodes: ['Data Source', 'Statistical Analysis', 'Population Segmentation', 'Trend Report'],
    }
  }
  
  if (title.includes('imaging') || title.includes('mri') || title.includes('scan')) {
    return {
      name: `${dataset.title.slice(0, 40)} Imaging Pipeline`,
      description: `Process neuroimaging data with reference population comparison`,
      nodes: ['BIDS Import', 'Preprocessing', 'HCP Reference', 'Deviation Analysis', '3D Report'],
    }
  }
  
  if (title.includes('clinical') || title.includes('trial') || title.includes('treatment')) {
    return {
      name: `${dataset.title.slice(0, 40)} Outcomes Study`,
      description: `Analyze treatment outcomes and efficacy patterns`,
      nodes: ['Clinical Data', 'Cohort Analysis', 'ML Classification', 'Outcome Predictor', 'Report'],
    }
  }
  
  if (tags.some(t => t.includes('mental') || t.includes('psych'))) {
    return {
      name: `${dataset.title.slice(0, 40)} Mental Health Analysis`,
      description: `Study mental health patterns and correlates`,
      nodes: ['Survey Data', 'Phenotype Correlator', 'UCLA Reference', 'Risk Assessment', 'Report'],
    }
  }
  
  // Default workflow
  return {
    name: `${dataset.title.slice(0, 40)} Research Workflow`,
    description: `Explore patterns in ${dataset.organization?.title || 'federal'} data`,
    nodes: ['Data Import', 'Exploratory Analysis', 'AI Interpretation', 'Research Report'],
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const category = searchParams.get('category') || 'brain-research'
  const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 20)
  
  const categoryConfig = DISCOVERY_CATEGORIES[category as keyof typeof DISCOVERY_CATEGORIES] 
    || DISCOVERY_CATEGORIES['brain-research']
  
  try {
    const dataGovUrl = `https://catalog.data.gov/api/3/action/package_search?q=${categoryConfig.query}&rows=${limit}&sort=metadata_modified+desc`
    
    const response = await fetch(dataGovUrl, {
      next: { revalidate: 3600 }, // Cache for 1 hour
      headers: {
        'Accept': 'application/json',
      }
    })

    if (!response.ok) {
      throw new Error(`Data.gov API error: ${response.status}`)
    }

    const data = await response.json()
    
    if (!data.success || !data.result?.results) {
      throw new Error('Invalid response from Data.gov')
    }

    const datasets: DiscoveredDataset[] = data.result.results.map((d: DataGovDataset) => ({
      id: d.id || d.name,
      title: d.title,
      description: d.notes?.slice(0, 300) || 'No description available',
      agency: d.organization?.title || 'Federal Agency',
      formats: d.resources?.map(r => r.format).filter(Boolean).slice(0, 5) || [],
      tags: d.tags?.map(t => t.name).slice(0, 8) || [],
      lastUpdated: d.metadata_modified,
      suggestedWorkflow: generateWorkflowSuggestion(d),
    }))

    return NextResponse.json({
      success: true,
      category: categoryConfig.label,
      categoryKey: category,
      totalFound: data.result.count,
      datasets,
      categories: Object.entries(DISCOVERY_CATEGORIES).map(([key, val]) => ({
        key,
        label: val.label,
        icon: val.icon,
      })),
    })

  } catch (error) {
    console.error('[Data.gov Discovery] Error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch datasets',
      categories: Object.entries(DISCOVERY_CATEGORIES).map(([key, val]) => ({
        key,
        label: val.label,
        icon: val.icon,
      })),
    }, { status: 500 })
  }
}
