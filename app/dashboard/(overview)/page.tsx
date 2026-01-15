'use client'

import { useAuth } from '@/contexts/auth-context'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  Sparkles, 
  Play, 
  Clock, 
  Plus,
  Workflow,
  Brain,
  Star,
  ArrowRight,
  Zap,
  BarChart3,
  Activity,
  FileText,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  PauseCircle,
  Layers,
  Settings,
  Upload,
  FolderOpen
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface SavedWorkflow {
  id: string
  name: string
  description: string
  lastRun: string
  status: 'active' | 'draft' | 'completed' | 'error'
  nodesCount?: number
  runsCount?: number
}

interface QuickAction {
  id: string
  title: string
  description: string
  icon: React.ElementType
  href: string
  color: string
}

const quickActions: QuickAction[] = [
  { id: 'wizard', title: 'AI Wizard', description: 'Build with AI', icon: Sparkles, href: '/dashboard/workflows/new?wizard=true', color: 'from-purple-500 to-pink-500' },
  { id: 'new', title: 'New Workflow', description: 'Start fresh', icon: Plus, href: '/dashboard/workflows/new', color: 'from-blue-500 to-cyan-500' },
  { id: 'upload', title: 'Upload Data', description: 'Import files', icon: Upload, href: '/dashboard/data-sources', color: 'from-emerald-500 to-teal-500' },
  { id: 'browse', title: 'Marketplace', description: 'Explore templates', icon: Layers, href: '/dashboard/marketplace', color: 'from-amber-500 to-orange-500' },
]

// Helper to format relative time
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`
  return date.toLocaleDateString()
}

function DashboardContent() {
  const { user, loading, refreshSubscription } = useAuth()
  const [workflows, setWorkflows] = useState<SavedWorkflow[]>([])
  const [workflowsLoading, setWorkflowsLoading] = useState(true)
  const [greeting, setGreeting] = useState('Welcome back')
  const [syncingSubscription, setSyncingSubscription] = useState(false)
  const searchParams = useSearchParams()
  const router = useRouter()
  
  const userTier = user?.subscription_tier || 'free'
  const firstName = user?.full_name?.split(' ')[0] || 'there'
  
  // Dynamic greeting based on time of day
  useEffect(() => {
    const hour = new Date().getHours()
    if (hour < 12) setGreeting('Good morning')
    else if (hour < 18) setGreeting('Good afternoon')
    else setGreeting('Good evening')
  }, [])

  // Fetch real workflows from API
  useEffect(() => {
    async function fetchWorkflows() {
      try {
        const response = await fetch('/api/workflows')
        if (response.ok) {
          const data = await response.json()
          // Map API response to SavedWorkflow format
          const mappedWorkflows: SavedWorkflow[] = (data.workflows || []).map((w: {
            id: string
            name: string
            description?: string
            status?: string
            updated_at?: string
            nodesCount?: number
            runsCount?: number
          }) => ({
            id: w.id,
            name: w.name,
            description: w.description || 'No description',
            lastRun: w.updated_at ? formatRelativeTime(w.updated_at) : 'Never',
            status: (w.status as SavedWorkflow['status']) || 'draft',
            nodesCount: w.nodesCount || 0,
            runsCount: w.runsCount || 0,
          }))
          setWorkflows(mappedWorkflows)
        }
      } catch (error) {
        console.error('Failed to fetch workflows:', error)
      } finally {
        setWorkflowsLoading(false)
      }
    }

    if (user) {
      fetchWorkflows()
    } else {
      setWorkflowsLoading(false)
    }
  }, [user])

  // Handle checkout success - sync subscription from Stripe
  useEffect(() => {
    const checkoutStatus = searchParams.get('checkout')
    const creditsParam = searchParams.get('credits')
    
    if (checkoutStatus === 'success' && user && !syncingSubscription) {
      setSyncingSubscription(true)
      console.log('[checkout] Success detected, syncing subscription...')
      
      // Sync subscription with Stripe
      refreshSubscription().then(() => {
        console.log('[checkout] Subscription synced')
        // Also refresh credits display
        window.dispatchEvent(new CustomEvent('neurodata:credits-refresh'))
        // Clear the URL params
        router.replace('/dashboard', { scroll: false })
      }).catch(err => {
        console.error('[checkout] Sync error:', err)
      }).finally(() => {
        setSyncingSubscription(false)
      })
    }
  }, [searchParams, user, refreshSubscription, router, syncingSubscription])

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'active': return { 
        icon: Play, 
        color: 'text-green-500', 
        bg: 'bg-green-500/10', 
        label: 'Running'
      }
      case 'completed': return { 
        icon: CheckCircle2, 
        color: 'text-blue-500', 
        bg: 'bg-blue-500/10', 
        label: 'Completed'
      }
      case 'error': return { 
        icon: AlertCircle, 
        color: 'text-red-500', 
        bg: 'bg-red-500/10', 
        label: 'Error'
      }
      case 'draft': 
      default: return { 
        icon: PauseCircle, 
        color: 'text-slate-400', 
        bg: 'bg-slate-500/10', 
        label: 'Draft'
      }
    }
  }

  // Calculate stats
  const stats = {
    totalWorkflows: workflows.length,
    activeWorkflows: workflows.filter(w => w.status === 'active').length,
    completedThisWeek: workflows.filter(w => w.status === 'completed').length,
    totalRuns: workflows.reduce((sum, w) => sum + (w.runsCount || 0), 0)
  }

  if (loading || workflowsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-8">
      {/* Compact Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {greeting}, <span className="text-primary">{firstName}</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage your workflows and explore premium models
          </p>
        </div>
        <div className={cn(
          'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
          userTier === 'free' ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400' :
          userTier === 'researcher' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' :
          'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
        )}>
          <Star className="w-3 h-3" />
          <span className="capitalize">{userTier} Plan</span>
        </div>
      </div>

      {/* Quick Actions Grid - Compact */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {quickActions.map((action) => (
          <Link
            key={action.id}
            href={action.href}
            className={cn(
              'group relative flex flex-col p-4 rounded-xl border transition-all duration-200',
              'bg-card hover:shadow-lg hover:shadow-primary/5 hover:border-primary/30',
              'dark:hover:shadow-primary/10'
            )}
          >
            <div className={cn(
              'w-9 h-9 rounded-lg flex items-center justify-center mb-3',
              'bg-gradient-to-br',
              action.color
            )}>
              <action.icon className="w-4 h-4 text-white" />
            </div>
            <h3 className="text-sm font-medium group-hover:text-primary transition-colors">
              {action.title}
            </h3>
            <p className="text-xs text-muted-foreground">{action.description}</p>
            <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity" />
          </Link>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-12 gap-4">
        {/* Left Column - Workflows */}
        <div className="col-span-12 lg:col-span-8 space-y-4">
          {/* Section Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Workflow className="w-4 h-4 text-muted-foreground" />
              <h2 className="text-sm font-medium">Recent Workflows</h2>
            </div>
            <Link 
              href="/dashboard/workflows" 
              className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
            >
              View all
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {/* Workflow List - Compact Cards */}
          <div className="space-y-2">
            {workflows.map((workflow) => {
              const status = getStatusConfig(workflow.status)
              const StatusIcon = status.icon
              
              return (
                <Link
                  key={workflow.id}
                  href={'/dashboard/workflows/' + workflow.id}
                  className="group flex items-center gap-4 p-3 bg-card border rounded-lg hover:border-primary/30 transition-all"
                >
                  {/* Status Icon */}
                  <div className={cn('p-2 rounded-lg', status.bg)}>
                    <StatusIcon className={cn('w-4 h-4', status.color)} />
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                        {workflow.name}
                      </h3>
                      <span className={cn(
                        'text-[10px] px-1.5 py-0.5 rounded-full font-medium',
                        status.bg, status.color
                      )}>
                        {status.label}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {workflow.description}
                    </p>
                  </div>

                  {/* Meta Info */}
                  <div className="hidden sm:flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Layers className="w-3 h-3" />
                      {workflow.nodesCount || 0}
                    </div>
                    <div className="flex items-center gap-1">
                      <Play className="w-3 h-3" />
                      {workflow.runsCount || 0}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {workflow.lastRun}
                    </div>
                  </div>

                  <ChevronRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-primary transition-colors" />
                </Link>
              )
            })}
          </div>

          {/* Empty State (if no workflows) */}
          {workflows.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center bg-card border rounded-lg">
              <FolderOpen className="w-10 h-10 text-muted-foreground/50 mb-3" />
              <h3 className="text-sm font-medium mb-1">No workflows yet</h3>
              <p className="text-xs text-muted-foreground mb-4">Get started by creating your first workflow</p>
              <Link
                href="/dashboard/workflows/new?wizard=true"
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-medium rounded-lg hover:bg-primary/90 transition-colors"
              >
                <Sparkles className="w-3 h-3" />
                Create with AI
              </Link>
            </div>
          )}
        </div>

        {/* Right Column - Stats & Activity */}
        <div className="col-span-12 lg:col-span-4 space-y-4">
          {/* Stats Card */}
          <div className="bg-card border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-medium">Overview</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-primary">{stats.totalWorkflows}</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Workflows</div>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-green-500">{stats.activeWorkflows}</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Active</div>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-blue-500">{stats.completedThisWeek}</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Completed</div>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold">{stats.totalRuns}</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Runs</div>
              </div>
            </div>
          </div>

          {/* Activity Feed */}
          <div className="bg-card border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-medium">Recent Activity</h3>
            </div>
            <div className="space-y-3">
              {workflows.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">
                  No recent activity
                </p>
              ) : (
                workflows.slice(0, 4).map((workflow) => {
                  const statusConfig = getStatusConfig(workflow.status)
                  return (
                    <ActivityItem
                      key={workflow.id}
                      icon={statusConfig.icon}
                      iconColor={statusConfig.color}
                      title={`${workflow.name} ${workflow.status === 'completed' ? 'completed' : workflow.status === 'active' ? 'running' : 'updated'}`}
                      time={workflow.lastRun}
                    />
                  )
                })
              )}
            </div>
          </div>

          {/* Quick Links */}
          <div className="bg-card border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-medium">Quick Links</h3>
            </div>
            <div className="space-y-1">
              <QuickLinkItem icon={Workflow} label="All Workflows" href="/dashboard/workflows" />
              <QuickLinkItem icon={FileText} label="Datasets" href="/dashboard/datasets" />
              <QuickLinkItem icon={Settings} label="Settings" href="/dashboard/settings" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Default export with Suspense wrapper for useSearchParams
export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  )
}

// Activity Item Component
function ActivityItem({ 
  icon: Icon, 
  iconColor, 
  title, 
  time 
}: { 
  icon: React.ElementType
  iconColor: string
  title: string
  time: string
}) {
  return (
    <div className="flex items-start gap-3">
      <div className={cn('p-1 rounded', iconColor.replace('text-', 'bg-').replace('500', '500/10'))}>
        <Icon className={cn('w-3 h-3', iconColor)} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-foreground truncate">{title}</p>
        <p className="text-[10px] text-muted-foreground">{time}</p>
      </div>
    </div>
  )
}

// Quick Link Item Component
function QuickLinkItem({ 
  icon: Icon, 
  label, 
  href 
}: { 
  icon: React.ElementType
  label: string
  href: string
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 px-2 py-1.5 -mx-2 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
      <ChevronRight className="w-3 h-3 ml-auto opacity-50" />
    </Link>
  )
}
