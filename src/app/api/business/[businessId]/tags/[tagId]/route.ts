import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { isSystemAdmin } from '@/lib/permission-utils'

/**
 * Resolves a tag and checks whether the given business may edit it.
 * Returns `null` if the tag doesn't exist or belongs to a different
 * business's own custom vocabulary (404 either way, from the caller's
 * perspective — no reason to reveal one business's tag exists to another).
 * A system tag (businessId null — MBM-295's seeded vocabulary) exists and
 * is visible, but `editable` is false unless the caller is a system admin —
 * shared vocabulary can't be renamed/deleted/merged away from one
 * business's own management screen.
 */
async function resolveEditableTag(businessId: string, tagId: string, isAdmin: boolean) {
  const tag = await prisma.tags.findUnique({ where: { id: tagId }, select: { businessId: true } })
  if (!tag) return null
  if (tag.businessId !== null && tag.businessId !== businessId) return null
  const editable = isAdmin || tag.businessId === businessId
  return { isSystem: tag.businessId === null, editable }
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

  const resolved = await resolveEditableTag(businessId, tagId, isAdmin)
  if (!resolved) return NextResponse.json({ error: 'Tag not found' }, { status: 404 })
  if (!resolved.editable) {
    return NextResponse.json({ error: 'This is a shared system tag and cannot be renamed from here' }, { status: 403 })
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
 * Deletes the tag entirely (not just detaching from one image/product) —
 * `ImageTags`/`ProductTags` rows cascade automatically via the schema's
 * onDelete: Cascade.
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

  const resolved = await resolveEditableTag(businessId, tagId, isAdmin)
  if (!resolved) return NextResponse.json({ error: 'Tag not found' }, { status: 404 })
  if (!resolved.editable) {
    return NextResponse.json({ error: 'This is a shared system tag and cannot be deleted from here' }, { status: 403 })
  }

  await prisma.tags.delete({ where: { id: tagId } })
  return NextResponse.json({ success: true })
}
