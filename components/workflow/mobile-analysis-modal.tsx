'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useTheme } from 'next-themes'
import { 
  X, Loader2, CheckCircle2, AlertCircle, 
  Sparkles, RefreshCw, Download, ChevronDown, ChevronRight,
  BarChart3, TrendingUp, Heart, Share2, Brain, Lightbulb,
  ThumbsUp, AlertTriangle, Eye, Users, Flame, Copy, Check
} from 'lucide-react'
import { cn } from '@/lib/utils'

// =============================================================================
// TYPES
// =============================================================================

interface NodeData {
  nodeId: string
  nodeName: string
  nodeType: string
  result: Record<string, unknown> | string | null
  status: 'completed' | 'pending' | 'error'
  processingTime?: string
}

interface MobileAnalysisModalProps {
  isOpen: boolean
  onClose: () => void
  outputNodeName: string
  connectedNodesData: NodeData[]
  rawWorkflowResult?: any
  hasWorkflowRun?: boolean
  onRunWorkflow?: () => Promise<void>
  isWorkflowRunning?: boolean
}

interface ParsedSection {
  title: string
  content: string
  items?: string[]
  score?: number
}

interface AnalysisResult {
  success: boolean
  content: string
  error?: string
}

// =============================================================================
// MOBILE-OPTIMIZED RESULTS MODAL (Safari-safe)
// =============================================================================

// Detect Safari - it has stricter memory limits
const isSafari = typeof navigator !== 'undefined' && 
  /^((?!chrome|android).)*safari/i.test(navigator.userAgent)

// Safari-specific limits (VERY conservative to avoid crashes)
const MAX_NODES_SAFARI = 5 // Reduced from 10
const MAX_NODES_DEFAULT = 12 // Reduced from 15
const MAX_RESULT_LENGTH_SAFARI = 200 // Reduced from 500
const MAX_RESULT_LENGTH_DEFAULT = 800 // Reduced from 1500

export default function MobileAnalysisModal({
  isOpen,
  onClose,
  outputNodeName,
  connectedNodesData = [], // Default to empty array
  rawWorkflowResult,
  hasWorkflowRun = false,
  onRunWorkflow,
  isWorkflowRunning = false
}: MobileAnalysisModalProps) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'
  
  // Error state for catching render errors
  const [hasError, setHasError] = useState(false)
  const [isReady, setIsReady] = useState(false)
  
  // Refs
  const progressBarRef = useRef<HTMLDivElement>(null)
  
  // State
  const [isLoading, setIsLoading] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  const [naturalInput, setNaturalInput] = useState('')
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set([0, 1, 2]))
  const [copied, setCopied] = useState(false)
  const [loadingProgress, setLoadingProgress] = useState(0)
  
  // Delayed mount for Safari - prevents memory spike on open
  useEffect(() => {
    if (isOpen) {
      // Give Safari much more time to prepare - iOS WebKit needs this
      const delay = isSafari ? 600 : 150
      const timer = setTimeout(() => setIsReady(true), delay)
      return () => clearTimeout(timer)
    } else {
      // Clear state immediately when closing to free memory
      setIsReady(false)
      setAnalysisResult(null)
      setNaturalInput('')
    }
  }, [isOpen])
  
  // Safe data access - limit data size for mobile (stricter for Safari)
  const safeConnectedNodesData = useMemo(() => {
    try {
      const maxNodes = isSafari ? MAX_NODES_SAFARI : MAX_NODES_DEFAULT
      const maxResultLen = isSafari ? MAX_RESULT_LENGTH_SAFARI : MAX_RESULT_LENGTH_DEFAULT
      
      return (connectedNodesData || []).slice(0, maxNodes).map(n => {
        // Safely truncate result
        let safeResult = n.result
        if (typeof safeResult === 'string') {
          safeResult = safeResult.substring(0, maxResultLen)
        } else if (safeResult && typeof safeResult === 'object') {
          // For objects, stringify and truncate to prevent memory issues
          try {
            const str = JSON.stringify(safeResult)
            if (str.length > maxResultLen) {
              safeResult = str.substring(0, maxResultLen) + '...'
            }
          } catch {
            safeResult = '[Complex data]'
          }
        }
        
        return {
          nodeId: n.nodeId,
          nodeName: n.nodeName?.substring(0, 50) || 'Node',
          nodeType: n.nodeType,
          result: safeResult,
          status: n.status,
          processingTime: n.processingTime
        }
      })
    } catch {
      return []
    }
  }, [connectedNodesData])
  
  // Calculate metrics with safe access - don't access raw result on Safari
  const completedCount = safeConnectedNodesData.filter(n => n?.status === 'completed').length
  const hasRawResults = !isSafari && (rawWorkflowResult?.analysis || rawWorkflowResult?.result)
  const hasResults = safeConnectedNodesData.some(n => n.status === 'completed') || hasRawResults || hasWorkflowRun
  
  // Parse the analysis result into sections
  const parsedSections = useMemo(() => {
    if (!analysisResult?.content) return []
    return parseAnalysisToSections(analysisResult.content)
  }, [analysisResult])
  
  // Update progress bar width via ref to avoid inline styles
  useEffect(() => {
    if (progressBarRef.current) {
      progressBarRef.current.style.width = `${loadingProgress}%`
    }
  }, [loadingProgress])
  
  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setLoadingProgress(0)
    }
  }, [isOpen])
  
  // Simulate loading progress for better UX
  useEffect(() => {
    if (isLoading) {
      setLoadingProgress(0)
      const interval = setInterval(() => {
        setLoadingProgress(prev => {
          // Slow down as we approach 90% (never reaches 100 until done)
          if (prev < 30) return prev + 3
          if (prev < 60) return prev + 2
          if (prev < 85) return prev + 0.5
          return prev + 0.1
        })
      }, 200)
      return () => clearInterval(interval)
    } else {
      setLoadingProgress(100)
      const timeout = setTimeout(() => setLoadingProgress(0), 500)
      return () => clearTimeout(timeout)
    }
  }, [isLoading])
  
  // Build workflow context for the API - use safe data
  const buildWorkflowContext = () => {
    try {
      const nodesByType = safeConnectedNodesData.reduce((acc, n) => {
        acc[n.nodeType] = (acc[n.nodeType] || 0) + 1
        return acc
      }, {} as Record<string, number>)
      
      return `${safeConnectedNodesData.length} nodes: ${Object.entries(nodesByType).map(([t, c]) => `${c} ${t}`).join(', ')}`
    } catch {
      return 'workflow nodes'
    }
  }
  
  // Handle analysis submission - simplified for mobile
  const handleAnalyze = async (prompt?: string) => {
    const queryPrompt = prompt || naturalInput.trim() || 'Summarize all results with key insights'
    
    setIsLoading(true)
    setAnalysisResult(null)
    
    try {
      // Build request with simplified data for mobile (reduce payload size)
      const completedResults = safeConnectedNodesData
        .filter(n => n.status === 'completed' && n.result)
        .slice(0, 10) // Limit to 10 for mobile performance
        .map(n => ({
          name: n.nodeName,
          type: n.nodeType,
          result: typeof n.result === 'string' 
            ? n.result.substring(0, 300)
            : JSON.stringify(n.result).substring(0, 300)
        }))
      
      // Safely extract raw result text with size limit
      let rawResultText: string | null = null
      try {
        const raw = rawWorkflowResult?.analysis || rawWorkflowResult?.result
        rawResultText = typeof raw === 'string' ? raw.substring(0, 4000) : null
      } catch {
        rawResultText = null
      }
      
      const response = await fetch('/api/workflows/analyze/natural', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: queryPrompt,
          workflowContext: buildWorkflowContext(),
          nodeCount: safeConnectedNodesData.length,
          nodeTypes: [...new Set(safeConnectedNodesData.map(n => n.nodeType))],
          nodeNames: safeConnectedNodesData.slice(0, 15).map(n => n.nodeName),
          hasResults,
          completedCount,
          completedResults,
          rawResultText,
          phase: 'final'
        })
      })
      
      const result = await response.json()
      
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Analysis failed')
      }
      
      setAnalysisResult({
        success: true,
        content: result.content || result.displayContent || 'Analysis complete'
      })
      
    } catch (error) {
      setAnalysisResult({
        success: false,
        content: '',
        error: error instanceof Error ? error.message : 'Request failed. Please try again.'
      })
    } finally {
      setIsLoading(false)
    }
  }
  
  // Copy results to clipboard
  const handleCopy = async () => {
    try {
      if (analysisResult?.content) {
        await navigator.clipboard.writeText(analysisResult.content)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
    } catch {
      // Clipboard access may fail on some mobile browsers
    }
  }
  
  // Toggle section expansion
  const toggleSection = (index: number) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }
  
  // Quick action buttons - fewer on Safari to reduce render complexity
  const quickActions = isSafari ? [
    { label: 'Summary', prompt: 'Create a concise summary of all results' },
    { label: 'Insights', prompt: 'Extract the most important insights' },
  ] : [
    { label: 'Summarize', prompt: 'Create a concise summary of all results' },
    { label: 'Key Insights', prompt: 'Extract the most important insights and findings' },
    { label: 'Compare', prompt: 'Compare and contrast the different results' },
    { label: 'Statistics', prompt: 'Calculate key statistics and metrics' },
  ]
  
  if (!isOpen) return null
  
  // Loading state while Safari prepares
  if (!isReady) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className={cn(
          'p-6 rounded-xl text-center',
          isDark ? 'bg-slate-900' : 'bg-white'
        )}>
          <Loader2 className="w-8 h-8 animate-spin text-purple-500 mx-auto mb-3" />
          <p className={cn('text-sm', isDark ? 'text-slate-400' : 'text-slate-600')}>
            Loading results...
          </p>
        </div>
      </div>
    )
  }
  
  // Error fallback UI
  if (hasError) {
    return (
      <div 
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div className={cn(
          'p-6 rounded-xl text-center max-w-sm',
          isDark ? 'bg-slate-900' : 'bg-white'
        )}>
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className={cn('text-lg font-semibold mb-2', isDark ? 'text-white' : 'text-slate-900')}>
            Unable to Load Results
          </h3>
          <p className={cn('text-sm mb-4', isDark ? 'text-slate-400' : 'text-slate-600')}>
            The results data is too large to display on mobile. Try running a smaller workflow.
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium"
          >
            Close
          </button>
        </div>
      </div>
    )
  }
  
  // Wrap render in try-catch via error boundary effect
  try {
    return (
      <div 
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex flex-col"
        onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Main container - full screen on mobile */}
      <div className={cn(
        'flex-1 flex flex-col overflow-hidden',
        'rounded-t-2xl mt-4 sm:mt-0 sm:rounded-none',
        isDark ? 'bg-slate-900' : 'bg-white'
      )}>
        {/* Header - compact for mobile */}
        <div className={cn(
          'px-4 py-3 border-b flex items-center justify-between shrink-0',
          isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
        )}>
          <div className="flex items-center gap-2 min-w-0">
            <div className={cn(
              'p-1.5 rounded-lg shrink-0',
              isDark ? 'bg-purple-500/20' : 'bg-purple-100'
            )}>
              <Sparkles className="w-4 h-4 text-purple-500" />
            </div>
            <div className="min-w-0">
              <h2 className={cn('text-sm font-semibold truncate', isDark ? 'text-white' : 'text-slate-800')}>
                Analysis Results
              </h2>
              <p className={cn('text-xs truncate', isDark ? 'text-slate-400' : 'text-slate-500')}>
                {outputNodeName}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-1.5">
            {analysisResult?.success && (
              <button
                onClick={handleCopy}
                className={cn(
                  'p-2 rounded-lg transition-colors',
                  isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'
                )}
                title="Copy results"
                aria-label="Copy results to clipboard"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4 text-slate-400" />
                )}
              </button>
            )}
            <button
              onClick={onClose}
              className={cn(
                'p-2 rounded-lg transition-colors',
                isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'
              )}
              title="Close"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {/* Loading progress bar - using simple visual indicator */}
        {isLoading && (
          <div className="h-1 bg-slate-200 dark:bg-slate-700" aria-hidden="true">
            <div 
              ref={progressBarRef}
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300 w-0"
            />
          </div>
        )}
        
        {/* Content area */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {/* Status bar */}
          <div className={cn(
            'px-4 py-2 border-b flex items-center justify-between text-xs',
            isDark ? 'bg-slate-800/50 border-slate-700/50' : 'bg-slate-50/50 border-slate-200'
          )}>
            <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>
              {connectedNodesData.length} nodes • {completedCount} completed
            </span>
            {hasResults ? (
              <span className="px-2 py-0.5 rounded bg-green-500/20 text-green-500 text-xs">
                Ready
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-500 text-xs">
                Run workflow first
              </span>
            )}
          </div>
          
          {/* Main content */}
          <div className="p-4 space-y-4">
            {/* Loading state */}
            {isLoading && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="relative mb-4">
                  <Loader2 className="w-10 h-10 animate-spin text-purple-500" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs font-medium text-purple-400">
                      {Math.round(loadingProgress)}%
                    </span>
                  </div>
                </div>
                <p className={cn('font-medium', isDark ? 'text-white' : 'text-slate-800')}>
                  Analyzing your data...
                </p>
                <p className={cn('text-sm mt-1', isDark ? 'text-slate-400' : 'text-slate-500')}>
                  This may take 30-60 seconds for complex workflows
                </p>
              </div>
            )}
            
            {/* Error state */}
            {!isLoading && analysisResult && !analysisResult.success && (
              <div className={cn(
                'p-4 rounded-xl border flex items-start gap-3',
                isDark ? 'bg-red-500/10 border-red-500/30' : 'bg-red-50 border-red-200'
              )}>
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className={cn('font-medium', isDark ? 'text-red-400' : 'text-red-700')}>
                    Analysis Failed
                  </p>
                  <p className={cn('text-sm mt-1', isDark ? 'text-red-300/70' : 'text-red-600')}>
                    {analysisResult.error}
                  </p>
                  <button
                    onClick={() => handleAnalyze()}
                    className="mt-3 px-3 py-1.5 rounded-lg text-sm font-medium bg-red-500 text-white hover:bg-red-600 transition-colors flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Try Again
                  </button>
                </div>
              </div>
            )}
            
            {/* Results - sectioned view */}
            {!isLoading && analysisResult?.success && (
              <div className="space-y-3">
                {/* Success header */}
                <div className={cn(
                  'p-3 rounded-xl border flex items-center gap-3',
                  isDark ? 'bg-green-500/10 border-green-500/30' : 'bg-green-50 border-green-200'
                )}>
                  <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                  <p className={cn('text-sm font-medium', isDark ? 'text-green-400' : 'text-green-700')}>
                    Analysis complete • {parsedSections.length} sections found
                  </p>
                </div>
                
                {/* Sections */}
                {parsedSections.length > 0 ? (
                  parsedSections.map((section, index) => (
                    <MobileSection
                      key={index}
                      section={section}
                      index={index}
                      isExpanded={expandedSections.has(index)}
                      onToggle={() => toggleSection(index)}
                      isDark={isDark}
                    />
                  ))
                ) : (
                  /* Fallback: show raw content in a clean format */
                  <div className={cn(
                    'p-4 rounded-xl border',
                    isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'
                  )}>
                    <FormattedContent content={analysisResult.content} isDark={isDark} />
                  </div>
                )}
              </div>
            )}
            
            {/* Empty state with quick actions */}
            {!isLoading && !analysisResult && (
              <div className="space-y-4">
                {/* Run workflow prompt if needed */}
                {!hasResults && onRunWorkflow && (
                  <div className={cn(
                    'p-4 rounded-xl border text-center',
                    isDark ? 'bg-amber-500/10 border-amber-500/30' : 'bg-amber-50 border-amber-200'
                  )}>
                    <p className={cn('font-medium mb-3', isDark ? 'text-amber-400' : 'text-amber-700')}>
                      Run your workflow first
                    </p>
                    <button
                      onClick={onRunWorkflow}
                      disabled={isWorkflowRunning}
                      className={cn(
                        'px-4 py-2 rounded-xl font-medium text-white transition-all',
                        isWorkflowRunning
                          ? 'bg-slate-500 cursor-wait'
                          : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500'
                      )}
                    >
                      {isWorkflowRunning ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Running...
                        </span>
                      ) : (
                        'Run Workflow'
                      )}
                    </button>
                  </div>
                )}
                
                {/* Quick actions */}
                {hasResults && (
                  <>
                    <p className={cn(
                      'text-center text-sm',
                      isDark ? 'text-slate-400' : 'text-slate-500'
                    )}>
                      Quick analysis options:
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {quickActions.map((action, i) => (
                        <button
                          key={i}
                          onClick={() => handleAnalyze(action.prompt)}
                          className={cn(
                            'p-3 rounded-xl border text-sm font-medium transition-all active:scale-95',
                            isDark 
                              ? 'bg-slate-800 border-slate-700 text-white hover:bg-slate-700'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                          )}
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
        
        {/* Bottom input area - sticky */}
        <div className={cn(
          'shrink-0 border-t p-3 pb-safe',
          isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
        )}>
          <div className="flex gap-2">
            <input
              type="text"
              value={naturalInput}
              onChange={(e) => setNaturalInput(e.target.value)}
              placeholder="Ask about your results..."
              disabled={!hasResults || isLoading}
              className={cn(
                'flex-1 px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-purple-500',
                isDark 
                  ? 'bg-slate-900 border-slate-600 text-white placeholder-slate-500'
                  : 'bg-white border-slate-200 text-slate-800 placeholder-slate-400',
                (!hasResults || isLoading) && 'opacity-50 cursor-not-allowed'
              )}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isLoading && hasResults) {
                  handleAnalyze()
                }
              }}
            />
            <button
              onClick={() => handleAnalyze()}
              disabled={!hasResults || isLoading}
              className={cn(
                'px-4 py-2.5 rounded-xl font-medium text-white transition-all',
                'bg-gradient-to-r from-purple-600 to-pink-600',
                (!hasResults || isLoading) && 'opacity-50 cursor-not-allowed',
                hasResults && !isLoading && 'hover:from-purple-500 hover:to-pink-500 active:scale-95'
              )}
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Sparkles className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
    )
  } catch (error) {
    // If render fails, show error state
    console.error('MobileAnalysisModal render error:', error)
    setHasError(true)
    return null
  }
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

interface MobileSectionProps {
  section: ParsedSection
  index: number
  isExpanded: boolean
  onToggle: () => void
  isDark: boolean
}

function MobileSection({ section, isExpanded, onToggle, isDark }: MobileSectionProps) {
  const { icon: Icon, color } = getIconForSection(section.title)
  
  return (
    <div className={cn(
      'rounded-xl border overflow-hidden',
      isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'
    )}>
      <button
        onClick={onToggle}
        className={cn(
          'w-full px-4 py-3 flex items-center justify-between transition-colors',
          isDark ? 'hover:bg-slate-700/50' : 'hover:bg-slate-50'
        )}
      >
        <div className="flex items-center gap-3">
          <div className={cn(
            'p-1.5 rounded-lg',
            color.replace('text-', 'bg-').replace('-400', '-500/20')
          )}>
            <Icon className={cn('w-4 h-4', color)} />
          </div>
          <span className={cn('text-sm font-medium', isDark ? 'text-white' : 'text-slate-800')}>
            {section.title}
          </span>
          {section.score !== undefined && (
            <span className={cn(
              'text-xs font-bold px-2 py-0.5 rounded',
              section.score >= 80 ? 'bg-green-500/20 text-green-400' :
              section.score >= 60 ? 'bg-yellow-500/20 text-yellow-400' :
              'bg-red-500/20 text-red-400'
            )}>
              {section.score}/100
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronRight className="w-4 h-4 text-slate-400" />
        )}
      </button>
      
      {isExpanded && (
        <div className={cn(
          'px-4 pb-4 border-t',
          isDark ? 'border-slate-700/50' : 'border-slate-100'
        )}>
          {section.items && section.items.length > 0 ? (
            <ul className="mt-3 space-y-2">
              {section.items.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
                  <span className={isDark ? 'text-slate-300' : 'text-slate-600'}>
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className={cn(
              'mt-3 text-sm leading-relaxed',
              isDark ? 'text-slate-300' : 'text-slate-600'
            )}>
              {section.content}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function FormattedContent({ content, isDark }: { content: string; isDark: boolean }) {
  // Simple markdown-like formatting for mobile
  const lines = content.split('\n').filter(line => line.trim())
  
  return (
    <div className="space-y-2">
      {lines.map((line, i) => {
        const trimmed = line.trim()
        
        // Headers
        if (trimmed.startsWith('###')) {
          return (
            <h4 key={i} className={cn('text-sm font-medium mt-3', isDark ? 'text-slate-200' : 'text-slate-700')}>
              {trimmed.replace(/^#+\s*/, '')}
            </h4>
          )
        }
        if (trimmed.startsWith('##')) {
          return (
            <h3 key={i} className={cn('text-base font-semibold mt-4', isDark ? 'text-white' : 'text-slate-800')}>
              {trimmed.replace(/^#+\s*/, '')}
            </h3>
          )
        }
        if (trimmed.startsWith('#')) {
          return (
            <h2 key={i} className={cn('text-lg font-bold mt-4', isDark ? 'text-white' : 'text-slate-900')}>
              {trimmed.replace(/^#+\s*/, '')}
            </h2>
          )
        }
        
        // Bullet points
        if (trimmed.match(/^[-•*]\s/)) {
          return (
            <div key={i} className="flex items-start gap-2 text-sm">
              <div className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-2 shrink-0" />
              <span className={isDark ? 'text-slate-300' : 'text-slate-600'}>
                {trimmed.replace(/^[-•*]\s*/, '')}
              </span>
            </div>
          )
        }
        
        // Regular paragraph
        return (
          <p key={i} className={cn('text-sm leading-relaxed', isDark ? 'text-slate-300' : 'text-slate-600')}>
            {trimmed}
          </p>
        )
      })}
    </div>
  )
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function parseAnalysisToSections(content: string): ParsedSection[] {
  const sections: ParsedSection[] = []
  
  // Clean up content
  let cleanedText = content
    .replace(/```[\s\S]*?```/g, '') // Remove code blocks
    .replace(/\\n/g, '\n')
    .trim()
  
  // Try to extract from JSON if present
  try {
    const jsonMatch = cleanedText.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const jsonData = JSON.parse(jsonMatch[0])
      if (typeof jsonData === 'object') {
        for (const [key, value] of Object.entries(jsonData)) {
          if (typeof value === 'string' && value.length > 0) {
            sections.push({
              title: formatTitle(key),
              content: value
            })
          } else if (Array.isArray(value)) {
            sections.push({
              title: formatTitle(key),
              content: '',
              items: value.map(item => typeof item === 'string' ? item : JSON.stringify(item))
            })
          } else if (typeof value === 'number') {
            const existing = sections.find(s => s.title === 'Scores')
            if (existing) {
              existing.content += `\n${formatTitle(key)}: ${value}`
            } else {
              sections.push({
                title: 'Scores',
                content: `${formatTitle(key)}: ${value}`,
                score: value
              })
            }
          }
        }
        if (sections.length > 0) return sections
      }
    }
  } catch {
    // Not JSON, continue with text parsing
  }
  
  // Parse markdown headers
  const headerRegex = /(?:^|\n)#+\s*([^\n]+)\n([\s\S]*?)(?=(?:\n#+\s)|$)/g
  let match
  
  while ((match = headerRegex.exec(cleanedText)) !== null) {
    const title = match[1].trim()
    const content = match[2].trim()
    
    const bulletPoints = content.match(/[-•*]\s+([^\n]+)/g)
    const items = bulletPoints 
      ? bulletPoints.map(b => b.replace(/^[-•*]\s+/, '').trim())
      : undefined
    
    // Extract score if mentioned
    const scoreMatch = content.match(/(\d+)(?:\/100|%|\s*out\s*of\s*100)/i)
    const score = scoreMatch ? parseInt(scoreMatch[1]) : undefined
    
    sections.push({
      title,
      content: items ? '' : content,
      items,
      score
    })
  }
  
  // If no sections found, create a single section with all content
  if (sections.length === 0 && cleanedText.length > 0) {
    sections.push({
      title: 'Analysis Results',
      content: cleanedText
    })
  }
  
  return sections
}

function formatTitle(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/^\s+/, '')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

function getIconForSection(title: string): { icon: typeof BarChart3; color: string } {
  const titleLower = title.toLowerCase()
  
  if (titleLower.includes('strength') || titleLower.includes('positive')) {
    return { icon: ThumbsUp, color: 'text-green-400' }
  }
  if (titleLower.includes('weakness') || titleLower.includes('negative') || titleLower.includes('risk')) {
    return { icon: AlertTriangle, color: 'text-amber-400' }
  }
  if (titleLower.includes('emotion') || titleLower.includes('feeling')) {
    return { icon: Heart, color: 'text-pink-400' }
  }
  if (titleLower.includes('engagement') || titleLower.includes('attention')) {
    return { icon: Eye, color: 'text-cyan-400' }
  }
  if (titleLower.includes('recommendation') || titleLower.includes('suggestion')) {
    return { icon: Lightbulb, color: 'text-yellow-400' }
  }
  if (titleLower.includes('share') || titleLower.includes('viral')) {
    return { icon: Share2, color: 'text-indigo-400' }
  }
  if (titleLower.includes('audience') || titleLower.includes('demographic')) {
    return { icon: Users, color: 'text-violet-400' }
  }
  if (titleLower.includes('summary') || titleLower.includes('overview')) {
    return { icon: BarChart3, color: 'text-blue-400' }
  }
  if (titleLower.includes('score') || titleLower.includes('rating')) {
    return { icon: TrendingUp, color: 'text-emerald-400' }
  }
  if (titleLower.includes('trend') || titleLower.includes('pattern')) {
    return { icon: Flame, color: 'text-orange-400' }
  }
  if (titleLower.includes('brain') || titleLower.includes('cognitive') || titleLower.includes('neuro')) {
    return { icon: Brain, color: 'text-purple-400' }
  }
  
  return { icon: Sparkles, color: 'text-slate-400' }
}
