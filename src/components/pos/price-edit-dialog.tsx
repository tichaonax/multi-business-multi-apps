'use client'

import { useState } from 'react'
import { useToastContext } from '@/components/ui/toast'
import type { QuickEditSourceTable } from './image-upload-dialog'

interface Props {
  businessId: string
  /** Raw (unprefixed) id of the item — same id the item's own table uses as its PK. */
  itemId: string
  itemName: string
  sourceTable: QuickEditSourceTable
  currentPrice: number
  onClose: () => void
  onSaved: (newPrice: number) => void
}

/**
 * Shared Price Adjustment Mode dialog (MBM-290). Resolves which endpoint to call
 * from `sourceTable`. Only validation today is "greater than zero" — there's no
 * existing min/max or approval-workflow engine for product base prices to hook
 * into (deliberately kept simple per the plan's decisions).
 */
export function PriceEditDialog({ businessId, itemId, itemName, sourceTable, currentPrice, onClose, onSaved }: Props) {
  const toast = useToastContext()
  const [value, setValue] = useState(String(currentPrice.toFixed(2)))
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    const newPrice = Number(value)
    if (!Number.isFinite(newPrice) || newPrice <= 0) {
      toast.error('Enter a price greater than 0')
      return
    }
    setSaving(true)
    try {
      const res = sourceTable === 'BUSINESS_PRODUCT'
        ? await fetch(`/api/universal/products/${itemId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ basePrice: newPrice }),
          })
        : await fetch(`/api/inventory/${businessId}/items/inv_${itemId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sellPrice: newPrice }),
          })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'Failed to save price')
      }

      fetch('/api/pos/quick-edit/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId, itemId, sourceTable, field: 'price',
          oldValue: currentPrice, newValue: newPrice,
        }),
      }).catch(() => {})

      toast.push('Price updated')
      onSaved(newPrice)
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to save price')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="card w-full max-w-sm p-5 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-primary truncate">💲 {itemName}</h3>
          <button onClick={onClose} className="text-secondary hover:text-primary text-lg leading-none">✕</button>
        </div>

        <div className="text-sm text-secondary">
          Current price: <span className="font-semibold text-primary">${currentPrice.toFixed(2)}</span>
        </div>

        <div>
          <label className="text-xs text-secondary block mb-1">New price ($)</label>
          <input
            type="number" min={0.01} step={0.01} autoFocus
            value={value}
            onChange={e => setValue(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSave() }}
            className="w-full text-lg font-semibold border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-semibold disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save Price'}
          </button>
          <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-secondary hover:bg-gray-50 dark:hover:bg-gray-700 text-sm">
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
