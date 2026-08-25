/**
 * MBM-272: R710 Local Agent entrypoint.
 * MBM-275: generalized to also run an independent workstation-agent
 * connection (scale + printer relay) in the same process — one running
 * agent, one tray icon, one install, but two separate pairings under the
 * hood (R710's existing pairing is left untouched; see workstation-config.ts
 * / workstation-socket-client.ts for the new one). A workstation can be
 * paired for R710 only, scale/print only, or both.
 *
 * Unpaired  -> listen locally for the one-time pairing handshake (either type).
 * Paired    -> connect out to the central server and stay connected,
 *              executing jobs it's sent for as long as the process runs.
 */

import { loadConfig, clearConfig, type AgentConfig } from './config'
import { loadWorkstationConfig, clearWorkstationConfig, type WorkstationAgentConfig } from './workstation-config'
import { startPairingServer } from './pairing-server'
import { AgentSocketClient, type AgentConnectionState } from './socket-client'
import { WorkstationSocketClient, type WorkstationAgentConnectionState } from './workstation-socket-client'
import { scaleDriver } from './workstation-job-handler'
import type { ScaleStatus } from './scale-driver'
import {
  startTray,
  setTrayR710Status,
  setTrayR710Unpaired,
  setTrayR710ConnectError,
  setTrayPrinterStatus,
  setTrayWorkstationUnpaired,
  setTrayWorkstationConnectError,
  setTrayScaleStatus,
} from './tray'

let client: AgentSocketClient | null = null
let workstationClient: WorkstationSocketClient | null = null

function safeStartTray(onQuit: () => void, onRestart: () => void, label?: string): void {
  try {
    startTray(onQuit, onRestart, label)
  } catch (error) {
    // Tray icon is a nice-to-have for at-a-glance status, not a dependency
    // of the agent actually working — never let a tray failure take the
    // whole agent down.
    console.error('[Agent] Tray icon failed to start (continuing headless):', error)
  }
}

// Registered exactly once, at startup, regardless of pairing/reconnect
// cycles — the scale driver is a process-wide singleton and this line
// should always reflect its live state, independent of whether the
// workstation-agent relay itself is currently up (see tray.ts's header
// comment for why Scale and Printer are shown as separate lines).
function wireScaleStatusToTray(): void {
  scaleDriver.on('status', (status: ScaleStatus) => {
    try { setTrayScaleStatus(status) } catch { /* tray optional */ }
  })
}

// Re-enters pairing mode on an already-running process — used both for a
// fresh, never-paired install and for recovering from a revoked pairing
// (see the 'rejected' handlers below). The pairing server accepts either
// pairing type and closes itself the moment ONE of them succeeds — if the
// other capability still needs pairing (or gets revoked later), this gets
// called again to reopen it.
function enterPairingMode(pending: { r710: boolean; workstation: boolean }): void {
  if (pending.r710) { try { setTrayR710Unpaired() } catch { /* tray optional */ } }
  if (pending.workstation) { try { setTrayWorkstationUnpaired() } catch { /* tray optional */ } }
  startPairingServer({
    onR710Paired: (config) => {
      console.log('[Agent] R710 paired successfully — connecting to central server.')
      connect(config)
    },
    onWorkstationPaired: (config) => {
      console.log('[Agent] Workstation (scale/print) paired successfully — connecting to central server.')
      connectWorkstation(config)
    },
  })
}

function connect(config: AgentConfig): void {
  client = new AgentSocketClient(config)
  client.on('state', (state: AgentConnectionState) => {
    console.log(`[R710 Agent] Connection state: ${state}`)
    try { setTrayR710Status(state) } catch { /* tray optional */ }
  })
  client.on('connect_error', (message: string) => {
    console.error('[R710 Agent] Connection error:', message)
    try { setTrayR710ConnectError(message) } catch { /* tray optional */ }
  })
  client.on('rejected', (error?: string) => {
    console.error('[R710 Agent] Pairing rejected by server (likely revoked from the admin panel):', error || '(no reason given)')
    console.error('[R710 Agent] Clearing local pairing and re-opening for pairing.')
    client?.stop()
    client = null
    clearConfig()
    enterPairingMode({ r710: true, workstation: false })
  })
  client.start()
}

function connectWorkstation(config: WorkstationAgentConfig): void {
  workstationClient = new WorkstationSocketClient(config)
  workstationClient.on('state', (state: WorkstationAgentConnectionState) => {
    console.log(`[Workstation Agent] Connection state: ${state}`)
    try { setTrayPrinterStatus(state) } catch { /* tray optional */ }
  })
  workstationClient.on('connect_error', (message: string) => {
    console.error('[Workstation Agent] Connection error:', message)
    try { setTrayWorkstationConnectError(message) } catch { /* tray optional */ }
  })
  workstationClient.on('rejected', (error?: string) => {
    console.error('[Workstation Agent] Pairing rejected by server (likely revoked from the admin panel):', error || '(no reason given)')
    console.error('[Workstation Agent] Clearing local pairing and re-opening for pairing.')
    workstationClient?.stop()
    workstationClient = null
    clearWorkstationConfig()
    enterPairingMode({ r710: false, workstation: true })
  })
  workstationClient.start()
}

function main(): void {
  console.log('[Agent] Starting…')
  wireScaleStatusToTray()

  const onQuit = () => process.exit(0)
  const onRestart = () => {
    client?.stop()
    workstationClient?.stop()
    const config = loadConfig()
    if (config) connect(config)
    const workstationConfig = loadWorkstationConfig()
    if (workstationConfig) connectWorkstation(workstationConfig)
  }

  const existingConfig = loadConfig()
  const existingWorkstationConfig = loadWorkstationConfig()

  if (existingConfig) connect(existingConfig)
  if (existingWorkstationConfig) connectWorkstation(existingWorkstationConfig)

  if (existingConfig || existingWorkstationConfig) {
    safeStartTray(onQuit, onRestart, existingConfig?.label ?? existingWorkstationConfig?.label)
    // One of the two may still be unpaired even though the other already
    // has a config on disk — make sure its tray line doesn't just say
    // "Starting…" forever.
    if (!existingConfig) { try { setTrayR710Unpaired() } catch { /* tray optional */ } }
    if (!existingWorkstationConfig) { try { setTrayWorkstationUnpaired() } catch { /* tray optional */ } }
    return
  }

  safeStartTray(onQuit, onRestart)
  enterPairingMode({ r710: true, workstation: true })
}

main()

process.on('SIGINT', () => { client?.stop(); workstationClient?.stop(); process.exit(0) })
process.on('SIGTERM', () => { client?.stop(); workstationClient?.stop(); process.exit(0) })

// Defense in depth: the agent's one real job is keeping the connection to
// the central server alive. An uncaught exception anywhere in a dependency
// (tray internals, a bad job payload, etc.) must never silently kill that —
// log it and keep running rather than let the whole process die. Any error
// truly worth crashing over should be raised inside a code path we control,
// not left to the default "crash the process" behavior.
process.on('uncaughtException', (error) => {
  console.error('[Agent] Uncaught exception (continuing):', error)
})
process.on('unhandledRejection', (reason) => {
  console.error('[Agent] Unhandled rejection (continuing):', reason)
})
