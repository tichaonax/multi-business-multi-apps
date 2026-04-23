import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

type Ctx = { params: Promise<{ id: string }> }

// POST /api/policies/[id]/assign
// Body: { businessId, scope, roleTarget?, userIds?, dueDate?, notes? }
// scope = ALL_EMPLOYEES | BY_ROLE | INDIVIDUAL
export async function POST(req: NextRequest, { params }: Ctx) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const { businessId, scope, roleTarget, userIds, dueDate, notes } = body

  if (!businessId || !scope) {
    return NextResponse.json({ error: 'businessId and scope are required' }, { status: 400 })
  }

  const policy = await prisma.policy.findUnique({
    where: { id },
    include: { versions: { where: { status: 'PUBLISHED' }, take: 1, orderBy: { version: 'desc' } } },
  })
  if (!policy) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (policy.status !== 'PUBLISHED') {
    return NextResponse.json({ error: 'Only PUBLISHED policies can be assigned.' }, { status: 400 })
  }

  const membership = await prisma.businessMemberships.findFirst({
    where: { userId: user.id, businessId, isActive: true },
  })
  const canManage = ['business-owner', 'business-manager', 'system-admin'].includes(membership?.role ?? '')
  if (!canManage) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const policyVersion = policy.currentVersion

  if (scope === 'INDIVIDUAL') {
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ error: 'userIds required for INDIVIDUAL scope' }, { status: 400 })
    }
    const assignments = await prisma.$transaction(
      (userIds as string[]).map((uid: string) =>
        prisma.policyAssignment.create({
          data: {
            policyId: id,
            policyVersion,
            businessId,
            scope: 'INDIVIDUAL',
            userId: uid,
            dueDate: dueDate ? new Date(dueDate) : null,
            notes: notes ?? null,
            assignedById: user.id,
          },
        })
      )
    )

    // Notify each assigned user
    await prisma.appNotification.createMany({
      data: (userIds as string[]).map((uid: string) => ({
        userId: uid,
        type: 'POLICY_ASSIGNED',
        title: 'New Policy to Acknowledge',
        message: `You have been assigned the policy "${policy.title}" and must acknowledge it${dueDate ? ` by ${new Date(dueDate).toLocaleDateString()}` : ''}.`,
        linkUrl: '/profile#policies',
      })),
    })

    return NextResponse.json({ created: assignments.length }, { status: 201 })
  }

  if (scope === 'BY_ROLE') {
    if (!roleTarget) return NextResponse.json({ error: 'roleTarget required for BY_ROLE scope' }, { status: 400 })
    const assignment = await prisma.policyAssignment.create({
      data: {
        policyId: id,
        policyVersion,
        businessId,
        scope: 'BY_ROLE',
        roleTarget,
        dueDate: dueDate ? new Date(dueDate) : null,
        notes: notes ?? null,
        assignedById: user.id,
      },
    })

    // Notify affected members
    const affected = await prisma.businessMemberships.findMany({
      where: { businessId, role: roleTarget, isActive: true },
      select: { userId: true },
    })
    if (affected.length > 0) {
      await prisma.appNotification.createMany({
        data: affected.map(m => ({
          userId: m.userId,
          type: 'POLICY_ASSIGNED',
          title: 'New Policy to Acknowledge',
          message: `You have been assigned the policy "${policy.title}" and must acknowledge it${dueDate ? ` by ${new Date(dueDate).toLocaleDateString()}` : ''}.`,
          linkUrl: '/profile#policies',
        })),
      })
    }

    return NextResponse.json(assignment, { status: 201 })
  }

  if (scope === 'ALL_EMPLOYEES') {
    const assignment = await prisma.policyAssignment.create({
      data: {
        policyId: id,
        policyVersion,
        businessId,
        scope: 'ALL_EMPLOYEES',
        dueDate: dueDate ? new Date(dueDate) : null,
        notes: notes ?? null,
        assignedById: user.id,
      },
    })

    // Notify all active members
    const allMembers = await prisma.businessMemberships.findMany({
      where: { businessId, isActive: true },
      select: { userId: true },
    })
    if (allMembers.length > 0) {
      await prisma.appNotification.createMany({
        data: allMembers.map(m => ({
          userId: m.userId,
          type: 'POLICY_ASSIGNED',
          title: 'New Policy to Acknowledge',
          message: `You have been assigned the policy "${policy.title}" and must acknowledge it${dueDate ? ` by ${new Date(dueDate).toLocaleDateString()}` : ''}.`,
          linkUrl: '/profile#policies',
        })),
      })
    }

    return NextResponse.json(assignment, { status: 201 })
  }

  return NextResponse.json({ error: 'Invalid scope' }, { status: 400 })
}
