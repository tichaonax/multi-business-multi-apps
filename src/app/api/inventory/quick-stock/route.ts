import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { isSystemAdmin, canAddInventoryFromModal } from '@/lib/permission-utils'
import { generateSKU } from '@/lib/sku-generator'
import { randomUUID } from 'crypto'

/**
 * POST /api/inventory/quick-stock
 *
 * MBM-133: Creates a brand-new product, variant, barcode, and initial PURCHASE_RECEIVED
 * stock movement in a single transaction. Used by QuickStockFromScanModal (Create New tab)
 * when a barcode scan returns no match.
 *
 * Input:
 *   businessId        — target business
 *   businessType      — e.g. 'clothing' | 'grocery' | 'hardware' | 'restaurant'
 *   name              — product name (required)
 *   categoryId        — existing category id (required)
 *   subcategoryId?    — optional subcategory id
 *   supplierId?       — optional supplier id
 *   description?      — optional description
 *   barcode           — the scanned barcode string (required)
 *   barcodeType?      — BarcodeType enum value (default: CUSTOM)
 *   basePrice         — sell price; 0 is allowed when isFreeItem = true (required)
 *   isFreeItem?       — when true, basePrice of 0 is accepted
 *   costPrice?        — optional cost price
 *   initialQuantity   — must be >= 1 (required)
 *   sku?              — optional; auto-generated if omitted
 *   attributes?       — optional JSON (e.g. { size, color } for clothing)
 *
 * Returns: { productId, variantId, product }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      businessId,
      businessType,
      name,
      categoryId,
      subcategoryId,
      supplierId,
      description,
      barcode,
      barcodeType,
      basePrice,
      isFreeItem,
      costPrice,
      initialQuantity,
      sku: skuInput,
      attributes,
      expiryDate,
    } = body

    // ── Validate required fields ──────────────────────────────────────────────
    if (!businessId || !businessType || !name || !barcode || !categoryId) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: businessId, businessType, name, barcode, categoryId' },
        { status: 400 }
      )
    }

    const parsedBasePrice = parseFloat(basePrice ?? 0)
    const parsedInitialQty = parseInt(initialQuantity ?? 0, 10)

    if (!isFreeItem && parsedBasePrice <= 0) {
      return NextResponse.json(
        { success: false, error: 'Sell price must be greater than $0. Check "Free Item" if this item has no charge.' },
        { status: 400 }
      )
    }

    if (parsedInitialQty < 1) {
      return NextResponse.json(
        { success: false, error: 'Initial quantity must be at least 1.' },
        { status: 400 }
      )
    }

    // ── Permission check ─────────────────────────────────────────────────────
    if (!canAddInventoryFromModal(user, businessId)) {
      return NextResponse.json(
        { success: false, error: 'You do not have permission to add inventory to this business.' },
        { status: 403 }
      )
    }

    // ── Verify business exists and user has access ────────────────────────────
    let business = null
    if (isSystemAdmin(user)) {
      business = await prisma.businesses.findFirst({ where: { id: businessId, type: businessType } })
    } else {
      business = await prisma.businesses.findFirst({
        where: {
          id: businessId,
          type: businessType,
          business_memberships: { some: { userId: user.id, isActive: true } },
        },
      })
    }
    if (!business) {
      return NextResponse.json(
        { success: false, error: 'Business not found or access denied.' },
        { status: 404 }
      )
    }

    // ── Validate category belongs to this business ────────────────────────────
    const category = await prisma.businessCategories.findFirst({
      where: { id: categoryId, businessType },
    })
    if (!category) {
      return NextResponse.json(
        { success: false, error: 'Category not found for this business type.' },
        { status: 400 }
      )
    }

    // ── Validate subcategory if provided ─────────────────────────────────────
    if (subcategoryId) {
      const sub = await prisma.inventorySubcategories.findFirst({
        where: { id: subcategoryId, categoryId },
      })
      if (!sub) {
        return NextResponse.json(
          { success: false, error: 'Subcategory does not belong to the selected category.' },
          { status: 400 }
        )
      }
    }

    // ── Validate supplier if provided ─────────────────────────────────────────
    if (supplierId) {
      const supplier = await prisma.businessSuppliers.findFirst({
        where: { id: supplierId, businessType },
      })
      if (!supplier) {
        return NextResponse.json(
          { success: false, error: 'Supplier not found for this business type.' },
          { status: 400 }
        )
      }
    }

    // ── Check barcode not already in this business ────────────────────────────
    const existing = await prisma.productBarcodes.findFirst({
      where: { code: barcode, businessId },
      include: { business_product: { select: { id: true, name: true } } },
    })
    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error: `This barcode is already linked to "${existing.business_product?.name ?? 'a product'}" in this business.`,
          code: 'DUPLICATE_BARCODE',
          existingProductId: existing.business_product?.id ?? null,
          existingProductName: existing.business_product?.name ?? null,
          existingVariantId: existing.variantId ?? null,
        },
        { status: 409 }
      )
    }

    // ── Auto-generate SKU if not provided ─────────────────────────────────────
    let sku = skuInput || null
    if (!sku) {
      try {
        sku = await generateSKU(prisma, {
          productName: name,
          category: category.name,
          businessId,
          businessType,
        })
      } catch {
        // Non-fatal — proceed without SKU
      }
    } else {
      // Verify SKU uniqueness
      const skuConflict = await prisma.businessProducts.findFirst({
        where: { businessId, sku },
      })
      if (skuConflict) {
        // Auto-append timestamp suffix to avoid conflict
        sku = `${sku}-${Date.now().toString().slice(-4)}`
      }
    }

    // ── Transaction: product → variant → barcode → stock movement ─────────────
    const result = await prisma.$transaction(async (tx: any) => {
      const product = await tx.businessProducts.create({
        data: {
          businessId,
          businessType,
          name,
          description: description || '',
          sku,
          categoryId,
          subcategoryId: subcategoryId || null,
          supplierId: supplierId || null,
          basePrice: parsedBasePrice,
          costPrice: costPrice ? parseFloat(costPrice) : null,
          isActive: true,
          isInventoryTracked: true,
          isProductTemplate: false,
          attributes: attributes || null,
          updatedAt: new Date(),
        },
        include: {
          business_categories: true,
          business_suppliers: true,
        },
      })

      const variantName =
        attributes?.size
          ? `${attributes.size}${attributes.color ? ' - ' + attributes.color : ''}`
          : 'Default'

      const variant = await tx.productVariants.create({
        data: {
          productId: product.id,
          sku: sku || `${barcode}-001`,
          name: variantName,
          price: parsedBasePrice,
          stockQuantity: parsedInitialQty,
          isActive: true,
          attributes: attributes || null,
          updatedAt: new Date(),
        },
      })

      await tx.productBarcodes.create({
        data: {
          code: barcode,
          type: (barcodeType as any) || 'CUSTOM',
          isPrimary: true,
          isUniversal: false,
          isActive: true,
          label: 'Primary Barcode',
          businessId,
          productId: product.id,
          variantId: variant.id,
        },
      })

      // Always create PURCHASE_RECEIVED stock movement (qty >= 1 is enforced above)
      await tx.businessStockMovements.create({
        data: {
          businessId,
          productVariantId: variant.id,
          businessProductId: product.id,
          movementType: 'PURCHASE_RECEIVED',
          quantity: parsedInitialQty,
          unitCost: costPrice ? parseFloat(costPrice) : null,
          reference: 'Barcode Scan — Quick Stock',
          reason: 'New product added via barcode scan',
          businessType,
        },
      })

      if (expiryDate) {
        await tx.itemExpiryBatch.create({
          data: {
            businessId,
            productVariantId: variant.id,
            quantity: parsedInitialQty,
            expiryDate: new Date(expiryDate),
            createdBy: user.id,
          },
        })
      }

      return { product, variant }
    })

    return NextResponse.json({
      success: true,
      productId: result.product.id,
      variantId: result.variant.id,
      product: {
        id: result.product.id,
        name: result.product.name,
        sku: result.product.sku,
        basePrice: parseFloat(result.product.basePrice.toString()),
        category: result.product.business_categories?.name,
        supplier: result.product.business_suppliers?.name || null,
        variantId: result.variant.id,
        stockQuantity: result.variant.stockQuantity,
      },
    })
  } catch (error) {
    console.error('[quick-stock] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
