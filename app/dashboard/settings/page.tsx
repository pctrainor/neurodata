'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { STRIPE_CONFIG, SubscriptionTier } from '@/lib/stripe-config'
import { 
  User,
  Bell,
  Shield,
  Key,
  Moon,
  Sun,
  Monitor,
  Mail,
  Download,
  Database,
  Trash2,
  Save,
  CheckCircle,
  CreditCard,
  Sparkles,
  Check,
  Crown,
  Zap,
  Building2,
  AlertTriangle,
  Loader2,
  X
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// Toggle Switch Component
function Toggle({ 
  checked, 
  onChange, 
  disabled = false 
}: { 
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2",
        checked ? "bg-indigo-600" : "bg-slate-200 dark:bg-slate-700",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      <span
        className={cn(
          "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform",
          checked ? "translate-x-5" : "translate-x-0"
        )}
      />
    </button>
  )
}

// Settings Section Component
function SettingsSection({ 
  title, 
  description, 
  children 
}: { 
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <div className="py-6 border-b border-slate-200 dark:border-slate-700 last:border-0">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">{description}</p>
      </div>
      {children}
    </div>
  )
}

// Settings Item Component
function SettingsItem({ 
  icon: Icon, 
  label, 
  description, 
  children 
}: { 
  icon: React.ComponentType<{ className?: string }>
  label: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
          <Icon className="h-5 w-5 text-slate-600 dark:text-slate-400" />
        </div>
        <div>
          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{label}</p>
          {description && (
            <p className="text-xs text-slate-500 dark:text-slate-400">{description}</p>
          )}
        </div>
      </div>
      {children}
    </div>
  )
}

export default function SettingsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system')
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [newDatasetAlerts, setNewDatasetAlerts] = useState(true)
  const [weeklyDigest, setWeeklyDigest] = useState(false)
  const [autoSync, setAutoSync] = useState(true)
  const [dataRetention, setDataRetention] = useState('30')
  const [saved, setSaved] = useState(false)
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'annual'>('monthly')
  const [isUpgrading, setIsUpgrading] = useState(false)
  const [subscriptionTier, setSubscriptionTier] = useState<SubscriptionTier>('free')
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null)
  const [isLoadingSubscription, setIsLoadingSubscription] = useState(true)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // Handle account deletion
  const handleDeleteAccount = async () => {
    setIsDeleting(true)
    setDeleteError(null)
    
    try {
      const response = await fetch('/api/account/delete', {
        method: 'DELETE',
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete account')
      }
      
      // Redirect to home page after deletion
      router.push('/')
    } catch (error) {
      console.error('Delete account error:', error)
      setDeleteError(error instanceof Error ? error.message : 'Failed to delete account')
      setIsDeleting(false)
    }
  }

  // Cache key for localStorage
  const SUBSCRIPTION_CACHE_KEY = 'neurodata_subscription'
  const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

  // Fetch subscription status from Stripe on mount (with caching)
  useEffect(() => {
    async function fetchSubscription() {
      // Check cache first
      try {
        const cached = localStorage.getItem(SUBSCRIPTION_CACHE_KEY)
        if (cached) {
          const { tier, status, timestamp } = JSON.parse(cached)
          const isStale = Date.now() - timestamp > CACHE_TTL_MS
          
          // Use cached value immediately for fast UI
          setSubscriptionTier(tier || 'free')
          setSubscriptionStatus(status)
          
          // If cache is fresh, don't refetch
          if (!isStale) {
            setIsLoadingSubscription(false)
            return
          }
        }
      } catch {
        // Ignore cache errors
      }

      // Fetch from Stripe
      try {
        const response = await fetch('/api/stripe/subscription', {
          credentials: 'include',
        })
        if (response.ok) {
          const data = await response.json()
          const newTier = data.tier || 'free'
          const newStatus = data.status
          
          // Only update state if actually different
          setSubscriptionTier(prev => prev !== newTier ? newTier : prev)
          setSubscriptionStatus(prev => prev !== newStatus ? newStatus : prev)
          
          // Update cache
          localStorage.setItem(SUBSCRIPTION_CACHE_KEY, JSON.stringify({
            tier: newTier,
            status: newStatus,
            timestamp: Date.now(),
          }))
        }
      } catch (error) {
        console.error('Failed to fetch subscription:', error)
      } finally {
        setIsLoadingSubscription(false)
      }
    }

    if (user) {
      fetchSubscription()
    } else {
      setIsLoadingSubscription(false)
    }
  }, [user])

  const currentTier = subscriptionTier || user?.subscription_tier || 'free'

  const handleSave = () => {
    // Simulate save
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const handleUpgrade = async (tier: 'researcher' | 'clinical') => {
    setIsUpgrading(true)
    
    try {
      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for session auth
        body: JSON.stringify({
          tier,
          interval: billingInterval,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session')
      }

      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url
      } else {
        throw new Error('No checkout URL returned')
      }
    } catch (error) {
      console.error('Checkout error:', error)
      alert(error instanceof Error ? error.message : 'Failed to start checkout. Please try again.')
    } finally {
      setIsUpgrading(false)
    }
  }

  const userInitial = user?.full_name?.charAt(0) || user?.email?.charAt(0)?.toUpperCase() || 'N'
  const userName = user?.full_name || 'NeuroData User'
  const userEmail = user?.email || 'Not signed in'

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Settings</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage your account preferences and subscription
          </p>
        </div>
        
        {/* Profile Section */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xl font-bold">
                {userInitial}
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  {userName}
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {userEmail}
                </p>
                <Badge className="mt-2 capitalize flex items-center gap-1.5" variant={currentTier === 'free' ? 'secondary' : 'default'}>
                  {isLoadingSubscription ? (
                    <><Loader2 className="h-3 w-3 animate-spin" /> Loading...</>
                  ) : (
                    <>
                      {currentTier === 'free' && <Zap className="h-3 w-3" />}
                      {currentTier === 'researcher' && <Crown className="h-3 w-3" />}
                      {currentTier === 'clinical' && <Building2 className="h-3 w-3" />}
                      {currentTier} Plan
                      {subscriptionStatus && subscriptionStatus !== 'active' && ` (${subscriptionStatus})`}
                    </>
                  )}
                </Badge>
              </div>
              <Button variant="outline">Edit Profile</Button>
            </div>
          </CardContent>
        </Card>

        {/* Subscription Plans */}
        <Card className="mb-6 border-2 border-indigo-200 dark:border-indigo-800">
          <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950 dark:to-purple-950">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-indigo-600" />
                  Subscription Plans
                </CardTitle>
                <CardDescription className="mt-1">
                  Unlock more workflows, datasets, and advanced features
                </CardDescription>
              </div>
              <div className="flex items-center gap-2 bg-white dark:bg-slate-800 rounded-lg p-1">
                <button
                  onClick={() => setBillingInterval('monthly')}
                  className={cn(
                    "px-3 py-1.5 text-sm font-medium rounded-md transition-all",
                    billingInterval === 'monthly'
                      ? "bg-indigo-600 text-white"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                  )}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setBillingInterval('annual')}
                  className={cn(
                    "px-3 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-1",
                    billingInterval === 'annual'
                      ? "bg-indigo-600 text-white"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                  )}
                >
                  Annual
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Save 20%</Badge>
                </button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid md:grid-cols-3 gap-4">
              {/* Free Tier */}
              <div className={cn(
                "relative p-5 rounded-xl border-2 transition-all",
                currentTier === 'free' 
                  ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30" 
                  : "border-slate-200 dark:border-slate-700"
              )}>
                {currentTier === 'free' && (
                  <Badge className="absolute -top-2 left-4 bg-indigo-600">Current Plan</Badge>
                )}
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Zap className="h-5 w-5 text-slate-500" />
                    Free
                  </h3>
                  <p className="text-2xl font-bold mt-2">
                    $0<span className="text-sm font-normal text-slate-500">/mo</span>
                  </p>
                </div>
                <ul className="space-y-2 mb-6">
                  {STRIPE_CONFIG.products.free.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                      <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button variant="outline" disabled className="w-full">
                  {currentTier === 'free' ? 'Current Plan' : 'Downgrade'}
                </Button>
              </div>

              {/* Researcher Tier */}
              <div className={cn(
                "relative p-5 rounded-xl border-2 transition-all",
                currentTier === 'researcher' 
                  ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30" 
                  : "border-slate-200 dark:border-slate-700 hover:border-indigo-300"
              )}>
                {currentTier === 'researcher' && (
                  <Badge className="absolute -top-2 left-4 bg-indigo-600">Current Plan</Badge>
                )}
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Crown className="h-5 w-5 text-amber-500" />
                    Researcher
                  </h3>
                  <p className="text-2xl font-bold mt-2">
                    ${billingInterval === 'annual' ? '39' : '49'}
                    <span className="text-sm font-normal text-slate-500">/mo</span>
                  </p>
                  {billingInterval === 'annual' && (
                    <p className="text-xs text-green-600">Billed annually ($470/yr)</p>
                  )}
                </div>
                <ul className="space-y-2 mb-6">
                  {STRIPE_CONFIG.products.researcher.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                      <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button 
                  className="w-full bg-indigo-600 hover:bg-indigo-700"
                  disabled={currentTier === 'researcher' || isUpgrading}
                  onClick={() => handleUpgrade('researcher')}
                >
                  {isUpgrading ? 'Processing...' : currentTier === 'researcher' ? 'Current Plan' : 'Upgrade'}
                </Button>
              </div>

              {/* Clinical Tier */}
              <div className={cn(
                "relative p-5 rounded-xl border-2 transition-all",
                currentTier === 'clinical' 
                  ? "border-purple-500 bg-purple-50/50 dark:bg-purple-950/30" 
                  : "border-slate-200 dark:border-slate-700 hover:border-purple-300"
              )}>
                <Badge className="absolute -top-2 right-4 bg-gradient-to-r from-purple-600 to-pink-600">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Most Popular
                </Badge>
                {currentTier === 'clinical' && (
                  <Badge className="absolute -top-2 left-4 bg-purple-600">Current Plan</Badge>
                )}
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-purple-500" />
                    Clinical
                  </h3>
                  <p className="text-2xl font-bold mt-2">
                    ${billingInterval === 'annual' ? '166' : '199'}
                    <span className="text-sm font-normal text-slate-500">/mo</span>
                  </p>
                  {billingInterval === 'annual' && (
                    <p className="text-xs text-green-600">Billed annually ($1,990/yr)</p>
                  )}
                </div>
                <ul className="space-y-2 mb-6">
                  {STRIPE_CONFIG.products.clinical.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                      <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button 
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                  disabled={currentTier === 'clinical' || isUpgrading}
                  onClick={() => handleUpgrade('clinical')}
                >
                  {isUpgrading ? 'Processing...' : currentTier === 'clinical' ? 'Current Plan' : 'Upgrade'}
                </Button>
              </div>
            </div>

            {/* Coupon Banner */}
            <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                    <Sparkles className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-green-900 dark:text-green-100">
                      Welcome Offer: 20% off for 3 months!
                    </p>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      Use code <code className="bg-green-200 dark:bg-green-800 px-1.5 py-0.5 rounded font-mono">WELCOME20</code> at checkout
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Settings Cards */}
        <Card>
          <CardContent className="p-6">
            {/* Appearance */}
            <SettingsSection 
              title="Appearance" 
              description="Customize how NeuroData looks on your device"
            >
              <div className="grid grid-cols-3 gap-3">
                {(['light', 'dark', 'system'] as const).map((option) => (
                  <button
                    key={option}
                    onClick={() => setTheme(option)}
                    className={cn(
                      "flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all",
                      theme === option 
                        ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20" 
                        : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                    )}
                  >
                    {option === 'light' && <Sun className="h-6 w-6 text-amber-500" />}
                    {option === 'dark' && <Moon className="h-6 w-6 text-indigo-500" />}
                    {option === 'system' && <Monitor className="h-6 w-6 text-slate-500" />}
                    <span className="text-sm font-medium capitalize">{option}</span>
                  </button>
                ))}
              </div>
            </SettingsSection>
            
            {/* Notifications */}
            <SettingsSection 
              title="Notifications" 
              description="Configure how you receive updates and alerts"
            >
              <div className="space-y-1">
                <SettingsItem 
                  icon={Mail} 
                  label="Email Notifications"
                  description="Receive important updates via email"
                >
                  <Toggle checked={emailNotifications} onChange={setEmailNotifications} />
                </SettingsItem>
                
                <SettingsItem 
                  icon={Bell} 
                  label="New Dataset Alerts"
                  description="Get notified when new datasets match your interests"
                >
                  <Toggle checked={newDatasetAlerts} onChange={setNewDatasetAlerts} />
                </SettingsItem>
                
                <SettingsItem 
                  icon={Mail} 
                  label="Weekly Digest"
                  description="Summary of platform activity every week"
                >
                  <Toggle checked={weeklyDigest} onChange={setWeeklyDigest} />
                </SettingsItem>
              </div>
            </SettingsSection>
            
            {/* Data & Sync */}
            <SettingsSection 
              title="Data & Sync" 
              description="Manage data synchronization and storage"
            >
              <div className="space-y-1">
                <SettingsItem 
                  icon={Database} 
                  label="Auto-sync Data Sources"
                  description="Automatically sync data from connected sources"
                >
                  <Toggle checked={autoSync} onChange={setAutoSync} />
                </SettingsItem>
                
                <SettingsItem 
                  icon={Download} 
                  label="Data Retention"
                  description="How long to keep cached data"
                >
                  <select
                    value={dataRetention}
                    onChange={(e) => setDataRetention(e.target.value)}
                    className="px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
                  >
                    <option value="7">7 days</option>
                    <option value="30">30 days</option>
                    <option value="90">90 days</option>
                    <option value="365">1 year</option>
                    <option value="forever">Forever</option>
                  </select>
                </SettingsItem>
              </div>
            </SettingsSection>
            
            {/* Security */}
            <SettingsSection 
              title="Security" 
              description="Manage your account security settings"
            >
              <div className="space-y-3">
                <Button variant="outline" className="w-full justify-start">
                  <Key className="h-4 w-4 mr-2" />
                  Change Password
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Shield className="h-4 w-4 mr-2" />
                  Two-Factor Authentication
                </Button>
              </div>
            </SettingsSection>
            
            {/* Danger Zone */}
            <SettingsSection 
              title="Danger Zone" 
              description="Irreversible and destructive actions"
            >
              <div className="p-4 border border-red-200 dark:border-red-900 rounded-lg bg-red-50 dark:bg-red-900/20">
                <div className="flex items-start gap-3">
                  <Trash2 className="h-5 w-5 text-red-500 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-900 dark:text-red-100">
                      Delete Account
                    </p>
                    <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                      Permanently delete your account and all associated data. This action cannot be undone.
                    </p>
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      className="mt-3"
                      onClick={() => setShowDeleteConfirm(true)}
                    >
                      Delete Account
                    </Button>
                  </div>
                </div>
              </div>
            </SettingsSection>
          </CardContent>
        </Card>
        
        {/* Save Button */}
        <div className="mt-6 flex justify-end gap-3">
          {saved && (
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <CheckCircle className="h-5 w-5" />
              <span className="text-sm font-medium">Settings saved!</span>
            </div>
          )}
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </div>
      
      {/* Delete Account Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 p-6 max-w-md w-full mx-4">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-full bg-red-100 dark:bg-red-900/30">
                <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Delete Account?
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
                  This will permanently delete your account, all workflows, settings, and data. 
                  This action cannot be undone.
                </p>
                
                {deleteError && (
                  <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
                    <p className="text-sm text-red-700 dark:text-red-300">{deleteError}</p>
                  </div>
                )}
                
                <div className="flex gap-3 mt-6">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowDeleteConfirm(false)
                      setDeleteError(null)
                    }}
                    disabled={isDeleting}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleDeleteAccount}
                    disabled={isDeleting}
                    className="flex-1"
                  >
                    {isDeleting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      'Yes, Delete'
                    )}
                  </Button>
                </div>
              </div>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                disabled={isDeleting}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
