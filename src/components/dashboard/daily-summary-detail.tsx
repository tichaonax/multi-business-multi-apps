'use client'

import Link from 'next/link'
import { CollapsibleSection } from '@/components/ui/collapsible-section'

export interface DaySummary {
  date: string
  salesTotal: number
  cashSales: number
  ecocashSales: number
  expenses: number
  setAside: number
}

const money = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

/**
 * Today/Yesterday drill-down block for the homepage's per-business-type
 * (and umbrella "All") summary cards — collapsed by default so the card
 * stays compact, but every figure inside links straight to
 * /reports/daily-detail (Sales/Expenses/Set Aside tabs, same report the
 * per-business Sales Analytics pages already use) with `returnTo=/dashboard`
 * so the user lands back on this exact card after drilling in or editing.
 */
export function DailySummaryDetail({
  today,
  yesterday,
  businessIds,
  businessType,
}: {
  today: DaySummary
  yesterday: DaySummary
  businessIds: string[]
  businessType: string | null
}) {
  if (businessIds.length === 0) return null

  const idsParam = encodeURIComponent(businessIds.join(','))
  const typeParam = businessType ? `&businessType=${encodeURIComponent(businessType)}` : ''
  const returnTo = encodeURIComponent('/dashboard')

  function drillHref(date: string, filter: 'sales' | 'expenses' | 'setaside') {
    return `/reports/daily-detail?businessId=${idsParam}${typeParam}&date=${date}&filter=${filter}&returnTo=${returnTo}`
  }

  const Row = ({ label, day }: { label: string; day: DaySummary }) => (
    <div className="space-y-1 py-1.5 border-t border-gray-100 dark:border-gray-700/50 first:border-t-0 first:pt-0">
      <p className="text-[10px] font-semibold text-secondary uppercase tracking-wide">{label}</p>
      <Link href={drillHref(day.date, 'sales')} className="flex items-center justify-between text-xs hover:underline">
        <span className="text-secondary flex items-center gap-1">💰 Sales</span>
        <span className="font-semibold text-emerald-600 dark:text-emerald-400">{money(day.salesTotal)}</span>
      </Link>
      {day.salesTotal > 0 && (
        <div className="pl-3 space-y-0.5">
          <div className="flex items-center justify-between text-[10px] text-secondary">
            <span>💵 Cash</span><span>{money(day.cashSales)}</span>
          </div>
          <div className="flex items-center justify-between text-[10px] text-secondary">
            <span>📱 EcoCash</span><span className="text-teal-600 dark:text-teal-400">{money(day.ecocashSales)}</span>
          </div>
        </div>
      )}
      <Link href={drillHref(day.date, 'expenses')} className="flex items-center justify-between text-xs hover:underline">
        <span className="text-secondary flex items-center gap-1">💸 Expenses</span>
        <span className="font-semibold text-red-500 dark:text-red-400">{money(day.expenses)}</span>
      </Link>
      <Link href={drillHref(day.date, 'setaside')} className="flex items-center justify-between text-xs hover:underline">
        <span className="text-secondary flex items-center gap-1">🔒 Set Aside</span>
        <span className="font-semibold text-amber-500 dark:text-amber-400">{money(day.setAside)}</span>
      </Link>
    </div>
  )

  return (
    // Cards this sits inside are themselves clickable (open the revenue
    // breakdown modal) — stop every click here from bubbling up into that,
    // so tapping a link or the collapse toggle does only one thing.
    <div onClick={(e) => e.stopPropagation()}>
      <CollapsibleSection
        title="Today & Yesterday"
        icon="📅"
        defaultOpen={false}
        badge={
          <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-[11px] ml-1">
            Today: {money(today.salesTotal)}
          </span>
        }
      >
        <Row label="Today" day={today} />
        <Row label="Yesterday" day={yesterday} />
      </CollapsibleSection>
    </div>
  )
}
