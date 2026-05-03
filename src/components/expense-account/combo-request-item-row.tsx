'use client'

import { useState, useEffect, useRef } from 'react'
import { PayeeSelector } from './payee-selector'

export interface Domain {
  id: string
  label: string
}

export interface ComboItem {
  _id: string
  description: string
  quantity: string
  unit: string
  unitPrice: string
  estimatedAmount: string
  categoryId: string
  subcategoryId: string
  payee: { type: string; id: string; name: string } | null
  notes: string
}

interface ComboRequestItemRowProps {
  item: ComboItem
  index: number
  domains: Domain[]
  onChange: (updated: ComboItem) => void
  onRemove: () => void
  onAddBelow: () => void
}

interface Suggestion {
  domainId: string
  domainName: string
  domainEmoji: string | null
  categoryId: string
  categoryName: string
  categoryEmoji: string | null
  subcategoryId: string
  subcategoryName: string
  subcategoryEmoji: string | null
  subSubcategoryId: string | null
  subSubcategoryName: string | null
}

// Generic searchable dropdown used at each hierarchy level
function SearchSelect({
  value,
  options,
  onChange,
  placeholder,
  loading = false,
}: {
  value: string
  options: { id: string; label: string }[]
  onChange: (id: string) => void
  placeholder: string
  loading?: boolean
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const selected = options.find(o => o.id === value)
  const filtered = options.filter(o =>
    !query || o.label.toLowerCase().includes(query.toLowerCase())
  )

  return (
    <div className="relative">
      <div className="relative">
        <input
          type="text"
          value={open ? query : (selected?.label ?? '')}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => { setQuery(''); setOpen(true) }}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={loading ? 'Loading...' : placeholder}
          disabled={loading}
          className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-2 pr-6 py-1.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        />
        {value && (
          <button
            type="button"
            onMouseDown={e => { e.preventDefault(); onChange(''); setQuery('') }}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-base leading-none"
          >×</button>
        )}
      </div>
      {open && !loading && (
        <div className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-400 dark:text-gray-500">No matches</div>
          ) : (
            filtered.map((o, idx) => (
              <button
                key={`${o.id}-${idx}`}
                type="button"
                onMouseDown={() => { onChange(o.id); setOpen(false); setQuery('') }}
                className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 ${o.id === value ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium' : 'text-gray-900 dark:text-gray-100'}`}
              >
                {o.label}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}

// Domain → Category → Sub-Category cascade + on-demand suggest
function ItemCategorySelector({
  domains,
  categoryId,
  subcategoryId,
  description,
  onChange,
}: {
  domains: Domain[]
  categoryId: string
  subcategoryId: string
  description: string
  onChange: (categoryId: string, subcategoryId: string) => void
}) {
  const [domainId, setDomainId] = useState('')
  const [categories, setCategories] = useState<{ id: string; label: string }[]>([])
  const [loadingCats, setLoadingCats] = useState(false)
  const [subcategories, setSubcategories] = useState<{ id: string; label: string }[]>([])
  const [loadingSubs, setLoadingSubs] = useState(false)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [loadingSuggest, setLoadingSuggest] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)

  // Fetch categories under selected domain
  useEffect(() => {
    if (!domainId) { setCategories([]); return }
    setLoadingCats(true)
    fetch(`/api/expense-categories/${domainId}/subcategories`, { credentials: 'include' })
      .then(r => r.json())
      .then(data => setCategories(
        (data.subcategories ?? []).map((c: any, i: number) => ({ id: c.id ?? String(i), label: `${c.emoji || ''} ${c.name}`.trim() }))
      ))
      .catch(() => setCategories([]))
      .finally(() => setLoadingCats(false))
  }, [domainId])

  // Load subcategories when categoryId changes
  useEffect(() => {
    if (!categoryId) { setSubcategories([]); return }
    setLoadingSubs(true)
    fetch(`/api/expense-categories/${categoryId}/subcategories`, { credentials: 'include' })
      .then(r => r.json())
      .then(data => setSubcategories(
        (data.subcategories ?? []).map((s: any, i: number) => ({ id: s.id ?? String(i), label: `${s.emoji || ''} ${s.name}`.trim() }))
      ))
      .catch(() => setSubcategories([]))
      .finally(() => setLoadingSubs(false))
  }, [categoryId])

  const fetchSuggestions = async () => {
    const q = description.trim()
    if (q.length < 2) return
    setLoadingSuggest(true)
    setShowSuggestions(true)
    setSuggestions([])
    try {
      const params = new URLSearchParams({ q })
      if (domainId) params.set('domainId', domainId)
      const res = await fetch(`/api/expense-categories/suggest?${params}`, { credentials: 'include' })
      const data = await res.json()
      setSuggestions(data.suggestions ?? [])
    } catch {
      setSuggestions([])
    } finally {
      setLoadingSuggest(false)
    }
  }

  const applySuggestion = (s: Suggestion) => {
    setDomainId(s.domainId)
    onChange(s.categoryId, s.subcategoryId)
    setShowSuggestions(false)
  }

  const canSuggest = description.trim().length >= 2

  return (
    <div className="space-y-1.5">
      {/* Domain row + Suggest button */}
      <div className="flex gap-1.5 items-center">
        <div className="flex-1 min-w-0">
          <SearchSelect
            value={domainId}
            options={domains}
            onChange={id => { setDomainId(id); setCategories([]); onChange('', ''); setShowSuggestions(false) }}
            placeholder="Domain (optional)"
          />
        </div>
        {domainId && (
          <button
            type="button"
            onClick={fetchSuggestions}
            disabled={!canSuggest || loadingSuggest}
            title={canSuggest ? 'Suggest category based on description' : 'Enter at least 2 characters in description first'}
            className="shrink-0 text-xs px-2 py-1.5 rounded border border-purple-200 dark:border-purple-700 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
          >
            {loadingSuggest ? '…' : '✨ Suggest'}
          </button>
        )}
      </div>

      {/* Suggest results panel */}
      {showSuggestions && domainId && (
        <div className="border border-purple-200 dark:border-purple-700 rounded-lg bg-purple-50 dark:bg-purple-900/10 overflow-hidden">
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-purple-200 dark:border-purple-700">
            <span className="text-xs font-medium text-purple-700 dark:text-purple-300">Suggestions for "{description.trim()}"</span>
            <button type="button" onClick={() => setShowSuggestions(false)} className="text-purple-400 hover:text-purple-600 text-sm">×</button>
          </div>
          {loadingSuggest ? (
            <div className="px-3 py-2 text-xs text-gray-400 dark:text-gray-500">Loading suggestions…</div>
          ) : suggestions.length === 0 ? (
            <div className="px-3 py-2 text-xs text-gray-400 dark:text-gray-500">No suggestions found for this description.</div>
          ) : (
            <div className="divide-y divide-purple-100 dark:divide-purple-800/50">
              {suggestions.map((s, idx) => (
                <button
                  key={`${s.subcategoryId}-${idx}`}
                  type="button"
                  onClick={() => applySuggestion(s)}
                  className="w-full px-3 py-2 text-left hover:bg-purple-100 dark:hover:bg-purple-800/30 transition-colors"
                >
                  <div className="text-xs text-gray-900 dark:text-gray-100">
                    <span className="text-purple-600 dark:text-purple-400">{s.categoryEmoji} {s.categoryName}</span>
                    <span className="text-gray-400 mx-1">›</span>
                    <span>{s.subcategoryEmoji} {s.subcategoryName}</span>
                    {s.subSubcategoryName && (
                      <>
                        <span className="text-gray-400 mx-1">›</span>
                        <span className="text-gray-500 dark:text-gray-400">{s.subSubcategoryName}</span>
                      </>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Category (shown after domain selected) */}
      {domainId && (
        <SearchSelect
          value={categoryId}
          options={categories}
          onChange={id => onChange(id, '')}
          placeholder="Category (optional)"
          loading={loadingCats}
        />
      )}

      {/* Sub-category (shown after category selected) */}
      {categoryId && (
        <SearchSelect
          value={subcategoryId}
          options={subcategories}
          onChange={id => onChange(categoryId, id)}
          placeholder="Sub-category (optional)"
          loading={loadingSubs}
        />
      )}
    </div>
  )
}

export function ComboRequestItemRow({
  item,
  index,
  domains,
  onChange,
  onRemove,
  onAddBelow,
}: ComboRequestItemRowProps) {
  const [showExtra, setShowExtra] = useState(false)
  const descRef = useRef<HTMLInputElement>(null)

  // Auto-calculate total when qty × unit price are both filled
  useEffect(() => {
    const qty = parseFloat(item.quantity)
    const price = parseFloat(item.unitPrice)
    if (!isNaN(qty) && !isNaN(price) && qty > 0 && price > 0) {
      const total = (qty * price).toFixed(2)
      if (total !== item.estimatedAmount) {
        onChange({ ...item, estimatedAmount: total })
      }
    }
  }, [item.quantity, item.unitPrice]) // eslint-disable-line react-hooks/exhaustive-deps

  function update(field: keyof ComboItem, value: string | null | { type: string; id: string; name: string }) {
    onChange({ ...item, [field]: value })
  }

  function handleDescKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      onAddBelow()
    }
  }

  const qty = parseFloat(item.quantity)
  const unitPrice = parseFloat(item.unitPrice)
  const isAutoCalc = !isNaN(qty) && !isNaN(unitPrice) && qty > 0 && unitPrice > 0

  const inputBase = 'w-full border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500'
  const labelBase = 'block text-xs text-gray-400 dark:text-gray-500 mb-0.5'

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-white dark:bg-gray-800 space-y-2">
      {/* Row 1: description + remove */}
      <div className="flex gap-2 items-center">
        <input
          ref={descRef}
          type="text"
          value={item.description}
          onChange={e => update('description', e.target.value)}
          onKeyDown={handleDescKeyDown}
          placeholder={`Item ${index + 1} description (Enter to add another)`}
          className="flex-1 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
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

      {/* Row 2: qty | unit | unit price | = total */}
      <div className="flex gap-2 items-end">
        <div className="w-16 shrink-0">
          <label className={labelBase}>Qty</label>
          <input type="number" value={item.quantity} onChange={e => update('quantity', e.target.value)} placeholder="0" min="0" className={inputBase} />
        </div>
        <div className="w-16 shrink-0">
          <label className={labelBase}>Unit</label>
          <input type="text" value={item.unit} onChange={e => update('unit', e.target.value)} placeholder="kg, pcs…" className={inputBase} />
        </div>
        <div className="w-24 shrink-0">
          <label className={labelBase}>Unit Price</label>
          <input type="number" value={item.unitPrice} onChange={e => update('unitPrice', e.target.value)} placeholder="0.00" min="0" step="0.01" className={inputBase} />
        </div>
        <div className="flex items-end gap-1 flex-1 min-w-0">
          {isAutoCalc && <span className="text-gray-400 dark:text-gray-500 pb-1.5 text-sm">=</span>}
          <div className="flex-1 min-w-0">
            <label className={labelBase}>Total</label>
            <input
              type="number"
              value={item.estimatedAmount}
              onChange={e => update('estimatedAmount', e.target.value)}
              placeholder="0.00"
              min="0"
              step="0.01"
              readOnly={isAutoCalc}
              className={`${inputBase} ${isAutoCalc ? 'bg-gray-50 dark:bg-gray-600/50 cursor-default' : ''}`}
            />
          </div>
        </div>
      </div>

      {/* Row 3: Domain → Category → Sub-Category + payee/notes toggle */}
      <div className="flex gap-2 items-start">
        <div className="flex-1 min-w-0">
          <ItemCategorySelector
            domains={domains}
            categoryId={item.categoryId}
            subcategoryId={item.subcategoryId}
            description={item.description}
            onChange={(catId, subId) => onChange({ ...item, categoryId: catId, subcategoryId: subId })}
          />
        </div>
        <button
          type="button"
          onClick={() => setShowExtra(v => !v)}
          className="shrink-0 mt-0.5 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 px-2 py-1.5 rounded border border-blue-200 dark:border-blue-700 hover:border-blue-400 dark:hover:border-blue-500 transition-colors"
        >
          {showExtra ? 'Less' : '+ Payee/Notes'}
        </button>
      </div>

      {/* Row 4: payee + notes (expandable) */}
      {showExtra && (
        <div className="space-y-2 pt-1 border-t border-gray-100 dark:border-gray-700">
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Payee override (optional)</label>
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
              className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      )}
    </div>
  )
}
