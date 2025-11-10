#!/usr/bin/env node

/**
 * Production-Safe Fresh Installation Setup
 *
 * This script is designed for production servers where multiple services
 * may be using Prisma. It checks for running services and requires them
 * to be stopped manually before proceeding.
 *
 * IMPORTANT: This script will NOT automatically kill Node processes or
 * stop services. You must stop them manually to avoid disrupting production.
 *
 * Usage:
 *   node scripts/production-safe-setup.js
 *   node scripts/production-safe-setup.js --force  # Skip service check (DANGEROUS)
 */

const { execSync } = require('child_process')
const path = require('path')
const readline = require('readline')

const ROOT_DIR = path.join(__dirname, '..')
const FORCE_MODE = process.argv.includes('--force')

// Services that use Prisma - ADD YOUR SERVICES HERE
const PRISMA_SERVICES = [
  'Multi-Business Sync Service',
  'electricity-tokens.exe'
]

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

    if (output.includes('RUNNING')) {
      return { installed: true, running: true }
    } else if (output.includes('STOPPED')) {
      return { installed: true, running: false }
    }

    return { installed: true, running: false }
  } catch (err) {
    return { installed: false, running: false }
  }
}

/**
 * Check all Prisma-using services
 */
function checkAllPrismaServices() {
  const runningServices = []
  const stoppedServices = []

  for (const serviceName of PRISMA_SERVICES) {
    const status = checkServiceStatus(serviceName)

    if (status.installed) {
      if (status.running) {
        runningServices.push(serviceName)
      } else {
        stoppedServices.push(serviceName)
      }
    }
  }

  return { runningServices, stoppedServices }
}

/**
 * Confirm with user
 */
async function confirm(message) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })

  return new Promise(resolve => {
    rl.question(`${message} (yes/no): `, answer => {
      rl.close()
      resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y')
    })
  })
}

/**
 * Main execution
 */
async function main() {
  log('\n🚀 Production-Safe Fresh Installation Setup')
  log('=' .repeat(60))
  log('⚠️  This script checks for running services that use Prisma\n')

  // Step 1: Check for running services
  if (!FORCE_MODE) {
    log('🔍 Checking for running services that use Prisma...\n')

    const { runningServices, stoppedServices } = checkAllPrismaServices()

    // Show status of all services
    if (stoppedServices.length > 0) {
      success('Stopped services:')
      for (const service of stoppedServices) {
        log(`   ✓ ${service}`, '\x1b[32m')
      }
      log('')
    }

    if (runningServices.length > 0) {
      error('RUNNING SERVICES DETECTED!')
      log('')
      log('The following services are currently RUNNING and use Prisma:')
      for (const service of runningServices) {
        log(`   ⚠️  ${service}`, '\x1b[31m')
      }
      log('')
      log('=' .repeat(60))
      log('⚠️  CANNOT PROCEED WITH SETUP')
      log('=' .repeat(60))
      log('')
      log('These services must be stopped before running fresh installation')
      log('to avoid Prisma file locking issues (EPERM errors).')
      log('')
      log('📋 To stop services:')
      log('')
      log('   For Multi-Business Sync Service:')
      log('     npm run sync-service:stop')
      log('')
      log('   For electricity-tokens:')
      log('     sc.exe stop "electricity-tokens.exe"')
      log('')
      log('   Or stop all services:')
      log('     npm run sync-service:stop')
      log('     sc.exe stop "electricity-tokens.exe"')
      log('')
      log('After stopping services, run this script again:')
      log('   node scripts/production-safe-setup.js')
      log('')
      log('⚠️  Remember to restart services after setup completes!')
      log('')
      process.exit(1)
    }

    success('✅ All Prisma services are stopped - safe to proceed\n')

    // Final confirmation
    const confirmed = await confirm('🤔 Continue with fresh installation?')
    if (!confirmed) {
      log('\n❌ Setup cancelled by user\n')
      process.exit(0)
    }
  } else {
    warning('⚠️  FORCE MODE: Skipping service check - USE WITH CAUTION!\n')
  }

  // Step 2: Run the normal setup WITHOUT nuclear option
  log('\n📦 Running fresh installation setup...')
  log('=' .repeat(60) + '\n')

  try {
    // Use setup WITHOUT --nuclear flag for production safety
    execSync('node scripts/setup-fresh-install.js', {
      cwd: ROOT_DIR,
      stdio: 'inherit',
      env: {
        ...process.env,
        // Disable nuclear cleanup in production
        SKIP_NUCLEAR_CLEANUP: '1'
      }
    })
  } catch (err) {
    error('\n❌ Setup failed: ' + err.message)
    log('\n📋 Troubleshooting:')
    log('   1. Verify all services are stopped')
    log('   2. Check if any Node processes are holding Prisma files')
    log('   3. Restart the server if needed')
    log('   4. Try running setup again\n')
    process.exit(1)
  }

  // Step 3: Remind to restart services
  log('\n' + '=' .repeat(60))
  success('✅ SETUP COMPLETED SUCCESSFULLY!')
  log('=' .repeat(60))
  log('')
  log('⚠️  IMPORTANT: Restart your services now!')
  log('')
  log('📋 To restart services:')
  log('')
  log('   For Multi-Business Sync Service:')
  log('     npm run sync-service:start')
  log('')
  log('   For electricity-tokens:')
  log('     sc.exe start "electricity-tokens.exe"')
  log('')
  log('📊 To verify services are running:')
  log('     npm run sync-service:status')
  log('     sc.exe query "electricity-tokens.exe"')
  log('')
}

main().catch(err => {
  error('\n❌ FATAL ERROR: ' + err.message)
  console.error(err)
  process.exit(1)
})
