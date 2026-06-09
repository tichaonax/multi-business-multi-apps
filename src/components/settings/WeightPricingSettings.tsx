'use client'

import { useEffect, useRef, useState } from 'react'
import { EmojiPickerEnhanced } from '@/components/business/emoji-picker-enhanced'
import { AddVendorPurchasePresetModal } from '@/components/settings/AddVendorPurchasePresetModal'
import type { VendorPurchasePreset } from '@/components/settings/AddVendorPurchasePresetModal'

type PurchaseType = 'LIVESTOCK' | 'GOODS'

interface Rule {
  id: string
  categoryName: string
  ruleType: string
  purchaseType: string
  pricePerKg: number
  emoji: string
  isActive: boolean
  derivedFromUnitPrice?: number | null
  derivedFromUnitCount?: number | null
  derivedFromSampleWeightKg?: number | null
  _count?: { business_products: number }
}

interface Props {
  businessId: string
  section: 'sale' | 'purchase'
}


export function WeightPricingSettings({ businessId, section }: Props) {
  const [rules, setRules] = useState<Rule[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Purchase tab state
  const [purchaseTab, setPurchaseTab] = useState<PurchaseType>('LIVESTOCK')

  // Add-form state
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPrice, setNewPrice] = useState('')
  const [newEmoji, setNewEmoji] = useState('📦')
  // Track whether user manually edited the emoji — stops auto-suggest if true
  const emojiUserEdited = useRef(false)

  // Searchable suggest dropdown for the name input
  const [suggestions, setSuggestions] = useState<Array<{ name: string; emoji: string }>>([])
  const [showSuggest, setShowSuggest] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const suggestRef = useRef<HTMLDivElement>(null)

  // Inline emoji picker state for existing rows
  const [openEmojiRowId, setOpenEmojiRowId] = useState<string | null>(null)
  const emojiPopoverRef = useRef<HTMLDivElement>(null)

  // Inline edit state for existing rows
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editPrice, setEditPrice] = useState('')
  const [editEmoji, setEditEmoji] = useState('')
  const [editSuggestions, setEditSuggestions] = useState<Array<{ name: string; emoji: string }>>([])
  const [showEditSuggest, setShowEditSuggest] = useState(false)
  const editSuggestRef = useRef<HTMLDivElement>(null)

  function startEdit(rule: Rule) {
    setEditingId(rule.id)
    setEditName(rule.categoryName)
    setEditPrice(String(Number(rule.pricePerKg).toFixed(2)))
    setEditEmoji(rule.emoji ?? '📦')
  }
  function cancelEdit() {
    setEditingId(null); setEditName(''); setEditPrice(''); setEditEmoji('')
    setEditSuggestions([]); setShowEditSuggest(false)
  }
  async function saveEdit(id: string) {
    if (!editName.trim() || !editPrice) return
    await patchRule(id, { categoryName: editName.trim(), pricePerKg: parseFloat(editPrice), emoji: editEmoji })
    cancelEdit()
  }
  useEffect(() => {
    fetch(`/api/weight-pricing-rules?businessId=${businessId}`)
      .then(r => r.json())
      .then(data => setRules(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false))
  }, [businessId])

  // Populate visible suggestion dropdown as user types the preset name
  useEffect(() => {
    const name = newName.trim()
    if (name.length < 2) { setSuggestions([]); return }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/expense-categories/suggest?q=${encodeURIComponent(name)}`)
        if (!res.ok) return
        const data = await res.json()
        const mapped = (data.suggestions ?? []).map((s: any) => ({
          name: s.subSubcategoryName ?? s.subcategoryName ?? s.categoryName ?? s.domainName,
          emoji: s.subSubcategoryEmoji ?? s.subcategoryEmoji ?? s.categoryEmoji ?? s.domainEmoji ?? '📦'
        })).filter((s: any) => s.name)
        // Deduplicate by name
        const seen = new Set<string>()
        const unique = mapped.filter((s: any) => { if (seen.has(s.name)) return false; seen.add(s.name); return true })
        setSuggestions(unique.slice(0, 8))
        setShowSuggest(true)  // always show — "no matches" + browse button
      } catch {}
    }, 300)
    return () => clearTimeout(timer)
  }, [newName])

  // Close suggest dropdown on outside click
  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (suggestRef.current && !suggestRef.current.contains(e.target as Node)) {
        setShowSuggest(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [])

  // Fetch suggestions as user types in the edit name input
  useEffect(() => {
    const name = editName.trim()
    if (!editingId || name.length < 2) { setEditSuggestions([]); return }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/expense-categories/suggest?q=${encodeURIComponent(name)}`)
        if (!res.ok) return
        const data = await res.json()
        const mapped = (data.suggestions ?? []).map((s: any) => ({
          name: s.subSubcategoryName ?? s.subcategoryName ?? s.categoryName ?? s.domainName,
          emoji: s.subSubcategoryEmoji ?? s.subcategoryEmoji ?? s.categoryEmoji ?? s.domainEmoji ?? '📦'
        })).filter((s: any) => s.name)
        const seen = new Set<string>()
        const unique = mapped.filter((s: any) => { if (seen.has(s.name)) return false; seen.add(s.name); return true })
        setEditSuggestions(unique.slice(0, 8))
        setShowEditSuggest(true)
      } catch {}
    }, 300)
    return () => clearTimeout(timer)
  }, [editName, editingId])

  // Close edit suggest dropdown on outside click
  useEffect(() => {
    if (!showEditSuggest) return
    function handleOutside(e: MouseEvent) {
      if (editSuggestRef.current && !editSuggestRef.current.contains(e.target as Node)) {
        setShowEditSuggest(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [showEditSuggest])

  // Close row emoji popover on outside click
  useEffect(() => {
    if (!openEmojiRowId) return
    function handleOutside(e: MouseEvent) {
      if (emojiPopoverRef.current && !emojiPopoverRef.current.contains(e.target as Node)) {
        setOpenEmojiRowId(null)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [openEmojiRowId])

  function resetAdd() {
    setShowAdd(false)
    setNewName('')
    setNewPrice('')
    setNewEmoji('📦')
    emojiUserEdited.current = false
    setSuggestions([])
    setShowSuggest(false)
    setShowEmojiPicker(false)
  }

  async function handleAdd() {
    if (!newName.trim() || !newPrice) return
    setSaving(true)
    try {
      const res = await fetch('/api/weight-pricing-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          categoryName: newName.trim(),
          ruleType: 'SALE',
          purchaseType: 'GOODS',
          pricePerKg: parseFloat(newPrice),
          emoji: newEmoji || '📦',
        }),
      })
      if (!res.ok) { const err = await res.json(); alert(err.error ?? 'Failed'); return }
      const rule = await res.json()
      setRules(prev => [...prev, rule])
      resetAdd()
    } finally {
      setSaving(false)
    }
  }

  async function patchRule(id: string, data: Partial<Rule>) {
    const res = await fetch(`/api/weight-pricing-rules/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (res.ok) {
      const updated = await res.json()
      setRules(prev => prev.map(r => r.id === updated.id ? { ...r, ...updated } : r))
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this pricing preset?')) return
    await fetch(`/api/weight-pricing-rules/${id}`, { method: 'DELETE' })
    setRules(prev => prev.filter(r => r.id !== id))
  }

  if (loading) return <div className="text-sm text-gray-400 py-4">Loading…</div>

  // ─── SALE SECTION ─────────────────────────────────────────────────────────
  if (section === 'sale') {
    const saleRules = rules.filter(r => r.ruleType === 'SALE')

    return (
      <div className="space-y-3">
        {saleRules.length > 0 && (
          <div className="rounded-lg border border-gray-200 dark:border-gray-700">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="text-left px-3 py-2 font-medium text-gray-600 dark:text-gray-400 w-12">Icon</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600 dark:text-gray-400">Preset name</th>
                  <th className="text-right px-3 py-2 font-medium text-gray-600 dark:text-gray-400">$/kg</th>
                  <th className="text-center px-3 py-2 font-medium text-gray-600 dark:text-gray-400">Linked items</th>
                  <th className="text-center px-3 py-2 font-medium text-gray-600 dark:text-gray-400">Active</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {saleRules.map(rule => (
                  <tr key={rule.id} className={rule.isActive ? '' : 'opacity-50'}>
                    <td className="px-3 py-2">
                      <div className="relative" ref={openEmojiRowId === rule.id ? emojiPopoverRef : undefined}>
                        <button
                          type="button"
                          onClick={() => setOpenEmojiRowId(openEmojiRowId === rule.id ? null : rule.id)}
                          title="Click to change emoji"
                          className="w-10 h-10 text-xl flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-gray-700 border border-transparent hover:border-gray-300 dark:hover:border-gray-600"
                        >
                          {(editingId === rule.id ? editEmoji : rule.emoji) ?? '📦'}
                        </button>
                        {openEmojiRowId === rule.id && (
                          <div className="absolute left-0 top-full mt-1 z-50 w-72 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-3">
                            <EmojiPickerEnhanced
                              selectedEmoji={editingId === rule.id ? editEmoji : rule.emoji}
                              onSelect={emoji => {
                                if (editingId === rule.id) {
                                  setEditEmoji(emoji)
                                } else {
                                  patchRule(rule.id, { emoji })
                                  setRules(prev => prev.map(r => r.id === rule.id ? { ...r, emoji } : r))
                                }
                                setOpenEmojiRowId(null)
                              }}
                              searchPlaceholder="Search or paste emoji…"
                            />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2 font-medium text-gray-900 dark:text-gray-100">
                      {editingId === rule.id
                        ? (
                          <div className="relative" ref={editSuggestRef}>
                            <input autoFocus value={editName}
                              onChange={e => { setEditName(e.target.value); setShowEditSuggest(true) }}
                              className="w-full text-sm border border-blue-400 rounded px-2 py-1 dark:bg-gray-700 dark:text-white" />
                            {showEditSuggest && editSuggestions.length > 0 && (
                              <div className="absolute left-0 top-full mt-1 z-50 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl overflow-hidden">
                                {editSuggestions.map((s, i) => (
                                  <button key={i} type="button"
                                    onMouseDown={() => { setEditName(s.name); setEditEmoji(s.emoji); setShowEditSuggest(false) }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-left">
                                    <span className="text-base flex-shrink-0">{s.emoji}</span>
                                    <span className="text-gray-900 dark:text-gray-100 truncate">{s.name}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )
                        : rule.categoryName}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-gray-900 dark:text-gray-100">
                      {editingId === rule.id
                        ? <input type="number" step="0.01" min="0" value={editPrice} onChange={e => setEditPrice(e.target.value)}
                            className="w-24 text-sm border border-blue-400 rounded px-2 py-1 text-right dark:bg-gray-700 dark:text-white" />
                        : `$${Number(rule.pricePerKg).toFixed(2)}`}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {rule._count?.business_products != null && rule._count.business_products > 0 ? (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium">
                          {rule._count.business_products} item{rule._count.business_products !== 1 ? 's' : ''}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button
                        onClick={() => patchRule(rule.id, { isActive: !rule.isActive })}
                        className={`w-9 h-5 rounded-full transition-colors ${rule.isActive ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                      >
                        <span className={`block w-4 h-4 rounded-full bg-white shadow transition-transform mx-0.5 ${rule.isActive ? 'translate-x-4' : 'translate-x-0'}`} />
                      </button>
                    </td>
                    <td className="px-3 py-2 text-right space-x-2">
                      {editingId === rule.id ? (
                        <>
                          <button onClick={() => saveEdit(rule.id)} className="text-blue-600 hover:text-blue-800 text-xs font-medium">Save</button>
                          <button onClick={cancelEdit} className="text-gray-400 hover:text-gray-600 text-xs">Cancel</button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => startEdit(rule)} className="text-blue-500 hover:text-blue-700 text-xs">Edit</button>
                          <button onClick={() => handleDelete(rule.id)} className="text-red-500 hover:text-red-700 text-xs">Remove</button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {saleRules.length === 0 && !showAdd && (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No selling presets yet. Add one to enable scale-based pricing at the POS.
          </p>
        )}

        {showAdd ? (
          <div className="p-4 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 space-y-3">
            <p className="text-xs font-semibold text-blue-700 dark:text-blue-300">New selling preset</p>
            <div className="flex flex-wrap gap-2 items-end">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Icon</label>
                <input
                  type="text"
                  value={newEmoji}
                  onChange={e => { emojiUserEdited.current = true; setNewEmoji(e.target.value) }}
                  maxLength={2}
                  title="Type or paste an emoji"
                  className="w-12 h-9 text-xl text-center border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="relative" ref={suggestRef}>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Preset name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={e => { emojiUserEdited.current = false; setNewName(e.target.value); setShowSuggest(true) }}
                  onFocus={() => { if (suggestions.length > 0) setShowSuggest(true) }}
                  onBlur={() => setTimeout(() => { setShowSuggest(false); setShowEmojiPicker(false) }, 150)}
                  placeholder="e.g. Beef Mince, Fish Fillets"
                  className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 w-44"
                  autoComplete="off"
                />
                {showSuggest && (
                  <div className="absolute left-0 top-full mt-1 z-50 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl overflow-hidden">
                    {suggestions.length === 0 && (
                      <div className="px-3 py-2 text-xs text-gray-400">No matches</div>
                    )}
                    {suggestions.map((s, i) => (
                      <button key={i} type="button"
                        onMouseDown={() => { setNewName(s.name); if (!emojiUserEdited.current) setNewEmoji(s.emoji); setShowSuggest(false) }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-left border-b border-gray-100 dark:border-gray-700">
                        <span className="text-base flex-shrink-0">{s.emoji}</span>
                        <span className="text-gray-900 dark:text-gray-100 truncate">{s.name}</span>
                      </button>
                    ))}
                    {newName.trim().length >= 2 && (
                      <button type="button"
                        onMouseDown={() => { setShowSuggest(false); setShowEmojiPicker(v => !v) }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-left font-medium">
                        🔍 Browse more emojis for "{newName}"…
                      </button>
                    )}
                  </div>
                )}
                {showEmojiPicker && (
                  <div className="absolute left-0 top-full mt-1 z-50 w-72 bg-white dark:bg-gray-800 border border-blue-300 dark:border-blue-700 rounded-lg shadow-xl">
                    <div className="flex items-center justify-between px-3 pt-2 pb-1 border-b border-gray-100 dark:border-gray-700">
                      <span className="text-xs font-medium text-gray-500">Emoji search — "{newName}"</span>
                      <button type="button" onClick={() => setShowEmojiPicker(false)} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
                    </div>
                    <div className="p-3">
                      <EmojiPickerEnhanced
                        selectedEmoji={newEmoji}
                        initialQuery={newName.trim()}
                        onSelect={e => { setNewEmoji(e); emojiUserEdited.current = true; setShowEmojiPicker(false) }}
                        searchPlaceholder="Or search for a different emoji…"
                      />
                    </div>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Price / kg</label>
                <input
                  type="number" step="0.01" min="0"
                  value={newPrice}
                  onChange={e => setNewPrice(e.target.value)}
                  placeholder="0.00"
                  className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 w-28 font-mono"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleAdd}
                  disabled={saving || !newName.trim() || !newPrice}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40"
                >
                  {saving ? 'Saving…' : 'Add Preset'}
                </button>
                <button onClick={resetAdd} className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowAdd(true)} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
            + Add selling preset
          </button>
        )}
      </div>
    )
  }

  // ─── PURCHASE SECTION ──────────────────────────────────────────────────────
  const PURCHASE_TABS: { key: PurchaseType; label: string; emoji: string }[] = [
    { key: 'LIVESTOCK', label: 'Livestock', emoji: '🐄' },
    { key: 'GOODS', label: 'Goods', emoji: '🥦' },
  ]

  const tabRules = rules.filter(r => r.ruleType === 'PURCHASE' && r.purchaseType === purchaseTab)

  return (
    <div className="space-y-3">
      {/* Sub-tabs */}
      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700">
        {PURCHASE_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => { setPurchaseTab(tab.key); resetAdd() }}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              purchaseTab === tab.key
                ? 'bg-white dark:bg-gray-800 border border-b-white dark:border-b-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 -mb-px'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            {tab.emoji} {tab.label}
          </button>
        ))}
      </div>

      {tabRules.length === 0 && !showAdd && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No {purchaseTab === 'LIVESTOCK' ? 'livestock' : 'goods'} purchase presets yet.
        </p>
      )}

      {tabRules.length > 0 && (
        <div className="rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="text-left px-3 py-2 font-medium text-gray-600 dark:text-gray-400 w-12">Icon</th>
                <th className="text-left px-3 py-2 font-medium text-gray-600 dark:text-gray-400">Category</th>
                <th className="text-right px-3 py-2 font-medium text-gray-600 dark:text-gray-400">$/kg</th>
                {purchaseTab === 'LIVESTOCK' && (
                  <th className="text-left px-3 py-2 font-medium text-gray-600 dark:text-gray-400">Derived from</th>
                )}
                <th className="text-center px-3 py-2 font-medium text-gray-600 dark:text-gray-400">Active</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {tabRules.map(rule => (
                <tr key={rule.id} className={rule.isActive ? '' : 'opacity-50'}>
                  <td className="px-3 py-2">
                    <div className="relative" ref={openEmojiRowId === rule.id ? emojiPopoverRef : undefined}>
                      <button
                        type="button"
                        onClick={() => setOpenEmojiRowId(openEmojiRowId === rule.id ? null : rule.id)}
                        title="Click to change emoji"
                        className="w-10 h-10 text-xl flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-gray-700 border border-transparent hover:border-gray-300 dark:hover:border-gray-600"
                      >
                        {(editingId === rule.id ? editEmoji : rule.emoji) ?? '📦'}
                      </button>
                      {openEmojiRowId === rule.id && (
                        <div className="absolute left-0 top-full mt-1 z-50 w-72 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-3">
                          <EmojiPickerEnhanced
                            selectedEmoji={editingId === rule.id ? editEmoji : rule.emoji}
                            onSelect={emoji => {
                              if (editingId === rule.id) {
                                setEditEmoji(emoji)
                              } else {
                                patchRule(rule.id, { emoji })
                                setRules(prev => prev.map(r => r.id === rule.id ? { ...r, emoji } : r))
                              }
                              setOpenEmojiRowId(null)
                            }}
                            searchPlaceholder="Search or paste emoji…"
                          />
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2 font-medium text-gray-900 dark:text-gray-100">
                    {editingId === rule.id
                      ? (
                        <div className="relative" ref={editSuggestRef}>
                          <input autoFocus value={editName}
                            onChange={e => { setEditName(e.target.value); setShowEditSuggest(true) }}
                            className="w-full text-sm border border-blue-400 rounded px-2 py-1 dark:bg-gray-700 dark:text-white" />
                          {showEditSuggest && editSuggestions.length > 0 && (
                            <div className="absolute left-0 top-full mt-1 z-50 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl overflow-hidden">
                              {editSuggestions.map((s, i) => (
                                <button key={i} type="button"
                                  onMouseDown={() => { setEditName(s.name); setEditEmoji(s.emoji); setShowEditSuggest(false) }}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-left">
                                  <span className="text-base flex-shrink-0">{s.emoji}</span>
                                  <span className="text-gray-900 dark:text-gray-100 truncate">{s.name}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                      : rule.categoryName}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-gray-900 dark:text-gray-100">
                    {editingId === rule.id
                      ? <input type="number" step="0.0001" min="0" value={editPrice} onChange={e => setEditPrice(e.target.value)}
                          className="w-24 text-sm border border-blue-400 rounded px-2 py-1 text-right dark:bg-gray-700 dark:text-white" />
                      : `$${Number(rule.pricePerKg).toFixed(2)}`}
                  </td>
                  {purchaseTab === 'LIVESTOCK' && (
                    <td className="px-3 py-2 text-xs text-gray-400">
                      {rule.derivedFromUnitCount != null && rule.derivedFromUnitPrice != null && rule.derivedFromSampleWeightKg != null
                        ? `${rule.derivedFromUnitCount} × $${Number(rule.derivedFromUnitPrice).toFixed(2)} / ${Number(rule.derivedFromSampleWeightKg).toFixed(3)} kg`
                        : '—'}
                    </td>
                  )}
                  <td className="px-3 py-2 text-center">
                    <button
                      onClick={() => patchRule(rule.id, { isActive: !rule.isActive })}
                      className={`w-9 h-5 rounded-full transition-colors ${rule.isActive ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                    >
                      <span className={`block w-4 h-4 rounded-full bg-white shadow transition-transform mx-0.5 ${rule.isActive ? 'translate-x-4' : 'translate-x-0'}`} />
                    </button>
                  </td>
                  <td className="px-3 py-2 text-right space-x-2">
                    {editingId === rule.id ? (
                      <>
                        <button onClick={() => saveEdit(rule.id)} className="text-blue-600 hover:text-blue-800 text-xs font-medium">Save</button>
                        <button onClick={cancelEdit} className="text-gray-400 hover:text-gray-600 text-xs">Cancel</button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => startEdit(rule)} className="text-blue-500 hover:text-blue-700 text-xs">Edit</button>
                        <button onClick={() => handleDelete(rule.id)} className="text-red-500 hover:text-red-700 text-xs">Remove</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && (
        <AddVendorPurchasePresetModal
          businessId={businessId}
          initialName=""
          purchaseType={purchaseTab}
          onSuccess={(rule: VendorPurchasePreset) => { setRules(prev => [...prev, rule as Rule]); setShowAdd(false) }}
          onClose={() => setShowAdd(false)}
        />
      )}
      {!showAdd && (
        <button onClick={() => setShowAdd(true)} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
          + Add {purchaseTab === 'LIVESTOCK' ? 'livestock' : 'goods'} purchase preset
        </button>
      )}
    </div>
  )
}
