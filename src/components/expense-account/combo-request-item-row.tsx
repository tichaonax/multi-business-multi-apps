'use client'

import { useState, useEffect, useRef } from 'react'
import { PayeeSelector } from './payee-selector'

interface Category {
  id: string
  name: string
  emoji: string
  color: string
}

interface Subcategory {
  id: string
  name: string
  emoji?: string | null
}

export interface ComboItem {
  _id: string
  description: string
  quantity: string
  unit: string
  estimatedAmount: string
  categoryId: string
  subcategoryId: string
  payee: { type: string; id: string; name: string } | null
  notes: string
}

interface ComboRequestItemRowProps {
  item: ComboItem
  index: number
  categories: Category[]
  onChange: (updated: ComboItem) => void
  onRemove: () => void
  onAddBelow: () => void
}

export function ComboRequestItemRow({
  item,
  index,
  categories,
  onChange,
  onRemove,
  onAddBelow,
}: ComboRequestItemRowProps) {
  const [subcategories, setSubcategories] = useState<Subcategory[]>([])
  const [loadingSubs, setLoadingSubs] = useState(false)
  const [showExtra, setShowExtra] = useState(false)
  const descRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!item.categoryId) {
      setSubcategories([])
      onChange({ ...item, subcategoryId: '' })
      return
    }
    setLoadingSubs(true)
    fetch(`/api/expense-categories/${item.categoryId}/subcategories`, { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        const subs: Subcategory[] = (data.subcategories || []).sort((a: Subcategory, b: Subcategory) =>
          a.name.localeCompare(b.name)
        )
        setSubcategories(subs)
        // Reset subcategory if it no longer exists in new list
        if (item.subcategoryId && !subs.find(s => s.id === item.subcategoryId)) {
          onChange({ ...item, subcategoryId: '' })
        }
      })
      .catch(() => setSubcategories([]))
      .finally(() => setLoadingSubs(false))
  }, [item.categoryId])

  function update(field: keyof ComboItem, value: string | null | { type: string; id: string; name: string }) {
    onChange({ ...item, [field]: value })
  }

  function handleDescKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      onAddBelow()
    }
  }

  const selectedCategory = categories.find(c => c.id === item.categoryId)

  return (
    <div className="border border-gray-200 rounded-lg p-3 bg-white space-y-2">
      {/* Row 1: description + qty + unit + amount + remove */}
      <div className="flex gap-2 items-start">
        <div className="flex-1 min-w-0">
          <input
            ref={descRef}
            type="text"
            value={item.description}
            onChange={e => update('description', e.target.value)}
            onKeyDown={handleDescKeyDown}
            placeholder={`Item ${index + 1} description (Enter to add another)`}
            className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="w-16 shrink-0">
          <input
            type="number"
            value={item.quantity}
            onChange={e => update('quantity', e.target.value)}
            placeholder="Qty"
            min="0"
            className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="w-16 shrink-0">
          <input
            type="text"
            value={item.unit}
            onChange={e => update('unit', e.target.value)}
            placeholder="Unit"
            className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="w-24 shrink-0">
          <input
            type="number"
            value={item.estimatedAmount}
            onChange={e => update('estimatedAmount', e.target.value)}
            placeholder="Amount"
            min="0"
            step="0.01"
            className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="shrink-0 text-gray-400 hover:text-red-500 transition-colors p-1.5"
          title="Remove item"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Row 2: category + subcategory */}
      <div className="flex gap-2">
        <div className="flex-1">
          <select
            value={item.categoryId}
            onChange={e => update('categoryId', e.target.value)}
            className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">Category (optional)</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>
            ))}
          </select>
        </div>
        {item.categoryId && (
          <div className="flex-1">
            {loadingSubs ? (
              <div className="border border-gray-300 rounded-md px-2 py-1.5 text-sm text-gray-400">Loading...</div>
            ) : (
              <select
                value={item.subcategoryId}
                onChange={e => update('subcategoryId', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">Subcategory (optional)</option>
                {subcategories.map(s => (
                  <option key={s.id} value={s.id}>{s.emoji ? `${s.emoji} ` : ''}{s.name}</option>
                ))}
              </select>
            )}
          </div>
        )}
        <button
          type="button"
          onClick={() => setShowExtra(v => !v)}
          className="shrink-0 text-xs text-blue-600 hover:text-blue-800 px-2 py-1.5 rounded border border-blue-200 hover:border-blue-400 transition-colors"
        >
          {showExtra ? 'Less' : '+ Payee/Notes'}
        </button>
      </div>

      {/* Row 3: payee + notes (expandable) */}
      {showExtra && (
        <div className="space-y-2 pt-1 border-t border-gray-100">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Payee override (optional)</label>
            <PayeeSelector
              value={item.payee ? { type: item.payee.type, id: item.payee.id } : null}
              onChange={payee => onChange({ ...item, payee: payee ? { type: payee.type, id: payee.id, name: payee.name } : null })}
            />
          </div>
          <div>
            <input
              type="text"
              value={item.notes}
              onChange={e => update('notes', e.target.value)}
              placeholder="Notes (optional)"
              className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      )}
    </div>
  )
}
