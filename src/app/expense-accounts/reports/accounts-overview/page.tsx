'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { ContentLayout } from '@/components/layout/content-layout'
import { DateInput } from '@/components/ui/date-input'
import { getEffectivePermissions } from '@/lib/permission-utils'
import { formatDate } from '@/lib/date-format'
import Link from 'next/link'

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
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

  const toDateStr = (d: Date) => d.toISOString().split('T')[0]
  const applyQuickFilter = (days: number | 'today' | 'yesterday') => {
    const today = new Date(); today.setHours(0, 0, 0, 0)
    if (days === 'today') { setStartDate(toDateStr(today)); setEndDate(toDateStr(today)) }
    else if (days === 'yesterday') { const y = new Date(today); y.setDate(y.getDate() - 1); setStartDate(toDateStr(y)); setEndDate(toDateStr(y)) }
    else { const f = new Date(today); f.setDate(f.getDate() - days + 1); setStartDate(toDateStr(f)); setEndDate(toDateStr(today)) }
  }
  const QUICK_FILTERS = [
    { label: 'Today', action: () => applyQuickFilter('today') },
    { label: 'Yesterday', action: () => applyQuickFilter('yesterday') },
    { label: '7 Days', action: () => applyQuickFilter(7) },
    { label: '30 Days', action: () => applyQuickFilter(30) },
    { label: '90 Days', action: () => applyQuickFilter(90) },
  ]

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/signin')
  }, [status, router])

  useEffect(() => {
    if (status !== 'authenticated') return
    const permissions = getEffectivePermissions(session?.user)
    if (!permissions.canViewExpenseReports) { router.push('/expense-accounts'); return }
    loadReport()
  }, [status, session, startDate, endDate])

  const loadReport = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (startDate) params.append('startDate', startDate)
      if (endDate) params.append('endDate', endDate)
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
    <ContentLayout title="Accounts Overview" subtitle="Balance, deposits and payments across all expense accounts">
      <div className="space-y-6">
        <Link href="/expense-accounts/reports" className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Back to Reports Hub
        </Link>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex gap-1.5 flex-wrap mb-3">
            {QUICK_FILTERS.map((f) => (
              <button key={f.label} onClick={f.action} className="px-3 py-1 text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:text-blue-700 dark:hover:text-blue-300 transition-colors">{f.label}</button>
            ))}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date</label>
              <DateInput value={startDate} onChange={setStartDate} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End Date</label>
              <DateInput value={endDate} onChange={setEndDate} />
            </div>
            <div className="flex items-end">
              <button
                onClick={() => { setStartDate(''); setEndDate('') }}
                className="w-full px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                Reset
              </button>
            </div>
          </div>
        </div>

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
              <p className="text-xs text-gray-400 mt-0.5">{startDate || endDate ? 'for selected period' : 'all time'}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border-l-4 border-red-500">
              <p className="text-xs text-gray-500 dark:text-gray-400">Total Payments</p>
              <p className="text-xl font-bold text-red-600 dark:text-red-400 mt-1">{formatCurrency(totals.totalPayments)}</p>
              <p className="text-xs text-gray-400 mt-0.5">{startDate || endDate ? 'for selected period' : 'all time'}</p>
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
          ) : (
            <div className="overflow-x-auto">
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
                  {accounts.map((a) => (
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
          )}
        </div>
      </div>
    </ContentLayout>
  )
}
