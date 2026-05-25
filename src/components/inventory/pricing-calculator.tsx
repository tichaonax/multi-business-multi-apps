'use client'

import { useMemo } from 'react'

export interface PricingCalculatorProps {
  costPrice: number | null
  sellingPrice: string
  onSelectPrice: (price: number) => void
  transportEnabled: boolean
  transportDistanceKm: number | null
  transportCostPerKm: number | null
  batchQuantity?: number
}

const MARKUP_TIERS = [10, 15, 20, 25, 30, 40, 50]

export function PricingCalculator({
  costPrice,
  sellingPrice,
  onSelectPrice,
  transportEnabled,
  transportDistanceKm,
  transportCostPerKm,
  batchQuantity = 1,
}: PricingCalculatorProps) {
  const calc = useMemo(() => {
    if (!costPrice || costPrice <= 0) return null

    const km = transportEnabled && transportDistanceKm && transportDistanceKm > 0 ? transportDistanceKm : 0
    const rate = transportEnabled && transportCostPerKm && transportCostPerKm > 0 ? transportCostPerKm : 0
    const qty = batchQuantity > 0 ? batchQuantity : 1

    const tripCost = km * 2 * rate
    const transportPerUnit = tripCost / qty
    const landedCost = costPrice + transportPerUnit

    const currentPrice = parseFloat(sellingPrice) || 0
    const belowLanded = currentPrice > 0 && currentPrice < landedCost
    const belowCost = currentPrice > 0 && currentPrice < costPrice

    return {
      costPrice,
      transportPerUnit,
      landedCost,
      currentPrice,
      belowLanded,
      belowCost,
      suggestions: MARKUP_TIERS.map((pct) => ({
        pct,
        price: Math.ceil(landedCost * (1 + pct / 100) * 100) / 100,
      })),
    }
  }, [costPrice, sellingPrice, transportEnabled, transportDistanceKm, transportCostPerKm, batchQuantity])

  if (!calc) return null

  return (
    <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-sm">
      <div className="flex items-center gap-1.5 mb-2">
        <span className="text-sm">💡</span>
        <span className="text-xs font-semibold text-blue-800 dark:text-blue-300 uppercase tracking-wide">Pricing Calculator</span>
      </div>

      {/* Cost breakdown */}
      <div className="space-y-1 mb-3">
        <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
          <span>Cost price</span>
          <span>${calc.costPrice.toFixed(2)}</span>
        </div>
        {transportEnabled && calc.transportPerUnit > 0 && (
          <div className="flex justify-between text-xs text-orange-700 dark:text-orange-400">
            <span>Transport / unit</span>
            <span>+${calc.transportPerUnit.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between text-xs font-semibold text-gray-900 dark:text-gray-100 border-t border-blue-200 dark:border-blue-700 pt-1">
          <span>Landed cost</span>
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

      {/* Markup buttons */}
      <div className="flex flex-wrap gap-1.5">
        {calc.suggestions.map(({ pct, price }) => (
          <button
            key={pct}
            type="button"
            onClick={() => onSelectPrice(price)}
            className="px-2 py-1 text-xs rounded bg-blue-100 dark:bg-blue-800/50 text-blue-800 dark:text-blue-200 hover:bg-blue-200 dark:hover:bg-blue-700 border border-blue-300 dark:border-blue-600 transition-colors"
          >
            {pct}% · ${price.toFixed(2)}
          </button>
        ))}
      </div>
      {transportEnabled && calc.transportPerUnit > 0 && batchQuantity > 1 && (
        <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">
          Transport spread across {batchQuantity} units
        </p>
      )}
    </div>
  )
}
