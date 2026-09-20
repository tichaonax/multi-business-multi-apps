'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { ContentLayout } from '@/components/layout/content-layout'
import { CollapsibleSection } from '@/components/ui/collapsible-section'
import { DateRangeSelector, DateRange } from '@/components/reports/date-range-selector'
import { getEffectivePermissions } from '@/lib/permission-utils'
import Link from 'next/link'

function toISODate(d: Date) {
  return d.toISOString().split('T')[0]
}

function defaultDateRange(): DateRange {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - 30)
  return { start, end }
}

type ReconciliationStatus = 'NOT_STARTED' | 'PARTIALLY_RECEIPTED' | 'PENDING_REVIEW' | 'FULLY_RECEIPTED' | 'OVER_LIMIT'

const STATUS_TABS: { label: string; value: ReconciliationStatus | 'ALL' }[] = [
  { label: 'All', value: 'ALL' },
  { label: '⬜ Not Started', value: 'NOT_STARTED' },
  { label: '🟡 Partially Receipted', value: 'PARTIALLY_RECEIPTED' },
  { label: '🔵 Pending Review', value: 'PENDING_REVIEW' },
  { label: '🟢 Fully Receipted', value: 'FULLY_RECEIPTED' },
  { label: '🔴 Over Limit', value: 'OVER_LIMIT' },
]

interface ReceiptRow {
  receiptId: string
  supplierOrPersonName: string | null
  supplierId: string | null
  comboRequestId: string | null
  comboRequestTitle: string | null
  requestDate: string | null
  paymentDate: string
  requestedAmount: number
  receiptDate: string
  receiptAmount: number
  receiptNumber: string | null
  expenseType: string | null
  expenseSubtype: string | null
  business: string | null
  requestingEmployee: string
  receiptEntryEmployee: string
  reconciliationStatus: ReconciliationStatus | null
  outstandingBalance: number | null
}

export default function ReceiptsReportPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [rows, setRows] = useState<ReceiptRow[]>([])
  const [summary, setSummary] = useState<{ totalSpend: number; count: number; byType: { type: string; amount: number }[] } | null>(null)
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState<DateRange>(defaultDateRange())
  const [allTime, setAllTime] = useState(true)
  const [statusTab, setStatusTab] = useState<ReconciliationStatus | 'ALL'>('ALL')
  const [nameSearch, setNameSearch] = useState('')

  const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
  const fmtDate = (s: string | null) => s ? new Date(s).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' }) : '—'

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/signin')
  }, [status, router])

  useEffect(() => {
    if (status !== 'authenticated') return
    const permissions = getEffectivePermissions(session?.user)
    if (!permissions.canViewExpenseReports) { router.push('/expense-accounts'); return }
    loadReport()
  }, [status, session, dateRange, allTime, statusTab])

  async function loadReport() {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (!allTime) {
        params.append('dateFrom', toISODate(dateRange.start))
        params.append('dateTo', toISODate(dateRange.end))
      }
      if (statusTab !== 'ALL') params.append('status', statusTab)
      const res = await fetch(`/api/expense-account/reports/receipts?${params}`, { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setRows(data.data?.rows ?? [])
        setSummary(data.data?.summary ?? null)
      }
    } catch (e) {
      console.error('Error loading receipts report:', e)
    } finally {
      setLoading(false)
    }
  }

  // Search is applied client-side against the already loaded rows — the
  // dataset behind a report view is small enough that a second round-trip
  // isn't worth the extra complexity. Matches payee/supplier name plus the
  // description-like fields (combo request title, expense type, business,
  // requester, receipt #) so "search by payee or description" both work.
  const visibleRows = useMemo(() => {
    if (!nameSearch.trim()) return rows
    const q = nameSearch.trim().toLowerCase()
    return rows.filter(r => [
      r.supplierOrPersonName,
      r.comboRequestTitle,
      r.expenseType,
      r.business,
      r.requestingEmployee,
      r.receiptNumber,
    ].some(v => (v ?? '').toLowerCase().includes(q)))
  }, [rows, nameSearch])

  const statusBadge = (s: ReconciliationStatus | null) => {
    const labels: Record<ReconciliationStatus, string> = {
      NOT_STARTED: '⬜ Not Started',
      PARTIALLY_RECEIPTED: '🟡 Partial',
      PENDING_REVIEW: '🔵 Pending Review',
      FULLY_RECEIPTED: '🟢 Fully Receipted',
      OVER_LIMIT: '🔴 Over Limit',
    }
    return <span className="text-xs whitespace-nowrap">{s ? labels[s] : '—'}</span>
  }

  return (
    <ContentLayout title="🧾 Receipts Report" subtitle="Where Combo Pay and advance funds actually went — by supplier, person, and expense type">
      <div className="space-y-6">
        <Link href="/expense-accounts/reports" className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Back to Reports Hub
        </Link>

        {/* Always-visible search — not tucked inside the collapsed filters,
            since it's the control people reach for most on this report. */}
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
          </svg>
          <input
            type="text"
            value={nameSearch}
            onChange={e => setNameSearch(e.target.value)}
            placeholder="Search by payee, description, receipt #…"
            className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        <DateRangeSelector
          value={dateRange}
          onChange={setDateRange}
          showAllTime
          allTime={allTime}
          onAllTimeChange={setAllTime}
        />

        {/* Filters */}
        <CollapsibleSection
          title="Filters"
          icon="🔎"
          badge={statusTab !== 'ALL' ? (
            <span className="px-1.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-xs font-semibold">Active</span>
          ) : undefined}
        >
          <div className="space-y-3">
            <div className="flex gap-2 flex-wrap">
              {STATUS_TABS.map(tab => (
                <button
                  key={tab.value}
                  onClick={() => setStatusTab(tab.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    statusTab === tab.value
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => { setStatusTab('ALL'); setNameSearch(''); setAllTime(true); setDateRange(defaultDateRange()) }}
              className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              Reset
            </button>
          </div>
        </CollapsibleSection>

        {/* Summary cards */}
        {summary && (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border-l-4 border-red-500">
              <p className="text-xs text-gray-500 dark:text-gray-400">💰 Total Spend</p>
              <p className="text-xl font-bold text-red-600 dark:text-red-400 mt-1">{fmt(summary.totalSpend)}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border-l-4 border-blue-500">
              <p className="text-xs text-gray-500 dark:text-gray-400">🧾 Receipts</p>
              <p className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-1">{summary.count}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border-l-4 border-purple-500">
              <p className="text-xs text-gray-500 dark:text-gray-400">🏷️ Top Type</p>
              <p className="text-xl font-bold text-purple-600 dark:text-purple-400 mt-1 truncate">
                {summary.byType[0] ? `${summary.byType[0].type} (${fmt(summary.byType[0].amount)})` : '—'}
              </p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
          </div>
        ) : visibleRows.length === 0 ? (
          <div className="text-center py-16 text-gray-500 dark:text-gray-400">No receipts match these filters</div>
        ) : (
          <>
            {/* Breakdown by expense type */}
            {summary && summary.byType.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">Spend by Expense Type</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Type</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {summary.byType.map(t => (
                        <tr key={t.type} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <td className="px-4 py-3 text-gray-900 dark:text-gray-100">{t.type}</td>
                          <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-gray-100">{fmt(t.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Receipt-level detail */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">Receipts</h3>
              </div>
              {/* Mobile card list (MBM-299 responsive-reports template — see
                  src/app/inventory/reports/pricing-exceptions/page.tsx) */}
              <div className="sm:hidden divide-y divide-gray-200 dark:divide-gray-700">
                {visibleRows.map(r => (
                  <div key={r.receiptId} className="p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-900 dark:text-gray-100">{r.supplierOrPersonName ?? '—'}</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">{fmt(r.receiptAmount)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500 dark:text-gray-400">{fmtDate(r.receiptDate)}</span>
                      {statusBadge(r.reconciliationStatus)}
                    </div>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400">Combo Request</p>
                        <p className="text-gray-600 dark:text-gray-300">{r.comboRequestTitle ?? '—'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400">Type</p>
                        <p className="text-gray-600 dark:text-gray-300">{r.expenseType ?? '—'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400">Business</p>
                        <p className="text-gray-500 dark:text-gray-400">{r.business ?? '—'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400">Requester</p>
                        <p className="text-gray-500 dark:text-gray-400">{r.requestingEmployee}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400">Outstanding</p>
                        <p className={`font-medium ${r.outstandingBalance !== null && r.outstandingBalance < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}>
                          {r.outstandingBalance !== null ? fmt(r.outstandingBalance) : '—'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Supplier / Person</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Combo Request</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Receipt Date</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Amount</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Business</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Requester</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Outstanding</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {visibleRows.map(r => (
                      <tr key={r.receiptId} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{r.supplierOrPersonName ?? '—'}</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{r.comboRequestTitle ?? '—'}</td>
                        <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{fmtDate(r.receiptDate)}</td>
                        <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-gray-100">{fmt(r.receiptAmount)}</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{r.expenseType ?? '—'}</td>
                        <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{r.business ?? '—'}</td>
                        <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{r.requestingEmployee}</td>
                        <td className="px-4 py-3 text-center">{statusBadge(r.reconciliationStatus)}</td>
                        <td className={`px-4 py-3 text-right font-medium ${r.outstandingBalance !== null && r.outstandingBalance < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}>
                          {r.outstandingBalance !== null ? fmt(r.outstandingBalance) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </ContentLayout>
  )
}
