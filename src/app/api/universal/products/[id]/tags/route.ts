import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { hasPermission } from '@/lib/permission-utils'

async function canEditProductTags(businessId: string): Promise<boolean> {
  const user = await getServerUser()
  if (!user) return false
  return user.role === 'admin' ||
    hasPermission(user, 'canManageMenu', businessId) ||
    hasPermission(user, 'canManageInventory', businessId) ||
    hasPermission(user, 'canQuickEditPOSItems', businessId)
}

/**
 * POST /api/universal/products/[id]/tags
 * Body: { name: string, emoji?: string }
 * Attaches a tag to a product (MBM-295 — tags weren't attachable to
 * inventory at all before this, only to images). Reuses an existing tag by
 * name if one already fits — the shared system vocabulary for this
 * business's type first, then this business's own custom tags — and only
 * creates a brand-new business-owned tag if neither exists, same convention
 * `images/[imageId]/tags` already uses.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: productId } = await params
  const product = await prisma.businessProducts.findUnique({ where: { id: productId }, select: { businessId: true, businessType: true } })
  if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 })
  if (!(await canEditProductTags(product.businessId))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json().catch(() => ({}))
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const emoji = typeof body.emoji === 'string' && body.emoji.trim() ? body.emoji.trim() : undefined
  if (!name) return NextResponse.json({ error: 'Tag name is required' }, { status: 400 })

  const user = await getServerUser()
  let tag = await prisma.tags.findFirst({
    where: {
      name: { equals: name, mode: 'insensitive' },
      OR: [{ businessId: product.businessId }, { businessId: null, businessType: product.businessType }],
    },
  })
  if (!tag) {
    tag = await prisma.tags.create({ data: { businessId: product.businessId, name, createdBy: user!.id, ...(emoji ? { emoji } : {}) } })
  }

  await prisma.productTags.upsert({
    where: { productId_tagId: { productId, tagId: tag.id } },
    update: {},
    create: { productId, tagId: tag.id },
  })

  return NextResponse.json({ success: true, tag })
}

/**
 * DELETE /api/universal/products/[id]/tags
 * Body: { tagId: string }
 * Detaches a tag from a product — never deletes the `Tags` row itself, same
 * convention `images/[imageId]/tags/[tagId]` already uses.
 */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: productId } = await params
  const product = await prisma.businessProducts.findUnique({ where: { id: productId }, select: { businessId: true } })
  if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 })
  if (!(await canEditProductTags(product.businessId))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json().catch(() => ({}))
  const tagId = typeof body.tagId === 'string' ? body.tagId : ''
  if (!tagId) return NextResponse.json({ error: 'tagId is required' }, { status: 400 })

  await prisma.productTags.deleteMany({ where: { productId, tagId } })
  return NextResponse.json({ success: true })
}

/**
 * GET /api/universal/products/[id]/tags
 * Lists the tags currently attached to a product — used by the stocking
 * screens' tag picker to show current state.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: productId } = await params
  const links = await prisma.productTags.findMany({
    where: { productId },
    select: { tags: { select: { id: true, name: true, emoji: true, groupLabel: true } } },
  })

  return NextResponse.json({ success: true, tags: links.map(l => l.tags) })
}
