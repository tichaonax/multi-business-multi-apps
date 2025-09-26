#!/usr/bin/env node
/**
 * Smoke-check for Sync Service runtime prerequisites
 * Usage: node scripts/smoke-check-service.js
 * Environment:
 *   DATABASE_URL (required unless --skip-db)
 *   SYNC_PORT (optional, default 3001)
 *   SKIP_DB_PRECHECK=true to skip DB connectivity check
 */

const net = require('net')
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
  const port = parseInt(process.env.SYNC_PORT || '3001', 10)
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

async function main() {
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
