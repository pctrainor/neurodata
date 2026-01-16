'use client'

import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn } from '@/lib/utils'
import { useTheme } from 'next-themes'

interface MarkdownRendererProps {
  content: string
  className?: string
  compact?: boolean
}

/**
 * A styled markdown renderer that handles:
 * - Headers with proper styling
 * - Tables with nice borders
 * - Code blocks with syntax highlighting styling
 * - Lists with proper indentation
 * - Links and emphasis
 */
export default function MarkdownRenderer({ 
  content, 
  className,
  compact = false 
}: MarkdownRendererProps) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  return (
    <div className={cn(
      'markdown-content',
      compact ? 'space-y-2' : 'space-y-4',
      className
    )}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Headers
          h1: ({ children }) => (
            <h1 className={cn(
              'text-xl font-bold pb-2 border-b mb-4',
              isDark ? 'text-white border-slate-700' : 'text-slate-900 border-slate-200'
            )}>
              {children}
            </h1>
          ),
        h2: ({ children }) => (
          <h2 className={cn(
            'text-lg font-semibold mt-6 mb-3 flex items-center gap-2',
            isDark ? 'text-white' : 'text-slate-900'
          )}>
            <span className="w-1 h-5 bg-gradient-to-b from-purple-500 to-pink-500 rounded-full" />
            {children}
          </h2>
        ),
        h3: ({ children }) => (
          <h3 className={cn(
            'text-base font-semibold mt-4 mb-2',
            isDark ? 'text-slate-200' : 'text-slate-800'
          )}>
            {children}
          </h3>
        ),
        h4: ({ children }) => (
          <h4 className={cn(
            'text-sm font-semibold mt-3 mb-1',
            isDark ? 'text-slate-300' : 'text-slate-700'
          )}>
            {children}
          </h4>
        ),

        // Paragraphs
        p: ({ children }) => (
          <p className={cn(
            'leading-relaxed',
            compact ? 'text-sm' : 'text-base',
            isDark ? 'text-slate-300' : 'text-slate-600'
          )}>
            {children}
          </p>
        ),

        // Lists
        ul: ({ children }) => (
          <ul className={cn(
            'list-none space-y-1.5 ml-1',
            isDark ? 'text-slate-300' : 'text-slate-600'
          )}>
            {children}
          </ul>
        ),
        ol: ({ children }) => (
          <ol className={cn(
            'list-decimal list-inside space-y-1.5',
            isDark ? 'text-slate-300' : 'text-slate-600'
          )}>
            {children}
          </ol>
        ),
        li: ({ children }) => (
          <li className="flex items-start gap-2">
            <span className="text-purple-500 mt-1.5 text-xs">●</span>
            <span className="flex-1">{children}</span>
          </li>
        ),

        // Strong/Bold
        strong: ({ children }) => (
          <strong className={cn(
            'font-semibold',
            isDark ? 'text-white' : 'text-slate-900'
          )}>
            {children}
          </strong>
        ),

        // Emphasis/Italic
        em: ({ children }) => (
          <em className="italic text-purple-400">{children}</em>
        ),

        // Code blocks
        code: ({ className, children, ...props }) => {
          const isInline = !className
          
          if (isInline) {
            return (
              <code className={cn(
                'px-1.5 py-0.5 rounded text-sm font-mono',
                isDark 
                  ? 'bg-slate-800 text-pink-400' 
                  : 'bg-slate-100 text-pink-600'
              )}>
                {children}
              </code>
            )
          }
          
          return (
            <code className={cn(
              'block p-4 rounded-lg text-sm font-mono overflow-x-auto',
              isDark 
                ? 'bg-slate-950 text-slate-300' 
                : 'bg-slate-50 text-slate-700'
            )} {...props}>
              {children}
            </code>
          )
        },
        pre: ({ children }) => (
          <pre className={cn(
            'rounded-lg overflow-hidden my-3',
            isDark ? 'bg-slate-950' : 'bg-slate-50'
          )}>
            {children}
          </pre>
        ),

        // Blockquotes
        blockquote: ({ children }) => (
          <blockquote className={cn(
            'border-l-4 pl-4 py-1 my-3 italic',
            isDark 
              ? 'border-purple-500 bg-purple-500/10 text-slate-300' 
              : 'border-purple-400 bg-purple-50 text-slate-600'
          )}>
            {children}
          </blockquote>
        ),

        // Tables
        table: ({ children }) => (
          <div className="overflow-x-auto my-4">
            <table className={cn(
              'w-full border-collapse text-sm',
              isDark ? 'border-slate-700' : 'border-slate-200'
            )}>
              {children}
            </table>
          </div>
        ),
        thead: ({ children }) => (
          <thead className={cn(
            isDark ? 'bg-slate-800' : 'bg-slate-100'
          )}>
            {children}
          </thead>
        ),
        tbody: ({ children }) => (
          <tbody className="divide-y divide-slate-700/50">
            {children}
          </tbody>
        ),
        tr: ({ children }) => (
          <tr className={cn(
            'transition-colors',
            isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'
          )}>
            {children}
          </tr>
        ),
        th: ({ children }) => (
          <th className={cn(
            'px-4 py-2 text-left font-semibold border',
            isDark 
              ? 'border-slate-700 text-white' 
              : 'border-slate-200 text-slate-900'
          )}>
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className={cn(
            'px-4 py-2 border',
            isDark 
              ? 'border-slate-700 text-slate-300' 
              : 'border-slate-200 text-slate-600'
          )}>
            {children}
          </td>
        ),

        // Horizontal rule
        hr: () => (
          <hr className={cn(
            'my-6 border-t',
            isDark ? 'border-slate-700' : 'border-slate-200'
          )} />
        ),

        // Links
        a: ({ href, children }) => (
          <a 
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-purple-400 hover:text-purple-300 underline underline-offset-2"
          >
            {children}
          </a>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
    </div>
  )
}
