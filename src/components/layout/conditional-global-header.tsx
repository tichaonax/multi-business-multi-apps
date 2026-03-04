'use client'

/**
 * Conditional Global Header
 *
 * Wraps GlobalHeader and conditionally renders it based on the current route.
 * Hides navigation on customer-facing display pages.
 */

import { usePathname } from 'next/navigation'
import { GlobalHeader } from './global-header'

export function ConditionalGlobalHeader() {
  const pathname = usePathname()

  // Hide header on customer display and all auth pages
  if (pathname === '/customer-display' || pathname.startsWith('/auth')) {
    return null
  }

  // Show header on all other pages
  return <GlobalHeader />
}
