/**
 * R710 Remote Agent — revoke a pairing (MBM-272, admin only)
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isSystemAdmin } from '@/lib/permission-utils'
import { getServerUser } from '@/lib/get-server-user'
import { r710AgentHub } from '@/lib/r710/agent-hub'

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!isSystemAdmin(user)) return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })

    const { id } = await params
    const agent = await prisma.r710RemoteAgents.findUnique({ where: { id } })
    if (!agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 })

    await prisma.r710RemoteAgents.update({
      where: { id },
      data: { revokedAt: new Date(), revokedBy: user.id, connectionStatus: 'OFFLINE' },
    })

    r710AgentHub.disconnectAgent(agent.deviceRegistryId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error revoking R710 remote agent:', error)
    return NextResponse.json({ error: 'Failed to revoke agent' }, { status: 500 })
  }
}
