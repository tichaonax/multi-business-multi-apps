/**
 * MBM-272: R710 Local Agent entrypoint.
 *
 * Unpaired  -> listen locally for the one-time pairing handshake.
 * Paired    -> connect out to the central server and stay connected,
 *              executing jobs it's sent for as long as the process runs.
 */

import { loadConfig, type AgentConfig } from './config'
import { startPairingServer } from './pairing-server'
import { AgentSocketClient, type AgentConnectionState } from './socket-client'
import { startTray, setTrayStatus, setTrayUnpaired } from './tray'

let client: AgentSocketClient | null = null

function safeStartTray(onQuit: () => void, onRestart: () => void): void {
  try {
    startTray(onQuit, onRestart)
  } catch (error) {
    // Tray icon is a nice-to-have for at-a-glance status, not a dependency
    // of the agent actually working — never let a tray failure take the
    // whole agent down.
    console.error('[R710 Agent] Tray icon failed to start (continuing headless):', error)
  }
}

function connect(config: AgentConfig): void {
  client = new AgentSocketClient(config)
  client.on('state', (state: AgentConnectionState) => {
    console.log(`[R710 Agent] Connection state: ${state}`)
    try { setTrayStatus(state) } catch { /* tray optional */ }
  })
  client.on('rejected', (error?: string) => {
    console.error('[R710 Agent] Pairing rejected by server:', error || '(no reason given)')
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
    safeStartTray(onQuit, onRestart)
    connect(existingConfig)
    return
  }

  try { setTrayUnpaired() } catch { /* tray optional */ }
  safeStartTray(onQuit, onRestart)

  startPairingServer((config) => {
    console.log('[R710 Agent] Paired successfully — connecting to central server.')
    connect(config)
  })
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
