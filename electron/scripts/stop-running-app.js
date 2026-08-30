/**
 * Stops anything that could be holding this project's own build output open
 * before a rebuild — same problem agent/r710-local-agent/build.mjs's
 * stopRunningAgent() solves for that project's own standalone .exe: a
 * process (or an editor's file watcher) holding
 * <output>/win-unpacked/resources/app.asar open makes Windows refuse to let
 * electron-builder clean/overwrite it, failing the whole build with a bare
 * "file in use" error instead of anything actionable.
 *
 * Root cause, found live with Sysinternals handle.exe: it wasn't a build
 * process or antivirus at all — VS Code's own file watcher had app.asar
 * open simply because it lives inside the open workspace. Excluding the
 * folder via .vscode/settings.json's files.watcherExclude was tried first
 * (moving output from `dist` to `dist-alt`) but proved unreliable: killing
 * the specific VS Code utility-process PID holding the handle just had a
 * *different* PID re-acquire a handle on the same path within seconds
 * (confirmed live) — the exclude doesn't reliably win against every VS Code
 * window/process that might have this workspace open. Excluding a folder
 * only stops *new* handles from that one window's watcher anyway; it can
 * never guarantee no VS Code process anywhere holds one.
 *
 * The actual fix: build.directories.output in package.json now points
 * OUTSIDE this repo entirely (`../../multi-business-electron-dist`, a
 * sibling of the repo root) — a path no VS Code window watching this
 * workspace can ever open a handle on, regardless of exclude settings,
 * how many windows are open, or timing. The stale `electron/dist/` and
 * `electron/dist-alt/` folders from earlier attempts may still be sitting
 * there locked; they're harmless leftovers — delete by hand once VS Code
 * is closed, or just ignore them. What's left here is now just a light
 * safety net for the genuinely rare case (a leftover build-tool process,
 * or a stray running copy of the packaged app, still holding the new
 * output open from a previous build) — no need for a long wait when the
 * actual cause (VS Code) is structurally prevented from reaching it.
 *
 * Deliberately chained directly into build:win/:mac/:linux via `&&` in
 * package.json, not left as a separate prebuild:* script relying on npm's
 * automatic pre<script> convention — that convention didn't actually fire
 * in testing (no trace of this script's own console output before
 * electron-builder's), for reasons not worth chasing down when a plain `&&`
 * is unambiguous and needs no lifecycle-hook cooperation from the shell/npm
 * version in use.
 */

const { execFileSync } = require('child_process')
const fs = require('fs')
const path = require('path')

if (process.platform === 'win32') {
  const electronDir = path.join(__dirname, '..')
  console.log(`[build] Checking for anything still running from ${electronDir}…`)
  try {
    // Matches anything whose own executable lives inside this project's
    // electron/ folder — a leftover build-tool process (e.g. an
    // interrupted app-builder.exe), or the packaged app itself. Never a
    // blanket kill on a generic name like "electron.exe" — plenty of
    // unrelated apps (VS Code, Slack, Discord, ...) are Electron too.
    const psCommand = `Get-CimInstance Win32_Process | Where-Object { $_.ExecutablePath -and $_.ExecutablePath -like '${electronDir}\\*' } | ForEach-Object { Write-Output "Killing PID $($_.ProcessId): $($_.ExecutablePath)"; Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }`
    const output = execFileSync('powershell', ['-NoProfile', '-Command', psCommand], { encoding: 'utf-8' })
    console.log(output.trim() ? `[build] ${output.trim()}` : '[build] Nothing running from this project folder.')
  } catch (error) {
    console.warn('[build] Could not check for running processes (continuing anyway):', error.message)
  }
} else {
  // macOS/Linux don't hit the same "can't delete an open file" wall the
  // way Windows does — nothing to do here for those builds.
}

// Belt and suspenders on top of the process-killing above: remove the
// previous output directly here, with a short retry, rather than let
// electron-builder find out it's locked three steps into packaging. Kept
// deliberately brief now that the actual known cause (VS Code) structurally
// can't reach this directory at all — this is just smoothing over genuine
// millisecond-scale timing, not waiting out something that was never going
// to release on its own.
const unpackedDir = path.join(__dirname, '..', '..', '..', 'multi-business-electron-dist', 'win-unpacked')
if (fs.existsSync(unpackedDir)) {
  const MAX_ATTEMPTS = 3
  const RETRY_DELAY_MS = 500
  let lastError = null
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      fs.rmSync(unpackedDir, { recursive: true, force: true })
      lastError = null
      break
    } catch (error) {
      lastError = error
      if (attempt < MAX_ATTEMPTS) {
        console.log(`[build] ${unpackedDir} still locked (attempt ${attempt}/${MAX_ATTEMPTS}) — retrying…`)
        try {
          execFileSync(
            process.platform === 'win32' ? 'powershell' : 'sleep',
            process.platform === 'win32' ? ['-NoProfile', '-Command', `Start-Sleep -Milliseconds ${RETRY_DELAY_MS}`] : [String(RETRY_DELAY_MS / 1000)],
            { stdio: 'ignore' }
          )
        } catch { /* best-effort delay only */ }
      }
    }
  }
  if (lastError) {
    console.error(`[build] Could not remove ${unpackedDir} — something still has a file inside it open.`)
    console.error('[build] This directory lives outside the repo specifically so VS Code can\'t have opened a handle inside it, so this is unexpected — check for a leftover build-tool process (Task Manager) or a stray running copy of the packaged app, or use Sysinternals handle.exe / Resource Monitor → "Find Handle" for app.asar to see what has it open, then retry.')
    console.error(`[build] Underlying error: ${lastError.message}`)
    process.exit(1)
  }
  console.log(`[build] Cleared ${unpackedDir}.`)
}
