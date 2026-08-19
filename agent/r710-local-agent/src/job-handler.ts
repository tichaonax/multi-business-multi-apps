/**
 * MBM-272: executes a job dispatched by the central server against the R710
 * device on this agent's local LAN. Reuses RuckusR710ApiService directly
 * from the main app's codebase — same protocol client the server uses for
 * DIRECT devices, so a fix to R710 session/XML handling never has to be
 * made twice.
 */

import { RuckusR710ApiService } from '../../../src/services/ruckus-r710-api'

export type R710AgentJobType =
  | 'TOKEN_GENERATE'
  | 'HEALTH_CHECK'
  | 'TEST_CONNECTION'
  | 'CONNECTED_CLIENTS_QUERY'
  | 'AUTO_GENERATE'
  | 'TOKEN_SYNC'

export interface AgentJob {
  jobId: string
  jobType: R710AgentJobType
  device: { ipAddress: string; adminUsername: string; adminPassword: string }
  params?: unknown
}

export interface AgentJobResult {
  jobId: string
  success: boolean
  data?: unknown
  error?: string
}

// One session per device IP, reused across jobs — same pooling rationale as
// the server's R710SessionManager, just scoped to whatever devices this
// agent has been asked to reach (in practice, exactly one).
const sessions = new Map<string, RuckusR710ApiService>()

async function getSession(device: AgentJob['device']): Promise<RuckusR710ApiService> {
  const existing = sessions.get(device.ipAddress)
  if (existing) return existing

  const service = new RuckusR710ApiService({
    ipAddress: device.ipAddress,
    adminUsername: device.adminUsername,
    adminPassword: device.adminPassword,
  })
  const login = await service.login()
  if (!login.success) throw new Error(login.error || 'Failed to authenticate with local R710 device')
  await service.initializeSession()
  sessions.set(device.ipAddress, service)
  return service
}

function invalidateSession(ipAddress: string): void {
  sessions.delete(ipAddress)
}

export async function handleJob(job: AgentJob): Promise<AgentJobResult> {
  try {
    switch (job.jobType) {
      case 'TOKEN_GENERATE': {
        const service = await getSession(job.device)
        const params = job.params as {
          wlanName: string
          username: string
          duration: number
          durationUnit: 'hour' | 'day' | 'week'
          deviceLimit: number
        }
        try {
          const result = await service.generateSingleGuestPass(params)
          if (!result.success) invalidateSession(job.device.ipAddress)
          return { jobId: job.jobId, success: true, data: result }
        } catch (deviceError) {
          invalidateSession(job.device.ipAddress)
          throw deviceError
        }
      }

      case 'HEALTH_CHECK':
      case 'TEST_CONNECTION': {
        const service = await getSession(job.device)
        const info = await service.getSystemInfo()
        return { jobId: job.jobId, success: true, data: { reachable: true, systemInfo: info } }
      }

      case 'AUTO_GENERATE': {
        const service = await getSession(job.device)
        try {
          const result = await service.generateTokens(job.params as Parameters<typeof service.generateTokens>[0])
          if (!result.success) invalidateSession(job.device.ipAddress)
          return { jobId: job.jobId, success: true, data: result }
        } catch (deviceError) {
          invalidateSession(job.device.ipAddress)
          throw deviceError
        }
      }

      case 'TOKEN_SYNC': {
        const service = await getSession(job.device)
        const tokens = await service.queryAllTokens()
        return { jobId: job.jobId, success: true, data: { success: true, tokens } }
      }

      // Not yet wired — no caller in the main app dispatches this job type
      // yet (connected-clients-sync-service.ts has its own, separate
      // pre-existing issues, out of MBM-272's scope).
      case 'CONNECTED_CLIENTS_QUERY':
        return { jobId: job.jobId, success: false, error: `${job.jobType} is not yet supported by the local agent` }

      default:
        return { jobId: job.jobId, success: false, error: `Unknown job type: ${job.jobType}` }
    }
  } catch (error) {
    return { jobId: job.jobId, success: false, error: error instanceof Error ? error.message : String(error) }
  }
}
