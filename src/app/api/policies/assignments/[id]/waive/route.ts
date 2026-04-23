import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

type Ctx = { params: Promise<{ id: string }> }

// PATCH /api/policies/assignments/[id]/waive
// Body: { userId, reason }
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: assignmentId } = await params
  const body = await req.json()
  const { userId, reason } = body

  if (!userId || !reason) return NextResponse.json({ error: 'userId and reason are required' }, { status: 400 })

  const assignment = await prisma.policyAssignment.findUnique({
    where: { id: assignmentId },
    include: { policy: true },
  })
  if (!assignment) return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })

  const membership = await prisma.businessMemberships.findFirst({
    where: { userId: user.id, businessId: assignment.businessId, isActive: true },
  })
  const canManage = ['business-owner', 'business-manager', 'system-admin'].includes(membership?.role ?? '')
  if (!canManage) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Upsert a waived acknowledgment record
  const existing = await prisma.policyAcknowledgment.findUnique({
    where: { policyAssignmentId_userId: { policyAssignmentId: assignmentId, userId } },
  })

  if (existing) {
    const updated = await prisma.policyAcknowledgment.update({
      where: { id: existing.id },
      data: { waivedById: user.id, waivedReason: reason },
    })
    return NextResponse.json(updated)
  }

  const waived = await prisma.policyAcknowledgment.create({
    data: {
      policyAssignmentId: assignmentId,
      policyId: assignment.policyId,
      policyVersion: assignment.policyVersion,
      userId,
      businessId: assignment.businessId,
      disclaimerText: `Waived by manager. Reason: ${reason}`,
      scrolledToEnd: false,
      waivedById: user.id,
      waivedReason: reason,
    },
  })

  return NextResponse.json(waived, { status: 201 })
}
