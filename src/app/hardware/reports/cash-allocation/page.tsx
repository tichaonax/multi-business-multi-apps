'use client'

export const dynamic = 'force-dynamic'

import { useSearchParams } from 'next/navigation'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { CashAllocationDailyReport } from '@/components/reports/cash-allocation-daily-report'
import { ContentLayout } from '@/components/layout/content-layout'

export default function HardwareCashAllocation() {
  const { currentBusinessId, businesses, isSystemAdmin } = useBusinessPermissionsContext()
  const searchParams = useSearchParams()
  const lockedDate = searchParams.get('date')
  const businessIdOverride = searchParams.get('businessId')

  const businessId = currentBusinessId ||
    (isSystemAdmin ? businesses?.find(b => b.businessType === 'hardware' && b.isActive)?.businessId ?? null : null)

  if (!businessId) return null

  return (
    <ContentLayout
      title="💰 Cash Allocation Report"
      breadcrumb={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Hardware',  href: '/hardware' },
        { label: 'Reports',   href: '/hardware/reports' },
        { label: 'Cash Allocation', isActive: true },
      ]}
    >
      <CashAllocationDailyReport
        businessId={businessId}
        businessType="hardware"
        lockedDate={lockedDate}
        businessIdOverride={businessIdOverride}
      />
    </ContentLayout>
  )
}
