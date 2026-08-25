/**
 * MBM-272: tray icon — day-one requirement per plan §5. Shows connection
 * state at a glance and offers Restart/Quit, mirroring QZ Tray's presence.
 * MBM-275 Phase 5: extended to show three independent status lines — R710,
 * Scale, and Printer.
 * MBM-276: rewritten around a per-profile model. This agent process now
 * carries a list of independently-configured server profiles (one per
 * paired server, see profile-store.ts), most of which run fully
 * concurrently with no restriction (R710, Printer relay — see plan Section
 * 2a). The tray shows every profile's own R710/Printer status, and a
 * single scale line reflecting whichever profile currently owns the
 * physical serial connection (scale-owner.ts) — with a **Release** action
 * on every OTHER profile's scale line so ownership can be explicitly,
 * visibly handed off rather than silently stolen.
 *
 * Uses `systray2`, which spawns a small prebuilt native helper executable
 * over stdio rather than shipping a compiled Node addon — this was chosen
 * specifically because it packages more predictably alongside a Node SEA
 * single-file build than a native .node addon would (see plan §5.1's
 * packaging-risk note). The icon asset below is a placeholder; swap in a
 * real branded icon before shipping to a real site.
 */

import { join, dirname } from 'path'
import { existsSync } from 'fs'
import { execSync } from 'child_process'
import { createRequire } from 'module'
import type { AgentConnectionState } from './socket-client'
import type { WorkstationAgentConnectionState } from './workstation-socket-client'
import type { ScaleStatus } from './scale-driver'

// systray2 is loaded via a fresh `createRequire()` rooted at a real
// filesystem path, not the ambient `require()`. Node SEA's embedded
// require() is sandboxed to modules known at build time (bundled or
// built-in) — ANY runtime require() of an unbundled package throws
// ERR_UNKNOWN_BUILTIN_MODULE inside a packaged .exe, even with an absolute
// path. `createRequire(realPathOnDisk)` sidesteps that sandbox entirely by
// creating a brand-new, ordinary Node module loader anchored outside the
// embedded snapshot — the documented way to load external CommonJS
// packages from a Node SEA. systray2 itself is excluded from the esbuild
// bundle for the same underlying reason: it spawns a prebuilt native
// helper binary that can't be turned into JS. See build.mjs, which copies
// systray2's own node_modules folder next to the built .exe at
// dist/node_modules/systray2 for this to resolve at runtime.
function loadSysTray(): any {
  const packagedDir = join(dirname(process.execPath), 'node_modules', 'systray2')
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = existsSync(packagedDir)
    ? createRequire(process.execPath)(packagedDir) // packaged .exe — escape the SEA require sandbox
    : require('systray2') // dev mode (npm run dev, no SEA involved) — resolve normally
  return mod.default ?? mod
}

// TODO(Phase 3): generic solid-color circle, not a branded asset — swap for
// a real logo (ideally distinct connected/disconnected/unpaired variants)
// before this ships to a real site. It IS a valid 32x32 32bpp .ico, verified
// against Windows' own System.Drawing.Icon parser, so startTray() no longer
// fails on the icon itself — it's still called defensively (wrapped in
// try/catch by index.ts) in case the native tray helper rejects it for some
// other environment-specific reason.
const PLACEHOLDER_ICON_BASE64 =
  'AAABAAEAICAAAAEAIACoEAAAFgAAACgAAAAgAAAAQAAAAAEAIAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACKhg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACKhg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACKhg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIqGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACKhg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIqGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACKhg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIqGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/AAAAAAAAAAAAAAAAAAAAAAAAAACKhg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/AAAAAAAAAAAAAAAAAAAAAIqGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf8AAAAAAAAAAAAAAAAAAAAAioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/wAAAAAAAAAAAAAAAAAAAACKhg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/AAAAAAAAAAAAAAAAAAAAAIqGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf8AAAAAAAAAAAAAAAAAAAAAioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/wAAAAAAAAAAAAAAAAAAAACKhg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/AAAAAAAAAAAAAAAAAAAAAIqGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf8AAAAAAAAAAAAAAAAAAAAAioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/wAAAAAAAAAAAAAAAAAAAACKhg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/AAAAAAAAAAAAAAAAAAAAAAAAAACKhg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIqGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIqGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIqGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACKhg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/ioYN/4qGDf+Khg3/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA////////////4Af//4AB//4AAH/8AAA/+AAAH/AAAA/wAAAP4AAAB+AAAAfAAAADwAAAA8AAAAPAAAADwAAAA8AAAAPAAAADwAAAA8AAAAPAAAAD4AAAB+AAAAfwAAAP8AAAD/gAAB/8AAA//gAAf/+AAf//4Af///////////8='

let systray: any = null

export interface ProfileTrayInfo {
  profileId: string
  label: string
  r710State?: AgentConnectionState
  workstationState?: WorkstationAgentConnectionState
}

export interface TrayState {
  profiles: ProfileTrayInfo[]
  scaleStatus: ScaleStatus
  scaleOwnerProfileId: string | null
  scaleOwnerLabel: string | null
}

let currentState: TrayState = { profiles: [], scaleStatus: { status: 'disconnected', comPort: null }, scaleOwnerProfileId: null, scaleOwnerLabel: null }
let onReleaseScaleCallback: (() => void) | null = null
let onAutoStartChangedCallback: ((enabled: boolean) => void) | null = null

const R710_STATUS_LABEL: Record<AgentConnectionState, string> = {
  connecting: '🟡 Connecting…',
  connected: '🟢 Connected',
  disconnected: '🔴 Disconnected — retrying…',
  rejected: '🔴 Pairing rejected — re-pair from the admin panel',
}

const WORKSTATION_STATUS_LABEL: Record<WorkstationAgentConnectionState, string> = {
  connecting: '🟡 Connecting…',
  connected: '🟢 Ready',
  disconnected: '🔴 Offline — retrying…',
  rejected: '🔴 Pairing rejected — re-pair from the admin panel',
}

// Sourced directly from scaleDriver's own 'status' events inside this same
// process — not from anything relayed over a socket — so this stays
// accurate to the physical serial connection regardless of any profile's
// relay state.
const SCALE_STATUS_LABEL: Record<ScaleStatus['status'], (comPort: string | null, error?: string) => string> = {
  connecting: (comPort) => `Connecting${comPort ? ` (${comPort})` : ''}…`,
  connected: (comPort) => `Connected${comPort ? ` on ${comPort}` : ''}`,
  disconnected: () => 'Not connected',
  error: (comPort, error) => `Error${comPort ? ` on ${comPort}` : ''}: ${error ? (error.length > 40 ? `${error.slice(0, 40)}…` : error) : 'unknown'}`,
}

function truncate(message: string, max = 60): string {
  return message.length > max ? `${message.slice(0, max)}…` : message
}

function buildTooltip(): string {
  const n = currentState.profiles.length
  if (n === 0) return 'MBM Local Agent — no profiles paired yet'
  const connected = currentState.profiles.filter(p =>
    p.r710State === 'connected' || p.workstationState === 'connected'
  ).length
  return `MBM Local Agent — ${n} profile${n === 1 ? '' : 's'} (${connected} connected)`
}

// Every configured profile gets its own R710/Printer status line (both can
// be simultaneously ✓ across multiple profiles — no exclusivity to
// represent, see plan Section 2a). The scale line only ever shows a real
// reading under whichever profile currently owns it; every other profile's
// scale line shows who has it, with a Release action to hand it off.
function buildProfileSubmenu(profile: ProfileTrayInfo): any[] {
  const items: any[] = []

  if (profile.r710State) {
    items.push({ title: `R710: ${R710_STATUS_LABEL[profile.r710State]}`, tooltip: '', checked: false, enabled: false })
  }
  if (profile.workstationState) {
    items.push({ title: `Printer: ${WORKSTATION_STATUS_LABEL[profile.workstationState]}`, tooltip: '', checked: false, enabled: false })

    const isOwner = currentState.scaleOwnerProfileId === profile.profileId
    if (isOwner) {
      items.push({
        title: `Scale: ${SCALE_STATUS_LABEL[currentState.scaleStatus.status](currentState.scaleStatus.comPort, currentState.scaleStatus.error)}`,
        tooltip: '', checked: false, enabled: false,
      })
    } else if (currentState.scaleOwnerProfileId) {
      items.push({
        title: `Scale: in use by ${currentState.scaleOwnerLabel || currentState.scaleOwnerProfileId} — Release`,
        tooltip: 'Force-release the scale from the other profile so it can be used here',
        checked: false, enabled: true,
        click: () => onReleaseScaleCallback?.(),
      })
    } else {
      items.push({ title: 'Scale: not connected', tooltip: '', checked: false, enabled: false })
    }
  }

  return items
}

function buildItems(): any[] {
  const items: any[] = []

  if (currentState.profiles.length === 0) {
    items.push({ title: 'No profiles paired yet', tooltip: '', checked: false, enabled: false })
  } else {
    for (const profile of [...currentState.profiles].sort((a, b) => a.label.localeCompare(b.label))) {
      items.push({
        title: profile.label,
        tooltip: '',
        checked: false,
        enabled: true,
        items: buildProfileSubmenu(profile),
      })
    }
  }

  items.push(SysTraySeparator())
  items.push({
    title: 'Preferences',
    tooltip: '',
    checked: false,
    enabled: true,
    items: [
      {
        title: 'Start with Windows',
        tooltip: 'Launch this agent automatically when you sign in',
        checked: isAutoStartEnabled(),
        enabled: true,
        click: () => {
          setAutoStart(!isAutoStartEnabled())
          pushMenuUpdate()
        },
      },
    ],
  })
  items.push({ title: 'Restart', tooltip: 'Restart the agent', checked: false, enabled: true, click: () => onRestartCallback?.() })
  items.push({ title: 'Quit', tooltip: 'Stop the agent', checked: false, enabled: true, click: () => { systray?.kill(); onQuitCallback?.() } })

  return items
}

// systray2's own separator sentinel (SysTray.separator — a MenuItem with
// title '<SEPARATOR>'), reproduced by hand here since loadSysTray() may
// return the class before we've captured a live reference to it elsewhere.
function SysTraySeparator() {
  return { title: '<SEPARATOR>', tooltip: '', checked: false, enabled: false }
}

let onRestartCallback: (() => void) | null = null
let onQuitCallback: (() => void) | null = null

// Pushes both the hover tooltip and the full menu tree in one call. Must
// always include the full items array — systray2's 'update-menu' handler
// dereferences action.menu.items unconditionally, throwing (and taking the
// whole process down) if it's omitted from a partial update.
//
// sendAction() never awaits the tray's own readiness internally — it writes
// straight to `_process.stdin`, which is still null until the native helper
// has actually spawned. Connection state can change well before that
// (spawning + copying the helper binary takes real time), so calling
// sendAction too early throws "Cannot read properties of null (reading
// 'stdin')". Deferring on ready() queues the update correctly whether it's
// already resolved or still pending, and buildTooltip()/buildItems()
// re-read the *current* state at the time this callback actually runs, so a
// burst of rapid state changes before the tray is ready collapses to just
// the latest one being sent, not each state.
function pushMenuUpdate(): void {
  if (!systray) return
  systray.ready().then(() => {
    systray.sendAction({
      type: 'update-menu',
      menu: {
        icon: PLACEHOLDER_ICON_BASE64,
        title: 'MBM Local Agent',
        tooltip: buildTooltip(),
        items: buildItems(),
      },
    })
  }).catch(() => { /* tray failed to start — already logged elsewhere, nothing to update */ })
}

/** Replaces the entire tray state and re-renders. The single entry point index.ts uses for every change. */
export function updateTrayState(state: TrayState): void {
  currentState = state
  pushMenuUpdate()
}

export function setOnReleaseScale(callback: () => void): void {
  onReleaseScaleCallback = callback
}

// Fires whenever auto-start is toggled from ANY source — the tray's own
// Preferences item (below) or a remote AGENT_SET_AUTO_START job dispatched
// from a paired server's admin UI (job-handler.ts / workstation-job-
// handler.ts both call setAutoStart() directly, not this tray menu item) —
// so index.ts can broadcast the new value to every connected profile's
// server exactly once, from a single call site, regardless of what
// triggered the change.
export function setOnAutoStartChanged(callback: (enabled: boolean) => void): void {
  onAutoStartChangedCallback = callback
}

export function startTray(onQuit: () => void, onRestart: () => void): void {
  onQuitCallback = onQuit
  onRestartCallback = onRestart
  const SysTray = loadSysTray()
  systray = new SysTray({
    menu: {
      icon: PLACEHOLDER_ICON_BASE64,
      title: 'MBM Local Agent',
      tooltip: buildTooltip(),
      items: buildItems(),
    },
    debug: false,
    copyDir: true,
  })

  // systray2's native helper spawns asynchronously — a failure there (bad
  // icon, missing binary, blocked by AV, ...) doesn't throw synchronously
  // out of startTray(), so without this it fails completely silently.
  // ready() resolves only once the native process is confirmed up (its
  // internal `_process` field, which onError/onExit need, is guaranteed set
  // by then) and rejects if the spawn itself failed — attaching onError/
  // onExit any earlier throws because _process is still null at that point.
  systray.ready().then(() => {
    systray.onError((error: unknown) => {
      console.error('[Agent] Tray helper process error:', error)
    })
    systray.onExit((code: number | null, signal: string | null) => {
      console.error('[Agent] Tray helper process exited unexpectedly:', { code, signal })
    })
    const proc = systray.process
    proc?.stdout?.on('data', (chunk: Buffer) => console.error('[Agent] [tray stdout]', chunk.toString()))
    proc?.stderr?.on('data', (chunk: Buffer) => console.error('[Agent] [tray stderr]', chunk.toString()))
  }).catch((error: unknown) => {
    console.error('[Agent] Tray helper failed to start (continuing headless):', error)
  })

  // Per systray2's own documented pattern: menu items carry their own
  // click closures (built fresh into every buildItems() call, so they
  // always capture the current profile/callback references, never stale
  // ones from an earlier render) — the top-level handler just invokes
  // whichever one fired. Nested submenu items are dispatched the same way.
  systray.onClick((action: { item: { click?: () => void } }) => {
    action.item.click?.()
  })
}

// ── Auto-start (MBM-276) — replaces the old "drag a shortcut into the
// Startup folder" manual step. Per-user HKCU Run key: no elevation
// required (unlike HKLM or a Scheduled Task), consistent with "an
// administrator does initial setup, but toggling this shouldn't need
// re-elevating every time." Implemented via `reg` (already how
// windows-raw-printer.ts shells out to Windows tools) rather than adding a
// registry-access dependency.
const RUN_KEY = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run'
const RUN_VALUE_NAME = 'MBMLocalAgent'

export function isAutoStartEnabled(): boolean {
  try {
    execSync(`reg query "${RUN_KEY}" /v ${RUN_VALUE_NAME}`, { stdio: ['ignore', 'ignore', 'ignore'] })
    return true
  } catch {
    return false // reg query exits non-zero when the value doesn't exist
  }
}

export function setAutoStart(enabled: boolean): void {
  try {
    if (enabled) {
      // No arguments needed — every profile is self-discovered from the
      // profiles directory at startup (see profile-store.ts / index.ts).
      execSync(`reg add "${RUN_KEY}" /v ${RUN_VALUE_NAME} /t REG_SZ /d "\\"${process.execPath}\\"" /f`, { stdio: ['ignore', 'ignore', 'ignore'] })
    } else {
      execSync(`reg delete "${RUN_KEY}" /v ${RUN_VALUE_NAME} /f`, { stdio: ['ignore', 'ignore', 'ignore'] })
    }
    onAutoStartChangedCallback?.(enabled)
  } catch (error) {
    console.error('[Agent] Failed to update auto-start registry setting:', error)
  }
}
