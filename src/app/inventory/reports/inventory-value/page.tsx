'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { DateRangeSelector, DateRange } from '@/components/reports/date-range-selector'
import { getLocalDateString } from '@/lib/utils'

interface ValueRow {
  id: string
  name: string
  sku: string | null
  category: string | null
  supplier: string | null
  quantityOnHand: number
  costPrice: number | null
  sellingPrice: number | null
  totalCostValue: number
  unvaluedQty: number
  totalSellingValue: number
  isUnsellable: boolean
  posAvailabilityStatus: string
  potentialLossOnHand: number
  recentlyStocked: { quantity: number; value: number; usedFallbackCost: boolean }
  existing: { quantity: number; value: number }
  combined: { quantity: number; value: number; reconciles: boolean }
}

interface ReportData {
  summary: { itemCount: number; totalCostValue: number; totalUnvaluedQty: number; totalSellingValue: number; totalPotentialLoss: number; totalRecentlyStockedValue: number; totalExistingValue: number }
  pagination: { page: number; limit: number; total: number; totalPages: number }
  data: ValueRow[]
}

const money = (n: number) => `$${n.toFixed(2)}`

function getDefaultDateRange(): DateRange {
  const end = new Date()
  const start = new Date()
  start.setDate(end.getDate() - 30)
  return { start, end }
}

type ViewMode = 'combined' | 'recentlyStocked' | 'existing'

export default function InventoryValueReportPage() {
  const { currentBusinessId } = useBusinessPermissionsContext()
  const [dateRange, setDateRange] = useState<DateRange>(getDefaultDateRange())
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('combined')
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
      if (search.trim()) params.set('search', search.trim())
      const res = await fetch(`/api/universal/reports/inventory-value?${params}`)
      const json = await res.json()
      if (json.success) setReportData(json)
      else setError(json.error ?? 'Failed to load report')
    } catch {
      setError('Failed to load report')
    } finally {
      setLoading(false)
    }
  }, [currentBusinessId, dateRange, search, page])

  useEffect(() => { loadReport() }, [loadReport])

  const rows = reportData?.data ?? []

  return (
    <div className="flex flex-col bg-gray-50 dark:bg-gray-900" style={{ height: 'calc(100vh - 64px)' }}>
      <div className="flex-shrink-0 p-4 md:p-6 pb-0">
        <div className="flex items-center gap-2 text-xs text-secondary mb-1">
          <Link href="/inventory" className="hover:underline">Inventory</Link>
          <span>/</span>
          <span>Inventory Value</span>
        </div>
        <h1 className="text-xl font-bold text-primary">Inventory Value Report</h1>
        <p className="text-sm text-secondary mt-0.5">
          Item- and total-level valuation. &quot;Recently stocked&quot; only reflects movements recorded since stock-movement logging was added — older receipts fall under &quot;Existing&quot; even if actually received in this window.
        </p>

        <div className="flex flex-wrap items-end gap-3 my-4">
          <DateRangeSelector value={dateRange} onChange={setDateRange} />
          <div className="flex gap-1">
            {([['combined', 'Combined'], ['recentlyStocked', 'Recently Stocked'], ['existing', 'Existing']] as const).map(([mode, label]) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1.5 rounded text-xs font-medium border transition-colors ${viewMode === mode ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-gray-800 text-secondary border-border hover:border-gray-400'}`}
              >
                {label}
              </button>
            ))}
          </div>
          <input
            type="search"
            placeholder="Search by name, SKU, barcode…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            className="px-3 py-1.5 text-sm border border-border rounded-lg bg-white dark:bg-gray-800 text-primary w-56"
          />
        </div>

        {reportData && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="bg-card border border-border rounded-lg p-3">
              <p className="text-xs text-secondary">Total cost value</p>
              <p className="text-2xl font-bold text-primary">{money(reportData.summary.totalCostValue)}</p>
              {reportData.summary.totalUnvaluedQty > 0 && (
                <p className="text-xs text-amber-600 mt-0.5">+{reportData.summary.totalUnvaluedQty} units unvalued (no cost price)</p>
              )}
            </div>
            <div className="bg-card border border-border rounded-lg p-3">
              <p className="text-xs text-secondary">Total selling value</p>
              <p className="text-2xl font-bold text-primary">{money(reportData.summary.totalSellingValue)}</p>
            </div>
            <div className="bg-card border border-red-200 dark:border-red-900/40 rounded-lg p-3">
              <p className="text-xs text-secondary">Potential loss on hand</p>
              <p className="text-2xl font-bold text-red-600">{money(reportData.summary.totalPotentialLoss)}</p>
            </div>
            <div className="bg-card border border-border rounded-lg p-3">
              <p className="text-xs text-secondary">Recently stocked value</p>
              <p className="text-2xl font-bold text-primary">{money(reportData.summary.totalRecentlyStockedValue)}</p>
              <p className="text-xs text-gray-400 mt-0.5">Existing: {money(reportData.summary.totalExistingValue)}</p>
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
                <div className="text-center py-12 text-secondary text-sm">No items match the current filters.</div>
              ) : (
                <table className="w-full text-sm border-separate border-spacing-0">
                  <thead>
                    <tr className="text-xs text-secondary uppercase tracking-wide">
                      <th className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-800 px-3 py-2.5 text-left">Product</th>
                      <th className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-800 px-3 py-2.5 text-left">Category / Supplier</th>
                      <th className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-800 px-3 py-2.5 text-right">Qty</th>
                      <th className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-800 px-3 py-2.5 text-right">Unit Cost</th>
                      <th className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-800 px-3 py-2.5 text-right">Unit Sell</th>
                      <th className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-800 px-3 py-2.5 text-right">Cost Value</th>
                      <th className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-800 px-3 py-2.5 text-right">Selling Value</th>
                      <th className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-800 px-3 py-2.5 text-right">Potential Loss</th>
                      <th className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-800 px-3 py-2.5 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {rows.map(row => {
                      const view = row[viewMode]
                      return (
                        <tr key={row.id} className={row.potentialLossOnHand > 0 ? 'bg-red-50/40 dark:bg-red-900/10' : 'bg-white dark:bg-gray-800'}>
                          <td className="px-3 py-2.5">
                            <p className="font-medium text-primary">{row.name}</p>
                            {row.sku && <p className="text-xs text-gray-400">{row.sku}</p>}
                          </td>
                          <td className="px-3 py-2.5 text-secondary">
                            <p>{row.category ?? '—'}</p>
                            {row.supplier && <p className="text-xs text-gray-400">{row.supplier}</p>}
                          </td>
                          <td className="px-3 py-2.5 text-right text-secondary">{view.quantity}</td>
                          <td className="px-3 py-2.5 text-right text-secondary">
                            {row.costPrice != null ? money(row.costPrice) : <span className="text-amber-600">unvalued</span>}
                          </td>
                          <td className="px-3 py-2.5 text-right text-secondary">
                            {row.sellingPrice != null ? money(row.sellingPrice) : '—'}
                          </td>
                          <td className="px-3 py-2.5 text-right text-secondary">{money(view.value)}</td>
                          <td className="px-3 py-2.5 text-right text-secondary">
                            {viewMode === 'combined' ? money(row.totalSellingValue) : '—'}
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            {row.potentialLossOnHand > 0 ? <span className="text-red-600 font-semibold">{money(row.potentialLossOnHand)}</span> : '—'}
                          </td>
                          <td className="px-3 py-2.5">
                            {row.isUnsellable && (
                              <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                                {row.posAvailabilityStatus === 'HIDDEN_NO_PRICE' ? 'Unsellable (hidden)' : row.posAvailabilityStatus === 'VISIBLE_AT_ZERO_PRICE' ? 'Sellable at $0' : 'Inactive'}
                              </span>
                            )}
                            {row.unvaluedQty > 0 && (
                              <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 ml-1">Unvalued</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
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
