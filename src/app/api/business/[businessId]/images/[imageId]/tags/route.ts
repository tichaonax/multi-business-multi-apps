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
 * Body: { name: string }
 * Attaches a tag to an image, creating the business's own `Tags` row for
 * that name if it doesn't exist yet (MBM-294 §9.1/§9.3).
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
  if (!name) return NextResponse.json({ error: 'Tag name is required' }, { status: 400 })

  let tag = await prisma.tags.findFirst({ where: { businessId, name: { equals: name, mode: 'insensitive' } } })
  if (!tag) {
    tag = await prisma.tags.create({ data: { businessId, name, createdBy: user.id } })
  }

  await prisma.imageTags.upsert({
    where: { imageId_tagId: { imageId, tagId: tag.id } },
    update: {},
    create: { imageId, tagId: tag.id },
  })

  return NextResponse.json({ success: true, tag })
}
