/**
 * R710 Remote Agent — live status (MBM-272, admin only)
 *
 * Combines the DB record (label, host, version, last seen) with the
 * agent hub's in-memory live socket state, since a process crash between
 * heartbeats can leave the DB row saying ONLINE briefly after the socket
 * actually dropped.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isSystemAdmin } from '@/lib/permission-utils'
import { getServerUser } from '@/lib/get-server-user'
import { r710AgentHub } from '@/lib/r710/agent-hub'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isSystemAdmin(user)) return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })

  const { id } = await params
  const agent = await prisma.r710RemoteAgents.findUnique({
    where: { id },
    select: {
      id: true,
      deviceRegistryId: true,
      label: true,
      hostLabel: true,
      agentVersion: true,
      connectionStatus: true,
      lastConnectedAt: true,
      lastSeenAt: true,
      lastError: true,
      revokedAt: true,
      createdAt: true,
      pairer: { select: { id: true, name: true } },
    },
  })

  if (!agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 })

  const liveConnected = r710AgentHub.isAgentConnected(agent.deviceRegistryId)

  return NextResponse.json({
    success: true,
    data: {
      ...agent,
      // Live socket state wins over the DB's last-known status.
      connectionStatus: liveConnected ? 'ONLINE' : 'OFFLINE',
    },
  })
}
