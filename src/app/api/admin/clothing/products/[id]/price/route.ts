import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { getServerUser } from '@/lib/get-server-user'
import { recordPriceChangeIfDifferent } from '@/lib/inventory/price-history'
import { createAuditLog } from '@/lib/audit'

// Validation schema for price update
const PriceUpdateSchema = z.object({
  basePrice: z.number().min(0).nullable(),
  costPrice: z.number().min(0).nullable().optional(),
  originalPrice: z.number().min(0).nullable().optional(),
  discountPercent: z.number().min(0).max(100).nullable().optional()
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

    // Update product price
    const updatedProduct = await prisma.businessProducts.update({
      where: { id },
      data: {
        ...validatedData,
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

    const priceEditor = await getServerUser().catch(() => null)
    const oldBasePrice = product.basePrice ? parseFloat(product.basePrice.toString()) : null
    const oldCostPrice = product.costPrice ? parseFloat(product.costPrice.toString()) : null
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
        metadata: { sourceTable: 'BUSINESS_PRODUCT', businessId: product.businessId, productName: product.name },
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

    const { basePrice } = body

    if (typeof basePrice !== 'number' || basePrice < 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid basePrice value' },
        { status: 400 }
      )
    }

    const existing = await prisma.businessProducts.findUnique({
      where: { id },
      select: { businessId: true, basePrice: true },
    })
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 })
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
    })
    if (priceEditor && oldBasePriceForPatch !== null && basePrice !== oldBasePriceForPatch) {
      await createAuditLog({
        userId: priceEditor.id,
        action: 'PRODUCT_PRICE_UPDATED',
        entityType: 'Product',
        entityId: id,
        oldValues: { price: oldBasePriceForPatch },
        newValues: { price: basePrice },
        metadata: { sourceTable: 'BUSINESS_PRODUCT', businessId: existing.businessId, productName: updatedProduct.name },
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
