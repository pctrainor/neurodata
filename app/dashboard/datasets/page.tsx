'use client'

import { useState, useEffect } from 'react'
import { 
  Search, 
  Download,
  HardDrive,
  FileType,
  ExternalLink,
  Filter,
  Database,
  Lock,
  Unlock,
  Users,
  Layers
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { createBrowserClient } from '@/lib/supabase'

interface Dataset {
  id: string
  study_id: string | null
  name: string
  description: string | null
  file_type: string | null
  file_size_mb: number | null
  subjects_count: number | null
  modality: string | null
  preprocessing_level: string | null
  access_level: string
  file_url: string | null
  created_at: string
  study?: { title: string; id: string } | null
}

// Format MB to human readable
function formatSize(sizeMb: number | null): string {
  if (!sizeMb) return '—'
  if (sizeMb < 1024) return `${sizeMb.toLocaleString()} MB`
  if (sizeMb < 1024 * 1024) return `${(sizeMb / 1024).toFixed(1)} GB`
  return `${(sizeMb / (1024 * 1024)).toFixed(1)} TB`
}

// Dataset Card Component
function DatasetCard({ 
  dataset, 
  onClick 
}: { 
  dataset: Dataset
  onClick: () => void
}) {
  const isOpen = dataset.access_level === 'free' || dataset.access_level === 'open'
  
  return (
    <Card 
      className="cursor-pointer hover:shadow-lg transition-all hover:border-indigo-300 dark:hover:border-indigo-700"
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className={cn(
              "p-2 rounded-lg",
              isOpen ? "bg-green-100 dark:bg-green-900/30" : "bg-amber-100 dark:bg-amber-900/30"
            )}>
              {isOpen ? 
                <Unlock className="h-4 w-4 text-green-600 dark:text-green-400" /> : 
                <Lock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              }
            </div>
            <div>
              <CardTitle className="text-base line-clamp-1">{dataset.name}</CardTitle>
              {dataset.modality && (
                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                  {dataset.modality}
                </p>
              )}
            </div>
          </div>
          {dataset.file_type && (
            <Badge variant="outline" className="shrink-0">
              {dataset.file_type.toUpperCase()}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {dataset.description && (
          <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 mb-4">
            {dataset.description}
          </p>
        )}
        
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg py-2 px-3">
            <p className="text-xs text-slate-500 dark:text-slate-400">Size</p>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {formatSize(dataset.file_size_mb)}
            </p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg py-2 px-3">
            <p className="text-xs text-slate-500 dark:text-slate-400">Subjects</p>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {dataset.subjects_count?.toLocaleString() || '—'}
            </p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg py-2 px-3">
            <p className="text-xs text-slate-500 dark:text-slate-400">Access</p>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 capitalize">
              {dataset.access_level}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function DatasetsPage() {
  const [datasets, setDatasets] = useState<Dataset[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null)
  const [accessFilter, setAccessFilter] = useState<'all' | 'free' | 'pro' | 'research'>('all')
  const [sortBy, setSortBy] = useState<'name' | 'size' | 'subjects' | 'date'>('date')
  
  // Fetch datasets from Supabase
  useEffect(() => {
    async function fetchDatasets() {
      try {
        const supabase = createBrowserClient()
        const { data, error } = await supabase
          .from('datasets')
          .select(`
            id,
            study_id,
            name,
            description,
            file_type,
            file_size_mb,
            subjects_count,
            modality,
            preprocessing_level,
            access_level,
            file_url,
            created_at,
            study:studies(id, title)
          `)
          .order('created_at', { ascending: false })
          .limit(100)

        if (error) throw error
        // Transform the data to handle the array from join
        const transformedData = (data || []).map(d => ({
          ...d,
          study: Array.isArray(d.study) ? d.study[0] : d.study
        })) as unknown as Dataset[]
        setDatasets(transformedData)
      } catch (err) {
        console.error('Error fetching datasets:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchDatasets()
  }, [])

  // Filter and sort datasets
  const filteredDatasets = datasets
    .filter(d => {
      if (accessFilter !== 'all' && d.access_level !== accessFilter) return false
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        return (
          d.name.toLowerCase().includes(query) ||
          d.description?.toLowerCase().includes(query) ||
          d.modality?.toLowerCase().includes(query) ||
          d.file_type?.toLowerCase().includes(query)
        )
      }
      return true
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name)
        case 'size':
          return (b.file_size_mb || 0) - (a.file_size_mb || 0)
        case 'subjects':
          return (b.subjects_count || 0) - (a.subjects_count || 0)
        case 'date':
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }
    })

  // Stats
  const totalSizeMb = datasets.reduce((sum, d) => sum + (d.file_size_mb || 0), 0)
  const freeCount = datasets.filter(d => d.access_level === 'free').length
  const totalSubjects = datasets.reduce((sum, d) => sum + (d.subjects_count || 0), 0)

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Datasets</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Browse and download neuroimaging datasets
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Advanced Filters
            </Button>
          </div>
        </div>
        
        {/* Stats Bar */}
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-indigo-500" />
              <span className="text-xs text-slate-500 dark:text-slate-400">Total Datasets</span>
            </div>
            <p className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1">
              {datasets.length}
            </p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <HardDrive className="h-4 w-4 text-emerald-500" />
              <span className="text-xs text-slate-500 dark:text-slate-400">Total Size</span>
            </div>
            <p className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1">
              {formatSize(totalSizeMb)}
            </p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <Unlock className="h-4 w-4 text-green-500" />
              <span className="text-xs text-slate-500 dark:text-slate-400">Free Access</span>
            </div>
            <p className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1">
              {freeCount}
            </p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-500" />
              <span className="text-xs text-slate-500 dark:text-slate-400">Total Subjects</span>
            </div>
            <p className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1">
              {totalSubjects.toLocaleString()}
            </p>
          </div>
        </div>
        
        {/* Search and Filters */}
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search datasets by name, modality, or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          
          <div className="flex gap-2">
            {/* Access Filter */}
            <select
              value={accessFilter}
              onChange={(e) => setAccessFilter(e.target.value as 'all' | 'free' | 'pro' | 'research')}
              className="px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Access Levels</option>
              <option value="free">Free Only</option>
              <option value="pro">Pro</option>
              <option value="research">Research</option>
            </select>
            
            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'name' | 'size' | 'subjects' | 'date')}
              className="px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="date">Newest First</option>
              <option value="name">Name A-Z</option>
              <option value="size">Largest First</option>
              <option value="subjects">Most Subjects</option>
            </select>
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-auto p-6 bg-slate-50 dark:bg-slate-900">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
          </div>
        ) : filteredDatasets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <Database className="h-12 w-12 text-slate-300 dark:text-slate-600 mb-4" />
            <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
              No datasets found
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Try adjusting your search or filters
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDatasets.map(dataset => (
              <DatasetCard 
                key={dataset.id} 
                dataset={dataset}
                onClick={() => setSelectedDataset(dataset)}
              />
            ))}
          </div>
        )}
      </div>
      
      {/* Dataset Detail Modal/Drawer */}
      {selectedDataset && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-auto">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                    {selectedDataset.name}
                  </h2>
                  {selectedDataset.modality && (
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                      {selectedDataset.modality}
                    </p>
                  )}
                </div>
                <button 
                  onClick={() => setSelectedDataset(null)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500"
                >
                  ✕
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Description */}
              {selectedDataset.description && (
                <div>
                  <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">
                    Description
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {selectedDataset.description}
                  </p>
                </div>
              )}
              
              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-1">
                    <FileType className="h-4 w-4" />
                    <span className="text-xs">Format</span>
                  </div>
                  <p className="font-semibold text-slate-900 dark:text-slate-100">
                    {selectedDataset.file_type?.toUpperCase() || 'Unknown'}
                  </p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-1">
                    <HardDrive className="h-4 w-4" />
                    <span className="text-xs">Size</span>
                  </div>
                  <p className="font-semibold text-slate-900 dark:text-slate-100">
                    {formatSize(selectedDataset.file_size_mb)}
                  </p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-1">
                    <Users className="h-4 w-4" />
                    <span className="text-xs">Subjects</span>
                  </div>
                  <p className="font-semibold text-slate-900 dark:text-slate-100">
                    {selectedDataset.subjects_count?.toLocaleString() || '—'}
                  </p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-1">
                    <Layers className="h-4 w-4" />
                    <span className="text-xs">Processing</span>
                  </div>
                  <p className="font-semibold text-slate-900 dark:text-slate-100 capitalize">
                    {selectedDataset.preprocessing_level?.replace('_', ' ') || '—'}
                  </p>
                </div>
              </div>
              
              {/* Access Level */}
              <div className="flex items-center gap-3 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                {selectedDataset.access_level === 'free' ? (
                  <>
                    <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                      <Unlock className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-slate-100">Free Access</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        This dataset is freely available for download
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                      <Lock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-slate-100 capitalize">
                        {selectedDataset.access_level} Access
                      </p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Upgrade your plan or request access to download
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
            
            {/* Actions */}
            <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex gap-3">
              <Button className="flex-1" disabled={!selectedDataset.file_url}>
                <Download className="h-4 w-4 mr-2" />
                Download Dataset
              </Button>
              <Button variant="outline">
                <ExternalLink className="h-4 w-4 mr-2" />
                View Source
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
