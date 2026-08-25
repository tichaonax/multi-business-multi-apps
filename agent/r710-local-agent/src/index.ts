/**
 * MBM-272: R710 Local Agent entrypoint.
 * MBM-275: generalized to also run an independent workstation-agent
 * connection (scale + printer relay) in the same process.
 * MBM-276: rewritten around multiple, fully isolated server profiles (see
 * profile-store.ts). Every profile with an r710.json and/or a
 * workstation.json connects and stays connected concurrently — there is no
 * "active profile" exclusivity for R710 or Printer relay (plan Section
 * 2a); only the physical scale has a real exclusivity constraint, enforced
 * in workstation-job-handler.ts via scale-owner.ts, not here. The pairing
 * HTTP server now runs for the entire process lifetime (not just until the
 * first pairing succeeds) so a new profile can be added at any time
 * without restarting the agent.
 */

import { migrateLegacyConfigIfNeeded } from './legacy-migration'
import { listProfileIds, readProfileMeta, touchProfileLastActive, deleteProfile } from './profile-store'
import { loadConfig, clearConfig, type AgentConfig } from './config'
import { loadWorkstationConfig, clearWorkstationConfig, type WorkstationAgentConfig } from './workstation-config'
import { startPairingServer, type ManageSnapshot } from './pairing-server'
import { AgentSocketClient, type AgentConnectionState } from './socket-client'
import { WorkstationSocketClient, type WorkstationAgentConnectionState } from './workstation-socket-client'
import { scaleDriver, releaseScale } from './workstation-job-handler'
import { getScaleOwner } from './scale-owner'
import type { ScaleStatus } from './scale-driver'
import { startTray, updateTrayState, setOnReleaseScale, setOnAutoStartChanged, isAutoStartEnabled, setAutoStart, type TrayState } from './tray'

const r710Clients = new Map<string, AgentSocketClient>()
const workstationClients = new Map<string, WorkstationSocketClient>()
let lastScaleStatus: ScaleStatus = { status: 'disconnected', comPort: null }

function safeStartTray(onQuit: () => void, onRestart: () => void): void {
  try {
    startTray(onQuit, onRestart)
  } catch (error) {
    // Tray icon is a nice-to-have for at-a-glance status, not a dependency
    // of the agent actually working — never let a tray failure take the
    // whole agent down.
    console.error('[Agent] Tray icon failed to start (continuing headless):', error)
  }
}

// Shared by refreshTray() and getManageSnapshot() — every currently
// connected profile, by id, with its own R710/workstation state. Read fresh
// on every call rather than cached, so both consumers always see the
// current connection maps.
function currentProfileIds(): string[] {
  return [...new Set([...r710Clients.keys(), ...workstationClients.keys()])]
}

// Rebuilds the full tray snapshot from current connection state + profile
// metadata and pushes it. Called after any change anywhere — connecting,
// disconnecting, a new pairing, a rejection, or a scale status change.
function refreshTray(): void {
  const owner = getScaleOwner()

  const profiles: TrayState['profiles'] = currentProfileIds().map(profileId => {
    const meta = readProfileMeta(profileId)
    return {
      profileId,
      label: meta?.label || profileId,
      r710State: r710Clients.get(profileId)?.lastState,
      workstationState: workstationClients.get(profileId)?.lastState,
    }
  })

  try {
    updateTrayState({
      profiles,
      scaleStatus: lastScaleStatus,
      scaleOwnerProfileId: owner?.profileId ?? null,
      scaleOwnerLabel: owner ? (readProfileMeta(owner.profileId)?.label || owner.profileId) : null,
    })
  } catch { /* tray optional */ }
}

// Same underlying state as refreshTray(), reshaped for the Manage Profiles
// web page (pairing-server.ts's GET /api/status) — includes serverUrl
// (which the tray has no need to show) and doesn't touch the tray itself.
function getManageSnapshot(): ManageSnapshot {
  const owner = getScaleOwner()

  const profiles: ManageSnapshot['profiles'] = currentProfileIds().map(profileId => {
    const meta = readProfileMeta(profileId)
    return {
      profileId,
      label: meta?.label || profileId,
      serverUrl: meta?.serverUrl || '',
      r710State: r710Clients.get(profileId)?.lastState,
      workstationState: workstationClients.get(profileId)?.lastState,
    }
  })

  return {
    profiles,
    scaleStatus: lastScaleStatus,
    scaleOwnerProfileId: owner?.profileId ?? null,
    scaleOwnerLabel: owner ? (readProfileMeta(owner.profileId)?.label || owner.profileId) : null,
    autoStartEnabled: isAutoStartEnabled(),
  }
}

// Fully removes a profile: stops both its live connections (if any),
// releases the scale first if it happened to be the current owner, then
// deletes its saved config from disk. Distinct from a "rejected" pairing
// (config already invalid, server-initiated) — this is a deliberate,
// locally-initiated removal via the Manage Profiles page.
function unpairProfile(profileId: string): void {
  r710Clients.get(profileId)?.stop()
  r710Clients.delete(profileId)
  workstationClients.get(profileId)?.stop()
  workstationClients.delete(profileId)

  const owner = getScaleOwner()
  if (owner?.profileId === profileId) releaseScale()

  deleteProfile(profileId)
  refreshTray()
}

// Auto-start is one process-wide registry setting, not per-profile — so
// however it changes (tray click, or a remote AGENT_SET_AUTO_START job
// landing on any one profile's connection), every OTHER connected profile's
// server needs to hear about it too, or its DB row goes stale. tray.ts's
// setAutoStart() calls the callback registered below exactly once per
// change, regardless of which code path triggered it.
function broadcastAutoStart(enabled: boolean): void {
  for (const client of r710Clients.values()) client.reportAutoStart(enabled)
  for (const client of workstationClients.values()) client.reportAutoStart(enabled)
}

function connectR710(profileId: string, config: AgentConfig): void {
  r710Clients.get(profileId)?.stop()

  const client = new AgentSocketClient(profileId, config)
  client.on('state', (state: AgentConnectionState) => {
    client.lastState = state
    console.log(`[R710 Agent] [${config.label}] Connection state: ${state}`)
    touchProfileLastActive(profileId)
    refreshTray()
  })
  client.on('connect_error', (message: string) => {
    console.error(`[R710 Agent] [${config.label}] Connection error:`, message)
  })
  client.on('rejected', (error?: string) => {
    console.error(`[R710 Agent] [${config.label}] Pairing rejected by server (likely revoked from the admin panel):`, error || '(no reason given)')
    client.stop()
    r710Clients.delete(profileId)
    clearConfig(profileId)
    refreshTray()
  })

  r710Clients.set(profileId, client)
  client.start()
}

function connectWorkstation(profileId: string, config: WorkstationAgentConfig): void {
  workstationClients.get(profileId)?.stop()

  const client = new WorkstationSocketClient(profileId, config)
  client.on('state', (state: WorkstationAgentConnectionState) => {
    client.lastState = state
    console.log(`[Workstation Agent] [${config.label}] Connection state: ${state}`)
    touchProfileLastActive(profileId)
    refreshTray()
  })
  client.on('connect_error', (message: string) => {
    console.error(`[Workstation Agent] [${config.label}] Connection error:`, message)
  })
  client.on('rejected', (error?: string) => {
    console.error(`[Workstation Agent] [${config.label}] Pairing rejected by server (likely revoked from the admin panel):`, error || '(no reason given)')
    client.stop()
    workstationClients.delete(profileId)
    clearWorkstationConfig(profileId)
    // If this profile happened to own the scale, release it rather than
    // leaving scale-owner.json pointing at a profile with no live client.
    const owner = getScaleOwner()
    if (owner?.profileId === profileId) releaseScale()
    refreshTray()
  })

  workstationClients.set(profileId, client)
  client.start()
}

// Connects every already-configured profile — called once at startup
// (after migration) and again on a manual Restart from the tray.
function connectAllProfiles(): void {
  for (const profileId of listProfileIds()) {
    const r710 = loadConfig(profileId)
    if (r710) connectR710(profileId, r710)

    const workstation = loadWorkstationConfig(profileId)
    if (workstation) connectWorkstation(profileId, workstation)
  }
  refreshTray()
}

function main(): void {
  console.log('[Agent] Starting…')

  migrateLegacyConfigIfNeeded()

  // Tray-visible scale status, independent of which profile (if any)
  // currently owns the connection — see workstation-job-handler.ts for the
  // separate, ownership-scoped relay to the owning profile's socket.
  scaleDriver.on('status', (status: ScaleStatus) => {
    lastScaleStatus = status
    refreshTray()
  })

  setOnReleaseScale(() => {
    releaseScale()
    refreshTray()
  })

  setOnAutoStartChanged((enabled) => {
    broadcastAutoStart(enabled)
    refreshTray()
  })

  const onQuit = () => process.exit(0)
  const onRestart = () => {
    for (const client of r710Clients.values()) client.stop()
    for (const client of workstationClients.values()) client.stop()
    r710Clients.clear()
    workstationClients.clear()
    connectAllProfiles()
  }

  safeStartTray(onQuit, onRestart)

  // The pairing endpoint now runs for the entire process lifetime (MBM-276)
  // — pairing to an additional server never requires restarting the agent,
  // and probing is scoped per-server so it correctly answers "does THIS
  // server have a profile here" regardless of what else is configured.
  startPairingServer({
    onR710Paired: (profileId, config) => {
      console.log(`[Agent] R710 paired successfully (${config.label}) — connecting to central server.`)
      connectR710(profileId, config)
    },
    onWorkstationPaired: (profileId, config) => {
      console.log(`[Agent] Workstation (scale/print) paired successfully (${config.label}) — connecting to central server.`)
      connectWorkstation(profileId, config)
    },
    getSnapshot: getManageSnapshot,
    unpairProfile,
    releaseScale: () => { releaseScale(); refreshTray() },
    setAutoStart,
    restart: onRestart,
  })

  connectAllProfiles()
}

main()

process.on('SIGINT', () => { for (const c of r710Clients.values()) c.stop(); for (const c of workstationClients.values()) c.stop(); process.exit(0) })
process.on('SIGTERM', () => { for (const c of r710Clients.values()) c.stop(); for (const c of workstationClients.values()) c.stop(); process.exit(0) })

// Defense in depth: the agent's one real job is keeping its connections to
// the central server(s) alive. An uncaught exception anywhere in a
// dependency (tray internals, a bad job payload, etc.) must never silently
// kill that — log it and keep running rather than let the whole process
// die. Any error truly worth crashing over should be raised inside a code
// path we control, not left to the default "crash the process" behavior.
process.on('uncaughtException', (error) => {
  console.error('[Agent] Uncaught exception (continuing):', error)
})
process.on('unhandledRejection', (reason) => {
  console.error('[Agent] Unhandled rejection (continuing):', reason)
})
