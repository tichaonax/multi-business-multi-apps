import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

// GET /api/policies/pending?businessId=xxx
// Returns all active policy assignments the current user has not yet acknowledged,
// enriched with policy content for the assigned version.
export async function GET(req: NextRequest) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const businessId = searchParams.get('businessId')
  if (!businessId) return NextResponse.json({ error: 'businessId required' }, { status: 400 })

  // Get user's role in this business
  const membership = await prisma.businessMemberships.findFirst({
    where: { userId: user.id, businessId, isActive: true },
  })
  if (!membership) return NextResponse.json([])

  // Managers are not blocked
  const managerRoles = ['business-owner', 'business-manager', 'system-admin']
  if (managerRoles.includes(membership.role)) return NextResponse.json([])

  // Find all active assignments for this business that apply to this user
  const assignments = await prisma.policyAssignment.findMany({
    where: {
      businessId,
      isActive: true,
      policy: { status: 'PUBLISHED' },
      OR: [
        { scope: 'ALL_EMPLOYEES' },
        { scope: 'BY_ROLE', roleTarget: membership.role },
        { scope: 'INDIVIDUAL', userId: user.id },
      ],
    },
    include: {
      policy: {
        select: { id: true, title: true, category: true, contentType: true, currentVersion: true },
      },
    },
  })

  // Get assignments user has already acknowledged
  const assignmentIds = assignments.map(a => a.id)
  const acknowledged = await prisma.policyAcknowledgment.findMany({
    where: { policyAssignmentId: { in: assignmentIds }, userId: user.id },
    select: { policyAssignmentId: true },
  })
  const acknowledgedSet = new Set(acknowledged.map(a => a.policyAssignmentId))

  const pending = assignments.filter(a => !acknowledgedSet.has(a.id))

  if (pending.length === 0) return NextResponse.json([])

  // Fetch content for each pending assignment's version
  const result = await Promise.all(
    pending.map(async a => {
      const version = await prisma.policyVersion.findFirst({
        where: { policyId: a.policyId, version: a.policyVersion, status: 'PUBLISHED' },
        select: { content: true, fileId: true },
      })
      return {
        assignmentId: a.id,
        policyId: a.policyId,
        policyVersion: a.policyVersion,
        dueDate: a.dueDate,
        notes: a.notes,
        policy: a.policy,
        content: version?.content ?? null,
        fileId: version?.fileId ?? null,
        isOverdue: a.dueDate ? new Date() > a.dueDate : false,
      }
    })
  )

  // Send reminder notifications for policies due within 3 days (fire-and-forget)
  sendDueSoonReminders(user.id, result).catch(() => {})

  return NextResponse.json(result)
}

async function sendDueSoonReminders(userId: string, pending: any[]) {
  const now = new Date()
  const threeDaysFromNow = new Date(now.getTime() + 3 * 86400000)

  const dueSoon = pending.filter(p => {
    if (!p.dueDate || p.isOverdue) return false
    const due = new Date(p.dueDate)
    return due > now && due <= threeDaysFromNow
  })

  if (dueSoon.length === 0) return

  // For each, only create a notification if we haven't sent one in the last 24h
  const oneDayAgo = new Date(now.getTime() - 86400000)
  for (const p of dueSoon) {
    const existing = await prisma.appNotification.findFirst({
      where: {
        userId,
        type: 'POLICY_REMINDER',
        message: { contains: p.assignmentId },
        createdAt: { gte: oneDayAgo },
      },
    })
    if (!existing) {
      const dueStr = new Date(p.dueDate).toLocaleDateString()
      await prisma.appNotification.create({
        data: {
          userId,
          type: 'POLICY_REMINDER',
          title: 'Policy Acknowledgment Due Soon',
          message: `"${p.policy.title}" must be acknowledged by ${dueStr}. Assignment: ${p.assignmentId}`,
          linkUrl: '/profile#policies',
        },
      })
    }
  }
}
