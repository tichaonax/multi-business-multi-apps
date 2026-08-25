/**
 * MBM-275 Phase 5: dispatches a workstation-agent job and records it in
 * WorkstationAgentRequestLog — mirrors src/lib/r710/executors/
 * remote-agent-executor.ts's dispatchAndLog()/logAgentRequest(), same
 * rationale (visibility into what was asked of a workstation and how it
 * went). Centralized here so every call site (scale dispatch, print
 * dispatch, list-ports, list-printers) gets logging for free instead of
 * repeating the try/catch/timing boilerplate.
 */

import { randomUUID } from 'crypto'
import { prisma } from '@/lib/prisma'
import {
  workstationAgentHub,
  WorkstationAgentDispatchError,
  type WorkstationAgentJobType,
  type WorkstationAgentJobResult,
} from './agent-hub'

export async function dispatchWorkstationJobWithLog(
  workstationAgentId: string,
  jobType: WorkstationAgentJobType,
  params: unknown,
  requestedBy?: string
): Promise<WorkstationAgentJobResult> {
  const startedAt = Date.now()

  try {
    const result = await workstationAgentHub.dispatchJob(workstationAgentId, { jobType, params })

    await logRequest({
      workstationAgentId,
      jobType,
      requestedBy,
      status: result.success ? 'SUCCESS' : 'ERROR',
      durationMs: Date.now() - startedAt,
      errorMessage: result.success ? undefined : result.error,
    })

    return result
  } catch (error) {
    const status = error instanceof WorkstationAgentDispatchError ? error.code : 'ERROR'
    await logRequest({
      workstationAgentId,
      jobType,
      requestedBy,
      status,
      durationMs: Date.now() - startedAt,
      errorMessage: error instanceof Error ? error.message : String(error),
    })
    throw error
  }
}

async function logRequest(entry: {
  workstationAgentId: string
  jobType: WorkstationAgentJobType
  requestedBy?: string
  status: 'SUCCESS' | 'TIMEOUT' | 'AGENT_OFFLINE' | 'ERROR'
  durationMs: number
  errorMessage?: string
}): Promise<void> {
  try {
    await prisma.workstationAgentRequestLog.create({
      data: {
        jobId: randomUUID(),
        workstationAgentId: entry.workstationAgentId,
        jobType: entry.jobType,
        requestedBy: entry.requestedBy,
        status: entry.status,
        durationMs: entry.durationMs,
        errorMessage: entry.errorMessage,
      },
    })
  } catch (logError) {
    console.error('[WorkstationAgent] Failed to write request log (non-blocking):', logError)
  }
}
