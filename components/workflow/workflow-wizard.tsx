'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useTheme } from 'next-themes'
import { Sparkles, Wand2, X, Loader2, ArrowRight, Brain, Database, Scale, BarChart3 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface WizardSuggestion {
  id: string
  name: string
  description: string
  nodes: Array<{
    type: string
    label: string
    payload: Record<string, unknown>
  }>
  connections: Array<{
    from: number
    to: number
  }>
  category: 'research' | 'clinical' | 'comparison' | 'analysis'
}

// Pre-built workflow suggestions based on common use cases
const WORKFLOW_SUGGESTIONS: WizardSuggestion[] = [
  {
    id: 'commercial-brain-response',
    name: 'Commercial Brain Response Analysis',
    description: 'Analyze how 100+ subjects respond to visual content (commercials, ads) across brain regions',
    category: 'research',
    nodes: [
      { type: 'dataNode', label: 'fMRI Dataset', payload: { label: 'Subject fMRI Scans', subType: 'bids' } },
      { type: 'dataNode', label: 'Stimulus Video', payload: { label: 'Commercial Video', subType: 'file' } },
      { type: 'brainRegionNode', label: 'Visual Cortex', payload: { label: 'Visual Cortex', regionId: 'v1', abbreviation: 'V1' } },
      { type: 'brainRegionNode', label: 'Amygdala', payload: { label: 'Amygdala', regionId: 'amygdala', abbreviation: 'AMY' } },
      { type: 'analysisNode', label: 'Activation Analysis', payload: { label: 'Activation Mapping', category: 'analysis' } },
      { type: 'brainNode', label: 'Interpretation', payload: { label: 'AI Interpreter' } },
      { type: 'outputNode', label: 'Report', payload: { label: 'Response Report', category: 'output_sink' } },
    ],
    connections: [
      { from: 0, to: 4 }, // fMRI -> Activation
      { from: 1, to: 4 }, // Video -> Activation
      { from: 2, to: 4 }, // V1 -> Activation
      { from: 3, to: 4 }, // Amygdala -> Activation
      { from: 4, to: 5 }, // Activation -> AI
      { from: 5, to: 6 }, // AI -> Report
    ],
  },
  {
    id: 'tbi-deviation-analysis',
    name: 'TBI Patient Deviation Report',
    description: 'Compare TBI patient brain scan against healthy controls (HCP 1200) and generate deviation report',
    category: 'clinical',
    nodes: [
      { type: 'dataNode', label: 'Patient DTI', payload: { label: 'Patient DTI Scan', subType: 'file' } },
      { type: 'referenceDatasetNode', label: 'HCP 1200', payload: { label: 'HCP 1200 Reference', source: 'hcp', subjectCount: 1200 } },
      { type: 'comparisonAgentNode', label: 'Deviation Detector', payload: { label: 'Deviation Detector', comparisonType: 'deviation', threshold: 2 } },
      { type: 'brainNode', label: 'TBI Analyst', payload: { label: 'TBI Analyst' } },
      { type: 'outputNode', label: '3D Report', payload: { label: '3D Deviation Report', category: 'output_sink' } },
    ],
    connections: [
      { from: 0, to: 2 }, // Patient -> Deviation
      { from: 1, to: 2 }, // HCP -> Deviation
      { from: 2, to: 3 }, // Deviation -> TBI Analyst
      { from: 3, to: 4 }, // TBI -> Report
    ],
  },
  {
    id: 'alzheimers-screening',
    name: 'Alzheimer\'s Early Screening',
    description: 'Screen for early Alzheimer\'s markers by analyzing hippocampal volume against age-matched controls',
    category: 'clinical',
    nodes: [
      { type: 'dataNode', label: 'Patient MRI', payload: { label: 'Patient T1w MRI', subType: 'file' } },
      { type: 'brainRegionNode', label: 'Hippocampus', payload: { label: 'Hippocampus', regionId: 'hippocampus', abbreviation: 'HIP' } },
      { type: 'referenceDatasetNode', label: 'HCP 1200', payload: { label: 'HCP Age-Matched', source: 'hcp', subjectCount: 1200 } },
      { type: 'comparisonAgentNode', label: 'Z-Score', payload: { label: 'Volume Z-Score', comparisonType: 'zscore' } },
      { type: 'brainNode', label: 'Risk Assessor', payload: { label: 'Cognitive Risk Assessor' } },
      { type: 'outputNode', label: 'Risk Report', payload: { label: 'Alzheimer\'s Risk Report', category: 'output_sink' } },
    ],
    connections: [
      { from: 0, to: 3 }, // MRI -> Z-Score
      { from: 1, to: 3 }, // Hippocampus -> Z-Score
      { from: 2, to: 3 }, // HCP -> Z-Score
      { from: 3, to: 4 }, // Z-Score -> Risk
      { from: 4, to: 5 }, // Risk -> Report
    ],
  },
  {
    id: 'adhd-phenotype-match',
    name: 'ADHD Phenotype Matching',
    description: 'Compare patient connectivity to UCLA ADHD phenotype database for differential diagnosis',
    category: 'comparison',
    nodes: [
      { type: 'dataNode', label: 'Patient fMRI', payload: { label: 'Patient Resting-State fMRI', subType: 'file' } },
      { type: 'referenceDatasetNode', label: 'UCLA ADHD', payload: { label: 'UCLA Consortium', source: 'ucla', subjectCount: 272 } },
      { type: 'analysisNode', label: 'Connectivity', payload: { label: 'Connectivity Matrix', category: 'analysis' } },
      { type: 'comparisonAgentNode', label: 'Phenotype Correlator', payload: { label: 'Phenotype Correlator', comparisonType: 'correlation' } },
      { type: 'brainNode', label: 'Diagnostic AI', payload: { label: 'Differential Diagnosis AI' } },
      { type: 'outputNode', label: 'Diagnosis Report', payload: { label: 'Phenotype Match Report', category: 'output_sink' } },
    ],
    connections: [
      { from: 0, to: 2 }, // fMRI -> Connectivity
      { from: 2, to: 3 }, // Connectivity -> Correlator
      { from: 1, to: 3 }, // UCLA -> Correlator
      { from: 3, to: 4 }, // Correlator -> Diagnostic
      { from: 4, to: 5 }, // Diagnostic -> Report
    ],
  },
  {
    id: 'gene-expression-mapping',
    name: 'Gene Expression Brain Mapping',
    description: 'Map gene expression patterns using Allen Brain Atlas to identify drug targets',
    category: 'research',
    nodes: [
      { type: 'referenceDatasetNode', label: 'Allen Atlas', payload: { label: 'Allen Brain Atlas', source: 'allen', modality: 'Gene Expression' } },
      { type: 'brainRegionNode', label: 'Target Region', payload: { label: 'Select Region...', regionId: null } },
      { type: 'brainNode', label: 'Gene Analyzer', payload: { label: 'Gene Expression Analyzer' } },
      { type: 'outputNode', label: 'Expression Map', payload: { label: 'Gene Expression Report', category: 'output_sink' } },
    ],
    connections: [
      { from: 0, to: 2 }, // Allen -> Analyzer
      { from: 1, to: 2 }, // Region -> Analyzer
      { from: 2, to: 3 }, // Analyzer -> Report
    ],
  },
  {
    id: 'sleep-eeg-analysis',
    name: 'Sleep Stage Analysis',
    description: 'Automatic sleep staging from overnight EEG with YASA ML model',
    category: 'analysis',
    nodes: [
      { type: 'dataNode', label: 'EEG Recording', payload: { label: 'Overnight EEG (.edf)', subType: 'file' } },
      { type: 'preprocessingNode', label: 'Bandpass', payload: { label: 'Bandpass Filter (0.5-35 Hz)', category: 'preprocessing' } },
      { type: 'preprocessingNode', label: 'Artifact Removal', payload: { label: 'ICA Artifact Removal', category: 'preprocessing' } },
      { type: 'mlNode', label: 'YASA Sleep', payload: { label: 'Sleep Staging (YASA)', category: 'ml_inference' } },
      { type: 'brainNode', label: 'Sleep Interpreter', payload: { label: 'Sleep Quality Analyzer' } },
      { type: 'outputNode', label: 'Sleep Report', payload: { label: 'Sleep Architecture Report', category: 'output_sink' } },
    ],
    connections: [
      { from: 0, to: 1 }, // EEG -> Bandpass
      { from: 1, to: 2 }, // Bandpass -> ICA
      { from: 2, to: 3 }, // ICA -> YASA
      { from: 3, to: 4 }, // YASA -> Interpreter
      { from: 4, to: 5 }, // Interpreter -> Report
    ],
  },
  {
    id: 'complex-brain-analysis',
    name: 'Complex Brain Analysis',
    description: 'A sophisticated workflow for in-depth brain analysis, combining multiple data sources and advanced techniques.',
    category: 'research',
    nodes: [
      { type: 'dataNode', label: 'fMRI Data', payload: { label: 'fMRI Scans', subType: 'bids' } },
      { type: 'dataNode', label: 'EEG Data', payload: { label: 'EEG Recordings', subType: 'file' } },
      { type: 'brainRegionNode', label: 'Prefrontal Cortex', payload: { label: 'Prefrontal Cortex', regionId: 'pfc', abbreviation: 'PFC' } },
      { type: 'preprocessingNode', label: 'fMRI Preprocessing', payload: { label: 'fMRI Preprocessing', category: 'preprocessing' } },
      { type: 'preprocessingNode', label: 'EEG Preprocessing', payload: { label: 'EEG Preprocessing', category: 'preprocessing' } },
      { type: 'analysisNode', label: 'fMRI Analysis', payload: { label: 'fMRI GLM Analysis', category: 'analysis' } },
      { type: 'analysisNode', label: 'EEG Analysis', payload: { label: 'EEG Source Localization', category: 'analysis' } },
      { type: 'brainNode', label: 'Multimodal Integration', payload: { label: 'AI Multimodal Integration' } },
      { type: 'outputNode', label: 'Integrated Report', payload: { label: 'Integrated Brain Report', category: 'output_sink' } },
    ],
    connections: [
      { from: 0, to: 3 }, // fMRI Data -> fMRI Preprocessing
      { from: 1, to: 4 }, // EEG Data -> EEG Preprocessing
      { from: 3, to: 5 }, // fMRI Preprocessing -> fMRI Analysis
      { from: 4, to: 6 }, // EEG Preprocessing -> EEG Analysis
      { from: 2, to: 7 }, // Prefrontal Cortex -> Multimodal Integration
      { from: 5, to: 7 }, // fMRI Analysis -> Multimodal Integration
      { from: 6, to: 7 }, // EEG Analysis -> Multimodal Integration
      { from: 7, to: 8 }, // Multimodal Integration -> Integrated Report
    ],
  },
]

interface WorkflowWizardProps {
  onSelectWorkflow: (suggestion: WizardSuggestion) => void
  onClose: () => void
}

export default function WorkflowWizard({ onSelectWorkflow, onClose }: WorkflowWizardProps) {
  const [query, setQuery] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [suggestions, setSuggestions] = useState<WizardSuggestion[]>(WORKFLOW_SUGGESTIONS)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'
  
  // Rotating placeholder state
  const [placeholderExamples, setPlaceholderExamples] = useState<string[]>([
    'Analyze brain response to commercials across 100 subjects...',
    'Study hippocampus activity during memory tasks...',
    'Compare EEG patterns in meditation vs rest...',
  ])
  const [currentPlaceholderIndex, setCurrentPlaceholderIndex] = useState(0)
  const [displayedPlaceholder, setDisplayedPlaceholder] = useState('')
  const [isTyping, setIsTyping] = useState(true)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  // Fetch trending examples on mount
  useEffect(() => {
    const fetchExamples = async () => {
      try {
        const response = await fetch('/api/trends')
        if (response.ok) {
          const data = await response.json()
          if (data.examples && data.examples.length > 0) {
            setPlaceholderExamples(data.examples)
          }
        }
      } catch (error) {
        // Use defaults if fetch fails
        console.log('Using default placeholder examples')
      }
    }
    fetchExamples()
  }, [])
  
  // Typewriter effect for placeholder
  useEffect(() => {
    if (query) return // Don't animate when user is typing
    
    const currentExample = placeholderExamples[currentPlaceholderIndex] + '...'
    
    if (isTyping) {
      // Type out the placeholder
      if (displayedPlaceholder.length < currentExample.length) {
        typingTimeoutRef.current = setTimeout(() => {
          setDisplayedPlaceholder(currentExample.slice(0, displayedPlaceholder.length + 1))
        }, 50)
      } else {
        // Pause before erasing
        typingTimeoutRef.current = setTimeout(() => {
          setIsTyping(false)
        }, 2500)
      }
    } else {
      // Erase the placeholder
      if (displayedPlaceholder.length > 0) {
        typingTimeoutRef.current = setTimeout(() => {
          setDisplayedPlaceholder(displayedPlaceholder.slice(0, -1))
        }, 30)
      } else {
        // Move to next example
        setCurrentPlaceholderIndex((prev) => (prev + 1) % placeholderExamples.length)
        setIsTyping(true)
      }
    }
    
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
    }
  }, [displayedPlaceholder, isTyping, currentPlaceholderIndex, placeholderExamples, query])

  // Filter suggestions based on query and category
  const filteredSuggestions = suggestions.filter(s => {
    const matchesQuery = query === '' || 
      s.name.toLowerCase().includes(query.toLowerCase()) ||
      s.description.toLowerCase().includes(query.toLowerCase())
    const matchesCategory = !selectedCategory || s.category === selectedCategory
    return matchesQuery && matchesCategory
  })

  // AI-powered workflow generation
  const handleGenerateWorkflow = useCallback(async (queryOverride?: string) => {
    const searchQuery = queryOverride || query
    if (!searchQuery.trim()) return
    
    setIsGenerating(true)
    try {
      // Call the workflow API with a special "generate" mode
      const response = await fetch('/api/workflows/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery }),
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.suggestion) {
          // Auto-apply the generated workflow immediately
          onSelectWorkflow(data.suggestion)
        }
      }
    } catch (error) {
      console.error('Failed to generate workflow:', error)
    } finally {
      setIsGenerating(false)
    }
  }, [query, onSelectWorkflow])

  const categoryIcons: Record<string, React.ReactNode> = {
    research: <Brain className="w-4 h-4" />,
    clinical: <Database className="w-4 h-4" />,
    comparison: <Scale className="w-4 h-4" />,
    analysis: <BarChart3 className="w-4 h-4" />,
  }

  const categoryColors: Record<string, string> = isDark ? {
    research: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    clinical: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    comparison: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
    analysis: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  } : {
    research: 'bg-purple-100 text-purple-700 border-purple-300',
    clinical: 'bg-emerald-100 text-emerald-700 border-emerald-300',
    comparison: 'bg-rose-100 text-rose-700 border-rose-300',
    analysis: 'bg-cyan-100 text-cyan-700 border-cyan-300',
  }

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        // Close modal when clicking the backdrop (not the modal content)
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <div className={cn(
        'rounded-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden shadow-2xl border',
        isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'
      )}>
        {/* Header */}
        <div className={cn(
          'p-6 border-b',
          isDark ? 'border-slate-800' : 'border-slate-200'
        )}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl">
                <Wand2 className="w-6 h-6 text-purple-500" />
              </div>
              <div>
                <h2 className={cn('text-xl font-bold', isDark ? 'text-white' : 'text-slate-800')}>
                  Workflow Wizard
                </h2>
                <p className={cn('text-sm', isDark ? 'text-slate-400' : 'text-slate-500')}>
                  Describe what you want to analyze or choose a template
                </p>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className={cn(
                'p-2 rounded-lg transition-colors',
                isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'
              )}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search / Generate Input */}
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleGenerateWorkflow()}
                placeholder={query ? '' : `e.g., ${displayedPlaceholder}`}
                className={cn(
                  'w-full px-4 py-3 rounded-xl focus:outline-none focus:border-purple-500 transition-colors border',
                  isDark 
                    ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' 
                    : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400'
                )}
              />
              <Sparkles className={cn(
                'absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5',
                isDark ? 'text-slate-500' : 'text-slate-400'
              )} />
            </div>
            <button
              onClick={() => handleGenerateWorkflow()}
              disabled={isGenerating || !query.trim()}
              className={cn(
                'px-6 py-3 rounded-xl font-medium flex items-center gap-2 transition-all whitespace-nowrap',
                query.trim() 
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-500 hover:to-pink-500' 
                  : isDark 
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              )}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4" />
                  Generate
                </>
              )}
            </button>
          </div>

          {/* Clickable Trending Examples */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className={cn(
              'text-xs flex items-center gap-1 shrink-0 py-1',
              isDark ? 'text-slate-500' : 'text-slate-400'
            )}>
              <Sparkles className="w-3 h-3" /> Try:
            </span>
            {placeholderExamples.slice(0, 5).map((example, i) => {
              // Shorten to max 35 characters for clean display
              const maxLen = 60
              const shortLabel = example.length > maxLen 
                ? example.slice(0, maxLen).trim() + '…' 
                : example
              return (
                <button
                  key={i}
                  onClick={() => {
                    setQuery(example)
                    handleGenerateWorkflow(example)
                  }}
                  title={example}
                  className={cn(
                    'px-3 py-1.5 text-xs rounded-full transition-all border',
                    isDark 
                      ? 'bg-slate-800/50 hover:bg-slate-700 text-slate-400 hover:text-white border-slate-700/50 hover:border-purple-500/50'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-800 border-slate-200 hover:border-purple-400'
                  )}
                >
                  {shortLabel}
                </button>
              )
            })}
          </div>

          {/* Category Filters */}
          <div className="flex flex-wrap items-center gap-2 mt-4">
            <button
              onClick={() => setSelectedCategory(null)}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-colors border',
                !selectedCategory 
                  ? isDark 
                    ? 'bg-slate-700 text-white border-slate-600' 
                    : 'bg-slate-700 text-white border-slate-700'
                  : isDark 
                    ? 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600'
                    : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400 hover:bg-slate-50'
              )}
            >
              All
            </button>
            {['research', 'clinical', 'comparison', 'analysis'].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-colors border flex items-center gap-1.5 capitalize',
                  selectedCategory === cat
                    ? categoryColors[cat]
                    : isDark 
                      ? 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600'
                      : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400 hover:bg-slate-50'
                )}
              >
                {categoryIcons[cat]}
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Suggestions Grid */}
        <div className={cn(
          'p-6 overflow-y-auto max-h-[calc(85vh-300px)]',
          isDark ? 'bg-slate-900/50' : 'bg-slate-50'
        )}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredSuggestions.map((suggestion) => (
              <button
                key={suggestion.id}
                onClick={() => onSelectWorkflow(suggestion)}
                className={cn(
                  'text-left p-4 rounded-xl transition-all group border',
                  isDark 
                    ? 'bg-slate-800/50 border-slate-700 hover:border-slate-600 hover:bg-slate-800'
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-md'
                )}
              >
                <div className="flex items-start justify-between mb-2">
                  <span className={cn(
                    'px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide border',
                    categoryColors[suggestion.category]
                  )}>
                    {suggestion.category}
                  </span>
                  <ArrowRight className={cn(
                    'w-4 h-4 group-hover:text-purple-500 group-hover:translate-x-1 transition-all',
                    isDark ? 'text-slate-500' : 'text-slate-400'
                  )} />
                </div>
                <h3 className={cn(
                  'text-sm font-semibold mb-1',
                  isDark ? 'text-white' : 'text-slate-800'
                )}>{suggestion.name}</h3>
                <p className={cn(
                  'text-xs line-clamp-2',
                  isDark ? 'text-slate-400' : 'text-slate-500'
                )}>{suggestion.description}</p>
                <div className="mt-3 flex items-center gap-1.5">
                  <span className={cn('text-[10px]', isDark ? 'text-slate-500' : 'text-slate-400')}>
                    {suggestion.nodes.length} nodes
                  </span>
                  <span className={isDark ? 'text-slate-600' : 'text-slate-300'}>•</span>
                  <span className={cn('text-[10px]', isDark ? 'text-slate-500' : 'text-slate-400')}>
                    {suggestion.connections.length} connections
                  </span>
                </div>
              </button>
            ))}
          </div>

          {filteredSuggestions.length === 0 && (
            <div className="text-center py-12">
              <Sparkles className={cn('w-12 h-12 mx-auto mb-4', isDark ? 'text-slate-600' : 'text-slate-400')} />
              <p className={cn('mb-2', isDark ? 'text-slate-400' : 'text-slate-600')}>No matching workflows found</p>
              <p className={cn('text-sm', isDark ? 'text-slate-500' : 'text-slate-400')}>Try generating a custom workflow with AI</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={cn(
          'p-4 border-t',
          isDark ? 'border-slate-800 bg-slate-900/80' : 'border-slate-200 bg-slate-50'
        )}>
          <p className={cn('text-xs text-center', isDark ? 'text-slate-500' : 'text-slate-400')}>
            💡 Tip: Describe your research goal in natural language and the AI will suggest the best workflow
          </p>
        </div>
      </div>
    </div>
  )
}
