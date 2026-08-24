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
      // Trusts the server's own self-signed cert (see readRootCaCert() on
      // the pairing route) when it has one, in addition to Node's normal
      // trusted CA list — without this, an https:// serverUrl with a
      // self-signed cert fails TLS validation on every attempt, forever,
      // with nothing surfacing beyond the generic 'connect_error' below.
      ...(this.config.caCert ? { ca: this.config.caCert } : {}),
    })
    this.socket = socket

    // Without this, a connection that never succeeds even once — wrong
    // serverUrl, untrusted cert, firewalled port, DNS failure — is
    // completely silent: no 'connect' to report, no 'disconnect' since
    // nothing ever connected. The agent just sits at "connecting" forever
    // with zero indication of why. This is the single most useful line for
    // diagnosing "it's not pairing" reports.
    socket.on('connect_error', (error: Error) => {
      this.emit('connect_error', error.message)
    })

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

    socket.on('disconnect', (reason) => {
      this.emit('state', 'disconnected' satisfies AgentConnectionState)
      // socket.io-client deliberately does NOT auto-reconnect when the
      // *server* initiates the disconnect (reason 'io server disconnect') —
      // that's exactly what agent-hub.ts's disconnectAgent() does when an
      // admin revokes this pairing. Without reconnecting ourselves here,
      // a revoked agent would just go silent forever instead of ever
      // re-attempting the r710-agent:connect handshake, getting rejected,
      // and recovering into pairing mode (see index.ts).
      if (reason === 'io server disconnect') {
        socket.connect()
      }
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
