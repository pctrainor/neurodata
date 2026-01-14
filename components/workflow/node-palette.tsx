'use client'

import React, { useState, useMemo } from 'react'
import { useTheme } from 'next-themes'
import { 
  Brain, 
  FileText, 
  Cpu, 
  Database, 
  Globe, 
  Zap, 
  BarChart3, 
  FileOutput,
  Radio,
  Sparkles,
  Activity,
  GripVertical,
  Library,
  Scale,
  Users,
  Dna,
  HeartPulse,
  ChevronDown,
  ChevronRight,
  Search,
  Plus,
  Settings2,
  Code2,
  Package,
  Star,
  Layers,
  Filter,
  X,
  Trash2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'

// ============================================================================
// TYPES
// ============================================================================

export interface DraggableNodeItem {
  type: string
  label: string
  icon: React.ElementType
  color: string
  bgColor: string
  payload: Record<string, unknown>
  tooltip: string
  difficulty?: 'beginner' | 'intermediate' | 'advanced'
  tags?: string[]
  isCustom?: boolean
  id?: string // For custom modules, allows deletion
}

interface NodeCategory {
  id: string
  title: string
  icon: React.ElementType
  iconColor: string
  description: string
  items: DraggableNodeItem[]
  defaultExpanded?: boolean
}

interface NodePaletteProps {
  onCreateModule?: () => void
  customModules?: DraggableNodeItem[]
  onDeleteCustomModule?: (moduleId: string) => void
}

// ============================================================================
// NODE CATEGORIES DATA
// ============================================================================

const nodeCategories: NodeCategory[] = [
  {
    id: 'ai-agents',
    title: 'AI Agents',
    icon: Brain,
    iconColor: 'text-purple-400',
    description: 'Smart nodes that orchestrate and analyze',
    defaultExpanded: true,
    items: [
      { 
        type: 'brainNode', 
        label: 'Brain Orchestrator', 
        icon: Brain, 
        color: 'text-purple-400',
        bgColor: 'bg-purple-500/10 hover:bg-purple-500/20 border-purple-500/30',
        payload: { label: 'Orchestrator' },
        tooltip: 'The "brain" of your workflow. Coordinates all connected nodes and generates insights.',
        difficulty: 'beginner',
        tags: ['core', 'orchestration']
      },
    ],
  },
  {
    id: 'reference-datasets',
    title: 'Reference Datasets',
    icon: Library,
    iconColor: 'text-amber-400',
    description: 'Gold-standard brain data for comparison',
    items: [
      { 
        type: 'referenceDatasetNode', 
        label: 'HCP Young Adult', 
        icon: Library, 
        color: 'text-amber-400',
        bgColor: 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30',
        payload: { 
          label: 'HCP 1200', 
          source: 'hcp', 
          subjectCount: 1200, 
          modality: 'fMRI/dMRI/T1w',
          description: 'Gold standard healthy brain connectivity' 
        },
        tooltip: '1,200 healthy young adults (22-35). Gold standard baseline.',
        difficulty: 'beginner',
        tags: ['healthy', 'baseline', 'fMRI']
      },
      { 
        type: 'referenceDatasetNode', 
        label: 'UCLA Neuropsych', 
        icon: HeartPulse, 
        color: 'text-amber-400',
        bgColor: 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30',
        payload: { 
          label: 'UCLA Consortium', 
          source: 'ucla', 
          subjectCount: 272, 
          modality: 'fMRI/T1w',
          description: 'ADHD, Schizophrenia, Bipolar phenotypes' 
        },
        tooltip: 'Clinical phenotypes: ADHD, Schizophrenia, Bipolar.',
        difficulty: 'intermediate',
        tags: ['clinical', 'psychiatric']
      },
      { 
        type: 'referenceDatasetNode', 
        label: 'Allen Brain Atlas', 
        icon: Dna, 
        color: 'text-amber-400',
        bgColor: 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30',
        payload: { 
          label: 'Allen Atlas', 
          source: 'allen', 
          subjectCount: 6, 
          modality: 'Gene Expression',
          description: '204 brain regions + gene expression' 
        },
        tooltip: 'Gene expression map for 204 brain regions.',
        difficulty: 'advanced',
        tags: ['genetics', 'expression']
      },
      { 
        type: 'referenceDatasetNode', 
        label: 'Midnight Scan Club', 
        icon: Users, 
        color: 'text-amber-400',
        bgColor: 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30',
        payload: { 
          label: 'Midnight Scan Club', 
          source: 'midnight_scan', 
          subjectCount: 10, 
          modality: 'fMRI (deep phenotyping)',
          description: '10 subjects, 5+ hours fMRI each' 
        },
        tooltip: 'Ultra-deep scanning: 10 subjects with 5+ hours each.',
        difficulty: 'advanced',
        tags: ['deep-phenotyping', 'variability']
      },
    ],
  },
  {
    id: 'comparison-agents',
    title: 'Comparison Agents',
    icon: Scale,
    iconColor: 'text-rose-400',
    description: 'Compare and benchmark brain data',
    items: [
      { 
        type: 'comparisonAgentNode', 
        label: 'Z-Score Benchmarker', 
        icon: Scale, 
        color: 'text-rose-400',
        bgColor: 'bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/30',
        payload: { 
          label: 'Z-Score Benchmarker', 
          comparisonType: 'zscore',
          outputFormat: 'report'
        },
        tooltip: 'Calculate standard deviations from normal baseline.',
        difficulty: 'beginner',
        tags: ['statistics', 'clinical']
      },
      { 
        type: 'comparisonAgentNode', 
        label: 'Phenotype Correlator', 
        icon: Scale, 
        color: 'text-rose-400',
        bgColor: 'bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/30',
        payload: { 
          label: 'Phenotype Correlator', 
          comparisonType: 'correlation',
          outputFormat: 'report'
        },
        tooltip: 'Match brain patterns to clinical diagnoses.',
        difficulty: 'intermediate',
        tags: ['diagnosis', 'correlation']
      },
      { 
        type: 'comparisonAgentNode', 
        label: 'Deviation Detector', 
        icon: Scale, 
        color: 'text-rose-400',
        bgColor: 'bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/30',
        payload: { 
          label: 'Deviation Detector', 
          comparisonType: 'deviation',
          threshold: 2,
          outputFormat: 'heatmap'
        },
        tooltip: 'Find regions deviating >2 SD from healthy baseline.',
        difficulty: 'intermediate',
        tags: ['anomaly', 'detection']
      },
    ],
  },
  {
    id: 'brain-regions',
    title: 'Brain Regions',
    icon: Brain,
    iconColor: 'text-violet-400',
    description: 'Target specific brain areas',
    items: [
      { 
        type: 'brainRegionNode', 
        label: 'Region Selector', 
        icon: Brain, 
        color: 'text-violet-400',
        bgColor: 'bg-violet-500/10 hover:bg-violet-500/20 border-violet-500/30',
        payload: { label: 'Select Region...', regionId: null },
        tooltip: 'Choose from 204 brain regions.',
        difficulty: 'beginner',
        tags: ['spatial', 'ROI']
      },
      { 
        type: 'brainRegionNode', 
        label: 'Prefrontal Cortex', 
        icon: Brain, 
        color: 'text-violet-400',
        bgColor: 'bg-violet-500/10 hover:bg-violet-500/20 border-violet-500/30',
        payload: { label: 'Prefrontal Cortex', regionId: 'pfc', abbreviation: 'PFC' },
        tooltip: 'Executive control, decision-making, working memory.',
        difficulty: 'beginner',
        tags: ['frontal', 'executive']
      },
      { 
        type: 'brainRegionNode', 
        label: 'Amygdala', 
        icon: Brain, 
        color: 'text-violet-400',
        bgColor: 'bg-violet-500/10 hover:bg-violet-500/20 border-violet-500/30',
        payload: { label: 'Amygdala', regionId: 'amygdala', abbreviation: 'AMY' },
        tooltip: 'Emotion and fear center. Key for anxiety, PTSD.',
        difficulty: 'beginner',
        tags: ['limbic', 'emotion']
      },
      { 
        type: 'brainRegionNode', 
        label: 'Hippocampus', 
        icon: Brain, 
        color: 'text-violet-400',
        bgColor: 'bg-violet-500/10 hover:bg-violet-500/20 border-violet-500/30',
        payload: { label: 'Hippocampus', regionId: 'hippocampus', abbreviation: 'HIP' },
        tooltip: 'Memory formation hub. Critical for Alzheimer\'s.',
        difficulty: 'beginner',
        tags: ['memory', 'temporal']
      },
    ],
  },
  {
    id: 'data-sources',
    title: 'Data Sources',
    icon: Database,
    iconColor: 'text-emerald-400',
    description: 'Input data from various sources',
    items: [
      { 
        type: 'dataNode', 
        label: 'EEG File (.edf)', 
        icon: FileText, 
        color: 'text-emerald-400',
        bgColor: 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30',
        payload: { label: 'EEG File', subType: 'file' },
        tooltip: 'Upload EEG recordings in .edf format.',
        difficulty: 'beginner',
        tags: ['EEG', 'upload']
      },
      { 
        type: 'dataNode', 
        label: 'Live Stream (LSL)', 
        icon: Radio, 
        color: 'text-emerald-400',
        bgColor: 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30',
        payload: { label: 'Live Stream', subType: 'stream' },
        tooltip: 'Real-time data from Lab Streaming Layer devices.',
        difficulty: 'advanced',
        tags: ['real-time', 'BCI']
      },
      { 
        type: 'dataNode', 
        label: 'BIDS Dataset', 
        icon: Activity, 
        color: 'text-emerald-400',
        bgColor: 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30',
        payload: { label: 'BIDS Dataset', subType: 'bids' },
        tooltip: 'Standard neuroimaging format for organized datasets.',
        difficulty: 'intermediate',
        tags: ['standard', 'organized']
      },
      {
        type: 'newsArticleNode',
        label: 'News Article',
        icon: FileText,
        color: 'text-blue-400',
        bgColor: 'bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/30',
        payload: { label: 'News Article', url: '' },
        tooltip: 'Analyze a news article for bias and content.',
        difficulty: 'beginner',
        tags: ['media', 'analysis']
      },
      {
        type: 'mediaNode',
        label: 'Media (Video)',
        icon: Sparkles,
        color: 'text-red-400',
        bgColor: 'bg-red-500/10 hover:bg-red-500/20 border-red-500/30',
        payload: { label: 'Media', subType: 'youtube', url: '' },
        tooltip: 'Analyze YouTube or video content.',
        difficulty: 'beginner',
        tags: ['video', 'youtube']
      },
    ],
  },
  {
    id: 'preprocessing',
    title: 'Preprocessing',
    icon: Zap,
    iconColor: 'text-yellow-400',
    description: 'Clean and prepare your data',
    items: [
      { 
        type: 'preprocessingNode', 
        label: 'Bandpass Filter', 
        icon: Zap, 
        color: 'text-yellow-400',
        bgColor: 'bg-yellow-500/10 hover:bg-yellow-500/20 border-yellow-500/30',
        payload: { label: 'Bandpass Filter', category: 'preprocessing' },
        tooltip: 'Keep only frequencies you want (1-40 Hz typical).',
        difficulty: 'beginner',
        tags: ['filter', 'frequency']
      },
      { 
        type: 'preprocessingNode', 
        label: 'ICA Artifact Removal', 
        icon: Zap, 
        color: 'text-yellow-400',
        bgColor: 'bg-yellow-500/10 hover:bg-yellow-500/20 border-yellow-500/30',
        payload: { label: 'ICA Filter', category: 'preprocessing' },
        tooltip: 'Remove eye blinks and muscle artifacts.',
        difficulty: 'intermediate',
        tags: ['artifact', 'ICA']
      },
    ],
  },
  {
    id: 'analysis',
    title: 'Analysis',
    icon: BarChart3,
    iconColor: 'text-cyan-400',
    description: 'Extract insights from data',
    items: [
      { 
        type: 'analysisNode', 
        label: 'Power Spectral Density', 
        icon: BarChart3, 
        color: 'text-cyan-400',
        bgColor: 'bg-cyan-500/10 hover:bg-cyan-500/20 border-cyan-500/30',
        payload: { label: 'PSD Analysis', category: 'analysis' },
        tooltip: 'Analyze frequency bands (delta, theta, alpha, beta).',
        difficulty: 'intermediate',
        tags: ['frequency', 'spectrum']
      },
      { 
        type: 'analysisNode', 
        label: 'Connectivity Matrix', 
        icon: BarChart3, 
        color: 'text-cyan-400',
        bgColor: 'bg-cyan-500/10 hover:bg-cyan-500/20 border-cyan-500/30',
        payload: { label: 'Connectivity', category: 'analysis' },
        tooltip: 'Map how brain regions communicate.',
        difficulty: 'intermediate',
        tags: ['network', 'connectivity']
      },
    ],
  },
  {
    id: 'machine-learning',
    title: 'Machine Learning',
    icon: Sparkles,
    iconColor: 'text-pink-400',
    description: 'AI-powered pattern recognition',
    items: [
      { 
        type: 'mlNode', 
        label: 'Sleep Staging', 
        icon: Sparkles, 
        color: 'text-pink-400',
        bgColor: 'bg-pink-500/10 hover:bg-pink-500/20 border-pink-500/30',
        payload: { label: 'Sleep Stage ML', category: 'ml_inference' },
        tooltip: 'Auto-detect sleep stages from overnight EEG.',
        difficulty: 'intermediate',
        tags: ['sleep', 'classification']
      },
      { 
        type: 'mlNode', 
        label: 'Custom Model', 
        icon: Cpu, 
        color: 'text-pink-400',
        bgColor: 'bg-pink-500/10 hover:bg-pink-500/20 border-pink-500/30',
        payload: { label: 'Custom ML', category: 'ml_inference' },
        tooltip: 'Upload your own TensorFlow/PyTorch model.',
        difficulty: 'advanced',
        tags: ['custom', 'deep-learning']
      },
    ],
  },
  {
    id: 'output',
    title: 'Output',
    icon: FileOutput,
    iconColor: 'text-orange-400',
    description: 'Export and report results',
    items: [
      { 
        type: 'outputNode', 
        label: 'BIDS Export', 
        icon: FileOutput, 
        color: 'text-orange-400',
        bgColor: 'bg-orange-500/10 hover:bg-orange-500/20 border-orange-500/30',
        payload: { label: 'BIDS Export', category: 'output_sink' },
        tooltip: 'Save results in BIDS format for sharing.',
        difficulty: 'beginner',
        tags: ['export', 'standard']
      },
      { 
        type: 'outputNode', 
        label: 'Report Generator', 
        icon: FileOutput, 
        color: 'text-orange-400',
        bgColor: 'bg-orange-500/10 hover:bg-orange-500/20 border-orange-500/30',
        payload: { label: 'Report', category: 'output_sink' },
        tooltip: 'Generate PDF/HTML report with findings.',
        difficulty: 'beginner',
        tags: ['report', 'PDF']
      },
    ],
  },
]

// ============================================================================
// DIFFICULTY BADGE COMPONENT
// ============================================================================

function DifficultyBadge({ level }: { level: 'beginner' | 'intermediate' | 'advanced' }) {
  const config = {
    beginner: { label: 'Easy', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
    intermediate: { label: 'Medium', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
    advanced: { label: 'Pro', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
  }
  const { label, color } = config[level]
  
  return (
    <span className={cn('text-[9px] px-1.5 py-0.5 rounded border font-medium', color)}>
      {label}
    </span>
  )
}

// ============================================================================
// DRAGGABLE NODE ITEM COMPONENT
// ============================================================================

function DraggableNodeItem({ 
  item, 
  isCompact, 
  onDelete 
}: { 
  item: DraggableNodeItem; 
  isCompact?: boolean;
  onDelete?: (moduleId: string) => void;
}) {
  const [isHovered, setIsHovered] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  
  const onDragStart = (event: React.DragEvent) => {
    event.dataTransfer.setData('application/reactflow', item.type)
    event.dataTransfer.setData('application/payload', JSON.stringify(item.payload))
    event.dataTransfer.effectAllowed = 'move'
  }

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    setShowDeleteConfirm(true)
  }

  const handleConfirmDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    if (item.id && onDelete) {
      onDelete(item.id)
    }
    setShowDeleteConfirm(false)
  }

  const handleCancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    setShowDeleteConfirm(false)
  }

  return (
    <div
      className="relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => { setIsHovered(false); setShowDeleteConfirm(false); }}
    >
      <div
        className={cn(
          'flex items-center gap-2 p-2 border rounded-lg cursor-grab active:cursor-grabbing',
          'transition-all duration-200 group hover:scale-[1.02] active:scale-[0.98]',
          item.bgColor,
          item.isCustom && 'ring-1 ring-indigo-500/30'
        )}
        draggable
        onDragStart={onDragStart}
      >
        <GripVertical className="w-3 h-3 text-slate-500 group-hover:text-slate-400 flex-shrink-0" />
        <item.icon className={cn('w-4 h-4 flex-shrink-0', item.color)} />
        <span className="text-xs font-medium text-slate-300 group-hover:text-slate-100 truncate flex-1">
          {item.label}
        </span>
        {item.difficulty && !isCompact && (
          <DifficultyBadge level={item.difficulty} />
        )}
        {item.isCustom && (
          <>
            <Star className="w-3 h-3 text-indigo-400 flex-shrink-0" fill="currentColor" />
            {/* Delete button appears on hover for custom items */}
            {isHovered && onDelete && !showDeleteConfirm && (
              <button
                onClick={handleDeleteClick}
                className="p-0.5 hover:bg-red-500/20 rounded transition-colors"
                title="Delete custom node"
              >
                <Trash2 className="w-3 h-3 text-red-400 hover:text-red-300" />
              </button>
            )}
            {/* Delete confirmation */}
            {showDeleteConfirm && (
              <div className="flex items-center gap-1">
                <button
                  onClick={handleConfirmDelete}
                  className="px-1.5 py-0.5 text-[9px] bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded transition-colors"
                >
                  Delete
                </button>
                <button
                  onClick={handleCancelDelete}
                  className="px-1.5 py-0.5 text-[9px] bg-slate-700 hover:bg-slate-600 text-slate-400 rounded transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}
          </>
        )}
      </div>
      
      {/* Tooltip on hover */}
      <AnimatePresence>
        {isHovered && !showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="absolute left-full top-0 ml-2 z-50 w-64 p-3 bg-slate-800 border border-slate-700 rounded-lg shadow-xl"
          >
            <div className="flex items-start gap-2 mb-2">
              <item.icon className={cn('w-4 h-4 mt-0.5 flex-shrink-0', item.color)} />
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-white">{item.label}</p>
                {item.isCustom && (
                  <span className="flex items-center gap-1 text-[9px] px-1.5 py-0.5 bg-indigo-500/20 text-indigo-400 rounded border border-indigo-500/30">
                    <Star className="w-2.5 h-2.5" fill="currentColor" />
                    AI Generated
                  </span>
                )}
                {item.difficulty && <DifficultyBadge level={item.difficulty} />}
              </div>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">{item.tooltip}</p>
            {item.tags && item.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {item.tags.map(tag => (
                  <span key={tag} className="text-[9px] px-1.5 py-0.5 bg-slate-700 text-slate-400 rounded">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ============================================================================
// COLLAPSIBLE CATEGORY COMPONENT
// ============================================================================

function CategorySection({ category, isExpanded, onToggle, searchQuery }: {
  category: NodeCategory
  isExpanded: boolean
  onToggle: () => void
  searchQuery: string
}) {
  const filteredItems = useMemo(() => {
    if (!searchQuery) return category.items
    const q = searchQuery.toLowerCase()
    return category.items.filter(item =>
      item.label.toLowerCase().includes(q) ||
      item.tooltip.toLowerCase().includes(q) ||
      item.tags?.some(tag => tag.toLowerCase().includes(q))
    )
  }, [category.items, searchQuery])

  if (searchQuery && filteredItems.length === 0) return null

  return (
    <div className="mb-1">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 p-2 hover:bg-slate-800/50 rounded-lg transition-colors group"
      >
        {isExpanded ? (
          <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
        )}
        <category.icon className={cn('w-4 h-4', category.iconColor)} />
        <span className="text-xs font-semibold text-slate-300 flex-1 text-left">
          {category.title}
        </span>
        <span className="text-[10px] text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded">
          {filteredItems.length}
        </span>
      </button>
      
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pl-3 pr-1 py-1 space-y-1">
              {filteredItems.map((item) => (
                <DraggableNodeItem key={`${item.type}-${item.label}`} item={item} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ============================================================================
// MAIN NODE PALETTE COMPONENT
// ============================================================================

export default function NodePalette({ onCreateModule, customModules = [], onDeleteCustomModule }: NodePaletteProps) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set([...nodeCategories.filter(c => c.defaultExpanded).map(c => c.id), 'custom']) // Always expand custom section
  )
  const [filterLevel, setFilterLevel] = useState<'all' | 'beginner' | 'intermediate' | 'advanced'>('all')
  const [showFilters, setShowFilters] = useState(false)

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev)
      if (next.has(categoryId)) {
        next.delete(categoryId)
      } else {
        next.add(categoryId)
      }
      return next
    })
  }

  const expandAll = () => {
    setExpandedCategories(new Set([...nodeCategories.map(c => c.id), 'custom']))
  }

  const collapseAll = () => {
    setExpandedCategories(new Set())
  }

  // Filter custom modules by search query
  const filteredCustomModules = useMemo(() => {
    if (!searchQuery) return customModules
    const q = searchQuery.toLowerCase()
    return customModules.filter(item =>
      item.label.toLowerCase().includes(q) ||
      item.tooltip.toLowerCase().includes(q) ||
      item.tags?.some(tag => tag.toLowerCase().includes(q))
    )
  }, [customModules, searchQuery])

  // Filter categories by difficulty level
  const filteredCategories = useMemo(() => {
    if (filterLevel === 'all') return nodeCategories
    return nodeCategories.map(category => ({
      ...category,
      items: category.items.filter(item => item.difficulty === filterLevel)
    })).filter(category => category.items.length > 0)
  }, [filterLevel])

  // Count all nodes including marketplace + custom
  const marketplaceNodes = nodeCategories.reduce((sum, cat) => sum + cat.items.length, 0)
  const totalNodes = marketplaceNodes + customModules.length

  return (
    <aside className={cn(
      "w-72 backdrop-blur-sm border-r flex flex-col h-full",
      isDark ? "bg-card/95 border-border" : "bg-white/95 border-slate-200"
    )}>
      {/* Header */}
      <div className={cn(
        "p-4 border-b",
        isDark ? "border-border" : "border-slate-200"
      )}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-primary" />
            <h2 className="text-sm font-bold text-foreground">Node Palette</h2>
          </div>
          <span className={cn(
            "text-[10px] px-2 py-1 rounded-full",
            isDark ? "text-muted-foreground bg-muted" : "text-slate-500 bg-slate-100"
          )}>
            {totalNodes} nodes
          </span>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search nodes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn(
              "w-full pl-9 pr-8 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary",
              isDark 
                ? "bg-muted border-border text-foreground placeholder:text-muted-foreground"
                : "bg-white border-slate-300 text-slate-900 placeholder:text-slate-400"
            )}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              title="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter & Expand Controls */}
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                'flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors',
                showFilters ? 'bg-indigo-500/20 text-indigo-400' : 'text-slate-400 hover:text-slate-300'
              )}
            >
              <Filter className="w-3 h-3" />
              Filter
            </button>
          </div>
          <div className="flex items-center gap-1 text-[10px]">
            <button onClick={expandAll} className="text-muted-foreground hover:text-foreground px-1">
              Expand All
            </button>
            <span className="text-muted-foreground/50">|</span>
            <button onClick={collapseAll} className="text-muted-foreground hover:text-foreground px-1">
              Collapse
            </button>
          </div>
        </div>

        {/* Difficulty Filter Pills */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="flex gap-1 mt-3">
                {(['all', 'beginner', 'intermediate', 'advanced'] as const).map(level => (
                  <button
                    key={level}
                    onClick={() => setFilterLevel(level)}
                    className={cn(
                      'px-2 py-1 text-[10px] rounded-full border transition-colors capitalize',
                      filterLevel === level
                        ? 'bg-primary/20 border-primary/50 text-primary'
                        : 'border-border text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {level === 'all' ? 'All Levels' : level}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Scrollable Categories */}
      <div className="flex-1 overflow-y-auto p-3">
        {/* CUSTOM SECTION - AI Generated Nodes (always at top when has items) */}
        {(customModules.length > 0 || onCreateModule) && (
          <div className="mb-1 relative">
            <button
              onClick={() => toggleCategory('custom')}
              className={cn(
                "w-full flex items-center gap-2 p-2 pr-10 rounded-lg transition-colors group",
                isDark ? "hover:bg-muted/50" : "hover:bg-slate-100"
              )}
            >
              {expandedCategories.has('custom') ? (
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
              )}
              <Star className="w-4 h-4 text-primary" fill="currentColor" />
              <span className="text-xs font-semibold text-primary flex-1 text-left">
                Custom
              </span>
              <span className="text-[10px] text-primary bg-primary/20 px-1.5 py-0.5 rounded border border-primary/30">
                {filteredCustomModules.length}
              </span>
            </button>
            {/* Create button - separate from toggle button to avoid nesting */}
            {onCreateModule && (
              <button
                onClick={(e) => { e.stopPropagation(); onCreateModule(); }}
                className="absolute right-2 top-2 flex items-center gap-1 px-1.5 py-0.5 text-[9px] bg-primary/20 hover:bg-primary/30 text-primary rounded transition-colors z-10"
                title="Create new custom module"
              >
                <Plus className="w-2.5 h-2.5" />
              </button>
            )}
            
            <AnimatePresence initial={false}>
              {expandedCategories.has('custom') && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="pl-3 pr-1 py-1 space-y-1">
                    {filteredCustomModules.length > 0 ? (
                      filteredCustomModules.map((module) => (
                        <DraggableNodeItem 
                          key={module.id || module.label} 
                          item={module} 
                          isCompact 
                          onDelete={onDeleteCustomModule}
                        />
                      ))
                    ) : customModules.length === 0 ? (
                      <div className="text-center py-3">
                        <p className="text-[10px] text-slate-500 mb-2">
                          No custom nodes yet
                        </p>
                        <p className="text-[9px] text-slate-600">
                          Use the AI Wizard to generate nodes, or save a workflow to create custom nodes.
                        </p>
                      </div>
                    ) : (
                      <p className="text-[10px] text-slate-500 text-center py-2">
                        No matches found
                      </p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Marketplace Categories */}
        {filteredCategories.map((category) => (
          <CategorySection
            key={category.id}
            category={category}
            isExpanded={expandedCategories.has(category.id)}
            onToggle={() => toggleCategory(category.id)}
            searchQuery={searchQuery}
          />
        ))}
      </div>

      {/* Footer */}
      <div className={cn(
        "p-3 border-t",
        isDark ? "border-border bg-card/50" : "border-slate-200 bg-slate-50"
      )}>
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span>Easy</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-yellow-500" />
              <span>Medium</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span>Pro</span>
            </div>
          </div>
          {customModules.length > 0 && (
            <div className="flex items-center gap-1 text-primary">
              <Star className="w-2.5 h-2.5" fill="currentColor" />
              <span>{customModules.length} custom</span>
            </div>
          )}
        </div>
        <p className="text-[10px] text-muted-foreground mt-2">
          Drag nodes onto the canvas to build your workflow
        </p>
      </div>
    </aside>
  )
}
