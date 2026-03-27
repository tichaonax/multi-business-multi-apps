'use client'

import { useState } from 'react'
import { useToastContext } from '@/components/ui/toast'

interface InventoryItem {
  id: string
  name: string
  sku?: string
  sellPrice: number
  currentStock: number
  businessId: string
  category?: string
}

interface ZeroOutInventoryModalProps {
  item: InventoryItem
  onClose: () => void
  onSuccess: () => void
}

export function ZeroOutInventoryModal({ item, onClose, onSuccess }: ZeroOutInventoryModalProps) {
  const { push: toast, error: toastError } = useToastContext()

  const [sellPrice, setSellPrice] = useState(String(item.sellPrice ?? ''))
  const [stockQuantity, setStockQuantity] = useState(String(item.currentStock ?? ''))
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    const newPrice = sellPrice !== '' ? parseFloat(sellPrice) : undefined
    const newQty = stockQuantity !== '' ? parseFloat(stockQuantity) : undefined

    if (newPrice !== undefined && isNaN(newPrice)) {
      toastError('Invalid sell price')
      return
    }
    if (newQty !== undefined && (isNaN(newQty) || newQty < 0)) {
      toastError('Invalid stock quantity')
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/inventory/zero-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: item.id,
          businessId: item.businessId,
          ...(newPrice !== undefined && { sellPrice: newPrice }),
          ...(newQty !== undefined && { stockQuantity: newQty }),
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast(`"${item.name}" updated`, { type: 'success' })
        onSuccess()
        onClose()
      } else {
        toastError(data.error || 'Update failed')
      }
    } catch {
      toastError('Update failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-sm">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-white text-sm">Edit Stock Values</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate max-w-[220px]">{item.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-lg leading-none">✕</button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          <p className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg px-3 py-2">
            ⚠️ This action is audited. All changes are logged with your user account.
          </p>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Sell Price
              <span className="ml-1 text-gray-400 font-normal">(current: ${item.sellPrice?.toFixed(2) ?? '—'})</span>
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={sellPrice}
              onChange={e => setSellPrice(e.target.value)}
              placeholder="0.00"
              className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Stock Quantity
              <span className="ml-1 text-gray-400 font-normal">(current: {item.currentStock ?? '—'})</span>
            </label>
            <input
              type="number"
              min="0"
              step="1"
              value={stockQuantity}
              onChange={e => setStockQuantity(e.target.value)}
              placeholder="0"
              className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>

          {/* Quick zero buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => { setSellPrice('0'); setStockQuantity('0') }}
              className="flex-1 text-xs py-1.5 border border-red-300 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              Zero Both
            </button>
            <button
              onClick={() => setSellPrice('0')}
              className="flex-1 text-xs py-1.5 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Zero Price
            </button>
            <button
              onClick={() => setStockQuantity('0')}
              className="flex-1 text-xs py-1.5 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Zero Qty
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-5 py-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 text-sm py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 text-sm py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-40"
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
