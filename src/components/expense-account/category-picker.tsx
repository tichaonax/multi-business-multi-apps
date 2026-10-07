'use client'

import { useState, useEffect, useRef } from 'react'

export interface CategoryRef {
  categoryId: string
  categoryName: string
  subcategoryId: string | null
  subcategoryName: string | null
}

interface FlatCategory {
  id: string
  name: string
  emoji: string
  requiresSubcategory: boolean
  subcategories: { id: string; name: string; emoji: string | null }[]
}

interface CategoryPickerProps {
  value: CategoryRef | null
  onChange: (value: CategoryRef | null) => void
  disabled?: boolean
}

interface CategorySuggestion {
  categoryId: string
  categoryName: string
  categoryEmoji: string | null
  subcategoryId: string
  subcategoryName: string
  subcategoryEmoji: string | null
  domainName: string
  domainEmoji: string | null
}

/**
 * MBM-286: searchable, reusable expense/payment-type picker for receipt
 * entry — same combo-box UX as the payee picker in add-receipt-modal.tsx,
 * but filtering a small, already-fetched flat list client-side rather than
 * a debounced server search (the whole taxonomy is a few dozen rows, not
 * thousands). Reuses the existing category system (ExpenseCategories /
 * ExpenseSubcategories) already used by combo-pay planned items, personal
 * expenses, and petty cash — nothing new is introduced here except wiring
 * it into receipt capture, which never had a category field before.
 */
export function CategoryPicker({ value, onChange, disabled }: CategoryPickerProps) {
  const [categories, setCategories] = useState<FlatCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [changing, setChanging] = useState(!value)
  const [query, setQuery] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [pendingSubcategoryFor, setPendingSubcategoryFor] = useState<FlatCategory | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Suggest — same /api/expense-categories/suggest taxonomy search already
  // used by edit-payment-modal.tsx's classification Suggest, reused as-is
  // (same ExpenseCategories/ExpenseSubcategories data) rather than building
  // a second implementation. Matches across category + subcategory + domain
  // name text (not just this picker's own category-name-only search), so a
  // phrase like "diesel for delivery truck" can surface "Fuel & Energy"
  // even though neither word appears in that category's own name.
  const [suggestQuery, setSuggestQuery] = useState('')
  const [suggestOpen, setSuggestOpen] = useState(false)
  const [suggestLoading, setSuggestLoading] = useState(false)
  const [suggestions, setSuggestions] = useState<CategorySuggestion[]>([])

  async function handleSuggest() {
    const q = suggestQuery.trim()
    if (q.length < 2) return
    setSuggestLoading(true)
    setSuggestions([])
    setSuggestOpen(true)
    try {
      const res = await fetch(`/api/expense-categories/suggest?q=${encodeURIComponent(q)}`, { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setSuggestions((data.suggestions ?? []).map((s: any) => ({
          categoryId: s.categoryId, categoryName: s.categoryName, categoryEmoji: s.categoryEmoji,
          subcategoryId: s.subcategoryId, subcategoryName: s.subcategoryName, subcategoryEmoji: s.subcategoryEmoji,
          domainName: s.domainName, domainEmoji: s.domainEmoji,
        })))
      }
    } catch { /* non-fatal — suggestions list just stays empty */ }
    finally { setSuggestLoading(false) }
  }

  function applySuggestion(s: CategorySuggestion) {
    onChange({
      categoryId: s.categoryId,
      categoryName: `${s.categoryEmoji ?? ''} ${s.categoryName}`.trim(),
      subcategoryId: s.subcategoryId,
      subcategoryName: s.subcategoryName,
    })
    setSuggestOpen(false)
    setSuggestQuery('')
    setChanging(false)
    setQuery('')
  }

  useEffect(() => {
    fetch('/api/expense-categories', { credentials: 'include' })
      .then(r => r.json())
      .then(json => {
        const flat: FlatCategory[] = (json.domains ?? []).flatMap((d: any) =>
          (d.expense_categories ?? []).map((c: any) => ({
            id: c.id,
            name: c.name,
            emoji: c.emoji,
            requiresSubcategory: c.requiresSubcategory,
            subcategories: (c.expense_subcategories ?? []).map((s: any) => ({ id: s.id, name: s.name, emoji: s.emoji })),
          }))
        )
        setCategories(flat)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filtered = query.trim()
    ? categories.filter(c => c.name.toLowerCase().includes(query.trim().toLowerCase()))
    : categories

  // Warns (doesn't block) when the typed name is close to an existing one —
  // e.g. "Fuel" vs "Petrol" vs "fuel expense" — per MBM-286 Decision #4.
  const nearDuplicate = query.trim().length > 2
    ? categories.find(c => {
        const a = c.name.toLowerCase().replace(/[^a-z]/g, '')
        const b = query.trim().toLowerCase().replace(/[^a-z]/g, '')
        return a === b || a.includes(b) || b.includes(a)
      })
    : null

  function selectCategory(c: FlatCategory) {
    if (c.requiresSubcategory && c.subcategories.length > 0) {
      setPendingSubcategoryFor(c)
      return
    }
    onChange({ categoryId: c.id, categoryName: `${c.emoji} ${c.name}`, subcategoryId: null, subcategoryName: null })
    setChanging(false)
    setQuery('')
  }

  function selectSubcategory(c: FlatCategory, s: { id: string; name: string; emoji: string | null }) {
    onChange({ categoryId: c.id, categoryName: `${c.emoji} ${c.name}`, subcategoryId: s.id, subcategoryName: s.name })
    setPendingSubcategoryFor(null)
    setChanging(false)
    setQuery('')
  }

  async function createCategory(name: string) {
    setCreating(true)
    setCreateError(null)
    try {
      const res = await fetch('/api/expense-categories/flat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name, emoji: '💰', color: '#3B82F6' }),
      })
      const json = await res.json()
      if (!res.ok) { setCreateError(json.error || 'Failed to create category'); return }
      const created = json.data.category
      setCategories(prev => [...prev, { id: created.id, name: created.name, emoji: created.emoji, requiresSubcategory: false, subcategories: [] }])
      onChange({ categoryId: created.id, categoryName: `${created.emoji} ${created.name}`, subcategoryId: null, subcategoryName: null })
      setChanging(false)
      setQuery('')
    } catch {
      setCreateError('Failed to create category')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div ref={containerRef} className="relative">
      {!changing ? (
        <div className="flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700/50">
          <span className="flex-1 text-sm text-gray-900 dark:text-gray-100 truncate">
            {value ? (
              <>{value.categoryName}{value.subcategoryName ? ` · ${value.subcategoryName}` : ''}</>
            ) : (
              <span className="text-gray-400 dark:text-gray-500">No expense type selected</span>
            )}
          </span>
          <button
            type="button"
            onClick={() => setChanging(true)}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline shrink-0"
            disabled={disabled}
          >
            {value ? 'Change' : 'Select'}
          </button>
        </div>
      ) : pendingSubcategoryFor ? (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-2 space-y-1">
          <p className="text-xs text-gray-500 dark:text-gray-400 px-1 pb-1">
            {pendingSubcategoryFor.emoji} {pendingSubcategoryFor.name} — choose a subcategory
          </p>
          {pendingSubcategoryFor.subcategories.map(s => (
            <button
              key={s.id}
              type="button"
              onClick={() => selectSubcategory(pendingSubcategoryFor, s)}
              className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              {s.emoji ? `${s.emoji} ` : ''}{s.name}
            </button>
          ))}
          <button type="button" onClick={() => setPendingSubcategoryFor(null)} className="text-xs text-gray-400 hover:underline px-2">
            ← Back
          </button>
        </div>
      ) : (
        <div>
          <input
            type="text"
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="input w-full px-3 py-2 text-sm"
            placeholder={loading ? 'Loading types…' : 'Type to search expense types…'}
            disabled={disabled || loading}
          />
          <div className="flex gap-2 mt-2">
            <input
              type="text"
              value={suggestQuery}
              onChange={e => setSuggestQuery(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (suggestQuery.trim().length >= 2) handleSuggest() } }}
              placeholder="Describe the expense to suggest a type…"
              className="flex-1 min-w-0 px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
              disabled={disabled}
            />
            <button
              type="button"
              onClick={handleSuggest}
              disabled={disabled || suggestLoading || suggestQuery.trim().length < 2}
              className="px-3 py-1.5 text-xs font-medium border border-amber-400 text-amber-700 dark:text-amber-300 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
            >
              {suggestLoading ? '⏳' : '💡 Suggest'}
            </button>
          </div>
          <div className="absolute left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
            {filtered.map(c => (
              <button
                key={c.id}
                type="button"
                onClick={() => selectCategory(c)}
                className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 text-sm"
              >
                <span>{c.emoji}</span>
                <span className="flex-1 truncate text-gray-900 dark:text-gray-100">{c.name}</span>
              </button>
            ))}
            {!loading && query.trim() && filtered.length === 0 && (
              <div className="px-3 py-2 text-sm text-gray-400 dark:text-gray-500">No matching type</div>
            )}
            {!loading && query.trim() && !filtered.some(c => c.name.toLowerCase() === query.trim().toLowerCase()) && (
              <div className="border-t border-gray-100 dark:border-gray-700 px-3 py-2">
                {nearDuplicate && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mb-1">
                    ⚠️ Similar to existing type "{nearDuplicate.emoji} {nearDuplicate.name}" — create a new one anyway?
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => createCategory(query.trim())}
                  disabled={creating}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50"
                >
                  {creating ? 'Creating…' : `+ Create "${query.trim()}"`}
                </button>
                {createError && <p className="text-xs text-red-500 mt-1">{createError}</p>}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Suggest results overlay */}
      {suggestOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">💡 Suggested Expense Types</h3>
              <button
                type="button"
                onClick={() => setSuggestOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl leading-none"
              >
                ×
              </button>
            </div>
            <div className="p-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                Based on: <span className="font-medium text-gray-700 dark:text-gray-300">&ldquo;{suggestQuery.trim()}&rdquo;</span>
              </p>
              {suggestLoading && (
                <p className="text-sm text-gray-400 dark:text-gray-500 py-4 text-center">Searching taxonomy…</p>
              )}
              {!suggestLoading && suggestions.length === 0 && (
                <p className="text-sm text-gray-400 dark:text-gray-500 py-4 text-center">No matches found — please select manually.</p>
              )}
              {!suggestLoading && suggestions.length > 0 && (
                <ul className="space-y-2 max-h-80 overflow-y-auto">
                  {suggestions.map((s, i) => (
                    <li key={`${s.subcategoryId}-${i}`}>
                      <button
                        type="button"
                        onClick={() => applySuggestion(s)}
                        className="w-full text-left px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                      >
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">
                          {s.domainEmoji} {s.domainName} › {s.categoryEmoji} {s.categoryName}
                        </div>
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {s.subcategoryEmoji} {s.subcategoryName}
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex justify-end">
              <button
                type="button"
                onClick={() => setSuggestOpen(false)}
                className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
