'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import Link from 'next/link'
import { formatCurrency } from '@/lib/date-format'

interface DiscrepancyRow {
  date: string
  managerName: string
  signedAt: string
  managerCash: number | null
  managerEcocash: number | null
  spCash: number | null
  spEcocash: number | null
  spSubmittedCount: number
  spPendingCount: number
  cashVariance: number | null
  ecocashVariance: number | null
}

interface SummaryRow {
  periodKey: string
  periodLabel: string
  daysReported: number
  totalCashVariance: number | null
  totalEcocashVariance: number | null
  worstCashVariance: number | null
}

function varianceColor(v: number | null): string {
  if (v === null) return 'text-gray-400 dark:text-gray-500'
  const abs = Math.abs(v)
  if (abs <= 1) return 'text-green-600 dark:text-green-400'
  if (abs <= 10) return 'text-amber-600 dark:text-amber-400'
  return 'text-red-600 dark:text-red-400'
}

function varianceBg(v: number | null): string {
  if (v === null) return ''
  const abs = Math.abs(v)
  if (abs <= 1) return 'bg-green-50 dark:bg-green-900/20'
  if (abs <= 10) return 'bg-amber-50 dark:bg-amber-900/20'
  return 'bg-red-50 dark:bg-red-900/20'
}

function formatVariance(v: number | null): string {
  if (v === null) return '—'
  return `${v > 0 ? '+' : ''}${formatCurrency(v)}`
}

function toInputDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export default function EodDiscrepancyPage() {
  const { currentBusinessId, currentBusiness, hasPermission, isSystemAdmin, currentUser } = useBusinessPermissionsContext()

  const defaultTo = toInputDate(new Date())
  const defaultFrom = toInputDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))

  const [activeTab, setActiveTab] = useState<'daily' | 'summary'>('daily')
  const [summaryGroupBy, setSummaryGroupBy] = useState<'week' | 'month'>('week')

  const [from, setFrom] = useState(defaultFrom)
  const [to, setTo] = useState(defaultTo)

  const [rows, setRows] = useState<DiscrepancyRow[]>([])
  const [summaryRows, setSummaryRows] = useState<SummaryRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canView = isSystemAdmin(currentUser) || hasPermission('canCloseBooks') || hasPermission('canAccessFinancialData')

  const loadDaily = useCallback(async () => {
    if (!currentBusinessId || !canView) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/reports/eod-discrepancy?businessId=${currentBusinessId}&from=${from}&to=${to}&groupBy=day`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load')
      setRows(json.data || [])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [currentBusinessId, from, to, canView])

  const loadSummary = useCallback(async (gb: 'week' | 'month') => {
    if (!currentBusinessId || !canView) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/reports/eod-discrepancy?businessId=${currentBusinessId}&from=${from}&to=${to}&groupBy=${gb}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load')
      setSummaryRows(json.data || [])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [currentBusinessId, from, to, canView])

  useEffect(() => {
    if (!currentBusinessId) return
    if (activeTab === 'daily') loadDaily()
    else loadSummary(summaryGroupBy)
  }, [currentBusinessId, activeTab, summaryGroupBy, loadDaily, loadSummary])

  const handleApply = () => {
    if (activeTab === 'daily') loadDaily()
    else loadSummary(summaryGroupBy)
  }

  const exportCsv = () => {
    if (activeTab === 'daily') {
      if (!rows.length) return
      const headers = ['Date', 'Manager', 'Manager Cash', 'SP Cash Total', 'Cash Variance', 'Manager EcoCash', 'SP EcoCash Total', 'EcoCash Variance', 'SP Submitted', 'SP Pending']
      const lines = rows.map(r => [r.date, r.managerName, r.managerCash ?? '', r.spCash ?? '', r.cashVariance ?? '', r.managerEcocash ?? '', r.spEcocash ?? '', r.ecocashVariance ?? '', r.spSubmittedCount, r.spPendingCount].join(','))
      downloadCsv([headers.join(','), ...lines].join('\n'), `eod-discrepancy-daily-${from}-to-${to}.csv`)
    } else {
      if (!summaryRows.length) return
      const headers = ['Period', 'Days Reported', 'Total Cash Variance', 'Total EcoCash Variance', 'Worst Single-Day Cash Variance']
      const lines = summaryRows.map(r => [r.periodLabel, r.daysReported, r.totalCashVariance ?? '', r.totalEcocashVariance ?? '', r.worstCashVariance ?? ''].join(','))
      downloadCsv([headers.join(','), ...lines].join('\n'), `eod-discrepancy-${summaryGroupBy}-${from}-to-${to}.csv`)
    }
  }

  const downloadCsv = (csv: string, filename: string) => {
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!canView) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 p-6 flex items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400">You do not have permission to view this report.</p>
      </div>
    )
  }

  if (!currentBusiness?.requireSalespersonEod) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 p-6 max-w-2xl mx-auto">
        <div className="mb-6">
          <Link href="/restaurant/reports" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">← Reports</Link>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-8 text-center border border-gray-200 dark:border-gray-700">
          <p className="text-2xl mb-3">📋</p>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Salesperson EOD not enabled</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">Enable "Require Salesperson EOD Report" in business settings to use this report.</p>
        </div>
      </div>
    )
  }

  const currentData = activeTab === 'daily' ? rows : summaryRows

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <Link href="/restaurant/reports" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">← Reports</Link>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">EOD Discrepancy Report</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">Compare manager-recorded cash vs salesperson-reported totals</p>
          </div>
          <button
            onClick={exportCsv}
            disabled={!currentData.length}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            📥 Export CSV
          </button>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-1 border-b border-gray-200 dark:border-gray-700">
          {(['daily', 'summary'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-semibold rounded-t-lg border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {tab === 'daily' ? '📅 Daily' : '📊 Summary'}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="mb-6 bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-end gap-4 flex-wrap">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">From</label>
              <input
                type="date"
                value={from}
                onChange={e => setFrom(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">To</label>
              <input
                type="date"
                value={to}
                onChange={e => setTo(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg text-sm"
              />
            </div>
            {activeTab === 'summary' && (
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Group by</label>
                <div className="flex gap-1">
                  {(['week', 'month'] as const).map(g => (
                    <button
                      key={g}
                      onClick={() => setSummaryGroupBy(g)}
                      className={`px-3 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                        summaryGroupBy === g
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      {g === 'week' ? 'Weekly' : 'Monthly'}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <button
              onClick={handleApply}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-semibold disabled:opacity-50"
            >
              {loading ? 'Loading…' : 'Apply'}
            </button>
          </div>
        </div>

        {/* Variance legend */}
        <div className="mb-4 flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
          <span className="font-semibold">Variance:</span>
          <span className="text-green-600 dark:text-green-400 font-semibold">■ ≤ $1 (OK)</span>
          <span className="text-amber-600 dark:text-amber-400 font-semibold">■ $1–$10 (Review)</span>
          <span className="text-red-600 dark:text-red-400 font-semibold">■ &gt;$10 (Flag)</span>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 bg-red-50 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg p-4 text-sm text-red-800 dark:text-red-200">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
          </div>
        ) : activeTab === 'daily' ? (
          /* ── DAILY TAB ── */
          rows.length === 0 ? (
            <div className="text-center py-16 text-gray-500 dark:text-gray-400">
              <p className="text-4xl mb-3">📭</p>
              <p className="text-lg font-semibold">No manager EOD reports found for this period</p>
              <p className="text-sm mt-1">Manager EOD reports must be saved to appear here.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 dark:bg-gray-700">
                    <tr>
                      <th className="text-left p-3 font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap">Date</th>
                      <th className="text-left p-3 font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap">Manager</th>
                      <th className="text-right p-3 font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap">Mgr Cash</th>
                      <th className="text-right p-3 font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap">SP Cash</th>
                      <th className="text-right p-3 font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap">Cash Variance</th>
                      <th className="text-right p-3 font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap">Mgr EcoCash</th>
                      <th className="text-right p-3 font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap">SP EcoCash</th>
                      <th className="text-right p-3 font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap">EcoCash Variance</th>
                      <th className="text-center p-3 font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap">SP Reports</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(r => (
                      <tr key={r.date} className="border-b border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="p-3 font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">
                          {new Date(r.date + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="p-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">{r.managerName}</td>
                        <td className="p-3 text-right text-gray-900 dark:text-gray-100">{r.managerCash !== null ? formatCurrency(r.managerCash) : '—'}</td>
                        <td className="p-3 text-right text-gray-900 dark:text-gray-100">{r.spCash !== null ? formatCurrency(r.spCash) : '—'}</td>
                        <td className={`p-3 text-right font-semibold ${varianceColor(r.cashVariance)} ${varianceBg(r.cashVariance)}`}>
                          {formatVariance(r.cashVariance)}
                        </td>
                        <td className="p-3 text-right text-gray-900 dark:text-gray-100">{r.managerEcocash !== null ? formatCurrency(r.managerEcocash) : '—'}</td>
                        <td className="p-3 text-right text-gray-900 dark:text-gray-100">{r.spEcocash !== null ? formatCurrency(r.spEcocash) : '—'}</td>
                        <td className={`p-3 text-right font-semibold ${varianceColor(r.ecocashVariance)} ${varianceBg(r.ecocashVariance)}`}>
                          {formatVariance(r.ecocashVariance)}
                        </td>
                        <td className="p-3 text-center">
                          <span className="text-gray-700 dark:text-gray-300">{r.spSubmittedCount} submitted</span>
                          {r.spPendingCount > 0 && (
                            <span className="ml-1 px-1.5 py-0.5 bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 rounded text-xs font-semibold">
                              {r.spPendingCount} pending
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Daily summary stats */}
              <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                {(() => {
                  const withCash = rows.filter(r => r.cashVariance !== null)
                  const cashFlagged = withCash.filter(r => Math.abs(r.cashVariance!) > 10).length
                  const ecoFlagged = rows.filter(r => r.ecocashVariance !== null && Math.abs(r.ecocashVariance) > 10).length
                  return (
                    <>
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Days with data</div>
                        <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{rows.length}</div>
                      </div>
                      <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 border border-red-200 dark:border-red-800">
                        <div className="text-xs text-red-600 dark:text-red-400 mb-1">Cash flagged (&gt;$10)</div>
                        <div className="text-2xl font-bold text-red-700 dark:text-red-300">{cashFlagged}</div>
                      </div>
                      <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 border border-red-200 dark:border-red-800">
                        <div className="text-xs text-red-600 dark:text-red-400 mb-1">EcoCash flagged (&gt;$10)</div>
                        <div className="text-2xl font-bold text-red-700 dark:text-red-300">{ecoFlagged}</div>
                      </div>
                      <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
                        <div className="text-xs text-green-600 dark:text-green-400 mb-1">Days within tolerance</div>
                        <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                          {withCash.filter(r => Math.abs(r.cashVariance!) <= 1).length}
                        </div>
                      </div>
                    </>
                  )
                })()}
              </div>
            </>
          )
        ) : (
          /* ── SUMMARY TAB ── */
          summaryRows.length === 0 ? (
            <div className="text-center py-16 text-gray-500 dark:text-gray-400">
              <p className="text-4xl mb-3">📭</p>
              <p className="text-lg font-semibold">No data found for this period</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 dark:bg-gray-700">
                    <tr>
                      <th className="text-left p-3 font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap">
                        {summaryGroupBy === 'week' ? 'Week' : 'Month'}
                      </th>
                      <th className="text-center p-3 font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap">Days</th>
                      <th className="text-right p-3 font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap">Total Cash Variance</th>
                      <th className="text-right p-3 font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap">Total EcoCash Variance</th>
                      <th className="text-right p-3 font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap">Worst Day (Cash)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summaryRows.map((r, i) => {
                      const prev = summaryRows[i + 1]
                      const trend =
                        r.totalCashVariance !== null && prev?.totalCashVariance !== null
                          ? r.totalCashVariance > prev.totalCashVariance
                            ? '↑'
                            : r.totalCashVariance < prev.totalCashVariance
                            ? '↓'
                            : '→'
                          : null
                      return (
                        <tr key={r.periodKey} className="border-b border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                          <td className="p-3 font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">{r.periodLabel}</td>
                          <td className="p-3 text-center text-gray-700 dark:text-gray-300">{r.daysReported}</td>
                          <td className={`p-3 text-right font-semibold ${varianceColor(r.totalCashVariance)} ${varianceBg(r.totalCashVariance)}`}>
                            {formatVariance(r.totalCashVariance)}
                            {trend && (
                              <span className={`ml-1 text-xs ${trend === '↑' ? 'text-red-500' : trend === '↓' ? 'text-green-500' : 'text-gray-400'}`}>
                                {trend}
                              </span>
                            )}
                          </td>
                          <td className={`p-3 text-right font-semibold ${varianceColor(r.totalEcocashVariance)} ${varianceBg(r.totalEcocashVariance)}`}>
                            {formatVariance(r.totalEcocashVariance)}
                          </td>
                          <td className={`p-3 text-right font-semibold ${varianceColor(r.worstCashVariance)} ${varianceBg(r.worstCashVariance)}`}>
                            {formatVariance(r.worstCashVariance)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Summary stats */}
              <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-4">
                {(() => {
                  const flagged = summaryRows.filter(r => r.totalCashVariance !== null && Math.abs(r.totalCashVariance) > 10).length
                  const clean = summaryRows.filter(r => r.totalCashVariance !== null && Math.abs(r.totalCashVariance) <= 1).length
                  const totalDays = summaryRows.reduce((s, r) => s + r.daysReported, 0)
                  return (
                    <>
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Periods</div>
                        <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{summaryRows.length}</div>
                        <div className="text-xs text-gray-400 mt-0.5">{totalDays} days total</div>
                      </div>
                      <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 border border-red-200 dark:border-red-800">
                        <div className="text-xs text-red-600 dark:text-red-400 mb-1">Periods flagged (&gt;$10)</div>
                        <div className="text-2xl font-bold text-red-700 dark:text-red-300">{flagged}</div>
                      </div>
                      <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
                        <div className="text-xs text-green-600 dark:text-green-400 mb-1">Clean periods (≤$1)</div>
                        <div className="text-2xl font-bold text-green-700 dark:text-green-300">{clean}</div>
                      </div>
                    </>
                  )
                })()}
              </div>
            </>
          )
        )}
      </div>
    </div>
  )
}
