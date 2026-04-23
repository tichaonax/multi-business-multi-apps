import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

// GET /api/policies/reports?businessId=xxx&policyId=xxx&userId=xxx
// Returns compliance data: per policy or per employee view.
export async function GET(req: NextRequest) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const businessId = searchParams.get('businessId')
  const policyId = searchParams.get('policyId')
  const targetUserId = searchParams.get('userId')

  if (!businessId) return NextResponse.json({ error: 'businessId required' }, { status: 400 })

  const membership = await prisma.businessMemberships.findFirst({
    where: { userId: user.id, businessId, isActive: true },
  })
  const canManage = ['business-owner', 'business-manager', 'system-admin'].includes(membership?.role ?? '')
  if (!canManage) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Per-policy compliance report
  if (policyId) {
    const policy = await prisma.policy.findUnique({ where: { id: policyId } })
    if (!policy) return NextResponse.json({ error: 'Policy not found' }, { status: 404 })

    const assignments = await prisma.policyAssignment.findMany({
      where: { policyId, businessId, isActive: true },
      include: {
        assignedBy: { select: { name: true } },
        acknowledgments: {
          include: { user: { select: { id: true, name: true, email: true } }, waivedBy: { select: { name: true } } },
        },
      },
    })

    // Resolve all affected user IDs from each assignment
    const allMembers = await prisma.businessMemberships.findMany({
      where: { businessId, isActive: true },
      include: { users: { select: { id: true, name: true, email: true } } },
    })

    const rows: any[] = []
    for (const assignment of assignments) {
      let targets: typeof allMembers = []
      if (assignment.scope === 'ALL_EMPLOYEES') targets = allMembers
      else if (assignment.scope === 'BY_ROLE') targets = allMembers.filter(m => m.role === assignment.roleTarget)
      else if (assignment.scope === 'INDIVIDUAL' && assignment.userId) {
        targets = allMembers.filter(m => m.userId === assignment.userId)
      }

      for (const m of targets) {
        const ack = assignment.acknowledgments.find(a => a.userId === m.userId)
        const now = new Date()
        let status: 'ACKNOWLEDGED' | 'PENDING' | 'OVERDUE' | 'WAIVED' = 'PENDING'
        if (ack?.waivedById) status = 'WAIVED'
        else if (ack) status = 'ACKNOWLEDGED'
        else if (assignment.dueDate && now > assignment.dueDate) status = 'OVERDUE'

        rows.push({
          userId: m.userId,
          userName: m.users.name,
          userEmail: m.users.email,
          assignmentId: assignment.id,
          policyVersion: assignment.policyVersion,
          scope: assignment.scope,
          dueDate: assignment.dueDate,
          status,
          acknowledgedAt: ack?.acknowledgedAt ?? null,
          waivedReason: ack?.waivedReason ?? null,
        })
      }
    }

    return NextResponse.json({ policy, rows })
  }

  // Per-employee report
  if (targetUserId) {
    const assignments = await prisma.policyAssignment.findMany({
      where: { businessId, isActive: true },
      include: {
        policy: { select: { id: true, title: true, category: true, currentVersion: true } },
        acknowledgments: { where: { userId: targetUserId } },
      },
    })

    const targetMembership = await prisma.businessMemberships.findFirst({
      where: { userId: targetUserId, businessId, isActive: true },
    })

    const rows = assignments
      .filter(a => {
        if (a.scope === 'ALL_EMPLOYEES') return true
        if (a.scope === 'BY_ROLE') return targetMembership?.role === a.roleTarget
        if (a.scope === 'INDIVIDUAL') return a.userId === targetUserId
        return false
      })
      .map(a => {
        const ack = a.acknowledgments[0] ?? null
        const now = new Date()
        let status: string = 'PENDING'
        if (ack?.waivedById) status = 'WAIVED'
        else if (ack) status = 'ACKNOWLEDGED'
        else if (a.dueDate && now > a.dueDate) status = 'OVERDUE'
        return {
          assignmentId: a.id,
          policy: a.policy,
          policyVersion: a.policyVersion,
          dueDate: a.dueDate,
          status,
          acknowledgedAt: ack?.acknowledgedAt ?? null,
          policyVersionAcknowledged: ack?.policyVersion ?? null,
        }
      })

    return NextResponse.json({ userId: targetUserId, rows })
  }

  // Overview: all policies for business with summary counts
  const policies = await prisma.policy.findMany({
    where: { businessId, status: 'PUBLISHED' },
    include: {
      _count: { select: { assignments: { where: { isActive: true } } } },
    },
  })

  const allMemberCount = await prisma.businessMemberships.count({ where: { businessId, isActive: true } })

  const summary = await Promise.all(
    policies.map(async p => {
      const ackCount = await prisma.policyAcknowledgment.count({ where: { policyId: p.id } })
      return {
        policyId: p.id,
        title: p.title,
        category: p.category,
        currentVersion: p.currentVersion,
        activeAssignments: p._count.assignments,
        totalAcknowledged: ackCount,
        totalMembers: allMemberCount,
      }
    })
  )

  return NextResponse.json(summary)
}
