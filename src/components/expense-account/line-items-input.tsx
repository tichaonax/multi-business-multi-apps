'use client'

import { useState, useEffect, useRef } from 'react'
import { EmojiPickerEnhanced } from '@/components/business/emoji-picker-enhanced'

export interface LineItem {
  name: string
  emoji: string
  amount: number
  description?: string
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
  const [description, setDescription] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const emojiUserEdited = useRef(false)

  useEffect(() => {
    if (!domainId) {
      setDomainItems([])
      return
    }
    fetch(`/api/expense-categories/domain-items?domainId=${domainId}`, { credentials: 'include' })
      .then(r => r.json())
      .then(data => setDomainItems(data.items ?? []))
      .catch(() => setDomainItems([]))
  }, [domainId])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
          searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
        setShowEmojiPicker(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Auto-suggest emoji from expense taxonomy as user types the item name
  useEffect(() => {
    const name = search.trim()
    if (name.length < 2 || emojiUserEdited.current) return
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/expense-categories/suggest?q=${encodeURIComponent(name)}`)
        if (!res.ok) return
        const data = await res.json()
        const top = data.suggestions?.[0]
        if (!top) return
        const suggested = top.subSubcategoryEmoji ?? top.subcategoryEmoji ?? top.categoryEmoji ?? top.domainEmoji
        if (suggested) setEmoji(suggested)
      } catch {}
    }, 350)
    return () => clearTimeout(timer)
  }, [search])

  const filtered = search.trim()
    ? domainItems.filter(i => i.name.toLowerCase().includes(search.toLowerCase()))
    : domainItems

  function selectItem(item: DomainItem) {
    setSearch(item.name)
    setEmoji(item.emoji || '📂')
    emojiUserEdited.current = true
    setShowDropdown(false)
    setTimeout(() => searchRef.current?.blur(), 0)
  }

  function addItem() {
    const name = search.trim()
    const amt = parseFloat(amount)
    if (!name || isNaN(amt) || amt <= 0) return
    onChange([...value, { name, emoji: emoji || '📂', amount: amt, description: description.trim() || undefined }])
    setSearch('')
    setEmoji('📂')
    setAmount('')
    setDescription('')
    setShowEmojiPicker(false)
    emojiUserEdited.current = false
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

      {/* Input area — always shown; domainId only controls the category dropdown */}
      <div className="space-y-2 p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
        {/* Row 1: emoji + name + amount + add */}
        <div className="flex gap-2 items-start">
          {/* Emoji — auto-suggested as name is typed */}
          <input
            type="text"
            value={emoji}
            onChange={e => { emojiUserEdited.current = true; setEmoji(e.target.value) }}
            className="w-12 px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm text-center flex-shrink-0"
            maxLength={2}
            title="Auto-filled as you type the item name — override by typing or pasting an emoji"
          />

          {/* Name input with category dropdown */}
          <div className="relative flex-1 min-w-0">
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={e => { emojiUserEdited.current = false; setSearch(e.target.value); setShowDropdown(true) }}
              onFocus={() => { if (domainId) setShowDropdown(true) }}
              onBlur={() => setTimeout(() => { setShowDropdown(false); setShowEmojiPicker(false) }, 150)}
              placeholder="Item name..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            {showDropdown && domainId && (
              <div
                ref={dropdownRef}
                className="absolute z-50 left-0 right-0 mt-1 max-h-56 overflow-y-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg"
              >
                {filtered.length === 0 && search.trim() ? (
                  <div className="px-3 py-2 text-xs text-gray-400">No matches for &quot;{search.trim()}&quot;</div>
                ) : (
                  filtered.map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onMouseDown={() => selectItem(item)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-0"
                    >
                      <span className="mr-1">{item.emoji}</span>
                      <span>{item.name}</span>
                      {item.groupName && (
                        <span className="ml-1 text-gray-400 text-xs">· {item.groupName}</span>
                      )}
                    </button>
                  ))
                )}
                {/* Browse button — only when something is typed */}
                {search.trim().length >= 2 && (
                  <button
                    type="button"
                    onMouseDown={() => { setShowDropdown(false); setShowEmojiPicker(v => !v) }}
                    className="w-full text-left px-3 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 font-medium border-t border-gray-100 dark:border-gray-700"
                  >
                    🔍 Browse more emojis for "{search}"…
                  </button>
                )}
              </div>
            )}
            {showEmojiPicker && (
              <div className="absolute left-0 top-full mt-1 z-50 w-72 bg-white dark:bg-gray-800 border border-blue-300 dark:border-blue-700 rounded-lg shadow-xl">
                <div className="flex items-center justify-between px-3 pt-2 pb-1 border-b border-gray-100 dark:border-gray-700">
                  <span className="text-xs font-medium text-gray-500">Emoji search — "{search}"</span>
                  <button type="button" onMouseDown={() => setShowEmojiPicker(false)} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
                </div>
                <div className="p-3">
                  <EmojiPickerEnhanced
                    selectedEmoji={emoji}
                    initialQuery={search.trim()}
                    onSelect={e => { setEmoji(e); emojiUserEdited.current = true; setShowEmojiPicker(false) }}
                    searchPlaceholder="Or search for a different emoji…"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Amount */}
          <input
            type="number"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addItem() } }}
            placeholder="0.00"
            min="0"
            step="0.01"
            className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 flex-shrink-0"
          />

          {/* Add button */}
          <button
            type="button"
            onClick={addItem}
            disabled={!search.trim() || !amount || parseFloat(amount) <= 0}
            className="px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap flex-shrink-0"
          >
            Add
          </button>
        </div>

        {/* Row 2: optional description */}
        <div className="pl-14">
          <input
            type="text"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Description (optional) — e.g. invoice number, supplier name"
            className="w-full px-3 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs focus:ring-1 focus:ring-blue-400"
          />
        </div>
      </div>

      {/* Items list */}
      {value.length > 0 && (
        <div className="space-y-1">
          {value.map((item, i) => (
            <div key={i} className="flex items-start gap-2 text-sm py-1.5 border-b border-gray-100 dark:border-gray-700 last:border-0">
              <span className="w-6 text-center flex-shrink-0 mt-0.5">{item.emoji}</span>
              <div className="flex-1 min-w-0">
                <span className="text-gray-800 dark:text-gray-200">{item.name}</span>
                {item.description && (
                  <div className="text-xs text-gray-400 dark:text-gray-500 truncate">{item.description}</div>
                )}
              </div>
              <span className="text-gray-600 dark:text-gray-400 font-medium flex-shrink-0">${item.amount.toFixed(2)}</span>
              <button
                type="button"
                onClick={() => removeItem(i)}
                className="text-gray-400 hover:text-red-500 ml-1 flex-shrink-0"
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
    </div>
  )
}
