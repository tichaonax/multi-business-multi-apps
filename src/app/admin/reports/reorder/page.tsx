'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { DateRangeSelector, DateRange } from '@/components/reports/date-range-selector'
import { getLocalDateString } from '@/lib/utils'

interface ReorderRow {
  variantId: string
  productId: string
  productName: string
  variantName: string
  sku: string
  category: string
  currentStock: number
  avgDailySales: number
  daysOfStockLeft: number
  urgency: 'critical' | 'low'
  suggestedReorderQty: number
  costPrice: number | null
  sellingPrice: number | null
  estimatedCost: number | null
}

interface ReportData {
  dateRange: { startDate: string; endDate: string; days: number }
  summary: {
    itemsNeedingReorder: number
    criticalItems: number
    lowItems: number
    estimatedReorderCost: number
  }
  data: ReorderRow[]
}

function getDefaultDateRange(): DateRange {
  const end = new Date()
  const start = new Date()
  start.setDate(end.getDate() - 30)
  return { start, end }
}

function exportCsv(rows: ReorderRow[]) {
  const header = 'Product,Variant,SKU,Category,Current Stock,Reorder Qty,Avg/Day,Days Left,Urgency,Est. Cost'
  const lines = rows.map((r) =>
    [
      `"${r.productName}"`,
      `"${r.variantName}"`,
      `"${r.sku}"`,
      `"${r.category}"`,
      r.currentStock,
      r.suggestedReorderQty,
      r.avgDailySales,
      r.daysOfStockLeft,
      r.urgency,
      r.estimatedCost ?? '',
    ].join(',')
  )
  const blob = new Blob([[header, ...lines].join('\n')], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `reorder-report-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function ReorderReportPage() {
  const { currentBusinessId } = useBusinessPermissionsContext()
  const [dateRange, setDateRange] = useState<DateRange>(getDefaultDateRange())
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [urgencyFilter, setUrgencyFilter] = useState<'all' | 'critical' | 'low'>('all')

  const loadReport = useCallback(async () => {
    if (!currentBusinessId) return
    setLoading(true)
    setError(null)
    try {
      const startDate = getLocalDateString(dateRange.start)
      const endDate = getLocalDateString(dateRange.end)
      const res = await fetch(
        `/api/universal/reports/reorder?businessId=${currentBusinessId}&startDate=${startDate}&endDate=${endDate}`
      )
      const json = await res.json()
      if (json.success) {
        setReportData(json)
      } else {
        setError(json.error ?? 'Failed to load report')
      }
    } catch {
      setError('Failed to load report')
    } finally {
      setLoading(false)
    }
  }, [currentBusinessId, dateRange])

  useEffect(() => {
    loadReport()
  }, [loadReport])

  const rows = (reportData?.data ?? []).filter(
    (r) => urgencyFilter === 'all' || r.urgency === urgencyFilter
  )

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2 text-xs text-secondary mb-1">
            <Link href="/admin/reports" className="hover:underline">Reports</Link>
            <span>/</span>
            <span>Reorder Report</span>
          </div>
          <h1 className="text-xl font-bold text-primary">Reorder Report</h1>
          <p className="text-sm text-secondary mt-0.5">Items at or below their reorder level — order these now</p>
        </div>
        {reportData && reportData.data.length > 0 && (
          <button
            onClick={() => exportCsv(rows)}
            className="btn-secondary text-sm px-3 py-1.5"
          >
            Export CSV
          </button>
        )}
      </div>

      {/* Date range + filter */}
      <div className="flex flex-wrap items-end gap-3 mb-5">
        <DateRangeSelector value={dateRange} onChange={setDateRange} />
        <div className="flex gap-1">
          {(['all', 'critical', 'low'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setUrgencyFilter(f)}
              className={`px-3 py-1.5 rounded text-xs font-medium border transition-colors ${
                urgencyFilter === f
                  ? f === 'critical'
                    ? 'bg-red-600 text-white border-red-600'
                    : f === 'low'
                    ? 'bg-amber-500 text-white border-amber-500'
                    : 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white dark:bg-gray-800 text-secondary border-border hover:border-gray-400'
              }`}
            >
              {f === 'all' ? 'All' : f === 'critical' ? '🔴 Critical' : '🟡 Low'}
            </button>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      {reportData && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          <div className="bg-card border border-border rounded-lg p-3">
            <p className="text-xs text-secondary">Items to reorder</p>
            <p className="text-2xl font-bold text-primary">{reportData.summary.itemsNeedingReorder}</p>
          </div>
          <div className="bg-card border border-red-200 dark:border-red-900/40 rounded-lg p-3">
            <p className="text-xs text-secondary">Critical</p>
            <p className="text-2xl font-bold text-red-600">{reportData.summary.criticalItems}</p>
          </div>
          <div className="bg-card border border-amber-200 dark:border-amber-900/40 rounded-lg p-3">
            <p className="text-xs text-secondary">Low stock</p>
            <p className="text-2xl font-bold text-amber-600">{reportData.summary.lowItems}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-3">
            <p className="text-xs text-secondary">Est. reorder cost</p>
            <p className="text-2xl font-bold text-primary">
              ${reportData.summary.estimatedReorderCost.toFixed(2)}
            </p>
          </div>
        </div>
      )}

      {/* Table */}
      {loading && (
        <div className="text-center py-12 text-secondary">Loading…</div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {!loading && !error && reportData && rows.length === 0 && (
        <div className="text-center py-12 text-secondary text-sm">
          {urgencyFilter === 'all'
            ? 'No items need reordering for this date range.'
            : `No ${urgencyFilter} items found.`}
        </div>
      )}

      {!loading && rows.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800/60 text-xs text-secondary uppercase tracking-wide">
              <tr>
                <th className="px-3 py-2.5 text-left">Product</th>
                <th className="px-3 py-2.5 text-left">Category</th>
                <th className="px-3 py-2.5 text-right">Stock</th>
                <th className="px-3 py-2.5 text-right">Reorder Qty</th>
                <th className="px-3 py-2.5 text-right">Avg/Day</th>
                <th className="px-3 py-2.5 text-right">Days Left</th>
                <th className="px-3 py-2.5 text-right">Est. Cost</th>
                <th className="px-3 py-2.5 text-center">Urgency</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row) => (
                <tr
                  key={row.variantId}
                  className={`hover:bg-gray-50 dark:hover:bg-gray-800/40 ${
                    row.urgency === 'critical' ? 'bg-red-50/40 dark:bg-red-900/10' : ''
                  }`}
                >
                  <td className="px-3 py-2.5">
                    <p className="font-medium text-primary">{row.productName}</p>
                    {row.variantName !== 'Default' && (
                      <p className="text-xs text-secondary">{row.variantName}</p>
                    )}
                    {row.sku && <p className="text-xs text-gray-400">{row.sku}</p>}
                  </td>
                  <td className="px-3 py-2.5 text-secondary">{row.category}</td>
                  <td className="px-3 py-2.5 text-right">
                    <span className={row.currentStock === 0 ? 'text-red-600 font-bold' : 'text-primary'}>
                      {row.currentStock}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right font-semibold text-primary">
                    {row.suggestedReorderQty}
                  </td>
                  <td className="px-3 py-2.5 text-right text-secondary">
                    {row.avgDailySales > 0 ? row.avgDailySales.toFixed(1) : '—'}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <span
                      className={
                        row.daysOfStockLeft === 0
                          ? 'text-red-600 font-bold'
                          : row.daysOfStockLeft < 3
                          ? 'text-red-500 font-semibold'
                          : row.daysOfStockLeft < 7
                          ? 'text-amber-500 font-semibold'
                          : 'text-secondary'
                      }
                    >
                      {row.currentStock === 0 ? 'Out' : `${row.daysOfStockLeft}d`}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right text-secondary">
                    {row.estimatedCost != null ? `$${row.estimatedCost.toFixed(2)}` : '—'}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    {row.urgency === 'critical' ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">
                        Critical
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                        Low
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
