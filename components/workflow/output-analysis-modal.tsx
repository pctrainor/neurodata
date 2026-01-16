'use client'

import { useState, useEffect, lazy, Suspense } from 'react'
import { useTheme } from 'next-themes'
import { 
  X, MessageSquare, Code2, FileText, Play, Copy, 
  Loader2, CheckCircle2, AlertCircle, Maximize2, Minimize2,
  Sparkles, Wand2, Eye, RefreshCw, Download, ArrowRight, Zap
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useIsMobile } from '@/lib/hooks/use-mobile'

// Lazy load mobile modal to reduce bundle size on desktop
const MobileAnalysisModal = lazy(() => import('./mobile-analysis-modal'))

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

interface OutputAnalysisModalProps {
  isOpen: boolean
  onClose: () => void
  outputNodeId: string
  outputNodeName: string
  connectedNodesData: NodeData[]
  aggregatedResult?: Record<string, unknown>
  rawWorkflowResult?: any // Full workflow result as fallback when perNodeResults mapping fails
  hasWorkflowRun?: boolean // Whether workflow has been run (even if no per-node results)
  onRunWorkflow?: () => Promise<void> // Callback to run the workflow from within the modal
  isWorkflowRunning?: boolean // Whether workflow is currently running
}

type AnalysisMode = 'natural' | 'python' | 'display'

interface AnalysisResult {
  success: boolean
  content: string
  generatedCode?: string
  displayContent?: string
  displayFormat?: 'markdown' | 'html'
  suggestedTemplate?: string
  phase?: 'suggestion' | 'final'
  error?: string
}

// Stored suggestion for grounding the final output
interface GroundingSuggestion {
  userIntent: string
  suggestedCode: string
  suggestedFormat: string
  formatType: 'markdown' | 'html'
}

// =============================================================================
// COMPONENT
// =============================================================================

export default function OutputAnalysisModal({
  isOpen,
  onClose,
  outputNodeId,
  outputNodeName,
  connectedNodesData,
  aggregatedResult,
  rawWorkflowResult,
  hasWorkflowRun = false,
  onRunWorkflow,
  isWorkflowRunning = false
}: OutputAnalysisModalProps) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'
  const isMobile = useIsMobile()
  
  // On mobile, render the simplified mobile modal
  if (isMobile) {
    return (
      <Suspense fallback={
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
        </div>
      }>
        <MobileAnalysisModal
          isOpen={isOpen}
          onClose={onClose}
          outputNodeName={outputNodeName}
          connectedNodesData={connectedNodesData}
          rawWorkflowResult={rawWorkflowResult}
          hasWorkflowRun={hasWorkflowRun}
          onRunWorkflow={onRunWorkflow}
          isWorkflowRunning={isWorkflowRunning}
        />
      </Suspense>
    )
  }
  
  // State
  const [activeMode, setActiveMode] = useState<AnalysisMode>('natural')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  
  // Natural language state
  const [naturalInput, setNaturalInput] = useState('')
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  
  // Grounding state - stores the initial suggestion to use when generating final output
  const [groundingSuggestion, setGroundingSuggestion] = useState<GroundingSuggestion | null>(null)
  const [isGrounded, setIsGrounded] = useState(false)
  
  // Python code state
  const [pythonCode, setPythonCode] = useState('')
  const [pythonOutput, setPythonOutput] = useState<string | null>(null)
  
  // Display state - the final rendered output
  const [displayContent, setDisplayContent] = useState<string>('')
  const [displayFormat, setDisplayFormat] = useState<'markdown' | 'html'>('markdown')
  
  // Persistence state - session tracking
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [groundingSuggestionId, setGroundingSuggestionId] = useState<string | null>(null)
  
  // Check if we have actual results - use rawWorkflowResult as fallback
  const hasRawResults = rawWorkflowResult?.analysis || rawWorkflowResult?.result
  const hasResults = connectedNodesData.some(n => n.status === 'completed') || hasRawResults || hasWorkflowRun
  const completedCount = connectedNodesData.filter(n => n.status === 'completed').length
  // When workflow ran but per-node mapping failed, show total nodes as "processed"
  const displayCount = completedCount > 0 ? completedCount : (hasWorkflowRun ? connectedNodesData.length : 0)
  const countLabel = completedCount > 0 ? 'completed' : (hasWorkflowRun ? 'processed' : 'completed')
  
  // Build workflow context description for Gemini - include raw results as fallback
  const workflowContext = buildWorkflowContext(connectedNodesData, aggregatedResult, rawWorkflowResult)
  
  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setAnalysisResult(null)
      setPythonOutput(null)
      setSaveStatus('idle')
      // Keep grounding suggestion and session so it persists when reopening
    }
  }, [isOpen])
  
  // When workflow results become available, show them in the Analysis Result section
  useEffect(() => {
    if (isOpen && hasWorkflowRun && rawWorkflowResult?.analysis && !analysisResult) {
      // Auto-populate the analysis result with the workflow results
      setAnalysisResult({
        success: true,
        content: `## Workflow Complete ✓\n\n**${connectedNodesData.length} nodes processed.**\n\nYour workflow has completed. You can now:\n\n1. **Analyze results** - Type a natural language request above (e.g., "Summarize all results" or "Create a comparison table")\n2. **Generate Python** - Click "Generate Python" to create custom analysis code\n3. **View raw data** - Switch to the Python tab to explore the data structure\n\n---\n\n### Quick Actions\n• Summarize all results\n• Create a comparison table\n• Calculate statistics\n• Find patterns & insights`,
        phase: 'final'
      })
    }
  }, [isOpen, hasWorkflowRun, rawWorkflowResult, analysisResult, connectedNodesData.length])
  
  // ==========================================================================
  // PERSISTENCE HANDLERS
  // ==========================================================================
  
  // Create or get analysis session
  // Note: This is optional - if tables don't exist, we gracefully skip saving
  const ensureSession = async (): Promise<string | null> => {
    if (sessionId) return sessionId
    
    try {
      const response = await fetch('/api/workflows/analyze/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_session',
          workflowId: rawWorkflowResult?.workflowId || null,
          outputNodeId,
          outputNodeName,
          connectedNodesCount: connectedNodesData.length,
          completedNodesCount: completedCount,
          nodeTypes: [...new Set(connectedNodesData.map(n => n.nodeType))],
          nodeNames: connectedNodesData.slice(0, 50).map(n => n.nodeName)
        })
      })
      
      // If tables don't exist yet, don't fail - just skip saving
      if (response.status === 500) {
        const result = await response.json()
        if (result.error?.includes('schema cache') || result.error?.includes('does not exist')) {
          console.info('Analysis tables not yet created - skipping save. Run the migration to enable saving.')
          return null
        }
      }
      
      const result = await response.json()
      if (result.success && result.session?.id) {
        setSessionId(result.session.id)
        return result.session.id
      }
      console.warn('Failed to create session:', result.error)
      return null
    } catch (error) {
      console.error('Error creating session:', error)
      return null
    }
  }
  
  // Save grounding suggestion to database
  const saveGroundingSuggestion = async (
    currentSessionId: string,
    suggestion: GroundingSuggestion
  ): Promise<string | null> => {
    try {
      const response = await fetch('/api/workflows/analyze/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_grounding',
          sessionId: currentSessionId,
          userIntent: suggestion.userIntent,
          originalPrompt: naturalInput,
          suggestedPythonCode: suggestion.suggestedCode,
          suggestedOutputFormat: suggestion.suggestedFormat,
          formatType: suggestion.formatType,
          explanation: analysisResult?.content || ''
        })
      })
      
      const result = await response.json()
      if (result.success && result.grounding?.id) {
        setGroundingSuggestionId(result.grounding.id)
        return result.grounding.id
      }
      console.warn('Failed to save grounding:', result.error)
      return null
    } catch (error) {
      console.error('Error saving grounding:', error)
      return null
    }
  }
  
  // Save final analysis output to database
  // Note: Gracefully handles case where tables don't exist yet
  const saveAnalysisOutput = async (outputType: 'natural_language' | 'python' | 'display') => {
    setIsSaving(true)
    setSaveStatus('saving')
    
    try {
      // Ensure we have a session - if tables don't exist, this returns null
      const currentSessionId = await ensureSession()
      if (!currentSessionId) {
        // Tables don't exist yet - show info message instead of error
        console.info('Analysis results not saved - run migration to enable saving')
        setSaveStatus('idle')
        setIsSaving(false)
        return true // Don't fail the operation
      }
      
      const response = await fetch('/api/workflows/analyze/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_output',
          sessionId: currentSessionId,
          groundingSuggestionId,
          outputType,
          nlPrompt: naturalInput,
          nlResponse: analysisResult?.content || '',
          pythonCode,
          pythonOutput,
          pythonExecutionStatus: pythonOutput ? 'success' : 'pending',
          displayContent,
          displayFormat
        })
      })
      
      const result = await response.json()
      if (result.success) {
        setSaveStatus('saved')
        setTimeout(() => setSaveStatus('idle'), 3000)
        return true
      }
      throw new Error(result.error || 'Failed to save')
    } catch (error) {
      console.error('Error saving output:', error)
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 3000)
      return false
    } finally {
      setIsSaving(false)
    }
  }
  
  // ==========================================================================
  // HANDLERS
  // ==========================================================================
  
  // Build a summary of completed results for the API
  const completedResults = connectedNodesData
    .filter(n => n.status === 'completed' && n.result)
    .slice(0, 20) // Limit to 20 results to avoid token overflow
    .map(n => ({
      name: n.nodeName,
      type: n.nodeType,
      // Truncate long results
      result: typeof n.result === 'string' 
        ? n.result.substring(0, 500)
        : JSON.stringify(n.result).substring(0, 500)
    }))
  
  // Natural Language → Two-step grounding approach
  // Step 1: Generate suggestions based on workflow structure (no results needed)
  // Step 2: When results available, use suggestions to generate final output
  const handleNaturalLanguageSubmit = async () => {
    if (!naturalInput.trim()) return
    
    setIsLoading(true)
    setAnalysisResult(null)
    
    try {
      // Determine if this is Step 1 (suggestion) or Step 2 (final with grounding)
      const isGeneratingFinal = hasResults && groundingSuggestion !== null
      
      // Include raw workflow result text as fallback for perNodeResults mapping failures
      const rawResultText = rawWorkflowResult?.analysis || rawWorkflowResult?.result || null
      
      const response = await fetch('/api/workflows/analyze/natural', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: naturalInput,
          workflowContext,
          nodeCount: connectedNodesData.length,
          nodeTypes: [...new Set(connectedNodesData.map(n => n.nodeType))],
          nodeNames: connectedNodesData.slice(0, 30).map(n => n.nodeName),
          hasResults,
          completedCount,
          completedResults: hasResults ? completedResults : [],
          aggregatedResult,
          // Include raw result as fallback when perNodeResults mapping fails
          rawResultText: rawResultText?.substring(0, 8000), // Truncate to avoid token overflow
          // Pass grounding context if available
          phase: isGeneratingFinal ? 'final' : 'suggestion',
          groundingSuggestion: isGeneratingFinal ? groundingSuggestion : null
        })
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to process request')
      }
      
      if (!result.success) {
        throw new Error(result.error || 'Analysis failed')
      }
      
      setAnalysisResult(result)
      
      // If this was Step 1 (suggestion phase), save the grounding suggestion
      if (!isGeneratingFinal && result.generatedCode) {
        const newGrounding: GroundingSuggestion = {
          userIntent: naturalInput,
          suggestedCode: result.generatedCode,
          suggestedFormat: result.displayContent || '',
          formatType: result.displayFormat || 'markdown'
        }
        setGroundingSuggestion(newGrounding)
        setIsGrounded(true)
        
        // Save grounding to database
        const currentSessionId = await ensureSession()
        if (currentSessionId) {
          await saveGroundingSuggestion(currentSessionId, newGrounding)
        }
      }
      
      // If Gemini generated Python code, populate the Python tab
      if (result.generatedCode) {
        setPythonCode(result.generatedCode)
      }
      
      // If there's display content, set it
      if (result.displayContent) {
        setDisplayContent(result.displayContent)
        setDisplayFormat(result.displayFormat || 'markdown')
      }
      
    } catch (error) {
      setAnalysisResult({
        success: false,
        content: '',
        error: error instanceof Error ? error.message : 'Request failed'
      })
    } finally {
      setIsLoading(false)
    }
  }
  
  // Generate final output using grounding suggestion + actual results
  const handleGenerateFinalOutput = async () => {
    if (!groundingSuggestion) return
    
    setIsLoading(true)
    setAnalysisResult(null)
    
    try {
      const response = await fetch('/api/workflows/analyze/natural', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: groundingSuggestion.userIntent,
          workflowContext,
          nodeCount: connectedNodesData.length,
          nodeTypes: [...new Set(connectedNodesData.map(n => n.nodeType))],
          nodeNames: connectedNodesData.slice(0, 30).map(n => n.nodeName),
          hasResults: true,
          completedCount,
          completedResults,
          aggregatedResult,
          phase: 'final',
          groundingSuggestion
        })
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to process request')
      }
      
      if (!result.success) {
        throw new Error(result.error || 'Analysis failed')
      }
      
      setAnalysisResult(result)
      
      if (result.generatedCode) {
        setPythonCode(result.generatedCode)
      }
      
      if (result.displayContent) {
        setDisplayContent(result.displayContent)
        setDisplayFormat(result.displayFormat || 'markdown')
        // Auto-switch to display tab when final output is ready
        setActiveMode('display')
        
        // Auto-save the final output to database
        await saveAnalysisOutput('display')
      }
      
    } catch (error) {
      setAnalysisResult({
        success: false,
        content: '',
        error: error instanceof Error ? error.message : 'Request failed'
      })
    } finally {
      setIsLoading(false)
    }
  }
  
  // Clear grounding and start fresh
  const handleClearGrounding = () => {
    setGroundingSuggestion(null)
    setIsGrounded(false)
    setGroundingSuggestionId(null)
    setAnalysisResult(null)
    setPythonCode('')
    setDisplayContent('')
  }
  
  // Execute Python code
  const handlePythonExecute = async () => {
    if (!pythonCode.trim()) return
    
    setIsLoading(true)
    setPythonOutput(null)
    
    try {
      const response = await fetch('/api/workflows/analyze/python', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: pythonCode,
          data: {
            nodes: connectedNodesData,
            aggregated: aggregatedResult,
            summary: {
              totalNodes: connectedNodesData.length,
              completedNodes: connectedNodesData.filter(n => n.status === 'completed').length,
              nodeTypes: [...new Set(connectedNodesData.map(n => n.nodeType))]
            }
          }
        })
      })
      
      const result = await response.json()
      
      if (result.success) {
        setPythonOutput(result.output || JSON.stringify(result.result, null, 2))
        // Also set as display content
        setDisplayContent(result.output || JSON.stringify(result.result, null, 2))
        setDisplayFormat('markdown')
      } else {
        setPythonOutput(`Error: ${result.error}`)
      }
    } catch (error) {
      setPythonOutput(`Error: ${error instanceof Error ? error.message : 'Execution failed'}`)
    } finally {
      setIsLoading(false)
    }
  }
  
  // Generate Python from natural language
  const handleGeneratePython = async () => {
    const prompt = `Generate Python code that: ${naturalInput}\n\nOutput should be a formatted string or markdown.`
    setNaturalInput(prompt)
    await handleNaturalLanguageSubmit()
  }
  
  // Copy to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }
  
  // ==========================================================================
  // RENDER HELPERS
  // ==========================================================================
  
  const renderNaturalMode = () => (
    <div className="flex flex-col h-full gap-4">
      {/* Grounding Status Banner */}
      {groundingSuggestion && (
        <div className={cn(
          'rounded-xl border p-3 flex items-center justify-between',
          hasResults 
            ? 'bg-green-500/10 border-green-500/30'
            : 'bg-amber-500/10 border-amber-500/30'
        )}>
          <div className="flex items-center gap-3">
            <div className={cn(
              'p-2 rounded-lg',
              hasResults ? 'bg-green-500/20' : 'bg-amber-500/20'
            )}>
              {hasResults ? (
                <CheckCircle2 className="w-4 h-4 text-green-400" />
              ) : (
                <Sparkles className="w-4 h-4 text-amber-400" />
              )}
            </div>
            <div>
              <p className={cn('text-sm font-medium', isDark ? 'text-white' : 'text-slate-800')}>
                {hasResults ? 'Ready to generate final output' : 'Analysis template saved'}
              </p>
              <p className={cn('text-xs', isDark ? 'text-slate-400' : 'text-slate-500')}>
                {hasResults 
                  ? `${completedCount} results available • Click "Generate Final Output" to create grounded analysis`
                  : `Intent: "${groundingSuggestion.userIntent.substring(0, 50)}${groundingSuggestion.userIntent.length > 50 ? '...' : ''}"`
                }
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasResults && (
              <button
                onClick={handleGenerateFinalOutput}
                disabled={isLoading}
                className="px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white transition-colors"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                Generate Final Output
              </button>
            )}
            <button
              onClick={handleClearGrounding}
              className={cn(
                'p-2 rounded-lg transition-colors',
                isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-200 text-slate-500'
              )}
              title="Clear and start fresh"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
      
      {/* Input Section */}
      <div className={cn(
        'rounded-xl border p-4',
        isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'
      )}>
        <div className="flex items-center gap-2 mb-3">
          <Wand2 className="w-4 h-4 text-purple-500" />
          <span className={cn('text-sm font-medium', isDark ? 'text-white' : 'text-slate-800')}>
            {groundingSuggestion ? 'Refine your analysis' : 'Describe what you want the output to achieve'}
          </span>
          {!hasResults && !groundingSuggestion && (
            <span className={cn('text-xs px-2 py-0.5 rounded', 
              isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'
            )}>
              Step 1: Define your intent
            </span>
          )}
        </div>
        
        <textarea
          value={naturalInput}
          onChange={(e) => setNaturalInput(e.target.value)}
          placeholder={groundingSuggestion 
            ? "Refine your request or add more details..."
            : "Describe what you want the output to show. Example: Create a summary table showing each scientist's rating and key insights. Calculate the average score and identify any outliers..."
          }
          className={cn(
            'w-full h-32 px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none',
            isDark 
              ? 'bg-slate-900 border-slate-600 text-white placeholder-slate-500'
              : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400'
          )}
        />
        
        <div className="flex items-center justify-between mt-3">
          {/* Quick prompts */}
          <div className="flex flex-wrap gap-2">
            {[
              'Summarize all results',
              'Create a comparison table',
              'Calculate statistics',
              'Find patterns & insights'
            ].map((suggestion, i) => (
              <button
                key={i}
                onClick={() => setNaturalInput(suggestion)}
                className={cn(
                  'px-2 py-1 rounded text-xs transition-colors',
                  isDark 
                    ? 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                )}
              >
                {suggestion}
              </button>
            ))}
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={handleGeneratePython}
              disabled={isLoading || !naturalInput.trim()}
              className={cn(
                'px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors',
                isDark 
                  ? 'bg-slate-700 hover:bg-slate-600 text-white'
                  : 'bg-slate-200 hover:bg-slate-300 text-slate-800',
                (isLoading || !naturalInput.trim()) && 'opacity-50 cursor-not-allowed'
              )}
            >
              <Code2 className="w-4 h-4" />
              Generate Python
            </button>
            <button
              onClick={handleNaturalLanguageSubmit}
              disabled={isLoading || !naturalInput.trim()}
              className={cn(
                'px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors',
                'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-500 hover:to-pink-500',
                (isLoading || !naturalInput.trim()) && 'opacity-50 cursor-not-allowed'
              )}
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Analyze
            </button>
          </div>
        </div>
      </div>
      
      {/* Result Section */}
      <div className={cn(
        'flex-1 rounded-xl border overflow-hidden',
        isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'
      )}>
        <div className={cn(
          'px-4 py-3 border-b flex items-center justify-between',
          isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
        )}>
          <span className={cn('text-sm font-medium', isDark ? 'text-white' : 'text-slate-800')}>
            Analysis Result
          </span>
          {analysisResult?.content && (
            <button
              onClick={() => copyToClipboard(analysisResult.content)}
              className={cn(
                'px-2 py-1 rounded text-xs flex items-center gap-1 transition-colors',
                isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'
              )}
            >
              <Copy className="w-3 h-3" /> Copy
            </button>
          )}
        </div>
        
        <div className={cn(
          'p-4 overflow-auto h-[calc(100%-3rem)]',
          isDark ? 'text-slate-300' : 'text-slate-700'
        )}>
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin text-purple-500 mx-auto mb-2" />
                <p className={cn('font-medium', isDark ? 'text-white' : 'text-slate-700')}>
                  Analyzing with Gemini AI...
                </p>
                <p className={cn('text-sm mt-1', isDark ? 'text-slate-400' : 'text-slate-500')}>
                  This may take 30-60 seconds for complex workflows
                </p>
              </div>
            </div>
          ) : analysisResult ? (
            analysisResult.success ? (
              <div className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-wrap">
                {analysisResult.content}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-red-500">
                <AlertCircle className="w-4 h-4" />
                {analysisResult.error}
              </div>
            )
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <MessageSquare className={cn('w-12 h-12 mb-3', isDark ? 'text-slate-600' : 'text-slate-300')} />
              <p className={isDark ? 'text-slate-400' : 'text-slate-500'}>
                {hasResults 
                  ? 'Describe what analysis you want to perform on your results.'
                  : 'Describe what you want the output to achieve.'
                }
              </p>
              <p className={cn('text-sm mt-1', isDark ? 'text-slate-500' : 'text-slate-400')}>
                {hasResults 
                  ? 'Gemini will analyze your workflow results and generate insights.'
                  : 'Gemini will generate suggested Python code and output format. Run the workflow, then generate final output.'
                }
              </p>
            </div>
          )}
        </div>
      </div>
      
      {/* Workflow Context Info */}
      <div className={cn(
        'rounded-xl border p-3',
        isDark ? 'bg-slate-800/30 border-slate-700/50' : 'bg-slate-50 border-slate-200'
      )}>
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>
              <strong>{connectedNodesData.length}</strong> nodes • 
              <strong> {[...new Set(connectedNodesData.map(n => n.nodeType))].join(', ')}</strong>
            </span>
            {groundingSuggestion && (
              <span className={cn(
                'px-2 py-0.5 rounded flex items-center gap-1',
                'bg-purple-500/20 text-purple-400'
              )}>
                <CheckCircle2 className="w-3 h-3" />
                Template ready
              </span>
            )}
          </div>
          {hasResults ? (
            <span className="px-2 py-0.5 rounded bg-green-500/20 text-green-400">
              {displayCount} {countLabel}
            </span>
          ) : onRunWorkflow ? (
            <div className="flex items-center gap-2">
              <span className={cn(
                'px-2 py-0.5 rounded text-xs',
                isDark ? 'bg-slate-700/50 text-slate-400' : 'bg-slate-100 text-slate-500'
              )}>
                {displayCount} {countLabel}
              </span>
              <button
                onClick={onRunWorkflow}
                disabled={isWorkflowRunning}
                className={cn(
                  'px-3 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all',
                  isWorkflowRunning
                    ? 'bg-blue-500/20 text-blue-400 cursor-wait'
                    : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-lg hover:shadow-xl'
                )}
              >
                {isWorkflowRunning ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Running...
                  </>
                ) : (
                  <>
                    <Play className="w-3 h-3" />
                    Run Workflow
                  </>
                )}
              </button>
            </div>
          ) : (
            <span className={cn(
              'px-2 py-0.5 rounded',
              isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-600'
            )}>
              Run workflow for results
            </span>
          )}
        </div>
      </div>
    </div>
  )
  
  const renderPythonMode = () => (
    <div className="flex flex-col h-full gap-4">
      {/* Python Editor */}
      <div className={cn(
        'flex-1 rounded-xl border overflow-hidden flex flex-col',
        isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'
      )}>
        <div className={cn(
          'px-4 py-3 border-b flex items-center justify-between',
          isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
        )}>
          <div className="flex items-center gap-2">
            <Code2 className="w-4 h-4 text-yellow-500" />
            <span className={cn('text-sm font-medium', isDark ? 'text-white' : 'text-slate-800')}>
              Python Code
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPythonCode(getDefaultPythonTemplate())}
              className={cn(
                'px-2 py-1 rounded text-xs flex items-center gap-1 transition-colors',
                isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              )}
            >
              <RefreshCw className="w-3 h-3" /> Template
            </button>
            <button
              onClick={handlePythonExecute}
              disabled={isLoading || !pythonCode.trim()}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition-colors',
                'bg-green-600 hover:bg-green-500 text-white',
                (isLoading || !pythonCode.trim()) && 'opacity-50 cursor-not-allowed'
              )}
            >
              {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
              Run
            </button>
          </div>
        </div>
        
        <textarea
          value={pythonCode}
          onChange={(e) => setPythonCode(e.target.value)}
          placeholder="# Write Python code to analyze your workflow data...&#10;# Available: nodes (list), aggregated (dict)&#10;&#10;for node in nodes:&#10;    print(node['nodeName'])"
          aria-label="Python code editor"
          className={cn(
            'flex-1 p-4 font-mono text-sm resize-none focus:outline-none',
            isDark 
              ? 'bg-slate-900 text-slate-300'
              : 'bg-slate-50 text-slate-700'
          )}
          spellCheck={false}
        />
      </div>
      
      {/* Output */}
      <div className={cn(
        'h-48 rounded-xl border overflow-hidden',
        isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'
      )}>
        <div className={cn(
          'px-4 py-2 border-b flex items-center justify-between',
          isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
        )}>
          <span className={cn('text-sm font-medium', isDark ? 'text-white' : 'text-slate-800')}>
            Output
          </span>
          {pythonOutput && (
            <button
              onClick={() => {
                setDisplayContent(pythonOutput)
                setActiveMode('display')
              }}
              className={cn(
                'px-2 py-1 rounded text-xs flex items-center gap-1 transition-colors',
                'bg-purple-500/20 text-purple-400 hover:bg-purple-500/30'
              )}
            >
              <ArrowRight className="w-3 h-3" /> Send to Display
            </button>
          )}
        </div>
        
        <pre className={cn(
          'p-4 overflow-auto h-[calc(100%-2.5rem)] text-sm font-mono',
          isDark ? 'text-slate-300' : 'text-slate-700'
        )}>
          {pythonOutput || (
            <span className={isDark ? 'text-slate-500' : 'text-slate-400'}>
              Output will appear here after running code...
            </span>
          )}
        </pre>
      </div>
    </div>
  )
  
  const renderDisplayMode = () => (
    <div className="flex flex-col h-full gap-4">
      {/* Display Format Toggle */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setDisplayFormat('markdown')}
          className={cn(
            'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
            displayFormat === 'markdown'
              ? 'bg-purple-500/20 text-purple-400'
              : isDark ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-500 hover:bg-slate-100'
          )}
        >
          Markdown
        </button>
        <button
          onClick={() => setDisplayFormat('html')}
          className={cn(
            'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
            displayFormat === 'html'
              ? 'bg-purple-500/20 text-purple-400'
              : isDark ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-500 hover:bg-slate-100'
          )}
        >
          HTML
        </button>
        <div className="flex-1" />
        <button
          onClick={() => copyToClipboard(displayContent)}
          disabled={!displayContent}
          className={cn(
            'px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition-colors',
            isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-600',
            !displayContent && 'opacity-50 cursor-not-allowed'
          )}
        >
          <Copy className="w-3 h-3" /> Copy
        </button>
        <button
          onClick={() => {
            const blob = new Blob([displayContent], { type: displayFormat === 'html' ? 'text/html' : 'text/markdown' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `analysis.${displayFormat === 'html' ? 'html' : 'md'}`
            a.click()
            URL.revokeObjectURL(url)
          }}
          disabled={!displayContent}
          className={cn(
            'px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition-colors',
            isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-600',
            !displayContent && 'opacity-50 cursor-not-allowed'
          )}
        >
          <Download className="w-3 h-3" /> Export
        </button>
      </div>
      
      {/* Editor / Preview Split */}
      <div className="flex-1 grid grid-cols-2 gap-4">
        {/* Editor */}
        <div className={cn(
          'rounded-xl border overflow-hidden flex flex-col',
          isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'
        )}>
          <div className={cn(
            'px-4 py-2 border-b',
            isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
          )}>
            <span className={cn('text-sm font-medium', isDark ? 'text-white' : 'text-slate-800')}>
              {displayFormat === 'markdown' ? 'Markdown' : 'HTML'} Source
            </span>
          </div>
          <textarea
            value={displayContent}
            onChange={(e) => setDisplayContent(e.target.value)}
            placeholder={displayFormat === 'markdown' 
              ? '# Analysis Results\n\nWrite your markdown here...'
              : '<div class="analysis">\n  <h1>Results</h1>\n</div>'
            }
            aria-label={`${displayFormat} editor`}
            className={cn(
              'flex-1 p-4 font-mono text-sm resize-none focus:outline-none',
              isDark 
                ? 'bg-slate-900 text-slate-300'
                : 'bg-slate-50 text-slate-700'
            )}
            spellCheck={false}
          />
        </div>
        
        {/* Preview */}
        <div className={cn(
          'rounded-xl border overflow-hidden flex flex-col',
          isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'
        )}>
          <div className={cn(
            'px-4 py-2 border-b flex items-center gap-2',
            isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
          )}>
            <Eye className="w-4 h-4 text-blue-500" />
            <span className={cn('text-sm font-medium', isDark ? 'text-white' : 'text-slate-800')}>
              Preview
            </span>
          </div>
          <div className={cn(
            'flex-1 p-4 overflow-auto',
            isDark ? 'bg-slate-900' : 'bg-white'
          )}>
            {displayContent ? (
              displayFormat === 'markdown' ? (
                <div className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-wrap">
                  {displayContent}
                </div>
              ) : (
                <div 
                  dangerouslySetInnerHTML={{ __html: displayContent }}
                  className={isDark ? 'text-slate-300' : 'text-slate-700'}
                />
              )
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <FileText className={cn('w-12 h-12 mb-3', isDark ? 'text-slate-600' : 'text-slate-300')} />
                <p className={isDark ? 'text-slate-400' : 'text-slate-500'}>
                  Your formatted output will appear here
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
  
  // ==========================================================================
  // MAIN RENDER
  // ==========================================================================
  
  if (!isOpen) return null
  
  return (
    <div 
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className={cn(
        'rounded-2xl shadow-2xl border overflow-hidden flex flex-col transition-all duration-300',
        isFullscreen 
          ? 'w-full h-full max-w-none max-h-none' 
          : 'w-full max-w-5xl h-[85vh]',
        isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'
      )}>
        {/* Header */}
        <div className={cn(
          'px-6 py-4 border-b flex items-center justify-between shrink-0',
          isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
        )}>
          <div className="flex items-center gap-3">
            <div className={cn(
              'p-2 rounded-lg',
              isDark ? 'bg-purple-500/20' : 'bg-purple-100'
            )}>
              <Sparkles className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <h2 className={cn('text-lg font-bold', isDark ? 'text-white' : 'text-slate-800')}>
                Analysis Workbench
              </h2>
              <p className={cn('text-sm', isDark ? 'text-slate-400' : 'text-slate-500')}>
                {outputNodeName}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Save Status Indicator */}
            {saveStatus !== 'idle' && (
              <div className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium',
                saveStatus === 'saving' && (isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-700'),
                saveStatus === 'saved' && (isDark ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-700'),
                saveStatus === 'error' && (isDark ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-700')
              )}>
                {saveStatus === 'saving' && <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...</>}
                {saveStatus === 'saved' && <><CheckCircle2 className="w-3.5 h-3.5" /> Saved!</>}
                {saveStatus === 'error' && <><AlertCircle className="w-3.5 h-3.5" /> Error</>}
              </div>
            )}
            
            {/* Save Button */}
            {(displayContent || analysisResult?.success) && (
              <button
                onClick={() => saveAnalysisOutput(activeMode === 'python' ? 'python' : activeMode === 'display' ? 'display' : 'natural_language')}
                disabled={isSaving}
                title="Save analysis to database"
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                  isDark 
                    ? 'bg-purple-500/20 text-purple-400 hover:bg-purple-500/30' 
                    : 'bg-purple-100 text-purple-700 hover:bg-purple-200',
                  isSaving && 'opacity-50 cursor-not-allowed'
                )}
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                Save
              </button>
            )}
            
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
              className={cn(
                'p-2 rounded-lg transition-colors',
                isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'
              )}
            >
              {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>
            <button
              onClick={onClose}
              title="Close modal"
              className={cn(
                'p-2 rounded-lg transition-colors',
                isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'
              )}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {/* Mode Tabs */}
        <div className={cn(
          'px-6 py-2 border-b flex items-center gap-1 shrink-0',
          isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50/50 border-slate-200'
        )}>
          {([
            { id: 'natural', label: 'Natural Language', icon: MessageSquare },
            { id: 'python', label: 'Python', icon: Code2 },
            { id: 'display', label: 'Display', icon: FileText },
          ] as const).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveMode(id)}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors',
                activeMode === id
                  ? isDark
                    ? 'bg-purple-500/20 text-purple-400'
                    : 'bg-purple-100 text-purple-700'
                  : isDark
                    ? 'text-slate-400 hover:bg-slate-700 hover:text-white'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-hidden p-6">
          {activeMode === 'natural' && renderNaturalMode()}
          {activeMode === 'python' && renderPythonMode()}
          {activeMode === 'display' && renderDisplayMode()}
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function buildWorkflowContext(nodes: NodeData[], aggregated?: Record<string, unknown>, rawWorkflowResult?: any): string {
  const nodesByType = nodes.reduce((acc, n) => {
    acc[n.nodeType] = (acc[n.nodeType] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  
  const completedNodes = nodes.filter(n => n.status === 'completed')
  
  const lines = [
    `Workflow has ${nodes.length} nodes (${completedNodes.length} completed):`,
    ...Object.entries(nodesByType).map(([type, count]) => `- ${count} ${type} nodes`),
  ]
  
  // Sample node names - show more if they're scientists
  const sampleCount = nodes.length > 50 ? 20 : 10
  const sampleNames = nodes.slice(0, sampleCount).map(n => n.nodeName)
  if (sampleNames.length > 0) {
    lines.push(`\nNode names: ${sampleNames.join(', ')}${nodes.length > sampleCount ? ` ... and ${nodes.length - sampleCount} more` : ''}`)
  }
  
  // Include sample results if available from completed nodes
  if (completedNodes.length > 0) {
    lines.push(`\n--- SAMPLE RESULTS (${Math.min(3, completedNodes.length)} of ${completedNodes.length}) ---`)
    completedNodes.slice(0, 3).forEach(n => {
      const resultPreview = typeof n.result === 'string' 
        ? n.result.substring(0, 200) 
        : JSON.stringify(n.result).substring(0, 200)
      lines.push(`\n[${n.nodeName}]: ${resultPreview}...`)
    })
  }
  
  // Add aggregated info if available
  if (aggregated && Object.keys(aggregated).length > 0) {
    lines.push(`\nAggregated result keys: ${Object.keys(aggregated).join(', ')}`)
  }
  
  // FALLBACK: Include raw workflow result if perNodeResults mapping failed
  if (rawWorkflowResult && completedNodes.length === 0) {
    lines.push(`\n--- RAW WORKFLOW RESULT (fallback) ---`)
    
    // Include the main analysis text
    const resultText = rawWorkflowResult.analysis || rawWorkflowResult.result || ''
    if (resultText) {
      lines.push(`\n[Main Result Preview]:\n${resultText.substring(0, 2000)}${resultText.length > 2000 ? '...' : ''}`)
    }
    
    // Include perNodeResults from the raw result if available
    if (rawWorkflowResult.perNodeResults && Array.isArray(rawWorkflowResult.perNodeResults)) {
      lines.push(`\n[Per-Node Results]: ${rawWorkflowResult.perNodeResults.length} items`)
      rawWorkflowResult.perNodeResults.slice(0, 5).forEach((r: any, i: number) => {
        const preview = JSON.stringify(r).substring(0, 300)
        lines.push(`  ${i+1}. ${preview}...`)
      })
    }
  }
  
  return lines.join('\n')
}

function getDefaultPythonTemplate(): string {
  return `# Analyze workflow data
# Available: nodes (list of dicts), aggregated (dict)

# Count nodes by type
from collections import Counter
type_counts = Counter(node['nodeType'] for node in nodes)
print("Node types:", dict(type_counts))

# List node names
for i, node in enumerate(nodes[:10]):
    print(f"{i+1}. {node['nodeName']} ({node['nodeType']})")

if len(nodes) > 10:
    print(f"... and {len(nodes) - 10} more")
`
}
