'use client'

import { cn } from '@/lib/utils'

interface NeurodataLogoProps {
  className?: string
  variant?: 'full' | 'icon' | 'text'
  size?: 'sm' | 'md' | 'lg'
}

// Simple, minimal icon - stylized "N" with a node accent
export function NeurodataIcon({ className, size = 'md' }: { className?: string; size?: 'sm' | 'md' | 'lg' }) {
  const sizes = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10'
  }

  return (
    <svg 
      viewBox="0 0 32 32" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={cn(sizes[size], className)}
      aria-label="NeuroData Hub"
    >
      <defs>
        <linearGradient id="logoGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#06b6d4" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>
      </defs>
      {/* Simple rounded square background */}
      <rect width="32" height="32" rx="8" className="fill-foreground/10" />
      {/* Stylized "N" path */}
      <path 
        d="M9 24V8L23 24V8" 
        stroke="url(#logoGrad)" 
        strokeWidth="3" 
        strokeLinecap="round" 
        strokeLinejoin="round"
        fill="none"
      />
      {/* Node accent dot */}
      <circle cx="23" cy="8" r="2.5" fill="#06b6d4" />
    </svg>
  )
}

// Full logo with text
export function NeurodataLogo({ className, variant = 'full', size = 'md' }: NeurodataLogoProps) {
  if (variant === 'icon') {
    return <NeurodataIcon className={className} size={size} />
  }

  const heights = {
    sm: 'h-7',
    md: 'h-8',
    lg: 'h-10'
  }

  if (variant === 'text') {
    return (
      <div className={cn('flex items-baseline gap-1', className)}>
        <span className="font-semibold text-foreground">neurodata</span>
        <span className="text-[10px] font-medium text-cyan-500 uppercase">hub</span>
      </div>
    )
  }

  // Full logo with icon and text
  return (
    <div className={cn('flex items-center gap-2.5', heights[size], className)}>
      <NeurodataIcon size={size} />
      <div className="flex items-baseline gap-1.5">
        <span className="font-semibold text-foreground text-lg tracking-tight">neurodata</span>
        <span className="text-[10px] font-semibold text-cyan-500 uppercase tracking-wide">hub</span>
      </div>
    </div>
  )
}

// Compact version for sidebar (icon + text)
export function NeurodataLogoCompact({ className, isCollapsed = false }: { className?: string; isCollapsed?: boolean }) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <NeurodataIcon size="md" />
      {!isCollapsed && (
        <div className="flex items-baseline gap-1">
          <span className="font-semibold text-foreground text-sm tracking-tight">neurodata</span>
          <span className="text-[9px] font-medium text-cyan-500 uppercase">hub</span>
        </div>
      )}
    </div>
  )
}

export default NeurodataLogo
