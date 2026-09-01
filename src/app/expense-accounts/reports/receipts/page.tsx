'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { ContentLayout } from '@/components/layout/content-layout'
import { DateInput } from '@/components/ui/date-input'
import { getEffectivePermissions } from '@/lib/permission-utils'
import Link from 'next/link'

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
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
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
  }, [status, session, dateFrom, dateTo, statusTab])

  async function loadReport() {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (dateFrom) params.append('dateFrom', dateFrom)
      if (dateTo) params.append('dateTo', dateTo)
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

  // Supplier/person name filter is applied client-side against the already
  // loaded rows — the dataset behind a report view is small enough that a
  // second search round-trip isn't worth the extra complexity.
  const visibleRows = useMemo(() => {
    if (!nameSearch.trim()) return rows
    const q = nameSearch.trim().toLowerCase()
    return rows.filter(r => (r.supplierOrPersonName ?? '').toLowerCase().includes(q))
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

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 space-y-3">
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Supplier / Person</label>
              <input
                type="text"
                value={nameSearch}
                onChange={e => setNameSearch(e.target.value)}
                placeholder="Filter by name…"
                className="input w-full px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">From</label>
              <DateInput value={dateFrom} onChange={setDateFrom} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">To</label>
              <DateInput value={dateTo} onChange={setDateTo} />
            </div>
            <div className="flex items-end">
              <button
                onClick={() => { setDateFrom(''); setDateTo(''); setStatusTab('ALL'); setNameSearch('') }}
                className="w-full px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                Reset
              </button>
            </div>
          </div>
        </div>

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
              <div className="overflow-x-auto">
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
