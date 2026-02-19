'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { ContentLayout } from '@/components/layout/content-layout'
import { getEffectivePermissions } from '@/lib/permission-utils'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import Link from 'next/link'

interface MonthRow {
  month: string
  label: string
  totalDeposits: number
  totalPayments: number
  netChange: number
}

interface YearlyTotals {
  totalDeposits: number
  totalPayments: number
  netChange: number
  bestMonth: string | null
  worstMonth: string | null
}

interface AccountOption {
  id: string
  accountName: string
  accountNumber: string
}

export default function MonthlyTrendsReportPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [monthly, setMonthly] = useState<MonthRow[]>([])
  const [yearlyTotals, setYearlyTotals] = useState<YearlyTotals | null>(null)
  const [accounts, setAccounts] = useState<AccountOption[]>([])
  const [loading, setLoading] = useState(true)
  const [year, setYear] = useState(new Date().getFullYear())
  const [accountId, setAccountId] = useState('')

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/signin')
  }, [status, router])

  useEffect(() => {
    if (status !== 'authenticated') return
    const permissions = getEffectivePermissions(session?.user)
    if (!permissions.canViewExpenseReports) { router.push('/expense-accounts'); return }
    loadAccounts()
    loadReport()
  }, [status, session])

  useEffect(() => {
    if (status !== 'authenticated') return
    loadReport()
  }, [year, accountId])

  const loadAccounts = async () => {
    try {
      const res = await fetch('/api/expense-account?limit=100', { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setAccounts((data.data || []).map((a: any) => ({
          id: a.id,
          accountName: a.accountName,
          accountNumber: a.accountNumber,
        })))
      }
    } catch (e) {
      console.error('Error loading accounts:', e)
    }
  }

  const loadReport = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({ year: String(year) })
      if (accountId) params.append('accountId', accountId)
      const res = await fetch(`/api/expense-account/reports/trends?${params}`, { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setMonthly(data.data?.monthly || [])
        setYearlyTotals(data.data?.yearlyTotals || null)
      }
    } catch (e) {
      console.error('Error loading trends report:', e)
    } finally {
      setLoading(false)
    }
  }

  const chartData = monthly.map((m) => ({
    name: m.label.split(' ')[0], // Jan, Feb, etc.
    Deposits: m.totalDeposits,
    Expenses: m.totalPayments,
  }))

  return (
    <ContentLayout title="Monthly Trends" subtitle="System-wide income vs expenses by month">
      <div className="space-y-6">
        <Link href="/expense-accounts/reports" className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Back to Reports Hub
        </Link>

        {/* Year selector + account filter */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Year</label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setYear((y) => y - 1)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 text-sm"
                >
                  ←
                </button>
                <span className="text-lg font-bold text-gray-900 dark:text-gray-100 w-16 text-center">{year}</span>
                <button
                  onClick={() => setYear((y) => y + 1)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 text-sm"
                >
                  →
                </button>
              </div>
            </div>
            <div className="flex-1 min-w-48">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Account</label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-sm text-gray-700 dark:text-gray-300"
              >
                <option value="">All Accounts</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.accountName} ({a.accountNumber})</option>
                ))}
              </select>
            </div>
            <button
              onClick={() => { setYear(new Date().getFullYear()); setAccountId('') }}
              className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Summary cards */}
        {yearlyTotals && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border-l-4 border-green-500">
              <p className="text-xs text-gray-500 dark:text-gray-400">Total Income</p>
              <p className="text-xl font-bold text-green-600 dark:text-green-400 mt-1">{formatCurrency(yearlyTotals.totalDeposits)}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border-l-4 border-red-500">
              <p className="text-xs text-gray-500 dark:text-gray-400">Total Expenses</p>
              <p className="text-xl font-bold text-red-600 dark:text-red-400 mt-1">{formatCurrency(yearlyTotals.totalPayments)}</p>
            </div>
            <div className={`bg-white dark:bg-gray-800 rounded-lg shadow p-4 border-l-4 ${yearlyTotals.netChange >= 0 ? 'border-teal-500' : 'border-orange-500'}`}>
              <p className="text-xs text-gray-500 dark:text-gray-400">Net Change</p>
              <p className={`text-xl font-bold mt-1 ${yearlyTotals.netChange >= 0 ? 'text-teal-600 dark:text-teal-400' : 'text-orange-600 dark:text-orange-400'}`}>
                {yearlyTotals.netChange >= 0 ? '+' : ''}{formatCurrency(yearlyTotals.netChange)}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border-l-4 border-blue-500">
              <p className="text-xs text-gray-500 dark:text-gray-400">Best Month</p>
              <p className="text-base font-bold text-blue-600 dark:text-blue-400 mt-1">{yearlyTotals.bestMonth || '—'}</p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
          </div>
        ) : (
          <>
            {/* Grouped bar chart */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm mb-4">Deposits vs Expenses — {year}</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData} margin={{ left: 10, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: any) => formatCurrency(v)} />
                  <Legend />
                  <Bar dataKey="Deposits" fill="#87B5A5" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Expenses" fill="#E8D5C4" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Monthly table */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">Monthly Breakdown</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Month</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Income</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Expenses</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Net Change</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {monthly.map((m) => (
                      <tr key={m.month} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{m.label}</td>
                        <td className="px-4 py-3 text-right text-green-600 dark:text-green-400">
                          {m.totalDeposits > 0 ? formatCurrency(m.totalDeposits) : <span className="text-gray-400">—</span>}
                        </td>
                        <td className="px-4 py-3 text-right text-red-600 dark:text-red-400">
                          {m.totalPayments > 0 ? formatCurrency(m.totalPayments) : <span className="text-gray-400">—</span>}
                        </td>
                        <td className={`px-4 py-3 text-right font-medium ${m.netChange > 0 ? 'text-teal-600 dark:text-teal-400' : m.netChange < 0 ? 'text-orange-600 dark:text-orange-400' : 'text-gray-400'}`}>
                          {m.totalDeposits === 0 && m.totalPayments === 0 ? '—' : `${m.netChange >= 0 ? '+' : ''}${formatCurrency(m.netChange)}`}
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
