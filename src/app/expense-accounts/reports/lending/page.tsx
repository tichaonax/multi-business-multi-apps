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
  isOverdue: boolean
  daysSinceLastActivity: number | null
}

interface Summary {
  totalDisbursed: number
  totalOutstanding: number
  totalRepaid: number
  activeCount: number
  paidOffCount: number
  pendingCount: number
  overdueCount: number
  byType: { PERSON: number; BUSINESS: number; EMPLOYEE: number }
}

interface GroupedTotal {
  businessId?: string
  businessName?: string
  accountId?: string
  accountName?: string
  loanCount: number
  totalOutstanding: number
}

interface RequestLogRow {
  loanId: string
  loanNumber: string
  type: 'loan_request' | 'repayment_request'
  amount: number
  status: string
  requestedBy?: string | null
  approvedBy?: string | null
  createdAt: string
  approvedAt: string | null
  rejectedAt?: string | null
  rejectionReason?: string | null
}

const TYPE_ICON: Record<string, string> = { PERSON: '👤', BUSINESS: '🏢', EMPLOYEE: '👷' }
const STATUS_TABS = [
  { label: 'All', value: 'ALL' },
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Pending', value: 'PENDING_APPROVAL' },
  { label: 'Overdue', value: 'OVERDUE' },
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
  const [byRecipientBusiness, setByRecipientBusiness] = useState<GroupedTotal[]>([])
  const [bySourceAccount, setBySourceAccount] = useState<GroupedTotal[]>([])
  const [requestLog, setRequestLog] = useState<RequestLogRow[]>([])
  const [showRequestLog, setShowRequestLog] = useState(false)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [typeFilter, setTypeFilter] = useState('ALL')

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

  const loadLoans = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      // "Overdue" isn't a real loan status — fetch everything and filter
      // client-side on the computed isOverdue flag instead.
      if (statusFilter !== 'ALL' && statusFilter !== 'OVERDUE') params.set('status', statusFilter)
      const res = await fetch(`/api/expense-account/reports/lending?${params}`, { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setLoans(data.data?.loans ?? [])
        setSummary(data.data?.summary ?? null)
        setByRecipientBusiness(data.data?.byRecipientBusiness ?? [])
        setBySourceAccount(data.data?.bySourceAccount ?? [])
        setRequestLog(data.data?.requestLog ?? [])
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

  const filteredLoans = (typeFilter === 'ALL' ? loans : loans.filter(l => l.loanType === typeFilter))
    .filter(l => statusFilter !== 'OVERDUE' || l.isOverdue)

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

        {/* MBM-312: overdue callout — only shown when something needs attention */}
        {summary && summary.overdueCount > 0 && (
          <button
            onClick={() => setStatusFilter('OVERDUE')}
            className="w-full text-left bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 flex items-center gap-2 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
          >
            <span className="text-lg">⚠️</span>
            <span className="text-sm text-red-700 dark:text-red-300">
              <strong>{summary.overdueCount}</strong> business loan{summary.overdueCount !== 1 ? 's' : ''} overdue for monthly repayment — click to review
            </span>
          </button>
        )}

        {/* MBM-312: who owes what to whom, at a glance */}
        {(byRecipientBusiness.length > 0 || bySourceAccount.length > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {byRecipientBusiness.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Outstanding by Business (Borrower)</p>
                <div className="space-y-1.5">
                  {byRecipientBusiness.map(b => (
                    <div key={b.businessId} className="flex justify-between text-sm">
                      <span className="text-gray-700 dark:text-gray-300">{b.businessName} <span className="text-gray-400">({b.loanCount})</span></span>
                      <span className="font-medium text-amber-600 dark:text-amber-400">{formatCurrency(b.totalOutstanding)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {bySourceAccount.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Outstanding by Source Account</p>
                <div className="space-y-1.5">
                  {bySourceAccount.map(a => (
                    <div key={a.accountId} className="flex justify-between text-sm">
                      <span className="text-gray-700 dark:text-gray-300">{a.accountName} <span className="text-gray-400">({a.loanCount})</span></span>
                      <span className="font-medium text-amber-600 dark:text-amber-400">{formatCurrency(a.totalOutstanding)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* MBM-312: loan request / repayment approval audit log */}
        {requestLog.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <button onClick={() => setShowRequestLog(v => !v)} className="flex items-center justify-between w-full text-left">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Requests & Approvals ({requestLog.length})</p>
              <span className="text-gray-400 text-xs">{showRequestLog ? '▲ Hide' : '▼ Show'}</span>
            </button>
            {showRequestLog && (
              <div className="mt-3 space-y-1.5 max-h-80 overflow-y-auto text-xs">
                {requestLog.map((r, i) => (
                  <div key={i} className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-1.5">
                    <span className="text-gray-600 dark:text-gray-400">
                      {r.type === 'loan_request' ? '🤝 Loan' : '📥 Repayment'} <span className="font-medium text-gray-800 dark:text-gray-200">{r.loanNumber}</span> — {formatCurrency(r.amount)}
                      {r.requestedBy && <span> by {r.requestedBy}</span>}
                    </span>
                    <span className={
                      r.status === 'APPROVED' || r.status === 'ACTIVE' || r.status === 'PAID_OFF' ? 'text-green-600 dark:text-green-400' :
                      r.status === 'REJECTED' ? 'text-red-600 dark:text-red-400' : 'text-yellow-600 dark:text-yellow-400'
                    }>
                      {r.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
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
            <>
            {/* Mobile card list (MBM-299 responsive-reports template — see
                src/app/inventory/reports/pricing-exceptions/page.tsx) */}
            <div className="sm:hidden divide-y divide-gray-200 dark:divide-gray-700">
              {filteredLoans.map(loan => (
                <div key={loan.id} className="p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <span>{TYPE_ICON[loan.loanType] ?? '🤝'}</span>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">{loan.recipientName}</p>
                      {loan.purpose && <p className="text-xs text-gray-400">{loan.purpose}</p>}
                    </div>
                    <div className="ml-auto flex items-center gap-1">
                      {loan.isOverdue && <span title={`${loan.daysSinceLastActivity} days since last repayment`}>⚠️</span>}
                      {statusBadge(loan.status)}
                    </div>
                  </div>
                  <div>
                    <Link href={`/expense-accounts/${loan.expenseAccountId}`} className="text-blue-600 dark:text-blue-400 hover:underline text-sm">
                      {loan.accountName}
                    </Link>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{loan.accountNumber}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400">Principal</p>
                      <p className="text-gray-700 dark:text-gray-300">{formatCurrency(loan.principalAmount)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400">Repaid</p>
                      <p className="text-green-600 dark:text-green-400">{formatCurrency(loan.totalRepaid)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400">Outstanding</p>
                      <p className={`font-medium ${loan.remainingBalance > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-green-600 dark:text-green-400'}`}>
                        {formatCurrency(loan.remainingBalance)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400">Monthly</p>
                      <p className="text-gray-500 dark:text-gray-400 text-xs">{loan.monthlyInstallment ? formatCurrency(loan.monthlyInstallment) : '—'}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400">Date</p>
                      <p className="text-gray-500 dark:text-gray-400 text-xs">{new Date(loan.disbursementDate).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>
              ))}
              <div className="p-3 bg-gray-50 dark:bg-gray-700 text-sm">
                <p className="font-medium text-gray-700 dark:text-gray-300 mb-1">Total ({filteredLoans.length} loans)</p>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <span className="font-bold text-gray-700 dark:text-gray-300">{formatCurrency(filteredLoans.reduce((s, l) => s + l.principalAmount, 0))}</span>
                  <span className="font-bold text-green-600 dark:text-green-400">{formatCurrency(filteredLoans.reduce((s, l) => s + l.totalRepaid, 0))}</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400">{formatCurrency(filteredLoans.reduce((s, l) => s + l.remainingBalance, 0))}</span>
                </div>
              </div>
            </div>

            <div className="hidden sm:block overflow-x-auto">
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
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {loan.isOverdue && <span title={`${loan.daysSinceLastActivity} days since last repayment`}>⚠️</span>}
                          {statusBadge(loan.status)}
                        </div>
                      </td>
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
            </>
          )}
        </div>
      </div>
    </ContentLayout>
  )
}
