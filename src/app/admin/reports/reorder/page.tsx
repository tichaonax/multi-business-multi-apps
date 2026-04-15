'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback, useRef } from 'react'
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
  lastOrderQty: number
  maxOrderQty: number
  lastOrderedAt: string | null
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

function MinLevelCell({
  row,
  businessId,
  onUpdated,
}: {
  row: ReorderRow
  businessId: string
  onUpdated: (variantId: string, newLevel: number) => void
}) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(String(row.reorderLevel))
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!editing) setValue(String(row.reorderLevel))
  }, [row.reorderLevel, editing])

  useEffect(() => {
    if (editing) inputRef.current?.select()
  }, [editing])

  async function save() {
    const parsed = parseInt(value, 10)
    if (isNaN(parsed) || parsed < 0 || parsed === row.reorderLevel) {
      setEditing(false)
      setValue(String(row.reorderLevel))
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`/api/inventory/${businessId}/barcode-items/${row.variantId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reorderLevel: parsed }),
      })
      if (res.ok) {
        onUpdated(row.variantId, parsed)
      } else {
        setValue(String(row.reorderLevel))
      }
    } finally {
      setSaving(false)
      setEditing(false)
    }
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="number"
        min={0}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') save()
          if (e.key === 'Escape') { setEditing(false); setValue(String(row.reorderLevel)) }
        }}
        onBlur={save}
        className="w-14 text-xs text-right border border-blue-400 rounded px-1 py-0.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
        disabled={saving}
      />
    )
  }

  return (
    <button
      onClick={() => setEditing(true)}
      title="Click to edit minimum level"
      className="text-xs text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline cursor-pointer transition-colors"
    >
      min {row.reorderLevel}
    </button>
  )
}

function exportCsv(rows: ReorderRow[]) {
  const header = 'Product,Variant,SKU,Category,Current Stock,Min Level,Reorder Qty,Basis,90d Avg/Day,90d Sold,Days Left,Urgency,Last Order,Max Order,Est. Cost'
  const lines = rows.map((r) =>
    [
      `"${r.productName}"`,
      `"${r.variantName}"`,
      `"${r.sku}"`,
      `"${r.category}"`,
      r.currentStock,
      r.reorderLevel,
      r.suggestedReorderQty,
      r.suggestionBasis,
      r.historicalAvgDailySales,
      r.historicalUnitsSold,
      r.daysOfStockLeft,
      r.urgency,
      r.lastOrderQty,
      r.maxOrderQty,
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
  const [search, setSearch] = useState('')

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

  function handleMinLevelUpdated(variantId: string, newLevel: number) {
    setReportData((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        data: prev.data.map((r) =>
          r.variantId === variantId ? { ...r, reorderLevel: newLevel } : r
        ),
      }
    })
  }

  const rows = (reportData?.data ?? []).filter((r) => {
    if (urgencyFilter !== 'all' && r.urgency !== urgencyFilter) return false
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      r.productName.toLowerCase().includes(q) ||
      r.category.toLowerCase().includes(q) ||
      r.sku.toLowerCase().includes(q)
    )
  })

  return (
    <div className="flex flex-col bg-gray-50 dark:bg-gray-900" style={{ height: 'calc(100vh - 64px)' }}>
      {/* ── Fixed top section ── */}
      <div className="flex-shrink-0 p-4 md:p-6 pb-0">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-2 text-xs text-secondary mb-1">
              <Link href="/admin/reports" className="hover:underline">Reports</Link>
              <span>/</span>
              <span>Reorder Report</span>
            </div>
            <h1 className="text-xl font-bold text-primary">Reorder Report</h1>
            <p className="text-sm text-secondary mt-0.5">
              Quantities based on 90-day historical sales. Click <span className="text-blue-500">min N</span> to edit minimum level.
              Click a product name to view its inventory.
            </p>
          </div>
        </div>

        {/* Date range + urgency filter */}
        <div className="flex flex-wrap items-end gap-3 mb-4">
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
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

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-sm text-red-700 dark:text-red-300 mb-4">
            {error}
          </div>
        )}
      </div>

      {/* ── Scrollable table section ── */}
      <div className="flex-1 overflow-hidden px-4 md:px-6 pb-4">
        {loading && <div className="text-center py-12 text-secondary">Loading…</div>}

        {!loading && reportData && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-border flex flex-col h-full">
            {/* Table toolbar: search + export */}
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border flex-shrink-0">
              <p className="text-sm text-secondary">
                {search ? `${rows.length} of ${reportData.data.length} items` : `${reportData.data.length} items`}
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="search"
                  placeholder="Search by name, SKU, category…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="px-3 py-1.5 text-sm border border-border rounded-lg bg-white dark:bg-gray-700 text-primary w-52 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {reportData.data.length > 0 && (
                  <button
                    onClick={() => exportCsv(rows)}
                    className="btn-secondary text-sm px-3 py-1.5 whitespace-nowrap"
                  >
                    Export CSV
                  </button>
                )}
              </div>
            </div>

            {/* Scrollable table */}
            <div className="overflow-auto flex-1">
              {rows.length === 0 ? (
                <div className="text-center py-12 text-secondary text-sm">
                  {search
                    ? `No items match "${search}".`
                    : urgencyFilter === 'all'
                    ? 'No items need reordering for this date range.'
                    : `No ${urgencyFilter} items found.`}
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-800/90 text-xs text-secondary uppercase tracking-wide">
                    <tr>
                      <th className="px-3 py-2.5 text-left">Product</th>
                      <th className="px-3 py-2.5 text-left">Category</th>
                      <th className="px-3 py-2.5 text-right">Stock</th>
                      <th className="px-3 py-2.5 text-right">Order Qty</th>
                      <th className="px-3 py-2.5 text-right">90d Avg/Day</th>
                      <th className="px-3 py-2.5 text-right">90d Sold</th>
                      <th className="px-3 py-2.5 text-right">Days Left</th>
                      <th className="px-3 py-2.5 text-right">Last Order</th>
                      <th className="px-3 py-2.5 text-right">Max Order</th>
                      <th className="px-3 py-2.5 text-right">Est. Cost</th>
                      <th className="px-3 py-2.5 text-center">Urgency</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {rows.map((row) => (
                      <tr
                        key={row.variantId}
                        className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                          row.urgency === 'critical' ? 'bg-red-50/40 dark:bg-red-900/10' : 'bg-white dark:bg-gray-800'
                        }`}
                      >
                        <td className="px-3 py-2.5">
                          <Link
                            href="/admin/inventory"
                            className="font-medium text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            {row.productName}
                          </Link>
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
                          {currentBusinessId && (
                            <div>
                              <MinLevelCell row={row} businessId={currentBusinessId} onUpdated={handleMinLevelUpdated} />
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <span className="font-semibold text-primary">{row.suggestedReorderQty}</span>
                          <p className="text-xs text-gray-400">
                            {row.suggestionBasis === 'historical' ? '90d history' : row.suggestionBasis === 'recent' ? 'recent sales' : 'reorder level'}
                          </p>
                        </td>
                        <td className="px-3 py-2.5 text-right text-secondary">
                          {row.historicalAvgDailySales > 0 ? row.historicalAvgDailySales.toFixed(2) : '—'}
                        </td>
                        <td className="px-3 py-2.5 text-right text-secondary">
                          {row.historicalUnitsSold > 0 ? row.historicalUnitsSold : '—'}
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <span className={
                            row.daysOfStockLeft === 0 ? 'text-red-600 font-bold'
                            : row.daysOfStockLeft < 3 ? 'text-red-500 font-semibold'
                            : row.daysOfStockLeft < 7 ? 'text-amber-500 font-semibold'
                            : 'text-secondary'
                          }>
                            {row.currentStock === 0 ? 'Out' : row.daysOfStockLeft > 0 ? `${row.daysOfStockLeft}d` : '—'}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-right text-secondary">
                          {row.lastOrderQty > 0 ? (
                            <div>
                              <div>{row.lastOrderQty}</div>
                              {row.lastOrderedAt && (
                                <div className="text-xs text-gray-400">
                                  {new Date(row.lastOrderedAt).toLocaleDateString()}
                                </div>
                              )}
                            </div>
                          ) : '—'}
                        </td>
                        <td className="px-3 py-2.5 text-right text-secondary">
                          {row.maxOrderQty > 0 ? row.maxOrderQty : '—'}
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
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
