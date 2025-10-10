#!/usr/bin/env node

/**
 * After Git Pull Setup Script
 *
 * Runs all necessary steps after pulling code updates from Git:
 * 1. Install/update dependencies
 * 2. Regenerate Prisma client
 * 3. Run new database migrations
 * 4. Rebuild the application
 * 5. Rebuild and reinstall Windows service (if applicable)
 */

const { execSync } = require('child_process')
const path = require('path')
const fs = require('fs')

const ROOT_DIR = path.join(__dirname, '..')

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
      process.exit(1)
    }

    return false
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
  console.log('🔄 MULTI-BUSINESS MULTI-APPS - UPDATE AFTER GIT PULL')
  console.log('='.repeat(60) + '\n')

  const steps = [
    {
      command: 'npm install',
      description: 'Installing/updating dependencies',
      optional: false
    },
    {
      command: 'npx prisma generate',
      description: 'Regenerating Prisma client (CRITICAL)',
      optional: false
    },
    {
      command: 'npx prisma migrate deploy',
      description: 'Running database migrations',
      optional: false
    },
    {
      command: 'npm run build',
      description: 'Rebuilding the application',
      optional: false
    }
  ]

  for (const step of steps) {
    run(step.command, step.description, step.optional)
  }

  // Optional: Rebuild Windows service if it exists
  const serviceExists = checkServiceExists()

  if (serviceExists) {
    console.log('\n' + '='.repeat(60))
    console.log('🔧 Windows Service Detected')
    console.log('='.repeat(60))
    console.log('Rebuilding and reinstalling the sync service...\n')

    run('npm run build:service', 'Rebuilding Windows sync service', true)

    console.log('\n⚠️  To reinstall the service, run as Administrator:')
    console.log('   npm run service:install\n')
  }

  console.log('\n' + '='.repeat(60))
  console.log('✅ UPDATE COMPLETED SUCCESSFULLY!')
  console.log('='.repeat(60))
  console.log('\n📖 Next steps:')
  console.log('   1. Restart the development server if running')
  console.log('   2. If using Windows service, reinstall it:')
  console.log('      npm run service:install (as Administrator)')
  console.log('\n📚 For more information, see SETUP.md\n')
}

main().catch(error => {
  console.error('\n❌ FATAL ERROR:', error.message)
  process.exit(1)
})
