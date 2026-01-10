'use client'

/**
 * Conditional Health Indicator
 *
 * Wraps HealthIndicator and conditionally renders it based on the current route.
 * Hides indicator on customer-facing display pages.
 */

import { usePathname } from 'next/navigation'
import HealthIndicator from '@/components/ui/health-indicator'

export function ConditionalHealthIndicator() {
  const pathname = usePathname()

  // Hide health indicator on customer display page
  if (pathname === '/customer-display') {
    return null
  }

  // Show health indicator on all other pages
  return (
    <HealthIndicator
      position="bottom-right"
      showFullOnDesktop={true}
      enableClickToExpand={true}
    />
  )
}
