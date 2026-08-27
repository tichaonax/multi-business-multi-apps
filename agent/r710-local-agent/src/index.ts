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
import {
  loadWorkstationConfig,
  clearWorkstationConfig,
  listWorkstationBusinessIds,
  hasLegacyFlatWorkstationConfig,
  loadLegacyFlatWorkstationConfig,
  deleteLegacyFlatWorkstationConfig,
  type WorkstationAgentConfig,
} from './workstation-config'
import { getActiveWorkstationBusinessId, setActiveWorkstationBusinessId } from './active-workstation'
import { startPairingServer, type ManageSnapshot, type OtherWorkstationBusiness } from './pairing-server'
import { AgentSocketClient, type AgentConnectionState } from './socket-client'
import { WorkstationSocketClient, type WorkstationAgentConnectionState } from './workstation-socket-client'
import { scaleDriver, releaseScale } from './workstation-job-handler'
import { getScaleOwner } from './scale-owner'
import type { ScaleStatus } from './scale-driver'
import { startTray, updateTrayState, setOnReleaseScale, setOnAutoStartChanged, setOnSwitchWorkstationBusiness, isAutoStartEnabled, setAutoStart, type TrayState } from './tray'
import { listPrinters } from './print-driver'

const r710Clients = new Map<string, AgentSocketClient>()
const workstationClients = new Map<string, WorkstationSocketClient>()
let lastScaleStatus: ScaleStatus = { status: 'disconnected', comPort: null }
// Fetched once at startup (and again on Restart) — see TrayState's
// printerNames comment for why this isn't re-queried on every tray render.
let printerNames: string[] = []

function refreshPrinterList(): void {
  try {
    printerNames = listPrinters().map(p => p.name)
  } catch {
    printerNames = [] // PowerShell unavailable/blocked — tray just shows "none detected"
  }
}

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

// MBM-279: every OTHER business with a workstation pairing saved on this
// profile besides whichever is currently active — drives the tray's and
// Manage Profiles page's "Other businesses paired here / Switch to this"
// list (plan Section 6). Reads each one's own cached businessName/label for
// display; never anything credential-shaped.
function otherWorkstationBusinessesFor(profileId: string, activeBusinessId: string | undefined): OtherWorkstationBusiness[] {
  return listWorkstationBusinessIds(profileId)
    .filter(businessId => businessId !== activeBusinessId)
    .map(businessId => {
      const config = loadWorkstationConfig(profileId, businessId)
      return { businessId, label: config?.businessName || config?.label || businessId }
    })
}

// Rebuilds the full tray snapshot from current connection state + profile
// metadata and pushes it. Called after any change anywhere — connecting,
// disconnecting, a new pairing, a rejection, or a scale status change.
function refreshTray(): void {
  const owner = getScaleOwner()

  const profiles: TrayState['profiles'] = currentProfileIds().map(profileId => {
    const meta = readProfileMeta(profileId)
    // MBM-279: read from the connected client's own in-memory config, not a
    // fresh disk load — the client is the single source of truth for
    // whichever business is actually active on this profile right now
    // (loadWorkstationConfig() needs a businessId up front, which display
    // code here shouldn't need to already know).
    const workstation = workstationClients.get(profileId)?.getConfig()
    return {
      profileId,
      label: meta?.label || profileId,
      serverUrl: meta?.serverUrl || '',
      r710State: r710Clients.get(profileId)?.lastState,
      r710DeviceIp: loadConfig(profileId)?.deviceIpAddress,
      workstationState: workstationClients.get(profileId)?.lastState,
      businessName: workstation?.businessName,
      configuredPrinters: workstation?.configuredPrinters,
      scaleComPort: workstation?.scaleComPort,
      scaleBaudRate: workstation?.scaleBaudRate,
      qzPrinterName: workstation?.qzPrinterName,
      otherWorkstationBusinesses: otherWorkstationBusinessesFor(profileId, workstation?.businessId),
    }
  })

  try {
    updateTrayState({
      profiles,
      scaleStatus: lastScaleStatus,
      scaleOwnerProfileId: owner?.profileId ?? null,
      scaleOwnerLabel: owner ? (readProfileMeta(owner.profileId)?.label || owner.profileId) : null,
      printerNames,
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
    // See refreshTray()'s identical comment — same reasoning applies here.
    const workstation = workstationClients.get(profileId)?.getConfig()
    return {
      profileId,
      label: meta?.label || profileId,
      serverUrl: meta?.serverUrl || '',
      r710State: r710Clients.get(profileId)?.lastState,
      r710DeviceIp: loadConfig(profileId)?.deviceIpAddress,
      workstationState: workstationClients.get(profileId)?.lastState,
      businessName: workstation?.businessName,
      configuredPrinters: workstation?.configuredPrinters,
      qzPrinterName: workstation?.qzPrinterName,
      scaleComPort: workstation?.scaleComPort,
      scaleBaudRate: workstation?.scaleBaudRate,
      otherWorkstationBusinesses: otherWorkstationBusinessesFor(profileId, workstation?.businessId),
    }
  })

  return {
    profiles,
    scaleStatus: lastScaleStatus,
    scaleOwnerProfileId: owner?.profileId ?? null,
    scaleOwnerLabel: owner ? (readProfileMeta(owner.profileId)?.label || owner.profileId) : null,
    autoStartEnabled: isAutoStartEnabled(),
    printerNames,
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
  // Fired when a periodic sync (socket-client.ts's syncDeviceInfo()) finds
  // this device's IP has changed since pairing — refresh so the tray picks
  // up the new value from the profile file it just rewrote to disk.
  client.on('config-updated', () => refreshTray())

  r710Clients.set(profileId, client)
  client.start()
}

function connectWorkstation(profileId: string, config: WorkstationAgentConfig): void {
  workstationClients.get(profileId)?.stop()

  // MBM-279 follow-up: every OTHER business's workstationAgentId stored on
  // this same profile — lets the server re-point a shared printer still
  // routed to one of them onto this agent (see agent-hub.ts's
  // handleAgentConnect()), so a printer follows this active-business switch
  // instead of staying wherever it was last manually pointed.
  const siblingAgentIds = listWorkstationBusinessIds(profileId)
    .filter(businessId => businessId !== config.businessId)
    .map(businessId => loadWorkstationConfig(profileId, businessId)?.workstationAgentId)
    .filter((id): id is string => !!id)

  const client = new WorkstationSocketClient(profileId, config, siblingAgentIds)
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
    // MBM-279: config.businessId is only unset in the brief window before a
    // legacy (pre-businessId) pairing's first sync completes — if it's
    // rejected before ever syncing, there's nothing under businesses/<id>/
    // yet to clear, only the flat legacy file.
    if (config.businessId) {
      clearWorkstationConfig(profileId, config.businessId)
      if (getActiveWorkstationBusinessId(profileId) === config.businessId) {
        setActiveWorkstationBusinessId(profileId, null)
      }
    } else {
      deleteLegacyFlatWorkstationConfig(profileId)
    }
    // If this profile happened to own the scale, release it rather than
    // leaving scale-owner.json pointing at a profile with no live client.
    const owner = getScaleOwner()
    if (owner?.profileId === profileId) releaseScale()
    refreshTray()
  })
  // See socket-client.ts's identical 'config-updated' wiring — fired when a
  // periodic sync finds this profile's configured printers/scale/business
  // changed since it was last written to workstation.json.
  client.on('config-updated', () => refreshTray())
  // Server pushed this because a printer's routing changed — see
  // workstation-socket-client.ts's force-sync handler. The printer list is
  // whole-agent, not per-profile, and otherwise only read once at startup.
  client.on('force-refresh-printers', () => { refreshPrinterList(); refreshTray() })

  workstationClients.set(profileId, client)
  client.start()
}

// Disconnects and releases whatever's currently active for this profile's
// workstation capability, without connecting anything new. Used both by
// activateWorkstationBusiness() below and directly whenever the requested
// business turns out to have no pairing on this machine at all — MBM-279
// plan Section 2: "if the newly selected business is not configured for
// that agent, the agent must immediately clear or deactivate the prior
// business's device configuration."
function deactivateWorkstation(profileId: string): void {
  const current = workstationClients.get(profileId)
  if (!current) return
  current.stop()
  workstationClients.delete(profileId)
  const owner = getScaleOwner()
  if (owner?.profileId === profileId) releaseScale()
  setActiveWorkstationBusinessId(profileId, null)
  refreshTray()
}

// MBM-279: switches this profile's active workstation business — the one
// operation the whole multi-business-per-workstation redesign exists for.
// Disconnects whichever business's workstation socket is currently
// connected (releasing the scale first if it owns it), then connects the
// requested business's stored pairing if one exists. Called from
// pairing-server.ts's /activate (an explicit switch — the browser's
// business dropdown, or a manual tray "Switch to this") and right after a
// fresh pairing (the admin is presumably standing at this exact machine, in
// this exact business, when they pair it).
function activateWorkstationBusiness(profileId: string, businessId: string): void {
  if (workstationClients.get(profileId)?.getConfig().businessId === businessId) return // already active

  deactivateWorkstation(profileId)

  const config = loadWorkstationConfig(profileId, businessId)
  if (!config) return // nothing paired for this business here — already deactivated above

  connectWorkstation(profileId, config)
  setActiveWorkstationBusinessId(profileId, businessId)
  refreshTray()
}

// Connects every already-configured profile — called once at startup
// (after migration) and again on a manual Restart from the tray.
function connectAllProfiles(): void {
  refreshPrinterList()
  for (const profileId of listProfileIds()) {
    const r710 = loadConfig(profileId)
    if (r710) connectR710(profileId, r710)

    // MBM-279: connect whichever business is currently marked active for
    // this profile's workstation capability; if none has been marked active
    // yet (still on the pre-MBM-279 flat file, not synced even once since
    // upgrading), connect that instead — its first sync response migrates it
    // and marks it active from then on (workstation-socket-client.ts).
    const activeBusinessId = getActiveWorkstationBusinessId(profileId)
    const workstation = activeBusinessId
      ? loadWorkstationConfig(profileId, activeBusinessId)
      : hasLegacyFlatWorkstationConfig(profileId)
        ? loadLegacyFlatWorkstationConfig(profileId)
        : null
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

  // MBM-279: the tray's per-profile "Other businesses paired here ▸ Switch
  // to this" action — manual override for when no browser on this machine
  // is driving the switch (or several people share it).
  setOnSwitchWorkstationBusiness((profileId, businessId) => {
    activateWorkstationBusiness(profileId, businessId)
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
      // MBM-279: activate rather than connect directly — the admin pairing
      // this is presumably standing at this exact machine, in this exact
      // business, right now, so this should also take over from whatever
      // business was previously active here, not just add a second live
      // connection alongside it.
      activateWorkstationBusiness(profileId, config.businessId!)
    },
    getSnapshot: getManageSnapshot,
    unpairProfile,
    releaseScale: () => { releaseScale(); refreshTray() },
    setAutoStart,
    restart: onRestart,
    activateWorkstationBusiness,
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
