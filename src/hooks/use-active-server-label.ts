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
    window.electron.getActiveServer()
      .then((server) => setLabel(server?.label ?? null))
      .catch(() => {})
  }, [])

  return label
}
