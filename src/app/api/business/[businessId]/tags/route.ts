import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { isSystemAdmin } from '@/lib/permission-utils'

/**
 * GET /api/business/[businessId]/tags
 * Lists the union of this business's own tags and the shared system
 * vocabulary for its business type (MBM-295) — powers the gallery filter's
 * autocomplete (MBM-294 §9.3) and the Tag Management modal.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ businessId: string }> }) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { businessId } = await params
  const isAdmin = isSystemAdmin(user)
  if (!isAdmin) {
    const membership = await prisma.businessMemberships.findFirst({ where: { userId: user.id, businessId, isActive: true } })
    if (!membership) return NextResponse.json({ error: 'You do not have access to this business' }, { status: 403 })
  }

  const business = await prisma.businesses.findUnique({ where: { id: businessId }, select: { type: true } })
  if (!business) return NextResponse.json({ error: 'Business not found' }, { status: 404 })

  const tags = await prisma.tags.findMany({
    where: { OR: [{ businessId }, { businessId: null, businessType: business.type }] },
    select: {
      id: true, name: true, emoji: true, groupLabel: true, businessId: true,
      _count: { select: { image_tags: true, product_tags: true } },
    },
    orderBy: [{ groupLabel: 'asc' }, { name: 'asc' }],
  })

  return NextResponse.json({
    success: true,
    tags: tags.map(t => ({
      id: t.id,
      name: t.name,
      emoji: t.emoji,
      groupLabel: t.groupLabel,
      isSystem: t.businessId === null,
      imageCount: t._count.image_tags,
      productCount: t._count.product_tags,
    })),
  })
}

/**
 * POST /api/business/[businessId]/tags
 * Body: { name: string, emoji?: string }
 * Creates a business-owned custom tag directly (not attached to any
 * image/product yet) — the Tag Management modal's own "+ New Tag" flow
 * (MBM-295). Reuses an existing tag by name if one already fits (system
 * vocabulary for this business type, then this business's own tags) instead
 * of creating a duplicate.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ businessId: string }> }) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { businessId } = await params
  const isAdmin = isSystemAdmin(user)
  if (!isAdmin) {
    const membership = await prisma.businessMemberships.findFirst({ where: { userId: user.id, businessId, isActive: true } })
    if (!membership) return NextResponse.json({ error: 'You do not have access to this business' }, { status: 403 })
  }

  const business = await prisma.businesses.findUnique({ where: { id: businessId }, select: { type: true } })
  if (!business) return NextResponse.json({ error: 'Business not found' }, { status: 404 })

  const body = await request.json().catch(() => ({}))
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const emoji = typeof body.emoji === 'string' && body.emoji.trim() ? body.emoji.trim() : undefined
  if (!name) return NextResponse.json({ error: 'Tag name is required' }, { status: 400 })

  const existing = await prisma.tags.findFirst({
    where: {
      name: { equals: name, mode: 'insensitive' },
      OR: [{ businessId }, { businessId: null, businessType: business.type }],
    },
  })
  if (existing) {
    return NextResponse.json({ error: `A tag named "${existing.name}" already exists` }, { status: 409 })
  }

  const tag = await prisma.tags.create({
    data: { businessId, name, createdBy: user.id, ...(emoji ? { emoji } : {}) },
  })
  return NextResponse.json({ success: true, tag })
}
