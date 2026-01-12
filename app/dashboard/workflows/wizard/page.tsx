'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Wizard route - redirects to /dashboard/workflows/new with wizard=true param
 * This opens a blank canvas with the AI Workflow Wizard modal auto-opened
 */
export default function WorkflowWizardPage() {
  const router = useRouter()
  
  useEffect(() => {
    // Redirect to new workflow page with wizard param
    router.replace('/dashboard/workflows/new?wizard=true')
  }, [router])
  
  // Show loading state while redirecting
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Loading AI Workflow Wizard...</p>
      </div>
    </div>
  )
}
