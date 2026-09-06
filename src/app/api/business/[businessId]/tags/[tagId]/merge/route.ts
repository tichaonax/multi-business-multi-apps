import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { isSystemAdmin } from '@/lib/permission-utils'

/**
 * POST /api/business/[businessId]/tags/[tagId]/merge
 * Body: { intoTagId: string }
 * Merges the `[tagId]` tag into `intoTagId`: every image tagged with
 * `[tagId]` gets `intoTagId` instead (skipping images that already have
 * both, since `(imageId, tagId)` is unique), then `[tagId]` itself is
 * deleted. MBM-294 §9.3 tag management surface — Phase 9 follow-up.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string; tagId: string }> }
) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { businessId, tagId } = await params
  const isAdmin = isSystemAdmin(user)
  if (!isAdmin) {
    const membership = await prisma.businessMemberships.findFirst({ where: { userId: user.id, businessId, isActive: true } })
    if (!membership) return NextResponse.json({ error: 'You do not have access to this business' }, { status: 403 })
  }

  const body = await request.json().catch(() => ({}))
  const intoTagId = typeof body.intoTagId === 'string' ? body.intoTagId : ''
  if (!intoTagId) return NextResponse.json({ error: 'intoTagId is required' }, { status: 400 })
  if (intoTagId === tagId) return NextResponse.json({ error: 'Cannot merge a tag into itself' }, { status: 400 })

  const [fromTag, intoTag] = await Promise.all([
    prisma.tags.findUnique({ where: { id: tagId }, select: { businessId: true, name: true } }),
    prisma.tags.findUnique({ where: { id: intoTagId }, select: { businessId: true, name: true } }),
  ])
  if (!fromTag || fromTag.businessId !== businessId) return NextResponse.json({ error: 'Tag not found' }, { status: 404 })
  if (!intoTag || intoTag.businessId !== businessId) return NextResponse.json({ error: 'Target tag not found' }, { status: 404 })

  const mergedCount = await prisma.$transaction(async (tx) => {
    const links = await tx.imageTags.findMany({ where: { tagId }, select: { imageId: true } })
    if (links.length > 0) {
      await tx.imageTags.createMany({
        data: links.map(l => ({ imageId: l.imageId, tagId: intoTagId })),
        skipDuplicates: true,
      })
    }
    await tx.tags.delete({ where: { id: tagId } })
    return links.length
  })

  return NextResponse.json({ success: true, mergedCount, intoTag: { id: intoTagId, name: intoTag.name } })
}
