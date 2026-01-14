'use client'

import { useState, useRef, useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface TooltipProps {
  content: ReactNode
  children: ReactNode
  disabled?: boolean
  position?: 'top' | 'bottom' | 'left' | 'right'
  className?: string
}

export function Tooltip({ content, children, disabled = false, position = 'right', className = '' }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [coords, setCoords] = useState({ x: 0, y: 0 })
  const triggerRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const updatePosition = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      let x = 0
      let y = 0

      switch (position) {
        case 'right':
          x = rect.right + 8
          y = rect.top + rect.height / 2
          break
        case 'left':
          x = rect.left - 8
          y = rect.top + rect.height / 2
          break
        case 'top':
          x = rect.left + rect.width / 2
          y = rect.top - 8
          break
        case 'bottom':
          x = rect.left + rect.width / 2
          y = rect.bottom + 8
          break
      }

      setCoords({ x, y })
    }
  }

  if (disabled) {
    return <>{children}</>
  }

  const getTransform = () => {
    switch (position) {
      case 'right':
        return 'translateY(-50%)'
      case 'left':
        return 'translate(-100%, -50%)'
      case 'top':
        return 'translate(-50%, -100%)'
      case 'bottom':
        return 'translateX(-50%)'
      default:
        return ''
    }
  }

  return (
    <div className={`relative inline-block w-full ${className}`}>
      <div
        ref={triggerRef}
        onMouseEnter={() => {
          updatePosition()
          setIsVisible(true)
        }}
        onMouseLeave={() => setIsVisible(false)}
      >
        {children}
      </div>
      {mounted && isVisible && createPortal(
        <div 
          className="px-3 py-1.5 text-xs text-popover-foreground bg-popover border border-border rounded-md shadow-lg pointer-events-none whitespace-normal max-w-[240px]"
          style={{ 
            position: 'fixed',
            left: coords.x,
            top: coords.y,
            transform: getTransform(),
            zIndex: 99999,
          }}
        >
          {content}
        </div>,
        document.body
      )}
    </div>
  )
}

// Re-export for shadcn-style API compatibility
export const TooltipProvider = ({ children }: { children: ReactNode }) => <>{children}</>
export const TooltipTrigger = ({ children, asChild }: { children: ReactNode; asChild?: boolean }) => <>{children}</>
export const TooltipContent = ({ children }: { children: ReactNode }) => <>{children}</>
