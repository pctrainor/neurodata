'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Search, 
  Filter, 
  Cpu, 
  Brain, 
  Zap, 
  Database, 
  BarChart3, 
  FileOutput,
  Sparkles,
  Download,
  Star,
  ChevronRight,
  Play,
  Plus
} from 'lucide-react'
import Link from 'next/link'
import { Algorithm, NodeCategory } from '@/types/neuro'
import { createBrowserClient } from '@/lib/supabase'

// Category metadata for display
const categoryMeta: Record<NodeCategory, { 
  label: string
  icon: React.ElementType
  color: string
  bgColor: string
}> = {
  input_source: { 
    label: 'Data Input', 
    icon: Database, 
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10'
  },
  preprocessing: { 
    label: 'Preprocessing', 
    icon: Zap, 
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10'
  },
  analysis: { 
    label: 'Analysis', 
    icon: BarChart3, 
    color: 'text-green-500',
    bgColor: 'bg-green-500/10'
  },
  ml_inference: { 
    label: 'ML Inference', 
    icon: Brain, 
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10'
  },
  ml_training: { 
    label: 'ML Training', 
    icon: Sparkles, 
    color: 'text-pink-500',
    bgColor: 'bg-pink-500/10'
  },
  visualization: { 
    label: 'Visualization', 
    icon: BarChart3, 
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-500/10'
  },
  output_sink: { 
    label: 'Output', 
    icon: FileOutput, 
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10'
  },
}

function AlgorithmCard({ algorithm }: { algorithm: Algorithm }) {
  const category = categoryMeta[algorithm.category]
  const CategoryIcon = category.icon

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="group bg-card rounded-lg border border-border p-4 hover:border-foreground/20 transition-all duration-200"
    >
      {/* Header row: icon + title + badges */}
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg shrink-0 ${category.bgColor}`}>
          <CategoryIcon className={`h-4 w-4 ${category.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium text-foreground truncate" title={algorithm.name}>
              {algorithm.name}
            </h3>
            {algorithm.is_official && (
              <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium bg-accent text-foreground">
                Official
              </span>
            )}
          </div>
          <span className={`text-[11px] ${category.color}`}>{category.label}</span>
        </div>
      </div>

      {/* Description */}
      <p className="mt-2 text-xs text-muted-foreground line-clamp-2">
        {algorithm.description || 'No description available'}
      </p>

      {/* Stats row */}
      <div className="mt-3 flex items-center gap-3 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <Download className="h-3 w-3" />
          {algorithm.downloads.toLocaleString()}
        </span>
        {algorithm.rating && (
          <span className="flex items-center gap-1">
            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
            {algorithm.rating.toFixed(1)}
          </span>
        )}
        <span className="flex items-center gap-1">
          <Cpu className="h-3 w-3" />
          {algorithm.requires_gpu ? 'GPU' : 'CPU'}
        </span>
      </div>

      {/* Action */}
      <Link
        href={`/dashboard/workflows/new?algorithm=${algorithm.id}`}
        className="mt-3 flex items-center justify-center gap-1.5 w-full px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
      >
        <Plus className="h-3.5 w-3.5" />
        Use in Workflow
      </Link>
    </motion.div>
  )
}

export default function AlgorithmsPage() {
  const [algorithms, setAlgorithms] = useState<Algorithm[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<NodeCategory | 'all'>('all')

  useEffect(() => {
    async function fetchAlgorithms() {
      try {
        const supabase = createBrowserClient()
        const { data, error } = await supabase
          .from('algorithm_library')
          .select('*')
          .eq('is_public', true)
          .order('downloads', { ascending: false })

        if (error) throw error
        setAlgorithms(data || [])
      } catch (err) {
        console.error('Error fetching algorithms:', err)
        // Use sample data for demo
        setAlgorithms(sampleAlgorithms)
      } finally {
        setLoading(false)
      }
    }

    fetchAlgorithms()
  }, [])

  // Filter algorithms
  const filteredAlgorithms = algorithms.filter((algo) => {
    const matchesSearch = algo.name.toLowerCase().includes(search.toLowerCase()) ||
      algo.description?.toLowerCase().includes(search.toLowerCase()) ||
      algo.tags?.some(tag => tag.toLowerCase().includes(search.toLowerCase()))
    
    const matchesCategory = selectedCategory === 'all' || algo.category === selectedCategory
    
    return matchesSearch && matchesCategory
  })

  // Group by category
  const groupedAlgorithms = filteredAlgorithms.reduce((acc, algo) => {
    if (!acc[algo.category]) {
      acc[algo.category] = []
    }
    acc[algo.category].push(algo)
    return acc
  }, {} as Record<NodeCategory, Algorithm[]>)

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Algorithm Library</h1>
          <p className="text-muted-foreground mt-1">
            Pre-built nodes for your analysis pipelines
          </p>
        </div>
        <Link
          href="/dashboard/workflows/new"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
        >
          <Play className="h-4 w-4" />
          New Workflow
        </Link>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search algorithms..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-muted/50 border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value as NodeCategory | 'all')}
            className="px-4 py-2.5 rounded-lg bg-card border border-border focus:border-primary outline-none text-foreground [&>option]:bg-card"
          >
            <option value="all">All Categories</option>
            {Object.entries(categoryMeta).map(([key, { label }]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex flex-wrap gap-2 mb-8">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            selectedCategory === 'all'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted hover:bg-muted/80 text-muted-foreground'
          }`}
        >
          All ({algorithms.length})
        </button>
        {Object.entries(categoryMeta).map(([key, { label, icon: Icon, color }]) => {
          const count = algorithms.filter(a => a.category === key).length
          return (
            <button
              key={key}
              onClick={() => setSelectedCategory(key as NodeCategory)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                selectedCategory === key
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted/80 text-muted-foreground'
              }`}
            >
              <Icon className={`h-4 w-4 ${selectedCategory === key ? '' : color}`} />
              {label} ({count})
            </button>
          )
        })}
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-64 rounded-xl bg-muted/50 animate-pulse" />
          ))}
        </div>
      ) : (
        /* Algorithm Grid */
        selectedCategory === 'all' ? (
          // Grouped view
          <div className="space-y-12">
            {Object.entries(groupedAlgorithms).map(([category, algos]) => {
              const meta = categoryMeta[category as NodeCategory]
              const CategoryIcon = meta.icon
              
              return (
                <div key={category}>
                  <div className="flex items-center gap-3 mb-6">
                    <div className={`p-2 rounded-lg ${meta.bgColor}`}>
                      <CategoryIcon className={`h-5 w-5 ${meta.color}`} />
                    </div>
                    <h2 className="text-xl font-semibold">{meta.label}</h2>
                    <span className="text-sm text-muted-foreground">
                      ({algos.length} algorithms)
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {algos.map((algo) => (
                      <AlgorithmCard key={algo.id} algorithm={algo} />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          // Flat view for single category
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAlgorithms.map((algo) => (
              <AlgorithmCard key={algo.id} algorithm={algo} />
            ))}
          </div>
        )
      )}

      {/* Empty State */}
      {!loading && filteredAlgorithms.length === 0 && (
        <div className="text-center py-16">
          <Cpu className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No algorithms found</h3>
          <p className="text-muted-foreground">
            Try adjusting your search or filter criteria
          </p>
        </div>
      )}
    </div>
  )
}

// Sample data for demo/fallback
const sampleAlgorithms: Algorithm[] = [
  {
    id: 'algo-001',
    name: 'EDF File Loader',
    description: 'Load and parse European Data Format (EDF/EDF+) files commonly used for EEG recordings. Supports channel selection and resampling.',
    category: 'input_source',
    tags: ['eeg', 'edf', 'input', 'mne'],
    container_image: 'mne-python',
    container_registry: 'ghcr.io/neurodata-hub',
    default_config: {},
    config_schema: {},
    input_schema: { type: 'file', format: '.edf' },
    output_schema: { type: 'mne-raw' },
    documentation_url: null,
    paper_doi: null,
    example_workflow_id: null,
    recommended_cpu: 1,
    recommended_memory_gb: 4,
    requires_gpu: false,
    version: '1.0.0',
    author: 'NeuroData Hub',
    license: 'MIT',
    downloads: 1250,
    rating: 4.8,
    is_official: true,
    is_public: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'algo-002',
    name: 'Bandpass Filter',
    description: 'Apply FIR bandpass filter to EEG signals. Extract frequency bands like delta, theta, alpha, beta, gamma.',
    category: 'preprocessing',
    tags: ['filter', 'frequency', 'eeg', 'signal-processing'],
    container_image: 'mne-python',
    container_registry: 'ghcr.io/neurodata-hub',
    default_config: { low_freq: 1, high_freq: 40 },
    config_schema: {},
    input_schema: { type: 'mne-raw' },
    output_schema: { type: 'mne-raw' },
    documentation_url: null,
    paper_doi: null,
    example_workflow_id: null,
    recommended_cpu: 2,
    recommended_memory_gb: 4,
    requires_gpu: false,
    version: '1.0.0',
    author: 'NeuroData Hub',
    license: 'MIT',
    downloads: 2100,
    rating: 4.9,
    is_official: true,
    is_public: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'algo-003',
    name: 'ICA Artifact Removal',
    description: 'Independent Component Analysis for automatic detection and removal of eye blinks, muscle artifacts, and other noise sources.',
    category: 'preprocessing',
    tags: ['ica', 'artifact', 'eeg', 'denoising'],
    container_image: 'mne-python',
    container_registry: 'ghcr.io/neurodata-hub',
    default_config: { n_components: 20, method: 'fastica' },
    config_schema: {},
    input_schema: { type: 'mne-raw' },
    output_schema: { type: 'mne-raw' },
    documentation_url: null,
    paper_doi: null,
    example_workflow_id: null,
    recommended_cpu: 4,
    recommended_memory_gb: 8,
    requires_gpu: false,
    version: '1.0.0',
    author: 'NeuroData Hub',
    license: 'MIT',
    downloads: 1800,
    rating: 4.7,
    is_official: true,
    is_public: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'algo-004',
    name: 'Power Spectral Density',
    description: 'Compute and visualize power spectral density using Welch method. Generate band power features for classification.',
    category: 'analysis',
    tags: ['psd', 'frequency', 'power', 'features'],
    container_image: 'mne-python',
    container_registry: 'ghcr.io/neurodata-hub',
    default_config: { fmin: 0.5, fmax: 50, n_fft: 2048 },
    config_schema: {},
    input_schema: { type: 'mne-raw' },
    output_schema: { type: 'numpy-array' },
    documentation_url: null,
    paper_doi: null,
    example_workflow_id: null,
    recommended_cpu: 2,
    recommended_memory_gb: 4,
    requires_gpu: false,
    version: '1.0.0',
    author: 'NeuroData Hub',
    license: 'MIT',
    downloads: 1500,
    rating: 4.6,
    is_official: true,
    is_public: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'algo-005',
    name: 'Motor Imagery Classifier',
    description: 'Deep learning model for classifying left/right motor imagery from EEG. Based on EEGNet architecture.',
    category: 'ml_inference',
    tags: ['motor-imagery', 'bci', 'deep-learning', 'classification'],
    container_image: 'pytorch-eeg',
    container_registry: 'ghcr.io/neurodata-hub',
    default_config: { model: 'eegnet', threshold: 0.5 },
    config_schema: {},
    input_schema: { type: 'numpy-array' },
    output_schema: { type: 'prediction' },
    documentation_url: null,
    paper_doi: '10.1088/1741-2552/aace8c',
    example_workflow_id: null,
    recommended_cpu: 4,
    recommended_memory_gb: 8,
    requires_gpu: true,
    version: '1.0.0',
    author: 'NeuroData Hub',
    license: 'MIT',
    downloads: 890,
    rating: 4.5,
    is_official: true,
    is_public: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'algo-006',
    name: 'BIDS Exporter',
    description: 'Export processed data to Brain Imaging Data Structure (BIDS) format. Includes metadata generation and validation.',
    category: 'output_sink',
    tags: ['bids', 'export', 'standard', 'derivatives'],
    container_image: 'mne-bids',
    container_registry: 'ghcr.io/neurodata-hub',
    default_config: { validate: true },
    config_schema: {},
    input_schema: { type: 'mne-raw' },
    output_schema: { type: 'bids-derivative' },
    documentation_url: null,
    paper_doi: null,
    example_workflow_id: null,
    recommended_cpu: 1,
    recommended_memory_gb: 2,
    requires_gpu: false,
    version: '1.0.0',
    author: 'NeuroData Hub',
    license: 'MIT',
    downloads: 650,
    rating: 4.4,
    is_official: true,
    is_public: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]
