import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { hasPermission } from '@/lib/permission-utils'

async function canEditProductImages(businessId: string): Promise<boolean> {
  const user = await getServerUser()
  if (!user) return false
  return user.role === 'admin' ||
    hasPermission(user, 'canManageMenu', businessId) ||
    hasPermission(user, 'canManageInventory', businessId) ||
    hasPermission(user, 'canQuickEditPOSItems', businessId)
}

/**
 * POST /api/universal/products/[id]/images/from-gallery
 * Body: { imageIds: string[] }
 *
 * Attaches existing `Images` rows (picked from the category gallery, MBM-294
 * §3.3) to this product — by reference, never duplicating the blob. The
 * first id becomes the product's primary image, matching the Quick-Edit
 * dialog's single-thumbnail "replace" semantics; the rest are added as
 * additional (non-primary) product images.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: productId } = await params
    const product = await prisma.businessProducts.findUnique({ where: { id: productId } })
    if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    if (!(await canEditProductImages(product.businessId))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const requestedIds: string[] = Array.isArray(body.imageIds) ? body.imageIds.filter((v: any) => typeof v === 'string') : []
    if (requestedIds.length === 0) {
      return NextResponse.json({ error: 'No images selected' }, { status: 400 })
    }

    const existingImages = await prisma.images.findMany({ where: { id: { in: requestedIds } }, select: { id: true } })
    const validIds = requestedIds.filter(id => existingImages.some(img => img.id === id))
    if (validIds.length === 0) {
      return NextResponse.json({ error: 'Selected images no longer exist' }, { status: 400 })
    }

    // Skip images this product already has — creating a second ProductImages
    // row for the same (productId, imageId) pair would be a literal duplicate,
    // and demoting the existing primary below would be wrong if nothing new
    // actually ends up getting attached.
    const existingLinks = await prisma.productImages.findMany({
      where: { productId, imageId: { in: validIds } },
      select: { imageId: true },
    })
    const alreadyLinked = new Set(existingLinks.map(l => l.imageId))
    const newIds = validIds.filter(id => !alreadyLinked.has(id))

    if (newIds.length === 0) {
      return NextResponse.json({ error: 'This image is already attached to that product' }, { status: 409 })
    }

    const existingCount = await prisma.productImages.count({ where: { productId } })
    await prisma.productImages.updateMany({ where: { productId, isPrimary: true }, data: { isPrimary: false } })

    for (let i = 0; i < newIds.length; i++) {
      await prisma.productImages.create({
        data: {
          productId,
          imageId: newIds[i],
          imageUrl: `/api/images/${newIds[i]}`,
          isPrimary: i === 0,
          sortOrder: existingCount + i,
          imageSize: 'MEDIUM',
          businessType: product.businessType || 'restaurant',
          updatedAt: new Date(),
        },
      })
    }

    return NextResponse.json({
      success: true,
      primaryImageUrl: `/api/images/${newIds[0]}`,
      skipped: validIds.length - newIds.length,
    })
  } catch (error) {
    console.error('Attach gallery images error:', error)
    return NextResponse.json({ success: false, error: 'Failed to attach images' }, { status: 500 })
  }
}
