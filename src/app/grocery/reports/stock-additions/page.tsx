'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { DateRangeSelector, DateRange } from '@/components/reports/date-range-selector'
import { getLocalDateString } from '@/lib/utils'

interface StockAdditionRow {
  movementId: string
  itemId: string | null
  itemName: string
  sku: string
  category: string
  supplier: string
  qtyAdded: number
  unitCost: number | null
  sellingPrice: number | null
  totalCost: number | null
  costSource: 'cost' | 'selling' | null
  addedBy: string
  addedAt: string
  reference: string | null
}

interface ReportData {
  dateRange: { startDate: string; endDate: string; days: number }
  summary: {
    totalMovements: number
    totalItemsAffected: number
    totalUnitsAdded: number
    totalCostValue: number
    uniqueSuppliers: number
  }
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  data: StockAdditionRow[]
}

function getDefaultDateRange(): DateRange {
  const end = new Date()
  const start = new Date()
  start.setMonth(end.getMonth() - 6)
  return { start, end }
}

function formatCurrency(value: number | null): string {
  if (value === null) return '—'
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default function StockAdditionsPage() {
  const { currentBusinessId: contextBusinessId, currentBusiness } = useBusinessPermissionsContext()
  const router = useRouter()
  const searchParams = useSearchParams()
  const urlBusinessId = searchParams.get('businessId')
  const urlSku = searchParams.get('sku') ?? ''
  const currentBusinessId = urlBusinessId || contextBusinessId
  const businessType = currentBusiness?.businessType || 'grocery'

  const [dateRange, setDateRange] = useState<DateRange>(getDefaultDateRange())
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState(urlSku)

  const loadReport = useCallback(async (pageNum = 1) => {
    if (!currentBusinessId) return
    setLoading(true)
    setError(null)
    try {
      const startDate = getLocalDateString(dateRange.start)
      const endDate = getLocalDateString(dateRange.end)
      const res = await fetch(
        `/api/universal/reports/stock-additions?businessId=${currentBusinessId}&startDate=${startDate}&endDate=${endDate}&page=${pageNum}&limit=50`
      )
      const json = await res.json()
      if (json.success) {
        setReportData(json)
        setPage(pageNum)
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
    loadReport(1)
  }, [loadReport])

  function exportCsv() {
    if (!reportData) return
    const header = 'Item,SKU,Category,Supplier,Qty Added,Unit Cost,Total Cost,Added By,Date,Reference'
    const lines = reportData.data.map((r) =>
      [
        `"${r.itemName}"`,
        `"${r.sku}"`,
        `"${r.category}"`,
        `"${r.supplier}"`,
        r.qtyAdded,
        r.unitCost ?? '',
        r.totalCost ?? '',
        `"${r.addedBy}"`,
        `"${formatDate(r.addedAt)}"`,
        `"${r.reference ?? ''}"`,
      ].join(',')
    )
    const blob = new Blob([[header, ...lines].join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `stock-additions-${getLocalDateString(dateRange.start)}-${getLocalDateString(dateRange.end)}.csv`
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
            📦 Stock Additions Report
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Inventory received in the selected period — quantities, costs and who added them
          </p>
        </div>

        {/* Date filter */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 mb-6">
          <DateRangeSelector value={dateRange} onChange={setDateRange} />
        </div>

        {/* Summary cards */}
        {reportData && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">
                {reportData.summary.totalMovements.toLocaleString()}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Stock Entries</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 text-center">
              <div className="text-2xl font-bold text-indigo-600">
                {reportData.summary.totalItemsAffected.toLocaleString()}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Items Restocked</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 text-center">
              <div className="text-2xl font-bold text-green-600">
                {reportData.summary.totalUnitsAdded.toLocaleString()}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Units Received</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 text-center">
              <div className="text-2xl font-bold text-emerald-600">
                {formatCurrency(reportData.summary.totalCostValue)}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Total Cost Value</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 text-center">
              <div className="text-2xl font-bold text-amber-600">
                {reportData.summary.uniqueSuppliers.toLocaleString()}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Suppliers</div>
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
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
            {/* Table header row */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Stock Entries</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {reportData.summary.totalMovements.toLocaleString()} entries in{' '}
                  {reportData.dateRange.days} day{reportData.dateRange.days !== 1 ? 's' : ''}
                </p>
              </div>
              {reportData.data.length > 0 && (
                <button
                  onClick={exportCsv}
                  className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Export CSV
                </button>
              )}
            </div>

            {/* Search box */}
            <div className="mb-4">
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search by item name or SKU…"
                className="w-full sm:w-80 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="ml-2 text-xs text-gray-400 hover:text-gray-600"
                >
                  Clear
                </button>
              )}
            </div>

            {reportData.data.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-4xl mb-3">📦</p>
                <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">No stock additions found</p>
                <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">
                  No inventory was received in the selected date range.
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-100 dark:bg-gray-700 text-left">
                        <th className="px-4 py-2 font-semibold text-gray-700 dark:text-gray-200">Item</th>
                        <th className="px-4 py-2 font-semibold text-gray-700 dark:text-gray-200">Category</th>
                        <th className="px-4 py-2 font-semibold text-gray-700 dark:text-gray-200">Supplier</th>
                        <th className="px-4 py-2 font-semibold text-gray-700 dark:text-gray-200 text-right">Qty</th>
                        <th className="px-4 py-2 font-semibold text-gray-700 dark:text-gray-200 text-right">Unit Cost</th>
                        <th className="px-4 py-2 font-semibold text-gray-700 dark:text-gray-200 text-right">Total Cost</th>
                        <th className="px-4 py-2 font-semibold text-gray-700 dark:text-gray-200">Added By</th>
                        <th className="px-4 py-2 font-semibold text-gray-700 dark:text-gray-200">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.data
                        .filter(row =>
                          !searchTerm.trim() ||
                          row.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          row.sku.toLowerCase().includes(searchTerm.toLowerCase())
                        )
                        .map((row, i) => (
                        <tr
                          key={row.movementId}
                          className={`border-b border-gray-100 dark:border-gray-700 ${
                            i % 2 === 0 ? 'bg-gray-50 dark:bg-gray-800' : 'bg-white dark:bg-gray-700'
                          }`}
                        >
                          <td className="px-4 py-2">
                            <div className="font-medium text-gray-900 dark:text-gray-100">{row.itemName}</div>
                            {row.sku && (
                              <div className="text-xs text-gray-400 dark:text-gray-500 font-mono">{row.sku}</div>
                            )}
                            {row.reference && (
                              <div className="text-xs text-blue-500 dark:text-blue-400">Ref: {row.reference}</div>
                            )}
                          </td>
                          <td className="px-4 py-2 text-gray-600 dark:text-gray-400 text-xs">{row.category}</td>
                          <td className="px-4 py-2 text-gray-600 dark:text-gray-400 text-xs">{row.supplier}</td>
                          <td className="px-4 py-2 text-right font-semibold text-gray-900 dark:text-gray-100">
                            {row.qtyAdded.toLocaleString()}
                          </td>
                          <td className="px-4 py-2 text-right text-gray-700 dark:text-gray-300">
                            {row.costSource === 'cost' ? (
                              formatCurrency(row.unitCost)
                            ) : row.costSource === 'selling' ? (
                              <span className="text-amber-600 dark:text-amber-400" title="Selling price (no cost price set)">
                                {formatCurrency(row.sellingPrice)}
                                <span className="ml-1 text-xs opacity-70">sell</span>
                              </span>
                            ) : '—'}
                          </td>
                          <td className="px-4 py-2 text-right font-semibold text-emerald-700 dark:text-emerald-400">
                            {row.costSource === 'cost' ? (
                              formatCurrency(row.totalCost)
                            ) : row.costSource === 'selling' ? (
                              <span className="text-amber-600 dark:text-amber-400" title="Based on selling price">
                                {formatCurrency(row.totalCost)}
                                <span className="ml-1 text-xs opacity-70">sell</span>
                              </span>
                            ) : '—'}
                          </td>
                          <td className="px-4 py-2 text-gray-600 dark:text-gray-400 text-xs">{row.addedBy}</td>
                          <td className="px-4 py-2 text-gray-500 dark:text-gray-400 text-xs whitespace-nowrap">
                            {formatDate(row.addedAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {reportData.pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Page {reportData.pagination.page} of {reportData.pagination.totalPages} (
                      {reportData.pagination.total.toLocaleString()} total)
                    </p>
                    <div className="flex gap-2">
                      <button
                        disabled={page <= 1}
                        onClick={() => loadReport(page - 1)}
                        className="px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        ← Prev
                      </button>
                      <button
                        disabled={page >= reportData.pagination.totalPages}
                        onClick={() => loadReport(page + 1)}
                        className="px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Next →
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
