'use client'

import { useAuth } from '@/contexts/auth-context'
import { useState } from 'react'
import Link from 'next/link'
import { 
  Sparkles, 
  Play, 
  Clock, 
  Plus,
  Workflow,
  Brain,
  Lock,
  Star,
  ArrowRight,
  Zap,
  TrendingUp
} from 'lucide-react'

interface SavedWorkflow {
  id: string
  name: string
  description: string
  lastRun: string
  status: 'active' | 'draft' | 'completed'
}

interface PremiumModel {
  id: string
  name: string
  description: string
  tier: 'researcher' | 'clinical'
  category: string
}

const mockWorkflows: SavedWorkflow[] = [
  { id: '1', name: 'HCP fMRI Pipeline', description: 'Standard preprocessing for Human Connectome data', lastRun: '2 hours ago', status: 'active' },
  { id: '2', name: 'Cortical Parcellation', description: 'FreeSurfer-based cortical analysis', lastRun: '1 day ago', status: 'completed' },
  { id: '3', name: 'DTI Processing', description: 'Diffusion tensor imaging workflow', lastRun: '3 days ago', status: 'draft' },
]

const premiumModels: PremiumModel[] = [
  { id: '1', name: 'Advanced Connectome Mapper', description: 'High-resolution connectivity', tier: 'researcher', category: 'Connectivity' },
  { id: '2', name: 'Clinical Biomarker Suite', description: 'FDA-validated biomarkers', tier: 'clinical', category: 'Clinical' },
  { id: '3', name: 'Deep Learning Segmentation', description: 'AI brain segmentation', tier: 'researcher', category: 'Segmentation' },
  { id: '4', name: 'Longitudinal Analysis', description: 'Multi-timepoint tracking', tier: 'clinical', category: 'Analysis' },
]

export default function DashboardPage() {
  const { user, profile, loading } = useAuth()
  const [workflows] = useState<SavedWorkflow[]>(mockWorkflows)
  
  const userTier = profile?.subscription_tier || 'free'
  
  const hasAccessToModel = (modelTier: string) => {
    if (userTier === 'clinical') return true
    if (userTier === 'researcher' && modelTier === 'researcher') return true
    return false
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
      case 'completed': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
      case 'draft': return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome back{profile?.full_name ? ', ' + profile.full_name.split(' ')[0] : ''}
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your workflows and explore premium models
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-full">
          <Star className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium capitalize">{userTier} Plan</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link 
          href="/dashboard/workflows/wizard"
          className="group flex items-center gap-4 p-6 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-xl hover:border-primary/40 transition-all"
        >
          <div className="p-3 bg-primary/20 rounded-xl group-hover:bg-primary/30 transition-colors">
            <Sparkles className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-lg">AI Workflow Wizard</h3>
            <p className="text-sm text-muted-foreground">Let AI help you build the perfect pipeline</p>
          </div>
          <ArrowRight className="w-5 h-5 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
        </Link>

        <Link 
          href="/dashboard/workflows/new"
          className="group flex items-center gap-4 p-6 bg-card border rounded-xl hover:border-primary/40 transition-all"
        >
          <div className="p-3 bg-muted rounded-xl group-hover:bg-primary/10 transition-colors">
            <Plus className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-lg">Create Workflow</h3>
            <p className="text-sm text-muted-foreground">Start from scratch or use a template</p>
          </div>
          <ArrowRight className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity" />
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Workflow className="w-5 h-5" />
              My Workflows
            </h2>
            <Link href="/dashboard/workflows" className="text-sm text-primary hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="space-y-3">
            {workflows.map((workflow) => (
              <Link
                key={workflow.id}
                href={'/dashboard/workflows/' + workflow.id}
                className="block bg-card border rounded-xl p-4 hover:border-primary/40 transition-all group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-medium group-hover:text-primary transition-colors">
                        {workflow.name}
                      </h3>
                      <span className={'text-xs px-2 py-0.5 rounded-full ' + getStatusColor(workflow.status)}>
                        {workflow.status}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{workflow.description}</p>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {workflow.lastRun}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-card border rounded-xl p-4 space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Quick Stats
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold">{workflows.length}</div>
                <div className="text-xs text-muted-foreground">Workflows</div>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold">{workflows.filter(w => w.status === 'active').length}</div>
                <div className="text-xs text-muted-foreground">Active</div>
              </div>
            </div>
          </div>

          <div className="bg-card border rounded-xl p-4 space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Recent Activity
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-1.5"></div>
                <div>
                  <p className="text-foreground">HCP fMRI Pipeline completed</p>
                  <p className="text-xs text-muted-foreground">2 hours ago</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5"></div>
                <div>
                  <p className="text-foreground">New data imported</p>
                  <p className="text-xs text-muted-foreground">5 hours ago</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Brain className="w-5 h-5" />
            Premium Models
          </h2>
          {userTier === 'free' && (
            <Link href="/dashboard/settings" className="text-sm text-primary hover:underline flex items-center gap-1">
              Upgrade to unlock <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {premiumModels.map((model) => {
            const hasAccess = hasAccessToModel(model.tier)
            return (
              <div
                key={model.id}
                className={'relative bg-card border rounded-xl p-4 transition-all ' + (hasAccess ? 'hover:border-primary/40 cursor-pointer' : 'opacity-75')}
              >
                {!hasAccess && (
                  <div className="absolute top-3 right-3">
                    <Lock className="w-4 h-4 text-muted-foreground" />
                  </div>
                )}
                <div className={'inline-block text-xs px-2 py-0.5 rounded-full mb-2 ' + (model.tier === 'clinical' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400')}>
                  {model.category}
                </div>
                <h3 className="font-medium mb-1">{model.name}</h3>
                <p className="text-xs text-muted-foreground">{model.description}</p>
                {hasAccess ? (
                  <button className="mt-3 w-full text-sm py-1.5 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors">
                    Use Model
                  </button>
                ) : (
                  <div className="mt-3 text-xs text-center text-muted-foreground">
                    Requires {model.tier} plan
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
