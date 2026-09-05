import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { hasPermission } from '@/lib/permission-utils'

// PATCH /api/grocery/inventory/[id]/display-image
// Body: { imageId: string | null }
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const existing = await prisma.barcodeInventoryItems.findUnique({
    where: { id },
    select: {
      businessId: true,
      categoryId: true,
      subcategoryId: true,
      domainId: true,
      business_category: { select: { businessType: true } },
    },
  })
  if (!existing) return NextResponse.json({ error: 'Item not found' }, { status: 404 })

  const canEdit = user.role === 'admin' ||
    hasPermission(user, 'canManageInventory', existing.businessId) ||
    hasPermission(user, 'canQuickEditPOSItems', existing.businessId)
  if (!canEdit) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { imageId } = await req.json()

  const item = await prisma.barcodeInventoryItems.update({
    where: { id },
    data: { imageId: imageId ?? null },
    select: { id: true, imageId: true },
  })

  // A freshly uploaded (or freshly re-used) display image is also added to
  // the category's reference-image pool (MBM-294 §3.3/§3.4), so it becomes
  // (or stays) reusable via "Choose from Gallery" for other items in the
  // same category. Skipped if a row already exists for this image+category
  // pair — e.g. it was just picked FROM that same gallery.
  if (imageId && existing.categoryId) {
    const already = await prisma.categoryReferenceImages.findFirst({
      where: { imageId, categoryId: existing.categoryId },
      select: { id: true },
    })
    if (!already) {
      await prisma.categoryReferenceImages.create({
        data: {
          imageId,
          categoryId: existing.categoryId,
          subcategoryId: existing.subcategoryId ?? null,
          domainId: existing.domainId ?? null,
          businessType: existing.business_category?.businessType || 'grocery',
          isUserUploaded: true,
          createdBy: user.id,
        },
      }).catch(() => {})
    }
  }

  return NextResponse.json({ success: true, item })
}
