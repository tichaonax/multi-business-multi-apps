"use client"

import { useState, useEffect } from 'react'
import { useToastContext } from '@/components/ui/toast'
import { DateInput } from '@/components/ui/date-input'
import { getTodayLocalDateString } from '@/lib/date-utils'

interface Transfer {
  id: string
  fromBusinessId: string
  fromBusinessName: string
  originalAmount: number
  outstandingAmount: number
  transferDate: string
  status: string
}

interface ReturnTransferModalProps {
  accountId: string
  currentBalance?: number        // passed in from payments tab; fetched from API when absent
  preSelectedTransferId?: string // when set, transfer is locked (no dropdown)
  onSuccess: () => void
  onClose: () => void
}

export function ReturnTransferModal({
  accountId,
  currentBalance: balanceProp,
  preSelectedTransferId,
  onSuccess,
  onClose,
}: ReturnTransferModalProps) {
  const toast = useToastContext()
  const isLocked = !!preSelectedTransferId   // from report page — lock to specific transfer

  const [transfers, setTransfers] = useState<Transfer[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [accountBalance, setAccountBalance] = useState<number | null>(balanceProp ?? null)

  const [selectedTransferId, setSelectedTransferId] = useState(preSelectedTransferId ?? '')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(getTodayLocalDateString())

  const selected = transfers.find(t => t.id === selectedTransferId) ?? null
  const effectiveBalance = accountBalance ?? Infinity

  // Load transfers and, if balance wasn't passed in, fetch the account balance
  useEffect(() => {
    const load = async () => {
      try {
        const fetches: Promise<Response>[] = [
          fetch(`/api/expense-account/${accountId}/transfers?status=OUTSTANDING`, { credentials: 'include' }),
          fetch(`/api/expense-account/${accountId}/transfers?status=PARTIALLY_RETURNED`, { credentials: 'include' }),
        ]
        // Fetch balance if it wasn't provided by the parent
        if (balanceProp === undefined) {
          fetches.push(fetch(`/api/expense-account/${accountId}`, { credentials: 'include' }))
        }

        const results = await Promise.all(fetches)
        const d1 = results[0].ok ? (await results[0].json()).data?.transfers ?? [] : []
        const d2 = results[1].ok ? (await results[1].json()).data?.transfers ?? [] : []
        setTransfers([...d1, ...d2])

        if (balanceProp === undefined && results[2]) {
          const acctData = results[2].ok ? await results[2].json() : null
          if (acctData?.data?.account?.balance !== undefined) {
            setAccountBalance(Number(acctData.data.account.balance))
          }
        }
      } catch {
        // ignore network errors
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [accountId])

  // Reset amount when transfer selection changes (only relevant in free-pick mode)
  useEffect(() => {
    if (!isLocked) setAmount('')
  }, [selectedTransferId])

  const maxReturnable = selected ? selected.outstandingAmount : 0
  const parsedAmount = parseFloat(amount) || 0
  const isFullReturn = selected && parsedAmount >= selected.outstandingAmount - 0.001

  const handleSubmit = async () => {
    if (!selected) return
    if (!parsedAmount || parsedAmount <= 0) {
      toast.push('Enter a valid amount', { type: 'error' })
      return
    }
    if (parsedAmount > maxReturnable + 0.001) {
      toast.push(`Cannot exceed outstanding amount of $${maxReturnable.toFixed(2)}`, { type: 'error' })
      return
    }
    if (accountBalance !== null && parsedAmount > effectiveBalance + 0.001) {
      toast.push(`Insufficient balance in account. Available: $${effectiveBalance.toFixed(2)}`, { type: 'error' })
      return
    }
    if (!date) {
      toast.push('Please enter a date', { type: 'error' })
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch(`/api/expense-account/${accountId}/payments`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payments: [{
            payeeType: 'NONE',
            amount: parsedAmount,
            paymentDate: date,
            paymentType: 'TRANSFER_RETURN',
            transferLedgerId: selected.id,
            isFullPayment: isFullReturn,
          }],
        }),
      })

      if (res.ok) {
        toast.push(`$${parsedAmount.toFixed(2)} returned to ${selected.fromBusinessName}`, { type: 'success' })
        onSuccess()
        onClose()
      } else {
        const data = await res.json()
        toast.push(data.error || 'Failed to process return', { type: 'error' })
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
            <span className="text-xl">🔄</span>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Return Transfer</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          {loading ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">Loading...</p>
          ) : transfers.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-gray-500 dark:text-gray-400 text-sm">No outstanding transfers to return.</p>
            </div>
          ) : (
            <>
              {/* Transfer — locked read-only card OR free-pick dropdown */}
              {isLocked ? (
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Transfer</p>
                  {selected ? (
                    <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                      <p className="font-semibold text-gray-900 dark:text-gray-100">{selected.fromBusinessName}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                        ${selected.outstandingAmount.toFixed(2)} outstanding
                        <span className="text-gray-400 dark:text-gray-600"> (of ${selected.originalAmount.toFixed(2)})</span>
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-amber-600 dark:text-amber-400">Transfer not found</p>
                  )}
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Select Transfer
                  </label>
                  <select
                    value={selectedTransferId}
                    onChange={(e) => setSelectedTransferId(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select a transfer...</option>
                    {transfers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.fromBusinessName} — ${t.outstandingAmount.toFixed(2)} outstanding (of ${t.originalAmount.toFixed(2)})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {selected && (
                <>
                  {/* Info banner */}
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg px-4 py-3 text-sm text-blue-700 dark:text-blue-300 space-y-0.5">
                    <p>Returning funds to <strong>{selected.fromBusinessName}</strong></p>
                    <p>Max returnable: <strong>${maxReturnable.toFixed(2)}</strong>
                      {accountBalance !== null && (
                        <span className="ml-2 text-blue-500 dark:text-blue-400">
                          · Account balance: <strong>${effectiveBalance.toFixed(2)}</strong>
                        </span>
                      )}
                    </p>
                  </div>

                  {/* Amount + Date */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Amount</label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-gray-500 dark:text-gray-400 font-medium">$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          max={Math.min(maxReturnable, effectiveBalance)}
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          className="w-full pl-7 pr-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Date</label>
                      <DateInput value={date} onChange={setDate} />
                    </div>
                  </div>

                  {/* Full / partial indicator */}
                  {parsedAmount > 0 && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {isFullReturn
                        ? '✓ Full return — transfer will be marked as Returned'
                        : `Partial return — $${(maxReturnable - parsedAmount).toFixed(2)} will remain outstanding`}
                    </p>
                  )}
                </>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!loading && transfers.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
            <button
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!selected || !parsedAmount || submitting}
              className="px-5 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              {submitting ? 'Processing...' : selected ? `Return $${parsedAmount > 0 ? parsedAmount.toFixed(2) : '—'}` : 'Return'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
