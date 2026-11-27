// MBM-344: items sold on a business day — the daily item sales report and the
// EOD report's "Items sold" section. Built from the very orders the daily
// sales summary uses (/api/universal/daily-sales?includeItems=1), so the two
// always agree.
//
// One row per item: a product variant, an inventory item, a bale, a custom
// bulk product, otherwise the name on the line (services, tokens). Returns
// (negative quantities) are netted in. "Restock needed" follows the reorder
// report's rule: stock at or below the item's reorder level, 10 when none is
// set (src/app/api/universal/reports/reorder/route.ts).
import { prisma } from '@/lib/prisma'
import { saleLineThumbnails } from '@/lib/reports/item-thumbnails'

export interface ItemSalesRow {
  key: string
  name: string
  sku: string | null
  /** The price it sold at: the total divided by the quantity */
  unitPrice: number
  quantity: number
  total: number
  /** null: not stock-tracked (services, tokens) */
  remainingStock: number | null
  reorderLevel: number | null
  restockNeeded: boolean
  /** MBM-345: thumbnail where the product / inventory item has an image */
  imageUrl: string | null
  /** The id the inventory page knows it by (a product id, or "inv_<id>") — opens
   *  its View Details; null for bales, bulk products and unlinked lines */
  inventoryId: string | null
}

const DEFAULT_REORDER_LEVEL = 10

export async function buildItemSales(orders: any[], businessId: string): Promise<ItemSalesRow[]> {
  type Acc = { key: string; name: string; sku: string | null; quantity: number; total: number; kind: string; ref: string | null }
  const rows = new Map<string, Acc>()

  for (const order of orders) {
    for (const item of order.business_order_items || []) {
      const a = (item.attributes as any) || {}
      let kind = 'name', ref: string | null = null
      if (item.productVariantId) { kind = 'variant'; ref = item.productVariantId }
      else if (a.isInventoryItem && a.inventoryItemId) { kind = 'inventory'; ref = a.inventoryItemId }
      else if (a.isInventoryItem && a.sku) { kind = 'inventorySku'; ref = a.sku }
      else if (a.baleId) { kind = 'bale'; ref = a.baleId }
      else if (a.customBulkId) { kind = 'bulk'; ref = a.customBulkId }
      const name = [a.productName || item.product_variants?.name || 'Item', a.variantName].filter(Boolean).join(' – ')
      const key = `${kind}:${ref ?? name}`
      const row = rows.get(key) || { key, name, sku: a.sku || item.product_variants?.sku || null, quantity: 0, total: 0, kind, ref }
      row.quantity += Number(item.quantity || 0)
      row.total += Number(item.totalPrice || 0)
      rows.set(key, row)
    }
  }

  const refs = (kind: string) => [...rows.values()].filter(r => r.kind === kind).map(r => r.ref as string)
  const [variants, invById, invBySku, bales, bulks] = await Promise.all([
    refs('variant').length ? prisma.productVariants.findMany({ where: { id: { in: refs('variant') } }, select: { id: true, productId: true, stockQuantity: true, reorderLevel: true, business_products: { select: { productType: true } } } }) : [],
    refs('inventory').length ? prisma.barcodeInventoryItems.findMany({ where: { id: { in: refs('inventory') } }, select: { id: true, stockQuantity: true, reorderLevel: true } }) : [],
    refs('inventorySku').length ? prisma.barcodeInventoryItems.findMany({ where: { businessId, sku: { in: refs('inventorySku') } }, select: { id: true, sku: true, stockQuantity: true, reorderLevel: true } }) : [],
    refs('bale').length ? prisma.clothingBales.findMany({ where: { id: { in: refs('bale') } }, select: { id: true, remainingCount: true } }) : [],
    refs('bulk').length ? prisma.customBulkProducts.findMany({ where: { id: { in: refs('bulk') } }, select: { id: true, remainingCount: true } }) : [],
  ])

  const stockOf = (r: Acc): { stock: number; level: number | null } | null => {
    if (r.kind === 'variant') {
      const v = (variants as any[]).find(x => x.id === r.ref)
      if (!v || v.business_products?.productType !== 'PHYSICAL') return null
      return { stock: v.stockQuantity, level: v.reorderLevel }
    }
    if (r.kind === 'inventory' || r.kind === 'inventorySku') {
      const list = (r.kind === 'inventory' ? invById : invBySku) as any[]
      const matches = list.filter(x => (r.kind === 'inventory' ? x.id : x.sku) === r.ref)
      return matches.length === 1 ? { stock: matches[0].stockQuantity, level: matches[0].reorderLevel } : null
    }
    if (r.kind === 'bale') { const b = (bales as any[]).find(x => x.id === r.ref); return b ? { stock: b.remainingCount, level: null } : null }
    if (r.kind === 'bulk') { const b = (bulks as any[]).find(x => x.id === r.ref); return b ? { stock: b.remainingCount, level: null } : null }
    return null
  }

  // The inventory page's id for a row: the product, or "inv_<id>" for an inventory item
  const inventoryIdOf = (r: Acc): string | null => {
    if (r.kind === 'variant') return (variants as any[]).find(x => x.id === r.ref)?.productId ?? null
    if (r.kind === 'inventory') return r.ref ? `inv_${r.ref}` : null
    if (r.kind === 'inventorySku') {
      const m = (invBySku as any[]).filter(x => x.sku === r.ref)
      return m.length === 1 ? `inv_${m[0].id}` : null
    }
    return null
  }

  // MBM-345: a thumbnail per product / inventory item row
  const all = [...rows.values()]
  const thumbs = await saleLineThumbnails(all.map(r =>
    r.kind === 'variant' ? { productVariantId: r.ref }
      : r.kind === 'inventory' ? { attributes: { inventoryItemId: r.ref } }
        : {}))
  const thumbOf = new Map(all.map((r, k) => [r.key, thumbs[k]]))

  return all
    .map(r => {
      const s = stockOf(r)
      // bales and bulk products have no reorder level (null): never flagged
      const level = s && s.level !== null ? (s.level || DEFAULT_REORDER_LEVEL) : null
      return {
        key: r.key,
        name: r.name,
        sku: r.sku,
        unitPrice: r.quantity ? Math.round((r.total / r.quantity) * 100) / 100 : 0,
        quantity: r.quantity,
        total: Math.round(r.total * 100) / 100,
        remainingStock: s ? s.stock : null,
        reorderLevel: level,
        restockNeeded: !!s && level !== null && s.stock <= level,
        imageUrl: thumbOf.get(r.key) ?? null,
        inventoryId: inventoryIdOf(r),
      }
    })
    .sort((a, b) => b.total - a.total)
}
