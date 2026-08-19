/**
 * R710 Remote Agent — Test Connection (MBM-272, admin only)
 *
 * Dispatches a TEST_CONNECTION job through the live agent socket and waits
 * for the result synchronously (the same round trip a real token request
 * would take, minus the DB write) — used by the admin panel's Test
 * Connection button.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isSystemAdmin } from '@/lib/permission-utils'
import { getServerUser } from '@/lib/get-server-user'
import { decrypt } from '@/lib/encryption'
import { r710AgentHub, AgentDispatchError } from '@/lib/r710/agent-hub'
import { logAgentRequest } from '@/lib/r710/executors/remote-agent-executor'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isSystemAdmin(user)) return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })

  const { id } = await params
  const agent = await prisma.r710RemoteAgents.findUnique({
    where: { id },
    include: { device_registry: true },
  })
  if (!agent || agent.revokedAt) return NextResponse.json({ error: 'Agent not found' }, { status: 404 })

  const startedAt = Date.now()
  try {
    const result = await r710AgentHub.dispatchJob(agent.deviceRegistryId, {
      jobType: 'TEST_CONNECTION',
      device: {
        ipAddress: agent.device_registry.ipAddress,
        adminUsername: agent.device_registry.adminUsername,
        adminPassword: decrypt(agent.device_registry.encryptedAdminPassword),
      },
    })

    await logAgentRequest({
      deviceRegistryId: agent.deviceRegistryId,
      jobType: 'TEST_CONNECTION',
      requestedBy: user.id,
      status: result.success ? 'SUCCESS' : 'ERROR',
      durationMs: Date.now() - startedAt,
      errorMessage: result.success ? undefined : result.error,
    })

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error || 'Device did not respond' }, { status: 502 })
    }

    return NextResponse.json({ success: true, data: result.data })
  } catch (error) {
    const status = error instanceof AgentDispatchError ? error.code : 'ERROR'
    await logAgentRequest({
      deviceRegistryId: agent.deviceRegistryId,
      jobType: 'TEST_CONNECTION',
      requestedBy: user.id,
      status,
      durationMs: Date.now() - startedAt,
      errorMessage: error instanceof Error ? error.message : String(error),
    })

    const message = status === 'AGENT_OFFLINE'
      ? 'The local agent is not connected — check the tray icon on the paired workstation.'
      : status === 'TIMEOUT'
        ? 'The agent did not respond in time.'
        : (error instanceof Error ? error.message : 'Test failed')

    return NextResponse.json({ success: false, error: message, code: status }, { status: 502 })
  }
}
