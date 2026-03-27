'use client'

import { useState, useEffect } from 'react'
import { useToastContext } from '@/components/ui/toast'
import { DateInput } from '@/components/ui/date-input'

interface EditDepositModalProps {
  isOpen: boolean
  onClose: () => void
  accountId: string
  depositId: string
  isAdmin?: boolean
  onSuccess: () => void
}

function localDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function EditDepositModal({
  isOpen,
  onClose,
  accountId,
  depositId,
  isAdmin,
  onSuccess,
}: EditDepositModalProps) {
  const toast = useToastContext()

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [depositDate, setDepositDate] = useState('')
  const [amount, setAmount] = useState('')
  const [manualNote, setManualNote] = useState('')
  const [originalAmount, setOriginalAmount] = useState(0)

  useEffect(() => {
    if (!isOpen) return
    setLoading(true)
    fetch(`/api/expense-account/${accountId}/deposits/${depositId}`)
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          const d = data.data.deposit
          // Extract date part directly from ISO string to avoid timezone shifts
          setDepositDate(d.depositDate.split('T')[0])
          setAmount(String(d.amount))
          setManualNote(d.manualNote ?? '')
          setOriginalAmount(d.amount)
        }
      })
      .catch(() => toast.error('Failed to load deposit'))
      .finally(() => setLoading(false))
  }, [isOpen, accountId, depositId])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const parsedAmount = parseFloat(amount)
    if (!parsedAmount || parsedAmount <= 0) {
      toast.error('Amount must be greater than 0')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch(`/api/expense-account/${accountId}/deposits/${depositId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: parsedAmount, depositDate, manualNote: manualNote.trim() || null }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Failed to update deposit')
        return
      }
      toast.push('Deposit updated successfully')
      onSuccess()
    } catch {
      toast.error('Failed to update deposit')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-bold text-primary">Edit Deposit</h2>
          <button onClick={onClose} className="text-secondary hover:text-primary p-1">✕</button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-secondary">Loading...</div>
        ) : (
          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            {/* Amount */}
            <div>
              <label className="block text-sm font-medium text-secondary mb-1">Amount</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-primary focus:ring-2 focus:ring-blue-500"
                required
                autoFocus
              />
            </div>

            {/* Deposit Date */}
            <div>
              <label className="block text-sm font-medium text-secondary mb-1">Deposit Date</label>
              <DateInput
                value={depositDate}
                onChange={setDepositDate}
                max={localDateStr(new Date())}
              />
            </div>

            {/* Note */}
            <div>
              <label className="block text-sm font-medium text-secondary mb-1">Note</label>
              <input
                type="text"
                value={manualNote}
                onChange={e => setManualNote(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-primary focus:ring-2 focus:ring-blue-500"
                placeholder="Optional description"
                maxLength={200}
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-4 py-2 text-sm text-secondary border border-border rounded-lg hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
