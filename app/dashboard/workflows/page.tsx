'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Plus,
  Search,
  Filter,
  Play,
  Pause,
  Clock,
  CheckCircle2,
  XCircle,
  MoreVertical,
  Copy,
  Trash2,
  Share2,
  Brain,
  Workflow as WorkflowIcon,
  Calendar,
  Cpu,
  Zap
} from 'lucide-react'
import { Workflow, WorkflowStatus } from '@/types/neuro'
import { createBrowserClient } from '@/lib/supabase'
import { cn } from '@/lib/utils'

// Status badge styling
const statusConfig: Record<WorkflowStatus, { 
  label: string
  color: string
  bgColor: string
  icon: React.ElementType
}> = {
  draft: { label: 'Draft', color: 'text-slate-400', bgColor: 'bg-slate-500/10', icon: Clock },
  ready: { label: 'Ready', color: 'text-blue-400', bgColor: 'bg-blue-500/10', icon: CheckCircle2 },
  running: { label: 'Running', color: 'text-green-400', bgColor: 'bg-green-500/10', icon: Play },
  paused: { label: 'Paused', color: 'text-yellow-400', bgColor: 'bg-yellow-500/10', icon: Pause },
  completed: { label: 'Completed', color: 'text-emerald-400', bgColor: 'bg-emerald-500/10', icon: CheckCircle2 },
  failed: { label: 'Failed', color: 'text-red-400', bgColor: 'bg-red-500/10', icon: XCircle },
  cancelled: { label: 'Cancelled', color: 'text-slate-400', bgColor: 'bg-slate-500/10', icon: XCircle },
}

function WorkflowCard({ workflow }: { workflow: Workflow }) {
  const [showMenu, setShowMenu] = useState(false)
  const status = statusConfig[workflow.status]
  const StatusIcon = status.icon

  return (
    <div
      className="group relative bg-card rounded-lg border border-border hover:border-foreground/20 transition-all duration-200 overflow-hidden animate-in fade-in slide-in-from-bottom-2"
    >
      {/* Main content */}
      <Link href={`/dashboard/workflows/${workflow.id}`} className="block p-3 sm:p-4">
        {/* Header */}
        <div className="flex items-start gap-2.5 sm:gap-3">
          <div className="p-2 sm:p-2.5 rounded-lg bg-primary/10 shrink-0">
            <WorkflowIcon className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0 overflow-hidden">
            <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 flex-wrap">
              <h3 className="text-xs sm:text-sm font-medium text-foreground truncate" title={workflow.name}>
                {workflow.name}
              </h3>
              {workflow.is_template && (
                <span className="shrink-0 px-1 sm:px-1.5 py-0.5 rounded text-[8px] sm:text-[9px] font-medium bg-purple-500/10 text-purple-400 uppercase">
                  Template
                </span>
              )}
            </div>
            <p className="text-[10px] sm:text-xs text-muted-foreground line-clamp-2">
              {workflow.description || 'No description'}
            </p>
          </div>
        </div>

        {/* Status & Meta - Simplified */}
        <div className="mt-2.5 sm:mt-3 flex items-center justify-between">
          <span className={cn(
            'inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-medium',
            status.bgColor, status.color
          )}>
            <StatusIcon className="w-2 h-2 sm:w-2.5 sm:h-2.5" />
            {status.label}
          </span>
          
          <div className="flex items-center gap-2 sm:gap-3 text-[10px] sm:text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Brain className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
              <span>{workflow.nodes?.length || 0}</span>
            </div>
            <span className="hidden xs:inline">{new Date(workflow.updated_at).toLocaleDateString()}</span>
          </div>
        </div>
      </Link>

      {/* Actions menu - Always visible on mobile, hover on desktop */}
      <div className="absolute top-2.5 sm:top-3 right-2.5 sm:right-3">
        <button
          onClick={(e) => {
            e.preventDefault()
            setShowMenu(!showMenu)
          }}
          className="p-1.5 rounded-lg sm:opacity-0 group-hover:opacity-100 hover:bg-muted transition-all"
          title="More actions"
          aria-label="More actions"
        >
          <MoreVertical className="w-4 h-4 text-muted-foreground" />
        </button>
        
        {showMenu && (
          <div className="absolute right-0 top-8 w-36 sm:w-40 py-1 bg-popover border border-border rounded-lg shadow-xl z-10">
            <button className="w-full px-3 py-2 text-left text-xs sm:text-sm hover:bg-muted flex items-center gap-2">
              <Copy className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Duplicate
            </button>
            <button className="w-full px-3 py-2 text-left text-xs sm:text-sm hover:bg-muted flex items-center gap-2">
              <Share2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Share
            </button>
            <button className="w-full px-3 py-2 text-left text-xs sm:text-sm hover:bg-muted text-red-400 flex items-center gap-2">
              <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Delete
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<WorkflowStatus | 'all'>('all')

  useEffect(() => {
    async function fetchWorkflows() {
      try {
        const supabase = createBrowserClient()
        const { data, error } = await supabase
          .from('workflows')
          .select('*')
          .order('updated_at', { ascending: false })

        if (error) throw error
        setWorkflows(data || [])
      } catch (err) {
        console.error('Error fetching workflows:', err)
        // Use sample data for demo
        setWorkflows(sampleWorkflows)
      } finally {
        setLoading(false)
      }
    }

    fetchWorkflows()
  }, [])

  // Filter workflows
  const filteredWorkflows = workflows.filter((wf) => {
    const matchesSearch = wf.name.toLowerCase().includes(search.toLowerCase()) ||
      wf.description?.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'all' || wf.status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">My Workflows</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Your analysis pipelines
          </p>
        </div>
        <Link
          href="/dashboard/workflows/new"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors shadow-lg shadow-primary/25 w-full sm:w-auto"
        >
          <Plus className="h-4 w-4" />
          New Workflow
        </Link>
      </div>

      {/* Search & Filters - Mobile stacked */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search workflows..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-muted/50 border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as WorkflowStatus | 'all')}
            className="flex-1 sm:flex-none px-3 sm:px-4 py-2.5 rounded-lg bg-muted/50 border border-border focus:border-primary outline-none text-sm"
            title="Filter by status"
          >
            <option value="all">All Status</option>
            {Object.entries(statusConfig).map(([key, { label }]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Quick Stats - Responsive grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
        <div className="p-3 sm:p-4 rounded-xl bg-card border border-border/50">
          <p className="text-xl sm:text-2xl font-bold text-foreground">{workflows.length}</p>
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">Total Workflows</p>
        </div>
        <div className="p-3 sm:p-4 rounded-xl bg-card border border-border/50">
          <p className="text-xl sm:text-2xl font-bold text-green-400">
            {workflows.filter(w => w.status === 'running').length}
          </p>
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">Running Now</p>
        </div>
        <div className="p-3 sm:p-4 rounded-xl bg-card border border-border/50">
          <p className="text-xl sm:text-2xl font-bold text-emerald-400">
            {workflows.filter(w => w.status === 'completed').length}
          </p>
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">Completed</p>
        </div>
        <div className="p-3 sm:p-4 rounded-xl bg-card border border-border/50">
          <p className="text-xl sm:text-2xl font-bold text-purple-400">
            {workflows.filter(w => w.is_template).length}
          </p>
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">Templates</p>
        </div>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-40 sm:h-48 rounded-xl bg-muted/50 animate-pulse" />
          ))}
        </div>
      ) : (
        /* Workflows Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {filteredWorkflows.map((workflow) => (
            <WorkflowCard key={workflow.id} workflow={workflow} />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredWorkflows.length === 0 && (
        <div className="text-center py-16">
          <WorkflowIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No workflows yet</h3>
          <p className="text-muted-foreground mb-6">
            Create your first workflow to start analyzing BCI data
          </p>
          <Link
            href="/dashboard/workflows/new"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Create Workflow
          </Link>
        </div>
      )}
    </div>
  )
}

// Sample data for demo/fallback
const sampleWorkflows: Workflow[] = [
  {
    id: 'quick-start-template',
    user_id: 'user-001',
    name: 'Quick Start Analyzer',
    description: 'Simple starter workflow: paste any URL → AI analyzes content → generates comprehensive insights report. Perfect for analyzing videos, articles, or websites.',
    tags: ['beginner', 'ai', 'content-analysis', 'quick-start'],
    is_template: true,
    is_public: true,
    forked_from_id: null,
    bids_dataset_name: null,
    bids_output_path: null,
    status: 'ready',
    started_at: null,
    completed_at: null,
    error_message: null,
    total_cpu_hours: 0,
    total_gpu_hours: 0,
    estimated_cost: 0,
    canvas_zoom: 1,
    canvas_offset_x: 0,
    canvas_offset_y: 0,
    created_at: new Date(Date.now() - 86400000 * 30).toISOString(),
    updated_at: new Date().toISOString(),
    nodes: [],
    edges: [],
  },
  {
    id: 'content-impact-analyzer',
    user_id: 'user-001',
    name: 'Content Impact Analyzer',
    description: 'Simulate 100 diverse brain profiles analyzing your content for psychological impact, engagement patterns, and viral potential.',
    tags: ['content', 'engagement', 'viral', 'brain-simulation'],
    is_template: true,
    is_public: true,
    forked_from_id: null,
    bids_dataset_name: null,
    bids_output_path: null,
    status: 'ready',
    started_at: null,
    completed_at: null,
    error_message: null,
    total_cpu_hours: 0,
    total_gpu_hours: 0,
    estimated_cost: 0,
    canvas_zoom: 1,
    canvas_offset_x: 0,
    canvas_offset_y: 0,
    created_at: new Date(Date.now() - 86400000 * 14).toISOString(),
    updated_at: new Date().toISOString(),
    nodes: [],
    edges: [],
  },
  {
    id: 'media-bias-analyzer',
    user_id: 'user-001',
    name: 'Media Bias Detector',
    description: 'Analyze news articles or media for bias, emotional manipulation, and persuasion techniques across different demographic perspectives.',
    tags: ['media', 'bias', 'news', 'analysis'],
    is_template: true,
    is_public: true,
    forked_from_id: null,
    bids_dataset_name: null,
    bids_output_path: null,
    status: 'ready',
    started_at: null,
    completed_at: null,
    error_message: null,
    total_cpu_hours: 0,
    total_gpu_hours: 0,
    estimated_cost: 0,
    canvas_zoom: 1,
    canvas_offset_x: 0,
    canvas_offset_y: 0,
    created_at: new Date(Date.now() - 86400000 * 7).toISOString(),
    updated_at: new Date().toISOString(),
    nodes: [],
    edges: [],
  },
]
