'use client'

import { useState, useMemo } from 'react'
import { AYLIPricingTable, type TablePrices } from '@/components/pos/AYLIPricingTable'
import { type SimulationLine, type SizeMultipliers } from '@/lib/ayli-pricing-calculator'
import { useToastContext } from '@/components/ui/toast'

interface PoolItem {
  id: string; name: string; emoji: string; isActive: boolean
  buyingPricePerKg: number | null; itemCategory: string
}

interface ComboItem {
  id: string; poolItemId: string
  pricePerKgSmall: number; pricePerKgMedium: number; pricePerKgLarge: number
  pool_item: PoolItem
}

interface AYLICombo {
  id: string; name: string
  sizes: Array<{ id: string; sizeName: string; basePrice: number; sortOrder: number }>
  items: ComboItem[]
}

interface StoredSimLine {
  comboItemId: string; poolItemId: string
  name: string; emoji: string; weightKg: number
  itemCategory: string; buyingPricePerKg: number | null
}

export interface AppliedCalibration {
  id: string; version: number; status: string
  simulationLines: StoredSimLine[]
  targetPrices: { target?: number; multipliers?: { medium?: number; large?: number } }
}

interface Props {
  combo: AYLICombo
  newPoolItemIds: string[]
  lastCalibration: AppliedCalibration
  businessId: string
  onApplied: () => void
  onSkip: () => void
}

export function AYLIPricingNewItemModal({ combo, newPoolItemIds, lastCalibration, businessId, onApplied, onSkip }: Props) {
  const toast = useToastContext()

  const newComboItems = combo.items.filter(ci => newPoolItemIds.includes(ci.poolItemId))

  const [newWeights, setNewWeights] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    for (const ci of newComboItems) init[ci.id] = ''
    return init
  })

  const [targetPrice, setTargetPrice] = useState(
    String(lastCalibration.targetPrices?.target ?? '')
  )
  const [customPrices, setCustomPrices] = useState<TablePrices | null>(null)
  const [applying, setApplying] = useState(false)

  const multipliers: SizeMultipliers = {
    small: 1,
    medium: lastCalibration.targetPrices?.multipliers?.medium ?? 2,
    large:  lastCalibration.targetPrices?.multipliers?.large  ?? 3,
  }

  const simLines: SimulationLine[] = useMemo(() => {
    const existing: SimulationLine[] = lastCalibration.simulationLines.map(l => ({
      comboItemId:      l.comboItemId,
      poolItemId:       l.poolItemId,
      name:             l.name,
      emoji:            l.emoji,
      weightKg:         Number(l.weightKg),
      itemCategory:     l.itemCategory,
      buyingPricePerKg: l.buyingPricePerKg,
    }))

    const newLines: SimulationLine[] = newComboItems.map(ci => ({
      comboItemId:      ci.id,
      poolItemId:       ci.poolItemId,
      name:             ci.pool_item.name,
      emoji:            ci.pool_item.emoji,
      weightKg:         parseFloat(newWeights[ci.id] || '0') || 0,
      itemCategory:     ci.pool_item.itemCategory,
      buyingPricePerKg: ci.pool_item.buyingPricePerKg,
    }))

    return [...existing, ...newLines]
  }, [lastCalibration.simulationLines, newComboItems, newWeights])

  const allWeightsEntered = newComboItems.every(ci => parseFloat(newWeights[ci.id] || '0') > 0)
  const price = parseFloat(targetPrice) || 0

  async function handleApply() {
    if (!customPrices || !allWeightsEntered) { toast.error('Enter all weights to calculate prices'); return }
    if (!price || price <= 0) { toast.error('Enter a valid target price'); return }
    setApplying(true)
    try {
      const res = await fetch('/api/restaurant/ayli-pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comboId: combo.id, businessId, simulationLines: simLines, targetPrice: price, multipliers }),
      })
      if (!res.ok) { toast.error('Failed to save calibration'); return }
      const record = await res.json()

      const applyRes = await fetch('/api/restaurant/ayli-pricing/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ calibrationId: record.id, selectedOptions: { optionIndex: 0 }, customPrices }),
      })
      if (!applyRes.ok) { toast.error('Failed to apply pricing'); return }
      toast.push('Pricing updated!')
      onApplied()
    } finally { setApplying(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center overflow-y-auto py-8 px-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl">
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h3 className="font-semibold text-primary">Update Pricing — New Item Added</h3>
            <p className="text-xs text-secondary mt-0.5">
              {newComboItems.length === 1
                ? `"${newComboItems[0].pool_item.name}" was added to "${combo.name}".`
                : `${newComboItems.length} new items were added to "${combo.name}".`
              }
              {' '}Enter {newComboItems.length === 1 ? 'its' : 'their'} portion weight{newComboItems.length !== 1 ? 's' : ''} to recalculate pricing.
            </p>
          </div>
          <button type="button" onClick={onSkip} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <div className="p-5 space-y-5">
          {/* Existing composition */}
          <div>
            <p className="text-xs font-semibold text-secondary uppercase tracking-wide mb-2">
              Current Composition (v{lastCalibration.version} calibration)
            </p>
            <div className="bg-gray-50 dark:bg-gray-700/40 border border-gray-200 dark:border-gray-600 rounded-lg p-3 space-y-1">
              {lastCalibration.simulationLines.map(l => (
                <div key={l.comboItemId} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className="text-base">{l.emoji}</span>
                    <span className="text-primary">{l.name}</span>
                  </span>
                  <span className="text-secondary font-mono text-xs">{Number(l.weightKg).toFixed(3)} kg</span>
                </div>
              ))}
            </div>
          </div>

          {/* New item weight inputs */}
          <div>
            <p className="text-xs font-semibold text-secondary uppercase tracking-wide mb-2">
              New {newComboItems.length === 1 ? 'Item' : 'Items'} — Enter Portion Weight
            </p>
            <div className="space-y-2">
              {newComboItems.map((ci, i) => (
                <div key={ci.id} className="flex items-center gap-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg px-3 py-2.5">
                  <span className="text-xl flex-shrink-0">{ci.pool_item.emoji || '🍽️'}</span>
                  <span className="text-sm font-semibold text-primary flex-1">{ci.pool_item.name}</span>
                  <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/40 px-1.5 py-0.5 rounded-full flex-shrink-0">NEW</span>
                  <div className="flex items-center gap-1.5">
                    <input type="number" step="0.001" min="0"
                      value={newWeights[ci.id]}
                      onChange={e => setNewWeights(w => ({ ...w, [ci.id]: e.target.value }))}
                      placeholder="0.000"
                      autoFocus={i === 0}
                      className="w-24 text-sm font-mono border border-blue-300 dark:border-blue-600 rounded px-2 py-1.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <span className="text-xs text-secondary">kg</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Target price */}
          <div className="flex items-center gap-3 flex-wrap">
            <label className="text-sm font-medium text-secondary flex-shrink-0">Target price (small):</label>
            <div className="relative">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-secondary pointer-events-none">$</span>
              <input type="number" step="0.01" min="0" value={targetPrice}
                onChange={e => setTargetPrice(e.target.value)}
                className="w-28 pl-5 pr-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-mono"
              />
            </div>
            <span className="text-xs text-secondary italic">(from last calibration)</span>
          </div>

          {/* Pricing table */}
          {allWeightsEntered && price > 0 ? (
            <div>
              <p className="text-xs font-semibold text-secondary uppercase tracking-wide mb-2">
                Calculated Pricing — All Cells Editable
              </p>
              <AYLIPricingTable
                simLines={simLines}
                targetPrice={price}
                multipliers={multipliers}
                defaultOptionIndex={0}
                onChange={setCustomPrices}
              />
            </div>
          ) : (
            <div className="border border-dashed border-gray-300 dark:border-gray-600 rounded-lg py-8 text-center text-sm text-secondary">
              {!allWeightsEntered
                ? `Enter ${newComboItems.length === 1 ? 'a' : 'all'} portion weight${newComboItems.length !== 1 ? 's' : ''} above to see pricing`
                : 'Enter a valid target price to see pricing'
              }
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-5 pb-5 border-t border-gray-100 dark:border-gray-700 pt-4">
          <button type="button" onClick={onSkip} className="btn-secondary">Skip for Now</button>
          <button type="button" onClick={handleApply}
            disabled={applying || !allWeightsEntered || !customPrices || !price}
            className="btn-primary">
            {applying ? 'Applying…' : 'Apply These Prices'}
          </button>
        </div>
      </div>
    </div>
  )
}
