'use client'

// Force dynamic rendering for session-based pages
export const dynamic = 'force-dynamic'

import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { FinancialInsightsReport } from '@/components/reports/financial-insights-report'
import { ContentLayout } from '@/components/layout/content-layout'

export default function RestaurantFinancialInsights() {
  const { currentBusinessId, businesses, isSystemAdmin } = useBusinessPermissionsContext()

  const businessId = currentBusinessId ||
    (isSystemAdmin ? businesses?.find(b => b.businessType === 'restaurant' && b.isActive)?.businessId ?? null : null)

  if (!businessId) return null

  return (
    <ContentLayout
      title="📊 Financial Insights"
      breadcrumb={[
        { label: 'Dashboard',   href: '/dashboard' },
        { label: 'Restaurant',  href: '/restaurant' },
        { label: 'Reports',     href: '/restaurant/reports' },
        { label: 'Financial Insights', isActive: true },
      ]}
    >
      <FinancialInsightsReport businessId={businessId} businessType="restaurant" />
    </ContentLayout>
  )
}
