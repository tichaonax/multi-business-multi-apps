'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatDateByFormat } from '@/lib/country-codes'
import { useDateFormat } from '@/contexts/settings-context'

type FilterTab = 'all' | 'sales' | 'expenses'

interface SaleRow {
  id: string
  orderNumber: string | null
  time: string
  amount: number
  paymentMethod: string
  servedBy: string | null
  items: { label: string; qty: number; unitPrice: number }[]
}

interface ExpenseRow {
  id: string
  time: string
  amount: number
  payee: string | null
  description: string | null
  paymentChannel: string | null
  category: string | null
  subcategory: string | null
  status: string | null
  createdBy: string | null
}

interface DailyDetail {
  date: string
  summary: {
    totalSales: number
    totalExpenses: number
    orderCount: number
    expenseCount: number
  }
  sales: SaleRow[]
  expenses: ExpenseRow[]
}

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return null
  const map: Record<string, string> = {
    PAID: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
    SUBMITTED: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
    APPROVED: 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300',
    PENDING_APPROVAL: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
    QUEUED: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
    CANCELLED: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
  }
  const cls = map[status] ?? 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
  const label = status.replace('_', ' ')
  return <span className={`px-2 py-0.5 rounded text-xs font-medium ${cls}`}>{label}</span>
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatCurrency(n: number) {
  return `$${n.toFixed(2)}`
}

function PaymentBadge({ method }: { method: string }) {
  const map: Record<string, string> = {
    CASH: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
    ECOCASH: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
    CARD: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
    TRANSFER: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
  }
  const cls = map[method.toUpperCase()] ?? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${cls}`}>
      {method}
    </span>
  )
}

const RECORDER_COLORS = [
  'text-blue-600 dark:text-blue-400',
  'text-violet-600 dark:text-violet-400',
  'text-teal-600 dark:text-teal-400',
  'text-orange-600 dark:text-orange-400',
  'text-pink-600 dark:text-pink-400',
  'text-indigo-600 dark:text-indigo-400',
  'text-amber-600 dark:text-amber-400',
  'text-cyan-600 dark:text-cyan-400',
]

function buildRecorderColorMap(expenses: ExpenseRow[]): Map<string, string> {
  const map = new Map<string, string>()
  let idx = 0
  for (const e of expenses) {
    if (e.createdBy && !map.has(e.createdBy)) {
      map.set(e.createdBy, RECORDER_COLORS[idx % RECORDER_COLORS.length])
      idx++
    }
  }
  return map
}

export default function DailyDetailPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const dateFormat = useDateFormat()

  const businessId = searchParams.get('businessId') ?? ''
  const businessType = searchParams.get('businessType') ?? ''
  const date = searchParams.get('date') ?? ''

  const [data, setData] = useState<DailyDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<FilterTab>('all')
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!businessId || !date) return
    setLoading(true)
    const tz = encodeURIComponent(Intl.DateTimeFormat().resolvedOptions().timeZone)
    fetch(`/api/business/${businessId}/daily-detail?date=${date}&timezone=${tz}`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        if (d.success) setData(d)
        else setError(d.error ?? 'Failed to load')
      })
      .catch(() => setError('Failed to load'))
      .finally(() => setLoading(false))
  }, [businessId, date])

  const backHref = businessType
    ? `/${businessType}/reports/sales-analytics`
    : '/reports'

  const displayDate = date ? formatDateByFormat(date, dateFormat.format) : date

  const toggleOrder = (id: string) => {
    setExpandedOrders(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-3 text-gray-500 dark:text-gray-400 text-sm">Loading daily detail…</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <p className="text-red-500 mb-3">{error ?? 'No data'}</p>
          <button onClick={() => router.back()} className="text-blue-600 hover:underline text-sm">← Go back</button>
        </div>
      </div>
    )
  }

  const { summary, sales, expenses } = data
  const recorderColors = buildRecorderColorMap(expenses)
  const margin = summary.totalSales > 0
    ? (((summary.totalSales - summary.totalExpenses) / summary.totalSales) * 100).toFixed(1)
    : null

  // Apply search filter to whichever list is visible
  const q = search.toLowerCase().trim()
  const filteredSales = q
    ? sales.filter(o =>
        (o.orderNumber ?? '').toLowerCase().includes(q) ||
        (o.servedBy ?? '').toLowerCase().includes(q) ||
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
        e.amount.toFixed(2).includes(q)
      )
    : expenses

  const filteredSalesTotal = filteredSales.reduce((s, o) => s + o.amount, 0)
  const filteredExpensesTotal = filteredExpenses.reduce((s, e) => s + e.amount, 0)

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900 overflow-hidden">

      {/* ── Fixed header ─────────────────────────────────────────────────────── */}
      <div className="shrink-0 bg-gray-50 dark:bg-gray-900 px-4 pt-5 pb-3 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="max-w-4xl mx-auto">

          {/* Back + title */}
          <div className="mb-4">
            <Link href={backHref} className="text-sm text-blue-600 dark:text-blue-400 hover:underline mb-1 inline-block">
              ← Back to Sales Analytics
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Daily Detail — {displayDate}
            </h1>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Sales</p>
              <p className="text-lg font-bold text-purple-600 dark:text-purple-400">{formatCurrency(summary.totalSales)}</p>
              <p className="text-xs text-gray-400">{summary.orderCount} orders</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Expenses</p>
              <p className="text-lg font-bold text-red-500 dark:text-red-400">{formatCurrency(summary.totalExpenses)}</p>
              <p className="text-xs text-gray-400">{summary.expenseCount} payments</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Net</p>
              <p className={`text-lg font-bold ${summary.totalSales - summary.totalExpenses >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {formatCurrency(summary.totalSales - summary.totalExpenses)}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Margin</p>
              <p className={`text-lg font-bold ${margin === null ? 'text-gray-400' : Number(margin) >= 50 ? 'text-green-600 dark:text-green-400' : Number(margin) >= 20 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'}`}>
                {margin !== null ? `${margin}%` : '—'}
              </p>
            </div>
          </div>

          {/* Filter tabs + search */}
          <div className="flex flex-wrap items-center gap-2">
            {(['all', 'sales', 'expenses'] as FilterTab[]).map(tab => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
                  filter === tab
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600'
                }`}
              >
                {tab === 'all' ? 'All' : tab === 'sales' ? `Sales (${summary.orderCount})` : `Expenses (${summary.expenseCount})`}
              </button>
            ))}

            <div className="flex items-center gap-2 ml-auto">
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search…"
                className="text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 w-44"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="px-3 py-2 rounded-lg text-sm bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* ── Scrollable list ───────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="max-w-4xl mx-auto space-y-6">

          {/* Sales section */}
          {(filter === 'all' || filter === 'sales') && (
            <div>
              {filter === 'all' && (
                <h2 className="text-base font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  Sales Orders
                </h2>
              )}
              {q && filteredSales.length > 0 && (
                <div className="flex items-center justify-between bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-lg px-4 py-2 mb-3 text-sm">
                  <span className="text-purple-700 dark:text-purple-300">
                    {filteredSales.length} of {sales.length} orders match
                  </span>
                  <span className="font-bold text-purple-700 dark:text-purple-300">
                    {formatCurrency(filteredSalesTotal)}
                  </span>
                </div>
              )}
              {filteredSales.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 text-center text-gray-400 shadow-sm">
                  {q ? 'No sales match your search' : 'No sales recorded for this day'}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredSales.map(order => (
                    <div key={order.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
                      <button
                        onClick={() => toggleOrder(order.id)}
                        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors text-left"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-gray-400 font-mono w-14 shrink-0">{formatTime(order.time)}</span>
                          {order.orderNumber && (
                            <span className="text-xs text-gray-400">#{order.orderNumber}</span>
                          )}
                          <PaymentBadge method={order.paymentMethod} />
                          {order.servedBy && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">{order.servedBy}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-purple-600 dark:text-purple-400">
                            {formatCurrency(order.amount)}
                          </span>
                          <span className="text-gray-400 text-xs">{expandedOrders.has(order.id) ? '▲' : '▼'}</span>
                        </div>
                      </button>
                      {expandedOrders.has(order.id) && order.items.length > 0 && (
                        <div className="border-t border-gray-100 dark:border-gray-700 px-4 py-2">
                          <table className="w-full text-sm">
                            <tbody>
                              {order.items.map((item, idx) => (
                                <tr key={idx} className="border-b border-gray-50 dark:border-gray-700/50 last:border-0">
                                  <td className="py-1.5 text-gray-700 dark:text-gray-300">{item.label}</td>
                                  <td className="py-1.5 text-center text-gray-400 w-12">×{item.qty}</td>
                                  <td className="py-1.5 text-right text-gray-600 dark:text-gray-400 w-24">
                                    {formatCurrency(item.unitPrice * item.qty)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Expenses section */}
          {(filter === 'all' || filter === 'expenses') && (
            <div>
              {filter === 'all' && (
                <h2 className="text-base font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  Expense Payments
                </h2>
              )}
              {q && filteredExpenses.length > 0 && (
                <div className="flex items-center justify-between bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg px-4 py-2 mb-3 text-sm">
                  <span className="text-red-700 dark:text-red-300">
                    {filteredExpenses.length} of {expenses.length} payments match
                  </span>
                  <span className="font-bold text-red-700 dark:text-red-300">
                    {formatCurrency(filteredExpensesTotal)}
                  </span>
                </div>
              )}
              {filteredExpenses.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 text-center text-gray-400 shadow-sm">
                  {q ? 'No expenses match your search' : 'No expenses recorded for this day'}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredExpenses.map(exp => (
                    <div key={exp.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm px-4 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="text-xs text-gray-400 font-mono">{formatTime(exp.time)}</span>
                            {exp.category && (
                              <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded">
                                {exp.category}
                              </span>
                            )}
                            {exp.subcategory && (
                              <span className="text-xs bg-gray-50 dark:bg-gray-700/60 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded">
                                {exp.subcategory}
                              </span>
                            )}
                            {exp.paymentChannel && (
                              <PaymentBadge method={exp.paymentChannel} />
                            )}
                            <StatusBadge status={exp.status} />
                          </div>
                          {exp.payee && (
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">{exp.payee}</p>
                          )}
                          {exp.description && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{exp.description}</p>
                          )}
                          {exp.createdBy && (
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                              Recorded by{' '}
                              <span className={`font-semibold ${recorderColors.get(exp.createdBy) ?? 'text-gray-500 dark:text-gray-400'}`}>
                                {exp.createdBy}
                              </span>
                            </p>
                          )}
                        </div>
                        <span className="font-semibold text-red-500 dark:text-red-400 shrink-0">
                          {formatCurrency(exp.amount)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </div>

    </div>
  )
}
