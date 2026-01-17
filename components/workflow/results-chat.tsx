'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useTheme } from 'next-themes'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  X, Send, Sparkles, MessageCircle, User, Bot, 
  Loader2, Minimize2, Maximize2, RefreshCw
} from 'lucide-react'
import { cn } from '@/lib/utils'
import MarkdownRenderer from '@/components/ui/markdown-renderer'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface ResultsChatProps {
  isOpen: boolean
  onClose: () => void
  workflowResults: string | null  // The analysis results/findings
  workflowName?: string
  nodeCount?: number
}

export default function ResultsChat({
  isOpen,
  onClose,
  workflowResults,
  workflowName = 'Workflow',
  nodeCount = 0
}: ResultsChatProps) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'
  
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus input when opened
  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen, isMinimized])

  // Initialize with welcome message
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: `👋 Hi! I'm your workflow assistant. I've analyzed the results from **${workflowName}** (${nodeCount} nodes processed).\n\nAsk me anything about the findings! For example:\n- "What are the key takeaways?"\n- "Summarize the main discoveries"\n- "What limitations were identified?"\n- "What should I do next?"`,
        timestamp: new Date()
      }])
    }
  }, [isOpen, workflowName, nodeCount, messages.length])

  const handleSend = useCallback(async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      // Call Gemini API to answer questions about the results
      const response = await fetch('/api/workflows/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: userMessage.content,
          context: workflowResults,
          workflowName,
          conversationHistory: messages.slice(-6).map(m => ({
            role: m.role,
            content: m.content
          }))
        })
      })

      const data = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.answer || "I couldn't generate a response. Please try again.",
        timestamp: new Date()
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error('Chat error:', error)
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: "Sorry, I encountered an error processing your question. Please try again.",
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }, [input, isLoading, workflowResults, workflowName, messages])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const clearChat = () => {
    setMessages([{
      id: 'welcome-new',
      role: 'assistant',
      content: `Chat cleared! Ask me anything about the **${workflowName}** results.`,
      timestamp: new Date()
    }])
  }

  if (!isOpen) return null

  // Suggested questions
  const suggestions = [
    "What are the key findings?",
    "What limitations exist?",
    "What should I do next?",
    "Explain in simple terms"
  ]

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        className={cn(
          "fixed z-50 shadow-2xl rounded-2xl overflow-hidden flex flex-col",
          isMinimized 
            ? "bottom-4 right-4 w-72 h-14" 
            : "bottom-4 right-4 w-96 h-[500px]",
          isDark 
            ? "bg-slate-900 border border-slate-700" 
            : "bg-white border border-slate-200"
        )}
      >
        {/* Header */}
        <div className={cn(
          "flex items-center justify-between px-4 py-3 border-b cursor-pointer",
          isDark ? "border-slate-700 bg-slate-800/50" : "border-slate-200 bg-slate-50"
        )}
        onClick={() => isMinimized && setIsMinimized(false)}
        >
          <div className="flex items-center gap-2">
            <div className={cn(
              'p-1.5 rounded-lg',
              isDark ? 'bg-gradient-to-br from-purple-500/20 to-pink-500/20' : 'bg-gradient-to-br from-purple-100 to-pink-100'
            )}>
              <MessageCircle className="w-4 h-4 text-purple-500" />
            </div>
            <div>
              <h3 className={cn(
                'text-sm font-semibold',
                isDark ? 'text-white' : 'text-slate-900'
              )}>
                Ask about Results
              </h3>
              {!isMinimized && (
                <p className={cn(
                  'text-[10px]',
                  isDark ? 'text-slate-400' : 'text-slate-500'
                )}>
                  Chat with AI about your findings
                </p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            {!isMinimized && (
              <button
                onClick={(e) => { e.stopPropagation(); clearChat(); }}
                className={cn(
                  'p-1.5 rounded-lg transition-colors',
                  isDark 
                    ? 'hover:bg-slate-700 text-slate-400 hover:text-white' 
                    : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900'
                )}
                title="Clear chat"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }}
              className={cn(
                'p-1.5 rounded-lg transition-colors',
                isDark 
                  ? 'hover:bg-slate-700 text-slate-400 hover:text-white' 
                  : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900'
              )}
              title={isMinimized ? "Expand" : "Minimize"}
            >
              {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onClose(); }}
              className={cn(
                'p-1.5 rounded-lg transition-colors',
                isDark 
                  ? 'hover:bg-slate-700 text-slate-400 hover:text-white' 
                  : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900'
              )}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Messages */}
        {!isMinimized && (
          <>
            <div className={cn(
              "flex-1 overflow-y-auto p-4 space-y-4",
              isDark ? "bg-slate-900" : "bg-white"
            )}>
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-2",
                    message.role === 'user' ? "justify-end" : "justify-start"
                  )}
                >
                  {message.role === 'assistant' && (
                    <div className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center shrink-0",
                      isDark ? "bg-purple-500/20" : "bg-purple-100"
                    )}>
                      <Bot className="w-4 h-4 text-purple-500" />
                    </div>
                  )}
                  
                  <div className={cn(
                    "max-w-[80%] rounded-2xl px-4 py-2",
                    message.role === 'user'
                      ? isDark 
                        ? "bg-purple-600 text-white" 
                        : "bg-purple-500 text-white"
                      : isDark 
                        ? "bg-slate-800 text-slate-100" 
                        : "bg-slate-100 text-slate-900"
                  )}>
                    {message.role === 'assistant' ? (
                      <div className="prose prose-sm max-w-none dark:prose-invert">
                        <MarkdownRenderer content={message.content} />
                      </div>
                    ) : (
                      <p className="text-sm">{message.content}</p>
                    )}
                  </div>

                  {message.role === 'user' && (
                    <div className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center shrink-0",
                      isDark ? "bg-slate-700" : "bg-slate-200"
                    )}>
                      <User className="w-4 h-4 text-slate-500" />
                    </div>
                  )}
                </div>
              ))}

              {isLoading && (
                <div className="flex gap-2 justify-start">
                  <div className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center shrink-0",
                    isDark ? "bg-purple-500/20" : "bg-purple-100"
                  )}>
                    <Bot className="w-4 h-4 text-purple-500" />
                  </div>
                  <div className={cn(
                    "rounded-2xl px-4 py-3",
                    isDark ? "bg-slate-800" : "bg-slate-100"
                  )}>
                    <Loader2 className="w-4 h-4 animate-spin text-purple-500" />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Suggestions */}
            {messages.length <= 1 && (
              <div className={cn(
                "px-4 pb-2 flex flex-wrap gap-2",
                isDark ? "bg-slate-900" : "bg-white"
              )}>
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => {
                      setInput(suggestion)
                      setTimeout(() => handleSend(), 100)
                    }}
                    className={cn(
                      "text-xs px-3 py-1.5 rounded-full border transition-colors",
                      isDark 
                        ? "border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-white" 
                        : "border-slate-200 text-slate-600 hover:bg-slate-100"
                    )}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <div className={cn(
              "p-4 border-t",
              isDark ? "border-slate-700 bg-slate-800/50" : "border-slate-200 bg-slate-50"
            )}>
              <div className={cn(
                "flex items-center gap-2 rounded-xl px-4 py-2",
                isDark ? "bg-slate-900 border border-slate-700" : "bg-white border border-slate-200"
              )}>
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about the findings..."
                  disabled={isLoading}
                  className={cn(
                    "flex-1 bg-transparent text-sm outline-none",
                    isDark 
                      ? "text-white placeholder:text-slate-500" 
                      : "text-slate-900 placeholder:text-slate-400"
                  )}
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className={cn(
                    "p-2 rounded-lg transition-colors",
                    input.trim() && !isLoading
                      ? "bg-purple-500 hover:bg-purple-600 text-white"
                      : isDark 
                        ? "bg-slate-800 text-slate-600" 
                        : "bg-slate-100 text-slate-400"
                  )}
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </motion.div>
    </AnimatePresence>
  )
}
