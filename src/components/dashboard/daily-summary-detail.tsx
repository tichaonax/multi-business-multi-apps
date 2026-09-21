'use client'

import { useState } from 'react'
import { CollapsibleSection } from '@/components/ui/collapsible-section'
import { DailyDetailModal } from '@/components/dashboard/daily-detail-modal'
import type { FilterTab } from '@/components/reports/daily-detail-shared'

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
 * stays compact. Sales/Expenses/Set Aside open the same Daily Detail data
 * as a modal (DailyDetailModal) instead of navigating away, so closing it
 * — or closing an item's own detail modal opened from within it — always
 * lands back on this exact card, never anywhere else.
 */
export function DailySummaryDetail({
  today,
  yesterday,
  businessIds,
}: {
  today: DaySummary
  yesterday: DaySummary
  businessIds: string[]
}) {
  const [modalState, setModalState] = useState<{ date: string; filter: FilterTab } | null>(null)

  if (businessIds.length === 0) return null

  const Row = ({ label, day }: { label: string; day: DaySummary }) => (
    <div className="space-y-1 py-1.5 border-t border-gray-100 dark:border-gray-700/50 first:border-t-0 first:pt-0">
      <p className="text-[10px] font-semibold text-secondary uppercase tracking-wide">{label}</p>
      <button
        onClick={() => setModalState({ date: day.date, filter: 'sales' })}
        className="w-full flex items-center justify-between text-xs hover:underline text-left"
      >
        <span className="text-secondary flex items-center gap-1">💰 Sales</span>
        <span className="font-semibold text-emerald-600 dark:text-emerald-400">{money(day.salesTotal)}</span>
      </button>
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
      <button
        onClick={() => setModalState({ date: day.date, filter: 'expenses' })}
        className="w-full flex items-center justify-between text-xs hover:underline text-left"
      >
        <span className="text-secondary flex items-center gap-1">💸 Expenses</span>
        <span className="font-semibold text-red-500 dark:text-red-400">{money(day.expenses)}</span>
      </button>
      <button
        onClick={() => setModalState({ date: day.date, filter: 'setaside' })}
        className="w-full flex items-center justify-between text-xs hover:underline text-left"
      >
        <span className="text-secondary flex items-center gap-1">🔒 Set Aside</span>
        <span className="font-semibold text-amber-500 dark:text-amber-400">{money(day.setAside)}</span>
      </button>
    </div>
  )

  return (
    // Cards this sits inside are themselves clickable (open the revenue
    // breakdown modal) — stop every click here from bubbling up into that,
    // so tapping a row or the collapse toggle does only one thing.
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

      {modalState && (
        <DailyDetailModal
          isOpen
          onClose={() => setModalState(null)}
          businessIds={businessIds}
          date={modalState.date}
          initialFilter={modalState.filter}
        />
      )}
    </div>
  )
}
