'use client'

import { useState } from 'react'
import { useToast } from '@/components/ui/use-toast'
import { formatCurrency } from '@/lib/date-format'

interface Asset {
  id: string
  name: string
  currentBookValue: number
  salvageValue: number
  depreciationMethod: string
  usefulLifeYears: number | null
  purchasePrice: number
}

interface Props {
  asset: Asset
  onClose: () => void
  onSuccess: () => void
}

export default function DepreciateAssetModal({ asset, onClose, onSuccess }: Props) {
  const { push: showToast, error: showError } = useToast()
  const [saving, setSaving] = useState(false)

  const currentValue = asset.currentBookValue
  const salvage = asset.salvageValue

  // Calculate suggested amount
  let suggested = 0
  if (asset.depreciationMethod === 'STRAIGHT_LINE' && asset.usefulLifeYears) {
    suggested = (asset.purchasePrice - salvage) / asset.usefulLifeYears
  } else if (asset.depreciationMethod === 'DECLINING_BALANCE' && asset.usefulLifeYears) {
    suggested = currentValue * (2 / asset.usefulLifeYears)
  }
  suggested = Math.min(suggested, currentValue - salvage)

  const today = new Date().toISOString().split('T')[0]
  const [periodDate, setPeriodDate] = useState(today)
  const [amount, setAmount] = useState(suggested > 0 ? suggested.toFixed(2) : '')
  const [notes, setNotes] = useState('')

  const amt = parseFloat(amount) || 0
  const bookValueAfter = Math.max(currentValue - amt, salvage)
  const belowSalvage = amt > currentValue - salvage

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!amount || amt <= 0) {
      showError('Amount must be greater than 0')
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`/api/assets/${asset.id}/depreciate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ periodDate, amount: amt, notes }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to record depreciation')
      showToast('Depreciation recorded')
      onSuccess()
    } catch (e: unknown) {
      showError(e instanceof Error ? e.message : 'Error recording depreciation')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Record Depreciation</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl">×</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 text-sm">
            <div><p className="text-xs text-gray-400 dark:text-gray-500">Current Book Value</p><p className="font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(currentValue)}</p></div>
            <div><p className="text-xs text-gray-400 dark:text-gray-500">Salvage Value</p><p className="font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(salvage)}</p></div>
            <div><p className="text-xs text-gray-400 dark:text-gray-500">Method</p><p className="font-semibold text-gray-900 dark:text-gray-100">{asset.depreciationMethod.replace('_', ' ')}</p></div>
            <div><p className="text-xs text-gray-400 dark:text-gray-500">Book Value After</p><p className="font-semibold text-blue-600 dark:text-blue-400">{formatCurrency(bookValueAfter)}</p></div>
          </div>

          {belowSalvage && (
            <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3 text-sm text-orange-800 dark:text-orange-300">
              Warning: this amount exceeds the depreciable amount. Book value will be clamped to salvage value ({formatCurrency(salvage)}).
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Period Date *</label>
            <input type="date" value={periodDate} onChange={e => setPeriodDate(e.target.value)} required
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Amount * {suggested > 0 && <span className="font-normal text-gray-400 dark:text-gray-500">(suggested: {formatCurrency(suggested)})</span>}
            </label>
            <input type="number" min="0.01" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} required
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
            <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. Annual depreciation FY2026"
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {saving ? 'Saving...' : 'Record'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
