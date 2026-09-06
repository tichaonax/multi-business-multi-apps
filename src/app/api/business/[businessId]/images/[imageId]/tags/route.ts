import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { isSystemAdmin } from '@/lib/permission-utils'

async function assertImageVisible(businessId: string, imageId: string) {
  const image = await prisma.images.findUnique({ where: { id: imageId }, select: { id: true, businessId: true } })
  if (!image) return false
  if (image.businessId === businessId) return true
  const link = await prisma.productImages.findFirst({ where: { imageId, business_products: { businessId } }, select: { id: true } })
  return !!link
}

/**
 * POST /api/business/[businessId]/images/[imageId]/tags
 * Body: { name: string, emoji?: string }
 * Attaches a tag to an image. Reuses an existing tag by name if one already
 * fits — checking the shared system vocabulary for this business's type
 * first (MBM-295), then this business's own custom tags — and only creates
 * a brand-new business-owned tag if neither exists (MBM-294 §9.1/§9.3).
 * `emoji` is only used for a genuinely new tag; omitted → schema default.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string; imageId: string }> }
) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { businessId, imageId } = await params
  const isAdmin = isSystemAdmin(user)
  if (!isAdmin) {
    const membership = await prisma.businessMemberships.findFirst({ where: { userId: user.id, businessId, isActive: true } })
    if (!membership) return NextResponse.json({ error: 'You do not have access to this business' }, { status: 403 })
  }

  if (!(await assertImageVisible(businessId, imageId))) {
    return NextResponse.json({ error: 'Image not found' }, { status: 404 })
  }

  const body = await request.json().catch(() => ({}))
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const emoji = typeof body.emoji === 'string' && body.emoji.trim() ? body.emoji.trim() : undefined
  if (!name) return NextResponse.json({ error: 'Tag name is required' }, { status: 400 })

  const business = await prisma.businesses.findUnique({ where: { id: businessId }, select: { type: true } })

  let tag = await prisma.tags.findFirst({
    where: {
      name: { equals: name, mode: 'insensitive' },
      OR: [{ businessId }, { businessId: null, businessType: business?.type }],
    },
  })
  if (!tag) {
    tag = await prisma.tags.create({ data: { businessId, name, createdBy: user.id, ...(emoji ? { emoji } : {}) } })
  }

  await prisma.imageTags.upsert({
    where: { imageId_tagId: { imageId, tagId: tag.id } },
    update: {},
    create: { imageId, tagId: tag.id },
  })

  return NextResponse.json({ success: true, tag })
}
