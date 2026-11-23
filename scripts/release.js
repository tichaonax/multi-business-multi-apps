#!/usr/bin/env node
/**
 * MBM-341 — build a release to install on a server (docs/runbooks/new-mbm-server.md).
 *
 *   npm run release                 # the commit checked out now (HEAD)
 *   npm run release -- --ref main   # any commit, branch or tag
 *
 * Builds from a CLEAN checkout of that commit (a temporary git worktree), so
 * uncommitted changes on this machine never get into a release. Then:
 *   npm ci → npm run build (Prisma client, Next, server, agent) →
 *   npm prune --omit=dev → release.json → releases/<name>.zip + <name>.sha256
 *
 * The server only installs it (deploy/server/install-release.ps1): it never
 * builds, and never runs `git pull`. .env.local is used for the build only and
 * is never put in the zip.
 *
 * Build on the same OS and Node version as the server (Windows x64, Node in
 * release.json): node_modules holds native parts (Prisma engines etc.).
 */
const { execSync } = require('child_process')
const crypto = require('crypto')
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const OUT = path.join(ROOT, 'releases')

function arg(name, fallback) {
  const i = process.argv.indexOf(name)
  return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback
}
function run(cmd, cwd, extraEnv = {}) {
  console.log(`\n> ${cmd}`)
  execSync(cmd, { cwd, stdio: 'inherit', env: { ...process.env, ...extraEnv } })
}
// Install scripts: package.json's "allowScripts" says which packages may run
// them (native parts, Prisma's engines, ffmpeg; not puppeteer's Chrome download:
// MBM uses the installed Chrome). npm 11 lists the ones nobody reviewed; a
// release with any STOPS (a later npm skips them, and they'd be missing).
// Windows' own tar (bsdtar) makes zips; Git's GNU tar on the PATH can't
const TAR = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'tar.exe')

function npmCi(cwd) {
  const cmd = 'npm ci --legacy-peer-deps --no-audit --no-fund'
  console.log(`
> ${cmd}`)
  let out
  try {
    out = execSync(`${cmd} 2>&1`, { cwd, encoding: 'utf8', maxBuffer: 64 << 20, env: { ...process.env, PUPPETEER_SKIP_DOWNLOAD: 'true' } })
  } catch (e) { console.log(e.stdout || ''); throw e }
  console.log(out)
  const unreviewed = [...new Set([...out.matchAll(/install-scripts\s{3}(@?[^@\s]+)@/g)].map(m => m[1]))]
  if (unreviewed.length) throw new Error(`install scripts nobody reviewed: ${unreviewed.join(', ')}. Run npm approve-scripts --no-allow-scripts-pin <pkg> (or npm deny-scripts) and commit package.json`)
}

function git(cmd) {
  return execSync(`git ${cmd}`, { cwd: ROOT, encoding: 'utf8' }).trim()
}
function ok(t) { console.log(`  OK    ${t}`) }
function stop(t) { console.error(`\n  STOP  ${t}`); process.exit(1) }

const ref = arg('--ref', 'HEAD')
let commit
try { commit = git(`rev-parse --verify "${ref}^{commit}"`) } catch { stop(`no commit "${ref}"`) }
const short = commit.slice(0, 8)
const stamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 13) // 20261123-0412
const name = `mbm-${stamp}-${short}`
const pkg = JSON.parse(git(`show ${commit}:package.json`))
// Beside the repo, not in it: the dev server and the type check never see it
const work = path.join(ROOT, '..', `mbm-release-build-${short}`)

console.log(`MBM release ${name} from ${ref} (${commit})`)
if (git('status --porcelain') && ref === 'HEAD') {
  console.log('  NOTE  this checkout has uncommitted changes: they are NOT in the release (it is built from the commit)')
}
fs.mkdirSync(OUT, { recursive: true })

// 1. A clean checkout of the commit
if (fs.existsSync(work)) {
  try { git(`worktree remove --force "${work}"`) } catch { fs.rmSync(work, { recursive: true, force: true }) }
}
git(`worktree add --detach "${work}" ${commit}`)
ok(`clean checkout in ${work}`)

let failed = null
try {
  // The build reads .env.local (as on this machine); it is removed before packing
  const envFile = path.join(ROOT, '.env.local')
  if (fs.existsSync(envFile)) fs.copyFileSync(envFile, path.join(work, '.env.local'))

  // The exact package versions. package-lock.json isn't committed (yet), so a
  // commit without one takes this machine's: the set built and tested here.
  var lockfile = 'commit'
  if (!fs.existsSync(path.join(work, 'package-lock.json'))) {
    const local = path.join(ROOT, 'package-lock.json')
    if (!fs.existsSync(local)) throw new Error('no package-lock.json in the commit or on this machine')
    fs.copyFileSync(local, path.join(work, 'package-lock.json'))
    lockfile = 'build machine'
    console.log('  NOTE  package-lock.json is not in the commit: using this machine\'s')
  }

  // 2. Install exactly the lockfile, build, then drop the dev packages
  npmCi(work)
  ok('packages installed, install scripts run')
  run('npm run build', work, { NODE_OPTIONS: '--max-old-space-size=8192' })
  for (const f of ['.next/BUILD_ID', 'dist/server.js']) {
    if (!fs.existsSync(path.join(work, f))) throw new Error(`the build left no ${f}`)
  }
  ok('built')
  run('npm prune --omit=dev --legacy-peer-deps --no-audit --no-fund', work)

  // 2b. The POS app (Electron) installer, from the same commit. The server
  // serves it at /api/public/electron/download; tills install it with
  // deploy/workstation/install-pos.ps1. Its node_modules aren't shipped.
  const ew = path.join(work, 'electron')
  const epkg = JSON.parse(fs.readFileSync(path.join(ew, 'package.json'), 'utf8'))
  const eout = path.join(work, 'electron-build')
  npmCi(ew)
  run(`npx electron-builder --win --publish never --config.directories.output="${eout}"`, ew)
  const setup = fs.readdirSync(eout).find(f => /\.exe$/i.test(f) && f.includes(epkg.version))
  if (!setup) throw new Error(`electron-builder left no installer for ${epkg.version} in ${eout}`)
  const instDir = path.join(work, 'electron-installer')
  fs.mkdirSync(instDir, { recursive: true })
  const instName = `Multi-Business-POS-Setup-${epkg.version}.exe`
  fs.copyFileSync(path.join(eout, setup), path.join(instDir, instName))
  const instHash = crypto.createHash('sha256').update(fs.readFileSync(path.join(instDir, instName))).digest('hex')
  fs.writeFileSync(path.join(instDir, `${instName}.sha256`), `${instHash}  ${instName}\n`)
  for (const d of [eout, path.join(ew, 'node_modules')]) fs.rmSync(d, { recursive: true, force: true })
  var electronInfo = { version: epkg.version, installer: `electron-installer/${instName}`, sha256: instHash }
  ok(`POS app installer ${instName}`)

  // 3. Never ship secrets or the build cache (the worktree's .git link is left
  // for git to remove the worktree, and kept out of the zip below)
  for (const f of ['.env.local', '.env', '.next/cache']) fs.rmSync(path.join(work, f), { recursive: true, force: true })

  // 4. What this release is
  const migrations = fs.readdirSync(path.join(work, 'prisma', 'migrations'))
    .filter(d => fs.statSync(path.join(work, 'prisma', 'migrations', d)).isDirectory())
    .sort()
  const info = {
    name,
    version: `${pkg.version}+${stamp}.${short}`,
    commit,
    ref,
    builtAt: new Date().toISOString(),
    builtOn: process.env.COMPUTERNAME || require('os').hostname(),
    node: process.version,
    platform: `${process.platform}-${process.arch}`,
    migrations: { count: migrations.length, last: migrations[migrations.length - 1] },
    lockfile,
    electron: electronInfo,
  }
  fs.writeFileSync(path.join(work, 'release.json'), JSON.stringify(info, null, 2))
  ok(`release.json: ${info.version}, ${info.migrations.count} migrations (last ${info.migrations.last})`)

  // 5. Zip (Windows' tar makes a .zip from the extension) and its SHA-256
  const zip = path.join(OUT, `${name}.zip`)
  run(`"${TAR}" -a -c -f "${zip}" --exclude ./.git -C "${work}" .`, ROOT)
  const sha = crypto.createHash('sha256')
  const fd = fs.openSync(zip, 'r'); const buf = Buffer.alloc(8 << 20); let n
  while ((n = fs.readSync(fd, buf, 0, buf.length, null)) > 0) sha.update(buf.subarray(0, n))
  fs.closeSync(fd)
  const hash = sha.digest('hex')
  fs.writeFileSync(path.join(OUT, `${name}.sha256`), `${hash}  ${name}.zip\n`)
  fs.writeFileSync(path.join(OUT, `${name}.json`), JSON.stringify(info, null, 2))
  const mb = Math.round(fs.statSync(zip).size / 1048576)
  console.log('')
  ok(`releases/${name}.zip (${mb} MB)`)
  ok(`SHA-256 ${hash}`)
} catch (e) {
  failed = e
} finally {
  try { git(`worktree remove --force "${work}"`) } catch { /* left for a look */ }
}
if (failed) stop(`release not made: ${failed.message}`)
console.log(`\nNext: copy releases/${name}.zip and .sha256 to the server, then deploy/server/install-release.ps1`)
