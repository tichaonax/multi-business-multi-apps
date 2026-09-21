'use client'

import { useState, useEffect, useCallback } from 'react'
import { ModalPortal } from '@/components/ui/modal-portal'
import { BusinessOrderDetailModal } from '@/components/business/business-order-detail-modal'
import { PaymentDetailModal } from '@/components/expense-account/payment-detail-modal'
import {
  type FilterTab, type DailyDetail,
  StatusBadge, PaymentBadge, formatTime, formatCurrency, buildRecorderColorMap,
  shiftDateString, todayDateString,
} from '@/components/reports/daily-detail-shared'

/**
 * Dashboard-native version of /reports/daily-detail — same API, same data,
 * but opened as a modal directly from the homepage business cards instead
 * of navigating away to a full page, so closing it (or closing an item's
 * own detail modal) always lands the user back exactly where they were.
 * Each row is itself clickable, opening the same detail modals already used
 * everywhere else in the app (BusinessOrderDetailModal, PaymentDetailModal)
 * stacked on top — closing those just returns to this list.
 */
export function DailyDetailModal({
  isOpen,
  onClose,
  businessIds,
  date: initialDate,
  initialFilter = 'all',
}: {
  isOpen: boolean
  onClose: () => void
  businessIds: string[]
  date: string
  initialFilter?: FilterTab
}) {
  const [date, setDate] = useState(initialDate)
  const [filter, setFilter] = useState<FilterTab>(initialFilter)
  const [search, setSearch] = useState('')
  const [data, setData] = useState<DailyDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const [selectedPayment, setSelectedPayment] = useState<{ accountId: string; paymentId: string } | null>(null)

  const businessIdsKey = businessIds.join(',')

  // Reset to whatever the caller asked for each time the modal is (re)opened
  // for a (possibly different) business/date — otherwise it'd keep showing
  // whatever tab/search/day was left over from the last time it was open.
  useEffect(() => {
    if (isOpen) {
      setDate(initialDate)
      setFilter(initialFilter)
      setSearch('')
    }
  }, [isOpen, initialDate, initialFilter, businessIdsKey])

  const load = useCallback(() => {
    if (!isOpen || !businessIdsKey || !date) return
    setLoading(true)
    setError(null)
    const tz = encodeURIComponent(Intl.DateTimeFormat().resolvedOptions().timeZone)
    fetch(`/api/business/${businessIdsKey}/daily-detail?date=${date}&timezone=${tz}`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        if (d.success) setData(d)
        else setError(d.error ?? 'Failed to load')
      })
      .catch(() => setError('Failed to load'))
      .finally(() => setLoading(false))
  }, [isOpen, businessIdsKey, date])

  useEffect(() => { load() }, [load])

  if (!isOpen) return null

  const nextDisabled = shiftDateString(date, 1) > todayDateString()

  const q = search.toLowerCase().trim()
  const sales = data?.sales ?? []
  const expenses = data?.expenses ?? []
  const setAside = data?.setAside ?? []
  const recorderColors = buildRecorderColorMap(expenses)

  const filteredSales = q
    ? sales.filter(o =>
        (o.orderNumber ?? '').toLowerCase().includes(q) ||
        (o.servedBy ?? '').toLowerCase().includes(q) ||
        (o.businessName ?? '').toLowerCase().includes(q) ||
        o.paymentMethod.toLowerCase().includes(q) ||
        o.items.some(i => i.label.toLowerCase().includes(q))
      )
    : sales
  const filteredExpenses = q
    ? expenses.filter(e =>
        (e.payee ?? '').toLowerCase().includes(q) ||
        (e.description ?? '').toLowerCase().includes(q) ||
        (e.category ?? '').toLowerCase().includes(q) ||
        (e.subcategory ?? '').toLowerCase().includes(q) ||
        (e.createdBy ?? '').toLowerCase().includes(q) ||
        (e.businessName ?? '').toLowerCase().includes(q) ||
        e.amount.toFixed(2).includes(q)
      )
    : expenses
  const filteredSetAside = q
    ? setAside.filter(e =>
        e.purpose.toLowerCase().includes(q) ||
        (e.createdBy ?? '').toLowerCase().includes(q) ||
        (e.businessName ?? '').toLowerCase().includes(q) ||
        e.amount.toFixed(2).includes(q)
      )
    : setAside

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 bg-black bg-opacity-50 flex items-start sm:items-center justify-center z-50 p-0 sm:p-4 overflow-y-auto"
        onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      >
        <div className="bg-white dark:bg-gray-900 sm:rounded-lg shadow-xl w-full sm:max-w-3xl min-h-full sm:min-h-0 sm:max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="shrink-0 px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Daily Detail — {date}</h2>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setDate(d => shiftDateString(d, -1))}
                  className="px-2.5 py-1.5 rounded-lg text-sm font-medium bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                >
                  ← Prev
                </button>
                <button
                  onClick={() => !nextDisabled && setDate(d => shiftDateString(d, 1))}
                  disabled={nextDisabled}
                  className="px-2.5 py-1.5 rounded-lg text-sm font-medium bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next →
                </button>
                <button
                  onClick={onClose}
                  className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md text-xl leading-none"
                >
                  ✕
                </button>
              </div>
            </div>

            {data && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2.5">
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">Sales</p>
                  <p className="text-base font-bold text-purple-600 dark:text-purple-400">{formatCurrency(data.summary.totalSales)}</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2.5">
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">Expenses</p>
                  <p className="text-base font-bold text-red-500 dark:text-red-400">{formatCurrency(data.summary.totalExpenses)}</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2.5">
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">Set Aside</p>
                  <p className="text-base font-bold text-amber-500 dark:text-amber-400">{formatCurrency(data.summary.totalSetAside)}</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2.5">
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">Net</p>
                  <p className={`text-base font-bold ${data.summary.totalSales - data.summary.totalExpenses >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {formatCurrency(data.summary.totalSales - data.summary.totalExpenses)}
                  </p>
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 mt-3">
              {(['all', 'sales', 'expenses', 'setaside'] as FilterTab[]).map(tab => (
                <button
                  key={tab}
                  onClick={() => setFilter(tab)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize ${
                    filter === tab
                      ? 'bg-blue-600 text-white'
                      : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600'
                  }`}
                >
                  {tab === 'all' ? 'All' : tab === 'sales' ? `Sales (${sales.length})` : tab === 'expenses' ? `Expenses (${expenses.length})` : `Set Aside (${setAside.length})`}
                </button>
              ))}
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search…"
                className="ml-auto text-sm px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 w-36 sm:w-44"
              />
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-6">
            {loading && <div className="text-center py-10 text-secondary text-sm">Loading…</div>}
            {error && <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-700 dark:text-red-300">{error}</div>}

            {!loading && !error && (
              <>
                {(filter === 'all' || filter === 'sales') && (
                  <div>
                    {filter === 'all' && <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Sales Orders</h3>}
                    {filteredSales.length === 0 ? (
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 text-center text-gray-400 text-sm">
                        {q ? 'No sales match your search' : 'No sales recorded for this day'}
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {filteredSales.map(order => (
                          <button
                            key={order.id}
                            onClick={() => setSelectedOrderId(order.id)}
                            className="w-full flex items-center justify-between gap-3 px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-wrap">
                              <span className="text-xs text-gray-400 font-mono shrink-0">{formatTime(order.time)}</span>
                              {order.orderNumber && <span className="text-xs text-gray-400 shrink-0">#{order.orderNumber}</span>}
                              <PaymentBadge method={order.paymentMethod} />
                              {order.servedBy && <span className="text-xs text-gray-500 dark:text-gray-400 truncate">{order.servedBy}</span>}
                              {order.businessName && <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-1.5 py-0.5 rounded shrink-0">{order.businessName}</span>}
                            </div>
                            <span className="font-semibold text-purple-600 dark:text-purple-400 shrink-0">{formatCurrency(order.amount)}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {(filter === 'all' || filter === 'expenses') && (
                  <div>
                    {filter === 'all' && <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Expense Payments</h3>}
                    {filteredExpenses.length === 0 ? (
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 text-center text-gray-400 text-sm">
                        {q ? 'No expenses match your search' : 'No expenses recorded for this day'}
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {filteredExpenses.map(exp => (
                          <button
                            key={exp.id}
                            onClick={() => setSelectedPayment({ accountId: exp.expenseAccountId, paymentId: exp.id })}
                            className="w-full flex items-start justify-between gap-3 px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <span className="text-xs text-gray-400 font-mono">{formatTime(exp.time)}</span>
                                {exp.category && <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded">{exp.category}</span>}
                                {exp.paymentChannel && <PaymentBadge method={exp.paymentChannel} />}
                                <StatusBadge status={exp.status} />
                                {exp.businessName && <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-1.5 py-0.5 rounded">{exp.businessName}</span>}
                              </div>
                              {exp.payee && <p className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">{exp.payee}</p>}
                              {exp.createdBy && (
                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                                  Recorded by <span className={`font-semibold ${recorderColors.get(exp.createdBy) ?? 'text-gray-500 dark:text-gray-400'}`}>{exp.createdBy}</span>
                                </p>
                              )}
                            </div>
                            <span className="font-semibold text-red-500 dark:text-red-400 shrink-0">{formatCurrency(exp.amount)}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {(filter === 'all' || filter === 'setaside') && (
                  <div>
                    {filter === 'all' && <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Set Aside</h3>}
                    {filteredSetAside.length === 0 ? (
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 text-center text-gray-400 text-sm">
                        {q ? 'No set-aside entries match your search' : 'Nothing was set aside on this day'}
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {filteredSetAside.map(row => (
                          <div key={row.id} className="flex items-start justify-between gap-3 px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <span className="text-xs text-gray-400 font-mono">{formatTime(row.time)}</span>
                                <span className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded">🔒 {row.purpose}</span>
                                {row.businessName && <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-1.5 py-0.5 rounded">{row.businessName}</span>}
                              </div>
                              {row.createdBy && (
                                <p className="text-xs text-gray-400 dark:text-gray-500">
                                  Recorded by <span className={`font-semibold ${recorderColors.get(row.createdBy) ?? 'text-gray-500 dark:text-gray-400'}`}>{row.createdBy}</span>
                                </p>
                              )}
                            </div>
                            <span className="font-semibold text-amber-500 dark:text-amber-400 shrink-0">{formatCurrency(row.amount)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Item detail — stacked on top; closing these returns to this list, not the dashboard */}
      <BusinessOrderDetailModal
        orderId={selectedOrderId}
        isOpen={!!selectedOrderId}
        onClose={() => setSelectedOrderId(null)}
      />
      {selectedPayment && (
        <PaymentDetailModal
          accountId={selectedPayment.accountId}
          paymentId={selectedPayment.paymentId}
          isOpen={true}
          onClose={() => setSelectedPayment(null)}
        />
      )}
    </ModalPortal>
  )
}
