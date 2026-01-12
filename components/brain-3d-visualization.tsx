'use client'

import { useState } from 'react'

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

// Area colors for different brain regions
const AREA_COLORS: Record<string, string> = {
  frontal: '#f97316',
  temporal: '#22c55e',
  occipital: '#a855f7',
  parietal: '#3b82f6',
  subcortical: '#eab308',
  brainstem: '#ef4444',
  cerebellum: '#06b6d4',
  default: '#6366f1',
}

// Classify region into brain area
function getRegionArea(region: BrainRegion): string {
  const name = region.name.toLowerCase()
  const abbr = region.abbreviation?.toLowerCase() || ''
  
  if (name.includes('frontal') || name.includes('prefrontal') || name.includes('motor cortex')) return 'frontal'
  if (name.includes('temporal') || name.includes('hippocampus') || name.includes('amygdala')) return 'temporal'
  if (name.includes('parietal') || name.includes('somatosensory')) return 'parietal'
  if (name.includes('occipital') || name.includes('visual')) return 'occipital'
  if (name.includes('cerebell') || name.includes('vermis') || abbr.includes('cb')) return 'cerebellum'
  if (name.includes('pons') || name.includes('medulla') || name.includes('midbrain') || name.includes('brainstem')) return 'brainstem'
  if (name.includes('thalam') || name.includes('hypothalam') || name.includes('ganglia') || name.includes('striatum') || name.includes('putamen') || name.includes('caudate')) return 'subcortical'
  
  return 'default'
}

// Placeholder component - 3D view coming soon
export default function Brain3DVisualization({
  regions,
  selectedRegion,
  onRegionClick,
  className
}: {
  regions: BrainRegion[]
  selectedRegion: BrainRegion | null
  onRegionClick: (region: BrainRegion) => void
  className?: string
}) {
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null)
  
  // Group regions by area
  const regionsByArea = regions.reduce((acc, region) => {
    const area = getRegionArea(region)
    if (!acc[area]) acc[area] = []
    acc[area].push(region)
    return acc
  }, {} as Record<string, BrainRegion[]>)
  
  return (
    <div 
      className={`relative w-full h-full min-h-[300px] bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-xl overflow-hidden ${className || ''}`}
    >
      {/* Placeholder message */}
      <div className="absolute inset-0 flex flex-col items-center justify-center p-6">
        <div className="text-center mb-6">
          <div className="text-6xl mb-4">🧠</div>
          <h3 className="text-xl font-semibold text-white mb-2">3D Brain Visualization</h3>
          <p className="text-slate-400 text-sm">Coming soon - Interactive 3D brain model</p>
        </div>
        
        {/* Region count by area */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          {Object.entries(regionsByArea).slice(0, 8).map(([area, areaRegions]) => (
            <div 
              key={area}
              className="bg-slate-800/50 rounded-lg p-3 text-center border border-slate-700/50"
            >
              <div 
                className="w-3 h-3 rounded-full mx-auto mb-2"
                style={{ backgroundColor: AREA_COLORS[area] || AREA_COLORS.default }}
              />
              <div className="text-white text-lg font-semibold">{areaRegions.length}</div>
              <div className="text-slate-400 text-xs capitalize">{area}</div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Legend */}
      <div className="absolute top-3 right-3 z-20 bg-slate-900/80 backdrop-blur-sm rounded-lg p-2">
        {Object.entries(AREA_COLORS).slice(0, 7).map(([area, color]) => (
          <div key={area} className="flex items-center gap-2 text-xs text-slate-300 py-0.5">
            <div 
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: color, boxShadow: `0 0 4px ${color}` }}
            />
            <span className="capitalize">{area}</span>
          </div>
        ))}
      </div>
      
      {/* Selected region indicator */}
      {selectedRegion && (
        <div className="absolute bottom-3 left-3 right-3 flex justify-center z-20">
          <div 
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/90 backdrop-blur-sm border"
            style={{ borderColor: AREA_COLORS[getRegionArea(selectedRegion)] }}
          >
            <div 
              className="w-2.5 h-2.5 rounded-full animate-pulse"
              style={{ backgroundColor: AREA_COLORS[getRegionArea(selectedRegion)] }}
            />
            <span className="text-xs font-medium text-white">
              {selectedRegion.abbreviation || selectedRegion.name.slice(0, 20)}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
