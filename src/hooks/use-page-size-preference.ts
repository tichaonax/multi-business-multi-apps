'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSession } from 'next-auth/react'

// User-level setting for how many rows paginated lists show per page.
// Applies wherever a list reads this hook (currently the universal inventory
// grid; other paginated pages can opt in the same way as they're migrated
// to the shared Pagination component).
export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100, 200] as const

export const DEFAULT_PAGE_SIZE = 50
const GLOBAL_STORAGE_KEY = 'page-size-preference'

export function usePageSizePreference() {
  const { data: session } = useSession()
  const userId = (session?.user as any)?.id
  const storageKey = userId ? `page-size-preference-${userId}` : GLOBAL_STORAGE_KEY

  const [pageSize, setPageSizeState] = useState<number>(DEFAULT_PAGE_SIZE)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey)
      const parsed = stored ? parseInt(stored, 10) : NaN
      if (!isNaN(parsed) && parsed > 0) {
        setPageSizeState(parsed)
        setIsLoaded(true)
        return
      }
    } catch (error) {
      console.error('Failed to load page size preference:', error)
    }

    // Electron's per-server window runs a deliberately non-persistent
    // session partition (see electron/main.js's partitionNameFor), so
    // localStorage doesn't survive an app restart. If it came up empty,
    // fall back to the device-level copy kept outside that session in
    // electron-store (see electron/server-registry.js's getPageSize),
    // same pattern theme-context.tsx uses for the light/dark preference.
    if (window.electron && typeof window.electron.getPageSize === 'function' && userId) {
      window.electron.getPageSize(userId).then((stored) => {
        if (stored && stored > 0) {
          setPageSizeState(stored)
          try { localStorage.setItem(storageKey, String(stored)) } catch {}
        }
        setIsLoaded(true)
      }).catch(() => setIsLoaded(true))
    } else {
      setIsLoaded(true)
    }
  }, [storageKey, userId])

  // Keep every mounted instance (e.g. Profile Settings in one tab/window,
  // an inventory list in another — this app already runs a POS window
  // alongside a customer-display window sharing the same session) in sync
  // when the value changes elsewhere, so "the user must know" also holds
  // for a view that didn't make the change itself.
  useEffect(() => {
    function handleStorage(e: StorageEvent) {
      if (e.key !== storageKey || e.newValue == null) return
      const parsed = parseInt(e.newValue, 10)
      if (!isNaN(parsed) && parsed > 0) setPageSizeState(parsed)
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [storageKey])

  const setPageSize = useCallback((size: number) => {
    setPageSizeState(size)
    try {
      localStorage.setItem(storageKey, String(size))
    } catch (error) {
      console.error('Failed to save page size preference:', error)
    }
    // Also persist outside the session's own storage so it survives an
    // Electron app restart — see the effect above for why that's needed.
    window.electron?.setPageSize?.(userId, size)
  }, [storageKey, userId])

  return { pageSize, setPageSize, isLoaded }
}

/**
 * Per-page-view wrapper around the global preference: a page can let the
 * user temporarily show a different row count just for its own current
 * view (e.g. "show 100 here right now") without touching the persisted
 * global default — and reset back to that default without resetting it
 * either, since the override never wrote to storage in the first place.
 *
 * `notifyOnGlobalChange` fires (with the new value) whenever the global
 * default itself changes while this page is mounted and not currently
 * overridden locally — e.g. the user updated it on the Profile Settings
 * page in another tab — so the page can toast "the user must know".
 */
export function usePageSize(explicitPageSize?: number, notifyOnGlobalChange?: (newSize: number) => void) {
  const { pageSize: globalPageSize, isLoaded } = usePageSizePreference()
  const [localOverride, setLocalOverride] = useState<number | null>(null)
  const prevGlobalRef = useRef<number | null>(null)

  useEffect(() => {
    if (!isLoaded) return
    if (prevGlobalRef.current !== null && prevGlobalRef.current !== globalPageSize) {
      if (localOverride === null) {
        notifyOnGlobalChange?.(globalPageSize)
      }
    }
    prevGlobalRef.current = globalPageSize
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [globalPageSize, isLoaded])

  const pageSize = explicitPageSize ?? localOverride ?? globalPageSize
  const isOverridden = explicitPageSize === undefined && localOverride !== null && localOverride !== globalPageSize

  const resetToDefault = useCallback(() => setLocalOverride(null), [])

  return {
    pageSize,
    setPageSize: setLocalOverride,
    isOverridden,
    resetToDefault,
    globalPageSize,
    isLoaded,
  }
}
