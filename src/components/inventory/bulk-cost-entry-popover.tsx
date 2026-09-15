'use client'

import { useState } from 'react'

interface Props {
  /** Current per-unit cost on the row (string, may be blank) — shown as a fallback and used as the starting "case cost" guess only when the row has no bulk data yet. */
  costPrice: string
  unitsPerPack: string
  bulkPackCost: string
  onApply: (patch: { costPrice: string; unitsPerPack: string; bulkPackCost: string }) => void
  onClear: () => void
  onClose: () => void
}

/**
 * MBM-297 — inline row-level popover that makes bulk/case cost entry
 * explicit at the point of receiving stock (Bulk Stocking + Stock Take),
 * instead of the previous bare "cost" input that silently accepted a whole
 * case's cost as if it were one unit's cost (the original production bug).
 * The user states the case/pack cost and how many individual units it
 * contains; the per-unit cost that actually gets saved is always the
 * computed value, never a guess.
 */
export function BulkCostEntryPopover({ costPrice, unitsPerPack, bulkPackCost, onApply, onClear, onClose }: Props) {
  const [caseCost, setCaseCost] = useState(bulkPackCost || costPrice || '')
  const [units, setUnits] = useState(unitsPerPack || '')

  const parsedCaseCost = parseFloat(caseCost)
  const parsedUnits = parseInt(units, 10)
  const valid = Number.isFinite(parsedCaseCost) && parsedCaseCost > 0 && Number.isFinite(parsedUnits) && parsedUnits > 0
  const computedUnitCost = valid ? Math.round((parsedCaseCost / parsedUnits) * 100) / 100 : null

  function handleApply() {
    if (!valid || computedUnitCost === null) return
    onApply({ costPrice: String(computedUnitCost), unitsPerPack: String(parsedUnits), bulkPackCost: String(parsedCaseCost) })
  }

  return (
    <div className="absolute left-0 top-full z-40 mt-1 w-64 bg-white dark:bg-gray-800 border border-indigo-300 dark:border-indigo-700 rounded-lg shadow-xl p-3 text-left">
      <p className="text-xs font-semibold text-gray-800 dark:text-gray-100 mb-2">This cost is for a whole case/pack</p>
      <label className="block text-[11px] text-gray-500 dark:text-gray-400 mb-0.5">Case/pack cost ($)</label>
      <input
        type="number" min="0" step="0.01" autoFocus value={caseCost}
        onChange={e => setCaseCost(e.target.value)}
        placeholder="e.g. 6.70"
        className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-400 focus:outline-none mb-2"
      />
      <label className="block text-[11px] text-gray-500 dark:text-gray-400 mb-0.5">Units in the case/pack</label>
      <input
        type="number" min="1" step="1" value={units}
        onChange={e => setUnits(e.target.value)}
        placeholder="e.g. 24"
        className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-400 focus:outline-none mb-2"
      />
      {computedUnitCost !== null && (
        <p className="text-xs text-green-600 dark:text-green-400 font-medium mb-2">= ${computedUnitCost.toFixed(2)} per unit</p>
      )}
      <div className="flex items-center gap-2">
        <button type="button" onClick={handleApply} disabled={!valid}
          className="flex-1 py-1 text-xs bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded font-medium">
          Apply
        </button>
        {(unitsPerPack || bulkPackCost) && (
          <button type="button" onClick={onClear}
            className="py-1 px-2 text-xs border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded">
            Clear
          </button>
        )}
        <button type="button" onClick={onClose}
          className="py-1 px-2 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
          ✕
        </button>
      </div>
    </div>
  )
}
