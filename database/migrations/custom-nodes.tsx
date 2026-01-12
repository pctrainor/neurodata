'use client'

import React, { memo, useState, useCallback, useEffect } from 'react'
import { Handle, Position, NodeProps, useReactFlow } from '@xyflow/react'
import { useTheme } from 'next-themes'
import { 
  Brain, 
  Database, 
  Cpu, 
  FileText, 
  Globe, 
  Activity,
  Zap,
  BarChart3,
  FileOutput,
  Radio,
  Sparkles,
  Library,
  Scale,
  ChevronDown,
  MapPin,
  Search,
  Play,
  ExternalLink,
  Edit3,
  Youtube,
  Video
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { NodeCategory, NodeStatus } from '@/types/neuro'
import { createBrowserClient } from '@/lib/supabase'

// Fallback brain regions if Supabase fetch fails
const FALLBACK_REGIONS = [
  { id: 'pfc', name: 'Prefrontal Cortex', abbreviation: 'PFC', category: 'frontal' },
  { id: 'dlpfc', name: 'Dorsolateral Prefrontal Cortex', abbreviation: 'dlPFC', category: 'frontal' },
  { id: 'acc', name: 'Anterior Cingulate Cortex', abbreviation: 'ACC', category: 'frontal' },
  { id: 'm1', name: 'Primary Motor Cortex', abbreviation: 'M1', category: 'frontal' },
  { id: 'amygdala', name: 'Amygdala', abbreviation: 'AMY', category: 'subcortical' },
  { id: 'hippocampus', name: 'Hippocampus', abbreviation: 'HIP', category: 'temporal' },
  { id: 'thalamus', name: 'Thalamus', abbreviation: 'TH', category: 'subcortical' },
  { id: 'striatum', name: 'Striatum', abbreviation: 'STR', category: 'subcortical' },
  { id: 'insula', name: 'Insula', abbreviation: 'INS', category: 'temporal' },
  { id: 'v1', name: 'Primary Visual Cortex', abbreviation: 'V1', category: 'occipital' },
  { id: 'cerebellum', name: 'Cerebellum', abbreviation: 'CB', category: 'cerebellum' },
  { id: 'brainstem', name: 'Brainstem', abbreviation: 'BS', category: 'brainstem' },
  { id: 'basal_ganglia', name: 'Basal Ganglia', abbreviation: 'BG', category: 'subcortical' },
  { id: 'corpus_callosum', name: 'Corpus Callosum', abbreviation: 'CC', category: 'fiber_tracts' },
]

interface BrainRegionOption {
  id: string
  name: string
  abbreviation: string | null
  category?: string
}

// --- Status indicator colors ---
const statusColors: Record<NodeStatus, string> = {
  idle: 'bg-slate-500',
  queued: 'bg-yellow-500 animate-pulse',
  initializing: 'bg-blue-500 animate-pulse',
  running: 'bg-green-500 animate-pulse',
  completed: 'bg-green-500',
  failed: 'bg-red-500',
  skipped: 'bg-slate-400',
}

// --- Category colors for consistent theming ---
const categoryColors: Record<string, { 
  border: string
  shadow: string
  bg: string
  text: string
  handle: string
}> = {
  brain: {
    border: 'border-purple-500',
    shadow: 'shadow-purple-500/20',
    bg: 'bg-purple-500/20',
    text: 'text-purple-400',
    handle: '!bg-purple-500',
  },
  data: {
    border: 'border-emerald-500',
    shadow: 'shadow-emerald-500/20',
    bg: 'bg-emerald-500/20',
    text: 'text-emerald-400',
    handle: '!bg-emerald-500',
  },
  compute: {
    border: 'border-blue-500',
    shadow: 'shadow-blue-500/20',
    bg: 'bg-blue-500/20',
    text: 'text-blue-400',
    handle: '!bg-blue-500',
  },
  preprocessing: {
    border: 'border-yellow-500',
    shadow: 'shadow-yellow-500/20',
    bg: 'bg-yellow-500/20',
    text: 'text-yellow-400',
    handle: '!bg-yellow-500',
  },
  analysis: {
    border: 'border-cyan-500',
    shadow: 'shadow-cyan-500/20',
    bg: 'bg-cyan-500/20',
    text: 'text-cyan-400',
    handle: '!bg-cyan-500',
  },
  ml: {
    border: 'border-pink-500',
    shadow: 'shadow-pink-500/20',
    bg: 'bg-pink-500/20',
    text: 'text-pink-400',
    handle: '!bg-pink-500',
  },
  output: {
    border: 'border-orange-500',
    shadow: 'shadow-orange-500/20',
    bg: 'bg-orange-500/20',
    text: 'text-orange-400',
    handle: '!bg-orange-500',
  },
  region: {
    border: 'border-violet-500',
    shadow: 'shadow-violet-500/20',
    bg: 'bg-violet-500/20',
    text: 'text-violet-400',
    handle: '!bg-violet-500',
  },
  reference: {
    border: 'border-amber-500',
    shadow: 'shadow-amber-500/20',
    bg: 'bg-amber-500/20',
    text: 'text-amber-400',
    handle: '!bg-amber-500',
  },
  comparison: {
    border: 'border-rose-500',
    shadow: 'shadow-rose-500/20',
    bg: 'bg-rose-500/20',
    text: 'text-rose-400',
    handle: '!bg-rose-500',
  },
}

// --- Helper for consistent node styling ---
interface NodeWrapperProps {
  children: React.ReactNode
  selected?: boolean
  colorKey: string
  label: string
  subtitle?: string
  status?: NodeStatus
  progress?: number
}

function NodeWrapper({ 
  children, 
  selected, 
  colorKey, 
  label, 
  subtitle,
  status = 'idle',
  progress = 0
}: NodeWrapperProps) {
  const colors = categoryColors[colorKey] || categoryColors.compute
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  return (
    <div 
      className={cn(
        'px-4 py-3 shadow-lg rounded-xl backdrop-blur-sm border-2 transition-all duration-200 min-w-[180px]',
        isDark ? 'bg-slate-900/95' : 'bg-white/95',
        selected 
          ? `${colors.border} ${colors.shadow} shadow-xl scale-105` 
          : isDark 
            ? 'border-slate-700/50 hover:border-slate-600' 
            : 'border-slate-300/50 hover:border-slate-400'
      )}
    >
      {/* Status indicator */}
      <div className="absolute -top-1 -right-1">
        <div className={cn(
          'w-3 h-3 rounded-full border-2', 
          isDark ? 'border-slate-900' : 'border-white',
          statusColors[status]
        )} />
      </div>

      <div className="flex items-center gap-3">
        {children}
        <div className="flex-1 min-w-0">
          <p className={cn(
            'text-sm font-semibold truncate',
            isDark ? 'text-slate-100' : 'text-slate-800'
          )}>{label}</p>
          {subtitle && (
            <p className={cn(
              'text-[10px] uppercase tracking-wider',
              isDark ? 'text-slate-400' : 'text-slate-500'
            )}>{subtitle}</p>
          )}
        </div>
      </div>

      {/* Progress bar when running */}
      {status === 'running' && progress > 0 && (
        <div className={cn(
          'mt-2 h-1 rounded-full overflow-hidden',
          isDark ? 'bg-slate-700' : 'bg-slate-200'
        )}>
          <div 
            className="h-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  )
}

// === NODE TYPE DEFINITIONS ===

export interface BrainNodeData {
  label: string
  prompt?: string
  model?: string
  computeTier?: string
  [key: string]: unknown
}

export interface DataNodeData {
  label: string
  subType: 'file' | 'stream' | 'database' | 'web' | 'bids' | 'url'
  fileName?: string
  value?: string  // URL value
  demoUrl?: string  // Pre-filled demo URL
  placeholder?: string
  thumbnailUrl?: string  // Video thumbnail
  [key: string]: unknown
}

export interface ComputeNodeData {
  label: string
  category: NodeCategory
  algorithmId?: string
  status?: NodeStatus
  progress?: number
  [key: string]: unknown
}

// --- 1. The Brain Node (Orchestrator Agent) ---
export const BrainNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = data as BrainNodeData
  
  return (
    <NodeWrapper 
      selected={selected} 
      colorKey="brain" 
      label={nodeData.label}
      subtitle="AI Orchestrator"
    >
      <div className="p-2.5 bg-purple-500/20 rounded-xl">
        <Brain className="w-6 h-6 text-purple-400" />
      </div>
      {/* Brains accept input from data/compute nodes */}
      <Handle 
        type="target" 
        position={Position.Left} 
        className="!bg-purple-500 !w-3 !h-3 !border-2 !border-slate-900" 
      />
      {/* Brains output results/actions */}
      <Handle 
        type="source" 
        position={Position.Right} 
        className="!bg-purple-500 !w-3 !h-3 !border-2 !border-slate-900" 
      />
    </NodeWrapper>
  )
})
BrainNode.displayName = 'BrainNode'

// --- 2. Data Source Node (Files, Streams, BIDS) ---
export const DataNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = data as DataNodeData
  
  const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    file: FileText,
    stream: Radio,
    database: Database,
    web: Globe,
    bids: Activity,
    url: Globe,
  }
  const Icon = iconMap[nodeData.subType] || Database

  const subtitleMap: Record<string, string> = {
    file: 'EEG/fMRI File',
    stream: 'Live Stream',
    database: 'Database',
    web: 'Web Reference',
    bids: 'BIDS Dataset',
    url: 'Content URL',
  }

  return (
    <NodeWrapper 
      selected={selected} 
      colorKey="data" 
      label={nodeData.label}
      subtitle={subtitleMap[nodeData.subType] || 'Data Source'}
    >
      <div className="p-2.5 bg-emerald-500/20 rounded-xl">
        <Icon className="w-6 h-6 text-emerald-400" />
      </div>
      {/* Data sources only output */}
      <Handle 
        type="source" 
        position={Position.Right} 
        className="!bg-emerald-500 !w-3 !h-3 !border-2 !border-slate-900" 
      />
    </NodeWrapper>
  )
})
DataNode.displayName = 'DataNode'

// --- 3. Preprocessing Node ---
export const PreprocessingNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = data as ComputeNodeData
  
  return (
    <NodeWrapper 
      selected={selected} 
      colorKey="preprocessing" 
      label={nodeData.label}
      subtitle="Preprocessing"
      status={nodeData.status}
      progress={nodeData.progress}
    >
      <div className="p-2.5 bg-yellow-500/20 rounded-xl">
        <Zap className="w-6 h-6 text-yellow-400" />
      </div>
      <Handle 
        type="target" 
        position={Position.Left} 
        className="!bg-yellow-500 !w-3 !h-3 !border-2 !border-slate-900" 
      />
      <Handle 
        type="source" 
        position={Position.Right} 
        className="!bg-yellow-500 !w-3 !h-3 !border-2 !border-slate-900" 
      />
    </NodeWrapper>
  )
})
PreprocessingNode.displayName = 'PreprocessingNode'

// --- 4. Analysis Node ---
export const AnalysisNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = data as ComputeNodeData
  
  return (
    <NodeWrapper 
      selected={selected} 
      colorKey="analysis" 
      label={nodeData.label}
      subtitle="Analysis"
      status={nodeData.status}
      progress={nodeData.progress}
    >
      <div className="p-2.5 bg-cyan-500/20 rounded-xl">
        <BarChart3 className="w-6 h-6 text-cyan-400" />
      </div>
      <Handle 
        type="target" 
        position={Position.Left} 
        className="!bg-cyan-500 !w-3 !h-3 !border-2 !border-slate-900" 
      />
      <Handle 
        type="source" 
        position={Position.Right} 
        className="!bg-cyan-500 !w-3 !h-3 !border-2 !border-slate-900" 
      />
    </NodeWrapper>
  )
})
AnalysisNode.displayName = 'AnalysisNode'

// --- 5. ML Node (Inference/Training) ---
export const MLNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = data as ComputeNodeData
  
  return (
    <NodeWrapper 
      selected={selected} 
      colorKey="ml" 
      label={nodeData.label}
      subtitle="Machine Learning"
      status={nodeData.status}
      progress={nodeData.progress}
    >
      <div className="p-2.5 bg-pink-500/20 rounded-xl">
        <Sparkles className="w-6 h-6 text-pink-400" />
      </div>
      <Handle 
        type="target" 
        position={Position.Left} 
        className="!bg-pink-500 !w-3 !h-3 !border-2 !border-slate-900" 
      />
      <Handle 
        type="source" 
        position={Position.Right} 
        className="!bg-pink-500 !w-3 !h-3 !border-2 !border-slate-900" 
      />
    </NodeWrapper>
  )
})
MLNode.displayName = 'MLNode'

// --- 6. Output Node (Export, Results) ---
export const OutputNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = data as ComputeNodeData
  
  return (
    <NodeWrapper 
      selected={selected} 
      colorKey="output" 
      label={nodeData.label}
      subtitle="Output"
      status={nodeData.status}
      progress={nodeData.progress}
    >
      <div className="p-2.5 bg-orange-500/20 rounded-xl">
        <FileOutput className="w-6 h-6 text-orange-400" />
      </div>
      {/* Output nodes only accept input */}
      <Handle 
        type="target" 
        position={Position.Left} 
        className="!bg-orange-500 !w-3 !h-3 !border-2 !border-slate-900" 
      />
    </NodeWrapper>
  )
})
OutputNode.displayName = 'OutputNode'

// --- 7. Generic Compute Node (fallback) ---
export const ComputeNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = data as ComputeNodeData
  
  return (
    <NodeWrapper 
      selected={selected} 
      colorKey="compute" 
      label={nodeData.label}
      subtitle="Compute"
      status={nodeData.status}
      progress={nodeData.progress}
    >
      <div className="p-2.5 bg-blue-500/20 rounded-xl">
        <Cpu className="w-6 h-6 text-blue-400" />
      </div>
      <Handle 
        type="target" 
        position={Position.Left} 
        className="!bg-blue-500 !w-3 !h-3 !border-2 !border-slate-900" 
      />
      <Handle 
        type="source" 
        position={Position.Right} 
        className="!bg-blue-500 !w-3 !h-3 !border-2 !border-slate-900" 
      />
    </NodeWrapper>
  )
})
ComputeNode.displayName = 'ComputeNode'

// --- 8. Brain Region Node (Interactive Selector - "The Region is the Query") ---
export interface BrainRegionNodeData {
  label: string
  regionId?: string
  abbreviation?: string
  hemisphere?: 'left' | 'right' | 'bilateral'
  category?: string
  functions?: string[]
  [key: string]: unknown
}

export const BrainRegionNode = memo(({ id, data, selected }: NodeProps) => {
  const nodeData = data as BrainRegionNodeData
  const { setNodes } = useReactFlow()
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [regions, setRegions] = useState<BrainRegionOption[]>(FALLBACK_REGIONS)
  const [isLoading, setIsLoading] = useState(true)
  
  // Fetch regions from Supabase
  useEffect(() => {
    async function fetchRegions() {
      try {
        const supabase = createBrowserClient()
        const { data, error } = await supabase
          .from('brain_regions')
          .select('id, name, abbreviation')
          .order('name')
          .limit(300)
        
        if (error) throw error
        if (data && data.length > 0) {
          setRegions(data)
        }
      } catch (err) {
        console.error('Failed to fetch regions, using fallback:', err)
        // Keep using FALLBACK_REGIONS
      } finally {
        setIsLoading(false)
      }
    }
    fetchRegions()
  }, [])
  
  const handleRegionSelect = useCallback((region: BrainRegionOption) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === id) {
          return {
            ...node,
            data: {
              ...node.data,
              label: region.name,
              regionId: region.id,
              abbreviation: region.abbreviation || undefined,
              category: region.category,
            },
          }
        }
        return node
      })
    )
    setIsOpen(false)
    setSearchQuery('')
  }, [id, setNodes])

  // Check if we have a pre-selected region (from URL or nodeData)
  const hasPreselectedRegion = nodeData.regionId && nodeData.label && nodeData.label !== 'Select Region...'
  
  // Find selected region in list, or use nodeData directly if pre-selected
  const selectedRegion = regions.find(r => r.id === nodeData.regionId) || 
    (hasPreselectedRegion ? { 
      id: nodeData.regionId!, 
      name: nodeData.label, 
      abbreviation: nodeData.abbreviation || null,
      category: nodeData.category 
    } : null)
  
  // Filter regions by search
  const filteredRegions = regions.filter(r => 
    r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (r.abbreviation && r.abbreviation.toLowerCase().includes(searchQuery.toLowerCase()))
  )
  
  const colors = categoryColors.region

  return (
    <div 
      className={cn(
        'px-4 py-3 shadow-lg rounded-xl bg-slate-900/95 backdrop-blur-sm border-2 transition-all duration-200 min-w-[220px]',
        selected ? `${colors.border} ${colors.shadow} shadow-xl scale-105` : 'border-slate-700/50 hover:border-slate-600'
      )}
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2.5 bg-violet-500/20 rounded-xl">
          <MapPin className="w-6 h-6 text-violet-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-100">Brain Region</p>
          <p className="text-[10px] text-slate-400 uppercase tracking-wider">Spatial Filter</p>
        </div>
      </div>

      {/* Region Selector Dropdown */}
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            'w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all',
            'bg-slate-800 border border-slate-700 hover:border-violet-500/50',
            selectedRegion ? 'text-slate-100' : 'text-slate-400'
          )}
        >
          <span className="truncate">
            {selectedRegion ? (
              <span className="flex items-center gap-2">
                {selectedRegion.abbreviation && (
                  <span className="text-violet-400 font-mono text-xs">{selectedRegion.abbreviation}</span>
                )}
                {selectedRegion.name}
              </span>
            ) : isLoading ? (
              'Loading regions...'
            ) : (
              'Select Region...'
            )}
          </span>
          <ChevronDown className={cn('w-4 h-4 text-slate-400 transition-transform', isOpen && 'rotate-180')} />
        </button>

        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl overflow-hidden">
            {/* Search input */}
            <div className="p-2 border-b border-slate-700">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search 204 regions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-7 pr-2 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded text-slate-200 placeholder-slate-500 focus:border-violet-500 focus:outline-none"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>
            
            {/* Region list */}
            <div className="max-h-48 overflow-y-auto py-1">
              {filteredRegions.length === 0 ? (
                <div className="px-3 py-2 text-xs text-slate-500">No regions found</div>
              ) : (
                filteredRegions.slice(0, 50).map((region) => (
                  <button
                    key={region.id}
                    onClick={() => handleRegionSelect(region)}
                    className={cn(
                      'w-full px-3 py-1.5 text-left text-sm hover:bg-violet-500/20 transition-colors flex items-center gap-2',
                      nodeData.regionId === region.id ? 'bg-violet-500/10 text-violet-300' : 'text-slate-300'
                    )}
                  >
                    {region.abbreviation && (
                      <span className="text-violet-400 font-mono text-[10px] w-10 shrink-0">{region.abbreviation}</span>
                    )}
                    <span className="truncate">{region.name}</span>
                  </button>
                ))
              )}
              {filteredRegions.length > 50 && (
                <div className="px-3 py-1.5 text-xs text-slate-500 border-t border-slate-700">
                  +{filteredRegions.length - 50} more • Type to search
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Show selected region info */}
      {selectedRegion && (
        <div className="mt-2 flex items-center gap-2">
          {selectedRegion.category && (
            <span className="px-2 py-0.5 rounded text-[10px] bg-violet-500/20 text-violet-300 capitalize">
              {selectedRegion.category}
            </span>
          )}
          {selectedRegion.abbreviation && (
            <span className="text-[10px] text-slate-500">{selectedRegion.abbreviation}</span>
          )}
        </div>
      )}

      {/* Can receive input (e.g., from Reference Dataset for normative data) */}
      <Handle 
        type="target" 
        position={Position.Left} 
        className="!bg-violet-500 !w-3 !h-3 !border-2 !border-slate-900" 
      />
      {/* Outputs the region mask/filter to downstream nodes */}
      <Handle 
        type="source" 
        position={Position.Right} 
        className="!bg-violet-500 !w-3 !h-3 !border-2 !border-slate-900" 
      />
    </div>
  )
})
BrainRegionNode.displayName = 'BrainRegionNode'

// --- 9. Reference Dataset Node (Control Group as a Service) ---
export interface ReferenceDatasetNodeData {
  label: string
  datasetId?: string
  source: 'hcp' | 'ucla' | 'allen' | 'openneuro' | 'midnight_scan'
  subjectCount?: number
  modality?: string
  description?: string
  [key: string]: unknown
}

export const ReferenceDatasetNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = data as ReferenceDatasetNodeData
  
  const sourceLabels: Record<string, string> = {
    hcp: 'HCP 1200',
    ucla: 'UCLA Consortium',
    allen: 'Allen Atlas',
    openneuro: 'OpenNeuro',
    midnight_scan: 'Midnight Scan Club',
  }
  
  return (
    <NodeWrapper 
      selected={selected} 
      colorKey="reference" 
      label={nodeData.label}
      subtitle={`${nodeData.subjectCount?.toLocaleString() || '—'} subjects`}
    >
      <div className="p-2.5 bg-amber-500/20 rounded-xl">
        <Library className="w-6 h-6 text-amber-400" />
      </div>
      {/* Reference datasets provide context/comparison data */}
      <Handle 
        type="source" 
        position={Position.Right} 
        className="!bg-amber-500 !w-3 !h-3 !border-2 !border-slate-900" 
      />
    </NodeWrapper>
  )
})
ReferenceDatasetNode.displayName = 'ReferenceDatasetNode'

// --- 10. Comparison Agent Node (The Benchmarker) ---
export interface ComparisonAgentNodeData {
  label: string
  comparisonType: 'zscore' | 'correlation' | 'deviation' | 'similarity'
  threshold?: number
  outputFormat?: 'report' | 'heatmap' | 'json'
  prompt?: string
  status?: NodeStatus
  progress?: number
  [key: string]: unknown
}

export const ComparisonAgentNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = data as ComparisonAgentNodeData
  
  const typeLabels: Record<string, string> = {
    zscore: 'Z-Score',
    correlation: 'Correlation',
    deviation: 'Deviation',
    similarity: 'Similarity',
  }
  
  return (
    <NodeWrapper 
      selected={selected} 
      colorKey="comparison" 
      label={nodeData.label}
      subtitle={typeLabels[nodeData.comparisonType] || 'Comparison'}
      status={nodeData.status}
      progress={nodeData.progress}
    >
      <div className="p-2.5 bg-rose-500/20 rounded-xl">
        <Scale className="w-6 h-6 text-rose-400" />
      </div>
      {/* Takes user data + reference data as inputs */}
      <Handle 
        type="target" 
        position={Position.Left} 
        id="user-data"
        style={{ top: '30%' }}
        className="!bg-rose-500 !w-3 !h-3 !border-2 !border-slate-900" 
      />
      <Handle 
        type="target" 
        position={Position.Left} 
        id="reference-data"
        style={{ top: '70%' }}
        className="!bg-amber-500 !w-3 !h-3 !border-2 !border-slate-900" 
      />
      <Handle 
        type="source" 
        position={Position.Right} 
        className="!bg-rose-500 !w-3 !h-3 !border-2 !border-slate-900" 
      />
    </NodeWrapper>
  )
})
ComparisonAgentNode.displayName = 'ComparisonAgentNode'

// Export node types map for React Flow
export const nodeTypes = {
  brainNode: BrainNode,
  dataNode: DataNode,
  preprocessingNode: PreprocessingNode,
  analysisNode: AnalysisNode,
  mlNode: MLNode,
  outputNode: OutputNode,
  computeNode: ComputeNode,
  brainRegionNode: BrainRegionNode,
  referenceDatasetNode: ReferenceDatasetNode,
  comparisonAgentNode: ComparisonAgentNode,
}
