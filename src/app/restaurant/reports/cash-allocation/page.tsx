'use client'

export const dynamic = 'force-dynamic'

import { useSearchParams } from 'next/navigation'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { CashAllocationDailyReport } from '@/components/reports/cash-allocation-daily-report'
import { CashAllocationGroupedReport } from '@/components/reports/cash-allocation-grouped-report'
import { ContentLayout } from '@/components/layout/content-layout'

export default function RestaurantCashAllocation() {
  const { currentBusinessId, businesses, isSystemAdmin } = useBusinessPermissionsContext()
  const searchParams = useSearchParams()
  const lockedDate = searchParams.get('date')
  const reportId = searchParams.get('reportId')
  const businessIdOverride = searchParams.get('businessId')

  const businessId = currentBusinessId ||
    (isSystemAdmin ? businesses?.find(b => b.businessType === 'restaurant' && b.isActive)?.businessId ?? null : null)

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
        <CashAllocationGroupedReport businessId={businessIdOverride || businessId} reportId={reportId} />
      ) : (
        <CashAllocationDailyReport
          businessId={businessId}
          businessType="restaurant"
          lockedDate={lockedDate}
          businessIdOverride={businessIdOverride}
        />
      )}
    </ContentLayout>
  )
}
