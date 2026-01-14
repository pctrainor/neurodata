'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { WelcomeWizard, type OnboardingData } from '@/components/welcome-wizard'

interface OnboardingGuardProps {
  children: React.ReactNode
}

export function OnboardingGuard({ children }: OnboardingGuardProps) {
  const { user, loading: authLoading } = useAuth()
  const [showWizard, setShowWizard] = useState(false)
  const [checkingOnboarding, setCheckingOnboarding] = useState(true)

  useEffect(() => {
    async function checkOnboardingStatus() {
      if (!user) {
        setCheckingOnboarding(false)
        return
      }

      try {
        const response = await fetch('/api/onboarding')
        if (response.ok) {
          const data = await response.json()
          setShowWizard(!data.onboarding_completed)
        } else {
          // If we can't check, don't block the user
          setShowWizard(false)
        }
      } catch (error) {
        console.error('Error checking onboarding status:', error)
        setShowWizard(false)
      } finally {
        setCheckingOnboarding(false)
      }
    }

    if (!authLoading) {
      checkOnboardingStatus()
    }
  }, [user, authLoading])

  const handleOnboardingComplete = async (data: OnboardingData) => {
    try {
      const response = await fetch('/api/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (response.ok) {
        setShowWizard(false)
      } else {
        throw new Error('Failed to save onboarding data')
      }
    } catch (error) {
      console.error('Error completing onboarding:', error)
      throw error
    }
  }

  // Show loading state while checking
  if (authLoading || checkingOnboarding) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-muted-foreground text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  // Show wizard if user hasn't completed onboarding
  if (user && showWizard) {
    return (
      <WelcomeWizard
        userEmail={user.email}
        userName={user.full_name}
        onComplete={handleOnboardingComplete}
      />
    )
  }

  // Otherwise show the normal content
  return <>{children}</>
}
