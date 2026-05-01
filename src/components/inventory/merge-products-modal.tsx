'use client'

import { useState } from 'react'

interface BulkProductSummary {
  id: string
  name: string
  remainingCount: number
  batchNumber: string
}

interface MergeProductsModalProps {
  businessId: string
  products: BulkProductSummary[]
  onClose: () => void
  onMerged: () => void
}

export function MergeProductsModal({ businessId, products, onClose, onMerged }: MergeProductsModalProps) {
  // Winner = highest remainingCount
  const sorted = [...products].sort((a, b) => b.remainingCount - a.remainingCount)
  const winner = sorted[0]
  const losers = sorted.slice(1)

  const [finalName, setFinalName] = useState(winner.name)
  const [confirming, setConfirming] = useState(false)
  const [merging, setMerging] = useState(false)
  const [error, setError] = useState('')

  const combined = products.reduce((sum, p) => sum + p.remainingCount, 0)

  const handleConfirm = async () => {
    if (!confirming) {
      setConfirming(true)
      return
    }
    setMerging(true)
    setError('')
    try {
      const res = await fetch('/api/custom-bulk/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          winnerId: winner.id,
          loserIds: losers.map(l => l.id),
          finalName: finalName.trim() || winner.name,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        setError(data.error ?? 'Merge failed')
        setConfirming(false)
        return
      }
      onMerged()
    } catch {
      setError('Network error — please try again')
      setConfirming(false)
    } finally {
      setMerging(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-base font-bold text-gray-900 dark:text-white">🔀 Merge Products</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl leading-none">&times;</button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">You are about to merge these products into one:</p>

          <div className="space-y-2">
            <div className="flex items-center gap-3 px-3 py-2.5 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <span className="text-green-600 dark:text-green-400 font-bold text-sm shrink-0">Keep</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{winner.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{winner.batchNumber} · {winner.remainingCount} units remaining</p>
              </div>
            </div>

            {losers.map(l => (
              <div key={l.id} className="flex items-center gap-3 px-3 py-2.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <span className="text-red-600 dark:text-red-400 font-bold text-sm shrink-0">Remove</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{l.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{l.batchNumber} · {l.remainingCount} units remaining</p>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Final product name</label>
              <input
                value={finalName}
                onChange={e => { setFinalName(e.target.value); setConfirming(false) }}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Combined quantity:</span>
              <span className="font-bold text-gray-900 dark:text-white">{combined} units</span>
            </div>
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 rounded-lg px-3 py-2">
            This action cannot be undone. The removed product(s) will be deactivated and their quantity added to the kept product.
          </p>

          {confirming && !merging && (
            <div className="text-sm font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg px-3 py-2">
              Are you sure? Click &ldquo;Confirm & Merge&rdquo; again to proceed.
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-5 py-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={merging || !finalName.trim()}
            className={`flex-1 px-4 py-2 text-sm rounded-lg font-medium text-white disabled:opacity-50 ${confirming ? 'bg-red-600 hover:bg-red-700' : 'bg-orange-500 hover:bg-orange-600'}`}>
            {merging ? 'Merging…' : confirming ? 'Confirm & Merge' : 'Merge Products'}
          </button>
        </div>
      </div>
    </div>
  )
}
