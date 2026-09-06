import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { isSystemAdmin } from '@/lib/permission-utils'

/**
 * DELETE /api/business/[businessId]/images/[imageId]/tags/[tagId]
 * Detaches a tag from an image (does not delete the `Tags` row itself —
 * rename/merge/delete of a tag is a separate admin surface, MBM-294 §9.3).
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string; imageId: string; tagId: string }> }
) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { businessId, imageId, tagId } = await params
  const isAdmin = isSystemAdmin(user)
  if (!isAdmin) {
    const membership = await prisma.businessMemberships.findFirst({ where: { userId: user.id, businessId, isActive: true } })
    if (!membership) return NextResponse.json({ error: 'You do not have access to this business' }, { status: 403 })
  }

  const tag = await prisma.tags.findUnique({ where: { id: tagId }, select: { businessId: true } })
  if (!tag || tag.businessId !== businessId) return NextResponse.json({ error: 'Tag not found' }, { status: 404 })

  await prisma.imageTags.deleteMany({ where: { imageId, tagId } })

  return NextResponse.json({ success: true })
}
