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
import { copyFileSync, mkdirSync, existsSync, writeFileSync, cpSync, createWriteStream } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { ZipArchive } from 'archiver'

const __dirname = dirname(fileURLToPath(import.meta.url))
const distDir = join(__dirname, 'dist')

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

  // systray2's own node_modules (including its native helper binaries) must
  // travel alongside the bundle since it's external, not inlined.
  console.log('[build] Copying systray2 (external, has native helper binaries)…')
  cpSync(join(__dirname, 'node_modules', 'systray2'), join(distDir, 'node_modules', 'systray2'), { recursive: true })

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

  console.log('[build] Zipping exe + systray2 helper folder for a single-file download…')
  await zipDist(exePath, join(distDir, 'node_modules', 'systray2'), join(distDir, 'r710-agent.zip'))
  console.log(`[build] Download bundle at: ${join(distDir, 'r710-agent.zip')}`)
}

function zipDist(exePath, systrayDir, zipPath) {
  return new Promise((resolve, reject) => {
    const output = createWriteStream(zipPath)
    const archive = new ZipArchive({ zlib: { level: 9 } })
    output.on('close', resolve)
    archive.on('error', reject)
    archive.pipe(output)
    archive.file(exePath, { name: 'r710-agent.exe' })
    archive.directory(systrayDir, 'node_modules/systray2')
    archive.finalize()
  })
}

main().catch((error) => {
  console.error('[build] Failed:', error)
  process.exit(1)
})
