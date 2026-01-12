'use client'

import { useState, useEffect, useRef, lazy, Suspense } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { 
  Brain, 
  ChevronRight, 
  ChevronDown, 
  Search, 
  Layers, 
  GitBranch,
  Info,
  ExternalLink,
  Maximize2,
  Zap,
  X,
  List,
  PanelLeftClose,
  PanelLeft,
  Box,
  Rotate3D,
  Workflow
} from 'lucide-react'
import Link from 'next/link'

// Lazy load 3D component for better performance
const Brain3DVisualization = lazy(() => import('@/components/brain-3d-visualization'))

interface BrainRegion {
  id: string
  name: string
  abbreviation: string | null
  atlas_source: string
  ontology_id: string | null
  parent_id: string | null
  structure_level: number | null
  description: string | null
  color_hex: string | null
  created_at: string
  updated_at: string
}

interface TreeNode extends BrainRegion {
  children: TreeNode[]
  expanded: boolean
}

// Tree Node Component
function RegionTreeNode({ 
  node, 
  onToggle, 
  onSelect,
  selectedId,
  level = 0 
}: { 
  node: TreeNode
  onToggle: (id: string) => void
  onSelect: (region: BrainRegion) => void
  selectedId: string | null
  level?: number 
}) {
  const hasChildren = node.children.length > 0
  const isSelected = selectedId === node.id
  
  return (
    <div>
      <div 
        className={cn(
          "flex items-center gap-1 py-1.5 px-2 rounded-md cursor-pointer transition-all",
          "hover:bg-slate-100 dark:hover:bg-slate-800",
          isSelected && "bg-indigo-100 dark:bg-indigo-900/50 ring-2 ring-indigo-500"
        )}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={() => onSelect(node)}
      >
        {hasChildren ? (
          <button 
            onClick={(e) => { e.stopPropagation(); onToggle(node.id) }}
            className="p-0.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded"
          >
            {node.expanded ? (
              <ChevronDown className="h-3 w-3 text-slate-500" />
            ) : (
              <ChevronRight className="h-3 w-3 text-slate-500" />
            )}
          </button>
        ) : (
          <span className="w-4" />
        )}
        
        {node.color_hex && (
          <span 
            className={cn(
              "w-3 h-3 rounded-full shrink-0 transition-transform",
              isSelected && "scale-125 ring-2 ring-offset-1 ring-indigo-500"
            )}
            style={{ backgroundColor: `#${node.color_hex}` }}
          />
        )}
        
        <span className={cn(
          "text-sm truncate flex-1",
          isSelected ? "font-semibold text-indigo-700 dark:text-indigo-300" : "font-medium"
        )}>
          {node.name}
        </span>
        
        {node.abbreviation && (
          <span className="text-xs text-slate-400 shrink-0">
            {node.abbreviation}
          </span>
        )}
      </div>
      
      {hasChildren && node.expanded && (
        <div>
          {node.children.map(child => (
            <RegionTreeNode 
              key={child.id} 
              node={child} 
              onToggle={onToggle}
              onSelect={onSelect}
              selectedId={selectedId}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// Anatomical brain region mapping - maps region names/abbreviations to brain locations
// Coordinates are relative to a 400x320 viewBox brain diagram
const BRAIN_REGION_MAP: Record<string, { x: number; y: number; area: string }> = {
  // Frontal/Prefrontal regions
  'PFC': { x: 80, y: 100, area: 'frontal' },
  'ACC': { x: 120, y: 130, area: 'frontal' },
  'M1': { x: 150, y: 90, area: 'frontal' },
  
  // Temporal regions
  'AMY': { x: 160, y: 200, area: 'temporal' },
  'HIP': { x: 180, y: 190, area: 'temporal' },
  'INS': { x: 170, y: 160, area: 'temporal' },
  
  // Parietal regions
  'V1': { x: 320, y: 120, area: 'occipital' },
  
  // Subcortical/Deep structures
  'TH': { x: 200, y: 150, area: 'subcortical' },
  'THA': { x: 200, y: 150, area: 'subcortical' },
  'BG': { x: 180, y: 140, area: 'subcortical' },
  'STR': { x: 175, y: 135, area: 'subcortical' },
  'PAL': { x: 185, y: 145, area: 'subcortical' },
  'HY': { x: 200, y: 180, area: 'subcortical' },
  
  // Brainstem
  'MB': { x: 240, y: 200, area: 'brainstem' },
  'MBmot': { x: 245, y: 195, area: 'brainstem' },
  'MBsen': { x: 235, y: 205, area: 'brainstem' },
  'MBsta': { x: 240, y: 210, area: 'brainstem' },
  'P': { x: 260, y: 230, area: 'brainstem' },
  'MY': { x: 280, y: 260, area: 'brainstem' },
  'BS': { x: 260, y: 230, area: 'brainstem' },
  'HB': { x: 270, y: 245, area: 'brainstem' },
  
  // Cerebellum
  'CB': { x: 320, y: 220, area: 'cerebellum' },
  'CER': { x: 320, y: 220, area: 'cerebellum' },
  'CBX': { x: 330, y: 210, area: 'cerebellum' },
  'CBN': { x: 310, y: 230, area: 'cerebellum' },
  'VERM': { x: 320, y: 240, area: 'cerebellum' },
  'HEM': { x: 340, y: 220, area: 'cerebellum' },
  'DN': { x: 315, y: 225, area: 'cerebellum' },
  'FN': { x: 305, y: 235, area: 'cerebellum' },
  'IP': { x: 325, y: 235, area: 'cerebellum' },
  'VeCB': { x: 300, y: 240, area: 'cerebellum' },
  
  // Cortex
  'CTX': { x: 150, y: 100, area: 'cortex' },
  'CTXpl': { x: 140, y: 95, area: 'cortex' },
  'CTXsp': { x: 145, y: 105, area: 'cortex' },
  'CH': { x: 160, y: 120, area: 'cortex' },
  'CNU': { x: 175, y: 130, area: 'cortex' },
  'IB': { x: 195, y: 155, area: 'subcortical' },
  
  // Fiber tracts - distributed along pathways
  'cc': { x: 180, y: 110, area: 'whitematter' },
  'ccb': { x: 190, y: 105, area: 'whitematter' },
  'ccg': { x: 160, y: 115, area: 'whitematter' },
  'ccs': { x: 220, y: 110, area: 'whitematter' },
  'ccr': { x: 150, y: 120, area: 'whitematter' },
  'fa': { x: 140, y: 125, area: 'whitematter' },
  'fp': { x: 280, y: 115, area: 'whitematter' },
  'int': { x: 185, y: 150, area: 'whitematter' },
  'cst': { x: 220, y: 180, area: 'whitematter' },
  'cpt': { x: 230, y: 190, area: 'whitematter' },
  'py': { x: 265, y: 250, area: 'whitematter' },
  
  // Cranial nerves - along brainstem
  'In': { x: 100, y: 140, area: 'nerve' },
  'IIn': { x: 130, y: 155, area: 'nerve' },
  'opt': { x: 150, y: 165, area: 'nerve' },
  'IIIn': { x: 225, y: 200, area: 'nerve' },
  'IVn': { x: 235, y: 195, area: 'nerve' },
  'Vn': { x: 255, y: 215, area: 'nerve' },
  'VIn': { x: 260, y: 235, area: 'nerve' },
  'VIIn': { x: 265, y: 240, area: 'nerve' },
  'VIIIn': { x: 270, y: 245, area: 'nerve' },
  'IXn': { x: 275, y: 255, area: 'nerve' },
  'Xn': { x: 280, y: 265, area: 'nerve' },
  'XIn': { x: 285, y: 275, area: 'nerve' },
  'XIIn': { x: 290, y: 280, area: 'nerve' },
  
  // Ventricles
  'VL': { x: 175, y: 130, area: 'ventricle' },
  'V3': { x: 200, y: 160, area: 'ventricle' },
  'V4': { x: 270, y: 235, area: 'ventricle' },
  'AQ': { x: 240, y: 190, area: 'ventricle' },
  
  // Cerebellar layers
  'CBXmo': { x: 335, y: 205, area: 'cerebellum' },
  'CBXgr': { x: 325, y: 215, area: 'cerebellum' },
  'CBXpu': { x: 330, y: 210, area: 'cerebellum' },
  
  // Default positions by category keywords
}

// Get brain position for a region
function getBrainPosition(region: BrainRegion): { x: number; y: number; area: string } {
  // Check abbreviation first
  if (region.abbreviation && BRAIN_REGION_MAP[region.abbreviation]) {
    return BRAIN_REGION_MAP[region.abbreviation]
  }
  
  // Check name patterns
  const name = region.name.toLowerCase()
  const abbr = region.abbreviation?.toLowerCase() || ''
  
  // Cerebellar structures
  if (name.includes('cerebell') || name.includes('vermis') || abbr.includes('cb')) {
    return { x: 320 + Math.random() * 30 - 15, y: 220 + Math.random() * 30 - 15, area: 'cerebellum' }
  }
  
  // Brainstem/Pons/Medulla
  if (name.includes('pons') || name.includes('medulla') || name.includes('midbrain') || 
      name.includes('tegment') || name.includes('pedunc') || name.includes('decussation')) {
    return { x: 255 + Math.random() * 30 - 15, y: 230 + Math.random() * 30 - 15, area: 'brainstem' }
  }
  
  // Thalamus/Hypothalamus
  if (name.includes('thalam') || name.includes('hypothalam')) {
    return { x: 200 + Math.random() * 20 - 10, y: 160 + Math.random() * 20 - 10, area: 'subcortical' }
  }
  
  // Cortical structures
  if (name.includes('cortex') || name.includes('cortical') || name.includes('gyrus')) {
    return { x: 150 + Math.random() * 40 - 20, y: 100 + Math.random() * 40 - 20, area: 'cortex' }
  }
  
  // Fiber tracts
  if (name.includes('tract') || name.includes('fascicle') || name.includes('bundle') || 
      name.includes('pathway') || name.includes('commissure') || name.includes('capsule')) {
    return { x: 200 + Math.random() * 60 - 30, y: 150 + Math.random() * 60 - 30, area: 'whitematter' }
  }
  
  // Nerves
  if (name.includes('nerve')) {
    return { x: 250 + Math.random() * 40 - 20, y: 240 + Math.random() * 30 - 15, area: 'nerve' }
  }
  
  // Ventricles/Fissures
  if (name.includes('ventricle') || name.includes('fissure') || name.includes('sulcus')) {
    return { x: 200 + Math.random() * 40 - 20, y: 160 + Math.random() * 40 - 20, area: 'ventricle' }
  }
  
  // Amygdala/Hippocampus - temporal
  if (name.includes('amygdal') || name.includes('hippocam') || name.includes('temporal')) {
    return { x: 170 + Math.random() * 20 - 10, y: 190 + Math.random() * 20 - 10, area: 'temporal' }
  }
  
  // Basal ganglia/Striatum
  if (name.includes('ganglia') || name.includes('striatum') || name.includes('pallid') || name.includes('putamen')) {
    return { x: 180 + Math.random() * 20 - 10, y: 140 + Math.random() * 20 - 10, area: 'subcortical' }
  }
  
  // Default - center area
  return { x: 200 + Math.random() * 40 - 20, y: 160 + Math.random() * 40 - 20, area: 'default' }
}

// Area colors for different brain regions
const AREA_COLORS: Record<string, string> = {
  frontal: '#f97316',    // orange
  temporal: '#22c55e',   // green
  occipital: '#a855f7',  // purple
  parietal: '#3b82f6',   // blue
  subcortical: '#eab308', // yellow
  brainstem: '#ef4444',  // red
  cerebellum: '#06b6d4', // cyan
  cortex: '#ec4899',     // pink
  whitematter: '#94a3b8', // gray
  nerve: '#f59e0b',      // amber
  ventricle: '#6366f1',  // indigo
  default: '#6366f1',    // indigo
}

// Interactive Brain Visualization Component
function BrainVisualization({ 
  selectedRegion,
  regions,
  onRegionClick,
  onAreaClick
}: { 
  selectedRegion: BrainRegion | null
  regions: BrainRegion[]
  onRegionClick: (region: BrainRegion) => void
  onAreaClick?: (area: string) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [pulseKey, setPulseKey] = useState(0)
  
  // Trigger pulse animation when selection changes
  useEffect(() => {
    if (selectedRegion) {
      setPulseKey(k => k + 1)
    }
  }, [selectedRegion?.id])
  
  // Get related regions (siblings and children)
  const relatedRegions = regions.filter(r => 
    selectedRegion && (
      r.parent_id === selectedRegion.id || 
      r.parent_id === selectedRegion.parent_id
    ) && r.id !== selectedRegion?.id
  ).slice(0, 8)

  const regionColor = selectedRegion?.color_hex ? `#${selectedRegion.color_hex}` : '#6366f1'
  const selectedPosition = selectedRegion ? getBrainPosition(selectedRegion) : null
  const selectedAreaColor = selectedPosition ? AREA_COLORS[selectedPosition.area] : '#6366f1'
  
  return (
    <div ref={containerRef} className="relative w-full h-full min-h-[350px] flex items-center justify-center overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-xl" />
      
      {/* Main Brain SVG Diagram */}
      <svg 
        viewBox="0 0 400 320" 
        className="w-full h-full max-w-[500px] max-h-[400px] relative z-10"
        style={{ filter: 'drop-shadow(0 0 20px rgba(99, 102, 241, 0.3))' }}
      >
        <defs>
          {/* Gradients for brain regions */}
          <radialGradient id="brainGradient" cx="40%" cy="40%">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#312e81" stopOpacity="0.8" />
          </radialGradient>
          <radialGradient id="selectedGlow" cx="50%" cy="50%">
            <stop offset="0%" stopColor={selectedAreaColor} stopOpacity="0.8" />
            <stop offset="100%" stopColor={selectedAreaColor} stopOpacity="0" />
          </radialGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        {/* Brain outline - sagittal view */}
        <g className="brain-outline">
          {/* Cerebrum (main brain mass) */}
          <path
            d="M80,160 
               C60,120 70,80 120,60 
               C180,30 260,35 300,70 
               C340,100 350,140 340,170 
               C335,190 320,200 300,200
               L280,200
               C260,200 250,190 240,200
               L200,200
               C180,210 160,200 140,200
               C100,200 85,180 80,160Z"
            fill="url(#brainGradient)"
            stroke="#4f46e5"
            strokeWidth="2"
            className="transition-all duration-300"
          />
          
          {/* Cerebellum */}
          <ellipse
            cx="320" cy="230"
            rx="45" ry="35"
            fill="url(#brainGradient)"
            stroke="#4f46e5"
            strokeWidth="2"
          />
          
          {/* Brainstem */}
          <path
            d="M260,200 
               C265,220 270,240 275,270 
               C278,285 282,295 285,300
               L295,300
               C298,295 302,285 305,270
               C310,240 310,220 300,200"
            fill="url(#brainGradient)"
            stroke="#4f46e5"
            strokeWidth="2"
          />
          
          {/* Frontal lobe divider */}
          <path
            d="M150,65 C160,100 160,140 150,180"
            fill="none"
            stroke="#6366f1"
            strokeWidth="1"
            strokeDasharray="4,4"
            opacity="0.5"
          />
          
          {/* Parietal/Occipital divider */}
          <path
            d="M280,70 C290,100 295,140 290,180"
            fill="none"
            stroke="#6366f1"
            strokeWidth="1"
            strokeDasharray="4,4"
            opacity="0.5"
          />
          
          {/* Temporal lobe divider */}
          <path
            d="M140,140 C180,150 220,150 260,140"
            fill="none"
            stroke="#6366f1"
            strokeWidth="1"
            strokeDasharray="4,4"
            opacity="0.5"
          />
        </g>
        
        {/* Region labels - clickable to scroll to that area */}
        <g className="region-labels" fontSize="11" fontFamily="system-ui" fontWeight="500">
          <g 
            className="cursor-pointer"
            onClick={() => onAreaClick?.('frontal')}
            style={{ cursor: 'pointer' }}
          >
            <rect x="65" y="88" width="70" height="18" rx="4" fill={AREA_COLORS.frontal} fillOpacity="0.2" className="transition-all hover:fill-opacity-40" />
            <text x="100" y="102" textAnchor="middle" fill={AREA_COLORS.frontal}>Frontal</text>
          </g>
          <g 
            className="cursor-pointer"
            onClick={() => onAreaClick?.('parietal')}
            style={{ cursor: 'pointer' }}
          >
            <rect x="163" y="73" width="74" height="18" rx="4" fill={AREA_COLORS.parietal} fillOpacity="0.2" className="transition-all hover:fill-opacity-40" />
            <text x="200" y="87" textAnchor="middle" fill={AREA_COLORS.parietal}>Parietal</text>
          </g>
          <g 
            className="cursor-pointer"
            onClick={() => onAreaClick?.('occipital')}
            style={{ cursor: 'pointer' }}
          >
            <rect x="268" y="118" width="84" height="18" rx="4" fill={AREA_COLORS.occipital} fillOpacity="0.2" className="transition-all hover:fill-opacity-40" />
            <text x="310" y="132" textAnchor="middle" fill={AREA_COLORS.occipital}>Occipital</text>
          </g>
          <g 
            className="cursor-pointer"
            onClick={() => onAreaClick?.('temporal')}
            style={{ cursor: 'pointer' }}
          >
            <rect x="118" y="168" width="84" height="18" rx="4" fill={AREA_COLORS.temporal} fillOpacity="0.2" className="transition-all hover:fill-opacity-40" />
            <text x="160" y="182" textAnchor="middle" fill={AREA_COLORS.temporal}>Temporal</text>
          </g>
          <g 
            className="cursor-pointer"
            onClick={() => onAreaClick?.('brainstem')}
            style={{ cursor: 'pointer' }}
          >
            <rect x="225" y="243" width="90" height="18" rx="4" fill={AREA_COLORS.brainstem} fillOpacity="0.2" className="transition-all hover:fill-opacity-40" />
            <text x="270" y="257" textAnchor="middle" fill={AREA_COLORS.brainstem}>Brainstem</text>
          </g>
          <g 
            className="cursor-pointer"
            onClick={() => onAreaClick?.('cerebellum')}
            style={{ cursor: 'pointer' }}
          >
            <rect x="270" y="223" width="100" height="18" rx="4" fill={AREA_COLORS.cerebellum} fillOpacity="0.2" className="transition-all hover:fill-opacity-40" />
            <text x="320" y="237" textAnchor="middle" fill={AREA_COLORS.cerebellum}>Cerebellum</text>
          </g>
        </g>
        
        {/* Selected region highlight */}
        {selectedPosition && (
          <g key={pulseKey}>
            {/* Glowing circle at selected location */}
            <circle
              cx={selectedPosition.x}
              cy={selectedPosition.y}
              r="25"
              fill="url(#selectedGlow)"
              className="animate-pulse"
            />
            <circle
              cx={selectedPosition.x}
              cy={selectedPosition.y}
              r="8"
              fill={selectedAreaColor}
              filter="url(#glow)"
              className="animate-pulse"
            />
            <circle
              cx={selectedPosition.x}
              cy={selectedPosition.y}
              r="4"
              fill="white"
            />
          </g>
        )}
        
        {/* Connection lines from selected region to related regions */}
        {selectedPosition && relatedRegions.map((region, i) => {
          const relatedPos = getBrainPosition(region)
          const relatedColor = AREA_COLORS[relatedPos.area]
          
          // Calculate control point for curved line
          const midX = (selectedPosition.x + relatedPos.x) / 2
          const midY = (selectedPosition.y + relatedPos.y) / 2 - 20
          
          return (
            <g key={region.id}>
              {/* Connection line */}
              <path
                d={`M${selectedPosition.x},${selectedPosition.y} Q${midX},${midY} ${relatedPos.x},${relatedPos.y}`}
                fill="none"
                stroke={relatedColor}
                strokeWidth="1.5"
                strokeOpacity="0.6"
                strokeLinecap="round"
              />
              
              {/* Traveling dot */}
              <circle r="3" fill={relatedColor}>
                <animateMotion
                  dur={`${1.5 + i * 0.2}s`}
                  repeatCount="indefinite"
                  path={`M${selectedPosition.x},${selectedPosition.y} Q${midX},${midY} ${relatedPos.x},${relatedPos.y}`}
                />
              </circle>
              
              {/* Related region dot */}
              <circle
                cx={relatedPos.x}
                cy={relatedPos.y}
                r="5"
                fill={relatedColor}
                className="cursor-pointer hover:r-7 transition-all"
                onClick={() => onRegionClick(region)}
                style={{ cursor: 'pointer' }}
              />
            </g>
          )
        })}
        
        {/* Interactive region hotspots - clickable areas */}
        {regions.slice(0, 50).map((region) => {
          const pos = getBrainPosition(region)
          const isSelected = selectedRegion?.id === region.id
          const areaColor = AREA_COLORS[pos.area]
          
          if (isSelected) return null // Don't show dot for selected region (already highlighted)
          
          return (
            <circle
              key={region.id}
              cx={pos.x}
              cy={pos.y}
              r={isSelected ? 6 : 3}
              fill={areaColor}
              opacity={0.4}
              className="cursor-pointer transition-all hover:opacity-100 hover:r-5"
              onClick={() => onRegionClick(region)}
              style={{ cursor: 'pointer' }}
            >
              <title>{region.name} ({region.abbreviation || 'N/A'})</title>
            </circle>
          )
        })}
      </svg>
      
      {/* Legend */}
      <div className="absolute bottom-3 left-3 flex flex-wrap gap-2 z-20">
        {Object.entries(AREA_COLORS).slice(0, 7).map(([area, color]) => (
          <div key={area} className="flex items-center gap-1 text-xs text-slate-400">
            <div 
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: color }}
            />
            <span className="capitalize">{area}</span>
          </div>
        ))}
      </div>
      
      {/* Selected Region Label */}
      {selectedRegion && selectedPosition && (
        <div className="absolute bottom-3 right-3 z-20">
          <div 
            className="flex items-center gap-3 px-4 py-2 rounded-full bg-slate-800/90 backdrop-blur-sm border"
            style={{ borderColor: selectedAreaColor }}
          >
            <div 
              className="w-3 h-3 rounded-full animate-pulse"
              style={{ backgroundColor: selectedAreaColor }}
            />
            <span className="text-sm font-medium text-white">
              {selectedRegion.abbreviation || selectedRegion.name.slice(0, 20)}
            </span>
            <span className="text-xs text-slate-400 capitalize">
              {selectedPosition.area}
            </span>
            <Zap className="w-4 h-4" style={{ color: selectedAreaColor }} />
          </div>
        </div>
      )}
      
      {/* Empty state */}
      {!selectedRegion && (
        <div className="absolute bottom-16 left-0 right-0 flex justify-center z-20">
          <p className="text-slate-400 text-sm bg-slate-900/80 px-4 py-2 rounded-full">
            Click a region in the list or on the brain to explore
          </p>
        </div>
      )}
    </div>
  )
}

// Build tree from flat data
function buildTree(regions: BrainRegion[]): TreeNode[] {
  const nodeMap = new Map<string, TreeNode>()
  const roots: TreeNode[] = []
  
  // Create nodes
  regions.forEach(region => {
    nodeMap.set(region.id, { ...region, children: [], expanded: false })
  })
  
  // Build hierarchy
  regions.forEach(region => {
    const node = nodeMap.get(region.id)!
    if (region.parent_id && nodeMap.has(region.parent_id)) {
      nodeMap.get(region.parent_id)!.children.push(node)
    } else {
      roots.push(node)
    }
  })
  
  // Sort children by name
  const sortChildren = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => a.name.localeCompare(b.name))
    nodes.forEach(node => sortChildren(node.children))
  }
  sortChildren(roots)
  
  return roots
}

export default function BrainRegionsPage() {
  const [regions, setRegions] = useState<BrainRegion[]>([])
  const [treeData, setTreeData] = useState<TreeNode[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRegion, setSelectedRegion] = useState<BrainRegion | null>(null)
  const [viewMode, setViewMode] = useState<'tree' | 'list'>('list')
  const [isPanelOpen, setIsPanelOpen] = useState(true)
  const [isMobileListOpen, setIsMobileListOpen] = useState(false)
  const [visualizationMode, setVisualizationMode] = useState<'2d' | '3d'>('2d')
  const [isTransitioning, setIsTransitioning] = useState(false)
  
  // Refs for scrolling to regions by area
  const listContainerRef = useRef<HTMLDivElement>(null)
  const regionRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  
  // Function to find first region matching an area and scroll to it
  const scrollToArea = (area: string) => {
    // Find the first region that matches this area
    const areaKeywords: Record<string, string[]> = {
      frontal: ['frontal', 'prefrontal', 'premotor', 'motor cortex', 'orbitofrontal'],
      temporal: ['temporal', 'hippocampus', 'amygdala', 'auditory', 'entorhinal'],
      parietal: ['parietal', 'somatosensory', 'precuneus', 'angular', 'supramarginal'],
      occipital: ['occipital', 'visual', 'calcarine', 'cuneus', 'lingual'],
      brainstem: ['brainstem', 'midbrain', 'pons', 'medulla', 'tegmentum', 'brain stem'],
      cerebellum: ['cerebellum', 'cerebellar', 'vermis', 'floccul', 'dentate nucleus'],
      subcortical: ['basal ganglia', 'striatum', 'thalamus', 'hypothalamus', 'putamen', 'caudate', 'pallidum']
    }
    
    const keywords = areaKeywords[area] || [area]
    
    // Find first matching region
    const matchingRegion = filteredRegions.find(region => {
      const name = region.name.toLowerCase()
      return keywords.some(keyword => name.includes(keyword.toLowerCase()))
    })
    
    if (matchingRegion) {
      // Scroll to this region in the list
      const element = regionRefs.current.get(matchingRegion.id)
      if (element && listContainerRef.current) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' })
        // Also select the region
        setSelectedRegion(matchingRegion)
        // Flash highlight effect
        element.classList.add('ring-2', 'ring-primary', 'ring-offset-2')
        setTimeout(() => {
          element.classList.remove('ring-2', 'ring-primary', 'ring-offset-2')
        }, 1500)
      }
    }
  }
  
  // Fetch regions from Supabase
  useEffect(() => {
    async function fetchRegions() {
      try {
        const supabase = createBrowserClient()
        const { data, error } = await supabase
          .from('brain_regions')
          .select('*')
          .order('name')
          .limit(500)

        if (error) throw error
        setRegions(data || [])
        setTreeData(buildTree(data || []))
      } catch (err) {
        console.error('Error fetching brain regions:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchRegions()
  }, [])

  // Handle tree node toggle
  const handleToggle = (id: string) => {
    setTreeData(prev => {
      const toggle = (nodes: TreeNode[]): TreeNode[] => {
        return nodes.map(node => {
          if (node.id === id) {
            return { ...node, expanded: !node.expanded }
          }
          if (node.children.length > 0) {
            return { ...node, children: toggle(node.children) }
          }
          return node
        })
      }
      return toggle(prev)
    })
  }

  // Handle region selection - also scrolls to region in list
  const handleSelectRegion = (region: BrainRegion) => {
    setSelectedRegion(region)
    setIsMobileListOpen(false) // Close mobile list when selecting
    
    // Scroll to the region in the left panel list
    setTimeout(() => {
      const element = regionRefs.current.get(region.id)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' })
        // Brief highlight effect
        element.classList.add('ring-2', 'ring-primary')
        setTimeout(() => {
          element.classList.remove('ring-2', 'ring-primary')
        }, 1000)
      }
    }, 50) // Small delay to ensure refs are set
  }

  // Filter regions by search
  const filteredRegions = regions.filter(region => 
    region.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    region.abbreviation?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Stats
  const totalRegions = regions.length
  const uniqueAtlases = new Set(regions.map(r => r.atlas_source)).size
  const maxDepth = Math.max(...regions.map(r => r.structure_level || 0), 0)

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col lg:flex-row gap-4">
      {/* Mobile: Region Selector Button */}
      <div className="lg:hidden flex items-center gap-2 shrink-0">
        <Button 
          variant="outline" 
          className="flex-1"
          onClick={() => setIsMobileListOpen(true)}
        >
          <List className="h-4 w-4 mr-2" />
          {selectedRegion ? selectedRegion.name : 'Select Brain Region'}
        </Button>
      </div>
      
      {/* Mobile: Region List Modal */}
      {isMobileListOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setIsMobileListOpen(false)} />
          <div className="absolute inset-x-4 top-4 bottom-4 bg-white dark:bg-slate-900 rounded-xl shadow-xl flex flex-col overflow-hidden">
            {/* Mobile List Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h2 className="font-semibold">Select Brain Region</h2>
              <button onClick={() => setIsMobileListOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            {/* Mobile Search */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-700">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search brain regions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            
            {/* Mobile Region List */}
            <div className="flex-1 overflow-auto p-2">
              {filteredRegions.map(region => (
                <div
                  key={region.id}
                  className={cn(
                    "flex items-center gap-2 py-3 px-3 rounded-md cursor-pointer transition-colors",
                    "hover:bg-slate-100 dark:hover:bg-slate-800",
                    selectedRegion?.id === region.id && "bg-indigo-50 dark:bg-indigo-900/30 ring-2 ring-indigo-500"
                  )}
                  onClick={() => handleSelectRegion(region)}
                >
                  <span className="text-sm font-medium flex-1 truncate">{region.name}</span>
                  {region.abbreviation && (
                    <Badge variant="outline" className="text-xs shrink-0">
                      {region.abbreviation}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
            
            {/* Mobile Footer */}
            <div className="p-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
              <p className="text-xs text-slate-500 text-center">{filteredRegions.length} regions</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Desktop: Collapsible Left Panel */}
      <div className={cn(
        "hidden lg:flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden transition-all duration-300",
        isPanelOpen ? "w-80" : "w-12"
      )}>
        {/* Panel Header */}
        <div className="p-3 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
          {isPanelOpen ? (
            <>
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <button 
                onClick={() => setIsPanelOpen(false)}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
              >
                <PanelLeftClose className="h-4 w-4 text-slate-500" />
              </button>
            </>
          ) : (
            <button 
              onClick={() => setIsPanelOpen(true)}
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded mx-auto"
            >
              <PanelLeft className="h-4 w-4 text-slate-500" />
            </button>
          )}
        </div>
        
        {/* View Toggle - only when expanded */}
        {isPanelOpen && (
          <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-700 flex gap-1">
            <Button 
              variant={viewMode === 'tree' ? 'default' : 'ghost'} 
              size="sm"
              onClick={() => setViewMode('tree')}
              className="flex-1 h-7 text-xs"
            >
              <GitBranch className="h-3 w-3 mr-1" />
              Tree
            </Button>
            <Button 
              variant={viewMode === 'list' ? 'default' : 'ghost'} 
              size="sm"
              onClick={() => setViewMode('list')}
              className="flex-1 h-7 text-xs"
            >
              <Layers className="h-3 w-3 mr-1" />
              List
            </Button>
          </div>
        )}
        
        {/* Region List/Tree */}
        {isPanelOpen && (
          <div ref={listContainerRef} className="flex-1 overflow-auto p-2">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
              </div>
            ) : viewMode === 'tree' ? (
              <div className="space-y-0.5">
                {treeData.map(node => (
                  <RegionTreeNode 
                    key={node.id} 
                    node={node} 
                    onToggle={handleToggle}
                    onSelect={handleSelectRegion}
                    selectedId={selectedRegion?.id || null}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-0.5">
                {filteredRegions.map(region => (
                  <div
                    key={region.id}
                    ref={(el) => {
                      if (el) {
                        regionRefs.current.set(region.id, el)
                      }
                    }}
                    className={cn(
                      "flex items-center gap-2 py-1.5 px-2 rounded-md cursor-pointer transition-all text-sm",
                      "hover:bg-slate-100 dark:hover:bg-slate-800",
                      selectedRegion?.id === region.id && "bg-indigo-50 dark:bg-indigo-900/30 ring-1 ring-indigo-500"
                    )}
                    onClick={() => handleSelectRegion(region)}
                  >
                    <span className="font-medium truncate flex-1">{region.name}</span>
                    {region.abbreviation && (
                      <span className="text-xs text-slate-400 shrink-0">{region.abbreviation}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        {/* Stats Footer */}
        {isPanelOpen && (
          <div className="p-2 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
            <div className="flex justify-between text-xs text-slate-500">
              <span>{totalRegions} regions</span>
              <span>{uniqueAtlases} atlases</span>
            </div>
          </div>
        )}
      </div>
      
      {/* Right Panel - Brain Visualization & Details */}
      <div className="flex-1 flex flex-col min-h-0 gap-4">
        {/* Brain Visualization - takes remaining height on mobile, fixed on desktop */}
        <div className="flex-1 lg:flex-none lg:h-[350px] min-h-[250px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden relative">
          {/* 2D/3D Toggle Button */}
          <div className="absolute top-3 right-3 z-20">
            <button
              onClick={() => {
                setIsTransitioning(true)
                setTimeout(() => {
                  setVisualizationMode(visualizationMode === '2d' ? '3d' : '2d')
                  setTimeout(() => setIsTransitioning(false), 100)
                }, 300)
              }}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-all",
                "bg-slate-800/80 hover:bg-slate-700/80 backdrop-blur-sm border border-slate-600",
                "text-white shadow-lg"
              )}
            >
              {visualizationMode === '2d' ? (
                <>
                  <Rotate3D className="h-4 w-4" />
                  <span>3D View</span>
                </>
              ) : (
                <>
                  <Layers className="h-4 w-4" />
                  <span>2D View</span>
                </>
              )}
            </button>
          </div>
          
          {/* Transition overlay */}
          <div 
            className={cn(
              "absolute inset-0 z-10 bg-slate-900 transition-opacity duration-300 pointer-events-none",
              isTransitioning ? "opacity-100" : "opacity-0"
            )}
          />
          
          {/* 2D Visualization */}
          <div className={cn(
            "absolute inset-0 transition-all duration-500",
            visualizationMode === '2d' 
              ? "opacity-100 scale-100" 
              : "opacity-0 scale-95 pointer-events-none"
          )}>
            <BrainVisualization 
              selectedRegion={selectedRegion}
              regions={regions}
              onRegionClick={handleSelectRegion}
              onAreaClick={scrollToArea}
            />
          </div>
          
          {/* 3D Visualization */}
          <div className={cn(
            "absolute inset-0 transition-all duration-500",
            visualizationMode === '3d' 
              ? "opacity-100 scale-100" 
              : "opacity-0 scale-95 pointer-events-none"
          )}>
            {visualizationMode === '3d' && (
              <Suspense fallback={
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-slate-400">Loading 3D Brain...</p>
                  </div>
                </div>
              }>
                <Brain3DVisualization 
                  regions={regions}
                  selectedRegion={selectedRegion}
                  onRegionClick={handleSelectRegion}
                />
              </Suspense>
            )}
          </div>
        </div>
        
        {/* Region Details - fixed height with internal scroll */}
        {selectedRegion && (
          <div className="shrink-0 lg:flex-1 lg:max-h-[320px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl flex flex-col">
            <div className="flex-1 overflow-auto p-4">
              {/* Compact Header */}
              <div className="flex items-center gap-3 mb-4">
                {selectedRegion.color_hex && (
                  <div 
                    className="w-10 h-10 rounded-lg shrink-0 shadow"
                    style={{ backgroundColor: `#${selectedRegion.color_hex}` }}
                  />
                )}
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 truncate">
                    {selectedRegion.name}
                  </h2>
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    <Badge className="text-xs">{selectedRegion.atlas_source}</Badge>
                    {selectedRegion.abbreviation && (
                      <Badge variant="secondary" className="text-xs">{selectedRegion.abbreviation}</Badge>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Description */}
              {selectedRegion.description && (
                <div className="mb-4 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {selectedRegion.description}
                  </p>
                </div>
              )}
              
              {/* Quick Info Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <p className="text-xs text-slate-500 mb-1">Region ID</p>
                  <p className="font-mono text-xs truncate">{selectedRegion.id.slice(0, 8)}...</p>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <p className="text-xs text-slate-500 mb-1">Atlas</p>
                  <p className="text-sm font-medium">{selectedRegion.atlas_source}</p>
                </div>
              </div>
            </div>
            
            {/* Actions - Fixed at bottom */}
            <div className="shrink-0 p-4 pt-0 space-y-2 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
              {/* Primary action: Use in Workflow */}
              <Link 
                href={`/dashboard/workflows/new?region=${encodeURIComponent(selectedRegion.id)}&regionName=${encodeURIComponent(selectedRegion.name)}&regionAbbr=${encodeURIComponent(selectedRegion.abbreviation || '')}`}
                className="block"
              >
                <Button className="w-full bg-violet-600 hover:bg-violet-700">
                  <Workflow className="h-4 w-4 mr-2" />
                  Use in Workflow
                </Button>
              </Link>
              
              {/* Secondary actions */}
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1">
                  <ExternalLink className="h-4 w-4 mr-1" />
                  Allen Atlas
                </Button>
                <Button 
                  variant={visualizationMode === '3d' ? 'default' : 'outline'} 
                  size="sm" 
                  className="flex-1"
                  onClick={() => {
                    if (visualizationMode === '2d') {
                      setIsTransitioning(true)
                      setTimeout(() => {
                        setVisualizationMode('3d')
                        setTimeout(() => setIsTransitioning(false), 100)
                      }, 300)
                    }
                  }}
                >
                  <Rotate3D className="h-4 w-4 mr-1" />
                  3D View
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}