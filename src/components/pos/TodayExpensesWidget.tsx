'use client'

import { useEffect, useState } from 'react'

interface ExpenseItem {
  id: string
  amount: number
  payeeName: string
  payeePhone: string | null
  categoryName: string | null
  subcategoryName: string | null
  notes: string | null
}

interface ExpenseDay {
  label: string
  total: number
  items: ExpenseItem[]
}

interface Props {
  businessId: string
  refreshKey?: number
}

function ExpenseModal({ day, onClose }: { day: ExpenseDay; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-[1000]"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-bold text-gray-900 dark:text-white">
            {day.label} Expenses — ${day.total.toFixed(2)}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="overflow-y-auto max-h-[60vh]">
          {day.items.length === 0 ? (
            <p className="p-4 text-sm text-gray-500 dark:text-gray-400">No expense payments recorded.</p>
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
                {day.items.map((item, i) => (
                  <tr key={item.id} className={i % 2 === 0 ? '' : 'bg-gray-50 dark:bg-gray-700/50'}>
                    <td className="px-4 py-2">
                      <div className="font-medium text-gray-800 dark:text-gray-200">{item.payeeName}</div>
                      {item.payeePhone && (
                        <div className="text-xs text-blue-500 dark:text-blue-400 mt-0.5">📞 {item.payeePhone}</div>
                      )}
                      {item.notes && (
                        <div className="text-xs text-gray-400 dark:text-gray-500 truncate max-w-[180px]">{item.notes}</div>
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
                    ${day.total.toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

export function TodayExpensesWidget({ businessId, refreshKey }: Props) {
  const [expenses, setExpenses] = useState<{ total: number; count: number; items: ExpenseItem[]; yesterdayTotal: number; twoDaysAgoTotal: number } | null>(null)
  const [activeModal, setActiveModal] = useState<ExpenseDay | null>(null)
  const [loadingDay, setLoadingDay] = useState<number | null>(null)

  const tz = typeof window !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'UTC'

  useEffect(() => {
    if (!businessId) return
    fetch(`/api/universal/pos-daily-summary?businessId=${businessId}&timezone=${encodeURIComponent(tz)}`)
      .then(r => r.json())
      .then(d => {
        if (d.success) setExpenses(d.data.expenses)
        else console.error('[TodayExpensesWidget] API error:', d.error || d)
      })
      .catch((err) => { console.error('[TodayExpensesWidget] fetch error:', err) })
  }, [businessId, refreshKey])

  async function openDayModal(daysAgo: number, label: string) {
    setLoadingDay(daysAgo)
    try {
      const res = await fetch(`/api/universal/pos-daily-summary?businessId=${businessId}&timezone=${encodeURIComponent(tz)}&daysAgo=${daysAgo}`)
      const d = await res.json()
      if (d.success) {
        setActiveModal({ label, total: d.data.expenses.total, items: d.data.expenses.items })
      }
    } catch { /* silently fail */ } finally {
      setLoadingDay(null)
    }
  }

  if (!expenses) return null

  const todayPct = (prior: number) => {
    if (prior === 0) return null
    const diff = expenses.total - prior
    const pct = Math.abs(Math.round((diff / prior) * 100))
    const up = diff >= 0
    return { up, pct, prior }
  }

  const yInfo = todayPct(expenses.yesterdayTotal)
  const d2Info = todayPct(expenses.twoDaysAgoTotal)

  return (
    <>
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-lg px-4 py-3 flex items-center justify-between">
        <div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Today&apos;s Expenses</div>
          <div className="text-xl font-bold text-red-600 dark:text-red-400">${expenses.total.toFixed(2)}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {expenses.count} payment{expenses.count !== 1 ? 's' : ''}
          </div>

          {/* Yesterday comparison — clickable */}
          {yInfo ? (
            <button
              type="button"
              onClick={() => openDayModal(1, 'Yesterday\'s')}
              disabled={loadingDay === 1}
              className={`block text-xs text-left hover:underline disabled:opacity-60 ${yInfo.up ? 'text-red-500 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}
            >
              {loadingDay === 1 ? '…' : `${yInfo.up ? '↑' : '↓'} vs yesterday $${expenses.yesterdayTotal.toFixed(2)} (${yInfo.pct}%)`}
            </button>
          ) : (expenses.yesterdayTotal === 0 && expenses.total > 0) ? (
            <div className="text-xs text-gray-400 dark:text-gray-500">— vs yesterday $0.00</div>
          ) : null}

          {/* 2 days ago comparison — clickable */}
          {d2Info ? (
            <button
              type="button"
              onClick={() => openDayModal(2, '2 Days Ago\'s')}
              disabled={loadingDay === 2}
              className={`block text-xs text-left hover:underline disabled:opacity-60 ${d2Info.up ? 'text-red-500 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}
            >
              {loadingDay === 2 ? '…' : `${d2Info.up ? '↑' : '↓'} vs 2 days ago $${expenses.twoDaysAgoTotal.toFixed(2)} (${d2Info.pct}%)`}
            </button>
          ) : (expenses.twoDaysAgoTotal === 0 && expenses.total > 0) ? (
            <div className="text-xs text-gray-400 dark:text-gray-500">— vs 2 days ago $0.00</div>
          ) : null}
        </div>
        {expenses.count > 0 && (
          <button
            onClick={() => setActiveModal({ label: 'Today\'s', total: expenses.total, items: expenses.items })}
            className="text-sm text-red-600 dark:text-red-400 hover:underline font-medium"
          >
            View Details →
          </button>
        )}
      </div>

      {activeModal && (
        <ExpenseModal day={activeModal} onClose={() => setActiveModal(null)} />
      )}
    </>
  )
}
