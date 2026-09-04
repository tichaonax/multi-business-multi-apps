import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { getServerUser } from '@/lib/get-server-user'
import { hasPermission } from '@/lib/permission-utils'
import { createAuditLog } from '@/lib/audit'

const BodySchema = z.object({ price: z.number().gt(0) })

// PATCH - Update a single ProductVariant's price without touching sibling
// variants (MBM-292). Every product's card price is resolved as
// `variant.price || product.basePrice` throughout the app (restaurant, grocery,
// clothing) — editing only `businessProducts.basePrice` via the general PUT
// endpoint has no visible effect once a variant has its own stored price, so
// POS Quick-Edit's per-variant price button needs this instead. Also keeps
// `basePrice` in sync so nothing that reads it directly goes stale.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; variantId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id, variantId } = await params
    const body = await request.json()
    const parsed = BodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'A price greater than 0 is required' }, { status: 400 })
    }
    const { price: newPrice } = parsed.data

    const product = await prisma.businessProducts.findUnique({ where: { id } })
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    const canEdit = user.role === 'admin' ||
      hasPermission(user, 'canManageMenu', product.businessId) ||
      hasPermission(user, 'canManageInventory', product.businessId) ||
      hasPermission(user, 'canQuickEditPOSItems', product.businessId)
    if (!canEdit) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const variant = await prisma.productVariants.findFirst({ where: { id: variantId, productId: id } })
    if (!variant) {
      return NextResponse.json({ error: 'Variant not found on this product' }, { status: 404 })
    }

    const oldPrice = Number(variant.price)

    await prisma.$transaction([
      prisma.productVariants.update({
        where: { id: variantId },
        data: { price: newPrice, updatedAt: new Date() },
      }),
      prisma.businessProducts.update({
        where: { id },
        data: { basePrice: newPrice },
      }),
    ])

    if (newPrice !== oldPrice) {
      await createAuditLog({
        userId: user.id,
        action: 'PRODUCT_PRICE_UPDATED',
        entityType: 'Product',
        entityId: id,
        oldValues: { price: oldPrice },
        newValues: { price: newPrice },
        metadata: {
          sourceTable: 'BUSINESS_PRODUCT',
          businessId: product.businessId,
          productName: product.name,
          variantId,
          variantName: variant.name,
        },
        businessId: product.businessId,
      })
    }

    return NextResponse.json({ success: true, data: { price: newPrice } })
  } catch (error) {
    console.error('Error updating variant price:', error)
    return NextResponse.json({ error: 'Failed to update price' }, { status: 500 })
  }
}
