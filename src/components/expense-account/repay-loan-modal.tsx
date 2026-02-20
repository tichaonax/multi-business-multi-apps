"use client"

import { useState } from 'react'
import { useToastContext } from '@/components/ui/toast'
import { DateInput } from '@/components/ui/date-input'
import { getTodayLocalDateString } from '@/lib/date-utils'

interface RepayLoanModalProps {
  loanId: string
  loanNumber: string
  recipientName: string
  remainingBalance: number
  /** If set, repayment credits the payroll account; otherwise credits the expense account */
  payrollAccountId?: string | null
  onSuccess: () => void
  onClose: () => void
}

export function RepayLoanModal({
  loanId,
  loanNumber,
  recipientName,
  remainingBalance,
  payrollAccountId,
  onSuccess,
  onClose,
}: RepayLoanModalProps) {
  const toast = useToastContext()
  const [amount, setAmount] = useState('')
  const [paymentDate, setPaymentDate] = useState(getTodayLocalDateString())
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'BANK_TRANSFER' | 'OTHER'>('CASH')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const parsedAmount = parseFloat(amount) || 0
  const isPayrollLoan = !!payrollAccountId

  const handleSubmit = async () => {
    if (!parsedAmount || parsedAmount <= 0) {
      toast.push('Enter a valid repayment amount', { type: 'error' })
      return
    }
    if (parsedAmount > remainingBalance + 0.001) {
      toast.push(`Amount exceeds outstanding balance of $${remainingBalance.toFixed(2)}`, { type: 'error' })
      return
    }
    if (!paymentDate) {
      toast.push('Payment date is required', { type: 'error' })
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch(`/api/expense-account/outgoing-loans/${loanId}/payments`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parsedAmount,
          paymentDate,
          paymentMethod,
          notes: notes || undefined,
        }),
      })

      const data = await res.json()
      if (res.ok) {
        toast.push(data.data?.message || 'Repayment recorded successfully', { type: 'success' })
        onSuccess()
        onClose()
      } else {
        toast.push(data.error || 'Failed to record repayment', { type: 'error' })
      }
    } catch {
      toast.push('Network error. Please try again.', { type: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-md">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <span className="text-xl">💰</span>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Record Repayment</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">{loanNumber} — {recipientName}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg px-4 py-3 text-sm">
            <p className="text-blue-700 dark:text-blue-300">
              Outstanding balance: <strong>${remainingBalance.toFixed(2)}</strong>
            </p>
            {isPayrollLoan && (
              <p className="text-blue-600 dark:text-blue-400 text-xs mt-0.5">
                Repayment will be credited to the payroll account
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Amount</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-gray-500 dark:text-gray-400">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={remainingBalance}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full pl-7 pr-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                  autoFocus
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Payment Date</label>
              <DateInput value={paymentDate} onChange={setPaymentDate} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Payment Method</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as any)}
              className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
            >
              <option value="CASH">Cash</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Notes (optional)</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. Cash payment received"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-between gap-3">
          <button
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || parsedAmount <= 0}
            className="px-5 py-2 text-sm font-semibold bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
          >
            {submitting ? 'Recording...' : `Record $${parsedAmount > 0 ? parsedAmount.toFixed(2) : '—'}`}
          </button>
        </div>
      </div>
    </div>
  )
}
