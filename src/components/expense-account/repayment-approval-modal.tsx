"use client"

import { useState } from 'react'
import { useToastContext } from '@/components/ui/toast'

interface RepaymentApprovalModalProps {
  loanId: string
  paymentId: string
  loanNumber: string
  recipientName: string
  requestedAmount: number
  remainingBalance: number
  paymentDate: string
  requestNotes: string | null
  requestedBy: string | null
  onSuccess: () => void
  onClose: () => void
}

type Mode = 'review' | 'reject'

/**
 * MBM-312 — a single pending repayment request reviewed on its own, instead
 * of firing Approve/Reject straight from the list row. Supports approving
 * less than what was requested (with a required explanation, mirroring the
 * combo-request partial-approval pattern) and requires a reason to reject.
 */
export function RepaymentApprovalModal({
  loanId,
  paymentId,
  loanNumber,
  recipientName,
  requestedAmount,
  remainingBalance,
  paymentDate,
  requestNotes,
  requestedBy,
  onSuccess,
  onClose,
}: RepaymentApprovalModalProps) {
  const toast = useToastContext()
  const [mode, setMode] = useState<Mode>('review')
  const [approvedAmount, setApprovedAmount] = useState(requestedAmount.toFixed(2))
  const [approvalNote, setApprovalNote] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const approvedNum = parseFloat(approvedAmount) || 0
  const isPartial = approvedNum < requestedAmount - 0.001
  const shortfall = requestedAmount - approvedNum

  const handleApprove = async () => {
    if (!approvedNum || approvedNum <= 0) {
      toast.error('Approved amount must be greater than zero')
      return
    }
    if (approvedNum > requestedAmount + 0.001) {
      toast.error(`Cannot exceed the requested $${requestedAmount.toFixed(2)}`)
      return
    }
    if (isPartial && !approvalNote.trim()) {
      toast.error('Explain why this is being partially approved')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch(`/api/expense-account/outgoing-loans/${loanId}/repayment-requests/${paymentId}/approve`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approvedAmount: approvedNum, approvalNote: approvalNote.trim() || undefined }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        toast.push(isPartial ? 'Repayment partially approved' : 'Repayment approved', { type: 'success' })
        onSuccess()
      } else {
        toast.error(data.error || 'Approval failed')
      }
    } catch {
      toast.error('Network error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast.error('A rejection reason is required')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch(`/api/expense-account/outgoing-loans/${loanId}/repayment-requests/${paymentId}/reject`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectionReason.trim() }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        toast.push('Repayment request rejected', { type: 'success' })
        onSuccess()
      } else {
        toast.error(data.error || 'Rejection failed')
      }
    } catch {
      toast.error('Network error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[10400] flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xl">{mode === 'reject' ? '✋' : '📥'}</span>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {mode === 'reject' ? 'Reject Repayment Request' : 'Review Repayment Request'}
            </h2>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4 overflow-y-auto">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg px-4 py-3 text-sm text-blue-700 dark:text-blue-300 space-y-1">
            <p>Loan <strong>{loanNumber}</strong> — from {recipientName}</p>
            <p>Requested: <strong>${requestedAmount.toFixed(2)}</strong> on {paymentDate.slice(0, 10)}</p>
            {requestedBy && <p>Submitted by {requestedBy}</p>}
            {requestNotes && <p className="italic">&quot;{requestNotes}&quot;</p>}
            <p>Loan outstanding balance: <strong>${remainingBalance.toFixed(2)}</strong></p>
          </div>

          {mode === 'review' ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Approved Amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-gray-500 dark:text-gray-400 font-medium">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={requestedAmount}
                    value={approvedAmount}
                    onChange={e => setApprovedAmount(e.target.value)}
                    className="w-full pl-7 pr-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  />
                </div>
                {isPartial && approvedNum > 0 && (
                  <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                    Partial approval — ${shortfall.toFixed(2)} short of what was requested.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Approval Note {isPartial ? '*' : '(optional)'}
                </label>
                <textarea
                  value={approvalNote}
                  onChange={e => setApprovalNote(e.target.value)}
                  placeholder={isPartial ? 'Explain the partial approval...' : 'Optional note'}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
            </>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Rejection Reason *</label>
              <textarea
                value={rejectionReason}
                onChange={e => setRejectionReason(e.target.value)}
                placeholder="Why is this request being rejected?"
                rows={3}
                autoFocus
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-red-500 resize-none"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center shrink-0">
          {mode === 'review' ? (
            <>
              <button
                type="button"
                onClick={() => setMode('reject')}
                disabled={submitting}
                className="px-4 py-2 text-sm font-medium text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              >
                Reject...
              </button>
              <div className="flex gap-3">
                <button type="button" onClick={onClose} disabled={submitting} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={submitting || !approvedNum}
                  className={`px-5 py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${isPartial ? 'bg-amber-600 hover:bg-amber-700' : 'bg-green-600 hover:bg-green-700'}`}
                >
                  {submitting ? 'Approving...' : isPartial ? 'Partially Approve' : 'Approve'}
                </button>
              </div>
            </>
          ) : (
            <>
              <button type="button" onClick={() => setMode('review')} disabled={submitting} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                Back
              </button>
              <button
                type="button"
                onClick={handleReject}
                disabled={submitting || !rejectionReason.trim()}
                className="px-5 py-2 text-sm font-semibold bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
              >
                {submitting ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
