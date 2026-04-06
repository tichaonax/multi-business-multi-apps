'use client'

import { useState } from 'react'
import type { EcocashConversion } from './EcocashConversionList'

interface Props {
  conversion: EcocashConversion
  action: 'approve' | 'complete' | 'reject'
  onSuccess: () => void
  onClose: () => void
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n)

export function EcocashConversionActions({ conversion, action, onSuccess, onClose }: Props) {
  const [tenderedAmount, setTenderedAmount] = useState(String(conversion.amount))
  const [transactionCode, setTransactionCode] = useState('')
  const [ecocashAmount, setEcocashAmount] = useState(String(conversion.tenderedAmount ?? conversion.amount))
  const [cashTendered, setCashTendered] = useState(String(Math.round(Number(conversion.tenderedAmount ?? conversion.amount))))
  const [rejectionReason, setRejectionReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (action === 'approve') {
      const tendered = Number(tenderedAmount)
      if (!tendered || tendered <= 0) {
        setError('Tendered amount must be a positive number.')
        return
      }
    }
    if (action === 'reject' && !rejectionReason.trim()) {
      setError('Rejection reason is required.')
      return
    }

    setSubmitting(true)
    try {
      let url = `/api/ecocash-conversions/${conversion.id}/${action}`
      let body: Record<string, unknown> = {}
      if (action === 'approve') body = { tenderedAmount: Number(tenderedAmount) }
      if (action === 'reject')  body = { rejectionReason: rejectionReason.trim() }
      if (action === 'complete') body = {
        transactionCode: transactionCode.trim() || null,
        ecocashAmount: Number(ecocashAmount),
        cashTendered: parseInt(cashTendered, 10),
      }

      const res = await fetch(url, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? 'Action failed')
        return
      }
      onSuccess()
    } finally {
      setSubmitting(false)
    }
  }

  const titles: Record<string, string> = {
    approve:  '✅ Approve Conversion',
    complete: '🟢 Complete Conversion',
    reject:   '❌ Reject Conversion',
  }

  const confirmColors: Record<string, string> = {
    approve:  'bg-blue-600 hover:bg-blue-700',
    complete: 'bg-emerald-600 hover:bg-emerald-700',
    reject:   'bg-red-600 hover:bg-red-700',
  }

  const tendered = Number(tenderedAmount)
  const variance = action === 'approve' && tendered > 0 ? tendered - conversion.amount : null

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg p-5 w-full max-w-sm shadow-2xl border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">{titles[action]}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-lg leading-none" aria-label="Close">×</button>
        </div>

        {/* Conversion summary */}
        <div className="mb-4 p-3 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-500 dark:text-gray-400">Business</span>
            <span className="font-medium text-gray-900 dark:text-white">{conversion.business?.name ?? conversion.businessId}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500 dark:text-gray-400">Requested amount</span>
            <span className="font-medium text-gray-900 dark:text-white">{fmt(conversion.amount)}</span>
          </div>
          {conversion.tenderedAmount !== null && action === 'complete' && (
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Tendered amount</span>
              <span className="font-semibold text-teal-700 dark:text-teal-300">{fmt(conversion.tenderedAmount)}</span>
            </div>
          )}
          {conversion.notes && (
            <div className="flex justify-between gap-2">
              <span className="text-gray-500 dark:text-gray-400">Notes</span>
              <span className="text-right text-gray-700 dark:text-gray-300">{conversion.notes}</span>
            </div>
          )}
        </div>

        {error && (
          <div className="mb-3 p-2 rounded bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-xs text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          {action === 'approve' && (
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Tendered Amount <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={tenderedAmount}
                onChange={e => setTenderedAmount(e.target.value)}
                required
                className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <p className="mt-1 text-xs text-gray-400">
                Actual eco-cash amount to be sent. Cashier must receive exactly this in cash.
                May differ from the requested amount.
              </p>
              {variance !== null && variance !== 0 && tendered > 0 && (
                <p className={`mt-1 text-xs font-medium ${variance > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                  {variance > 0
                    ? `Surplus: ${fmt(variance)} more than requested`
                    : `Shortfall: ${fmt(Math.abs(variance))} less than requested`
                  }
                </p>
              )}
            </div>
          )}

          {action === 'complete' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Eco-Cash Transaction Code
                </label>
                <input
                  type="text"
                  value={transactionCode}
                  onChange={e => setTransactionCode(e.target.value)}
                  placeholder="e.g. 66567DE (optional but recommended)"
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
                <p className="mt-1 text-xs text-gray-400">Reference from the Eco-Cash SMS or app confirmation.</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Eco-Cash Total Sent <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={ecocashAmount}
                  onChange={e => setEcocashAmount(e.target.value)}
                  required
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
                <p className="mt-1 text-xs text-gray-400">Exact decimal amount deducted from eco-cash wallet (e.g. 66.35). Used for eco-cash balance.</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Cash Tendered <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={cashTendered}
                  onChange={e => setCashTendered(e.target.value)}
                  required
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
                <p className="mt-1 text-xs text-gray-400">Whole dollar amount of physical cash given to requester (e.g. 67).</p>
              </div>
            </div>
          )}

          {action === 'reject' && (
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Rejection reason <span className="text-red-500">*</span>
              </label>
              <textarea
                value={rejectionReason}
                onChange={e => setRejectionReason(e.target.value)}
                required
                rows={2}
                placeholder="Reason for rejection…"
                className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:outline-none resize-none"
              />
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/40"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={`flex-1 py-2 text-sm font-medium rounded-lg text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${confirmColors[action]}`}
            >
              {submitting
                ? 'Processing…'
                : action === 'approve'
                  ? 'Approve'
                  : action === 'complete'
                    ? 'Confirm & Complete'
                    : 'Reject'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
