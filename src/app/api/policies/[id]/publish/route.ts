import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

type Ctx = { params: Promise<{ id: string }> }

// POST /api/policies/[id]/publish
// For a DRAFT policy: creates version 1 and marks policy as PUBLISHED.
// For a PUBLISHED policy with a DRAFT version on top: promotes that draft to PUBLISHED,
// archives the previous PUBLISHED version, increments currentVersion.
export async function POST(req: NextRequest, { params }: Ctx) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const { content, fileId, changeNote } = body

  const policy = await prisma.policy.findUnique({
    where: { id },
    include: { versions: { orderBy: { version: 'desc' } } },
  })
  if (!policy) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (policy.status === 'ARCHIVED') {
    return NextResponse.json({ error: 'Cannot publish an archived policy.' }, { status: 400 })
  }

  const membership = await prisma.businessMemberships.findFirst({
    where: { userId: user.id, businessId: policy.businessId, isActive: true },
  })
  const canManage = ['business-owner', 'business-manager', 'system-admin'].includes(membership?.role ?? '')
  if (!canManage) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const now = new Date()

  if (policy.status === 'DRAFT') {
    // First publish — no existing versions; create version 1
    const newVersion = await prisma.policyVersion.create({
      data: {
        policyId: id,
        version: 1,
        status: 'PUBLISHED',
        content: content ?? null,
        fileId: fileId ?? null,
        changeNote: changeNote ?? null,
        createdById: user.id,
        publishedById: user.id,
        publishedAt: now,
      },
    })
    const updated = await prisma.policy.update({
      where: { id },
      data: { status: 'PUBLISHED', currentVersion: 1, publishedAt: now },
    })
    return NextResponse.json({ policy: updated, version: newVersion })
  }

  // PUBLISHED — promote the DRAFT version on top
  const draftVersion = policy.versions.find(v => v.status === 'DRAFT')
  if (!draftVersion) {
    return NextResponse.json({ error: 'No draft version to publish. Call new-version first to start editing.' }, { status: 400 })
  }

  const nextVersionNumber = policy.currentVersion + 1

  await prisma.$transaction([
    // Archive the currently published version
    prisma.policyVersion.updateMany({
      where: { policyId: id, status: 'PUBLISHED' },
      data: { status: 'ARCHIVED' },
    }),
    // Promote draft version
    prisma.policyVersion.update({
      where: { id: draftVersion.id },
      data: {
        version: nextVersionNumber,
        status: 'PUBLISHED',
        content: content ?? draftVersion.content,
        fileId: fileId ?? draftVersion.fileId,
        changeNote: changeNote ?? draftVersion.changeNote,
        publishedById: user.id,
        publishedAt: now,
      },
    }),
    // Update policy
    prisma.policy.update({
      where: { id },
      data: { currentVersion: nextVersionNumber, publishedAt: now },
    }),
  ])

  const updatedPolicy = await prisma.policy.findUnique({
    where: { id },
    include: { versions: { orderBy: { version: 'desc' } } },
  })
  return NextResponse.json(updatedPolicy)
}
