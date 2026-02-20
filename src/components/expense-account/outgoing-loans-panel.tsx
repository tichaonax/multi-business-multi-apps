"use client"

import { useState, useEffect } from 'react'
import { useToastContext } from '@/components/ui/toast'
import { RecordRepaymentModal } from './record-repayment-modal'

interface OutgoingLoan {
  id: string
  loanNumber: string
  loanType: string
  recipientName: string
  principalAmount: number
  remainingBalance: number
  monthlyInstallment: number | null
  disbursementDate: string
  dueDate: string | null
  status: string
  purpose: string | null
  paymentType: string
  contractSigned: boolean
}

interface OutgoingLoansPanelProps {
  accountId: string
  canManage: boolean
  onApprove?: (loanId: string) => void
  refreshKey?: number
}

function statusBadge(status: string) {
  if (status === 'PAID_OFF') return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">Paid Off</span>
  if (status === 'PENDING_APPROVAL') return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300">Pending Approval</span>
  if (status === 'PENDING_CONTRACT') return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">Pending Contract</span>
  if (status === 'DEFAULTED') return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">Defaulted</span>
  return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">Active</span>
}

const TYPE_ICON: Record<string, string> = { PERSON: '👤', BUSINESS: '🏢', EMPLOYEE: '👷' }

export function OutgoingLoansPanel({ accountId, canManage, onApprove, refreshKey }: OutgoingLoansPanelProps) {
  const toast = useToastContext()
  const [loans, setLoans] = useState<OutgoingLoan[]>([])
  const [loading, setLoading] = useState(true)
  const [repaymentModal, setRepaymentModal] = useState<OutgoingLoan | null>(null)
  const [approvingId, setApprovingId] = useState<string | null>(null)

  const loadLoans = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/expense-account/${accountId}/outgoing-loans`, { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setLoans(data.data?.loans ?? [])
      }
    } catch { /* ignore */ }
    setLoading(false)
  }

  useEffect(() => {
    loadLoans()
  }, [accountId, refreshKey])

  const handleApprove = async (loan: OutgoingLoan) => {
    setApprovingId(loan.id)
    try {
      const res = await fetch(`/api/expense-account/outgoing-loans/${loan.id}/approve`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      if (res.ok) {
        toast.push(`Loan for ${loan.recipientName} approved — awaiting contract signing`, { type: 'success' })
        loadLoans()
        onApprove?.(loan.id)
      } else {
        const data = await res.json()
        toast.push(data.error || 'Approval failed', { type: 'error' })
      }
    } catch {
      toast.push('Network error', { type: 'error' })
    }
    setApprovingId(null)
  }

  const activeLoans = loans.filter(l => !['PAID_OFF', 'WRITTEN_OFF'].includes(l.status))
  const totalOutstanding = activeLoans.reduce((s, l) => s + l.remainingBalance, 0)

  if (loading) {
    return <p className="text-sm text-gray-500 dark:text-gray-400 py-2">Loading outgoing loans...</p>
  }

  if (loans.length === 0) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400 py-2 text-center">
        No outgoing loans. Use the &quot;🤝 Lend Money&quot; button to create one.
      </p>
    )
  }

  return (
    <>
      {activeLoans.length > 0 && (
        <p className="text-xs text-amber-600 dark:text-amber-400 mb-3">
          {activeLoans.length} active loan{activeLoans.length !== 1 ? 's' : ''} — total outstanding: <strong>${totalOutstanding.toFixed(2)}</strong>
        </p>
      )}

      <div className="space-y-2">
        {loans.map(loan => (
          <div key={loan.id} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
            <span className="text-lg flex-shrink-0 mt-0.5">{TYPE_ICON[loan.loanType] ?? '🤝'}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-medium text-sm text-gray-900 dark:text-gray-100">{loan.recipientName}</p>
                {statusBadge(loan.status)}
                <span className="text-xs text-gray-400">#{loan.loanNumber}</span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Principal: ${loan.principalAmount.toFixed(2)}
                {loan.remainingBalance < loan.principalAmount && (
                  <span> · Remaining: <strong>${loan.remainingBalance.toFixed(2)}</strong></span>
                )}
                {loan.monthlyInstallment && (
                  <span> · ${loan.monthlyInstallment.toFixed(2)}/mo via payroll</span>
                )}
              </p>
              {loan.purpose && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{loan.purpose}</p>}
            </div>
            {canManage && (
              <div className="flex gap-2 flex-shrink-0">
                {loan.status === 'PENDING_APPROVAL' && (
                  <button
                    onClick={() => handleApprove(loan)}
                    disabled={approvingId === loan.id}
                    className="px-2.5 py-1 text-xs font-medium text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg hover:bg-amber-100 transition-colors"
                  >
                    {approvingId === loan.id ? '...' : 'Approve'}
                  </button>
                )}
                {loan.status === 'ACTIVE' && (
                  <button
                    onClick={() => setRepaymentModal(loan)}
                    className="px-2.5 py-1 text-xs font-medium text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg hover:bg-green-100 transition-colors"
                  >
                    📥 Repayment
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {repaymentModal && (
        <RecordRepaymentModal
          loanId={repaymentModal.id}
          loanNumber={repaymentModal.loanNumber}
          recipientName={repaymentModal.recipientName}
          remainingBalance={repaymentModal.remainingBalance}
          onSuccess={loadLoans}
          onClose={() => setRepaymentModal(null)}
        />
      )}
    </>
  )
}
