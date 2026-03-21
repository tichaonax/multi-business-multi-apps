import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { randomBytes } from 'crypto'
import {
  generateProduct,
  generateBale,
  type SupportedBusinessType,
  type ProductRefs,
} from '@/lib/test-product-data'

/**
 * POST /api/admin/test-barcode-generator/generate
 *
 * Admin-only. Generates [TEST]-prefixed products and/or bales for selected businesses.
 * Optionally auto-stocks them into inventory (BarcodeInventoryItems / ClothingBales).
 * Restricted to localhost:8080 + system admin.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { items, autoStock = false } = body as {
      items: {
        businessId: string
        businessType: SupportedBusinessType
        productCount: number
        baleCount?: number
        autoStock?: boolean
      }[]
      autoStock?: boolean
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'items array required' }, { status: 400 })
    }

    const results: any[] = []

    for (const item of items) {
      const { businessId, businessType, productCount, baleCount = 0 } = item
      const shouldStock = item.autoStock ?? autoStock

      try {
        // ── Fetch reference data ─────────────────────────────────────────────

        const [categoriesRaw, suppliersRaw, baleCategoriesRaw] = await Promise.all([
          prisma.businessCategories.findMany({
            where: { businessId, isActive: true },
            select: { id: true },
          }),
          prisma.businessSuppliers.findMany({
            where: { businessId, isActive: true },
            select: { id: true },
            take: 20,
          }),
          businessType === 'clothing'
            ? prisma.clothingBaleCategories.findMany({
                where: { isActive: true },
                select: { id: true },
              })
            : Promise.resolve([]),
        ])

        const refs: ProductRefs = {
          categoryIds:     categoriesRaw.map(c => c.id),
          supplierIds:     suppliersRaw.map(s => s.id),
          baleCategoryIds: baleCategoriesRaw.map(c => c.id),
        }

        const productsGenerated: { name: string; barcode: string; price: number }[] = []
        const balesGenerated:    { name: string; barcode: string; price: number }[] = []

        // ── Generate + stock products ────────────────────────────────────────

        for (let i = 0; i < productCount; i++) {
          const p = generateProduct(businessType, refs, i)

          if (shouldStock) {
            const inventoryItemId = randomBytes(8).toString('hex')
            await prisma.barcodeInventoryItems.create({
              data: {
                name:            p.name,
                sku:             p.sku,
                barcodeData:     p.barcode,
                businessId,
                inventoryItemId,
                quantity:        p.quantity,
                stockQuantity:   p.quantity,
                customLabel:     p.description || undefined,
                costPrice:       p.costPrice,
                sellingPrice:    p.sellingPrice,
                categoryId:      p.categoryId ?? null,
                supplierId:      p.supplierId ?? null,
                createdById:     user.id,
              },
            })
          }

          productsGenerated.push({ name: p.name, barcode: p.barcode, price: p.sellingPrice })
        }

        // ── Generate + stock bales (clothing only) ───────────────────────────

        let baleError: string | undefined
        if (businessType === 'clothing' && baleCount > 0) {
          for (let i = 0; i < baleCount; i++) {
            const b = generateBale(refs, i)

            if (!b.categoryId) {
              // No bale categories configured — skip silently
              continue
            }

            if (shouldStock) {
              try {
                const scanCode  = randomBytes(8).toString('hex')
                const baleSku   = `BAL-${randomBytes(4).toString('hex').toUpperCase()}`
                await prisma.clothingBales.create({
                  data: {
                    businessId,
                    sku:           baleSku,
                    scanCode,
                    barcode:       b.barcode,
                    batchNumber:   b.batchNumber,
                    itemCount:     b.itemCount,
                    remainingCount: b.itemCount,
                    unitPrice:     b.unitPrice,
                    costPrice:     b.costPrice,
                    notes:         b.notes,
                    categoryId:    b.categoryId,
                  },
                })
                balesGenerated.push({ name: b.name, barcode: b.barcode, price: b.unitPrice, batchNumber: b.batchNumber, itemCount: b.itemCount })
              } catch (baleErr: any) {
                baleError = baleErr.message ?? 'Bale creation failed'
              }
            } else {
              balesGenerated.push({ name: b.name, barcode: b.barcode, price: b.unitPrice, batchNumber: b.batchNumber, itemCount: b.itemCount })
            }
          }
        }

        results.push({
          businessId,
          businessType,
          success: true,
          productsGenerated: productsGenerated.length,
          balesGenerated:    balesGenerated.length,
          stocked:           shouldStock,
          noBaleCategories:  businessType === 'clothing' && baleCount > 0 && refs.baleCategoryIds.length === 0,
          baleError,
          products: productsGenerated,
          bales:    balesGenerated,
        })
      } catch (err: any) {
        results.push({
          businessId,
          businessType,
          success: false,
          error: err.message ?? 'Generation failed',
        })
      }
    }

    return NextResponse.json({ success: true, results })
  } catch (error: any) {
    console.error('[test-barcode-generator/generate]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
