import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

function canManage(role: string) {
  return ['business-owner', 'business-manager', 'system-admin'].includes(role)
}

type Ctx = { params: Promise<{ id: string }> }

// GET /api/policies/[id]
export async function GET(_req: NextRequest, { params }: Ctx) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const policy = await prisma.policy.findUnique({
    where: { id },
    include: {
      createdBy: { select: { id: true, name: true } },
      versions: {
        orderBy: { version: 'desc' },
        include: {
          createdBy: { select: { id: true, name: true } },
          publishedBy: { select: { id: true, name: true } },
        },
      },
    },
  })

  if (!policy) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json(policy)
}

// PATCH /api/policies/[id] — update draft fields (title, description, category, content, fileId)
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()

  const policy = await prisma.policy.findUnique({ where: { id } })
  if (!policy) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const membership = await prisma.businessMemberships.findFirst({
    where: { userId: user.id, businessId: policy.businessId, isActive: true },
  })
  if (!membership || !canManage(membership.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { title, description, category, contentType, content, fileId } = body

  // If PUBLISHED, update the active draft version; don't touch the policy row fields
  if (policy.status === 'PUBLISHED') {
    const draftVersion = await prisma.policyVersion.findFirst({
      where: { policyId: id, status: 'DRAFT' },
    })
    if (!draftVersion) {
      return NextResponse.json({ error: 'No draft version found. Call new-version first.' }, { status: 400 })
    }
    const updated = await prisma.policyVersion.update({
      where: { id: draftVersion.id },
      data: { content: content ?? draftVersion.content, fileId: fileId ?? draftVersion.fileId },
    })
    return NextResponse.json({ policy, draftVersion: updated })
  }

  // DRAFT — update policy fields directly
  const updated = await prisma.policy.update({
    where: { id },
    data: {
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(category !== undefined && { category }),
      ...(contentType !== undefined && { contentType }),
    },
  })

  // Also persist content into the draft version if it exists, or we'll store it on publish
  if (content !== undefined || fileId !== undefined) {
    const draftV = await prisma.policyVersion.findFirst({ where: { policyId: id, status: 'DRAFT' } })
    if (draftV) {
      await prisma.policyVersion.update({
        where: { id: draftV.id },
        data: { content, fileId },
      })
    }
  }

  return NextResponse.json(updated)
}

// DELETE /api/policies/[id] — only allowed on DRAFT policies
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const policy = await prisma.policy.findUnique({ where: { id } })
  if (!policy) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (policy.status !== 'DRAFT') {
    return NextResponse.json({ error: 'Only DRAFT policies can be deleted.' }, { status: 400 })
  }

  const membership = await prisma.businessMemberships.findFirst({
    where: { userId: user.id, businessId: policy.businessId, isActive: true },
  })
  if (!membership || !canManage(membership.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await prisma.policy.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
