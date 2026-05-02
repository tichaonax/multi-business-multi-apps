'use client'

import { useState } from 'react'
import { PayeeSelector } from './payee-selector'
import { ComboRequestItemRow, ComboItem } from './combo-request-item-row'

export type SectionType = 'GROCERY' | 'MONTHLY_CONTRIBUTION' | 'SCHOOL_FEES' | 'CUSTOM'

export interface ComboSection {
  _id: string
  sectionType: SectionType
  sectionName: string
  payee: { type: string; id: string; name: string } | null
  notes: string
  items: ComboItem[]
}

interface Category {
  id: string
  name: string
  emoji: string
  color: string
}

interface ComboRequestSectionProps {
  section: ComboSection
  sectionIndex: number
  categories: Category[]
  onChange: (updated: ComboSection) => void
  onRemove: () => void
}

const SECTION_TYPE_LABELS: Record<SectionType, string> = {
  GROCERY: 'Grocery / Supplies',
  MONTHLY_CONTRIBUTION: 'Monthly Contribution',
  SCHOOL_FEES: 'School Fees',
  CUSTOM: 'Custom',
}

const SECTION_TYPE_ICONS: Record<SectionType, string> = {
  GROCERY: '🛒',
  MONTHLY_CONTRIBUTION: '📅',
  SCHOOL_FEES: '🎓',
  CUSTOM: '📋',
}

function newItem(): ComboItem {
  return {
    _id: crypto.randomUUID(),
    description: '',
    quantity: '',
    unit: '',
    estimatedAmount: '',
    categoryId: '',
    subcategoryId: '',
    payee: null,
    notes: '',
  }
}

export function ComboRequestSection({
  section,
  sectionIndex,
  categories,
  onChange,
  onRemove,
}: ComboRequestSectionProps) {
  const [collapsed, setCollapsed] = useState(false)

  function updateItem(index: number, updated: ComboItem) {
    const items = [...section.items]
    items[index] = updated
    onChange({ ...section, items })
  }

  function removeItem(index: number) {
    const items = section.items.filter((_, i) => i !== index)
    onChange({ ...section, items: items.length > 0 ? items : [newItem()] })
  }

  function addItemAt(index: number) {
    const items = [...section.items]
    items.splice(index + 1, 0, newItem())
    onChange({ ...section, items })
  }

  function addItem() {
    onChange({ ...section, items: [...section.items, newItem()] })
  }

  const sectionTotal = section.items.reduce((sum, item) => {
    const amt = parseFloat(item.estimatedAmount)
    return sum + (isNaN(amt) ? 0 : amt)
  }, 0)

  const payeeLabel = section.payee?.name

  return (
    <div className="border border-gray-300 rounded-xl bg-gray-50 overflow-hidden">
      {/* Section header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200">
        <button
          type="button"
          onClick={() => setCollapsed(v => !v)}
          className="text-gray-500 hover:text-gray-700 transition-colors"
        >
          <svg
            className={`w-4 h-4 transition-transform ${collapsed ? '-rotate-90' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <span className="text-lg">{SECTION_TYPE_ICONS[section.sectionType]}</span>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <select
              value={section.sectionType}
              onChange={e => onChange({ ...section, sectionType: e.target.value as SectionType })}
              className="text-sm font-medium border-0 bg-transparent focus:outline-none focus:ring-0 cursor-pointer text-gray-800"
            >
              {(Object.keys(SECTION_TYPE_LABELS) as SectionType[]).map(t => (
                <option key={t} value={t}>{SECTION_TYPE_LABELS[t]}</option>
              ))}
            </select>
            {payeeLabel && (
              <span className="text-xs text-gray-500 truncate">— {payeeLabel}</span>
            )}
          </div>
          {section.sectionType === 'CUSTOM' && (
            <input
              type="text"
              value={section.sectionName}
              onChange={e => onChange({ ...section, sectionName: e.target.value })}
              placeholder="Section name"
              className="text-xs text-gray-600 border-0 bg-transparent focus:outline-none w-full mt-0.5"
            />
          )}
        </div>

        <div className="shrink-0 text-sm font-semibold text-gray-700">
          ${sectionTotal.toFixed(2)}
        </div>

        <button
          type="button"
          onClick={onRemove}
          className="shrink-0 text-gray-400 hover:text-red-500 transition-colors p-1"
          title="Remove section"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      {/* Section body */}
      {!collapsed && (
        <div className="p-4 space-y-3">
          {/* Section-level payee */}
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1">Default payee for this section (optional)</label>
              <PayeeSelector
                value={section.payee ? { type: section.payee.type, id: section.payee.id } : null}
                onChange={payee => onChange({ ...section, payee: payee ? { type: payee.type, id: payee.id, name: payee.name } : null })}
              />
            </div>
          </div>

          {/* Items */}
          <div className="space-y-2">
            {section.items.map((item, idx) => (
              <ComboRequestItemRow
                key={item._id}
                item={item}
                index={idx}
                categories={categories}
                onChange={updated => updateItem(idx, updated)}
                onRemove={() => removeItem(idx)}
                onAddBelow={() => addItemAt(idx)}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={addItem}
            className="w-full py-2 text-sm text-blue-600 hover:text-blue-800 border border-dashed border-blue-300 hover:border-blue-500 rounded-lg transition-colors"
          >
            + Add Item
          </button>

          {/* Section notes */}
          <div>
            <input
              type="text"
              value={section.notes}
              onChange={e => onChange({ ...section, notes: e.target.value })}
              placeholder="Section notes (optional)"
              className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>
        </div>
      )}
    </div>
  )
}
