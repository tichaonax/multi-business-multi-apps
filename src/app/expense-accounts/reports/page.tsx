'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { ContentLayout } from '@/components/layout/content-layout'
import { getEffectivePermissions } from '@/lib/permission-utils'
import Link from 'next/link'

const REPORT_CARDS = [
  {
    href: '/expense-accounts/reports/accounts-overview',
    emoji: '🏦',
    title: 'Accounts Overview',
    description: 'Balance, deposits and payments summary across all expense accounts with date filtering.',
    color: 'blue',
  },
  {
    href: '/expense-accounts/reports/loans',
    emoji: '💼',
    title: 'Loan Portfolio',
    description: 'All loans across every account — outstanding balances, interest paid, and lender breakdown.',
    color: 'amber',
  },
  {
    href: '/expense-accounts/reports/categories',
    emoji: '🏷️',
    title: 'Category Analysis',
    description: 'Spending breakdown by category across all accounts with pie chart and detailed table.',
    color: 'purple',
  },
  {
    href: '/expense-accounts/reports/payees',
    emoji: '👥',
    title: 'Payee Analysis',
    description: 'Top payees across all accounts — employees, individuals, businesses ranked by total paid.',
    color: 'green',
  },
  {
    href: '/expense-accounts/reports/trends',
    emoji: '📈',
    title: 'Monthly Trends',
    description: 'System-wide income vs expenses by month — compare deposits and payments across the year.',
    color: 'teal',
  },
  {
    href: '/expense-accounts/reports/transfers',
    emoji: '🔄',
    title: 'Transfer Imbalance',
    description: 'Cross-business transfers and outstanding return amounts — track what has not been returned.',
    color: 'red',
  },
]

const COLOR_MAP: Record<string, string> = {
  blue: 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400',
  amber: 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400',
  purple: 'bg-purple-50 dark:bg-purple-900/10 border-purple-200 dark:border-purple-800 text-purple-600 dark:text-purple-400',
  green: 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800 text-green-600 dark:text-green-400',
  teal: 'bg-teal-50 dark:bg-teal-900/10 border-teal-200 dark:border-teal-800 text-teal-600 dark:text-teal-400',
  red: 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400',
}

export default function ExpenseReportsHubPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [stats, setStats] = useState({ totalBalance: 0, outstandingTransfers: 0, activeLoans: 0, loadingStats: true })

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/signin')
  }, [status, router])

  useEffect(() => {
    if (status !== 'authenticated') return
    const permissions = getEffectivePermissions(session?.user)
    if (!permissions.canViewExpenseReports) {
      router.push('/expense-accounts')
      return
    }
    loadQuickStats()
  }, [status, session])

  const loadQuickStats = async () => {
    try {
      const [accountsRes, transfersRes, loansRes] = await Promise.all([
        fetch('/api/expense-account', { credentials: 'include' }),
        fetch('/api/expense-account/transfers', { credentials: 'include' }),
        fetch('/api/expense-account/reports/loans?status=ACTIVE', { credentials: 'include' }),
      ])

      let totalBalance = 0
      let outstandingTransfers = 0
      let activeLoans = 0

      if (accountsRes.ok) {
        const data = await accountsRes.json()
        const accounts = data.data?.accounts || []
        totalBalance = accounts.reduce((sum: number, a: any) => sum + Number(a.balance || 0), 0)
      }

      if (transfersRes.ok) {
        const data = await transfersRes.json()
        outstandingTransfers = data.data?.totalOutstanding || 0
      }

      if (loansRes.ok) {
        const data = await loansRes.json()
        activeLoans = data.data?.systemTotals?.activeCount || 0
      }

      setStats({ totalBalance, outstandingTransfers, activeLoans, loadingStats: false })
    } catch (e) {
      console.error('Error loading quick stats:', e)
      setStats(prev => ({ ...prev, loadingStats: false }))
    }
  }

  if (status === 'loading') {
    return (
      <ContentLayout title="Expense Reports">
        <div className="flex items-center justify-center h-64">
          <div className="text-secondary">Loading...</div>
        </div>
      </ContentLayout>
    )
  }

  return (
    <ContentLayout title="Expense Reports" subtitle="System-wide analytics and reporting for all expense accounts">
      <div className="space-y-6">
        {/* Back link */}
        <Link
          href="/expense-accounts"
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Expense Accounts
        </Link>

        {/* Quick Stats Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-5 border-l-4 border-blue-500">
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Balance (All Accounts)</p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
              {stats.loadingStats ? '—' : formatCurrency(stats.totalBalance)}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-5 border-l-4 border-red-500">
            <p className="text-sm text-gray-500 dark:text-gray-400">Outstanding Transfers</p>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
              {stats.loadingStats ? '—' : formatCurrency(stats.outstandingTransfers)}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-5 border-l-4 border-amber-500">
            <p className="text-sm text-gray-500 dark:text-gray-400">Active Loans</p>
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
              {stats.loadingStats ? '—' : stats.activeLoans}
            </p>
          </div>
        </div>

        {/* Report Cards */}
        <div>
          <h2 className="text-base font-semibold text-gray-700 dark:text-gray-300 mb-3">Available Reports</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {REPORT_CARDS.map((card) => (
              <Link
                key={card.href}
                href={card.href}
                className={`block rounded-lg border p-5 hover:shadow-md transition-shadow ${COLOR_MAP[card.color]}`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-3xl">{card.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{card.title}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">{card.description}</p>
                  </div>
                </div>
                <div className="mt-3 text-xs font-medium flex items-center gap-1">
                  View Report
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </ContentLayout>
  )
}
