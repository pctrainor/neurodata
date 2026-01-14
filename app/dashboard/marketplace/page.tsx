'use client'

import { useState } from 'react'
import { useTheme } from 'next-themes'
import { 
  Search, 
  Star, 
  Download, 
  Play,
  TrendingUp,
  Brain,
  Library,
  Scale,
  Dna,
  HeartPulse,
  Users,
  Layers,
  Sparkles,
  Clock,
  CheckCircle2,
  ShoppingCart,
  ExternalLink,
  Youtube,
  Tv
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { viralYouTubeContent, newsSegments, advertisementContent } from '@/lib/demo-content'

interface MarketplaceWorkflow {
  id: string
  name: string
  description: string
  longDescription: string
  icon: React.ElementType
  iconColor: string
  category: 'clinical' | 'research' | 'pharma' | 'education'
  price: number | 'free'
  rating: number
  downloads: number
  author: string
  authorVerified: boolean
  referenceDataset: string
  referenceSubjects: number
  tags: string[]
  featured: boolean
  isTemplate?: boolean
  isOfficial?: boolean
  nodeTypes: string[]
  estimatedTime: string
}

// Pre-built Marketplace Products based on your vision
const marketplaceWorkflows: MarketplaceWorkflow[] = [
  // ⭐ FLAGSHIP: Content Impact Analyzer - 100 Brain Node Simulation
  {
    id: 'content-impact-analyzer',
    name: 'Content Impact Analyzer',
    description: 'Simulate 100 diverse brain profiles watching your content. Understand psychological impact in real-time.',
    longDescription: 'Revolutionary workflow: paste any YouTube, TikTok, or media URL. 100 AI-simulated brain nodes with diverse demographic profiles analyze attention, emotional response, cognitive load, and persuasion patterns. Get a comprehensive report on how your content affects viewer psychology.',
    icon: Brain,
    iconColor: 'text-fuchsia-400',
    category: 'research',
    price: 49,
    rating: 4.9,
    downloads: 12847,
    author: 'NeuroData Hub',
    authorVerified: true,
    referenceDataset: 'HCP 1200 + UCLA Phenotypes + Custom Personas',
    referenceSubjects: 1472,
    tags: ['YouTube', 'TikTok', 'Content Analysis', 'Psychology', 'Persuasion', 'Attention', 'Media', 'Creator Tools'],
    featured: true,
    isTemplate: true,
    isOfficial: true,
    nodeTypes: ['Content URL Input', '100x Brain Simulators', 'Attention Tracker', 'Emotion Analyzer', 'Persuasion Detector', 'Cognitive Load Monitor', 'Demographics Segmenter', 'Results Dashboard'],
    estimatedTime: '3-5 min',
  },
  // ⭐ NEW: Media Bias Analyzer - For news/propaganda analysis
  {
    id: 'media-bias-analyzer',
    name: 'Media Bias Analyzer',
    description: 'Analyze how news segments affect different viewer demographics. Fox, CNN, MSNBC - see the neural impact.',
    longDescription: 'Upload any news clip or paste URL. Simulate viewer brain responses across political spectrums, age groups, and education levels. Understand confirmation bias, emotional manipulation, and persuasion techniques at the neurological level.',
    icon: Scale,
    iconColor: 'text-orange-400',
    category: 'research',
    price: 79,
    rating: 4.8,
    downloads: 8934,
    author: 'NeuroData Hub',
    authorVerified: true,
    referenceDataset: 'Political Cognition Dataset + HCP Demographics',
    referenceSubjects: 2100,
    tags: ['News', 'Propaganda', 'Political', 'Bias Detection', 'Media Literacy', 'Fox News', 'CNN', 'Psychology'],
    featured: true,
    isTemplate: true,
    isOfficial: true,
    nodeTypes: ['Media URL Input', 'Demographic Brain Profiles', 'Confirmation Bias Detector', 'Emotional Trigger Mapper', 'Persuasion Score', 'Trust Response', 'Political Spectrum Analysis', 'Comparison Report'],
    estimatedTime: '5-8 min',
  },
  {
    id: 'neuro-psych-screener',
    name: 'Neuro-Psych Screener',
    description: 'Compare patient scans against UCLA phenotypes. Get diagnostic insights in 15 minutes.',
    longDescription: 'Upload a scan, compare against 272 subjects with ADHD, Schizophrenia, Bipolar phenotypes. Data-backed second opinions.',
    icon: HeartPulse,
    iconColor: 'text-rose-400',
    category: 'clinical',
    price: 29,
    rating: 4.9,
    downloads: 1247,
    author: 'NeuroAI Labs',
    authorVerified: true,
    referenceDataset: 'UCLA Consortium for Neuropsychiatric Phenomics',
    referenceSubjects: 272,
    tags: ['Clinical', 'Psychiatry', 'fMRI', 'Diagnostic', 'Phenotyping'],
    featured: true,
    isTemplate: true,
    isOfficial: true,
    nodeTypes: ['User Data', 'UCLA Reference', 'Phenotype Correlator', 'PDF Report'],
    estimatedTime: '15 min',
  },
  {
    id: 'personalized-connectome-mapper',
    name: 'Connectome Mapper',
    description: 'Find white matter deviations vs HCP 1200 healthy controls. For TBI rehab planning.',
    longDescription: 'Upload DTI, find tracts deviating >2 SD from healthy average. 3D deviation reports.',
    icon: Library,
    iconColor: 'text-amber-400',
    category: 'clinical',
    price: 49,
    rating: 4.8,
    downloads: 892,
    author: 'Connectome Core',
    authorVerified: true,
    referenceDataset: 'HCP 1200',
    referenceSubjects: 1200,
    tags: ['TBI', 'DTI', 'Connectome', 'Rehab'],
    featured: false,
    isTemplate: true,
    isOfficial: true,
    nodeTypes: ['DTI Upload', 'HCP Reference', 'Deviation Detector', '3D Report'],
    estimatedTime: '25 min',
  },
  {
    id: 'gene-region-correlator',
    name: 'Gene-Region Correlator',
    description: 'Map gene expression to brain circuits. Allen Atlas + Midnight Scan Club.',
    longDescription: 'Enter a gene → find high-expression regions → see how they connect at rest.',
    icon: Dna,
    iconColor: 'text-emerald-400',
    category: 'pharma',
    price: 99,
    rating: 4.7,
    downloads: 456,
    author: 'PharmaNeuro Inc',
    authorVerified: true,
    referenceDataset: 'Allen + MSC',
    referenceSubjects: 10,
    tags: ['Gene Expression', 'Drug Discovery', 'Connectivity'],
    featured: false,
    isTemplate: true,
    isOfficial: true,
    nodeTypes: ['Gene Query', 'Allen Atlas', 'MSC Reference', 'Connectivity Map'],
    estimatedTime: '20 min',
  },
  {
    id: 'eeg-cleaning-pipeline',
    name: 'EEG Deep Clean v4',
    description: 'PhD-grade EEG preprocessing. Bandpass → ICA → Quality check.',
    longDescription: 'Battle-tested workflow: artifact removal, ICA, MSC quality standards.',
    icon: Sparkles,
    iconColor: 'text-purple-400',
    category: 'research',
    price: 19,
    rating: 4.6,
    downloads: 3420,
    author: 'PhDStudent_EEG',
    authorVerified: false,
    referenceDataset: 'MSC Standards',
    referenceSubjects: 10,
    tags: ['EEG', 'Preprocessing', 'ICA'],
    featured: false,
    isTemplate: true,
    nodeTypes: ['EEG File', 'Bandpass', 'ICA', 'Quality Check'],
    estimatedTime: '10 min',
  },
  {
    id: 'sleep-staging-workflow',
    name: 'Sleep Stager',
    description: 'YASA-powered sleep staging. Upload EEG, get hypnogram.',
    longDescription: 'Automated sleep staging validated against HCP sleep data.',
    icon: Brain,
    iconColor: 'text-blue-400',
    category: 'clinical',
    price: 29,
    rating: 4.5,
    downloads: 1893,
    author: 'SleepLab AI',
    authorVerified: true,
    referenceDataset: 'HCP Sleep',
    referenceSubjects: 1200,
    tags: ['Sleep', 'EEG', 'YASA'],
    featured: false,
    isTemplate: true,
    isOfficial: true,
    nodeTypes: ['EEG Upload', 'YASA ML', 'Hypnogram'],
    estimatedTime: '5 min',
  },
  {
    id: 'motor-imagery-bci',
    name: 'Motor Imagery BCI',
    description: 'Real-time motor imagery classification. EEGNet + CSP.',
    longDescription: 'Ready-to-use BCI pipeline: preprocessing, features, classification.',
    icon: Brain,
    iconColor: 'text-pink-400',
    category: 'research',
    price: 'free',
    rating: 4.4,
    downloads: 5621,
    author: 'BCI Open Source',
    authorVerified: true,
    referenceDataset: 'OpenBCI Motor Imagery',
    referenceSubjects: 109,
    tags: ['BCI', 'Motor Imagery', 'Real-time'],
    featured: false,
    isTemplate: true,
    nodeTypes: ['EEG Stream', 'Bandpass', 'CSP', 'EEGNet'],
    estimatedTime: 'Real-time',
  },
  // ⭐ NEW: Ad Effectiveness Tester
  {
    id: 'ad-effectiveness-tester',
    name: 'Ad Effectiveness Tester',
    description: 'Test your ad against 100 simulated viewer brains before spending on media.',
    longDescription: 'Upload your video ad. Simulate attention patterns, emotional peaks, brand recall moments, and call-to-action effectiveness across diverse demographic brain profiles.',
    icon: TrendingUp,
    iconColor: 'text-green-400',
    category: 'pharma',
    price: 39,
    rating: 4.7,
    downloads: 4521,
    author: 'AdNeuro Labs',
    authorVerified: true,
    referenceDataset: 'Consumer Neuroscience Dataset',
    referenceSubjects: 500,
    tags: ['Advertising', 'Marketing', 'Attention', 'Brand Recall', 'ROI'],
    featured: false,
    isTemplate: true,
    isOfficial: true,
    nodeTypes: ['Video Upload', 'Attention Heatmap', 'Emotion Timeline', 'Brand Recall Score', 'CTA Effectiveness', 'Demographic Breakdown'],
    estimatedTime: '2-4 min',
  },
]

const categoryColors: Record<string, { bg: string; text: string }> = {
  clinical: { bg: 'bg-rose-500/10', text: 'text-rose-400' },
  research: { bg: 'bg-blue-500/10', text: 'text-blue-400' },
  pharma: { bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
  education: { bg: 'bg-purple-500/10', text: 'text-purple-400' },
}

function WorkflowCard({ workflow }: { workflow: MarketplaceWorkflow }) {
  const Icon = workflow.icon
  const catColor = categoryColors[workflow.category] || categoryColors.research
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'
  
  return (
    <Card className={cn(
      'group hover:border-foreground/20 transition-all duration-200 relative overflow-hidden',
      'border-border bg-card',
      workflow.featured && 'ring-1 ring-amber-500/30'
    )}>
      {/* Compact Header */}
      <div className="p-4 pb-2">
        {/* Top row: Icon + Title + Price */}
        <div className="flex items-start gap-3">
          <div className={cn('p-2 rounded-lg shrink-0', catColor.bg)}>
            <Icon className={cn('w-5 h-5', workflow.iconColor)} />
          </div>
          <div className="flex-1 min-w-0 overflow-hidden">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-sm leading-tight truncate text-foreground group-hover:text-foreground/80 transition-colors" title={workflow.name}>
                {workflow.name}
              </h3>
              {workflow.price === 'free' ? (
                <Badge className="bg-emerald-500/15 text-emerald-500 border-emerald-500/30 text-[10px] px-1.5 py-0 shrink-0">
                  Free
                </Badge>
              ) : (
                <span className="text-sm font-bold whitespace-nowrap text-foreground shrink-0">
                  ${workflow.price}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-xs text-muted-foreground">{workflow.author}</span>
              {workflow.authorVerified && <CheckCircle2 className="w-3 h-3 text-blue-400" />}
            </div>
          </div>
        </div>

        {/* Badges row (compact) */}
        {(workflow.featured || workflow.isTemplate || workflow.isOfficial) && (
          <div className="flex gap-1 mt-2">
            {workflow.featured && (
              <Badge className="bg-amber-500/20 text-amber-500 border-amber-500/30 text-[10px] px-1.5 py-0">
                <Star className="w-2.5 h-2.5 mr-0.5 fill-amber-400" />
                Featured
              </Badge>
            )}
            {workflow.isOfficial && (
              <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-[10px] px-1.5 py-0">
                Official
              </Badge>
            )}
          </div>
        )}
      </div>
      
      <CardContent className="p-4 pt-2 space-y-2">
        {/* Description */}
        <p className="text-xs line-clamp-2 text-muted-foreground">
          {workflow.description}
        </p>
        
        {/* Reference Dataset (compact) */}
        <div className="flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-md bg-accent text-accent-foreground">
          <Library className="w-3 h-3 text-amber-400 shrink-0" />
          <span className="truncate">{workflow.referenceDataset}</span>
          <span className="shrink-0 text-muted-foreground">
            ({workflow.referenceSubjects.toLocaleString()})
          </span>
        </div>
        
        {/* Info Row - estimated time only */}
        <div className="flex items-center gap-3 text-xs pt-1 text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {workflow.estimatedTime}
          </span>
          <span className="flex items-center gap-1">
            <Layers className="w-3 h-3" />
            {workflow.nodeTypes.length} nodes
          </span>
        </div>
        
        {/* Action Button (single, full width) */}
        <Link href={`/dashboard/workflows/new?template=${workflow.id}`} className="block pt-1">
          <Button 
            className="w-full text-xs h-8"
            size="sm"
          >
            <Play className="w-3.5 h-3.5 mr-1.5" />
            Use Template
          </Button>
        </Link>
      </CardContent>
    </Card>
  )
}

export default function MarketplacePage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'rating' | 'downloads' | 'price'>('downloads')
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'
  
  const filteredWorkflows = marketplaceWorkflows
    .filter(w => {
      if (categoryFilter !== 'all' && w.category !== categoryFilter) return false
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        return (
          w.name.toLowerCase().includes(query) ||
          w.description.toLowerCase().includes(query) ||
          w.tags.some(t => t.toLowerCase().includes(query)) ||
          w.referenceDataset.toLowerCase().includes(query)
        )
      }
      return true
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'rating':
          return b.rating - a.rating
        case 'downloads':
          return b.downloads - a.downloads
        case 'price':
          const aPrice = typeof a.price === 'number' ? a.price : 0
          const bPrice = typeof b.price === 'number' ? b.price : 0
          return aPrice - bPrice
        default:
          return 0
      }
    })
  
  const featuredWorkflows = filteredWorkflows.filter(w => w.featured)
  const otherWorkflows = filteredWorkflows.filter(w => !w.featured)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className={cn(
            'text-2xl font-bold flex items-center gap-3',
            isDark ? 'text-slate-100' : 'text-slate-800'
          )}>
            <Layers className="w-7 h-7 text-indigo-400" />
            Workflow Marketplace
          </h1>
          <p className={cn('mt-1', isDark ? 'text-slate-400' : 'text-slate-500')}>
            Pre-built workflows with reference datasets • Control Group as a Service
          </p>
        </div>
        
        <Link href="/dashboard/workflows/new">
          <Button className="bg-indigo-600 hover:bg-indigo-500">
            <Brain className="w-4 h-4 mr-2" />
            Build Custom
          </Button>
        </Link>
      </div>

      {/* 🔥 Try With Trending Content - MOVED TO TOP */}
      <div className={cn(
        'rounded-xl p-5 border',
        isDark 
          ? 'bg-gradient-to-r from-fuchsia-500/10 via-violet-500/10 to-cyan-500/10 border-fuchsia-500/20'
          : 'bg-gradient-to-r from-fuchsia-50 via-violet-50 to-cyan-50 border-fuchsia-200'
      )}>
        <h2 className={cn(
          'text-base font-semibold mb-3 flex items-center gap-2',
          isDark ? 'text-slate-100' : 'text-slate-800'
        )}>
          <Play className="w-4 h-4 text-fuchsia-400" />
          Try With Trending Content
          <Badge className="ml-2 bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/30 text-[10px]">
            Live Demo Data
          </Badge>
        </h2>
        <p className={cn('text-sm mb-4', isDark ? 'text-slate-400' : 'text-slate-600')}>
          Click any content below to instantly test our workflows with real viral videos and news clips
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* Viral YouTube Content */}
          {viralYouTubeContent.slice(0, 2).map(content => (
            <Link 
              key={content.id}
              href={`/dashboard/workflows/new?template=content-impact-analyzer&demoContent=${content.id}`}
              className={cn(
                'flex items-start gap-3 p-3 rounded-lg border transition-all hover:scale-[1.02]',
                isDark 
                  ? 'bg-slate-800/50 border-slate-700 hover:border-red-500/50 hover:bg-slate-800'
                  : 'bg-white border-slate-200 hover:border-red-400 hover:shadow-md'
              )}
            >
              <div className="p-2 bg-red-500/10 rounded-lg shrink-0">
                <Youtube className="w-5 h-5 text-red-500" />
              </div>
              <div className="min-w-0">
                <p className={cn('text-sm font-medium truncate', isDark ? 'text-slate-200' : 'text-slate-800')}>
                  {content.title}
                </p>
                <p className={cn('text-xs truncate', isDark ? 'text-slate-500' : 'text-slate-500')}>
                  {content.views} views • {content.duration}
                </p>
                <div className="flex gap-1 mt-1.5">
                  {content.tags.slice(0, 2).map(tag => (
                    <Badge key={tag} variant="outline" className="text-[9px] px-1.5 py-0">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </Link>
          ))}
          
          {/* News Segment */}
          <Link 
            href={`/dashboard/workflows/new?template=media-bias-analyzer&demoContent=news-comparison`}
            className={cn(
              'flex items-start gap-3 p-3 rounded-lg border transition-all hover:scale-[1.02]',
              isDark 
                ? 'bg-slate-800/50 border-slate-700 hover:border-orange-500/50 hover:bg-slate-800'
                : 'bg-white border-slate-200 hover:border-orange-400 hover:shadow-md'
            )}
          >
            <div className="p-2 bg-orange-500/10 rounded-lg shrink-0">
              <Tv className="w-5 h-5 text-orange-500" />
            </div>
            <div className="min-w-0">
              <p className={cn('text-sm font-medium truncate', isDark ? 'text-slate-200' : 'text-slate-800')}>
                Compare Fox vs CNN vs MSNBC
              </p>
              <p className={cn('text-xs truncate', isDark ? 'text-slate-500' : 'text-slate-500')}>
                Same story, different framing
              </p>
              <div className="flex gap-1 mt-1.5">
                <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-red-400/50 text-red-400">Fox</Badge>
                <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-blue-400/50 text-blue-400">CNN</Badge>
                <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-purple-400/50 text-purple-400">MSNBC</Badge>
              </div>
            </div>
          </Link>
        </div>
        
        <div className="mt-3 text-center">
          <Link 
            href="/dashboard/marketplace/demo-content"
            className={cn('text-xs hover:underline', isDark ? 'text-fuchsia-400' : 'text-fuchsia-600')}
          >
            View all {viralYouTubeContent.length + newsSegments.length + advertisementContent.length}+ demo content examples →
          </Link>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className={cn(
            'absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4',
            isDark ? 'text-slate-500' : 'text-slate-400'
          )} />
          <input
            type="text"
            placeholder="Search workflows, datasets, or tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn(
              'w-full pl-10 pr-4 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50',
              isDark 
                ? 'bg-slate-800/50 border border-slate-700 text-slate-100 placeholder:text-slate-500' 
                : 'bg-white border border-slate-200 text-slate-800 placeholder:text-slate-400'
            )}
          />
        </div>
        
        <div className="flex gap-2">
          {['all', 'clinical', 'research', 'pharma'].map(cat => (
            <Button
              key={cat}
              variant={categoryFilter === cat ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCategoryFilter(cat)}
              className={cn(
                'text-xs',
                categoryFilter === cat 
                  ? 'bg-indigo-600 hover:bg-indigo-500' 
                  : isDark 
                    ? 'border-slate-700 text-slate-400 hover:bg-slate-800'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              )}
            >
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </Button>
          ))}
        </div>
        
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          className={cn(
            'px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50',
            isDark 
              ? 'bg-black border border-slate-700 text-slate-300 [&>option]:bg-black' 
              : 'bg-white border border-slate-200 text-slate-600'
          )}
        >
          <option value="downloads">Most Popular</option>
          <option value="rating">Highest Rated</option>
          <option value="price">Lowest Price</option>
        </select>
      </div>

      {/* Featured Section - 4 column grid */}
      {featuredWorkflows.length > 0 && (
        <div>
          <h2 className={cn(
            'text-base font-semibold mb-3 flex items-center gap-2',
            isDark ? 'text-slate-100' : 'text-slate-800'
          )}>
            <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
            Featured Workflows
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {featuredWorkflows.map(workflow => (
              <WorkflowCard key={workflow.id} workflow={workflow} />
            ))}
          </div>
        </div>
      )}

      {/* All Workflows - 4 column grid */}
      <div>
        <h2 className={cn(
          'text-base font-semibold mb-3',
          isDark ? 'text-slate-100' : 'text-slate-800'
        )}>
          All Workflows
          <span className={cn('text-sm font-normal ml-2', isDark ? 'text-slate-500' : 'text-slate-400')}>
            ({otherWorkflows.length} results)
          </span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {otherWorkflows.map(workflow => (
            <WorkflowCard key={workflow.id} workflow={workflow} />
          ))}
        </div>
      </div>

      {/* Empty State */}
      {filteredWorkflows.length === 0 && (
        <div className="text-center py-12">
          <Search className={cn('w-10 h-10 mx-auto mb-3', isDark ? 'text-slate-600' : 'text-slate-400')} />
          <h3 className={cn('text-base font-medium', isDark ? 'text-slate-300' : 'text-slate-600')}>No workflows found</h3>
          <p className={cn('text-sm mt-1', isDark ? 'text-slate-500' : 'text-slate-400')}>Try adjusting your search or filters</p>
        </div>
      )}

      {/* Creator CTA - compact */}
      <div className={cn(
        'rounded-xl p-6 text-center border',
        isDark 
          ? 'bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 border-indigo-500/30'
          : 'bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 border-indigo-200'
      )}>
        <h3 className={cn('text-lg font-bold mb-1', isDark ? 'text-slate-100' : 'text-slate-800')}>
          Become a Workflow Creator
        </h3>
        <p className={cn('text-sm max-w-xl mx-auto mb-4', isDark ? 'text-slate-400' : 'text-slate-600')}>
          Share your expertise and earn $50-$800 per workflow. Join PhD students and clinicians already earning.
        </p>
        <Button className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500">
          <Sparkles className="w-4 h-4 mr-2" />
          Submit Your Workflow
        </Button>
      </div>
    </div>
  )
}
