'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

const STORAGE_KEY = 'preferServerTime'
const EVENT_NAME = 'timeDisplayChange'

/**
 * Global hook for the UTC / Local time display preference.
 * Persists to localStorage so the setting survives navigation and page reloads.
 * Broadcasts a custom DOM event so every mounted instance (header + page) updates
 * in the same render cycle — no page reload needed.
 *
 * useServerTime === true  → show UTC (server time)
 * useServerTime === false → show local workstation time  (default)
 */
export function useTimeDisplay() {
  const [useServerTime, setUseServerTime] = useState(false)
  // Ref mirrors state so toggleTimeDisplay can read the current value
  // without being called from inside a setState updater (avoids the
  // "setState during render of another component" React error).
  const serverTimeRef = useRef(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored === 'true') {
        setUseServerTime(true)
        serverTimeRef.current = true
      }
    } catch {
      // SSR / private browsing — silently ignore
    }

    // Listen for changes dispatched by any other mounted instance of this hook
    const handler = (e: Event) => {
      const next = (e as CustomEvent<boolean>).detail
      serverTimeRef.current = next
      setUseServerTime(next)
    }
    window.addEventListener(EVENT_NAME, handler)
    return () => window.removeEventListener(EVENT_NAME, handler)
  }, [])

  const toggleTimeDisplay = useCallback(() => {
    // Compute next value from ref — NOT inside a setState updater so React
    // won't see a cross-component setState-during-render violation.
    const next = !serverTimeRef.current
    serverTimeRef.current = next
    try {
      localStorage.setItem(STORAGE_KEY, String(next))
    } catch {
      // ignore
    }
    setUseServerTime(next)
    // Notify every other mounted useTimeDisplay instance immediately
    window.dispatchEvent(new CustomEvent<boolean>(EVENT_NAME, { detail: next }))
  }, [])

  return { useServerTime, toggleTimeDisplay }
}
