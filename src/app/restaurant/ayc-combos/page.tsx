'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useScale } from '@/contexts/ScaleContext'
import { EmojiPickerEnhanced } from '@/components/business/emoji-picker-enhanced'
import { ContentLayout } from '@/components/layout/content-layout'
import { useToastContext } from '@/components/ui/toast'
import { useConfirm } from '@/components/ui/confirm-modal'
import { BusinessTypeRoute } from '@/components/auth/business-type-route'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { AddVendorPurchasePresetModal } from '@/components/settings/AddVendorPurchasePresetModal'
import { AYLIPricingNewItemModal, type AppliedCalibration } from '@/components/pos/AYLIPricingNewItemModal'

// ─── Types ────────────────────────────────────────────────────────────────────

interface PoolItem {
  id: string; name: string; emoji: string; isActive: boolean
  buyingPricePerKg: number | null; itemCategory: string
}

interface AYLICombo {
  id: string; name: string; description?: string
  sizes: Array<{ id: string; sizeName: string; basePrice: number; meatThresholdKg?: number | null; sortOrder: number }>
  items: Array<{ id: string; poolItemId: string; pricePerKgSmall: number; pricePerKgMedium: number; pricePerKgLarge: number; pool_item: PoolItem }>
}

const SIZE_LABELS = ['small', 'medium', 'large']
const defaultSizes = () => SIZE_LABELS.map(s => ({ sizeName: s, basePrice: '' }))

// ─── Pool Item Form Modal ──────────────────────────────────────────────────────

function PoolItemModal({
  initial, businessId, onSave, onClose
}: {
  initial?: PoolItem | null
  businessId: string
  onSave: (item: PoolItem) => void
  onClose: () => void
}) {
  const [emoji, setEmoji] = useState(initial?.emoji ?? '🍽️')
  const [emojiManual, setEmojiManual] = useState(false)
  const [name, setName] = useState(initial?.name ?? '')
  const [buyingPrice, setBuyingPrice] = useState(initial?.buyingPricePerKg != null ? String(initial.buyingPricePerKg) : '')
  const [category, setCategory] = useState(initial?.itemCategory ?? 'OTHER')
  const [saving, setSaving] = useState(false)
  const [suggestions, setSuggestions] = useState<Array<{ name: string; emoji: string }>>([])
  const [showSuggest, setShowSuggest] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [vendorPresets, setVendorPresets] = useState<Array<{ id: string; categoryName: string; emoji: string; pricePerKg: number }>>([])
  const [matchedPresets, setMatchedPresets] = useState<Array<{ id: string; categoryName: string; emoji: string; pricePerKg: number }>>([])

  // Load vendor pricing presets once on mount
  useEffect(() => {
    fetch(`/api/weight-pricing-rules?businessId=${businessId}`)
      .then(r => r.ok ? r.json() : [])
      .then((rules: any[]) => setVendorPresets(rules.filter((r: any) => r.isActive && r.ruleType === 'PURCHASE').map((r: any) => ({
        id: r.id, categoryName: r.categoryName, emoji: r.emoji, pricePerKg: Number(r.pricePerKg)
      }))))
      .catch(() => {})
  }, [businessId])

  // Re-match whenever name or loaded presets change
  useEffect(() => {
    if (!name.trim() || vendorPresets.length === 0) { setMatchedPresets([]); return }
    const words = name.toLowerCase().split(/\s+/).filter(w => w.length >= 3)
    if (words.length === 0) { setMatchedPresets([]); return }
    const scored = vendorPresets
      .map(p => {
        const cn = p.categoryName.toLowerCase()
        const hits = words.filter(w => cn.includes(w)).length
        return { ...p, hits }
      })
      .filter(p => p.hits > 0)
      .sort((a, b) => b.hits - a.hits)
    setMatchedPresets(scored.slice(0, 6))
  }, [name, vendorPresets])
  const suggestRef = useRef<HTMLDivElement>(null)
  const nameFocusedRef = useRef(false)
  const toast = useToastContext()

  // Fetch suggestions as user types
  useEffect(() => {
    const q = name.trim()
    if (q.length < 2) { setSuggestions([]); setShowSuggest(false); return }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/expense-categories/suggest?q=${encodeURIComponent(q)}`)
        if (!res.ok) return
        const data = await res.json()
        const seen = new Set<string>()
        const items = (data.suggestions ?? [])
          .map((s: any) => ({
            name: s.subSubcategoryName ?? s.subcategoryName ?? s.categoryName ?? s.domainName ?? '',
            emoji: s.subSubcategoryEmoji ?? s.subcategoryEmoji ?? s.categoryEmoji ?? s.domainEmoji ?? '🍽️'
          }))
          .filter((s: any) => s.name && !seen.has(s.name) && seen.add(s.name))
          .slice(0, 8)
        setSuggestions(items)
        // Only open the dropdown if the name input is still focused
        if (nameFocusedRef.current) setShowSuggest(true)
      } catch {}
    }, 300)
    return () => clearTimeout(timer)
  }, [name])

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (suggestRef.current && !suggestRef.current.contains(e.target as Node)) setShowSuggest(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) { toast.error('Item name required'); return }
    setSaving(true)
    try {
      const url = initial ? `/api/restaurant/ayc-pool-items/${initial.id}` : '/api/restaurant/ayc-pool-items'
      const method = initial ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          name: name.trim(),
          emoji: emoji.trim() || '🍽️',
          buyingPricePerKg: buyingPrice !== '' ? buyingPrice : null,
          itemCategory: category,
        })
      })
      if (res.ok) {
        onSave(await res.json())
        toast.push(initial ? 'Item updated' : 'Item created')
      } else {
        const err = await res.json()
        toast.error(err.error || 'Failed to save')
      }
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md">
        <form onSubmit={handleSubmit}>
          <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-primary">{initial ? 'Edit Pool Item' : 'New Pool Item'}</h3>
            <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-secondary mb-1">Item Name *</label>
              <div className="flex gap-2">
                {/* Editable emoji — type or paste directly */}
                <input
                  type="text"
                  value={emoji}
                  onChange={e => { setEmoji(e.target.value); setEmojiManual(true) }}
                  className="w-12 h-10 px-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-xl text-center flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  maxLength={2}
                  title="Type or paste an emoji"
                />
                {/* Name input with searchable suggest dropdown */}
                <div className="relative flex-1" ref={suggestRef}>
                  <input
                    type="text"
                    value={name}
                    onChange={e => { setName(e.target.value); setEmojiManual(false); setShowSuggest(true) }}
                    onFocus={() => { nameFocusedRef.current = true; if (suggestions.length > 0) setShowSuggest(true) }}
                    onBlur={() => { nameFocusedRef.current = false; setTimeout(() => { setShowSuggest(false); setShowEmojiPicker(false) }, 150) }}
                    required
                    autoComplete="off"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="e.g. Chicken, Beef, Veggies"
                  />
                  {showSuggest && (
                    <div className="absolute left-0 top-full mt-1 z-50 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-xl overflow-hidden">
                      {suggestions.length === 0 && (
                        <div className="px-3 py-2 text-xs text-secondary">No matches for "{name}"</div>
                      )}
                      {suggestions.map((s, i) => (
                        <button key={i} type="button"
                          onMouseDown={() => { setName(s.name); if (!emojiManual) setEmoji(s.emoji); setShowSuggest(false) }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-left border-b border-gray-100 dark:border-gray-700">
                          <span className="text-lg flex-shrink-0">{s.emoji}</span>
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
                        <span className="text-xs font-medium text-secondary">Emoji search — "{name}"</span>
                        <button type="button" onClick={() => setShowEmojiPicker(false)} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
                      </div>
                      <div className="p-3">
                        <EmojiPickerEnhanced
                          selectedEmoji={emoji}
                          initialQuery={name.trim()}
                          onSelect={e => { setEmoji(e); setEmojiManual(true); setShowEmojiPicker(false) }}
                          searchPlaceholder="Or search for a different emoji…"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-secondary mb-1">Buying Price/kg</label>
                <div className="relative">
                  <span className="absolute left-2 top-2 text-secondary text-sm">$</span>
                  <input type="number" step="0.01" min="0" value={buyingPrice}
                    onChange={e => setBuyingPrice(e.target.value)}
                    className="w-full pl-6 pr-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="e.g. 5.00" />
                </div>
                {matchedPresets.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs text-secondary mb-1.5">From vendor presets — click to use:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {matchedPresets.map(p => (
                        <button key={p.id} type="button"
                          onClick={() => setBuyingPrice(p.pricePerKg.toFixed(2))}
                          className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-xs transition-colors ${
                            buyingPrice === p.pricePerKg.toFixed(2)
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                              : 'border-gray-200 dark:border-gray-600 hover:border-blue-400 text-primary'
                          }`}>
                          <span>{p.emoji}</span>
                          <span className="font-medium">{p.categoryName}</span>
                          <span className="text-secondary">${p.pricePerKg.toFixed(2)}/kg</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {matchedPresets.length === 0 && vendorPresets.length > 0 && name.trim().length >= 3 && (
                  <p className="text-xs text-secondary mt-1 italic">No vendor preset match found — enter manually</p>
                )}
                {vendorPresets.length === 0 && (
                  <p className="text-xs text-secondary mt-1">Used for pricing calculations</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary mb-1">Category</label>
                <select value={category} onChange={e => setCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                  <option value="MEAT">🥩 Meat</option>
                  <option value="STARCH">🍚 Starch</option>
                  <option value="VEGETABLE">🥦 Vegetable</option>
                  <option value="SAUCE">🥫 Sauce</option>
                  <option value="OTHER">🍽️ Other</option>
                </select>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 px-5 pb-5">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving…' : initial ? 'Update' : 'Create Item'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Scale Meat Threshold Panel ───────────────────────────────────────────────

const SCALE_STABLE_MS = 1500

function ScaleMeatPanel({ onCapture, capturedSizes }: {
  onCapture: (sizeName: string, kg: number) => void
  capturedSizes: Record<string, string>
}) {
  const { weight, status, tare, isElectron } = useScale()
  const [panelStep, setPanelStep] = useState<'tare' | 'reading'>('tare')
  const [activeSize, setActiveSize] = useState('small')
  const tareTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const liveWeight = weight?.weight ?? 0
  const isStable = !!weight?.stable && !weight?.overload && liveWeight >= 0
  const connected = status.status === 'connected'

  const doTare = useCallback(() => {
    tare()
    setPanelStep('reading')
  }, [tare])

  // Auto-tare when container sits stable on scale
  useEffect(() => {
    if (panelStep !== 'tare' || !isStable || liveWeight <= 0) {
      if (tareTimerRef.current) { clearTimeout(tareTimerRef.current); tareTimerRef.current = null }
      return
    }
    tareTimerRef.current = setTimeout(doTare, SCALE_STABLE_MS)
    return () => { if (tareTimerRef.current) { clearTimeout(tareTimerRef.current); tareTimerRef.current = null } }
  }, [panelStep, isStable, liveWeight, doTare])

  if (!isElectron || !connected) return null

  return (
    <div className="mt-3 border border-blue-200 dark:border-blue-700 rounded-lg p-3 bg-blue-50 dark:bg-blue-950/30">
      {panelStep === 'tare' ? (
        <div className="text-center space-y-2">
          <p className="text-sm font-medium text-blue-800 dark:text-blue-200">⚖️ Place empty container on scale</p>
          <p className="text-2xl font-mono text-blue-900 dark:text-blue-100">{liveWeight.toFixed(3)} kg</p>
          {isStable && liveWeight > 0
            ? <p className="text-xs text-green-600 dark:text-green-400">Stable — taring in a moment…</p>
            : <p className="text-xs text-secondary">Will auto-tare when stable</p>
          }
          <button type="button" onClick={doTare}
            className="text-xs text-blue-600 dark:text-blue-400 underline">
            Tare manually
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Size selector tabs */}
          <div className="flex gap-1">
            {SIZE_LABELS.map(s => (
              <button key={s} type="button" onClick={() => setActiveSize(s)}
                className={`flex-1 py-1.5 rounded text-xs font-medium capitalize transition-colors ${
                  activeSize === s
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-secondary hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}>
                {s} {capturedSizes[s] ? '✓' : ''}
              </button>
            ))}
          </div>
          {/* Live weight */}
          <div className="text-center">
            <p className="text-3xl font-mono text-blue-900 dark:text-blue-100">{liveWeight.toFixed(3)} kg</p>
            <p className="text-xs text-secondary mt-1">{isStable ? 'Stable' : 'Hold steady…'}</p>
          </div>
          {/* Capture button */}
          <button type="button"
            disabled={!isStable || liveWeight <= 0}
            onClick={() => onCapture(activeSize, liveWeight)}
            className="w-full py-2 rounded-md bg-green-600 text-white text-sm font-medium transition-opacity disabled:opacity-40 disabled:cursor-not-allowed hover:bg-green-700">
            {isStable && liveWeight > 0
              ? `Capture ${liveWeight.toFixed(3)} kg for ${activeSize}`
              : 'Add meat to scale…'}
          </button>
          {/* Retare */}
          <div className="text-center">
            <button type="button" onClick={() => setPanelStep('tare')}
              className="text-xs text-secondary underline">
              ← Retare
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Combo Form Modal ──────────────────────────────────────────────────────────

function ComboModal({
  initial, businessId, poolItems, onSave, onClose, onCreatePoolItem, cloneFrom,
}: {
  initial?: AYLICombo | null
  businessId: string
  poolItems: PoolItem[]
  onSave: (combo: AYLICombo, newPoolItemIds: string[]) => void
  onClose: () => void
  onCreatePoolItem: (onCreate: (item: PoolItem) => void) => void
  cloneFrom?: AYLICombo | null
}) {
  const src = initial ?? cloneFrom ?? null
  const [name, setName] = useState(
    initial?.name ?? (cloneFrom ? `Clone of ${cloneFrom.name}` : '')
  )
  const [description, setDescription] = useState(initial?.description ?? cloneFrom?.description ?? '')
  const [sizes, setSizes] = useState(() =>
    src ? SIZE_LABELS.map(s => {
      const found = src.sizes.find(sz => sz.sizeName === s)
      return { sizeName: s, basePrice: found ? String(found.basePrice) : '', meatThresholdKg: found?.meatThresholdKg != null ? String(found.meatThresholdKg) : '' }
    }) : SIZE_LABELS.map(s => ({ sizeName: s, basePrice: '', meatThresholdKg: '' }))
  )
  const [selectedIds, setSelectedIds] = useState<string[]>(
    () => src?.items.map(it => it.poolItemId) ?? []
  )
  const [saving, setSaving] = useState(false)
  const [showScalePanel, setShowScalePanel] = useState(false)
  const toast = useToastContext()
  const { isElectron, isConnected } = useScale()

  const toggleItem = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) { toast.error('Combo name required'); return }
    if (sizes.some(s => !s.basePrice)) { toast.error('All size base prices required'); return }
    if (selectedIds.length === 0) { toast.error('Select at least one pool item'); return }
    setSaving(true)
    try {
      const url = initial ? `/api/restaurant/ayc-combos/${initial.id}` : '/api/restaurant/ayc-combos'
      const method = initial ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          name: name.trim(),
          description: description.trim() || null,
          sizes: sizes.map(s => ({
            ...s,
            meatThresholdKg: s.meatThresholdKg !== '' ? s.meatThresholdKg : null,
          })),
          poolItemIds: selectedIds,
        })
      })
      if (res.ok) {
        const saved = await res.json()
        const priorIds = initial?.items.map(it => it.poolItemId) ?? []
        const newPoolItemIds = selectedIds.filter(id => !priorIds.includes(id))
        onSave(saved, newPoolItemIds)
        toast.push(initial ? 'Combo updated' : 'Combo created')
      }
      else { const err = await res.json(); toast.error(err.error || 'Failed to save') }
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center overflow-y-auto py-8 px-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg">
        <form onSubmit={handleSubmit}>
          <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-primary">{initial ? 'Edit Combo' : 'New AYLI Combo'}</h3>
            <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
          </div>
          <div className="p-5 space-y-5">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-secondary mb-1">Combo Name *</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="e.g. Build-Your-Own Bowl" />
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary mb-1">Description</label>
              <input type="text" value={description} onChange={e => setDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="Optional" />
            </div>

            {/* Size base prices + meat thresholds */}
            <div>
              <label className="block text-sm font-medium text-secondary mb-2">Sizes *</label>
              <div className="space-y-2">
                {sizes.map((s, i) => (
                  <div key={s.sizeName} className="grid grid-cols-2 gap-2 items-end">
                    <div>
                      <label className="block text-xs text-secondary mb-1 capitalize">{s.sizeName} — Base Price</label>
                      <div className="relative">
                        <span className="absolute left-2 top-2 text-secondary text-sm">$</span>
                        <input type="number" step="0.01" min="0" value={s.basePrice} required
                          onChange={e => setSizes(prev => prev.map((x, j) => j === i ? { ...x, basePrice: e.target.value } : x))}
                          className="w-full pl-6 pr-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                          placeholder="0.00" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-secondary mb-1">Min Meat Weight (kg)</label>
                      <input type="number" step="0.001" min="0" value={s.meatThresholdKg}
                        onChange={e => setSizes(prev => prev.map((x, j) => j === i ? { ...x, meatThresholdKg: e.target.value } : x))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        placeholder="e.g. 0.150" />
                    </div>
                  </div>
                ))}
              </div>
              {/* Optional scale-assisted meat threshold entry */}
              {isElectron && isConnected && (
                <div className="mt-2">
                  <button type="button" onClick={() => setShowScalePanel(p => !p)}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
                    {showScalePanel ? '▲ Hide scale panel' : '⚖ Set min meat weights with scale'}
                  </button>
                  {showScalePanel && (
                    <ScaleMeatPanel
                      capturedSizes={Object.fromEntries(
                        sizes.filter(s => s.meatThresholdKg).map(s => [s.sizeName, s.meatThresholdKg])
                      )}
                      onCapture={(sizeName, kg) =>
                        setSizes(prev => prev.map(s =>
                          s.sizeName === sizeName
                            ? { ...s, meatThresholdKg: String(Math.round(kg * 1000) / 1000) }
                            : s
                        ))
                      }
                    />
                  )}
                </div>
              )}
            </div>

            {/* Pool items selector */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-secondary">Allowed Items * <span className="text-xs font-normal text-secondary">({selectedIds.length} selected)</span></label>
                <button type="button"
                  onClick={() => onCreatePoolItem(item => setSelectedIds(prev => [...prev, item.id]))}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
                  + New pool item
                </button>
              </div>
              {poolItems.length === 0 ? (
                <div className="text-sm text-secondary italic border border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 text-center">
                  No pool items yet.{' '}
                  <button type="button" onClick={() => onCreatePoolItem(item => setSelectedIds(prev => [...prev, item.id]))}
                    className="text-blue-600 dark:text-blue-400 underline">Create one</button>
                </div>
              ) : (
                <div className="space-y-2 max-h-52 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-lg p-2">
                  {poolItems.map(item => {
                    const checked = selectedIds.includes(item.id)
                    return (
                      <label key={item.id}
                        className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
                          !item.isActive
                            ? 'opacity-40 cursor-not-allowed'
                            : checked
                            ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 cursor-pointer'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer'
                        }`}>
                        <input type="checkbox" checked={checked} disabled={!item.isActive}
                          onChange={() => item.isActive && toggleItem(item.id)} className="rounded" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-base">{item.emoji || '🍽️'}</span>
                            <span className="font-medium text-sm text-primary">{item.name}</span>
                            {!item.isActive && <span className="text-[10px] text-amber-600 dark:text-amber-400">(disabled)</span>}
                          </div>
                          <div className="text-xs text-secondary">
                            {item.itemCategory !== 'OTHER' ? item.itemCategory.charAt(0) + item.itemCategory.slice(1).toLowerCase() : 'Uncategorised'}
                            {item.buyingPricePerKg != null ? ` · $${Number(item.buyingPricePerKg).toFixed(2)}/kg cost` : ''}
                          </div>
                        </div>
                      </label>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
          <div className="flex justify-end gap-2 px-5 pb-5">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving…' : initial ? 'Save Changes' : 'Create AYLI Combo'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function AYCCombosPage() {
  const { currentBusinessId, hasPermission } = useBusinessPermissionsContext()
  const toast = useToastContext()
  const confirm = useConfirm()

  const [poolItems, setPoolItems] = useState<PoolItem[]>([])
  const [combos, setCombos] = useState<AYLICombo[]>([])
  const [loading, setLoading] = useState(true)

  // Modal state
  const [poolModal, setPoolModal] = useState<{ open: boolean; editing: PoolItem | null; onCreated?: (item: PoolItem) => void }>({ open: false, editing: null })
  const [comboModal, setComboModal] = useState<{ open: boolean; editing: AYLICombo | null }>({ open: false, editing: null })
  const [presetModal, setPresetModal] = useState<{ itemId: string; name: string; emoji: string } | null>(null)
  const [pendingPricingUpdate, setPendingPricingUpdate] = useState<{
    combo: AYLICombo; newPoolItemIds: string[]; lastCalibration: AppliedCalibration
  } | null>(null)
  const [cloneSource, setCloneSource] = useState<AYLICombo | null>(null)

  const copySourcePricingToClone = async (source: AYLICombo, newCombo: AYLICombo) => {
    const poolToNewCI = new Map(newCombo.items.map(ci => [ci.poolItemId, ci.id]))

    // Build customPrices from source item prices, mapped to new combo item IDs
    const itemPrices: Record<string, { small: number; medium: number; large: number }> = {}
    for (const newCI of newCombo.items) {
      const sourceCI = source.items.find(sCI => sCI.poolItemId === newCI.poolItemId)
      if (sourceCI) {
        itemPrices[newCI.id] = {
          small:  Number(sourceCI.pricePerKgSmall),
          medium: Number(sourceCI.pricePerKgMedium),
          large:  Number(sourceCI.pricePerKgLarge),
        }
      }
    }
    const basePrices = {
      small:  Number(source.sizes.find(s => s.sizeName === 'small')?.basePrice  ?? 0),
      medium: Number(source.sizes.find(s => s.sizeName === 'medium')?.basePrice ?? 0),
      large:  Number(source.sizes.find(s => s.sizeName === 'large')?.basePrice  ?? 0),
    }
    const customPrices = { itemPrices, basePrices }

    // Try to copy calibration history from source
    const calRes = await fetch(`/api/restaurant/ayli-pricing?comboId=${source.id}`)
    if (calRes.ok) {
      const calibrations = await calRes.json()
      const lastApplied = (calibrations as any[]).find(c => c.status === 'APPLIED')
      if (lastApplied) {
        const tp = lastApplied.targetPrices as any
        const mappedSimLines = (lastApplied.simulationLines as any[])
          .filter((l: any) => poolToNewCI.has(l.poolItemId))
          .map((l: any) => ({ ...l, comboItemId: poolToNewCI.get(l.poolItemId) ?? l.comboItemId }))

        const createRes = await fetch('/api/restaurant/ayli-pricing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            comboId: newCombo.id, businessId: currentBusinessId,
            simulationLines: mappedSimLines,
            targetPrice: tp?.target ?? 2,
            multipliers: tp?.multipliers ?? { small: 1, medium: 2, large: 3 },
          }),
        })
        if (createRes.ok) {
          const calRecord = await createRes.json()
          await fetch('/api/restaurant/ayli-pricing/apply', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ calibrationId: calRecord.id, selectedOptions: { optionIndex: 0 }, customPrices }),
          })
          fetchCombos()
          toast.push(`"${newCombo.name}" cloned from "${source.name}" — pricing copied`)
          return
        }
      }
    }

    // Fallback: copy prices via override API (no calibration history)
    const overrides = Object.entries(itemPrices).map(([comboItemId, p]) => ({
      comboItemId, small: p.small, medium: p.medium, large: p.large,
    }))
    if (overrides.length > 0) {
      await fetch('/api/restaurant/ayli-pricing/override', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ overrides }),
      })
      fetchCombos()
    }
    toast.push(`"${newCombo.name}" cloned from "${source.name}" — run the pricing wizard to refine`)
  }

  const handleComboSave = async (combo: AYLICombo, newPoolItemIds: string[]) => {
    setComboModal({ open: false, editing: null })
    fetchCombos()

    if (cloneSource) {
      const src = cloneSource
      setCloneSource(null)
      await copySourcePricingToClone(src, combo)
      return
    }

    if (newPoolItemIds.length === 0) return
    const res = await fetch(`/api/restaurant/ayli-pricing?comboId=${combo.id}`)
    if (!res.ok) return
    const calibrations = await res.json()
    const lastApplied = (calibrations as any[]).find(c => c.status === 'APPLIED')
    if (!lastApplied) return
    setPendingPricingUpdate({ combo, newPoolItemIds, lastCalibration: lastApplied })
  }

  useEffect(() => {
    if (currentBusinessId) { fetchPoolItems(); fetchCombos() }
  }, [currentBusinessId])

  const fetchPoolItems = async () => {
    const res = await fetch(`/api/restaurant/ayc-pool-items?businessId=${currentBusinessId}`)
    if (res.ok) setPoolItems(await res.json())
    setLoading(false)
  }

  const fetchCombos = async () => {
    const res = await fetch(`/api/restaurant/ayc-combos?businessId=${currentBusinessId}`)
    if (res.ok) setCombos(await res.json())
  }

  const togglePoolItem = async (item: PoolItem) => {
    const enabling = !item.isActive
    const res = await fetch(`/api/restaurant/ayc-pool-items/${item.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: enabling })
    })
    if (res.ok) {
      toast.push(enabling ? `"${item.name}" enabled — will appear in POS` : `"${item.name}" disabled — hidden from POS today`)
      fetchPoolItems()
    } else toast.error('Failed to update')
  }

  const deletePoolItem = async (item: PoolItem) => {
    const ok = await confirm({ title: 'Permanently remove?', description: `Remove "${item.name}" from the pool entirely? Use Disable instead if you just want to hide it temporarily.`, confirmText: 'Remove', cancelText: 'Cancel' })
    if (!ok) return
    const res = await fetch(`/api/restaurant/ayc-pool-items/${item.id}`, { method: 'DELETE' })
    if (res.ok) { toast.push('Removed'); fetchPoolItems() } else toast.error('Failed to remove')
  }

  const deleteCombo = async (combo: AYLICombo) => {
    const ok = await confirm({ title: 'Delete combo?', description: `Delete "${combo.name}"?`, confirmText: 'Delete', cancelText: 'Cancel' })
    if (!ok) return
    const res = await fetch(`/api/restaurant/ayc-combos/${combo.id}`, { method: 'DELETE' })
    if (res.ok) { toast.push('Deleted'); fetchCombos() } else toast.error('Failed to delete')
  }

  const openCreatePoolItemInline = (onCreated: (item: PoolItem) => void) => {
    setPoolModal({ open: true, editing: null, onCreated })
  }

  return (
    <BusinessTypeRoute requiredBusinessType="restaurant">
      <ContentLayout
        title="🥗 AYLI Combos"
        subtitle="As-You-Like-It weight-based combo configuration"
        breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'AYLI Combos', isActive: true }]}
      >
        {loading ? (
          <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>
        ) : (
          <div className="space-y-8">

            {/* ── Pool Items Section ────────────────────────────────────────── */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-base font-semibold text-primary">Pool Items</h2>
                  <p className="text-xs text-secondary mt-0.5">The shared list of items available in any AYLI combo. Set buying prices here; selling prices are calibrated per combo.</p>
                </div>
                {hasPermission('canCreateAYLIPoolItems') && (
                  <button className="btn-primary text-sm" onClick={() => setPoolModal({ open: true, editing: null })}>+ Add Item</button>
                )}
              </div>

              {poolItems.length === 0 ? (
                <div className="border border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center">
                  <div className="text-3xl mb-2">🥩</div>
                  <p className="text-secondary text-sm mb-3">No pool items yet. Add items like Chicken, Beef, Veggies with their 3-tier prices.</p>
                  {hasPermission('canCreateAYLIPoolItems') && (
                    <button className="btn-primary text-sm" onClick={() => setPoolModal({ open: true, editing: null })}>Add First Item</button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {poolItems.map(item => (
                    <div key={item.id} className={`card p-4 flex items-start justify-between gap-3 transition-opacity ${item.isActive ? '' : 'opacity-50'}`}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xl flex-shrink-0">{item.emoji || '🍽️'}</span>
                          <div className="font-semibold text-sm text-primary truncate">{item.name}</div>
                          {!item.isActive && (
                            <span className="text-[10px] font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded-full flex-shrink-0">
                              DISABLED
                            </span>
                          )}
                        </div>
                        <div className="mt-1.5 flex items-center gap-2 text-xs">
                          <span className="bg-gray-100 dark:bg-gray-700 rounded px-1.5 py-0.5 text-secondary capitalize">
                            {item.itemCategory !== 'OTHER' ? item.itemCategory.charAt(0) + item.itemCategory.slice(1).toLowerCase() : 'Other'}
                          </span>
                          {item.buyingPricePerKg != null
                            ? <span className="text-secondary">${Number(item.buyingPricePerKg).toFixed(2)}/kg cost</span>
                            : hasPermission('canCreateAYLIPoolItems')
                              ? <button onClick={() => setPresetModal({ itemId: item.id, name: item.name, emoji: item.emoji })} className="text-blue-500 dark:text-blue-400 italic hover:underline">Set purchase price</button>
                              : <span className="text-secondary italic">No cost price set</span>
                          }
                        </div>
                      </div>
                      <div className="flex flex-col gap-1 flex-shrink-0 items-end">
                        {hasPermission('canCreateAYLIPoolItems') && (
                          <button onClick={() => setPoolModal({ open: true, editing: item })} className="text-xs text-blue-600 dark:text-blue-400 hover:underline">Edit</button>
                        )}
                        {hasPermission('canDisableAYLIPoolItems') && (
                          <button
                            onClick={() => togglePoolItem(item)}
                            className={`text-xs font-medium hover:underline ${item.isActive ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                            {item.isActive ? 'Disable' : 'Enable'}
                          </button>
                        )}
                        {hasPermission('canDeleteAYLIPoolItems') && (
                          <button onClick={() => deletePoolItem(item)} className="text-xs text-red-500 hover:underline">Remove</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── Combos Section ────────────────────────────────────────────── */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-base font-semibold text-primary">Combos</h2>
                  <p className="text-xs text-secondary mt-0.5">Each combo selects which pool items are available and sets the Small / Medium / Large base prices.</p>
                </div>
                {hasPermission('canCreateAYLICombos') && (
                  <button className="btn-primary text-sm" onClick={() => setComboModal({ open: true, editing: null })}
                    disabled={poolItems.length === 0} title={poolItems.length === 0 ? 'Add pool items first' : ''}>
                    + New Combo
                  </button>
                )}
              </div>

              {combos.length === 0 ? (
                <div className="border border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center">
                  <div className="text-3xl mb-2">🥗</div>
                  <p className="text-secondary text-sm mb-3">{poolItems.length === 0 ? 'Add pool items first, then create a combo.' : 'No combos yet.'}</p>
                  {poolItems.length > 0 && hasPermission('canCreateAYLICombos') && (
                    <button className="btn-primary text-sm" onClick={() => setComboModal({ open: true, editing: null })}>Create First Combo</button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {combos.map(combo => (
                    <div key={combo.id} className="card p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-semibold text-primary">{combo.name}</h3>
                          {combo.description && <p className="text-xs text-secondary mt-0.5">{combo.description}</p>}
                        </div>
                        <div className="flex gap-2 items-center">
                          {hasPermission('canCreateAYLICombos') && (
                            <button className="btn-secondary text-xs py-1" onClick={() => setComboModal({ open: true, editing: combo })}>Edit</button>
                          )}
                          {hasPermission('canCreateAYLICombos') && (
                            <button className="text-xs text-purple-600 dark:text-purple-400 hover:underline"
                              onClick={() => { setCloneSource(combo); setComboModal({ open: true, editing: null }) }}>
                              Clone
                            </button>
                          )}
                          {hasPermission('canDeleteAYLICombos') && (
                            <button className="text-xs text-red-500 hover:underline" onClick={() => deleteCombo(combo)}>Delete</button>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        {combo.sizes.map(s => (
                          <div key={s.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-2 text-center">
                            <div className="text-xs text-secondary capitalize">{s.sizeName}</div>
                            <div className="font-semibold text-sm text-primary">${Number(s.basePrice).toFixed(2)}</div>
                          </div>
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {combo.items.map(it => (
                          <span key={it.id} className="text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <span>{it.pool_item.emoji || '🍽️'}</span>
                            <span>{it.pool_item.name}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Pool Item Modal */}
        {poolModal.open && (
          <PoolItemModal
            initial={poolModal.editing}
            businessId={currentBusinessId || ''}
            onClose={() => setPoolModal({ open: false, editing: null })}
            onSave={item => {
              setPoolModal({ open: false, editing: null })
              fetchPoolItems()
              poolModal.onCreated?.(item)
            }}
          />
        )}

        {/* Combo Modal */}
        {comboModal.open && (
          <ComboModal
            initial={comboModal.editing}
            cloneFrom={cloneSource}
            businessId={currentBusinessId || ''}
            poolItems={poolItems}
            onClose={() => { setComboModal({ open: false, editing: null }); setCloneSource(null) }}
            onSave={handleComboSave}
            onCreatePoolItem={openCreatePoolItemInline}
          />
        )}

        {/* Add Purchase Preset shortcut from pool item card */}
        {presetModal && (
          <AddVendorPurchasePresetModal
            businessId={currentBusinessId || ''}
            initialName={presetModal.name}
            initialEmoji={presetModal.emoji}
            purchaseType="GOODS"
            onSuccess={async (rule) => {
              // Also patch the pool item's buyingPricePerKg so the card reflects the price
              await fetch(`/api/restaurant/ayc-pool-items/${presetModal.itemId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ buyingPricePerKg: rule.pricePerKg }),
              })
              setPoolItems(prev => prev.map(p => p.id === presetModal.itemId ? { ...p, buyingPricePerKg: rule.pricePerKg } : p))
              setPresetModal(null)
            }}
            onClose={() => setPresetModal(null)}
          />
        )}
        {/* Pricing update modal — shown when new item is added to a calibrated combo */}
        {pendingPricingUpdate && (
          <AYLIPricingNewItemModal
            combo={pendingPricingUpdate.combo}
            newPoolItemIds={pendingPricingUpdate.newPoolItemIds}
            lastCalibration={pendingPricingUpdate.lastCalibration}
            businessId={currentBusinessId || ''}
            onApplied={() => { setPendingPricingUpdate(null); fetchCombos() }}
            onSkip={() => setPendingPricingUpdate(null)}
          />
        )}
      </ContentLayout>
    </BusinessTypeRoute>
  )
}
