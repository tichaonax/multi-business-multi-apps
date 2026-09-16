'use client'

import { useState } from 'react'
import { useToastContext } from '@/components/ui/toast'

export interface BulkCorrectionRow {
  name: string
  sku: string | null
  barcode: string | null
  quantityOnHand: number
  unitsPerPack: number | null
  costPrice: number | null
  bulkPackCost: number | null
  sellingPrice: number | null
}

interface Props {
  businessId: string
  /** The catalog-aware id used by /api/inventory/[businessId]/items/[itemId]/* — `inv_<id>` for a barcode item, plain id otherwise. */
  itemId: string
  row: BulkCorrectionRow
  /** Whether this user may see/use "Open Full Item Editor" — that path can change the cost price directly, so it requires inventory-edit permission. Anyone who can see this report can still use this modal to fix the pack quantity. */
  canEditCost: boolean
  onClose: () => void
  onSaved: (result: { unitsPerPack: number; costPrice: number | null; bulkPackCost: number | null }) => void
  onOpenFullEditor: () => void
}

const money = (n: number | null) => (n != null ? `$${n.toFixed(2)}` : '—')

/**
 * MBM-297 — the report-level "Fix" action for a Bulk Cost Allocation Issue.
 * This modal NEVER accepts a typed-in cost value — the only thing a user
 * can ever change here is units per pack. What saving it does depends on
 * who's asking, mirroring the API's own permission split:
 *
 * - A bulk cost already on file → anyone who can view this report may
 *   correct the pack size; the unit cost is recalculated from that
 *   already-authorized number.
 * - No bulk cost on file, but this user has inventory-edit permission →
 *   the current (suspected-wrong) cost price is inferred as the bulk cost
 *   and the unit cost is corrected from it — the same thing they could do
 *   via the full editor, offered here as a one-step convenience.
 * - No bulk cost on file and report-only access → only the pack size is
 *   recorded; cost price is left untouched, since inferring one is a
 *   financial decision that permission tier can't make.
 *
 * The actual decision is re-checked server-side regardless of what this
 * component predicts — `canEditCost` here only drives the preview/copy.
 */
export function BulkQuantityCorrectionModal({ businessId, itemId, row, canEditCost, onClose, onSaved, onOpenFullEditor }: Props) {
  const toast = useToastContext()
  const [unitsPerPack, setUnitsPerPack] = useState(row.unitsPerPack ? String(row.unitsPerPack) : '')
  const [saving, setSaving] = useState(false)

  const hasBulkCostOnFile = row.bulkPackCost !== null && row.bulkPackCost > 0
  const willInferCost = !hasBulkCostOnFile && canEditCost && row.costPrice !== null && row.costPrice > 0
  const effectiveBulkCost = hasBulkCostOnFile ? row.bulkPackCost : (willInferCost ? row.costPrice : null)
  const parsedUnits = parseInt(unitsPerPack, 10)
  const validUnits = Number.isFinite(parsedUnits) && parsedUnits > 0
  const correctedUnitCost = validUnits && effectiveBulkCost ? Math.round((effectiveBulkCost / parsedUnits) * 100) / 100 : null
  const willCorrectCost = correctedUnitCost !== null
  const proposedProfitLoss = correctedUnitCost !== null && row.sellingPrice !== null ? row.sellingPrice - correctedUnitCost : null
  const proposedMarginPct = correctedUnitCost !== null && row.sellingPrice !== null && row.sellingPrice > 0
    ? ((row.sellingPrice - correctedUnitCost) / row.sellingPrice) * 100
    : null
  const inventoryValueImpact = correctedUnitCost !== null && row.costPrice !== null
    ? row.quantityOnHand * (correctedUnitCost - row.costPrice)
    : null

  async function handleConfirm() {
    if (!validUnits) return
    setSaving(true)
    try {
      const res = await fetch(`/api/inventory/${businessId}/items/${itemId}/bulk-pack-correction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unitsPerPack: parsedUnits }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error ?? 'Failed to save correction')
        return
      }
      toast.push(data.bulkPackCost != null ? 'Unit cost corrected' : 'Pack quantity recorded')
      onSaved({ unitsPerPack: data.unitsPerPack ?? parsedUnits, costPrice: data.costPrice ?? null, bulkPackCost: data.bulkPackCost ?? null })
    } catch {
      toast.error('Failed to save correction')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-amber-300 dark:border-amber-700 w-full max-w-md p-5">
        <h2 className="text-sm font-bold text-gray-900 dark:text-white mb-0.5">Bulk Quantity Correction</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 truncate">{row.name}</p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
          {row.sku && <span>SKU: {row.sku}</span>}
          {row.sku && row.barcode && <span> · </span>}
          {row.barcode && <span>{row.barcode}</span>}
        </p>

        {hasBulkCostOnFile ? (
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-2.5">
            This product may have been bought as a bulk pack but costed as one individual item. Enter the number of individual sellable units in the pack to recalculate the unit cost. Cost figures shown here are read-only.
          </p>
        ) : willInferCost ? (
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-2.5">
            No bulk-pack cost is recorded yet — the current cost price ({money(row.costPrice)}) will be treated as the case/pack cost once you enter how many units it contains, and the unit cost will be corrected from it.
          </p>
        ) : (
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-2.5">
            No bulk-pack cost is recorded for this item yet, so the unit cost can't be recalculated here. You can still record the pack size below — it's safe to set now and won't change the cost price.
          </p>
        )}

        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs mb-4">
          <div className="text-gray-500 dark:text-gray-400">Quantity on hand</div>
          <div className="text-right font-medium text-gray-900 dark:text-gray-100">{row.quantityOnHand}</div>
          <div className="text-gray-500 dark:text-gray-400">Bulk pack cost</div>
          <div className="text-right font-medium text-gray-900 dark:text-gray-100">
            {hasBulkCostOnFile ? money(row.bulkPackCost) : willInferCost ? `${money(row.costPrice)} (inferred)` : 'not recorded'}
          </div>
          <div className="text-gray-500 dark:text-gray-400">Current unit cost</div>
          <div className="text-right font-medium text-gray-900 dark:text-gray-100">{money(row.costPrice)}</div>
          <div className="text-gray-500 dark:text-gray-400">Selling price</div>
          <div className="text-right font-medium text-gray-900 dark:text-gray-100">{money(row.sellingPrice)}</div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            Units per pack / case quantity <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            min="1"
            step="1"
            value={unitsPerPack}
            onChange={e => setUnitsPerPack(e.target.value)}
            autoFocus
            className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-amber-400 focus:outline-none"
            placeholder="e.g. 24"
          />
        </div>

        {validUnits && willCorrectCost && (
          <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
            <div className="text-gray-500 dark:text-gray-400">Proposed unit cost</div>
            <div className="text-right font-semibold text-green-600 dark:text-green-400">{money(correctedUnitCost)}</div>
            <div className="text-gray-500 dark:text-gray-400">Proposed profit/loss</div>
            <div className={`text-right font-semibold ${proposedProfitLoss !== null && proposedProfitLoss < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-gray-100'}`}>
              {money(proposedProfitLoss)}
            </div>
            <div className="text-gray-500 dark:text-gray-400">Proposed gross margin</div>
            <div className="text-right font-semibold text-gray-900 dark:text-gray-100">
              {proposedMarginPct !== null ? `${proposedMarginPct.toFixed(1)}%` : '—'}
            </div>
            <div className="text-gray-500 dark:text-gray-400">Inventory value impact</div>
            <div className={`text-right font-semibold ${inventoryValueImpact !== null && inventoryValueImpact < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-gray-100'}`}>
              {inventoryValueImpact !== null ? `${inventoryValueImpact >= 0 ? '+' : ''}${money(inventoryValueImpact)}` : '—'}
            </div>
          </div>
        )}
        {!willCorrectCost && validUnits && (
          <p className="mt-3 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-lg p-2.5">
            Cost price will stay at {money(row.costPrice)} — only the pack size is being recorded.
          </p>
        )}

        <div className="flex items-center gap-2 mt-4">
          <button
            onClick={handleConfirm}
            disabled={!validUnits || saving}
            className="flex-1 py-1.5 text-sm bg-amber-500 hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg font-medium"
          >
            {saving ? 'Saving…' : willCorrectCost ? 'Confirm Correction' : 'Save Pack Size'}
          </button>
          <button
            onClick={onClose}
            className="py-1.5 px-3 text-sm border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg"
          >
            Cancel
          </button>
        </div>
        {canEditCost && (
          <button
            onClick={onOpenFullEditor}
            className="w-full mt-2 py-1.5 text-xs text-blue-600 dark:text-blue-400 hover:underline"
          >
            Open Full Item Editor{!hasBulkCostOnFile && !willInferCost ? ' — also set up the bulk cost' : ''}
          </button>
        )}
      </div>
    </div>
  )
}
