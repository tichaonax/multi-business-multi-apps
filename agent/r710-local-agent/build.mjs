/**
 * MBM-272: builds the R710 Local Agent into a single standalone Windows
 * .exe — no Node.js, npm, or repo checkout required on the target
 * workstation (plan §5.1).
 *
 * Steps:
 *  1. esbuild bundles src/index.ts + its full dependency graph (including
 *     RuckusR710ApiService, imported straight from the main app's src/) into
 *     one CommonJS file.
 *  2. Node's built-in Single Executable Application (SEA) support turns that
 *     bundle + a copy of the node.exe binary into one self-contained .exe.
 *
 * `systray2` spawns a small prebuilt native helper process rather than
 * shipping a compiled Node addon, so it's left external (not bundled) and
 * copied alongside the .exe — see the packaging-risk note in the plan.
 *
 * MBM-275: `serialport` (via @serialport/bindings-cpp) ships a prebuilt
 * native .node addon (win32-x64), same story — external, copied whole
 * rather than bundled, so node-gyp-build can still resolve the prebuilt
 * binary relative to the package's own on-disk location at runtime.
 */

import { build } from 'esbuild'
import { execFileSync } from 'child_process'
import { copyFileSync, mkdirSync, existsSync, writeFileSync, readFileSync, cpSync, createWriteStream } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createHash } from 'crypto'
import { ZipArchive } from 'archiver'

const __dirname = dirname(fileURLToPath(import.meta.url))
const distDir = join(__dirname, 'dist')
// Persisted between builds (dist/ survives across `npm run build` runs on
// the same machine — see stopRunningAgent()'s workflow comment; it's only
// ever created if missing, never wiped at the start of a build) — see
// computeSourceHash()/main() for what this drives.
const sourceHashPath = join(distDir, '.source-hash')

// npm hoists transitive deps flat into this package's own node_modules
// (no nested node_modules/systray2/node_modules/fs-extra) — so copying just
// the systray2 folder leaves its runtime deps (fs-extra, debug, ...) behind,
// and the packaged .exe throws MODULE_NOT_FOUND the first time it requires
// them. Walk each package.json's "dependencies" to find the full closure.
function collectDependencyClosure(pkgName, nodeModulesDir, seen = new Set()) {
  if (seen.has(pkgName)) return seen
  seen.add(pkgName)
  const pkgJsonPath = join(nodeModulesDir, pkgName, 'package.json')
  if (!existsSync(pkgJsonPath)) return seen
  const pkg = JSON.parse(readFileSync(pkgJsonPath, 'utf8'))
  for (const dep of Object.keys(pkg.dependencies || {})) {
    collectDependencyClosure(dep, nodeModulesDir, seen)
  }
  return seen
}

// A running r710-agent.exe (e.g. a developer testing locally, per this
// project's build-rebuild-redownload-retest workflow) holds its copy of
// @serialport/bindings-cpp's native .node addon open for the life of the
// process. Windows refuses to unlink an open file, so the copy step below
// fails with EPERM the moment a test instance is still running — this is
// not a rare edge case, it's the normal case whenever iterating locally.
// Stopping it here (best-effort; a non-zero exit just means nothing was
// running) makes the build self-sufficient instead of requiring the
// developer to remember to kill it by hand first.
function stopRunningAgent() {
  console.log('[build] Stopping any running r710-agent.exe (so its locked native module can be overwritten)…')
  try {
    execFileSync('taskkill', ['/IM', 'r710-agent.exe', '/F'], { stdio: 'ignore' })
  } catch {
    // Nothing was running — fine, this is the common case on a fresh
    // machine or CI.
  }
}

// NOTE: this used to auto-bump the patch version and WRITE it into
// package.json on every build whose source hash changed since the
// machine's own last build (tracked via dist/.source-hash). That file lives
// under dist/, which is gitignored - so it's local to each machine, never
// synced. Two servers building the exact same git commit each independently
// decided "this looks new to me" on their first build and wrote a different
// bumped number into package.json, permanently diverging (v0.4.23 on one
// server, v0.4.24 on another, same source) - the auto-write was the bug.
//
// The version must be a pure function of what's committed in git, the same
// way electron/package.json's version works: a developer bumps it by hand
// as part of the same commit that changes agent source, and every build
// everywhere just reads and stamps whatever number is already there -
// never writes one. This function only WARNS (to stdout, never touches
// disk) if agent-relevant source changed since this machine's last local
// build but the version wasn't bumped in git - a nudge for the developer
// doing the commit, not something a build machine should ever act on itself.
function warnIfVersionLikelyForgotten(sourceChanged, version) {
  if (sourceChanged) {
    console.warn(
      `[build] NOTE: agent source changed since the last build on this machine, ` +
      `but package.json's version is still ${version}. If this is a real fix, ` +
      `bump the version by hand and commit it alongside the source change - ` +
      `the build itself will never do this for you (see this function's comment).`
    )
  }
}

// Only bump when something that actually affects the shipped .exe changed
// since the last build — otherwise every `npm run build` bumped the
// version even for a no-op rebuild (e.g. just testing the packaging step
// itself), making the version number a poor "did anything actually change"
// signal. Determines that by hashing the exact set of real source files
// esbuild would pull into the bundle — a dry run (write: false) purely to
// get its metafile, not a hand-maintained file list, since the agent
// imports straight from the main app's own src/ in a couple of places
// (job-handler.ts's RuckusR710ApiService, print-driver.ts's printRawData —
// see this file's header comment) whose OWN transitive imports would
// silently go untracked by anything less than "ask esbuild what it
// actually used."
async function computeSourceHash() {
  const result = await build({
    entryPoints: [join(__dirname, 'src', 'index.ts')],
    bundle: true,
    platform: 'node',
    target: 'node20',
    format: 'cjs',
    absWorkingDir: __dirname,
    write: false,
    metafile: true,
    external: ['systray2', 'serialport'],
  })

  const inputPaths = Object.keys(result.metafile.inputs)
    // package.json IS a real input (tray.ts imports it for AGENT_VERSION),
    // but it's excluded from the hash since it's only ever hand-edited by a
    // developer bumping the version deliberately - that's a real,
    // intentional source change already visible in git history/diffs, not
    // something this build-time "did anything change" check needs to catch.
    .filter((p) => !p.endsWith('package.json'))
    .sort()

  const hash = createHash('sha256')
  for (const relPath of inputPaths) {
    hash.update(relPath)
    hash.update(readFileSync(join(__dirname, relPath)))
  }
  return hash.digest('hex')
}

async function main() {
  if (!existsSync(distDir)) mkdirSync(distDir, { recursive: true })

  console.log('[build] Checking whether any agent-relevant source file changed since the last build…')
  const currentSourceHash = await computeSourceHash()
  const previousSourceHash = existsSync(sourceHashPath) ? readFileSync(sourceHashPath, 'utf8').trim() : null
  const sourceChanged = currentSourceHash !== previousSourceHash

  // Version is read-only here, deliberately - see warnIfVersionLikelyForgotten()'s
  // comment. Every build on every machine stamps whatever version is
  // already committed in package.json; nothing here ever writes to it.
  const { version } = JSON.parse(readFileSync(join(__dirname, 'package.json'), 'utf8'))
  console.log(`[build] Building agent version ${version} (from package.json, as committed in git)`)
  warnIfVersionLikelyForgotten(sourceChanged, version)

  stopRunningAgent()

  console.log('[build] Bundling with esbuild…')
  await build({
    entryPoints: [join(__dirname, 'src', 'index.ts')],
    bundle: true,
    platform: 'node',
    target: 'node20',
    format: 'cjs',
    outfile: join(distDir, 'bundle.js'),
    // Native/spawned-helper packages stay external — bundling them as JS
    // would break their runtime binary-resolution logic.
    external: ['systray2', 'serialport'],
  })

  // systray2 and serialport (both external, both have native binaries) plus
  // their runtime dependency closures must travel alongside the bundle
  // since none of it is inlined by esbuild.
  const nodeModulesDir = join(__dirname, 'node_modules')
  const nativeClosure = new Set()
  for (const pkgName of ['systray2', 'serialport']) {
    collectDependencyClosure(pkgName, nodeModulesDir, nativeClosure)
  }
  console.log(`[build] Copying systray2 + serialport + runtime deps: ${[...nativeClosure].join(', ')}`)
  for (const pkgName of nativeClosure) {
    cpSync(join(nodeModulesDir, pkgName), join(distDir, 'node_modules', pkgName), { recursive: true })
  }

  console.log('[build] Writing Node SEA config…')
  const seaConfigPath = join(distDir, 'sea-config.json')
  writeFileSync(
    seaConfigPath,
    JSON.stringify(
      {
        main: join(distDir, 'bundle.js'),
        output: join(distDir, 'sea-prep.blob'),
        disableExperimentalSEAWarning: true,
      },
      null,
      2
    )
  )

  console.log('[build] Generating SEA blob…')
  execFileSync(process.execPath, ['--experimental-sea-config', seaConfigPath], { stdio: 'inherit' })

  const exePath = join(distDir, 'r710-agent.exe')
  console.log('[build] Copying node.exe as the base executable…')
  copyFileSync(process.execPath, exePath)

  console.log('[build] Injecting the bundle into the executable (postject)…')
  execFileSync(
    process.execPath,
    [
      join(__dirname, 'node_modules', 'postject', 'dist', 'cli.js'),
      exePath,
      'NODE_SEA_BLOB',
      join(distDir, 'sea-prep.blob'),
      '--sentinel-fuse',
      'NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2',
    ],
    { stdio: 'inherit' }
  )

  console.log(`[build] Done. Standalone agent at: ${exePath}`)

  // The agent has no Windows Service / tray-Quit guaranteed to work (tray
  // start can itself fail — see the fs-extra bug this shipped alongside),
  // and a second double-click just fails silently on EADDRINUSE without
  // stopping the first instance. A plain double-clickable .bat is the
  // simplest "stop it" affordance that doesn't require the user to know
  // Task Manager or PowerShell.
  const stopBatPath = join(distDir, 'Stop R710 Agent.bat')
  console.log('[build] Writing Stop R710 Agent.bat…')
  writeFileSync(
    stopBatPath,
    [
      '@echo off',
      'echo Stopping R710 Local Agent...',
      'taskkill /IM r710-agent.exe /F >nul 2>&1',
      'if %ERRORLEVEL%==0 (',
      '  echo R710 Agent stopped.',
      ') else (',
      '  echo R710 Agent was not running.',
      ')',
      'pause',
      '',
    ].join('\r\n')
  )

  console.log('[build] Zipping exe + stop script + systray2 helper folder + its runtime deps for a single-file download…')
  await zipDist(exePath, stopBatPath, join(distDir, 'node_modules'), join(distDir, 'r710-agent.zip'))
  console.log(`[build] Download bundle at: ${join(distDir, 'r710-agent.zip')}`)

  // Only recorded once the build actually finished — a failed/aborted build
  // must never mark this source state as "already accounted for," or a
  // fix that failed to package correctly would look up-to-date forever.
  writeFileSync(sourceHashPath, currentSourceHash)
}

function zipDist(exePath, stopBatPath, nodeModulesDir, zipPath) {
  return new Promise((resolve, reject) => {
    const output = createWriteStream(zipPath)
    const archive = new ZipArchive({ zlib: { level: 9 } })
    output.on('close', resolve)
    archive.on('error', reject)
    archive.pipe(output)
    archive.file(exePath, { name: 'r710-agent.exe' })
    archive.file(stopBatPath, { name: 'Stop R710 Agent.bat' })
    archive.directory(nodeModulesDir, 'node_modules')
    archive.finalize()
  })
}

main().catch((error) => {
  console.error('[build] Failed:', error)
  process.exit(1)
})
