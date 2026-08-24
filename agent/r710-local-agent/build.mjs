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
 */

import { build } from 'esbuild'
import { execFileSync } from 'child_process'
import { copyFileSync, mkdirSync, existsSync, writeFileSync, readFileSync, cpSync, createWriteStream } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { ZipArchive } from 'archiver'

const __dirname = dirname(fileURLToPath(import.meta.url))
const distDir = join(__dirname, 'dist')

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

async function main() {
  if (!existsSync(distDir)) mkdirSync(distDir, { recursive: true })

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
    external: ['systray2'],
  })

  // systray2 (external, has native helper binaries) and its runtime
  // dependency closure must travel alongside the bundle since none of it is
  // inlined by esbuild.
  const nodeModulesDir = join(__dirname, 'node_modules')
  const systrayClosure = collectDependencyClosure('systray2', nodeModulesDir)
  console.log(`[build] Copying systray2 + runtime deps: ${[...systrayClosure].join(', ')}`)
  for (const pkgName of systrayClosure) {
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
