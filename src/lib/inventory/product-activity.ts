/**
 * MBM-296 — sales and stock-movement aggregation shared by every pricing/
 * performance/valuation report. Spans both product catalogs the same way
 * product-catalog-view.ts does: ProductVariants sales come straight off
 * BusinessOrderItems.productVariantId; BarcodeInventoryItems sales are only
 * linked via `attributes->>'inventoryItemId'` JSON, so those need raw SQL —
 * this mirrors the proven pattern in
 * src/app/api/universal/reports/reorder/route.ts.
 *
 * COGS/loss-from-sales figures built from this data always use TODAY's cost
 * price, never the cost price at the time of the historical sale — no
 * snapshot exists anywhere in the order-item schema. Callers must label
 * anything derived from `qtySold` as an approximation when cost has since
 * changed.
 */

import { prisma } from '@/lib/prisma'

export interface SalesAggregate {
  qtySold: number
  revenue: number
  transactionCount: number
  lastSaleDate: Date | null
}

export async function getSalesAggregates(
  businessId: string,
  start: Date,
  end: Date
): Promise<{ byVariantId: Map<string, SalesAggregate>; byBarcodeItemId: Map<string, SalesAggregate> }> {
  const [variantRows, barcodeRows] = await Promise.all([
    prisma.businessOrderItems.findMany({
      where: {
        productVariantId: { not: null },
        business_orders: {
          businessId,
          status: 'COMPLETED',
          orderType: 'SALE',
          OR: [
            { transactionDate: { gte: start, lte: end } },
            { transactionDate: null, createdAt: { gte: start, lte: end } },
          ],
        },
      },
      select: { productVariantId: true, quantity: true, totalPrice: true, createdAt: true, business_orders: { select: { transactionDate: true } } },
    }),
    prisma.$queryRaw<{ item_id: string; qty_sold: bigint; revenue: string; txn_count: bigint; last_sale: Date }[]>`
      SELECT
        boi.attributes->>'inventoryItemId' AS item_id,
        SUM(boi.quantity)::bigint AS qty_sold,
        SUM(boi."totalPrice")::text AS revenue,
        COUNT(*)::bigint AS txn_count,
        MAX(COALESCE(bo."transactionDate", bo."createdAt")) AS last_sale
      FROM business_order_items boi
      JOIN business_orders bo ON boi."orderId" = bo.id
      WHERE bo."businessId" = ${businessId}
        AND bo.status = 'COMPLETED'
        AND bo."orderType" = 'SALE'
        AND (
          (bo."transactionDate" >= ${start} AND bo."transactionDate" <= ${end})
          OR (bo."transactionDate" IS NULL AND bo."createdAt" >= ${start} AND bo."createdAt" <= ${end})
        )
        AND boi.attributes->>'inventoryItemId' IS NOT NULL
      GROUP BY boi.attributes->>'inventoryItemId'
    `,
  ])

  const byVariantId = new Map<string, SalesAggregate>()
  for (const row of variantRows) {
    if (!row.productVariantId) continue
    const existing = byVariantId.get(row.productVariantId) ?? { qtySold: 0, revenue: 0, transactionCount: 0, lastSaleDate: null }
    existing.qtySold += row.quantity
    existing.revenue += parseFloat(row.totalPrice.toString())
    existing.transactionCount += 1
    const saleDate = row.business_orders.transactionDate ?? row.createdAt
    if (!existing.lastSaleDate || saleDate > existing.lastSaleDate) existing.lastSaleDate = saleDate
    byVariantId.set(row.productVariantId, existing)
  }

  const byBarcodeItemId = new Map<string, SalesAggregate>()
  for (const row of barcodeRows) {
    byBarcodeItemId.set(row.item_id, {
      qtySold: Number(row.qty_sold),
      revenue: parseFloat(row.revenue),
      transactionCount: Number(row.txn_count),
      lastSaleDate: row.last_sale,
    })
  }

  return { byVariantId, byBarcodeItemId }
}

export interface MovementDates {
  firstStockedDate: Date | null
  lastStockedDate: Date | null
  qtyReceivedInRange: number
  costValueReceivedInRange: number
}

/**
 * Last/first PURCHASE_RECEIVED movement date per item, plus quantity/value
 * received within [start, end] — the basis for report 4's recently-stocked
 * vs existing split. Movement history only exists from MBM-193's
 * instrumentation onward; items stocked before that have no rows here and
 * fall back to their own `createdAt` as a "first stocked" proxy by the
 * caller.
 */
export async function getMovementAggregates(
  businessId: string,
  start: Date,
  end: Date
): Promise<{ byVariantId: Map<string, MovementDates>; byBarcodeItemId: Map<string, MovementDates> }> {
  const movements = await prisma.businessStockMovements.findMany({
    where: {
      businessId,
      movementType: 'PURCHASE_RECEIVED',
      OR: [{ productVariantId: { not: null } }, { barcodeInventoryItemId: { not: null } }],
    },
    select: { productVariantId: true, barcodeInventoryItemId: true, quantity: true, unitCost: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  })

  const byVariantId = new Map<string, MovementDates>()
  const byBarcodeItemId = new Map<string, MovementDates>()

  for (const m of movements) {
    const map = m.productVariantId ? byVariantId : byBarcodeItemId
    const key = m.productVariantId ?? m.barcodeInventoryItemId
    if (!key) continue
    const existing = map.get(key) ?? { firstStockedDate: null, lastStockedDate: null, qtyReceivedInRange: 0, costValueReceivedInRange: 0 }
    if (!existing.firstStockedDate) existing.firstStockedDate = m.createdAt
    existing.lastStockedDate = m.createdAt
    if (m.createdAt >= start && m.createdAt <= end) {
      existing.qtyReceivedInRange += m.quantity
      existing.costValueReceivedInRange += m.quantity * (m.unitCost ? parseFloat(m.unitCost.toString()) : 0)
    }
    map.set(key, existing)
  }

  return { byVariantId, byBarcodeItemId }
}
