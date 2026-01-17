'use client'

import { useState, useEffect } from 'react'
import { useTheme } from 'next-themes'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  X, Copy, Check, Download, Sparkles, FileText, 
  ChevronDown, ChevronUp, Maximize2, Minimize2, Save, MessageCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import MarkdownRenderer from '@/components/ui/markdown-renderer'

interface ResultsModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  result: string | null
  nodeCount?: number
  workflowName?: string
  onOpenChat?: () => void
}

export default function ResultsModal({
  isOpen,
  onClose,
  title = 'Analysis Results',
  result,
  nodeCount = 0,
  workflowName,
  onOpenChat
}: ResultsModalProps) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'
  
  const [copied, setCopied] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showRaw, setShowRaw] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  
  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setCopied(false)
      setShowRaw(false)
      setSaved(false)
    }
  }, [isOpen])
  
  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])
  
  const handleCopy = async () => {
    if (!result) return
    try {
      await navigator.clipboard.writeText(result)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }
  
  const handleDownload = () => {
    if (!result) return
    const blob = new Blob([result], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `analysis-results-${new Date().toISOString().split('T')[0]}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }
  
  const handleSaveReport = async () => {
    if (!result || saving) return
    setSaving(true)
    
    try {
      const reportName = `${title} - ${new Date().toLocaleDateString()}`
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: reportName,
          description: `Analysis results from workflow${workflowName ? `: ${workflowName}` : ''}`,
          content: { markdown: result, nodeCount },
          content_type: 'analysis',
          workflow_name: workflowName || null,
          format: 'markdown',
          generated_by: 'workflow',
        })
      })
      
      if (response.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      } else {
        console.error('Failed to save report')
      }
    } catch (err) {
      console.error('Error saving report:', err)
    } finally {
      setSaving(false)
    }
  }
  
  if (!isOpen) return null
  
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center"
        onClick={onClose}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
        
        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className={cn(
            'relative flex flex-col rounded-2xl shadow-2xl overflow-hidden',
            isFullscreen 
              ? 'w-[95vw] h-[95vh] max-w-none' 
              : 'w-full max-w-4xl max-h-[85vh]',
            isDark 
              ? 'bg-slate-900 border border-slate-700' 
              : 'bg-white border border-slate-200'
          )}
        >
          {/* Header */}
          <div className={cn(
            'flex items-center justify-between px-6 py-4 border-b',
            isDark ? 'border-slate-700 bg-slate-800/50' : 'border-slate-200 bg-slate-50'
          )}>
            <div className="flex items-center gap-3">
              <div className={cn(
                'p-2 rounded-xl',
                isDark ? 'bg-gradient-to-br from-purple-500/20 to-pink-500/20' : 'bg-gradient-to-br from-purple-100 to-pink-100'
              )}>
                <Sparkles className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <h2 className={cn(
                  'text-lg font-semibold',
                  isDark ? 'text-white' : 'text-slate-900'
                )}>
                  {title}
                </h2>
                {nodeCount > 0 && (
                  <p className={cn(
                    'text-xs',
                    isDark ? 'text-slate-400' : 'text-slate-500'
                  )}>
                    {nodeCount} nodes processed
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Toggle raw/formatted */}
              <button
                onClick={() => setShowRaw(!showRaw)}
                className={cn(
                  'p-2 rounded-lg transition-colors',
                  isDark 
                    ? 'hover:bg-slate-700 text-slate-400 hover:text-white' 
                    : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900'
                )}
                title={showRaw ? 'Show formatted' : 'Show raw'}
              >
                <FileText className="w-4 h-4" />
              </button>
              
              {/* Copy */}
              <button
                onClick={handleCopy}
                className={cn(
                  'p-2 rounded-lg transition-colors',
                  isDark 
                    ? 'hover:bg-slate-700 text-slate-400 hover:text-white' 
                    : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900'
                )}
                title="Copy to clipboard"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
              
              {/* Download */}
              <button
                onClick={handleDownload}
                className={cn(
                  'p-2 rounded-lg transition-colors',
                  isDark 
                    ? 'hover:bg-slate-700 text-slate-400 hover:text-white' 
                    : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900'
                )}
                title="Download as markdown"
              >
                <Download className="w-4 h-4" />
              </button>
              
              {/* Save Report */}
              <button
                onClick={handleSaveReport}
                disabled={saving || !result}
                className={cn(
                  'p-2 rounded-lg transition-colors',
                  saved && 'bg-green-500/20',
                  isDark 
                    ? 'hover:bg-slate-700 text-slate-400 hover:text-white disabled:opacity-50' 
                    : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900 disabled:opacity-50'
                )}
                title={saved ? 'Saved to Reports!' : 'Save to Reports'}
              >
                {saved ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : saving ? (
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
              </button>
              
              {/* Fullscreen */}
              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className={cn(
                  'p-2 rounded-lg transition-colors',
                  isDark 
                    ? 'hover:bg-slate-700 text-slate-400 hover:text-white' 
                    : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900'
                )}
                title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
              >
                {isFullscreen ? (
                  <Minimize2 className="w-4 h-4" />
                ) : (
                  <Maximize2 className="w-4 h-4" />
                )}
              </button>
              
              {/* Close */}
              <button
                onClick={onClose}
                className={cn(
                  'p-2 rounded-lg transition-colors',
                  isDark 
                    ? 'hover:bg-slate-700 text-slate-400 hover:text-white' 
                    : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900'
                )}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          {/* Content */}
          <div className={cn(
            'flex-1 overflow-y-auto p-6',
            isDark ? 'bg-slate-900' : 'bg-white'
          )}>
            {result ? (
              showRaw ? (
                <pre className={cn(
                  'text-sm font-mono whitespace-pre-wrap',
                  isDark ? 'text-slate-300' : 'text-slate-700'
                )}>
                  {result}
                </pre>
              ) : (
                <div className={cn(
                  'prose max-w-none',
                  isDark ? 'prose-invert' : ''
                )}>
                  <MarkdownRenderer content={result} />
                </div>
              )
            ) : (
              <div className="flex flex-col items-center justify-center h-full py-12 text-center">
                <Sparkles className={cn(
                  'w-12 h-12 mb-4',
                  isDark ? 'text-slate-600' : 'text-slate-300'
                )} />
                <p className={cn(
                  'text-lg font-medium',
                  isDark ? 'text-slate-400' : 'text-slate-500'
                )}>
                  No results yet
                </p>
                <p className={cn(
                  'text-sm mt-1',
                  isDark ? 'text-slate-500' : 'text-slate-400'
                )}>
                  Run your workflow to see the analysis results
                </p>
              </div>
            )}
          </div>
          
          {/* Footer */}
          <div className={cn(
            'flex items-center justify-between gap-3 px-6 py-4 border-t',
            isDark ? 'border-slate-700 bg-slate-800/50' : 'border-slate-200 bg-slate-50'
          )}>
            {/* Chat button */}
            {onOpenChat && result && (
              <button
                onClick={onOpenChat}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors',
                  'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white'
                )}
              >
                <MessageCircle className="w-4 h-4" />
                Ask about Results
              </button>
            )}
            {(!onOpenChat || !result) && <div />}
            <button
              onClick={onClose}
              className={cn(
                'px-4 py-2 rounded-lg font-medium transition-colors',
                isDark 
                  ? 'bg-slate-700 hover:bg-slate-600 text-white' 
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              )}
            >
              Close
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
