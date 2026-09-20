'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { ContentLayout } from '@/components/layout/content-layout'
import { CollapsibleSection } from '@/components/ui/collapsible-section'
import { DateRangeSelector, DateRange } from '@/components/reports/date-range-selector'
import { getEffectivePermissions } from '@/lib/permission-utils'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
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

const PAYEE_TYPE_TABS = [
  { label: 'All', value: 'ALL' },
  { label: 'Contractors', value: 'PERSON' },
  { label: 'Suppliers', value: 'SUPPLIER' },
  { label: 'Employees', value: 'EMPLOYEE' },
  { label: 'Businesses', value: 'BUSINESS' },
  { label: 'Users', value: 'USER' },
]

interface PayeeRow {
  payeeType: string
  payeeId: string
  payeeName: string
  totalAmount: number
  paymentCount: number
}

interface PayeeTypeRow {
  payeeType: string
  totalAmount: number
  paymentCount: number
}

interface SystemTotals {
  totalPaid: number
  uniquePayees: number
  topPayee: string | null
}

interface PayeePayment {
  id: string
  amount: number
  paymentDate: string
  category: { id: string; name: string; emoji: string } | null
  receiptNumber: string | null
  notes: string | null
  status: string
  expenseAccount: { id: string; accountName: string; accountNumber: string }
  createdBy: { id: string; name: string } | null
}

interface PayeeDetail {
  payee: { id: string; type: string; name: string }
  totalPaid: number
  paymentCount: number
  accountsCount: number
  payments: PayeePayment[]
  pagination: { total: number; limit: number; offset: number; hasMore: boolean }
}

function payeeTypeBadge(type: string) {
  const styles: Record<string, string> = {
    EMPLOYEE: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    PERSON: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    BUSINESS: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
    USER: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  }
  const labels: Record<string, string> = {
    EMPLOYEE: 'Employee', PERSON: 'Person', BUSINESS: 'Business', USER: 'User',
  }
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[type] || 'bg-gray-100 text-gray-600'}`}>
      {labels[type] || type}
    </span>
  )
}

export default function PayeeAnalysisReportPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [byPayee, setByPayee] = useState<PayeeRow[]>([])
  const [byPayeeType, setByPayeeType] = useState<PayeeTypeRow[]>([])
  const [totals, setTotals] = useState<SystemTotals | null>(null)
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState<DateRange>(defaultDateRange())
  const [allTime, setAllTime] = useState(true)
  const [payeeType, setPayeeType] = useState('ALL')
  const [nameSearch, setNameSearch] = useState('')

  // Payee payment-history popup — clicking a payee name opens this instead of
  // navigating away, so the user never loses their place in this report.
  const [viewPayee, setViewPayee] = useState<PayeeRow | null>(null)
  const [viewDetail, setViewDetail] = useState<PayeeDetail | null>(null)
  const [viewLoading, setViewLoading] = useState(false)
  const [viewError, setViewError] = useState<string | null>(null)

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

  const formatDateTime = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  const openPayeePayments = async (p: PayeeRow) => {
    setViewPayee(p)
    setViewDetail(null)
    setViewError(null)
    setViewLoading(true)
    try {
      const params = new URLSearchParams({ limit: '50' })
      if (!allTime) {
        params.append('startDate', toISODate(dateRange.start))
        params.append('endDate', toISODate(dateRange.end))
      }
      const res = await fetch(`/api/expense-account/payees/${p.payeeType}/${p.payeeId}/payments?${params}`, { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setViewDetail(data.data)
      } else {
        const err = await res.json().catch(() => ({}))
        setViewError(err?.error || `Failed to load payments (HTTP ${res.status})`)
      }
    } catch {
      setViewError('Network error — could not load payments')
    } finally {
      setViewLoading(false)
    }
  }

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/signin')
  }, [status, router])

  useEffect(() => {
    if (status !== 'authenticated') return
    const permissions = getEffectivePermissions(session?.user)
    if (!permissions.canViewExpenseReports) { router.push('/expense-accounts'); return }
    loadReport()
  }, [status, session, payeeType, dateRange, allTime])

  const loadReport = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (!allTime) {
        params.append('startDate', toISODate(dateRange.start))
        params.append('endDate', toISODate(dateRange.end))
      }
      if (payeeType !== 'ALL') params.append('payeeType', payeeType)
      const res = await fetch(`/api/expense-account/reports/payees?${params}`, { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setByPayee(data.data?.byPayee || [])
        setByPayeeType(data.data?.byPayeeType || [])
        setTotals(data.data?.systemTotals || null)
      }
    } catch (e) {
      console.error('Error loading report:', e)
    } finally {
      setLoading(false)
    }
  }

  const chartData = byPayee.slice(0, 10).map((p) => ({
    name: p.payeeName.length > 14 ? p.payeeName.slice(0, 14) + '…' : p.payeeName,
    amount: p.totalAmount,
    payeeType: p.payeeType,
    payeeId: p.payeeId,
    fullName: p.payeeName,
    paymentCount: p.paymentCount,
  }))

  // Search is applied client-side against the already loaded rows. Rank is
  // captured before filtering so a search doesn't renumber the "Top Payees"
  // ranking (e.g. #3 stays #3 even if #1 and #2 are filtered out).
  const rankedPayee = useMemo(() => byPayee.map((p, i) => ({ ...p, rank: i + 1 })), [byPayee])
  const visiblePayees = useMemo(() => {
    if (!nameSearch.trim()) return rankedPayee
    const q = nameSearch.trim().toLowerCase()
    return rankedPayee.filter(p => p.payeeName.toLowerCase().includes(q))
  }, [rankedPayee, nameSearch])

  return (
    <ContentLayout title="Payee Analysis" subtitle="Top payees across all expense accounts">
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
            placeholder="Search by payee…"
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
          badge={payeeType !== 'ALL' ? (
            <span className="px-1.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-xs font-semibold">Active</span>
          ) : undefined}
        >
          <div className="space-y-3">
            <div className="flex gap-2 flex-wrap">
              {PAYEE_TYPE_TABS.map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => setPayeeType(tab.value)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    payeeType === tab.value
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => { setPayeeType('ALL'); setAllTime(true); setDateRange(defaultDateRange()) }}
              className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              Reset
            </button>
          </div>
        </CollapsibleSection>

        {/* Summary cards */}
        {totals && (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border-l-4 border-red-500">
              <p className="text-xs text-gray-500 dark:text-gray-400">Total Paid</p>
              <p className="text-xl font-bold text-red-600 dark:text-red-400 mt-1">{formatCurrency(totals.totalPaid)}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border-l-4 border-green-500">
              <p className="text-xs text-gray-500 dark:text-gray-400">Unique Payees</p>
              <p className="text-xl font-bold text-green-600 dark:text-green-400 mt-1">{totals.uniquePayees}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border-l-4 border-purple-500">
              <p className="text-xs text-gray-500 dark:text-gray-400">Top Payee</p>
              <p className="text-xl font-bold text-purple-600 dark:text-purple-400 mt-1 truncate">{totals.topPayee || '—'}</p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
          </div>
        ) : byPayee.length === 0 ? (
          <div className="text-center py-16 text-gray-500 dark:text-gray-400">No payee data found</div>
        ) : (
          <>
            {/* Bar chart: top 10 */}
            {chartData.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm mb-4">Top 10 Payees by Amount <span className="text-xs font-normal text-gray-400">(click a bar for details)</span></h3>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={chartData} margin={{ left: 10, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-25} textAnchor="end" height={50} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: any) => formatCurrency(v)} />
                    <Bar
                      dataKey="amount"
                      fill="#87B5A5"
                      radius={[4, 4, 0, 0]}
                      cursor="pointer"
                      onClick={(entry: any) => {
                        const d = entry?.payload ?? entry
                        openPayeePayments({ payeeType: d.payeeType, payeeId: d.payeeId, payeeName: d.fullName, totalAmount: d.amount, paymentCount: d.paymentCount })
                      }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Main payee table */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">All Payees</h3>
              </div>
              {visiblePayees.length === 0 && (
                <div className="text-center py-8 text-sm text-gray-400">No payees match "{nameSearch}"</div>
              )}
              {/* Mobile card list (MBM-299 responsive-reports template — see
                  src/app/inventory/reports/pricing-exceptions/page.tsx) */}
              <div className="sm:hidden divide-y divide-gray-200 dark:divide-gray-700">
                {visiblePayees.map((p) => (
                  <div key={`${p.payeeType}-${p.payeeId}`} className="p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => openPayeePayments(p)}
                        className="font-medium text-blue-600 dark:text-blue-400 hover:underline text-left"
                      >
                        <span className="text-xs text-gray-400 mr-1">#{p.rank}</span>
                        {p.payeeName}
                      </button>
                      <span className="font-medium text-red-600 dark:text-red-400 shrink-0">{formatCurrency(p.totalAmount)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      {payeeTypeBadge(p.payeeType)}
                      <span className="text-xs text-gray-500 dark:text-gray-400">{p.paymentCount} payment{p.paymentCount === 1 ? '' : 's'}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase w-10">Rank</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Payee</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Type</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Total Paid</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase"># Payments</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {visiblePayees.map((p) => (
                      <tr key={`${p.payeeType}-${p.payeeId}`} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-4 py-3 text-center text-xs text-gray-400">#{p.rank}</td>
                        <td className="px-4 py-3 font-medium">
                          <button
                            type="button"
                            onClick={() => openPayeePayments(p)}
                            className="text-blue-600 dark:text-blue-400 hover:underline text-left"
                          >
                            {p.payeeName}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-center">{payeeTypeBadge(p.payeeType)}</td>
                        <td className="px-4 py-3 text-right font-medium text-red-600 dark:text-red-400">{formatCurrency(p.totalAmount)}</td>
                        <td className="px-4 py-3 text-center text-gray-500 dark:text-gray-400">{p.paymentCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* By payee type breakdown */}
            {byPayeeType.length > 1 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">By Payee Type</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Type</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Total Paid</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase"># Payments</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {byPayeeType.map((t) => (
                        <tr key={t.payeeType} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <td className="px-4 py-3">{payeeTypeBadge(t.payeeType)}</td>
                          <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-gray-100">{formatCurrency(t.totalAmount)}</td>
                          <td className="px-4 py-3 text-center text-gray-500 dark:text-gray-400">{t.paymentCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Payee payment-history popup — keeps the user on this report instead
          of navigating away; "View Full History" is the only escape hatch. */}
      {viewPayee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setViewPayee(null)}>
          <div
            className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{viewPayee.payeeName}</h3>
                  {payeeTypeBadge(viewPayee.payeeType)}
                </div>
                {viewDetail && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {formatCurrency(viewDetail.totalPaid)} · {viewDetail.paymentCount} payment{viewDetail.paymentCount === 1 ? '' : 's'} · {viewDetail.accountsCount} account{viewDetail.accountsCount === 1 ? '' : 's'}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setViewPayee(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl leading-none shrink-0"
              >
                ×
              </button>
            </div>

            <div className="overflow-y-auto flex-1 px-5 py-3">
              {viewLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600"></div>
                </div>
              ) : viewError ? (
                <div className="text-center py-8 text-sm text-red-500">{viewError}</div>
              ) : !viewDetail || viewDetail.payments.length === 0 ? (
                <div className="text-center py-8 text-sm text-gray-400">No payments found for this payee{!allTime ? ' in the selected date range' : ''}</div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {viewDetail.payments.map(pmt => (
                    <div key={pmt.id} className="py-3 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {pmt.category ? `${pmt.category.emoji} ${pmt.category.name}` : 'Uncategorized'}
                        </span>
                        <span className="text-sm font-medium text-red-600 dark:text-red-400 shrink-0">{formatCurrency(pmt.amount)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2 text-xs text-gray-500 dark:text-gray-400">
                        <span>{formatDateTime(pmt.paymentDate)} · {pmt.expenseAccount.accountName}</span>
                        <span className="capitalize">{pmt.status.toLowerCase()}</span>
                      </div>
                      {pmt.notes && (
                        <p className="text-xs text-gray-600 dark:text-gray-300">{pmt.notes}</p>
                      )}
                      {pmt.receiptNumber && (
                        <p className="text-xs text-gray-400">Receipt #{pmt.receiptNumber}</p>
                      )}
                    </div>
                  ))}
                  {viewDetail.pagination.hasMore && (
                    <p className="text-xs text-gray-400 text-center pt-3">Showing first {viewDetail.pagination.limit} payments — use "View Full History" for more.</p>
                  )}
                </div>
              )}
            </div>

            <div className="px-5 py-3 border-t border-gray-200 dark:border-gray-700 shrink-0">
              <Link
                href={`/expense-accounts/reports/payee-history?payeeType=${viewPayee.payeeType}&payeeId=${viewPayee.payeeId}&payeeName=${encodeURIComponent(viewPayee.payeeName)}${allTime ? '&allTime=true' : ''}`}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                View Full History →
              </Link>
            </div>
          </div>
        </div>
      )}
    </ContentLayout>
  )
}
