'use client'

import { useState, useEffect, useRef } from 'react'

export interface LineItem {
  name: string
  emoji: string
  amount: number
}

interface DomainItem {
  id: string
  name: string
  emoji: string
  groupName: string
}

interface LineItemsInputProps {
  domainId: string | null
  value: LineItem[]
  onChange: (items: LineItem[]) => void
  totalAmount?: number
}

export function LineItemsInput({ domainId, value, onChange, totalAmount }: LineItemsInputProps) {
  const [domainItems, setDomainItems] = useState<DomainItem[]>([])
  const [search, setSearch] = useState('')
  const [emoji, setEmoji] = useState('📂')
  const [amount, setAmount] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!domainId) {
      setDomainItems([])
      return
    }
    fetch(`/api/expense-categories/domain-items?domainId=${domainId}`)
      .then(r => r.json())
      .then(data => setDomainItems(data.items ?? []))
      .catch(() => setDomainItems([]))
  }, [domainId])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
          searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const filtered = search.trim()
    ? domainItems.filter(i => i.name.toLowerCase().includes(search.toLowerCase()))
    : domainItems

  function selectItem(item: DomainItem) {
    setSearch(item.name)
    setEmoji(item.emoji || '📂')
    setShowDropdown(false)
    setTimeout(() => searchRef.current?.blur(), 0)
  }

  function addItem() {
    const name = search.trim()
    const amt = parseFloat(amount)
    if (!name || isNaN(amt) || amt <= 0) return
    onChange([...value, { name, emoji: emoji || '📂', amount: amt }])
    setSearch('')
    setEmoji('📂')
    setAmount('')
  }

  function removeItem(index: number) {
    onChange(value.filter((_, i) => i !== index))
  }

  const lineTotal = value.reduce((sum, item) => sum + item.amount, 0)

  return (
    <div className="space-y-3">
      <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
        Line Items <span className="text-gray-400 font-normal">(optional)</span>
      </div>

      {!domainId ? (
        <p className="text-sm text-gray-400 italic">Select a Business category above to browse items</p>
      ) : (
        <>
          {/* Input row */}
          <div className="flex gap-2 items-start">
            {/* Emoji input */}
            <input
              type="text"
              value={emoji}
              onChange={e => setEmoji(e.target.value.slice(0, 2))}
              className="w-12 px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm text-center"
            />

            {/* Search / name input with dropdown */}
            <div className="relative flex-1">
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={e => { setSearch(e.target.value); setShowDropdown(true) }}
                onFocus={() => setShowDropdown(true)}
                placeholder="Search or type item name..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {showDropdown && (
                <div
                  ref={dropdownRef}
                  className="absolute z-50 left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg"
                >
                  {filtered.length === 0 && search.trim() ? (
                    <button
                      type="button"
                      onMouseDown={() => { setEmoji('📂'); setShowDropdown(false) }}
                      className="w-full text-left px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 dark:hover:bg-gray-700"
                    >
                      📂 &quot;{search.trim()}&quot; — Add custom
                    </button>
                  ) : (
                    filtered.map(item => (
                      <button
                        key={item.id}
                        type="button"
                        onMouseDown={() => selectItem(item)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        <span className="mr-1">{item.emoji}</span>
                        <span>{item.name}</span>
                        {item.groupName && (
                          <span className="ml-1 text-gray-400 text-xs">· {item.groupName}</span>
                        )}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Amount input */}
            <div className="w-28">
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addItem() } }}
                placeholder="0.00"
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Add button */}
            <button
              type="button"
              onClick={addItem}
              disabled={!search.trim() || !amount || parseFloat(amount) <= 0}
              className="px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
            >
              Add
            </button>
          </div>

          {/* Items list */}
          {value.length > 0 && (
            <div className="space-y-1">
              {value.map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-sm py-1 border-b border-gray-100 dark:border-gray-700 last:border-0">
                  <span className="w-6 text-center">{item.emoji}</span>
                  <span className="flex-1 text-gray-800 dark:text-gray-200">{item.name}</span>
                  <span className="text-gray-600 dark:text-gray-400 font-medium">${item.amount.toFixed(2)}</span>
                  <button
                    type="button"
                    onClick={() => removeItem(i)}
                    className="text-gray-400 hover:text-red-500 ml-1"
                  >
                    ×
                  </button>
                </div>
              ))}
              <div className="text-xs text-gray-500 dark:text-gray-400 pt-1">
                Total: ${lineTotal.toFixed(2)}
                {totalAmount != null && (
                  <span> of ${totalAmount.toFixed(2)}</span>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
