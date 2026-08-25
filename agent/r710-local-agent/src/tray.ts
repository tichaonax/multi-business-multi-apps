/**
 * MBM-272: tray icon — day-one requirement per plan §5. Shows connection
 * state at a glance and offers Restart/Quit, mirroring QZ Tray's presence.
 * MBM-275 Phase 5: extended to show three independent status lines — R710,
 * Scale, and Printer — since this one agent process now carries two
 * separate pairings (R710's own, and the workstation-agent pairing that
 * covers both Scale and Printer relay). Scale and Printer share the same
 * underlying socket connection but are shown as their own lines because
 * they're operationally distinct concerns to whoever is glancing at the
 * tray: Scale's line reflects the physical serial connection itself
 * (sourced directly from scaleDriver's own events, independent of the
 * relay socket's state), while Printer's line reflects whether the relay
 * channel print jobs travel over is currently up.
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

// The workstation's own paired label (e.g. "Front Desk PC — Bulawayo
// Branch"), set once from config in startTray(). Windows shows only the
// tray icon's hover tooltip, not the `title` field (that's macOS menu-bar
// text) — so identifying which tray icon is this agent, among however many
// others are running, depends entirely on that tooltip being specific and
// current rather than stuck on whatever it said at startup.
let currentLabel: string | null = null

// Three independent status lines — see the file header comment for why
// these are tracked separately rather than collapsed into one.
let r710StatusLine = '⚪ R710: Not paired'
let printerStatusLine = '⚪ Printer relay: Not paired'
let scaleStatusLine = '⚪ Scale: Not paired'

function buildTooltip(): string {
  const identity = currentLabel ? `MBM Local Agent — ${currentLabel}` : 'MBM Local Agent'
  return `${identity}\n${r710StatusLine}\n${printerStatusLine}\n${scaleStatusLine}`
}

function buildItems() {
  return [
    { title: r710StatusLine, tooltip: '', checked: false, enabled: false },
    { title: printerStatusLine, tooltip: '', checked: false, enabled: false },
    { title: scaleStatusLine, tooltip: '', checked: false, enabled: false },
    { title: 'Restart', tooltip: 'Restart the agent', checked: false, enabled: true },
    { title: 'Quit', tooltip: 'Stop the agent', checked: false, enabled: true },
  ]
}

// Pushes both the hover tooltip and the status menu items in one call.
// Must always include the full items array — systray2's 'update-menu'
// handler dereferences action.menu.items unconditionally, throwing (and
// taking the whole process down) if it's omitted from a partial update.
//
// sendAction() never awaits the tray's own readiness internally — it writes
// straight to `_process.stdin`, which is still null until the native helper
// has actually spawned. The socket clients' first 'connecting' state event
// can fire well before that (spawning + copying the helper binary takes
// real time), so calling sendAction too early throws "Cannot read
// properties of null (reading 'stdin')". Deferring on ready() queues the
// update correctly whether it's already resolved or still pending, and
// buildTooltip()/buildItems() re-read the *current* state at the time this
// callback actually runs, so a burst of rapid state changes before the tray
// is ready collapses to just the latest one being sent, not each state.
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

export function startTray(onQuit: () => void, onRestart: () => void, label?: string): void {
  currentLabel = label ?? null
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
    // DIAGNOSTIC (temporary): systray2's own readline wrapper only surfaces
    // lines matching its {"type":"ready"} envelope and silently drops
    // anything else the native helper prints — including a likely error
    // right before an unexplained exit. Dump both raw streams to find it.
    const proc = systray.process
    proc?.stdout?.on('data', (chunk: Buffer) => console.error('[Agent] [tray stdout]', chunk.toString()))
    proc?.stderr?.on('data', (chunk: Buffer) => console.error('[Agent] [tray stderr]', chunk.toString()))
  }).catch((error: unknown) => {
    console.error('[Agent] Tray helper failed to start (continuing headless):', error)
  })

  systray.onClick((action: { seq_id: number; item: { title: string } }) => {
    if (action.item.title === 'Quit') {
      systray.kill()
      onQuit()
    } else if (action.item.title === 'Restart') {
      onRestart()
    }
  })
}

const R710_STATUS_LABEL: Record<AgentConnectionState, string> = {
  connecting: '🟡 Connecting…',
  connected: '🟢 Connected',
  disconnected: '🔴 Disconnected — retrying…',
  rejected: '🔴 Pairing rejected — re-pair from the admin panel',
}

export function setTrayR710Status(state: AgentConnectionState): void {
  r710StatusLine = `R710: ${R710_STATUS_LABEL[state]}`
  pushMenuUpdate()
}

export function setTrayR710Unpaired(): void {
  r710StatusLine = '⚪ R710: Not paired'
  pushMenuUpdate()
}

// A connection that never succeeds even once never fires 'connect' or
// 'disconnect' — there's nothing to disconnect from — so without this the
// tray just sits on "Connecting…" forever with no clue why. Truncated to
// keep the tooltip/menu item readable; the full message is still logged.
export function setTrayR710ConnectError(message: string): void {
  const truncated = message.length > 60 ? `${message.slice(0, 60)}…` : message
  r710StatusLine = `R710: 🔴 Connection error: ${truncated}`
  pushMenuUpdate()
}

// The workstation-agent (relay) connection state drives the Printer line
// directly — print jobs can only be relayed while this channel is up, and
// there's no further per-printer state to layer on top of that (each print
// job is a discrete, stateless request, unlike the scale's persistent
// serial connection).
const WORKSTATION_STATUS_LABEL: Record<WorkstationAgentConnectionState, string> = {
  connecting: '🟡 Connecting…',
  connected: '🟢 Ready',
  disconnected: '🔴 Offline — retrying…',
  rejected: '🔴 Pairing rejected — re-pair from the admin panel',
}

export function setTrayPrinterStatus(state: WorkstationAgentConnectionState): void {
  printerStatusLine = `Printer relay: ${WORKSTATION_STATUS_LABEL[state]}`
  // The physical scale connection is independent of the relay socket (it's
  // driven directly by scaleDriver's own events, see setTrayScaleStatus),
  // but if the relay itself just went down, a scale line still claiming
  // "Connected" would be misleading — the agent has lost the channel a
  // browser would use to control it. Only touch the scale line on the way
  // down, never on the way up (connecting/connected doesn't imply anything
  // about the scale's own state, which reports itself independently).
  if (state === 'disconnected' || state === 'rejected') {
    scaleStatusLine = '⚪ Scale: Relay offline'
  }
  pushMenuUpdate()
}

export function setTrayWorkstationUnpaired(): void {
  printerStatusLine = '⚪ Printer relay: Not paired'
  scaleStatusLine = '⚪ Scale: Not paired'
  pushMenuUpdate()
}

export function setTrayWorkstationConnectError(message: string): void {
  const truncated = message.length > 60 ? `${message.slice(0, 60)}…` : message
  printerStatusLine = `Printer relay: 🔴 Connection error: ${truncated}`
  pushMenuUpdate()
}

// Sourced directly from scaleDriver's own 'status' events inside this same
// process — not from anything relayed over the socket — so this line stays
// accurate to the physical serial connection even if the relay to the
// central server is what's currently down.
const SCALE_STATUS_LABEL: Record<ScaleStatus['status'], (comPort: string | null, error?: string) => string> = {
  connecting: (comPort) => `🟡 Connecting${comPort ? ` (${comPort})` : ''}…`,
  connected: (comPort) => `🟢 Connected${comPort ? ` on ${comPort}` : ''}`,
  disconnected: () => '⚪ Not connected',
  error: (comPort, error) => `🔴 Error${comPort ? ` on ${comPort}` : ''}: ${error ? (error.length > 40 ? `${error.slice(0, 40)}…` : error) : 'unknown'}`,
}

export function setTrayScaleStatus(status: ScaleStatus): void {
  scaleStatusLine = `Scale: ${SCALE_STATUS_LABEL[status.status](status.comPort, status.error)}`
  pushMenuUpdate()
}
