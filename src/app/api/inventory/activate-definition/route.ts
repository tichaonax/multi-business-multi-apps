import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { isSystemAdmin, canAddInventoryFromModal } from '@/lib/permission-utils'

/**
 * POST /api/inventory/activate-definition
 *
 * MBM-133: Links a scanned barcode to an existing isProductTemplate product, sets its price,
 * increments stock, records a PURCHASE_RECEIVED movement, and clears the template flag.
 * Used by QuickStockFromScanModal (Link Existing tab) for clothing businesses.
 *
 * Input:
 *   businessId      — target business (required)
 *   businessType    — e.g. 'clothing' (required)
 *   productId       — existing BusinessProducts.id (required)
 *   variantId?      — specific variant to activate; first variant used if omitted
 *   barcode         — scanned barcode string (required)
 *   barcodeType?    — BarcodeType enum value (default: CUSTOM)
 *   basePrice       — sell price; must be > 0 (required)
 *   costPrice?      — optional cost price
 *   initialQuantity — must be >= 1 (required)
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
      productId,
      variantId: variantIdInput,
      barcode,
      barcodeType,
      basePrice,
      costPrice,
      initialQuantity,
    } = body

    // ── Validate required fields ──────────────────────────────────────────────
    if (!businessId || !businessType || !productId || !barcode) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: businessId, businessType, productId, barcode' },
        { status: 400 }
      )
    }

    const parsedBasePrice = parseFloat(basePrice ?? 0)
    const parsedInitialQty = parseInt(initialQuantity ?? 0, 10)

    if (parsedBasePrice <= 0) {
      return NextResponse.json(
        { success: false, error: 'Sell price must be greater than $0 to activate a product definition.' },
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

    // ── Verify product belongs to this business ───────────────────────────────
    const product = await prisma.businessProducts.findFirst({
      where: { id: productId, businessId },
      include: { product_variants: true, business_categories: true, business_suppliers: true },
    })
    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Product not found in this business.' },
        { status: 404 }
      )
    }

    // ── Check barcode not already in this business ────────────────────────────
    const existingBarcode = await prisma.productBarcodes.findFirst({
      where: { code: barcode, businessId },
      include: { business_product: { select: { id: true, name: true } } },
    })
    if (existingBarcode) {
      return NextResponse.json(
        {
          success: false,
          error: `This barcode is already linked to "${existingBarcode.business_product?.name ?? 'another product'}" in this business.`,
          code: 'DUPLICATE_BARCODE',
          existingProductId: existingBarcode.business_product?.id ?? null,
          existingProductName: existingBarcode.business_product?.name ?? null,
          existingVariantId: existingBarcode.variantId ?? null,
        },
        { status: 409 }
      )
    }

    // ── Resolve variant ───────────────────────────────────────────────────────
    let variant = variantIdInput
      ? product.product_variants.find((v: any) => v.id === variantIdInput) ?? null
      : product.product_variants[0] ?? null

    // ── Transaction: barcode + variant upsert + product update + stock movement ──
    const result = await prisma.$transaction(async (tx: any) => {
      // Link barcode
      await tx.productBarcodes.create({
        data: {
          code: barcode,
          type: (barcodeType as any) || 'CUSTOM',
          isPrimary: true,
          isUniversal: false,
          isActive: true,
          label: 'Primary Barcode',
          businessId,
          productId,
          variantId: variant?.id ?? null,
        },
      })

      if (variant) {
        // Update existing variant: set price, increment stock
        variant = await tx.productVariants.update({
          where: { id: variant.id },
          data: {
            price: parsedBasePrice,
            stockQuantity: { increment: parsedInitialQty },
            updatedAt: new Date(),
          },
        })
      } else {
        // Create a default variant (product had no variants — edge case)
        variant = await tx.productVariants.create({
          data: {
            productId,
            sku: product.sku || `${barcode}-001`,
            name: 'Default',
            price: parsedBasePrice,
            stockQuantity: parsedInitialQty,
            isActive: true,
            updatedAt: new Date(),
          },
        })
      }

      // Clear template flag and set live product fields
      const updatedProduct = await tx.businessProducts.update({
        where: { id: productId },
        data: {
          basePrice: parsedBasePrice,
          costPrice: costPrice ? parseFloat(costPrice) : undefined,
          isProductTemplate: false,
          isInventoryTracked: true,
          updatedAt: new Date(),
        },
        include: {
          business_categories: true,
          business_suppliers: true,
        },
      })

      // PURCHASE_RECEIVED stock movement
      await tx.businessStockMovements.create({
        data: {
          businessId,
          productVariantId: variant.id,
          businessProductId: productId,
          movementType: 'PURCHASE_RECEIVED',
          quantity: parsedInitialQty,
          unitCost: costPrice ? parseFloat(costPrice) : null,
          reference: 'Barcode Scan — Link Existing',
          reason: 'Product definition activated via barcode scan',
          businessType,
        },
      })

      return { product: updatedProduct, variant }
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
    console.error('[activate-definition] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
