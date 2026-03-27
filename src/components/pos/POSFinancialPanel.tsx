'use client'

import { useEffect, useState } from 'react'

interface ExpenseItem {
  id: string
  amount: number
  payeeName: string
  payeeType: string
  categoryName: string | null
  subcategoryName: string | null
  notes: string | null
}

interface FinancialSummary {
  periodStart: string
  sales: {
    totalRevenue: number
    totalOrders: number
    byPaymentMethod: Record<string, number>
  }
  expenses: {
    total: number
    count: number
    items: ExpenseItem[]
  }
}

interface POSFinancialPanelProps {
  businessId: string
  /** Re-fetch when this changes (e.g. after checkout) */
  refreshKey?: number
}

export function POSFinancialPanel({ businessId, refreshKey }: POSFinancialPanelProps) {
  const [summary, setSummary] = useState<FinancialSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [showExpensesModal, setShowExpensesModal] = useState(false)

  useEffect(() => {
    if (!businessId) return
    setLoading(true)
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
    fetch(`/api/universal/pos-daily-summary?businessId=${businessId}&timezone=${encodeURIComponent(timezone)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setSummary(d.data)
      })
      .catch(() => {/* non-critical */})
      .finally(() => setLoading(false))
  }, [businessId, refreshKey])

  if (loading || !summary) return null

  const { sales, expenses } = summary
  const netProfit = sales.totalRevenue - expenses.total

  return (
    <>
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-3 mb-3 shadow-sm">
        <div className="flex flex-wrap gap-3 items-center">
          {/* Sales */}
          <div className="flex-1 min-w-[120px]">
            <div className="text-xs text-gray-500 dark:text-gray-400">Today&apos;s Sales</div>
            <div className="text-lg font-bold text-green-600 dark:text-green-400">
              ${sales.totalRevenue.toFixed(2)}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {sales.totalOrders} order{sales.totalOrders !== 1 ? 's' : ''}
            </div>
          </div>

          {/* Payment method breakdown */}
          {Object.keys(sales.byPaymentMethod).length > 0 && (
            <div className="flex-1 min-w-[120px]">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">By Method</div>
              {Object.entries(sales.byPaymentMethod).map(([method, amount]) => (
                <div key={method} className="flex justify-between text-xs">
                  <span className="text-gray-600 dark:text-gray-300 capitalize">{method.toLowerCase()}</span>
                  <span className="font-medium text-gray-800 dark:text-gray-200">${amount.toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Expenses */}
          <div className="flex-1 min-w-[120px]">
            <div className="text-xs text-gray-500 dark:text-gray-400">Today&apos;s Expenses</div>
            <button
              onClick={() => setShowExpensesModal(true)}
              className="text-lg font-bold text-red-500 dark:text-red-400 hover:underline focus:outline-none"
            >
              ${expenses.total.toFixed(2)}
            </button>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {expenses.count} payment{expenses.count !== 1 ? 's' : ''}
              {expenses.count > 0 && (
                <button
                  onClick={() => setShowExpensesModal(true)}
                  className="ml-1 text-blue-500 hover:underline"
                >
                  view
                </button>
              )}
            </div>
          </div>

          {/* Net */}
          <div className="flex-1 min-w-[100px]">
            <div className="text-xs text-gray-500 dark:text-gray-400">Net</div>
            <div className={`text-lg font-bold ${netProfit >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}`}>
              ${netProfit.toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {/* Expenses detail modal */}
      {showExpensesModal && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-[1000]"
          onClick={() => setShowExpensesModal(false)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-bold text-gray-900 dark:text-white">
                Today&apos;s Expenses — ${expenses.total.toFixed(2)}
              </h3>
              <button
                onClick={() => setShowExpensesModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="overflow-y-auto max-h-[60vh]">
              {expenses.items.length === 0 ? (
                <p className="p-4 text-sm text-gray-500 dark:text-gray-400">No expense payments recorded today.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
                    <tr>
                      <th className="text-left px-4 py-2 text-xs text-gray-500 dark:text-gray-400 font-medium">Payee</th>
                      <th className="text-left px-4 py-2 text-xs text-gray-500 dark:text-gray-400 font-medium">Category</th>
                      <th className="text-right px-4 py-2 text-xs text-gray-500 dark:text-gray-400 font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.items.map((item, i) => (
                      <tr key={item.id} className={i % 2 === 0 ? '' : 'bg-gray-50 dark:bg-gray-700/50'}>
                        <td className="px-4 py-2">
                          <div className="font-medium text-gray-800 dark:text-gray-200">{item.payeeName}</div>
                          {item.notes && (
                            <div className="text-xs text-gray-400 dark:text-gray-500 truncate max-w-[200px]">{item.notes}</div>
                          )}
                        </td>
                        <td className="px-4 py-2 text-gray-600 dark:text-gray-300">
                          {item.categoryName || '—'}
                          {item.subcategoryName && (
                            <span className="text-gray-400 dark:text-gray-500"> / {item.subcategoryName}</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-right font-medium text-red-600 dark:text-red-400">
                          ${item.amount.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t border-gray-200 dark:border-gray-700">
                    <tr>
                      <td colSpan={2} className="px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300">Total</td>
                      <td className="px-4 py-2 text-right font-bold text-red-600 dark:text-red-400">
                        ${expenses.total.toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
