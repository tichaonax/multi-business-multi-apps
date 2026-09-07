'use client'

import { useState, useEffect, useMemo } from 'react'

interface Option { id: string; value: string; isShared: boolean }

interface Props {
  businessId: string
  attributeKey: 'sizes' | 'colors'
  /** Selected values — controlled. */
  value: string[]
  onChange: (values: string[]) => void
  placeholder?: string
}

/**
 * Multi-select picker for simple product attribute vocabularies (sizes,
 * colors) — search-to-filter over the business's own values plus the shared
 * preset list, with an inline "add new" affordance for anything not yet in
 * the list. New values are persisted immediately so they show up here again
 * next time, for any staff member (same pattern as ProductTagPicker/Tags).
 */
export function AttributeOptionsPicker({ businessId, attributeKey, value, onChange, placeholder }: Props) {
  const [options, setOptions] = useState<Option[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    if (!businessId) return
    setLoading(true)
    fetch(`/api/business/${businessId}/attribute-options?key=${attributeKey}`)
      .then(r => (r.ok ? r.json() : null))
      .then(d => setOptions(d?.options ?? []))
      .catch(() => setOptions([]))
      .finally(() => setLoading(false))
  }, [businessId, attributeKey])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? options.filter(o => o.value.toLowerCase().includes(q)) : options
  }, [options, query])

  const exactMatch = useMemo(
    () => options.some(o => o.value.toLowerCase() === query.trim().toLowerCase()),
    [options, query]
  )

  function toggle(v: string) {
    onChange(value.includes(v) ? value.filter(x => x !== v) : [...value, v])
  }

  async function handleAddNew() {
    const newValue = query.trim()
    if (!newValue || adding) return
    setAdding(true)
    try {
      const res = await fetch(`/api/business/${businessId}/attribute-options`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: attributeKey, value: newValue }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data?.option) {
        setOptions(prev => (prev.some(o => o.id === data.option.id) ? prev : [...prev, data.option]))
        onChange(value.includes(data.option.value) ? value : [...value, data.option.value])
        setQuery('')
      }
    } finally {
      setAdding(false)
    }
  }

  return (
    <div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {value.map(v => (
            <button
              key={v}
              type="button"
              onClick={() => toggle(v)}
              className="inline-flex items-center gap-1 text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 rounded-full px-2 py-1"
            >
              {v} ✕
            </button>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && query.trim() && !exactMatch) { e.preventDefault(); handleAddNew() } }}
          placeholder={placeholder ?? `Search or add a new ${attributeKey === 'sizes' ? 'size' : 'color'}…`}
          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white text-sm"
        />
        {query.trim() && !exactMatch && (
          <button
            type="button"
            onClick={handleAddNew}
            disabled={adding}
            className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm disabled:opacity-50 whitespace-nowrap"
          >
            {adding ? 'Adding…' : `+ Add "${query.trim()}"`}
          </button>
        )}
      </div>
      <div className="max-h-32 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-2 flex flex-wrap gap-1.5 mt-2">
        {loading ? (
          <span className="text-xs text-secondary">Loading…</span>
        ) : filtered.length === 0 ? (
          <span className="text-xs text-secondary">No matches — type above to add a new one.</span>
        ) : (
          filtered.map((o) => {
            const selected = value.includes(o.value)
            return (
              <button
                key={o.id}
                type="button"
                onClick={() => toggle(o.value)}
                className={`text-xs rounded-full px-2 py-1 border ${
                  selected
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-blue-400'
                }`}
              >
                {o.value}
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
