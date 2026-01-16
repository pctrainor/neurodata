'use client'

import { useState, useEffect } from 'react'
import { Cloud, Zap, Cpu, Loader2, Check, X, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTheme } from 'next-themes'

interface CloudComputeToggleProps {
  isEnabled: boolean
  onToggle: (enabled: boolean) => void
  nodeCount: number
  disabled?: boolean
  className?: string
}

// Calculate credits for cloud compute
function calculateCloudCredits(nodeCount: number): number {
  return Math.max(2, Math.ceil(nodeCount / 5))
}

// Estimate duration in seconds
function estimateDuration(nodeCount: number): number {
  return 10 + (nodeCount * 2)
}

// Format duration nicely
function formatDuration(seconds: number): string {
  if (seconds < 60) return `~${seconds}s`
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return secs > 0 ? `~${mins}m ${secs}s` : `~${mins}m`
}

export default function CloudComputeToggle({
  isEnabled,
  onToggle,
  nodeCount,
  disabled = false,
  className
}: CloudComputeToggleProps) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'
  const [showDetails, setShowDetails] = useState(false)
  
  const creditsNeeded = calculateCloudCredits(nodeCount)
  const estimatedTime = estimateDuration(nodeCount)
  
  // Recommend cloud for large workflows
  const isLargeWorkflow = nodeCount >= 20
  const isHugeWorkflow = nodeCount >= 100
  
  return (
    <div className={cn('relative', className)}>
      {/* Main Toggle Button */}
      <button
        onClick={() => !disabled && onToggle(!isEnabled)}
        disabled={disabled}
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all',
          isEnabled
            ? isDark
              ? 'bg-purple-600/20 border-purple-500/50 text-purple-300'
              : 'bg-purple-100 border-purple-300 text-purple-700'
            : isDark
              ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <Cloud className={cn(
          'w-4 h-4 transition-colors',
          isEnabled ? 'text-purple-400' : 'text-slate-400'
        )} />
        <span>Cloud</span>
        
        {/* Toggle indicator */}
        <div className={cn(
          'w-8 h-4 rounded-full transition-colors relative',
          isEnabled 
            ? 'bg-purple-500' 
            : isDark ? 'bg-slate-600' : 'bg-slate-300'
        )}>
          <div className={cn(
            'absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform shadow-sm',
            isEnabled ? 'translate-x-4' : 'translate-x-0.5'
          )} />
        </div>
        
        {/* Info dropdown trigger */}
        <div
          onClick={(e) => {
            e.stopPropagation()
            setShowDetails(!showDetails)
          }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              e.stopPropagation()
              setShowDetails(!showDetails)
            }
          }}
          className={cn(
            'ml-1 p-0.5 rounded hover:bg-black/10 cursor-pointer',
            isDark && 'hover:bg-white/10'
          )}
        >
          <ChevronDown className={cn(
            'w-3 h-3 transition-transform',
            showDetails && 'rotate-180'
          )} />
        </div>
      </button>
      
      {/* Recommendation badge for large workflows */}
      {isLargeWorkflow && !isEnabled && (
        <div className={cn(
          'absolute -top-2 -right-2 px-1.5 py-0.5 rounded-full text-[10px] font-bold',
          isHugeWorkflow
            ? 'bg-amber-500 text-white animate-pulse'
            : isDark
              ? 'bg-purple-500/80 text-white'
              : 'bg-purple-500 text-white'
        )}>
          {isHugeWorkflow ? 'NEEDED' : 'REC'}
        </div>
      )}
      
      {/* Details dropdown */}
      {showDetails && (
        <div className={cn(
          'absolute top-full left-0 mt-2 p-3 rounded-xl border shadow-xl z-50 w-64',
          isDark
            ? 'bg-slate-900 border-slate-700'
            : 'bg-white border-slate-200'
        )}>
          <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center gap-2">
              <div className={cn(
                'p-1.5 rounded-lg',
                isDark ? 'bg-purple-500/20' : 'bg-purple-100'
              )}>
                <Cloud className="w-4 h-4 text-purple-500" />
              </div>
              <div>
                <h4 className={cn(
                  'font-semibold text-sm',
                  isDark ? 'text-white' : 'text-slate-900'
                )}>
                  Cloud Compute
                </h4>
                <p className={cn(
                  'text-xs',
                  isDark ? 'text-slate-400' : 'text-slate-500'
                )}>
                  Run workflows on powerful servers
                </p>
              </div>
            </div>
            
            {/* Benefits */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs">
                <Zap className="w-3 h-3 text-amber-500" />
                <span className={isDark ? 'text-slate-300' : 'text-slate-600'}>
                  Handle 100,000+ nodes
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Cpu className="w-3 h-3 text-blue-500" />
                <span className={isDark ? 'text-slate-300' : 'text-slate-600'}>
                  No browser crashes
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Check className="w-3 h-3 text-green-500" />
                <span className={isDark ? 'text-slate-300' : 'text-slate-600'}>
                  Results saved automatically
                </span>
              </div>
            </div>
            
            {/* Cost estimate */}
            <div className={cn(
              'p-2 rounded-lg',
              isDark ? 'bg-slate-800' : 'bg-slate-50'
            )}>
              <div className="flex justify-between text-xs mb-1">
                <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>
                  Your workflow
                </span>
                <span className={cn(
                  'font-medium',
                  isDark ? 'text-white' : 'text-slate-900'
                )}>
                  {nodeCount} nodes
                </span>
              </div>
              <div className="flex justify-between text-xs mb-1">
                <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>
                  Estimated time
                </span>
                <span className={cn(
                  'font-medium',
                  isDark ? 'text-white' : 'text-slate-900'
                )}>
                  {formatDuration(estimatedTime)}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>
                  Credits
                </span>
                <span className={cn(
                  'font-semibold text-purple-500'
                )}>
                  {creditsNeeded} credits
                </span>
              </div>
            </div>
            
            {/* Warning for large workflows */}
            {isHugeWorkflow && !isEnabled && (
              <div className={cn(
                'p-2 rounded-lg text-xs',
                isDark ? 'bg-amber-500/20 text-amber-300' : 'bg-amber-50 text-amber-700'
              )}>
                ⚠️ Workflows with 100+ nodes may crash in-browser. Cloud compute recommended.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// Job status indicator component
interface CloudJobStatusProps {
  jobId: string
  onComplete: (result: any) => void
  onError: (error: string) => void
  onNodeProcessing?: (nodeName: string | null) => void // Callback when current node changes
}

export function CloudJobStatus({ jobId, onComplete, onError, onNodeProcessing }: CloudJobStatusProps) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'
  
  const [status, setStatus] = useState<string>('pending')
  const [progress, setProgress] = useState(0)
  const [currentNode, setCurrentNode] = useState<string | null>(null)
  const [elapsedTime, setElapsedTime] = useState(0)
  
  useEffect(() => {
    if (!jobId) return
    
    // Poll for status updates
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/workflows/cloud/${jobId}`)
        const data = await response.json()
        
        setStatus(data.status)
        setProgress(data.progress || 0)
        setElapsedTime(data.elapsedSeconds || 0)
        
        // Notify parent when current node changes
        if (data.currentNode !== currentNode) {
          setCurrentNode(data.currentNode)
          onNodeProcessing?.(data.currentNode)
        }
        
        if (data.status === 'completed') {
          clearInterval(pollInterval)
          onComplete(data.result)
        } else if (data.status === 'failed') {
          clearInterval(pollInterval)
          onError(data.errorMessage || 'Job failed')
        } else if (data.status === 'cancelled') {
          clearInterval(pollInterval)
          onError('Job was cancelled')
        }
      } catch (err) {
        console.error('Error polling job status:', err)
      }
    }, 2000) // Poll every 2 seconds
    
    return () => clearInterval(pollInterval)
  }, [jobId, onComplete, onError, onNodeProcessing, currentNode])
  
  const statusConfig = {
    pending: { icon: Loader2, color: 'text-slate-400', label: 'Queued...', animate: true },
    queued: { icon: Loader2, color: 'text-blue-400', label: 'Starting...', animate: true },
    running: { icon: Cpu, color: 'text-purple-400', label: 'Processing...', animate: true },
    completed: { icon: Check, color: 'text-green-400', label: 'Complete!', animate: false },
    failed: { icon: X, color: 'text-red-400', label: 'Failed', animate: false },
    cancelled: { icon: X, color: 'text-slate-400', label: 'Cancelled', animate: false }
  }
  
  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending
  const Icon = config.icon
  
  return (
    <div className={cn(
      'p-4 rounded-xl border',
      isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'
    )}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <div className={cn(
          'p-2 rounded-lg',
          isDark ? 'bg-purple-500/20' : 'bg-purple-100'
        )}>
          <Cloud className="w-5 h-5 text-purple-500" />
        </div>
        <div className="flex-1">
          <h4 className={cn(
            'font-semibold text-sm',
            isDark ? 'text-white' : 'text-slate-900'
          )}>
            Cloud Compute
          </h4>
          <div className="flex items-center gap-2">
            <Icon className={cn(
              'w-3 h-3',
              config.color,
              config.animate && 'animate-spin'
            )} />
            <span className={cn('text-xs', config.color)}>
              {config.label}
            </span>
          </div>
        </div>
        <span className={cn(
          'text-xs font-mono',
          isDark ? 'text-slate-400' : 'text-slate-500'
        )}>
          {Math.floor(elapsedTime / 60)}:{String(elapsedTime % 60).padStart(2, '0')}
        </span>
      </div>
      
      {/* Progress bar */}
      {status === 'running' && (
        <div className="space-y-2">
          <div className={cn(
            'h-2 rounded-full overflow-hidden',
            isDark ? 'bg-slate-700' : 'bg-slate-200'
          )}>
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between text-xs">
            <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>
              {currentNode ? `Processing: ${currentNode}` : 'Processing nodes...'}
            </span>
            <span className={cn('font-medium', isDark ? 'text-white' : 'text-slate-900')}>
              {progress}%
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
