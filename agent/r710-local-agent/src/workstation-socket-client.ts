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
 * (profile, business) currently owns the scale and calls this instance's
 * emitScaleWeight/emitScaleStatus only for that one.
 *
 * MBM-283: multiple instances can now also run concurrently for the SAME
 * profile — one per business paired to it on this machine — because
 * activateWorkstationBusiness() no longer disconnects a business's socket
 * just because a different business gained UI focus (see index.ts's header
 * comment). Registration in workstation-clients-registry.ts is keyed by
 * (profileId, businessId) accordingly.
 */

import { EventEmitter } from 'events'
import os from 'os'
import { io, Socket } from 'socket.io-client'
import {
  saveWorkstationConfig,
  deleteLegacyFlatWorkstationConfig,
  type WorkstationAgentConfig,
} from './workstation-config'
import { setActiveWorkstationBusinessId } from './active-workstation'
import { handleWorkstationJob, type WorkstationAgentJob, type WorkstationAgentJobResult } from './workstation-job-handler'
import { registerWorkstationClient, unregisterWorkstationClient, LEGACY_BUSINESS_KEY, type RelayTarget } from './workstation-clients-registry'
import { isAutoStartEnabled } from './tray'
import packageJson from '../package.json'

const AGENT_VERSION = packageJson.version

// See socket-client.ts's identical constant for the rationale.
const SYNC_INTERVAL_MS = 10 * 60 * 1000

export type WorkstationAgentConnectionState = 'connecting' | 'connected' | 'disconnected' | 'rejected'

export class WorkstationSocketClient extends EventEmitter implements RelayTarget {
  private socket: Socket | null = null
  private syncTimer: ReturnType<typeof setInterval> | null = null

  // MBM-276: tracked internally (not just via the 'state' event) so
  // index.ts's tray snapshot can always read the current state directly,
  // regardless of listener registration timing.
  lastState: WorkstationAgentConnectionState | undefined

  // MBM-283: this key ('' businessId, really) tracks which key this
  // instance is CURRENTLY registered under in workstation-clients-registry
  // — starts at config.businessId (or the legacy placeholder if not yet
  // known) and is updated in place if the legacy-migration branch below
  // assigns a real businessId later, so start()/stop() always
  // register/unregister under whatever key is actually current.
  private registryBusinessId: string

  constructor(
    readonly profileId: string,
    private readonly config: WorkstationAgentConfig
  ) {
    super()
    this.registryBusinessId = config.businessId ?? LEGACY_BUSINESS_KEY
  }

  // Exposes the live, continuously-synced config for display (index.ts's
  // refreshTray()/getManageSnapshot()) instead of a second, possibly-stale
  // disk read — this instance's in-memory copy IS the current source of
  // truth for whatever's actually connected right now, migrated or not (see
  // syncConfig()'s businessId-migration branch below).
  getConfig(): Readonly<WorkstationAgentConfig> {
    return this.config
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
    registerWorkstationClient(this.profileId, this.registryBusinessId, this)

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
        {
          agentToken: this.config.agentToken,
          hostLabel: os.hostname(),
          agentVersion: AGENT_VERSION,
          autoStartEnabled: isAutoStartEnabled(),
        },
        (ack: { success: boolean; error?: string }) => {
          if (ack.success) {
            this.setState('connected')
            this.syncConfig()
            if (!this.syncTimer) this.syncTimer = setInterval(() => this.syncConfig(), SYNC_INTERVAL_MS)
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
      // Read config.businessId fresh on every job (not captured earlier) —
      // once the legacy-migration branch in syncConfig() below assigns it,
      // every job from this point on is correctly scoped to the real
      // business instead of the LEGACY_BUSINESS_KEY placeholder.
      const result: WorkstationAgentJobResult = await handleWorkstationJob(this.profileId, this.config.businessId ?? LEGACY_BUSINESS_KEY, job)
      socket.emit('workstation-agent:result', result)
    })

    // Server-pushed — see agent-hub.ts's requestSync() for when this fires
    // (a printer's routing was just saved). Re-syncs this profile's own
    // config immediately rather than waiting up to 10 minutes for the next
    // scheduled sync, AND asks index.ts to refresh the whole-agent printer
    // list (a separate, non-per-profile concern this class has no access
    // to) in case a printer was installed in Windows after this agent
    // process started, since that list is otherwise only ever read once at
    // startup.
    socket.on('workstation-agent:force-sync', () => {
      this.syncConfig()
      this.emit('force-refresh-printers')
    })
  }

  stop(): void {
    if (this.syncTimer) { clearInterval(this.syncTimer); this.syncTimer = null }
    this.socket?.disconnect()
    this.socket = null
    unregisterWorkstationClient(this.profileId, this.registryBusinessId, this)
  }

  // Mirrors socket-client.ts's reportAutoStart() — see its comment.
  reportAutoStart(enabled: boolean): void {
    this.socket?.emit('workstation-agent:status-update', { autoStartEnabled: enabled })
  }

  // Mirrors socket-client.ts's syncDeviceInfo() — see its comment for the
  // rationale (this pairing's database-driven config shouldn't be a
  // one-time snapshot from pairing time). Here it's which printers route
  // through this workstation, the configured scale COM port/baud rate, and
  // the business name — all admin-configured server-side, none of it a
  // secret, all of it useful for the tray to show.
  private syncConfig(): void {
    this.socket?.emit(
      'workstation-agent:sync',
      {},
      (ack: { success: boolean; businessId?: string; businessName?: string; printers?: string[]; scaleComPort?: string; scaleBaudRate?: number; qzPrinterName?: string }) => {
        if (!ack?.success) return

        // MBM-279: a config connected from the pre-MBM-279 flat file (or the
        // even older pre-MBM-276 one, chained through legacy-migration.ts)
        // won't have a businessId yet — this is the one-time, live-triggered
        // migration into businesses/<businessId>/workstation.json. Runs at
        // most once per pairing: after this, this.config.businessId is set,
        // so this branch never runs again for it.
        if (!this.config.businessId && ack.businessId) {
          this.config.businessId = ack.businessId
          saveWorkstationConfig(this.profileId, ack.businessId, this.config)
          deleteLegacyFlatWorkstationConfig(this.profileId)
          setActiveWorkstationBusinessId(this.profileId, ack.businessId)
          // Re-key this instance's registry entry from the LEGACY_BUSINESS_KEY
          // placeholder to the now-known real businessId, so scale-ownership
          // relay lookups (workstation-job-handler.ts) find it correctly.
          unregisterWorkstationClient(this.profileId, this.registryBusinessId, this)
          this.registryBusinessId = ack.businessId
          registerWorkstationClient(this.profileId, this.registryBusinessId, this)
          // index.ts's own workstationClients map is keyed the same way —
          // tell it to re-key its entry too, since this class has no access
          // to that map directly.
          this.emit('business-id-migrated', ack.businessId)
          console.log(`[Workstation Agent] [${this.config.label}] Migrated to per-business storage (business ${ack.businessId})`)
        }

        const changed =
          ack.businessName !== this.config.businessName ||
          ack.scaleComPort !== this.config.scaleComPort ||
          ack.scaleBaudRate !== this.config.scaleBaudRate ||
          ack.qzPrinterName !== this.config.qzPrinterName ||
          JSON.stringify(ack.printers ?? []) !== JSON.stringify(this.config.configuredPrinters ?? [])
        if (!changed) return
        this.config.businessName = ack.businessName
        this.config.configuredPrinters = ack.printers
        this.config.scaleComPort = ack.scaleComPort
        this.config.scaleBaudRate = ack.scaleBaudRate
        this.config.qzPrinterName = ack.qzPrinterName
        // this.config.businessId is always set by this point — either it was
        // already there, or the migration branch above just set it.
        saveWorkstationConfig(this.profileId, this.config.businessId!, this.config)
        this.emit('config-updated')
      }
    )
  }
}
