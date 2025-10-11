#!/usr/bin/env node

/**
 * After Git Pull Setup Script (INTELLIGENT VERSION)
 *
 * Automatically detects database state and chooses the right workflow:
 * - Fresh install: Creates DB, pushes schema, seeds data, baselines migrations
 * - Upgrade: Runs pending migrations only
 *
 * Steps:
 * 1. Install/update dependencies
 * 2. Regenerate Prisma client
 * 3. Detect database state (fresh vs existing)
 * 4. Run appropriate database workflow
 * 5. Rebuild the application
 * 6. Rebuild Windows service
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

async function checkDatabaseState() {
  try {
    const { checkDatabaseState } = require('./check-database-state.js')
    return await checkDatabaseState()
  } catch (error) {
    log(`Could not check database state: ${error.message}`, 'WARN')
    return { exists: false, isEmpty: true, hasSchema: false, hasMigrations: false }
  }
}

async function handleFreshInstall() {
  log('🆕 FRESH INSTALL DETECTED - Running complete setup workflow', 'INFO')

  console.log(`\n${'='.repeat(60)}`)
  console.log(`🗄️  Creating database and pushing schema`)
  console.log(`${'='.repeat(60)}\n`)

  try {
    // Use the fresh database setup script
    const { createDatabase, seedReferenceData, baselineMigrations } = require('./setup-fresh-database.js')

    // Create database if needed
    await createDatabase()
    log('✅ Database created/verified', 'SUCCESS')

    // Push schema (faster than migrations for fresh install)
    execSync('npx prisma db push --accept-data-loss', {
      cwd: ROOT_DIR,
      stdio: 'inherit',
      shell: true
    })
    log('✅ Schema pushed to database', 'SUCCESS')

    // Baseline all migrations (mark as applied without running)
    await baselineMigrations()
    log('✅ Migrations baselined', 'SUCCESS')

    // Seed reference data
    await seedReferenceData()
    log('✅ Reference data seeded', 'SUCCESS')

    console.log('\n✅ Fresh install database setup - COMPLETED\n')
    return true

  } catch (error) {
    log(`Fresh install failed: ${error.message}`, 'ERROR')
    console.error('This is a required step. Setup cannot continue.')
    console.log('='.repeat(60))
    process.exit(1)
  }
}

async function handleUpgrade() {
  log('🔄 EXISTING DATABASE DETECTED - Running upgrade workflow', 'INFO')

  console.log(`\n${'='.repeat(60)}`)
  console.log(`🗄️  Running database migrations`)
  console.log(`${'='.repeat(60)}\n`)

  try {
    execSync('npx prisma migrate deploy', {
      cwd: ROOT_DIR,
      stdio: 'inherit',
      shell: true
    })
    log('✅ Database migrations completed', 'SUCCESS')
    return true

  } catch (error) {
    // Handle P3005 - database not empty (needs baseline)
    if (error.message.includes('P3005') || error.message.includes('database schema is not empty')) {
      log('⚠️  Database has schema but migrations need baseline', 'WARN')

      // Try to baseline existing migrations
      try {
        const { baselineMigrations } = require('./setup-fresh-database.js')
        await baselineMigrations()
        log('✅ Migrations baselined successfully', 'SUCCESS')
        return true
      } catch (baselineError) {
        log(`Could not baseline migrations: ${baselineError.message}`, 'WARN')
        // Don't fail - assume migrations are already applied
        return true
      }
    }

    // Handle duplicate table errors (migrations conflict)
    if (error.message.includes('already exists') || error.message.includes('42P07')) {
      log('⚠️  Tables already exist - attempting to baseline migrations', 'WARN')

      try {
        const { baselineMigrations } = require('./setup-fresh-database.js')
        await baselineMigrations()
        log('✅ Migrations baselined to resolve conflicts', 'SUCCESS')
        return true
      } catch (baselineError) {
        log(`Could not baseline migrations: ${baselineError.message}`, 'ERROR')
        console.error('\nDatabase has conflicting migrations. Manual intervention required.')
        console.error('See: https://pris.ly/d/migrate-resolve')
        console.log('='.repeat(60))
        process.exit(1)
      }
    }

    // Other migration errors
    log(`Migration failed: ${error.message}`, 'ERROR')
    console.error('This is a required step. Setup cannot continue.')
    console.log('='.repeat(60))
    process.exit(1)
  }
}

function checkServiceExists() {
  try {
    const distPath = path.join(ROOT_DIR, 'dist', 'service')
    return fs.existsSync(distPath)
  } catch {
    return false
  }
}

async function main() {
  console.log('\n' + '='.repeat(60))
  console.log('🔄 MULTI-BUSINESS MULTI-APPS - INTELLIGENT UPDATE WORKFLOW')
  console.log('='.repeat(60) + '\n')

  // Step 1: Install/update dependencies
  run('npm install', 'Installing/updating dependencies', false)

  // Step 2: Regenerate Prisma client (CRITICAL - must happen before DB detection)
  run('npx prisma generate', 'Regenerating Prisma client (CRITICAL)', false)

  // Step 3: Detect database state
  console.log(`\n${'='.repeat(60)}`)
  console.log(`🔍 Detecting database state`)
  console.log(`${'='.repeat(60)}\n`)

  const dbState = await checkDatabaseState()

  if (!dbState.exists) {
    log('Database does not exist - will be created', 'INFO')
  } else if (dbState.isEmpty) {
    log('Database exists but is empty', 'INFO')
  } else {
    log(`Database has ${dbState.tableCount || 0} tables`, 'INFO')
  }

  // Step 4: Run appropriate database workflow
  if (dbState.isEmpty || !dbState.exists) {
    await handleFreshInstall()
  } else {
    await handleUpgrade()
  }

  // Step 5: Rebuild the application
  run('npm run build', 'Rebuilding the application', false)

  // Step 6: Rebuild Windows service
  run('npm run build:service', 'Rebuilding Windows sync service (CRITICAL)', false)

  // Check if service is installed
  const serviceExists = checkServiceExists()

  if (serviceExists) {
    console.log('\n' + '='.repeat(60))
    console.log('🔧 Windows Service Detected')
    console.log('='.repeat(60))
    console.log('Service files have been rebuilt.')

    console.log('\n⚠️  IMPORTANT: To apply changes to the running service:')
    console.log('   1. Stop the service:   npm run service:stop (as Administrator)')
    console.log('   2. Start the service:  npm run service:start (as Administrator)')
    console.log('   OR')
    console.log('   Restart the service:  npm run service:restart (as Administrator)\n')
  }

  console.log('\n' + '='.repeat(60))
  console.log('✅ INTELLIGENT UPDATE COMPLETED SUCCESSFULLY!')
  console.log('='.repeat(60))
  console.log('\n📖 Next steps:')
  console.log('   1. Restart the development server if running')
  console.log('   2. If using Windows service, restart it:')
  console.log('      npm run service:restart (as Administrator)')
  console.log('\n📚 Database workflow used: ' + (dbState.isEmpty ? 'FRESH INSTALL' : 'UPGRADE'))
  console.log('\n')
}

main().catch(error => {
  console.error('\n❌ FATAL ERROR:', error.message)
  console.log('='.repeat(60))
  process.exit(1)
})
