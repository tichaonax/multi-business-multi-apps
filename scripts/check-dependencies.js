#!/usr/bin/env node
/**
 * Verifies every package declared in package.json's "dependencies" is
 * actually resolvable in node_modules — i.e. that `npm install` has
 * actually been run since package.json last changed.
 *
 * Why this exists: several dependencies here (e.g. `stream-json`, used by
 * the streaming backup/restore parser) are only ever required via a
 * dynamic `import()` deep inside a rarely-hit code path. Node's own module
 * resolution has nothing to fail on until that exact code path executes —
 * and `next build` can't statically see a dynamic import target either, so
 * it can't fail the build on a missing one. The real-world result: a
 * freshly set-up server pulled `main`, built successfully, and only
 * crashed days later, mid-restore, in front of a user, with a bare
 * `Cannot find package 'stream-json'` buried in a server log. This check
 * catches that immediately and loudly instead — at build time (via the
 * `prebuild` script) and again at server startup (see server.ts), so it's
 * caught regardless of how the app is deployed or started.
 */
const fs = require('fs')
const path = require('path')

const ROOT_DIR = path.join(__dirname, '..')

function checkDependencies({ exitOnFailure = true } = {}) {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'package.json'), 'utf8'))
  const deps = Object.keys(pkg.dependencies || {})
  const missing = []

  for (const dep of deps) {
    // Deliberately NOT require.resolve() here — two different ways it
    // produces false positives on packages that ARE correctly installed:
    // (1) type-only packages (@types/*) and CLI-only packages (prisma) have
    //     no importable JS "main" at all, so resolving the bare package name
    //     throws even when it's installed correctly.
    // (2) resolving `${dep}/package.json` instead avoids (1), but plenty of
    //     modern packages (bcryptjs, next-auth, clsx, sonner, ...) declare an
    //     "exports" map that doesn't explicitly allow "./package.json" as a
    //     subpath — Node throws ERR_PACKAGE_PATH_NOT_EXPORTED for those even
    //     though the file is sitting right there on disk.
    // A direct filesystem check for node_modules/<dep>/package.json sidesteps
    // Node's module-resolution algorithm entirely and just verifies physical
    // presence — which is exactly what `npm install` actually guarantees.
    const installedMarker = path.join(ROOT_DIR, 'node_modules', ...dep.split('/'), 'package.json')
    if (!fs.existsSync(installedMarker)) {
      missing.push(dep)
    }
  }

  if (missing.length > 0) {
    console.error('')
    console.error('❌ FATAL: node_modules is out of sync with package.json.')
    console.error(`   ${missing.length} declared dependenc${missing.length === 1 ? 'y is' : 'ies are'} not installed:`)
    for (const dep of missing) console.error(`     - ${dep}`)
    console.error('')
    console.error('   Run `npm install`, then try again.')
    console.error('')
    if (exitOnFailure) process.exit(1)
    return false
  }

  return true
}

if (require.main === module) {
  const ok = checkDependencies()
  if (ok) console.log(`✅ All ${Object.keys(JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'package.json'), 'utf8')).dependencies || {}).length} declared dependencies are installed.`)
}

module.exports = { checkDependencies }
