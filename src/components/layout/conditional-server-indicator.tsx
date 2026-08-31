'use client'

/**
 * Shows which Electron-registered server the app is currently talking to —
 * but ONLY on the pages that have no GlobalHeader (landing page, /auth/*):
 * see conditional-global-header.tsx's own exclusion list, which this
 * mirrors. Every other (authenticated) page already shows this inline in
 * GlobalHeader's own header bar instead — a floating overlay there had
 * nowhere free to sit: the top-left corner is the app's own logo/branding,
 * and both bottom corners are already used by the sidebar's user-profile
 * block, FloatingChat, and HealthIndicator.
 */

import { usePathname } from 'next/navigation'
import { useActiveServerLabel } from '@/hooks/use-active-server-label'

export function ConditionalServerIndicator() {
  const pathname = usePathname()
  const label = useActiveServerLabel()

  const hasNoGlobalHeader = pathname === '/' || pathname.startsWith('/auth')
  if (!hasNoGlobalHeader) return null
  if (!label) return null

  return (
    <div className="fixed bottom-4 left-4 z-[9999] flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 shadow-md">
      <span className="h-2 w-2 rounded-full bg-blue-500" />
      Connected to: {label}
    </div>
  )
}
