'use client'

// MBM-360: always-visible shortcuts on every POS, next to its tools —
// Receipt History for everyone on the till; End of Day and Item Sales for
// people who can see the business's reports (the sidebar's own rule); then
// the user's own most used pages ("My shortcuts", learned per user).
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { useMyShortcuts } from '@/components/shortcuts/my-shortcuts'
import { shortcutPath } from '@/lib/shortcuts/page-shortcuts'

// Business types with their own End of Day / Item Sales report pages
const REPORT_TYPES = ['clothing', 'grocery', 'hardware', 'restaurant']

export function PosQuickLinks({ businessType, businessId, className = '' }: {
  businessType?: string | null
  businessId?: string | null
  className?: string
}) {
  const { hasPermission, isSystemAdmin } = useBusinessPermissionsContext()
  const { shortcuts } = useMyShortcuts()
  const here = shortcutPath(usePathname() || '')
  const canReports = isSystemAdmin || hasPermission('canViewWifiReports') || hasPermission('canAccessFinancialData')
  const type = businessType && REPORT_TYPES.includes(businessType) ? businessType : null
  const pill = 'inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm font-medium text-primary whitespace-nowrap transition-colors'

  const fixed = ['/universal/receipts', ...(canReports && type ? [`/${type}/reports/daily-item-sales`, `/${type}/reports/end-of-day`] : [])]
  // the user's own pages, not already here, not this page; a few only
  const mine = shortcuts.filter(s => !s.starter && !fixed.includes(s.path) && s.path !== here).slice(0, 4)

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
      {mine.map(s => (
        <Link key={s.path} href={s.path} className={`${pill} hidden sm:inline-flex max-w-[12rem]`} title={`${s.label} (my shortcut)`}>
          ⭐ <span className="truncate">{s.label.split(' · ').pop()}</span>
        </Link>
      ))}
    </div>
  )
}
