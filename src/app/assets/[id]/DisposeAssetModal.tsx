'use client'

import { useState } from 'react'
import { useToast } from '@/components/ui/use-toast'
import { formatCurrency } from '@/lib/date-format'

interface Asset {
  id: string
  name: string
  currentBookValue: number
}

interface Props {
  asset: Asset
  onClose: () => void
  onSuccess: () => void
}

const METHODS = [
  { value: 'SALE', label: 'Sale' },
  { value: 'GIFT', label: 'Gift' },
  { value: 'TRADE_IN', label: 'Trade-In' },
  { value: 'SCRAP', label: 'Scrap' },
  { value: 'WRITTEN_OFF', label: 'Write-Off' },
]

export default function DisposeAssetModal({ asset, onClose, onSuccess }: Props) {
  const { push: showToast, error: showError } = useToast()
  const [saving, setSaving] = useState(false)
  const today = new Date().toISOString().split('T')[0]

  const [form, setForm] = useState({
    disposalMethod: 'SALE',
    disposedAt: today,
    disposalValue: '',
    disposalRecipient: '',
    disposalNotes: '',
  })

  const set = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }))
  const showValue = form.disposalMethod === 'SALE' || form.disposalMethod === 'TRADE_IN'
  const showRecipient = form.disposalMethod === 'SALE' || form.disposalMethod === 'GIFT' || form.disposalMethod === 'TRADE_IN'

  const disposalValue = parseFloat(form.disposalValue) || 0
  const gainLoss = showValue && form.disposalValue ? disposalValue - asset.currentBookValue : null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch(`/api/assets/${asset.id}/dispose`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...form,
          disposalValue: showValue && form.disposalValue ? parseFloat(form.disposalValue) : null,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to dispose asset')
      showToast('Asset disposed')
      onSuccess()
    } catch (e: unknown) {
      showError(e instanceof Error ? e.message : 'Error disposing asset')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 rounded-t-2xl">
          <h2 className="text-lg font-semibold text-red-800 dark:text-red-300">Dispose Asset</h2>
          <button onClick={onClose} className="text-red-400 hover:text-red-600 text-xl">×</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-800 dark:text-red-300">
            This action cannot be undone. The current book value is {formatCurrency(asset.currentBookValue)}.
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Disposal Method *</label>
            <select value={form.disposalMethod} onChange={e => set('disposalMethod', e.target.value)} required
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
              {METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Disposal Date *</label>
            <input type="date" value={form.disposedAt} onChange={e => set('disposedAt', e.target.value)} required
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
          </div>

          {showValue && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {form.disposalMethod === 'TRADE_IN' ? 'Trade-In Value' : 'Sale Price'}
              </label>
              <input type="number" min="0" step="0.01" value={form.disposalValue} onChange={e => set('disposalValue', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
              {gainLoss !== null && (
                <p className={`text-xs mt-1 ${gainLoss >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {gainLoss >= 0 ? 'Gain' : 'Loss'} on disposal: {formatCurrency(Math.abs(gainLoss))}
                </p>
              )}
            </div>
          )}

          {showRecipient && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Recipient / Buyer</label>
              <input value={form.disposalRecipient} onChange={e => set('disposalRecipient', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
            <textarea value={form.disposalNotes} onChange={e => set('disposalNotes', e.target.value)} rows={2}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">
              {saving ? 'Disposing...' : 'Confirm Disposal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
