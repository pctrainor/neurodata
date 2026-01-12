'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="group relative bg-card rounded-xl border border-border/50 hover:border-primary/30 hover:shadow-lg transition-all duration-300"
    >
      {/* Main content */}
      <Link href={`/dashboard/workflows/${workflow.id}`} className="block p-5">
        {/* Template/Public badges - in document flow */}
        {(workflow.is_template || workflow.is_public) && (
          <div className="flex justify-end gap-2 mb-2">
            {workflow.is_template && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-500/10 text-purple-400 uppercase tracking-wide">
                Template
              </span>
            )}
            {workflow.is_public && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-500/10 text-blue-400 uppercase tracking-wide">
                Public
              </span>
            )}
          </div>
        )}

        {/* Header */}
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-primary/10">
            <WorkflowIcon className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground">
              {workflow.name}
            </h3>
            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
              {workflow.description || 'No description'}
            </p>
          </div>
        </div>

        {/* Status */}
        <div className="mt-4 flex items-center gap-3">
          <span className={cn(
            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
            status.bgColor, status.color
          )}>
            <StatusIcon className="w-3 h-3" />
            {status.label}
          </span>
          
          {/* Tags */}
          {workflow.tags && workflow.tags.length > 0 && (
            <div className="flex items-center gap-1.5">
              {workflow.tags.slice(0, 2).map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 rounded-md bg-muted text-xs text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
              {workflow.tags.length > 2 && (
                <span className="text-xs text-muted-foreground">
                  +{workflow.tags.length - 2}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="mt-4 pt-4 border-t border-border/50 flex items-center gap-6 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Brain className="w-3.5 h-3.5" />
            {workflow.nodes?.length || 0} nodes
          </div>
          <div className="flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5" />
            {workflow.total_cpu_hours.toFixed(1)}h CPU
          </div>
          {workflow.total_gpu_hours > 0 && (
            <div className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" />
              {workflow.total_gpu_hours.toFixed(1)}h GPU
            </div>
          )}
          <div className="flex items-center gap-1.5 ml-auto">
            <Calendar className="w-3.5 h-3.5" />
            {new Date(workflow.updated_at).toLocaleDateString()}
          </div>
        </div>
      </Link>

      {/* Actions menu */}
      <div className="absolute top-12 right-3">
        <button
          onClick={(e) => {
            e.preventDefault()
            setShowMenu(!showMenu)
          }}
          className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-muted transition-all"
        >
          <MoreVertical className="w-4 h-4 text-muted-foreground" />
        </button>
        
        {showMenu && (
          <div className="absolute right-0 top-8 w-40 py-1 bg-popover border border-border rounded-lg shadow-xl z-10">
            <button className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2">
              <Copy className="w-4 h-4" /> Duplicate
            </button>
            <button className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2">
              <Share2 className="w-4 h-4" /> Share
            </button>
            <button className="w-full px-3 py-2 text-left text-sm hover:bg-muted text-red-400 flex items-center gap-2">
              <Trash2 className="w-4 h-4" /> Delete
            </button>
          </div>
        )}
      </div>
    </motion.div>
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
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">My Workflows</h1>
          <p className="text-muted-foreground mt-1">
            Your analysis pipelines
          </p>
        </div>
        <Link
          href="/dashboard/workflows/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors shadow-lg shadow-primary/25"
        >
          <Plus className="h-4 w-4" />
          New Workflow
        </Link>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search workflows..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-muted/50 border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as WorkflowStatus | 'all')}
            className="px-4 py-2.5 rounded-lg bg-muted/50 border border-border focus:border-primary outline-none"
          >
            <option value="all">All Status</option>
            {Object.entries(statusConfig).map(([key, { label }]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="p-4 rounded-xl bg-card border border-border/50">
          <p className="text-2xl font-bold text-foreground">{workflows.length}</p>
          <p className="text-xs text-muted-foreground mt-1">Total Workflows</p>
        </div>
        <div className="p-4 rounded-xl bg-card border border-border/50">
          <p className="text-2xl font-bold text-green-400">
            {workflows.filter(w => w.status === 'running').length}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Running Now</p>
        </div>
        <div className="p-4 rounded-xl bg-card border border-border/50">
          <p className="text-2xl font-bold text-emerald-400">
            {workflows.filter(w => w.status === 'completed').length}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Completed</p>
        </div>
        <div className="p-4 rounded-xl bg-card border border-border/50">
          <p className="text-2xl font-bold text-purple-400">
            {workflows.filter(w => w.is_template).length}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Templates</p>
        </div>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-48 rounded-xl bg-muted/50 animate-pulse" />
          ))}
        </div>
      ) : (
        /* Workflows Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
    id: 'b0000001-0001-4001-8001-000000000001',
    user_id: 'user-001',
    name: 'Standard EEG Preprocessing Pipeline',
    description: 'A complete EEG preprocessing pipeline following best practices: Load → Filter → Remove Line Noise → Detect Bad Channels → ICA Artifact Removal → Re-reference → Export. Based on MNE-Python recommendations.',
    tags: ['eeg', 'preprocessing', 'mne', 'ica', 'filtering'],
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
    id: 'wf-001',
    user_id: 'user-001',
    name: 'Sleep Quality Analysis',
    description: 'Full pipeline for analyzing sleep stages from overnight EEG recordings using YASA',
    tags: ['sleep', 'eeg', 'yasa'],
    is_template: true,
    is_public: true,
    forked_from_id: null,
    bids_dataset_name: 'sub-001_task-sleep',
    bids_output_path: '/derivatives/sleep-analysis',
    status: 'completed',
    started_at: new Date(Date.now() - 3600000).toISOString(),
    completed_at: new Date().toISOString(),
    error_message: null,
    total_cpu_hours: 2.5,
    total_gpu_hours: 0.5,
    estimated_cost: 1.25,
    canvas_zoom: 1,
    canvas_offset_x: 0,
    canvas_offset_y: 0,
    created_at: new Date(Date.now() - 86400000 * 7).toISOString(),
    updated_at: new Date().toISOString(),
    nodes: [],
    edges: [],
  },
  {
    id: 'wf-002',
    user_id: 'user-001',
    name: 'Motor Imagery BCI',
    description: 'Real-time motor imagery classification using EEGNet for BCI applications',
    tags: ['bci', 'motor-imagery', 'deep-learning'],
    is_template: false,
    is_public: false,
    forked_from_id: null,
    bids_dataset_name: null,
    bids_output_path: null,
    status: 'running',
    started_at: new Date(Date.now() - 1800000).toISOString(),
    completed_at: null,
    error_message: null,
    total_cpu_hours: 4.2,
    total_gpu_hours: 2.1,
    estimated_cost: 3.50,
    canvas_zoom: 1,
    canvas_offset_x: 0,
    canvas_offset_y: 0,
    created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    updated_at: new Date().toISOString(),
    nodes: [],
    edges: [],
  },
  {
    id: 'wf-003',
    user_id: 'user-001',
    name: 'ERP Oddball Analysis',
    description: 'P300 extraction from auditory oddball paradigm',
    tags: ['erp', 'p300', 'oddball'],
    is_template: false,
    is_public: false,
    forked_from_id: null,
    bids_dataset_name: null,
    bids_output_path: null,
    status: 'draft',
    started_at: null,
    completed_at: null,
    error_message: null,
    total_cpu_hours: 0,
    total_gpu_hours: 0,
    estimated_cost: 0,
    canvas_zoom: 1,
    canvas_offset_x: 0,
    canvas_offset_y: 0,
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date(Date.now() - 86400000).toISOString(),
    nodes: [],
    edges: [],
  },
]
