/**
 * Batched "who last changed this item, and how" lookup for the inventory
 * list/detail views — reads the AuditLogs rows already written by the price
 * (PRODUCT_PRICE_UPDATED), stock (PRODUCT_STOCK_ADJUSTED) and zero-out
 * (zero_out_inventory — a legacy entityType/action pair from before this
 * shared helper existed) edit paths, rather than adding a new table.
 */

import { prisma } from '@/lib/prisma'

export interface LastInventoryChange {
  type: 'PRICE' | 'STOCK' | 'PRICE_AND_STOCK'
  at: string
  byName: string | null
  reason: string | null
}

const RELEVANT_ACTIONS = ['PRODUCT_PRICE_UPDATED', 'PRODUCT_STOCK_ADJUSTED', 'zero_out_inventory']
const RELEVANT_ENTITY_TYPES = ['Product', 'inventory_item']

/** `entityIds` must be raw catalog-row ids (no `inv_` prefix). */
export async function getLatestInventoryChanges(entityIds: string[]): Promise<Map<string, LastInventoryChange>> {
  const result = new Map<string, LastInventoryChange>()
  const uniqueIds = [...new Set(entityIds)].filter(Boolean)
  if (uniqueIds.length === 0) return result

  const rows = await prisma.auditLogs.findMany({
    where: {
      entityId: { in: uniqueIds },
      entityType: { in: RELEVANT_ENTITY_TYPES },
      action: { in: RELEVANT_ACTIONS },
    },
    include: { users: { select: { name: true } } },
    orderBy: { timestamp: 'desc' },
  })

  for (const row of rows) {
    // Rows arrive newest-first — the first one seen per entityId is its latest.
    if (result.has(row.entityId)) continue

    const metadata = (row.metadata as Record<string, any> | null) ?? {}
    const newValues = (row.newValues as Record<string, any> | null) ?? {}

    let type: LastInventoryChange['type']
    if (row.action === 'PRODUCT_PRICE_UPDATED') {
      type = 'PRICE'
    } else if (row.action === 'PRODUCT_STOCK_ADJUSTED') {
      type = 'STOCK'
    } else {
      // zero_out_inventory can touch price, stock, or both in one entry.
      const hasPrice = 'sellPrice' in newValues
      const hasStock = 'stockQuantity' in newValues
      type = hasPrice && hasStock ? 'PRICE_AND_STOCK' : hasStock ? 'STOCK' : 'PRICE'
    }

    result.set(row.entityId, {
      type,
      at: row.timestamp.toISOString(),
      byName: row.users?.name ?? null,
      reason: typeof metadata.reason === 'string' && metadata.reason ? metadata.reason : null,
    })
  }

  return result
}
