import { NextRequest, NextResponse } from 'next/server'

export interface DiscoveredDataset {
  id: string
  name: string
  description: string
  source: 'openneuro' | 'data.gov' | 'cdc' | 'nih' | 'hcp' | 'allen' | 'ukbiobank'
  modality?: string[]
  subjectCount?: number
  size?: string
  url?: string
  tags: string[]
  downloadable: boolean
  lastUpdated?: string
}

interface DataGovResult {
  id: string
  title: string
  notes?: string
  resources?: Array<{ format: string; size?: number }>
  tags?: Array<{ name: string }>
  metadata_modified?: string
}

interface OpenNeuroDataset {
  id: string
  name: string
  description?: string
  modalities?: string[]
  subjectCount?: number
}

// Cache for discovered datasets (in production, use Redis or similar)
let datasetCache: { data: DiscoveredDataset[]; timestamp: number } | null = null
const CACHE_TTL = 1000 * 60 * 30 // 30 minutes

// Fetch from Data.gov health/neuroscience datasets
async function fetchDataGovDatasets(): Promise<DiscoveredDataset[]> {
  try {
    const queries = [
      'brain+imaging+neuroimaging',
      'mental+health+surveillance',
      'alzheimer+dementia',
      'traumatic+brain+injury',
      'autism+neurodevelopmental',
    ]
    
    const allDatasets: DiscoveredDataset[] = []
    
    for (const query of queries.slice(0, 2)) { // Limit to avoid rate limits
      const url = `https://catalog.data.gov/api/3/action/package_search?q=${query}&rows=5`
      const response = await fetch(url, {
        headers: { 'Accept': 'application/json' },
        next: { revalidate: 3600 },
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.result?.results) {
          const datasets = data.result.results.map((d: DataGovResult): DiscoveredDataset => ({
            id: `datagov-${d.id}`,
            name: d.title,
            description: d.notes?.slice(0, 200) || 'Federal health dataset',
            source: 'data.gov',
            tags: d.tags?.map((t: { name: string }) => t.name) || [],
            downloadable: true,
            url: `https://catalog.data.gov/dataset/${d.id}`,
            lastUpdated: d.metadata_modified,
          }))
          allDatasets.push(...datasets)
        }
      }
    }
    
    return allDatasets
  } catch (error) {
    console.error('Data.gov fetch error:', error)
    return []
  }
}

// Fetch from CDC data sources
async function fetchCDCDatasets(): Promise<DiscoveredDataset[]> {
  try {
    // CDC Socrata API
    const url = 'https://data.cdc.gov/api/views.json?category=Mental%20Health'
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 3600 },
    })
    
    if (response.ok) {
      const views = await response.json()
      if (Array.isArray(views)) {
        return views.slice(0, 10).map((v: { id: string; name: string; description?: string; tags?: string[] }): DiscoveredDataset => ({
          id: `cdc-${v.id}`,
          name: v.name,
          description: v.description?.slice(0, 200) || 'CDC surveillance data',
          source: 'cdc',
          tags: v.tags || ['mental health', 'surveillance'],
          downloadable: true,
          url: `https://data.cdc.gov/d/${v.id}`,
        }))
      }
    }
    return []
  } catch (error) {
    console.error('CDC fetch error:', error)
    return []
  }
}

// Fetch from OpenNeuro (GraphQL API)
async function fetchOpenNeuroDatasets(): Promise<DiscoveredDataset[]> {
  try {
    const query = `
      query {
        datasets(first: 15, orderBy: { created: desc }) {
          edges {
            node {
              id
              name
              description
              modalities
              publishedBy { name }
            }
          }
        }
      }
    `
    
    const response = await fetch('https://openneuro.org/crn/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
      next: { revalidate: 3600 },
    })
    
    if (response.ok) {
      const data = await response.json()
      const edges = data.data?.datasets?.edges || []
      
      return edges.map((edge: { node: OpenNeuroDataset }): DiscoveredDataset => ({
        id: edge.node.id,
        name: edge.node.name,
        description: edge.node.description?.slice(0, 200) || 'OpenNeuro neuroimaging dataset',
        source: 'openneuro',
        modality: edge.node.modalities || [],
        subjectCount: edge.node.subjectCount,
        tags: edge.node.modalities || ['neuroimaging'],
        downloadable: true,
        url: `https://openneuro.org/datasets/${edge.node.id}`,
      }))
    }
    return []
  } catch (error) {
    console.error('OpenNeuro fetch error:', error)
    return []
  }
}

// NIH Reporter API for funded neuroscience projects/data
async function fetchNIHDatasets(): Promise<DiscoveredDataset[]> {
  try {
    const response = await fetch('https://api.reporter.nih.gov/v2/projects/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        criteria: {
          advanced_text_search: {
            operator: 'and',
            search_field: 'all',
            search_text: 'brain imaging neuroimaging dataset'
          },
          fiscal_years: [2024, 2025, 2026],
        },
        limit: 10,
        offset: 0,
      }),
      next: { revalidate: 3600 },
    })
    
    if (response.ok) {
      const data = await response.json()
      const projects = data.results || []
      
      return projects
        .filter((p: { project_title: string }) => p.project_title)
        .slice(0, 8)
        .map((p: { 
          core_project_num: string
          project_title: string
          abstract_text?: string
          terms?: string
        }): DiscoveredDataset => ({
          id: `nih-${p.core_project_num}`,
          name: p.project_title,
          description: p.abstract_text?.slice(0, 200) || 'NIH-funded research project',
          source: 'nih',
          tags: p.terms?.split(';').slice(0, 5) || ['research', 'nih'],
          downloadable: false, // NIH Reporter is project metadata, not direct data
          url: `https://reporter.nih.gov/project-details/${p.core_project_num}`,
        }))
    }
    return []
  } catch (error) {
    console.error('NIH fetch error:', error)
    return []
  }
}

// Static reference datasets that are always available
function getStaticDatasets(): DiscoveredDataset[] {
  return [
    {
      id: 'hcp-1200',
      name: 'Human Connectome Project (HCP 1200)',
      description: 'High-quality neuroimaging data from 1,200 healthy young adults including structural MRI, fMRI, and diffusion imaging',
      source: 'hcp',
      modality: ['T1w', 'T2w', 'fMRI', 'dMRI'],
      subjectCount: 1200,
      size: '~1TB',
      tags: ['connectome', 'healthy adults', 'reference', 'normative'],
      downloadable: true,
      url: 'https://www.humanconnectome.org/study/hcp-young-adult',
    },
    {
      id: 'allen-brain-atlas',
      name: 'Allen Human Brain Atlas',
      description: 'Comprehensive gene expression data mapped to anatomical brain regions with 204 parcellations',
      source: 'allen',
      modality: ['gene expression', 'anatomical'],
      tags: ['gene expression', 'atlas', 'reference', 'parcellation'],
      downloadable: true,
      url: 'https://human.brain-map.org/',
    },
    {
      id: 'ukbiobank-brain',
      name: 'UK Biobank Brain Imaging',
      description: 'Brain MRI from 100,000+ participants in the UK Biobank prospective cohort study',
      source: 'ukbiobank',
      modality: ['T1w', 'T2-FLAIR', 'dMRI', 'resting fMRI', 'task fMRI'],
      subjectCount: 100000,
      tags: ['population', 'longitudinal', 'genetics', 'health outcomes'],
      downloadable: false, // Requires application
      url: 'https://www.ukbiobank.ac.uk/enable-your-research/about-our-data/imaging-data',
    },
    {
      id: 'adni',
      name: "Alzheimer's Disease Neuroimaging Initiative (ADNI)",
      description: "Longitudinal neuroimaging data tracking Alzheimer's disease progression from normal aging to dementia",
      source: 'nih',
      modality: ['MRI', 'PET', 'biomarkers'],
      subjectCount: 2000,
      tags: ['alzheimer', 'dementia', 'longitudinal', 'clinical'],
      downloadable: true,
      url: 'https://adni.loni.usc.edu/',
    },
  ]
}

// Main discovery function
async function discoverDatasets(query?: string): Promise<DiscoveredDataset[]> {
  // Check cache
  if (datasetCache && Date.now() - datasetCache.timestamp < CACHE_TTL) {
    const datasets = datasetCache.data
    if (query) {
      const q = query.toLowerCase()
      return datasets.filter(d => 
        d.name.toLowerCase().includes(q) ||
        d.description.toLowerCase().includes(q) ||
        d.tags.some(t => t.toLowerCase().includes(q))
      )
    }
    return datasets
  }
  
  // Fetch from all sources in parallel
  const [dataGov, cdc, openNeuro, nih] = await Promise.all([
    fetchDataGovDatasets(),
    fetchCDCDatasets(),
    fetchOpenNeuroDatasets(),
    fetchNIHDatasets(),
  ])
  
  // Combine with static datasets
  const allDatasets = [
    ...getStaticDatasets(),
    ...openNeuro,
    ...dataGov,
    ...cdc,
    ...nih,
  ]
  
  // Dedupe by ID
  const uniqueDatasets = Array.from(
    new Map(allDatasets.map(d => [d.id, d])).values()
  )
  
  // Update cache
  datasetCache = { data: uniqueDatasets, timestamp: Date.now() }
  
  // Filter by query if provided
  if (query) {
    const q = query.toLowerCase()
    return uniqueDatasets.filter(d => 
      d.name.toLowerCase().includes(q) ||
      d.description.toLowerCase().includes(q) ||
      d.tags.some(t => t.toLowerCase().includes(q))
    )
  }
  
  return uniqueDatasets
}

// Convert discovered datasets to workflow-compatible prompts
function datasetsToPrompts(datasets: DiscoveredDataset[]): string[] {
  return datasets.map(d => {
    switch (d.source) {
      case 'openneuro':
        return `Analyze ${d.name} dataset for brain patterns`
      case 'cdc':
        return `Study trends in ${d.name} from CDC data`
      case 'data.gov':
        return `Explore ${d.name} for neuroscience insights`
      case 'hcp':
        return `Use HCP reference data to compare brain connectivity`
      case 'allen':
        return `Map gene expression using Allen Brain Atlas`
      case 'nih':
        return `Analyze findings from ${d.name}`
      default:
        return `Analyze ${d.name} dataset`
    }
  })
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q') || undefined
  const format = searchParams.get('format') || 'full' // 'full' | 'prompts' | 'summary'
  
  try {
    const datasets = await discoverDatasets(query)
    
    if (format === 'prompts') {
      return NextResponse.json({
        prompts: datasetsToPrompts(datasets),
        count: datasets.length,
      })
    }
    
    if (format === 'summary') {
      return NextResponse.json({
        datasets: datasets.map(d => ({
          id: d.id,
          name: d.name,
          source: d.source,
          downloadable: d.downloadable,
        })),
        count: datasets.length,
        sources: [...new Set(datasets.map(d => d.source))],
      })
    }
    
    return NextResponse.json({
      datasets,
      count: datasets.length,
      sources: [...new Set(datasets.map(d => d.source))],
      cached: datasetCache ? Date.now() - datasetCache.timestamp < CACHE_TTL : false,
    })
  } catch (error) {
    console.error('Dataset discovery error:', error)
    return NextResponse.json(
      { error: 'Failed to discover datasets', datasets: getStaticDatasets() },
      { status: 500 }
    )
  }
}
