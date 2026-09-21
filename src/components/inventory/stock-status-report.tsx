'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
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
  /** Client-only — populated for the just-edited row on return from the edit
   * modal (see the restore effect), so the user can see exactly what changed
   * instead of the row silently showing new numbers with no visual cue. */
  changedFrom?: {
    quantityOnHand?: number
    costPrice?: number | null
    sellingPrice?: number | null
  }
}

interface ReportData {
  businessType: string | null
  status: 'out' | 'low'
  summary: { total: number }
  pagination: { page: number; limit: number; total: number; totalPages: number }
  data: StockStatusRow[]
}

const money = (n: number | null) => (n == null ? '—' : `$${n.toFixed(2)}`)

const cacheKey = (status: 'out' | 'low', businessId: string) => `stock-status-report:${status}:${businessId}`

/** Shows "old value → new value" (old struck through, new highlighted) when
 * `oldValue` is given; otherwise just the plain current value — same idea as
 * the price-change visibility in the Pricing Exceptions report. */
function ChangedValue({ oldValue, newValue, format, highlightClass }: {
  oldValue: string | number | null | undefined
  newValue: string | number | null
  format: (v: string | number | null) => string
  highlightClass: string
}) {
  if (oldValue === undefined) return <>{format(newValue)}</>
  return (
    <span className="inline-flex flex-wrap items-center justify-end gap-1.5">
      <span className="line-through text-gray-400 dark:text-gray-500 text-xs">{format(oldValue)}</span>
      <span className={`font-bold ${highlightClass}`}>{format(newValue)}</span>
    </span>
  )
}

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
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  // Whoever linked into this report (e.g. the homepage's Inventory Overview
  // widget) can say where "back" should really go — falls back to the
  // Reports index when opened some other way (e.g. the reports hub itself).
  const returnTo = searchParams.get('returnTo')
  const backHref = returnTo || '/inventory/reports'
  const backLabel = returnTo ? '← Back' : '← Back to Reports'
  // Carried through to the item edit round-trip so that after editing an
  // item and coming back to *this* report, its own "back" link still points
  // wherever the user originally came from, not just to /inventory/reports.
  const selfPath = returnTo ? `${reportPath}?returnTo=${encodeURIComponent(returnTo)}` : reportPath
  // Each row's edit link carries its own id back through the round trip
  // (see the restore effect below) so the report knows, on return, which
  // item to patch with fresh numbers instead of dropping/refetching everything.
  const rowReturnTo = (itemId: string) => `${selfPath}${selfPath.includes('?') ? '&' : '?'}editedItemId=${encodeURIComponent(itemId)}`
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
      if (json.success) {
        setReportData(json)
        // Snapshot the default (page 1, no search) view so that returning
        // from editing an item can restore it without a real refetch — see
        // the restore effect below for why that matters.
        if (page === 1 && !search.trim()) {
          try { sessionStorage.setItem(cacheKey(status, currentBusinessId), JSON.stringify(json)) } catch {}
        }
      } else {
        setError(json.error ?? 'Failed to load report')
      }
    } catch {
      setError('Failed to load report')
    } finally {
      setLoading(false)
    }
  }, [currentBusinessId, status, page, pageSize, search])

  // Suppresses the very next automatic loadReport() call triggered by the
  // restore effect just below — set synchronously (ref writes aren't
  // batched) before that effect's state updates, and consumed by the
  // loadReport effect declared after it, in the same commit.
  const suppressNextLoadRef = useRef(false)

  // Coming back from editing an item (ProductCell embeds `editedItemId` in
  // the returnTo URL it sends the business's inventory page) should show
  // that item's fresh numbers immediately, without making the whole report
  // disappear-then-reappear — and, critically, without the freshly-restocked
  // item vanishing from the list right away. It should only actually drop
  // off once the user does a real reload. So: restore the last snapshot
  // (taken before navigating away to edit) from sessionStorage instead of
  // re-fetching, then patch in just the edited item's current numbers.
  // Declared (and thus runs) before the loadReport effect below, so it can
  // set suppressNextLoadRef in time.
  const restoreAttemptedRef = useRef(false)
  useEffect(() => {
    if (!currentBusinessId || restoreAttemptedRef.current) return
    restoreAttemptedRef.current = true

    const editedItemId = searchParams.get('editedItemId')
    if (!editedItemId) return

    let cached: ReportData | null = null
    try {
      const raw = sessionStorage.getItem(cacheKey(status, currentBusinessId))
      if (raw) cached = JSON.parse(raw)
    } catch { /* ignore */ }
    if (!cached) return

    suppressNextLoadRef.current = true
    setReportData(cached)

    fetch(`/api/inventory/${currentBusinessId}/items/${editedItemId}`)
      .then(r => r.json())
      .then(d => {
        if (!d.success || !d.data) return
        setReportData(prev => prev ? {
          ...prev,
          data: prev.data.map(row => {
            if (row.editItemId !== editedItemId) return row
            const newStock = d.data.currentStock ?? row.quantityOnHand
            const newCost = d.data.costPrice ?? row.costPrice
            const newSelling = d.data.sellPrice ?? row.sellingPrice
            const changedFrom: StockStatusRow['changedFrom'] = {}
            if (newStock !== row.quantityOnHand) changedFrom.quantityOnHand = row.quantityOnHand
            if (newCost !== row.costPrice) changedFrom.costPrice = row.costPrice
            if (newSelling !== row.sellingPrice) changedFrom.sellingPrice = row.sellingPrice
            return {
              ...row,
              name: d.data.name ?? row.name,
              quantityOnHand: newStock,
              costPrice: newCost,
              sellingPrice: newSelling,
              ...(Object.keys(changedFrom).length > 0 ? { changedFrom } : {}),
            }
          }),
        } : prev)
      })
      .catch(() => { /* keep showing the cached snapshot */ })

    // Drop just editedItemId from the URL (keeping returnTo and anything
    // else intact) so a manual refresh doesn't replay this restore.
    const cleanedParams = new URLSearchParams(searchParams.toString())
    cleanedParams.delete('editedItemId')
    const cleanedQuery = cleanedParams.toString()
    router.replace(cleanedQuery ? `${pathname}?${cleanedQuery}` : pathname, { scroll: false })
  }, [currentBusinessId, status, searchParams, router, pathname])

  useEffect(() => {
    if (suppressNextLoadRef.current) { suppressNextLoadRef.current = false; return }
    loadReport()
  }, [loadReport])
  useEffect(() => { setPage(1) }, [search, pageSize])

  const rows = reportData?.data ?? []
  const stockColor = status === 'out' ? 'text-red-600' : 'text-orange-600'
  const rowTint = status === 'out' ? 'bg-red-50/40 dark:bg-red-900/10' : 'bg-orange-50/40 dark:bg-orange-900/10'

  return (
    <div className="bg-gray-50 dark:bg-gray-900">
      <div className="p-4 md:p-6 pb-0">
        <Link href={backHref} className="inline-flex items-center gap-1 text-sm text-secondary hover:text-primary hover:underline mb-2">
          {backLabel}
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
                      returnTo={rowReturnTo(row.editItemId)}
                    />
                    <div className="grid grid-cols-3 gap-x-3 gap-y-2 pt-1">
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-secondary">Stock</p>
                        <p className={row.changedFrom?.quantityOnHand !== undefined ? '' : `font-semibold ${stockColor}`}>
                          <ChangedValue
                            oldValue={row.changedFrom?.quantityOnHand}
                            newValue={row.quantityOnHand}
                            format={v => String(v)}
                            highlightClass="text-emerald-600 dark:text-emerald-400"
                          />
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-secondary">Cost Price</p>
                        <p className="text-secondary">
                          <ChangedValue
                            oldValue={row.changedFrom?.costPrice}
                            newValue={row.costPrice}
                            format={v => money(v as number | null)}
                            highlightClass="text-emerald-600 dark:text-emerald-400"
                          />
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-secondary">Selling Price</p>
                        <p className="text-secondary">
                          <ChangedValue
                            oldValue={row.changedFrom?.sellingPrice}
                            newValue={row.sellingPrice}
                            format={v => money(v as number | null)}
                            highlightClass="text-emerald-600 dark:text-emerald-400"
                          />
                        </p>
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
                            returnTo={rowReturnTo(row.editItemId)}
                          />
                        </td>
                        <td className={`px-3 py-2.5 text-right ${row.changedFrom?.quantityOnHand !== undefined ? '' : `font-semibold ${stockColor}`}`}>
                          <ChangedValue
                            oldValue={row.changedFrom?.quantityOnHand}
                            newValue={row.quantityOnHand}
                            format={v => String(v)}
                            highlightClass="text-emerald-600 dark:text-emerald-400"
                          />
                        </td>
                        <td className="px-3 py-2.5 text-right text-secondary">
                          <ChangedValue
                            oldValue={row.changedFrom?.costPrice}
                            newValue={row.costPrice}
                            format={v => money(v as number | null)}
                            highlightClass="text-emerald-600 dark:text-emerald-400"
                          />
                        </td>
                        <td className="px-3 py-2.5 text-right text-secondary">
                          <ChangedValue
                            oldValue={row.changedFrom?.sellingPrice}
                            newValue={row.sellingPrice}
                            format={v => money(v as number | null)}
                            highlightClass="text-emerald-600 dark:text-emerald-400"
                          />
                        </td>
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
