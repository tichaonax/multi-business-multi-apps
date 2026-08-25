/**
 * MBM-275: lists serial ports visible on a paired workstation, for the
 * scale-setup UI's COM-port picker (parallel to /api/print/list-printers).
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/get-server-user'
import { prisma } from '@/lib/prisma'
import { isSystemAdmin, getUserRoleInBusiness } from '@/lib/permission-utils'
import { WorkstationAgentDispatchError } from '@/lib/workstation-agents/agent-hub'
import { dispatchWorkstationJobWithLog } from '@/lib/workstation-agents/request-log'

export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { workstationAgentId } = await request.json()
    if (!workstationAgentId) return NextResponse.json({ error: 'workstationAgentId is required' }, { status: 400 })

    const agent = await prisma.workstationAgents.findUnique({ where: { id: workstationAgentId } })
    if (!agent) return NextResponse.json({ error: 'Workstation agent not found' }, { status: 404 })

    const isAdmin = isSystemAdmin(user) || getUserRoleInBusiness(user, agent.businessId) === 'business-owner'
    if (!isAdmin) return NextResponse.json({ error: 'Forbidden: business admin access required' }, { status: 403 })

    const result = await dispatchWorkstationJobWithLog(workstationAgentId, 'SCALE_LIST_PORTS', undefined, user.id)
    if (!result.success) return NextResponse.json({ error: result.error || 'Failed to list ports' }, { status: 502 })

    return NextResponse.json({ success: true, ...(result.data as object) })
  } catch (error) {
    if (error instanceof WorkstationAgentDispatchError) {
      return NextResponse.json(
        { error: error.code === 'AGENT_OFFLINE' ? 'Workstation agent is offline' : 'Workstation agent did not respond in time' },
        { status: 503 }
      )
    }
    console.error('[Scale List Ports] error:', error)
    return NextResponse.json({ error: 'Failed to list ports' }, { status: 500 })
  }
}
