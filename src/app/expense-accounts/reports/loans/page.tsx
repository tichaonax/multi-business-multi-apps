'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { ContentLayout } from '@/components/layout/content-layout'
import { getEffectivePermissions } from '@/lib/permission-utils'
import { formatDate } from '@/lib/date-format'
import Link from 'next/link'

interface LoanRow {
  id: string
  loanNumber: string
  accountId: string
  accountName: string
  accountNumber: string
  lenderName: string
  lenderType: string
  principalAmount: number
  remainingBalance: number
  totalPaid: number
  totalInterestPaid: number
  status: string
  loanDate: string
  dueDate: string | null
  notes: string | null
}

interface ByLender { lenderName: string; loanCount: number; totalOutstanding: number }

interface SystemTotals {
  totalPrincipal: number
  totalOutstanding: number
  totalInterestPaid: number
  activeCount: number
  paidOffCount: number
}

const STATUS_TABS = [
  { label: 'All', value: 'ALL' },
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Paid Off', value: 'PAID_OFF' },
]

function statusBadge(status: string) {
  if (status === 'PAID_OFF') return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">Paid Off</span>
  if (status === 'WRITTEN_OFF') return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">Written Off</span>
  return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">Active</span>
}

export default function LoanPortfolioReportPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loans, setLoans] = useState<LoanRow[]>([])
  const [byLender, setByLender] = useState<ByLender[]>([])
  const [totals, setTotals] = useState<SystemTotals | null>(null)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('ALL')

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/signin')
  }, [status, router])

  useEffect(() => {
    if (status !== 'authenticated') return
    const permissions = getEffectivePermissions(session?.user)
    if (!permissions.canViewExpenseReports) { router.push('/expense-accounts'); return }
    loadReport()
  }, [status, session, statusFilter])

  const loadReport = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/expense-account/reports/loans?status=${statusFilter}`, { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setLoans(data.data?.loans || [])
        setByLender(data.data?.byLender || [])
        setTotals(data.data?.systemTotals || null)
      }
    } catch (e) {
      console.error('Error loading report:', e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <ContentLayout title="Loan Portfolio" subtitle="All loans across every expense account">
      <div className="space-y-6">
        <Link href="/expense-accounts/reports" className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Back to Reports Hub
        </Link>

        {/* Status tabs + Summary cards */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex gap-2 flex-wrap">
            {STATUS_TABS.map(tab => (
              <button
                key={tab.value}
                onClick={() => setStatusFilter(tab.value)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  statusFilter === tab.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {totals && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border-l-4 border-amber-500">
              <p className="text-xs text-gray-500 dark:text-gray-400">Active Loans</p>
              <p className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-1">{totals.activeCount}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border-l-4 border-red-500">
              <p className="text-xs text-gray-500 dark:text-gray-400">Total Outstanding</p>
              <p className="text-xl font-bold text-red-600 dark:text-red-400 mt-1">{formatCurrency(totals.totalOutstanding)}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border-l-4 border-orange-500">
              <p className="text-xs text-gray-500 dark:text-gray-400">Total Interest Paid</p>
              <p className="text-xl font-bold text-orange-600 dark:text-orange-400 mt-1">{formatCurrency(totals.totalInterestPaid)}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border-l-4 border-blue-500">
              <p className="text-xs text-gray-500 dark:text-gray-400">Total Principal</p>
              <p className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-1">{formatCurrency(totals.totalPrincipal)}</p>
            </div>
          </div>
        )}

        {/* Loans Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">Loan Details</h3>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : loans.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">No loans found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Loan #</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Account</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Lender</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Principal</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Remaining</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Interest Paid</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Due</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {loans.map((loan) => (
                    <tr key={loan.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100 text-xs">{loan.loanNumber}</td>
                      <td className="px-4 py-3">
                        <Link href={`/expense-accounts/${loan.accountId}`} className="text-blue-600 dark:text-blue-400 hover:underline font-medium">
                          {loan.accountName}
                        </Link>
                        <div className="text-xs text-gray-400">{loan.accountNumber}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                        {loan.lenderName}
                        <div className="text-xs text-gray-400">{loan.lenderType}</div>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{formatCurrency(loan.principalAmount)}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={loan.remainingBalance > 0 ? 'text-red-600 dark:text-red-400 font-medium' : 'text-green-600 dark:text-green-400'}>
                          {formatCurrency(loan.remainingBalance)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-orange-600 dark:text-orange-400">
                        {loan.totalInterestPaid > 0 ? formatCurrency(loan.totalInterestPaid) : '—'}
                      </td>
                      <td className="px-4 py-3 text-center">{statusBadge(loan.status)}</td>
                      <td className="px-4 py-3 text-center text-xs text-gray-500 dark:text-gray-400">
                        {loan.dueDate ? formatDate(new Date(loan.dueDate)) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* By Lender */}
        {byLender.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">By Lender</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Lender</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Loans</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Outstanding</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {byLender.map((l, i) => (
                    <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{l.lenderName}</td>
                      <td className="px-4 py-3 text-center text-gray-500 dark:text-gray-400">{l.loanCount}</td>
                      <td className="px-4 py-3 text-right font-medium text-red-600 dark:text-red-400">{formatCurrency(l.totalOutstanding)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </ContentLayout>
  )
}
