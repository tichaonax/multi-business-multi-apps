/**
 * Workstation Agent — revoke a pairing (MBM-275)
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isSystemAdmin, getUserRoleInBusiness } from '@/lib/permission-utils'
import { getServerUser } from '@/lib/get-server-user'
import { workstationAgentHub } from '@/lib/workstation-agents/agent-hub'

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const agent = await prisma.workstationAgents.findUnique({ where: { id } })
    if (!agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 })

    const isAdmin = isSystemAdmin(user) || getUserRoleInBusiness(user, agent.businessId) === 'business-owner'
    if (!isAdmin) return NextResponse.json({ error: 'Forbidden: business admin access required' }, { status: 403 })

    await prisma.workstationAgents.update({
      where: { id },
      data: { revokedAt: new Date(), revokedBy: user.id, connectionStatus: 'OFFLINE' },
    })

    // Revoking doesn't delete this row (just marks it revoked), so the
    // schema's onDelete: Cascade on ScaleDeviceConfigs never fires here —
    // left alone, a scale config still pointing at this now-dead pairing
    // makes ScaleContext (which only checks "does a config exist," not
    // whether its agent is still valid) keep firing a doomed SCALE_CONNECT
    // on every page load for this business, forever. workstationAgentId is
    // required on that model (not nullable), so the only clean fix is
    // deleting the config outright rather than nulling the reference.
    await prisma.scaleDeviceConfigs.deleteMany({ where: { workstationAgentId: id } })

    workstationAgentHub.disconnectAgent(id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error revoking workstation agent:', error)
    return NextResponse.json({ error: 'Failed to revoke agent' }, { status: 500 })
  }
}
