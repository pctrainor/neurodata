'use client'

import { useState, useEffect } from 'react'
import { 
  ExternalLink,
  Database,
  FileText,
  Users,
  Calendar,
  CheckCircle,
  Clock,
  AlertCircle,
  RefreshCw,
  Globe
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { createBrowserClient } from '@/lib/supabase'

interface DataSource {
  id: string
  name: string
  short_name: string
  description: string | null
  website_url: string | null
  api_endpoint: string | null
  data_license: string | null
  is_active: boolean
  last_sync_at: string | null
  created_at: string
  study_count?: number
}

// Format date relative
function formatRelativeDate(dateString: string | null): string {
  if (!dateString) return 'Never'
  const date = new Date(dateString)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  
  if (minutes < 60) return `${minutes} minutes ago`
  if (hours < 24) return `${hours} hours ago`
  if (days < 7) return `${days} days ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// Source Logo/Icon Component
function SourceIcon({ shortName }: { shortName: string }) {
  const colors: Record<string, string> = {
    'OpenNeuro': 'bg-gradient-to-br from-blue-500 to-indigo-600',
    'Allen': 'bg-gradient-to-br from-emerald-500 to-teal-600',
    'HCP': 'bg-gradient-to-br from-purple-500 to-pink-600',
    'default': 'bg-gradient-to-br from-slate-500 to-slate-600'
  }
  
  const colorClass = colors[shortName] || colors.default
  const initials = shortName.slice(0, 2).toUpperCase()
  
  return (
    <div className={cn(
      "w-14 h-14 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg",
      colorClass
    )}>
      {initials}
    </div>
  )
}

// Source Card Component
function SourceCard({ 
  source, 
  onSync 
}: { 
  source: DataSource
  onSync: (id: string) => void
}) {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start gap-4">
          <SourceIcon shortName={source.short_name} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">{source.name}</CardTitle>
              {source.is_active ? (
                <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                  Active
                </Badge>
              ) : (
                <Badge variant="secondary">Inactive</Badge>
              )}
            </div>
            <CardDescription className="mt-1">
              {source.short_name}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {source.description && (
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {source.description}
          </p>
        )}
        
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-1">
              <FileText className="h-4 w-4" />
              <span className="text-xs">Studies</span>
            </div>
            <p className="font-semibold text-slate-900 dark:text-slate-100">
              {source.study_count || 0}
            </p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-1">
              <Clock className="h-4 w-4" />
              <span className="text-xs">Last Sync</span>
            </div>
            <p className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
              {formatRelativeDate(source.last_sync_at)}
            </p>
          </div>
        </div>
        
        {/* License */}
        {source.data_license && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-500 dark:text-slate-400">License:</span>
            <Badge variant="outline">{source.data_license}</Badge>
          </div>
        )}
        
        {/* Actions */}
        <div className="flex gap-2 pt-2">
          {source.website_url && (
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1"
              onClick={() => window.open(source.website_url!, '_blank')}
            >
              <Globe className="h-4 w-4 mr-2" />
              Visit Website
            </Button>
          )}
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1"
            onClick={() => onSync(source.id)}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Sync Now
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default function SourcesPage() {
  const [sources, setSources] = useState<DataSource[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState<string | null>(null)
  
  // Fetch sources from Supabase
  useEffect(() => {
    async function fetchSources() {
      try {
        const supabase = createBrowserClient()
        
        // Get sources with study counts
        const { data: sourcesData, error: sourcesError } = await supabase
          .from('data_sources')
          .select('*')
          .order('name')

        if (sourcesError) throw sourcesError
        
        // Get study counts per source
        const { data: countData, error: countError } = await supabase
          .from('studies')
          .select('source_id')
        
        if (countError) throw countError
        
        // Calculate counts
        const counts = (countData || []).reduce((acc, study) => {
          acc[study.source_id] = (acc[study.source_id] || 0) + 1
          return acc
        }, {} as Record<string, number>)
        
        // Merge counts into sources
        const sourcesWithCounts = (sourcesData || []).map(source => ({
          ...source,
          study_count: counts[source.id] || 0
        }))
        
        setSources(sourcesWithCounts)
      } catch (err) {
        console.error('Error fetching sources:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchSources()
  }, [])

  // Handle sync (placeholder)
  const handleSync = async (sourceId: string) => {
    setSyncing(sourceId)
    // Simulate sync delay
    await new Promise(resolve => setTimeout(resolve, 2000))
    setSyncing(null)
    // In a real app, this would trigger the sync scripts
    alert('Sync triggered! In production, this would run the sync scripts.')
  }

  // Stats
  const totalStudies = sources.reduce((sum, s) => sum + (s.study_count || 0), 0)
  const activeSources = sources.filter(s => s.is_active).length

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Data Sources</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Connected neuroimaging data providers and repositories
            </p>
          </div>
          <Button>
            <Database className="h-4 w-4 mr-2" />
            Add Source
          </Button>
        </div>
        
        {/* Stats Bar */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-indigo-500" />
              <span className="text-xs text-slate-500 dark:text-slate-400">Total Sources</span>
            </div>
            <p className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1">
              {sources.length}
            </p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-xs text-slate-500 dark:text-slate-400">Active</span>
            </div>
            <p className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1">
              {activeSources}
            </p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-500" />
              <span className="text-xs text-slate-500 dark:text-slate-400">Total Studies</span>
            </div>
            <p className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1">
              {totalStudies}
            </p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-purple-500" />
              <span className="text-xs text-slate-500 dark:text-slate-400">Sync Status</span>
            </div>
            <p className="text-lg font-bold text-green-600 dark:text-green-400 mt-1">
              Healthy
            </p>
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-auto p-6 bg-slate-50 dark:bg-slate-900">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
          </div>
        ) : sources.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <Database className="h-12 w-12 text-slate-300 dark:text-slate-600 mb-4" />
            <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
              No data sources configured
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              Add a data source to start syncing neuroimaging data
            </p>
            <Button>
              <Database className="h-4 w-4 mr-2" />
              Add First Source
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sources.map(source => (
              <SourceCard 
                key={source.id} 
                source={source}
                onSync={handleSync}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
