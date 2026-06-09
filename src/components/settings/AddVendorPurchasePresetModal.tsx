'use client'

import { useEffect, useRef, useState } from 'react'
import { EmojiPickerEnhanced } from '@/components/business/emoji-picker-enhanced'

type PurchaseType = 'LIVESTOCK' | 'GOODS'

export interface VendorPurchasePreset {
  id: string
  categoryName: string
  pricePerKg: number
  emoji: string
  ruleType: string
  purchaseType: string
  isActive: boolean
  derivedFromUnitCount?: number | null
  derivedFromUnitPrice?: number | null
  derivedFromSampleWeightKg?: number | null
}

interface Props {
  businessId: string
  initialName: string
  initialEmoji?: string
  purchaseType?: PurchaseType
  onSuccess: (rule: VendorPurchasePreset) => void
  onClose: () => void
}

function calcPricePerKg(count: number, pricePerUnit: number, totalWeightKg: number): number | null {
  if (count <= 0 || pricePerUnit <= 0 || totalWeightKg <= 0) return null
  return (count * pricePerUnit) / totalWeightKg
}

export function AddVendorPurchasePresetModal({ businessId, initialName, initialEmoji, purchaseType = 'LIVESTOCK', onSuccess, onClose }: Props) {
  const [name, setName] = useState(initialName)
  const [price, setPrice] = useState('')
  const [emoji, setEmoji] = useState(initialEmoji ?? '📦')
  const emojiUserEdited = useRef(!!initialEmoji)
  const [saving, setSaving] = useState(false)

  const [suggestions, setSuggestions] = useState<Array<{ name: string; emoji: string }>>([])
  const [showSuggest, setShowSuggest] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const suggestRef = useRef<HTMLDivElement>(null)

  const [showCalc, setShowCalc] = useState(false)
  const [calc, setCalc] = useState({ unitCount: '', totalWeightKg: '', pricePerUnit: '' })

  const calcResult = calcPricePerKg(
    parseFloat(calc.unitCount),
    parseFloat(calc.pricePerUnit),
    parseFloat(calc.totalWeightKg),
  )

  // Fetch suggestions as user types (also fires on mount for initialName)
  useEffect(() => {
    const n = name.trim()
    if (n.length < 2) { setSuggestions([]); return }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/expense-categories/suggest?q=${encodeURIComponent(n)}`)
        if (!res.ok) return
        const data = await res.json()
        const mapped = (data.suggestions ?? []).map((s: any) => ({
          name: s.subSubcategoryName ?? s.subcategoryName ?? s.categoryName ?? s.domainName,
          emoji: s.subSubcategoryEmoji ?? s.subcategoryEmoji ?? s.categoryEmoji ?? s.domainEmoji ?? '📦'
        })).filter((s: any) => s.name)
        const seen = new Set<string>()
        const unique = mapped.filter((s: any) => { if (seen.has(s.name)) return false; seen.add(s.name); return true })
        const results = unique.slice(0, 8) as Array<{ name: string; emoji: string }>
        setSuggestions(results)
        // Auto-apply top match emoji if user hasn't manually set one and no initialEmoji provided
        if (!emojiUserEdited.current && results.length > 0) setEmoji(results[0].emoji)
        setShowSuggest(true)
      } catch {}
    }, 300)
    return () => clearTimeout(timer)
  }, [name])

  // Close suggest dropdown on outside click
  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (suggestRef.current && !suggestRef.current.contains(e.target as Node)) setShowSuggest(false)
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [])

  async function handleSave() {
    if (!name.trim() || !price) return
    setSaving(true)
    try {
      const body: Record<string, unknown> = {
        businessId,
        categoryName: name.trim(),
        ruleType: 'PURCHASE',
        purchaseType,
        pricePerKg: parseFloat(price),
        emoji: emoji || '📦',
      }
      if (purchaseType === 'LIVESTOCK' && calcResult != null && parseFloat(price) === calcResult) {
        body.derivedFromUnitCount = parseFloat(calc.unitCount)
        body.derivedFromUnitPrice = parseFloat(calc.pricePerUnit)
        body.derivedFromSampleWeightKg = parseFloat(calc.totalWeightKg)
      }
      const res = await fetch('/api/weight-pricing-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) { const err = await res.json(); alert(err.error ?? 'Failed'); return }
      onSuccess(await res.json())
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-start justify-center overflow-y-auto py-4 px-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg mt-16">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Add Purchase Preset</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Sets the vendor buying price per kg for this category</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl leading-none">×</button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          <div className="flex flex-wrap gap-3 items-end">

            {/* Emoji */}
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Icon</label>
              <input
                type="text"
                value={emoji}
                onChange={e => { emojiUserEdited.current = true; setEmoji(e.target.value) }}
                maxLength={2}
                title="Type or paste an emoji"
                className="w-12 h-9 text-xl text-center border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Name with suggestions */}
            <div className="relative flex-1 min-w-[160px]" ref={suggestRef}>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Category name</label>
              <input
                type="text"
                value={name}
                onChange={e => { emojiUserEdited.current = false; setName(e.target.value); setShowSuggest(true) }}
                onFocus={() => { if (suggestions.length > 0) setShowSuggest(true) }}
                placeholder="e.g. Whole Chicken"
                className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                autoComplete="off"
              />
              {showSuggest && suggestions.length > 0 && (
                <div className="absolute left-0 top-full mt-1 z-50 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl overflow-hidden">
                  {suggestions.map((s, i) => (
                    <button key={i} type="button"
                      onMouseDown={() => { setName(s.name); if (!emojiUserEdited.current) setEmoji(s.emoji); setShowSuggest(false) }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-left border-b border-gray-100 dark:border-gray-700 last:border-0">
                      <span className="text-base flex-shrink-0">{s.emoji}</span>
                      <span className="text-gray-900 dark:text-gray-100 truncate">{s.name}</span>
                    </button>
                  ))}
                  {name.trim().length >= 2 && (
                    <button type="button"
                      onMouseDown={() => { setShowSuggest(false); setShowEmojiPicker(v => !v) }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-left font-medium">
                      🔍 Browse more emojis for "{name}"…
                    </button>
                  )}
                </div>
              )}
              {showEmojiPicker && (
                <div className="absolute left-0 top-full mt-1 z-50 w-72 bg-white dark:bg-gray-800 border border-blue-300 dark:border-blue-700 rounded-lg shadow-xl">
                  <div className="flex items-center justify-between px-3 pt-2 pb-1 border-b border-gray-100 dark:border-gray-700">
                    <span className="text-xs font-medium text-gray-500">Emoji search — "{name}"</span>
                    <button type="button" onClick={() => setShowEmojiPicker(false)} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
                  </div>
                  <div className="p-3">
                    <EmojiPickerEnhanced
                      selectedEmoji={emoji}
                      initialQuery={name.trim()}
                      onSelect={e => { setEmoji(e); emojiUserEdited.current = true; setShowEmojiPicker(false) }}
                      searchPlaceholder="Or search for a different emoji…"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Price */}
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Price / kg
                {calcResult != null && price === calcResult.toFixed(4) && (
                  <span className="ml-1 text-green-600 dark:text-green-400">(from calculator)</span>
                )}
              </label>
              <input
                type="number" step="0.0001" min="0"
                value={price}
                onChange={e => setPrice(e.target.value)}
                placeholder="0.00"
                className="w-28 text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-mono"
              />
            </div>
          </div>

          {/* Calculator — LIVESTOCK only */}
          {purchaseType === 'LIVESTOCK' && (
            <div>
              {!showCalc ? (
                <button onClick={() => setShowCalc(true)} className="text-xs text-orange-600 dark:text-orange-400 hover:underline">
                  🧮 Calculate $/kg from unit price (e.g. 5 chickens × $6/bird ÷ total weight)
                </button>
              ) : (
                <div className="p-3 rounded-lg border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/10 space-y-3">
                  <p className="text-xs font-semibold text-orange-700 dark:text-orange-300">$/kg = (count × price/unit) ÷ total weight</p>
                  <div className="flex flex-wrap gap-3 items-end">
                    <div>
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Count (animals)</label>
                      <input type="number" min="1" step="1" value={calc.unitCount}
                        onChange={e => setCalc(p => ({ ...p, unitCount: e.target.value }))}
                        placeholder="5"
                        className="w-20 text-sm font-mono border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Price / unit ($)</label>
                      <input type="number" min="0" step="0.01" value={calc.pricePerUnit}
                        onChange={e => setCalc(p => ({ ...p, pricePerUnit: e.target.value }))}
                        placeholder="6.00"
                        className="w-24 text-sm font-mono border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Total weight (kg)</label>
                      <input type="number" min="0" step="0.001" value={calc.totalWeightKg}
                        onChange={e => setCalc(p => ({ ...p, totalWeightKg: e.target.value }))}
                        placeholder="14.500"
                        className="w-28 text-sm font-mono border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
                    </div>
                    <div className="flex flex-col items-start gap-1">
                      {calcResult != null ? (
                        <>
                          <span className="text-xs text-gray-500 dark:text-gray-400">Result</span>
                          <span className="text-lg font-mono font-bold text-orange-700 dark:text-orange-300">${calcResult.toFixed(4)}/kg</span>
                        </>
                      ) : (
                        <span className="text-xs text-gray-400 italic">Enter values above</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => { if (calcResult != null) { setPrice(calcResult.toFixed(4)); setShowCalc(false) } }}
                      disabled={calcResult == null}
                      className="px-3 py-1.5 text-xs bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-40"
                    >
                      Use this price
                    </button>
                    <button
                      onClick={() => { setShowCalc(false); setCalc({ unitCount: '', totalWeightKg: '', pricePerUnit: '' }) }}
                      className="px-3 py-1.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-200"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !name.trim() || !price}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40"
          >
            {saving ? 'Saving…' : 'Save Preset'}
          </button>
        </div>
      </div>
    </div>
  )
}
