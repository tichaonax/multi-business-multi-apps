#!/usr/bin/env node

/**
 * Safe Setup with Service Check
 *
 * This script safely handles fresh installation when a Windows service
 * is also using Prisma. It stops the service before setup and reminds
 * you to restart it after.
 *
 * Usage:
 *   node scripts/safe-setup-with-service-check.js
 *   node scripts/safe-setup-with-service-check.js --skip-service-check
 */

const { execSync } = require('child_process')
const path = require('path')

const ROOT_DIR = path.join(__dirname, '..')
const SKIP_SERVICE_CHECK = process.argv.includes('--skip-service-check')

function log(message, color = '\x1b[36m') {
  console.log(`${color}${message}\x1b[0m`)
}

function success(message) {
  log(`✅ ${message}`, '\x1b[32m')
}

function warning(message) {
  log(`⚠️  ${message}`, '\x1b[33m')
}

function error(message) {
  log(`❌ ${message}`, '\x1b[31m')
}

/**
 * Check if a Windows service is running
 */
function checkServiceStatus(serviceName) {
  try {
    const output = execSync(`sc.exe query "${serviceName}"`, {
      encoding: 'utf8',
      stdio: 'pipe'
    })

    // Check if service is running
    if (output.includes('RUNNING')) {
      return { installed: true, running: true }
    } else if (output.includes('STOPPED')) {
      return { installed: true, running: false }
    }

    return { installed: true, running: false }
  } catch (err) {
    // Service not installed
    return { installed: false, running: false }
  }
}

/**
 * Check all relevant services that use Prisma
 */
function checkAllServices() {
  const services = [
    { name: 'Multi-Business Sync Service', stopCommand: 'npm run service:stop' },
    { name: 'electricity-tokens.exe', stopCommand: 'sc.exe stop "electricity-tokens.exe"' }
  ]

  const runningServices = []

  for (const service of services) {
    const status = checkServiceStatus(service.name)
    if (status.installed && status.running) {
      runningServices.push(service)
    }
  }

  return runningServices
}

/**
 * Sleep helper function
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Stop a service
 */
async function stopService(service) {
  try {
    log(`\n🛑 Stopping ${service.name}...`)
    execSync(service.stopCommand, {
      cwd: ROOT_DIR,
      stdio: 'inherit'
    })
    success('Service stopped successfully')

    // Wait a bit for service to fully stop
    log('⏳ Waiting for service to fully stop...')
    await sleep(3000)

    return true
  } catch (err) {
    error(`Failed to stop ${service.name}: ` + err.message)
    return false
  }
}

/**
 * Main execution
 */
async function main() {
  log('🚀 Safe Setup with Service Check\n')
  log('=' .repeat(60))

  // Step 1: Check if service is running
  if (!SKIP_SERVICE_CHECK) {
    log('\n🔍 Checking if Multi-Business Sync Service is running...\n')

    const serviceStatus = checkServiceStatus()

    if (serviceStatus.installed && serviceStatus.running) {
      warning('⚠️  WARNING: Multi-Business Sync Service is RUNNING')
      log('')
      log('The service must be stopped before running setup to avoid')
      log('Prisma file locking issues (EPERM errors).')
      log('')

      // Stop the service
      const stopped = await stopService()

      if (!stopped) {
        error('\n❌ Could not stop the service.')
        log('\nPlease stop it manually and run this script again:')
        log('  npm run service:stop')
        log('  node scripts/safe-setup-with-service-check.js\n')
        process.exit(1)
      }
    } else if (serviceStatus.installed && !serviceStatus.running) {
      success('✅ Multi-Business Sync Service is stopped - safe to proceed\n')
    } else {
      success('✅ Multi-Business Sync Service not installed - safe to proceed\n')
    }
  } else {
    warning('Skipping service check (--skip-service-check flag used)\n')
  }

  // Step 2: Run the normal setup
  log('\n📦 Running fresh installation setup...\n')
  log('=' .repeat(60) + '\n')

  try {
    execSync('node scripts/setup-fresh-install.js', {
      cwd: ROOT_DIR,
      stdio: 'inherit'
    })
  } catch (err) {
    error('\n❌ Setup failed: ' + err.message)
    process.exit(1)
  }

  // Step 3: Remind user to restart service
  log('\n' + '=' .repeat(60))
  success('✅ SETUP COMPLETED SUCCESSFULLY!')
  log('=' .repeat(60))

  if (!SKIP_SERVICE_CHECK) {
    log('\n⚠️  IMPORTANT: Restart the Multi-Business Sync Service')
    log('\n📋 To restart the service:')
    log('   npm run service:start\n')
    log('📊 To check service status:')
    log('   npm run service:status\n')
  }
}

main().catch(err => {
  error('\n❌ FATAL ERROR: ' + err.message)
  console.error(err)
  process.exit(1)
})
