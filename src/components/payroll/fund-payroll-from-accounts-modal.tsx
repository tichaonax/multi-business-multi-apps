"use client"

import { useState, useEffect } from 'react'
import { useToastContext } from '@/components/ui/toast'

interface FundingSource {
  id: string
  accountName: string
  accountNumber: string
  balance: number
  businessId: string
  business: { id: string; name: string; type: string } | null
}

interface FundPayrollFromAccountsModalProps {
  totalRequired: number
  currentPayrollBalance: number
  onSuccess: () => void
  onClose: () => void
}

export function FundPayrollFromAccountsModal({
  totalRequired,
  currentPayrollBalance,
  onSuccess,
  onClose,
}: FundPayrollFromAccountsModalProps) {
  const toast = useToastContext()
  const [sources, setSources] = useState<FundingSource[]>([])
  const [amounts, setAmounts] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const shortfall = Math.max(0, totalRequired - currentPayrollBalance)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/payroll/account/funding-sources', { credentials: 'include' })
        if (res.ok) {
          const data = await res.json()
          setSources(data.data?.accounts ?? [])
        }
      } catch { /* ignore */ }
      setLoading(false)
    }
    load()
  }, [])

  const totalEntered = Object.values(amounts).reduce((s, v) => s + (parseFloat(v) || 0), 0)
  const newPayrollBalance = currentPayrollBalance + totalEntered

  const handleSubmit = async () => {
    const transfers = sources
      .map((s) => ({ expenseAccountId: s.id, amount: parseFloat(amounts[s.id] || '0') || 0 }))
      .filter((t) => t.amount > 0)

    if (transfers.length === 0) {
      toast.push('Enter an amount for at least one account', { type: 'error' })
      return
    }

    // Validate amounts don't exceed balances
    for (const t of transfers) {
      const src = sources.find((s) => s.id === t.expenseAccountId)
      if (src && t.amount > src.balance) {
        toast.push(`Amount exceeds balance for ${src.accountName}`, { type: 'error' })
        return
      }
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/payroll/account/fund', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transfers }),
      })

      const data = await res.json()
      if (res.ok) {
        toast.push(data.message || 'Payroll account funded successfully', { type: 'success' })
        onSuccess()
        onClose()
      } else {
        toast.push(data.error || 'Transfer failed', { type: 'error' })
      }
    } catch {
      toast.push('Network error. Please try again.', { type: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xl">💵</span>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Fund Payroll Account</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">Select amounts from expense accounts</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Balance summary */}
        <div className="px-6 pt-4 flex-shrink-0">
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
              <p className="text-xs text-red-600 dark:text-red-400 font-medium">Shortfall</p>
              <p className="font-bold text-red-800 dark:text-red-200">${shortfall.toFixed(2)}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2">
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Currently Entering</p>
              <p className="font-bold text-gray-900 dark:text-gray-100">${totalEntered.toFixed(2)}</p>
            </div>
            <div className={`border rounded-lg px-3 py-2 ${newPayrollBalance >= totalRequired ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'}`}>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">New Payroll Balance</p>
              <p className={`font-bold ${newPayrollBalance >= totalRequired ? 'text-green-800 dark:text-green-200' : 'text-amber-800 dark:text-amber-200'}`}>
                ${newPayrollBalance.toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">Loading accounts...</p>
          ) : sources.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">No expense accounts with available balance found.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide border-b border-gray-200 dark:border-gray-700">
                  <th className="pb-2 font-medium">Account</th>
                  <th className="pb-2 font-medium">Business</th>
                  <th className="pb-2 font-medium text-right">Available</th>
                  <th className="pb-2 font-medium text-right">Transfer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {sources.map((src) => {
                  const enteredAmount = parseFloat(amounts[src.id] || '0') || 0
                  const isOver = enteredAmount > src.balance
                  return (
                    <tr key={src.id}>
                      <td className="py-2.5 pr-3">
                        <p className="font-medium text-gray-900 dark:text-gray-100">{src.accountName}</p>
                        <p className="text-xs text-gray-400">{src.accountNumber}</p>
                      </td>
                      <td className="py-2.5 pr-3 text-gray-600 dark:text-gray-400">
                        {src.business?.name ?? '—'}
                      </td>
                      <td className="py-2.5 pr-3 text-right font-medium text-gray-900 dark:text-gray-100">
                        ${src.balance.toFixed(2)}
                      </td>
                      <td className="py-2.5 text-right">
                        <div className="relative inline-block">
                          <span className="absolute left-2 top-2 text-gray-400 text-xs">$</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max={src.balance}
                            value={amounts[src.id] ?? ''}
                            onChange={(e) => setAmounts((prev) => ({ ...prev, [src.id]: e.target.value }))}
                            className={`w-28 pl-5 pr-2 py-1.5 text-sm border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 ${
                              isOver ? 'border-red-400 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600'
                            }`}
                            placeholder="0.00"
                          />
                        </div>
                        {isOver && (
                          <p className="text-xs text-red-500 mt-0.5">Exceeds balance</p>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-between gap-3 flex-shrink-0">
          <button
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || totalEntered <= 0}
            className="px-5 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
          >
            {submitting ? 'Transferring...' : `Fund $${totalEntered.toFixed(2)}`}
          </button>
        </div>
      </div>
    </div>
  )
}
