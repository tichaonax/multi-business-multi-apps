'use client'

/**
 * Conditional Global Header
 *
 * Wraps GlobalHeader and conditionally renders it based on the current route.
 * Hides navigation on customer-facing display pages.
 */

import { usePathname, useSearchParams } from 'next/navigation'
import { GlobalHeader } from './global-header'

export function ConditionalGlobalHeader() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Hide header on customer display, auth pages, popup print windows, and the
  // restricted contractor portal (contractors have no BusinessPermissions/memberships
  // and must never see the normal business nav or any other business's links)
  if (
    pathname === '/customer-display' ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/vehicle-service/contractor-portal') ||
    searchParams.get('popup') === '1'
  ) {
    return null
  }

  // Show header on all other pages
  return <GlobalHeader />
}
