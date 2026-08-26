/**
 * MBM-272: R710 Agent Hub
 *
 * Server-side counterpart to R710SessionManager for AGENT-mode devices.
 * Tracks which local agents are currently connected (one persistent
 * Socket.io connection per paired workstation), dispatches jobs to them,
 * and resolves/rejects the caller's promise when the agent responds — or
 * immediately/on-timeout if it doesn't.
 *
 * The agent dials OUT to this server (same Socket.io instance server.ts
 * already runs for customer-display sync), so no inbound connectivity to
 * the remote site is ever required.
 */

import { randomUUID } from 'crypto'
import type { Server as SocketIOServer, Socket } from 'socket.io'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

const JOB_TIMEOUT_MS = 20_000

export type R710AgentJobType =
  | 'TOKEN_GENERATE'
  | 'HEALTH_CHECK'
  | 'TEST_CONNECTION'
  | 'CONNECTED_CLIENTS_QUERY'
  | 'AUTO_GENERATE'
  | 'TOKEN_SYNC'
  | 'AGENT_SET_AUTO_START'

export interface AgentJobPayload {
  jobType: R710AgentJobType
  // Every device-specific job type needs this; AGENT_SET_AUTO_START is a
  // process-level control action with no device involved, hence optional.
  device?: { ipAddress: string; adminUsername: string; adminPassword: string }
  params?: unknown
}

export interface AgentJobResult {
  success: boolean
  data?: unknown
  error?: string
}

export class AgentDispatchError extends Error {
  code: 'AGENT_OFFLINE' | 'TIMEOUT'
  constructor(code: 'AGENT_OFFLINE' | 'TIMEOUT') {
    super(code)
    this.code = code
    this.name = 'AgentDispatchError'
  }
}

interface PendingJob {
  agentId: string
  resolve: (result: AgentJobResult) => void
  reject: (err: Error) => void
  timeoutHandle: ReturnType<typeof setTimeout>
  settled: boolean
}

class R710AgentHub {
  private io: SocketIOServer | null = null
  // deviceRegistryId -> currently connected agent for that device
  private connectedAgents = new Map<string, { agentId: string; socketId: string }>()
  private pendingJobs = new Map<string, PendingJob>()

  /** Wire agent connection/result handling into the shared Socket.io server. Call once. */
  attach(io: SocketIOServer): void {
    if (this.io === io) return // already attached to this exact server instance
    this.io = io

    io.on('connection', (socket) => {
      socket.on('r710-agent:connect', (data, ack) => this.handleAgentConnect(socket, data, ack))
      socket.on('r710-agent:result', (data) => this.handleAgentResult(data))
      socket.on('r710-agent:status-update', (data) => this.handleStatusUpdate(socket, data))
      socket.on('r710-agent:sync', (data, ack) => this.handleSync(socket, ack))
      socket.on('disconnect', () => this.handleDisconnect(socket))
    })

    console.log('[R710AgentHub] Attached to Socket.io server')
  }

  private async handleAgentConnect(
    socket: Socket,
    data: { agentToken?: string; hostLabel?: string; agentVersion?: string; autoStartEnabled?: boolean },
    ack?: (res: { success: boolean; error?: string }) => void
  ): Promise<void> {
    try {
      const agentToken = data?.agentToken
      if (!agentToken) {
        ack?.({ success: false, error: 'Missing agent token' })
        return
      }

      // Tokens are stored bcrypt-hashed, so we can't look them up by value —
      // scan active (non-revoked) agents and compare. Fine at this scale
      // (one row per paired remote workstation); revisit if that ever grows
      // large enough to matter.
      const candidates = await prisma.r710RemoteAgents.findMany({
        where: { revokedAt: null },
        select: { id: true, deviceRegistryId: true, agentTokenHash: true },
      })

      let matched: { id: string; deviceRegistryId: string } | null = null
      for (const candidate of candidates) {
        if (await bcrypt.compare(agentToken, candidate.agentTokenHash)) {
          matched = { id: candidate.id, deviceRegistryId: candidate.deviceRegistryId }
          break
        }
      }

      if (!matched) {
        ack?.({ success: false, error: 'Invalid or revoked agent token' })
        socket.disconnect(true)
        return
      }

      ;(socket.data as any).r710AgentId = matched.id
      ;(socket.data as any).r710DeviceRegistryId = matched.deviceRegistryId
      socket.join(`r710-device:${matched.deviceRegistryId}`)
      this.connectedAgents.set(matched.deviceRegistryId, { agentId: matched.id, socketId: socket.id })

      await prisma.r710RemoteAgents.update({
        where: { id: matched.id },
        data: {
          connectionStatus: 'ONLINE',
          lastConnectedAt: new Date(),
          lastSeenAt: new Date(),
          hostLabel: data.hostLabel ?? undefined,
          agentVersion: data.agentVersion ?? undefined,
          autoStartEnabled: data.autoStartEnabled ?? undefined,
          lastError: null,
        },
      })

      ack?.({ success: true })
      console.log(`[R710AgentHub] Agent ${matched.id} connected for device ${matched.deviceRegistryId}`)
    } catch (error) {
      console.error('[R710AgentHub] Error handling agent connect:', error)
      ack?.({ success: false, error: 'Internal error' })
    }
  }

  // One-way, agent-initiated: the agent proactively reports a change (auto-
  // start toggled from the tray, or by a different profile's remote job)
  // without a request/response round trip — see socket-client.ts's
  // reportAutoStart(). No ack: nothing for the agent to act on either way.
  private async handleStatusUpdate(socket: Socket, data: { autoStartEnabled?: boolean }): Promise<void> {
    const agentId = (socket.data as any)?.r710AgentId as string | undefined
    if (!agentId || data.autoStartEnabled === undefined) return
    await prisma.r710RemoteAgents.update({
      where: { id: agentId },
      data: { autoStartEnabled: data.autoStartEnabled },
    }).catch(() => {})
  }

  // Agent-initiated, called right after connecting and then periodically
  // for as long as the connection stays up (see socket-client.ts) — the
  // agent's own pairing snapshot (deviceIpAddress, taken once at pair time
  // purely for the tray's display) otherwise never learns about a device
  // edited later on the admin panel until the next reconnect, which could
  // be a very long time on a stable connection. This closes that gap
  // without needing a separate push-on-edit mechanism.
  private async handleSync(
    socket: Socket,
    ack?: (res: { success: boolean; deviceIpAddress?: string; error?: string }) => void
  ): Promise<void> {
    const deviceRegistryId = (socket.data as any)?.r710DeviceRegistryId as string | undefined
    if (!deviceRegistryId) {
      ack?.({ success: false, error: 'Not connected' })
      return
    }
    const device = await prisma.r710DeviceRegistry.findUnique({
      where: { id: deviceRegistryId },
      select: { ipAddress: true },
    })
    ack?.({ success: true, deviceIpAddress: device?.ipAddress })
  }

  private handleAgentResult(data: { jobId: string; success: boolean; data?: unknown; error?: string }): void {
    const pending = this.pendingJobs.get(data?.jobId)
    if (!pending || pending.settled) return // late or unknown response — discard
    pending.settled = true
    clearTimeout(pending.timeoutHandle)
    this.pendingJobs.delete(data.jobId)
    pending.resolve({ success: data.success, data: data.data, error: data.error })
  }

  private async handleDisconnect(socket: Socket): Promise<void> {
    const agentId = (socket.data as any)?.r710AgentId as string | undefined
    const deviceRegistryId = (socket.data as any)?.r710DeviceRegistryId as string | undefined
    if (!agentId || !deviceRegistryId) return // not an agent socket

    const current = this.connectedAgents.get(deviceRegistryId)
    if (current?.socketId === socket.id) {
      this.connectedAgents.delete(deviceRegistryId)
    }

    // Immediately fail anything still waiting on this agent instead of
    // leaving it to the dispatch timeout.
    for (const [jobId, pending] of this.pendingJobs) {
      if (pending.agentId === agentId && !pending.settled) {
        pending.settled = true
        clearTimeout(pending.timeoutHandle)
        this.pendingJobs.delete(jobId)
        pending.reject(new AgentDispatchError('AGENT_OFFLINE'))
      }
    }

    await prisma.r710RemoteAgents.update({
      where: { id: agentId },
      data: { connectionStatus: 'OFFLINE' },
    }).catch(() => {})

    console.log(`[R710AgentHub] Agent ${agentId} disconnected`)
  }

  isAgentConnected(deviceRegistryId: string): boolean {
    return this.connectedAgents.has(deviceRegistryId)
  }

  /** Force-disconnect a live agent socket (e.g. its pairing was just revoked). No-op if not connected. */
  disconnectAgent(deviceRegistryId: string): void {
    const connected = this.connectedAgents.get(deviceRegistryId)
    if (!connected || !this.io) return
    const socket = this.io.sockets.sockets.get(connected.socketId)
    socket?.disconnect(true)
  }

  /**
   * Dispatch a job to the agent paired with this device and await the
   * result. Throws AgentDispatchError('AGENT_OFFLINE') if no agent is
   * connected, AgentDispatchError('TIMEOUT') if it doesn't answer in time —
   * a late response after a timeout is logged and discarded, never applied.
   */
  async dispatchJob(deviceRegistryId: string, payload: AgentJobPayload): Promise<AgentJobResult> {
    if (!this.io) throw new Error('R710AgentHub not attached to a Socket.io server')

    const connected = this.connectedAgents.get(deviceRegistryId)
    if (!connected) {
      throw new AgentDispatchError('AGENT_OFFLINE')
    }

    const jobId = randomUUID()

    return new Promise<AgentJobResult>((resolve, reject) => {
      const timeoutHandle = setTimeout(() => {
        const pending = this.pendingJobs.get(jobId)
        if (pending && !pending.settled) {
          pending.settled = true
          this.pendingJobs.delete(jobId)
          reject(new AgentDispatchError('TIMEOUT'))
        }
      }, JOB_TIMEOUT_MS)

      this.pendingJobs.set(jobId, { agentId: connected.agentId, resolve, reject, timeoutHandle, settled: false })

      this.io!.to(`r710-device:${deviceRegistryId}`).emit('r710-agent:job', { jobId, ...payload })
    })
  }
}

// Singleton — one hub per server process, mirroring getR710SessionManager().
const g = global as typeof globalThis & { __r710AgentHub?: R710AgentHub }
export const r710AgentHub: R710AgentHub = g.__r710AgentHub ?? (g.__r710AgentHub = new R710AgentHub())
