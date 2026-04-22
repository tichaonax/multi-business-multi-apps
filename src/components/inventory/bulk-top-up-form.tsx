'use client'

import { useState } from 'react'

export interface TopUpProduct {
  id: string
  name: string
  remainingCount: number
  itemCount: number
  unitPrice: string | number
  costPrice?: string | number | null
  isActive: boolean
}

export interface TopUpPayload {
  topUpCount: number
  unitPrice: number
  costPrice?: number
  expiryDate?: string // ISO date string e.g. "2026-06-30"
}

interface BulkTopUpFormProps {
  product: TopUpProduct
  /** Parent calls the API; throw an Error to surface a message inside the form. */
  onConfirm: (payload: TopUpPayload) => Promise<void>
  onCancel: () => void
  /** 'inline' = full-width table row expansion (page). 'compact' = modal list item. */
  variant?: 'inline' | 'compact'
}

export function BulkTopUpForm({ product: p, onConfirm, onCancel, variant = 'inline' }: BulkTopUpFormProps) {
  const [newCount, setNewCount] = useState('')
  const [newContainerCost, setNewContainerCost] = useState('')
  const [newUnitPrice, setNewUnitPrice] = useState(Number(p.unitPrice).toFixed(2))
  const [expiryDate, setExpiryDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const existingCostPerItem =
    p.costPrice && Number(p.costPrice) > 0 && p.itemCount > 0
      ? Number(p.costPrice) / p.itemCount
      : 0

  const weightedAvg: number | null = (() => {
    const count = Number(newCount)
    if (!count || count <= 0) return null
    const containerCost = Number(newContainerCost) || 0
    const totalCost = p.remainingCount * existingCostPerItem + containerCost
    return totalCost / (p.remainingCount + count)
  })()

  const handleConfirm = async () => {
    const count = Number(newCount)
    const unitPrice = Number(newUnitPrice)
    if (!Number.isInteger(count) || count <= 0) { setError('Enter a valid whole number for item count'); return }
    if (!unitPrice || unitPrice <= 0) { setError('Selling price must be greater than 0'); return }
    setSaving(true)
    setError('')
    try {
      const containerCost = Number(newContainerCost) || 0
      const payload: TopUpPayload = { topUpCount: count, unitPrice }
      if (existingCostPerItem > 0 || containerCost > 0) {
        payload.costPrice = p.remainingCount * existingCostPerItem + containerCost
      }
      if (expiryDate) payload.expiryDate = expiryDate
      await onConfirm(payload)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to top up')
    } finally {
      setSaving(false)
    }
  }

  const formatPrice = (v: number) => `$${v.toFixed(2)}`

  if (variant === 'compact') {
    return (
      <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700 space-y-3">
        {/* Stats row */}
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="bg-gray-100 dark:bg-gray-700 rounded px-2 py-1">
            Remaining: <strong>{p.remainingCount}</strong>
          </span>
          <span className="bg-gray-100 dark:bg-gray-700 rounded px-2 py-1">
            Selling: <strong>{formatPrice(Number(p.unitPrice))}/item</strong>
          </span>
          {existingCostPerItem > 0 && (
            <span className="bg-gray-100 dark:bg-gray-700 rounded px-2 py-1">
              Cost: <strong>${existingCostPerItem.toFixed(4).replace(/\.?0+$/, '')}/item</strong>
            </span>
          )}
        </div>

        {/* Inputs */}
        <div className="flex flex-wrap gap-2">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 dark:text-gray-400">Items to add *</label>
            <input
              type="number" min="1" step="1" placeholder="e.g. 48"
              value={newCount} onChange={e => setNewCount(e.target.value)}
              autoFocus
              className="w-28 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 dark:text-gray-400">Container cost ($)</label>
            <input
              type="number" min="0" step="0.01" placeholder="e.g. 25.00"
              value={newContainerCost} onChange={e => setNewContainerCost(e.target.value)}
              className="w-28 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 dark:text-gray-400">New selling price *</label>
            <input
              type="number" min="0.01" step="0.01"
              value={newUnitPrice} onChange={e => setNewUnitPrice(e.target.value)}
              className="w-28 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 dark:text-gray-400">Expiry date (optional)</label>
            <input
              type="date"
              value={expiryDate} onChange={e => setExpiryDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-36 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>
        </div>

        {/* Weighted avg hint */}
        {weightedAvg !== null && (
          <p className="text-xs text-blue-600 dark:text-blue-400">
            Weighted avg cost: <strong>${weightedAvg.toFixed(4).replace(/\.?0+$/, '')}/item</strong>
            {Number(newUnitPrice) > 0 && Number(newUnitPrice) < weightedAvg && (
              <span className="ml-2 text-red-500">⚠️ below cost</span>
            )}
          </p>
        )}

        {error && <p className="text-xs text-red-500">{error}</p>}

        <div className="flex gap-2">
          <button
            onClick={handleConfirm} disabled={saving}
            className="px-3 py-1 text-xs bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-lg font-medium">
            {saving ? 'Saving…' : 'Confirm Top Up'}
          </button>
          <button
            onClick={onCancel}
            className="px-3 py-1 text-xs border border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
            Cancel
          </button>
        </div>
      </div>
    )
  }

  // inline variant (full-width table row expansion)
  return (
    <div className="max-w-2xl">
      <p className="text-sm font-semibold text-orange-800 dark:text-orange-300 mb-3">
        📦 Top Up: {p.name}
      </p>

      {/* Current stats */}
      <div className="flex gap-3 flex-wrap mb-4 text-sm">
        <div className="bg-white dark:bg-gray-800 border border-orange-200 dark:border-orange-700 rounded-lg px-3 py-2">
          <p className="text-xs text-gray-500 dark:text-gray-400">Remaining stock</p>
          <p className="font-bold text-gray-900 dark:text-white">{p.remainingCount} items</p>
        </div>
        <div className="bg-white dark:bg-gray-800 border border-orange-200 dark:border-orange-700 rounded-lg px-3 py-2">
          <p className="text-xs text-gray-500 dark:text-gray-400">Current selling price</p>
          <p className="font-bold text-gray-900 dark:text-white">{formatPrice(Number(p.unitPrice))}/item</p>
        </div>
        {existingCostPerItem > 0 && (
          <div className="bg-white dark:bg-gray-800 border border-orange-200 dark:border-orange-700 rounded-lg px-3 py-2">
            <p className="text-xs text-gray-500 dark:text-gray-400">Current cost/item</p>
            <p className="font-bold text-gray-900 dark:text-white">
              ${existingCostPerItem.toFixed(4).replace(/\.?0+$/, '')}
            </p>
          </div>
        )}
      </div>

      {/* Inputs */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            New container item count *
          </label>
          <input
            type="number" min="1" step="1" placeholder="e.g. 48" autoFocus
            value={newCount} onChange={e => setNewCount(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-orange-300 dark:border-orange-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            New container cost ($)
          </label>
          <input
            type="number" min="0" step="0.01" placeholder="e.g. 25.00"
            value={newContainerCost} onChange={e => setNewContainerCost(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-orange-300 dark:border-orange-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>
      </div>

      {/* Weighted average */}
      {weightedAvg !== null && (
        <div className="mb-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg px-3 py-2 text-sm">
          <p className="text-xs text-blue-700 dark:text-blue-300 font-medium mb-0.5">Weighted average cost (all stock)</p>
          <p className="font-bold text-blue-900 dark:text-blue-200 text-base">
            ${weightedAvg.toFixed(4).replace(/\.?0+$/, '')}/item
          </p>
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
            Based on {p.remainingCount} existing + {newCount} new items
          </p>
        </div>
      )}

      {/* New selling price + expiry date */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            New selling price ($/item) *
          </label>
          <input
            type="number" min="0.01" step="0.01"
            value={newUnitPrice} onChange={e => setNewUnitPrice(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-orange-300 dark:border-orange-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
          {weightedAvg !== null && Number(newUnitPrice) > 0 && Number(newUnitPrice) < weightedAvg && (
            <p className="text-xs text-red-500 mt-1">⚠️ Selling price is below weighted average cost</p>
          )}
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Expiry date <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            type="date"
            value={expiryDate} onChange={e => setExpiryDate(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
            className="w-full px-3 py-2 text-sm border border-orange-300 dark:border-orange-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
          {expiryDate && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
              This batch will be tracked for expiry alerts
            </p>
          )}
        </div>
      </div>

      {error && <p className="text-xs text-red-500 mb-2">{error}</p>}

      <div className="flex gap-2">
        <button
          onClick={handleConfirm} disabled={saving}
          className="px-4 py-1.5 text-sm bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-lg font-medium">
          {saving ? 'Saving…' : 'Confirm Top Up'}
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700">
          Cancel
        </button>
      </div>
    </div>
  )
}
