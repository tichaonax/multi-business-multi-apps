'use client'

import { useEffect, useState } from 'react'

interface ExpenseItem {
  id: string
  amount: number
  payeeName: string
  categoryName: string | null
  subcategoryName: string | null
  notes: string | null
}

interface Props {
  businessId: string
  refreshKey?: number
}

export function TodayExpensesWidget({ businessId, refreshKey }: Props) {
  const [expenses, setExpenses] = useState<{ total: number; count: number; items: ExpenseItem[] } | null>(null)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    if (!businessId) return
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    fetch(`/api/universal/pos-daily-summary?businessId=${businessId}&timezone=${encodeURIComponent(tz)}`)
      .then(r => r.json())
      .then(d => {
        if (d.success) setExpenses(d.data.expenses)
        else console.error('[TodayExpensesWidget] API error:', d.error || d)
      })
      .catch((err) => { console.error('[TodayExpensesWidget] fetch error:', err) })
  }, [businessId, refreshKey])

  if (!expenses) return null

  return (
    <>
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-lg px-4 py-3 flex items-center justify-between">
        <div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Today&apos;s Expenses</div>
          <div className="text-xl font-bold text-red-600 dark:text-red-400">${expenses.total.toFixed(2)}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {expenses.count} payment{expenses.count !== 1 ? 's' : ''}
          </div>
        </div>
        {expenses.count > 0 && (
          <button
            onClick={() => setShowModal(true)}
            className="text-sm text-red-600 dark:text-red-400 hover:underline font-medium"
          >
            View Details →
          </button>
        )}
      </div>

      {showModal && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-[1000]"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-bold text-gray-900 dark:text-white">
                Today&apos;s Expenses — ${expenses.total.toFixed(2)}
              </h3>
              <button
                onClick={() => setShowModal(false)}
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
