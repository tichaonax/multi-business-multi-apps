'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { computePricingOptions, computePricingFromBase, SimulationLine, SizeMultipliers } from '@/lib/ayli-pricing-calculator'

export interface TablePrices {
  itemPrices: Record<string, { small: number; medium: number; large: number }>
  basePrices: { small: number; medium: number; large: number }
}

interface Props {
  simLines: SimulationLine[]
  targetPrice: number
  multipliers: SizeMultipliers
  defaultOptionIndex?: number   // 0-4; which generated option seeds the table; reset when this changes
  seedBasePrices?: { small: number; medium: number; large: number }  // pre-fills base row from combo definition when optIdx === 0
  seedMinWeights?: { small: number; medium: number; large: number }  // min meat weights — drives decreasing per-kg rates across sizes
  onChange?: (prices: TablePrices) => void
  className?: string
}

type Size = 'small' | 'medium' | 'large'
const SIZES: Size[] = ['small', 'medium', 'large']

function r2(n: number) { return Math.round(n * 100) / 100 }

type CellRow = Record<Size, string>
type OverrideRow = Record<Size, boolean>

function deriveDefaults(
  simLines: SimulationLine[], targetPrice: number, multipliers: SizeMultipliers, optIdx = 0,
  seedBase?: { small: number; medium: number; large: number },
  seedMinWeights?: { small: number; medium: number; large: number },
) {
  if (simLines.length === 0 || targetPrice <= 0) return null

  // When combo base prices are provided and no advanced option is selected,
  // use them directly and scale per-kg rates so larger sizes are progressively cheaper.
  if (seedBase && optIdx === 0) {
    const result = computePricingFromBase(simLines, targetPrice, seedBase, multipliers, seedMinWeights)
    const itemCells: Record<string, CellRow> = {}
    for (const l of simLines) {
      itemCells[l.comboItemId] = {
        small:  r2(result.itemPricesSmall[l.comboItemId]  ?? 0).toFixed(2),
        medium: r2(result.itemPricesMedium[l.comboItemId] ?? 0).toFixed(2),
        large:  r2(result.itemPricesLarge[l.comboItemId]  ?? 0).toFixed(2),
      }
    }
    return {
      itemCells,
      baseCells: {
        small:  r2(seedBase.small).toFixed(2),
        medium: r2(seedBase.medium).toFixed(2),
        large:  r2(seedBase.large).toFixed(2),
      } as CellRow,
      estimatedMarginPct: result.estimatedMarginPct,
    }
  }

  const opts = computePricingOptions(simLines, targetPrice, multipliers)
  if (opts.length === 0) return null
  const opt = opts[Math.min(optIdx, opts.length - 1)]

  const itemCells: Record<string, CellRow> = {}
  for (const l of simLines) {
    itemCells[l.comboItemId] = {
      small:  r2(opt.itemPricesSmall[l.comboItemId]  ?? 0).toFixed(2),
      medium: r2(opt.itemPricesMedium[l.comboItemId] ?? 0).toFixed(2),
      large:  r2(opt.itemPricesLarge[l.comboItemId]  ?? 0).toFixed(2),
    }
  }

  return {
    itemCells,
    baseCells: {
      small:  r2(opt.basePriceSmall).toFixed(2),
      medium: r2(opt.basePriceMedium).toFixed(2),
      large:  r2(opt.basePriceLarge).toFixed(2),
    } as CellRow,
    estimatedMarginPct: opt.estimatedMarginPct,
  }
}

function buildPrices(
  simLines: SimulationLine[],
  itemCells: Record<string, CellRow>,
  baseCells: CellRow,
): TablePrices {
  const itemPrices: TablePrices['itemPrices'] = {}
  for (const l of simLines) {
    const row = itemCells[l.comboItemId]
    itemPrices[l.comboItemId] = {
      small:  parseFloat(row?.small  ?? '0') || 0,
      medium: parseFloat(row?.medium ?? '0') || 0,
      large:  parseFloat(row?.large  ?? '0') || 0,
    }
  }
  return {
    itemPrices,
    basePrices: {
      small:  parseFloat(baseCells.small)  || 0,
      medium: parseFloat(baseCells.medium) || 0,
      large:  parseFloat(baseCells.large)  || 0,
    },
  }
}

export function AYLIPricingTable({ simLines, targetPrice, multipliers, defaultOptionIndex = 0, seedBasePrices, seedMinWeights, onChange, className = '' }: Props) {
  const [itemCells,  setItemCells]  = useState<Record<string, CellRow>>({})
  const [baseCells,  setBaseCells]  = useState<CellRow>({ small: '0.00', medium: '0.00', large: '0.00' })
  const [overrides,  setOverrides]  = useState<Record<string, OverrideRow>>({})
  const [hasEdits,   setHasEdits]   = useState(false)
  const [marginPct,  setMarginPct]  = useState<number | null>(null)

  // Keep onChange in a ref so effects don't need it as a dependency
  const onChangeRef = useRef(onChange)
  useEffect(() => { onChangeRef.current = onChange }, [onChange])

  const resetToCalculated = useCallback(() => {
    const d = deriveDefaults(simLines, targetPrice, multipliers, defaultOptionIndex, seedBasePrices, seedMinWeights)
    if (!d) return
    setItemCells(d.itemCells)
    setBaseCells(d.baseCells)
    setOverrides({})
    setHasEdits(false)
    setMarginPct(d.estimatedMarginPct)
    onChangeRef.current?.(buildPrices(simLines, d.itemCells, d.baseCells))
  }, [simLines, targetPrice, multipliers, defaultOptionIndex, seedBasePrices, seedMinWeights])

  useEffect(() => { resetToCalculated() }, [resetToCalculated])

  // Notify parent when cells change (skip on reset — resetToCalculated calls onChange directly)
  const notifyRef = useRef(false)
  useEffect(() => {
    if (!notifyRef.current) { notifyRef.current = true; return }
    onChangeRef.current?.(buildPrices(simLines, itemCells, baseCells))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemCells, baseCells])

  function updateItem(comboItemId: string, size: Size, raw: string) {
    const ov: OverrideRow = { ...(overrides[comboItemId] ?? { small: false, medium: false, large: false }), [size]: true }
    const row: CellRow = { ...(itemCells[comboItemId] ?? { small: '0.00', medium: '0.00', large: '0.00' }), [size]: raw }

    // Auto-propagate Small → Med / Large unless already overridden
    if (size === 'small') {
      const v = parseFloat(raw)
      if (!isNaN(v) && v >= 0) {
        if (!ov.medium) row.medium = r2(v / multipliers.medium).toFixed(2)
        if (!ov.large)  row.large  = r2(v / multipliers.large).toFixed(2)
      }
    }

    setItemCells(c => ({ ...c, [comboItemId]: row }))
    setOverrides(o => ({ ...o, [comboItemId]: ov }))
    setHasEdits(true)
  }

  function updateBase(size: Size, raw: string) {
    const ov: OverrideRow = { ...(overrides['base'] ?? { small: false, medium: false, large: false }), [size]: true }
    const row: CellRow = { ...baseCells, [size]: raw }

    if (size === 'small') {
      const v = parseFloat(raw)
      if (!isNaN(v) && v >= 0) {
        if (!ov.medium) row.medium = r2(v / multipliers.medium).toFixed(2)
        if (!ov.large)  row.large  = r2(v / multipliers.large).toFixed(2)
      }
    }

    setBaseCells(row)
    setOverrides(o => ({ ...o, base: ov }))
    setHasEdits(true)
  }

  // Derived totals
  const totalWeight = simLines.reduce((s, l) => s + l.weightKg, 0)
  const totals = SIZES.reduce((acc, sz) => {
    const items = simLines.reduce((s, l) => {
      const p = parseFloat(itemCells[l.comboItemId]?.[sz] ?? '0') || 0
      return s + l.weightKg * p
    }, 0)
    acc[sz] = r2(items + (parseFloat(baseCells[sz]) || 0))
    return acc
  }, {} as Record<Size, number>)

  const rates = SIZES.reduce((acc, sz) => {
    acc[sz] = totalWeight > 0 ? r2(totals[sz] / totalWeight) : 0
    return acc
  }, {} as Record<Size, number>)

  if (simLines.length === 0) {
    return <p className="text-sm text-secondary">No items to price yet.</p>
  }

  const inputClass = (isOverridden: boolean) =>
    `w-full pl-5 pr-2 py-1.5 text-sm text-right border rounded-md dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors ${
      isOverridden
        ? 'border-amber-400 dark:border-amber-500 bg-amber-50 dark:bg-amber-900/20'
        : 'border-gray-300 dark:border-gray-600'
    }`

  return (
    <div className={`space-y-1.5 ${className}`}>

      {/* Column headers */}
      <div className="grid grid-cols-[1fr_6.5rem_6.5rem_6.5rem] gap-2 px-3 pb-1 text-xs font-semibold text-secondary uppercase tracking-wide">
        <span>Item</span>
        <span className="text-right">Small ($/kg)</span>
        <span className="text-right">Medium ($/kg)</span>
        <span className="text-right">Large ($/kg)</span>
      </div>

      <div className="border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden">

        {/* Item rows */}
        {simLines.map((l, i) => {
          const row = itemCells[l.comboItemId] ?? { small: '0.00', medium: '0.00', large: '0.00' }
          const ov  = overrides[l.comboItemId] ?? { small: false, medium: false, large: false }
          return (
            <div key={l.comboItemId}
              className={`grid grid-cols-[1fr_6.5rem_6.5rem_6.5rem] gap-2 items-center px-3 py-2
                ${i > 0 ? 'border-t border-gray-100 dark:border-gray-700' : ''}`}>

              <div className="flex items-center gap-2 min-w-0">
                <span className="text-base flex-shrink-0">{l.emoji || '🍽️'}</span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-primary truncate">{l.name}</p>
                  <p className="text-[10px] text-secondary">{l.weightKg.toFixed(3)} kg</p>
                </div>
              </div>

              {SIZES.map(sz => (
                <div key={sz} className="relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-secondary pointer-events-none">$</span>
                  <input type="number" step="0.01" min="0"
                    value={row[sz]}
                    onChange={e => updateItem(l.comboItemId, sz, e.target.value)}
                    className={inputClass(ov[sz])} />
                </div>
              ))}
            </div>
          )
        })}

        {/* Base price row */}
        <div className="grid grid-cols-[1fr_6.5rem_6.5rem_6.5rem] gap-2 items-center px-3 py-2
          border-t border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/30">
          <span className="text-xs font-semibold text-secondary">Base price</span>
          {SIZES.map(sz => {
            const ov = overrides['base'] ?? { small: false, medium: false, large: false }
            return (
              <div key={sz} className="relative">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-secondary pointer-events-none">$</span>
                <input type="number" step="0.01" min="0"
                  value={baseCells[sz]}
                  onChange={e => updateBase(sz, e.target.value)}
                  className={inputClass(ov[sz])} />
              </div>
            )
          })}
        </div>

        {/* Totals row */}
        <div className="grid grid-cols-[1fr_6.5rem_6.5rem_6.5rem] gap-2 items-center px-3 py-2.5
          border-t border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-primary">Total</span>
            {marginPct != null && marginPct > 0 && (
              <span className="text-[10px] text-green-600 dark:text-green-400 font-semibold">{marginPct}% est. margin</span>
            )}
          </div>
          {SIZES.map(sz => (
            <div key={sz} className="text-right">
              <p className="text-sm font-bold text-primary">${totals[sz].toFixed(2)}</p>
              <p className="text-[10px] text-secondary">${rates[sz].toFixed(2)}/kg</p>
            </div>
          ))}
        </div>
      </div>

      {/* Reset link — only visible when user has edited something */}
      {hasEdits && (
        <div className="flex justify-end pt-0.5">
          <button type="button" onClick={resetToCalculated}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
            Reset to Calculated
          </button>
        </div>
      )}
    </div>
  )
}
