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

interface PerformanceRow {
  id: string
  productName: string
  variantName: string
  imageUrl: string | null
  editItemId: string
  sku: string
  category: string
  totalUnitsSold: number
  avgDailySales: number
  revenue: number
  costOfGoodsSold: number | null
  grossProfit: number | null
  grossMarginPct: number | null
  transactionCount: number
  currentStock: number
  daysOfStockLeft: number | null
  turnoverRatio: number | null
  lastSaleDate: string | null
  daysSinceLastSale: number | null
  pricingDataReliable: boolean
}

interface ReportData {
  businessType: string | null
  dateRange: { startDate: string; endDate: string; days: number }
  summary: { totalProducts: number; totalUnitsSold: number; productsWithSales: number; productsWithNoSales: number; totalRevenue: number; totalGrossProfit: number }
  data: PerformanceRow[]
}

function getDefaultDateRange(): DateRange {
  const end = new Date()
  const start = new Date()
  start.setDate(end.getDate() - 30)
  return { start, end }
}

const money = (n: number | null) => (n != null ? `$${n.toFixed(2)}` : '—')

function exportCsv(rows: PerformanceRow[]) {
  const header = 'Product,Variant,SKU,Category,Units Sold,Revenue,COGS,Gross Profit,Margin %,Transactions,Current Stock,Days Since Last Sale'
  const lines = rows.map(r => [
    `"${r.productName}"`, `"${r.variantName}"`, `"${r.sku}"`, `"${r.category}"`,
    r.totalUnitsSold, r.revenue, r.costOfGoodsSold ?? '', r.grossProfit ?? '', r.grossMarginPct ?? '',
    r.transactionCount, r.currentStock, r.daysSinceLastSale ?? '',
  ].join(','))
  const blob = new Blob([[header, ...lines].join('\n')], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `product-performance-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function ProductPerformanceReportPage() {
  const { currentBusinessId, hasPermission, isSystemAdmin } = useBusinessPermissionsContext()
  const canEditInventory = isSystemAdmin || hasPermission('canManageInventory')
  const [dateRange, setDateRange] = useState<DateRange>(getDefaultDateRange())
  const [search, setSearch] = useState('')
  const [profitabilityFilter, setProfitabilityFilter] = useState<'ALL' | 'PROFITABLE' | 'LOSS' | 'NO_SALES' | 'UNRELIABLE_PRICING'>('ALL')
  const [sortBy, setSortBy] = useState<'revenue' | 'unitsSold' | 'grossProfit' | 'margin'>('revenue')
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
      const startDate = getLocalDateString(dateRange.start)
      const endDate = getLocalDateString(dateRange.end)
      const res = await fetch(`/api/universal/reports/stock-velocity?businessId=${currentBusinessId}&startDate=${startDate}&endDate=${endDate}`)
      const json = await res.json()
      if (json.success) setReportData(json)
      else setError(json.error ?? 'Failed to load report')
    } catch {
      setError('Failed to load report')
    } finally {
      setLoading(false)
    }
  }, [currentBusinessId, dateRange])

  useEffect(() => { loadReport() }, [loadReport])
  useEffect(() => { setPage(1) }, [search, profitabilityFilter, sortBy, pageSize])

  let rows = reportData?.data ?? []
  if (search.trim()) {
    const q = search.toLowerCase()
    rows = rows.filter(r => r.productName.toLowerCase().includes(q) || r.sku.toLowerCase().includes(q) || r.category.toLowerCase().includes(q))
  }
  if (profitabilityFilter === 'PROFITABLE') rows = rows.filter(r => (r.grossProfit ?? 0) > 0)
  if (profitabilityFilter === 'LOSS') rows = rows.filter(r => (r.grossProfit ?? 0) < 0)
  if (profitabilityFilter === 'NO_SALES') rows = rows.filter(r => r.totalUnitsSold === 0)
  if (profitabilityFilter === 'UNRELIABLE_PRICING') rows = rows.filter(r => !r.pricingDataReliable)

  rows = [...rows].sort((a, b) => {
    if (sortBy === 'revenue') return b.revenue - a.revenue
    if (sortBy === 'unitsSold') return b.totalUnitsSold - a.totalUnitsSold
    if (sortBy === 'grossProfit') return (b.grossProfit ?? -Infinity) - (a.grossProfit ?? -Infinity)
    return (b.grossMarginPct ?? -Infinity) - (a.grossMarginPct ?? -Infinity)
  })

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize))
  const pagedRows = rows.slice((page - 1) * pageSize, page * pageSize)

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
          <span>Product Performance</span>
        </div>
        <h1 className="text-xl font-bold text-primary">Product Performance Report</h1>
        <p className="text-sm text-secondary mt-0.5">
          Sales, revenue and profitability for the selected period. Cost of goods sold uses today&apos;s cost price, not the price at the time of each historical sale — flag &quot;unreliable pricing&quot; items before trusting their margin figures.
        </p>
      </div>

      <div className="sticky top-14 sm:top-16 z-20 bg-gray-50 dark:bg-gray-900 pt-3 pb-2 px-4 md:px-6 no-print">
        <ListSearchFilterBar
          onSearchChange={setSearch}
          searchLoading={loading}
          searchPlaceholder="Search by name, SKU, category…"
        />
      </div>

      <div className="px-4 md:px-6 pb-4">
        <div className="flex flex-wrap items-end gap-3 mb-4 no-print">
          <DateRangeSelector value={dateRange} onChange={setDateRange} />
          <select value={profitabilityFilter} onChange={e => setProfitabilityFilter(e.target.value as any)} className="px-3 py-1.5 text-sm border border-border rounded-lg bg-white dark:bg-gray-800 text-primary">
            <option value="ALL">All products</option>
            <option value="PROFITABLE">Profitable</option>
            <option value="LOSS">Loss-making</option>
            <option value="NO_SALES">No sales in period</option>
            <option value="UNRELIABLE_PRICING">Unreliable pricing data</option>
          </select>
          <select value={sortBy} onChange={e => setSortBy(e.target.value as any)} className="px-3 py-1.5 text-sm border border-border rounded-lg bg-white dark:bg-gray-800 text-primary">
            <option value="revenue">Sort: Revenue</option>
            <option value="unitsSold">Sort: Units sold</option>
            <option value="grossProfit">Sort: Gross profit</option>
            <option value="margin">Sort: Margin %</option>
          </select>
          {rows.length > 0 && (
            <button onClick={() => exportCsv(rows)} className="btn-secondary text-sm px-3 py-1.5">Export CSV</button>
          )}
          <button onClick={() => window.print()} className="text-xs px-2 py-1 border border-border rounded hover:border-gray-400">Print / Save as PDF</button>
        </div>

        {reportData && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="bg-card border border-border rounded-lg p-3">
              <p className="text-xs text-secondary">Total revenue</p>
              <p className="text-2xl font-bold text-primary">{money(reportData.summary.totalRevenue)}</p>
            </div>
            <div className="bg-card border border-border rounded-lg p-3">
              <p className="text-xs text-secondary">Total gross profit</p>
              <p className="text-2xl font-bold text-primary">{money(reportData.summary.totalGrossProfit)}</p>
            </div>
            <div className="bg-card border border-border rounded-lg p-3">
              <p className="text-xs text-secondary">Products with sales</p>
              <p className="text-2xl font-bold text-primary">{reportData.summary.productsWithSales}</p>
            </div>
            <div className="bg-card border border-amber-200 dark:border-amber-900/40 rounded-lg p-3">
              <p className="text-xs text-secondary">No sales in period</p>
              <p className="text-2xl font-bold text-amber-600">{reportData.summary.productsWithNoSales}</p>
            </div>
          </div>
        )}

        {error && <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-sm text-red-700 dark:text-red-300 mb-4">{error}</div>}

        {loading && <div className="text-center py-12 text-secondary">Loading…</div>}

        {!loading && reportData && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-border">
            {/* Mobile card list (MBM-299 responsive-reports template — see
                src/app/inventory/reports/pricing-exceptions/page.tsx) */}
            <div className="sm:hidden divide-y divide-border">
              {pagedRows.length === 0 ? (
                <div className="text-center py-12 text-secondary text-sm">No products match the current filters.</div>
              ) : (
                pagedRows.map(row => (
                  <div key={row.id} className={`p-3 space-y-2 ${!row.pricingDataReliable ? 'bg-amber-50/40 dark:bg-amber-900/10' : ''}`}>
                    <ProductCell
                      imageUrl={row.imageUrl}
                      name={row.productName}
                      subtitle={row.variantName !== 'Default' ? row.variantName : undefined}
                      sku={`${row.sku} · ${row.category}`}
                      businessType={reportData.businessType}
                      editItemId={row.editItemId}
                      canEdit={canEditInventory}
                      returnTo="/inventory/reports/performance"
                    />
                    {!row.pricingDataReliable && <p className="text-xs text-amber-600">⚠ missing cost/sell price — profitability unreliable</p>}
                    <div className="grid grid-cols-2 gap-x-3 gap-y-2 pt-1">
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-secondary">Units Sold</p>
                        <p className="text-secondary">{row.totalUnitsSold}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-secondary">Revenue</p>
                        <p className="text-secondary">{money(row.revenue)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-secondary">COGS</p>
                        <p className="text-secondary">{money(row.costOfGoodsSold)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-secondary">Gross Profit</p>
                        <p className={row.grossProfit !== null && row.grossProfit < 0 ? 'text-red-600 font-semibold' : 'text-secondary'}>{money(row.grossProfit)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-secondary">Margin</p>
                        <p className="text-secondary">{row.grossMarginPct !== null ? `${row.grossMarginPct.toFixed(1)}%` : '—'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-secondary">Transactions</p>
                        <p className="text-secondary">{row.transactionCount}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-secondary">Stock</p>
                        <p className="text-secondary">{row.currentStock}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-secondary">Days Since Sale</p>
                        <p className="text-secondary">{row.daysSinceLastSale ?? '—'}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="hidden sm:block overflow-x-auto">
              {pagedRows.length === 0 ? (
                <div className="text-center py-12 text-secondary text-sm">No products match the current filters.</div>
              ) : (
                <table className="w-full text-sm border-separate border-spacing-0">
                  <thead>
                    <tr className="text-xs text-secondary uppercase tracking-wide">
                      <th className="bg-gray-50 dark:bg-gray-800 px-3 py-2.5 text-left">Product</th>
                      <th className="bg-gray-50 dark:bg-gray-800 px-3 py-2.5 text-right">Units Sold</th>
                      <th className="bg-gray-50 dark:bg-gray-800 px-3 py-2.5 text-right">Revenue</th>
                      <th className="bg-gray-50 dark:bg-gray-800 px-3 py-2.5 text-right">COGS</th>
                      <th className="bg-gray-50 dark:bg-gray-800 px-3 py-2.5 text-right">Gross Profit</th>
                      <th className="bg-gray-50 dark:bg-gray-800 px-3 py-2.5 text-right">Margin</th>
                      <th className="bg-gray-50 dark:bg-gray-800 px-3 py-2.5 text-right">Transactions</th>
                      <th className="bg-gray-50 dark:bg-gray-800 px-3 py-2.5 text-right">Stock</th>
                      <th className="bg-gray-50 dark:bg-gray-800 px-3 py-2.5 text-right">Days Since Sale</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {pagedRows.map(row => (
                      <tr key={row.id} className={!row.pricingDataReliable ? 'bg-amber-50/40 dark:bg-amber-900/10' : 'bg-white dark:bg-gray-800'}>
                        <td className="px-3 py-2.5">
                          <ProductCell
                            imageUrl={row.imageUrl}
                            name={row.productName}
                            subtitle={row.variantName !== 'Default' ? row.variantName : undefined}
                            sku={`${row.sku} · ${row.category}`}
                            businessType={reportData.businessType}
                            editItemId={row.editItemId}
                            canEdit={canEditInventory}
                            returnTo="/inventory/reports/performance"
                          />
                          {!row.pricingDataReliable && <p className="text-xs text-amber-600 mt-0.5">⚠ missing cost/sell price — profitability unreliable</p>}
                        </td>
                        <td className="px-3 py-2.5 text-right text-secondary">{row.totalUnitsSold}</td>
                        <td className="px-3 py-2.5 text-right text-secondary">{money(row.revenue)}</td>
                        <td className="px-3 py-2.5 text-right text-secondary">{money(row.costOfGoodsSold)}</td>
                        <td className="px-3 py-2.5 text-right">
                          <span className={row.grossProfit !== null && row.grossProfit < 0 ? 'text-red-600 font-semibold' : 'text-secondary'}>{money(row.grossProfit)}</span>
                        </td>
                        <td className="px-3 py-2.5 text-right text-secondary">{row.grossMarginPct !== null ? `${row.grossMarginPct.toFixed(1)}%` : '—'}</td>
                        <td className="px-3 py-2.5 text-right text-secondary">{row.transactionCount}</td>
                        <td className="px-3 py-2.5 text-right text-secondary">{row.currentStock}</td>
                        <td className="px-3 py-2.5 text-right text-secondary">{row.daysSinceLastSale ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="px-4 py-3 border-t border-border flex-shrink-0 no-print">
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                totalItems={rows.length}
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
