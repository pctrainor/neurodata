'use client'

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import type { User } from '@/types'

interface AuthContextType {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  refreshSubscription: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // Fetch subscription tier from the API
  const fetchSubscriptionTier = useCallback(async (userId: string): Promise<string> => {
    try {
      const response = await fetch('/api/stripe/subscription')
      if (response.ok) {
        const data = await response.json()
        return data.tier || 'free'
      }
    } catch (error) {
      console.error('Failed to fetch subscription tier:', error)
    }
    return 'free'
  }, [])

  // Refresh subscription from Stripe (force sync)
  const refreshSubscription = useCallback(async () => {
    if (!user) return
    
    try {
      // Force sync with Stripe
      const syncResponse = await fetch('/api/stripe/sync', { method: 'POST' })
      if (syncResponse.ok) {
        const syncData = await syncResponse.json()
        if (syncData.tier) {
          setUser(prev => prev ? { ...prev, subscription_tier: syncData.tier } : null)
          return
        }
      }
      
      // Fallback: just fetch current subscription
      const tier = await fetchSubscriptionTier(user.id)
      setUser(prev => prev ? { ...prev, subscription_tier: tier } : null)
    } catch (error) {
      console.error('Failed to refresh subscription:', error)
    }
  }, [user, fetchSubscriptionTier])

  useEffect(() => {
    const supabase = createBrowserClient()
    
    // Check active session and fetch subscription
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const tier = await fetchSubscriptionTier(session.user.id)
        setUser({
          id: session.user.id,
          email: session.user.email || '',
          full_name: session.user.user_metadata?.full_name,
          avatar_url: session.user.user_metadata?.avatar_url,
          subscription_tier: tier,
          created_at: session.user.created_at,
          updated_at: session.user.updated_at || session.user.created_at,
        })
      }
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const tier = await fetchSubscriptionTier(session.user.id)
        setUser({
          id: session.user.id,
          email: session.user.email || '',
          full_name: session.user.user_metadata?.full_name,
          avatar_url: session.user.user_metadata?.avatar_url,
          subscription_tier: tier,
          created_at: session.user.created_at,
          updated_at: session.user.updated_at || session.user.created_at,
        })
      } else {
        setUser(null)
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [fetchSubscriptionTier])

  const signIn = async (email: string, password: string) => {
    const supabase = createBrowserClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  const signUp = async (email: string, password: string) => {
    const supabase = createBrowserClient()
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
  }

  const signInWithGoogle = async () => {
    const supabase = createBrowserClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) throw error
  }

  const signOut = async () => {
    const supabase = createBrowserClient()
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signInWithGoogle, signOut, refreshSubscription }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
