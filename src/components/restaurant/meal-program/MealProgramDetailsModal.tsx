'use client'

import { useState, useEffect } from 'react'

interface MealTx {
  id: string
  participantName: string
  participantType: string
  orderNumber: string
  subsidyAmount: number
  cashAmount: number
  totalAmount: number
  subsidizedProductName: string
  soldByName?: string
  transactionDate: string
  notes?: string
}

interface Props {
  businessId: string
  businessDayStart: string // ISO string — start of business day
  businessDayEnd: string   // ISO string — end of business day
  date: string             // YYYY-MM-DD for display
  summary: {
    count: number
    subsidyTotal: number
    cashTotal: number
    total: number
  }
  onClose: () => void
}

export function MealProgramDetailsModal({ businessId, businessDayStart, businessDayEnd, date, summary, onClose }: Props) {
  const [transactions, setTransactions] = useState<MealTx[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const params = new URLSearchParams({
          businessId,
          dateFrom: businessDayStart,
          dateTo: businessDayEnd,
          limit: '100',
        })
        const res = await fetch(`/api/restaurant/meal-program/transactions?${params}`)
        const data = await res.json()
        if (data.success) setTransactions(data.data)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [businessId, businessDayStart, businessDayEnd])

  const fmt = (n: number) => `$${n.toFixed(2)}`
  const fmtTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl flex flex-col"
        style={{ maxHeight: '80vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              🍱 Meal Program
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{date}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 flex-shrink-0"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Summary bar */}
        <div className="grid grid-cols-4 divide-x divide-gray-200 dark:divide-gray-700 border-b border-gray-200 dark:border-gray-700 text-center">
          <div className="px-3 py-2">
            <div className="text-xs text-gray-500 dark:text-gray-400">Transactions</div>
            <div className="text-base font-bold text-gray-900 dark:text-gray-100">{summary.count}</div>
          </div>
          <div className="px-3 py-2">
            <div className="text-xs text-gray-500 dark:text-gray-400">Subsidy</div>
            <div className="text-base font-bold text-green-600 dark:text-green-400">{fmt(summary.subsidyTotal)}</div>
          </div>
          <div className="px-3 py-2">
            <div className="text-xs text-gray-500 dark:text-gray-400">Cash</div>
            <div className="text-base font-bold text-blue-600 dark:text-blue-400">{fmt(summary.cashTotal)}</div>
          </div>
          <div className="px-3 py-2">
            <div className="text-xs text-gray-500 dark:text-gray-400">Total</div>
            <div className="text-base font-bold text-gray-900 dark:text-gray-100">{fmt(summary.total)}</div>
          </div>
        </div>

        {/* Transaction list */}
        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
              Loading...
            </div>
          ) : transactions.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
              No transactions found
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-50 dark:bg-gray-700">
                <tr className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  <th className="text-left px-4 py-2">Time</th>
                  <th className="text-left px-4 py-2">Participant</th>
                  <th className="text-left px-4 py-2 hidden sm:table-cell">Item</th>
                  <th className="text-right px-4 py-2">Subsidy</th>
                  <th className="text-right px-4 py-2">Cash</th>
                  <th className="text-right px-4 py-2">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {transactions.map(t => (
                  <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {fmtTime(t.transactionDate)}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="font-medium text-gray-900 dark:text-gray-100">{t.participantName}</div>
                      {t.soldByName && (
                        <div className="text-xs text-gray-400 dark:text-gray-500">by {t.soldByName}</div>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-gray-700 dark:text-gray-300 hidden sm:table-cell max-w-[160px]">
                      <div className="truncate">{t.subsidizedProductName}</div>
                    </td>
                    <td className="px-4 py-2.5 text-right text-green-600 dark:text-green-400 whitespace-nowrap">
                      {fmt(t.subsidyAmount)}
                    </td>
                    <td className="px-4 py-2.5 text-right text-blue-600 dark:text-blue-400 whitespace-nowrap">
                      {t.cashAmount > 0 ? fmt(t.cashAmount) : <span className="text-gray-300 dark:text-gray-600">—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-right font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap">
                      {fmt(t.totalAmount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
