'use client'

import { useEffect, useState } from 'react'

/**
 * The Electron-registered server's label ("Connected to: X"), or null
 * outside Electron / before it's loaded. Shared by the pre-login floating
 * indicator (landing/sign-in pages, which have no GlobalHeader) and
 * GlobalHeader's own inline badge (authenticated pages) — one IPC fetch
 * implementation instead of two copies that could drift.
 */
export function useActiveServerLabel(): string | null {
  const [label, setLabel] = useState<string | null>(null)

  useEffect(() => {
    if (!window.electron?.isElectron) return
    // A method missing on an older installed Electron shell throws
    // synchronously when called, not as a promise rejection .catch() would
    // see — guard its existence explicitly rather than let that crash the
    // page (see use-electron-app-version.ts's identical guard/comment).
    if (typeof window.electron.getActiveServer !== 'function') return
    window.electron.getActiveServer()
      .then((server) => setLabel(server?.label ?? null))
      .catch(() => {})
  }, [])

  return label
}
