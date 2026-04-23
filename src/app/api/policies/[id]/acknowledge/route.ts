import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

const DISCLAIMER = (title: string, version: number) =>
  `By clicking Acknowledge, I confirm that I have read and understood the ${title} (Version ${version}). I agree to comply with the policies set out in this document. I understand that failure to comply may result in disciplinary action up to and including termination of my employment. I acknowledge that I may end my employment if I disagree with the terms of this policy.`

type Ctx = { params: Promise<{ id: string }> }

// POST /api/policies/[id]/acknowledge
// Body: { assignmentId, scrolledToEnd }
export async function POST(req: NextRequest, { params }: Ctx) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: policyId } = await params
  const body = await req.json()
  const { assignmentId, scrolledToEnd } = body

  if (!assignmentId) return NextResponse.json({ error: 'assignmentId required' }, { status: 400 })

  const assignment = await prisma.policyAssignment.findUnique({
    where: { id: assignmentId },
    include: { policy: true },
  })
  if (!assignment || assignment.policyId !== policyId) {
    return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })
  }

  // Verify user is eligible for this assignment
  const membership = await prisma.businessMemberships.findFirst({
    where: { userId: user.id, businessId: assignment.businessId, isActive: true },
  })
  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Check scope eligibility
  if (assignment.scope === 'INDIVIDUAL' && assignment.userId !== user.id) {
    return NextResponse.json({ error: 'This assignment is not for you' }, { status: 403 })
  }
  if (assignment.scope === 'BY_ROLE' && membership.role !== assignment.roleTarget) {
    return NextResponse.json({ error: 'This assignment does not apply to your role' }, { status: 403 })
  }

  // Idempotent — if already acknowledged, return existing record
  const existing = await prisma.policyAcknowledgment.findUnique({
    where: { policyAssignmentId_userId: { policyAssignmentId: assignmentId, userId: user.id } },
  })
  if (existing) return NextResponse.json(existing)

  const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? null
  const ua = req.headers.get('user-agent') ?? null

  const ack = await prisma.policyAcknowledgment.create({
    data: {
      policyAssignmentId: assignmentId,
      policyId,
      policyVersion: assignment.policyVersion,
      userId: user.id,
      businessId: assignment.businessId,
      disclaimerText: DISCLAIMER(assignment.policy.title, assignment.policyVersion),
      scrolledToEnd: scrolledToEnd === true,
      ipAddress: ip,
      userAgent: ua,
    },
  })

  return NextResponse.json(ack, { status: 201 })
}
