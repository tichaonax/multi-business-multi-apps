/**
 * MBM-275: the workstation agent's persistent, outbound-only connection to
 * the central app server for scale + printer relay — independent of the
 * R710 socket connection in socket-client.ts (separate pairing, separate
 * token, separate event namespace), but structurally a direct mirror of it,
 * including the reconnect and rejection handling, which apply identically
 * here.
 */

import { EventEmitter } from 'events'
import os from 'os'
import { io, Socket } from 'socket.io-client'
import type { WorkstationAgentConfig } from './workstation-config'
import { handleWorkstationJob, scaleDriver, type WorkstationAgentJob, type WorkstationAgentJobResult } from './workstation-job-handler'
import type { ScaleStatus, ScaleWeightReading } from './scale-driver'
import packageJson from '../package.json'

const AGENT_VERSION = packageJson.version

export type WorkstationAgentConnectionState = 'connecting' | 'connected' | 'disconnected' | 'rejected'

export class WorkstationSocketClient extends EventEmitter {
  private socket: Socket | null = null

  // Bound once per instance (not per start() call) so a restart — which
  // creates a fresh Socket but reuses this instance's lifecycle via
  // stop()+start() — never accumulates duplicate listeners on the shared
  // scaleDriver singleton. Always relays to whatever this.socket currently
  // is, not whatever it was when the listener was registered.
  private readonly onWeight = (reading: ScaleWeightReading): void => {
    this.socket?.emit('workstation-agent:scale-weight', reading)
  }
  private readonly onScaleStatus = (status: ScaleStatus): void => {
    this.socket?.emit('workstation-agent:scale-status', status)
  }

  constructor(private readonly config: WorkstationAgentConfig) {
    super()
    scaleDriver.on('weight', this.onWeight)
    scaleDriver.on('status', this.onScaleStatus)
  }

  start(): void {
    this.emit('state', 'connecting' satisfies WorkstationAgentConnectionState)

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
        { agentToken: this.config.agentToken, hostLabel: os.hostname(), agentVersion: AGENT_VERSION },
        (ack: { success: boolean; error?: string }) => {
          if (ack.success) {
            this.emit('state', 'connected' satisfies WorkstationAgentConnectionState)
          } else {
            this.emit('state', 'rejected' satisfies WorkstationAgentConnectionState)
            this.emit('rejected', ack.error)
            socket.disconnect()
          }
        }
      )
    })

    socket.on('disconnect', (reason) => {
      this.emit('state', 'disconnected' satisfies WorkstationAgentConnectionState)
      // Same rationale as socket-client.ts: socket.io-client does not
      // auto-reconnect after a server-initiated disconnect (revoked
      // pairing), so an explicit reconnect attempt is needed to ever
      // recover into a fresh pairing/rejection cycle.
      if (reason === 'io server disconnect') {
        socket.connect()
      }
    })

    socket.on('workstation-agent:job', async (job: WorkstationAgentJob) => {
      const result: WorkstationAgentJobResult = await handleWorkstationJob(job)
      socket.emit('workstation-agent:result', result)
    })
  }

  stop(): void {
    this.socket?.disconnect()
    this.socket = null
    scaleDriver.off('weight', this.onWeight)
    scaleDriver.off('status', this.onScaleStatus)
  }
}
