'use client'

/**
 * MBM-287: the shared "Cash Position" summary card row — Opening/Cash In/
 * Set Aside/Expenses/Available/Closing — used on both the Cash Bucket page
 * and the dashboard so they render the exact same numbers the exact same
 * way for the same business + date range (the whole point of this ticket).
 * Purely presentational — callers fetch from GET /api/cash-bucket, which is
 * the one place this data is computed (calculateCashPosition).
 */

export interface CashPositionRow {
  businessId: string
  businessName: string
  openingBalance: number
  cashIn: number
  setAside: number
  expenses: number
  adjustments: number
  closingBalance: number
  currentlyEarmarked: number
  availableBalance: number
}

export interface CashPositionData {
  businesses: CashPositionRow[]
  combined: Omit<CashPositionRow, 'businessId' | 'businessName'>
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

export function CashPositionCards({
  cashPosition,
  period,
  title = 'Cash Position',
  onCardClick,
}: {
  cashPosition: CashPositionData
  period?: { start: string; end: string } | null
  title?: string
  /** MBM-287 §4: optional drill-down — omit a key to leave that card inert. */
  onCardClick?: Partial<Record<'cashIn' | 'setAside' | 'expenses' | 'availableBalance' | 'closingBalance', () => void>>
}) {
  const c = cashPosition.combined
  const cards = [
    { label: 'Opening Balance', value: c.openingBalance, color: 'text-gray-700 dark:text-gray-300', onClick: undefined },
    { label: 'Cash In', value: c.cashIn, color: 'text-green-600 dark:text-green-400', onClick: onCardClick?.cashIn },
    { label: 'Set Aside', value: c.setAside, color: 'text-amber-600 dark:text-amber-400', onClick: onCardClick?.setAside },
    { label: 'Expenses', value: c.expenses, color: 'text-red-600 dark:text-red-400', onClick: onCardClick?.expenses },
    { label: 'Available Cash', value: c.availableBalance, color: 'text-emerald-700 dark:text-emerald-300 font-bold', onClick: onCardClick?.availableBalance },
    { label: 'Closing Balance', value: c.closingBalance, color: 'text-gray-900 dark:text-gray-100 font-bold', onClick: onCardClick?.closingBalance },
  ]

  return (
    <div className="rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-5 py-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{title}</h3>
        {period && (
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {new Date(period.start).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            {' – '}
            {new Date(new Date(period.end).getTime() - 86400000).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {cards.map(card => (
          <div
            key={card.label}
            onClick={card.onClick}
            className={`rounded-md bg-gray-50 dark:bg-gray-900/40 px-3 py-2.5 ${card.onClick ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors' : ''}`}
            title={card.onClick ? 'Click to see the underlying transactions' : undefined}
          >
            <p className="text-xs text-gray-500 dark:text-gray-400">{card.label}</p>
            <p className={`text-lg mt-0.5 ${card.color}`}>{fmt(card.value)}</p>
          </div>
        ))}
      </div>
      {Math.abs(c.adjustments) > 0.009 && (
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
          Includes {fmt(c.adjustments)} in manual adjustments this period.
        </p>
      )}
    </div>
  )
}
