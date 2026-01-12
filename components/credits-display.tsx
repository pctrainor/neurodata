'use client'

import { useState, useEffect } from 'react'
import { Zap, TrendingUp, Clock, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CreditsData {
  credits_balance: number
  monthly_allocation: number
  credits_used_this_month: number
  bonus_credits: number
  month_reset_date?: string
  tier_limits?: {
    max_nodes_per_workflow: number
    max_concurrent_workflows: number
    priority_queue: boolean
  }
}

interface CreditsDisplayProps {
  variant?: 'compact' | 'full'
  className?: string
}

export function CreditsDisplay({ variant = 'compact', className }: CreditsDisplayProps) {
  const [credits, setCredits] = useState<CreditsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchCredits() {
      try {
        // Check cache first
        const cached = localStorage.getItem('neurodata_credits')
        if (cached) {
          const { data, timestamp } = JSON.parse(cached)
          const isStale = Date.now() - timestamp > 60 * 1000 // 1 minute cache
          
          if (!isStale) {
            setCredits(data)
            setLoading(false)
            return
          }
        }

        const response = await fetch('/api/credits', { credentials: 'include' })
        if (response.ok) {
          const data = await response.json()
          setCredits(data)
          localStorage.setItem('neurodata_credits', JSON.stringify({
            data,
            timestamp: Date.now(),
          }))
        }
      } catch (error) {
        console.error('Failed to fetch credits:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchCredits()
  }, [])

  if (loading) {
    return (
      <div className={cn("animate-pulse bg-slate-200 dark:bg-slate-700 rounded-lg h-8 w-24", className)} />
    )
  }

  if (!credits) {
    return null
  }

  const percentUsed = (credits.credits_used_this_month / credits.monthly_allocation) * 100
  const isLow = credits.credits_balance < credits.monthly_allocation * 0.2
  const isCritical = credits.credits_balance < credits.monthly_allocation * 0.05

  const daysUntilReset = credits.month_reset_date 
    ? Math.ceil((new Date(credits.month_reset_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 0

  if (variant === 'compact') {
    return (
      <div 
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium",
          isCritical 
            ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
            : isLow 
              ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
              : "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400",
          className
        )}
      >
        <Zap className="h-4 w-4" />
        <span>{Math.round(credits.credits_balance)}</span>
        {isCritical && <AlertTriangle className="h-3 w-3" />}
      </div>
    )
  }

  return (
    <div className={cn("bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4", className)}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Zap className="h-4 w-4 text-indigo-500" />
          Compute Credits
        </h3>
        <span className={cn(
          "text-2xl font-bold",
          isCritical ? "text-red-600" : isLow ? "text-amber-600" : "text-indigo-600"
        )}>
          {Math.round(credits.credits_balance)}
        </span>
      </div>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
          <span>Used this month</span>
          <span>{Math.round(credits.credits_used_this_month)} / {credits.monthly_allocation}</span>
        </div>
        <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <div 
            className={cn(
              "h-full transition-all duration-500",
              percentUsed > 90 ? "bg-red-500" : percentUsed > 70 ? "bg-amber-500" : "bg-indigo-500"
            )}
            style={{ width: `${Math.min(percentUsed, 100)}%` }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
          <TrendingUp className="h-3 w-3" />
          <span>{credits.monthly_allocation}/mo allocation</span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
          <Clock className="h-3 w-3" />
          <span>Resets in {daysUntilReset} days</span>
        </div>
      </div>

      {/* Warning */}
      {isLow && (
        <div className={cn(
          "mt-3 p-2 rounded-lg text-xs flex items-center gap-2",
          isCritical 
            ? "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400"
            : "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400"
        )}>
          <AlertTriangle className="h-3 w-3 flex-shrink-0" />
          <span>
            {isCritical 
              ? "Credits almost depleted! Upgrade or buy more."
              : "Running low on credits this month."}
          </span>
        </div>
      )}

      {/* Bonus credits */}
      {credits.bonus_credits > 0 && (
        <div className="mt-2 text-xs text-emerald-600 dark:text-emerald-400">
          +{Math.round(credits.bonus_credits)} bonus credits
        </div>
      )}
    </div>
  )
}

// Hook for consuming credits
export function useCredits() {
  const [consuming, setConsuming] = useState(false)

  const consumeCredits = async (
    amount: number,
    options?: {
      workflow_id?: string
      action_type?: string
      resource_type?: string
      resource_details?: Record<string, unknown>
    }
  ): Promise<{ success: boolean; error?: string; new_balance?: number }> => {
    setConsuming(true)
    
    try {
      const response = await fetch('/api/credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ amount, ...options }),
      })

      const data = await response.json()

      if (!response.ok) {
        return { 
          success: false, 
          error: data.error || 'Failed to consume credits',
        }
      }

      // Invalidate cache
      localStorage.removeItem('neurodata_credits')

      return { 
        success: true, 
        new_balance: data.new_balance,
      }
    } catch (error) {
      return { 
        success: false, 
        error: 'Network error',
      }
    } finally {
      setConsuming(false)
    }
  }

  const calculateWorkflowCost = (nodes: Array<{ type: string; data?: { model?: string } }>): number => {
    let cost = 0
    
    for (const node of nodes) {
      switch (node.type) {
        case 'brainNode':
          const model = node.data?.model || 'gemini-2.0-flash'
          if (model.includes('gpt-4o') && !model.includes('mini')) cost += 5
          else if (model.includes('sonnet') || model.includes('opus')) cost += 5
          else if (model.includes('gpt-4o-mini')) cost += 2
          else if (model.includes('haiku')) cost += 1.5
          else cost += 1 // Default Gemini Flash
          break
        case 'preprocessingNode':
          cost += 0.5
          break
        case 'analysisNode':
          cost += 0.5
          break
        case 'referenceDatasetNode':
          cost += 0.5
          break
        case 'outputNode':
          cost += 0.25
          break
        default:
          cost += 0.1
      }
    }
    
    return cost
  }

  return { consumeCredits, consuming, calculateWorkflowCost }
}
