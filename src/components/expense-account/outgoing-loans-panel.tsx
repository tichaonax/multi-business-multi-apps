"use client"

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { useToastContext } from '@/components/ui/toast'
import { RecordRepaymentModal } from './record-repayment-modal'
import { RequestRepaymentModal } from './request-repayment-modal'
import { RepaymentApprovalModal } from './repayment-approval-modal'
import { LoanRequestApprovalModal } from './loan-request-approval-modal'

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

interface PendingRepaymentRequest {
  id: string
  amount: number
  paymentDate: string
  notes: string | null
  requestedBy: string | null
  createdAt: string
}

interface OutgoingLoansPanelProps {
  accountId: string
  canManage: boolean
  onApprove?: (loanId: string) => void
  onRepaymentSuccess?: () => void
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

export function OutgoingLoansPanel({ accountId, canManage, onApprove, onRepaymentSuccess, refreshKey }: OutgoingLoansPanelProps) {
  const toast = useToastContext()
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const [loans, setLoans] = useState<OutgoingLoan[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [repaymentModal, setRepaymentModal] = useState<OutgoingLoan | null>(null)
  const [approvingId, setApprovingId] = useState<string | null>(null)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [pendingRepayments, setPendingRepayments] = useState<Record<string, PendingRepaymentRequest[]>>({})
  const [reviewingRepayment, setReviewingRepayment] = useState<{ loan: OutgoingLoan; req: PendingRepaymentRequest } | null>(null)
  const [reviewingLoanRequest, setReviewingLoanRequest] = useState<OutgoingLoan | null>(null)
  const [autoOpenedFromUrl, setAutoOpenedFromUrl] = useState(false)

  const loadLoans = async () => {
    setLoading(true)
    setFetchError(null)
    try {
      const res = await fetch(`/api/expense-account/${accountId}/outgoing-loans`, { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        const loadedLoans: OutgoingLoan[] = data.data?.loans ?? []
        setLoans(loadedLoans)

        // MBM-312: load any pending repayment requests for ACTIVE BUSINESS loans
        const businessLoans = loadedLoans.filter(l => l.loanType === 'BUSINESS' && l.status === 'ACTIVE')
        let next: Record<string, PendingRepaymentRequest[]> = {}
        if (businessLoans.length > 0) {
          const results = await Promise.all(
            businessLoans.map(l =>
              fetch(`/api/expense-account/outgoing-loans/${l.id}/repayment-requests`, { credentials: 'include' })
                .then(r => (r.ok ? r.json() : null))
                .catch(() => null)
            )
          )
          businessLoans.forEach((l, i) => {
            const all = results[i]?.data?.requests ?? []
            const pending = all.filter((r: any) => r.status === 'PENDING')
            if (pending.length > 0) next[l.id] = pending
          })
          setPendingRepayments(next)
        } else {
          setPendingRepayments({})
        }

        // MBM-312: a notification can deep-link straight to a specific
        // pending item's review modal (?reviewLoanId / ?reviewPaymentId)
        // instead of just landing on this tab and making the cashier find
        // it in the list themselves. Only fires once per page load.
        if (!autoOpenedFromUrl) {
          const reviewLoanId = searchParams.get('reviewLoanId')
          const reviewPaymentId = searchParams.get('reviewPaymentId')
          if (reviewLoanId) {
            const match = loadedLoans.find(l => l.id === reviewLoanId && l.status === 'PENDING_APPROVAL')
            if (match) setReviewingLoanRequest(match)
          } else if (reviewPaymentId) {
            for (const l of businessLoans) {
              const match = next[l.id]?.find(r => r.id === reviewPaymentId)
              if (match) { setReviewingRepayment({ loan: l, req: match }); break }
            }
          }
          if (reviewLoanId || reviewPaymentId) {
            setAutoOpenedFromUrl(true)
            const params = new URLSearchParams(searchParams.toString())
            params.delete('reviewLoanId')
            params.delete('reviewPaymentId')
            router.replace(`${pathname}?${params.toString()}`)
          }
        }
      } else {
        const data = await res.json().catch(() => ({}))
        setFetchError(data.error ?? `Error ${res.status}`)
      }
    } catch {
      setFetchError('Network error — could not load loans')
    }
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
        toast.push(
          loan.loanType === 'BUSINESS'
            ? `Loan to ${loan.recipientName} approved and disbursed`
            : `Loan for ${loan.recipientName} approved — awaiting contract signing`,
          { type: 'success' }
        )
        loadLoans()
        onApprove?.(loan.id)
      } else {
        const data = await res.json()
        toast.error(data.error || 'Approval failed')
      }
    } catch {
      toast.error('Network error')
    }
    setApprovingId(null)
  }

  const handleReject = async (loan: OutgoingLoan) => {
    setRejectingId(loan.id)
    try {
      const res = await fetch(`/api/expense-account/outgoing-loans/${loan.id}/reject`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      if (res.ok) {
        toast.push(`Loan request for ${loan.recipientName} rejected`, { type: 'success' })
        loadLoans()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Rejection failed')
      }
    } catch {
      toast.error('Network error')
    }
    setRejectingId(null)
  }

  const activeLoans = loans.filter(l => !['PAID_OFF', 'WRITTEN_OFF'].includes(l.status))
  const totalOutstanding = activeLoans.reduce((s, l) => s + l.remainingBalance, 0)

  if (loading) {
    return <p className="text-sm text-gray-500 dark:text-gray-400 py-2">Loading outgoing loans...</p>
  }

  if (fetchError) {
    return (
      <p className="text-sm text-red-600 dark:text-red-400 py-2 text-center">
        Failed to load loans: {fetchError}
      </p>
    )
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
          <div key={loan.id} className="p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
            <div className="flex items-start gap-3">
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
                    loan.loanType === 'BUSINESS' ? (
                      <button
                        onClick={() => setReviewingLoanRequest(loan)}
                        className="px-2.5 py-1 text-xs font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                      >
                        Review
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => handleApprove(loan)}
                          disabled={approvingId === loan.id || rejectingId === loan.id}
                          className="px-2.5 py-1 text-xs font-medium text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg hover:bg-amber-100 transition-colors"
                        >
                          {approvingId === loan.id ? '...' : 'Approve'}
                        </button>
                        <button
                          onClick={() => handleReject(loan)}
                          disabled={approvingId === loan.id || rejectingId === loan.id}
                          className="px-2.5 py-1 text-xs font-medium text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg hover:bg-red-100 transition-colors"
                        >
                          {rejectingId === loan.id ? '...' : 'Reject'}
                        </button>
                      </>
                    )
                  )}
                  {loan.status === 'ACTIVE' && (
                    <button
                      onClick={() => setRepaymentModal(loan)}
                      title={loan.loanType === 'BUSINESS' ? 'Submits a repayment request for cashier approval' : undefined}
                      className="px-2.5 py-1 text-xs font-medium text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg hover:bg-green-100 transition-colors"
                    >
                      {loan.loanType === 'BUSINESS' ? '📥 Request Repayment' : '📥 Repayment'}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* MBM-312: pending repayment requests from the borrower, awaiting cashier approval */}
            {canManage && pendingRepayments[loan.id]?.length > 0 && (
              <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700 space-y-1.5">
                {pendingRepayments[loan.id].map(req => (
                  <div key={req.id} className="flex items-center justify-between gap-2 text-xs bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded px-2 py-1.5">
                    <span className="text-yellow-800 dark:text-yellow-300">
                      📥 Repayment request: <strong>${req.amount.toFixed(2)}</strong>
                      {req.requestedBy && <span> by {req.requestedBy}</span>}
                    </span>
                    <div className="flex gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => setReviewingRepayment({ loan, req })}
                        className="px-2 py-0.5 text-xs font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded hover:bg-blue-100 transition-colors"
                      >
                        Review
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* MBM-312: BUSINESS loans always go through cashier approval — no
          direct-credit path, even from the lender's own side. PERSON/
          EMPLOYEE loans keep the existing direct-record behavior
          unchanged (a separate, pre-existing workflow this feature
          doesn't touch). */}
      {repaymentModal && repaymentModal.loanType === 'BUSINESS' ? (
        <RequestRepaymentModal
          loanId={repaymentModal.id}
          loanNumber={repaymentModal.loanNumber}
          contextLabel={`repayment from ${repaymentModal.recipientName}`}
          remainingBalance={repaymentModal.remainingBalance}
          onSuccess={() => { loadLoans(); onRepaymentSuccess?.() }}
          onClose={() => setRepaymentModal(null)}
        />
      ) : repaymentModal && (
        <RecordRepaymentModal
          loanId={repaymentModal.id}
          loanNumber={repaymentModal.loanNumber}
          recipientName={repaymentModal.recipientName}
          remainingBalance={repaymentModal.remainingBalance}
          onSuccess={() => { loadLoans(); onRepaymentSuccess?.() }}
          onClose={() => setRepaymentModal(null)}
        />
      )}

      {reviewingRepayment && (
        <RepaymentApprovalModal
          loanId={reviewingRepayment.loan.id}
          paymentId={reviewingRepayment.req.id}
          loanNumber={reviewingRepayment.loan.loanNumber}
          recipientName={reviewingRepayment.loan.recipientName}
          requestedAmount={reviewingRepayment.req.amount}
          remainingBalance={reviewingRepayment.loan.remainingBalance}
          paymentDate={reviewingRepayment.req.paymentDate}
          requestNotes={reviewingRepayment.req.notes}
          requestedBy={reviewingRepayment.req.requestedBy}
          onSuccess={() => { setReviewingRepayment(null); loadLoans(); onRepaymentSuccess?.() }}
          onClose={() => setReviewingRepayment(null)}
        />
      )}

      {reviewingLoanRequest && (
        <LoanRequestApprovalModal
          loanId={reviewingLoanRequest.id}
          loanNumber={reviewingLoanRequest.loanNumber}
          recipientName={reviewingLoanRequest.recipientName}
          requestedAmount={reviewingLoanRequest.principalAmount}
          purpose={reviewingLoanRequest.purpose}
          onSuccess={() => { setReviewingLoanRequest(null); loadLoans(); onApprove?.(reviewingLoanRequest.id) }}
          onClose={() => setReviewingLoanRequest(null)}
        />
      )}
    </>
  )
}
