/**
 * MBM-272: R710 Local Agent entrypoint.
 *
 * Unpaired  -> listen locally for the one-time pairing handshake.
 * Paired    -> connect out to the central server and stay connected,
 *              executing jobs it's sent for as long as the process runs.
 */

import { loadConfig, clearConfig, type AgentConfig } from './config'
import { startPairingServer } from './pairing-server'
import { AgentSocketClient, type AgentConnectionState } from './socket-client'
import { startTray, setTrayStatus, setTrayUnpaired, setTrayConnectError } from './tray'

let client: AgentSocketClient | null = null

function safeStartTray(onQuit: () => void, onRestart: () => void, label?: string): void {
  try {
    startTray(onQuit, onRestart, label)
  } catch (error) {
    // Tray icon is a nice-to-have for at-a-glance status, not a dependency
    // of the agent actually working — never let a tray failure take the
    // whole agent down.
    console.error('[R710 Agent] Tray icon failed to start (continuing headless):', error)
  }
}

// Re-enters pairing mode on an already-running process — used both for a
// fresh, never-paired install and for recovering from a revoked pairing
// (see the 'rejected' handler below). Previously, once config.json existed,
// the pairing server (pairing-server.ts) never ran again for the life of
// the process, even after the server rejected a revoked token — the only
// way back in was manually finding and deleting that file by hand.
function enterPairingMode(): void {
  try { setTrayUnpaired() } catch { /* tray optional */ }
  startPairingServer((config) => {
    console.log('[R710 Agent] Paired successfully — connecting to central server.')
    connect(config)
  })
}

function connect(config: AgentConfig): void {
  client = new AgentSocketClient(config)
  client.on('state', (state: AgentConnectionState) => {
    console.log(`[R710 Agent] Connection state: ${state}`)
    try { setTrayStatus(state) } catch { /* tray optional */ }
  })
  client.on('connect_error', (message: string) => {
    console.error('[R710 Agent] Connection error:', message)
    try { setTrayConnectError(message) } catch { /* tray optional */ }
  })
  client.on('rejected', (error?: string) => {
    console.error('[R710 Agent] Pairing rejected by server (likely revoked from the admin panel):', error || '(no reason given)')
    console.error('[R710 Agent] Clearing local pairing and re-opening for pairing.')
    client?.stop()
    client = null
    clearConfig()
    enterPairingMode()
  })
  client.start()
}

function main(): void {
  console.log('[R710 Agent] Starting…')

  const onQuit = () => process.exit(0)
  const onRestart = () => {
    client?.stop()
    const config = loadConfig()
    if (config) connect(config)
  }

  const existingConfig = loadConfig()
  if (existingConfig) {
    safeStartTray(onQuit, onRestart, existingConfig.label)
    connect(existingConfig)
    return
  }

  try { setTrayUnpaired() } catch { /* tray optional */ }
  safeStartTray(onQuit, onRestart)
  enterPairingMode()
}

main()

process.on('SIGINT', () => { client?.stop(); process.exit(0) })
process.on('SIGTERM', () => { client?.stop(); process.exit(0) })

// Defense in depth: the agent's one real job is keeping the connection to
// the central server alive. An uncaught exception anywhere in a dependency
// (tray internals, a bad job payload, etc.) must never silently kill that —
// log it and keep running rather than let the whole process die. Any error
// truly worth crashing over should be raised inside a code path we control,
// not left to the default "crash the process" behavior.
process.on('uncaughtException', (error) => {
  console.error('[R710 Agent] Uncaught exception (continuing):', error)
})
process.on('unhandledRejection', (reason) => {
  console.error('[R710 Agent] Unhandled rejection (continuing):', reason)
})
