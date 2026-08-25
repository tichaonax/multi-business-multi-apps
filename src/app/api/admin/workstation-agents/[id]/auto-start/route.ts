/**
 * Workstation Agent — remote "Start with Windows" toggle (MBM-276, admin only)
 *
 * Mirrors src/app/api/admin/r710/agents/[id]/auto-start/route.ts — see its
 * header comment. Uses dispatchWorkstationJobWithLog() since that's the
 * existing logged-dispatch helper every other workstation job goes through.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isSystemAdmin, getUserRoleInBusiness } from '@/lib/permission-utils'
import { getServerUser } from '@/lib/get-server-user'
import { WorkstationAgentDispatchError } from '@/lib/workstation-agents/agent-hub'
import { dispatchWorkstationJobWithLog } from '@/lib/workstation-agents/request-log'

function isBusinessAdmin(user: Awaited<ReturnType<typeof getServerUser>>, businessId: string): boolean {
  if (!user) return false
  return isSystemAdmin(user) || getUserRoleInBusiness(user, businessId) === 'business-owner'
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { enabled } = await request.json()
  if (typeof enabled !== 'boolean') {
    return NextResponse.json({ error: '"enabled" must be a boolean' }, { status: 400 })
  }

  const agent = await prisma.workstationAgents.findUnique({ where: { id } })
  if (!agent || agent.revokedAt) return NextResponse.json({ error: 'Agent not found' }, { status: 404 })

  if (!isBusinessAdmin(user, agent.businessId)) {
    return NextResponse.json({ error: 'Forbidden: business admin access required' }, { status: 403 })
  }

  try {
    const result = await dispatchWorkstationJobWithLog(id, 'AGENT_SET_AUTO_START', { enabled }, user.id)

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error || 'Agent did not respond' }, { status: 502 })
    }

    return NextResponse.json({ success: true, data: result.data })
  } catch (error) {
    const status = error instanceof WorkstationAgentDispatchError ? error.code : 'ERROR'
    const message = status === 'AGENT_OFFLINE'
      ? 'The local agent is not connected — check the tray icon on the paired workstation.'
      : status === 'TIMEOUT'
        ? 'The agent did not respond in time.'
        : (error instanceof Error ? error.message : 'Failed to update auto-start')

    return NextResponse.json({ success: false, error: message, code: status }, { status: 502 })
  }
}
