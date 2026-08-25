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

export async function resolveScaleConfig(businessId: string) {
  return prisma.scaleDeviceConfigs.findFirst({
    where: { businessId, isActive: true },
    orderBy: { createdAt: 'desc' },
  })
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
