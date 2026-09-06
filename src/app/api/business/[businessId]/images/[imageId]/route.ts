import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { isSystemAdmin } from '@/lib/permission-utils'
import { getStockStatus } from '@/lib/inventory/stock-status'

/**
 * GET /api/business/[businessId]/images/[imageId]
 *
 * Business Image Gallery per-image detail (MBM-294 §9.2, Phase 8) — the
 * reverse lookup: every inventory item within this business that uses this
 * image, with live stock. This is the piece that didn't exist anywhere in
 * the app before this phase (§8.2) — every prior image query went the other
 * direction (product/category → its image).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string; imageId: string }> }
) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { businessId, imageId } = await params
  const isAdmin = isSystemAdmin(user)
  if (!isAdmin) {
    const membership = await prisma.businessMemberships.findFirst({
      where: { userId: user.id, businessId, isActive: true },
    })
    if (!membership) return NextResponse.json({ error: 'You do not have access to this business' }, { status: 403 })
  }

  const image = await prisma.images.findUnique({
    where: { id: imageId },
    select: {
      id: true, mimeType: true, size: true, createdAt: true, businessId: true, uploadedBy: true,
      uploader: { select: { name: true } },
      image_tags: { select: { tags: { select: { id: true, name: true } } } },
    },
  })
  if (!image) return NextResponse.json({ error: 'Image not found' }, { status: 404 })

  const links = await prisma.productImages.findMany({
    where: { imageId, business_products: { businessId } },
    select: {
      id: true,
      isPrimary: true,
      business_products: {
        select: {
          id: true, name: true, sku: true, basePrice: true,
          product_variants: { select: { id: true, name: true, sku: true, price: true, stockQuantity: true, reorderLevel: true } },
        },
      },
    },
  })

  // Visible to this business only if it's either directly owned by this
  // business or actually used by one of this business's own products —
  // otherwise a business could probe another business's private images by id.
  if (image.businessId !== businessId && links.length === 0) {
    return NextResponse.json({ error: 'Image not found' }, { status: 404 })
  }

  const linkedItems = links.map(link => {
    const p = link.business_products
    const stockQuantity = p.product_variants.reduce((sum, v) => sum + v.stockQuantity, 0)
    const reorderLevel = p.product_variants.reduce((max, v) => Math.max(max, v.reorderLevel), 0)
    const stock = getStockStatus({ stockQuantity, reorderLevel })
    // Product's own base price, or its cheapest variant override if it has one —
    // matches the same "variant price wins if set" convention used at POS.
    const priceVariant = p.product_variants.find(v => v.price != null)
    const price = Number(priceVariant?.price ?? p.basePrice ?? 0)
    return {
      productImageId: link.id,
      productId: p.id,
      productName: p.name,
      sku: p.sku,
      price,
      // Which variant the displayed price actually came from (if any) — the
      // click-to-edit-price dialog needs this to PATCH the right record
      // instead of the product's basePrice.
      priceVariantId: priceVariant?.id ?? null,
      isPrimary: link.isPrimary,
      stockQuantity,
      stockStatus: stock.status,
      stockLabel: stock.label,
      variants: p.product_variants.map(v => ({ id: v.id, name: v.name, sku: v.sku, stockQuantity: v.stockQuantity })),
    }
  })

  return NextResponse.json({
    success: true,
    image: {
      id: image.id,
      url: `/api/images/${image.id}`,
      mimeType: image.mimeType,
      size: image.size,
      createdAt: image.createdAt,
      uploadedBy: image.uploadedBy,
      uploaderName: image.uploader?.name ?? null,
      tags: image.image_tags.map(t => t.tags),
    },
    linkedItems,
  })
}
