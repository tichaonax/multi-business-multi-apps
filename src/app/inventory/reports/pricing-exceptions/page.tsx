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
import { BulkQuantityCorrectionModal } from '@/components/inventory/bulk-quantity-correction-modal'
import { UniversalInventoryForm } from '@/components/universal/inventory'
import '@/styles/print-report.css'

interface ExceptionFlag {
  type: string
  severity: 'INFO' | 'WARNING' | 'CRITICAL'
  reason: string
  suggestedAction: string
}

interface ReviewState {
  exceptionType: string
  status: 'OPEN' | 'REVIEWED' | 'CORRECTED' | 'APPROVED' | 'IGNORED' | 'FOLLOW_UP'
  reason: string | null
  notes: string | null
  expiresAt: string | null
}

interface ExceptionRow {
  id: string
  catalogSource: 'BUSINESS_PRODUCT' | 'PRODUCT_VARIANT' | 'BARCODE_ITEM'
  productId: string
  name: string
  imageUrl: string | null
  editItemId: string
  sku: string | null
  barcode: string | null
  category: string | null
  brand: string | null
  supplier: string | null
  location: string | null
  unitOfMeasure: string | null
  quantityOnHand: number
  quantitySoldInPeriod: number
  lastStockedDate: string
  lastSoldDate: string | null
  costPrice: number | null
  sellingPrice: number | null
  previousCostPrice: number | null
  previousSellingPrice: number | null
  unitsPerPack: number | null
  bulkPackCost: number | null
  hasBulkCostOnFile: boolean
  unitProfitLoss: number | null
  totalPotentialProfitLoss: number | null
  actualLossFromSalesInPeriod: number
  grossMarginPct: number | null
  posAvailabilityStatus: 'AVAILABLE' | 'HIDDEN_NO_PRICE' | 'VISIBLE_AT_ZERO_PRICE' | 'INACTIVE'
  flags: ExceptionFlag[]
  severity: 'INFO' | 'WARNING' | 'CRITICAL' | null
  reviewStates: ReviewState[]
}

interface ReportData {
  businessType: string | null
  summary: { totalExceptions: number; criticalCount: number; warningCount: number; infoCount: number; totalPotentialLoss: number }
  pagination: { page: number; limit: number; total: number; totalPages: number }
  data: ExceptionRow[]
}

const fmt = (n: number | null) => (n != null ? `$${n.toFixed(2)}` : '—')

function getDefaultDateRange(): DateRange {
  const end = new Date()
  const start = new Date()
  start.setDate(end.getDate() - 30)
  return { start, end }
}

const SEVERITY_STYLE: Record<string, string> = {
  CRITICAL: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  WARNING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  INFO: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
}

const POS_STATUS_LABEL: Record<string, string> = {
  AVAILABLE: 'Available',
  HIDDEN_NO_PRICE: 'Hidden (no price)',
  VISIBLE_AT_ZERO_PRICE: 'Visible at $0',
  INACTIVE: 'Inactive',
}

function ReviewAction({ businessId, row, flag, onSaved }: { businessId: string; row: ExceptionRow; flag: ExceptionFlag; onSaved: (state: ReviewState) => void }) {
  const current = row.reviewStates.find(s => s.exceptionType === flag.type)
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState(current?.status ?? 'OPEN')
  const [reason, setReason] = useState(current?.reason ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/inventory/exception-reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          catalogSource: row.catalogSource,
          productRefId: row.catalogSource === 'PRODUCT_VARIANT' ? row.id : row.productId,
          exceptionType: flag.type,
          status,
          reason: reason.trim() || null,
        }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        setError(json.error ?? 'Failed to save')
        return
      }
      onSaved({ exceptionType: flag.type, status, reason: reason.trim() || null, notes: null, expiresAt: null })
      setOpen(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setOpen(o => !o)}
        className={`text-xs px-1.5 py-0.5 rounded border ${current && current.status !== 'OPEN' ? 'border-green-400 text-green-700 dark:text-green-400' : 'border-border text-secondary hover:border-gray-400'}`}
      >
        {current?.status ?? 'OPEN'}
      </button>
      {open && (
        <div className="absolute z-20 top-full right-0 mt-1 w-64 bg-white dark:bg-gray-800 border border-border rounded-lg shadow-xl p-3 space-y-2">
          <select
            value={status}
            onChange={e => setStatus(e.target.value as ReviewState['status'])}
            className="w-full text-xs border border-border rounded px-2 py-1 bg-white dark:bg-gray-700 text-primary"
          >
            {(['OPEN', 'REVIEWED', 'CORRECTED', 'APPROVED', 'IGNORED', 'FOLLOW_UP'] as const).map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder={status === 'APPROVED' && flag.type === 'BELOW_COST' ? 'Reason required to approve a below-cost sale' : 'Reason / notes (optional)'}
            className="w-full text-xs border border-border rounded px-2 py-1 bg-white dark:bg-gray-700 text-primary"
            rows={2}
          />
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <button onClick={() => setOpen(false)} className="text-xs px-2 py-1 text-secondary">Cancel</button>
            <button onClick={save} disabled={saving} className="text-xs px-2 py-1 bg-blue-600 text-white rounded disabled:opacity-50">
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function PricingExceptionsReportPage() {
  const { currentBusinessId, hasPermission, isSystemAdmin } = useBusinessPermissionsContext()
  const canEditInventory = isSystemAdmin || hasPermission('canManageInventory')
  const [dateRange, setDateRange] = useState<DateRange>(getDefaultDateRange())
  const [search, setSearch] = useState('')
  const [severityFilter, setSeverityFilter] = useState<'ALL' | 'CRITICAL' | 'WARNING' | 'INFO'>('ALL')
  const [posStatusFilter, setPosStatusFilter] = useState('')
  const [profitabilityFilter, setProfitabilityFilter] = useState('')
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Bulk Cost Allocation Issue "Fix" flow (MBM-297) — activeRow is whichever
  // row's cost is being corrected; showQuickModal/showFullEditor track which
  // of the two screens is currently on top. cameFromQuickModal records
  // whether the full editor was reached by escalating out of the quick
  // modal, so closing it knows whether to return there or just close.
  const [activeRow, setActiveRow] = useState<ExceptionRow | null>(null)
  const [showQuickModal, setShowQuickModal] = useState(false)
  const [showFullEditor, setShowFullEditor] = useState(false)
  const [fullEditorItem, setFullEditorItem] = useState<any | null>(null)
  const [fullEditorLoading, setFullEditorLoading] = useState(false)
  const [cameFromQuickModal, setCameFromQuickModal] = useState(false)
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
      if (posStatusFilter) params.set('posAvailabilityStatus', posStatusFilter)
      if (profitabilityFilter) params.set('profitabilityStatus', profitabilityFilter)
      const res = await fetch(`/api/universal/reports/pricing-exceptions?${params}`)
      const json = await res.json()
      if (json.success) setReportData(json)
      else setError(json.error ?? 'Failed to load report')
    } catch {
      setError('Failed to load report')
    } finally {
      setLoading(false)
    }
  }, [currentBusinessId, dateRange, search, posStatusFilter, profitabilityFilter, page, pageSize])

  useEffect(() => { loadReport() }, [loadReport])
  useEffect(() => { setPage(1) }, [search, severityFilter, posStatusFilter, profitabilityFilter, pageSize])

  function handleReviewSaved(rowId: string, state: ReviewState) {
    setReportData(prev => {
      if (!prev) return prev
      return {
        ...prev,
        data: prev.data.map(r => r.id === rowId
          ? { ...r, reviewStates: [...r.reviewStates.filter(s => s.exceptionType !== state.exceptionType), state] }
          : r),
      }
    })
  }

  const rows = (reportData?.data ?? []).filter(r => severityFilter === 'ALL' || r.severity === severityFilter)

  function handleFixClick(row: ExceptionRow) {
    // Always open the small modal first — even when there's no bulk cost on
    // file yet, the modal itself explains that and offers "Open Full Item
    // Editor" as the user's own next step, rather than the page deciding to
    // skip straight to the heavier full editor on their behalf.
    setActiveRow(row)
    setShowQuickModal(true)
  }

  async function openFullEditor(row: ExceptionRow) {
    setCameFromQuickModal(showQuickModal)
    setShowQuickModal(false)
    setFullEditorLoading(true)
    try {
      const res = await fetch(`/api/inventory/${currentBusinessId}/items/${row.editItemId}`)
      const data = await res.json()
      if (data.success) {
        setFullEditorItem(data.data)
        setShowFullEditor(true)
      } else {
        setError(data.error ?? 'Failed to load item for editing')
      }
    } catch {
      setError('Failed to load item for editing')
    } finally {
      setFullEditorLoading(false)
    }
  }

  function closeFullEditor() {
    setShowFullEditor(false)
    setFullEditorItem(null)
    if (cameFromQuickModal) setShowQuickModal(true)
  }

  async function handleFullEditorSubmit(formData: any) {
    if (!activeRow || !currentBusinessId) return
    try {
      const res = await fetch(`/api/inventory/${currentBusinessId}/items/${activeRow.editItemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error ?? 'Failed to save changes')
        return
      }
      closeFullEditor()
      loadReport()
    } catch {
      setError('Failed to save changes')
    }
  }

  function closeQuickModal() {
    setShowQuickModal(false)
    setActiveRow(null)
  }

  function handleCorrectionSaved(result: { unitsPerPack: number; costPrice: number | null }) {
    // Patch the row in place instead of re-fetching the whole report: a
    // re-fetch re-runs the exception rules server-side, and a
    // now-corrected row can legitimately no longer qualify as an exception
    // — silently dropping it out of the list right after the user fixed it
    // reads as "did that even work?" Keep it visible with the corrected
    // numbers; a manual refresh is what re-applies the exception filter.
    const correctedId = activeRow?.id
    if (correctedId) {
      setReportData(prev => {
        if (!prev) return prev
        return {
          ...prev,
          data: prev.data.map(r => {
            if (r.id !== correctedId) return r
            const newCost: number | null = result.costPrice ?? r.costPrice
            const newUnitProfitLoss = newCost !== null && r.sellingPrice !== null ? r.sellingPrice - newCost : r.unitProfitLoss
            const divisor = Math.max(r.quantityOnHand, r.quantitySoldInPeriod)
            const newTotalPL = newUnitProfitLoss !== null ? newUnitProfitLoss * divisor : r.totalPotentialProfitLoss
            const newMarginPct = newCost !== null && r.sellingPrice !== null && r.sellingPrice > 0
              ? ((r.sellingPrice - newCost) / r.sellingPrice) * 100
              : r.grossMarginPct
            return {
              ...r,
              unitsPerPack: result.unitsPerPack,
              costPrice: newCost,
              unitProfitLoss: newUnitProfitLoss,
              totalPotentialProfitLoss: newTotalPL,
              grossMarginPct: newMarginPct,
              // The specific issue just fixed no longer applies — other
              // flags (if any still apply with the new numbers) are left
              // as-is until the next real refresh recomputes them properly.
              flags: r.flags.filter(f => f.type !== 'BULK_COST_ALLOCATION_ISSUE'),
            }
          }),
        }
      })
    }
    setShowQuickModal(false)
    setActiveRow(null)
  }

  function exportCsv() {
    const header = 'Product,SKU,Category,Supplier,Qty on Hand,Qty Sold,Cost,Sell,Margin %,Potential P/L,POS Status,Exceptions'
    const lines = rows.map(r => [
      `"${r.name}"`, `"${r.sku ?? ''}"`, `"${r.category ?? ''}"`, `"${r.supplier ?? ''}"`,
      r.quantityOnHand, r.quantitySoldInPeriod, r.costPrice ?? '', r.sellingPrice ?? '',
      r.grossMarginPct != null ? r.grossMarginPct.toFixed(1) : '', r.totalPotentialProfitLoss ?? '',
      r.posAvailabilityStatus, `"${r.flags.map(f => f.type).join('; ')}"`,
    ].join(','))
    const blob = new Blob([[header, ...lines].join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `pricing-exceptions-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="report-print-container bg-gray-50 dark:bg-gray-900">
      <div className="p-4 md:p-6 pb-0">
        <div className="flex items-center gap-2 text-xs text-secondary mb-1">
          <Link href="/inventory" className="hover:underline">Inventory</Link>
          <span>/</span>
          <Link href="/inventory/reports" className="hover:underline">Reports</Link>
          <span>/</span>
          <span>Pricing, Cost &amp; Value Exceptions</span>
        </div>
        <h1 className="text-xl font-bold text-primary">Pricing, Cost &amp; Value Exceptions</h1>
        <p className="text-sm text-secondary mt-0.5">
          Products with missing, invalid, below-cost, or suspicious pricing/cost data. Sales window below only affects &quot;qty sold&quot; and &quot;last sold&quot; columns — pricing exceptions themselves reflect current data regardless of date range.
        </p>
      </div>

      {/* Sticky under the global nav while scrolling — the same proven
          pattern as Receipt History's search bar, instead of the
          fixed-viewport-height + internal-scroll layout this page used to
          use (which repeatedly ended up clipped under the nav). */}
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
          <select value={severityFilter} onChange={e => setSeverityFilter(e.target.value as any)} className="px-3 py-1.5 text-sm border border-border rounded-lg bg-white dark:bg-gray-800 text-primary">
            <option value="ALL">All severities</option>
            <option value="CRITICAL">Critical only</option>
            <option value="WARNING">Warning only</option>
            <option value="INFO">Info only</option>
          </select>
          <select value={posStatusFilter} onChange={e => setPosStatusFilter(e.target.value)} className="px-3 py-1.5 text-sm border border-border rounded-lg bg-white dark:bg-gray-800 text-primary">
            <option value="">All POS statuses</option>
            <option value="HIDDEN_NO_PRICE">Hidden from POS (no price)</option>
            <option value="VISIBLE_AT_ZERO_PRICE">Visible at $0</option>
            <option value="AVAILABLE">Available</option>
          </select>
          <select value={profitabilityFilter} onChange={e => setProfitabilityFilter(e.target.value)} className="px-3 py-1.5 text-sm border border-border rounded-lg bg-white dark:bg-gray-800 text-primary">
            <option value="">All profitability</option>
            <option value="LOSS">Loss-making</option>
            <option value="ZERO_MARGIN">Zero margin</option>
            <option value="LOW_MARGIN">Low margin</option>
            <option value="HEALTHY">Healthy margin</option>
          </select>
        </div>

        {reportData && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="bg-card border border-border rounded-lg p-3">
              <p className="text-xs text-secondary">Total exceptions</p>
              <p className="text-2xl font-bold text-primary">{reportData.summary.totalExceptions}</p>
            </div>
            <div className="bg-card border border-red-200 dark:border-red-900/40 rounded-lg p-3">
              <p className="text-xs text-secondary">Critical</p>
              <p className="text-2xl font-bold text-red-600">{reportData.summary.criticalCount}</p>
            </div>
            <div className="bg-card border border-amber-200 dark:border-amber-900/40 rounded-lg p-3">
              <p className="text-xs text-secondary">Warning</p>
              <p className="text-2xl font-bold text-amber-600">{reportData.summary.warningCount}</p>
            </div>
            <div className="bg-card border border-border rounded-lg p-3">
              <p className="text-xs text-secondary">Total potential loss</p>
              <p className="text-2xl font-bold text-primary">${reportData.summary.totalPotentialLoss.toFixed(2)}</p>
            </div>
          </div>
        )}

        {error && <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-sm text-red-700 dark:text-red-300 mb-4">{error}</div>}

        {loading && <div className="text-center py-12 text-secondary">Loading…</div>}

        {!loading && reportData && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-border">
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border">
              <p className="text-sm text-secondary">{reportData.pagination.total} exceptions · page {reportData.pagination.page} of {Math.max(1, reportData.pagination.totalPages)}</p>
              <div className="flex items-center gap-2 no-print">
                <button onClick={exportCsv} className="text-xs px-2 py-1 border border-border rounded hover:border-gray-400">Export CSV</button>
                <button onClick={() => window.print()} className="text-xs px-2 py-1 border border-border rounded hover:border-gray-400">Print / Save as PDF</button>
              </div>
            </div>

            <div className="overflow-x-auto">
              {rows.length === 0 ? (
                <div className="text-center py-12 text-secondary text-sm">No exceptions match the current filters.</div>
              ) : (
                <table className="w-full text-sm border-separate border-spacing-0">
                  <thead>
                    <tr className="text-xs text-secondary uppercase tracking-wide">
                      <th className="bg-gray-50 dark:bg-gray-800 px-3 py-2.5 text-left">Product</th>
                      <th className="bg-gray-50 dark:bg-gray-800 px-3 py-2.5 text-left">Category / Supplier</th>
                      <th className="bg-gray-50 dark:bg-gray-800 px-3 py-2.5 text-right">Qty on Hand</th>
                      <th className="bg-gray-50 dark:bg-gray-800 px-3 py-2.5 text-right">Qty Sold</th>
                      <th className="bg-gray-50 dark:bg-gray-800 px-3 py-2.5 text-right">Cost</th>
                      <th className="bg-gray-50 dark:bg-gray-800 px-3 py-2.5 text-right">Sell</th>
                      <th className="bg-gray-50 dark:bg-gray-800 px-3 py-2.5 text-right">Margin</th>
                      <th className="bg-gray-50 dark:bg-gray-800 px-3 py-2.5 text-right">Potential P/L</th>
                      <th className="bg-gray-50 dark:bg-gray-800 px-3 py-2.5 text-left">POS Status</th>
                      <th className="bg-gray-50 dark:bg-gray-800 px-3 py-2.5 text-left">Exceptions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {rows.map(row => (
                      <tr key={row.id} className={row.severity === 'CRITICAL' ? 'bg-red-50/40 dark:bg-red-900/10' : 'bg-white dark:bg-gray-800'}>
                        <td className="px-3 py-2.5">
                          <ProductCell
                            imageUrl={row.imageUrl}
                            name={row.name}
                            sku={row.sku}
                            businessType={reportData.businessType}
                            editItemId={row.editItemId}
                            canEdit={canEditInventory}
                            returnTo="/inventory/reports/pricing-exceptions"
                          />
                        </td>
                        <td className="px-3 py-2.5 text-secondary">
                          <p>{row.category ?? '—'}{row.unitOfMeasure && <span className="text-gray-400"> · {row.unitOfMeasure}</span>}</p>
                          {row.supplier && <p className="text-xs text-gray-400">{row.supplier}</p>}
                        </td>
                        <td className="px-3 py-2.5 text-right text-secondary">{row.quantityOnHand}</td>
                        <td className="px-3 py-2.5 text-right text-secondary">{row.quantitySoldInPeriod}</td>
                        <td className="px-3 py-2.5 text-right text-secondary">
                          {fmt(row.costPrice)}
                          {row.previousCostPrice != null && <p className="text-xs text-gray-400">was {fmt(row.previousCostPrice)}</p>}
                          {row.hasBulkCostOnFile && (
                            <p className="text-xs text-gray-400">Pack: {row.unitsPerPack ?? '?'} × {fmt(row.bulkPackCost)}</p>
                          )}
                          {row.flags.some(f => f.type === 'BULK_COST_ALLOCATION_ISSUE') && (
                            <button
                              onClick={() => handleFixClick(row)}
                              className="block text-xs text-amber-600 dark:text-amber-400 hover:underline mt-0.5 whitespace-nowrap"
                              title="Possible bulk cost error"
                            >
                              ⚠ Possible bulk cost error — Fix
                            </button>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-right text-secondary">
                          {fmt(row.sellingPrice)}
                          {row.previousSellingPrice != null && <p className="text-xs text-gray-400">was {fmt(row.previousSellingPrice)}</p>}
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <span className={row.grossMarginPct !== null && row.grossMarginPct < 0 ? 'text-red-600 font-semibold' : 'text-secondary'}>
                            {row.grossMarginPct !== null ? `${row.grossMarginPct.toFixed(1)}%` : '—'}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <span className={row.totalPotentialProfitLoss !== null && row.totalPotentialProfitLoss < 0 ? 'text-red-600 font-semibold' : 'text-secondary'}>
                            {fmt(row.totalPotentialProfitLoss)}
                          </span>
                          {row.actualLossFromSalesInPeriod > 0 && (
                            <p className="text-xs text-red-500" title="Actual loss from sales in the selected period (uses today's cost price, not the cost at the time of each sale)">
                              actual: -{fmt(row.actualLossFromSalesInPeriod)}
                            </p>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          <span className={`text-xs px-1.5 py-0.5 rounded ${row.posAvailabilityStatus === 'AVAILABLE' ? 'text-secondary' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'}`}>
                            {POS_STATUS_LABEL[row.posAvailabilityStatus]}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex flex-col gap-1.5 max-w-xs">
                            {row.flags.map(flag => (
                              <div key={flag.type} className="flex items-center gap-1.5 flex-wrap">
                                <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${SEVERITY_STYLE[flag.severity]}`} title={flag.reason}>
                                  {flag.type.replace(/_/g, ' ')}
                                </span>
                                <ReviewAction businessId={currentBusinessId!} row={row} flag={flag} onSaved={s => handleReviewSaved(row.id, s)} />
                              </div>
                            ))}
                          </div>
                        </td>
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

      {showQuickModal && activeRow && currentBusinessId && (
        <BulkQuantityCorrectionModal
          businessId={currentBusinessId}
          itemId={activeRow.editItemId}
          row={{
            name: activeRow.name,
            sku: activeRow.sku,
            barcode: activeRow.barcode,
            quantityOnHand: activeRow.quantityOnHand,
            unitsPerPack: activeRow.unitsPerPack,
            costPrice: activeRow.costPrice,
            bulkPackCost: activeRow.bulkPackCost,
            sellingPrice: activeRow.sellingPrice,
          }}
          canEditCost={canEditInventory}
          onClose={closeQuickModal}
          onSaved={handleCorrectionSaved}
          onOpenFullEditor={() => activeRow && openFullEditor(activeRow)}
        />
      )}

      {showFullEditor && fullEditorItem && currentBusinessId && (
        <UniversalInventoryForm
          businessId={currentBusinessId}
          businessType={reportData?.businessType ?? 'grocery'}
          item={fullEditorItem}
          mode="edit"
          renderMode="modal"
          onSubmit={handleFullEditorSubmit}
          onCancel={closeFullEditor}
        />
      )}
    </div>
  )
}
