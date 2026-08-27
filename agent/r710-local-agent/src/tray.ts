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
import packageJson from '../package.json'

// Same source of truth as socket-client.ts/workstation-socket-client.ts's
// own AGENT_VERSION and pairing-server.ts's /probe response — surfaced here
// too (MBM-281 follow-up) so the version is visible without opening any
// specific server profile's submenu: right on the tray tooltip (hover, zero
// clicks) and as its own top-level menu item.
const AGENT_VERSION = packageJson.version

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

// Small solid-color dot icons (16x16, real .ico — verified against
// System.Drawing.Icon the same way the main tray icon above was) used as
// each status line's own `icon` field. Colored emoji embedded in a menu
// item's TEXT (🟢/🔴/🟡) does NOT render in color through Win32's classic
// menu font — confirmed live: even once an item is `enabled: true`, the dot
// still shows as plain gray. A per-item bitmap icon is the mechanism Win32
// menus actually support for this (systray2's MenuItem accepts an `icon`
// field per item, not just on the tray itself), so status color is now
// carried entirely by these icons — the text no longer includes an emoji.
const DOT_GREEN = 'AAABAAEAEBAAAAEAIABoBAAAFgAAACgAAAAQAAAAIAAAAAEAIAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAX8QfMF3EImhdxSGAXcMicF/DHzgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABfvx8QXsUhn17FIv9exSL/XsUi/17FIv9exSL/XsUht1+/HxgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABfvx8IXcUi517FIv9exSL/XsUi/17FIv9exSL/XsUi/17FIv9dxSLvX78fGAAAAAAAAAAAAAAAAAAAAAAAAAAAXsUhl17FIv9exSL/XsUi/17FIv9exSL/XsUi/17FIv9exSL/XsUi/17FIbcAAAAAAAAAAAAAAAAAAAAAX78fCF7FIv9exSL/XsUi/17FIv9exSL/XsUi/17FIv9exSL/XsUi/17FIv9exSL/X8UfKAAAAAAAAAAAAAAAAF/DI0BexSL/XsUi/17FIv9exSL/XsUi/17FIv9exSL/XsUi/17FIv9exSL/XsUi/1zEImAAAAAAAAAAAAAAAABdxCJoXsUi/17FIv9exSL/XsUi/17FIv9exSL/XsUi/17FIv9exSL/XsUi/17FIv9dxSGAAAAAAAAAAAAAAAAAX8QfMF7FIv9exSL/XsUi/17FIv9exSL/XsUi/17FIv9exSL/XsUi/17FIv9exSL/XMUjUAAAAAAAAAAAAAAAAAAAAABdxSL3XsUi/17FIv9exSL/XsUi/17FIv9exSL/XsUi/17FIv9exSL/XsUi/1+/HxgAAAAAAAAAAAAAAAAAAAAAXcQiaF7FIv9exSL/XsUi/17FIv9exSL/XsUi/17FIv9exSL/XsUi/17GIYcAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABexSG3XsUi/17FIv9exSL/XsUi/17FIv9exSL/XsUi/13FIsdfvx8IAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFzEImBdxSLvXsUi/17FIv9exSL/XcUi913DIngAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAF/FHyhfwyNAX8QfMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=='
const DOT_RED = 'AAABAAEAEBAAAAEAIABoBAAAFgAAACgAAAAQAAAAIAAAAAEAIAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAARUXvMERE7WhDQ++ARETvcERE7DgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/P+8QRETun0RE7/9ERO//RETv/0RE7/9ERO//RETvtz8/6RgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/P98IRETv50RE7/9ERO//RETv/0RE7/9ERO//RETv/0RE7/9ERO7vPz/pGAAAAAAAAAAAAAAAAAAAAAAAAAAAQ0Pvl0RE7/9ERO//RETv/0RE7/9ERO//RETv/0RE7/9ERO//RETv/0RE77cAAAAAAAAAAAAAAAAAAAAAPz/fCERE7/9ERO//RETv/0RE7/9ERO//RETv/0RE7/9ERO//RETv/0RE7/9ERO//RkbrKAAAAAAAAAAAAAAAAEND70BERO//RETv/0RE7/9ERO//RETv/0RE7/9ERO//RETv/0RE7/9ERO//RETv/0VF72AAAAAAAAAAAAAAAABERO1oRETv/0RE7/9ERO//RETv/0RE7/9ERO//RETv/0RE7/9ERO//RETv/0RE7/9DQ++AAAAAAAAAAAAAAAAARUXvMERE7/9ERO//RETv/0RE7/9ERO//RETv/0RE7/9ERO//RETv/0RE7/9ERO//QkLvUAAAAAAAAAAAAAAAAAAAAABERO/3RETv/0RE7/9ERO//RETv/0RE7/9ERO//RETv/0RE7/9ERO//RETv/z8/6RgAAAAAAAAAAAAAAAAAAAAARETtaERE7/9ERO//RETv/0RE7/9ERO//RETv/0RE7/9ERO//RETv/0ND74cAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABERO+3RETv/0RE7/9ERO//RETv/0RE7/9ERO//RETv/0ND78c/P98IAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEVF72BERO7vRETv/0RE7/9ERO//RETv90RE7ngAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEZG6yhDQ+9ARUXvMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=='
const DOT_AMBER = 'AAABAAEAEBAAAAEAIABoBAAAFgAAACgAAAAQAAAAIAAAAAEAIAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACp/0MAmc9WgLnfWAC53zcAmf9TgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPn+8QC571nwue9f8LnvX/C571/wue9f8LnvX/C571twqf9BgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAn/8IC5315wue9f8LnvX/C571/wue9f8LnvX/C571/wue9f8KnfXvCp/0GAAAAAAAAAAAAAAAAAAAAAAAAAAAC570lwue9f8LnvX/C571/wue9f8LnvX/C571/wue9f8LnvX/C571/wue9bcAAAAAAAAAAAAAAAAAAAAAAJ//CAue9f8LnvX/C571/wue9f8LnvX/C571/wue9f8LnvX/C571/wue9f8LnvX/DJ/yKAAAAAAAAAAAAAAAAAuf80ALnvX/C571/wue9f8LnvX/C571/wue9f8LnvX/C571/wue9f8LnvX/C571/wqc9GAAAAAAAAAAAAAAAAAJnPVoC571/wue9f8LnvX/C571/wue9f8LnvX/C571/wue9f8LnvX/C571/wue9f8LnfWAAAAAAAAAAAAAAAAACp/0MAue9f8LnvX/C571/wue9f8LnvX/C571/wue9f8LnvX/C571/wue9f8LnvX/CZz1UAAAAAAAAAAAAAAAAAAAAAALnfT3C571/wue9f8LnvX/C571/wue9f8LnvX/C571/wue9f8LnvX/C571/wqf9BgAAAAAAAAAAAAAAAAAAAAACZz1aAue9f8LnvX/C571/wue9f8LnvX/C571/wue9f8LnvX/C571/wue9YcAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAALnvW3C571/wue9f8LnvX/C571/wue9f8LnvX/C571/wud9McAn/8IAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAqc9GAKnfXvC571/wue9f8LnvX/C5309wqd9HgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAyf8igLn/NACp/0MAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=='
const DOT_GRAY = 'AAABAAEAEBAAAAEAIABoBAAAFgAAACgAAAAQAAAAIAAAAAEAIAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAuaSUMLehk2i3o5OAuKGTcLajkTgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAC/n48QuKOVn7ijlP+4o5T/uKOU/7ijlP+4o5T/t6OTt7SflBgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAC/n58IuKOT57ijlP+4o5T/uKOU/7ijlP+4o5T/uKOU/7ijlP+4o5TvtJ+UGAAAAAAAAAAAAAAAAAAAAAAAAAAAuKOUl7ijlP+4o5T/uKOU/7ijlP+4o5T/uKOU/7ijlP+4o5T/uKOU/7ejk7cAAAAAAAAAAAAAAAAAAAAAv5+fCLijlP+4o5T/uKOU/7ijlP+4o5T/uKOU/7ijlP+4o5T/uKOU/7ijlP+4o5T/uJ+SKAAAAAAAAAAAAAAAALejk0C4o5T/uKOU/7ijlP+4o5T/uKOU/7ijlP+4o5T/uKOU/7ijlP+4o5T/uKOU/7eilGAAAAAAAAAAAAAAAAC3oZNouKOU/7ijlP+4o5T/uKOU/7ijlP+4o5T/uKOU/7ijlP+4o5T/uKOU/7ijlP+3o5OAAAAAAAAAAAAAAAAAuaSUMLijlP+4o5T/uKOU/7ijlP+4o5T/uKOU/7ijlP+4o5T/uKOU/7ijlP+4o5T/uKKSUAAAAAAAAAAAAAAAAAAAAAC3o5P3uKOU/7ijlP+4o5T/uKOU/7ijlP+4o5T/uKOU/7ijlP+4o5T/uKOU/7SflBgAAAAAAAAAAAAAAAAAAAAAt6GTaLijlP+4o5T/uKOU/7ijlP+4o5T/uKOU/7ijlP+4o5T/uKOU/7mklYcAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAC3o5O3uKOU/7ijlP+4o5T/uKOU/7ijlP+4o5T/uKOU/7iilMe/n58IAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAALeilGC4o5TvuKOU/7ijlP+4o5T/t6OT97ahkngAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAALifkii3o5NAuaSUMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=='

let systray: any = null
// MBM-276 follow-up: systray2's 'update-menu' action is documented/tested
// primarily for per-item mutation of a STABLE menu (see its README example,
// which uses 'update-item', not 'update-menu', for a click-driven state
// change) — it does not reliably repaint the visible Windows tray menu for
// the kinds of changes this agent needs: item COUNT changes (0 profiles ->
// 1 profile) and existing items' `checked` flags (the Start-with-Windows
// toggle). Observed live: a real profile connecting left the tray still
// showing "No profiles paired yet", and toggling auto-start from the web
// left the tray checkbox unchecked, while the underlying state (`/api/
// status`, the DB) was correct all along — confirming this is a rendering
// gap in the native helper, not a state-tracking bug. Rather than
// discovering which subset of changes 'update-menu' does/doesn't handle,
// every state change now tears down and recreates the whole tray icon —
// guaranteed correct, since it reuses the exact "first render" path that
// was never in question. Debounced so a burst of rapid changes (e.g. every
// profile reconnecting at once) collapses into one recreation, not one per
// event.
let recreateTimer: ReturnType<typeof setTimeout> | null = null
let recreating = false

export interface ProfileTrayInfo {
  profileId: string
  label: string
  serverUrl: string
  r710State?: AgentConnectionState
  // Snapshot of the R710 device's IP, periodically refreshed — see
  // AgentConfig's deviceIpAddress comment. Undefined for a profile paired
  // before this field existed, or for a workstation-only profile (no R710
  // pairing).
  r710DeviceIp?: string
  workstationState?: WorkstationAgentConnectionState
  // Database-driven, periodically refreshed — see WorkstationAgentConfig's
  // matching comment. Undefined for an R710-only profile.
  businessName?: string
  configuredPrinters?: string[]
  scaleComPort?: string
  scaleBaudRate?: number
  // QZ Tray's own printer choice on THIS machine, if set — a separate,
  // browser-driven print path this agent has no part in. Shown alongside
  // configuredPrinters (the AGENT-relay path) so the tray is honest about
  // there being two independent ways this machine might already be
  // printing, rather than only ever surfacing the one this agent handles.
  qzPrinterName?: string
  // MBM-279: every OTHER business with a scale/printer pairing saved on
  // this profile besides whichever is currently active — surfaced as a
  // "Switch to this" submenu (buildProfileSubmenu below) for manual
  // override when no browser is driving the switch.
  otherWorkstationBusinesses?: { businessId: string; label: string }[]
}

export interface TrayState {
  profiles: ProfileTrayInfo[]
  scaleStatus: ScaleStatus
  scaleOwnerProfileId: string | null
  scaleOwnerLabel: string | null
  // Whole-machine printer list (not per-profile — any of this workstation's
  // installed printers can be targeted by a print job routed here, see
  // plan Section 2a), fetched once at startup and refreshed on Restart —
  // shown under every workstation-paired profile so an admin can see what's
  // actually available to route to, without a PowerShell call on every
  // single tray render.
  printerNames: string[]
}

let currentState: TrayState = { profiles: [], scaleStatus: { status: 'disconnected', comPort: null }, scaleOwnerProfileId: null, scaleOwnerLabel: null, printerNames: [] }
let onReleaseScaleCallback: (() => void) | null = null
let onAutoStartChangedCallback: ((enabled: boolean) => void) | null = null
let onSwitchWorkstationBusinessCallback: ((profileId: string, businessId: string) => void) | null = null

const R710_STATUS_LABEL: Record<AgentConnectionState, string> = {
  connecting: 'Connecting…',
  connected: 'Connected',
  disconnected: 'Disconnected — retrying…',
  rejected: 'Pairing rejected — re-pair from the admin panel',
}
const R710_STATUS_ICON: Record<AgentConnectionState, string> = {
  connecting: DOT_AMBER,
  connected: DOT_GREEN,
  disconnected: DOT_RED,
  rejected: DOT_RED,
}

const WORKSTATION_STATUS_LABEL: Record<WorkstationAgentConnectionState, string> = {
  connecting: 'Connecting…',
  connected: 'Ready',
  disconnected: 'Offline — retrying…',
  rejected: 'Pairing rejected — re-pair from the admin panel',
}
const WORKSTATION_STATUS_ICON: Record<WorkstationAgentConnectionState, string> = {
  connecting: DOT_AMBER,
  connected: DOT_GREEN,
  disconnected: DOT_RED,
  rejected: DOT_RED,
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
const SCALE_STATUS_ICON: Record<ScaleStatus['status'], string> = {
  connecting: DOT_AMBER,
  connected: DOT_GREEN,
  disconnected: DOT_GRAY,
  error: DOT_RED,
}

function truncate(message: string, max = 60): string {
  return message.length > max ? `${message.slice(0, max)}…` : message
}

function buildTooltip(): string {
  const n = currentState.profiles.length
  if (n === 0) return `MBM Local Agent v${AGENT_VERSION} — no profiles paired yet`
  const connected = currentState.profiles.filter(p =>
    p.r710State === 'connected' || p.workstationState === 'connected'
  ).length
  return `MBM Local Agent v${AGENT_VERSION} — ${n} profile${n === 1 ? '' : 's'} (${connected} connected)`
}

// Every configured profile gets its own R710/Printer status line (both can
// be simultaneously ✓ across multiple profiles — no exclusivity to
// represent, see plan Section 2a). The scale line only ever shows a real
// reading under whichever profile currently owns it; every other profile's
// scale line shows who has it, with a Release action to hand it off.
function buildProfileSubmenu(profile: ProfileTrayInfo): any[] {
  const items: any[] = []

  // Info lines only, never clickable — but still `enabled: true`. Windows
  // renders a `enabled: false` item's text in a uniform system gray
  // regardless of what's in it, so status color comes entirely from each
  // item's own `icon` (a small colored-dot .ico, see DOT_GREEN etc. above)
  // rather than from text — a colored emoji embedded in the title does NOT
  // render in color through Win32's classic menu font, confirmed live.
  items.push({ title: `Server: ${profile.serverUrl}`, tooltip: '', checked: false, enabled: true })

  if (profile.r710State) {
    const ip = profile.r710DeviceIp ? ` (${profile.r710DeviceIp})` : ''
    items.push({
      title: `R710: ${R710_STATUS_LABEL[profile.r710State]}${ip}`,
      tooltip: '', checked: false, enabled: true,
      icon: R710_STATUS_ICON[profile.r710State],
    })
  }
  if (profile.workstationState) {
    if (profile.businessName) {
      items.push({ title: `Business: ${profile.businessName}`, tooltip: '', checked: false, enabled: true })
    }

    items.push({
      title: `Printer relay: ${WORKSTATION_STATUS_LABEL[profile.workstationState]}`,
      tooltip: '', checked: false, enabled: true,
      icon: WORKSTATION_STATUS_ICON[profile.workstationState],
    })
    items.push({
      title: profile.configuredPrinters && profile.configuredPrinters.length > 0
        ? `Configured printer(s): ${profile.configuredPrinters.join(', ')}`
        : 'Configured printer(s): none assigned to this business yet',
      tooltip: 'Routed through THIS agent — set in Admin → Printer Connection Mode. Separate from QZ Tray below, which this agent has no part in.',
      checked: false, enabled: true,
    })
    // A genuinely different print path from the AGENT-relay line above —
    // QZ Tray is its own program, browser-driven, that this agent neither
    // controls nor is required for. Shown here purely so the tray doesn't
    // look empty/unconfigured when this machine is actually already
    // printing fine via QZ — see qz-config/route.ts for where this comes
    // from (DB-backed, keyed to this exact workstation when set that way).
    items.push({
      title: profile.qzPrinterName
        ? `QZ Tray printer (this machine): ${profile.qzPrinterName}`
        : 'QZ Tray printer (this machine): not set',
      tooltip: 'A separate print path (browser → QZ Tray → printer) this agent is not involved in — set at Profile → Printer Setup, not here',
      checked: false, enabled: true,
    })
    items.push({
      title: currentState.printerNames.length > 0
        ? `Printers on this PC: ${currentState.printerNames.join(', ')}`
        : 'Printers on this PC: none detected',
      tooltip: 'Every printer Windows has installed on this workstation — a raw list, not a claim that this agent uses all (or any) of them; see the two lines above for what actually routes through this agent vs. QZ Tray',
      checked: false, enabled: true,
    })

    const isOwner = currentState.scaleOwnerProfileId === profile.profileId
    const configuredScale = profile.scaleComPort
      ? `${profile.scaleComPort}${profile.scaleBaudRate ? ` @ ${profile.scaleBaudRate}` : ''}`
      : null
    if (isOwner) {
      items.push({
        title: `Scale: ${SCALE_STATUS_LABEL[currentState.scaleStatus.status](currentState.scaleStatus.comPort, currentState.scaleStatus.error)}`,
        tooltip: '', checked: false, enabled: true,
        icon: SCALE_STATUS_ICON[currentState.scaleStatus.status],
      })
    } else if (currentState.scaleOwnerProfileId) {
      items.push({
        title: `Scale: in use by ${currentState.scaleOwnerLabel || currentState.scaleOwnerProfileId} — Release`,
        tooltip: 'Force-release the scale from the other profile so it can be used here',
        checked: false, enabled: true,
        icon: DOT_AMBER,
        click: () => onReleaseScaleCallback?.(),
      })
    } else {
      items.push({
        title: configuredScale ? `Scale: configured for ${configuredScale} — not connected` : 'Scale: not configured',
        tooltip: '', checked: false, enabled: true,
        icon: DOT_GRAY,
      })
    }

    // MBM-279: every other business paired to THIS workstation besides the
    // one currently active — a manual override for switching without a
    // browser driving it (the normal path is the browser's business
    // dropdown, see local-agent-sync.ts on the web side).
    if (profile.otherWorkstationBusinesses && profile.otherWorkstationBusinesses.length > 0) {
      items.push({
        title: 'Other businesses paired here',
        tooltip: 'These businesses have a scale/printer pairing on this workstation but are not the active one right now',
        checked: false, enabled: true,
        items: profile.otherWorkstationBusinesses.map(business => ({
          title: `Switch to ${business.label}`,
          tooltip: '',
          checked: false, enabled: true,
          click: () => onSwitchWorkstationBusinessCallback?.(profile.profileId, business.businessId),
        })),
      })
    }
  }

  // Surfaced per-profile as requested, even though it's really one
  // machine-wide registry setting shared by every profile (there is no
  // such thing as "this profile's own" auto-start — see setAutoStart()'s
  // header comment) — every profile's checkbox reads/drives that same
  // single value, so toggling it here toggles it everywhere at once.
  items.push({
    title: 'Start with Windows',
    tooltip: 'One setting for the whole agent — applies to every paired profile, not just this one',
    checked: isAutoStartEnabled(),
    enabled: true,
    click: () => setAutoStart(!isAutoStartEnabled()),
  })

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
  items.push({ title: `Agent version: ${AGENT_VERSION}`, tooltip: 'Compare against the server\'s "Agent update required" banner if one is showing', checked: false, enabled: true })
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
        click: () => setAutoStart(!isAutoStartEnabled()),
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

/** Replaces the entire tray state and re-renders. The single entry point index.ts uses for every change. */
export function updateTrayState(state: TrayState): void {
  currentState = state
  if (!systray) return // tray not started yet — createSysTrayInstance() will read currentState fresh when it does
  scheduleRecreate()
}

function scheduleRecreate(): void {
  if (recreateTimer) clearTimeout(recreateTimer)
  recreateTimer = setTimeout(() => {
    recreateTimer = null
    recreateTray()
  }, 400)
}

// Tears down the current native tray process and spins up a fresh one from
// scratch — see the header comment above `recreateTimer` for why this
// replaced the old incremental 'update-menu' approach. kill(false) stops
// only the native helper, not this Node process.
function recreateTray(): void {
  if (!systray) {
    createSysTrayInstance()
    return
  }
  const old = systray
  systray = null
  recreating = true
  old.kill(false).catch(() => { /* already gone — fine, we're recreating anyway */ }).finally(() => {
    recreating = false
    createSysTrayInstance()
  })
}

export function setOnReleaseScale(callback: () => void): void {
  onReleaseScaleCallback = callback
}

// MBM-279: the "Other businesses paired here ▸ Switch to this" action —
// see buildProfileSubmenu()'s use of this callback.
export function setOnSwitchWorkstationBusiness(callback: (profileId: string, businessId: string) => void): void {
  onSwitchWorkstationBusinessCallback = callback
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

// Spawns a fresh native tray helper process from the current `currentState`
// and wires up its handlers — used both for the very first tray icon
// (startTray()) and every subsequent recreation (recreateTray()), so there
// is exactly one code path that renders the menu, and it's the one proven
// correct by the icon actually appearing on first launch.
function createSysTrayInstance(): void {
  const SysTray = loadSysTray()
  // Captured locally and used throughout this function — NOT re-read via
  // the module-level `systray` variable inside the async callbacks below.
  // Real bug this fixed: with two-plus profiles connecting at once,
  // refreshTray() bursts can span the 400ms recreate debounce, so a second
  // recreateTray() can null out (and eventually replace) the module-level
  // `systray` before THIS instance's own `.ready()` promise has resolved.
  // When that late callback then did `systray.onError(...)`, it read
  // whatever the module variable pointed to *at that later moment* — null,
  // mid-recreate — and threw "Cannot read properties of null (reading
  // 'onError')", which crashed tray startup for the whole process (caught
  // only by the outer try/catch in index.ts's safeStartTray, so the agent
  // survived, but the tray never came up). Every callback here now
  // operates on the specific instance it belongs to, regardless of what
  // the module-level `systray` has since been reassigned to.
  const instance = new SysTray({
    menu: {
      icon: PLACEHOLDER_ICON_BASE64,
      title: 'MBM Local Agent',
      tooltip: buildTooltip(),
      items: buildItems(),
    },
    debug: false,
    copyDir: true,
  })
  systray = instance

  // systray2's native helper spawns asynchronously — a failure there (bad
  // icon, missing binary, blocked by AV, ...) doesn't throw synchronously,
  // so without this it fails completely silently. ready() resolves only
  // once the native process is confirmed up (its internal `_process`
  // field, which onError/onExit need, is guaranteed set by then) and
  // rejects if the spawn itself failed — attaching onError/onExit any
  // earlier throws because _process is still null at that point.
  instance.ready().then(() => {
    instance.onError((error: unknown) => {
      console.error('[Agent] Tray helper process error:', error)
    })
    instance.onExit((code: number | null, signal: string | null) => {
      // A deliberate recreate() kills and immediately respawns this same
      // process — that exit is expected, not a crash, so stay quiet for it.
      if (recreating) return
      console.error('[Agent] Tray helper process exited unexpectedly:', { code, signal })
    })
    const proc = instance.process
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
  instance.onClick((action: { item: { click?: () => void } }) => {
    action.item.click?.()
  })
}

export function startTray(onQuit: () => void, onRestart: () => void): void {
  onQuitCallback = onQuit
  onRestartCallback = onRestart
  createSysTrayInstance()
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
