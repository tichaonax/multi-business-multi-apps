/**
 * R710 Remote Agent — remote "Start with Windows" toggle (MBM-276, admin only)
 *
 * Auto-start is a single per-machine Windows registry entry, not a
 * per-profile setting — toggling it here affects the whole agent process on
 * that workstation (every server it's paired with). Dispatched through the
 * existing job round trip (mirrors test/route.ts) rather than a bespoke
 * event, since AGENT_SET_AUTO_START is just another job type the agent
 * already knows how to execute (job-handler.ts).
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isSystemAdmin } from '@/lib/permission-utils'
import { getServerUser } from '@/lib/get-server-user'
import { r710AgentHub, AgentDispatchError } from '@/lib/r710/agent-hub'
import { logAgentRequest } from '@/lib/r710/executors/remote-agent-executor'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isSystemAdmin(user)) return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })

  const { id } = await params
  const { enabled } = await request.json()
  if (typeof enabled !== 'boolean') {
    return NextResponse.json({ error: '"enabled" must be a boolean' }, { status: 400 })
  }

  const agent = await prisma.r710RemoteAgents.findUnique({ where: { id } })
  if (!agent || agent.revokedAt) return NextResponse.json({ error: 'Agent not found' }, { status: 404 })

  const startedAt = Date.now()
  try {
    const result = await r710AgentHub.dispatchJob(agent.deviceRegistryId, {
      jobType: 'AGENT_SET_AUTO_START',
      params: { enabled },
    })

    await logAgentRequest({
      deviceRegistryId: agent.deviceRegistryId,
      jobType: 'AGENT_SET_AUTO_START',
      requestedBy: user.id,
      status: result.success ? 'SUCCESS' : 'ERROR',
      durationMs: Date.now() - startedAt,
      errorMessage: result.success ? undefined : result.error,
    })

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error || 'Agent did not respond' }, { status: 502 })
    }

    // The DB row is also updated by the agent's own status-update event
    // moments later, but returning the freshly-confirmed value here lets
    // the UI reflect it immediately without waiting on that round trip.
    return NextResponse.json({ success: true, data: result.data })
  } catch (error) {
    const status = error instanceof AgentDispatchError ? error.code : 'ERROR'
    await logAgentRequest({
      deviceRegistryId: agent.deviceRegistryId,
      jobType: 'AGENT_SET_AUTO_START',
      requestedBy: user.id,
      status,
      durationMs: Date.now() - startedAt,
      errorMessage: error instanceof Error ? error.message : String(error),
    })

    const message = status === 'AGENT_OFFLINE'
      ? 'The local agent is not connected — check the tray icon on the paired workstation.'
      : status === 'TIMEOUT'
        ? 'The agent did not respond in time.'
        : (error instanceof Error ? error.message : 'Failed to update auto-start')

    return NextResponse.json({ success: false, error: message, code: status }, { status: 502 })
  }
}
