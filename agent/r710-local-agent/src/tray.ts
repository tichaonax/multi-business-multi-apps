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

// TODO(Phase 3): this is NOT a real icon — placeholder only, not validated
// against systray2's expected ICO format. A real base64-encoded .ico asset
// (ideally distinct connected/disconnected/unpaired variants) must be
// substituted before this is run against a real tray. startTray() below is
// called defensively (wrapped in try/catch by index.ts) specifically
// because this placeholder may not be accepted by the native tray helper.
const PLACEHOLDER_ICON_BASE64 =
  'AAABAAEAEBAAAAEAIABoBAAAFgAAACgAAAAQAAAAIAAAAAEAIAAAAAAAAAQAABMLAAATCwAAAAAAAAAAAAA='

let systray: any = null

export function startTray(onQuit: () => void, onRestart: () => void): void {
  const SysTray = loadSysTray()
  systray = new SysTray({
    menu: {
      icon: PLACEHOLDER_ICON_BASE64,
      title: 'R710 Local Agent',
      tooltip: 'R710 Local Agent — starting…',
      items: [
        { title: 'Status: starting…', tooltip: '', checked: false, enabled: false },
        { title: 'Restart', tooltip: 'Restart the agent', checked: false, enabled: true },
        { title: 'Quit', tooltip: 'Stop the agent', checked: false, enabled: true },
      ],
    },
    debug: false,
    copyDir: true,
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
  if (!systray) return
  // Only ever send 'update-item' — systray2's 'update-menu' handler
  // dereferences action.menu.items unconditionally even for a partial
  // update, throwing (and taking the whole process down) if items is
  // omitted. update-item alone is enough to reflect connection state.
  systray.sendAction({
    type: 'update-item',
    item: { title: `Status: ${STATUS_LABEL[state]}`, tooltip: '', enabled: false, checked: false },
    seq_id: 0,
  })
}

export function setTrayUnpaired(): void {
  if (!systray) return
  systray.sendAction({
    type: 'update-item',
    item: { title: 'Status: ⚪ Not paired — open the admin panel to pair this machine', tooltip: '', enabled: false, checked: false },
    seq_id: 0,
  })
}
