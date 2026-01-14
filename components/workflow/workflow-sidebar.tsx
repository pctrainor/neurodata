'use client'

import React from 'react'
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
  Star
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Tooltip } from '@/components/ui/tooltip'

// Custom module type (from parent component)
export interface CustomModuleDefinition {
  id: string
  name: string
  description: string
  category: string
  icon: string
  behavior: string
  inputs: { id: string; name: string; type: string; required: boolean }[]
  outputs: { id: string; name: string; type: string }[]
  color: string
  createdAt: Date
}

interface DraggableNodeItem {
  type: string
  label: string
  icon: React.ElementType
  color: string
  bgColor: string
  payload: Record<string, unknown>
  tooltip: string
}

interface NodeGroup {
  title: string
  items: DraggableNodeItem[]
}

const nodeGroups: NodeGroup[] = [
  {
    title: 'AI Agents',
    items: [
      { 
        type: 'brainNode', 
        label: 'Brain Orchestrator', 
        icon: Brain, 
        color: 'text-purple-400',
        bgColor: 'bg-purple-500/10 hover:bg-purple-500/20 border-purple-500/30',
        payload: { label: 'Orchestrator' },
        tooltip: '🧠 The "brain" of your workflow. Coordinates all connected nodes, interprets results, and generates insights. Click to add custom instructions.'
      },
    ],
  },
  {
    title: '🏆 Reference Datasets',
    items: [
      { 
        type: 'referenceDatasetNode', 
        label: 'HCP Young Adult (1200)', 
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
        tooltip: '🏅 Gold standard! 1,200 healthy young adults (22-35). Use as your "normal" baseline. Connect to Deviation Detector to find abnormalities.'
      },
      { 
        type: 'referenceDatasetNode', 
        label: 'UCLA Neuropsych (272)', 
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
        tooltip: '🧬 Clinical phenotypes dataset. Compare patient scans to ADHD, Schizophrenia, or Bipolar patterns. Great for differential diagnosis.'
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
        tooltip: '🧬 Gene expression map! Find which brain regions express your target gene. Perfect for drug targeting and understanding genetic disorders.'
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
        tooltip: '🌙 Ultra-deep scanning: 10 subjects with 5+ hours of fMRI each. Best for understanding individual brain variability.'
      },
    ],
  },
  {
    title: '⚖️ Comparison Agents',
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
          outputFormat: 'report',
          prompt: 'Calculate Z-scores relative to the reference distribution'
        },
        tooltip: '📊 Calculates how many standard deviations a patient is from normal. Output: "Your hippocampus is 2.3 SD below average" – perfect for clinical reports.'
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
          outputFormat: 'report',
          prompt: 'Calculate correlation with diagnostic phenotypes'
        },
        tooltip: '🔗 Matches brain patterns to clinical diagnoses. "Your connectivity pattern is 78% similar to ADHD subjects." Great for differential diagnosis.'
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
          outputFormat: 'heatmap',
          prompt: 'Identify regions deviating >2 SD from healthy average'
        },
        tooltip: '🚨 Finds abnormalities! Highlights brain regions that deviate >2 SD from healthy baseline. Connect patient scan + HCP Reference to use.'
      },
    ],
  },
  {
    title: 'Brain Regions',
    items: [
      { 
        type: 'brainRegionNode', 
        label: 'Region Selector', 
        icon: Brain, 
        color: 'text-violet-400',
        bgColor: 'bg-violet-500/10 hover:bg-violet-500/20 border-violet-500/30',
        payload: { label: 'Select Region...', regionId: null, abbreviation: 'ROI', hemisphere: 'bilateral' },
        tooltip: '🎯 Choose from 204 brain regions. Use as a spatial filter – the AI will focus analysis on your selected area.'
      },
      { 
        type: 'brainRegionNode', 
        label: 'Prefrontal Cortex', 
        icon: Brain, 
        color: 'text-violet-400',
        bgColor: 'bg-violet-500/10 hover:bg-violet-500/20 border-violet-500/30',
        payload: { label: 'Prefrontal Cortex', regionId: 'pfc', abbreviation: 'PFC', category: 'frontal', hemisphere: 'bilateral' },
        tooltip: '🎯 Executive control center. Focus on decision-making, working memory, personality. Key for ADHD, depression, TBI analysis.'
      },
      { 
        type: 'brainRegionNode', 
        label: 'Amygdala', 
        icon: Brain, 
        color: 'text-violet-400',
        bgColor: 'bg-violet-500/10 hover:bg-violet-500/20 border-violet-500/30',
        payload: { label: 'Amygdala', regionId: 'amygdala', abbreviation: 'AMY', category: 'subcortical', hemisphere: 'bilateral' },
        tooltip: '😨 Emotion and fear center. Analyze for anxiety, PTSD, autism. Often shows hyperactivity in anxiety disorders.'
      },
      { 
        type: 'brainRegionNode', 
        label: 'Hippocampus', 
        icon: Brain, 
        color: 'text-violet-400',
        bgColor: 'bg-violet-500/10 hover:bg-violet-500/20 border-violet-500/30',
        payload: { label: 'Hippocampus', regionId: 'hippocampus', abbreviation: 'HIP', category: 'temporal', hemisphere: 'bilateral' },
        tooltip: '🧠 Memory formation hub. Critical for Alzheimer\'s detection – often shows atrophy before symptoms. Key for TBI memory issues.'
      },
      { 
        type: 'brainRegionNode', 
        label: 'Thalamus', 
        icon: Brain, 
        color: 'text-violet-400',
        bgColor: 'bg-violet-500/10 hover:bg-violet-500/20 border-violet-500/30',
        payload: { label: 'Thalamus', regionId: 'thalamus', abbreviation: 'TH', category: 'subcortical', hemisphere: 'bilateral' },
        tooltip: '📡 Brain\'s relay station. All sensory info (except smell) passes through here. Key for sleep disorders and consciousness studies.'
      },
    ],
  },
  {
    title: 'Data Sources',
    items: [
      { 
        type: 'dataNode', 
        label: 'EEG File (.edf)', 
        icon: FileText, 
        color: 'text-emerald-400',
        bgColor: 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30',
        payload: { label: 'EEG File', subType: 'file' },
        tooltip: '📁 Upload EEG recordings (.edf format). Standard hospital/research format. Connect to preprocessing nodes to clean the signal.'
      },
      { 
        type: 'dataNode', 
        label: 'Live Stream (LSL)', 
        icon: Radio, 
        color: 'text-emerald-400',
        bgColor: 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30',
        payload: { label: 'Live Stream', subType: 'stream' },
        tooltip: '📡 Real-time brain data! Connect to Lab Streaming Layer devices (EEG headsets, BCI systems). For live neurofeedback or BCI apps.'
      },
      { 
        type: 'dataNode', 
        label: 'BIDS Dataset', 
        icon: Activity, 
        color: 'text-emerald-400',
        bgColor: 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30',
        payload: { label: 'BIDS Dataset', subType: 'bids' },
        tooltip: '📂 Standard neuroimaging format. Use for organized MRI/fMRI/EEG datasets. Automatically detects modalities and subjects.'
      },
      { 
        type: 'dataNode', 
        label: 'OpenNeuro Dataset', 
        icon: Database, 
        color: 'text-emerald-400',
        bgColor: 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30',
        payload: { label: 'OpenNeuro', subType: 'database' },
        tooltip: '🌐 Access 1000+ public brain datasets. Great for finding control groups or validating your analysis on published data.'
      },
      { 
        type: 'dataNode', 
        label: 'Web Reference', 
        icon: Globe, 
        color: 'text-emerald-400',
        bgColor: 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30',
        payload: { label: 'Web Data', subType: 'web' },
        tooltip: '🔗 Pull data from URLs or APIs. Connect to remote databases, research repositories, or cloud storage.'
      },
      // News Article node
      {
        type: 'newsArticleNode',
        label: 'News Article',
        icon: FileText,
        color: 'text-blue-500',
        bgColor: 'bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/30',
        payload: { label: 'News Article', url: '' },
        tooltip: '📰 Analyze a news article for bias, manipulation, and facts. Paste a news URL to get started.'
      },
      // Media (YouTube/Video) node
      {
        type: 'mediaNode',
        label: 'Media (YouTube/Video)',
        icon: Sparkles,
        color: 'text-red-500',
        bgColor: 'bg-red-500/10 hover:bg-red-500/20 border-red-500/30',
        payload: { label: 'Media', subType: 'youtube', url: '' },
        tooltip: '🎬 Analyze a YouTube or video link. Paste a video URL to extract and analyze content.'
      },
    ],
  },
  {
    title: 'Preprocessing',
    items: [
      { 
        type: 'preprocessingNode', 
        label: 'Bandpass Filter', 
        icon: Zap, 
        color: 'text-yellow-400',
        bgColor: 'bg-yellow-500/10 hover:bg-yellow-500/20 border-yellow-500/30',
        payload: { label: 'Bandpass Filter', category: 'preprocessing' },
        tooltip: '〰️ Keep only frequencies you want (e.g., 1-40 Hz). Removes slow drift and high-frequency noise. Essential first step!'
      },
      { 
        type: 'preprocessingNode', 
        label: 'Notch Filter (60Hz)', 
        icon: Zap, 
        color: 'text-yellow-400',
        bgColor: 'bg-yellow-500/10 hover:bg-yellow-500/20 border-yellow-500/30',
        payload: { label: 'Notch Filter', category: 'preprocessing' },
        tooltip: '🔌 Removes power line noise (60Hz US / 50Hz EU). Essential for clean EEG. Use after bandpass filter.'
      },
      { 
        type: 'preprocessingNode', 
        label: 'ICA Artifact Removal', 
        icon: Zap, 
        color: 'text-yellow-400',
        bgColor: 'bg-yellow-500/10 hover:bg-yellow-500/20 border-yellow-500/30',
        payload: { label: 'ICA Filter', category: 'preprocessing' },
        tooltip: '👁️ Removes eye blinks and muscle artifacts using Independent Component Analysis. Smart artifact detection!'
      },
      { 
        type: 'preprocessingNode', 
        label: 'Re-Reference', 
        icon: Zap, 
        color: 'text-yellow-400',
        bgColor: 'bg-yellow-500/10 hover:bg-yellow-500/20 border-yellow-500/30',
        payload: { label: 'Re-Reference', category: 'preprocessing' },
        tooltip: '⚡ Changes the reference electrode (average, mastoid, etc.). Important for comparing across studies or sites.'
      },
    ],
  },
  {
    title: 'Analysis',
    items: [
      { 
        type: 'analysisNode', 
        label: 'Power Spectral Density', 
        icon: BarChart3, 
        color: 'text-cyan-400',
        bgColor: 'bg-cyan-500/10 hover:bg-cyan-500/20 border-cyan-500/30',
        payload: { label: 'PSD Analysis', category: 'analysis' },
        tooltip: '📈 Breaks signal into frequency bands (delta, theta, alpha, beta). See which brain rhythms are active. Detects sleep stages, attention states.'
      },
      { 
        type: 'analysisNode', 
        label: 'ERP Analysis', 
        icon: BarChart3, 
        color: 'text-cyan-400',
        bgColor: 'bg-cyan-500/10 hover:bg-cyan-500/20 border-cyan-500/30',
        payload: { label: 'ERP Analysis', category: 'analysis' },
        tooltip: '⚡ Event-Related Potentials. Measures brain response to specific events (sounds, images). Used for attention, P300, and cognitive studies.'
      },
      { 
        type: 'analysisNode', 
        label: 'Connectivity Matrix', 
        icon: BarChart3, 
        color: 'text-cyan-400',
        bgColor: 'bg-cyan-500/10 hover:bg-cyan-500/20 border-cyan-500/30',
        payload: { label: 'Connectivity', category: 'analysis' },
        tooltip: '🔗 Shows how brain regions "talk" to each other. Reveals network disruptions in TBI, autism, schizophrenia. The core of connectomics!'
      },
    ],
  },
  {
    title: 'Machine Learning',
    items: [
      { 
        type: 'mlNode', 
        label: 'Sleep Staging (YASA)', 
        icon: Sparkles, 
        color: 'text-pink-400',
        bgColor: 'bg-pink-500/10 hover:bg-pink-500/20 border-pink-500/30',
        payload: { label: 'Sleep Stage ML', category: 'ml_inference' },
        tooltip: '😴 Auto-detects sleep stages (Wake, N1, N2, N3, REM). Uses YASA, a validated sleep scoring algorithm. Input: overnight EEG.'
      },
      { 
        type: 'mlNode', 
        label: 'Motor Imagery (EEGNet)', 
        icon: Sparkles, 
        color: 'text-pink-400',
        bgColor: 'bg-pink-500/10 hover:bg-pink-500/20 border-pink-500/30',
        payload: { label: 'Motor Imagery', category: 'ml_inference' },
        tooltip: '✋ Decodes imagined movements from EEG. For brain-computer interfaces: think "move left hand" → robot moves. Uses EEGNet deep learning.'
      },
      { 
        type: 'mlNode', 
        label: 'Custom Model', 
        icon: Cpu, 
        color: 'text-pink-400',
        bgColor: 'bg-pink-500/10 hover:bg-pink-500/20 border-pink-500/30',
        payload: { label: 'Custom ML', category: 'ml_inference' },
        tooltip: '🤖 Bring your own model! Upload TensorFlow/PyTorch/ONNX models. For advanced users building custom classifiers.'
      },
    ],
  },
  {
    title: 'Output',
    items: [
      { 
        type: 'outputNode', 
        label: 'BIDS Export', 
        icon: FileOutput, 
        color: 'text-orange-400',
        bgColor: 'bg-orange-500/10 hover:bg-orange-500/20 border-orange-500/30',
        payload: { label: 'BIDS Export', category: 'output_sink' },
        tooltip: '💾 Save results in BIDS format. Standard for sharing with other researchers. Compatible with OpenNeuro, fMRIPrep, etc.'
      },
      { 
        type: 'outputNode', 
        label: 'Report Generator', 
        icon: FileOutput, 
        color: 'text-orange-400',
        bgColor: 'bg-orange-500/10 hover:bg-orange-500/20 border-orange-500/30',
        payload: { label: 'Report', category: 'output_sink' },
        tooltip: '📄 Generates a PDF/HTML report with findings. Include charts, statistics, and AI interpretations. Ready to share with clinicians or publish.'
      },
    ],
  },
]

interface DraggableItemProps {
  item: DraggableNodeItem
}

function DraggableItem({ item }: DraggableItemProps) {
  const onDragStart = (event: React.DragEvent) => {
    event.dataTransfer.setData('application/reactflow', item.type)
    event.dataTransfer.setData('application/payload', JSON.stringify(item.payload))
    event.dataTransfer.effectAllowed = 'move'
  }

  return (
    <Tooltip content={item.tooltip} position="right">
      <div
        className={cn(
          'flex items-center gap-3 p-2.5 border rounded-lg cursor-grab active:cursor-grabbing',
          'transition-all duration-200 group w-full',
          item.bgColor
        )}
        draggable
        onDragStart={onDragStart}
      >
        <GripVertical className="w-3 h-3 text-slate-500 group-hover:text-slate-400" />
        <item.icon className={cn('w-4 h-4', item.color)} />
        <span className="text-xs font-medium text-slate-300 group-hover:text-slate-100 truncate">
          {item.label}
        </span>
      </div>
    </Tooltip>
  )
}

// Map icon string to component
function getIconComponent(iconName: string): React.ElementType {
  switch (iconName) {
    case 'brain': return Brain
    case 'database': return Database
    case 'output': return FileOutput
    case 'sparkles': return Sparkles
    case 'zap': return Zap
    case 'activity': return Activity
    default: return Star
  }
}

// Map color string to tailwind classes
function getColorClasses(colorName: string): { color: string; bgColor: string } {
  switch (colorName) {
    case 'purple': return { color: 'text-purple-400', bgColor: 'bg-purple-500/10 hover:bg-purple-500/20 border-purple-500/30' }
    case 'emerald': return { color: 'text-emerald-400', bgColor: 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30' }
    case 'orange': return { color: 'text-orange-400', bgColor: 'bg-orange-500/10 hover:bg-orange-500/20 border-orange-500/30' }
    case 'pink': return { color: 'text-pink-400', bgColor: 'bg-pink-500/10 hover:bg-pink-500/20 border-pink-500/30' }
    default: return { color: 'text-indigo-400', bgColor: 'bg-indigo-500/10 hover:bg-indigo-500/20 border-indigo-500/30' }
  }
}

interface WorkflowSidebarProps {
  customModules?: CustomModuleDefinition[]
}

export default function WorkflowSidebar({ customModules = [] }: WorkflowSidebarProps) {
  // Convert custom modules to draggable items
  const customItems: DraggableNodeItem[] = customModules.map(mod => {
    const colors = getColorClasses(mod.color)
    return {
      type: 'brainNode', // Custom modules use brainNode type with custom behavior
      label: mod.name,
      icon: getIconComponent(mod.icon),
      color: colors.color,
      bgColor: colors.bgColor,
      payload: { 
        label: mod.name, 
        behavior: mod.behavior,
        customModuleId: mod.id,
        isCustomModule: true
      },
      tooltip: `✨ ${mod.description}`
    }
  })
  
  return (
    <aside className="w-64 bg-slate-900/95 backdrop-blur-sm border-r border-slate-800 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-slate-800">
        <h2 className="text-sm font-semibold text-slate-100">Node Palette</h2>
        <p className="text-xs text-slate-500 mt-1">Drag nodes onto the canvas</p>
      </div>

      {/* Scrollable node list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Custom Modules section (if any) */}
        {customItems.length > 0 && (
          <div>
            <h3 className="text-[10px] font-bold text-pink-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <Star className="w-3 h-3" />
              Your Saved Patterns
            </h3>
            <div className="space-y-2">
              {customItems.map((item) => (
                <DraggableItem key={`custom-${item.label}`} item={item} />
              ))}
            </div>
          </div>
        )}
        
        {nodeGroups.map((group) => (
          <div key={group.title}>
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">
              {group.title}
            </h3>
            <div className="space-y-2">
              {group.items.map((item) => (
                <DraggableItem key={`${item.type}-${item.label}`} item={item} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Footer info */}
      <div className="p-4 border-t border-slate-800">
        <div className="text-[10px] text-slate-500 space-y-1">
          <p>Hover nodes for tips</p>
          <p>🔗 Connect nodes by dragging handles</p>
          {customItems.length > 0 && (
            <p>⭐ {customItems.length} saved pattern{customItems.length > 1 ? 's' : ''}</p>
          )}
        </div>
      </div>
    </aside>
  )
}
