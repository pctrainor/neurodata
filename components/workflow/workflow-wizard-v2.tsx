'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useTheme } from 'next-themes'
import { 
  Sparkles, Wand2, X, Loader2, ArrowRight, Brain, Database, Scale, BarChart3,
  FileText, ChefHat, BookOpen, Share2, Plane, Code2, FileCheck, Mail,
  Users, CheckCircle2, AlertCircle, Pause, Play
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Icon map for workflow suggestions
const SUGGESTION_ICONS: Record<string, React.ElementType> = {
  'homework-grader': FileText,
  'recipe-generator': ChefHat,
  'story-writer': BookOpen,
  'social-post-generator': Share2,
  'travel-planner': Plane,
  'code-reviewer': Code2,
  'resume-builder': FileCheck,
  'email-composer': Mail,
}

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

interface ParsedIntent {
  workflowType: 'parallel-agents' | 'sequential' | 'simple' | 'content-analysis'
  agentCount: number
  agentNoun: string  // Universal: any noun (scientist, chef, alien, etc.)
  agentNounPlural: string
  namingStyle: 'professional' | 'casual' | 'fantasy' | 'numbered'
  taskDescription: string
  taskVerb: string
  taskType: 'rating' | 'reaction' | 'analysis' | 'testing' | 'creation' | 'voting' | 'debate' | 'custom'
  inputType: 'test' | 'video' | 'article' | 'document' | 'data' | 'food' | 'product' | 'custom'
  outputType: 'scores' | 'reactions' | 'analysis' | 'grades' | 'selections' | 'consensus' | 'summary'
  aggregationType: 'average' | 'sentiment' | 'consensus' | 'grades' | 'best-of' | 'majority' | 'synthesis'
  demographicMix?: string[]
}

interface SkeletonNode {
  type: string
  label: string
  payload: Record<string, unknown>
}

interface WorkflowSkeleton {
  id: string
  name: string
  description: string
  category: string
  nodes: SkeletonNode[]
  connections: Array<{ from: number; to: number }>
}

interface GeneratedAgent {
  type: string
  label: string
  payload: {
    label: string
    agentNoun: string
    persona: {
      name: string
      displayName: string
      culturalBackground: string
      ageGroup: string
      age: number
      personality: string
      traits: string[]
      specialization?: string
      title?: string
    }
    behavior: string
  }
}

type WizardStep = 'input' | 'parsing' | 'generating' | 'complete' | 'error'

// Pre-built workflow suggestions
const WORKFLOW_SUGGESTIONS: WizardSuggestion[] = [
  {
    id: 'homework-grader',
    name: 'Homework Grader',
    description: 'Grade student assignments with detailed feedback and scores',
    category: 'analysis',
    nodes: [
      { type: 'dataNode', label: 'Student Work', payload: { label: 'Upload Assignment', subType: 'file' } },
      { type: 'dataNode', label: 'Rubric', payload: { label: 'Grading Rubric', subType: 'text' } },
      { type: 'brainNode', label: 'AI Grader', payload: { label: 'Homework Grader' } },
      { type: 'outputNode', label: 'Feedback', payload: { label: 'Graded Report', category: 'output_sink' } },
    ],
    connections: [
      { from: 0, to: 2 },
      { from: 1, to: 2 },
      { from: 2, to: 3 },
    ],
  },
  {
    id: 'recipe-generator',
    name: 'Recipe Generator',
    description: 'Create recipes from ingredients you have on hand',
    category: 'analysis',
    nodes: [
      { type: 'dataNode', label: 'Ingredients', payload: { label: 'Your Ingredients', subType: 'text' } },
      { type: 'dataNode', label: 'Preferences', payload: { label: 'Dietary Preferences', subType: 'text' } },
      { type: 'brainNode', label: 'Chef AI', payload: { label: 'Recipe Creator' } },
      { type: 'outputNode', label: 'Recipe', payload: { label: 'Your Recipe', category: 'output_sink' } },
    ],
    connections: [
      { from: 0, to: 2 },
      { from: 1, to: 2 },
      { from: 2, to: 3 },
    ],
  },
  {
    id: 'story-writer',
    name: 'Story Writer',
    description: 'Generate creative stories from your ideas and prompts',
    category: 'research',
    nodes: [
      { type: 'dataNode', label: 'Story Idea', payload: { label: 'Your Story Idea', subType: 'text' } },
      { type: 'dataNode', label: 'Genre & Style', payload: { label: 'Genre/Style Preferences', subType: 'text' } },
      { type: 'brainNode', label: 'Story AI', payload: { label: 'Creative Writer' } },
      { type: 'outputNode', label: 'Story', payload: { label: 'Your Story', category: 'output_sink' } },
    ],
    connections: [
      { from: 0, to: 2 },
      { from: 1, to: 2 },
      { from: 2, to: 3 },
    ],
  },
]

interface WorkflowWizardProps {
  onSelectWorkflow: (suggestion: WizardSuggestion) => void
  onClose: () => void
}

export default function WorkflowWizard({ onSelectWorkflow, onClose }: WorkflowWizardProps) {
  const [query, setQuery] = useState('')
  const [step, setStep] = useState<WizardStep>('input')
  const [parsedIntent, setParsedIntent] = useState<ParsedIntent | null>(null)
  const [skeleton, setSkeleton] = useState<WorkflowSkeleton | null>(null)
  const [generatedAgents, setGeneratedAgents] = useState<GeneratedAgent[]>([])
  const [currentBatch, setCurrentBatch] = useState(0)
  const [totalBatches, setTotalBatches] = useState(0)
  const [batchSize] = useState(25) // Generate 25 agents per batch
  const [isPaused, setIsPaused] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [suggestions] = useState<WizardSuggestion[]>(WORKFLOW_SUGGESTIONS)
  
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'
  const abortControllerRef = useRef<AbortController | null>(null)
  
  // Rotating placeholder state - showcasing universal agent types
  const [placeholderExamples] = useState<string[]>([
    '100 students taking an SAT test',
    '50 chefs rating a new recipe',
    '200 scientists solving a research problem',
    '75 teenagers reacting to a TikTok video',
    '30 lawyers reviewing a contract',
    '500 aliens evaluating Earth culture',
  ])
  const [currentPlaceholderIndex, setCurrentPlaceholderIndex] = useState(0)
  const [displayedPlaceholder, setDisplayedPlaceholder] = useState('')
  const [isTyping, setIsTyping] = useState(true)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  // Typewriter effect for placeholder
  useEffect(() => {
    if (query) return
    
    const currentExample = placeholderExamples[currentPlaceholderIndex] + '...'
    
    if (isTyping) {
      if (displayedPlaceholder.length < currentExample.length) {
        typingTimeoutRef.current = setTimeout(() => {
          setDisplayedPlaceholder(currentExample.slice(0, displayedPlaceholder.length + 1))
        }, 50)
      } else {
        typingTimeoutRef.current = setTimeout(() => {
          setIsTyping(false)
        }, 2500)
      }
    } else {
      if (displayedPlaceholder.length > 0) {
        typingTimeoutRef.current = setTimeout(() => {
          setDisplayedPlaceholder(displayedPlaceholder.slice(0, -1))
        }, 30)
      } else {
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

  // Filter suggestions
  const filteredSuggestions = suggestions.filter(s => {
    const matchesQuery = query === '' || 
      s.name.toLowerCase().includes(query.toLowerCase()) ||
      s.description.toLowerCase().includes(query.toLowerCase())
    const matchesCategory = !selectedCategory || s.category === selectedCategory
    return matchesQuery && matchesCategory
  })

  // Build final workflow from skeleton + agents
  const buildFinalWorkflow = (intent: ParsedIntent, skeleton: WorkflowSkeleton, agents: GeneratedAgent[]): WizardSuggestion => {
    const nodes: WizardSuggestion['nodes'] = []
    const connections: WizardSuggestion['connections'] = []
    
    let inputNodeIndex = -1
    let aggregatorNodeIndex = -1
    let outputNodeIndex = -1
    
    // Add skeleton nodes (except agent placeholder)
    for (const skeletonNode of skeleton.nodes) {
      if (skeletonNode.type === '_agentPlaceholder') {
        continue // Skip placeholder, we'll add real agents
      }
      
      const nodeIndex = nodes.length
      nodes.push({
        type: skeletonNode.type,
        label: skeletonNode.label,
        payload: skeletonNode.payload,
      })
      
      // Track special nodes
      if (skeletonNode.type === 'dataNode' || skeletonNode.type === 'contentUrlInputNode') {
        inputNodeIndex = nodeIndex
      } else if (skeletonNode.type === 'analysisNode') {
        aggregatorNodeIndex = nodeIndex
      } else if (skeletonNode.type === 'outputNode') {
        outputNodeIndex = nodeIndex
      }
    }
    
    // Add agent nodes from the generated agents
    const agentStartIndex = nodes.length
    for (const agent of agents) {
      nodes.push({
        type: agent.type,
        label: agent.label,
        payload: {
          label: agent.label,
          agentNoun: agent.payload.agentNoun,
          personaName: agent.payload.persona.displayName,
          personaAge: agent.payload.persona.age,
          personaTraits: agent.payload.persona.traits,
          personaBackground: agent.payload.persona.culturalBackground,
          personaPersonality: agent.payload.persona.personality,
          behavior: agent.payload.behavior,
          ...(agent.payload.persona.specialization && { specialization: agent.payload.persona.specialization }),
          ...(agent.payload.persona.title && { title: agent.payload.persona.title }),
        },
      })
    }
    
    // Wire connections: Input -> All Agents
    if (inputNodeIndex >= 0) {
      for (let i = 0; i < agents.length; i++) {
        connections.push({ from: inputNodeIndex, to: agentStartIndex + i })
      }
    }
    
    // Wire connections: All Agents -> Aggregator
    if (aggregatorNodeIndex >= 0) {
      for (let i = 0; i < agents.length; i++) {
        connections.push({ from: agentStartIndex + i, to: aggregatorNodeIndex })
      }
    }
    
    // Wire connections: Aggregator -> Output
    if (aggregatorNodeIndex >= 0 && outputNodeIndex >= 0) {
      connections.push({ from: aggregatorNodeIndex, to: outputNodeIndex })
    }
    
    return {
      id: skeleton.id,
      name: skeleton.name,
      description: skeleton.description,
      category: 'analysis',
      nodes,
      connections,
    }
  }

  // Fallback for simple workflows (no batch generation needed)
  const generateSimpleWorkflow = useCallback(async (userQuery: string) => {
    try {
      const response = await fetch('/api/workflows/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: userQuery }),
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.suggestion) {
          setStep('complete')
          onSelectWorkflow(data.suggestion)
        }
      }
    } catch (err) {
      console.error('Failed to generate workflow:', err)
      setError('Failed to generate workflow')
      setStep('error')
    }
  }, [onSelectWorkflow])

  // Handle generate button
  const handleGenerateWorkflow = async (queryOverride?: string) => {
    const searchQuery = queryOverride || query
    if (!searchQuery.trim()) return
    
    // UNIVERSAL PATTERN: Check if this looks like a multi-agent request
    // Pattern: [NUMBER] [ANY NOUN] [DOING SOMETHING]
    // Examples: "1000 scientists solving", "500 chefs rating", "50 aliens watching"
    const hasNumber = /\d+/.test(searchQuery) || /\b(hundred|thousand|million|dozen)\b/i.test(searchQuery)
    
    // Universal noun detection - any word(s) after a number, no hardcoded keywords
    const multiAgentPattern = /(?:\d+|hundred|thousand|million|dozen)\s+(\w+)/i
    const hasAgentNoun = multiAgentPattern.test(searchQuery)
    
    console.log('[Wizard] Analyzing query:', { searchQuery, hasNumber, hasAgentNoun })
    
    if (hasNumber && hasAgentNoun) {
      // Use new multi-step wizard with batch generation
      console.log('[Wizard] Using universal batch generation for multi-agent request')
      setStep('parsing')
      setError(null)
      
      try {
        const response = await fetch('/api/workflows/generate/parse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: searchQuery }),
        })
        
        if (!response.ok) {
          throw new Error('Failed to parse intent')
        }
        
        const data = await response.json()
        console.log('[Wizard] Parsed intent:', data.intent)
        setParsedIntent(data.intent)
        setSkeleton(data.skeleton)
        setTotalBatches(data.estimatedBatches)
        
        if (data.needsBatchGeneration && data.intent.agentCount > 1) {
          // Start batch generation
          console.log('[Wizard] Starting batch generation for', data.intent.agentCount, data.intent.agentNounPlural)
          setStep('generating')
          
          const totalAgents = data.intent.agentCount
          const batches = Math.ceil(totalAgents / batchSize)
          
          abortControllerRef.current = new AbortController()
          const allAgents: GeneratedAgent[] = []
          
          // Use 0-indexed batches for API (display is 1-indexed)
          for (let batch = 0; batch < batches; batch++) {
            if (abortControllerRef.current?.signal.aborted) {
              break
            }
            
            // Wait if paused
            while (isPaused && !abortControllerRef.current?.signal.aborted) {
              await new Promise(resolve => setTimeout(resolve, 100))
            }
            
            setCurrentBatch(batch + 1) // Display as 1-indexed
            console.log(`[Wizard] Generating batch ${batch + 1}/${batches}`)
            
            try {
              const batchResponse = await fetch('/api/workflows/generate/batch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  batchNumber: batch, // 0-indexed for API
                  batchSize: Math.min(batchSize, totalAgents - allAgents.length),
                  totalCount: totalAgents,
                  agentNoun: data.intent.agentNoun,
                  agentNounPlural: data.intent.agentNounPlural,
                  namingStyle: data.intent.namingStyle,
                  taskType: data.intent.taskType,
                  taskVerb: data.intent.taskVerb,
                  taskContext: data.intent.taskDescription,
                  demographicMix: data.intent.demographicMix,
                }),
                signal: abortControllerRef.current?.signal,
              })
              
              if (!batchResponse.ok) {
                throw new Error(`Batch ${batch + 1} failed`)
              }
              
              const batchData = await batchResponse.json()
              allAgents.push(...batchData.agents)
              setGeneratedAgents([...allAgents])
              
            } catch (err) {
              if (err instanceof Error && err.name === 'AbortError') {
                console.log('[Wizard] Generation cancelled')
                break
              }
              throw err
            }
          }
          
          // Build final workflow with all agents
          if (allAgents.length > 0) {
            console.log('[Wizard] Building final workflow with', allAgents.length, data.intent.agentNounPlural)
            const finalWorkflow = buildFinalWorkflow(data.intent, data.skeleton, allAgents)
            setStep('complete')
            
            // Auto-apply after a brief pause
            setTimeout(() => {
              onSelectWorkflow(finalWorkflow)
            }, 500)
          }
        } else {
          // Simple workflow, use old method
          await generateSimpleWorkflow(searchQuery)
        }
      } catch (err) {
        console.error('[Wizard] Parse error:', err)
        setError(err instanceof Error ? err.message : 'Failed to parse request')
        setStep('error')
      }
    } else {
      // Use old single-step generation
      setStep('parsing')
      await generateSimpleWorkflow(searchQuery)
    }
  }

  // Cancel generation
  const handleCancel = () => {
    abortControllerRef.current?.abort()
    setStep('input')
    setGeneratedAgents([])
    setCurrentBatch(0)
    setParsedIntent(null)
    setSkeleton(null)
    setError(null)
  }

  // Toggle pause
  const togglePause = () => {
    setIsPaused(prev => !prev)
  }

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

  // Render generation progress
  const renderGenerationProgress = () => {
    const progress = totalBatches > 0 ? (currentBatch / totalBatches) * 100 : 0
    const agentLabel = parsedIntent?.agentNounPlural || 'agents'
    
    return (
      <div className="p-8 space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className={cn(
              'p-3 rounded-xl',
              isDark ? 'bg-purple-500/20' : 'bg-purple-100'
            )}>
              <Users className="w-8 h-8 text-purple-500" />
            </div>
            <div className="text-left">
              <h3 className={cn('text-lg font-semibold', isDark ? 'text-white' : 'text-slate-800')}>
                Generating {parsedIntent?.agentCount} {agentLabel}
              </h3>
              <p className={cn('text-sm', isDark ? 'text-slate-400' : 'text-slate-500')}>
                Batch {currentBatch} of {totalBatches} • {parsedIntent?.namingStyle} naming style
              </p>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-2">
          <div className={cn(
            'w-full h-3 rounded-full overflow-hidden',
            isDark ? 'bg-slate-700' : 'bg-slate-200'
          )}>
            <div 
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between text-sm">
            <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>
              {generatedAgents.length} agents created
            </span>
            <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>
              {Math.round(progress)}%
            </span>
          </div>
        </div>

        {/* Recent agents preview */}
        <div className={cn(
          'rounded-xl p-4 border',
          isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'
        )}>
          <h4 className={cn('text-sm font-medium mb-3', isDark ? 'text-slate-300' : 'text-slate-700')}>
            Recently Generated
          </h4>
          <div className="flex flex-wrap gap-2">
            {generatedAgents.slice(-10).map((agent, i) => (
              <span 
                key={i}
                className={cn(
                  'px-2 py-1 rounded-lg text-xs',
                  isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'
                )}
              >
                {agent.payload.persona.displayName}, {agent.payload.persona.age}
              </span>
            ))}
            {generatedAgents.length > 10 && (
              <span className={cn(
                'px-2 py-1 rounded-lg text-xs',
                isDark ? 'bg-slate-600 text-slate-400' : 'bg-slate-200 text-slate-500'
              )}>
                +{generatedAgents.length - 10} more
              </span>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="flex justify-center gap-3">
          <button
            onClick={togglePause}
            className={cn(
              'px-4 py-2 rounded-lg flex items-center gap-2 transition-colors',
              isDark ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            )}
          >
            {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            {isPaused ? 'Resume' : 'Pause'}
          </button>
          <button
            onClick={handleCancel}
            className={cn(
              'px-4 py-2 rounded-lg flex items-center gap-2 transition-colors',
              'bg-red-500/10 hover:bg-red-500/20 text-red-500'
            )}
          >
            <X className="w-4 h-4" />
            Cancel
          </button>
        </div>
      </div>
    )
  }

  // Render completion state
  const renderComplete = () => {
    const agentLabel = parsedIntent?.agentNounPlural || 'agents'
    return (
      <div className="p-8 text-center">
        <div className={cn(
          'inline-flex p-4 rounded-full mb-4',
          isDark ? 'bg-green-500/20' : 'bg-green-100'
        )}>
          <CheckCircle2 className="w-12 h-12 text-green-500" />
        </div>
        <h3 className={cn('text-xl font-semibold mb-2', isDark ? 'text-white' : 'text-slate-800')}>
          Workflow Created!
        </h3>
        <p className={cn('text-sm', isDark ? 'text-slate-400' : 'text-slate-500')}>
          Generated {generatedAgents.length} {agentLabel} successfully
        </p>
      </div>
    )
  }

  // Render error state
  const renderError = () => (
    <div className="p-8 text-center">
      <div className={cn(
        'inline-flex p-4 rounded-full mb-4',
        isDark ? 'bg-red-500/20' : 'bg-red-100'
      )}>
        <AlertCircle className="w-12 h-12 text-red-500" />
      </div>
      <h3 className={cn('text-xl font-semibold mb-2', isDark ? 'text-white' : 'text-slate-800')}>
        Generation Failed
      </h3>
      <p className={cn('text-sm mb-4', isDark ? 'text-slate-400' : 'text-slate-500')}>
        {error}
      </p>
      <button
        onClick={() => setStep('input')}
        className="px-4 py-2 rounded-lg bg-purple-500 text-white hover:bg-purple-600 transition-colors"
      >
        Try Again
      </button>
    </div>
  )

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && step === 'input') {
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
                  {step === 'input' && 'Describe your analysis or pick a template'}
                  {step === 'parsing' && 'Understanding your request...'}
                  {step === 'generating' && 'Creating your workflow...'}
                  {step === 'complete' && 'Workflow ready!'}
                  {step === 'error' && 'Something went wrong'}
                </p>
              </div>
            </div>
            <button 
              onClick={step === 'input' ? onClose : handleCancel}
              title="Close"
              className={cn(
                'p-2 rounded-lg transition-colors',
                isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'
              )}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Only show search input in 'input' step */}
          {step === 'input' && (
            <>
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
                  disabled={!query.trim()}
                  className={cn(
                    'px-6 py-3 rounded-xl font-medium flex items-center gap-2 transition-all whitespace-nowrap',
                    query.trim() 
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-500 hover:to-pink-500' 
                      : isDark 
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  )}
                >
                  <Wand2 className="w-4 h-4" />
                  Generate
                </button>
              </div>

              {/* Clickable Examples */}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {placeholderExamples.map((example, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setQuery(example)
                      handleGenerateWorkflow(example)
                    }}
                    className={cn(
                      'px-3 py-1.5 text-xs rounded-full transition-all border',
                      isDark 
                        ? 'bg-slate-800/50 hover:bg-slate-700 text-slate-400 hover:text-white border-slate-700/50 hover:border-purple-500/50'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-800 border-slate-200 hover:border-purple-400'
                    )}
                  >
                    {example}
                  </button>
                ))}
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
            </>
          )}
        </div>

        {/* Main Content */}
        {step === 'input' && (
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
                    'text-sm font-semibold mb-1 flex items-center gap-2',
                    isDark ? 'text-white' : 'text-slate-800'
                  )}>
                    {SUGGESTION_ICONS[suggestion.id] && (() => {
                      const IconComponent = SUGGESTION_ICONS[suggestion.id]
                      return <IconComponent className="w-4 h-4 text-purple-500" />
                    })()}
                    {suggestion.name}
                  </h3>
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
        )}

        {step === 'parsing' && (
          <div className="p-8 text-center">
            <Loader2 className="w-12 h-12 mx-auto mb-4 text-purple-500 animate-spin" />
            <p className={isDark ? 'text-slate-400' : 'text-slate-500'}>
              Analyzing your request...
            </p>
          </div>
        )}

        {step === 'generating' && renderGenerationProgress()}
        {step === 'complete' && renderComplete()}
        {step === 'error' && renderError()}

        {/* Footer */}
        {step === 'input' && (
          <div className={cn(
            'p-4 border-t',
            isDark ? 'border-slate-800 bg-slate-900/80' : 'border-slate-200 bg-slate-50'
          )}>
            <p className={cn('text-xs text-center', isDark ? 'text-slate-500' : 'text-slate-400')}>
              Tip: Use any agent type! Try &quot;500 chefs rating a recipe&quot; or &quot;100 aliens judging Earth music&quot;
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
