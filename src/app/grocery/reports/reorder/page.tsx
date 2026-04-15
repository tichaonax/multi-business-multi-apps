'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
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
  reorderLevel: number
  avgDailySales: number
  unitsSoldInRange: number
  daysOfStockLeft: number
  historicalAvgDailySales: number
  historicalUnitsSold: number
  historicalDays: number
  urgency: 'critical' | 'low'
  suggestedReorderQty: number
  suggestionBasis: 'historical' | 'recent' | 'reorder_level'
  costPrice: number | null
  sellingPrice: number | null
  estimatedCost: number | null
}

interface ReportData {
  dateRange: { startDate: string; endDate: string; days: number }
  config: { reorderThresholdDays: number; targetStockDays: number }
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

function formatCurrency(val: number | null): string {
  if (val === null) return '—'
  return val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function ReorderSuggestionsPage() {
  const { currentBusinessId, currentBusiness } = useBusinessPermissionsContext()
  const router = useRouter()
  const businessType = currentBusiness?.businessType || 'grocery'

  const [dateRange, setDateRange] = useState<DateRange>(getDefaultDateRange())
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Configurable thresholds
  const [reorderThresholdDays, setReorderThresholdDays] = useState(7)
  const [targetStockDays, setTargetStockDays] = useState(30)

  const loadReport = useCallback(async () => {
    if (!currentBusinessId) return
    setLoading(true)
    setError(null)
    try {
      const startDate = getLocalDateString(dateRange.start)
      const endDate = getLocalDateString(dateRange.end)
      const res = await fetch(
        `/api/universal/reports/reorder?businessId=${currentBusinessId}&startDate=${startDate}&endDate=${endDate}&reorderThresholdDays=${reorderThresholdDays}&targetStockDays=${targetStockDays}`
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
  }, [currentBusinessId, dateRange, reorderThresholdDays, targetStockDays])

  useEffect(() => {
    loadReport()
  }, [loadReport])

  function exportCsv() {
    if (!reportData) return
    const header = 'Product,Variant,SKU,Category,Current Stock,Reorder Level,90-Day Avg/Day,90-Day Units Sold,Recent Avg/Day,Days Left,Urgency,Suggested Order Qty,Basis,Cost Price,Estimated Cost'
    const lines = reportData.data.map((r) =>
      [
        `"${r.productName}"`,
        `"${r.variantName}"`,
        `"${r.sku}"`,
        `"${r.category}"`,
        r.currentStock,
        r.reorderLevel,
        r.historicalAvgDailySales,
        r.historicalUnitsSold,
        r.avgDailySales,
        r.daysOfStockLeft,
        r.urgency,
        r.suggestedReorderQty,
        r.suggestionBasis,
        r.costPrice ?? '',
        r.estimatedCost ?? '',
      ].join(',')
    )
    const blob = new Blob([[header, ...lines].join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `reorder-suggestions-${reportData.dateRange.startDate}-${reportData.dateRange.endDate}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      {/* Navigation */}
      <div className="mb-6 flex gap-3 no-print">
        <button
          onClick={() => router.back()}
          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          ← Back
        </button>
        <Link
          href={`/${businessType}/reports`}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          ← Back to Reports
        </Link>
      </div>

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-1">
            📦 Reorder Suggestions
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Based on sales velocity — products running low with suggested order quantities
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 mb-6 space-y-4">
          <DateRangeSelector value={dateRange} onChange={setDateRange} />

          {/* Threshold controls */}
          <div className="flex flex-wrap gap-6 pt-2 border-t border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                Reorder when stock left ≤
              </label>
              <select
                value={reorderThresholdDays}
                onChange={(e) => setReorderThresholdDays(Number(e.target.value))}
                className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                {[3, 5, 7, 10, 14, 21].map((d) => (
                  <option key={d} value={d}>{d} days</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                Order enough for
              </label>
              <select
                value={targetStockDays}
                onChange={(e) => setTargetStockDays(Number(e.target.value))}
                className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                {[7, 14, 21, 30, 45, 60, 90].map((d) => (
                  <option key={d} value={d}>{d} days</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Summary cards */}
        {reportData && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{reportData.summary.itemsNeedingReorder}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Items to Reorder</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 text-center">
              <div className="text-2xl font-bold text-red-600">{reportData.summary.criticalItems}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Critical (&lt; 3 days)</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 text-center">
              <div className="text-2xl font-bold text-orange-500">{reportData.summary.lowItems}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Low (3–{reorderThresholdDays} days)</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 text-center">
              <div className="text-2xl font-bold text-gray-700 dark:text-gray-200">
                {formatCurrency(reportData.summary.estimatedReorderCost)}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Est. Reorder Cost</div>
            </div>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600"></div>
            <span className="ml-4 text-gray-600 dark:text-gray-400">Loading suggestions...</span>
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-6 text-red-700 dark:text-red-400">
            {error}
          </div>
        )}

        {!loading && reportData && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Suggested Orders</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Quantities based on 90-day historical sales. Recent velocity from selected {reportData.dateRange.days}-day range.
                </p>
              </div>
              {reportData.data.length > 0 && (
                <button
                  onClick={exportCsv}
                  className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Export CSV
                </button>
              )}
            </div>

            {reportData.data.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-12">
                No products need reordering — all stock levels are above the {reorderThresholdDays}-day threshold.
              </p>
            ) : (
              <div className="overflow-x-auto mt-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-100 dark:bg-gray-700 text-left">
                      <th className="px-4 py-2 font-semibold text-gray-700 dark:text-gray-200">Product</th>
                      <th className="px-4 py-2 font-semibold text-gray-700 dark:text-gray-200 text-right">Stock</th>
                      <th className="px-4 py-2 font-semibold text-gray-700 dark:text-gray-200 text-right">90d Avg/Day</th>
                      <th className="px-4 py-2 font-semibold text-gray-700 dark:text-gray-200 text-right">90d Sold</th>
                      <th className="px-4 py-2 font-semibold text-gray-700 dark:text-gray-200 text-right">Days Left</th>
                      <th className="px-4 py-2 font-semibold text-gray-700 dark:text-gray-200 text-center">Urgency</th>
                      <th className="px-4 py-2 font-semibold text-gray-700 dark:text-gray-200 text-right">Order Qty</th>
                      <th className="px-4 py-2 font-semibold text-gray-700 dark:text-gray-200 text-right">Est. Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.data.map((row, i) => (
                      <tr
                        key={row.variantId}
                        className={`border-b border-gray-100 dark:border-gray-700 ${
                          i % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-750'
                        }`}
                      >
                        <td className="px-4 py-2">
                          <div className="font-medium text-gray-900 dark:text-gray-100">{row.productName}</div>
                          {row.variantName !== 'Default' && (
                            <div className="text-xs text-gray-500 dark:text-gray-400">{row.variantName}</div>
                          )}
                          <div className="text-xs text-gray-400 dark:text-gray-500">{row.category}</div>
                        </td>
                        <td className="px-4 py-2 text-right">
                          <div className="font-medium text-gray-700 dark:text-gray-300">{row.currentStock.toLocaleString()}</div>
                          <div className="text-xs text-gray-400">min {row.reorderLevel}</div>
                        </td>
                        <td className="px-4 py-2 text-right">
                          <div className="font-medium text-gray-700 dark:text-gray-300">
                            {row.historicalAvgDailySales > 0 ? row.historicalAvgDailySales.toFixed(2) : '—'}
                          </div>
                          {row.historicalAvgDailySales === 0 && row.avgDailySales > 0 && (
                            <div className="text-xs text-orange-500">{row.avgDailySales.toFixed(2)} recent</div>
                          )}
                        </td>
                        <td className="px-4 py-2 text-right text-gray-600 dark:text-gray-400">
                          {row.historicalUnitsSold > 0 ? row.historicalUnitsSold.toLocaleString() : '—'}
                        </td>
                        <td className={`px-4 py-2 text-right font-semibold ${
                          row.daysOfStockLeft < 3
                            ? 'text-red-600'
                            : row.daysOfStockLeft < 7
                            ? 'text-orange-500'
                            : 'text-gray-700 dark:text-gray-300'
                        }`}>
                          {row.daysOfStockLeft > 0 ? `${row.daysOfStockLeft}d` : '—'}
                        </td>
                        <td className="px-4 py-2 text-center">
                          {row.urgency === 'critical' ? (
                            <span className="inline-block px-2 py-0.5 text-xs font-bold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full">
                              🔴 Critical
                            </span>
                          ) : (
                            <span className="inline-block px-2 py-0.5 text-xs font-bold bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded-full">
                              🟡 Low
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-right">
                          <div className="font-bold text-blue-700 dark:text-blue-400 text-base">
                            {row.suggestedReorderQty.toLocaleString()}
                          </div>
                          <div className="text-xs text-gray-400">
                            {row.suggestionBasis === 'historical' ? '90d history' : row.suggestionBasis === 'recent' ? 'recent sales' : 'reorder level'}
                          </div>
                        </td>
                        <td className="px-4 py-2 text-right text-gray-700 dark:text-gray-300">
                          {formatCurrency(row.estimatedCost)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {/* Totals row */}
                  <tfoot>
                    <tr className="bg-gray-100 dark:bg-gray-700 font-semibold">
                      <td colSpan={7} className="px-4 py-2 text-right text-gray-700 dark:text-gray-200">
                        Total Estimated Cost
                      </td>
                      <td className="px-4 py-2 text-right text-gray-900 dark:text-gray-100">
                        {formatCurrency(reportData.summary.estimatedReorderCost)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
