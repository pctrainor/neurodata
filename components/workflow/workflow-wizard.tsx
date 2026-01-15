'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useTheme } from 'next-themes'
import { 
  Sparkles, Wand2, X, Loader2, ArrowRight, Brain, Database, Scale, BarChart3,
  FileText, ChefHat, BookOpen, Share2, Plane, Code2, FileCheck, Mail
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

// Pre-built workflow suggestions - fun, general-purpose examples for everyone!
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
      { from: 0, to: 2 }, // Student Work -> AI Grader
      { from: 1, to: 2 }, // Rubric -> AI Grader
      { from: 2, to: 3 }, // AI Grader -> Feedback
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
      { from: 0, to: 2 }, // Ingredients -> Chef AI
      { from: 1, to: 2 }, // Preferences -> Chef AI
      { from: 2, to: 3 }, // Chef AI -> Recipe
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
      { from: 0, to: 2 }, // Story Idea -> Story AI
      { from: 1, to: 2 }, // Genre -> Story AI
      { from: 2, to: 3 }, // Story AI -> Story
    ],
  },
  {
    id: 'social-post-generator',
    name: 'Social Media Post Creator',
    description: 'Create engaging posts for any social platform',
    category: 'research',
    nodes: [
      { type: 'dataNode', label: 'Topic', payload: { label: 'Post Topic/Idea', subType: 'text' } },
      { type: 'dataNode', label: 'Platform', payload: { label: 'Target Platform', subType: 'text' } },
      { type: 'brainNode', label: 'Content AI', payload: { label: 'Social Media Expert' } },
      { type: 'outputNode', label: 'Post', payload: { label: 'Ready-to-Post Content', category: 'output_sink' } },
    ],
    connections: [
      { from: 0, to: 2 }, // Topic -> Content AI
      { from: 1, to: 2 }, // Platform -> Content AI
      { from: 2, to: 3 }, // Content AI -> Post
    ],
  },
  {
    id: 'travel-planner',
    name: 'Travel Itinerary Planner',
    description: 'Plan your perfect trip with AI-generated itineraries',
    category: 'comparison',
    nodes: [
      { type: 'dataNode', label: 'Destination', payload: { label: 'Where to?', subType: 'text' } },
      { type: 'dataNode', label: 'Dates & Budget', payload: { label: 'Trip Details', subType: 'text' } },
      { type: 'dataNode', label: 'Interests', payload: { label: 'Your Interests', subType: 'text' } },
      { type: 'brainNode', label: 'Travel AI', payload: { label: 'Travel Planner' } },
      { type: 'outputNode', label: 'Itinerary', payload: { label: 'Your Trip Plan', category: 'output_sink' } },
    ],
    connections: [
      { from: 0, to: 3 }, // Destination -> Travel AI
      { from: 1, to: 3 }, // Dates -> Travel AI
      { from: 2, to: 3 }, // Interests -> Travel AI
      { from: 3, to: 4 }, // Travel AI -> Itinerary
    ],
  },
  {
    id: 'code-reviewer',
    name: 'Code Review Assistant',
    description: 'Get detailed code reviews with improvement suggestions',
    category: 'analysis',
    nodes: [
      { type: 'dataNode', label: 'Your Code', payload: { label: 'Code to Review', subType: 'file' } },
      { type: 'dataNode', label: 'Language', payload: { label: 'Programming Language', subType: 'text' } },
      { type: 'brainNode', label: 'Code AI', payload: { label: 'Code Reviewer' } },
      { type: 'outputNode', label: 'Review', payload: { label: 'Code Review Report', category: 'output_sink' } },
    ],
    connections: [
      { from: 0, to: 2 }, // Code -> Code AI
      { from: 1, to: 2 }, // Language -> Code AI
      { from: 2, to: 3 }, // Code AI -> Review
    ],
  },
  {
    id: 'resume-builder',
    name: 'Resume Enhancer',
    description: 'Polish and improve your resume for job applications',
    category: 'clinical',
    nodes: [
      { type: 'dataNode', label: 'Current Resume', payload: { label: 'Your Resume', subType: 'file' } },
      { type: 'dataNode', label: 'Target Job', payload: { label: 'Job Description', subType: 'text' } },
      { type: 'brainNode', label: 'Career AI', payload: { label: 'Resume Expert' } },
      { type: 'outputNode', label: 'Enhanced Resume', payload: { label: 'Improved Resume', category: 'output_sink' } },
    ],
    connections: [
      { from: 0, to: 2 }, // Resume -> Career AI
      { from: 1, to: 2 }, // Job -> Career AI
      { from: 2, to: 3 }, // Career AI -> Enhanced Resume
    ],
  },
  {
    id: 'email-composer',
    name: 'Email Composer',
    description: 'Write professional or personal emails effortlessly',
    category: 'clinical',
    nodes: [
      { type: 'dataNode', label: 'Context', payload: { label: 'Email Context', subType: 'text' } },
      { type: 'dataNode', label: 'Tone', payload: { label: 'Desired Tone', subType: 'text' } },
      { type: 'brainNode', label: 'Email AI', payload: { label: 'Email Writer' } },
      { type: 'outputNode', label: 'Email', payload: { label: 'Ready-to-Send Email', category: 'output_sink' } },
    ],
    connections: [
      { from: 0, to: 2 }, // Context -> Email AI
      { from: 1, to: 2 }, // Tone -> Email AI
      { from: 2, to: 3 }, // Email AI -> Email
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
    'Grade my physics homework',
    'Create a recipe from ingredients',
    'Write a short story about...',
    'Plan my trip to Tokyo',
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
                  Describe your analysis or pick a template
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
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {placeholderExamples.slice(0, 4).map((example, i) => {
              // Shorten to max 40 characters for clean display
              const maxLen = 40
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

        {/* Footer */}
        <div className={cn(
          'p-4 border-t',
          isDark ? 'border-slate-800 bg-slate-900/80' : 'border-slate-200 bg-slate-50'
        )}>
          <p className={cn('text-xs text-center', isDark ? 'text-slate-500' : 'text-slate-400')}>
            Tip: Describe your research goal in natural language and the AI will suggest the best workflow
          </p>
        </div>
      </div>
    </div>
  )
}
