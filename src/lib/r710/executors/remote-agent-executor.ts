/**
 * MBM-272: AGENT executor — reaches a remote R710 device by dispatching a
 * job over the persistent agent<->server channel (see agent-hub.ts) instead
 * of calling the device directly. Used for R710DeviceRegistry rows with
 * connectionMode = AGENT.
 */

import { randomUUID } from 'crypto'
import { prisma } from '@/lib/prisma'
import type { R710TokenConfig } from '@/services/ruckus-r710-api'
import { r710AgentHub, AgentDispatchError, type R710AgentJobType } from '@/lib/r710/agent-hub'
import type {
  R710Executor,
  R710DeviceTarget,
  R710GuestPassParams,
  R710GuestPassResult,
  R710BulkGenerateResult,
  R710QueryTokensResult,
  R710ExecutorContext,
} from './types'

/** Envelope shape shared by every job type this executor dispatches. */
interface Envelope {
  success: boolean
  error?: string
}

async function dispatchAndLog<T extends Envelope>(
  device: R710DeviceTarget,
  jobType: R710AgentJobType,
  params: unknown,
  context: R710ExecutorContext | undefined,
  fallback: (envelope: { success: boolean; error?: string }) => T
): Promise<T> {
  const startedAt = Date.now()

  try {
    const result = await r710AgentHub.dispatchJob(device.deviceRegistryId, {
      jobType,
      device: { ipAddress: device.ipAddress, adminUsername: device.adminUsername, adminPassword: device.adminPassword },
      params,
    })

    const payload = (result.data as T | undefined) ?? fallback({ success: result.success, error: result.error })

    await logAgentRequest({
      deviceRegistryId: device.deviceRegistryId,
      jobType,
      requestedBy: context?.requestedBy,
      status: payload.success ? 'SUCCESS' : 'ERROR',
      durationMs: Date.now() - startedAt,
      errorMessage: payload.success ? undefined : (payload.error || result.error),
    })

    return payload
  } catch (error) {
    const status = error instanceof AgentDispatchError ? error.code : 'ERROR'
    await logAgentRequest({
      deviceRegistryId: device.deviceRegistryId,
      jobType,
      requestedBy: context?.requestedBy,
      status,
      durationMs: Date.now() - startedAt,
      errorMessage: error instanceof Error ? error.message : String(error),
    })
    throw error
  }
}

export const remoteAgentExecutor: R710Executor = {
  async generateGuestPass(
    device: R710DeviceTarget,
    params: R710GuestPassParams,
    context?: R710ExecutorContext
  ): Promise<R710GuestPassResult> {
    return dispatchAndLog<R710GuestPassResult>(device, 'TOKEN_GENERATE', params, context, (e) => e)
  },

  async generateTokens(
    device: R710DeviceTarget,
    params: R710TokenConfig,
    context?: R710ExecutorContext
  ): Promise<R710BulkGenerateResult> {
    return dispatchAndLog<R710BulkGenerateResult>(device, 'AUTO_GENERATE', params, context, (e) => e)
  },

  async queryAllTokens(device: R710DeviceTarget, context?: R710ExecutorContext): Promise<R710QueryTokensResult> {
    return dispatchAndLog<R710QueryTokensResult>(device, 'TOKEN_SYNC', undefined, context, (e) => e)
  },
}

export async function logAgentRequest(entry: {
  deviceRegistryId: string
  jobType: R710AgentJobType
  requestedBy?: string
  status: 'SUCCESS' | 'TIMEOUT' | 'AGENT_OFFLINE' | 'DEVICE_UNREACHABLE' | 'ERROR'
  durationMs: number
  errorMessage?: string
  resultTokenId?: string
}): Promise<void> {
  try {
    const agent = await prisma.r710RemoteAgents.findUnique({
      where: { deviceRegistryId: entry.deviceRegistryId },
      select: { id: true },
    })
    if (!agent) return // device has no paired agent row at all — nothing to attribute the log to

    await prisma.r710AgentRequestLog.create({
      data: {
        jobId: randomUUID(),
        agentId: agent.id,
        deviceRegistryId: entry.deviceRegistryId,
        jobType: entry.jobType,
        requestedBy: entry.requestedBy,
        status: entry.status,
        durationMs: entry.durationMs,
        errorMessage: entry.errorMessage,
        resultTokenId: entry.resultTokenId,
      },
    })
  } catch (logError) {
    console.error('[remoteAgentExecutor] Failed to write agent request log (non-blocking):', logError)
  }
}
