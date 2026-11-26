#!/usr/bin/env node
/**
 * MBM-344 follow-up: every build starts from a clean .next, and two builds
 * never run in the same folder at once.
 *
 * Why (2026-11-26, the workstation): a build and `npm run setup:update` built
 * into the same .next at the same time; the second failed with
 * "Export encountered an error on /_error: /404" and left no build, so the
 * service could not start. A half-written or stale .next does the same.
 * Releases already build in a fresh git worktree (scripts/release.js); this
 * covers builds in a working copy (a dev machine, setup:update).
 *
 *   node scripts/prebuild-clean.js           (prebuild)  refuse when another
 *        build is running here; otherwise take the lock and delete .next
 *   node scripts/prebuild-clean.js --done    (postbuild) release the lock
 *
 * The lock (.next-build.lock, outside .next) holds the start time. It only
 * counts while a `next build` is really running (a failed build leaves the
 * file behind; that is not a reason to refuse). If the processes can't be
 * listed, one older than 60 minutes is ignored.
 */
const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')

const ROOT = path.join(__dirname, '..')
const LOCK = path.join(ROOT, '.next-build.lock')
const NEXT = path.join(ROOT, '.next')
const STALE_MS = 60 * 60 * 1000

if (process.argv.includes('--done')) {
  try { fs.unlinkSync(LOCK) } catch { /* not there */ }
  process.exit(0)
}

/** A `next build` command line: `"…\next\dist\bin\next" "build"` (Windows) or `…/next build` */
const NEXT_BUILD = [/next[\\/]dist[\\/]bin[\\/]next"?\s+"?build\b/, /\bnext"?\s+"?build\b/]

/** Is a `next build` running on this machine? null: can't tell */
function nextBuildRunning() {
  try {
    const opts = { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }
    const out = process.platform === 'win32'
      ? execFileSync('powershell', ['-NoProfile', '-Command', "(Get-CimInstance Win32_Process -Filter \"Name='node.exe'\").CommandLine"], opts)
      : execFileSync('ps', ['-eo', 'args'], opts)
    return out.split(/\r?\n/).some(l => NEXT_BUILD.some(re => re.test(l)))
  } catch { return null }
}

let held = null
try { held = JSON.parse(fs.readFileSync(LOCK, 'utf8')) } catch { /* no lock, or unreadable: free */ }
if (held) {
  const age = Date.now() - Date.parse(held.startedAt)
  const running = nextBuildRunning()
  if (running === true || (running === null && age >= 0 && age < STALE_MS)) {
    console.error(`\n❌ Another build has been running in this folder since ${held.startedAt} (${Math.round(age / 60000)} min).`)
    console.error('   Two builds at once break each other. Wait for it to finish.')
    console.error(`   If no build is running (it crashed), delete ${LOCK} and build again.\n`)
    process.exit(1)
  }
}

fs.writeFileSync(LOCK, JSON.stringify({ startedAt: new Date().toISOString(), pid: process.pid }))

if (fs.existsSync(NEXT)) {
  console.log('🧹 Removing the previous .next (every build starts clean)…')
  try {
    fs.rmSync(NEXT, { recursive: true, force: true, maxRetries: 5, retryDelay: 1000 })
  } catch (e) {
    try { fs.unlinkSync(LOCK) } catch { /* ignore */ }
    console.error(`\n❌ Could not remove .next: ${e.message}`)
    console.error('   Something still has its files open, usually the running app. Stop the service (or `npm run dev`) and build again.\n')
    process.exit(1)
  }
}
