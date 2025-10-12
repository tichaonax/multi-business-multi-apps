#!/usr/bin/env node

/**
 * After Git Pull Setup Script (SMART AUTO-SETUP)
 *
 * This script runs after git pull and intelligently detects:
 * - FRESH INSTALL: Automatically runs database setup + seeding
 * - EXISTING DEPLOYMENT: Only rebuilds (service handles migrations)
 *
 * Fresh Install Detection (ALL must be true):
 * 1. No dist/service directory (service never built)
 * 2. Database not initialized or doesn't exist
 * 3. No users in database (empty)
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
 * Check if database is initialized (migrations applied)
 * Returns: true if initialized, false if not
 */
async function checkDatabaseInitialized() {
  try {
    log('  Checking database initialization status...', 'INFO')
    const output = execSync('npx prisma migrate status', {
      cwd: ROOT_DIR,
      encoding: 'utf-8',
      stdio: 'pipe'
    })

    // Look for indicators of uninitialized database
    const notInitialized = output.includes('Database schema is not initialized') ||
                          output.includes('never been applied') ||
                          output.includes('No migration found')

    if (notInitialized) {
      log('  ✓ Database: NOT INITIALIZED', 'WARN')
      return false
    }

    log('  ✓ Database: INITIALIZED', 'SUCCESS')
    return true
  } catch (error) {
    // If command fails, assume database doesn't exist or not initialized
    log('  ✓ Database: NOT ACCESSIBLE (likely doesn\'t exist)', 'WARN')
    return false
  }
}

/**
 * Check if database has any users
 * Returns: true if users exist, false if empty or database doesn't exist
 */
async function checkHasUsers() {
  try {
    log('  Checking user count in database...', 'INFO')

    // Dynamically require Prisma to avoid loading it if not generated yet
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
    // Database doesn't exist, Prisma not generated, or users table missing
    log('  ✓ User count: 0 (database empty or not accessible)', 'WARN')
    return false
  }
}

/**
 * Determine if this is a fresh install
 * ALL conditions must be true for fresh install:
 * 1. Service never built (no dist/service)
 * 2. Database not initialized
 * 3. No users in database
 */
async function isFreshInstall() {
  console.log('\n' + '='.repeat(60))
  console.log('🔍 DETECTING INSTALLATION TYPE...')
  console.log('='.repeat(60))

  const serviceExists = checkServiceInstalled()
  log(`  Service directory: ${serviceExists ? 'FOUND' : 'NOT FOUND'}`, serviceExists ? 'SUCCESS' : 'WARN')

  const dbInitialized = await checkDatabaseInitialized()
  const hasUsers = await checkHasUsers()

  // Conservative approach: ALL must indicate fresh install
  const isFresh = !serviceExists && !dbInitialized && !hasUsers

  console.log('\n' + '-'.repeat(60))
  if (isFresh) {
    log('✓ DETECTION RESULT: FRESH INSTALL', 'WARN')
  } else {
    log('✓ DETECTION RESULT: EXISTING DEPLOYMENT', 'SUCCESS')
  }
  console.log('-'.repeat(60) + '\n')

  return isFresh
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

async function main() {
  console.log('\n' + '='.repeat(60))
  console.log('🔄 MULTI-BUSINESS MULTI-APPS - UPDATE WORKFLOW')
  console.log('='.repeat(60) + '\n')

  // Step 1: Install/update dependencies
  run('npm install', 'Installing/updating dependencies', false)

  // Step 2: Regenerate Prisma client
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
    console.log('⚠️  IMPORTANT: Service restart will handle:')
    console.log('   • Database migrations (automatic)')
    console.log('   • Reference data seeding (automatic)')
    console.log('   • Schema updates (automatic)')
    console.log('')
    console.log('🚀 To apply all changes, restart the service:')
    console.log('   npm run service:restart (as Administrator)')
    console.log('')
    console.log('   The service startup automatically runs:')
    console.log('   - npx prisma migrate deploy')
    console.log('   - npm run seed:migration')
    console.log('')
  }
}

main().catch(error => {
  console.error('\n❌ FATAL ERROR:', error.message)
  console.log('='.repeat(60))
  process.exit(1)
})
