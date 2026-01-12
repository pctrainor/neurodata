'use client'

import { useState, useEffect } from 'react'
import { 
  Newspaper, 
  ExternalLink, 
  Calendar,
  Tag,
  Sparkles,
  RefreshCw,
  TrendingUp,
  Beaker,
  Megaphone,
  BookOpen,
  Cpu,
  Globe
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { createBrowserClient } from '@/lib/supabase'

interface NewsItem {
  id: string
  title: string
  summary: string
  category: string
  source: string
  url: string | null
  published_at: string
  discovered_at: string
}

const categoryIcons: Record<string, any> = {
  'Research Breakthrough': Beaker,
  'New Dataset': TrendingUp,
  'Tool Update': Cpu,
  'Funding': Megaphone,
  'Conference': Globe,
  'Publication': BookOpen,
  'default': Newspaper
}

const categoryColors: Record<string, string> = {
  'Research Breakthrough': 'bg-purple-500/20 text-purple-400',
  'New Dataset': 'bg-green-500/20 text-green-400',
  'Tool Update': 'bg-blue-500/20 text-blue-400',
  'Funding': 'bg-yellow-500/20 text-yellow-400',
  'Conference': 'bg-pink-500/20 text-pink-400',
  'Publication': 'bg-cyan-500/20 text-cyan-400',
  'default': 'bg-slate-500/20 text-slate-400'
}

function NewsCard({ news }: { news: NewsItem }) {
  const IconComponent = categoryIcons[news.category] || categoryIcons.default
  const colorClass = categoryColors[news.category] || categoryColors.default

  return (
    <Card className="group hover:border-primary/50 transition-colors">
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <div className={cn("p-2.5 rounded-lg shrink-0", colorClass.split(' ')[0])}>
            <IconComponent className={cn("h-5 w-5", colorClass.split(' ')[1])} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className={cn("text-xs", colorClass)}>
                {news.category}
              </Badge>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {news.published_at ? new Date(news.published_at).toLocaleDateString() : 'Recent'}
              </span>
            </div>
            <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2 mb-2">
              {news.title}
            </h3>
            <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
              {news.summary}
            </p>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                via {news.source}
              </span>
              {news.url && (
                <a 
                  href={news.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  Read more <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function NewsPage() {
  const [news, setNews] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  useEffect(() => {
    async function fetchNews() {
      try {
        const supabase = createBrowserClient()
        const { data, error } = await supabase
          .from('neuroscience_news')
          .select('*')
          .order('discovered_at', { ascending: false })
          .limit(50)

        if (error) {
          // Table might not exist yet
          console.log('News table not available yet:', error.message)
          setNews([])
        } else {
          setNews(data || [])
        }
      } catch (err) {
        console.error('Error fetching news:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchNews()
  }, [])

  // Get unique categories
  const categories = [...new Set(news.map(n => n.category))].filter(Boolean)

  // Filter news
  const filteredNews = selectedCategory 
    ? news.filter(n => n.category === selectedCategory)
    : news

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Newspaper className="h-6 w-6 text-primary" />
            Neuroscience News
          </h1>
          <p className="text-muted-foreground mt-1">
            AI-curated news and updates from the neuroscience community
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="gap-1">
            <Sparkles className="h-3 w-3" />
            Updated daily by AI
          </Badge>
        </div>
      </div>

      {/* Category Filters */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <Button
            variant={selectedCategory === null ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory(null)}
          >
            All
          </Button>
          {categories.map(cat => (
            <Button
              key={cat}
              variant={selectedCategory === cat ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </Button>
          ))}
        </div>
      )}

      {/* News Grid */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-5">
                <div className="flex gap-4">
                  <div className="w-10 h-10 bg-muted rounded-lg" />
                  <div className="flex-1 space-y-3">
                    <div className="h-4 bg-muted rounded w-1/4" />
                    <div className="h-5 bg-muted rounded w-3/4" />
                    <div className="h-4 bg-muted rounded w-full" />
                    <div className="h-4 bg-muted rounded w-2/3" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredNews.length === 0 ? (
        <Card className="p-12">
          <div className="text-center text-muted-foreground">
            <Newspaper className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <h3 className="font-semibold mb-2">No news yet</h3>
            <p className="text-sm">
              News will appear here once the daily AI sync runs.
            </p>
            <p className="text-xs mt-2">
              Check the <code>neuroscience_news</code> table in Supabase or run the sync manually.
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredNews.map(item => (
            <NewsCard key={item.id} news={item} />
          ))}
        </div>
      )}

      {/* Info Footer */}
      <div className="text-center text-sm text-muted-foreground py-4 border-t border-border">
        <p className="flex items-center justify-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          News is automatically curated by Gemini AI from trusted sources
        </p>
        <p className="text-xs mt-1">
          Sources include Nature, Science, PNAS, bioRxiv, and major neuroscience publications
        </p>
      </div>
    </div>
  )
}
