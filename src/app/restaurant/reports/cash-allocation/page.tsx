'use client'

export const dynamic = 'force-dynamic'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { CashAllocationDailyReport } from '@/components/reports/cash-allocation-daily-report'
import { CashAllocationGroupedReport } from '@/components/reports/cash-allocation-grouped-report'
import { ContentLayout } from '@/components/layout/content-layout'

function RestaurantCashAllocationContent() {
  const { currentBusinessId, businesses, isSystemAdmin } = useBusinessPermissionsContext()
  const searchParams = useSearchParams()
  const lockedDate = searchParams.get('date')
  const reportId = searchParams.get('reportId')
  const businessIdOverride = searchParams.get('businessId')

  const isCurrentRestaurant = !!currentBusinessId && businesses?.find(b => b.businessId === currentBusinessId)?.businessType === 'restaurant'
  const contextBusinessId = isCurrentRestaurant
    ? currentBusinessId
    : (businesses?.find(b => b.businessType === 'restaurant' && b.isActive)?.businessId ?? null)
  const businessId = businessIdOverride || contextBusinessId
  // When businessIdOverride is set (admin/cashier viewing a specific business via URL param),
  // don't use the context businesses array for the name — it reflects the cashier's current
  // context business, not the target. Let the component's async fetch resolve the correct name.
  const businessName = businessIdOverride
    ? null
    : (businesses?.find(b => b.businessId === businessId)?.businessName ?? null)

  if (!businessId) return null

  return (
    <ContentLayout
      title="💰 Cash Allocation Report"
      breadcrumb={[
        { label: 'Dashboard',  href: '/dashboard' },
        { label: 'Restaurant', href: '/restaurant' },
        { label: 'Reports',    href: '/restaurant/reports' },
        { label: 'Cash Allocation', isActive: true },
      ]}
    >
      {reportId ? (
        <CashAllocationGroupedReport businessId={businessId} reportId={reportId} />
      ) : (
        <CashAllocationDailyReport
          businessId={businessId}
          businessName={businessName}
          businessType="restaurant"
          lockedDate={lockedDate}
          businessIdOverride={null}
        />
      )}
    </ContentLayout>
  )
}

export default function RestaurantCashAllocation() {
  return (
    <Suspense>
      <RestaurantCashAllocationContent />
    </Suspense>
  )
}
