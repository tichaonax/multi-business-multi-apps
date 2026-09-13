'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { DateRangeSelector, DateRange } from '@/components/reports/date-range-selector'
import { getLocalDateString } from '@/lib/utils'

interface PoorPerformerRow {
  id: string
  name: string
  sku: string | null
  category: string | null
  quantityOnHand: number
  costPrice: number | null
  sellingPrice: number | null
  totalCostValue: number
  unvaluedQty: number
  potentialLossOnHand: number
  actualLossInPeriod: number
  lastStockedDate: string
  lastSoldDate: string | null
  qtySoldInPeriod: number
  revenueInPeriod: number
  grossProfitLoss: number | null
  grossMarginPct: number | null
  stockAgeDays: number
  criteria: string[]
  severity: 'CRITICAL' | 'WARNING' | 'INFO'
  suggestedAction: string
}

interface ReportData {
  summary: { totalFlagged: number; totalUnvaluedQty: number; totalPotentialLoss: number; totalActualLossInPeriod: number; totalTiedUpCostValue: number }
  pagination: { page: number; limit: number; total: number; totalPages: number }
  data: PoorPerformerRow[]
}

const money = (n: number) => `$${n.toFixed(2)}`

function getDefaultDateRange(): DateRange {
  const end = new Date()
  const start = new Date()
  start.setDate(end.getDate() - 90)
  return { start, end }
}

const CRITERION_LABEL: Record<string, string> = {
  NO_SALES: 'No sales',
  LOW_SALES: 'Low sales',
  NEGATIVE_MARGIN: 'Negative margin',
  ZERO_MARGIN: 'Zero margin',
  BELOW_COST: 'Below cost',
  EXCESS_STOCK: 'Excess stock',
  LONG_SINCE_LAST_SALE: 'Long since sold',
  OLD_STOCK: 'Old stock',
  MISSING_PRICE_DATA: 'Missing price',
  SUSPICIOUS_PRICE: 'Suspicious price',
}

export default function PoorPerformersReportPage() {
  const { currentBusinessId } = useBusinessPermissionsContext()
  const [dateRange, setDateRange] = useState<DateRange>(getDefaultDateRange())
  const [search, setSearch] = useState('')
  const [criterionFilter, setCriterionFilter] = useState('')
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)

  const loadReport = useCallback(async () => {
    if (!currentBusinessId) return
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        businessId: currentBusinessId,
        startDate: getLocalDateString(dateRange.start),
        endDate: getLocalDateString(dateRange.end),
        page: String(page),
        limit: '50',
      })
      const res = await fetch(`/api/universal/reports/poor-performers?${params}`)
      const json = await res.json()
      if (json.success) setReportData(json)
      else setError(json.error ?? 'Failed to load report')
    } catch {
      setError('Failed to load report')
    } finally {
      setLoading(false)
    }
  }, [currentBusinessId, dateRange, page])

  useEffect(() => { loadReport() }, [loadReport])

  let rows = reportData?.data ?? []
  if (search.trim()) {
    const q = search.toLowerCase()
    rows = rows.filter(r => r.name.toLowerCase().includes(q) || (r.sku ?? '').toLowerCase().includes(q))
  }
  if (criterionFilter) rows = rows.filter(r => r.criteria.includes(criterionFilter))

  return (
    <div className="flex flex-col bg-gray-50 dark:bg-gray-900" style={{ height: 'calc(100vh - 64px)' }}>
      <div className="flex-shrink-0 p-4 md:p-6 pb-0">
        <div className="flex items-center gap-2 text-xs text-secondary mb-1">
          <Link href="/inventory" className="hover:underline">Inventory</Link>
          <span>/</span>
          <span>Poor-Performing &amp; Loss-Making Stock</span>
        </div>
        <h1 className="text-xl font-bold text-primary">Poor-Performing &amp; Loss-Making Stock</h1>
        <p className="text-sm text-secondary mt-0.5">Slow-moving, non-moving, excess, loss-making and poorly-priced stock, drawn from the same underlying data as the other inventory reports.</p>

        <div className="flex flex-wrap items-end gap-3 my-4">
          <DateRangeSelector value={dateRange} onChange={setDateRange} />
          <select value={criterionFilter} onChange={e => setCriterionFilter(e.target.value)} className="px-3 py-1.5 text-sm border border-border rounded-lg bg-white dark:bg-gray-800 text-primary">
            <option value="">All reasons</option>
            {Object.entries(CRITERION_LABEL).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
          </select>
          <input
            type="search"
            placeholder="Search by name, SKU…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="px-3 py-1.5 text-sm border border-border rounded-lg bg-white dark:bg-gray-800 text-primary w-56"
          />
        </div>

        {reportData && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="bg-card border border-border rounded-lg p-3">
              <p className="text-xs text-secondary">Flagged items</p>
              <p className="text-2xl font-bold text-primary">{reportData.summary.totalFlagged}</p>
            </div>
            <div className="bg-card border border-red-200 dark:border-red-900/40 rounded-lg p-3">
              <p className="text-xs text-secondary">Potential loss on hand</p>
              <p className="text-2xl font-bold text-red-600">{money(reportData.summary.totalPotentialLoss)}</p>
            </div>
            <div className="bg-card border border-red-200 dark:border-red-900/40 rounded-lg p-3">
              <p className="text-xs text-secondary">Actual loss in period</p>
              <p className="text-2xl font-bold text-red-600">{money(reportData.summary.totalActualLossInPeriod)}</p>
            </div>
            <div className="bg-card border border-border rounded-lg p-3">
              <p className="text-xs text-secondary">Capital tied up</p>
              <p className="text-2xl font-bold text-primary">{money(reportData.summary.totalTiedUpCostValue)}</p>
            </div>
          </div>
        )}

        {error && <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-sm text-red-700 dark:text-red-300 mb-4">{error}</div>}
      </div>

      <div className="flex-1 overflow-hidden px-4 md:px-6 pb-4">
        {loading && <div className="text-center py-12 text-secondary">Loading…</div>}

        {!loading && reportData && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-border flex flex-col h-full">
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border flex-shrink-0">
              <p className="text-sm text-secondary">{reportData.pagination.total} items · page {reportData.pagination.page} of {Math.max(1, reportData.pagination.totalPages)}</p>
              <div className="flex items-center gap-2">
                <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="text-xs px-2 py-1 border border-border rounded disabled:opacity-40">← Prev</button>
                <button disabled={page >= reportData.pagination.totalPages} onClick={() => setPage(p => p + 1)} className="text-xs px-2 py-1 border border-border rounded disabled:opacity-40">Next →</button>
              </div>
            </div>

            <div className="overflow-auto flex-1">
              {rows.length === 0 ? (
                <div className="text-center py-12 text-secondary text-sm">No poor-performing stock matches the current filters.</div>
              ) : (
                <table className="w-full text-sm border-separate border-spacing-0">
                  <thead>
                    <tr className="text-xs text-secondary uppercase tracking-wide">
                      <th className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-800 px-3 py-2.5 text-left">Product</th>
                      <th className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-800 px-3 py-2.5 text-right">Qty on Hand</th>
                      <th className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-800 px-3 py-2.5 text-right">Cost Value</th>
                      <th className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-800 px-3 py-2.5 text-right">Qty Sold</th>
                      <th className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-800 px-3 py-2.5 text-right">Potential Loss</th>
                      <th className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-800 px-3 py-2.5 text-right">Actual Loss</th>
                      <th className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-800 px-3 py-2.5 text-right">Stock Age</th>
                      <th className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-800 px-3 py-2.5 text-left">Reasons</th>
                      <th className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-800 px-3 py-2.5 text-left">Suggested Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {rows.map(row => (
                      <tr key={row.id} className={row.severity === 'CRITICAL' ? 'bg-red-50/40 dark:bg-red-900/10' : 'bg-white dark:bg-gray-800'}>
                        <td className="px-3 py-2.5">
                          <p className="font-medium text-primary">{row.name}</p>
                          {row.sku && <p className="text-xs text-gray-400">{row.sku} · {row.category ?? 'Uncategorised'}</p>}
                        </td>
                        <td className="px-3 py-2.5 text-right text-secondary">{row.quantityOnHand}</td>
                        <td className="px-3 py-2.5 text-right text-secondary">{row.unvaluedQty > 0 ? <span className="text-amber-600">unvalued</span> : money(row.totalCostValue)}</td>
                        <td className="px-3 py-2.5 text-right text-secondary">{row.qtySoldInPeriod}</td>
                        <td className="px-3 py-2.5 text-right">{row.potentialLossOnHand > 0 ? <span className="text-red-600 font-semibold">{money(row.potentialLossOnHand)}</span> : '—'}</td>
                        <td className="px-3 py-2.5 text-right">{row.actualLossInPeriod > 0 ? <span className="text-red-600 font-semibold">{money(row.actualLossInPeriod)}</span> : '—'}</td>
                        <td className="px-3 py-2.5 text-right text-secondary">{row.stockAgeDays}d</td>
                        <td className="px-3 py-2.5">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {row.criteria.map(c => (
                              <span key={c} className="text-xs px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">{CRITERION_LABEL[c] ?? c}</span>
                            ))}
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-secondary">{row.suggestedAction}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
