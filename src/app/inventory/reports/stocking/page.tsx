'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { DateRangeSelector, DateRange } from '@/components/reports/date-range-selector'
import { getLocalDateString } from '@/lib/utils'
import '@/styles/print-report.css'

interface StockingEvent {
  id: string
  date: string
  productName: string
  sku: string | null
  quantity: number
  unitCost: number
  totalCost: number
}

interface ByProduct {
  productName: string
  sku: string | null
  totalQuantity: number
  totalCost: number
}

interface ExpenseRow {
  id: string
  date: string
  category: string | null
  subcategory: string | null
  payeeName: string | null
  amount: number
  notes: string | null
}

interface ReportData {
  period: { from: string; to: string }
  stockingEvents: StockingEvent[]
  stockingTotal: number
  byProduct: ByProduct[]
  expenses: ExpenseRow[]
  expensesTotal: number
}

function getDefaultDateRange(): DateRange {
  const end = new Date()
  const start = new Date()
  start.setDate(end.getDate() - 30)
  return { start, end }
}

const money = (n: number) => `$${n.toFixed(2)}`
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

function downloadCsv(filename: string, header: string, lines: string[]) {
  const blob = new Blob([[header, ...lines].join('\n')], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export default function StockingReportPage() {
  const { currentBusinessId } = useBusinessPermissionsContext()
  const [dateRange, setDateRange] = useState<DateRange>(getDefaultDateRange())
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState('ALL')

  const loadReport = useCallback(async () => {
    if (!currentBusinessId) return
    setLoading(true)
    setError(null)
    try {
      const from = getLocalDateString(dateRange.start)
      const to = getLocalDateString(dateRange.end)
      const res = await fetch(`/api/inventory/${currentBusinessId}/stocking-report?from=${from}&to=${to}`)
      const json = await res.json()
      if (json.success) setReportData(json)
      else setError(json.error ?? 'Failed to load report')
    } catch {
      setError('Failed to load report')
    } finally {
      setLoading(false)
    }
  }, [currentBusinessId, dateRange])

  useEffect(() => { loadReport() }, [loadReport])
  useEffect(() => { setExpenseCategoryFilter('ALL') }, [reportData])

  const expenseCategories = useMemo(() => {
    if (!reportData) return []
    const names = new Set<string>()
    for (const e of reportData.expenses) names.add(e.category ?? 'Uncategorized')
    return Array.from(names).sort()
  }, [reportData])

  const filteredExpenses = useMemo(() => {
    if (!reportData) return []
    if (expenseCategoryFilter === 'ALL') return reportData.expenses
    return reportData.expenses.filter(e => (e.category ?? 'Uncategorized') === expenseCategoryFilter)
  }, [reportData, expenseCategoryFilter])

  const filteredExpensesTotal = filteredExpenses.reduce((sum, e) => sum + e.amount, 0)
  const grandTotal = (reportData?.stockingTotal ?? 0) + filteredExpensesTotal

  return (
    <div className="bg-gray-50 dark:bg-gray-900">
      <div className="p-4 md:p-6 pb-0">
        <Link href="/inventory/reports" className="inline-flex items-center gap-1 text-sm text-secondary hover:text-primary hover:underline mb-2">
          ← Back to Reports
        </Link>
        <div className="flex items-center gap-2 text-xs text-secondary mb-1">
          <Link href="/inventory" className="hover:underline">Inventory</Link>
          <span>/</span>
          <Link href="/inventory/reports" className="hover:underline">Reports</Link>
          <span>/</span>
          <span>Stocking &amp; Related Expenses</span>
        </div>
        <h1 className="text-xl font-bold text-primary">Stocking &amp; Related Expenses Report</h1>
        <p className="text-sm text-secondary mt-0.5">
          What was stocked in the selected period, what it cost, and what other expenses (transport, tolls, meals, etc.)
          landed in the same window. Expenses are correlated by date range only — not a hard link to a specific stocking
          run — use the category filter below to narrow down to the ones that are actually stocking-related.
        </p>
      </div>

      <div className="px-4 md:px-6 pb-4">
        <div className="flex flex-wrap items-end gap-3 my-4 no-print">
          <DateRangeSelector value={dateRange} onChange={setDateRange} />
          <button onClick={() => window.print()} className="text-xs px-2 py-1 border border-border rounded hover:border-gray-400">Print / Save as PDF</button>
        </div>

        {reportData && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <div className="bg-card border border-border rounded-lg p-3">
              <p className="text-xs text-secondary">Items stocked</p>
              <p className="text-2xl font-bold text-primary">{reportData.stockingEvents.length}</p>
            </div>
            <div className="bg-card border border-border rounded-lg p-3">
              <p className="text-xs text-secondary">Total stocking cost</p>
              <p className="text-2xl font-bold text-primary">{money(reportData.stockingTotal)}</p>
            </div>
            <div className="bg-card border border-border rounded-lg p-3">
              <p className="text-xs text-secondary">Related expenses{expenseCategoryFilter !== 'ALL' ? ` (${expenseCategoryFilter})` : ''}</p>
              <p className="text-2xl font-bold text-primary">{money(filteredExpensesTotal)}</p>
            </div>
            <div className="bg-card border border-blue-200 dark:border-blue-900/40 rounded-lg p-3">
              <p className="text-xs text-secondary">Grand total</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{money(grandTotal)}</p>
            </div>
          </div>
        )}

        {error && <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-sm text-red-700 dark:text-red-300 mb-4">{error}</div>}
        {loading && <div className="text-center py-12 text-secondary">Loading…</div>}

        {!loading && reportData && (
          <div className="space-y-6">
            {/* By Product */}
            <section className="bg-white dark:bg-gray-800 rounded-lg border border-border overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <h2 className="text-sm font-semibold text-primary">By Product</h2>
                {reportData.byProduct.length > 0 && (
                  <button
                    onClick={() => downloadCsv(
                      `stocking-by-product-${reportData.period.from}-to-${reportData.period.to}.csv`,
                      'Product,SKU,Total Quantity,Total Cost',
                      reportData.byProduct.map(p => `"${p.productName}","${p.sku ?? ''}",${p.totalQuantity},${p.totalCost.toFixed(2)}`)
                    )}
                    className="btn-secondary text-xs px-2 py-1 no-print"
                  >
                    Export CSV
                  </button>
                )}
              </div>
              {reportData.byProduct.length === 0 ? (
                <div className="text-center py-8 text-secondary text-sm">No stock received in this period.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-700/50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-secondary uppercase">Product</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-secondary uppercase">SKU</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-secondary uppercase">Qty</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-secondary uppercase">Total Cost</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {reportData.byProduct.map((p, i) => (
                        <tr key={i}>
                          <td className="px-4 py-2 text-primary">{p.productName}</td>
                          <td className="px-4 py-2 text-secondary">{p.sku ?? '—'}</td>
                          <td className="px-4 py-2 text-right text-secondary">{p.totalQuantity}</td>
                          <td className="px-4 py-2 text-right text-primary font-medium">{money(p.totalCost)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* Stocking Events */}
            <section className="bg-white dark:bg-gray-800 rounded-lg border border-border overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <h2 className="text-sm font-semibold text-primary">Stocking Events</h2>
                {reportData.stockingEvents.length > 0 && (
                  <button
                    onClick={() => downloadCsv(
                      `stocking-events-${reportData.period.from}-to-${reportData.period.to}.csv`,
                      'Date,Product,SKU,Quantity,Unit Cost,Total Cost',
                      reportData.stockingEvents.map(e => `${fmtDate(e.date)},"${e.productName}","${e.sku ?? ''}",${e.quantity},${e.unitCost.toFixed(2)},${e.totalCost.toFixed(2)}`)
                    )}
                    className="btn-secondary text-xs px-2 py-1 no-print"
                  >
                    Export CSV
                  </button>
                )}
              </div>
              {reportData.stockingEvents.length === 0 ? (
                <div className="text-center py-8 text-secondary text-sm">No stock received in this period.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-700/50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-secondary uppercase">Date</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-secondary uppercase">Product</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-secondary uppercase">Qty</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-secondary uppercase">Unit Cost</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-secondary uppercase">Total Cost</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {reportData.stockingEvents.map(e => (
                        <tr key={e.id}>
                          <td className="px-4 py-2 text-secondary whitespace-nowrap">{fmtDate(e.date)}</td>
                          <td className="px-4 py-2 text-primary">{e.productName}{e.sku ? <span className="text-secondary"> · {e.sku}</span> : null}</td>
                          <td className="px-4 py-2 text-right text-secondary">{e.quantity}</td>
                          <td className="px-4 py-2 text-right text-secondary">{money(e.unitCost)}</td>
                          <td className="px-4 py-2 text-right text-primary font-medium">{money(e.totalCost)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* Related Expenses */}
            <section className="bg-white dark:bg-gray-800 rounded-lg border border-border overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-border">
                <h2 className="text-sm font-semibold text-primary">Related Expenses</h2>
                <div className="flex items-center gap-2 no-print">
                  <select
                    value={expenseCategoryFilter}
                    onChange={e => setExpenseCategoryFilter(e.target.value)}
                    className="px-2 py-1 text-xs border border-border rounded bg-white dark:bg-gray-800 text-primary"
                  >
                    <option value="ALL">All categories</option>
                    {expenseCategories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  {filteredExpenses.length > 0 && (
                    <button
                      onClick={() => downloadCsv(
                        `related-expenses-${reportData.period.from}-to-${reportData.period.to}.csv`,
                        'Date,Category,Subcategory,Payee,Amount,Notes',
                        filteredExpenses.map(e => `${fmtDate(e.date)},"${e.category ?? ''}","${e.subcategory ?? ''}","${e.payeeName ?? ''}",${e.amount.toFixed(2)},"${(e.notes ?? '').replace(/"/g, '""')}"`)
                      )}
                      className="btn-secondary text-xs px-2 py-1"
                    >
                      Export CSV
                    </button>
                  )}
                </div>
              </div>
              {filteredExpenses.length === 0 ? (
                <div className="text-center py-8 text-secondary text-sm">No expenses match this period{expenseCategoryFilter !== 'ALL' ? ' and category' : ''}.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-700/50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-secondary uppercase">Date</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-secondary uppercase">Category</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-secondary uppercase">Payee</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-secondary uppercase">Notes</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-secondary uppercase">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredExpenses.map(e => (
                        <tr key={e.id}>
                          <td className="px-4 py-2 text-secondary whitespace-nowrap">{fmtDate(e.date)}</td>
                          <td className="px-4 py-2 text-primary">{e.category ?? '—'}{e.subcategory ? <span className="text-secondary"> › {e.subcategory}</span> : null}</td>
                          <td className="px-4 py-2 text-secondary">{e.payeeName ?? '—'}</td>
                          <td className="px-4 py-2 text-secondary max-w-xs truncate">{e.notes ?? ''}</td>
                          <td className="px-4 py-2 text-right text-primary font-medium">{money(e.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  )
}
