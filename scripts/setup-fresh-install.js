#!/usr/bin/env node

/**
 * Fresh Installation Setup Script
 *
 * Runs all necessary steps for setting up the application on a new machine:
 * 1. Install dependencies
 * 2. Generate Prisma client
 * 3. Run database migrations
 * 4. Seed reference data
 * 5. Create admin user
 * 6. Build the application
 */

const { execSync } = require('child_process')
const path = require('path')
const fs = require('fs')

const ROOT_DIR = path.join(__dirname, '..')

function run(command, description) {
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
    return false
  }
}

async function main() {
  console.log('\n' + '='.repeat(60))
  console.log('🚀 MULTI-BUSINESS MULTI-APPS - FRESH INSTALLATION SETUP')
  console.log('='.repeat(60) + '\n')

  // Check if .env exists
  const envPath = path.join(ROOT_DIR, '.env')
  if (!fs.existsSync(envPath)) {
    console.log('⚠️  WARNING: .env file not found!')
    console.log('Please create a .env file with your database credentials.')
    console.log('See SETUP.md for required environment variables.\n')
    process.exit(1)
  }

  const steps = [
    {
      command: 'npm install',
      description: 'Installing dependencies',
      required: true
    },
    {
      command: 'npx prisma generate',
      description: 'Generating Prisma client',
      required: true
    },
    {
      command: 'npx prisma migrate deploy',
      description: 'Running database migrations',
      required: true
    },
    {
      command: 'node scripts/seed-all-employee-data.js',
      description: 'Seeding employee reference data',
      required: false
    },
    {
      command: 'npm run create-admin',
      description: 'Creating admin user',
      required: false
    },
    {
      command: 'npm run build',
      description: 'Building the application',
      required: true
    }
  ]

  let allSucceeded = true

  for (const step of steps) {
    const success = run(step.command, step.description)

    if (!success && step.required) {
      console.error('\n❌ SETUP FAILED: A required step failed.')
      console.error('Please fix the error and run the setup again.\n')
      process.exit(1)
    }

    if (!success && !step.required) {
      console.warn('⚠️  Optional step failed, continuing...\n')
      allSucceeded = false
    }
  }

  console.log('\n' + '='.repeat(60))
  if (allSucceeded) {
    console.log('✅ SETUP COMPLETED SUCCESSFULLY!')
  } else {
    console.log('⚠️  SETUP COMPLETED WITH WARNINGS')
    console.log('Some optional steps failed. Check the output above.')
  }
  console.log('='.repeat(60))
  console.log('\n📖 Next steps:')
  console.log('   1. Start the development server: npm run dev')
  console.log('   2. Access the app at: http://localhost:8080')
  console.log('   3. Login with: admin@business.local / admin123')
  console.log('\n📚 For more information, see SETUP.md\n')
}

main().catch(error => {
  console.error('\n❌ FATAL ERROR:', error.message)
  process.exit(1)
})
