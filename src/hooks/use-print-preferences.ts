'use client'

import { useState, useEffect } from 'react'

interface PrintPreferences {
  autoPrintReceipt: boolean
  defaultPrinterId?: string
}

const DEFAULT_PREFERENCES: PrintPreferences = {
  autoPrintReceipt: false,
  defaultPrinterId: undefined
}

const STORAGE_KEY = 'print-preferences'

export function usePrintPreferences() {
  const [preferences, setPreferences] = useState<PrintPreferences>(DEFAULT_PREFERENCES)
  const [isLoaded, setIsLoaded] = useState(false)

  // Load preferences from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as PrintPreferences
        setPreferences({ ...DEFAULT_PREFERENCES, ...parsed })
      }
    } catch (error) {
      console.error('Failed to load print preferences:', error)
    } finally {
      setIsLoaded(true)
    }
  }, [])

  // Save preferences to localStorage
  const savePreferences = (newPreferences: Partial<PrintPreferences>) => {
    const updated = { ...preferences, ...newPreferences }
    setPreferences(updated)

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
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
