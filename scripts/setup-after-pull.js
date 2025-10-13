#!/usr/bin/env node

/**
 * After Git Pull Setup Script (SMART AUTO-SETUP)
 *
 * This script runs after git pull and intelligently detects:
 * - FRESH INSTALL: Automatically runs database setup + seeding
 * - EXISTING DEPLOYMENT: Only rebuilds (service handles migrations)
 *
 * Fresh Install Detection:
 * PRIMARY: Database does not exist or cannot be accessed
 * SECONDARY: No users in database (empty database)
 *
 * Fresh Install Flow:
 * 1. npm install + build
 * 2. node scripts/setup-database-schema.js (auto)
 * 3. node scripts/production-setup.js (auto)
 * 4. STOPS - User must manually: npm run service:install
 *
 * Upgrade Flow:
 * 1. npm install + build
 * 2. STOPS - User must manually: npm run service:restart
 */

const { execSync } = require('child_process')
const path = require('path')
const fs = require('fs')

const ROOT_DIR = path.join(__dirname, '..')

function log(message, type = 'INFO') {
  const colors = {
    INFO: '\x1b[36m',    // Cyan
    SUCCESS: '\x1b[32m', // Green
    WARN: '\x1b[33m',    // Yellow
    ERROR: '\x1b[31m'    // Red
  }
  const reset = '\x1b[0m'
  console.log(`${colors[type]}[${type}] ${message}${reset}`)
}

function run(command, description, optional = false) {
  console.log(`\n${'='.repeat(60)}`)
  console.log(`📦 ${description}`)
  console.log(`${'='.repeat(60)}`)
  console.log(`Running: ${command}\n`)

  try {
    execSync(command, {
      cwd: ROOT_DIR,
      stdio: 'inherit',
      shell: true
    })
    console.log(`\n✅ ${description} - COMPLETED\n`)
    return true
  } catch (error) {
    console.error(`\n❌ ${description} - FAILED`)
    console.error(`Error: ${error.message}\n`)

    if (!optional) {
      console.error('This is a required step. Setup cannot continue.')
      console.log('='.repeat(60))
      process.exit(1)
    }

    return false
  }
}

function checkServiceInstalled() {
  try {
    const distPath = path.join(ROOT_DIR, 'dist', 'service')
    return fs.existsSync(distPath)
  } catch {
    return false
  }
}

// ============================================================================
// FRESH INSTALL DETECTION FUNCTIONS
// ============================================================================

/**
 * Check if database exists and is accessible
 * Returns: true if exists and accessible, false if not
 */
async function checkDatabaseExists() {
  try {
    log('  Checking if database exists...', 'INFO')

    // Try to connect to database using Prisma
    const { PrismaClient } = require('@prisma/client')
    const prisma = new PrismaClient()

    // Try a simple query to verify database connection
    await prisma.$queryRaw`SELECT 1`
    await prisma.$disconnect()

    log('  ✓ Database: EXISTS and ACCESSIBLE', 'SUCCESS')
    return true
  } catch (error) {
    // Database doesn't exist or cannot connect
    if (error.message.includes('does not exist') ||
        error.message.includes('Unknown database') ||
        error.message.includes('cannot connect') ||
        error.code === 'P1003' || // Database doesn't exist
        error.code === 'P1001') { // Can't reach database server
      log('  ✓ Database: DOES NOT EXIST', 'WARN')
    } else {
      log('  ✓ Database: NOT ACCESSIBLE', 'WARN')
    }
    return false
  }
}

/**
 * Check if database has any users
 * Only called if database exists
 * Returns: true if users exist, false if empty
 */
async function checkHasUsers() {
  try {
    log('  Checking user count in database...', 'INFO')

    const { PrismaClient } = require('@prisma/client')
    const prisma = new PrismaClient()

    const count = await prisma.users.count()
    await prisma.$disconnect()

    if (count === 0) {
      log('  ✓ User count: 0 (empty database)', 'WARN')
      return false
    }

    log(`  ✓ User count: ${count}`, 'SUCCESS')
    return true
  } catch (error) {
    // Table doesn't exist or other error - treat as empty
    log('  ✓ User count: 0 (table not found or error)', 'WARN')
    return false
  }
}

/**
 * Determine if this is a fresh install
 * Primary check: Database doesn't exist
 * Secondary check: Database exists but has no users (empty)
 */
async function isFreshInstall() {
  console.log('\n' + '='.repeat(60))
  console.log('🔍 DETECTING INSTALLATION TYPE...')
  console.log('='.repeat(60))

  // Primary check: Does database exist?
  const dbExists = await checkDatabaseExists()

  if (!dbExists) {
    // Database doesn't exist = definitely fresh install
    console.log('\n' + '-'.repeat(60))
    log('✓ DETECTION RESULT: FRESH INSTALL (database does not exist)', 'WARN')
    console.log('-'.repeat(60) + '\n')
    return true
  }

  // Database exists - check if it has users
  const hasUsers = await checkHasUsers()

  console.log('\n' + '-'.repeat(60))
  if (!hasUsers) {
    log('✓ DETECTION RESULT: FRESH INSTALL (database empty)', 'WARN')
  } else {
    log('✓ DETECTION RESULT: EXISTING DEPLOYMENT', 'SUCCESS')
  }
  console.log('-'.repeat(60) + '\n')

  // Fresh install if database doesn't exist OR database exists but is empty
  return !hasUsers
}

/**
 * Handle fresh install - run database setup and seeding
 */
async function handleFreshInstall() {
  console.log('\n' + '='.repeat(60))
  console.log('🆕 FRESH INSTALL SETUP')
  console.log('='.repeat(60))
  log('Running automated database setup and seeding...', 'INFO')
  console.log('')

  let schemaSetupSuccess = false
  let seedingSuccess = false

  try {
    // Step 1: Database schema setup
    log('Starting database schema setup...', 'INFO')
    schemaSetupSuccess = run('node scripts/setup-database-schema.js',
        'Step 1: Setting up database schema and migrations',
        false)

    if (!schemaSetupSuccess) {
      throw new Error('Database schema setup failed')
    }

    // Step 2: Production data seeding
    log('Starting production data seeding...', 'INFO')
    seedingSuccess = run('node scripts/production-setup.js',
        'Step 2: Seeding production reference data',
        false)

    if (!seedingSuccess) {
      throw new Error('Production data seeding failed')
    }

    // Step 3: Validate UI Relations (Critical for preventing runtime errors)
    log('Starting UI relation validation...', 'INFO')
    const uiValidationSuccess = run('node scripts/validate-ui-relations.js',
        'Step 3: Validating UI component compatibility',
        true) // Optional - don't fail setup if validation has warnings

    if (!uiValidationSuccess) {
      log('UI validation found issues - review output above', 'WARN')
      log('This may cause runtime errors in UI components', 'WARN')
    }

    // Success!
    console.log('\n' + '='.repeat(60))
    console.log('✅ FRESH INSTALL SETUP COMPLETED!')
    console.log('='.repeat(60))
    console.log('')
    console.log('📊 Database Summary:')
    console.log('  ✓ Database created and migrations applied')
    console.log('  ✓ ~128 reference data records seeded')
    console.log('  ✓ Admin user created: admin@business.local / admin123')
    console.log('')
    console.log('📖 NEXT STEPS (MANUAL):')
    console.log('  1. Install Windows service (as Administrator):')
    console.log('     npm run service:install')
    console.log('')
    console.log('  2. Start the service (as Administrator):')
    console.log('     npm run service:start')
    console.log('')
    console.log('  3. Access the application:')
    console.log('     http://localhost:8080')
    console.log('')

    return true
  } catch (error) {
    console.log('\n' + '='.repeat(60))
    console.log('❌ FRESH INSTALL SETUP FAILED')
    console.log('='.repeat(60))
    console.error('\nError:', error.message)
    console.log('')

    // Detailed recovery steps based on what failed
    if (!schemaSetupSuccess) {
      log('Database schema setup failed - database may be in inconsistent state', 'ERROR')
      console.log('\n📖 RECOVERY STEPS:')
      console.log('  1. Check database connection in .env file')
      console.log('  2. Ensure PostgreSQL/MySQL server is running')
      console.log('  3. Run database setup manually:')
      console.log('     node scripts/setup-database-schema.js')
      console.log('  4. If successful, run seeding:')
      console.log('     node scripts/production-setup.js')
      console.log('  5. Then install and start service')
    } else if (!seedingSuccess) {
      log('Database schema created successfully, but seeding failed', 'WARN')
      console.log('\n📖 RECOVERY STEPS:')
      console.log('  1. Database structure is ready, only seeding needs retry')
      console.log('  2. Run data seeding manually:')
      console.log('     node scripts/production-setup.js')
      console.log('  3. Then install and start service')
    } else {
      log('Unexpected error during fresh install setup', 'ERROR')
      console.log('\n📖 MANUAL RECOVERY STEPS:')
      console.log('  1. Run database setup manually:')
      console.log('     node scripts/setup-database-schema.js')
      console.log('  2. Run data seeding manually:')
      console.log('     node scripts/production-setup.js')
      console.log('  3. Then install and start service')
    }
    console.log('')

    return false
  }
}

/**
 * Stop Windows service and clean up to release file locks before Prisma operations
 */
function stopWindowsServiceAndCleanup() {
  const { spawnSync } = require('child_process')

  try {
    // CRITICAL: node-windows automatically appends .exe to service names
    const SERVICE_NAME = 'multibusinesssyncservice.exe'
    const SC = 'sc.exe'  // Use .exe to avoid PowerShell aliases

    log('Checking and stopping Windows service...', 'INFO')

    // Check if service exists and is running
    const queryResult = spawnSync(SC, ['query', SERVICE_NAME], {
      encoding: 'utf-8',
      windowsHide: true
    })

    const output = queryResult.stdout || ''

    if (output.includes('does not exist') || output.includes('1060')) {
      log('Service not installed - skipping', 'INFO')
      return true
    }

    if (output.includes('STOPPED')) {
      log('Service already stopped', 'INFO')
      killStaleNodeProcesses()
      cleanupPrismaTemp()
      return true
    }

    if (output.includes('RUNNING') || output.includes('START_PENDING')) {
      log('Stopping Windows service...', 'INFO')

      const stopResult = spawnSync(SC, ['stop', SERVICE_NAME], {
        encoding: 'utf-8',
        windowsHide: true
      })

      if (stopResult.stderr && stopResult.stderr.includes('Access is denied')) {
        log('⚠️  Cannot stop service - requires Administrator privileges', 'WARN')
        return false
      }

      // Wait for service to stop
      const maxWait = 30000
      const start = Date.now()
      while (Date.now() - start < maxWait) {
        const statusResult = spawnSync(SC, ['query', SERVICE_NAME], {
          encoding: 'utf-8',
          windowsHide: true
        })
        if ((statusResult.stdout || '').includes('STOPPED')) {
          log('✅ Service stopped successfully', 'SUCCESS')
          // Wait for file handles to release
          const waitStart = Date.now()
          while (Date.now() - waitStart < 3000) { }
          killStaleNodeProcesses()
          cleanupPrismaTemp()
          return true
        }
        // Short wait before retry
        const waitStart = Date.now()
        while (Date.now() - waitStart < 1000) { }
      }

      log('⚠️  Service did not stop within 30 seconds', 'WARN')
      return false
    }

    return true
  } catch (error) {
    log(`Warning: ${error.message}`, 'WARN')
    return false
  }
}

/**
 * Find process ID by port using PowerShell (Windows-specific)
 */
function findProcessByPort(port = 8080) {
  const { spawnSync } = require('child_process')
  try {
    // Use PowerShell to find process on port (more reliable than netstat)
    const result = spawnSync('powershell', [
      '-Command',
      `Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess`
    ], {
      encoding: 'utf-8',
      windowsHide: true
    })

    if (result.stdout) {
      const pid = parseInt(result.stdout.trim(), 10)
      if (!isNaN(pid) && pid > 0) {
        log(`Found process on port ${port}: PID ${pid}`, 'INFO')
        return pid
      }
    }
  } catch (err) {
    // Port not in use or PowerShell command failed
  }
  return null
}

/**
 * Kill stale Node.js processes that might hold Prisma file locks
 */
function killStaleNodeProcesses() {
  const { spawnSync } = require('child_process')
  try {
    const currentPid = process.pid

    // First, try to kill process on port 8080 (our app port)
    const portPid = findProcessByPort(8080)
    if (portPid && portPid !== currentPid) {
      log(`Killing process on port 8080: PID ${portPid}`, 'INFO')
      spawnSync('taskkill.exe', ['/F', '/PID', portPid.toString()], {
        encoding: 'utf-8',
        windowsHide: true
      })
    }

    // Then kill other node.exe processes (excluding current)
    const result = spawnSync('taskkill.exe', ['/F', '/IM', 'node.exe', '/FI', `PID ne ${currentPid}`], {
      encoding: 'utf-8',
      windowsHide: true
    })
    if (result.stdout && result.stdout.includes('SUCCESS')) {
      log('Killed stale Node.js processes', 'INFO')
    }
  } catch (err) {
    // Ignore - no processes to kill
  }
}

/**
 * Clean up Prisma temporary files
 */
function cleanupPrismaTemp() {
  try {
    const prismaClientDir = path.join(ROOT_DIR, 'node_modules', '.prisma', 'client')
    if (fs.existsSync(prismaClientDir)) {
      const files = fs.readdirSync(prismaClientDir)
      files.filter(f => f.includes('.tmp')).forEach(f => {
        try {
          fs.unlinkSync(path.join(prismaClientDir, f))
        } catch (err) { }
      })
    }
  } catch (err) {
    // Ignore cleanup errors
  }
}

async function main() {
  console.log('\n' + '='.repeat(60))
  console.log('🚀 MULTI-BUSINESS MULTI-APPS - SMART SETUP')
  console.log('='.repeat(60) + '\n')

  // CRITICAL: Stop Windows service and cleanup BEFORE Prisma operations to prevent EPERM
  stopWindowsServiceAndCleanup()

  // Step 1: Install/update dependencies
  run('npm install', 'Installing/updating dependencies', false)

  // Step 2: Regenerate Prisma client (now safe from EPERM after cleanup)
  run('npx prisma generate', 'Regenerating Prisma client', false)

  // Step 3: Rebuild the application
  run('npm run build', 'Rebuilding the application', false)

  // Step 4: Rebuild Windows service
  run('npm run build:service', 'Rebuilding Windows sync service', false)

  // Step 5: Smart detection - fresh install vs upgrade
  const isFresh = await isFreshInstall()

  if (isFresh) {
    // FRESH INSTALL PATH: Run automated database setup
    const setupSuccess = await handleFreshInstall()

    if (!setupSuccess) {
      console.log('\n⚠️  Fresh install setup encountered errors.')
      console.log('Please review the error messages above and run manual recovery steps.')
      process.exit(1)
    }
  } else {
    // UPGRADE PATH: Service handles migrations
    console.log('\n' + '='.repeat(60))
    console.log('✅ UPGRADE BUILD COMPLETED SUCCESSFULLY!')
    console.log('='.repeat(60))
    console.log('')
    
    // ENHANCEMENT: Quick UI validation check for upgrades too
    console.log('🔍 Quick UI validation check...')
    const quickValidation = run('node scripts/validate-ui-relations.js',
        'Quick UI compatibility validation',
        true) // Optional - don't fail on warnings
    
    if (quickValidation) {
      log('UI compatibility check: PASSED', 'SUCCESS')
    } else {
      log('UI compatibility check: WARNINGS FOUND', 'WARN')
      log('Review validation output above - may need UI component updates', 'WARN')
    }
    console.log('')
    
    console.log('⚠️  IMPORTANT: Service restart will handle:')
    console.log('   • Database migrations (automatic)')
    console.log('   • Reference data seeding (automatic)')
    console.log('   • Schema updates (automatic)')
    console.log('   • Additional UI validation (automatic)')
    console.log('')
    console.log('🚀 To apply all changes, restart the service:')
    console.log('   npm run service:restart (as Administrator)')
    console.log('')
    console.log('   The service startup automatically runs:')
    console.log('   - npx prisma migrate deploy')
    console.log('   - npm run seed:migration')
    console.log('   - UI compatibility validation')
    console.log('')
  }
}

main().catch(error => {
  console.error('\n❌ FATAL ERROR:', error.message)
  console.log('='.repeat(60))
  process.exit(1)
})
