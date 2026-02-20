'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { ContentLayout } from '@/components/layout/content-layout'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import Link from 'next/link'

interface LendingLoan {
  id: string
  loanNumber: string
  loanType: string
  accountName: string
  accountNumber: string
  expenseAccountId: string
  recipientName: string
  principalAmount: number
  remainingBalance: number
  totalRepaid: number
  monthlyInstallment: number | null
  disbursementDate: string
  dueDate: string | null
  status: string
  purpose: string | null
  paymentType: string
  contractSigned: boolean
}

interface Summary {
  totalDisbursed: number
  totalOutstanding: number
  totalRepaid: number
  activeCount: number
  paidOffCount: number
  pendingCount: number
  byType: { PERSON: number; BUSINESS: number; EMPLOYEE: number }
}

const TYPE_ICON: Record<string, string> = { PERSON: '👤', BUSINESS: '🏢', EMPLOYEE: '👷' }
const STATUS_TABS = [
  { label: 'All', value: 'ALL' },
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Pending', value: 'PENDING_APPROVAL' },
  { label: 'Paid Off', value: 'PAID_OFF' },
]

function statusBadge(status: string) {
  if (status === 'PAID_OFF') return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">Paid Off</span>
  if (status === 'PENDING_APPROVAL') return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300">Pending Approval</span>
  if (status === 'PENDING_CONTRACT') return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">Pending Contract</span>
  if (status === 'DEFAULTED') return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">Defaulted</span>
  if (status === 'WRITTEN_OFF') return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">Written Off</span>
  return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">Active</span>
}

export default function LendingPortfolioPage() {
  const { hasPermission, isSystemAdmin } = useBusinessPermissionsContext()

  const [loans, setLoans] = useState<LendingLoan[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [typeFilter, setTypeFilter] = useState('ALL')

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

  const loadLoans = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'ALL') params.set('status', statusFilter)
      const res = await fetch(`/api/expense-account/reports/lending?${params}`, { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setLoans(data.data?.loans ?? [])
        setSummary(data.data?.summary ?? null)
      }
    } catch (e) {
      console.error('Error loading lending report:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadLoans()
  }, [statusFilter])

  const filteredLoans = typeFilter === 'ALL' ? loans : loans.filter(l => l.loanType === typeFilter)

  return (
    <ContentLayout title="Lending Portfolio" subtitle="All outgoing loans from expense accounts">
      <div className="space-y-6">
        {/* Back link */}
        <Link
          href="/expense-accounts/reports"
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Reports Hub
        </Link>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border-l-4 border-indigo-500">
              <p className="text-xs text-gray-500 dark:text-gray-400">Total Disbursed</p>
              <p className="text-xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">{formatCurrency(summary.totalDisbursed)}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border-l-4 border-amber-500">
              <p className="text-xs text-gray-500 dark:text-gray-400">Total Outstanding</p>
              <p className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-1">{formatCurrency(summary.totalOutstanding)}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border-l-4 border-green-500">
              <p className="text-xs text-gray-500 dark:text-gray-400">Total Repaid</p>
              <p className="text-xl font-bold text-green-600 dark:text-green-400 mt-1">{formatCurrency(summary.totalRepaid)}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border-l-4 border-blue-500">
              <p className="text-xs text-gray-500 dark:text-gray-400">Active / Paid Off</p>
              <p className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-1">{summary.activeCount} / {summary.paidOffCount}</p>
              {summary.pendingCount > 0 && <p className="text-xs text-yellow-600 dark:text-yellow-400">{summary.pendingCount} pending</p>}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 flex flex-wrap gap-4 items-center">
          <div className="flex gap-2 flex-wrap">
            {STATUS_TABS.map(tab => (
              <button
                key={tab.value}
                onClick={() => setStatusFilter(tab.value)}
                className={`px-3 py-1.5 text-xs rounded-full font-medium transition-colors ${
                  statusFilter === tab.value
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2 flex-wrap border-l border-gray-200 dark:border-gray-600 pl-4">
            {(['ALL', 'PERSON', 'BUSINESS', 'EMPLOYEE'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-3 py-1.5 text-xs rounded-full font-medium transition-colors ${
                  typeFilter === t
                    ? 'bg-gray-700 dark:bg-gray-200 text-white dark:text-gray-900'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {t === 'ALL' ? 'All Types' : `${TYPE_ICON[t]} ${t}`}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : filteredLoans.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-4xl mb-3">🤝</p>
              <p className="text-gray-600 dark:text-gray-400 font-medium">No loans found</p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">No outgoing loans match the current filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Recipient</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Source Account</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Principal</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Repaid</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Outstanding</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Monthly</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Date</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredLoans.map(loan => (
                    <tr key={loan.id} className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span>{TYPE_ICON[loan.loanType] ?? '🤝'}</span>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-gray-100">{loan.recipientName}</p>
                            {loan.purpose && <p className="text-xs text-gray-400">{loan.purpose}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/expense-accounts/${loan.expenseAccountId}`} className="text-blue-600 dark:text-blue-400 hover:underline text-sm">
                          {loan.accountName}
                        </Link>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{loan.accountNumber}</p>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{formatCurrency(loan.principalAmount)}</td>
                      <td className="px-4 py-3 text-right text-green-600 dark:text-green-400">{formatCurrency(loan.totalRepaid)}</td>
                      <td className="px-4 py-3 text-right font-medium">
                        <span className={loan.remainingBalance > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-green-600 dark:text-green-400'}>
                          {formatCurrency(loan.remainingBalance)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-gray-500 dark:text-gray-400 text-xs">
                        {loan.monthlyInstallment ? formatCurrency(loan.monthlyInstallment) : '—'}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-500 dark:text-gray-400 text-xs">
                        {new Date(loan.disbursementDate).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-center">{statusBadge(loan.status)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <td colSpan={2} className="px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                      Total ({filteredLoans.length} loans)
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-gray-700 dark:text-gray-300">
                      {formatCurrency(filteredLoans.reduce((s, l) => s + l.principalAmount, 0))}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-green-600 dark:text-green-400">
                      {formatCurrency(filteredLoans.reduce((s, l) => s + l.totalRepaid, 0))}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-amber-600 dark:text-amber-400">
                      {formatCurrency(filteredLoans.reduce((s, l) => s + l.remainingBalance, 0))}
                    </td>
                    <td colSpan={3}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>
    </ContentLayout>
  )
}
