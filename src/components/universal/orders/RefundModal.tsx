'use client'

import { useState } from 'react'
import { BusinessOrder } from './types'
import { formatCurrency } from './utils'

interface RefundItem {
  orderItemId: string
  quantity: number
  maxQuantity: number
  unitPrice: number
  productName: string
}

interface RefundModalProps {
  order: BusinessOrder
  onConfirm: (data: { refundItems: { orderItemId: string; quantity: number }[]; refundReason: string }) => Promise<void>
  onClose: () => void
}

export function RefundModal({ order, onConfirm, onClose }: RefundModalProps) {
  const [items, setItems] = useState<RefundItem[]>(
    order.items.map(item => ({
      orderItemId: item.id,
      quantity: 0,
      maxQuantity: item.quantity,
      unitPrice: item.unitPrice,
      productName: item.productName || 'Unknown Product'
    }))
  )
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const toggleItem = (index: number) => {
    setItems(prev => prev.map((item, i) =>
      i === index ? { ...item, quantity: item.quantity > 0 ? 0 : item.maxQuantity } : item
    ))
  }

  const updateQuantity = (index: number, qty: number) => {
    setItems(prev => prev.map((item, i) =>
      i === index ? { ...item, quantity: Math.min(Math.max(0, qty), item.maxQuantity) } : item
    ))
  }

  const selectedItems = items.filter(i => i.quantity > 0)
  const refundTotal = selectedItems.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0)
  const isFullRefund = items.every(i => i.quantity === i.maxQuantity)

  const handleSubmit = async () => {
    if (selectedItems.length === 0) {
      setError('Select at least one item to refund')
      return
    }
    if (!reason.trim()) {
      setError('Refund reason is required')
      return
    }

    setSubmitting(true)
    setError('')
    try {
      await onConfirm({
        refundItems: selectedItems.map(i => ({ orderItemId: i.orderItemId, quantity: i.quantity })),
        refundReason: reason.trim()
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process refund')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-red-50 dark:bg-red-900/20">
          <h2 className="text-lg font-semibold text-red-800 dark:text-red-200">
            Refund Order #{order.id.slice(-8)}
          </h2>
          <p className="text-sm text-red-600 dark:text-red-300 mt-1">
            Select items to refund. Cash will be returned to customer.
          </p>
        </div>

        {/* Items */}
        <div className="px-6 py-4 space-y-3 max-h-[40vh] overflow-y-auto">
          {items.map((item, index) => (
            <div
              key={item.orderItemId}
              className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                item.quantity > 0
                  ? 'border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/10'
                  : 'border-gray-200 dark:border-gray-600'
              }`}
            >
              <input
                type="checkbox"
                checked={item.quantity > 0}
                onChange={() => toggleItem(index)}
                className="w-5 h-5 rounded border-gray-300 text-red-600 focus:ring-red-500"
              />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-primary truncate">{item.productName}</p>
                <p className="text-sm text-secondary">
                  {formatCurrency(item.unitPrice)} each
                </p>
              </div>
              {item.quantity > 0 && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => updateQuantity(index, item.quantity - 1)}
                    className="w-7 h-7 rounded bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-sm font-bold"
                  >
                    -
                  </button>
                  <span className="w-8 text-center font-medium">{item.quantity}</span>
                  <button
                    type="button"
                    onClick={() => updateQuantity(index, item.quantity + 1)}
                    disabled={item.quantity >= item.maxQuantity}
                    className="w-7 h-7 rounded bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-sm font-bold disabled:opacity-50"
                  >
                    +
                  </button>
                  <span className="text-xs text-secondary">/ {item.maxQuantity}</span>
                </div>
              )}
            </div>
          ))}

          {/* Select All */}
          <button
            type="button"
            onClick={() => {
              const allSelected = items.every(i => i.quantity === i.maxQuantity)
              setItems(prev => prev.map(i => ({ ...i, quantity: allSelected ? 0 : i.maxQuantity })))
            }}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            {items.every(i => i.quantity === i.maxQuantity) ? 'Deselect All' : 'Select All (Full Refund)'}
          </button>
        </div>

        {/* Reason */}
        <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700">
          <label className="block text-sm font-medium text-primary mb-1">
            Refund Reason <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="e.g., Wrong size, Defective item, Customer changed mind"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>

        {/* Summary + Actions */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400 mb-3">{error}</p>
          )}

          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-secondary">
                {selectedItems.length} item{selectedItems.length !== 1 ? 's' : ''} selected
                {isFullRefund && selectedItems.length > 0 ? ' (Full Refund)' : ''}
              </p>
              <p className="text-xl font-bold text-red-600">
                Refund: {formatCurrency(refundTotal)}
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-secondary hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || selectedItems.length === 0 || !reason.trim()}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {submitting ? 'Processing...' : 'Confirm Refund'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
