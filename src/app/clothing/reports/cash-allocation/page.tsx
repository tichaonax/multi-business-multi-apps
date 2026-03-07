'use client'

export const dynamic = 'force-dynamic'

import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { CashAllocationDailyReport } from '@/components/reports/cash-allocation-daily-report'
import { ContentLayout } from '@/components/layout/content-layout'

export default function ClothingCashAllocation() {
  const { currentBusinessId, businesses, isSystemAdmin } = useBusinessPermissionsContext()

  const businessId = currentBusinessId ||
    (isSystemAdmin ? businesses?.find(b => b.businessType === 'clothing' && b.isActive)?.businessId ?? null : null)

  if (!businessId) return null

  return (
    <ContentLayout
      title="💰 Cash Allocation Report"
      breadcrumb={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Clothing',  href: '/clothing' },
        { label: 'Reports',   href: '/clothing/reports' },
        { label: 'Cash Allocation', isActive: true },
      ]}
    >
      <CashAllocationDailyReport businessId={businessId} />
    </ContentLayout>
  )
}
