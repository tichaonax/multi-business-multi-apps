'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { DateRangeSelector, DateRange } from '@/components/reports/date-range-selector'
import { getLocalDateString } from '@/lib/utils'

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
  sku: string | null
  category: string | null
  brand: string | null
  supplier: string | null
  location: string | null
  quantityOnHand: number
  quantitySoldInPeriod: number
  lastStockedDate: string
  lastSoldDate: string | null
  costPrice: number | null
  sellingPrice: number | null
  previousCostPrice: number | null
  previousSellingPrice: number | null
  unitProfitLoss: number | null
  totalPotentialProfitLoss: number | null
  grossMarginPct: number | null
  posAvailabilityStatus: 'AVAILABLE' | 'HIDDEN_NO_PRICE' | 'VISIBLE_AT_ZERO_PRICE' | 'INACTIVE'
  flags: ExceptionFlag[]
  severity: 'INFO' | 'WARNING' | 'CRITICAL' | null
  reviewStates: ReviewState[]
}

interface ReportData {
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
  const { currentBusinessId } = useBusinessPermissionsContext()
  const [dateRange, setDateRange] = useState<DateRange>(getDefaultDateRange())
  const [search, setSearch] = useState('')
  const [severityFilter, setSeverityFilter] = useState<'ALL' | 'CRITICAL' | 'WARNING' | 'INFO'>('ALL')
  const [posStatusFilter, setPosStatusFilter] = useState('')
  const [profitabilityFilter, setProfitabilityFilter] = useState('')
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
  }, [currentBusinessId, dateRange, search, posStatusFilter, profitabilityFilter, page])

  useEffect(() => { loadReport() }, [loadReport])

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

  return (
    <div className="flex flex-col bg-gray-50 dark:bg-gray-900" style={{ height: 'calc(100vh - 64px)' }}>
      <div className="flex-shrink-0 p-4 md:p-6 pb-0">
        <div className="flex items-center gap-2 text-xs text-secondary mb-1">
          <Link href="/inventory" className="hover:underline">Inventory</Link>
          <span>/</span>
          <span>Pricing, Cost &amp; Value Exceptions</span>
        </div>
        <h1 className="text-xl font-bold text-primary">Pricing, Cost &amp; Value Exceptions</h1>
        <p className="text-sm text-secondary mt-0.5">
          Products with missing, invalid, below-cost, or suspicious pricing/cost data. Sales window below only affects &quot;qty sold&quot; and &quot;last sold&quot; columns — pricing exceptions themselves reflect current data regardless of date range.
        </p>

        <div className="flex flex-wrap items-end gap-3 my-4">
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
      </div>

      <div className="flex-1 overflow-hidden px-4 md:px-6 pb-4">
        {loading && <div className="text-center py-12 text-secondary">Loading…</div>}

        {!loading && reportData && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-border flex flex-col h-full">
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border flex-shrink-0">
              <p className="text-sm text-secondary">{reportData.pagination.total} exceptions · page {reportData.pagination.page} of {Math.max(1, reportData.pagination.totalPages)}</p>
              <div className="flex items-center gap-2">
                <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="text-xs px-2 py-1 border border-border rounded disabled:opacity-40">← Prev</button>
                <button disabled={page >= reportData.pagination.totalPages} onClick={() => setPage(p => p + 1)} className="text-xs px-2 py-1 border border-border rounded disabled:opacity-40">Next →</button>
              </div>
            </div>

            <div className="overflow-auto flex-1">
              {rows.length === 0 ? (
                <div className="text-center py-12 text-secondary text-sm">No exceptions match the current filters.</div>
              ) : (
                <table className="w-full text-sm border-separate border-spacing-0">
                  <thead>
                    <tr className="text-xs text-secondary uppercase tracking-wide">
                      <th className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-800 px-3 py-2.5 text-left">Product</th>
                      <th className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-800 px-3 py-2.5 text-left">Category / Supplier</th>
                      <th className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-800 px-3 py-2.5 text-right">Qty on Hand</th>
                      <th className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-800 px-3 py-2.5 text-right">Qty Sold</th>
                      <th className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-800 px-3 py-2.5 text-right">Cost</th>
                      <th className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-800 px-3 py-2.5 text-right">Sell</th>
                      <th className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-800 px-3 py-2.5 text-right">Margin</th>
                      <th className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-800 px-3 py-2.5 text-right">Potential P/L</th>
                      <th className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-800 px-3 py-2.5 text-left">POS Status</th>
                      <th className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-800 px-3 py-2.5 text-left">Exceptions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {rows.map(row => (
                      <tr key={row.id} className={row.severity === 'CRITICAL' ? 'bg-red-50/40 dark:bg-red-900/10' : 'bg-white dark:bg-gray-800'}>
                        <td className="px-3 py-2.5">
                          <p className="font-medium text-primary">{row.name}</p>
                          {row.sku && <p className="text-xs text-gray-400">{row.sku}</p>}
                        </td>
                        <td className="px-3 py-2.5 text-secondary">
                          <p>{row.category ?? '—'}</p>
                          {row.supplier && <p className="text-xs text-gray-400">{row.supplier}</p>}
                        </td>
                        <td className="px-3 py-2.5 text-right text-secondary">{row.quantityOnHand}</td>
                        <td className="px-3 py-2.5 text-right text-secondary">{row.quantitySoldInPeriod}</td>
                        <td className="px-3 py-2.5 text-right text-secondary">
                          {fmt(row.costPrice)}
                          {row.previousCostPrice != null && <p className="text-xs text-gray-400">was {fmt(row.previousCostPrice)}</p>}
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
          </div>
        )}
      </div>
    </div>
  )
}
