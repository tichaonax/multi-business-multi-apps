import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getActivePromotions, applyPromotion } from '@/lib/promotions/resolve-active-promotions'

/**
 * MBM-350 — POST /api/pos/current-prices
 *
 * A till loads its prices when its page opens and the orders APIs charge the
 * price the till sends, so a till left open kept selling at an old price after
 * a price change. Every till calls this when payment starts, with its cart
 * lines, and corrects any line whose price is out of date.
 *
 * Body: { businessId, lines: [{ key, productId?, variantId?, inventoryItemId?, baleId? }] }
 * Returns: { success: true, prices: { [key]: number | null } } — null means
 * "not a catalogue price we can check" (the till leaves that line alone).
 *
 * Prices are worked out exactly as the tills' own product lists do:
 *  - variant: its own price when set (> 0), else the product's basePrice
 *  - product: basePrice
 *  - barcode inventory item (inv_): sellingPrice
 *  - clothing bale: unitPrice
 *  Promotions (MBM-289) apply for grocery and clothing only, to the same prices
 *  /api/universal/products, /api/grocery/desk-products and /api/clothing/bales apply them to.
 */
interface Line {
  key: string
  productId?: string
  variantId?: string
  inventoryItemId?: string
  baleId?: string
}

export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json().catch(() => null)
    const businessId: string | undefined = body?.businessId
    const lines: Line[] = Array.isArray(body?.lines) ? body.lines.slice(0, 500) : []
    if (!businessId) return NextResponse.json({ error: 'businessId is required' }, { status: 400 })

    const business = await prisma.businesses.findUnique({ where: { id: businessId }, select: { type: true } })
    if (!business) return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    const usesPromotions = business.type === 'grocery' || business.type === 'clothing'
    const promotions = usesPromotions ? await getActivePromotions(businessId) : new Map()
    const promo = (key: string, price: number) => usesPromotions ? applyPromotion(price, promotions.get(key)).price : price

    const ids = (pick: (l: Line) => string | undefined) => [...new Set(lines.map(pick).filter((v): v is string => !!v))]
    const [variants, products, items, bales] = await Promise.all([
      prisma.productVariants.findMany({
        where: { id: { in: ids(l => l.variantId) }, business_products: { businessId } },
        select: { id: true, price: true, productId: true, business_products: { select: { basePrice: true } } },
      }),
      prisma.businessProducts.findMany({
        where: { id: { in: ids(l => l.productId) }, businessId },
        select: { id: true, basePrice: true },
      }),
      prisma.barcodeInventoryItems.findMany({
        where: { id: { in: ids(l => l.inventoryItemId) }, businessId },
        select: { id: true, sellingPrice: true },
      }),
      prisma.clothingBales.findMany({
        where: { id: { in: ids(l => l.baleId) }, businessId },
        select: { id: true, unitPrice: true, categoryId: true },
      }),
    ])
    const variantById = new Map(variants.map(v => [v.id, v]))
    const productById = new Map(products.map(p => [p.id, p]))
    const itemById = new Map(items.map(i => [i.id, i]))
    const baleById = new Map(bales.map(b => [b.id, b]))

    const prices: Record<string, number | null> = {}
    for (const l of lines) {
      let price: number | null = null
      if (l.baleId) {
        const b = baleById.get(l.baleId)
        if (b) price = promo(`category:${b.categoryId}`, Number(b.unitPrice))
      } else if (l.inventoryItemId) {
        const i = itemById.get(l.inventoryItemId)
        if (i?.sellingPrice != null) price = promo(`product:${i.id}`, Number(i.sellingPrice))
      } else if (l.variantId && variantById.has(l.variantId)) {
        const v = variantById.get(l.variantId)!
        price = v.price != null && Number(v.price) > 0
          ? Number(v.price)
          : promo(`product:${v.productId}`, Number(v.business_products?.basePrice ?? 0))
      } else if (l.productId) {
        const p = productById.get(l.productId)
        if (p) price = promo(`product:${p.id}`, Number(p.basePrice))
      }
      prices[l.key] = price != null && price > 0 ? Math.round(price * 100) / 100 : null
    }

    return NextResponse.json({ success: true, prices })
  } catch (error) {
    console.error('[pos/current-prices] Error:', error)
    return NextResponse.json({ success: false, error: 'Failed to read current prices' }, { status: 500 })
  }
}
