/**
 * MBM-272: the agent's persistent, outbound-only connection to the central
 * app server. Reconnects automatically (socket.io-client's built-in
 * exponential backoff) across any brief network blip — no bespoke retry
 * logic needed here.
 */

import { EventEmitter } from 'events'
import os from 'os'
import { io, Socket } from 'socket.io-client'
import type { AgentConfig } from './config'
import { handleJob, type AgentJob, type AgentJobResult } from './job-handler'

const AGENT_VERSION = '0.1.0'

export type AgentConnectionState = 'connecting' | 'connected' | 'disconnected' | 'rejected'

export class AgentSocketClient extends EventEmitter {
  private socket: Socket | null = null

  constructor(private readonly config: AgentConfig) {
    super()
  }

  start(): void {
    this.emit('state', 'connecting' satisfies AgentConnectionState)

    const socket = io(this.config.serverUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 30000,
    })
    this.socket = socket

    socket.on('connect', () => {
      socket.emit(
        'r710-agent:connect',
        { agentToken: this.config.agentToken, hostLabel: os.hostname(), agentVersion: AGENT_VERSION },
        (ack: { success: boolean; error?: string }) => {
          if (ack.success) {
            this.emit('state', 'connected' satisfies AgentConnectionState)
          } else {
            // Invalid/revoked token — no point retrying with the same one.
            this.emit('state', 'rejected' satisfies AgentConnectionState)
            this.emit('rejected', ack.error)
            socket.disconnect()
          }
        }
      )
    })

    socket.on('disconnect', () => {
      this.emit('state', 'disconnected' satisfies AgentConnectionState)
    })

    socket.on('r710-agent:job', async (job: AgentJob) => {
      const result: AgentJobResult = await handleJob(job)
      socket.emit('r710-agent:result', result)
    })
  }

  stop(): void {
    this.socket?.disconnect()
    this.socket = null
  }
}
