'use client'

import { useMemo, useState } from 'react'
import { DEFAULT_PRICING_EXCEPTION_CONFIG } from '@/lib/inventory/pricing-math'

export interface PricingCalculatorProps {
  costPrice: number | null
  sellingPrice: string
  onSelectPrice: (price: number) => void
  transportEnabled: boolean
  transportDistanceKm: number | null
  transportCostPerKm: number | null
  batchQuantity?: number
  /** Direct per-unit transport override — skips km×rate calculation (used by warehouse move wizard) */
  transportPerUnitOverride?: number | null
  /** Called when the user clicks the close button — omit to hide the button */
  onClose?: () => void
  /**
   * MBM-297 — when the caller supports bulk/case cost entry (Bulk Stocking,
   * Stock Take), pass the row's current pack size so the calculator can
   * restore it, and a callback so it can push corrected values back. Omit
   * both to keep this calculator's older, unit-cost-only behavior exactly
   * as it was for callers that don't have this concept (e.g. the warehouse
   * move wizard, whose cost is already a known per-unit cost).
   */
  initialUnitsPerPack?: number | null
  onBulkInfoChange?: (info: { unitsPerPack: number | null; bulkPackCost: number | null; effectiveCostPrice: number | null }) => void
}

const MARKUP_TIERS = [10, 15, 20, 25, 30, 40, 50, 60, 70, 80, 90, 100]

// Always round up to the nearest $0.50 (covers both $0.50 and $1.00 increments)
function roundUpToNearest50c(price: number): number {
  return Math.ceil(price / 0.5) * 0.5
}

export function PricingCalculator({
  costPrice,
  sellingPrice,
  onSelectPrice,
  transportEnabled,
  transportDistanceKm,
  transportCostPerKm,
  batchQuantity = 1,
  transportPerUnitOverride,
  onClose,
  initialUnitsPerPack,
  onBulkInfoChange,
}: PricingCalculatorProps) {
  const [customPct, setCustomPct] = useState('')
  const [showCustom, setShowCustom] = useState(false)
  const [bulkQtyInput, setBulkQtyInput] = useState(initialUnitsPerPack ? String(initialUnitsPerPack) : '')

  const bulkQty = parseInt(bulkQtyInput, 10)
  const hasBulkQty = Number.isFinite(bulkQty) && bulkQty > 0
  // When a bulk quantity is set, `costPrice` is the cost of the whole
  // box/case (as entered) — the real per-unit cost used for every
  // calculation below is always the computed division, never the raw
  // entered figure. With no bulk quantity, behavior is unchanged from
  // before this existed: `costPrice` is already a per-unit cost.
  const effectiveCostPrice = hasBulkQty && costPrice ? costPrice / bulkQty : costPrice

  // Deliberately NOT pushed live on every keystroke: `costPrice` is a prop
  // fed straight from the row's own Cost field, so writing the divided
  // value back into that same field while the calculator is still open
  // would feed the corrected value back in as next render's "box cost" and
  // divide it again on every change. The bulk info + corrected cost is
  // only ever committed once, at the moment the user actually picks a
  // price below — see `selectPrice`.
  function selectPrice(price: number) {
    if (onBulkInfoChange) {
      onBulkInfoChange({
        unitsPerPack: hasBulkQty ? bulkQty : null,
        bulkPackCost: hasBulkQty ? costPrice : null,
        effectiveCostPrice: hasBulkQty && effectiveCostPrice != null ? Math.round(effectiveCostPrice * 100) / 100 : null,
      })
    }
    onSelectPrice(price)
  }

  const calc = useMemo(() => {
    if (!effectiveCostPrice || effectiveCostPrice <= 0) return null

    let transportPerUnit: number
    if (transportPerUnitOverride != null && transportPerUnitOverride > 0) {
      transportPerUnit = transportPerUnitOverride
    } else {
      const km = transportEnabled && transportDistanceKm && transportDistanceKm > 0 ? transportDistanceKm : 0
      const rate = transportEnabled && transportCostPerKm && transportCostPerKm > 0 ? transportCostPerKm : 0
      const qty = batchQuantity > 0 ? batchQuantity : 1
      const tripCost = km * 2 * rate
      transportPerUnit = tripCost / qty
    }
    const landedCost = effectiveCostPrice + transportPerUnit

    const currentPrice = parseFloat(sellingPrice) || 0
    const belowLanded = currentPrice > 0 && currentPrice < landedCost
    const belowCost = currentPrice > 0 && currentPrice < effectiveCostPrice
    const currentMarginPct = currentPrice > 0 ? ((currentPrice - landedCost) / currentPrice) * 100 : null
    const marginTooLow = currentMarginPct !== null && currentMarginPct < DEFAULT_PRICING_EXCEPTION_CONFIG.minimumMarginPct
    const marginTooHigh = currentMarginPct !== null && currentMarginPct > DEFAULT_PRICING_EXCEPTION_CONFIG.maximumMarginPct

    return {
      costPrice: effectiveCostPrice,
      transportPerUnit,
      landedCost,
      currentPrice,
      belowLanded,
      belowCost,
      currentMarginPct,
      marginTooLow,
      marginTooHigh,
      suggestions: MARKUP_TIERS.map((pct) => ({
        pct,
        price: roundUpToNearest50c(landedCost * (1 + pct / 100)),
      })),
    }
  }, [effectiveCostPrice, sellingPrice, transportEnabled, transportDistanceKm, transportCostPerKm, batchQuantity, transportPerUnitOverride])

  if (!calc) return null

  function applyCustom() {
    const pct = parseFloat(customPct)
    if (!pct || pct <= 0 || !calc) return
    const price = roundUpToNearest50c(calc.landedCost * (1 + pct / 100))
    selectPrice(price)
    setShowCustom(false)
    setCustomPct('')
  }

  return (
    <div className="mt-2 p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg text-sm">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <span className="text-sm">💡</span>
          <span className="text-xs font-semibold text-blue-800 dark:text-blue-300 uppercase tracking-wide">Pricing Calculator</span>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="text-blue-400 hover:text-blue-700 dark:hover:text-blue-200 text-sm leading-none px-1"
            title="Close calculator"
          >
            ✕
          </button>
        )}
      </div>

      {/* Bulk/case cost entry — optional. Leaving this at 0 keeps the
          calculator working exactly as it did before this existed. */}
      {onBulkInfoChange && (
        <div className="flex items-center justify-between gap-2 mb-2 text-xs">
          <label className="text-gray-600 dark:text-gray-400 whitespace-nowrap">
            {hasBulkQty ? 'Cost above is for a box of' : 'Bought as a box/case? Qty per box'}
          </label>
          <input
            type="number"
            min="0"
            step="1"
            value={bulkQtyInput}
            onChange={e => setBulkQtyInput(e.target.value)}
            placeholder="0"
            className="w-16 px-1.5 py-1 text-xs border border-blue-300 dark:border-blue-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      )}

      {/* Cost breakdown */}
      <div className="space-y-1 mb-3">
        <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
          <span>{hasBulkQty ? 'Cost per box' : 'Cost price'}</span>
          <span>${(costPrice ?? 0).toFixed(2)}</span>
        </div>
        {hasBulkQty && (
          <div className="flex justify-between text-xs font-medium text-blue-700 dark:text-blue-400">
            <span>Effective unit cost ({costPrice?.toFixed(2)} ÷ {bulkQty})</span>
            <span>${calc.costPrice.toFixed(2)}</span>
          </div>
        )}
        {transportEnabled && calc.transportPerUnit > 0 && (
          <div className="flex justify-between text-xs text-orange-700 dark:text-orange-400">
            <span>Adjustments / unit</span>
            <span>+${calc.transportPerUnit.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between text-xs font-semibold text-gray-900 dark:text-gray-100 border-t border-blue-200 dark:border-blue-700 pt-1">
          <span>Landed cost (per unit)</span>
          <span>${calc.landedCost.toFixed(2)}</span>
        </div>
      </div>

      {/* Warnings */}
      {calc.belowCost && (
        <div className="mb-2 px-2 py-1 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded text-xs text-red-700 dark:text-red-300">
          ⚠ Selling price is below cost price
        </div>
      )}
      {!calc.belowCost && calc.belowLanded && (
        <div className="mb-2 px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700 rounded text-xs text-yellow-800 dark:text-yellow-300">
          ⚠ Selling price doesn&apos;t cover transport cost
        </div>
      )}
      {!calc.belowCost && calc.marginTooLow && (
        <div className="mb-2 px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700 rounded text-xs text-yellow-800 dark:text-yellow-300">
          ⚠ Margin ({calc.currentMarginPct!.toFixed(1)}%) is below the {DEFAULT_PRICING_EXCEPTION_CONFIG.minimumMarginPct}% policy minimum — will show as a pricing exception
        </div>
      )}
      {calc.marginTooHigh && (
        <div className="mb-2 px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700 rounded text-xs text-yellow-800 dark:text-yellow-300">
          ⚠ Margin ({calc.currentMarginPct!.toFixed(1)}%) is above the {DEFAULT_PRICING_EXCEPTION_CONFIG.maximumMarginPct}% policy maximum — will show as a pricing exception
        </div>
      )}

      {/* Markup buttons */}
      <div className="grid grid-cols-4 gap-2">
        {calc.suggestions.map(({ pct, price }) => (
          <button
            key={pct}
            type="button"
            onClick={() => selectPrice(price)}
            className="flex flex-col items-center justify-center py-2 rounded bg-blue-100 dark:bg-blue-800/50 text-blue-800 dark:text-blue-200 hover:bg-blue-200 dark:hover:bg-blue-700 border border-blue-300 dark:border-blue-600 transition-colors"
          >
            <span className="text-xs font-semibold">{pct}%</span>
            <span className="text-xs opacity-75">${price.toFixed(2)}</span>
          </button>
        ))}

        {/* Custom pill */}
        {!showCustom ? (
          <button
            type="button"
            onClick={() => setShowCustom(true)}
            className="flex flex-col items-center justify-center py-2 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600 transition-colors"
          >
            <span className="text-xs font-semibold">Custom</span>
            <span className="text-xs opacity-60">%</span>
          </button>
        ) : (
          <div className="flex items-center gap-1">
            <input
              type="number"
              min="1"
              max="1000"
              placeholder="%"
              value={customPct}
              onChange={e => setCustomPct(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') applyCustom(); if (e.key === 'Escape') { setShowCustom(false); setCustomPct('') } }}
              autoFocus
              className="w-16 px-1.5 py-1 text-xs border border-blue-400 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={applyCustom}
              className="px-2 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              Apply
            </button>
            <button
              type="button"
              onClick={() => { setShowCustom(false); setCustomPct('') }}
              className="px-1.5 py-1 text-xs rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {transportEnabled && calc.transportPerUnit > 0 && batchQuantity > 1 && (
        <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">
          Adjustments spread across {batchQuantity} units
        </p>
      )}
    </div>
  )
}
