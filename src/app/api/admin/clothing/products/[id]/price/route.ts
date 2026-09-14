import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { getServerUser } from '@/lib/get-server-user'
import { recordPriceChangeIfDifferent, isPriceChangeReasonRequired } from '@/lib/inventory/price-history'
import { createAuditLog } from '@/lib/audit'

// Validation schema for price update
const PriceUpdateSchema = z.object({
  basePrice: z.number().min(0).nullable(),
  costPrice: z.number().min(0).nullable().optional(),
  originalPrice: z.number().min(0).nullable().optional(),
  discountPercent: z.number().min(0).max(100).nullable().optional(),
  priceChangeReason: z.string().trim().optional(),
})

// PUT - Update product price
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    // Validate input
    const validatedData = PriceUpdateSchema.parse(body)

    // Check if product exists and is clothing type
    const product = await prisma.businessProducts.findUnique({
      where: { id },
      select: { id: true, businessId: true, businessType: true, sku: true, name: true, basePrice: true, costPrice: true }
    })

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      )
    }

    if (product.businessType !== 'clothing') {
      return NextResponse.json(
        { success: false, error: 'Product is not a clothing item' },
        { status: 400 }
      )
    }

    const priceEditor = await getServerUser().catch(() => null)
    const oldBasePrice = product.basePrice ? parseFloat(product.basePrice.toString()) : null
    const oldCostPrice = product.costPrice ? parseFloat(product.costPrice.toString()) : null

    // A reason is required when a REAL previous price is changing — not
    // when setting an initial price (previous price 0/unset).
    if (
      !validatedData.priceChangeReason &&
      (isPriceChangeReasonRequired(oldBasePrice, validatedData.basePrice) || isPriceChangeReasonRequired(oldCostPrice, validatedData.costPrice ?? null))
    ) {
      return NextResponse.json({ success: false, error: 'A reason is required when changing an existing price' }, { status: 400 })
    }

    // Update product price
    const { priceChangeReason, ...priceFields } = validatedData
    const updatedProduct = await prisma.businessProducts.update({
      where: { id },
      data: {
        ...priceFields,
        updatedAt: new Date()
      },
      include: {
        businesses: {
          select: { id: true, name: true }
        },
        business_categories: {
          select: { id: true, name: true, emoji: true }
        }
      }
    })

    await Promise.all([
      recordPriceChangeIfDifferent({
        businessId: product.businessId,
        catalogSource: 'BUSINESS_PRODUCT',
        productRefId: id,
        priceType: 'SELLING',
        oldPrice: oldBasePrice,
        newPrice: validatedData.basePrice,
        changedBy: priceEditor?.id ?? null,
        changeReason: 'MANUAL_EDIT',
        reason: validatedData.priceChangeReason || null,
        productName: product.name,
        changedByName: priceEditor?.name ?? null,
      }),
      validatedData.costPrice !== undefined
        ? recordPriceChangeIfDifferent({
            businessId: product.businessId,
            catalogSource: 'BUSINESS_PRODUCT',
            productRefId: id,
            priceType: 'COST',
            oldPrice: oldCostPrice,
            newPrice: validatedData.costPrice,
            changedBy: priceEditor?.id ?? null,
            changeReason: 'MANUAL_EDIT',
            reason: validatedData.priceChangeReason || null,
            productName: product.name,
            changedByName: priceEditor?.name ?? null,
          })
        : Promise.resolve(),
    ])
    if (priceEditor && validatedData.basePrice !== null && oldBasePrice !== null && validatedData.basePrice !== oldBasePrice) {
      await createAuditLog({
        userId: priceEditor.id,
        action: 'PRODUCT_PRICE_UPDATED',
        entityType: 'Product',
        entityId: id,
        oldValues: { price: oldBasePrice },
        newValues: { price: validatedData.basePrice },
        metadata: { sourceTable: 'BUSINESS_PRODUCT', businessId: product.businessId, productName: product.name, reason: validatedData.priceChangeReason || null },
        businessId: product.businessId,
      }).catch(() => {})
    }

    return NextResponse.json({
      success: true,
      data: updatedProduct,
      message: `Price updated for ${product.sku} - ${product.name}`
    })
  } catch (error: any) {
    console.error('Error updating product price:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid price data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

// PATCH - Quick price update (basePrice only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const { basePrice, priceChangeReason: rawPriceChangeReason } = body
    const priceChangeReason = typeof rawPriceChangeReason === 'string' ? rawPriceChangeReason.trim() : ''

    if (typeof basePrice !== 'number' || basePrice < 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid basePrice value' },
        { status: 400 }
      )
    }

    const existing = await prisma.businessProducts.findUnique({
      where: { id },
      select: { businessId: true, basePrice: true, name: true },
    })
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 })
    }

    const oldBasePriceForPatchCheck = existing.basePrice ? parseFloat(existing.basePrice.toString()) : null
    if (!priceChangeReason && isPriceChangeReasonRequired(oldBasePriceForPatchCheck, basePrice)) {
      return NextResponse.json({ success: false, error: 'A reason is required when changing an existing price' }, { status: 400 })
    }

    const updatedProduct = await prisma.businessProducts.update({
      where: { id },
      data: {
        basePrice,
        updatedAt: new Date()
      },
      select: {
        id: true,
        sku: true,
        name: true,
        basePrice: true,
        updatedAt: true
      }
    })

    const priceEditor = await getServerUser().catch(() => null)
    const oldBasePriceForPatch = existing.basePrice ? parseFloat(existing.basePrice.toString()) : null
    await recordPriceChangeIfDifferent({
      businessId: existing.businessId,
      catalogSource: 'BUSINESS_PRODUCT',
      productRefId: id,
      priceType: 'SELLING',
      oldPrice: oldBasePriceForPatch,
      newPrice: basePrice,
      changedBy: priceEditor?.id ?? null,
      changeReason: 'QUICK_EDIT',
      reason: priceChangeReason || null,
      productName: existing.name,
      changedByName: priceEditor?.name ?? null,
    })
    if (priceEditor && oldBasePriceForPatch !== null && basePrice !== oldBasePriceForPatch) {
      await createAuditLog({
        userId: priceEditor.id,
        action: 'PRODUCT_PRICE_UPDATED',
        entityType: 'Product',
        entityId: id,
        oldValues: { price: oldBasePriceForPatch },
        newValues: { price: basePrice },
        metadata: { sourceTable: 'BUSINESS_PRODUCT', businessId: existing.businessId, productName: updatedProduct.name, reason: priceChangeReason || null },
        businessId: existing.businessId,
      }).catch(() => {})
    }

    return NextResponse.json({
      success: true,
      data: updatedProduct,
      message: 'Price updated successfully'
    })
  } catch (error: any) {
    console.error('Error updating product price:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
