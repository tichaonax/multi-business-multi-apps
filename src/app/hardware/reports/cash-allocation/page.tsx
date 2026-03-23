'use client'

export const dynamic = 'force-dynamic'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { CashAllocationDailyReport } from '@/components/reports/cash-allocation-daily-report'
import { CashAllocationGroupedReport } from '@/components/reports/cash-allocation-grouped-report'
import { ContentLayout } from '@/components/layout/content-layout'

function HardwareCashAllocationContent() {
  const { currentBusinessId, businesses, isSystemAdmin } = useBusinessPermissionsContext()
  const searchParams = useSearchParams()
  const lockedDate = searchParams.get('date')
  const reportId = searchParams.get('reportId')
  const businessIdOverride = searchParams.get('businessId')

  const contextBusinessId = currentBusinessId ||
    (isSystemAdmin ? businesses?.find(b => b.businessType === 'hardware' && b.isActive)?.businessId ?? null : null)
  const businessId = businessIdOverride || contextBusinessId

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
      {reportId ? (
        <CashAllocationGroupedReport businessId={businessId} reportId={reportId} />
      ) : (
        <CashAllocationDailyReport
          businessId={businessId}
          businessType="hardware"
          lockedDate={lockedDate}
          businessIdOverride={null}
        />
      )}
    </ContentLayout>
  )
}

export default function HardwareCashAllocation() {
  return (
    <Suspense>
      <HardwareCashAllocationContent />
    </Suspense>
  )
}
