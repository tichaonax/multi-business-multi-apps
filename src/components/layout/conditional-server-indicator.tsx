'use client'

/**
 * Shows which Electron-registered server the app is currently talking to,
 * and which build of the kiosk shell itself is installed (amber + "update
 * available" when it's behind what the server expects — same idea as the
 * r710-agent's own update check) — but ONLY on the pages that have no
 * GlobalHeader (landing page, /auth/*): see conditional-global-header.tsx's
 * own exclusion list, which this mirrors. Every other (authenticated) page
 * already shows the server half of this inline in GlobalHeader's own header
 * bar instead — a floating overlay there had nowhere free to sit: the
 * top-left corner is the app's own logo/branding, and both bottom corners
 * are already used by the sidebar's user-profile block, FloatingChat, and
 * HealthIndicator.
 */

import { usePathname } from 'next/navigation'
import { useActiveServerLabel } from '@/hooks/use-active-server-label'
import { useElectronAppVersion } from '@/hooks/use-electron-app-version'

export function ConditionalServerIndicator() {
  const pathname = usePathname()
  const label = useActiveServerLabel()
  const { version, isOutdated } = useElectronAppVersion()

  const hasNoGlobalHeader = pathname === '/' || pathname.startsWith('/auth')
  if (!hasNoGlobalHeader) return null
  if (!label && !version) return null

  return (
    <div
      className={
        isOutdated
          ? 'fixed bottom-4 left-4 z-[9999] flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-800 shadow-md'
          : 'fixed bottom-4 left-4 z-[9999] flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 shadow-md'
      }
    >
      <span className={`h-2 w-2 rounded-full ${isOutdated ? 'bg-amber-500' : 'bg-blue-500'}`} />
      {label && <span>Connected to: {label}</span>}
      {label && version && <span aria-hidden>·</span>}
      {version && <span>v{version}{isOutdated ? ' — update available' : ''}</span>}
    </div>
  )
}
