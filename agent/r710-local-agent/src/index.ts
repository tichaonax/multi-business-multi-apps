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
 * MBM-283: the same "connect everything, stay connected" principle above
 * is now applied one level deeper — to every BUSINESS paired to a given
 * profile on this machine, not just to every profile. Previously,
 * activateWorkstationBusiness() disconnected the whole workstation socket
 * of whichever business was previously "active" on a profile every time a
 * browser tab switched focus to a different business — meaning only ONE
 * business's printers/scale could ever be reachable at a time on a shared
 * workstation, even though (per the MBM-276 header comment above) print
 * relay and R710 were always designed with no such exclusivity concern.
 * Now connectAllProfiles() connects a socket for every paired business up
 * front, and activateWorkstationBusiness() only updates which business is
 * "focused" (for display, and for scale hand-off — still genuinely
 * exclusive, one physical serial port) — it never disconnects anything.
 */

import { execFileSync } from 'child_process'
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
import { startPairingServer, PAIRING_PORT, type ManageSnapshot, type OtherWorkstationBusiness } from './pairing-server'
import { AgentSocketClient, type AgentConnectionState } from './socket-client'
import { WorkstationSocketClient, type WorkstationAgentConnectionState } from './workstation-socket-client'
import { scaleDriver, releaseScale } from './workstation-job-handler'
import { getScaleOwner, type ScaleOwner } from './scale-owner'
import { LEGACY_BUSINESS_KEY } from './workstation-clients-registry'
import type { ScaleStatus } from './scale-driver'
import { startTray, updateTrayState, setOnReleaseScale, setOnAutoStartChanged, setOnSwitchWorkstationBusiness, isAutoStartEnabled, setAutoStart, requestQuit, type TrayState } from './tray'
import { listPrinters } from './print-driver'
import packageJson from '../package.json'

const AGENT_VERSION = packageJson.version

const r710Clients = new Map<string, AgentSocketClient>()
// MBM-283: outer key is profileId, inner key is businessId (or
// LEGACY_BUSINESS_KEY for a not-yet-migrated flat config) — every business
// paired to a profile on this machine gets its own permanently-connected
// entry, unlike the flat profileId-only map this replaced.
const workstationClients = new Map<string, Map<string, WorkstationSocketClient>>()
function allWorkstationClients(): WorkstationSocketClient[] {
  return [...workstationClients.values()].flatMap(m => [...m.values()])
}
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

// MBM-283: every business's socket for a profile now stays connected
// simultaneously (see this file's header comment), so display code needs
// to explicitly pick ONE to show as "the" business row — the one currently
// marked active/focused for that profile, same concept as before, just no
// longer implied by "whichever socket happens to be connected."
function activeWorkstationClient(profileId: string): WorkstationSocketClient | undefined {
  const activeBusinessId = getActiveWorkstationBusinessId(profileId)
  if (!activeBusinessId) return undefined
  return workstationClients.get(profileId)?.get(activeBusinessId)
}

// MBM-283: includes the business name, not just the profile/server label —
// with several businesses now able to share one profile, "Scale owned by
// Acme Server" would be ambiguous about which of that server's businesses
// actually holds it.
function scaleOwnerLabel(owner: ScaleOwner | null): string | null {
  if (!owner) return null
  const profileLabel = readProfileMeta(owner.profileId)?.label || owner.profileId
  const businessLabel = loadWorkstationConfig(owner.profileId, owner.businessId)?.businessName
  return businessLabel ? `${profileLabel} — ${businessLabel}` : profileLabel
}

// Rebuilds the full tray snapshot from current connection state + profile
// metadata and pushes it. Called after any change anywhere — connecting,
// disconnecting, a new pairing, a rejection, or a scale status change.
function refreshTray(): void {
  const owner = getScaleOwner()

  const profiles: TrayState['profiles'] = currentProfileIds().map(profileId => {
    const meta = readProfileMeta(profileId)
    const client = activeWorkstationClient(profileId)
    const workstation = client?.getConfig()
    return {
      profileId,
      label: meta?.label || profileId,
      serverUrl: meta?.serverUrl || '',
      r710State: r710Clients.get(profileId)?.lastState,
      r710DeviceIp: loadConfig(profileId)?.deviceIpAddress,
      workstationState: client?.lastState,
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
      scaleOwnerLabel: scaleOwnerLabel(owner),
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
    const client = activeWorkstationClient(profileId)
    const workstation = client?.getConfig()
    return {
      profileId,
      label: meta?.label || profileId,
      serverUrl: meta?.serverUrl || '',
      r710State: r710Clients.get(profileId)?.lastState,
      r710DeviceIp: loadConfig(profileId)?.deviceIpAddress,
      workstationState: client?.lastState,
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
    scaleOwnerLabel: scaleOwnerLabel(owner),
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
  for (const client of workstationClients.get(profileId)?.values() ?? []) client.stop()
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
  for (const client of allWorkstationClients()) client.reportAutoStart(enabled)
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
  const businessKey = config.businessId ?? LEGACY_BUSINESS_KEY
  workstationClients.get(profileId)?.get(businessKey)?.stop()

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
    workstationClients.get(profileId)?.delete(businessKey)
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
    // If this exact business happened to own the scale, release it rather
    // than leaving scale-owner.json pointing at a business with no live
    // client.
    const owner = getScaleOwner()
    if (owner?.profileId === profileId && owner?.businessId === businessKey) releaseScale()
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
  // MBM-283: fired once, the moment a pre-MBM-279 legacy (flat, no
  // businessId) pairing completes its first sync and learns its real
  // businessId (see workstation-socket-client.ts's syncConfig()) — re-key
  // this map's entry from the LEGACY_BUSINESS_KEY placeholder to match.
  client.on('business-id-migrated', (realBusinessId: string) => {
    const byBusiness = workstationClients.get(profileId)
    if (byBusiness?.get(LEGACY_BUSINESS_KEY) === client) {
      byBusiness.delete(LEGACY_BUSINESS_KEY)
      byBusiness.set(realBusinessId, client)
    }
    refreshTray()
  })

  if (!workstationClients.has(profileId)) workstationClients.set(profileId, new Map())
  workstationClients.get(profileId)!.set(businessKey, client)
  client.start()
}

// MBM-283: marks this business as the focused/active one for this profile,
// for display purposes only — see this file's header comment. Deliberately
// does NOT touch any workstation socket connection any more:
// connectAllProfiles() already connects (and keeps connected) every
// business paired to this profile on this machine, so there is nothing to
// disconnect when focus moves to a different one, and nothing to connect
// that isn't already connected. Called from pairing-server.ts's /activate
// (an explicit switch — the browser's business dropdown, or a manual tray
// "Switch to this") and right after a fresh pairing.
function activateWorkstationBusiness(profileId: string, businessId: string): void {
  if (getActiveWorkstationBusinessId(profileId) === businessId) return // already active
  setActiveWorkstationBusinessId(profileId, businessId)
  refreshTray()
}

// MBM-282: which (profile, business) the browser most recently told this
// agent has OS/browser focus — agent-wide, in-memory only (unlike
// scale-owner.json/active-workstation.json, nothing here needs to survive a
// restart: if the agent restarts, no tab has re-asserted focus yet, and the
// very next focus event fixes it, exactly like today's behavior before this
// feature).
//
// Deliberately separate from activateWorkstationBusiness() above, and
// called on EVERY focus-triggered /activate — not just ones where this
// profile's own business changed. That distinction matters: the common
// case is simply refocusing a tab that's already showing the right
// business, where activateWorkstationBusiness() correctly no-ops — but the
// scale still needs to be handed over from whichever OTHER (profile,
// business) currently owns it, and that must not depend on this profile's
// own business having changed.
//
// MBM-283: now also handles hand-off between two BUSINESSES sharing the
// SAME profile (previously only cross-profile hand-off existed, because
// only one business per profile could ever be connected at a time).
let focusedKey: string | null = null
function noteFocusedProfile(profileId: string, businessId: string): void {
  const key = `${profileId}:${businessId}`
  if (focusedKey === key) return
  focusedKey = key
  const owner = getScaleOwner()
  if (owner && (owner.profileId !== profileId || owner.businessId !== businessId)) {
    console.log(`[Agent] Focus moved to a different business — releasing scale from ${scaleOwnerLabel(owner)}`)
    releaseScale()
    refreshTray()
  }
}

// Connects every already-configured profile — called once at startup
// (after migration) and again on a manual Restart from the tray.
function connectAllProfiles(): void {
  refreshPrinterList()
  for (const profileId of listProfileIds()) {
    const r710 = loadConfig(profileId)
    if (r710) connectR710(profileId, r710)

    // MBM-283: connect a socket for EVERY business paired to this profile
    // on this machine, not just whichever one is currently marked
    // "active" — see this file's header comment. Only the scale itself
    // needs exclusivity/hand-off (scale-owner.ts), never the socket.
    const businessIds = listWorkstationBusinessIds(profileId)
    if (businessIds.length > 0) {
      for (const businessId of businessIds) {
        const workstation = loadWorkstationConfig(profileId, businessId)
        if (workstation) connectWorkstation(profileId, workstation)
      }
    } else if (hasLegacyFlatWorkstationConfig(profileId)) {
      // MBM-279: pre-MBM-279 flat file, not yet migrated to per-business
      // storage — there's only ever one business in this state; its first
      // sync response migrates it (workstation-socket-client.ts).
      const legacy = loadLegacyFlatWorkstationConfig(profileId)
      if (legacy) connectWorkstation(profileId, legacy)
    }
  }
  refreshTray()
}

// Kills any OTHER already-running instance of this exact agent before doing
// anything else. Previously, launching a second instance (e.g. after the
// tray icon failed to render, leaving no visible tray icon to Quit from)
// just failed silently on EADDRINUSE — port 47710 already bound by the
// earlier instance — with no way to recover short of finding and running
// "Stop R710 Agent.bat" or opening Task Manager. Self-replacing on launch
// (newest run always wins) matches ordinary desktop-app expectations —
// nobody expects to have to run a separate stop script before restarting
// an app — and mirrors build.mjs's own stopRunningAgent(), which already
// does exactly this for the build's own re-run case.
//
// Excludes this process's own PID via the taskkill filter — image-name-
// based killing would otherwise match (and kill) the very process running
// this code, since it shares the same r710-agent.exe name. Also clears any
// orphaned systray2 native helper (tray_windows_release.exe) — spawned as
// a plain child process, not inside a Job Object, so it can survive its
// parent being killed and keep a stale icon temp file handle open, which
// is a plausible contributor to the "volume externally altered" SetIcon
// failures seen when a previous instance wasn't cleanly stopped first.
function forceKillExistingInstance(): void {
  const selfPid = process.pid
  for (const imageName of ['r710-agent.exe', 'tray_windows_release.exe']) {
    try {
      execFileSync('taskkill', ['/F', '/FI', `IMAGENAME eq ${imageName}`, '/FI', `PID ne ${selfPid}`], { stdio: 'ignore' })
    } catch {
      // Nothing matched (the common case), or taskkill itself isn't
      // available (e.g. a non-Windows dev environment) — either way,
      // non-fatal; just proceed to start normally.
    }
  }
}

// Try asking a running instance to exit cleanly (its own tray icon gets
// removed via Windows' notification API as part of that — see tray.ts's
// requestQuit) before ever reaching for taskkill. A forceful kill doesn't
// give the OLD instance's tray helper any chance to clean up its icon,
// which is exactly what was leaving duplicate/ghost icons behind on every
// relaunch. /shutdown responds immediately then quits in the background
// (see pairing-server.ts), so a short pause after a successful call gives
// it time to actually finish before this instance tries to bind the same
// port. Falls back to the old forceful taskkill for anything that doesn't
// answer — a crashed/hung instance, or one old enough not to have
// /shutdown at all.
async function killExistingInstance(): Promise<void> {
  try {
    const res = await fetch(`http://127.0.0.1:${PAIRING_PORT}/shutdown`, { method: 'POST', signal: AbortSignal.timeout(1500) })
    if (res.ok) {
      await new Promise(resolve => setTimeout(resolve, 800))
    }
  } catch {
    // Nothing answered — no previous instance running, or it's stuck/too
    // old to have this endpoint. Either way, taskkill below is the
    // necessary fallback.
  }
  forceKillExistingInstance()
}

async function main(): Promise<void> {
  console.log(`[Agent] Starting… (v${AGENT_VERSION})`)

  await killExistingInstance()

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
    // A manual tray "Switch to this" click is just as much a focus signal
    // as the web page's equivalent button (pairing-server.ts's
    // /activate-business route) — same MBM-282/MBM-283 scale hand-off
    // should apply here too.
    noteFocusedProfile(profileId, businessId)
    activateWorkstationBusiness(profileId, businessId)
  })

  const onQuit = () => process.exit(0)
  const onRestart = () => {
    for (const client of r710Clients.values()) client.stop()
    for (const client of allWorkstationClients()) client.stop()
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
      // MBM-283: connect this business's own socket (it stays connected
      // alongside any other business already paired here — see this file's
      // header comment) and mark it as the focused one, since the admin
      // pairing this is presumably standing at this exact machine, in this
      // exact business, right now.
      connectWorkstation(profileId, config)
      activateWorkstationBusiness(profileId, config.businessId!)
    },
    getSnapshot: getManageSnapshot,
    unpairProfile,
    releaseScale: () => { releaseScale(); refreshTray() },
    setAutoStart,
    restart: onRestart,
    activateWorkstationBusiness,
    noteFocusedProfile,
    quit: requestQuit,
  })

  connectAllProfiles()
}

main().catch((error) => {
  console.error('[Agent] Fatal error during startup:', error)
  process.exit(1)
})

process.on('SIGINT', () => { for (const c of r710Clients.values()) c.stop(); for (const c of allWorkstationClients()) c.stop(); process.exit(0) })
process.on('SIGTERM', () => { for (const c of r710Clients.values()) c.stop(); for (const c of allWorkstationClients()) c.stop(); process.exit(0) })

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
