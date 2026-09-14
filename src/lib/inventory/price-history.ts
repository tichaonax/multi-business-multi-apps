/**
 * MBM-296 — writes to the unified `product_price_history` table.
 *
 * There is no single existing price-mutation endpoint — cost/selling price
 * changes happen across several independent routes (bulk stock receiving,
 * the universal inventory item PUT, the clothing price-update modal, the
 * variant price route, and the legacy single-product price route), one per
 * catalog/context. Rather than instrument each with its own insert logic,
 * every one of those routes calls this single helper so "previous price"
 * data is captured consistently regardless of which screen changed it.
 *
 * Call it AFTER the price update succeeds, passing the old and new values —
 * it silently no-ops when nothing actually changed (no row for a no-op
 * save), and treats a genuinely new (never-priced) product as having no
 * history row to write, since there is no "previous price" to record yet.
 */

import { prisma } from '@/lib/prisma'
import type { CatalogSource } from '@/lib/inventory/product-catalog-view'
import { notifyManagersOfPriceChange } from '@/lib/inventory/price-change-notifier'

export interface RecordPriceChangeParams {
  businessId: string
  catalogSource: CatalogSource
  productRefId: string
  priceType: 'SELLING' | 'COST'
  oldPrice: number | null
  newPrice: number | null
  changedBy: string | null
  changeReason?: string | null
  /** The genuine, user-supplied reason for this change (distinct from
   * `changeReason`, which is a technical flow label like MANUAL_EDIT). */
  reason?: string | null
  // Only needed to build a readable manager notification — omit to skip it
  // (e.g. callers that don't have a display name handy).
  productName?: string | null
  changedByName?: string | null
}

/**
 * A reason is required whenever a REAL previous price is being changed to a
 * different value. Setting an initial price (no previous price, i.e. 0 or
 * unset) needs no reason — there's nothing to explain yet.
 */
export function isPriceChangeReasonRequired(oldPrice: number | null | undefined, newPrice: number | null | undefined): boolean {
  if (oldPrice === null || oldPrice === undefined || oldPrice <= 0) return false
  if (newPrice === null || newPrice === undefined) return false
  return oldPrice !== newPrice
}

export async function recordPriceChangeIfDifferent(params: RecordPriceChangeParams): Promise<void> {
  const { businessId, catalogSource, productRefId, priceType, oldPrice, newPrice, changedBy, changeReason, reason, productName, changedByName } = params

  // Nothing to compare against (new product), or no real change (including
  // both sides being null/unset) — don't write a no-op history row.
  if (oldPrice === null || oldPrice === undefined) return
  if (newPrice === null || newPrice === undefined) return
  if (oldPrice === newPrice) return

  await prisma.productPriceHistory.create({
    data: {
      businessId,
      catalogSource,
      productRefId,
      priceType,
      oldPrice,
      newPrice,
      changedBy: changedBy ?? null,
      changeReason: changeReason ?? null,
      reason: reason ?? null,
    },
  })

  if (productName) {
    // Fire-and-forget — never let a notification failure affect the price
    // update itself (notifyManagersOfPriceChange already catches internally).
    void notifyManagersOfPriceChange({
      businessId,
      productName,
      priceType,
      oldPrice,
      newPrice,
      changedByUserId: changedBy,
      changedByName: changedByName ?? null,
      reason: reason ?? null,
    })
  }
}

export interface LatestPreviousPrices {
  previousSellingPrice: number | null
  previousCostPrice: number | null
}

/**
 * For a batch of products, returns each one's most recent PRIOR price (the
 * `oldPrice` of its latest history row) for both selling and cost. Used by
 * the pricing-exceptions report to flag "price changed significantly vs
 * previous" without an N+1 query per product.
 */
export async function getLatestPreviousPrices(
  businessId: string,
  refs: { catalogSource: CatalogSource; productRefId: string }[]
): Promise<Map<string, LatestPreviousPrices>> {
  const result = new Map<string, LatestPreviousPrices>()
  if (refs.length === 0) return result

  const rows = await prisma.productPriceHistory.findMany({
    where: {
      businessId,
      OR: refs.map(r => ({ catalogSource: r.catalogSource, productRefId: r.productRefId })),
    },
    orderBy: { createdAt: 'desc' },
    select: { catalogSource: true, productRefId: true, priceType: true, oldPrice: true },
  })

  for (const row of rows) {
    const key = `${row.catalogSource}:${row.productRefId}`
    const existing = result.get(key) ?? { previousSellingPrice: null, previousCostPrice: null }
    const price = row.oldPrice ? parseFloat(row.oldPrice.toString()) : null
    if (row.priceType === 'SELLING' && existing.previousSellingPrice === null) existing.previousSellingPrice = price
    if (row.priceType === 'COST' && existing.previousCostPrice === null) existing.previousCostPrice = price
    result.set(key, existing)
  }

  return result
}
