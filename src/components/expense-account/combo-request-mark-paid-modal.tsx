'use client'

import { useState, useEffect } from 'react'
import { useToastContext } from '@/components/ui/toast'

interface ComboMarkPaidModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  accountId: string
  requestId: string
  itemId: string
  itemDescription: string
  approvedAmount: number | null
  estimatedAmount: number | null
}

export function ComboMarkPaidModal({
  isOpen,
  onClose,
  onSuccess,
  accountId,
  requestId,
  itemId,
  itemDescription,
  approvedAmount,
  estimatedAmount,
}: ComboMarkPaidModalProps) {
  const toast = useToastContext()
  const [paidAmount, setPaidAmount] = useState('')
  const [receiptNumber, setReceiptNumber] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [quickSubmitting, setQuickSubmitting] = useState(false)

  // The canonical amount: approved if set (and non-zero), else estimated
  const originalAmount = (approvedAmount !== null && approvedAmount > 0 ? approvedAmount : estimatedAmount) ?? null

  useEffect(() => {
    if (isOpen) {
      setPaidAmount(approvedAmount !== null ? String(approvedAmount.toFixed(2)) : '')
      setReceiptNumber('')
      setNotes('')
    }
  }, [isOpen, approvedAmount])

  if (!isOpen) return null

  async function submitWith(amount: number | undefined, quiet = false) {
    const setter = quiet ? setQuickSubmitting : setSubmitting
    setter(true)
    try {
      const res = await fetch(
        `/api/expense-account/${accountId}/combo-requests/${requestId}/items/${itemId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            paidAmount: amount,
            receiptNumber: receiptNumber.trim() || undefined,
            notes: notes.trim() || undefined,
          }),
        }
      )
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Failed to mark item as paid'); return }
      toast.push('Item marked as paid')
      onSuccess()
    } catch {
      toast.error('Failed to mark item as paid')
    } finally {
      setter(false)
    }
  }

  async function handleSubmit() {
    await submitWith(paidAmount ? Number(paidAmount) : undefined)
  }

  async function handleQuickPay() {
    if (originalAmount === null) return
    await submitWith(originalAmount, true)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Mark Item as Paid</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-4 space-y-4">
          <p className="text-sm font-medium text-gray-800">{itemDescription}</p>

          {approvedAmount !== null && (
            <p className="text-xs text-gray-500">
              Approved amount: <span className="font-medium">${approvedAmount.toFixed(2)}</span>
            </p>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Actual Amount Paid</label>
            <input
              type="number"
              value={paidAmount}
              onChange={e => setPaidAmount(e.target.value)}
              placeholder={approvedAmount !== null ? approvedAmount.toFixed(2) : '0.00'}
              min="0"
              step="0.01"
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Receipt Number (optional)</label>
            <input
              type="text"
              value={receiptNumber}
              onChange={e => setReceiptNumber(e.target.value)}
              placeholder="e.g. INV-001"
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Any notes about this payment..."
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          {originalAmount !== null && (
            <button
              onClick={handleQuickPay}
              disabled={submitting || quickSubmitting}
              className="px-4 py-2 text-sm font-medium text-green-700 border border-green-400 bg-green-50 rounded-lg hover:bg-green-100 disabled:opacity-50 transition-colors whitespace-nowrap"
              title={`Mark as paid at $${originalAmount.toFixed(2)} in one click`}
            >
              {quickSubmitting ? 'Saving...' : `✓ Paid $${originalAmount.toFixed(2)}`}
            </button>
          )}
          <button
            onClick={handleSubmit}
            disabled={submitting || quickSubmitting}
            className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {submitting ? 'Saving...' : 'Mark as Paid'}
          </button>
        </div>
      </div>
    </div>
  )
}
