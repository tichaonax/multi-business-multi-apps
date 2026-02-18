'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { useDateFormat } from '@/contexts/settings-context'
import { formatDateByFormat, parseDateFromFormat } from '@/lib/country-codes'
import { getLocalDateString } from '@/lib/utils'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { BusinessTypeRoute } from '@/components/auth/business-type-route'
import { ContentLayout } from '@/components/layout/content-layout'
import { useToastContext } from '@/components/ui/toast'

type Tab = 'summary' | 'salesperson' | 'participant'

type SummaryData = {
  totalTransactions: number
  totalSubsidy: number
  totalCash: number
  totalRevenue: number
  eligibleItemCount: number
  upgradeCount: number
  dailyTrend: { date: string; count: number; subsidy: number; cash: number }[]
}

type SalespersonRow = {
  id: string
  name: string
  type: string
  count: number
  totalSubsidy: number
  totalCash: number
  totalRevenue: number
}

type ParticipantRow = {
  participantId: string
  name: string
  type: string
  isActive: boolean
  count: number
  totalSubsidy: number
  totalCash: number
  lastTransactionDate: string
  transactions: {
    id: string
    orderNumber: string
    date: string
    subsidizedItem: string | null
    subsidy: number
    cash: number
    total: number
    soldBy: string
  }[]
}

function fmt(n: number) {
  return `$${n.toFixed(2)}`
}

export default function MealProgramReportPage() {
  const { currentBusinessId } = useBusinessPermissionsContext()
  const toast = useToastContext()
  const { format: globalDateFormat } = useDateFormat()

  const [tab, setTab] = useState<Tab>('summary')
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date()
    d.setDate(1) // first of month
    return getLocalDateString(d)
  })
  const [dateTo, setDateTo] = useState(() => getLocalDateString())
  const [loading, setLoading] = useState(false)

  // Locale-aware display state for the date text inputs
  const [fromText, setFromText] = useState('')
  const [toText, setToText] = useState('')
  const [fromError, setFromError] = useState(false)
  const [toError, setToError] = useState(false)

  // Keep display text in sync when ISO state or format changes
  useEffect(() => {
    setFromText(formatDateByFormat(dateFrom, globalDateFormat))
  }, [dateFrom, globalDateFormat])

  useEffect(() => {
    setToText(formatDateByFormat(dateTo, globalDateFormat))
  }, [dateTo, globalDateFormat])

  const handleFromBlur = () => {
    const iso = parseDateFromFormat(fromText, globalDateFormat)
    if (!iso) {
      setFromText(formatDateByFormat(dateFrom, globalDateFormat))
      setFromError(true)
      setTimeout(() => setFromError(false), 2000)
    } else {
      setDateFrom(iso)
    }
  }

  const handleToBlur = () => {
    const iso = parseDateFromFormat(toText, globalDateFormat)
    if (!iso) {
      setToText(formatDateByFormat(dateTo, globalDateFormat))
      setToError(true)
      setTimeout(() => setToError(false), 2000)
    } else {
      setDateTo(iso)
    }
  }

  const [summaryData, setSummaryData] = useState<SummaryData | null>(null)
  const [salespersonData, setSalespersonData] = useState<SalespersonRow[]>([])
  const [participantData, setParticipantData] = useState<ParticipantRow[]>([])
  const [expandedParticipant, setExpandedParticipant] = useState<string | null>(null)

  const fetchReport = useCallback(
    async (view: Tab) => {
      if (!currentBusinessId) return
      setLoading(true)
      try {
        const params = new URLSearchParams({
          businessId: currentBusinessId,
          view,
          dateFrom,
          dateTo: `${dateTo}T23:59:59`,
        })
        const res = await fetch(`/api/restaurant/meal-program/reports?${params}`)
        const data = await res.json()
        if (!data.success) throw new Error(data.error)

        if (view === 'summary') setSummaryData(data.data)
        if (view === 'salesperson') setSalespersonData(data.data)
        if (view === 'participant') setParticipantData(data.data)
      } catch (err: any) {
        toast.push(err.message || 'Failed to load report', { type: 'error' })
      } finally {
        setLoading(false)
      }
    },
    [currentBusinessId, dateFrom, dateTo, toast]
  )

  useEffect(() => {
    fetchReport(tab)
  }, [tab, fetchReport])

  function handleTabChange(t: Tab) {
    setTab(t)
  }

  return (
    <ProtectedRoute>
      <BusinessTypeRoute requiredBusinessType="restaurant">
        <ContentLayout
          title="🍱 Meal Program Report"
          breadcrumb={[
            { label: 'Restaurant', href: '/restaurant' },
            { label: 'Reports', href: '/restaurant/reports' },
            { label: 'Meal Program', isActive: true },
          ]}
        >
          {/* Date range picker */}
          <div className="flex flex-wrap items-end gap-3 mb-6">
            <div className="flex gap-2">
              <button
                onClick={() => { const t = getLocalDateString(); setDateFrom(t); setDateTo(t) }}
                className="px-3 py-1.5 text-xs font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
              >
                Today
              </button>
              <button
                onClick={() => { const d = new Date(); d.setDate(d.getDate() - 1); const y = getLocalDateString(d); setDateFrom(y); setDateTo(y) }}
                className="px-3 py-1.5 text-xs font-medium bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
              >
                Yesterday
              </button>
              <button
                onClick={() => { const d = new Date(); d.setDate(d.getDate() - 6); setDateFrom(getLocalDateString(d)); setDateTo(getLocalDateString()) }}
                className="px-3 py-1.5 text-xs font-medium bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
              >
                Last 7 Days
              </button>
              <button
                onClick={() => { const d = new Date(); d.setDate(d.getDate() - 29); setDateFrom(getLocalDateString(d)); setDateTo(getLocalDateString()) }}
                className="px-3 py-1.5 text-xs font-medium bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
              >
                Last 30 Days
              </button>
              <button
                onClick={() => { const d = new Date(); d.setDate(d.getDate() - 89); setDateFrom(getLocalDateString(d)); setDateTo(getLocalDateString()) }}
                className="px-3 py-1.5 text-xs font-medium bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
              >
                Last 90 Days
              </button>
            </div>
            <div>
              <label className="block text-xs text-secondary mb-1">From</label>
              <input
                type="text"
                value={fromText}
                placeholder={globalDateFormat.toLowerCase()}
                onChange={(e) => { setFromText(e.target.value); setFromError(false) }}
                onBlur={handleFromBlur}
                className={`px-3 py-1.5 border rounded-lg text-sm bg-white dark:bg-gray-800 transition-colors ${
                  fromError
                    ? 'border-red-500 dark:border-red-500'
                    : 'border-gray-300 dark:border-gray-600'
                }`}
              />
            </div>
            <div>
              <label className="block text-xs text-secondary mb-1">To</label>
              <input
                type="text"
                value={toText}
                placeholder={globalDateFormat.toLowerCase()}
                onChange={(e) => { setToText(e.target.value); setToError(false) }}
                onBlur={handleToBlur}
                className={`px-3 py-1.5 border rounded-lg text-sm bg-white dark:bg-gray-800 transition-colors ${
                  toError
                    ? 'border-red-500 dark:border-red-500'
                    : 'border-gray-300 dark:border-gray-600'
                }`}
              />
            </div>
            <button
              onClick={() => fetchReport(tab)}
              disabled={loading}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-lg disabled:opacity-50"
            >
              {loading ? 'Loading…' : 'Refresh'}
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 w-fit mb-6">
            {(['summary', 'salesperson', 'participant'] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => handleTabChange(t)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium capitalize transition-colors ${
                  tab === t
                    ? 'bg-white dark:bg-gray-700 text-amber-600 dark:text-amber-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                {t === 'summary' ? '📊 Summary' : t === 'salesperson' ? '👤 By Salesperson' : '🙋 By Participant'}
              </button>
            ))}
          </div>

          {loading && <div className="text-center py-12 text-secondary">Loading…</div>}

          {/* ---- SUMMARY TAB ---- */}
          {!loading && tab === 'summary' && summaryData && (
            <div>
              {/* KPI Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="card p-4">
                  <div className="text-xs text-secondary mb-1">Total Transactions</div>
                  <div className="text-2xl font-bold text-primary">{summaryData.totalTransactions}</div>
                </div>
                <div className="card p-4">
                  <div className="text-xs text-secondary mb-1">Total Subsidy Cost</div>
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {fmt(summaryData.totalSubsidy)}
                  </div>
                </div>
                <div className="card p-4">
                  <div className="text-xs text-secondary mb-1">Cash Collected</div>
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {fmt(summaryData.totalCash)}
                  </div>
                </div>
                <div className="card p-4">
                  <div className="text-xs text-secondary mb-1">Total Revenue</div>
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {fmt(summaryData.totalRevenue)}
                  </div>
                </div>
              </div>

              {/* Eligible vs Upgrade breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                <div className="card p-4">
                  <h3 className="text-sm font-semibold text-primary mb-3">Transaction Breakdown</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-secondary">Eligible Item (FREE) purchases</span>
                      <span className="font-medium text-green-600 dark:text-green-400">
                        {summaryData.eligibleItemCount}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-secondary">Upgrade purchases (item + cash diff)</span>
                      <span className="font-medium text-amber-600 dark:text-amber-400">
                        {summaryData.upgradeCount}
                      </span>
                    </div>
                    <div className="flex justify-between border-t pt-1">
                      <span className="text-secondary font-medium">Total</span>
                      <span className="font-bold text-primary">{summaryData.totalTransactions}</span>
                    </div>
                  </div>
                </div>
                <div className="card p-4">
                  <h3 className="text-sm font-semibold text-primary mb-3">Payment Split</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-secondary">Expense account (subsidy)</span>
                      <span className="font-medium text-red-600 dark:text-red-400">
                        {fmt(summaryData.totalSubsidy)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-secondary">Cash from participants</span>
                      <span className="font-medium text-green-600 dark:text-green-400">
                        {fmt(summaryData.totalCash)}
                      </span>
                    </div>
                    <div className="flex justify-between border-t pt-1">
                      <span className="text-secondary font-medium">Total Revenue</span>
                      <span className="font-bold text-primary">{fmt(summaryData.totalRevenue)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Daily Trend */}
              {summaryData.dailyTrend.length > 0 && (
                <div className="card overflow-hidden">
                  <div className="px-4 py-3 border-b dark:border-gray-700 font-medium text-sm text-primary">
                    Daily Activity
                  </div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-800/50 border-b dark:border-gray-700">
                        <th className="text-left px-4 py-2 text-xs text-secondary">Date</th>
                        <th className="text-right px-4 py-2 text-xs text-secondary">Transactions</th>
                        <th className="text-right px-4 py-2 text-xs text-secondary">Subsidy</th>
                        <th className="text-right px-4 py-2 text-xs text-secondary">Cash</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summaryData.dailyTrend.map((d) => (
                        <tr
                          key={d.date}
                          className="border-b dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/30"
                        >
                          <td className="px-4 py-2 text-primary">{formatDateByFormat(d.date, globalDateFormat)}</td>
                          <td className="px-4 py-2 text-right">{d.count}</td>
                          <td className="px-4 py-2 text-right text-red-600 dark:text-red-400">
                            {fmt(d.subsidy)}
                          </td>
                          <td className="px-4 py-2 text-right text-green-600 dark:text-green-400">
                            {fmt(d.cash)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ---- SALESPERSON TAB ---- */}
          {!loading && tab === 'salesperson' && (
            <div className="card overflow-hidden">
              {salespersonData.length === 0 ? (
                <div className="text-center py-10 text-secondary">No data for this period</div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-800/50 border-b dark:border-gray-700">
                      <th className="text-left px-4 py-3 text-xs text-secondary font-medium">Salesperson</th>
                      <th className="text-left px-4 py-3 text-xs text-secondary font-medium">Type</th>
                      <th className="text-right px-4 py-3 text-xs text-secondary font-medium">Transactions</th>
                      <th className="text-right px-4 py-3 text-xs text-secondary font-medium">Subsidy Used</th>
                      <th className="text-right px-4 py-3 text-xs text-secondary font-medium">Cash Collected</th>
                      <th className="text-right px-4 py-3 text-xs text-secondary font-medium">Total Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salespersonData.map((row) => (
                      <tr
                        key={row.id}
                        className="border-b dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/30"
                      >
                        <td className="px-4 py-3 font-medium text-primary">{row.name}</td>
                        <td className="px-4 py-3 text-secondary capitalize">{row.type.toLowerCase()}</td>
                        <td className="px-4 py-3 text-right">{row.count}</td>
                        <td className="px-4 py-3 text-right text-red-600 dark:text-red-400">
                          {fmt(row.totalSubsidy)}
                        </td>
                        <td className="px-4 py-3 text-right text-green-600 dark:text-green-400">
                          {fmt(row.totalCash)}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-primary">
                          {fmt(row.totalRevenue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* ---- PARTICIPANT TAB ---- */}
          {!loading && tab === 'participant' && (
            <div className="space-y-2">
              {participantData.length === 0 && (
                <div className="card text-center py-10 text-secondary">No data for this period</div>
              )}
              {participantData.map((p) => (
                <div key={p.participantId} className="card overflow-hidden">
                  {/* Participant summary row */}
                  <button
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors"
                    onClick={() =>
                      setExpandedParticipant(
                        expandedParticipant === p.participantId ? null : p.participantId
                      )
                    }
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-left">
                        <div className="font-medium text-sm text-primary">{p.name}</div>
                        <div className="text-xs text-secondary">
                          {p.type === 'EMPLOYEE' ? '👤 Employee' : '🙋 External'}
                          {!p.isActive && (
                            <span className="ml-2 text-gray-400">(inactive)</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-6 text-sm">
                      <div className="text-center">
                        <div className="font-bold text-primary">{p.count}</div>
                        <div className="text-xs text-secondary">meals</div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium text-red-600 dark:text-red-400">
                          {fmt(p.totalSubsidy)}
                        </div>
                        <div className="text-xs text-secondary">subsidy</div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium text-green-600 dark:text-green-400">
                          {fmt(p.totalCash)}
                        </div>
                        <div className="text-xs text-secondary">cash</div>
                      </div>
                      <span className="text-gray-400">
                        {expandedParticipant === p.participantId ? '▲' : '▼'}
                      </span>
                    </div>
                  </button>

                  {/* Expanded transactions */}
                  {expandedParticipant === p.participantId && (
                    <div className="border-t dark:border-gray-700">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-gray-50 dark:bg-gray-800/50">
                            <th className="text-left px-4 py-2 text-secondary">Date</th>
                            <th className="text-left px-4 py-2 text-secondary">Order</th>
                            <th className="text-left px-4 py-2 text-secondary">Item</th>
                            <th className="text-right px-4 py-2 text-secondary">Subsidy</th>
                            <th className="text-right px-4 py-2 text-secondary">Cash</th>
                            <th className="text-left px-4 py-2 text-secondary">Served By</th>
                          </tr>
                        </thead>
                        <tbody>
                          {p.transactions.map((t) => (
                            <tr
                              key={t.id}
                              className="border-t dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/20"
                            >
                              <td className="px-4 py-2 text-secondary">
                                {formatDateByFormat(t.date, globalDateFormat)}
                              </td>
                              <td className="px-4 py-2 font-mono text-primary">{t.orderNumber}</td>
                              <td className="px-4 py-2 text-primary">{t.subsidizedItem || '—'}</td>
                              <td className="px-4 py-2 text-right text-red-600 dark:text-red-400">
                                {fmt(t.subsidy)}
                              </td>
                              <td className="px-4 py-2 text-right text-green-600 dark:text-green-400">
                                {fmt(t.cash)}
                              </td>
                              <td className="px-4 py-2 text-secondary">{t.soldBy}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ContentLayout>
      </BusinessTypeRoute>
    </ProtectedRoute>
  )
}
