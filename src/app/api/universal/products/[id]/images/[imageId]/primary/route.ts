import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { hasPermission } from '@/lib/permission-utils'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string; imageId: string }> }) {
  const { id: productId, imageId } = await params
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Ensure image belongs to product
    const img = await prisma.productImages.findUnique({ where: { id: imageId } })
    if (!img || img.productId !== productId) return NextResponse.json({ error: 'Image not found for product' }, { status: 404 })

    const product = await prisma.businessProducts.findUnique({ where: { id: productId }, select: { businessId: true } })
    const canEdit = product && (
      user.role === 'admin' ||
      hasPermission(user, 'canManageMenu', product.businessId) ||
      hasPermission(user, 'canManageInventory', product.businessId) ||
      hasPermission(user, 'canQuickEditPOSItems', product.businessId)
    )
    if (!canEdit) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // unset other images
    await prisma.productImages.updateMany({ where: { productId }, data: { isPrimary: false } })

  const updated = await prisma.productImages.update({ where: { id: imageId }, data: { isPrimary: true, updatedAt: new Date() } })

    return NextResponse.json({ success: true, data: updated })
  } catch (err) {
    console.error('Set primary image error:', err)
    return NextResponse.json({ success: false, error: 'Failed to set primary image' }, { status: 500 })
  }
}
