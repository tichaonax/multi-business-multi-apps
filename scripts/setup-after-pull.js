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

async function checkServiceInstalled() {
  try {
    const { spawnSync } = require('child_process')
    const SERVICE_NAME = 'multibusinesssyncservice.exe'
    const SC = 'sc.exe'

    const queryResult = spawnSync(SC, ['query', SERVICE_NAME], {
      encoding: 'utf-8',
      windowsHide: true
    })

    const output = queryResult.stdout || ''
    
    // Service exists if we don't get "does not exist" error
    if (output.includes('does not exist') || output.includes('1060')) {
      return false
    }
    
    // If we get any other response, service is installed
    return true
  } catch {
    return false
  }
}

// ============================================================================
// FRESH INSTALL DETECTION FUNCTIONS
// ============================================================================

/**
 * Clear Prisma client from Node.js require cache
 * This ensures we get a freshly generated client after npx prisma generate
 */
function clearPrismaRequireCache() {
  try {
    // Clear all .prisma and @prisma modules from cache
    Object.keys(require.cache).forEach(key => {
      if (key.includes('.prisma') || key.includes('@prisma')) {
        delete require.cache[key]
      }
    })
    log('  Cleared Prisma require cache', 'INFO')
  } catch (err) {
    // Ignore cache clearing errors
  }
}

/**
 * Check database using pg client directly (fallback method)
 * This doesn't depend on Prisma client state
 */
async function checkDatabaseWithPg() {
  try {
    // Load dotenv to ensure DATABASE_URL is available
    require('dotenv').config({ path: path.join(ROOT_DIR, '.env.local') })
    require('dotenv').config({ path: path.join(ROOT_DIR, '.env') })

    const databaseUrl = process.env.DATABASE_URL
    if (!databaseUrl) {
      log('  DATABASE_URL not found', 'WARN')
      return false
    }

    const { Client } = require('pg')
    const client = new Client({ connectionString: databaseUrl })

    await client.connect()
    await client.query('SELECT 1')
    await client.end()

    return true
  } catch (error) {
    const errorMsg = error.message || String(error)
    if (errorMsg.includes('does not exist') || error.code === '3D000') {
      log('  Database does not exist (pg check)', 'WARN')
    } else {
      log(`  Database check failed (pg): ${errorMsg}`, 'WARN')
    }
    return false
  }
}

/**
 * Check if database exists and is accessible
 * Returns: true if exists and accessible, false if not
 * Uses retry logic and multiple check methods for reliability
 */
async function checkDatabaseExists() {
  const MAX_RETRIES = 3
  const RETRY_DELAY_MS = 2000

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      log(`  Checking if database exists... (attempt ${attempt}/${MAX_RETRIES})`, 'INFO')

      // Clear Prisma require cache before each attempt
      // This ensures we get the freshly generated client after build
      clearPrismaRequireCache()

      // Try to connect to database using Prisma
      const { PrismaClient } = require('@prisma/client')
      const prisma = new PrismaClient()

      // Try a simple query to verify database connection
      await prisma.$queryRaw`SELECT 1`
      await prisma.$disconnect()

      log('  ✓ Database: EXISTS and ACCESSIBLE', 'SUCCESS')
      return true
    } catch (error) {
      const errorMsg = error.message || String(error)
      const errorCode = error.code || 'UNKNOWN'

      // Log the actual error for debugging
      log(`  Database check error (attempt ${attempt}): [${errorCode}] ${errorMsg}`, 'WARN')

      // Database doesn't exist or cannot connect - these are definitive failures
      if (errorMsg.includes('does not exist') ||
          errorMsg.includes('Unknown database') ||
          errorMsg.includes('ECONNREFUSED') ||
          errorCode === 'P1003' || // Database doesn't exist
          errorCode === 'P1001') { // Can't reach database server
        log('  ✓ Database: DOES NOT EXIST', 'WARN')
        return false
      }

      // For other errors, retry with delay
      if (attempt < MAX_RETRIES) {
        log(`  Retrying in ${RETRY_DELAY_MS}ms...`, 'INFO')
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS))
      }
    }
  }

  // Prisma checks failed - try fallback with pg client directly
  log('  Prisma checks failed, trying direct pg connection...', 'INFO')
  const pgResult = await checkDatabaseWithPg()

  if (pgResult) {
    log('  ✓ Database: EXISTS and ACCESSIBLE (confirmed via pg)', 'SUCCESS')
    return true
  }

  log('  ✓ Database: NOT ACCESSIBLE (all checks failed)', 'WARN')
  return false
}

/**
 * Check if database has any users
 * Only called if database exists
 * Returns: true if users exist, false if empty
 */
async function checkHasUsers() {
  try {
    log('  Checking user count in database...', 'INFO')

    // Clear cache to ensure fresh Prisma client
    clearPrismaRequireCache()

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
    const errorMsg = error.message || String(error)
    // Table doesn't exist or other error - treat as empty
    log(`  ✓ User count: 0 (error: ${errorMsg})`, 'WARN')
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
 * Stop Windows service using the proper stop script and wait for completion
 */
async function stopWindowsServiceAndCleanup() {
  const { spawn } = require('child_process')
  
  try {
    log('Stopping Windows service using proper stop script...', 'INFO')
    
    // Use the proper sync-service-stop.js script which has correct wait logic
    const stopProcess = spawn('node', ['scripts/sync-service-stop.js'], {
      cwd: ROOT_DIR,
      stdio: 'inherit'
    })
    
    // Wait for the stop script to complete
    const stopResult = await new Promise((resolve, reject) => {
      stopProcess.on('close', (code) => {
        if (code === 0) {
          resolve(true)
        } else {
          reject(new Error(`Service stop script exited with code ${code}`))
        }
      })
      
      stopProcess.on('error', (error) => {
        reject(error)
      })
      
      // Timeout after 45 seconds
      setTimeout(() => {
        stopProcess.kill('SIGTERM')
        reject(new Error('Service stop script timed out'))
      }, 45000)
    })
    
    if (stopResult) {
      log('✅ Service stopped successfully', 'SUCCESS')
      // Additional cleanup after service stops
      killStaleNodeProcesses()
      cleanupPrismaTemp()
      return true
    }
    
    return false
    
  } catch (error) {
    log(`Warning: Service stop failed - ${error.message}`, 'WARN')
    log('Attempting basic cleanup anyway...', 'INFO')
    killStaleNodeProcesses()
    cleanupPrismaTemp()
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

/**
 * Check if service files have changed and rebuild is needed
 */
async function checkServiceNeedsRebuild() {
  try {
    // Service-related paths that require rebuild
    const serviceFiles = [
      'src/lib/sync/',
      'service/',
      'windows-service/',
      'tsconfig.service.json',
      'scripts/build-service.js'
    ]
    
    // Check if dist folder exists - if not, definitely need rebuild
    const distPath = path.join(ROOT_DIR, 'dist', 'service')
    if (!fs.existsSync(distPath)) {
      log('Service dist folder missing - rebuild required', 'INFO')
      return true
    }
    
    // If this is a git pull scenario, check what files changed
    try {
      const { execSync } = require('child_process')
      
      // Get list of files changed in last commit
      const changedFiles = execSync('git diff --name-only HEAD~1 HEAD', { 
        encoding: 'utf8',
        cwd: ROOT_DIR
      }).trim().split('\n').filter(f => f)
      
      const serviceFilesChanged = changedFiles.some(file => 
        serviceFiles.some(serviceDir => file.startsWith(serviceDir))
      )
      
      if (serviceFilesChanged) {
        log('Service-related files changed - rebuild required', 'INFO')
        log(`Changed files affecting service: ${changedFiles.filter(f => 
          serviceFiles.some(sd => f.startsWith(sd))
        ).join(', ')}`, 'INFO')
        return true
      }
      
      log('No service files changed in recent commits', 'INFO')
      return false
      
    } catch (gitError) {
      // If git commands fail, play it safe and rebuild
      log('Cannot determine file changes - rebuilding service to be safe', 'WARN')
      return true
    }
    
  } catch (error) {
    log(`Error checking service rebuild need: ${error.message}`, 'WARN')
    // If we can't determine, rebuild to be safe
    return true
  }
}

async function main() {
  console.log('\n' + '='.repeat(60))
  console.log('🚀 MULTI-BUSINESS MULTI-APPS - SMART SETUP')
  console.log('='.repeat(60) + '\n')

  // CRITICAL: Stop Windows service and cleanup BEFORE Prisma operations to prevent EPERM
  await stopWindowsServiceAndCleanup()

  // Step 1: Backup schema to prevent accidental modifications
  run('node scripts/schema-protector.js backup', 'Creating schema backup', false)

  // Step 2: Install/update dependencies
  run('npm install --legacy-peer-deps', 'Installing/updating dependencies', false)

  // Step 3: Regenerate Prisma client (schema should not be modified during deployment)
  run('npx prisma generate', 'Regenerating Prisma client', false)

  // Step 4: Rebuild the application
  run('npm run build', 'Rebuilding the application', false)

  // Step 5: Check if service rebuild is needed and handle reinstall if needed
  const serviceNeedsRebuild = await checkServiceNeedsRebuild()
  let serviceNeedsInstall = false

  if (serviceNeedsRebuild) {
    console.log('🔧 Service files changed - handling service reinstall...')

    // Check if service is currently installed
    const serviceInstalled = await checkServiceInstalled()
    if (serviceInstalled) {
      console.log('🗑️  Uninstalling existing service before rebuild...')
      run('npm run service:uninstall', 'Uninstalling existing service', true) // Optional - continue if fails
      serviceNeedsInstall = true // Mark that we need to reinstall
    }

    // Rebuild the service
    run('npm run build:service', 'Rebuilding Windows sync service', false)

    // Reinstall the service if it was previously installed
    if (serviceNeedsInstall) {
      console.log('')
      console.log('🔧 Reinstalling Windows service...')
      const installSuccess = run('npm run service:install', 'Reinstalling Windows service', true) // Optional - continue if fails

      if (installSuccess) {
        console.log('✅ Service reinstalled successfully!')
      } else {
        console.log('')
        console.log('⚠️  SERVICE INSTALLATION FAILED:')
        console.log('   Service was rebuilt but installation failed.')
        console.log('   You must manually install the service:')
        console.log('   Run (as Administrator): npm run service:install')
        console.log('')
      }
    }
  } else {
    console.log('ℹ️  Service rebuild not needed - no service files changed')
  }

  // Step 6: Smart detection - fresh install vs upgrade
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

    // NOTE: UI validation will run automatically after migrations complete during service startup
    console.log('🔍 UI validation will run after service starts and migrations complete...')

    console.log('⚠️  IMPORTANT: Service startup will handle:')
    console.log('   • Database migrations (automatic)')
    console.log('   • Reference data seeding (automatic)')
    console.log('   • Schema updates (automatic)')
    console.log('   • UI relations validation AFTER migrations (automatic)')
    console.log('')

    // Show appropriate next step based on whether service was reinstalled
    if (serviceNeedsInstall) {
      console.log('🚀 To apply all changes, START the service:')
      console.log('   npm run service:start (as Administrator)')
      console.log('')
      console.log('   Note: Service was reinstalled due to service file changes.')
    } else {
      console.log('🚀 To apply all changes, RESTART the service:')
      console.log('   npm run service:restart (as Administrator)')
    }
    console.log('')
    console.log('   The service startup automatically runs:')
    console.log('   - npx prisma migrate deploy')
    console.log('   - npm run seed:migration')
    console.log('   - UI compatibility validation (AFTER migrations)')
    console.log('')
  }

  // Final step: Validate schema wasn't modified during deployment
  console.log('\n🛡️  Validating schema integrity...')
  try {
    run('node scripts/schema-protector.js validate', 'Validating schema unchanged', false)
    console.log('✅ Schema integrity verified - no unwanted modifications')
  } catch (error) {
    console.log('⚠️  Schema was modified during deployment!')
    console.log('   This might indicate a deployment script issue.')
    console.log('   Use: node scripts/schema-protector.js diff')
    console.log('   To restore: node scripts/schema-protector.js restore')
  }

  // Explicitly exit to return prompt
  process.exit(0)
}

main().catch(error => {
  console.error('\n❌ FATAL ERROR:', error.message)
  console.log('='.repeat(60))
  process.exit(1)
})
