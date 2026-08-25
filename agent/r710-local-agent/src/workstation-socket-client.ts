/**
 * MBM-275: the workstation agent's persistent, outbound-only connection to
 * the central app server for scale + printer relay — independent of the
 * R710 socket connection in socket-client.ts (separate pairing, separate
 * token, separate event namespace), but structurally a direct mirror of it,
 * including the reconnect and rejection handling, which apply identically
 * here.
 *
 * MBM-276: profile-aware — multiple instances of this class now run
 * concurrently, one per paired server, all sharing the one scaleDriver
 * singleton (workstation-job-handler.ts). This instance no longer
 * subscribes to scaleDriver's events directly (that would relay every
 * profile's live weight/status to every OTHER connected profile too,
 * leaking one business's readings to another business's server) — instead
 * it registers itself in workstation-clients-registry.ts, and
 * workstation-job-handler.ts's single central relay looks up whichever
 * profile currently owns the scale and calls this instance's
 * emitScaleWeight/emitScaleStatus only for that one.
 */

import { EventEmitter } from 'events'
import os from 'os'
import { io, Socket } from 'socket.io-client'
import type { WorkstationAgentConfig } from './workstation-config'
import { handleWorkstationJob, type WorkstationAgentJob, type WorkstationAgentJobResult } from './workstation-job-handler'
import { registerWorkstationClient, unregisterWorkstationClient, type RelayTarget } from './workstation-clients-registry'
import { isAutoStartEnabled } from './tray'
import packageJson from '../package.json'

const AGENT_VERSION = packageJson.version

export type WorkstationAgentConnectionState = 'connecting' | 'connected' | 'disconnected' | 'rejected'

export class WorkstationSocketClient extends EventEmitter implements RelayTarget {
  private socket: Socket | null = null

  // MBM-276: tracked internally (not just via the 'state' event) so
  // index.ts's tray snapshot can always read the current state directly,
  // regardless of listener registration timing.
  lastState: WorkstationAgentConnectionState | undefined

  constructor(readonly profileId: string, private readonly config: WorkstationAgentConfig) {
    super()
  }

  private setState(state: WorkstationAgentConnectionState): void {
    this.lastState = state
    this.emit('state', state)
  }

  // RelayTarget implementation — called only by workstation-job-handler.ts's
  // central relay, only when this instance's profileId currently owns the
  // scale. Never call scaleDriver directly from here.
  emitScaleWeight(reading: unknown): void {
    this.socket?.emit('workstation-agent:scale-weight', reading)
  }
  emitScaleStatus(status: unknown): void {
    this.socket?.emit('workstation-agent:scale-status', status)
  }

  start(): void {
    this.setState('connecting')
    registerWorkstationClient(this.profileId, this)

    const socket = io(this.config.serverUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 30000,
      ...(this.config.caCert ? { ca: this.config.caCert } : {}),
    })
    this.socket = socket

    socket.on('connect_error', (error: Error) => {
      this.emit('connect_error', error.message)
    })

    socket.on('connect', () => {
      socket.emit(
        'workstation-agent:connect',
        { agentToken: this.config.agentToken, hostLabel: os.hostname(), agentVersion: AGENT_VERSION, autoStartEnabled: isAutoStartEnabled() },
        (ack: { success: boolean; error?: string }) => {
          if (ack.success) {
            this.setState('connected')
          } else {
            this.setState('rejected')
            this.emit('rejected', ack.error)
            socket.disconnect()
          }
        }
      )
    })

    socket.on('disconnect', (reason) => {
      this.setState('disconnected')
      // Same rationale as socket-client.ts: socket.io-client does not
      // auto-reconnect after a server-initiated disconnect (revoked
      // pairing), so an explicit reconnect attempt is needed to ever
      // recover into a fresh pairing/rejection cycle.
      if (reason === 'io server disconnect') {
        socket.connect()
      }
    })

    socket.on('workstation-agent:job', async (job: WorkstationAgentJob) => {
      const result: WorkstationAgentJobResult = await handleWorkstationJob(this.profileId, job)
      socket.emit('workstation-agent:result', result)
    })
  }

  stop(): void {
    this.socket?.disconnect()
    this.socket = null
    unregisterWorkstationClient(this.profileId, this)
  }

  // Mirrors socket-client.ts's reportAutoStart() — see its comment.
  reportAutoStart(enabled: boolean): void {
    this.socket?.emit('workstation-agent:status-update', { autoStartEnabled: enabled })
  }
}
