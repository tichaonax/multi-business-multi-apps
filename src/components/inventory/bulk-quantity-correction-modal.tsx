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
  onSaved: (result: { unitsPerPack: number; costPrice: number | null }) => void
  onOpenFullEditor: () => void
}

const money = (n: number | null) => (n != null ? `$${n.toFixed(2)}` : '—')

/**
 * MBM-297 — the report-level "Fix" action for a Bulk Cost Allocation Issue.
 * Deliberately narrow, by design: this modal NEVER accepts a typed-in cost
 * value, in either state. The only thing a user can ever change here is
 * units per pack — a safe, non-financial correction (it just flags/derives
 * data, it never affects recorded sales) that anyone who can see this report
 * may make, even without inventory-edit permission. Bulk cost, selling
 * price, and stock balance are always read-only. When a bulk cost is
 * already on file, saving recalculates the unit cost from it; when none is
 * on file, saving only records the pack size and leaves cost price
 * untouched. Establishing or changing an actual cost figure requires the
 * full item editor, which is gated separately by inventory-edit permission.
 */
export function BulkQuantityCorrectionModal({ businessId, itemId, row, canEditCost, onClose, onSaved, onOpenFullEditor }: Props) {
  const toast = useToastContext()
  const [unitsPerPack, setUnitsPerPack] = useState(row.unitsPerPack ? String(row.unitsPerPack) : '')
  const [saving, setSaving] = useState(false)

  const hasBulkCostOnFile = row.bulkPackCost !== null && row.bulkPackCost > 0
  const parsedUnits = parseInt(unitsPerPack, 10)
  const validUnits = Number.isFinite(parsedUnits) && parsedUnits > 0
  const correctedUnitCost = validUnits && hasBulkCostOnFile && row.bulkPackCost ? Math.round((row.bulkPackCost / parsedUnits) * 100) / 100 : null
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
      toast.push(hasBulkCostOnFile ? 'Unit cost corrected' : 'Pack quantity recorded')
      onSaved({ unitsPerPack: data.unitsPerPack ?? parsedUnits, costPrice: data.costPrice ?? null })
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
        ) : (
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-2.5">
            No bulk-pack cost is recorded for this item yet, so the unit cost can't be recalculated here. You can still record the pack size below — it's safe to set now and won't change the cost price.
            {canEditCost && <> Use <strong>Open Full Item Editor</strong> to also set up the bulk/case cost.</>}
          </p>
        )}

        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs mb-4">
          <div className="text-gray-500 dark:text-gray-400">Quantity on hand</div>
          <div className="text-right font-medium text-gray-900 dark:text-gray-100">{row.quantityOnHand}</div>
          <div className="text-gray-500 dark:text-gray-400">Bulk pack cost</div>
          <div className="text-right font-medium text-gray-900 dark:text-gray-100">{hasBulkCostOnFile ? money(row.bulkPackCost) : 'not recorded'}</div>
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

        {hasBulkCostOnFile && validUnits && correctedUnitCost !== null && (
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
        {!hasBulkCostOnFile && validUnits && (
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
            {saving ? 'Saving…' : hasBulkCostOnFile ? 'Confirm Correction' : 'Save Pack Size'}
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
            Open Full Item Editor{!hasBulkCostOnFile ? ' — also set up the bulk cost' : ''}
          </button>
        )}
      </div>
    </div>
  )
}
