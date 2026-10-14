"use client"

import { useState, useEffect } from 'react'
import { RequestRepaymentModal } from './request-repayment-modal'

interface LoanOwed {
  id: string
  loanNumber: string
  sourceAccountId: string
  sourceAccountName: string
  principalAmount: number
  remainingBalance: number
  status: string
  purpose: string | null
  disbursementDate: string
}

interface LoansOwedPanelProps {
  accountId: string
  canRequest: boolean
  refreshKey?: number
}

function statusBadge(status: string) {
  if (status === 'PAID_OFF') return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">Paid Off</span>
  if (status === 'PENDING_APPROVAL') return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300">Pending Approval</span>
  if (status === 'REJECTED') return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">Rejected</span>
  return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">Active</span>
}

/**
 * MBM-312 — the borrower's-side view & repayment-initiation point: every
 * BUSINESS loan this account's business owes, and a "Request Repayment"
 * button that submits a request for cashier approval (no money moves here
 * directly — see RequestRepaymentModal).
 */
export function LoansOwedPanel({ accountId, canRequest, refreshKey }: LoansOwedPanelProps) {
  const [loans, setLoans] = useState<LoanOwed[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [requestModal, setRequestModal] = useState<LoanOwed | null>(null)
  const [localRefresh, setLocalRefresh] = useState(0)

  const loadLoans = async () => {
    setLoading(true)
    setFetchError(null)
    try {
      const res = await fetch(`/api/expense-account/${accountId}/loans-owed`, { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setLoans(data.data?.loans ?? [])
      } else {
        const data = await res.json().catch(() => ({}))
        setFetchError(data.error ?? `Error ${res.status}`)
      }
    } catch {
      setFetchError('Network error — could not load loans owed')
    }
    setLoading(false)
  }

  useEffect(() => {
    loadLoans()
  }, [accountId, refreshKey, localRefresh])

  const activeLoans = loans.filter(l => l.status === 'ACTIVE')
  const totalOwed = activeLoans.reduce((s, l) => s + l.remainingBalance, 0)

  if (loading) {
    return <p className="text-sm text-gray-500 dark:text-gray-400 py-2">Loading loans owed...</p>
  }
  if (fetchError) {
    return <p className="text-sm text-red-600 dark:text-red-400 py-2 text-center">Failed to load: {fetchError}</p>
  }
  if (loans.length === 0) {
    return <p className="text-sm text-gray-500 dark:text-gray-400 py-2 text-center">No loans owed by this business.</p>
  }

  return (
    <>
      {activeLoans.length > 0 && (
        <p className="text-xs text-amber-600 dark:text-amber-400 mb-3">
          {activeLoans.length} active loan{activeLoans.length !== 1 ? 's' : ''} owed — total: <strong>${totalOwed.toFixed(2)}</strong>
        </p>
      )}
      <div className="space-y-2">
        {loans.map(loan => (
          <div key={loan.id} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
            <span className="text-lg flex-shrink-0 mt-0.5">🤝</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-medium text-sm text-gray-900 dark:text-gray-100">Owed to {loan.sourceAccountName}</p>
                {statusBadge(loan.status)}
                <span className="text-xs text-gray-400">#{loan.loanNumber}</span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Principal: ${loan.principalAmount.toFixed(2)}
                {loan.remainingBalance < loan.principalAmount && (
                  <span> · Remaining: <strong>${loan.remainingBalance.toFixed(2)}</strong></span>
                )}
              </p>
              {loan.purpose && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{loan.purpose}</p>}
            </div>
            {canRequest && loan.status === 'ACTIVE' && (
              <button
                onClick={() => setRequestModal(loan)}
                className="px-2.5 py-1 text-xs font-medium text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg hover:bg-green-100 transition-colors flex-shrink-0"
              >
                Request Repayment
              </button>
            )}
          </div>
        ))}
      </div>

      {requestModal && (
        <RequestRepaymentModal
          loanId={requestModal.id}
          loanNumber={requestModal.loanNumber}
          sourceAccountName={requestModal.sourceAccountName}
          remainingBalance={requestModal.remainingBalance}
          onSuccess={() => setLocalRefresh(v => v + 1)}
          onClose={() => setRequestModal(null)}
        />
      )}
    </>
  )
}
