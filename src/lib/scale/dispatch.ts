/**
 * MBM-275: shared helpers for the scale runtime routes (connect/disconnect/
 * tare/detect-baud) — resolves a business's active AGENT-mode scale config
 * and turns WorkstationAgentDispatchError into the same NextResponse shape
 * every one of those routes would otherwise repeat. Every dispatch is
 * logged via dispatchWorkstationJobWithLog (Phase 5 audit trail).
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { WorkstationAgentDispatchError, type WorkstationAgentJobType } from '@/lib/workstation-agents/agent-hub'
import { dispatchWorkstationJobWithLog } from '@/lib/workstation-agents/request-log'

// Self-heals a stale config left behind by a workstation agent that was
// later revoked — revoking a pairing doesn't delete its row (just marks
// revokedAt), so a ScaleDeviceConfigs row still pointing at it never gets
// cleaned up by the schema's own onDelete: Cascade, and every future
// SCALE_CONNECT attempt just 500s against a pairing that's never coming
// back. Deleting it here means the NEXT connect attempt after this one
// correctly sees "no scale configured" instead of repeating the same dead
// dispatch forever.
export async function resolveScaleConfig(businessId: string) {
  const config = await prisma.scaleDeviceConfigs.findFirst({
    where: { businessId, isActive: true },
    orderBy: { createdAt: 'desc' },
    include: { workstation_agent: { select: { revokedAt: true } } },
  })
  if (config && config.workstation_agent.revokedAt) {
    await prisma.scaleDeviceConfigs.delete({ where: { id: config.id } }).catch(() => {})
    return null
  }
  return config
}

export async function dispatchScaleJob(workstationAgentId: string, jobType: WorkstationAgentJobType, params?: unknown, requestedBy?: string) {
  try {
    const result = await dispatchWorkstationJobWithLog(workstationAgentId, jobType, params, requestedBy)
    if (!result.success) {
      return NextResponse.json({ error: result.error || `${jobType} failed` }, { status: 502 })
    }
    return NextResponse.json({ success: true, ...(result.data ? { data: result.data } : {}) })
  } catch (error) {
    if (error instanceof WorkstationAgentDispatchError) {
      return NextResponse.json(
        { error: error.code === 'AGENT_OFFLINE' ? 'Scale unavailable — the local agent is offline. Contact IT.' : 'The scale did not respond in time. Please try again.' },
        { status: 503 }
      )
    }
    console.error(`[Scale ${jobType}] error:`, error)
    return NextResponse.json({ error: `Failed to ${jobType.toLowerCase()}` }, { status: 500 })
  }
}
