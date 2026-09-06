'use client'

import { useState, useEffect, useMemo } from 'react'

interface TagOption {
  id: string
  name: string
  emoji: string
  groupLabel: string | null
}

interface Props {
  businessId: string
  /** Selected tag names — controlled, so the caller decides when/whether to
   * persist (immediately for an existing product, or buffered until a new
   * product is actually created — MBM-295). */
  value: string[]
  onChange: (names: string[]) => void
}

/**
 * Multi-select tag picker for the clothing "stocking" screens (MBM-295) —
 * search-to-filter over the business's own tags plus the shared system
 * vocabulary, each shown with its emoji. Purely presentational/controlled:
 * doesn't call any attach/detach endpoint itself, since a brand-new product
 * doesn't have an id to attach to yet.
 */
export function ProductTagPicker({ businessId, value, onChange }: Props) {
  const [tags, setTags] = useState<TagOption[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')

  useEffect(() => {
    if (!businessId) return
    setLoading(true)
    fetch(`/api/business/${businessId}/tags`)
      .then(r => r.ok ? r.json() : null)
      .then(d => setTags(d?.tags ?? []))
      .catch(() => setTags([]))
      .finally(() => setLoading(false))
  }, [businessId])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? tags.filter(t => t.name.toLowerCase().includes(q)) : tags
  }, [tags, query])

  function toggle(name: string) {
    onChange(value.includes(name) ? value.filter(n => n !== name) : [...value, name])
  }

  return (
    <div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {value.map(name => {
            const t = tags.find(x => x.name === name)
            return (
              <button
                key={name}
                type="button"
                onClick={() => toggle(name)}
                className="inline-flex items-center gap-1 text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 rounded-full px-2 py-1"
              >
                {t?.emoji ?? '🏷️'} {name} ✕
              </button>
            )
          })}
        </div>
      )}
      <input
        type="text"
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Search tags to add (fabric, fit, occasion, style…)"
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white text-sm mb-2"
      />
      <div className="max-h-40 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-2 flex flex-wrap gap-1.5">
        {loading ? (
          <span className="text-xs text-secondary">Loading tags…</span>
        ) : filtered.length === 0 ? (
          <span className="text-xs text-secondary">No tags match "{query}".</span>
        ) : (
          filtered.slice(0, 200).map(t => {
            const selected = value.includes(t.name)
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => toggle(t.name)}
                className={`text-xs rounded-full px-2 py-1 border ${
                  selected
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-blue-400'
                }`}
              >
                {t.emoji} {t.name}
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}

/**
 * Edit-mode wrapper around `ProductTagPicker` for a product that already
 * exists — loads its current tags and persists every toggle immediately via
 * `POST`/`DELETE /api/universal/products/[id]/tags`, the same
 * "acts on click, no separate save step" convention Set Primary/Remove
 * already use elsewhere in this app's image tooling.
 */
export function ProductTagsEditor({ businessId, productId }: { businessId: string; productId: string }) {
  const [tagNames, setTagNames] = useState<string[]>([])
  const [tagIdByName, setTagIdByName] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!productId) return
    setLoading(true)
    fetch(`/api/universal/products/${productId}/tags`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        const tags: TagOption[] = d?.tags ?? []
        setTagNames(tags.map(t => t.name))
        setTagIdByName(Object.fromEntries(tags.map(t => [t.name, t.id])))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [productId])

  async function handleChange(names: string[]) {
    const added = names.filter(n => !tagNames.includes(n))
    const removed = tagNames.filter(n => !names.includes(n))
    setTagNames(names)

    for (const name of added) {
      try {
        const res = await fetch(`/api/universal/products/${productId}/tags`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name }),
        })
        const data = await res.json().catch(() => ({}))
        if (data?.tag?.id) setTagIdByName(prev => ({ ...prev, [name]: data.tag.id }))
      } catch { /* best-effort — the picker's own list stays the source of truth on next load */ }
    }
    for (const name of removed) {
      const tagId = tagIdByName[name]
      if (!tagId) continue
      fetch(`/api/universal/products/${productId}/tags`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tagId }),
      }).catch(() => {})
    }
  }

  if (loading) return <p className="text-xs text-secondary">Loading tags…</p>
  return <ProductTagPicker businessId={businessId} value={tagNames} onChange={handleChange} />
}
