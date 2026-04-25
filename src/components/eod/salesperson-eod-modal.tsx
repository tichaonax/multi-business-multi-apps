'use client'

import { useState, useEffect } from 'react'

interface Props {
  businessId: string
  reportDate?: string // YYYY-MM-DD, defaults to today
  onClose: () => void
  onSuccess: () => void
}

export function SalespersonEodModal({ businessId, reportDate, onClose, onSuccess }: Props) {
  const today = reportDate ?? (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` })()

  const [cashAmount, setCashAmount] = useState('')
  const [ecocashAmount, setEcocashAmount] = useState('0.00')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  useEffect(() => {
    fetch(`/api/eod/salesperson/pending?businessId=${businessId}`)
      .then(r => r.json())
      .then(json => {
        if (json.success && json.todayEcocashAmount != null) {
          setEcocashAmount(Number(json.todayEcocashAmount).toFixed(2))
        }
      })
      .catch(() => {/* silent */})
  }, [businessId])

  const dateLabel = new Date(today + 'T00:00:00').toLocaleDateString('en-GB', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const res = await fetch('/api/eod/salesperson', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          reportDate: today,
          cashAmount: parseFloat(cashAmount) || 0,
          ecocashAmount: parseFloat(ecocashAmount) || 0,
          notes: notes.trim() || undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? 'Failed to submit EOD report')
        return
      }
      setDone(true)
      setTimeout(() => { onSuccess(); onClose() }, 1500)
    } catch {
      setError('Network error — please try again')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-neutral-700">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-neutral-100">📋 End-of-Day Report</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{dateLabel}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl leading-none">✕</button>
        </div>

        {done ? (
          <div className="px-5 py-10 text-center">
            <div className="text-4xl mb-3">✅</div>
            <p className="text-sm font-medium text-green-700 dark:text-green-400">EOD report submitted successfully</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-5 py-5 space-y-4">
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Enter the total cash you collected today. EcoCash is automatically calculated from system records.
            </p>

            {/* Cash amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Cash Collected <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={cashAmount}
                  onChange={e => setCashAmount(e.target.value)}
                  required
                  className="w-full pl-7 pr-3 py-2 text-sm border border-gray-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-gray-900 dark:text-neutral-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* EcoCash amount — readonly, auto-filled from system */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                EcoCash Collected
                <span className="ml-1.5 text-xs font-normal text-gray-400">(auto-filled from system)</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                <input
                  type="number"
                  readOnly
                  tabIndex={-1}
                  value={ecocashAmount}
                  className="w-full pl-7 pr-3 py-2 text-sm border border-gray-200 dark:border-neutral-700 rounded-lg bg-gray-50 dark:bg-neutral-800 text-gray-500 dark:text-neutral-400 cursor-default"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Notes <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <textarea
                rows={3}
                placeholder="Any discrepancies, comments, or information for the manager..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-gray-900 dark:text-neutral-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>

            {error && (
              <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{error}</p>
            )}

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-neutral-700 rounded-lg hover:bg-gray-200 dark:hover:bg-neutral-600 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? 'Submitting…' : 'Submit Report'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
