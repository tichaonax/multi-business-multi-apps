'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ContentLayout } from '@/components/layout/content-layout'
import { DateRangeSelector, DateRange } from '@/components/reports/date-range-selector'
import { getEffectivePermissions } from '@/lib/permission-utils'

function toISODate(d: Date) {
  return d.toISOString().split('T')[0]
}

function defaultDateRange(): DateRange {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - 90)
  return { start, end }
}

interface UnaccountedItem {
  id: string
  description: string
  targetAmount: number
  receiptedAmount: number
  noReceiptReason: string | null
}

interface ComboMissingReceiptRow {
  requestId: string
  title: string
  status: string
  date: string
  business: string | null
  accountId: string
  account: string
  requestedBy: string
  total: number
  unaccountedCount: number
  unaccountedTotal: number
  unaccountedItems: UnaccountedItem[]
}

const STATUS_LABELS: Record<string, string> = {
  APPROVED: 'Approved',
  PARTIALLY_APPROVED: 'Partially Approved',
  PARTIALLY_PAID: 'Partially Paid',
  PAID: 'Paid',
}

export default function ComboMissingReceiptsReportPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [rows, setRows] = useState<ComboMissingReceiptRow[]>([])
  const [summary, setSummary] = useState<{ count: number; totalUnaccounted: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState<DateRange>(defaultDateRange())
  const [allTime, setAllTime] = useState(true)
  const [nameSearch, setNameSearch] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

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
  }, [status, session, dateRange, allTime])

  async function loadReport() {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (!allTime) {
        params.append('dateFrom', toISODate(dateRange.start))
        params.append('dateTo', toISODate(dateRange.end))
      }
      const res = await fetch(`/api/expense-account/reports/combo-missing-receipts?${params}`, { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setRows(data.data?.rows ?? [])
        setSummary(data.data?.summary ?? null)
      }
    } catch (e) {
      console.error('Error loading combo-missing-receipts report:', e)
    } finally {
      setLoading(false)
    }
  }

  const visibleRows = useMemo(() => {
    if (!nameSearch.trim()) return rows
    const q = nameSearch.trim().toLowerCase()
    return rows.filter(r => [r.title, r.business, r.account, r.requestedBy].some(v => (v ?? '').toLowerCase().includes(q)))
  }, [rows, nameSearch])

  return (
    <ContentLayout title="🚩 Combo Requests Missing Receipts" subtitle="Funded combo requests with at least one planned item that has neither a receipt nor a 'no receipt' explanation">
      <div className="space-y-6">
        <Link href="/expense-accounts/reports" className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Back to Reports Hub
        </Link>

        <p className="text-xs text-gray-500 dark:text-gray-400 -mt-2">
          Scope: combo requests with funds already released (Approved, Partially Approved, Partially Paid, or Paid).
          An item counts as accounted for once its receipts total its approved/estimated amount, or it&apos;s been marked
          &ldquo;No Receipt&rdquo; with a reason. See the{' '}
          <Link href="/expense-accounts/reports/missing-receipts" className="underline">generic Missing Receipts report</Link>{' '}
          for payment-level (non-itemized) coverage.
        </p>

        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
          </svg>
          <input
            type="text"
            value={nameSearch}
            onChange={e => setNameSearch(e.target.value)}
            placeholder="Search by title, business, account, requester…"
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

        {summary && (
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border-l-4 border-amber-500">
              <p className="text-xs text-gray-500 dark:text-gray-400">🚩 Flagged Requests</p>
              <p className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-1">{summary.count}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border-l-4 border-red-500">
              <p className="text-xs text-gray-500 dark:text-gray-400">💰 Total Unaccounted</p>
              <p className="text-xl font-bold text-red-600 dark:text-red-400 mt-1">{fmt(summary.totalUnaccounted)}</p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
          </div>
        ) : visibleRows.length === 0 ? (
          <div className="text-center py-16 text-gray-500 dark:text-gray-400">
            🎉 No flagged requests match these filters — every funded combo request is fully accounted for.
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden divide-y divide-gray-200 dark:divide-gray-700">
            {visibleRows.map(r => (
              <div key={r.requestId}>
                <button
                  onClick={() => setExpandedId(expandedId === r.requestId ? null : r.requestId)}
                  className="w-full text-left p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-gray-900 dark:text-gray-100 truncate">{r.title}</span>
                      <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                        {STATUS_LABELS[r.status] ?? r.status}
                      </span>
                      <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 whitespace-nowrap">
                        {r.unaccountedCount} item{r.unaccountedCount === 1 ? '' : 's'} unaccounted
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {fmtDate(r.date)} · {r.requestedBy} · {r.account}{r.business ? ` (${r.business})` : ''}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">{fmt(r.total)}</div>
                    <div className="text-xs text-red-600 dark:text-red-400">{fmt(r.unaccountedTotal)} unaccounted</div>
                  </div>
                </button>
                {expandedId === r.requestId && (
                  <div className="px-4 pb-4 pl-8 space-y-1.5">
                    {r.unaccountedItems.map(item => (
                      <div key={item.id} className="flex items-center justify-between text-sm py-1 border-b border-gray-100 dark:border-gray-700 last:border-0">
                        <span className="text-gray-700 dark:text-gray-300">{item.description}</span>
                        <span className="text-gray-500 dark:text-gray-400 text-xs">
                          {item.receiptedAmount > 0 ? `${fmt(item.receiptedAmount)} of ${fmt(item.targetAmount)}` : fmt(item.targetAmount)}
                        </span>
                      </div>
                    ))}
                    <Link
                      href={`/expense-accounts/${r.accountId}/combo-requests/${r.requestId}`}
                      className="inline-block mt-2 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Open request →
                    </Link>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </ContentLayout>
  )
}
