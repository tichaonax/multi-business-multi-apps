/**
 * MBM-275 Phase 5: recent activity for a paired workstation agent — read
 * side of WorkstationAgentRequestLog, same purpose as R710's Agent panel
 * "Recent Activity" list.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/get-server-user'
import { prisma } from '@/lib/prisma'
import { isSystemAdmin, getUserRoleInBusiness } from '@/lib/permission-utils'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const agent = await prisma.workstationAgents.findUnique({ where: { id } })
  if (!agent) return NextResponse.json({ error: 'Workstation agent not found' }, { status: 404 })

  const isAdmin = isSystemAdmin(user) || getUserRoleInBusiness(user, agent.businessId) === 'business-owner'
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden: business admin access required' }, { status: 403 })

  const logs = await prisma.workstationAgentRequestLog.findMany({
    where: { workstationAgentId: id },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  // No formal FK relation on requestedBy (mirrors R710AgentRequestLog's own
  // plain String? field) — resolve display names with a separate batch lookup.
  const userIds = [...new Set(logs.map(l => l.requestedBy).filter((v): v is string => !!v))]
  const users = userIds.length
    ? await prisma.users.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, email: true } })
    : []
  const nameById = new Map(users.map(u => [u.id, u.name || u.email]))

  return NextResponse.json({
    success: true,
    data: logs.map(l => ({
      id: l.id,
      jobType: l.jobType,
      status: l.status,
      requestedByName: l.requestedBy ? (nameById.get(l.requestedBy) || null) : null,
      durationMs: l.durationMs,
      errorMessage: l.errorMessage,
      createdAt: l.createdAt,
    })),
  })
}
