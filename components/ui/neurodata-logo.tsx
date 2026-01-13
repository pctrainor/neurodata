'use client'

import { cn } from '@/lib/utils'

interface NeurodataLogoProps {
  className?: string
  variant?: 'full' | 'icon' | 'text'
  size?: 'sm' | 'md' | 'lg'
}

// Icon-only version of the logo (for favicon, collapsed sidebar, etc.)
export function NeurodataIcon({ className, size = 'md' }: { className?: string; size?: 'sm' | 'md' | 'lg' }) {
  const sizes = {
    sm: 'w-6 h-6',
    md: 'w-9 h-9',
    lg: 'w-12 h-12'
  }

  return (
    <svg 
      viewBox="0 0 80 80" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={cn(sizes[size], className)}
      aria-label="NeuroData Hub"
    >
      <defs>
        <linearGradient id="neuroGradientIcon" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#06b6d4" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>
        <linearGradient id="hubGradientIcon" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#ec4899" />
        </linearGradient>
        <filter id="glowIcon" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
      <rect width="80" height="80" rx="16" className="fill-slate-800 dark:fill-slate-900"/>
      <g transform="translate(40, 40)">
        {/* Central Hub Core */}
        <circle cx="0" cy="0" r="10" fill="url(#hubGradientIcon)" filter="url(#glowIcon)"/>
        {/* Orbiting Ring */}
        <path d="M-18 0 A 18 18 0 0 1 18 0" stroke="url(#neuroGradientIcon)" strokeWidth="2.5" strokeLinecap="round" opacity="1" />
        {/* Neural Connections */}
        <line x1="8" y1="-8" x2="22" y2="-22" stroke="url(#neuroGradientIcon)" strokeWidth="2" strokeLinecap="round" />
        <circle cx="22" cy="-22" r="3.5" fill="#06b6d4" />
        <line x1="-8" y1="8" x2="-22" y2="22" stroke="url(#neuroGradientIcon)" strokeWidth="2" strokeLinecap="round" />
        <circle cx="-22" cy="22" r="3.5" fill="#3b82f6" />
      </g>
    </svg>
  )
}

// Full logo with text
export function NeurodataLogo({ className, variant = 'full', size = 'md' }: NeurodataLogoProps) {
  if (variant === 'icon') {
    return <NeurodataIcon className={className} size={size} />
  }

  const heights = {
    sm: 'h-8',
    md: 'h-10',
    lg: 'h-14'
  }

  if (variant === 'text') {
    return (
      <div className={cn('flex flex-col', className)}>
        <span className="font-bold text-foreground leading-tight">neuro<span className="font-light bg-gradient-to-r from-cyan-500 to-blue-500 bg-clip-text text-transparent">data</span></span>
        <span className="text-[10px] font-bold text-pink-500 tracking-wider uppercase leading-tight">HUB</span>
      </div>
    )
  }

  // Full logo with icon and text
  return (
    <svg 
      viewBox="0 0 280 80" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={cn(heights[size], 'w-auto', className)}
      aria-label="NeuroData Hub"
    >
      <defs>
        <linearGradient id="neuroGradientFull" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#06b6d4" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>
        <linearGradient id="hubGradientFull" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#ec4899" />
        </linearGradient>
        <filter id="glowFull" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Icon Group */}
      <g transform="translate(40, 40)">
        {/* Central Hub Core */}
        <circle cx="0" cy="0" r="10" fill="url(#hubGradientFull)" filter="url(#glowFull)" opacity="0.9"/>
        
        {/* Orbiting Rings/Data Paths */}
        <path d="M-18 0 A 18 18 0 0 1 18 0" stroke="url(#neuroGradientFull)" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
        <path d="M18 0 A 18 18 0 0 1 -18 0" stroke="url(#neuroGradientFull)" strokeWidth="2" strokeLinecap="round" opacity="0.3" />
        
        <path d="M0 -26 A 26 26 0 0 1 0 26" stroke="url(#neuroGradientFull)" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" transform="rotate(45)"/>

        {/* Neural Connections / Nodes */}
        <line x1="8" y1="-8" x2="22" y2="-22" stroke="url(#neuroGradientFull)" strokeWidth="2" strokeLinecap="round" />
        <circle cx="22" cy="-22" r="3.5" fill="#06b6d4" />

        <line x1="-8" y1="8" x2="-22" y2="22" stroke="url(#neuroGradientFull)" strokeWidth="2" strokeLinecap="round" />
        <circle cx="-22" cy="22" r="3.5" fill="#3b82f6" />
        
        <line x1="-12" y1="0" x2="-30" y2="0" stroke="url(#neuroGradientFull)" strokeWidth="2" strokeLinecap="round" />
        <circle cx="-30" cy="0" r="2.5" fill="#8b5cf6" />

        {/* Floating Particles */}
        <circle cx="16" cy="20" r="1.5" fill="white" opacity="0.5" />
        <circle cx="-12" cy="-28" r="1" fill="white" opacity="0.3" />
      </g>

      {/* Text Group */}
      <g transform="translate(85, 50)">
        {/* "neuro" - white/foreground */}
        <text 
          fontFamily="system-ui, -apple-system, sans-serif" 
          fontWeight="600" 
          fontSize="28" 
          className="fill-foreground"
          letterSpacing="-0.5"
        >
          neuro
        </text>
        {/* "data" - gradient */}
        <text 
          x="72" 
          fontFamily="system-ui, -apple-system, sans-serif" 
          fontWeight="300" 
          fontSize="28" 
          fill="url(#neuroGradientFull)" 
          letterSpacing="-0.5"
        >
          data
        </text>
        {/* "HUB" badge */}
        <rect x="135" y="-20" width="40" height="24" rx="6" fill="url(#hubGradientFull)" opacity="0.15" />
        <text 
          x="143" 
          y="-3" 
          fontFamily="system-ui, -apple-system, sans-serif" 
          fontWeight="700" 
          fontSize="11" 
          fill="#ec4899" 
          letterSpacing="1"
        >
          HUB
        </text>
      </g>
    </svg>
  )
}

// Compact version for sidebar (icon + stacked text)
export function NeurodataLogoCompact({ className, isCollapsed = false }: { className?: string; isCollapsed?: boolean }) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <NeurodataIcon size="md" />
      {!isCollapsed && (
        <div className="flex flex-col">
          <span className="font-semibold text-foreground leading-tight text-sm">
            neuro<span className="font-light bg-gradient-to-r from-cyan-500 to-blue-500 bg-clip-text text-transparent">data</span>
          </span>
          <span className="text-[9px] font-bold text-pink-500 tracking-wider uppercase leading-tight">HUB</span>
        </div>
      )}
    </div>
  )
}

export default NeurodataLogo
