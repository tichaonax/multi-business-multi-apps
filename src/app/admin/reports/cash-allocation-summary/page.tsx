'use client'

export const dynamic = 'force-dynamic'

import { useState, useCallback } from 'react'
import { ContentLayout } from '@/components/layout/content-layout'

type Range = 'today' | 'yesterday' | '7days' | '30days' | 'custom'

interface LineItemRow {
  id: string
  accountName: string
  sourceType: string
  reportedAmount: number | string
  actualAmount: number | string | null
  isChecked: boolean
}

interface SummaryRow {
  reportId: string | null
  businessId: string
  businessName: string
  businessType: string
  date: string
  status: 'DRAFT' | 'IN_PROGRESS' | 'LOCKED' | 'NONE'
  itemCount: number
  checkedCount: number
  totalReported: number | string
  totalActual: number | string | null
  lineItems: LineItemRow[]
}

const RANGE_LABELS: { value: Range; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: '7days', label: 'Last 7 Days' },
  { value: '30days', label: 'Last 30 Days' },
  { value: 'custom', label: 'Custom' },
]

const STATUS_CLASS: Record<string, string> = {
  LOCKED:      'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
  IN_PROGRESS: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
  DRAFT:       'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
  NONE:        'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-300',
}

const fmt = (v: number | string | null | undefined) =>
  v === null || v === undefined ? '—' : `$${Number(v).toFixed(2)}`

export default function CashAllocationSummaryPage() {
  const today = new Date().toISOString().split('T')[0]
  const [range, setRange] = useState<Range>('today')
  const [startDate, setStartDate] = useState(today)
  const [endDate, setEndDate] = useState(today)
  const [rows, setRows] = useState<SummaryRow[]>([])
  const [resultRange, setResultRange] = useState<{ startDate: string; endDate: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    setLoading(true)
    try {
      const params = new URLSearchParams({ range })
      if (range === 'custom') {
        params.set('startDate', startDate)
        params.set('endDate', endDate)
      }
      const res = await fetch(`/api/cash-allocation/summary?${params}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to load')
      setRows(data.rows)
      setResultRange({ startDate: data.startDate, endDate: data.endDate })
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [range, startDate, endDate])

  const totalLocked = rows.filter(r => r.status === 'LOCKED').length
  const totalReported = rows.reduce((s, r) => s + Number(r.totalReported || 0), 0)
  const totalActual = rows.reduce((s, r) => s + (r.totalActual !== null ? Number(r.totalActual) : 0), 0)

  return (
    <ContentLayout
      title="📊 Cash Allocation Summary"
      breadcrumb={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Admin',     href: '/admin' },
        { label: 'Cash Allocation Summary', isActive: true },
      ]}
    >
      <div className="space-y-6">
        {/* Range selector */}
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Date Range</label>
            <div className="flex gap-1">
              {RANGE_LABELS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setRange(opt.value)}
                  className={`px-3 py-1.5 rounded text-sm font-medium transition-colors
                    ${range === opt.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          {range === 'custom' && (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">From</label>
                <input type="date" value={startDate} max={endDate} onChange={e => setStartDate(e.target.value)}
                  className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 text-sm bg-white dark:bg-gray-700 dark:text-gray-100" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">To</label>
                <input type="date" value={endDate} min={startDate} max={today} onChange={e => setEndDate(e.target.value)}
                  className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 text-sm bg-white dark:bg-gray-700 dark:text-gray-100" />
              </div>
            </>
          )}
          <button
            onClick={load}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Loading…' : 'Load'}
          </button>
        </div>

        {error && (
          <div className="rounded bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 p-3 text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        {resultRange && rows.length > 0 && (
          <>
            {/* Summary totals */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Businesses', value: rows.length.toString() },
                { label: 'Locked', value: `${totalLocked} / ${rows.length}` },
                { label: 'Total Reported', value: fmt(totalReported) },
                { label: 'Total Actual', value: fmt(totalActual) },
              ].map(card => (
                <div key={card.label} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{card.label}</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{card.value}</p>
                </div>
              ))}
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Business</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Date</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Progress</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Reported</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actual</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Details</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                  {rows.map(row => (
                    <>
                      <tr key={row.businessId + row.date}>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                          {row.businessName}
                          <span className="ml-2 text-xs text-gray-400 capitalize">{row.businessType}</span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 font-mono">
                          {row.date}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_CLASS[row.status]}`}>
                            {row.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-gray-600 dark:text-gray-400">
                          {row.status === 'NONE' ? '—' : `${row.checkedCount} / ${row.itemCount}`}
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-mono text-gray-900 dark:text-gray-100">
                          {row.status === 'NONE' ? '—' : fmt(row.totalReported)}
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-mono text-gray-900 dark:text-gray-100">
                          {row.status === 'NONE' ? '—' : fmt(row.totalActual)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {row.status !== 'NONE' && row.lineItems.length > 0 && (
                            <button
                              onClick={() => setExpandedId(id => id === row.reportId ? null : row.reportId)}
                              className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                            >
                              {expandedId === row.reportId ? 'Hide' : 'Show'}
                            </button>
                          )}
                        </td>
                      </tr>
                      {expandedId === row.reportId && row.lineItems.length > 0 && (
                        <tr key={`${row.reportId}-expanded`}>
                          <td colSpan={7} className="px-6 py-3 bg-gray-50 dark:bg-gray-800/50">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="text-xs text-gray-500 dark:text-gray-400 uppercase">
                                  <th className="text-left pb-1">Account</th>
                                  <th className="text-left pb-1">Type</th>
                                  <th className="text-right pb-1">Reported</th>
                                  <th className="text-right pb-1">Actual</th>
                                  <th className="text-center pb-1">✓</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {row.lineItems.map(li => (
                                  <tr key={li.id}>
                                    <td className="py-1 text-gray-800 dark:text-gray-200">{li.accountName}</td>
                                    <td className="py-1 text-gray-500 dark:text-gray-400">
                                      {li.sourceType === 'EOD_RENT_TRANSFER' ? 'Rent' : 'Auto'}
                                    </td>
                                    <td className="py-1 text-right font-mono">{fmt(li.reportedAmount)}</td>
                                    <td className="py-1 text-right font-mono">{fmt(li.actualAmount)}</td>
                                    <td className="py-1 text-center">{li.isChecked ? '✅' : '⬜'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {resultRange && rows.length === 0 && !loading && (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No cash allocation reports found for the selected range ({resultRange.startDate} — {resultRange.endDate}).
          </p>
        )}
      </div>
    </ContentLayout>
  )
}
