'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

interface ChickenRunCategory {
  id: string
  name: string
  emoji?: string | null
}

interface Props {
  group: 'feed_type' | 'medication' | 'vaccination'
  value: string
  onChange: (value: string) => void
  placeholder?: string
  required?: boolean
}

export function ChickenRunCategorySelect({
  group,
  value,
  onChange,
  placeholder = 'Select or type new…',
  required = false,
}: Props) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [categories, setCategories] = useState<ChickenRunCategory[]>([])
  const [creating, setCreating] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const loadCategories = useCallback(async () => {
    try {
      const res = await fetch(`/api/chicken-run/categories?group=${group}`, { credentials: 'include' })
      const json = await res.json()
      if (res.ok) setCategories(json.data || [])
    } catch {
      // non-critical
    }
  }, [group])

  useEffect(() => { loadCategories() }, [loadCategories])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  const filtered = categories.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  )
  const exactMatch = categories.some(c => c.name.toLowerCase() === search.trim().toLowerCase())
  const showCreate = search.trim().length > 0 && !exactMatch

  const select = (name: string) => {
    onChange(name)
    setOpen(false)
    setSearch('')
  }

  const handleCreate = async () => {
    const name = search.trim()
    if (!name) return
    setCreating(true)
    try {
      const res = await fetch('/api/chicken-run/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name, group }),
      })
      const json = await res.json()
      if (res.ok) {
        await loadCategories()
        select(json.data.name)
      } else {
        // Still set the value even if save failed
        select(name)
      }
    } catch {
      select(name)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-green-500"
      >
        <span className={value ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500'}>
          {value || placeholder}
        </span>
        <svg
          className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg max-h-60 flex flex-col">
          <div className="p-2 border-b border-gray-200 dark:border-gray-700 shrink-0">
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  if (showCreate) handleCreate()
                  else if (filtered.length === 1) select(filtered[0].name)
                }
              }}
              placeholder="Search or type to add new…"
              className="w-full px-2 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-green-500"
            />
          </div>
          <div className="overflow-y-auto">
            {filtered.length === 0 && !showCreate && (
              <p className="px-3 py-2 text-sm text-gray-400 dark:text-gray-500 italic">No results</p>
            )}
            {filtered.map(c => (
              <button
                key={c.id}
                type="button"
                onClick={() => select(c.name)}
                className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 ${
                  value === c.name
                    ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 font-medium'
                    : 'text-gray-900 dark:text-gray-100'
                }`}
              >
                {c.emoji && <span>{c.emoji}</span>}
                {c.name}
              </button>
            ))}
            {showCreate && (
              <button
                type="button"
                onClick={handleCreate}
                disabled={creating}
                className="w-full text-left px-3 py-2 text-sm text-green-600 dark:text-green-400 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-1 border-t border-gray-100 dark:border-gray-700"
              >
                <span className="font-bold">+</span>
                {creating ? 'Adding…' : `Add "${search.trim()}"`}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
