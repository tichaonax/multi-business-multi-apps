'use client'

import { useState } from 'react'

interface Business {
  id: string
  name: string
  type: string
}

interface Props {
  businesses: Business[]
  onSuccess: () => void
  onClose: () => void
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n)

export function EcocashConversionRequestForm({ businesses, onSuccess, onClose }: Props) {
  const [businessId, setBusinessId] = useState('')
  const [businessSearch, setBusinessSearch] = useState('')
  const [amount, setAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedBusiness = businesses.find(b => b.id === businessId) ?? null
  const filteredBusinesses = businesses.filter(b =>
    b.name.toLowerCase().includes(businessSearch.toLowerCase())
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!businessId || !amount || Number(amount) <= 0) {
      setError('Business and a positive amount are required.')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/ecocash-conversions', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId, amount: Number(amount), notes: notes.trim() || undefined }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? 'Failed to submit request')
        return
      }
      onSuccess()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg p-5 w-full max-w-sm shadow-2xl border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            📱→💵 Request Eco-Cash Conversion
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-lg leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          Submit a request to convert eco-cash wallet funds into physical cash.
          A manager will review and set the tendered amount before it is processed.
        </p>

        {error && (
          <div className="mb-3 p-2 rounded bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-xs text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Business <span className="text-red-500">*</span>
            </label>
            {selectedBusiness ? (
              <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-700">
                <span className="text-sm text-teal-900 dark:text-teal-100 font-medium">{selectedBusiness.name}</span>
                <button
                  type="button"
                  onClick={() => { setBusinessId(''); setBusinessSearch('') }}
                  className="text-xs text-teal-500 hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-200 font-medium ml-2"
                >
                  Change
                </button>
              </div>
            ) : (
              <div className="space-y-1">
                <input
                  type="text"
                  placeholder="Search businesses…"
                  value={businessSearch}
                  onChange={e => setBusinessSearch(e.target.value)}
                  autoFocus
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
                {businesses.length === 0 ? (
                  <p className="text-xs text-gray-400 dark:text-gray-500 py-1 px-1">No businesses available.</p>
                ) : filteredBusinesses.length === 0 ? (
                  <p className="text-xs text-gray-400 dark:text-gray-500 py-1 px-1">No matches.</p>
                ) : (
                  <ul className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-y-auto max-h-40 divide-y divide-gray-100 dark:divide-gray-700/60">
                    {filteredBusinesses.map(b => (
                      <li key={b.id}>
                        <button
                          type="button"
                          onClick={() => { setBusinessId(b.id); setBusinessSearch('') }}
                          className="w-full text-left px-3 py-2 text-sm text-gray-800 dark:text-gray-200 hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors"
                        >
                          {b.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Requested Amount <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              required
              placeholder="0.00"
              className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
            />
            {amount && Number(amount) > 0 && (
              <p className="mt-1 text-xs text-gray-400">{fmt(Number(amount))}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="Reason for conversion…"
              className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:outline-none resize-none"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !businessId || !amount || Number(amount) <= 0}
              className="flex-1 py-2 text-sm font-medium rounded-lg bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? 'Submitting…' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
