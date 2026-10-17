#!/usr/bin/env node
/**
 * Smoke-check for Sync Service runtime prerequisites
 * Usage: node scripts/smoke-check-service.js
 * Environment:
 *   DATABASE_URL (required unless --skip-db)
 *   SYNC_PORT (optional, default 8765)
 *   SKIP_DB_PRECHECK=true to skip DB connectivity check
 * Flags:
 *   --bundle-only  only run the server-bundle check (used by `npm run build:server`)
 *   --skip-bundle  skip the server-bundle check
 */

const net = require('net')
const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

function log(msg) { console.log(msg) }
function err(msg) { console.error(msg) }

async function checkEnv() {
  log('Checking environment variables...')
  const skip = (process.env.SKIP_DB_PRECHECK === 'true') || (process.argv.indexOf('--skip-db') !== -1)
  const dbUrl = process.env.DATABASE_URL
  if (!dbUrl && !skip) {
    err('ERROR: DATABASE_URL is not set. Set DATABASE_URL or run with --skip-db')
    process.exit(2)
  }
  if (skip) {
    log('SKIP_DB_PRECHECK or --skip-db detected: skipping DATABASE_URL requirement')
  }
  log('Environment variables: ok')
}

async function checkDb() {
  if (process.env.SKIP_DB_PRECHECK === 'true' || process.argv.indexOf('--skip-db') !== -1) {
    log('Skipping DB connectivity check (SKIP_DB_PRECHECK or --skip-db)')
    return
  }

  log('Checking database connectivity via Prisma...')
  try {
    const { PrismaClient } = require('@prisma/client')
    const p = new PrismaClient()
    await p.$connect()
    // simple query
    await p.$queryRaw`SELECT 1`
    await p.$disconnect()
    log('Database connectivity: OK')
  } catch (e) {
    err('Database connectivity failed: ' + (e.message || e))
    process.exit(3)
  }
}

function checkPort() {
  const port = parseInt(process.env.SYNC_PORT || '8765', 10)
  const checkPort = port + 1 // health port

  return new Promise((resolve) => {
    const socket = net.createConnection({ port: checkPort, host: '127.0.0.1' }, () => {
      log(`Health port ${checkPort} is open (service may be running)`)
      socket.end()
      resolve(true)
    })

    socket.on('error', () => {
      log(`Health port ${checkPort} not open (service likely not running)`)
      resolve(false)
    })
  })
}

/**
 * MBM-321 — server.ts (compiled to dist/server.js) runs OUTSIDE Next.js's
 * runtime: it starts schedulers before Next is ready. If anything it loads
 * pulls in a Next.js server-runtime module (next/server, next/headers, …),
 * the service dies at startup with "Invariant: AsyncLocalStorage accessed in
 * runtime where it is not available" (MBM-320). Walk every require() reachable
 * from dist/server.js and fail, showing the import chain, if one does.
 * Exit code 4 on failure.
 */
const FORBIDDEN_IN_SERVER_BUNDLE = [
  'next/server',
  'next/headers',
  'next/cache',
  'next/navigation',
]

function checkServerBundle() {
  // SERVER_BUNDLE_DIR: check a compiled bundle somewhere other than ./dist
  const distRoot = path.resolve(process.env.SERVER_BUNDLE_DIR || path.join(__dirname, '..', 'dist'))
  const entry = path.join(distRoot, 'server.js')
  log('Checking server bundle (dist/server.js) for Next.js runtime imports...')
  if (!fs.existsSync(entry)) {
    log('dist/server.js not found — run `npm run build:server` first; skipping bundle check')
    return
  }

  // Same resolution the service uses: "@/x" → dist/src/x (tsconfig-paths,
  // baseUrl ./dist), relative paths as normal. Packages aren't followed —
  // only the app's own compiled modules.
  const resolveLocal = (from, spec) => {
    let base
    if (spec.startsWith('@/')) base = path.join(distRoot, 'src', spec.slice(2))
    else if (spec.startsWith('./') || spec.startsWith('../')) base = path.resolve(path.dirname(from), spec)
    else return null
    for (const candidate of [base + '.js', path.join(base, 'index.js'), base]) {
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate
    }
    return null
  }

  const seen = new Set()
  const problems = []
  const walk = (file, chain) => {
    if (seen.has(file)) return
    seen.add(file)
    const here = [...chain, path.relative(distRoot, file).split(path.sep).join('/')]
    const src = fs.readFileSync(file, 'utf8')
    for (const m of src.matchAll(/require\(\s*["']([^"']+)["']\s*\)/g)) {
      const spec = m[1]
      if (FORBIDDEN_IN_SERVER_BUNDLE.includes(spec)) {
        problems.push(`${here.join(' -> ')} -> ${spec}`)
        continue
      }
      const next = resolveLocal(file, spec)
      if (next) walk(next, here)
    }
  }
  walk(entry, [])

  if (problems.length > 0) {
    err(`\nERROR: ${problems.length} Next.js runtime import(s) reachable from dist/server.js — the service will crash at startup:`)
    problems.forEach(p => err('  ' + p))
    err('Move whatever server.ts needs into a module that does not import these (see src/lib/restaurant-expense-combo.ts, MBM-320).')
    process.exit(4)
  }
  log(`Server bundle: OK (${seen.size} modules checked)`)
}

async function main() {
  const has = (flag) => process.argv.indexOf(flag) !== -1
  if (has('--bundle-only')) {
    checkServerBundle()
    log('\nSERVER BUNDLE CHECK: OK')
    process.exit(0)
  }
  if (!has('--skip-bundle')) checkServerBundle()
  await checkEnv()
  await checkDb()
  const portOpen = await checkPort()
  if (!portOpen) {
    log('Note: health port closed — this may be normal if the service is not started yet')
  }

  log('\nSMOKE CHECK: OK')
  process.exit(0)
}

main().catch(e => {
  err('Smoke check failed: ' + (e && e.message ? e.message : e))
  process.exit(1)
})
