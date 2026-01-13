'use client'

import { useState } from 'react'
import { Zap, Crown, Rocket, Check, Sparkles, Plus, Infinity as InfinityIcon } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { STRIPE_CONFIG } from '@/lib/stripe-config'
import { cn } from '@/lib/utils'

interface UpgradeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentTier?: 'free' | 'researcher' | 'clinical'
  workflowsUsed?: number
  workflowsLimit?: number
}

const PLANS = [
  {
    id: 'researcher',
    name: 'Researcher',
    price: '$49',
    yearlyPrice: '$470',
    period: '/month',
    priceId: STRIPE_CONFIG.products.researcher.prices.monthly,
    yearlyPriceId: STRIPE_CONFIG.products.researcher.prices.annual,
    icon: Rocket,
    color: 'indigo',
    popular: true,
    features: [
      'Unlimited workflow executions',
      'Priority AI processing',
      'All node types & AI Wizard',
      'HCP 1200 + Allen Atlas access',
      'Export to BIDS format',
      'Priority email support',
    ],
  },
  {
    id: 'clinical',
    name: 'Clinical',
    price: '$199',
    yearlyPrice: '$1,990',
    period: '/month',
    priceId: STRIPE_CONFIG.products.clinical.prices.monthly,
    yearlyPriceId: STRIPE_CONFIG.products.clinical.prices.annual,
    icon: Crown,
    color: 'amber',
    popular: false,
    features: [
      'Everything in Researcher',
      'HIPAA-compliant processing',
      'TBI deviation reports',
      'Patient comparison tools',
      'Custom reference datasets',
      'Dedicated phone support',
    ],
  },
]

const CREDIT_PACKS = STRIPE_CONFIG.premiumQueries.packs

export function UpgradeModal({ 
  open, 
  onOpenChange, 
  currentTier = 'free',
  workflowsUsed = 0,
  workflowsLimit = 3 
}: UpgradeModalProps) {
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('monthly')
  const [selectedCreditPack, setSelectedCreditPack] = useState<number | null>(null)
  
  const handleUpgrade = async (planId: string) => {
    const plan = PLANS.find(p => p.id === planId)
    if (!plan) return
    
    const interval = billingInterval === 'yearly' ? 'annual' : 'monthly'
    
    // Create Stripe checkout session
    try {
      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: planId, interval }),
      })
      
      if (response.ok) {
        const { url } = await response.json()
        if (url) {
          window.location.href = url
        }
      } else {
        // Fallback to settings page
        window.open('/dashboard/settings?tab=billing', '_blank')
      }
    } catch (error) {
      console.error('Checkout error:', error)
      window.open('/dashboard/settings?tab=billing', '_blank')
    }
    
    onOpenChange(false)
  }

  const handleBuyCredits = async (pack: typeof CREDIT_PACKS[number]) => {
    // Create Stripe checkout session for credit pack
    try {
      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          priceId: STRIPE_CONFIG.premiumQueries.priceId,
          quantity: pack.queries,
          discountedPrice: pack.price, // Send the pack's discounted price
          mode: 'payment', // One-time payment
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
    
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600">
              <Zap className="h-6 w-6 text-white" />
            </div>
            <div>
              <DialogTitle className="text-2xl">Upgrade Your Plan</DialogTitle>
              <DialogDescription>
                You&apos;ve used all {workflowsLimit} free workflow executions this month.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="px-6 pb-6">
          {/* Current usage indicator */}
          <div className="mb-6 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-red-100 dark:bg-red-900/40">
                <Zap className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="font-medium text-red-700 dark:text-red-300">
                  {workflowsUsed} of {workflowsLimit} workflows used
                </p>
                <p className="text-sm text-red-600 dark:text-red-400">
                  Upgrade or buy credits to continue running AI-powered analyses
                </p>
              </div>
            </div>
          </div>

          {/* Billing interval toggle */}
          <div className="flex items-center justify-center gap-3 mb-6">
            <button
              onClick={() => setBillingInterval('monthly')}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                billingInterval === 'monthly'
                  ? "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300"
                  : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              )}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingInterval('yearly')}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2",
                billingInterval === 'yearly'
                  ? "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300"
                  : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              )}
            >
              Yearly
              <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 text-xs rounded-full">
                Save 20%
              </span>
            </button>
          </div>

          {/* Plans grid */}
          <div className="grid md:grid-cols-2 gap-4 mb-8">
            {PLANS.map((plan) => {
              const Icon = plan.icon
              const isCurrentPlan = plan.id === currentTier
              const displayPrice = billingInterval === 'yearly' ? plan.yearlyPrice : plan.price
              const displayPeriod = billingInterval === 'yearly' ? '/year' : '/month'
              
              return (
                <div
                  key={plan.id}
                  className={cn(
                    "relative rounded-xl border-2 p-5 transition-all",
                    plan.popular 
                      ? "border-indigo-500 dark:border-indigo-400 shadow-lg shadow-indigo-500/10" 
                      : "border-slate-200 dark:border-slate-700",
                    isCurrentPlan && "opacity-50 cursor-not-allowed"
                  )}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-xs font-medium flex items-center gap-1">
                      <Sparkles className="h-3 w-3" />
                      Most Popular
                    </div>
                  )}
                  
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "p-2 rounded-lg",
                        plan.color === 'indigo' 
                          ? "bg-indigo-100 dark:bg-indigo-900/40" 
                          : "bg-amber-100 dark:bg-amber-900/40"
                      )}>
                        <Icon className={cn(
                          "h-5 w-5",
                          plan.color === 'indigo' 
                            ? "text-indigo-600 dark:text-indigo-400" 
                            : "text-amber-600 dark:text-amber-400"
                        )} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900 dark:text-white">{plan.name}</h3>
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl font-bold text-slate-900 dark:text-white">{displayPrice}</span>
                          <span className="text-sm text-slate-500">{displayPeriod}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <ul className="space-y-2 mb-5">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <Check className={cn(
                          "h-4 w-4 mt-0.5 flex-shrink-0",
                          plan.color === 'indigo' 
                            ? "text-indigo-500" 
                            : "text-amber-500"
                        )} />
                        <span className="text-slate-600 dark:text-slate-300">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => !isCurrentPlan && handleUpgrade(plan.id)}
                    disabled={isCurrentPlan}
                    className={cn(
                      "w-full py-2.5 px-4 rounded-lg font-medium text-sm transition-all",
                      plan.popular
                        ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700 shadow-lg shadow-indigo-500/25"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700",
                      isCurrentPlan && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    {isCurrentPlan ? 'Current Plan' : `Upgrade to ${plan.name}`}
                  </button>
                </div>
              )
            })}
          </div>

          {/* Or divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200 dark:border-slate-700" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-3 bg-white dark:bg-slate-900 text-slate-500">or just buy credits</span>
            </div>
          </div>

          {/* Credit packs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {CREDIT_PACKS.map((pack, idx) => (
              <button
                key={idx}
                onClick={() => handleBuyCredits(pack)}
                className={cn(
                  "relative p-4 rounded-xl border-2 transition-all hover:border-emerald-500 hover:shadow-lg hover:shadow-emerald-500/10",
                  selectedCreditPack === idx
                    ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20"
                    : "border-slate-200 dark:border-slate-700"
                )}
              >
                {pack.savings > 0 && (
                  <div className="absolute -top-2 -right-2 px-2 py-0.5 bg-emerald-500 text-white text-xs rounded-full font-medium">
                    -{pack.savings}%
                  </div>
                )}
                <div className="flex items-center justify-center gap-1 mb-2">
                  <Plus className="h-4 w-4 text-emerald-600" />
                  <span className="text-lg font-bold text-slate-900 dark:text-white">{pack.queries}</span>
                </div>
                <p className="text-xs text-slate-500 mb-2">queries</p>
                <p className="text-lg font-bold text-emerald-600">${pack.price}</p>
              </button>
            ))}
          </div>

          {/* Bottom note */}
          <div className="mt-6 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              <InfinityIcon className="h-4 w-4 inline mr-1" />
              Paid plans include <strong>unlimited</strong> workflow executions
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
              Cancel anytime. 14-day money-back guarantee.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default UpgradeModal
