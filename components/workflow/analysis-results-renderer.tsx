'use client'

import React, { useMemo, useState } from 'react'
import {
  BarChart3,
  TrendingUp,
  Users,
  Heart,
  Share2,
  Lightbulb,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Zap,
  Eye,
  Sparkles,
  Star,
  Activity,
  Flame,
  ThumbsUp,
  Brain
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'

// ============================================================================
// TYPES
// ============================================================================

interface ParsedSection {
  title: string
  content: string
  items?: string[]
  score?: number
}

interface ParsedAnalysis {
  engagementScore?: number
  viralPotential?: number
  emotionalIntensity?: number
  sections: ParsedSection[]
  rawText: string
}

interface AnalysisResultsRendererProps {
  analysisResult: string
  className?: string
}

// ============================================================================
// SMART PARSING LOGIC - Handles various AI response formats
// ============================================================================

function parseAnalysisResult(result: string): ParsedAnalysis {
  const parsed: ParsedAnalysis = {
    sections: [],
    rawText: result
  }

  // Clean up the result - remove JSON wrapper if present
  let cleanedText = result.trim()
  
  // Remove ```json wrapper if present
  if (cleanedText.startsWith('```json')) {
    cleanedText = cleanedText.slice(7)
  } else if (cleanedText.startsWith('```')) {
    cleanedText = cleanedText.slice(3)
  }
  if (cleanedText.endsWith('```')) {
    cleanedText = cleanedText.slice(0, -3)
  }
  cleanedText = cleanedText.trim()

  // Try to extract from JSON format
  try {
    const jsonData = JSON.parse(cleanedText)
    
    // Handle { "summary": "..." } format
    if (jsonData.summary && typeof jsonData.summary === 'string') {
      cleanedText = jsonData.summary
    } else if (typeof jsonData === 'object') {
      // Convert JSON object to readable sections
      const sections: ParsedSection[] = []
      
      for (const [key, value] of Object.entries(jsonData)) {
        if (key === 'summary' || key === 'analysis') {
          cleanedText = String(value)
        } else if (typeof value === 'string') {
          sections.push({
            title: formatTitle(key),
            content: value
          })
        } else if (Array.isArray(value)) {
          sections.push({
            title: formatTitle(key),
            content: '',
            items: value.map(item => typeof item === 'string' ? item : JSON.stringify(item))
          })
        } else if (typeof value === 'number') {
          if (key.toLowerCase().includes('engagement')) {
            parsed.engagementScore = value
          } else if (key.toLowerCase().includes('viral')) {
            parsed.viralPotential = value
          } else if (key.toLowerCase().includes('emotional') || key.toLowerCase().includes('intensity')) {
            parsed.emotionalIntensity = value
          }
        }
      }
      
      if (sections.length > 0) {
        parsed.sections = sections
      }
    }
  } catch {
    // Not JSON, that's fine - we'll parse the text directly
  }

  // Extract scores from text using regex
  const engagementMatch = cleanedText.match(/(?:Overall\s+)?Engagement\s+Score[:\s]+(\d+)/i)
  if (engagementMatch) parsed.engagementScore = parseInt(engagementMatch[1])

  const viralMatch = cleanedText.match(/Viral\s+Potential(?:\s+Rating)?[:\s]+(\d+)/i)
  if (viralMatch) parsed.viralPotential = parseInt(viralMatch[1])

  const emotionalMatch = cleanedText.match(/Emotional\s+(?:intensity|score)[:\s]+(\d+)/i)
  if (emotionalMatch) parsed.emotionalIntensity = parseInt(emotionalMatch[1])

  // Parse markdown-style headers into sections
  const sectionRegex = /(?:^|\n)#+\s*([^\n]+)\n([\s\S]*?)(?=(?:\n#+\s)|$)/g
  let match

  while ((match = sectionRegex.exec(cleanedText)) !== null) {
    const title = match[1].trim()
    const content = match[2].trim()
    
    // Extract bullet points if present
    const bulletPoints = content.match(/[-•*]\s+([^\n]+)/g)
    const items = bulletPoints 
      ? bulletPoints.map(b => b.replace(/^[-•*]\s+/, '').trim())
      : undefined

    parsed.sections.push({
      title,
      content: items ? '' : content,
      items
    })
  }

  // If no markdown headers found, try to split by common patterns
  if (parsed.sections.length === 0) {
    const patterns = [
      { regex: /Key Strengths[:\s]+([^\n]+(?:\n(?![A-Z]).*)*)/gi, title: 'Key Strengths' },
      { regex: /Key Weaknesses[:\s]+([^\n]+(?:\n(?![A-Z]).*)*)/gi, title: 'Key Weaknesses' },
      { regex: /Emotional Response[:\s]*([^\n]+(?:\n(?![A-Z]).*)*)/gi, title: 'Emotional Response' },
      { regex: /Primary emotions[:\s]+([^\n]+)/gi, title: 'Primary Emotions' },
      { regex: /Recommendations?[:\s]*([^\n]+(?:\n(?![A-Z]).*)*)/gi, title: 'Recommendations' },
      { regex: /Hook effectiveness[:\s]+([^\n]+)/gi, title: 'Hook Effectiveness' },
      { regex: /Share motivation[:\s]+([^\n]+)/gi, title: 'Share Motivation' },
    ]

    for (const pattern of patterns) {
      const patternMatch = pattern.regex.exec(cleanedText)
      if (patternMatch) {
        const content = patternMatch[1].trim()
        const items = content.includes(',') 
          ? content.split(',').map(s => s.trim())
          : content.includes('\n-') 
            ? content.split('\n-').filter(Boolean).map(s => s.trim())
            : undefined
        
        parsed.sections.push({
          title: pattern.title,
          content: items ? '' : content,
          items
        })
      }
    }
  }

  return parsed
}

function formatTitle(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/^\s+/, '')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function ScoreCard({ 
  score, 
  label, 
  icon: Icon, 
  color,
  maxScore = 100 
}: { 
  score: number
  label: string
  icon: React.ElementType
  color: string
  maxScore?: number
}) {
  const percentage = Math.min(100, Math.max(0, (score / maxScore) * 100))
  const getScoreColor = () => {
    if (percentage >= 80) return 'text-emerald-400'
    if (percentage >= 60) return 'text-yellow-400'
    if (percentage >= 40) return 'text-orange-400'
    return 'text-red-400'
  }

  return (
    <div className="p-4 bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-slate-700/50 rounded-xl">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={cn('p-2 rounded-lg', color.replace('text-', 'bg-').replace('-400', '-500/20'))}>
            <Icon className={cn('w-4 h-4', color)} />
          </div>
          <span className="text-sm text-slate-300">{label}</span>
        </div>
        <span className={cn('text-2xl font-bold', getScoreColor())}>
          {score}
          <span className="text-sm text-slate-500">/{maxScore}</span>
        </span>
      </div>
      <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className={cn('h-full rounded-full', color.replace('text-', 'bg-'))}
        />
      </div>
    </div>
  )
}

function SectionCard({ 
  section, 
  icon: Icon,
  iconColor 
}: { 
  section: ParsedSection
  icon: React.ElementType
  iconColor: string
}) {
  const [isExpanded, setIsExpanded] = useState(true)

  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-700/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={cn('p-1.5 rounded-lg', iconColor.replace('text-', 'bg-').replace('-400', '-500/20'))}>
            <Icon className={cn('w-4 h-4', iconColor)} />
          </div>
          <span className="text-sm font-medium text-white">{section.title}</span>
        </div>
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronRight className="w-4 h-4 text-slate-400" />
        )}
      </button>
      
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4">
              {section.items && section.items.length > 0 ? (
                <ul className="space-y-2">
                  {section.items.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-300 leading-relaxed">{section.content}</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function getIconForSection(title: string): { icon: React.ElementType; color: string } {
  const titleLower = title.toLowerCase()
  
  if (titleLower.includes('strength') || titleLower.includes('positive')) {
    return { icon: ThumbsUp, color: 'text-emerald-400' }
  }
  if (titleLower.includes('weakness') || titleLower.includes('negative') || titleLower.includes('risk')) {
    return { icon: AlertTriangle, color: 'text-amber-400' }
  }
  if (titleLower.includes('emotion') || titleLower.includes('feeling')) {
    return { icon: Heart, color: 'text-pink-400' }
  }
  if (titleLower.includes('attention') || titleLower.includes('hook') || titleLower.includes('engagement')) {
    return { icon: Eye, color: 'text-cyan-400' }
  }
  if (titleLower.includes('recommendation') || titleLower.includes('suggestion') || titleLower.includes('tip')) {
    return { icon: Lightbulb, color: 'text-yellow-400' }
  }
  if (titleLower.includes('share') || titleLower.includes('viral')) {
    return { icon: Share2, color: 'text-indigo-400' }
  }
  if (titleLower.includes('audience') || titleLower.includes('demographic')) {
    return { icon: Users, color: 'text-violet-400' }
  }
  if (titleLower.includes('summary') || titleLower.includes('overview')) {
    return { icon: BarChart3, color: 'text-blue-400' }
  }
  if (titleLower.includes('memory') || titleLower.includes('recall')) {
    return { icon: Brain, color: 'text-purple-400' }
  }
  
  return { icon: Sparkles, color: 'text-slate-400' }
}

// ============================================================================
// FORMATTED TEXT DISPLAY - Renders markdown-like text beautifully
// ============================================================================

function FormattedTextDisplay({ text }: { text: string }) {
  const renderContent = () => {
    // Clean up common issues
    let cleanText = text
      .replace(/\\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim()

    // Split into blocks by double newlines
    const blocks = cleanText.split(/\n\n+/)

    return blocks.map((block, blockIndex) => {
      const trimmedBlock = block.trim()
      
      // Handle headers (# Header)
      if (trimmedBlock.startsWith('#')) {
        const headerMatch = trimmedBlock.match(/^(#+)\s*(.*)/)
        if (headerMatch) {
          const level = headerMatch[1].length
          const headerText = headerMatch[2]
          
          if (level === 1) {
            return (
              <h2 key={blockIndex} className="text-lg font-bold text-white mt-4 mb-2 flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-400" />
                {headerText}
              </h2>
            )
          } else if (level === 2) {
            return (
              <h3 key={blockIndex} className="text-base font-semibold text-slate-200 mt-3 mb-2 flex items-center gap-2">
                <Zap className="w-4 h-4 text-cyan-400" />
                {headerText}
              </h3>
            )
          } else {
            return (
              <h4 key={blockIndex} className="text-sm font-medium text-slate-300 mt-2 mb-1">
                {headerText}
              </h4>
            )
          }
        }
      }

      // Handle bullet points
      if (trimmedBlock.match(/^[-•*]\s/m)) {
        const items = trimmedBlock.split(/\n/).filter(line => line.trim())
        return (
          <ul key={blockIndex} className="space-y-1.5 my-2">
            {items.map((item, i) => {
              const cleanItem = item.replace(/^[-•*]\s*/, '').trim()
              return (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-2 flex-shrink-0" />
                  <span>{formatInlineText(cleanItem)}</span>
                </li>
              )
            })}
          </ul>
        )
      }

      // Handle numbered lists
      if (trimmedBlock.match(/^\d+\.\s/m)) {
        const items = trimmedBlock.split(/\n/).filter(line => line.trim())
        return (
          <ol key={blockIndex} className="space-y-1.5 my-2">
            {items.map((item, i) => {
              const cleanItem = item.replace(/^\d+\.\s*/, '').trim()
              return (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                  <span className="text-indigo-400 font-medium w-5 flex-shrink-0">{i + 1}.</span>
                  <span>{formatInlineText(cleanItem)}</span>
                </li>
              )
            })}
          </ol>
        )
      }

      // Handle key-value lines (Key: Value format)
      if (trimmedBlock.includes(':') && !trimmedBlock.includes('\n')) {
        const colonIndex = trimmedBlock.indexOf(':')
        const key = trimmedBlock.slice(0, colonIndex).trim()
        const value = trimmedBlock.slice(colonIndex + 1).trim()
        
        // Check if it's a score
        if (key.toLowerCase().includes('score') || key.toLowerCase().includes('rating')) {
          return (
            <div key={blockIndex} className="flex items-center justify-between py-2 border-b border-slate-700/50">
              <span className="text-sm text-slate-400">{key}</span>
              <span className="text-lg font-bold text-indigo-400">{value}</span>
            </div>
          )
        }
        
        return (
          <div key={blockIndex} className="py-1">
            <span className="text-sm font-medium text-slate-300">{key}: </span>
            <span className="text-sm text-slate-400">{formatInlineText(value)}</span>
          </div>
        )
      }

      // Regular paragraph
      return (
        <p key={blockIndex} className="text-sm text-slate-300 leading-relaxed my-2">
          {formatInlineText(trimmedBlock)}
        </p>
      )
    })
  }

  return <div className="space-y-1">{renderContent()}</div>
}

function formatInlineText(text: string): React.ReactNode {
  // Handle **bold** and *italic* formatting
  const parts: React.ReactNode[] = []
  let remaining = text
  let key = 0

  while (remaining.length > 0) {
    // Check for **bold**
    const boldMatch = remaining.match(/\*\*([^*]+)\*\*/)
    // Check for *italic*
    const italicMatch = remaining.match(/\*([^*]+)\*/)
    
    if (boldMatch && (!italicMatch || (boldMatch.index !== undefined && italicMatch.index !== undefined && boldMatch.index <= italicMatch.index))) {
      const beforeBold = remaining.slice(0, boldMatch.index)
      if (beforeBold) parts.push(<span key={key++}>{beforeBold}</span>)
      parts.push(<strong key={key++} className="font-semibold text-white">{boldMatch[1]}</strong>)
      remaining = remaining.slice((boldMatch.index || 0) + boldMatch[0].length)
    } else if (italicMatch && italicMatch.index !== undefined) {
      const beforeItalic = remaining.slice(0, italicMatch.index)
      if (beforeItalic) parts.push(<span key={key++}>{beforeItalic}</span>)
      parts.push(<em key={key++} className="italic text-slate-200">{italicMatch[1]}</em>)
      remaining = remaining.slice(italicMatch.index + italicMatch[0].length)
    } else {
      parts.push(<span key={key++}>{remaining}</span>)
      break
    }
  }

  return parts.length > 0 ? <>{parts}</> : text
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function AnalysisResultsRenderer({ 
  analysisResult, 
  className 
}: AnalysisResultsRendererProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'details' | 'raw'>('overview')
  
  const parsed = useMemo(() => parseAnalysisResult(analysisResult), [analysisResult])

  const hasScores = parsed.engagementScore !== undefined || 
                    parsed.viralPotential !== undefined || 
                    parsed.emotionalIntensity !== undefined

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'details', label: 'Full Analysis', icon: Sparkles },
    { id: 'raw', label: 'Raw Data', icon: Activity },
  ] as const

  return (
    <div className={cn('space-y-4', className)}>
      {/* Tab Navigation */}
      <div className="flex gap-1 p-1 bg-slate-800/50 rounded-lg">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-xs font-medium transition-all',
              activeTab === tab.id
                ? 'bg-indigo-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            )}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          {/* Score Cards */}
          {hasScores && (
            <div className="grid grid-cols-1 gap-3">
              {parsed.engagementScore !== undefined && (
                <ScoreCard
                  score={parsed.engagementScore}
                  label="Engagement Score"
                  icon={TrendingUp}
                  color="text-emerald-400"
                />
              )}
              {parsed.viralPotential !== undefined && (
                <ScoreCard
                  score={parsed.viralPotential}
                  label="Viral Potential"
                  icon={Flame}
                  color="text-orange-400"
                />
              )}
              {parsed.emotionalIntensity !== undefined && (
                <ScoreCard
                  score={parsed.emotionalIntensity}
                  label="Emotional Intensity"
                  icon={Heart}
                  color="text-pink-400"
                />
              )}
            </div>
          )}

          {/* Section Cards */}
          {parsed.sections.length > 0 && (
            <div className="space-y-2">
              {parsed.sections.slice(0, 4).map((section, i) => {
                const { icon, color } = getIconForSection(section.title)
                return (
                  <SectionCard
                    key={i}
                    section={section}
                    icon={icon}
                    iconColor={color}
                  />
                )
              })}
            </div>
          )}

          {/* Formatted Text Fallback */}
          {(!hasScores && parsed.sections.length === 0) && (
            <div className="p-4 bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-slate-700/50 rounded-xl">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-5 h-5 text-purple-400" />
                <span className="text-sm font-medium text-white">Analysis Results</span>
              </div>
              <FormattedTextDisplay text={parsed.rawText} />
            </div>
          )}
        </div>
      )}

      {/* Details Tab */}
      {activeTab === 'details' && (
        <div className="p-4 bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-slate-700/50 rounded-xl">
          <FormattedTextDisplay text={parsed.rawText} />
        </div>
      )}

      {/* Raw Tab */}
      {activeTab === 'raw' && (
        <div className="p-4 bg-slate-900/80 border border-slate-700/50 rounded-xl max-h-[400px] overflow-y-auto">
          <pre className="text-xs text-slate-400 whitespace-pre-wrap font-mono leading-relaxed">
            {analysisResult}
          </pre>
        </div>
      )}
    </div>
  )
}
