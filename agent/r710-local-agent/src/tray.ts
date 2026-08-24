/**
 * MBM-272: tray icon — day-one requirement per plan §5. Shows connection
 * state at a glance and offers Restart/Quit, mirroring QZ Tray's presence.
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
let currentStatusLine = 'Starting…'

function buildTooltip(): string {
  const identity = currentLabel ? `R710 Local Agent — ${currentLabel}` : 'R710 Local Agent'
  return `${identity}\n${currentStatusLine}`
}

function buildItems() {
  return [
    { title: `Status: ${currentStatusLine}`, tooltip: '', checked: false, enabled: false },
    { title: 'Restart', tooltip: 'Restart the agent', checked: false, enabled: true },
    { title: 'Quit', tooltip: 'Stop the agent', checked: false, enabled: true },
  ]
}

// Pushes both the hover tooltip and the "Status: ..." menu item in one call.
// Must always include the full items array — systray2's 'update-menu'
// handler dereferences action.menu.items unconditionally, throwing (and
// taking the whole process down) if it's omitted from a partial update.
//
// sendAction() never awaits the tray's own readiness internally — it writes
// straight to `_process.stdin`, which is still null until the native helper
// has actually spawned. The socket client's first 'connecting' state event
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
        title: 'R710 Local Agent',
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
      title: 'R710 Local Agent',
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
      console.error('[R710 Agent] Tray helper process error:', error)
    })
    systray.onExit((code: number | null, signal: string | null) => {
      console.error('[R710 Agent] Tray helper process exited unexpectedly:', { code, signal })
    })
    // DIAGNOSTIC (temporary): systray2's own readline wrapper only surfaces
    // lines matching its {"type":"ready"} envelope and silently drops
    // anything else the native helper prints — including a likely error
    // right before an unexplained exit. Dump both raw streams to find it.
    const proc = systray.process
    proc?.stdout?.on('data', (chunk: Buffer) => console.error('[R710 Agent] [tray stdout]', chunk.toString()))
    proc?.stderr?.on('data', (chunk: Buffer) => console.error('[R710 Agent] [tray stderr]', chunk.toString()))
  }).catch((error: unknown) => {
    console.error('[R710 Agent] Tray helper failed to start (continuing headless):', error)
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

const STATUS_LABEL: Record<AgentConnectionState, string> = {
  connecting: '🟡 Connecting…',
  connected: '🟢 Connected',
  disconnected: '🔴 Disconnected — retrying…',
  rejected: '🔴 Pairing rejected — re-pair from the admin panel',
}

export function setTrayStatus(state: AgentConnectionState): void {
  currentStatusLine = STATUS_LABEL[state]
  pushMenuUpdate()
}

export function setTrayUnpaired(): void {
  currentStatusLine = '⚪ Not paired — open the admin panel to pair this machine'
  pushMenuUpdate()
}

// A connection that never succeeds even once never fires 'connect' or
// 'disconnect' — there's nothing to disconnect from — so without this the
// tray just sits on "Connecting…" forever with no clue why. Truncated to
// keep the tooltip/menu item readable; the full message is still logged.
export function setTrayConnectError(message: string): void {
  const truncated = message.length > 80 ? `${message.slice(0, 80)}…` : message
  currentStatusLine = `🔴 Connection error: ${truncated}`
  pushMenuUpdate()
}
