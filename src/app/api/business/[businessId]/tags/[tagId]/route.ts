import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { isSystemAdmin } from '@/lib/permission-utils'

async function assertOwnedTag(businessId: string, tagId: string) {
  const tag = await prisma.tags.findUnique({ where: { id: tagId }, select: { businessId: true } })
  return tag && tag.businessId === businessId
}

/**
 * PATCH /api/business/[businessId]/tags/[tagId]
 * Body: { name: string }
 * Renames a tag (MBM-294 §9.3 tag management surface — Phase 9 follow-up).
 */
export async function PATCH(
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

  if (!(await assertOwnedTag(businessId, tagId))) {
    return NextResponse.json({ error: 'Tag not found' }, { status: 404 })
  }

  const body = await request.json().catch(() => ({}))
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  if (!name) return NextResponse.json({ error: 'Tag name is required' }, { status: 400 })

  const clash = await prisma.tags.findFirst({
    where: { businessId, name: { equals: name, mode: 'insensitive' }, id: { not: tagId } },
  })
  if (clash) {
    return NextResponse.json({ error: `A tag named "${name}" already exists — merge into it instead of renaming to a duplicate` }, { status: 409 })
  }

  const tag = await prisma.tags.update({ where: { id: tagId }, data: { name } })
  return NextResponse.json({ success: true, tag })
}

/**
 * DELETE /api/business/[businessId]/tags/[tagId]
 * Deletes the tag entirely (not just detaching from one image) — `ImageTags`
 * rows cascade automatically via the schema's onDelete: Cascade.
 */
export async function DELETE(
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

  if (!(await assertOwnedTag(businessId, tagId))) {
    return NextResponse.json({ error: 'Tag not found' }, { status: 404 })
  }

  await prisma.tags.delete({ where: { id: tagId } })
  return NextResponse.json({ success: true })
}
