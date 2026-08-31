'use client'

/**
 * Shows which Electron-registered server the app is currently talking to,
 * persistently across every authenticated page — not just the landing/sign-in
 * pages (which only show it before login). A cashier switching between a test
 * server and the real one has no other way to tell which one they're on once
 * they're past sign-in. No-op outside Electron (window.electron is undefined)
 * or on the customer-facing display, which isn't staff-facing.
 */

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

export function ConditionalServerIndicator() {
  const pathname = usePathname()
  const [label, setLabel] = useState<string | null>(null)

  useEffect(() => {
    if (!window.electron?.isElectron) return
    window.electron.getActiveServer()
      .then((server) => setLabel(server?.label ?? null))
      .catch(() => {})
  }, [])

  if (pathname === '/customer-display') return null
  if (!label) return null

  return (
    // bottom-left, not top-left: the real app header already fills that
    // corner on every authenticated page (logo/branding), so the pill sat
    // on top of it. FloatingChat and HealthIndicator both live bottom-right,
    // so bottom-left is the one corner nothing else already occupies.
    <div className="fixed bottom-4 left-4 z-[9999] flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 shadow-md">
      <span className="h-2 w-2 rounded-full bg-blue-500" />
      Connected to: {label}
    </div>
  )
}
