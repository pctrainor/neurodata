'use client'

import { useState, useEffect } from 'react'
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
  Plus,
  Trash2,
  User
} from 'lucide-react'
import Link from 'next/link'
import { Algorithm, NodeCategory } from '@/types/neuro'
import { createBrowserClient } from '@/lib/supabase'

// Custom module type (from localStorage)
interface CustomModuleDefinition {
  id: string
  type: string
  label: string
  description: string
  color: string
  bgColor: string
  category: string
  icon?: string
  config?: Record<string, unknown>
  createdAt?: string
}

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
    <div
      className="group bg-card rounded-lg border border-border p-3 sm:p-4 hover:border-foreground/20 transition-all duration-200 animate-in fade-in slide-in-from-bottom-2"
    >
      {/* Header row: icon + title + badges */}
      <div className="flex items-start gap-2.5 sm:gap-3">
        <div className={`p-1.5 sm:p-2 rounded-lg shrink-0 ${category.bgColor}`}>
          <CategoryIcon className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${category.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <h3 className="text-xs sm:text-sm font-medium text-foreground truncate" title={algorithm.name}>
              {algorithm.name}
            </h3>
            {algorithm.is_official && (
              <span className="shrink-0 px-1 sm:px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-medium bg-accent text-foreground">
                Official
              </span>
            )}
          </div>
          <span className={`text-[10px] sm:text-[11px] ${category.color}`}>{category.label}</span>
        </div>
      </div>

      {/* Description */}
      <p className="mt-2 text-[10px] sm:text-xs text-muted-foreground line-clamp-2">
        {algorithm.description || 'No description available'}
      </p>

      {/* Stats row */}
      <div className="mt-2.5 sm:mt-3 flex items-center gap-2 sm:gap-3 text-[10px] sm:text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <Download className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
          {algorithm.downloads.toLocaleString()}
        </span>
        {algorithm.rating && (
          <span className="flex items-center gap-1">
            <Star className="h-2.5 w-2.5 sm:h-3 sm:w-3 fill-yellow-400 text-yellow-400" />
            {algorithm.rating.toFixed(1)}
          </span>
        )}
        <span className="flex items-center gap-1">
          <Cpu className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
          {algorithm.requires_gpu ? 'GPU' : 'CPU'}
        </span>
      </div>

      {/* Action */}
      <Link
        href={`/dashboard/workflows/new?algorithm=${algorithm.id}`}
        className="mt-2.5 sm:mt-3 flex items-center justify-center gap-1.5 w-full px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-[10px] sm:text-xs font-medium hover:bg-primary/90 transition-colors"
      >
        <Plus className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
        Use in Workflow
      </Link>
    </div>
  )
}

// Custom Module Card Component
function CustomModuleCard({ 
  module, 
  onDelete 
}: { 
  module: CustomModuleDefinition
  onDelete: (id: string) => void 
}) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  
  return (
    <div className="group bg-card rounded-lg border border-border p-3 sm:p-4 hover:border-purple-500/50 transition-all duration-200 animate-in fade-in slide-in-from-bottom-2 relative">
      {/* Custom badge */}
      <div className="absolute -top-2 -right-2 z-10">
        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-medium bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-sm">
          <Sparkles className="h-2.5 w-2.5" />
          AI Generated
        </span>
      </div>
      
      {/* Header row: icon + title */}
      <div className="flex items-start gap-2.5 sm:gap-3">
        <div className="p-1.5 sm:p-2 rounded-lg shrink-0 bg-purple-500/10">
          <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-purple-500" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-xs sm:text-sm font-medium text-foreground truncate" title={module.label}>
            {module.label}
          </h3>
          <span className="text-[10px] sm:text-[11px] text-purple-500">{module.category || 'Custom Node'}</span>
        </div>
      </div>

      {/* Description */}
      <p className="mt-2 text-[10px] sm:text-xs text-muted-foreground line-clamp-2">
        {module.description || 'Custom AI-generated node'}
      </p>

      {/* Stats row */}
      <div className="mt-2.5 sm:mt-3 flex items-center gap-2 sm:gap-3 text-[10px] sm:text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <User className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
          Your Node
        </span>
        {module.createdAt && (
          <span className="text-muted-foreground/60">
            {new Date(module.createdAt).toLocaleDateString()}
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="mt-2.5 sm:mt-3 flex gap-2">
        <Link
          href="/dashboard/workflows/new"
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-[10px] sm:text-xs font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
          Use in Workflow
        </Link>
        
        {showDeleteConfirm ? (
          <div className="flex gap-1">
            <button
              onClick={() => onDelete(module.id)}
              className="px-2 py-1.5 rounded-md bg-red-500 text-white text-[10px] font-medium hover:bg-red-600 transition-colors"
            >
              Delete
            </button>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="px-2 py-1.5 rounded-md bg-muted text-muted-foreground text-[10px] font-medium hover:bg-muted/80 transition-colors"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="p-1.5 rounded-md bg-muted text-muted-foreground hover:bg-red-500/10 hover:text-red-500 transition-colors"
            title="Delete custom node"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}

export default function AlgorithmsPage() {
  const [algorithms, setAlgorithms] = useState<Algorithm[]>([])
  const [customModules, setCustomModules] = useState<CustomModuleDefinition[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<NodeCategory | 'all' | 'custom'>('all')

  // Load custom modules from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('neurodata_custom_modules')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed)) {
          setCustomModules(parsed)
          console.log('📦 Loaded', parsed.length, 'custom modules from localStorage')
        }
      }
    } catch (err) {
      console.error('Error loading custom modules:', err)
    }
  }, [])

  // Load algorithms from Supabase
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

  // Delete custom module
  const handleDeleteCustomModule = (id: string) => {
    setCustomModules(prev => {
      const updated = prev.filter(m => m.id !== id)
      localStorage.setItem('neurodata_custom_modules', JSON.stringify(updated))
      return updated
    })
  }

  // Filter custom modules
  const filteredCustomModules = customModules.filter((mod) => {
    if (selectedCategory === 'custom' || selectedCategory === 'all') {
      return mod?.label?.toLowerCase().includes(search.toLowerCase()) ||
        mod?.description?.toLowerCase().includes(search.toLowerCase())
    }
    return false
  })

  // Filter algorithms
  const filteredAlgorithms = algorithms.filter((algo) => {
    const matchesSearch = algo.name.toLowerCase().includes(search.toLowerCase()) ||
      algo.description?.toLowerCase().includes(search.toLowerCase()) ||
      algo.tags?.some(tag => tag.toLowerCase().includes(search.toLowerCase()))
    
    const matchesCategory = selectedCategory === 'all' || selectedCategory === 'custom' || algo.category === selectedCategory
    
    return matchesSearch && (selectedCategory === 'custom' ? false : matchesCategory)
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
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Algorithm Library</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Pre-built nodes for your analysis pipelines
          </p>
        </div>
        <Link
          href="/dashboard/workflows/new"
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors w-full sm:w-auto text-sm"
        >
          <Play className="h-4 w-4" />
          New Workflow
        </Link>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6 sm:mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search algorithms..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-muted/50 border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value as NodeCategory | 'all')}
            className="px-4 py-2.5 rounded-lg bg-card border border-border focus:border-primary outline-none text-foreground [&>option]:bg-card"
            title="Filter by category"
          >
            <option value="all">All Categories</option>
            {Object.entries(categoryMeta).map(([key, { label }]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Category Pills - Scrollable on mobile */}
      <div className="overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 mb-6 sm:mb-8">
        <div className="flex gap-2 min-w-max sm:flex-wrap">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
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
                className={`inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                  selectedCategory === key
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                }`}
              >
                <Icon className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${selectedCategory === key ? '' : color}`} />
                <span className="hidden xs:inline">{label}</span>
                <span className="xs:hidden">{label.split(' ')[0]}</span>
                <span>({count})</span>
              </button>
            )
          })}
          
          {/* My Custom Nodes pill */}
          {customModules.length > 0 && (
            <button
              onClick={() => setSelectedCategory('custom')}
              className={`inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                selectedCategory === 'custom'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                  : 'bg-gradient-to-r from-purple-500/10 to-pink-500/10 hover:from-purple-500/20 hover:to-pink-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/30'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline">My Custom Nodes</span>
              <span className="xs:hidden">Custom</span>
              <span>({customModules.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-52 sm:h-64 rounded-xl bg-muted/50 animate-pulse" />
          ))}
        </div>
      ) : selectedCategory === 'custom' ? (
        /* Custom Modules Only View */
        <div className="space-y-8 sm:space-y-12">
          <div>
            <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
              <div className="p-1.5 sm:p-2 rounded-lg bg-gradient-to-r from-purple-500/20 to-pink-500/20">
                <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-purple-500" />
              </div>
              <h2 className="text-lg sm:text-xl font-semibold">My Custom Nodes</h2>
              <span className="text-xs sm:text-sm text-muted-foreground">
                ({filteredCustomModules.length})
              </span>
            </div>
            {filteredCustomModules.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {filteredCustomModules.map((module) => (
                  <CustomModuleCard 
                    key={module.id} 
                    module={module} 
                    onDelete={handleDeleteCustomModule}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 px-4 bg-muted/30 rounded-xl border border-dashed border-border">
                <Sparkles className="h-10 w-10 text-purple-400 mx-auto mb-4" />
                <h3 className="text-base font-semibold mb-2">No custom nodes yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Create custom nodes using the AI Wizard in the workflow builder
                </p>
                <Link
                  href="/dashboard/workflows/new"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Create Workflow
                </Link>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Algorithm Grid */
        selectedCategory === 'all' ? (
          // Grouped view
          <div className="space-y-8 sm:space-y-12">
            {/* Show Custom Modules first if any exist */}
            {customModules.length > 0 && (
              <div>
                <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
                  <div className="p-1.5 sm:p-2 rounded-lg bg-gradient-to-r from-purple-500/20 to-pink-500/20">
                    <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-purple-500" />
                  </div>
                  <h2 className="text-lg sm:text-xl font-semibold">My Custom Nodes</h2>
                  <span className="text-xs sm:text-sm text-muted-foreground">
                    ({filteredCustomModules.length})
                  </span>
                  <Link 
                    href="/dashboard/workflows/new"
                    className="ml-auto text-xs text-purple-500 hover:text-purple-400 flex items-center gap-1"
                  >
                    <Plus className="h-3 w-3" />
                    Create more
                  </Link>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {filteredCustomModules.map((module) => (
                    <CustomModuleCard 
                      key={module.id} 
                      module={module} 
                      onDelete={handleDeleteCustomModule}
                    />
                  ))}
                </div>
              </div>
            )}
            
            {Object.entries(groupedAlgorithms).map(([category, algos]) => {
              const meta = categoryMeta[category as NodeCategory]
              const CategoryIcon = meta.icon
              
              return (
                <div key={category}>
                  <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
                    <div className={`p-1.5 sm:p-2 rounded-lg ${meta.bgColor}`}>
                      <CategoryIcon className={`h-4 w-4 sm:h-5 sm:w-5 ${meta.color}`} />
                    </div>
                    <h2 className="text-lg sm:text-xl font-semibold">{meta.label}</h2>
                    <span className="text-xs sm:text-sm text-muted-foreground">
                      ({algos.length})
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {filteredAlgorithms.map((algo) => (
              <AlgorithmCard key={algo.id} algorithm={algo} />
            ))}
          </div>
        )
      )}

      {/* Empty State */}
      {!loading && filteredAlgorithms.length === 0 && selectedCategory !== 'custom' && (
        <div className="text-center py-12 sm:py-16 px-4">
          <Cpu className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-base sm:text-lg font-semibold mb-2">No algorithms found</h3>
          <p className="text-xs sm:text-sm text-muted-foreground">
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
