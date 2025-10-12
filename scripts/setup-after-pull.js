#!/usr/bin/env node

/**
 * After Git Pull Setup Script (SIMPLIFIED)
 *
 * This script runs after git pull and only handles:
 * 1. Install/update dependencies
 * 2. Regenerate Prisma client
 * 3. Rebuild the application
 * 4. Rebuild Windows service
 *
 * Database migrations and seeding are handled by the service startup
 * (see scripts/sync-service-start.js lines 127-135)
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

  // Check if service is installed
  const serviceInstalled = checkServiceInstalled()

  console.log('\n' + '='.repeat(60))
  console.log('✅ UPDATE COMPLETED SUCCESSFULLY!')
  console.log('='.repeat(60))

  if (serviceInstalled) {
    console.log('\n⚠️  IMPORTANT: Service restart will handle:')
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
  } else {
    console.log('\n📖 Next steps:')
    console.log('   1. Install the Windows service:')
    console.log('      npm run service:install (as Administrator)')
    console.log('   2. Start the service:')
    console.log('      npm run service:start (as Administrator)')
  }
  console.log('\n')
}

main().catch(error => {
  console.error('\n❌ FATAL ERROR:', error.message)
  console.log('='.repeat(60))
  process.exit(1)
})
