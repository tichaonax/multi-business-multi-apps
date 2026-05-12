'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import Link from 'next/link'
import { formatCurrency } from '@/lib/date-format'
import { DateRangeSelector, DateRange } from '@/components/reports/date-range-selector'
import { ContentLayout } from '@/components/layout/content-layout'

type RowStatus = 'MISSING' | 'OVERRIDDEN' | 'ZERO' | 'OK'

interface ShortfallRow {
  date: string
  salespersonId: string
  salespersonName: string
  cashAmount: number
  ecocashAmount: number
  total: number
  status: RowStatus
  isManagerOverride: boolean
  overrideReason: string | null
  notes: string | null
  submittedAt: string | null
  expectedShare: number | null
  variance: number | null
  savedReportId: string | null
}

interface PersonSummary {
  salespersonId: string
  salespersonName: string
  daysPresent: number
  daysMissing: number
  daysOverridden: number
  totalCash: number
  totalEcocash: number
  totalAmount: number
}

interface Summary {
  daysWithData: number
  daysMissing: number
  daysOverridden: number
  totalCash: number
  totalEcocash: number
  totalAmount: number
}

interface Salesperson {
  id: string
  name: string
}

function defaultRange(): DateRange {
  return {
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    end: new Date(),
  }
}

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function statusBadge(status: RowStatus) {
  switch (status) {
    case 'MISSING':
      return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 whitespace-nowrap">Not submitted</span>
    case 'OVERRIDDEN':
      return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 whitespace-nowrap">Override</span>
    case 'ZERO':
      return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300 whitespace-nowrap">Zero reported</span>
    case 'OK':
      return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 whitespace-nowrap">Submitted</span>
  }
}

function rowBg(status: RowStatus): string {
  if (status === 'MISSING') return 'bg-red-50 dark:bg-red-900/20'
  if (status === 'OVERRIDDEN') return 'bg-amber-50 dark:bg-amber-900/10'
  return ''
}

function varianceColor(v: number | null): string {
  if (v === null) return 'text-gray-400 dark:text-gray-500'
  const abs = Math.abs(v)
  if (abs <= 1) return 'text-green-600 dark:text-green-400'
  if (abs <= 10) return 'text-amber-600 dark:text-amber-400'
  return 'text-red-600 dark:text-red-400'
}

function formatVariance(v: number | null): string {
  if (v === null) return '—'
  return `${v > 0 ? '+' : ''}${formatCurrency(v)}`
}

function formatDate(s: string): string {
  return new Date(s + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function SalespersonShortfallPage() {
  const router = useRouter()
  const { currentBusinessId, currentBusiness, hasPermission, isSystemAdmin } = useBusinessPermissionsContext()

  const [dateRange, setDateRange] = useState<DateRange>(defaultRange)
  const [allTime, setAllTime] = useState(false)
  const [selectedSalesperson, setSelectedSalesperson] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | RowStatus>('ALL')

  const [rows, setRows] = useState<ShortfallRow[]>([])
  const [byPerson, setByPerson] = useState<PersonSummary[]>([])
  const [salespersons, setSalespersons] = useState<Salesperson[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canView = isSystemAdmin || hasPermission('canCloseBooks') || hasPermission('canAccessFinancialData')

  const load = useCallback(async () => {
    if (!currentBusinessId || !canView) return
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ businessId: currentBusinessId })
      if (allTime) {
        params.set('allTime', 'true')
      } else {
        params.set('from', toIsoDate(dateRange.start))
        params.set('to', toIsoDate(dateRange.end))
      }
      if (selectedSalesperson) params.set('salespersonId', selectedSalesperson)

      const res = await fetch(`/api/reports/salesperson-shortfall?${params}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load')
      setRows(json.rows || [])
      setByPerson(json.byPerson || [])
      setSalespersons(json.salespersons || [])
      setSummary(json.summary || null)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [currentBusinessId, dateRange, allTime, selectedSalesperson, canView])

  useEffect(() => {
    if (currentBusinessId) load()
  }, [currentBusinessId, load])

  const exportCsv = () => {
    if (selectedSalesperson && rows.length > 0) {
      const headers = ['Date', 'Salesperson', 'Cash', 'EcoCash', 'Total', 'Expected Share', 'Variance', 'Status', 'Override Reason', 'Notes']
      const lines = rows.map(r => [
        r.date, r.salespersonName, r.cashAmount, r.ecocashAmount, r.total,
        r.expectedShare ?? '', r.variance ?? '', r.status,
        r.overrideReason ?? '', r.notes ?? ''
      ].join(','))
      downloadCsv([headers.join(','), ...lines].join('\n'), `sp-shortfall-${selectedSalesperson.slice(0, 8)}.csv`)
    } else if (byPerson.length > 0) {
      const headers = ['Salesperson', 'Days Present', 'Missing', 'Overridden', 'Total Cash', 'Total EcoCash', 'Total']
      const lines = byPerson.map(p => [
        p.salespersonName, p.daysPresent, p.daysMissing, p.daysOverridden,
        p.totalCash, p.totalEcocash, p.totalAmount
      ].join(','))
      downloadCsv([headers.join(','), ...lines].join('\n'), `sp-shortfall-all.csv`)
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

  // Total shortfall = sum of all negative variances
  const totalShortfall = rows.reduce((s, r) => r.variance !== null && r.variance < 0 ? s + r.variance : s, 0)
  const shortfallCount = rows.filter(r => r.variance !== null && r.variance < 0).length

  if (!canView) {
    return (
      <ContentLayout title="Salesperson Shortfall Report">
        <p className="text-gray-500 dark:text-gray-400 py-8 text-center">You do not have permission to view this report.</p>
      </ContentLayout>
    )
  }

  if (!currentBusiness?.requireSalespersonEod) {
    return (
      <ContentLayout title="Salesperson Shortfall Report">
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-8 text-center border border-gray-200 dark:border-gray-700 max-w-xl">
          <p className="text-2xl mb-3">📋</p>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Salesperson EOD not enabled</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">Enable "Require Salesperson EOD Report" in business settings to use this report.</p>
        </div>
      </ContentLayout>
    )
  }

  function selectSalesperson(id: string) {
    setSelectedSalesperson(id)
    setStatusFilter('ALL')
    setSearch('')
  }

  const hasData = selectedSalesperson ? rows.length > 0 : byPerson.length > 0

  // Filtered data for the current view
  const filteredByPerson = byPerson.filter(p => {
    if (search && !p.salespersonName.toLowerCase().includes(search.toLowerCase())) return false
    if (statusFilter === 'MISSING') return p.daysMissing > 0
    if (statusFilter === 'OVERRIDDEN') return p.daysOverridden > 0
    if (statusFilter === 'OK') return p.daysMissing === 0 && p.daysOverridden === 0
    return true
  })

  const filteredRows = rows.filter(r => {
    if (statusFilter === 'ALL') return true
    return r.status === statusFilter
  })

  // Pills config — different per view
  const allPersonPills = [
    { key: 'ALL' as const, label: 'All' },
    { key: 'MISSING' as const, label: `Missing (${byPerson.filter(p => p.daysMissing > 0).length})` },
    { key: 'OVERRIDDEN' as const, label: `Overrides (${byPerson.filter(p => p.daysOverridden > 0).length})` },
    { key: 'OK' as const, label: `Clean (${byPerson.filter(p => p.daysMissing === 0 && p.daysOverridden === 0).length})` },
  ]
  const singlePersonPills = [
    { key: 'ALL' as const, label: 'All' },
    { key: 'MISSING' as const, label: `Missing (${rows.filter(r => r.status === 'MISSING').length})` },
    { key: 'OVERRIDDEN' as const, label: `Overrides (${rows.filter(r => r.status === 'OVERRIDDEN').length})` },
    { key: 'ZERO' as const, label: `Zero (${rows.filter(r => r.status === 'ZERO').length})` },
    { key: 'OK' as const, label: `OK (${rows.filter(r => r.status === 'OK').length})` },
  ]
  const activePills = selectedSalesperson ? singlePersonPills : allPersonPills

  return (
    <ContentLayout
      title="Salesperson Shortfall Report"
      breadcrumb={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Reports', href: '/reports' },
        { label: 'Salesperson Shortfall', isActive: true },
      ]}
      headerActions={
        <button
          onClick={exportCsv}
          disabled={!hasData}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          📥 Export CSV
        </button>
      }
    >
      <div className="space-y-4">

        {/* Subtitle */}
        <p className="text-sm text-secondary -mt-2">
          {selectedSalesperson
            ? `Day-by-day EOD submissions for ${salespersons.find(s => s.id === selectedSalesperson)?.name ?? 'selected salesperson'}`
            : 'EOD submission compliance across all salespersons'}
        </p>

        {/* Date range selector */}
        <DateRangeSelector
          value={dateRange}
          onChange={range => { setAllTime(false); setDateRange(range) }}
          showAllTime
          allTime={allTime}
          onAllTimeChange={setAllTime}
        />

        {/* Salesperson selector + status pills + search */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedSalesperson}
            onChange={e => selectSalesperson(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg text-sm min-w-[160px]"
          >
            <option value="">All salespersons</option>
            {salespersons.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>

          {selectedSalesperson && (
            <button
              onClick={() => selectSalesperson('')}
              className="px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            >
              ✕ All
            </button>
          )}

          <span className="text-gray-300 dark:text-gray-600 hidden sm:block select-none">|</span>

          {activePills.map(pill => (
            <button
              key={pill.key}
              onClick={() => setStatusFilter(pill.key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === pill.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600'
              }`}
            >
              {pill.label}
            </button>
          ))}

          {!selectedSalesperson && (
            <div className="flex items-center gap-2 ml-auto">
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search salesperson…"
                className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="px-3 py-1.5 rounded-lg text-sm bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          )}
        </div>

        {/* Summary cards */}
        {summary && (
            <div className="mb-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className={`rounded-lg border p-4 ${totalShortfall < 0 ? 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'}`}>
                <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${totalShortfall < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}>
                  Total Shortfall
                </p>
                <p className={`text-3xl font-bold ${totalShortfall < 0 ? 'text-red-700 dark:text-red-300' : 'text-gray-900 dark:text-gray-100'}`}>
                  {totalShortfall < 0 ? formatCurrency(totalShortfall) : formatCurrency(0)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {shortfallCount > 0 ? `${shortfallCount} submission${shortfallCount !== 1 ? 's' : ''} below expected` : 'No shortfall detected'}
                </p>
              </div>
              <div className={`rounded-lg border p-4 ${summary.daysMissing > 0 ? 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'}`}>
                <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${summary.daysMissing > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}>
                  Missing Submissions
                </p>
                <p className={`text-3xl font-bold ${summary.daysMissing > 0 ? 'text-red-700 dark:text-red-300' : 'text-gray-900 dark:text-gray-100'}`}>
                  {summary.daysMissing}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">days with no report filed</p>
              </div>
              <div className={`rounded-lg border p-4 ${summary.daysOverridden > 0 ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'}`}>
                <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${summary.daysOverridden > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-500 dark:text-gray-400'}`}>
                  Manager Overrides
                </p>
                <p className={`text-3xl font-bold ${summary.daysOverridden > 0 ? 'text-amber-700 dark:text-amber-300' : 'text-gray-900 dark:text-gray-100'}`}>
                  {summary.daysOverridden}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">submitted on salesperson's behalf</p>
              </div>
            </div>
          )}

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
          ) : !hasData ? (
            <div className="text-center py-16 text-gray-500 dark:text-gray-400">
              <p className="text-4xl mb-3">📭</p>
              <p className="text-lg font-semibold">No salesperson EOD data for this period</p>
              <p className="text-sm mt-1">Salespersons need to submit EOD reports for entries to appear here.</p>
            </div>
          ) : selectedSalesperson ? (
            /* ── VIEW B: day-by-day detail for one person ── */
            <>
              <div className="mb-4 flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
                <span className="font-semibold">Variance vs expected share:</span>
                <span className="text-green-600 dark:text-green-400 font-semibold">■ ≤ $1 (OK)</span>
                <span className="text-amber-600 dark:text-amber-400 font-semibold">■ $1–$10 (Review)</span>
                <span className="text-red-600 dark:text-red-400 font-semibold">■ &gt;$10 (Flag)</span>
              </div>

              {filteredRows.length === 0 ? (
                <div className="text-center py-10 text-gray-500 dark:text-gray-400">
                  <p className="text-2xl mb-2">🔍</p>
                  <p className="text-sm font-medium">No rows match the selected filter.</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100 dark:bg-gray-700">
                        <tr>
                          <th className="text-left p-3 font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap">Date</th>
                          <th className="text-right p-3 font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap">Cash</th>
                          <th className="text-right p-3 font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap">EcoCash</th>
                          <th className="text-right p-3 font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap">Total</th>
                          <th className="text-right p-3 font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap">Expected Share</th>
                          <th className="text-right p-3 font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap">Variance</th>
                          <th className="text-center p-3 font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap">Status</th>
                          <th className="text-left p-3 font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap">Note / Reason</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredRows.map(r => (
                          <tr
                            key={`${r.date}-${r.salespersonId}`}
                            className={`border-b border-gray-200 dark:border-gray-600 ${rowBg(r.status)} ${r.savedReportId ? 'cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20' : ''}`}
                            onClick={() => r.savedReportId && router.push(`/${currentBusiness?.businessType}/reports/saved/${r.savedReportId}`)}
                          >
                            <td className="p-3 font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">
                              {formatDate(r.date)}
                              {r.savedReportId && <span className="ml-1 text-blue-400 text-xs">↗</span>}
                            </td>
                            <td className="p-3 text-right text-gray-900 dark:text-gray-100">{r.status === 'MISSING' ? '—' : formatCurrency(r.cashAmount)}</td>
                            <td className="p-3 text-right text-gray-900 dark:text-gray-100">{r.status === 'MISSING' ? '—' : formatCurrency(r.ecocashAmount)}</td>
                            <td className="p-3 text-right font-semibold text-gray-900 dark:text-gray-100">{r.status === 'MISSING' ? '—' : formatCurrency(r.total)}</td>
                            <td className="p-3 text-right text-gray-500 dark:text-gray-400">{r.expectedShare !== null ? formatCurrency(r.expectedShare) : '—'}</td>
                            <td className={`p-3 text-right font-semibold ${varianceColor(r.variance)}`}>{formatVariance(r.variance)}</td>
                            <td className="p-3 text-center">{statusBadge(r.status)}</td>
                            <td className="p-3 text-xs text-gray-500 dark:text-gray-400 max-w-[200px] truncate">{r.overrideReason || r.notes || ''}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-3 flex justify-end gap-6 text-sm text-gray-700 dark:text-gray-300 px-3">
                    <span>Cash: <strong>{formatCurrency(filteredRows.reduce((s, r) => s + r.cashAmount, 0))}</strong></span>
                    <span>EcoCash: <strong>{formatCurrency(filteredRows.reduce((s, r) => s + r.ecocashAmount, 0))}</strong></span>
                    <span>Grand total: <strong>{formatCurrency(filteredRows.reduce((s, r) => s + r.total, 0))}</strong></span>
                  </div>
                </>
              )}
            </>
          ) : (
            /* ── VIEW A: per-person summary ── */
            filteredByPerson.length === 0 ? (
              <div className="text-center py-10 text-gray-500 dark:text-gray-400">
                <p className="text-2xl mb-2">🔍</p>
                <p className="text-sm font-medium">No salespersons match your search or filter.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 dark:bg-gray-700">
                    <tr>
                      <th className="text-left p-3 font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap">Salesperson</th>
                      <th className="text-center p-3 font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap">Days Present</th>
                      <th className="text-center p-3 font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap">Missing</th>
                      <th className="text-center p-3 font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap">Overridden</th>
                      <th className="text-right p-3 font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap">Total Cash</th>
                      <th className="text-right p-3 font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap">Total EcoCash</th>
                      <th className="text-right p-3 font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap">Total</th>
                      <th className="text-center p-3 font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap">Detail</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredByPerson.map(p => (
                      <tr key={p.salespersonId} className={`border-b border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800/50 ${p.daysMissing > 0 ? 'bg-red-50 dark:bg-red-900/20' : p.daysOverridden > 0 ? 'bg-amber-50 dark:bg-amber-900/10' : ''}`}>
                        <td className="p-3 font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">{p.salespersonName}</td>
                        <td className="p-3 text-center text-gray-700 dark:text-gray-300">{p.daysPresent}</td>
                        <td className="p-3 text-center">{p.daysMissing > 0 ? <span className="font-bold text-red-600 dark:text-red-400">{p.daysMissing}</span> : <span className="text-gray-400">0</span>}</td>
                        <td className="p-3 text-center">{p.daysOverridden > 0 ? <span className="font-bold text-amber-600 dark:text-amber-400">{p.daysOverridden}</span> : <span className="text-gray-400">0</span>}</td>
                        <td className="p-3 text-right text-gray-900 dark:text-gray-100">{formatCurrency(p.totalCash)}</td>
                        <td className="p-3 text-right text-gray-900 dark:text-gray-100">{formatCurrency(p.totalEcocash)}</td>
                        <td className="p-3 text-right font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(p.totalAmount)}</td>
                        <td className="p-3 text-center">
                          <button onClick={() => selectSalesperson(p.salespersonId)} className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold">
                            View →
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
      </div>
    </ContentLayout>
  )
}
