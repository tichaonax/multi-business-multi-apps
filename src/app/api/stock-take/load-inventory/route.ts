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
      itemType: string
      description?: string | null
      domainId?: string | null
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
          itemType: 'product',
        })
      }
    }

    // Also load BarcodeInventoryItems (used by grocery / bulk-stock businesses)
    const barcodeItems = await prisma.barcodeInventoryItems.findMany({
      where: { businessId, isActive: true },
      select: {
        id: true,
        name: true,
        barcodeData: true,
        sku: true,
        sellingPrice: true,
        costPrice: true,
        categoryId: true,
        supplierId: true,
        stockQuantity: true,
        customLabel: true,
        domainId: true,
      },
      orderBy: { name: 'asc' },
    })

    for (const bi of barcodeItems) {
      items.push({
        productId: `bii_${bi.id}`,
        variantId: `bii_${bi.id}`,
        barcode: bi.barcodeData || '',
        name: bi.name,
        categoryId: bi.categoryId ?? '',
        supplierId: bi.supplierId ?? null,
        sku: bi.sku ?? '',
        sellingPrice: Number(bi.sellingPrice ?? 0),
        costPrice: bi.costPrice != null ? Number(bi.costPrice) : null,
        systemQuantity: bi.stockQuantity,
        itemType: 'barcode',
        description: bi.customLabel || null,
        domainId: (bi as any).domainId || null,
      })
    }

    // Also load active custom bulk products for this business
    const bulkProducts = await prisma.customBulkProducts.findMany({
      where: { businessId, isActive: true },
      select: {
        id: true,
        name: true,
        barcode: true,
        sku: true,
        unitPrice: true,
        costPrice: true,
        categoryId: true,
        supplierId: true,
        remainingCount: true,
      },
      orderBy: { name: 'asc' },
    })

    for (const bulk of bulkProducts) {
      items.push({
        productId: `cbulk_${bulk.id}`,
        variantId: `cbulk_${bulk.id}`,
        barcode: bulk.barcode,
        name: `${bulk.name} [Bulk]`,
        categoryId: bulk.categoryId ?? '',
        supplierId: bulk.supplierId ?? null,
        sku: bulk.sku,
        sellingPrice: Number(bulk.unitPrice),
        costPrice: bulk.costPrice != null ? Number(bulk.costPrice) : null,
        systemQuantity: bulk.remainingCount,
        itemType: 'bulk',
      })
    }

    // Load active clothing bales for this business
    const bales = await prisma.clothingBales.findMany({
      where: { businessId, isActive: true },
      select: {
        id: true,
        batchNumber: true,
        remainingCount: true,
        unitPrice: true,
        costPrice: true,
        sku: true,
        scanCode: true,
        barcode: true,
        categoryId: true,
        category: { select: { name: true } },
      },
      orderBy: { batchNumber: 'asc' },
    })

    for (const bale of bales) {
      items.push({
        productId: `bale_${bale.id}`,
        variantId: `bale_${bale.id}`,
        barcode: bale.scanCode || bale.barcode || '',
        name: `${bale.batchNumber} — ${bale.category.name} [Bale]`,
        categoryId: bale.categoryId,
        supplierId: null,
        sku: bale.sku,
        sellingPrice: Number(bale.unitPrice),
        costPrice: bale.costPrice != null ? Number(bale.costPrice) : null,
        systemQuantity: bale.remainingCount,
        itemType: 'bale',
      })
    }

    // Sort combined list alphabetically by name
    items.sort((a, b) => a.name.localeCompare(b.name))

    const finalTotal = items.length

    return NextResponse.json({ success: true, total: finalTotal, items })
  } catch (error) {
    console.error('[stock-take/load-inventory GET]', error)
    return NextResponse.json({ error: 'Failed to load inventory' }, { status: 500 })
  }
}
