


// --- 12. Media Node (YouTube/Video/Other) ---
import React, { memo, useState, useCallback, useEffect, useRef } from 'react';
import { Handle, Position, NodeProps, useReactFlow } from '@xyflow/react';
import { useTheme } from 'next-themes';
import { Tooltip } from '@/components/ui/tooltip';
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
  Video,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { NodeCategory, NodeStatus } from '@/types/neuro';
import { createBrowserClient } from '@/lib/supabase';

export interface MediaNodeData {
  label: string;
  url: string;
  subType?: string;
  thumbnailUrl?: string;
  videoTitle?: string;
  platform?: 'youtube' | 'tiktok' | 'instagram' | 'twitter' | 'other';
  status?: NodeStatus;
  progress?: number;
  [key: string]: unknown;
}

export interface NewsArticleNodeData {
  label: string;
  url?: string;
  status?: NodeStatus;
  progress?: number;
  [key: string]: unknown;
}

export const MediaNode = memo(({ id, data, selected }: NodeProps) => {
  const nodeData = data as MediaNodeData;
  const { setNodes } = useReactFlow();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editUrl, setEditUrl] = useState(nodeData.url || '');
  const [editTitle, setEditTitle] = useState(nodeData.videoTitle || '');
  const [editName, setEditName] = useState(nodeData.label || '');
  const { thumbnail, platform } = getVideoThumbnail(nodeData.url || '');
  const embedUrl = getYoutubeEmbedUrl(nodeData.url || '');
  const [isPlaying, setIsPlaying] = useState(false);

  const handleSave = () => {
    const { thumbnail: newThumb, platform: newPlatform } = getVideoThumbnail(editUrl);
    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === id
          ? {
              ...node,
              data: {
                ...node.data,
                url: editUrl,
                videoTitle: editTitle || editUrl,
                label: editName,
                thumbnailUrl: newThumb,
                platform: newPlatform,
              },
            }
          : node
      )
    );
    setIsModalOpen(false);
    setIsPlaying(false);
  };

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (embedUrl) {
      setIsPlaying(true);
    } else if (nodeData.url) {
      window.open(nodeData.url, '_blank');
    }
  };

  const renderModal = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}>
      <div className="bg-slate-900 rounded-2xl shadow-2xl p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-white mb-4">Edit Media Node</h3>
        <div className="space-y-3">
          <input
            type="text"
            value={editName}
            onChange={e => setEditName(e.target.value)}
            placeholder="Node name"
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
          />
          <input
            type="text"
            value={editUrl}
            onChange={e => setEditUrl(e.target.value)}
            placeholder="Paste video URL..."
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
          />
          <input
            type="text"
            value={editTitle}
            onChange={e => setEditTitle(e.target.value)}
            placeholder="Video title (optional)"
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
          />
        </div>
        <div className="flex gap-2 mt-6">
          <button
            onClick={handleSave}
            className="flex-1 px-3 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-xs font-medium text-white transition-colors"
          >
            Save
          </button>
          <button
            onClick={() => {
              setIsModalOpen(false);
              setEditUrl(nodeData.url || '');
              setEditTitle(nodeData.videoTitle || '');
              setEditName(nodeData.label || '');
            }}
            className="px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs font-medium text-slate-200 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div
        className={`
          relative rounded-xl overflow-hidden transition-all duration-200
          ${selected 
            ? 'ring-2 ring-cyan-400 ring-offset-2 ring-offset-slate-900 shadow-[0_0_30px_rgba(34,211,238,0.3)]' 
            : 'hover:ring-2 hover:ring-cyan-400/50'
          }
        `}
        style={{ minWidth: 200, maxWidth: 240 }}
        onClick={() => setIsModalOpen(true)}
      >
        <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 aspect-video flex items-center justify-center">
          {isPlaying && embedUrl ? (
            <iframe
              src={embedUrl}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title={nodeData.videoTitle || 'Video player'}
            />
          ) : thumbnail ? (
            <>
              <img 
                src={thumbnail} 
                alt={nodeData.videoTitle || 'Video thumbnail'}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <button 
                className="absolute inset-0 flex items-center justify-center group"
                onClick={handlePlayClick}
              >
                <div className="w-16 h-16 rounded-full bg-red-600 group-hover:bg-red-500 group-hover:scale-110 transition-all flex items-center justify-center shadow-xl">
                  <Play className="w-8 h-8 text-white ml-1" fill="white" />
                </div>
              </button>
            </>
          ) : (
            <div 
              className="flex flex-col items-center gap-3 p-6 cursor-pointer"
            >
              <div className={`p-4 rounded-2xl bg-red-500/20`}>
                <Youtube className={`w-10 h-10 text-red-400`} />
              </div>
              <span className="text-slate-400 text-sm">Click to add media URL</span>
            </div>
          )}
          {/* Platform Badge */}
          {nodeData.url && (
            <div className={`absolute top-2 left-2 px-2 py-1 rounded-lg bg-red-500/80 backdrop-blur-sm flex items-center gap-1.5`}>
              <Youtube className="w-3.5 h-3.5 text-white" />
              <span className="text-xs font-medium text-white capitalize">YouTube</span>
            </div>
          )}
          {/* Edit Button */}
          <button 
            className="absolute top-2 right-2 p-1.5 rounded-lg bg-slate-800/80 backdrop-blur-sm hover:bg-slate-700/80 transition-colors z-10"
            onClick={e => {
              e.stopPropagation();
              setIsPlaying(false);
              setIsModalOpen(true);
              setEditUrl(nodeData.url || '');
              setEditTitle(nodeData.videoTitle || '');
              setEditName(nodeData.label || '');
            }}
          >
            <Edit3 className="w-4 h-4 text-slate-300" />
          </button>
          {/* Close player button when playing */}
          {isPlaying && (
            <button 
              className="absolute bottom-2 right-2 px-2 py-1 rounded-lg bg-slate-800/90 backdrop-blur-sm hover:bg-slate-700/90 transition-colors z-10 flex items-center gap-1"
              onClick={e => {
                e.stopPropagation();
                setIsPlaying(false);
              }}
            >
              <span className="text-xs text-slate-300">Close</span>
            </button>
          )}
        </div>
        {/* Content Info */}
        <div className="bg-slate-800/90 backdrop-blur-sm p-3">
          <h4 className="font-medium text-white text-sm truncate mb-1">
            {nodeData.videoTitle || nodeData.label || 'Media Node'}
          </h4>
          {nodeData.url && (
            <div className="flex items-center gap-1.5 text-slate-400 text-xs truncate">
              <ExternalLink className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{nodeData.url}</span>
            </div>
          )}
          {!nodeData.url && (
            <p className="text-slate-500 text-xs">Click to paste media URL</p>
          )}
        </div>
        {/* Status indicator */}
        {nodeData.status && (
          <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${
            nodeData.status === 'completed' ? 'bg-green-500' :
            nodeData.status === 'running' ? 'bg-yellow-500 animate-pulse' :
            nodeData.status === 'failed' ? 'bg-red-500' : 'bg-slate-600'
          }`} />
        )}
        {/* Output Handle - this feeds into the workflow */}
        <Handle 
          type="source" 
          position={Position.Right} 
          className="!bg-cyan-500 !w-2 !h-2 !border !border-slate-900"
          style={{ top: '50%' }}
        />
      </div>
      {isModalOpen && renderModal()}
    </>
  );
});
MediaNode.displayName = 'MediaNode';

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
  aiGenerated?: boolean
}

function NodeWrapper({ 
  children, 
  selected, 
  colorKey, 
  label, 
  subtitle,
  status = 'idle',
  progress = 0,
  aiGenerated = false
}: NodeWrapperProps) {
  const colors = categoryColors[colorKey] || categoryColors.compute
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  return (
    <div 
      className={cn(
        'px-2 py-1.5 shadow-lg rounded-lg backdrop-blur-sm border transition-all duration-200 min-w-[120px] max-w-[160px]',
        isDark ? 'bg-slate-900/95' : 'bg-white/95',
        selected 
          ? `${colors.border} ${colors.shadow} shadow-xl scale-105` 
          : isDark 
            ? 'border-slate-700/50 hover:border-slate-600' 
            : 'border-slate-300/50 hover:border-slate-400',
        // Subtle glow for AI-generated nodes (with fade transition)
        aiGenerated && !selected ? (isDark 
          ? 'ring-1 ring-purple-500/30 ring-opacity-100' 
          : 'ring-1 ring-purple-400/30 ring-opacity-100')
          : 'ring-0 ring-transparent',
        'transition-[box-shadow,ring] duration-500'
      )}
    >
      {/* AI Generated indicator - subtle sparkle only, with fade transition */}
      <div className={cn(
        "absolute -top-1 -left-1 z-10 transition-all duration-500 ease-out",
        aiGenerated ? "opacity-100 scale-100" : "opacity-0 scale-75 pointer-events-none"
      )}>
        <div className={cn(
          'w-3.5 h-3.5 rounded-full flex items-center justify-center',
          isDark 
            ? 'bg-purple-600/90 shadow-sm shadow-purple-500/50' 
            : 'bg-purple-500/90 shadow-sm shadow-purple-400/50'
        )}>
          <Sparkles className="w-2 h-2 text-white" />
        </div>
      </div>

      {/* Status indicator */}
      <div className="absolute -top-0.5 -right-0.5">
        <div className={cn(
          'w-2 h-2 rounded-full border', 
          isDark ? 'border-slate-900' : 'border-white',
          statusColors[status]
        )} />
      </div>

      <div className="flex items-center gap-1.5">
        {children}
        <div className="flex-1 min-w-0">
          <p className={cn(
            'text-[10px] font-medium truncate leading-tight',
            isDark ? 'text-slate-100' : 'text-slate-800'
          )}>{label}</p>
          {subtitle && (
            <p className={cn(
              'text-[8px] uppercase tracking-wider truncate',
              isDark ? 'text-slate-400' : 'text-slate-500'
            )}>
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Progress bar when running */}
      {status === 'running' && progress > 0 && (
        <div className={cn(
          'mt-1 h-0.5 rounded-full overflow-hidden',
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
export const BrainNode = memo(({ data, selected, isRunning }: NodeProps & { isRunning?: boolean }) => {
  const nodeData = data as BrainNodeData
  const { resolvedTheme } = useTheme()
  const nodeResult = nodeData.nodeResult as any
  const isAiGenerated = nodeData.aiGenerated as boolean | undefined
  const demographics = nodeData.demographics as Record<string, string> | undefined
  const role = nodeData.role as string | undefined

  return (
    <Tooltip
      content={
        <div className={cn(
          'space-y-1.5 max-w-[220px]',
          resolvedTheme === 'dark' ? 'text-slate-100' : 'text-slate-800'
        )}>
          <div className="flex items-center gap-1.5">
            {isAiGenerated && (
              <span className="flex items-center gap-0.5 px-1 py-0.5 rounded bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-[8px] font-bold text-purple-400">
                <Sparkles className="w-2 h-2" />
                AI
              </span>
            )}
            <span className="font-bold text-xs">{nodeData.label}</span>
          </div>
          <div className="text-[10px] text-slate-400">AI Orchestrator</div>
          {role && (
            <div className="text-[10px] text-purple-400">Role: {role}</div>
          )}
          {demographics && Object.keys(demographics).length > 0 && (
            <div className="text-[10px] text-slate-300 border-t border-slate-600 pt-1.5 mt-1">
              {Object.entries(demographics).slice(0, 3).map(([key, value]) => (
                <div key={key} className="capitalize">{key}: {value}</div>
              ))}
            </div>
          )}
          {isAiGenerated && !demographics && (
            <div className="text-[10px] text-purple-400 italic">
              ✦ Generated by AI Wizard
            </div>
          )}
          {isRunning && !nodeResult && (
            <div className="flex items-center gap-2 text-xs text-green-400 border-t border-slate-600 pt-1.5 mt-1">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Analyzing...</span>
            </div>
          )}
          {nodeResult ? (
            <div className="border-t border-slate-600 pt-1.5 mt-1">
              <div className="font-semibold text-xs">Engagement: {nodeResult.engagement}</div>
              <div className="text-xs">Reaction: {nodeResult.primaryReaction}</div>
              <div className="text-xs">Share?: {nodeResult.wouldShare}</div>
              <div className="text-xs">Insight: {nodeResult.keyInsight}</div>
            </div>
          ) : !isRunning && (
            <div className="text-xs text-slate-500">Click to configure AI behavior</div>
          )}
        </div>
      }
      position="right"
    >
      <NodeWrapper 
        selected={selected} 
        colorKey="brain" 
        label={nodeData.label}
        subtitle="AI Orchestrator"
        aiGenerated={isAiGenerated}
      >
        <div className="p-1 bg-purple-500/20 rounded-xl">
          <Brain className="w-3.5 h-3.5 text-purple-400" />
        </div>
        <Handle 
          type="target" 
          position={Position.Left} 
          className="!bg-purple-500 !w-2 !h-2 !border !border-slate-900" 
        />
        <Handle 
          type="source" 
          position={Position.Right} 
          className="!bg-purple-500 !w-2 !h-2 !border !border-slate-900" 
        />
      </NodeWrapper>
    </Tooltip>
  )
})
BrainNode.displayName = 'BrainNode'

// --- 2. Data Source Node (Files, Streams, BIDS) ---
export const DataNode = memo(({ id, data, selected }: NodeProps) => {
  const nodeData = data as DataNodeData
  const { setNodes } = useReactFlow()
  const [isDragOver, setIsDragOver] = useState(false)
  const [loadedFile, setLoadedFile] = useState<{ name: string; size: number } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
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

  const [nodeResult, setNodeResult] = useState<any>(null)
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'
  const isAiGenerated = nodeData.aiGenerated as boolean | undefined
  const sampleDataDescription = nodeData.sampleDataDescription as string | undefined
  const fileName = nodeData.fileName as string | undefined
  
  // Handle drag over
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    console.log('[DataNode] Drag over detected')
    setIsDragOver(true)
  }, [])
  
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }, [])
  
  // Handle file drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
    
    console.log('[DataNode] File dropped!', e.dataTransfer.files)
    
    const files = e.dataTransfer.files
    if (files.length > 0) {
      const file = files[0]
      console.log('[DataNode] Processing file:', file.name, file.type, file.size)
      const isJson = file.name.endsWith('.json')
      const isCsv = file.name.endsWith('.csv')
      const isValid = isJson || isCsv || file.name.endsWith('.nii') || file.name.endsWith('.edf')
      
      if (isValid) {
        console.log('[DataNode] File is valid, reading...')
        // Read file content for JSON files
        if (isJson) {
          const reader = new FileReader()
          reader.onload = (event) => {
            try {
              const content = JSON.parse(event.target?.result as string)
              const recordCount = Array.isArray(content) ? content.length : 
                                 content.players ? content.players.length :
                                 Object.keys(content).length
              
              console.log('[DataNode] JSON parsed, record count:', recordCount)
              setNodes((nodes) =>
                nodes.map((node) =>
                  node.id === id
                    ? {
                        ...node,
                        data: {
                          ...node.data,
                          fileName: file.name,
                          fileSize: file.size,
                          fileContent: content,
                          subType: 'file',
                          sampleDataDescription: `${recordCount} records loaded from ${file.name}`,
                          aiGenerated: false, // Clear AI flag when user adds their own data
                        },
                      }
                    : node
                )
              )
              setLoadedFile({ name: file.name, size: file.size })
            } catch (err) {
              console.error('Failed to parse JSON:', err)
            }
          }
          reader.readAsText(file)
        } else if (isCsv) {
          // Parse CSV files and store content
          const reader = new FileReader()
          reader.onload = (event) => {
            try {
              const csvText = event.target?.result as string
              const lines = csvText.split('\n').filter(line => line.trim())
              const headers = lines[0]?.split(',').map(h => h.trim().replace(/"/g, ''))
              const rows = lines.slice(1).map(line => {
                const values = line.split(',').map(v => v.trim().replace(/"/g, ''))
                const row: Record<string, string> = {}
                headers?.forEach((header, i) => {
                  row[header] = values[i] || ''
                })
                return row
              })
              
              setNodes((nodes) =>
                nodes.map((node) =>
                  node.id === id
                    ? {
                        ...node,
                        data: {
                          ...node.data,
                          fileName: file.name,
                          fileSize: file.size,
                          fileContent: rows,
                          csvHeaders: headers,
                          subType: 'file',
                          sampleDataDescription: `${rows.length} rows, ${headers?.length || 0} columns from ${file.name}`,
                          aiGenerated: false,
                        },
                      }
                    : node
                )
              )
              setLoadedFile({ name: file.name, size: file.size })
            } catch (err) {
              console.error('Failed to parse CSV:', err)
            }
          }
          reader.readAsText(file)
        } else {
          // For other file types (nii, edf), store metadata only
          setNodes((nodes) =>
            nodes.map((node) =>
              node.id === id
                ? {
                        ...node,
                        data: {
                          ...node.data,
                          fileName: file.name,
                          fileSize: file.size,
                          subType: 'file',
                          sampleDataDescription: `${(file.size / 1024).toFixed(1)} KB file loaded`,
                          aiGenerated: false,
                        },
                      }
                    : node
            )
          )
          setLoadedFile({ name: file.name, size: file.size })
        }
      }
    }
  }, [id, setNodes])
  
  useEffect(() => {
    // Fetch node result from API (pseudo-code, replace with actual fetch)
    // setNodeResult(result.nodes.find(n => n.nodeLabel === nodeData.label))
  }, [nodeData.label])
  
  // Check if file is already loaded
  useEffect(() => {
    if (fileName && !loadedFile) {
      setLoadedFile({ name: fileName, size: nodeData.fileSize as number || 0 })
    }
  }, [fileName, loadedFile, nodeData.fileSize])
  
  // Handle file input change (for click-to-upload)
  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    
    const file = files[0]
    console.log('[DataNode] File selected via input:', file.name)
    const isJson = file.name.endsWith('.json')
    const isCsv = file.name.endsWith('.csv')
    
    if (isJson || isCsv) {
      const reader = new FileReader()
      reader.onload = (event) => {
        try {
          let content: unknown
          let description = ''
          
          if (isJson) {
            content = JSON.parse(event.target?.result as string)
            const recordCount = Array.isArray(content) ? (content as unknown[]).length : Object.keys(content as object).length
            description = `${recordCount} records from ${file.name}`
          } else {
            const csvText = event.target?.result as string
            const lines = csvText.split('\n').filter(line => line.trim())
            const headers = lines[0]?.split(',').map(h => h.trim().replace(/"/g, ''))
            content = lines.slice(1).map(line => {
              const values = line.split(',').map(v => v.trim().replace(/"/g, ''))
              const row: Record<string, string> = {}
              headers?.forEach((header, i) => { row[header] = values[i] || '' })
              return row
            })
            description = `${(content as unknown[]).length} rows, ${headers?.length || 0} columns from ${file.name}`
          }
          
          setNodes((nodes) =>
            nodes.map((node) =>
              node.id === id
                ? {
                    ...node,
                    data: {
                      ...node.data,
                      fileName: file.name,
                      fileSize: file.size,
                      fileContent: content,
                      sampleDataDescription: description,
                      aiGenerated: false,
                    },
                  }
                : node
            )
          )
          setLoadedFile({ name: file.name, size: file.size })
        } catch (err) {
          console.error('[DataNode] Failed to parse file:', err)
        }
      }
      reader.readAsText(file)
    }
    
    // Reset input so same file can be selected again
    e.target.value = ''
  }, [id, setNodes])

  // Handle click to open file picker
  const handleNodeClick = useCallback(() => {
    console.log('[DataNode] Node clicked, opening file picker')
    fileInputRef.current?.click()
  }, [])
  
  return (
    <Tooltip
      content={
        <div className={cn(
          'space-y-1.5 max-w-[220px]',
          resolvedTheme === 'dark' ? 'text-slate-100' : 'text-slate-800'
        )}>
          <div className="flex items-center gap-1.5">
            {isAiGenerated && (
              <span className="flex items-center gap-0.5 px-1 py-0.5 rounded bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-[8px] font-bold text-purple-400">
                <Sparkles className="w-2 h-2" />
                AI
              </span>
            )}
            <span className="font-bold text-xs">{nodeData.label}</span>
          </div>
          <div className="text-[10px] text-slate-400">{subtitleMap[nodeData.subType] || 'Data Source'}</div>
          {loadedFile && (
            <div className="text-[10px] text-emerald-400 border-t border-slate-600 pt-1.5 mt-1">
              <span className="font-semibold">📁 {loadedFile.name}</span>
              <div className="text-slate-400">{(loadedFile.size / 1024).toFixed(1)} KB</div>
            </div>
          )}
          {sampleDataDescription && (
            <div className="text-[10px] text-emerald-400">
              {sampleDataDescription}
            </div>
          )}
          {isAiGenerated && !sampleDataDescription && !loadedFile && (
            <div className="text-[10px] text-purple-400 italic">
              ✦ Generated by AI Wizard
            </div>
          )}
          {!loadedFile && (
            <div className="text-xs text-slate-500 border-t border-slate-600 pt-1.5 mt-1">
              Drag & drop or click to upload
            </div>
          )}
          {nodeResult ? (
            <div className="border-t border-slate-600 pt-1.5 mt-1">
              <div className="font-semibold text-xs">Engagement: {nodeResult.scores.engagement}</div>
              <div className="text-xs">Attention: {nodeResult.scores.attention}</div>
              <div className="text-xs">Summary: {nodeResult.keyInsights?.[0]}</div>
            </div>
          ) : null}
        </div>
      }
      position="right"
    >
      {/* Hidden file input for click-to-upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,.csv,.nii,.edf"
        onChange={handleFileInputChange}
        className="hidden"
      />
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onDoubleClick={handleNodeClick}
        className={cn(
          'transition-all duration-200 nodrag cursor-pointer',
          isDragOver && 'scale-110'
        )}
      >
        <NodeWrapper 
          selected={selected} 
          colorKey="data" 
          label={loadedFile ? loadedFile.name.slice(0, 15) + (loadedFile.name.length > 15 ? '...' : '') : nodeData.label}
          subtitle={loadedFile ? 'File Loaded ✓' : (sampleDataDescription ? 'Data Configured' : (subtitleMap[nodeData.subType] || 'Data Source'))}
          aiGenerated={isAiGenerated}
        >
          {/* Drop zone indicator */}
          {isDragOver && (
            <div className="absolute inset-0 rounded-lg border-2 border-dashed border-emerald-400 bg-emerald-500/20 z-10 flex items-center justify-center">
              <span className="text-[8px] font-bold text-emerald-400">DROP</span>
            </div>
          )}
          <div className={cn(
            "p-1 rounded-xl transition-colors",
            loadedFile ? "bg-emerald-500/30" : (sampleDataDescription ? "bg-emerald-500/25" : "bg-emerald-500/20")
          )}>
            {loadedFile ? (
              <FileText className="w-3.5 h-3.5 text-emerald-300" />
            ) : (
              <Icon className="w-3.5 h-3.5 text-emerald-400" />
            )}
          </div>
          <Handle 
            type="source" 
            position={Position.Right} 
            className="!bg-emerald-500 !w-2 !h-2 !border !border-slate-900" 
          />
        </NodeWrapper>
        
        {/* Show sample data description below the node when configured */}
        {sampleDataDescription && !loadedFile && (
          <div className="absolute -bottom-5 left-0 right-0 text-center">
            <span className="text-[7px] text-emerald-400/70 truncate block px-1">
              {sampleDataDescription.length > 25 ? sampleDataDescription.slice(0, 25) + '...' : sampleDataDescription}
            </span>
          </div>
        )}
        
        {/* Show file info below node when file is loaded */}
        {loadedFile && (
          <div className="absolute -bottom-5 left-0 right-0 text-center">
            <span className="text-[7px] text-emerald-400 truncate block px-1">
              📁 {(loadedFile.size / 1024).toFixed(1)} KB
            </span>
          </div>
        )}
      </div>
    </Tooltip>
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
      aiGenerated={nodeData.aiGenerated as boolean | undefined}
    >
      <div className="p-1 bg-yellow-500/20 rounded-xl">
        <Zap className="w-3.5 h-3.5 text-yellow-400" />
      </div>
      <Handle 
        type="target" 
        position={Position.Left} 
        className="!bg-yellow-500 !w-2 !h-2 !border !border-slate-900" 
      />
      <Handle 
        type="source" 
        position={Position.Right} 
        className="!bg-yellow-500 !w-2 !h-2 !border !border-slate-900" 
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
      aiGenerated={nodeData.aiGenerated as boolean | undefined}
    >
      <div className="p-1 bg-cyan-500/20 rounded-xl">
        <BarChart3 className="w-3.5 h-3.5 text-cyan-400" />
      </div>
      <Handle 
        type="target" 
        position={Position.Left} 
        className="!bg-cyan-500 !w-2 !h-2 !border !border-slate-900" 
      />
      <Handle 
        type="source" 
        position={Position.Right} 
        className="!bg-cyan-500 !w-2 !h-2 !border !border-slate-900" 
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
      aiGenerated={nodeData.aiGenerated as boolean | undefined}
    >
      <div className="p-1 bg-pink-500/20 rounded-xl">
        <Sparkles className="w-3.5 h-3.5 text-pink-400" />
      </div>
      <Handle 
        type="target" 
        position={Position.Left} 
        className="!bg-pink-500 !w-2 !h-2 !border !border-slate-900" 
      />
      <Handle 
        type="source" 
        position={Position.Right} 
        className="!bg-pink-500 !w-2 !h-2 !border !border-slate-900" 
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
      aiGenerated={nodeData.aiGenerated as boolean | undefined}
    >
      <div className="p-1 bg-orange-500/20 rounded-xl">
        <FileOutput className="w-3.5 h-3.5 text-orange-400" />
      </div>
      {/* Output nodes only accept input */}
      <Handle 
        type="target" 
        position={Position.Left} 
        className="!bg-orange-500 !w-2 !h-2 !border !border-slate-900" 
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
      aiGenerated={nodeData.aiGenerated as boolean | undefined}
    >
      <div className="p-1 bg-blue-500/20 rounded-xl">
        <Cpu className="w-3.5 h-3.5 text-blue-400" />
      </div>
      <Handle 
        type="target" 
        position={Position.Left} 
        className="!bg-blue-500 !w-2 !h-2 !border !border-slate-900" 
      />
      <Handle 
        type="source" 
        position={Position.Right} 
        className="!bg-blue-500 !w-2 !h-2 !border !border-slate-900" 
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
        <div className="p-1 bg-violet-500/20 rounded-xl">
          <MapPin className="w-3.5 h-3.5 text-violet-400" />
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
        className="!bg-violet-500 !w-2 !h-2 !border !border-slate-900" 
      />
      {/* Outputs the region mask/filter to downstream nodes */}
      <Handle 
        type="source" 
        position={Position.Right} 
        className="!bg-violet-500 !w-2 !h-2 !border !border-slate-900" 
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
      <div className="p-1 bg-amber-500/20 rounded-xl">
        <Library className="w-3.5 h-3.5 text-amber-400" />
      </div>
      {/* Reference datasets provide context/comparison data */}
      <Handle 
        type="source" 
        position={Position.Right} 
        className="!bg-amber-500 !w-2 !h-2 !border !border-slate-900" 
      />
    </NodeWrapper>
  )
})
ReferenceDatasetNode.displayName = 'ReferenceDatasetNode'

// --- 10. Content URL Input Node (Video/Media with Thumbnail) ---
export interface ContentUrlInputNodeData {
  label: string
  url: string
  thumbnailUrl?: string
  videoTitle?: string
  platform?: 'youtube' | 'tiktok' | 'instagram' | 'twitter' | 'other'
  isEditing?: boolean
  status?: NodeStatus
  progress?: number
  [key: string]: unknown
}

// Helper to extract video thumbnail and detect platform from URL
function getVideoThumbnail(url: string): { thumbnail: string; platform: string; platformLabel: string } {
  if (!url) return { thumbnail: '', platform: 'other', platformLabel: 'Content' }
  
  // YouTube
  const youtubeMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([^&?\s]+)/)
  if (youtubeMatch) {
    return {
      thumbnail: `https://img.youtube.com/vi/${youtubeMatch[1]}/mqdefault.jpg`,
      platform: 'youtube',
      platformLabel: 'YouTube'
    }
  }
  
  // TikTok
  if (url.includes('tiktok.com')) {
    return { thumbnail: '', platform: 'tiktok', platformLabel: 'TikTok' }
  }
  
  // Instagram
  if (url.includes('instagram.com')) {
    return { thumbnail: '', platform: 'instagram', platformLabel: 'Instagram' }
  }
  
  // Twitter/X
  if (url.includes('twitter.com') || url.includes('x.com')) {
    return { thumbnail: '', platform: 'twitter', platformLabel: 'X/Twitter' }
  }
  
  // Reddit
  if (url.includes('reddit.com') || url.includes('redd.it')) {
    return { thumbnail: '', platform: 'reddit', platformLabel: 'Reddit' }
  }
  
  // Vimeo
  if (url.includes('vimeo.com')) {
    return { thumbnail: '', platform: 'vimeo', platformLabel: 'Vimeo' }
  }
  
  // LinkedIn
  if (url.includes('linkedin.com')) {
    return { thumbnail: '', platform: 'linkedin', platformLabel: 'LinkedIn' }
  }
  
  // Facebook
  if (url.includes('facebook.com') || url.includes('fb.watch')) {
    return { thumbnail: '', platform: 'facebook', platformLabel: 'Facebook' }
  }
  
  // Threads
  if (url.includes('threads.net')) {
    return { thumbnail: '', platform: 'threads', platformLabel: 'Threads' }
  }
  
  // Generic web URL
  return { thumbnail: '', platform: 'web', platformLabel: 'Web' }
}

// Helper to get YouTube embed URL
function getYoutubeEmbedUrl(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([^&?\s]+)/)
  if (match) {
    return `https://www.youtube.com/embed/${match[1]}?autoplay=0&modestbranding=1&rel=0`
  }
  return null
}

export const ContentUrlInputNode = memo(({ id, data, selected }: NodeProps) => {
  const nodeData = data as ContentUrlInputNodeData;
  const { setNodes } = useReactFlow();
  const [isEditing, setIsEditing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [editUrl, setEditUrl] = useState(nodeData.url || '');
  const [editTitle, setEditTitle] = useState(nodeData.videoTitle || '');
  const [editName, setEditName] = useState(nodeData.label || '');
  const [youtubeResults, setYoutubeResults] = useState<any[]>([]);
  const [youtubeQuery, setYoutubeQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { thumbnail, platform, platformLabel } = getVideoThumbnail(nodeData.url || '');
  const embedUrl = getYoutubeEmbedUrl(nodeData.url || '');

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  // Fetch YouTube suggestions
  useEffect(() => {
    if (!youtubeQuery) return;
    // Use YouTube Data API (replace with your API key)
    const apiKey = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY || '';
    if (!apiKey) return;
    fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&q=${encodeURIComponent(youtubeQuery)}&maxResults=5&key=${apiKey}`)
      .then(res => res.json())
      .then(data => {
        setYoutubeResults(data.items || []);
      });
  }, [youtubeQuery]);

  const handleSave = () => {
    const { thumbnail: newThumb, platform: newPlatform } = getVideoThumbnail(editUrl);
    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === id
          ? {
              ...node,
              data: {
                ...node.data,
                url: editUrl,
                videoTitle: editTitle || editUrl,
                label: editName,
                thumbnailUrl: newThumb,
                platform: newPlatform,
              },
            }
          : node
      )
    );
    setIsEditing(false);
    setIsModalOpen(false);
    setIsPlaying(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setIsModalOpen(false);
      setEditUrl(nodeData.url || '');
      setEditTitle(nodeData.videoTitle || '');
      setEditName(nodeData.label || '');
    }
  };

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (embedUrl) {
      setIsPlaying(true);
    } else if (nodeData.url) {
      window.open(nodeData.url, '_blank');
    }
  };

  // Modal UI for editing
  const renderModal = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}>
      <div className="bg-slate-900 rounded-2xl shadow-2xl p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-white mb-4">Edit Video Node</h3>
        <div className="space-y-3">
          <input
            type="text"
            value={editName}
            onChange={e => setEditName(e.target.value)}
            placeholder="Node name"
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
          />
          <input
            type="text"
            value={editUrl}
            onChange={e => setEditUrl(e.target.value)}
            placeholder="Paste video URL..."
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
          />
          <input
            type="text"
            value={editTitle}
            onChange={e => setEditTitle(e.target.value)}
            placeholder="Video title (optional)"
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
          />
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Suggest YouTube Videos</label>
            <input
              type="text"
              value={youtubeQuery}
              onChange={e => setYoutubeQuery(e.target.value)}
              placeholder="Search YouTube..."
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 mb-2"
            />
            <div className="space-y-2">
              {youtubeResults.map(video => (
                <button
                  key={video.id.videoId}
                  className="flex items-center gap-3 w-full p-2 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors"
                  onClick={() => {
                    setEditUrl(`https://www.youtube.com/watch?v=${video.id.videoId}`);
                    setEditTitle(video.snippet.title);
                  }}
                >
                  <img src={video.snippet.thumbnails.default.url} alt="thumb" className="w-12 h-8 rounded" />
                  <span className="text-xs text-white font-medium truncate">{video.snippet.title}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-2 mt-6">
          <button
            onClick={handleSave}
            className="flex-1 px-3 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-xs font-medium text-white transition-colors"
          >
            Save
          </button>
          <button
            onClick={() => {
              setIsModalOpen(false);
              setEditUrl(nodeData.url || '');
              setEditTitle(nodeData.videoTitle || '');
              setEditName(nodeData.label || '');
            }}
            className="px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs font-medium text-slate-200 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
  
  const PlatformIcon = platform === 'youtube' ? Youtube : Video
  const platformColor = platform === 'youtube' ? 'red' : platform === 'tiktok' ? 'pink' : 'blue'
  
  return (
    <>
      <div
        className={`
          relative rounded-xl overflow-hidden transition-all duration-200
          ${selected 
            ? 'ring-2 ring-cyan-400 ring-offset-2 ring-offset-slate-900 shadow-[0_0_30px_rgba(34,211,238,0.3)]' 
            : 'hover:ring-2 hover:ring-cyan-400/50'
          }
        `}
        style={{ minWidth: 200, maxWidth: 240 }}
        onClick={() => setIsModalOpen(true)}
      >
        {/* Video/Thumbnail Section */}
        <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 aspect-video flex items-center justify-center">
          {isPlaying && embedUrl ? (
            <iframe
              src={embedUrl}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title={nodeData.videoTitle || 'Video player'}
            />
          ) : thumbnail ? (
            <>
              <img 
                src={thumbnail} 
                alt={nodeData.videoTitle || 'Video thumbnail'}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <button 
                className="absolute inset-0 flex items-center justify-center group"
                onClick={handlePlayClick}
              >
                <div className="w-16 h-16 rounded-full bg-red-600 group-hover:bg-red-500 group-hover:scale-110 transition-all flex items-center justify-center shadow-xl">
                  <Play className="w-8 h-8 text-white ml-1" fill="white" />
                </div>
              </button>
            </>
          ) : (
            <div 
              className="flex flex-col items-center gap-3 p-6 cursor-pointer"
            >
              <div className={`p-4 rounded-2xl bg-red-500/20`}>
                <Youtube className={`w-10 h-10 text-red-400`} />
              </div>
              <span className="text-slate-400 text-sm">Click to add content URL</span>
            </div>
          )}
          {/* Platform Badge */}
          {nodeData.url && (
            <div className={`absolute top-2 left-2 px-2 py-1 rounded-lg bg-red-500/80 backdrop-blur-sm flex items-center gap-1.5`}>
              <Youtube className="w-3.5 h-3.5 text-white" />
              <span className="text-xs font-medium text-white capitalize">YouTube</span>
            </div>
          )}
          {/* Edit Button */}
          <button 
            className="absolute top-2 right-2 p-1.5 rounded-lg bg-slate-800/80 backdrop-blur-sm hover:bg-slate-700/80 transition-colors z-10"
            onClick={e => {
              e.stopPropagation();
              setIsPlaying(false);
              setIsModalOpen(true);
              setEditUrl(nodeData.url || '');
              setEditTitle(nodeData.videoTitle || '');
              setEditName(nodeData.label || '');
            }}
          >
            <Edit3 className="w-4 h-4 text-slate-300" />
          </button>
          {/* Close player button when playing */}
          {isPlaying && (
            <button 
              className="absolute bottom-2 right-2 px-2 py-1 rounded-lg bg-slate-800/90 backdrop-blur-sm hover:bg-slate-700/90 transition-colors z-10 flex items-center gap-1"
              onClick={e => {
                e.stopPropagation();
                setIsPlaying(false);
              }}
            >
              <span className="text-xs text-slate-300">Close</span>
            </button>
          )}
        </div>
        {/* Content Info */}
        <div className="bg-slate-800/90 backdrop-blur-sm p-3">
          <h4 className="font-medium text-white text-sm truncate mb-1">
            {nodeData.videoTitle || nodeData.label || 'Content URL Input'}
          </h4>
          {nodeData.url && (
            <div className="flex items-center gap-1.5 text-slate-400 text-xs truncate">
              <ExternalLink className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{nodeData.url}</span>
            </div>
          )}
          {!nodeData.url && (
            <p className="text-slate-500 text-xs">Click to paste content URL</p>
          )}
        </div>
        {/* Status indicator */}
        {nodeData.status && (
          <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${
            nodeData.status === 'completed' ? 'bg-green-500' :
            nodeData.status === 'running' ? 'bg-yellow-500 animate-pulse' :
            nodeData.status === 'failed' ? 'bg-red-500' : 'bg-slate-600'
          }`} />
        )}
        {/* Output Handle - this feeds into the workflow */}
        <Handle 
          type="source" 
          position={Position.Right} 
          className="!bg-cyan-500 !w-2 !h-2 !border !border-slate-900"
          style={{ top: '50%' }}
        />
      </div>
      {isModalOpen && renderModal()}
    </>
  );
})
ContentUrlInputNode.displayName = 'ContentUrlInputNode'

// --- 11. Comparison Agent Node (The Benchmarker) ---
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
      <div className="p-1 bg-rose-500/20 rounded-xl">
        <Scale className="w-3.5 h-3.5 text-rose-400" />
      </div>
      {/* Takes user data + reference data as inputs */}
      <Handle 
        type="target" 
        position={Position.Left} 
        id="user-data"
        style={{ top: '30%' }}
        className="!bg-rose-500 !w-2 !h-2 !border !border-slate-900" 
      />
      <Handle 
        type="target" 
        position={Position.Left} 
        id="reference-data"
        style={{ top: '70%' }}
        className="!bg-amber-500 !w-2 !h-2 !border !border-slate-900" 
      />
      <Handle 
        type="source" 
        position={Position.Right} 
        className="!bg-rose-500 !w-2 !h-2 !border !border-slate-900" 
      />
    </NodeWrapper>
  )
})
ComparisonAgentNode.displayName = 'ComparisonAgentNode'

// --- NewsArticleNode ---
export const NewsArticleNode = memo(({ id, data, selected }: NodeProps) => {
  const nodeData = data as NewsArticleNodeData;
  const { setNodes } = useReactFlow();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editUrl, setEditUrl] = useState(nodeData.url || '');
  const [editLabel, setEditLabel] = useState(nodeData.label || '');

  const handleSave = () => {
    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === id
          ? {
              ...node,
              data: {
                ...node.data,
                url: editUrl,
                label: editLabel,
              },
            }
          : node
      )
    );
    setIsModalOpen(false);
  };

  const renderModal = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}>
      <div className="bg-slate-900 rounded-2xl shadow-2xl p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-white mb-4">Edit News Article</h3>
        <div className="space-y-3">
          <input
            type="text"
            value={editLabel}
            onChange={e => setEditLabel(e.target.value)}
            placeholder="Article title"
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          />
          <input
            type="text"
            value={editUrl}
            onChange={e => setEditUrl(e.target.value)}
            placeholder="Paste article URL..."
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          />
        </div>
        <div className="flex gap-2 mt-6">
          <button
            onClick={handleSave}
            className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-xs font-medium text-white transition-colors"
          >
            Save
          </button>
          <button
            onClick={() => {
              setIsModalOpen(false);
              setEditUrl(nodeData.url || '');
              setEditLabel(nodeData.label || '');
            }}
            className="px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs font-medium text-slate-200 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div
        className={`
          relative rounded-xl overflow-hidden transition-all duration-200 bg-gradient-to-br from-slate-800 to-slate-900
          ${selected 
            ? 'ring-2 ring-blue-400 ring-offset-2 ring-offset-slate-900 shadow-[0_0_30px_rgba(59,130,246,0.3)]' 
            : 'hover:ring-2 hover:ring-blue-400/50'
          }
        `}
        style={{ minWidth: 200, maxWidth: 260 }}
        onClick={() => setIsModalOpen(true)}
      >
        {/* Header with icon */}
        <div className="bg-blue-500/20 px-4 py-3 flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-400" />
          <span className="text-sm font-semibold text-white truncate">
            {nodeData.label || 'News Article'}
          </span>
          <button 
            className="ml-auto p-1 rounded hover:bg-slate-700/50 transition-colors"
            onClick={e => {
              e.stopPropagation();
              setIsModalOpen(true);
              setEditUrl(nodeData.url || '');
              setEditLabel(nodeData.label || '');
            }}
          >
            <Edit3 className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>
        {/* Content */}
        <div className="p-4">
          {nodeData.url ? (
            <a 
              href={nodeData.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-blue-400 hover:text-blue-300 text-xs truncate"
              onClick={e => e.stopPropagation()}
            >
              <ExternalLink className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{nodeData.url}</span>
            </a>
          ) : (
            <p className="text-slate-500 text-xs">Click to add article URL</p>
          )}
        </div>
        {/* Status indicator */}
        {nodeData.status && (
          <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${
            nodeData.status === 'completed' ? 'bg-green-500' :
            nodeData.status === 'running' ? 'bg-yellow-500 animate-pulse' :
            nodeData.status === 'failed' ? 'bg-red-500' : 'bg-slate-600'
          }`} />
        )}
        {/* Output Handle */}
        <Handle 
          type="source" 
          position={Position.Right} 
          className="!bg-blue-500 !w-2 !h-2 !border !border-slate-900"
          style={{ top: '50%' }}
        />
      </div>
      {isModalOpen && renderModal()}
    </>
  );
})
NewsArticleNode.displayName = 'NewsArticleNode'

// --- Custom Module Node (AI-Generated / User-Created) ---
export interface CustomModuleNodeData {
  label: string
  behavior?: string
  description?: string
  inputs?: Array<{ id: string; name: string; type: string; required: boolean }>
  outputs?: Array<{ id: string; name: string; type: string }>
  customModuleId?: string
  status?: NodeStatus
  progress?: number
  aiGenerated?: boolean
  [key: string]: unknown
}

export const CustomModuleNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = data as CustomModuleNodeData
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  return (
    <Tooltip
      content={
        <div className={cn(
          'space-y-1.5 max-w-[220px]',
          isDark ? 'text-slate-100' : 'text-slate-800'
        )}>
          <div className="flex items-center gap-1.5">
            <span className="flex items-center gap-0.5 px-1 py-0.5 rounded bg-gradient-to-r from-indigo-500/20 to-purple-500/20 text-[8px] font-bold text-indigo-400">
              <Sparkles className="w-2 h-2" />
              Custom
            </span>
            <span className="font-bold text-xs">{nodeData.label}</span>
          </div>
          {nodeData.behavior && (
            <div className="text-[10px] text-slate-400">{nodeData.behavior}</div>
          )}
          {nodeData.description && (
            <div className="text-[10px] text-indigo-400">{nodeData.description}</div>
          )}
          <div className="text-[10px] text-purple-400 italic">
            ✦ AI-Generated Custom Node
          </div>
        </div>
      }
      position="right"
    >
      <NodeWrapper 
        selected={selected} 
        colorKey="brain" 
        label={nodeData.label}
        subtitle="Custom Module"
        aiGenerated={true}
        status={nodeData.status}
        progress={nodeData.progress}
      >
        <div className="p-1 bg-indigo-500/20 rounded-xl">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
        </div>
        <Handle 
          type="target" 
          position={Position.Left} 
          className="!bg-indigo-500 !w-2 !h-2 !border !border-slate-900" 
        />
        <Handle 
          type="source" 
          position={Position.Right} 
          className="!bg-indigo-500 !w-2 !h-2 !border !border-slate-900" 
        />
      </NodeWrapper>
    </Tooltip>
  )
})
CustomModuleNode.displayName = 'CustomModuleNode'

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
  contentUrlInputNode: ContentUrlInputNode,
  mediaNode: MediaNode,
  newsArticleNode: NewsArticleNode,
  customModuleNode: CustomModuleNode,
}
