'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ContentLayout } from '@/components/layout/content-layout'
import { CollapsibleSection } from '@/components/ui/collapsible-section'
import { DateRangeSelector, DateRange } from '@/components/reports/date-range-selector'
import { getEffectivePermissions } from '@/lib/permission-utils'
import { ViewReceiptsModal } from '@/components/expense-account/view-receipts-modal'

function toISODate(d: Date) {
  return d.toISOString().split('T')[0]
}

function defaultDateRange(): DateRange {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - 30)
  return { start, end }
}

type FlagStatus = 'NOT_STARTED' | 'PARTIALLY_RECEIPTED'

const STATUS_TABS: { label: string; value: FlagStatus | 'ALL' }[] = [
  { label: 'All Flagged', value: 'ALL' },
  { label: '⬜ No Receipts', value: 'NOT_STARTED' },
  { label: '🟡 Partial', value: 'PARTIALLY_RECEIPTED' },
]

const STATUS_LABELS: Record<FlagStatus, string> = {
  NOT_STARTED: '⬜ No Receipts',
  PARTIALLY_RECEIPTED: '🟡 Partial',
}

interface PayeeRef { type: string; id: string; name: string }

interface MissingReceiptRow {
  paymentId: string
  date: string
  business: string | null
  account: string
  payee: string | null
  payeeRef: PayeeRef | null
  category: string | null
  subcategory: string | null
  amount: number
  expected: number
  receiptTotal: number
  outstanding: number
  status: FlagStatus
  requestedBy: string
  notes: string | null
  daysSincePaid: number
}

export default function MissingReceiptsReportPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [rows, setRows] = useState<MissingReceiptRow[]>([])
  const [summary, setSummary] = useState<{ count: number; totalOutstanding: number; totalPaymentAmount: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState<DateRange>(defaultDateRange())
  const [allTime, setAllTime] = useState(false)
  const [statusTab, setStatusTab] = useState<FlagStatus | 'ALL'>('ALL')
  const [nameSearch, setNameSearch] = useState('')
  const [activeReceiptsPayment, setActiveReceiptsPayment] = useState<MissingReceiptRow | null>(null)

  const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
  const fmtDate = (s: string) => new Date(s).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })

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
      const res = await fetch(`/api/expense-account/reports/missing-receipts?${params}`, { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setRows(data.data?.rows ?? [])
        setSummary(data.data?.summary ?? null)
      }
    } catch (e) {
      console.error('Error loading missing-receipts report:', e)
    } finally {
      setLoading(false)
    }
  }

  const visibleRows = useMemo(() => {
    if (!nameSearch.trim()) return rows
    const q = nameSearch.trim().toLowerCase()
    return rows.filter(r => [r.payee, r.business, r.category, r.requestedBy, r.notes].some(v => (v ?? '').toLowerCase().includes(q)))
  }, [rows, nameSearch])

  const statusBadge = (s: FlagStatus) => <span className="text-xs whitespace-nowrap">{STATUS_LABELS[s]}</span>

  return (
    <ContentLayout title="🚩 Missing / Partial Receipts" subtitle="Payments with no receipts, or receipts that don't cover the full amount — a worklist, not a spend breakdown">
      <div className="space-y-6">
        <Link href="/expense-accounts/reports" className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Back to Reports Hub
        </Link>

        <p className="text-xs text-gray-500 dark:text-gray-400 -mt-2">
          Scope: PAID/SUBMITTED/APPROVED regular payments only — internal transfers and loan movements don&apos;t need a
          receipt, so they&apos;re excluded. Payments already fully receipted but awaiting approval aren&apos;t flagged here
          either — see the <Link href="/expense-accounts/reports/receipts" className="underline">Receipts Report</Link> for those.
        </p>

        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
          </svg>
          <input
            type="text"
            value={nameSearch}
            onChange={e => setNameSearch(e.target.value)}
            placeholder="Search by payee, business, category…"
            className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        <DateRangeSelector
          value={dateRange}
          onChange={setDateRange}
          showAllTime
          allTime={allTime}
          onAllTimeChange={setAllTime}
        />

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
                      ? 'bg-amber-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => { setStatusTab('ALL'); setNameSearch(''); setAllTime(false); setDateRange(defaultDateRange()) }}
              className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              Reset
            </button>
          </div>
        </CollapsibleSection>

        {summary && (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border-l-4 border-amber-500">
              <p className="text-xs text-gray-500 dark:text-gray-400">🚩 Flagged Payments</p>
              <p className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-1">{summary.count}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border-l-4 border-red-500">
              <p className="text-xs text-gray-500 dark:text-gray-400">💰 Total Outstanding</p>
              <p className="text-xl font-bold text-red-600 dark:text-red-400 mt-1">{fmt(summary.totalOutstanding)}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border-l-4 border-gray-400">
              <p className="text-xs text-gray-500 dark:text-gray-400">💵 Total Payment Amount</p>
              <p className="text-xl font-bold text-gray-700 dark:text-gray-300 mt-1">{fmt(summary.totalPaymentAmount)}</p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
          </div>
        ) : visibleRows.length === 0 ? (
          <div className="text-center py-16 text-gray-500 dark:text-gray-400">
            🎉 No flagged payments match these filters — every in-scope payment has full receipt coverage.
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">Flagged Payments — click a row to add/view receipts</h3>
            </div>

            {/* Mobile card list (MBM-299 responsive-reports template) */}
            <div className="sm:hidden divide-y divide-gray-200 dark:divide-gray-700">
              {visibleRows.map(r => (
                <button
                  key={r.paymentId}
                  onClick={() => setActiveReceiptsPayment(r)}
                  className="w-full text-left p-3 space-y-2 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-900 dark:text-gray-100">{r.payee ?? '—'}</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">{fmt(r.amount)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 dark:text-gray-400">{fmtDate(r.date)}</span>
                    {statusBadge(r.status)}
                  </div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400">Category</p>
                      <p className="text-gray-600 dark:text-gray-300">{r.category ?? '—'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400">Business</p>
                      <p className="text-gray-500 dark:text-gray-400">{r.business ?? '—'}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400">Outstanding</p>
                      <p className="font-medium text-red-600 dark:text-red-400">{fmt(r.outstanding)}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Payee</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Category</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Business</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Amount</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Receipted</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Outstanding</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {visibleRows.map(r => (
                    <tr
                      key={r.paymentId}
                      onClick={() => setActiveReceiptsPayment(r)}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                    >
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{fmtDate(r.date)}</td>
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{r.payee ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{r.category ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{r.business ?? '—'}</td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-gray-100">{fmt(r.amount)}</td>
                      <td className="px-4 py-3 text-right text-gray-500 dark:text-gray-400">{fmt(r.receiptTotal)}</td>
                      <td className="px-4 py-3 text-right font-medium text-red-600 dark:text-red-400">{fmt(r.outstanding)}</td>
                      <td className="px-4 py-3 text-center">{statusBadge(r.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {activeReceiptsPayment && (
        <ViewReceiptsModal
          paymentId={activeReceiptsPayment.paymentId}
          paymentAmount={activeReceiptsPayment.amount}
          paymentDescription={activeReceiptsPayment.category ?? 'Payment'}
          paymentPayee={activeReceiptsPayment.payeeRef}
          onClose={() => setActiveReceiptsPayment(null)}
          onReceiptsChanged={() => { loadReport() }}
        />
      )}
    </ContentLayout>
  )
}
