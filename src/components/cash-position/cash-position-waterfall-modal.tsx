'use client'

import type { CashPositionData } from './cash-position-cards'

/**
 * MBM-287 §4: "why is this the number" for Closing Balance and Available
 * Cash. Both figures are already fully derived from `cashPosition`/
 * `setAsideBreakdown` that callers have already fetched — this is purely
 * presentational, no new API calls.
 */

export interface SetAsideRowLike {
  purpose: string
  stillAvailable: number
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

export function CashPositionWaterfallModal({
  mode,
  cashPosition,
  setAsideBreakdown,
  onClose,
  onDrill,
}: {
  mode: 'closing' | 'available'
  cashPosition: CashPositionData
  setAsideBreakdown: SetAsideRowLike[]
  onClose: () => void
  /** Optional — omit a key to render that row as plain text, not a link. */
  onDrill?: Partial<Record<'cashIn' | 'setAside' | 'expenses', () => void>>
}) {
  const c = cashPosition.combined
  const earmarked = setAsideBreakdown.filter((r) => r.stillAvailable > 0.005)

  const Row = ({
    label, value, sign, onClick, bold,
  }: { label: string; value: number; sign?: '+' | '−'; onClick?: () => void; bold?: boolean }) => (
    <div
      onClick={onClick}
      className={`flex items-center justify-between px-3 py-2 rounded ${onClick ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700' : ''} ${bold ? 'font-semibold' : ''}`}
    >
      <span className={onClick ? 'text-blue-600 dark:text-blue-400 hover:underline' : 'text-secondary'}>
        {sign ? `${sign} ` : ''}{label}
      </span>
      <span className="text-primary">{fmt(value)}</span>
    </div>
  )

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="card max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h3 className="font-semibold text-primary">
            {mode === 'closing' ? 'How Closing Balance is calculated' : 'How Available Cash is calculated'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">✕</button>
        </div>
        <div className="p-3 divide-y divide-border">
          {mode === 'closing' ? (
            <>
              <Row label="Opening Balance" value={c.openingBalance} />
              <Row label="Cash In" sign="+" value={c.cashIn} onClick={onDrill?.cashIn} />
              <Row label="Set Aside" sign="−" value={c.setAside} onClick={onDrill?.setAside} />
              <Row label="Expenses" sign="−" value={c.expenses} onClick={onDrill?.expenses} />
              {Math.abs(c.adjustments) > 0.009 && (
                <Row label="Adjustments" sign={c.adjustments >= 0 ? '+' : '−'} value={Math.abs(c.adjustments)} />
              )}
              <Row label="= Closing Balance" value={c.closingBalance} bold />
            </>
          ) : (
            <>
              <Row label="Closing Balance" value={c.closingBalance} />
              {earmarked.length > 0 ? (
                earmarked.map((r) => (
                  <Row key={r.purpose} label={`Earmarked — ${r.purpose}`} sign="−" value={r.stillAvailable} />
                ))
              ) : (
                <p className="px-3 py-2 text-xs text-secondary">Nothing currently earmarked.</p>
              )}
              <Row label="= Available Cash" value={c.availableBalance} bold />
            </>
          )}
        </div>
      </div>
    </div>
  )
}
