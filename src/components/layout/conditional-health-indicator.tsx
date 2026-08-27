'use client'

/**
 * Conditional Health Indicator
 *
 * Wraps HealthIndicator and conditionally renders it based on the current route.
 * Hides indicator on customer-facing display pages.
 *
 * MBM-281 follow-up: re-enabled app-wide (previously always returned null —
 * server health was only shown via the small `inline` copy tucked inside the
 * user dropdown menu). Now that the indicator also layers in a live
 * workstation-agent check with a click-through to fix it, it's worth being
 * visible everywhere, not just the two pages (sign-in, dashboard) that used
 * to render their own standalone <HealthIndicator> directly.
 */

import { usePathname } from 'next/navigation'
import HealthIndicator from '@/components/ui/health-indicator'

export function ConditionalHealthIndicator() {
  const pathname = usePathname()

  // Hide health indicator on customer display page
  if (pathname === '/customer-display') {
    return null
  }

  return <HealthIndicator position="bottom-right" />
}
