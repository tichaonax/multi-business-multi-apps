'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ContentLayout } from '@/components/layout/content-layout'
import { DateRangeSelector, DateRange } from '@/components/reports/date-range-selector'
import { getEffectivePermissions } from '@/lib/permission-utils'
import { formatDate } from '@/lib/date-format'
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

interface AccountRow {
  id: string
  accountNumber: string
  accountName: string
  accountType: string
  balance: number
  totalDeposits: number
  totalPayments: number
  netChange: number
  depositCount: number
  paymentCount: number
}

interface SystemTotals {
  totalBalance: number
  totalDeposits: number
  totalPayments: number
  netChange: number
  accountCount: number
}

export default function AccountsOverviewReportPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [accounts, setAccounts] = useState<AccountRow[]>([])
  const [totals, setTotals] = useState<SystemTotals | null>(null)
  const [loading, setLoading] = useState(true)
  const searchParams = useSearchParams()
  const hasUrlDates = searchParams.get('startDate') || searchParams.get('endDate')
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    if (hasUrlDates) {
      const s = searchParams.get('startDate')
      const e = searchParams.get('endDate')
      const range = defaultDateRange()
      return { start: s ? new Date(s + 'T00:00:00') : range.start, end: e ? new Date(e + 'T00:00:00') : range.end }
    }
    return defaultDateRange()
  })
  const [allTime, setAllTime] = useState(!hasUrlDates)
  // Optional: scope to a single business when arriving from a drill-down link
  const filterBusinessId = searchParams.get('businessId') ?? ''
  const [nameSearch, setNameSearch] = useState('')

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

  // Search is applied client-side against the already loaded rows.
  const visibleAccounts = useMemo(() => {
    if (!nameSearch.trim()) return accounts
    const q = nameSearch.trim().toLowerCase()
    return accounts.filter(a => a.accountName.toLowerCase().includes(q) || a.accountNumber.toLowerCase().includes(q))
  }, [accounts, nameSearch])

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/signin')
  }, [status, router])

  useEffect(() => {
    if (status !== 'authenticated') return
    const permissions = getEffectivePermissions(session?.user)
    if (!permissions.canViewExpenseReports) { router.push('/expense-accounts'); return }
    loadReport()
  }, [status, session, dateRange, allTime])

  const loadReport = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (!allTime) {
        params.append('startDate', toISODate(dateRange.start))
        params.append('endDate', toISODate(dateRange.end))
      }
      if (filterBusinessId) params.append('businessId', filterBusinessId)
      const res = await fetch(`/api/expense-account/reports/accounts-overview?${params}`, { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setAccounts(data.data?.accounts || [])
        setTotals(data.data?.systemTotals || null)
      }
    } catch (e) {
      console.error('Error loading report:', e)
    } finally {
      setLoading(false)
    }
  }

  return (
      <ContentLayout
        title="Accounts Overview"
        subtitle={filterBusinessId
          ? 'Expense accounts for your selected business'
          : 'Balance, deposits and payments across all expense accounts'
        }
      >
      <div className="space-y-6">
        <Link href="/expense-accounts/reports" className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Back to Reports Hub
        </Link>

        {/* Always-visible search — not tucked inside a collapsed panel,
            since it's the control people reach for most on this report. */}
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
          </svg>
          <input
            type="text"
            value={nameSearch}
            onChange={e => setNameSearch(e.target.value)}
            placeholder="Search by account name or number…"
            className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Filters */}
        <DateRangeSelector
          value={dateRange}
          onChange={setDateRange}
          showAllTime
          allTime={allTime}
          onAllTimeChange={setAllTime}
        />

        {/* System Totals */}
        {totals && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border-l-4 border-blue-500">
              <p className="text-xs text-gray-500 dark:text-gray-400">Total Balance</p>
              <p className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-1">{formatCurrency(totals.totalBalance)}</p>
              <p className="text-xs text-gray-400 mt-0.5">{totals.accountCount} accounts</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border-l-4 border-green-500">
              <p className="text-xs text-gray-500 dark:text-gray-400">Total Deposits</p>
              <p className="text-xl font-bold text-green-600 dark:text-green-400 mt-1">{formatCurrency(totals.totalDeposits)}</p>
              <p className="text-xs text-gray-400 mt-0.5">{!allTime ? 'for selected period' : 'all time'}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border-l-4 border-red-500">
              <p className="text-xs text-gray-500 dark:text-gray-400">Total Payments</p>
              <p className="text-xl font-bold text-red-600 dark:text-red-400 mt-1">{formatCurrency(totals.totalPayments)}</p>
              <p className="text-xs text-gray-400 mt-0.5">{!allTime ? 'for selected period' : 'all time'}</p>
            </div>
            <div className={`bg-white dark:bg-gray-800 rounded-lg shadow p-4 border-l-4 ${totals.netChange >= 0 ? 'border-teal-500' : 'border-orange-500'}`}>
              <p className="text-xs text-gray-500 dark:text-gray-400">Net Change</p>
              <p className={`text-xl font-bold mt-1 ${totals.netChange >= 0 ? 'text-teal-600 dark:text-teal-400' : 'text-orange-600 dark:text-orange-400'}`}>
                {formatCurrency(totals.netChange)}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">deposits − payments</p>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : accounts.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">No accounts found</div>
          ) : visibleAccounts.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">No accounts match "{nameSearch}"</div>
          ) : (
            <>
              {/* Mobile card list (MBM-299 responsive-reports template) */}
              <div className="sm:hidden divide-y divide-gray-200 dark:divide-gray-700">
                {visibleAccounts.map((a) => (
                  <div key={a.id} className="p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <Link href={`/expense-accounts/${a.id}`} className="font-medium text-blue-600 dark:text-blue-400 hover:underline">
                          {a.accountName}
                        </Link>
                        <div className="text-xs text-gray-400">{a.accountNumber}</div>
                      </div>
                      <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${
                        a.accountType === 'PERSONAL'
                          ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                          : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                      }`}>
                        {a.accountType === 'PERSONAL' ? '👤 Personal' : '🏢 General'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-2 pt-1">
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400">Balance</p>
                        <p className="font-medium text-gray-900 dark:text-gray-100">{formatCurrency(a.balance)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400">Txns</p>
                        <p className="text-gray-500 dark:text-gray-400">{a.depositCount + a.paymentCount}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400">Deposits</p>
                        <p className="text-green-600 dark:text-green-400">{formatCurrency(a.totalDeposits)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400">Payments</p>
                        <p className="text-red-600 dark:text-red-400">{formatCurrency(a.totalPayments)}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400">Net Change</p>
                        <p className={`font-medium ${a.netChange >= 0 ? 'text-teal-600 dark:text-teal-400' : 'text-orange-600 dark:text-orange-400'}`}>
                          {a.netChange >= 0 ? '+' : ''}{formatCurrency(a.netChange)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop/tablet table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Account</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Type</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Balance</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Deposits</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Payments</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Net Change</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Txns</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {visibleAccounts.map((a) => (
                      <tr key={a.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-4 py-3">
                          <Link href={`/expense-accounts/${a.id}`} className="font-medium text-blue-600 dark:text-blue-400 hover:underline">
                            {a.accountName}
                          </Link>
                          <div className="text-xs text-gray-400">{a.accountNumber}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            a.accountType === 'PERSONAL'
                              ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                              : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                          }`}>
                            {a.accountType === 'PERSONAL' ? '👤 Personal' : '🏢 General'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-gray-100">{formatCurrency(a.balance)}</td>
                        <td className="px-4 py-3 text-right text-green-600 dark:text-green-400">{formatCurrency(a.totalDeposits)}</td>
                        <td className="px-4 py-3 text-right text-red-600 dark:text-red-400">{formatCurrency(a.totalPayments)}</td>
                        <td className={`px-4 py-3 text-right font-medium ${a.netChange >= 0 ? 'text-teal-600 dark:text-teal-400' : 'text-orange-600 dark:text-orange-400'}`}>
                          {a.netChange >= 0 ? '+' : ''}{formatCurrency(a.netChange)}
                        </td>
                        <td className="px-4 py-3 text-center text-gray-500 dark:text-gray-400 text-xs">
                          {a.depositCount + a.paymentCount}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </ContentLayout>
  )
}
