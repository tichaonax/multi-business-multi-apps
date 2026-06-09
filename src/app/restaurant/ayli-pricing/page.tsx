'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { ContentLayout } from '@/components/layout/content-layout'
import { BusinessTypeRoute } from '@/components/auth/business-type-route'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { useToastContext } from '@/components/ui/toast'
import { AYLIComboModal, AYLIComboData } from '@/components/pos/AYLIComboModal'
import type { AyliPricingOption } from '@/lib/ayli-pricing-calculator'

// ─── Types ────────────────────────────────────────────────────────────────────

interface PoolItem {
  id: string; name: string; emoji: string; isActive: boolean
  buyingPricePerKg: number | null; itemCategory: string
}

interface ComboSize {
  id: string; sizeName: string; basePrice: number; meatThresholdKg?: number | null; sortOrder: number
}

interface ComboItem {
  id: string; poolItemId: string
  pricePerKgSmall: number; pricePerKgMedium: number; pricePerKgLarge: number
  pool_item: PoolItem
}

interface AYLICombo {
  id: string; name: string; maxWeightKg: number; maxItems: number
  sizes: ComboSize[]; items: ComboItem[]
}

interface Calibration {
  id: string; comboId: string; version: number; status: string
  simulationLines: any[]; targetPrices: Record<string, number>
  generatedOptions: AyliPricingOption[] | Record<string, any[]>  // new = flat array; old = per-size map
  selectedOptions: Record<string, number> | { optionIndex: number }
  appliedAt: string | null; createdAt: string
}

const SIZE_LABELS = ['small', 'medium', 'large'] as const
const CATEGORY_LABELS: Record<string, string> = {
  MEAT: '🥩 Meat', STARCH: '🍚 Starch', VEGETABLE: '🥦 Vegetable', SAUCE: '🥫 Sauce', OTHER: '🍽️ Other'
}

// ─── Searchable Select ────────────────────────────────────────────────────────

function SearchableSelect({
  value, onChange, options, placeholder = 'Search…', className = '',
}: {
  value: string
  onChange: (v: string) => void
  options: Array<{ value: string; label: string }>
  placeholder?: string
  className?: string
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 })
  const triggerRef = useRef<HTMLDivElement>(null)
  const ref = useRef<HTMLDivElement>(null)

  const current = options.find(o => o.value === value)
  const filtered = query.trim()
    ? options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()))
    : options

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        ref.current && !ref.current.contains(e.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(e.target as Node)
      ) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleOpen = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      setPos({ top: rect.bottom + window.scrollY + 4, left: rect.left + window.scrollX, width: rect.width })
    }
    setOpen(v => !v)
    setQuery('')
  }

  const dropdown = open && typeof document !== 'undefined' && createPortal(
    <div ref={ref}
      style={{ position: 'absolute', top: pos.top, left: pos.left, width: pos.width, zIndex: 9999 }}
      className="min-w-[160px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-xl overflow-hidden">
      <div className="p-1.5 border-b border-gray-100 dark:border-gray-700">
        <input
          autoFocus
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={placeholder}
          className="w-full px-2 py-1 text-xs border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>
      <div className="max-h-48 overflow-y-auto">
        {filtered.length === 0 && (
          <div className="px-3 py-2 text-xs text-secondary">No matches</div>
        )}
        {filtered.map(o => (
          <button key={o.value} type="button"
            onClick={() => { onChange(o.value); setOpen(false); setQuery('') }}
            className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${o.value === value ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium' : 'text-primary'}`}>
            {o.label}
          </button>
        ))}
      </div>
    </div>,
    document.body
  )

  return (
    <div className={`relative ${className}`}>
      <div ref={triggerRef}
        onClick={handleOpen}
        className="flex items-center justify-between px-3 py-1.5 text-sm border border-gray-300 rounded-md cursor-pointer bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white select-none min-h-[34px]">
        <span className={current ? 'text-primary' : 'text-secondary'}>{current?.label ?? placeholder}</span>
        <span className="text-secondary text-xs ml-2">▾</span>
      </div>
      {dropdown}
    </div>
  )
}

// ─── Tab 1: Pool Item Setup ───────────────────────────────────────────────────

function PoolSetupTab({
  combo, poolItems, calibrations, onPoolItemsChanged,
}: {
  combo: AYLICombo
  poolItems: PoolItem[]
  calibrations: Calibration[]
  onPoolItemsChanged: () => void
}) {
  const toast = useToastContext()
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [localItems, setLocalItems] = useState<Record<string, { buyingPrice: string; category: string }>>({})
  const [localThresholds, setLocalThresholds] = useState<Record<string, string>>({})

  useEffect(() => {
    const map: Record<string, { buyingPrice: string; category: string }> = {}
    for (const pi of poolItems) {
      map[pi.id] = {
        buyingPrice: pi.buyingPricePerKg != null ? String(pi.buyingPricePerKg) : '',
        category: pi.itemCategory || 'OTHER',
      }
    }
    setLocalItems(map)

    // Load thresholds from combo sizes; if small is missing, derive from latest calibration
    const threshMap: Record<string, string> = {}
    for (const sz of combo.sizes) {
      threshMap[sz.sizeName] = sz.meatThresholdKg != null ? String(sz.meatThresholdKg) : ''
    }

    // If small has no threshold, try to back-fill from the most recent applied calibration
    if (!threshMap.small) {
      const latestApplied = calibrations.find(c => c.status === 'APPLIED')
      if (latestApplied) {
        const simLines = latestApplied.simulationLines as Array<{ weightKg: number; itemCategory: string }>
        const firstMeat = simLines.find(l => l.itemCategory === 'MEAT')
        if (firstMeat) {
          const smallKg = Math.round(firstMeat.weightKg * 1000) / 1000
          const storedMultipliers = (latestApplied.targetPrices as any)?.multipliers ?? { medium: 2, large: 3 }
          threshMap.small = String(smallKg)
          if (!threshMap.medium) threshMap.medium = String(Math.round(smallKg * storedMultipliers.medium * 1000) / 1000)
          if (!threshMap.large)  threshMap.large  = String(Math.round(smallKg * storedMultipliers.large  * 1000) / 1000)
        }
      }
    }

    setLocalThresholds(threshMap)
  }, [poolItems, combo.sizes, calibrations])

  const savePoolItem = async (pi: PoolItem) => {
    const local = localItems[pi.id]
    if (!local) return
    setSaving(s => ({ ...s, [pi.id]: true }))
    try {
      const res = await fetch(`/api/restaurant/ayc-pool-items/${pi.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buyingPricePerKg: local.buyingPrice !== '' ? local.buyingPrice : null,
          itemCategory: local.category,
        }),
      })
      if (res.ok) { toast.push(`${pi.name} saved`); onPoolItemsChanged() }
      else toast.error('Failed to save')
    } finally { setSaving(s => ({ ...s, [pi.id]: false })) }
  }

  const [savingThresholds, setSavingThresholds] = useState(false)
  const [thresholdOverrides, setThresholdOverrides] = useState<Record<string, boolean>>({})

  const handleSmallThresholdChange = (val: string) => {
    setLocalThresholds(m => {
      const next: Record<string, string> = { ...m, small: val }
      const smallKg = parseFloat(val)
      if (!isNaN(smallKg) && smallKg > 0) {
        if (!thresholdOverrides.medium) next.medium = (Math.round(smallKg * 2 * 1000) / 1000).toString()
        if (!thresholdOverrides.large) next.large = (Math.round(smallKg * 3 * 1000) / 1000).toString()
      }
      return next
    })
  }

  const saveAllThresholds = async () => {
    setSavingThresholds(true)
    try {
      const res = await fetch(`/api/restaurant/ayc-combos/${combo.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sizes: combo.sizes.map(s => ({
            sizeName: s.sizeName,
            basePrice: s.basePrice,
            meatThresholdKg: localThresholds[s.sizeName] !== '' ? localThresholds[s.sizeName] : null,
          })),
        }),
      })
      if (res.ok) toast.push('Thresholds saved')
      else toast.error('Failed to save thresholds')
    } finally { setSavingThresholds(false) }
  }

  const comboPoolItemIds = new Set(combo.items.map(ci => ci.poolItemId))
  const comboPoolItems = poolItems.filter(pi => comboPoolItemIds.has(pi.id) && pi.isActive)

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-primary mb-1">Pool Item Cost & Category</h3>
        <p className="text-xs text-secondary mb-3">Set vendor buying prices and categories for accurate pricing calculations.</p>
        <div className="space-y-2">
          {comboPoolItems.map(pi => {
            const local = localItems[pi.id]
            if (!local) return null
            return (
              <div key={pi.id} className="card p-3 flex items-center gap-3">
                <span className="text-2xl flex-shrink-0">{pi.emoji || '🍽️'}</span>
                <span className="font-medium text-sm text-primary w-32 flex-shrink-0">{pi.name}</span>
                <div className="flex items-center gap-2 flex-1">
                  <div className="relative w-32">
                    <span className="absolute left-2 top-2 text-secondary text-xs">$</span>
                    <input type="number" step="0.01" min="0" value={local.buyingPrice}
                      onChange={e => setLocalItems(m => ({ ...m, [pi.id]: { ...m[pi.id], buyingPrice: e.target.value } }))}
                      className="w-full pl-5 pr-2 py-1.5 text-sm border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      placeholder="Cost/kg" />
                  </div>
                  <SearchableSelect
                    value={local.category}
                    onChange={v => setLocalItems(m => ({ ...m, [pi.id]: { ...m[pi.id], category: v } }))}
                    options={Object.entries(CATEGORY_LABELS).map(([v, l]) => ({ value: v, label: l }))}
                    placeholder="Category…"
                    className="flex-1"
                  />
                </div>
                <button onClick={() => savePoolItem(pi)} disabled={saving[pi.id]}
                  className="btn-primary text-xs py-1 px-3 flex-shrink-0">
                  {saving[pi.id] ? 'Saving…' : 'Save'}
                </button>
              </div>
            )
          })}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-semibold text-primary">Meat Minimum Weights</h3>
          <button onClick={saveAllThresholds} disabled={savingThresholds} className="btn-primary text-xs py-1 px-3">
            {savingThresholds ? 'Saving…' : 'Save All'}
          </button>
        </div>
        <p className="text-xs text-secondary mb-3">
          Auto-set from your last calibration (first meat weight captured). Medium and large scale by 2× and 3×. Adjust Small to recalculate, or override medium/large independently.
        </p>
        <div className="grid grid-cols-3 gap-3">
          {/* Small — drives medium and large */}
          <div>
            <label className="block text-xs text-secondary mb-1">Small</label>
            <input type="number" step="0.001" min="0" value={localThresholds.small ?? ''}
              onChange={e => handleSmallThresholdChange(e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
              placeholder="e.g. 0.150" />
          </div>
          {/* Medium and Large — auto-calculated, overridable */}
          {(['medium', 'large'] as const).map((sz, i) => {
            const multiplier = i === 0 ? 2 : 3
            const isOverridden = thresholdOverrides[sz]
            return (
              <div key={sz}>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-secondary capitalize">{sz}</label>
                  {isOverridden
                    ? <button onClick={() => {
                        setThresholdOverrides(o => ({ ...o, [sz]: false }))
                        const small = parseFloat(localThresholds.small ?? '')
                        if (!isNaN(small) && small > 0) {
                          setLocalThresholds(m => ({ ...m, [sz]: (Math.round(small * multiplier * 1000) / 1000).toString() }))
                        }
                      }} className="text-[10px] text-blue-500 hover:underline">Reset to auto</button>
                    : <span className="text-[10px] text-secondary italic">{multiplier}× small</span>
                  }
                </div>
                <input type="number" step="0.001" min="0" value={localThresholds[sz] ?? ''}
                  onChange={e => {
                    setThresholdOverrides(o => ({ ...o, [sz]: true }))
                    setLocalThresholds(m => ({ ...m, [sz]: e.target.value }))
                  }}
                  className={`w-full px-2 py-1.5 text-sm border rounded-md dark:bg-gray-700 dark:text-white ${isOverridden ? 'border-amber-400 dark:border-amber-500' : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50'}`}
                  placeholder={`auto (${multiplier}× small)`} />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// Normalise old per-size format {small:[...5], medium:[...5], large:[...5]} → flat AyliPricingOption[]
function normaliseGeneratedOptions(raw: any): AyliPricingOption[] {
  if (Array.isArray(raw)) return raw as AyliPricingOption[]
  if (raw?.small && Array.isArray(raw.small)) {
    const count = Math.min(raw.small.length, raw.medium?.length ?? 0, raw.large?.length ?? 0)
    const result: AyliPricingOption[] = []
    for (let i = 0; i < count; i++) {
      const s = raw.small[i] ?? {}
      const m = raw.medium[i] ?? {}
      const l = raw.large[i] ?? {}
      result.push({
        basePriceSmall:   s.basePrice ?? 0,
        basePriceMedium:  m.basePrice ?? 0,
        basePriceLarge:   l.basePrice ?? 0,
        itemPricesSmall:  s.itemPrices ?? {},
        itemPricesMedium: m.itemPrices ?? {},
        itemPricesLarge:  l.itemPrices ?? {},
        effectiveRateSmall:  s.effectiveRatePerKg ?? 0,
        effectiveRateMedium: m.effectiveRatePerKg ?? 0,
        effectiveRateLarge:  l.effectiveRatePerKg ?? 0,
        estimatedMarginPct: s.estimatedMarginPct ?? null,
      })
    }
    return result
  }
  return []
}

// ─── Tab 2: Calibration Wizard ────────────────────────────────────────────────

function CalibrationTab({
  combo, calibrations, onCalibrationSaved, onApplied,
}: {
  combo: AYLICombo
  calibrations: Calibration[]
  onCalibrationSaved: (record: Calibration) => void
  onApplied: () => void
}) {
  const toast = useToastContext()
  const [wizardStep, setWizardStep] = useState<'build' | 'prices' | 'options'>('build')
  const [capturedLines, setCapturedLines] = useState<AYLIComboData | null>(null)
  const [targetPrice, setTargetPrice] = useState('')
  const [generatedOptions, setGeneratedOptions] = useState<AyliPricingOption[] | null>(null)
  const [selectedOptIndex, setSelectedOptIndex] = useState<number | null>(null)
  const [calibrationId, setCalibrationId] = useState<string | null>(null)
  const [sizeMultipliers, setSizeMultipliers] = useState({ medium: '2', large: '3' })
  const [loadedFromHistory, setLoadedFromHistory] = useState(false)
  const [simLines, setSimLines] = useState<any[]>([])
  const [previousOptIndex, setPreviousOptIndex] = useState<number | null>(null)
  const [recalibrating, setRecalibrating] = useState(false)
  const [computing, setComputing] = useState(false)
  const [applying, setApplying] = useState(false)
  const [showModal, setShowModal] = useState(false)

  const smallSize = combo.sizes.find(s => s.sizeName === 'small') ?? combo.sizes[0]
  const [minMeatKg, setMinMeatKg] = useState(
    smallSize?.meatThresholdKg != null ? String(Number(smallSize.meatThresholdKg)) : ''
  )
  const [savingMinMeat, setSavingMinMeat] = useState(false)

  const handleSaveMinMeat = async () => {
    setSavingMinMeat(true)
    try {
      const res = await fetch(`/api/restaurant/ayc-combos/${combo.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sizes: combo.sizes.map(s => ({
            sizeName: s.sizeName,
            basePrice: s.basePrice,
            meatThresholdKg: s.id === smallSize?.id
              ? (minMeatKg !== '' ? parseFloat(minMeatKg) : null)
              : s.meatThresholdKg,
          })),
        }),
      })
      if (res.ok) toast.push('Minimum meat threshold saved')
      else toast.error('Failed to save threshold')
    } finally {
      setSavingMinMeat(false)
    }
  }

  const handleComboConfirm = (data: AYLIComboData) => {
    setCapturedLines(data)
    setShowModal(false)
    setWizardStep('prices')
  }


  const handleGenerate = async () => {
    if (!capturedLines) return
    const price = parseFloat(targetPrice)
    if (!price || price <= 0) { toast.error('Enter a target selling price'); return }
    setComputing(true)
    try {
      const simulationLines = capturedLines.lines.map(l => {
        const comboItem = combo.items.find(ci => ci.poolItemId === l.poolItemId)
        return {
          comboItemId: comboItem?.id ?? l.poolItemId,
          poolItemId: l.poolItemId,
          name: l.productName,
          emoji: l.emoji,
          weightKg: l.weightKg,
          itemCategory: comboItem?.pool_item.itemCategory ?? 'OTHER',
          buyingPricePerKg: comboItem?.pool_item.buyingPricePerKg ?? null,
        }
      })
      const res = await fetch('/api/restaurant/ayli-pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          comboId: combo.id,
          businessId: (combo as any).businessId,
          simulationLines,
          targetPrice: price,
          multipliers: {
            small: 1,
            medium: parseFloat(sizeMultipliers.medium) || 2,
            large: parseFloat(sizeMultipliers.large) || 3,
          },
        }),
      })
      if (!res.ok) { toast.error('Failed to generate options'); return }
      const record = await res.json()
      setGeneratedOptions(record.generatedOptions as AyliPricingOption[])
      setSimLines(simulationLines)
      setSelectedOptIndex(null)
      setCalibrationId(record.id)
      setLoadedFromHistory(false)
      setWizardStep('options')
    } finally { setComputing(false) }
  }

  const handleRecalibrate = async () => {
    if (!calibrationId) return
    setRecalibrating(true)
    try {
      const res = await fetch('/api/restaurant/ayli-pricing/recalibrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ calibrationId, targetPrice: targetPrice ? parseFloat(targetPrice) : undefined }),
      })
      if (!res.ok) { toast.error('Failed to recalibrate'); return }
      const record = await res.json()
      setGeneratedOptions(record.generatedOptions as AyliPricingOption[])
      if (record.simulationLines?.length) setSimLines(record.simulationLines)
      setSelectedOptIndex(null)
      setPreviousOptIndex(null)
      toast.push('Recalibrated — select an option to apply')
    } finally { setRecalibrating(false) }
  }

  const handleApply = async () => {
    if (!calibrationId || selectedOptIndex == null) {
      toast.error('Select an option before applying')
      return
    }
    setApplying(true)
    try {
      const res = await fetch('/api/restaurant/ayli-pricing/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ calibrationId, selectedOptions: { optionIndex: selectedOptIndex } }),
      })
      if (res.ok) {
        toast.push('Pricing applied!')
        const histRes = await fetch(`/api/restaurant/ayli-pricing?comboId=${combo.id}`)
        if (histRes.ok) {
          const all: Calibration[] = await histRes.json()
          const saved = all.find(c => c.id === calibrationId)
          if (saved) onCalibrationSaved(saved)
        }
        // Reset wizard and switch parent to Adjust tab so user sees the new prices
        setWizardStep('build')
        setCapturedLines(null)
        onApplied()
        setGeneratedOptions(null)
        setSelectedOptIndex(null)
        setCalibrationId(null)
      } else toast.error('Failed to apply')
    } finally { setApplying(false) }
  }

  return (
    <div className="space-y-4">
      {/* Step indicator */}
      <div className="flex items-center gap-2 text-xs">
        {(['build', 'prices', 'options'] as const).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center font-semibold ${wizardStep === s ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-secondary'}`}>{i + 1}</span>
            <span className={wizardStep === s ? 'font-medium text-primary' : 'text-secondary'}>
              {s === 'build' ? 'Build Combo' : s === 'prices' ? 'Target Prices' : 'Review Options'}
            </span>
            {i < 2 && <span className="text-gray-300 dark:text-gray-600">→</span>}
          </div>
        ))}
      </div>

      {/* Step 1: Build — show previous calibrations first, then new-build option */}
      {wizardStep === 'build' && (
        <div className="space-y-4">

          {/* Previous calibrations */}
          {calibrations.length > 0 && (
            <div className="card overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-sm font-semibold text-primary">Previous Calibrations</h3>
                <p className="text-xs text-secondary mt-0.5">Load a previous calibration to review and adjust its options, or start a new build below.</p>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {calibrations.map(cal => {
                  const tp = cal.targetPrices as Record<string, number>
                  const sel = cal.selectedOptions as Record<string, number>
                  const hasOptions = Object.keys(cal.generatedOptions ?? {}).length > 0
                  return (
                    <div key={cal.id} className="px-4 py-3 flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-primary">v{cal.version}</span>
                          <span className="text-xs text-secondary">{new Date(cal.createdAt).toLocaleDateString()} {new Date(cal.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${cal.status === 'APPLIED' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-700 text-secondary'}`}>
                            {cal.status}
                          </span>
                        </div>
                        {Object.keys(tp).length > 0 && (
                          <div className="mt-1 flex gap-3 text-xs text-secondary">
                            {SIZE_LABELS.filter(s => tp[s]).map(s => (
                              <span key={s} className="capitalize">
                                {s}: <span className="font-medium text-primary">${tp[s]}</span>
                                {sel[s] != null ? <span className="ml-1 text-blue-500">opt {(sel[s] as number) + 1}</span> : null}
                              </span>
                            ))}
                          </div>
                        )}
                        {(cal.simulationLines as any[]).length > 0 && (
                          <div className="mt-1 text-xs text-secondary">
                            {(cal.simulationLines as any[]).length} items · {(cal.simulationLines as any[]).reduce((s: number, l: any) => s + l.weightKg, 0).toFixed(3)} kg
                          </div>
                        )}
                      </div>
                      {hasOptions && (
                        <button
                          onClick={() => {
                            setGeneratedOptions(normaliseGeneratedOptions(cal.generatedOptions))
                            setTargetPrice(tp.target ? String(tp.target) : '')
                            setSimLines((cal.simulationLines as any[]) ?? [])
                            const prevIdx = (sel as any).optionIndex ?? (sel as any).small ?? null
                            setPreviousOptIndex(typeof prevIdx === 'number' ? prevIdx : null)
                            setSelectedOptIndex(null)
                            setCalibrationId(cal.id)
                            setLoadedFromHistory(true)
                            setWizardStep('options')
                          }}
                          className="btn-secondary text-xs py-1 px-3 flex-shrink-0">
                          Load &amp; Review
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* New build */}
          <div className="card p-5 text-center space-y-4">
            <div className="text-4xl">⚖️</div>
            <div>
              <h3 className="font-semibold text-primary mb-1">
                {calibrations.length > 0 ? 'Start a New Calibration Build' : 'Build a Small Portion on the Scale'}
              </h3>
              <p className="text-sm text-secondary">Fill the container as a <strong>small-size customer would</strong>. Medium and large pricing is extrapolated from this using size multipliers below.</p>
            </div>
            {/* Size multipliers */}
            <div className="text-left bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg px-4 py-3 space-y-2">
              <p className="text-xs font-semibold text-secondary">Container size ratios (relative to small)</p>
              <div className="flex items-center gap-4">
                <span className="text-xs text-secondary w-10">Small</span>
                <span className="text-xs font-medium text-primary">1×</span>
                <span className="text-xs text-secondary ml-2">(reference — build this size)</span>
              </div>
              {(['medium', 'large'] as const).map(sz => (
                <div key={sz} className="flex items-center gap-4">
                  <label className="text-xs text-secondary capitalize w-10">{sz}</label>
                  <input type="number" step="0.1" min="1.1" max="10" value={sizeMultipliers[sz]}
                    onChange={e => setSizeMultipliers(m => ({ ...m, [sz]: e.target.value }))}
                    className="w-16 px-2 py-1 text-sm border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                  <span className="text-xs text-secondary">× small capacity</span>
                </div>
              ))}
            </div>
            <button className="btn-primary" onClick={() => setShowModal(true)}>
              Start Calibration Build
            </button>
            {capturedLines && (
              <div className="text-left border border-gray-200 dark:border-gray-600 rounded-lg p-3">
                <p className="text-xs font-semibold text-secondary mb-2">Last build ({capturedLines.lines.length} items, {capturedLines.lines.reduce((s, l) => s + l.weightKg, 0).toFixed(3)} kg total):</p>
                {capturedLines.lines.map(l => (
                  <div key={l.poolItemId} className="flex justify-between text-xs text-primary py-0.5">
                    <span>{l.emoji} {l.productName}</span><span>{l.weightKg.toFixed(3)} kg</span>
                  </div>
                ))}
                <button className="btn-primary text-xs mt-3" onClick={() => setWizardStep('prices')}>Use This Build →</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 2: Single target price */}
      {wizardStep === 'prices' && capturedLines && (
        <div className="card p-5 space-y-4">
          <div>
            <h3 className="font-semibold text-primary mb-1">Set Target Selling Price</h3>
            <p className="text-xs text-secondary mb-2">
              Simulation: {capturedLines.lines.reduce((s, l) => s + l.weightKg, 0).toFixed(3)} kg · {capturedLines.lines.length} items
            </p>
            <p className="text-xs bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg px-3 py-2 text-blue-800 dark:text-blue-300">
              Enter what this combo should sell for. The system will generate 5 options — each with a different base price structure. <strong>Larger sizes automatically get a higher base and lower per-kg rate</strong>, rewarding customers who go bigger.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-secondary flex-shrink-0">Target price</label>
            <div className="relative w-40">
              <span className="absolute left-2 top-2 text-secondary text-sm">$</span>
              <input type="number" step="0.01" min="0" value={targetPrice}
                onChange={e => setTargetPrice(e.target.value)}
                className="w-full pl-6 pr-2 py-1.5 text-sm border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="e.g. 4.50" autoFocus />
            </div>
            <span className="text-xs text-secondary">for {capturedLines.lines.reduce((s, l) => s + l.weightKg, 0).toFixed(3)} kg</span>
          </div>
          <div className="flex gap-3 pt-1">
            <button className="btn-secondary" onClick={() => setWizardStep('build')}>← Back</button>
            <button className="btn-primary" onClick={handleGenerate} disabled={computing}>
              {computing ? 'Generating…' : 'Generate Pricing Options →'}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Review 5 unified options (each covers all 3 sizes) */}
      {wizardStep === 'options' && generatedOptions && Array.isArray(generatedOptions) && (
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-primary mb-1">Select a Pricing Option</h3>
            <p className="text-xs text-secondary">Each option sets a different base price level. Higher base = lower per-kg for customers who fill more. Pick the one that suits your business.</p>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {(generatedOptions as AyliPricingOption[]).map((opt, idx) => {
              const isSelected = selectedOptIndex === idx
              const sizes: Array<{ label: string; base: number; items: Record<string, number> }> = [
                { label: 'Small', base: opt.basePriceSmall, items: opt.itemPricesSmall },
                { label: 'Medium', base: opt.basePriceMedium, items: opt.itemPricesMedium },
                { label: 'Large', base: opt.basePriceLarge, items: opt.itemPricesLarge },
              ]
              return (
                <button key={idx} type="button" onClick={() => setSelectedOptIndex(idx)}
                  className={`rounded-xl border-2 p-2.5 text-left transition-colors ${isSelected ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'}`}>
                  <div className="text-xs font-semibold text-secondary mb-2">Option {idx + 1}</div>
                  {sizes.map(sz => {
                    const totalWt = simLines.length > 0
                      ? simLines.reduce((s: number, l: any) => s + Number(l.weightKg), 0)
                      : (capturedLines?.lines.reduce((s, l) => s + l.weightKg, 0) ?? 1)
                    const avgPerKg = Object.values(sz.items).length && totalWt > 0
                      ? Object.entries(sz.items).reduce((s, [cid, p]) => {
                          const wt = simLines.find((l: any) => l.comboItemId === cid)?.weightKg
                            ?? capturedLines?.lines.find(l => combo.items.find(ci => ci.id === cid && ci.poolItemId === l.poolItemId))?.weightKg
                            ?? 0
                          return s + (p as number) * Number(wt)
                        }, 0) / totalWt
                      : 0
                    return (
                      <div key={sz.label} className="mb-1.5">
                        <div className="text-[10px] font-semibold text-secondary uppercase">{sz.label}</div>
                        <div className="text-xs font-bold text-primary">Base ${sz.base.toFixed(2)}</div>
                        <div className="text-[10px] text-secondary">${avgPerKg.toFixed(2)}/kg avg</div>
                      </div>
                    )
                  })}
                  <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
                    {opt.estimatedMarginPct != null && opt.estimatedMarginPct > 0
                      ? <div className="text-[10px] text-green-600 dark:text-green-400">{opt.estimatedMarginPct}% margin</div>
                      : <div className="text-[10px] text-secondary italic">Set buying prices for margin</div>
                    }
                  </div>
                  {isSelected && <div className="mt-1.5 text-[10px] font-bold text-blue-600 dark:text-blue-400 text-center">✓ SELECTED</div>}
                  {!isSelected && previousOptIndex === idx && <div className="mt-1.5 text-[10px] text-amber-600 dark:text-amber-400 text-center">↩ last applied</div>}
                </button>
              )
            })}
          </div>
          {/* Simulation weights breakdown */}
          {simLines.length > 0 && (
            <details className="text-xs border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <summary className="px-3 py-2 cursor-pointer bg-gray-50 dark:bg-gray-800 font-medium text-secondary select-none">
                Combo weights used in calibration (small size)
              </summary>
              <div className="px-3 py-2 space-y-1">
                {(() => {
                  // Build a current-category map from combo items (overrides stale stored values)
                  const categoryMap: Record<string, string> = {}
                  for (const ci of combo.items) categoryMap[ci.poolItemId] = ci.pool_item.itemCategory
                  const firstMeatPoolItemId = combo.items.find(ci => ci.pool_item.itemCategory === 'MEAT')?.poolItemId
                  return simLines.map((l, i) => {
                    const category = categoryMap[l.poolItemId] ?? l.itemCategory ?? 'OTHER'
                    const isFirstMeat = l.poolItemId === firstMeatPoolItemId
                    return (
                      <div key={i} className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span>{l.emoji}</span>
                          <span className="truncate text-primary">{l.name}</span>
                          <span className="text-[10px] px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-secondary capitalize flex-shrink-0">
                            {category.toLowerCase()}
                          </span>
                          {isFirstMeat && (
                            <span className="text-[10px] px-1 py-0.5 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 font-medium flex-shrink-0">
                              ★ first meat
                            </span>
                          )}
                        </div>
                        <span className="font-mono text-primary flex-shrink-0">{Number(l.weightKg).toFixed(3)} kg</span>
                      </div>
                    )
                  })
                })()}
                {(() => {
                  const categoryMap: Record<string, string> = {}
                  for (const ci of combo.items) categoryMap[ci.poolItemId] = ci.pool_item.itemCategory
                  const calibMeatKg = simLines.filter(l => (categoryMap[l.poolItemId] ?? l.itemCategory) === 'MEAT').reduce((s: number, l: any) => s + Number(l.weightKg), 0)
                  const totalKg = simLines.reduce((s: number, l: any) => s + Number(l.weightKg), 0)
                  return (
                    <>
                      <div className="border-t border-gray-200 dark:border-gray-700 pt-1 mt-1 flex justify-between font-medium">
                        <span className="text-secondary">
                          Meat: {calibMeatKg.toFixed(3)} kg
                        </span>
                        <span className="text-primary">
                          Total: {totalKg.toFixed(3)} kg
                        </span>
                      </div>
                      <div className="border-t border-gray-200 dark:border-gray-700 pt-2 mt-1 flex items-center gap-2 flex-wrap">
                        <span className="text-secondary flex-1 whitespace-nowrap">Min. meat (small):</span>
                        <div className="flex items-center gap-1.5">
                          {calibMeatKg > 0 && (
                            <button type="button"
                              onClick={() => setMinMeatKg(calibMeatKg.toFixed(3))}
                              className="text-[10px] text-blue-500 hover:underline whitespace-nowrap">
                              Use {calibMeatKg.toFixed(3)} kg
                            </button>
                          )}
                          <input
                            type="number" step="0.001" min="0"
                            value={minMeatKg}
                            onChange={e => setMinMeatKg(e.target.value)}
                            placeholder="0.000"
                            className="w-24 text-sm font-mono border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                          />
                          <span className="text-secondary">kg</span>
                          <button onClick={handleSaveMinMeat} disabled={savingMinMeat}
                            className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-40">
                            {savingMinMeat ? '…' : 'Save'}
                          </button>
                        </div>
                      </div>
                    </>
                  )
                })()}
              </div>
            </details>
          )}

          <div className="flex items-center justify-between pt-2">
            <div className="flex gap-3">
              {!loadedFromHistory && (
                <button className="btn-secondary" onClick={() => setWizardStep('prices')}>← Back</button>
              )}
              {loadedFromHistory && calibrationId && (
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <label className="text-xs text-secondary whitespace-nowrap">Target (small):</label>
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-secondary pointer-events-none">$</span>
                      <input
                        type="number" step="0.01" min="0"
                        value={targetPrice}
                        onChange={e => setTargetPrice(e.target.value)}
                        placeholder="e.g. 5.00"
                        className="w-24 pl-5 pr-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-mono"
                      />
                    </div>
                  </div>
                  <button className="btn-secondary flex items-center gap-1.5"
                    onClick={handleRecalibrate} disabled={recalibrating || !targetPrice}>
                    {recalibrating ? 'Recalibrating…' : '🔄 Recalibrate with current costs'}
                  </button>
                </div>
              )}
            </div>
            <button className="btn-primary" onClick={handleApply} disabled={applying || selectedOptIndex == null}>
              {applying ? 'Applying…' : 'Apply Pricing'}
            </button>
          </div>
        </div>
      )}

      {/* AYLI combo modal for calibration build */}
      {showModal && (
        <AYLIComboModal
          combo={combo}
          onConfirm={handleComboConfirm}
          onCancel={() => setShowModal(false)}
          calibrationMode
        />
      )}
    </div>
  )
}

// ─── Tab 3: Manual Adjustment ─────────────────────────────────────────────────

function ManualAdjustTab({
  combo, calibrations, onRefresh,
}: {
  combo: AYLICombo
  calibrations: Calibration[]
  onRefresh: () => void
}) {
  const toast = useToastContext()
  const [localPrices, setLocalPrices] = useState<Record<string, { small: string; medium: string; large: string }>>({})
  const [adjustPct, setAdjustPct] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [restoring, setRestoring] = useState<string | null>(null)
  const [historyOpen, setHistoryOpen] = useState(false)

  useEffect(() => {
    const map: Record<string, { small: string; medium: string; large: string }> = {}
    for (const ci of combo.items) {
      map[ci.id] = {
        small: String(Number(ci.pricePerKgSmall).toFixed(2)),
        medium: String(Number(ci.pricePerKgMedium).toFixed(2)),
        large: String(Number(ci.pricePerKgLarge).toFixed(2)),
      }
    }
    setLocalPrices(map)
  }, [combo.items])

  const saveOverride = async (comboItemId: string) => {
    const p = localPrices[comboItemId]
    if (!p) return
    const res = await fetch('/api/restaurant/ayli-pricing/override', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ overrides: [{ comboItemId, small: parseFloat(p.small), medium: parseFloat(p.medium), large: parseFloat(p.large) }] }),
    })
    if (res.ok) { toast.push('Price updated'); onRefresh() }
    else toast.error('Failed to save')
  }

  const applyBlanket = async () => {
    const pct = parseFloat(adjustPct)
    if (!pct) { toast.error('Enter a percentage'); return }
    const ids = selectedIds.size > 0 ? Array.from(selectedIds) : undefined
    const res = await fetch('/api/restaurant/ayli-pricing/override', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comboId: combo.id, adjustmentPct: pct, comboItemIds: ids }),
    })
    if (res.ok) { toast.push(`${pct > 0 ? '+' : ''}${pct}% applied`); setAdjustPct(''); onRefresh() }
    else toast.error('Failed to apply')
  }

  const restoreCalibration = async (calibrationId: string) => {
    setRestoring(calibrationId)
    try {
      const res = await fetch('/api/restaurant/ayli-pricing/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ calibrationId }),
      })
      if (res.ok) { toast.push('Calibration restored'); onRefresh() }
      else toast.error('Failed to restore')
    } finally { setRestoring(null) }
  }

  const toggleSelect = (id: string) =>
    setSelectedIds(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })

  if (combo.items.length === 0) {
    return <p className="text-sm text-secondary">No items in this combo yet.</p>
  }

  return (
    <div className="space-y-5">
      {/* Blanket adjustment */}
      <div className="card p-4">
        <h3 className="text-sm font-semibold text-primary mb-3">Blanket Price Adjustment</h3>
        <div className="flex flex-wrap gap-2 items-center">
          {['+10', '+5', '-5', '-10'].map(p => (
            <button key={p} onClick={() => setAdjustPct(p)}
              className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${adjustPct === p ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'border-gray-200 dark:border-gray-600 text-secondary hover:border-blue-300'}`}>
              {p}%
            </button>
          ))}
          <div className="flex items-center gap-1">
            <input type="number" value={adjustPct} onChange={e => setAdjustPct(e.target.value)}
              className="w-20 px-2 py-1.5 text-xs border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="Custom %" />
            <span className="text-xs text-secondary">%</span>
          </div>
          <button onClick={applyBlanket} className="btn-primary text-xs py-1.5 px-3">
            Apply to {selectedIds.size > 0 ? `${selectedIds.size} selected` : 'All'}
          </button>
        </div>
      </div>

      {/* Per-item table */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700 grid grid-cols-[auto_1fr_1fr_1fr_1fr_auto] gap-3 text-xs font-semibold text-secondary uppercase tracking-wide">
          <span className="w-6" />
          <span>Item</span>
          <span>Small ($/kg)</span>
          <span>Medium ($/kg)</span>
          <span>Large ($/kg)</span>
          <span />
        </div>
        {combo.items.map(ci => {
          const local = localPrices[ci.id]
          if (!local) return null
          return (
            <div key={ci.id} className="px-4 py-2.5 border-b border-gray-100 dark:border-gray-700 grid grid-cols-[auto_1fr_1fr_1fr_1fr_auto] gap-3 items-center">
              <input type="checkbox" checked={selectedIds.has(ci.id)} onChange={() => toggleSelect(ci.id)} className="rounded w-4 h-4" />
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-base flex-shrink-0">{ci.pool_item.emoji || '🍽️'}</span>
                <span className="text-sm font-medium text-primary truncate">{ci.pool_item.name}</span>
              </div>
              {(['small', 'medium', 'large'] as const).map(sz => (
                <input key={sz} type="number" step="0.01" min="0" value={local[sz]}
                  onChange={e => setLocalPrices(m => ({ ...m, [ci.id]: { ...m[ci.id], [sz]: e.target.value } }))}
                  onBlur={() => saveOverride(ci.id)}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
              ))}
              <button onClick={() => saveOverride(ci.id)} className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex-shrink-0">Save</button>
            </div>
          )
        })}
      </div>

      {/* Calibration history */}
      {calibrations.length > 0 && (
        <div className="card overflow-hidden">
          <button onClick={() => setHistoryOpen(v => !v)}
            className="w-full px-4 py-3 text-sm font-semibold text-primary text-left flex items-center justify-between bg-gray-50 dark:bg-gray-700/50">
            <span>Calibration History ({calibrations.length})</span>
            <span className="text-secondary">{historyOpen ? '▲' : '▼'}</span>
          </button>
          {historyOpen && (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {calibrations.map((cal, i) => (
                <div key={cal.id} className="px-4 py-3 flex items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-semibold text-primary">v{cal.version}</span>
                    <span className="text-xs text-secondary ml-2">{new Date(cal.createdAt).toLocaleDateString()}</span>
                    <span className={`ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${cal.status === 'APPLIED' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-700 text-secondary'}`}>
                      {cal.status}
                    </span>
                    {i === 0 && cal.status === 'APPLIED' && (
                      <span className="ml-1 text-[10px] text-blue-600 dark:text-blue-400 font-semibold">← current</span>
                    )}
                  </div>
                  {cal.status === 'APPLIED' && i !== 0 && (
                    <button onClick={() => restoreCalibration(cal.id)} disabled={restoring === cal.id}
                      className="btn-secondary text-xs py-1 px-2 flex-shrink-0">
                      {restoring === cal.id ? 'Restoring…' : 'Restore'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AYLIPricingPage() {
  const { currentBusinessId } = useBusinessPermissionsContext()
  const [combos, setCombos] = useState<AYLICombo[]>([])
  const [poolItems, setPoolItems] = useState<PoolItem[]>([])
  const [calibrations, setCalibrations] = useState<Calibration[]>([])
  const [selectedComboId, setSelectedComboId] = useState<string>('')
  const [activeTab, setActiveTab] = useState<'setup' | 'calibrate' | 'adjust'>('setup')
  const [loading, setLoading] = useState(true)

  const selectedCombo = combos.find(c => c.id === selectedComboId) ?? null

  const loadCombos = useCallback(async () => {
    if (!currentBusinessId) return
    const [combosRes, poolRes] = await Promise.all([
      fetch(`/api/restaurant/ayc-combos?businessId=${currentBusinessId}`),
      fetch(`/api/restaurant/ayc-pool-items?businessId=${currentBusinessId}`),
    ])
    if (combosRes.ok) {
      const data: AYLICombo[] = await combosRes.json()
      setCombos(data)
      if (!selectedComboId && data.length > 0) setSelectedComboId(data[0].id)
    }
    if (poolRes.ok) setPoolItems(await poolRes.json())
    setLoading(false)
  }, [currentBusinessId, selectedComboId])

  const loadCalibrations = useCallback(async (comboId: string) => {
    const res = await fetch(`/api/restaurant/ayli-pricing?comboId=${comboId}`)
    if (res.ok) setCalibrations(await res.json())
  }, [])

  useEffect(() => { loadCombos() }, [currentBusinessId])
  useEffect(() => { if (selectedComboId) loadCalibrations(selectedComboId) }, [selectedComboId])

  const handleRefresh = () => {
    loadCombos()
    if (selectedComboId) loadCalibrations(selectedComboId)
  }

  return (
    <BusinessTypeRoute requiredBusinessType="restaurant">
      <ContentLayout
        title="💰 AYLI Pricing"
        subtitle="Calibrate and manage As-You-Like-It combo pricing"
        breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'AYLI Pricing', isActive: true }]}
      >
        {loading ? (
          <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>
        ) : combos.length === 0 ? (
          <div className="card p-8 text-center">
            <div className="text-3xl mb-3">🥗</div>
            <p className="text-secondary">No AYLI combos found. Create a combo first in AYLI Combos.</p>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Combo selector */}
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-secondary flex-shrink-0">Combo:</label>
              <SearchableSelect
                value={selectedComboId}
                onChange={setSelectedComboId}
                options={combos.map(c => ({ value: c.id, label: c.name }))}
                placeholder="Search combo…"
                className="flex-1 max-w-xs"
              />
            </div>

            {selectedCombo && (
              <>
                {/* Tab bar */}
                <div className="flex border-b border-gray-200 dark:border-gray-700">
                  {([
                    { key: 'setup', label: '1. Pool Setup' },
                    { key: 'calibrate', label: '2. Calibrate' },
                    { key: 'adjust', label: '3. Adjust' },
                  ] as const).map(tab => (
                    <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                      className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.key ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-secondary hover:text-primary'}`}>
                      {tab.label}
                    </button>
                  ))}
                </div>

                {activeTab === 'setup' && (
                  <PoolSetupTab combo={selectedCombo} poolItems={poolItems} calibrations={calibrations} onPoolItemsChanged={handleRefresh} />
                )}
                {activeTab === 'calibrate' && (
                  <CalibrationTab
                    combo={selectedCombo}
                    calibrations={calibrations}
                    onCalibrationSaved={() => loadCalibrations(selectedComboId)}
                    onApplied={() => { handleRefresh(); setActiveTab('adjust') }}
                  />
                )}
                {activeTab === 'adjust' && (
                  <ManualAdjustTab combo={selectedCombo} calibrations={calibrations} onRefresh={handleRefresh} />
                )}
              </>
            )}
          </div>
        )}
      </ContentLayout>
    </BusinessTypeRoute>
  )
}
