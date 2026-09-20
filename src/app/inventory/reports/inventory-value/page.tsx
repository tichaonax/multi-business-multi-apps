'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { DateRangeSelector, DateRange } from '@/components/reports/date-range-selector'
import { getLocalDateString } from '@/lib/utils'
import { ProductCell } from '@/components/inventory/report-product-cell'
import { ListSearchFilterBar } from '@/components/ui/list-search-filter-bar'
import { Pagination } from '@/components/ui/pagination'
import { usePageSize, PAGE_SIZE_OPTIONS } from '@/hooks/use-page-size-preference'
import '@/styles/print-report.css'

interface ValueRow {
  id: string
  name: string
  imageUrl: string | null
  editItemId: string
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
  businessType: string | null
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
  const { currentBusinessId, hasPermission, isSystemAdmin } = useBusinessPermissionsContext()
  const canEditInventory = isSystemAdmin || hasPermission('canManageInventory')
  const [dateRange, setDateRange] = useState<DateRange>(getDefaultDateRange())
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('combined')
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const { pageSize, setPageSize, isOverridden, resetToDefault } = usePageSize()

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
        limit: String(pageSize),
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
  }, [currentBusinessId, dateRange, search, page, pageSize])

  useEffect(() => { loadReport() }, [loadReport])
  useEffect(() => { setPage(1) }, [search, viewMode, pageSize])

  const rows = reportData?.data ?? []

  function exportCsv() {
    const header = 'Product,SKU,Category,Supplier,Qty,Unit Cost,Unit Sell,Cost Value,Selling Value,Potential Loss,Status'
    const lines = rows.map(r => [
      `"${r.name}"`, `"${r.sku ?? ''}"`, `"${r.category ?? ''}"`, `"${r.supplier ?? ''}"`,
      r.quantityOnHand, r.costPrice ?? '', r.sellingPrice ?? '', r.totalCostValue.toFixed(2), r.totalSellingValue.toFixed(2),
      r.potentialLossOnHand.toFixed(2), r.posAvailabilityStatus,
    ].join(','))
    const blob = new Blob([[header, ...lines].join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `inventory-value-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Deliberately NOT `.report-print-container` — see the Pricing Exceptions
  // page (src/app/inventory/reports/pricing-exceptions/page.tsx) for why:
  // that shared class's `overflow: hidden` silently disables `position:
  // sticky` on descendants, which broke its search bar the same way this
  // page's would be. This page now scrolls normally with a sticky search
  // bar instead of a fixed-height/internal-scroll container.
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
          <span>Inventory Value</span>
        </div>
        <h1 className="text-xl font-bold text-primary">Inventory Value Report</h1>
        <p className="text-sm text-secondary mt-0.5">
          Item- and total-level valuation. &quot;Recently stocked&quot; only reflects movements recorded since stock-movement logging was added — older receipts fall under &quot;Existing&quot; even if actually received in this window.
        </p>
      </div>

      <div className="sticky top-14 sm:top-16 z-20 bg-gray-50 dark:bg-gray-900 pt-3 pb-2 px-4 md:px-6 no-print">
        <ListSearchFilterBar
          onSearchChange={setSearch}
          searchLoading={loading}
          searchPlaceholder="Search by name, SKU, or barcode…"
        />
      </div>

      <div className="px-4 md:px-6 pb-4">
        <div className="flex flex-wrap items-end gap-3 mb-4 no-print">
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

        {loading && <div className="text-center py-12 text-secondary">Loading…</div>}

        {!loading && reportData && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-border">
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border">
              <p className="text-sm text-secondary">{reportData.pagination.total} items · page {reportData.pagination.page} of {Math.max(1, reportData.pagination.totalPages)}</p>
              <div className="flex items-center gap-2 no-print">
                <button onClick={exportCsv} className="text-xs px-2 py-1 border border-border rounded hover:border-gray-400">Export CSV</button>
                <button onClick={() => window.print()} className="text-xs px-2 py-1 border border-border rounded hover:border-gray-400">Print / Save as PDF</button>
              </div>
            </div>

            {/* Mobile card list (MBM-299 responsive-reports template — see
                src/app/inventory/reports/pricing-exceptions/page.tsx) */}
            <div className="sm:hidden divide-y divide-border">
              {rows.length === 0 ? (
                <div className="text-center py-12 text-secondary text-sm">No items match the current filters.</div>
              ) : (
                rows.map(row => {
                  const view = row[viewMode]
                  return (
                    <div key={row.id} className={`p-3 space-y-2 ${row.potentialLossOnHand > 0 ? 'bg-red-50/40 dark:bg-red-900/10' : ''}`}>
                      <ProductCell
                        imageUrl={row.imageUrl}
                        name={row.name}
                        sku={row.sku}
                        businessType={reportData.businessType}
                        editItemId={row.editItemId}
                        canEdit={canEditInventory}
                        returnTo="/inventory/reports/inventory-value"
                      />
                      <div className="text-xs text-secondary">
                        {row.category ?? '—'}{row.supplier && <span> · {row.supplier}</span>}
                      </div>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-2 pt-1">
                        <div>
                          <p className="text-[10px] uppercase tracking-wide text-secondary">Qty</p>
                          <p className="text-secondary">{view.quantity}</p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-wide text-secondary">Unit Cost</p>
                          <p className="text-secondary">{row.costPrice != null ? money(row.costPrice) : <span className="text-amber-600">unvalued</span>}</p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-wide text-secondary">Unit Sell</p>
                          <p className="text-secondary">{row.sellingPrice != null ? money(row.sellingPrice) : '—'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-wide text-secondary">Cost Value</p>
                          <p className="text-secondary">{money(view.value)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-wide text-secondary">Selling Value</p>
                          <p className="text-secondary">{viewMode === 'combined' ? money(row.totalSellingValue) : '—'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-wide text-secondary">Potential Loss</p>
                          <p className={row.potentialLossOnHand > 0 ? 'text-red-600 font-semibold' : 'text-secondary'}>
                            {row.potentialLossOnHand > 0 ? money(row.potentialLossOnHand) : '—'}
                          </p>
                        </div>
                        {(row.isUnsellable || row.unvaluedQty > 0) && (
                          <div className="col-span-2">
                            <p className="text-[10px] uppercase tracking-wide text-secondary">Status</p>
                            <div className="flex flex-wrap gap-1 mt-0.5">
                              {row.isUnsellable && (
                                <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                                  {row.posAvailabilityStatus === 'HIDDEN_NO_PRICE' ? 'Unsellable (hidden)' : row.posAvailabilityStatus === 'VISIBLE_AT_ZERO_PRICE' ? 'Sellable at $0' : 'Inactive'}
                                </span>
                              )}
                              {row.unvaluedQty > 0 && (
                                <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">Unvalued</span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            <div className="hidden sm:block overflow-x-auto">
              {rows.length === 0 ? (
                <div className="text-center py-12 text-secondary text-sm">No items match the current filters.</div>
              ) : (
                <table className="w-full text-sm border-separate border-spacing-0">
                  <thead>
                    <tr className="text-xs text-secondary uppercase tracking-wide">
                      <th className="bg-gray-50 dark:bg-gray-800 px-3 py-2.5 text-left">Product</th>
                      <th className="bg-gray-50 dark:bg-gray-800 px-3 py-2.5 text-left">Category / Supplier</th>
                      <th className="bg-gray-50 dark:bg-gray-800 px-3 py-2.5 text-right">Qty</th>
                      <th className="bg-gray-50 dark:bg-gray-800 px-3 py-2.5 text-right">Unit Cost</th>
                      <th className="bg-gray-50 dark:bg-gray-800 px-3 py-2.5 text-right">Unit Sell</th>
                      <th className="bg-gray-50 dark:bg-gray-800 px-3 py-2.5 text-right">Cost Value</th>
                      <th className="bg-gray-50 dark:bg-gray-800 px-3 py-2.5 text-right">Selling Value</th>
                      <th className="bg-gray-50 dark:bg-gray-800 px-3 py-2.5 text-right">Potential Loss</th>
                      <th className="bg-gray-50 dark:bg-gray-800 px-3 py-2.5 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {rows.map(row => {
                      const view = row[viewMode]
                      return (
                        <tr key={row.id} className={row.potentialLossOnHand > 0 ? 'bg-red-50/40 dark:bg-red-900/10' : 'bg-white dark:bg-gray-800'}>
                          <td className="px-3 py-2.5">
                            <ProductCell
                              imageUrl={row.imageUrl}
                              name={row.name}
                              sku={row.sku}
                              businessType={reportData.businessType}
                              editItemId={row.editItemId}
                              canEdit={canEditInventory}
                              returnTo="/inventory/reports/inventory-value"
                            />
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
            <div className="px-4 py-3 border-t border-border flex-shrink-0 no-print">
              <Pagination
                currentPage={page}
                totalPages={Math.max(1, reportData.pagination.totalPages)}
                totalItems={reportData.pagination.total}
                pageSize={pageSize}
                onPageChange={setPage}
                loading={loading}
                pageSizeOptions={PAGE_SIZE_OPTIONS}
                onPageSizeChange={setPageSize}
                isPageSizeOverridden={isOverridden}
                onResetPageSize={resetToDefault}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
