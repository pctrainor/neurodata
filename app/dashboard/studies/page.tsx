'use client'

import { useState, useEffect } from 'react'
import { 
  Search, 
  Filter, 
  SlidersHorizontal, 
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Download,
  Eye,
  Users,
  FileText,
  Brain,
  X,
  Sparkles,
  MessageSquare,
  Send,
  Loader2,
  ArrowRight,
  Lightbulb,
  Zap
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { createBrowserClient } from '@/lib/supabase'

interface Study {
  id: string
  title: string
  authors: string[]
  abstract: string
  doi: string | null
  sample_size: number
  modalities: string[]
  conditions: string[]
  access_level: string
  source: { name: string; short_name: string } | null
  view_count: number
  download_count: number
}

// Filter Checkbox Component
function FilterCheckbox({ 
  label, 
  count, 
  checked, 
  onChange 
}: { 
  label: string
  count: number
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="flex items-center justify-between py-1.5 cursor-pointer group">
      <div className="flex items-center gap-2">
        <input 
          type="checkbox" 
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
        />
        <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
          {label}
        </span>
      </div>
      <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
        {count}
      </span>
    </label>
  )
}

// Filter Section Component
function FilterSection({ 
  title, 
  children, 
  defaultOpen = true 
}: { 
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className="border-b border-border pb-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full py-2"
      >
        <span className="text-sm font-semibold">{title}</span>
        {isOpen ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
      {isOpen && <div className="space-y-1 mt-2">{children}</div>}
    </div>
  )
}

// Study Row Component
function StudyRow({ study, isSelected, onClick }: { study: Study; isSelected: boolean; onClick: () => void }) {
  const accessColors = {
    free: 'success',
    pro: 'info',
    research: 'purple',
  } as const

  return (
    <div 
      className={cn(
        "p-4 border-b border-border hover:bg-muted/30 transition-colors group cursor-pointer",
        isSelected && "bg-primary/10 border-l-2 border-l-primary"
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Title & Source */}
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="text-xs shrink-0">
              {study.source?.short_name || 'Unknown'}
            </Badge>
            <Badge 
              variant={accessColors[study.access_level as keyof typeof accessColors] || 'secondary'}
              className="text-xs shrink-0"
            >
              {study.access_level}
            </Badge>
          </div>
          
          <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2">
            {study.title}
          </h3>
          
          {/* Authors */}
          {study.authors && study.authors.length > 0 && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
              {study.authors.slice(0, 3).join(', ')}
              {study.authors.length > 3 && ` +${study.authors.length - 3} more`}
            </p>
          )}
          
          {/* Modalities */}
          <div className="flex flex-wrap gap-1.5 mt-2">
            {study.modalities?.slice(0, 5).map((mod) => (
              <span 
                key={mod}
                className="px-2 py-0.5 text-xs bg-primary/10 text-primary rounded"
              >
                {mod}
              </span>
            ))}
            {study.modalities?.length > 5 && (
              <span className="text-xs text-muted-foreground">
                +{study.modalities.length - 5} more
              </span>
            )}
          </div>
        </div>

        {/* Right Stats */}
        <div className="flex flex-col items-end gap-2 shrink-0">
          <div className="flex items-center gap-1 text-sm">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{study.sample_size || 0}</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Eye className="h-3 w-3" /> {study.view_count || 0}
            </span>
            <span className="flex items-center gap-1">
              <Download className="h-3 w-3" /> {study.download_count || 0}
            </span>
          </div>
          {study.doi && (
            <a 
              href={`https://doi.org/${study.doi}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              DOI <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

// AI-Powered Study Detail Panel
function StudyDetailPanel({ 
  study, 
  onClose,
  onSelectStudy
}: { 
  study: Study
  onClose: () => void
  onSelectStudy: (study: Study) => void
}) {
  const [aiSummary, setAiSummary] = useState<string | null>(null)
  const [similarStudies, setSimilarStudies] = useState<Study[]>([])
  const [loadingSummary, setLoadingSummary] = useState(false)
  const [loadingSimilar, setLoadingSimilar] = useState(false)
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState<string | null>(null)
  const [loadingAnswer, setLoadingAnswer] = useState(false)

  // Generate AI summary
  const generateSummary = async () => {
    setLoadingSummary(true)
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'summarize_study',
          payload: { study }
        })
      })
      const data = await res.json()
      setAiSummary(data.summary)
    } catch (err) {
      console.error('Failed to generate summary:', err)
    } finally {
      setLoadingSummary(false)
    }
  }

  // Find similar studies
  const findSimilar = async () => {
    setLoadingSimilar(true)
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'find_similar',
          payload: { 
            studyId: study.id,
            title: study.title,
            modalities: study.modalities
          }
        })
      })
      const data = await res.json()
      setSimilarStudies(data.similar || [])
    } catch (err) {
      console.error('Failed to find similar studies:', err)
    } finally {
      setLoadingSimilar(false)
    }
  }

  // Ask a question about this study
  const askQuestion = async () => {
    if (!question.trim()) return
    setLoadingAnswer(true)
    setAnswer(null)
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ask_question',
          payload: { 
            question,
            context: { currentStudy: study }
          }
        })
      })
      const data = await res.json()
      setAnswer(data.answer)
    } catch (err) {
      console.error('Failed to get answer:', err)
    } finally {
      setLoadingAnswer(false)
    }
  }

  return (
    <div className="h-full flex flex-col bg-card border-l border-border">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline">{study.source?.short_name}</Badge>
            <Badge variant="success">{study.access_level}</Badge>
          </div>
          <h2 className="font-bold text-lg leading-tight line-clamp-2">{study.title}</h2>
          {study.authors && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
              {study.authors.slice(0, 3).join(', ')}
              {study.authors.length > 3 && ` +${study.authors.length - 3} more`}
            </p>
          )}
        </div>
        <button onClick={onClose} className="p-1 hover:bg-muted rounded">
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <Users className="h-5 w-5 mx-auto mb-1 text-primary" />
            <p className="text-lg font-bold">{study.sample_size || 0}</p>
            <p className="text-xs text-muted-foreground">Subjects</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <Eye className="h-5 w-5 mx-auto mb-1 text-primary" />
            <p className="text-lg font-bold">{study.view_count || 0}</p>
            <p className="text-xs text-muted-foreground">Views</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <Download className="h-5 w-5 mx-auto mb-1 text-primary" />
            <p className="text-lg font-bold">{study.download_count || 0}</p>
            <p className="text-xs text-muted-foreground">Downloads</p>
          </div>
        </div>

        {/* Modalities */}
        <div>
          <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <Brain className="h-4 w-4" />
            Imaging Modalities
          </h3>
          <div className="flex flex-wrap gap-2">
            {study.modalities?.map((mod) => (
              <Badge key={mod} variant="secondary">{mod}</Badge>
            ))}
          </div>
        </div>

        {/* AI Summary Section */}
        <div className="border border-primary/30 bg-primary/5 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              AI Summary
            </h3>
            {!aiSummary && !loadingSummary && (
              <Button size="sm" variant="ghost" onClick={generateSummary}>
                <Zap className="h-3 w-3 mr-1" />
                Generate
              </Button>
            )}
          </div>
          {loadingSummary ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Analyzing study...
            </div>
          ) : aiSummary ? (
            <p className="text-sm text-foreground leading-relaxed">{aiSummary}</p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Click "Generate" to get an AI-powered summary of this study.
            </p>
          )}
        </div>

        {/* Similar Studies */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Lightbulb className="h-4 w-4" />
              Similar Studies
            </h3>
            {similarStudies.length === 0 && !loadingSimilar && (
              <Button size="sm" variant="ghost" onClick={findSimilar}>
                <Sparkles className="h-3 w-3 mr-1" />
                Find
              </Button>
            )}
          </div>
          {loadingSimilar ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Finding related research...
            </div>
          ) : similarStudies.length > 0 ? (
            <div className="space-y-2">
              {similarStudies.map((s) => (
                <button
                  key={s.id}
                  onClick={() => onSelectStudy(s)}
                  className="w-full text-left p-3 bg-muted/30 hover:bg-muted/50 rounded-lg transition-colors group"
                >
                  <p className="text-sm font-medium line-clamp-2 group-hover:text-primary">
                    {s.title}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">n={s.sample_size}</span>
                    <ArrowRight className="h-3 w-3 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Click "Find" to discover related studies using AI.
            </p>
          )}
        </div>

        {/* Ask AI Section */}
        <div className="border border-border rounded-lg p-4">
          <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
            <MessageSquare className="h-4 w-4" />
            Ask AI About This Study
          </h3>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="e.g., What brain regions were studied?"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && askQuestion()}
              className="flex-1 h-9 px-3 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <Button size="sm" onClick={askQuestion} disabled={loadingAnswer || !question.trim()}>
              {loadingAnswer ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
          {answer && (
            <div className="mt-3 p-3 bg-muted/30 rounded-lg">
              <p className="text-sm">{answer}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {study.doi && (
            <Button variant="outline" size="sm" className="flex-1" asChild>
              <a href={`https://doi.org/${study.doi}`} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-1" />
                View Paper
              </a>
            </Button>
          )}
          <Button size="sm" className="flex-1">
            <Download className="h-4 w-4 mr-1" />
            Access Data
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function StudiesPage() {
  const [studies, setStudies] = useState<Study[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedModalities, setSelectedModalities] = useState<string[]>([])
  const [selectedSources, setSelectedSources] = useState<string[]>([])
  const [selectedStudy, setSelectedStudy] = useState<Study | null>(null)
  // Fetch studies from Supabase
  useEffect(() => {
    async function fetchStudies() {
      try {
        const supabase = createBrowserClient()
        const { data, error } = await supabase
          .from('studies')
          .select(`
            id,
            title,
            authors,
            abstract,
            doi,
            sample_size,
            modalities,
            conditions,
            access_level,
            view_count,
            download_count,
            source:data_sources(name, short_name)
          `)
          .order('created_at', { ascending: false })
          .limit(50)

        if (error) throw error
        // Transform source from array to single object (Supabase returns array for relations)
        const transformedData = (data || []).map(study => ({
          ...study,
          source: Array.isArray(study.source) ? study.source[0] : study.source
        })) as Study[]
        setStudies(transformedData)
      } catch (err) {
        console.error('Error fetching studies:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchStudies()
  }, [])

  // Calculate facet counts
  const modalityCounts = studies.reduce((acc, study) => {
    study.modalities?.forEach((mod) => {
      acc[mod] = (acc[mod] || 0) + 1
    })
    return acc
  }, {} as Record<string, number>)

  const sourceCounts = studies.reduce((acc, study) => {
    const source = study.source?.short_name || 'Unknown'
    acc[source] = (acc[source] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Filter studies
  const filteredStudies = studies.filter((study) => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const matchesTitle = study.title?.toLowerCase().includes(query)
      const matchesAbstract = study.abstract?.toLowerCase().includes(query)
      if (!matchesTitle && !matchesAbstract) return false
    }

    // Modality filter
    if (selectedModalities.length > 0) {
      const hasModality = selectedModalities.some((mod) => 
        study.modalities?.includes(mod)
      )
      if (!hasModality) return false
    }

    // Source filter
    if (selectedSources.length > 0) {
      if (!selectedSources.includes(study.source?.short_name || 'Unknown')) {
        return false
      }
    }

    return true
  })

  const toggleModality = (mod: string, checked: boolean) => {
    if (checked) {
      setSelectedModalities([...selectedModalities, mod])
    } else {
      setSelectedModalities(selectedModalities.filter((m) => m !== mod))
    }
  }

  const toggleSource = (source: string, checked: boolean) => {
    if (checked) {
      setSelectedSources([...selectedSources, source])
    } else {
      setSelectedSources(selectedSources.filter((s) => s !== source))
    }
  }

  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const activeFiltersCount = selectedModalities.length + selectedSources.length

  return (
    <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 h-[calc(100vh-6rem)]">
      {/* Mobile Filter Button */}
      <div className="lg:hidden flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search studies..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-lg bg-background border border-border
                       text-sm placeholder:text-muted-foreground
                       focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
          />
        </div>
        <Button 
          variant="outline" 
          size="icon"
          onClick={() => setIsFilterOpen(true)}
          className="relative shrink-0"
        >
          <Filter className="h-4 w-4" />
          {activeFiltersCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center">
              {activeFiltersCount}
            </span>
          )}
        </Button>
      </div>

      {/* Mobile Filter Modal */}
      {isFilterOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setIsFilterOpen(false)} />
          <div className="absolute inset-x-4 top-4 bottom-4 bg-background rounded-xl shadow-xl flex flex-col overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h2 className="font-semibold flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filters
              </h2>
              <div className="flex items-center gap-2">
                {activeFiltersCount > 0 && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => {
                      setSelectedModalities([])
                      setSelectedSources([])
                    }}
                  >
                    Clear all
                  </Button>
                )}
                <button onClick={() => setIsFilterOpen(false)} className="p-2 hover:bg-muted rounded-lg">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4 space-y-4">
              <FilterSection title="Data Source">
                {Object.entries(sourceCounts)
                  .sort((a, b) => b[1] - a[1])
                  .map(([source, count]) => (
                    <FilterCheckbox
                      key={source}
                      label={source}
                      count={count}
                      checked={selectedSources.includes(source)}
                      onChange={(checked) => toggleSource(source, checked)}
                    />
                  ))}
              </FilterSection>
              <FilterSection title="Modality">
                {Object.entries(modalityCounts)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 10)
                  .map(([mod, count]) => (
                    <FilterCheckbox
                      key={mod}
                      label={mod}
                      count={count}
                      checked={selectedModalities.includes(mod)}
                      onChange={(checked) => toggleModality(mod, checked)}
                    />
                  ))}
              </FilterSection>
              <FilterSection title="Access Level" defaultOpen={false}>
                <FilterCheckbox label="Free" count={studies.filter(s => s.access_level === 'free').length} checked={false} onChange={() => {}} />
                <FilterCheckbox label="Pro" count={studies.filter(s => s.access_level === 'pro').length} checked={false} onChange={() => {}} />
                <FilterCheckbox label="Research" count={studies.filter(s => s.access_level === 'research').length} checked={false} onChange={() => {}} />
              </FilterSection>
            </div>
            <div className="p-4 border-t border-border">
              <Button className="w-full" onClick={() => setIsFilterOpen(false)}>
                Show {filteredStudies.length} results
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Sidebar Filters */}
      <aside className="hidden lg:block w-64 shrink-0 overflow-y-auto">
        <Card className="sticky top-0">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filters
              </CardTitle>
              {activeFiltersCount > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    setSelectedModalities([])
                    setSelectedSources([])
                  }}
                >
                  Clear
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <FilterSection title="Data Source">
              {Object.entries(sourceCounts)
                .sort((a, b) => b[1] - a[1])
                .map(([source, count]) => (
                  <FilterCheckbox
                    key={source}
                    label={source}
                    count={count}
                    checked={selectedSources.includes(source)}
                    onChange={(checked) => toggleSource(source, checked)}
                  />
                ))}
            </FilterSection>
            <FilterSection title="Modality">
              {Object.entries(modalityCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10)
                .map(([mod, count]) => (
                  <FilterCheckbox
                    key={mod}
                    label={mod}
                    count={count}
                    checked={selectedModalities.includes(mod)}
                    onChange={(checked) => toggleModality(mod, checked)}
                  />
                ))}
            </FilterSection>
            <FilterSection title="Access Level" defaultOpen={false}>
              <FilterCheckbox label="Free" count={studies.filter(s => s.access_level === 'free').length} checked={false} onChange={() => {}} />
              <FilterCheckbox label="Pro" count={studies.filter(s => s.access_level === 'pro').length} checked={false} onChange={() => {}} />
              <FilterCheckbox label="Research" count={studies.filter(s => s.access_level === 'research').length} checked={false} onChange={() => {}} />
            </FilterSection>
          </CardContent>
        </Card>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        {/* Desktop Search & Controls */}
        <div className="hidden lg:flex items-center gap-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="search"
              placeholder="Search studies by title, abstract, or keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-10 pr-4 rounded-lg bg-background border border-border
                         text-sm placeholder:text-muted-foreground
                         focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
            />
          </div>
          <Button variant="outline" size="sm" className="gap-2">
            <SlidersHorizontal className="h-4 w-4" />
            Sort
          </Button>
        </div>

        {/* Results Info */}
        <div className="flex items-center justify-between mb-3 lg:mb-4">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{filteredStudies.length}</span> studies
          </p>
          <div className="hidden lg:flex items-center gap-2">
            {selectedModalities.map((mod) => (
              <Badge key={mod} variant="secondary" className="gap-1">
                {mod}
                <button 
                  onClick={() => toggleModality(mod, false)}
                  className="ml-1 hover:text-destructive"
                >
                  ×
                </button>
              </Badge>
            ))}
          </div>
        </div>

        {/* Studies List */}
        <Card className="flex-1 overflow-hidden">
          <div className="overflow-y-auto h-full">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : filteredStudies.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <FileText className="h-12 w-12 mb-4 opacity-50" />
                <p>No studies found</p>
                <p className="text-sm">Try adjusting your filters</p>
              </div>
            ) : (
              filteredStudies.map((study) => (
                <StudyRow 
                  key={study.id} 
                  study={study} 
                  isSelected={selectedStudy?.id === study.id}
                  onClick={() => setSelectedStudy(study)}
                />
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Study Detail Panel with AI Features */}
      {selectedStudy && (
        <div className="hidden lg:block w-96 shrink-0">
          <StudyDetailPanel 
            study={selectedStudy} 
            onClose={() => setSelectedStudy(null)}
            onSelectStudy={setSelectedStudy}
          />
        </div>
      )}
    </div>
  )
}
