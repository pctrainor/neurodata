'use client'

import React, { useState } from 'react'
import { ChevronDown, ChevronRight, Sparkles } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useTheme } from 'next-themes'

interface WorkflowExplanationRendererProps {
  explanation: string
}

const WorkflowExplanationRenderer: React.FC<WorkflowExplanationRendererProps> = ({ explanation }) => {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  // Simple parser to break down the explanation into sections
  const parseExplanation = (text: string) => {
    const sections: { title: string; content: string; type: 'overview' | 'node' | 'general' }[] = []
    const lines = text.split('\n').map(line => line.trim()).filter(Boolean)

    interface SectionInProgress { 
      title: string; 
      content: string[]; 
      type: 'overview' | 'node' | 'general' 
    }
    let currentSection: SectionInProgress | null = null

    lines.forEach(line => {
      if (line.startsWith('### ')) {
        // Node-by-node explanation heading
        if (currentSection) {
          sections.push({ ...currentSection, content: currentSection.content.join('\n') })
        }
        currentSection = { title: line.substring(4).trim(), content: [], type: 'node' }
      } else if (line.startsWith('## ')) {
        // Main section heading (e.g., Workflow Overview)
        if (currentSection) {
          sections.push({ ...currentSection, content: currentSection.content.join('\n') })
        }
        currentSection = { title: line.substring(3).trim(), content: [], type: 'general' }
        if (currentSection.title.toLowerCase().includes('overview')) {
          currentSection.type = 'overview'
        }
      } else if (currentSection) {
        currentSection.content.push(line)
      }
    })

    if (currentSection) {
      sections.push({ ...currentSection, content: currentSection.content.join('\n') })
    }
    return sections
  }

  const sections = parseExplanation(explanation)

  return (
    <div className={cn(
      'prose prose-invert prose-sm max-w-none',
      isDark ? 'text-slate-300' : 'text-slate-700'
    )}>
      {sections.map((section, index) => (
        <div key={index} className="mb-6 last:mb-0">
          {section.type === 'overview' && (
            <h3 className="text-xl font-bold text-purple-400 mb-3 flex items-center gap-2">
              <Sparkles className="w-5 h-5" /> {section.title}
            </h3>
          )}
          {section.type === 'general' && !section.title.toLowerCase().includes('node-by-node') && (
            <h3 className="text-lg font-semibold text-cyan-400 mb-2 mt-4">{section.title}</h3>
          )}
          {section.type === 'node' && (
            <CollapsibleSection title={section.title} isDark={isDark}>
              <p className="text-sm leading-relaxed">{section.content}</p>
            </CollapsibleSection>
          )}
          {section.type !== 'node' && (
            <p className="text-sm leading-relaxed">{section.content}</p>
          )}
        </div>
      ))}
    </div>
  )
}

interface CollapsibleSectionProps {
  title: string
  children: React.ReactNode
  isDark: boolean
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({ title, children, isDark }) => {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="border-b border-slate-700/50 py-2 first:pt-0 last:border-b-0 last:pb-0">
      <button
        className="flex items-center justify-between w-full text-left font-medium text-base text-white hover:text-purple-400 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="flex items-center gap-2">
          {isOpen ? <ChevronDown className="w-4 h-4 text-purple-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
          {title}
        </span>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden pt-2"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default WorkflowExplanationRenderer
