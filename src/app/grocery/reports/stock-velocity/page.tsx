'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { DateRangeSelector, DateRange } from '@/components/reports/date-range-selector'
import { getLocalDateString } from '@/lib/utils'

interface StockVelocityRow {
  variantId: string
  productId: string
  productName: string
  variantName: string
  sku: string
  category: string
  totalUnitsSold: number
  avgDailySales: number
  currentStock: number
  daysOfStockLeft: number | null
}

interface ReportData {
  dateRange: { startDate: string; endDate: string; days: number }
  summary: {
    totalProducts: number
    totalUnitsSold: number
    productsWithSales: number
    productsWithNoSales: number
  }
  data: StockVelocityRow[]
}

const FAST_MOVER_LIMIT = 20
// Products with less than this avg daily sales rate are considered slow-moving
const SLOW_THRESHOLD = 0.1

function getDefaultDateRange(): DateRange {
  const end = new Date()
  const start = new Date()
  start.setDate(end.getDate() - 30)
  return { start, end }
}

function formatDays(days: number | null): string {
  if (days === null) return '∞'
  if (days > 999) return '>999d'
  return `${days}d`
}

function daysColor(days: number | null): string {
  if (days === null) return 'text-gray-400'
  if (days < 3) return 'text-red-600 font-bold'
  if (days < 7) return 'text-orange-500 font-semibold'
  return 'text-gray-700 dark:text-gray-300'
}

export default function StockVelocityPage() {
  const { currentBusinessId, currentBusiness } = useBusinessPermissionsContext()
  const router = useRouter()
  const businessType = currentBusiness?.businessType || 'grocery'

  const [dateRange, setDateRange] = useState<DateRange>(getDefaultDateRange())
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadReport = useCallback(async () => {
    if (!currentBusinessId) return
    setLoading(true)
    setError(null)
    try {
      const startDate = getLocalDateString(dateRange.start)
      const endDate = getLocalDateString(dateRange.end)
      const res = await fetch(
        `/api/universal/reports/stock-velocity?businessId=${currentBusinessId}&startDate=${startDate}&endDate=${endDate}`
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

  const fastMovers = reportData?.data.filter((r) => r.totalUnitsSold > 0).slice(0, FAST_MOVER_LIMIT) ?? []
  const slowMovers = reportData?.data.filter((r) => r.avgDailySales < SLOW_THRESHOLD) ?? []

  function exportCsv(rows: StockVelocityRow[], filename: string) {
    const header = 'Product,Variant,SKU,Category,Units Sold,Avg/Day,Current Stock,Days of Stock Left'
    const lines = rows.map((r) =>
      [
        `"${r.productName}"`,
        `"${r.variantName}"`,
        `"${r.sku}"`,
        `"${r.category}"`,
        r.totalUnitsSold,
        r.avgDailySales,
        r.currentStock,
        r.daysOfStockLeft ?? '',
      ].join(',')
    )
    const blob = new Blob([[header, ...lines].join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  const VelocityTable = ({ rows, emptyMessage }: { rows: StockVelocityRow[]; emptyMessage: string }) => (
    rows.length === 0 ? (
      <p className="text-gray-500 dark:text-gray-400 text-center py-8">{emptyMessage}</p>
    ) : (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-100 dark:bg-gray-700 text-left">
              <th className="px-4 py-2 font-semibold text-gray-700 dark:text-gray-200">Product</th>
              <th className="px-4 py-2 font-semibold text-gray-700 dark:text-gray-200">SKU</th>
              <th className="px-4 py-2 font-semibold text-gray-700 dark:text-gray-200 text-right">Units Sold</th>
              <th className="px-4 py-2 font-semibold text-gray-700 dark:text-gray-200 text-right">Avg / Day</th>
              <th className="px-4 py-2 font-semibold text-gray-700 dark:text-gray-200 text-right">Current Stock</th>
              <th className="px-4 py-2 font-semibold text-gray-700 dark:text-gray-200 text-right">Days of Stock Left</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={row.variantId}
                className={`border-b border-gray-100 dark:border-gray-700 ${
                  i % 2 === 0 ? 'bg-gray-50 dark:bg-gray-800' : 'bg-gray-100 dark:bg-gray-700'
                }`}
              >
                <td className="px-4 py-2">
                  <div className="font-medium text-gray-900 dark:text-gray-100">{row.productName}</div>
                  {row.variantName !== 'Default' && (
                    <div className="text-xs text-gray-500 dark:text-gray-400">{row.variantName}</div>
                  )}
                  <div className="text-xs text-gray-400 dark:text-gray-500">{row.category}</div>
                  {row.isTransferred && (
                    <div className="text-xs italic text-blue-500 dark:text-blue-400">Transferred Items</div>
                  )}
                </td>
                <td className="px-4 py-2 text-gray-600 dark:text-gray-400 font-mono text-xs">{row.sku || '—'}</td>
                <td className="px-4 py-2 text-right font-semibold text-gray-900 dark:text-gray-100">
                  {row.totalUnitsSold.toLocaleString()}
                </td>
                <td className="px-4 py-2 text-right text-gray-700 dark:text-gray-300">
                  {row.avgDailySales.toFixed(1)}
                </td>
                <td className="px-4 py-2 text-right text-gray-700 dark:text-gray-300">
                  {row.currentStock.toLocaleString()}
                </td>
                <td className={`px-4 py-2 text-right ${daysColor(row.daysOfStockLeft)}`}>
                  {formatDays(row.daysOfStockLeft)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  )

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
            🔥 Stock Velocity Report
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            See which products are selling fast and which are barely moving
          </p>
        </div>

        {/* Date filter */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 mb-6">
          <DateRangeSelector value={dateRange} onChange={setDateRange} />
        </div>

        {/* Summary cards */}
        {reportData && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{reportData.summary.totalProducts}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Total Products</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{reportData.summary.totalUnitsSold.toLocaleString()}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Units Sold</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 text-center">
              <div className="text-2xl font-bold text-orange-500">{reportData.summary.productsWithSales}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Products w/ Sales</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 text-center">
              <div className="text-2xl font-bold text-gray-500">{reportData.summary.productsWithNoSales}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">No Sales in Period</div>
            </div>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600"></div>
            <span className="ml-4 text-gray-600 dark:text-gray-400">Loading report...</span>
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-6 text-red-700 dark:text-red-400">
            {error}
          </div>
        )}

        {!loading && reportData && (
          <>
            {/* Fast Movers */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">🔥 Fast Moving</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Top {FAST_MOVER_LIMIT} products by average daily sales in the selected period
                  </p>
                </div>
                {fastMovers.length > 0 && (
                  <button
                    onClick={() =>
                      exportCsv(
                        fastMovers,
                        `fast-movers-${reportData.dateRange.startDate}-${reportData.dateRange.endDate}.csv`
                      )
                    }
                    className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Export CSV
                  </button>
                )}
              </div>
              <VelocityTable rows={fastMovers} emptyMessage="No sales recorded in this period." />
            </div>

            {/* Slow Movers */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">🐌 Slow Moving</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Products selling fewer than {SLOW_THRESHOLD} units per day (or no sales) in the selected period
                  </p>
                </div>
                {slowMovers.length > 0 && (
                  <button
                    onClick={() =>
                      exportCsv(
                        slowMovers,
                        `slow-movers-${reportData.dateRange.startDate}-${reportData.dateRange.endDate}.csv`
                      )
                    }
                    className="px-3 py-1.5 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                  >
                    Export CSV
                  </button>
                )}
              </div>
              <VelocityTable rows={slowMovers} emptyMessage="All products are selling well in this period." />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
