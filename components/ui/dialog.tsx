'use client'

import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DialogContextType {
  isOpen: boolean
  openDialog: () => void
  closeDialog: () => void
}

const DialogContext = createContext<DialogContextType | undefined>(undefined)

export function useDialog() {
  const context = useContext(DialogContext)
  if (!context) {
    throw new Error('useDialog must be used within a Dialog component')
  }
  return context
}

interface DialogProps {
  children: ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function Dialog({ children, open: controlledOpen, onOpenChange }: DialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen
  
  const openDialog = useCallback(() => {
    if (onOpenChange) {
      onOpenChange(true)
    } else {
      setInternalOpen(true)
    }
  }, [onOpenChange])
  
  const closeDialog = useCallback(() => {
    if (onOpenChange) {
      onOpenChange(false)
    } else {
      setInternalOpen(false)
    }
  }, [onOpenChange])
  
  return (
    <DialogContext.Provider value={{ isOpen, openDialog, closeDialog }}>
      {children}
    </DialogContext.Provider>
  )
}

interface DialogTriggerProps {
  children: ReactNode
  asChild?: boolean
}

export function DialogTrigger({ children, asChild }: DialogTriggerProps) {
  const { openDialog } = useDialog()
  
  if (asChild) {
    const child = children as React.ReactElement
    return <child.type {...child.props} onClick={openDialog} />
  }
  
  return (
    <button onClick={openDialog} type="button">
      {children}
    </button>
  )
}

interface DialogContentProps {
  children: ReactNode
  className?: string
}

export function DialogContent({ children, className = '' }: DialogContentProps) {
  const { isOpen, closeDialog } = useDialog()
  const dialogRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    setMounted(true)
  }, [])
  
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])
  
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        closeDialog()
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isOpen, closeDialog])
  
  if (!isOpen || !mounted) return null
  
  // Use portal to render at document body level, escaping any stacking context
  return createPortal(
    <div className="fixed inset-0 z-[9999] overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={closeDialog}
      />
      
      {/* Centering wrapper */}
      <div className="min-h-full flex items-center justify-center p-4">
        {/* Dialog */}
        <div 
          ref={dialogRef}
          className={cn(
            "relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl",
            "max-h-[85vh] overflow-y-auto overflow-x-hidden",
            "animate-in zoom-in-95 fade-in duration-200",
            "w-full z-[10000]",
            className
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={closeDialog}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors z-10"
          >
            <X className="h-5 w-5" />
          </button>
          {children}
        </div>
      </div>
    </div>,
    document.body
  )
}

interface DialogHeaderProps {
  children: ReactNode
  className?: string
}

export function DialogHeader({ children, className = '' }: DialogHeaderProps) {
  return (
    <div className={cn("px-6 pt-6 pb-4", className)}>
      {children}
    </div>
  )
}

interface DialogTitleProps {
  children: ReactNode
  className?: string
}

export function DialogTitle({ children, className = '' }: DialogTitleProps) {
  return (
    <h2 className={cn("text-xl font-semibold text-slate-900 dark:text-white", className)}>
      {children}
    </h2>
  )
}

interface DialogDescriptionProps {
  children: ReactNode
  className?: string
}

export function DialogDescription({ children, className = '' }: DialogDescriptionProps) {
  return (
    <p className={cn("text-sm text-slate-500 dark:text-slate-400 mt-1", className)}>
      {children}
    </p>
  )
}

interface DialogFooterProps {
  children: ReactNode
  className?: string
}

export function DialogFooter({ children, className = '' }: DialogFooterProps) {
  return (
    <div className={cn("px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end gap-3", className)}>
      {children}
    </div>
  )
}
