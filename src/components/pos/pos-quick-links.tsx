'use client'

// MBM-360: always-visible shortcuts on every POS, next to its tools —
// Receipt History for everyone on the till; End of Day and Item Sales for
// people who can see the business's reports (the sidebar's own rule).
import Link from 'next/link'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'

// Business types with their own End of Day / Item Sales report pages
const REPORT_TYPES = ['clothing', 'grocery', 'hardware', 'restaurant']

export function PosQuickLinks({ businessType, businessId, className = '' }: {
  businessType?: string | null
  businessId?: string | null
  className?: string
}) {
  const { hasPermission, isSystemAdmin } = useBusinessPermissionsContext()
  const canReports = isSystemAdmin || hasPermission('canViewWifiReports') || hasPermission('canAccessFinancialData')
  const type = businessType && REPORT_TYPES.includes(businessType) ? businessType : null
  const pill = 'inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm font-medium text-primary whitespace-nowrap transition-colors'

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      <Link href={`/universal/receipts${businessId ? `?businessId=${businessId}` : ''}`} className={pill} title="Receipt History">
        🧾 <span className="hidden sm:inline">Receipts</span>
      </Link>
      {canReports && type && (
        <>
          <Link href={`/${type}/reports/daily-item-sales`} className={pill} title="Item Sales">
            📦 <span className="hidden sm:inline">Item Sales</span>
          </Link>
          <Link href={`/${type}/reports/end-of-day`} className={pill} title="End of Day report">
            🌙 <span className="hidden sm:inline">End of Day</span>
          </Link>
        </>
      )}
    </div>
  )
}
