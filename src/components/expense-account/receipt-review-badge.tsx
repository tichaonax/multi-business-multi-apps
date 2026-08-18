'use client'

import { useState } from 'react'

interface ReceiptReviewBadgeProps {
  status: string // PENDING | SUBMITTED | APPROVED
  total: number
  expected: number
  daysSincePaid: number
  onClick: () => void
}

// MBM-271: color-coded badge for payments requiring receipt accountability
// (combo pay disbursements, opt-in advances) — green once the cashier has
// approved, orange while outstanding, red once past the 7-day escalation mark.
// Hover shows a small popover with the current total vs. expected balance;
// click opens the full receipt list (Add/View Receipts modal).
export function ReceiptReviewBadge({ status, total, expected, daysSincePaid, onClick }: ReceiptReviewBadgeProps) {
  const [hover, setHover] = useState(false)
  const remaining = expected - total

  const colorClasses =
    status === 'APPROVED'
      ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800/60'
      : daysSincePaid >= 7
      ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-800/60'
      : 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-800/60'

  const statusLabel =
    status === 'APPROVED' ? 'Approved' : status === 'SUBMITTED' ? 'Awaiting cashier review' : 'Not yet submitted'

  return (
    <div className="relative inline-block ml-1" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <button
        onClick={(e) => { e.stopPropagation(); onClick() }}
        className={`inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded font-medium transition-colors ${colorClasses}`}
      >
        🧾 {total > 0 ? `$${total.toFixed(0)}` : '0'}
      </button>

      {hover && (
        <div
          className="absolute z-20 top-full right-0 mt-1 w-56 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs space-y-1.5"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="font-semibold text-gray-900 dark:text-gray-100">{statusLabel}</p>
          <div className="flex justify-between text-gray-600 dark:text-gray-300">
            <span>Receipts so far</span>
            <span>${total.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-gray-600 dark:text-gray-300">
            <span>Expected</span>
            <span>${expected.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-medium border-t border-gray-100 dark:border-gray-700 pt-1">
            <span className="text-gray-700 dark:text-gray-200">Remaining</span>
            <span className={remaining > 0.01 ? 'text-amber-600 dark:text-amber-400' : remaining < -0.01 ? 'text-blue-600 dark:text-blue-400' : 'text-green-600 dark:text-green-400'}>
              ${remaining.toFixed(2)}
            </span>
          </div>
          {status !== 'APPROVED' && (
            <p className="text-gray-400 dark:text-gray-500">{daysSincePaid}d since funds issued</p>
          )}
        </div>
      )}
    </div>
  )
}
