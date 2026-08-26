/**
 * MBM-275: Workstation Agent Hub
 *
 * Server-side counterpart to R710AgentHub (src/lib/r710/agent-hub.ts), for
 * the new workstation-agent pairing (scale + printer relay). Deliberately
 * structured as a close mirror of that file rather than a shared base class
 * — the two pairings are independent by design (see MBM-275 plan Section
 * 5a / Phase 2 notes), so keeping them as separate, readable files avoids
 * an abstraction that would make either harder to reason about on its own.
 *
 * One real structural difference from R710: a WorkstationAgents row IS the
 * agent (id doubles as both "the pairing" and "the agent"), whereas R710
 * pairs an agent to a separate deviceRegistryId — so this hub keys directly
 * on workstationAgentId, no separate device lookup needed. It also relays
 * continuous scale weight/status events to subscribed browser sessions
 * (via the existing emitToRoom() room mechanism), which R710 has never
 * needed since all its jobs are one-shot request/response.
 */

import { randomUUID } from 'crypto'
import type { Server as SocketIOServer, Socket } from 'socket.io'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { emitToRoom } from '@/lib/customer-display/socket-server'

const JOB_TIMEOUT_MS = 20_000

export type WorkstationAgentJobType =
  | 'SCALE_LIST_PORTS'
  | 'SCALE_CONNECT'
  | 'SCALE_DISCONNECT'
  | 'SCALE_RELEASE'
  | 'SCALE_TARE'
  | 'SCALE_DETECT_BAUD'
  | 'PRINT_RECEIPT'
  | 'PRINT_LIST_PRINTERS'
  | 'AGENT_SET_AUTO_START'

export interface WorkstationAgentJobPayload {
  jobType: WorkstationAgentJobType
  params?: unknown
}

export interface WorkstationAgentJobResult {
  success: boolean
  data?: unknown
  error?: string
}

export class WorkstationAgentDispatchError extends Error {
  code: 'AGENT_OFFLINE' | 'TIMEOUT'
  constructor(code: 'AGENT_OFFLINE' | 'TIMEOUT') {
    super(code)
    this.code = code
    this.name = 'WorkstationAgentDispatchError'
  }
}

interface PendingJob {
  workstationAgentId: string
  resolve: (result: WorkstationAgentJobResult) => void
  reject: (err: Error) => void
  timeoutHandle: ReturnType<typeof setTimeout>
  settled: boolean
}

function scaleRoom(workstationAgentId: string): string {
  return `workstation-scale:${workstationAgentId}`
}

class WorkstationAgentHub {
  private io: SocketIOServer | null = null
  // workstationAgentId -> currently connected socket for that agent
  private connectedAgents = new Map<string, { socketId: string }>()
  private pendingJobs = new Map<string, PendingJob>()

  /** Wire agent connection/result/streaming handling into the shared Socket.io server. Call once. */
  attach(io: SocketIOServer): void {
    if (this.io === io) return
    this.io = io

    io.on('connection', (socket) => {
      socket.on('workstation-agent:connect', (data, ack) => this.handleAgentConnect(socket, data, ack))
      socket.on('workstation-agent:result', (data) => this.handleAgentResult(data))
      socket.on('workstation-agent:scale-weight', (data) => this.handleScaleWeight(socket, data))
      socket.on('workstation-agent:scale-status', (data) => this.handleScaleStatus(socket, data))
      socket.on('workstation-agent:status-update', (data) => this.handleStatusUpdate(socket, data))
      socket.on('workstation-agent:sync', (data, ack) => this.handleSync(socket, ack))
      socket.on('disconnect', () => this.handleDisconnect(socket))
    })

    console.log('[WorkstationAgentHub] Attached to Socket.io server')
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

      // Same bcrypt-scan approach as R710AgentHub — tokens are hashed at
      // rest, so lookup is by comparison, not by value. Fine at this scale.
      const candidates = await prisma.workstationAgents.findMany({
        where: { revokedAt: null },
        select: { id: true, agentTokenHash: true },
      })

      let matched: { id: string } | null = null
      for (const candidate of candidates) {
        if (await bcrypt.compare(agentToken, candidate.agentTokenHash)) {
          matched = { id: candidate.id }
          break
        }
      }

      if (!matched) {
        ack?.({ success: false, error: 'Invalid or revoked agent token' })
        socket.disconnect(true)
        return
      }

      ;(socket.data as any).workstationAgentId = matched.id
      socket.join(`workstation-agent:${matched.id}`)
      this.connectedAgents.set(matched.id, { socketId: socket.id })

      await prisma.workstationAgents.update({
        where: { id: matched.id },
        data: {
          connectionStatus: 'ONLINE',
          lastConnectedAt: new Date(),
          lastSeenAt: new Date(),
          agentVersion: data.agentVersion ?? undefined,
          autoStartEnabled: data.autoStartEnabled ?? undefined,
          lastError: null,
        },
      })

      ack?.({ success: true })
      console.log(`[WorkstationAgentHub] Agent ${matched.id} (${data.hostLabel ?? 'unknown host'}) connected`)
    } catch (error) {
      console.error('[WorkstationAgentHub] Error handling agent connect:', error)
      ack?.({ success: false, error: 'Internal error' })
    }
  }

  // Agent-initiated, called right after connecting and then periodically —
  // mirrors R710AgentHub's handleSync(). Returns whatever this pairing's
  // *database-driven* config is (which printers route through it, the
  // configured scale COM port/baud rate, which business it belongs to) so
  // the tray can show it — anything the admin configured server-side that's
  // specific to this connection and isn't a secret. Deliberately excludes
  // agentTokenHash or anything credential-shaped.
  private async handleSync(
    socket: Socket,
    ack?: (res: { success: boolean; businessName?: string; printers?: string[]; scaleComPort?: string; scaleBaudRate?: number; qzPrinterName?: string }) => void
  ): Promise<void> {
    const workstationAgentId = (socket.data as any)?.workstationAgentId as string | undefined
    if (!workstationAgentId) {
      ack?.({ success: false })
      return
    }

    const [agent, printers, scaleConfig] = await Promise.all([
      prisma.workstationAgents.findUnique({ where: { id: workstationAgentId }, select: { businessId: true, businesses: { select: { name: true } } } }),
      prisma.networkPrinters.findMany({ where: { workstationAgentId, connectionMode: 'AGENT' }, select: { printerName: true } }),
      prisma.scaleDeviceConfigs.findFirst({ where: { workstationAgentId, isActive: true }, select: { comPort: true, baudRate: true } }),
    ])

    // Separate print path from the AGENT-relay `printers` list above — this
    // is whichever printer QZ Tray (a completely different program, running
    // directly in a user's browser) has been set up to use on THIS machine,
    // if any. Prefers this exact workstation's own QZ config over the
    // business-wide default — see qz-config/route.ts's GET for the same
    // fallback shape. Purely informational for the tray; never used to
    // route an actual AGENT print job.
    const qzConfig = agent
      ? await prisma.qzPrinterConfigs.findFirst({ where: { businessId: agent.businessId, workstationAgentId } })
        ?? await prisma.qzPrinterConfigs.findFirst({ where: { businessId: agent.businessId, workstationAgentId: null } })
      : null

    ack?.({
      success: true,
      businessName: agent?.businesses?.name,
      printers: printers.map(p => p.printerName),
      scaleComPort: scaleConfig?.comPort ?? undefined,
      scaleBaudRate: scaleConfig?.baudRate ?? undefined,
      qzPrinterName: qzConfig?.printerName,
    })
  }

  // One-way, agent-initiated — mirrors R710AgentHub's handleStatusUpdate().
  private async handleStatusUpdate(socket: Socket, data: { autoStartEnabled?: boolean }): Promise<void> {
    const workstationAgentId = (socket.data as any)?.workstationAgentId as string | undefined
    if (!workstationAgentId || data.autoStartEnabled === undefined) return
    await prisma.workstationAgents.update({
      where: { id: workstationAgentId },
      data: { autoStartEnabled: data.autoStartEnabled },
    }).catch(() => {})
  }

  private handleAgentResult(data: { jobId: string; success: boolean; data?: unknown; error?: string }): void {
    const pending = this.pendingJobs.get(data?.jobId)
    if (!pending || pending.settled) return
    pending.settled = true
    clearTimeout(pending.timeoutHandle)
    this.pendingJobs.delete(data.jobId)
    pending.resolve({ success: data.success, data: data.data, error: data.error })
  }

  private handleScaleWeight(socket: Socket, data: unknown): void {
    const workstationAgentId = (socket.data as any)?.workstationAgentId as string | undefined
    if (!workstationAgentId) return
    emitToRoom(scaleRoom(workstationAgentId), 'scale:weight', data)
  }

  private handleScaleStatus(socket: Socket, data: unknown): void {
    const workstationAgentId = (socket.data as any)?.workstationAgentId as string | undefined
    if (!workstationAgentId) return
    emitToRoom(scaleRoom(workstationAgentId), 'scale:status', data)
  }

  private async handleDisconnect(socket: Socket): Promise<void> {
    const workstationAgentId = (socket.data as any)?.workstationAgentId as string | undefined
    if (!workstationAgentId) return // not a workstation-agent socket

    const current = this.connectedAgents.get(workstationAgentId)
    if (current?.socketId === socket.id) {
      this.connectedAgents.delete(workstationAgentId)
    }

    for (const [jobId, pending] of this.pendingJobs) {
      if (pending.workstationAgentId === workstationAgentId && !pending.settled) {
        pending.settled = true
        clearTimeout(pending.timeoutHandle)
        this.pendingJobs.delete(jobId)
        pending.reject(new WorkstationAgentDispatchError('AGENT_OFFLINE'))
      }
    }

    // Let subscribed browsers know the scale went away with the agent,
    // rather than leaving the UI showing a stale "connected" reading.
    emitToRoom(scaleRoom(workstationAgentId), 'scale:status', { status: 'disconnected', comPort: null })

    await prisma.workstationAgents.update({
      where: { id: workstationAgentId },
      data: { connectionStatus: 'OFFLINE' },
    }).catch(() => {})

    console.log(`[WorkstationAgentHub] Agent ${workstationAgentId} disconnected`)
  }

  isAgentConnected(workstationAgentId: string): boolean {
    return this.connectedAgents.has(workstationAgentId)
  }

  /** Force-disconnect a live agent socket (e.g. its pairing was just revoked). No-op if not connected. */
  disconnectAgent(workstationAgentId: string): void {
    const connected = this.connectedAgents.get(workstationAgentId)
    if (!connected || !this.io) return
    const socket = this.io.sockets.sockets.get(connected.socketId)
    socket?.disconnect(true)
  }

  /**
   * Tells a connected agent to re-sync its config (business name, configured
   * printer(s), scale COM port/baud) right now, instead of waiting for its
   * own periodic timer — see workstation-socket-client.ts's syncConfig(),
   * which normally only runs right after connect and then every 10 minutes.
   * Call this whenever a server-side change makes that cached info stale
   * for this specific agent (e.g. a printer's connectionMode/
   * workstationAgentId was just saved) — otherwise an admin who just
   * finished routing a printer sees the tray/Manage Profiles page keep
   * showing the old, empty state for up to 10 minutes. No-op if the agent
   * isn't currently connected — its next real connect already syncs fresh.
   */
  requestSync(workstationAgentId: string): void {
    if (!this.io) return
    this.io.to(`workstation-agent:${workstationAgentId}`).emit('workstation-agent:force-sync')
  }

  /**
   * Dispatch a job to the given paired workstation agent and await the
   * result. Throws WorkstationAgentDispatchError('AGENT_OFFLINE') if no
   * agent is connected, ('TIMEOUT') if it doesn't answer in time.
   */
  async dispatchJob(workstationAgentId: string, payload: WorkstationAgentJobPayload): Promise<WorkstationAgentJobResult> {
    if (!this.io) throw new Error('WorkstationAgentHub not attached to a Socket.io server')

    const connected = this.connectedAgents.get(workstationAgentId)
    if (!connected) {
      throw new WorkstationAgentDispatchError('AGENT_OFFLINE')
    }

    const jobId = randomUUID()

    return new Promise<WorkstationAgentJobResult>((resolve, reject) => {
      const timeoutHandle = setTimeout(() => {
        const pending = this.pendingJobs.get(jobId)
        if (pending && !pending.settled) {
          pending.settled = true
          this.pendingJobs.delete(jobId)
          reject(new WorkstationAgentDispatchError('TIMEOUT'))
        }
      }, JOB_TIMEOUT_MS)

      this.pendingJobs.set(jobId, { workstationAgentId, resolve, reject, timeoutHandle, settled: false })

      this.io!.to(`workstation-agent:${workstationAgentId}`).emit('workstation-agent:job', { jobId, ...payload })
    })
  }
}

// Singleton — one hub per server process, mirroring r710AgentHub.
const g = global as typeof globalThis & { __workstationAgentHub?: WorkstationAgentHub }
export const workstationAgentHub: WorkstationAgentHub =
  g.__workstationAgentHub ?? (g.__workstationAgentHub = new WorkstationAgentHub())
