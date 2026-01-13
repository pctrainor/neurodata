'use client'

import { useState, useEffect, useCallback, createContext, useContext } from 'react'
import { Zap, TrendingUp, Clock, AlertTriangle, Infinity as InfinityIcon, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { STRIPE_CONFIG } from '@/lib/stripe-config'

interface CreditsData {
  credits_balance: number
  monthly_allocation: number
  credits_used_this_month: number
  bonus_credits: number
  month_reset_date?: string
  // New fields for workflow execution tracking
  workflows_executed_this_month: number
  workflows_limit: number // -1 for unlimited
  subscription_tier: 'free' | 'researcher' | 'clinical'
  tier_limits?: {
    max_nodes_per_workflow: number
    max_concurrent_workflows: number
    priority_queue: boolean
  }
}

// Context for global credits state refresh
interface CreditsContextType {
  refreshCredits: () => void
}

const CreditsContext = createContext<CreditsContextType | null>(null)

export function useCreditsContext() {
  return useContext(CreditsContext)
}

interface CreditsDisplayProps {
  variant?: 'compact' | 'full'
  className?: string
}

export function CreditsDisplay({ variant = 'compact', className }: CreditsDisplayProps) {
  const [credits, setCredits] = useState<CreditsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [showTopUpModal, setShowTopUpModal] = useState(false)

  const fetchCredits = useCallback(async (forceRefresh = false) => {
    try {
      // Always fetch fresh data from API - don't rely on localStorage cache
      // This ensures each user sees their own credits
      const response = await fetch('/api/credits', { credentials: 'include' })
      if (response.ok) {
        const data = await response.json()
        setCredits(data)
        // Cache is only used for quick re-renders within the same session
        // We don't check the cache on initial load anymore
        if (!forceRefresh) {
          sessionStorage.setItem('neurodata_credits_session', JSON.stringify({
            data,
            timestamp: Date.now(),
          }))
        }
      } else {
        console.error('Failed to fetch credits:', response.status)
      }
    } catch (error) {
      console.error('Failed to fetch credits:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  // Subscribe to credits refresh events
  useEffect(() => {
    const handleRefresh = () => {
      fetchCredits(true)
    }
    window.addEventListener('neurodata:credits-refresh', handleRefresh)
    return () => window.removeEventListener('neurodata:credits-refresh', handleRefresh)
  }, [fetchCredits])

  useEffect(() => {
    fetchCredits()
  }, [fetchCredits])

  if (loading) {
    return (
      <div className={cn("animate-pulse bg-slate-200 dark:bg-slate-700 rounded-lg h-8 w-24", className)} />
    )
  }

  if (!credits) {
    return null
  }

  // Calculate workflow executions remaining
  const workflowsLimit = credits.workflows_limit ?? 3 // Default to free tier
  const workflowsUsed = credits.workflows_executed_this_month ?? 0
  const isUnlimited = workflowsLimit === -1
  const workflowsRemaining = isUnlimited ? -1 : Math.max(0, workflowsLimit - workflowsUsed)
  
  // Determine status
  const isLow = !isUnlimited && workflowsRemaining <= 1 && workflowsRemaining > 0
  const isCritical = !isUnlimited && workflowsRemaining === 0

  // Calculate percent used for progress bar (only for limited tiers)
  const percentUsed = isUnlimited ? 0 : (workflowsUsed / workflowsLimit) * 100

  const daysUntilReset = credits.month_reset_date 
    ? Math.ceil((new Date(credits.month_reset_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : Math.ceil((new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).getTime() - Date.now()) / (1000 * 60 * 60 * 24))

  // Handle buying credits
  const handleBuyCredits = async (queries: number, price: number) => {
    try {
      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          priceId: STRIPE_CONFIG.premiumQueries.priceId,
          quantity: queries,
          discountedPrice: price, // Send the pack's discounted price
          mode: 'payment',
        }),
      })
      
      if (response.ok) {
        const { url } = await response.json()
        if (url) {
          window.location.href = url
        }
      }
    } catch (error) {
      console.error('Credit purchase error:', error)
    }
    
    setShowTopUpModal(false)
  }

  // Credit packs from config
  const creditPacks = STRIPE_CONFIG.premiumQueries.packs

  if (variant === 'compact') {
    return (
      <>
        <button 
          onClick={() => !isUnlimited && setShowTopUpModal(true)}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
            isCritical 
              ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50"
              : isLow 
                ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-900/50"
                : "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-200 dark:hover:bg-indigo-900/50",
            !isUnlimited && "cursor-pointer",
            isUnlimited && "cursor-default",
            className
          )}
          title={isUnlimited 
            ? `Unlimited workflows (${credits.subscription_tier} plan)` 
            : `${workflowsRemaining} workflow${workflowsRemaining !== 1 ? 's' : ''} remaining - Click to top up`
          }
        >
          <Zap className="h-4 w-4" />
          {isUnlimited ? (
            <span className="flex items-center gap-1">
              <InfinityIcon className="h-4 w-4" />
            </span>
          ) : (
            <span>{workflowsRemaining}</span>
          )}
          {isCritical && <AlertTriangle className="h-3 w-3" />}
          {!isUnlimited && workflowsRemaining <= 1 && <Plus className="h-3 w-3 opacity-60" />}
        </button>

        {/* Quick Top-Up Modal */}
        <Dialog open={showTopUpModal} onOpenChange={setShowTopUpModal}>
          <DialogContent className="max-w-md w-full">
            <DialogHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600">
                  <Zap className="h-5 w-5 text-white" />
                </div>
                <div>
                  <DialogTitle>Top Up Credits</DialogTitle>
                  <DialogDescription>
                    Buy additional workflow executions
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="px-6 pb-6">
              {/* Current balance */}
              <div className="mb-4 p-3 rounded-lg bg-slate-100 dark:bg-slate-800 text-center">
                <p className="text-sm text-slate-500 dark:text-slate-400">Current Balance</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {workflowsRemaining} <span className="text-sm font-normal text-slate-500">remaining</span>
                </p>
              </div>

              {/* Credit packs */}
              <div className="grid grid-cols-2 gap-3">
                {creditPacks.map((pack, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleBuyCredits(pack.queries, pack.price)}
                    className={cn(
                      "relative p-4 rounded-xl border-2 transition-all hover:border-emerald-500 hover:shadow-lg hover:shadow-emerald-500/10",
                      "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                    )}
                  >
                    {pack.savings > 0 && (
                      <div className="absolute -top-2 -right-2 px-2 py-0.5 bg-emerald-500 text-white text-xs rounded-full font-medium">
                        -{pack.savings}%
                      </div>
                    )}
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Plus className="h-4 w-4 text-emerald-600" />
                      <span className="text-xl font-bold text-slate-900 dark:text-white">{pack.queries}</span>
                    </div>
                    <p className="text-xs text-slate-500 mb-2">workflows</p>
                    <p className="text-lg font-bold text-emerald-600">${pack.price}</p>
                  </button>
                ))}
              </div>

              <p className="text-xs text-center text-slate-400 mt-4">
                Credits never expire. One-time purchase.
              </p>
            </div>
          </DialogContent>
        </Dialog>
      </>
    )
  }

  return (
    <div className={cn("bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4", className)}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Zap className="h-4 w-4 text-indigo-500" />
          Workflow Executions
        </h3>
        <span className={cn(
          "text-2xl font-bold flex items-center gap-1",
          isCritical ? "text-red-600" : isLow ? "text-amber-600" : "text-indigo-600"
        )}>
          {isUnlimited ? (
            <InfinityIcon className="h-6 w-6" />
          ) : (
            workflowsRemaining
          )}
        </span>
      </div>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
          <span>Used this month</span>
          <span>
            {workflowsUsed} / {isUnlimited ? '∞' : workflowsLimit}
          </span>
        </div>
        <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <div 
            className={cn(
              "h-full transition-all duration-500",
              isUnlimited 
                ? "bg-indigo-500"
                : percentUsed > 90 ? "bg-red-500" : percentUsed > 70 ? "bg-amber-500" : "bg-indigo-500"
            )}
            style={{ width: isUnlimited ? '100%' : `${Math.min(percentUsed, 100)}%` }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
          <TrendingUp className="h-3 w-3" />
          <span>{isUnlimited ? 'Unlimited' : `${workflowsLimit}/mo limit`}</span>
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
