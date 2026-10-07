'use client'

import { useState, useRef } from 'react'

export interface SearchableSelectItem {
  id: string
  name: string
  emoji?: string | null
}

/**
 * Dropdown select with inline search, extracted from vehicle-expense-modal.tsx
 * (MBM-302). Uses fixed positioning for the option panel so it escapes any
 * overflow-y-auto ancestor (e.g. a scrollable modal body) instead of being
 * clipped or scrolling with the page.
 */
export function SearchableSelect({
  items,
  value,
  onChange,
  placeholder = 'Select…',
  error = false,
  disabled = false,
  loading = false,
}: {
  items: SearchableSelectItem[]
  value: string
  onChange: (id: string) => void
  placeholder?: string
  error?: boolean
  disabled?: boolean
  loading?: boolean
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null)

  const selected = items.find(i => i.id === value)
  const filtered = search
    ? items.filter(i => i.name.toLowerCase().includes(search.toLowerCase()))
    : items

  const open = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setDropdownPos({ top: rect.bottom + 4, left: rect.left, width: rect.width })
    }
    setIsOpen(true)
  }
  const close = () => { setIsOpen(false); setSearch('') }

  if (loading) {
    return (
      <div className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-gray-400 bg-gray-50 dark:bg-gray-800 animate-pulse">
        Loading…
      </div>
    )
  }

  return (
    <div className="relative w-full">
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        onClick={() => isOpen ? close() : open()}
        className={`w-full text-sm border rounded-lg px-3 py-2 text-left flex items-center justify-between gap-1 transition-colors
          ${error ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'}
          ${disabled
            ? 'bg-gray-50 dark:bg-gray-800 cursor-not-allowed text-gray-400'
            : 'bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 hover:border-gray-400 dark:hover:border-gray-500'
          }
        `}
      >
        <span className={selected ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500'}>
          {selected
            ? [selected.emoji, selected.name].filter(Boolean).join(' ')
            : placeholder
          }
        </span>
        <svg className={`w-4 h-4 flex-shrink-0 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && dropdownPos && (
        <div
          style={{ position: 'fixed', top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width, zIndex: 9999 }}
          className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-xl overflow-hidden"
        >
          <div className="p-2 border-b border-gray-200 dark:border-gray-700">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search…"
              autoFocus
              className="w-full text-sm px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="max-h-52 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-3 py-4 text-sm text-center text-gray-500 dark:text-gray-400">No results</div>
            ) : (
              filtered.map(item => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => { onChange(item.id); close() }}
                  className={`w-full text-sm text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors
                    ${value === item.id ? 'bg-blue-50 dark:bg-blue-900/20 font-medium text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-gray-100'}
                  `}
                >
                  {[item.emoji, item.name].filter(Boolean).join(' ')}
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {isOpen && (
        <div className="fixed inset-0" style={{ zIndex: 9998 }} onClick={close} />
      )}
    </div>
  )
}
