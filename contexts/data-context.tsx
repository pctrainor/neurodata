'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import type { Item, Category, DashboardSummary } from '@/types'

interface DataContextType {
  // Items
  items: Item[]
  setItems: (items: Item[]) => void
  refreshItems: () => Promise<void>
  
  // Categories
  categories: Category[]
  setCategories: (categories: Category[]) => void
  refreshCategories: () => Promise<void>
  
  // Dashboard
  summary: DashboardSummary | null
  refreshSummary: () => Promise<void>
  
  // Loading states
  loading: boolean
  setLoading: (loading: boolean) => void
}

const DataContext = createContext<DataContextType | undefined>(undefined)

export function DataProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Item[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [loading, setLoading] = useState(false)

  const refreshItems = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/items')
      if (response.ok) {
        const data = await response.json()
        setItems(data.data || data || [])
      }
    } catch (error) {
      console.error('Failed to fetch items:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  const refreshCategories = useCallback(async () => {
    try {
      const response = await fetch('/api/categories')
      if (response.ok) {
        const data = await response.json()
        setCategories(data.data || data || [])
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error)
    }
  }, [])

  const refreshSummary = useCallback(async () => {
    try {
      const response = await fetch('/api/dashboard/summary')
      if (response.ok) {
        const data = await response.json()
        setSummary(data.data || data)
      }
    } catch (error) {
      console.error('Failed to fetch summary:', error)
    }
  }, [])

  return (
    <DataContext.Provider
      value={{
        items,
        setItems,
        refreshItems,
        categories,
        setCategories,
        refreshCategories,
        summary,
        refreshSummary,
        loading,
        setLoading,
      }}
    >
      {children}
    </DataContext.Provider>
  )
}

export function useData() {
  const context = useContext(DataContext)
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider')
  }
  return context
}
