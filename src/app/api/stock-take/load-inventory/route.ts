import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

/**
 * GET /api/stock-take/load-inventory?businessId=
 *
 * Loads all active products (with variants) for a business to populate a Stock Take Mode draft.
 * Returns one row per active variant. Zero stock = sold out (included intentionally).
 *
 * Response shape per item matches what bulk-stock-panel expects for existing items:
 * { productId, variantId, barcode, name, categoryId, supplierId, sku, sellingPrice, costPrice, systemQuantity }
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const businessId = request.nextUrl.searchParams.get('businessId')
    if (!businessId) return NextResponse.json({ error: 'businessId is required' }, { status: 400 })

    // Load all active products with their active variants and primary barcodes
    const products = await prisma.businessProducts.findMany({
      where: {
        businessId,
        isActive: true,
        isInventoryTracked: true,
        isProductTemplate: false,
      },
      select: {
        id: true,
        name: true,
        categoryId: true,
        supplierId: true,
        basePrice: true,
        costPrice: true,
        barcode: true,     // product-level barcode (fallback)
        sku: true,
        product_variants: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            sku: true,
            barcode: true,
            price: true,
            stockQuantity: true,
            product_barcodes: {
              where: { isActive: true, isPrimary: true },
              select: { code: true },
              take: 1,
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    })

    // Count total variants first (for progress indicator in UI)
    let total = 0
    for (const p of products) total += p.product_variants.length || 1

    // Build one item per variant
    const items: Array<{
      productId: string
      variantId: string
      barcode: string
      name: string
      categoryId: string
      supplierId: string | null
      sku: string
      sellingPrice: number
      costPrice: number | null
      systemQuantity: number
    }> = []

    for (const product of products) {
      if (product.product_variants.length === 0) continue

      const multiVariant = product.product_variants.length > 1

      for (const variant of product.product_variants) {
        // Resolve barcode: primary barcode record → variant.barcode → product.barcode
        const barcode =
          variant.product_barcodes[0]?.code ||
          variant.barcode ||
          product.barcode ||
          ''

        // Name: append variant name when product has multiple variants
        const name = multiVariant && variant.name
          ? `${product.name} — ${variant.name}`
          : product.name

        // Price: variant overrides product base price
        const sellingPrice = variant.price != null
          ? Number(variant.price)
          : Number(product.basePrice)

        items.push({
          productId: product.id,
          variantId: variant.id,
          barcode,
          name,
          categoryId: product.categoryId,
          supplierId: product.supplierId ?? null,
          sku: variant.sku,
          sellingPrice,
          costPrice: product.costPrice != null ? Number(product.costPrice) : null,
          systemQuantity: variant.stockQuantity,
        })
      }
    }

    return NextResponse.json({ success: true, total, items })
  } catch (error) {
    console.error('[stock-take/load-inventory GET]', error)
    return NextResponse.json({ error: 'Failed to load inventory' }, { status: 500 })
  }
}
