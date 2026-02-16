'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'

interface PrintPreferences {
  autoPrintReceipt: boolean
  defaultPrinterId?: string
}

const DEFAULT_PREFERENCES: PrintPreferences = {
  autoPrintReceipt: false,
  defaultPrinterId: undefined
}

const GLOBAL_STORAGE_KEY = 'print-preferences'

export function usePrintPreferences() {
  const { data: session } = useSession()
  const userId = (session?.user as any)?.id
  const storageKey = userId ? `print-preferences-${userId}` : GLOBAL_STORAGE_KEY

  const [preferences, setPreferences] = useState<PrintPreferences>(DEFAULT_PREFERENCES)
  const [isLoaded, setIsLoaded] = useState(false)

  // Load preferences from localStorage (user-scoped, with migration from global key)
  useEffect(() => {
    try {
      let stored = localStorage.getItem(storageKey)
      // Migration: if no user-scoped value, check old global key and migrate
      if (!stored && userId) {
        const globalValue = localStorage.getItem(GLOBAL_STORAGE_KEY)
        if (globalValue) {
          stored = globalValue
          localStorage.setItem(storageKey, globalValue)
        }
      }
      if (stored) {
        const parsed = JSON.parse(stored) as PrintPreferences
        setPreferences({ ...DEFAULT_PREFERENCES, ...parsed })
      }
    } catch (error) {
      console.error('Failed to load print preferences:', error)
    } finally {
      setIsLoaded(true)
    }
  }, [storageKey, userId])

  // Save preferences to localStorage (user-scoped)
  const savePreferences = (newPreferences: Partial<PrintPreferences>) => {
    const updated = { ...preferences, ...newPreferences }
    setPreferences(updated)

    try {
      localStorage.setItem(storageKey, JSON.stringify(updated))
    } catch (error) {
      console.error('Failed to save print preferences:', error)
    }
  }

  const setAutoPrint = (enabled: boolean) => {
    savePreferences({ autoPrintReceipt: enabled })
  }

  const setDefaultPrinter = (printerId: string | undefined) => {
    savePreferences({ defaultPrinterId: printerId })
  }

  return {
    preferences,
    isLoaded,
    setAutoPrint,
    setDefaultPrinter,
    savePreferences
  }
}
