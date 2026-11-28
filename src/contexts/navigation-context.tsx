'use client'

import { createContext, useContext, useState, ReactNode, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { recordVisit } from '@/lib/nav-trail'
import { countShortcutVisit } from '@/lib/shortcuts/record-visit'

interface NavigationContextType {
  isNavigating: boolean
  navigateTo: (href: string) => void
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined)

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [isNavigating, setIsNavigating] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  // MBM-345: remember the pages visited in this tab, for BackLink
  useEffect(() => {
    if (pathname) recordVisit(pathname + window.location.search)
    // MBM-360: and count it for the user's "My shortcuts"
    if (pathname) countShortcutVisit(pathname)
  }, [pathname])

  // Listen for route changes to properly hide spinner
  useEffect(() => {
    if (isNavigating) {
      // Give the page more time to load and render complex pages
      const timer = setTimeout(() => {
        setIsNavigating(false)
      }, 5000) // Increased to 5 seconds for heavy pages like employees

      return () => clearTimeout(timer)
    }
  }, [pathname, isNavigating])

  // Additional effect to hide spinner when pathname actually changes
  useEffect(() => {
    if (isNavigating) {
      // If the pathname changed, the navigation was successful
      // Wait a bit more for rendering, then hide spinner
      const renderTimer = setTimeout(() => {
        setIsNavigating(false)
      }, 1000) // 1 second after pathname change for rendering

      return () => clearTimeout(renderTimer)
    }
  }, [pathname])

  const navigateTo = async (href: string) => {
    // If we're already on the target page, don't show spinner
    if (pathname === href) {
      return
    }

    setIsNavigating(true)
    try {
      await router.push(href)
      // Don't immediately hide spinner - let the useEffect handle it
    } catch (error) {
      console.error('Navigation error:', error)
      setIsNavigating(false)
    }
  }

  return (
    <NavigationContext.Provider value={{ isNavigating, navigateTo }}>
      {children}
    </NavigationContext.Provider>
  )
}

export function useNavigation() {
  const context = useContext(NavigationContext)
  if (!context) {
    throw new Error('useNavigation must be used within NavigationProvider')
  }
  return context
}