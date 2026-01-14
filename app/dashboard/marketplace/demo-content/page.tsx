'use client'

import { useState } from 'react'
import { useTheme } from 'next-themes'
import Link from 'next/link'
import { 
  Search, 
  Youtube, 
  Tv, 
  Radio,
  BookOpen,
  ShoppingBag,
  ArrowLeft,
  Play,
  Clock,
  Eye,
  TrendingUp,
  Sparkles
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { 
  viralYouTubeContent, 
  viralTikTokContent,
  newsSegments, 
  advertisementContent,
  educationalContent,
  getAllDemoContent,
  type DemoContent
} from '@/lib/demo-content'

const platformConfig = {
  youtube: { icon: Youtube, color: 'text-red-500', bg: 'bg-red-500/10', label: 'YouTube' },
  tiktok: { icon: Sparkles, color: 'text-pink-500', bg: 'bg-pink-500/10', label: 'TikTok' },
  twitter: { icon: Radio, color: 'text-blue-400', bg: 'bg-blue-400/10', label: 'Twitter/X' },
  news: { icon: Tv, color: 'text-orange-500', bg: 'bg-orange-500/10', label: 'News' },
  podcast: { icon: Radio, color: 'text-purple-500', bg: 'bg-purple-500/10', label: 'Podcast' },
}

function ContentCard({ content, workflow }: { content: DemoContent; workflow: string }) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'
  const platform = platformConfig[content.platform]
  const Icon = platform.icon

  return (
    <Link
      href={`/dashboard/workflows/new?template=${workflow}&demoContent=${content.id}`}
      className={cn(
        'group flex flex-col p-4 rounded-xl border transition-all hover:scale-[1.02]',
        isDark 
          ? 'bg-card border-border hover:border-primary/50 hover:bg-card/80'
          : 'bg-white border-slate-200 hover:border-primary hover:shadow-lg'
      )}
    >
      {/* Platform badge */}
      <div className="flex items-center justify-between mb-3">
        <div className={cn('flex items-center gap-2 px-2 py-1 rounded-md', platform.bg)}>
          <Icon className={cn('w-3.5 h-3.5', platform.color)} />
          <span className={cn('text-xs font-medium', platform.color)}>{platform.label}</span>
        </div>
        <Badge variant="outline" className="text-[10px]">{content.category}</Badge>
      </div>

      {/* Title */}
      <h3 className={cn(
        'font-medium text-sm line-clamp-2 mb-2 group-hover:text-primary transition-colors',
        isDark ? 'text-slate-100' : 'text-slate-800'
      )}>
        {content.title}
      </h3>

      {/* Description */}
      <p className={cn('text-xs line-clamp-2 mb-3', isDark ? 'text-slate-400' : 'text-slate-500')}>
        {content.description}
      </p>

      {/* Stats */}
      <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-auto">
        {content.views && (
          <span className="flex items-center gap-1">
            <Eye className="w-3 h-3" />
            {content.views}
          </span>
        )}
        {content.duration && (
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {content.duration}
          </span>
        )}
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-1 mt-3">
        {content.tags.slice(0, 3).map(tag => (
          <Badge key={tag} variant="outline" className="text-[9px] px-1.5 py-0">
            {tag}
          </Badge>
        ))}
      </div>

      {/* Action hint */}
      <div className={cn(
        'mt-3 pt-3 border-t flex items-center justify-center gap-2 text-xs font-medium',
        isDark ? 'border-border text-primary' : 'border-slate-100 text-primary'
      )}>
        <Play className="w-3.5 h-3.5" />
        Test with this content
      </div>
    </Link>
  )
}

export default function DemoContentPage() {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'
  const [search, setSearch] = useState('')
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all')

  const allContent = getAllDemoContent()
  
  const filteredContent = allContent.filter(content => {
    const matchesSearch = search === '' || 
      content.title.toLowerCase().includes(search.toLowerCase()) ||
      content.description.toLowerCase().includes(search.toLowerCase()) ||
      content.tags.some(t => t.toLowerCase().includes(search.toLowerCase()))
    
    const matchesPlatform = selectedPlatform === 'all' || content.platform === selectedPlatform
    
    return matchesSearch && matchesPlatform
  })

  // Group content by type
  const youtubeContent = filteredContent.filter(c => c.platform === 'youtube')
  const tiktokContent = filteredContent.filter(c => c.platform === 'tiktok')
  const newsContent = filteredContent.filter(c => c.platform === 'news')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link 
            href="/dashboard/marketplace" 
            className={cn(
              'inline-flex items-center gap-1 text-sm mb-2 hover:underline',
              isDark ? 'text-slate-400' : 'text-slate-500'
            )}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Marketplace
          </Link>
          <h1 className={cn(
            'text-2xl font-bold flex items-center gap-3',
            isDark ? 'text-slate-100' : 'text-slate-800'
          )}>
            <TrendingUp className="w-7 h-7 text-fuchsia-400" />
            Demo Content Library
          </h1>
          <p className={cn('mt-1', isDark ? 'text-slate-400' : 'text-slate-500')}>
            Test our workflows with real viral videos, news clips, and trending content
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className={cn(
          'rounded-xl p-3 border text-center',
          isDark ? 'bg-card border-border' : 'bg-white border-slate-200'
        )}>
          <p className={cn('text-xl font-bold', isDark ? 'text-slate-100' : 'text-slate-800')}>
            {allContent.length}
          </p>
          <p className="text-[10px] text-muted-foreground">Total Content</p>
        </div>
        <div className={cn(
          'rounded-xl p-3 border text-center',
          isDark ? 'bg-red-500/10 border-red-500/20' : 'bg-red-50 border-red-200'
        )}>
          <p className={cn('text-xl font-bold text-red-500')}>{viralYouTubeContent.length}</p>
          <p className="text-[10px] text-muted-foreground">YouTube</p>
        </div>
        <div className={cn(
          'rounded-xl p-3 border text-center',
          isDark ? 'bg-pink-500/10 border-pink-500/20' : 'bg-pink-50 border-pink-200'
        )}>
          <p className={cn('text-xl font-bold text-pink-500')}>{viralTikTokContent.length}</p>
          <p className="text-[10px] text-muted-foreground">TikTok</p>
        </div>
        <div className={cn(
          'rounded-xl p-3 border text-center',
          isDark ? 'bg-orange-500/10 border-orange-500/20' : 'bg-orange-50 border-orange-200'
        )}>
          <p className={cn('text-xl font-bold text-orange-500')}>{newsSegments.length}</p>
          <p className="text-[10px] text-muted-foreground">News Clips</p>
        </div>
        <div className={cn(
          'rounded-xl p-3 border text-center',
          isDark ? 'bg-green-500/10 border-green-500/20' : 'bg-green-50 border-green-200'
        )}>
          <p className={cn('text-xl font-bold text-green-500')}>{advertisementContent.length}</p>
          <p className="text-[10px] text-muted-foreground">Ads</p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className={cn(
            'absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4',
            isDark ? 'text-slate-500' : 'text-slate-400'
          )} />
          <input
            type="text"
            placeholder="Search content..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={cn(
              'w-full pl-10 pr-4 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50',
              isDark 
                ? 'bg-card border border-border text-slate-100 placeholder:text-slate-500' 
                : 'bg-white border border-slate-200 text-slate-800 placeholder:text-slate-400'
            )}
          />
        </div>
        
        <div className="flex gap-2 flex-wrap">
          {[
            { key: 'all', label: 'All', icon: Sparkles },
            { key: 'youtube', label: 'YouTube', icon: Youtube },
            { key: 'tiktok', label: 'TikTok', icon: Sparkles },
            { key: 'news', label: 'News', icon: Tv },
          ].map(({ key, label, icon: Icon }) => (
            <Button
              key={key}
              variant={selectedPlatform === key ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedPlatform(key)}
              className={cn(
                'text-xs gap-1.5',
                selectedPlatform === key 
                  ? 'bg-primary hover:bg-primary/90' 
                  : isDark 
                    ? 'border-border text-slate-400 hover:bg-card'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </Button>
          ))}
        </div>
      </div>

      {/* Content Sections */}
      {selectedPlatform === 'all' ? (
        <>
          {/* YouTube Section */}
          {youtubeContent.length > 0 && (
            <section>
              <h2 className={cn(
                'text-base font-semibold mb-4 flex items-center gap-2',
                isDark ? 'text-slate-100' : 'text-slate-800'
              )}>
                <Youtube className="w-5 h-5 text-red-500" />
                Viral YouTube Content
                <span className="text-sm font-normal text-muted-foreground">
                  ({youtubeContent.length})
                </span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {youtubeContent.map(content => (
                  <ContentCard 
                    key={content.id} 
                    content={content} 
                    workflow="content-impact-analyzer" 
                  />
                ))}
              </div>
            </section>
          )}

          {/* TikTok Section */}
          {tiktokContent.length > 0 && (
            <section>
              <h2 className={cn(
                'text-base font-semibold mb-4 flex items-center gap-2',
                isDark ? 'text-slate-100' : 'text-slate-800'
              )}>
                <Sparkles className="w-5 h-5 text-pink-500" />
                TikTok Viral Content
                <span className="text-sm font-normal text-muted-foreground">
                  ({tiktokContent.length})
                </span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {tiktokContent.map(content => (
                  <ContentCard 
                    key={content.id} 
                    content={content} 
                    workflow="content-impact-analyzer" 
                  />
                ))}
              </div>
            </section>
          )}

          {/* News Section */}
          {newsContent.length > 0 && (
            <section>
              <h2 className={cn(
                'text-base font-semibold mb-4 flex items-center gap-2',
                isDark ? 'text-slate-100' : 'text-slate-800'
              )}>
                <Tv className="w-5 h-5 text-orange-500" />
                News Segments
                <Badge className="ml-2 bg-orange-500/20 text-orange-400 border-orange-500/30 text-[10px]">
                  Media Bias Analyzer
                </Badge>
                <span className="text-sm font-normal text-muted-foreground">
                  ({newsContent.length})
                </span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {newsContent.map(content => (
                  <ContentCard 
                    key={content.id} 
                    content={content} 
                    workflow="media-bias-analyzer" 
                  />
                ))}
              </div>
            </section>
          )}

          {/* Ads Section */}
          {advertisementContent.length > 0 && (
            <section>
              <h2 className={cn(
                'text-base font-semibold mb-4 flex items-center gap-2',
                isDark ? 'text-slate-100' : 'text-slate-800'
              )}>
                <ShoppingBag className="w-5 h-5 text-green-500" />
                Advertisements
                <Badge className="ml-2 bg-green-500/20 text-green-400 border-green-500/30 text-[10px]">
                  Ad Effectiveness Tester
                </Badge>
                <span className="text-sm font-normal text-muted-foreground">
                  ({advertisementContent.length})
                </span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {advertisementContent.map(content => (
                  <ContentCard 
                    key={content.id} 
                    content={content} 
                    workflow="ad-effectiveness-tester" 
                  />
                ))}
              </div>
            </section>
          )}

          {/* Educational Section */}
          {educationalContent.length > 0 && (
            <section>
              <h2 className={cn(
                'text-base font-semibold mb-4 flex items-center gap-2',
                isDark ? 'text-slate-100' : 'text-slate-800'
              )}>
                <BookOpen className="w-5 h-5 text-blue-500" />
                Educational Content
                <span className="text-sm font-normal text-muted-foreground">
                  ({educationalContent.length})
                </span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {educationalContent.map(content => (
                  <ContentCard 
                    key={content.id} 
                    content={content} 
                    workflow="content-impact-analyzer" 
                  />
                ))}
              </div>
            </section>
          )}
        </>
      ) : (
        /* Filtered view */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredContent.map(content => (
            <ContentCard 
              key={content.id} 
              content={content} 
              workflow={content.platform === 'news' ? 'media-bias-analyzer' : 'content-impact-analyzer'} 
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {filteredContent.length === 0 && (
        <div className="text-center py-12">
          <Search className={cn('w-10 h-10 mx-auto mb-3', isDark ? 'text-slate-600' : 'text-slate-400')} />
          <h3 className={cn('text-base font-medium', isDark ? 'text-slate-300' : 'text-slate-600')}>
            No content found
          </h3>
          <p className={cn('text-sm mt-1', isDark ? 'text-slate-500' : 'text-slate-400')}>
            Try adjusting your search or filters
          </p>
        </div>
      )}

      {/* CTA */}
      <div className={cn(
        'rounded-xl p-6 text-center border',
        isDark 
          ? 'bg-gradient-to-r from-fuchsia-500/10 via-violet-500/10 to-cyan-500/10 border-fuchsia-500/30'
          : 'bg-gradient-to-r from-fuchsia-50 via-violet-50 to-cyan-50 border-fuchsia-200'
      )}>
        <h3 className={cn('text-lg font-bold mb-1', isDark ? 'text-slate-100' : 'text-slate-800')}>
          Have Your Own Content to Analyze?
        </h3>
        <p className={cn('text-sm max-w-xl mx-auto mb-4', isDark ? 'text-slate-400' : 'text-slate-600')}>
          Paste any YouTube, TikTok, or video URL directly into a workflow to analyze its impact.
        </p>
        <Link href="/dashboard/workflows/new">
          <Button className="bg-gradient-to-r from-fuchsia-600 to-violet-600 hover:from-fuchsia-500 hover:to-violet-500">
            <Play className="w-4 h-4 mr-2" />
            Start Custom Analysis
          </Button>
        </Link>
      </div>
    </div>
  )
}
