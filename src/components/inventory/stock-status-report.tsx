'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { ProductCell } from '@/components/inventory/report-product-cell'
import { ListSearchFilterBar } from '@/components/ui/list-search-filter-bar'
import { Pagination } from '@/components/ui/pagination'
import { usePageSize, PAGE_SIZE_OPTIONS } from '@/hooks/use-page-size-preference'
import '@/styles/print-report.css'

interface StockStatusRow {
  id: string
  editItemId: string
  name: string
  imageUrl: string | null
  sku: string | null
  category: string | null
  supplier: string | null
  quantityOnHand: number
  costPrice: number | null
  sellingPrice: number | null
}

interface ReportData {
  businessType: string | null
  status: 'out' | 'low'
  summary: { total: number }
  pagination: { page: number; limit: number; total: number; totalPages: number }
  data: StockStatusRow[]
}

const money = (n: number | null) => (n == null ? '—' : `$${n.toFixed(2)}`)

/**
 * Shared UI for both the "Out of Stock" and "Low Stock" reports linked from
 * InventoryDashboardWidget — same MBM-299 responsive template and
 * ProductCell/returnTo edit round-trip as pricing-exceptions, poor-performers,
 * etc. Parameterized by `status` since the two reports differ only in which
 * items qualify (server-side, via /api/universal/reports/stock-status) and
 * their copy.
 */
export function StockStatusReport({ status, title, description, reportPath }: {
  status: 'out' | 'low'
  title: string
  description: string
  reportPath: string
}) {
  const { currentBusinessId, hasPermission, isSystemAdmin } = useBusinessPermissionsContext()
  const canEditInventory = isSystemAdmin || hasPermission('canManageInventory')
  const [search, setSearch] = useState('')
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
        status,
        page: String(page),
        limit: String(pageSize),
        ...(search.trim() ? { search: search.trim() } : {}),
      })
      const res = await fetch(`/api/universal/reports/stock-status?${params}`)
      const json = await res.json()
      if (json.success) setReportData(json)
      else setError(json.error ?? 'Failed to load report')
    } catch {
      setError('Failed to load report')
    } finally {
      setLoading(false)
    }
  }, [currentBusinessId, status, page, pageSize, search])

  useEffect(() => { loadReport() }, [loadReport])
  useEffect(() => { setPage(1) }, [search, pageSize])

  const rows = reportData?.data ?? []
  const stockColor = status === 'out' ? 'text-red-600' : 'text-orange-600'
  const rowTint = status === 'out' ? 'bg-red-50/40 dark:bg-red-900/10' : 'bg-orange-50/40 dark:bg-orange-900/10'

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
          <span>{title}</span>
        </div>
        <h1 className="text-xl font-bold text-primary">{title}</h1>
        <p className="text-sm text-secondary mt-0.5">{description}</p>
      </div>

      <div className="sticky top-14 sm:top-16 z-20 bg-gray-50 dark:bg-gray-900 pt-3 pb-2 px-4 md:px-6 no-print">
        <ListSearchFilterBar
          onSearchChange={setSearch}
          searchLoading={loading}
          searchPlaceholder="Search by name or SKU…"
        />
      </div>

      <div className="px-4 md:px-6 pb-4">
        {reportData && (
          <div className="mb-4">
            <div className="inline-block bg-card border border-border rounded-lg p-3">
              <p className="text-xs text-secondary">{status === 'out' ? 'Out of stock' : 'Low stock'} items</p>
              <p className={`text-2xl font-bold ${stockColor}`}>{reportData.summary.total}</p>
            </div>
          </div>
        )}

        {error && <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-sm text-red-700 dark:text-red-300 mb-4">{error}</div>}

        {loading && <div className="text-center py-12 text-secondary">Loading…</div>}

        {!loading && reportData && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-border">
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border">
              <p className="text-sm text-secondary">{reportData.pagination.total} items · page {reportData.pagination.page} of {Math.max(1, reportData.pagination.totalPages)}</p>
            </div>

            {/* Mobile card list (MBM-299 responsive-reports template) */}
            <div className="sm:hidden divide-y divide-border">
              {rows.length === 0 ? (
                <div className="text-center py-12 text-secondary text-sm">Nothing here — every tracked item is {status === 'out' ? 'in stock' : 'above the low-stock threshold'}.</div>
              ) : (
                rows.map(row => (
                  <div key={row.id} className={`p-3 space-y-2 ${rowTint}`}>
                    <ProductCell
                      imageUrl={row.imageUrl}
                      name={row.name}
                      sku={row.sku ? `${row.sku} · ${row.category ?? 'Uncategorised'}` : undefined}
                      businessType={reportData.businessType}
                      editItemId={row.editItemId}
                      canEdit={canEditInventory}
                      returnTo={reportPath}
                    />
                    <div className="grid grid-cols-3 gap-x-3 gap-y-2 pt-1">
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-secondary">Stock</p>
                        <p className={`font-semibold ${stockColor}`}>{row.quantityOnHand}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-secondary">Cost Price</p>
                        <p className="text-secondary">{money(row.costPrice)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-secondary">Selling Price</p>
                        <p className="text-secondary">{money(row.sellingPrice)}</p>
                      </div>
                      {row.supplier && (
                        <div className="col-span-3">
                          <p className="text-[10px] uppercase tracking-wide text-secondary">Supplier</p>
                          <p className="text-secondary">{row.supplier}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="hidden sm:block overflow-x-auto">
              {rows.length === 0 ? (
                <div className="text-center py-12 text-secondary text-sm">Nothing here — every tracked item is {status === 'out' ? 'in stock' : 'above the low-stock threshold'}.</div>
              ) : (
                <table className="w-full text-sm border-separate border-spacing-0">
                  <thead>
                    <tr className="text-xs text-secondary uppercase tracking-wide">
                      <th className="bg-gray-50 dark:bg-gray-800 px-3 py-2.5 text-left">Product</th>
                      <th className="bg-gray-50 dark:bg-gray-800 px-3 py-2.5 text-right">Stock</th>
                      <th className="bg-gray-50 dark:bg-gray-800 px-3 py-2.5 text-right">Cost Price</th>
                      <th className="bg-gray-50 dark:bg-gray-800 px-3 py-2.5 text-right">Selling Price</th>
                      <th className="bg-gray-50 dark:bg-gray-800 px-3 py-2.5 text-left">Supplier</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {rows.map(row => (
                      <tr key={row.id} className={rowTint}>
                        <td className="px-3 py-2.5">
                          <ProductCell
                            imageUrl={row.imageUrl}
                            name={row.name}
                            sku={row.sku ? `${row.sku} · ${row.category ?? 'Uncategorised'}` : undefined}
                            businessType={reportData.businessType}
                            editItemId={row.editItemId}
                            canEdit={canEditInventory}
                            returnTo={reportPath}
                          />
                        </td>
                        <td className={`px-3 py-2.5 text-right font-semibold ${stockColor}`}>{row.quantityOnHand}</td>
                        <td className="px-3 py-2.5 text-right text-secondary">{money(row.costPrice)}</td>
                        <td className="px-3 py-2.5 text-right text-secondary">{money(row.sellingPrice)}</td>
                        <td className="px-3 py-2.5 text-secondary">{row.supplier || '—'}</td>
                      </tr>
                    ))}
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
