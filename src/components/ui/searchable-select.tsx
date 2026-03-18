'use client'

import { useState, useRef, useEffect } from 'react'

interface Option {
  value?: string
  id?: string
  label?: string
  name?: string
  emoji?: string
}

interface SearchableSelectProps {
  options: Option[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  allLabel?: string
  emptyMessage?: string
  className?: string
  required?: boolean
  error?: string
  disabled?: boolean
  loading?: boolean
}

function getOptionValue(o: Option): string {
  return o.value ?? o.id ?? ''
}

function getOptionLabel(o: Option): string {
  if (o.label) return o.label
  const emoji = o.emoji ? `${o.emoji} ` : ''
  return `${emoji}${o.name ?? ''}`
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Select…',
  searchPlaceholder,
  allLabel = 'All',
  emptyMessage = 'No results',
  className = '',
  required = false,
  error,
  disabled = false,
  loading = false,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selected = options.find(o => getOptionValue(o) === value)
  const filtered = options.filter(o =>
    getOptionLabel(o).toLowerCase().includes(search.toLowerCase())
  )

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  const select = (val: string) => {
    onChange(val)
    setOpen(false)
    setSearch('')
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => { if (!disabled && !loading) setOpen(o => !o) }}
        disabled={disabled || loading}
        className={`w-full border rounded-md px-3 py-2 text-sm bg-background text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-blue-500 ${error ? 'border-red-400' : 'border-border'} ${disabled || loading ? 'opacity-50 cursor-not-allowed text-secondary' : 'text-primary'}`}
      >
        <span className={selected ? 'text-primary' : 'text-gray-400 dark:text-gray-500'}>
          {loading ? 'Loading…' : selected ? getOptionLabel(selected) : placeholder}
        </span>
        <svg className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-white dark:bg-gray-800 shadow-lg max-h-64 flex flex-col">
          <div className="p-2 border-b border-border shrink-0">
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={searchPlaceholder ?? placeholder}
              className="w-full px-2 py-1.5 text-sm border border-border rounded bg-background text-primary focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="overflow-y-auto">
            {!required && (
              <button
                type="button"
                onClick={() => select('')}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${!value ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-medium' : 'text-secondary'}`}
              >
                {allLabel}
              </button>
            )}
            {filtered.length === 0 ? (
              <p className="px-3 py-2 text-sm text-secondary italic">{emptyMessage}</p>
            ) : (
              filtered.map(o => {
                const val = getOptionValue(o)
                return (
                  <button
                    key={val}
                    type="button"
                    onClick={() => select(val)}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${value === val ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-medium' : 'text-primary'}`}
                  >
                    {getOptionLabel(o)}
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
