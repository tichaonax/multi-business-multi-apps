import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

type Ctx = { params: Promise<{ id: string }> }

// POST /api/policies/[id]/new-version
// Creates a DRAFT version on top of a PUBLISHED policy so the manager can edit it.
// The PUBLISHED version remains live until the draft is published.
export async function POST(_req: NextRequest, { params }: Ctx) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const policy = await prisma.policy.findUnique({
    where: { id },
    include: { versions: { where: { status: 'PUBLISHED' }, orderBy: { version: 'desc' }, take: 1 } },
  })
  if (!policy) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (policy.status !== 'PUBLISHED') {
    return NextResponse.json({ error: 'Policy must be PUBLISHED to start a new version.' }, { status: 400 })
  }

  const membership = await prisma.businessMemberships.findFirst({
    where: { userId: user.id, businessId: policy.businessId, isActive: true },
  })
  const canManage = ['business-owner', 'business-manager', 'system-admin'].includes(membership?.role ?? '')
  if (!canManage) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Prevent creating a second draft if one already exists
  const existingDraft = await prisma.policyVersion.findFirst({ where: { policyId: id, status: 'DRAFT' } })
  if (existingDraft) {
    return NextResponse.json({ draftVersion: existingDraft, message: 'Draft already exists.' })
  }

  const publishedVersion = policy.versions[0]
  const draftVersion = await prisma.policyVersion.create({
    data: {
      policyId: id,
      // Temporary placeholder version number — updated to real number on publish
      version: policy.currentVersion + 1,
      status: 'DRAFT',
      content: publishedVersion?.content ?? null,
      fileId: publishedVersion?.fileId ?? null,
      createdById: user.id,
    },
  })

  return NextResponse.json({ draftVersion }, { status: 201 })
}
