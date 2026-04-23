import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

function canManage(role: string) {
  return ['business-owner', 'business-manager', 'system-admin'].includes(role)
}

// GET /api/policies?businessId=xxx&status=DRAFT|PUBLISHED|ARCHIVED
export async function GET(req: NextRequest) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const businessId = searchParams.get('businessId')
  const status = searchParams.get('status') as any | undefined

  if (!businessId) return NextResponse.json({ error: 'businessId required' }, { status: 400 })

  const policies = await prisma.policy.findMany({
    where: {
      businessId,
      ...(status ? { status } : {}),
    },
    include: {
      createdBy: { select: { id: true, name: true } },
      versions: { select: { id: true, version: true, status: true, publishedAt: true, changeNote: true } },
      _count: { select: { assignments: { where: { isActive: true } } } },
    },
    orderBy: { updatedAt: 'desc' },
  })

  // Attach acknowledgment counts
  const policyIds = policies.map(p => p.id)
  const ackCounts = await prisma.policyAcknowledgment.groupBy({
    by: ['policyId'],
    where: { policyId: { in: policyIds } },
    _count: { id: true },
  })
  const ackMap = Object.fromEntries(ackCounts.map(a => [a.policyId, a._count.id]))

  const result = policies.map(p => ({
    ...p,
    assignedCount: p._count.assignments,
    acknowledgedCount: ackMap[p.id] ?? 0,
  }))

  return NextResponse.json(result)
}

// POST /api/policies — create a new DRAFT policy
export async function POST(req: NextRequest) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { businessId, title, description, category, contentType } = body

  if (!businessId || !title || !category) {
    return NextResponse.json({ error: 'businessId, title, and category are required' }, { status: 400 })
  }

  // Check membership + role
  const membership = await prisma.businessMemberships.findFirst({
    where: { userId: user.id, businessId, isActive: true },
  })
  if (!membership || !canManage(membership.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const policy = await prisma.policy.create({
    data: {
      businessId,
      title,
      description: description || null,
      category,
      contentType: contentType || 'RICH_TEXT',
      status: 'DRAFT',
      currentVersion: 0,
      createdById: user.id,
    },
  })

  return NextResponse.json(policy, { status: 201 })
}
