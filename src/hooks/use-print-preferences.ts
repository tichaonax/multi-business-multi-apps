'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'

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
  const { currentBusinessId } = useBusinessPermissionsContext()
  // MBM-277: a default printer chosen while working in one business must
  // never carry over to another — a shared physical printer's AGENT routing
  // (NetworkPrinters.workstationAgentId) can point at a different business's
  // workstation agent than the one currently active, so a stale cross-
  // business printerId silently causes prints to dispatch to the wrong
  // (often offline, from this business's perspective) agent. See
  // ai-contexts/project-plans/review/projectplan-MBM-277-*.md.
  const storageKey = userId && currentBusinessId
    ? `print-preferences-${userId}-${currentBusinessId}`
    : userId
      ? `print-preferences-${userId}`
      : GLOBAL_STORAGE_KEY
  const legacyUserKey = userId ? `print-preferences-${userId}` : undefined

  const [preferences, setPreferences] = useState<PrintPreferences>(DEFAULT_PREFERENCES)
  const [isLoaded, setIsLoaded] = useState(false)

  // Load preferences from localStorage (business-scoped, with one-time
  // migration from the older user-only key, itself migrated from the
  // original global key).
  useEffect(() => {
    try {
      let stored = localStorage.getItem(storageKey)
      // Migration: if no business-scoped value yet, seed it from whatever
      // this user's old cross-business key held (their most recent pick
      // before businesses had their own key) — a one-time starting point,
      // not a live link; each business then keeps its own value from here.
      if (!stored && legacyUserKey && legacyUserKey !== storageKey) {
        const legacyValue = localStorage.getItem(legacyUserKey)
        if (legacyValue) {
          stored = legacyValue
          localStorage.setItem(storageKey, legacyValue)
        }
      }
      if (!stored) {
        const globalValue = localStorage.getItem(GLOBAL_STORAGE_KEY)
        if (globalValue) {
          stored = globalValue
          localStorage.setItem(storageKey, globalValue)
        }
      }
      if (stored) {
        const parsed = JSON.parse(stored) as PrintPreferences
        setPreferences({ ...DEFAULT_PREFERENCES, ...parsed })
      } else {
        setPreferences(DEFAULT_PREFERENCES)
      }
    } catch (error) {
      console.error('Failed to load print preferences:', error)
    } finally {
      setIsLoaded(true)
    }
  }, [storageKey, legacyUserKey])

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
