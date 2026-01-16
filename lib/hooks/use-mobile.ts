'use client'

import { useState, useEffect } from 'react'

/**
 * Hook to detect mobile devices and responsive breakpoints
 * Uses both screen width and user agent for accurate detection
 */
export function useIsMobile(breakpoint: number = 768): boolean {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    // Check user agent for mobile devices
    const checkUserAgent = () => {
      if (typeof navigator !== 'undefined') {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          navigator.userAgent
        )
      }
      return false
    }

    // Check screen width
    const checkScreenWidth = () => {
      if (typeof window !== 'undefined') {
        return window.innerWidth < breakpoint
      }
      return false
    }

    // Initial check
    const updateMobile = () => {
      setIsMobile(checkUserAgent() || checkScreenWidth())
    }

    updateMobile()

    // Listen for resize events
    const handleResize = () => {
      updateMobile()
    }

    window.addEventListener('resize', handleResize)
    
    // Also listen for orientation changes on mobile
    window.addEventListener('orientationchange', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('orientationchange', handleResize)
    }
  }, [breakpoint])

  return isMobile
}

/**
 * Hook to get current device type with more granular detection
 */
export function useDeviceType() {
  const [deviceType, setDeviceType] = useState<'mobile' | 'tablet' | 'desktop'>('desktop')

  useEffect(() => {
    const checkDevice = () => {
      if (typeof window === 'undefined') return 'desktop'
      
      const width = window.innerWidth
      const userAgent = navigator?.userAgent || ''
      
      // Check for mobile user agents
      const isMobileUA = /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)
      const isTabletUA = /iPad|Android(?!.*Mobile)/i.test(userAgent)
      
      if (isMobileUA || width < 640) return 'mobile'
      if (isTabletUA || (width >= 640 && width < 1024)) return 'tablet'
      return 'desktop'
    }

    const updateDevice = () => {
      setDeviceType(checkDevice())
    }

    updateDevice()

    window.addEventListener('resize', updateDevice)
    window.addEventListener('orientationchange', updateDevice)

    return () => {
      window.removeEventListener('resize', updateDevice)
      window.removeEventListener('orientationchange', updateDevice)
    }
  }, [])

  return deviceType
}

/**
 * Hook to check if touch is supported (useful for UX decisions)
 */
export function useIsTouchDevice(): boolean {
  const [isTouch, setIsTouch] = useState(false)

  useEffect(() => {
    setIsTouch(
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0
    )
  }, [])

  return isTouch
}
