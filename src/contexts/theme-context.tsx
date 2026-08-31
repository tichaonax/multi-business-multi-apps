'use client'

import { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'light' | 'dark' | 'system'

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
  resolvedTheme: 'light' | 'dark'
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

interface ThemeProviderProps {
  children: React.ReactNode
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  // Initialize theme from localStorage immediately to prevent flash
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'system'
    const stored = localStorage.getItem('theme') as Theme
    return stored && ['light', 'dark', 'system'].includes(stored) ? stored : 'system'
  })

  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'light'

    // Determine initial resolved theme
    const stored = localStorage.getItem('theme') as Theme
    const initialTheme = stored && ['light', 'dark', 'system'].includes(stored) ? stored : 'system'

    if (initialTheme === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }
    return initialTheme
  })

  // Electron's per-server window runs a deliberately non-persistent session
  // partition (see electron/main.js's partitionNameFor) so login never
  // survives an app restart — but that wipes the *entire* in-memory
  // storage for that partition, localStorage included, taking the theme
  // choice down with it even though it has nothing to do with login. If
  // localStorage came up empty (a fresh post-restart session) and this is
  // Electron, fall back to the device-level copy kept outside that session
  // in electron-store (see electron/server-registry.js's getTheme/setTheme)
  // instead of silently reverting to 'system'.
  useEffect(() => {
    if (!window.electron || localStorage.getItem('theme')) return
    window.electron.getTheme().then((stored) => {
      if (stored && ['light', 'dark', 'system'].includes(stored)) {
        setThemeState(stored)
        localStorage.setItem('theme', stored)
      }
    })
  }, [])

  // Update resolved theme based on system preference and current theme
  useEffect(() => {
    const updateResolvedTheme = () => {
      if (theme === 'system') {
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
        setResolvedTheme(systemTheme)
      } else {
        setResolvedTheme(theme)
      }
    }

    updateResolvedTheme()

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => {
      if (theme === 'system') {
        updateResolvedTheme()
      }
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [theme])

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement
    root.classList.remove('light', 'dark')
    root.classList.add(resolvedTheme)
    
    // Set color-scheme for better browser integration
    root.style.colorScheme = resolvedTheme
  }, [resolvedTheme])

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
    localStorage.setItem('theme', newTheme)
    // Also persist outside the session's own storage so it survives an
    // Electron app restart — see the effect above for why that's needed.
    window.electron?.setTheme(newTheme)
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}