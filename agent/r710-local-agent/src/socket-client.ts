/**
 * MBM-272: the agent's persistent, outbound-only connection to the central
 * app server. Reconnects automatically (socket.io-client's built-in
 * exponential backoff) across any brief network blip — no bespoke retry
 * logic needed here.
 */

import { EventEmitter } from 'events'
import os from 'os'
import { io, Socket } from 'socket.io-client'
import { saveConfig, type AgentConfig } from './config'
import { handleJob, type AgentJob, type AgentJobResult } from './job-handler'
import { isAutoStartEnabled } from './tray'
import packageJson from '../package.json'

// How often to re-ask the server for this device's current IP while
// connected — see syncDeviceInfo()'s comment. 10 minutes: frequent enough
// that an IP edited on the admin panel shows up in the tray well within a
// single work shift, infrequent enough to be a non-event for the server.
const SYNC_INTERVAL_MS = 10 * 60 * 1000

// Single source of truth: package.json's version, not a separately hardcoded
// constant. This was previously '0.1.0' hardcoded here, never bumped despite
// several real fixes shipping across sessions — making it useless as a
// signal for whether a workstation's agent is running current code. Reading
// it from package.json means bumping the version in one place (when
// building a release) automatically flows through to what the agent reports
// on every connect, which the admin panel compares against to show an
// "update available" prompt (see /api/admin/r710/agents/latest-version).
const AGENT_VERSION = packageJson.version

export type AgentConnectionState = 'connecting' | 'connected' | 'disconnected' | 'rejected'

export class AgentSocketClient extends EventEmitter {
  private socket: Socket | null = null
  private syncTimer: ReturnType<typeof setInterval> | null = null

  // MBM-276: tracked internally (not just via the 'state' event) so
  // index.ts's tray snapshot can always read the current state directly,
  // regardless of listener registration timing.
  lastState: AgentConnectionState | undefined

  // Identifies which profile this connection belongs to — R710 has no
  // ownership/exclusivity concern (see profile-store.ts's header), so this
  // is purely for the tray/registry to know which profile a given running
  // connection is, not used in any connection logic here.
  constructor(readonly profileId: string, private readonly config: AgentConfig) {
    super()
  }

  private setState(state: AgentConnectionState): void {
    this.lastState = state
    this.emit('state', state)
  }

  start(): void {
    this.setState('connecting')

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
        { agentToken: this.config.agentToken, hostLabel: os.hostname(), agentVersion: AGENT_VERSION, autoStartEnabled: isAutoStartEnabled() },
        (ack: { success: boolean; error?: string }) => {
          if (ack.success) {
            this.setState('connected')
            this.syncDeviceInfo()
            if (!this.syncTimer) this.syncTimer = setInterval(() => this.syncDeviceInfo(), SYNC_INTERVAL_MS)
          } else {
            // Invalid/revoked token — no point retrying with the same one.
            this.setState('rejected')
            this.emit('rejected', ack.error)
            socket.disconnect()
          }
        }
      )
    })

    socket.on('disconnect', (reason) => {
      this.setState('disconnected')
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
    if (this.syncTimer) { clearInterval(this.syncTimer); this.syncTimer = null }
    this.socket?.disconnect()
    this.socket = null
  }

  // One-way, agent-initiated notification — used when auto-start is toggled
  // locally (tray) or by a different profile's remote job while THIS
  // profile stays connected, so its server's DB row never goes stale
  // without requiring a reconnect. See tray.ts's setOnAutoStartChanged().
  reportAutoStart(enabled: boolean): void {
    this.socket?.emit('r710-agent:status-update', { autoStartEnabled: enabled })
  }

  // Pulls the device's CURRENT IP from the server and updates this
  // profile's own saved r710.json + emits 'config-updated' if it changed —
  // called right after connecting and then on a timer for as long as the
  // connection stays up. Without this, deviceIpAddress is only ever a
  // one-time snapshot taken at pairing time: an admin editing the device's
  // IP later would leave the tray silently showing the old one, possibly
  // for as long as this connection happens to stay alive (could be days).
  private syncDeviceInfo(): void {
    this.socket?.emit(
      'r710-agent:sync',
      {},
      (ack: { success: boolean; deviceIpAddress?: string }) => {
        if (!ack?.success || !ack.deviceIpAddress) return
        if (ack.deviceIpAddress === this.config.deviceIpAddress) return
        this.config.deviceIpAddress = ack.deviceIpAddress
        saveConfig(this.profileId, this.config)
        this.emit('config-updated')
      }
    )
  }
}
