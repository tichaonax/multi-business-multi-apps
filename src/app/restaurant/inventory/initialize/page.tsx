'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { useToastContext } from '@/components/ui/toast'

interface TrackedItem {
  businessProductId: string
  name: string
  price: number
  category: string
  totalRemaining: number
}

interface BatchInput {
  quantity: string        // total portions being added
  rawCost: string         // price of one whole raw unit (e.g. one chicken)
  piecesPerUnit: string   // portions from one whole unit
  submitting: boolean
}

export default function PrepInventoryInitializePage() {
  const { currentBusinessId } = useBusinessPermissionsContext()
  const { push: toast, error: toastError } = useToastContext()
  const [items, setItems] = useState<TrackedItem[]>([])
  const [inputs, setInputs] = useState<Record<string, BatchInput>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!currentBusinessId) return
    fetchItems()
  }, [currentBusinessId])

  async function fetchItems() {
    setLoading(true)
    try {
      const res = await fetch(`/api/restaurant/inventory-batches?businessId=${currentBusinessId}`)
      const json = await res.json()
      if (json.success) {
        setItems(json.data)
        const defaults: Record<string, BatchInput> = {}
        json.data.forEach((item: TrackedItem) => {
          defaults[item.businessProductId] = { quantity: '', rawCost: '', piecesPerUnit: '', submitting: false }
        })
        setInputs(defaults)
      }
    } catch {
      toastError('Failed to load tracked items')
    } finally {
      setLoading(false)
    }
  }

  function setField(productId: string, field: keyof Omit<BatchInput, 'submitting'>, value: string) {
    setInputs(prev => ({ ...prev, [productId]: { ...prev[productId], [field]: value } }))
  }

  // cost per piece = rawCost / piecesPerUnit
  function calcCostPerUnit(input: BatchInput): number | null {
    const raw = parseFloat(input.rawCost)
    const pieces = parseFloat(input.piecesPerUnit)
    if (!raw || !pieces || pieces <= 0) return null
    return raw / pieces
  }

  async function submitBatch(productId: string) {
    const input = inputs[productId]
    const qty = parseInt(input.quantity)
    const costPerUnit = calcCostPerUnit(input)

    if (!qty || qty < 1) { toastError('Quantity must be at least 1'); return }
    if (costPerUnit === null || costPerUnit < 0) { toastError('Enter raw cost and pieces per unit to calculate cost'); return }

    setInputs(prev => ({ ...prev, [productId]: { ...prev[productId], submitting: true } }))
    try {
      const res = await fetch('/api/restaurant/inventory-batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessProductId: productId, businessId: currentBusinessId, quantity: qty, costPerUnit }),
      })
      const json = await res.json()
      if (json.success) {
        setInputs(prev => ({ ...prev, [productId]: { quantity: '', rawCost: '', piecesPerUnit: '', submitting: false } }))
        setItems(prev => prev.map(i => i.businessProductId === productId ? { ...i, totalRemaining: i.totalRemaining + qty } : i))
        toast(`Added ${qty} units to ${items.find(i => i.businessProductId === productId)?.name}`, { type: 'success' })
      } else {
        toastError(json.error || 'Failed to add batch')
        setInputs(prev => ({ ...prev, [productId]: { ...prev[productId], submitting: false } }))
      }
    } catch {
      toastError('Failed to add batch')
      setInputs(prev => ({ ...prev, [productId]: { ...prev[productId], submitting: false } }))
    }
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 p-4">
      <div className="max-w-3xl mx-auto">
        {/* Nav */}
        <div className="mb-6 flex gap-2">
          <Link href="/restaurant/inventory" className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm">
            ← Inventory
          </Link>
          <Link href="/restaurant/inventory/config" className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 text-sm">
            Configure Tracked Items
          </Link>
        </div>

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Daily Initialization</h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
            Add today's prepared quantities. Enter the raw material cost and yield to auto-calculate cost per portion.
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading tracked items...</div>
        ) : items.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">No items are currently tracked for inventory.</p>
            <Link href="/restaurant/inventory/config" className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-sm">
              Configure Tracked Items →
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map(item => {
              const input = inputs[item.businessProductId] || { quantity: '', rawCost: '', piecesPerUnit: '', submitting: false }
              const costPerUnit = calcCostPerUnit(input)
              const qty = parseInt(input.quantity) || 0
              const totalCost = costPerUnit !== null && qty > 0 ? qty * costPerUnit : null

              return (
                <div key={item.businessProductId} className={`border rounded-lg p-4 bg-white dark:bg-gray-800 ${item.totalRemaining > 0 ? 'border-l-4 border-l-amber-400 border-gray-200 dark:border-gray-700' : 'border-gray-200 dark:border-gray-700'}`}>
                  {/* Product header */}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <span className="font-semibold text-gray-900 dark:text-gray-100">{item.name}</span>
                      {item.category && <span className="ml-2 text-xs text-gray-500">{item.category}</span>}
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-sm text-gray-500">Sells for ${item.price.toFixed(2)}</span>
                        {item.totalRemaining > 0 ? (
                          <span className="text-sm text-amber-600 dark:text-amber-400 font-medium">{item.totalRemaining} carried over</span>
                        ) : (
                          <span className="text-sm text-gray-400">No carry-over</span>
                        )}
                      </div>
                    </div>
                    {/* Calculated cost per unit display */}
                    {costPerUnit !== null && (
                      <div className="text-right">
                        <div className="text-xs text-gray-500">Cost/portion</div>
                        <div className="text-lg font-bold text-teal-600 dark:text-teal-400">${costPerUnit.toFixed(4)}</div>
                      </div>
                    )}
                  </div>

                  {/* Inputs grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Portions today *</label>
                      <input
                        type="number"
                        min="1"
                        value={input.quantity}
                        onChange={e => setField(item.businessProductId, 'quantity', e.target.value)}
                        placeholder="e.g. 12"
                        className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Cost per unit ($) *</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={input.rawCost}
                        onChange={e => setField(item.businessProductId, 'rawCost', e.target.value)}
                        placeholder="e.g. 5.00"
                        className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Portions per unit *</label>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={input.piecesPerUnit}
                        onChange={e => setField(item.businessProductId, 'piecesPerUnit', e.target.value)}
                        placeholder="e.g. 4"
                        className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Total cost</label>
                      <div className="w-full px-2 py-1.5 border border-gray-200 dark:border-gray-700 rounded bg-gray-50 dark:bg-gray-700/50 text-sm font-medium text-gray-700 dark:text-gray-300 min-h-[34px]">
                        {totalCost !== null ? `$${totalCost.toFixed(2)}` : <span className="text-gray-400">—</span>}
                      </div>
                    </div>
                  </div>

                  {/* Add button */}
                  <div className="flex justify-end">
                    <button
                      onClick={() => submitBatch(item.businessProductId)}
                      disabled={input.submitting || !input.quantity || costPerUnit === null}
                      className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 text-sm font-medium"
                    >
                      {input.submitting ? 'Adding...' : 'Add Batch'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
