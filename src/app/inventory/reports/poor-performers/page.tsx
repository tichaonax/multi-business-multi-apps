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

interface PoorPerformerRow {
  id: string
  name: string
  imageUrl: string | null
  editItemId: string
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
  businessType: string | null
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
  const { currentBusinessId, hasPermission, isSystemAdmin } = useBusinessPermissionsContext()
  const canEditInventory = isSystemAdmin || hasPermission('canManageInventory')
  const [dateRange, setDateRange] = useState<DateRange>(getDefaultDateRange())
  const [search, setSearch] = useState('')
  const [criterionFilter, setCriterionFilter] = useState('')
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
        ...(search.trim() ? { search: search.trim() } : {}),
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
  }, [currentBusinessId, dateRange, page, pageSize, search])

  useEffect(() => { loadReport() }, [loadReport])
  useEffect(() => { setPage(1) }, [search, criterionFilter, pageSize])

  // Search is applied server-side (against the full catalog, not just this
  // page) — only the reason-type filter still narrows client-side, since
  // it's cheap and doesn't need to affect the reported total/pagination.
  let rows = reportData?.data ?? []
  if (criterionFilter) rows = rows.filter(r => r.criteria.includes(criterionFilter))

  function exportCsv() {
    const header = 'Product,SKU,Category,Qty on Hand,Cost Value,Qty Sold,Potential Loss,Actual Loss,Stock Age,Reasons,Suggested Action'
    const lines = rows.map(r => [
      `"${r.name}"`, `"${r.sku ?? ''}"`, `"${r.category ?? ''}"`, r.quantityOnHand,
      r.unvaluedQty > 0 ? 'unvalued' : r.totalCostValue.toFixed(2), r.qtySoldInPeriod,
      r.potentialLossOnHand.toFixed(2), r.actualLossInPeriod.toFixed(2), r.stockAgeDays,
      `"${r.criteria.join('; ')}"`, `"${r.suggestedAction}"`,
    ].join(','))
    const blob = new Blob([[header, ...lines].join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `poor-performers-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Deliberately NOT `.report-print-container` — see Pricing Exceptions
  // (src/app/inventory/reports/pricing-exceptions/page.tsx) for why: that
  // shared class's `overflow: hidden` silently disables `position: sticky`
  // on descendants, which is what broke its search bar. Scrolls normally
  // with a sticky search bar instead of a fixed-height/internal-scroll
  // container.
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
          <span>Poor-Performing &amp; Loss-Making Stock</span>
        </div>
        <h1 className="text-xl font-bold text-primary">Poor-Performing &amp; Loss-Making Stock</h1>
        <p className="text-sm text-secondary mt-0.5">Slow-moving, non-moving, excess, loss-making and poorly-priced stock, drawn from the same underlying data as the other inventory reports.</p>
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
          <select value={criterionFilter} onChange={e => setCriterionFilter(e.target.value)} className="px-3 py-1.5 text-sm border border-border rounded-lg bg-white dark:bg-gray-800 text-primary">
            <option value="">All reasons</option>
            {Object.entries(CRITERION_LABEL).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
          </select>
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

            <div className="overflow-x-auto">
              {rows.length === 0 ? (
                <div className="text-center py-12 text-secondary text-sm">No poor-performing stock matches the current filters.</div>
              ) : (
                <table className="w-full text-sm border-separate border-spacing-0">
                  <thead>
                    <tr className="text-xs text-secondary uppercase tracking-wide">
                      <th className="bg-gray-50 dark:bg-gray-800 px-3 py-2.5 text-left">Product</th>
                      <th className="bg-gray-50 dark:bg-gray-800 px-3 py-2.5 text-right">Qty on Hand</th>
                      <th className="bg-gray-50 dark:bg-gray-800 px-3 py-2.5 text-right">Cost Value</th>
                      <th className="bg-gray-50 dark:bg-gray-800 px-3 py-2.5 text-right">Qty Sold</th>
                      <th className="bg-gray-50 dark:bg-gray-800 px-3 py-2.5 text-right">Potential Loss</th>
                      <th className="bg-gray-50 dark:bg-gray-800 px-3 py-2.5 text-right">Actual Loss</th>
                      <th className="bg-gray-50 dark:bg-gray-800 px-3 py-2.5 text-right">Stock Age</th>
                      <th className="bg-gray-50 dark:bg-gray-800 px-3 py-2.5 text-left">Reasons</th>
                      <th className="bg-gray-50 dark:bg-gray-800 px-3 py-2.5 text-left">Suggested Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {rows.map(row => (
                      <tr key={row.id} className={row.severity === 'CRITICAL' ? 'bg-red-50/40 dark:bg-red-900/10' : 'bg-white dark:bg-gray-800'}>
                        <td className="px-3 py-2.5">
                          <ProductCell
                            imageUrl={row.imageUrl}
                            name={row.name}
                            sku={row.sku ? `${row.sku} · ${row.category ?? 'Uncategorised'}` : undefined}
                            businessType={reportData.businessType}
                            editItemId={row.editItemId}
                            canEdit={canEditInventory}
                            returnTo="/inventory/reports/poor-performers"
                          />
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
