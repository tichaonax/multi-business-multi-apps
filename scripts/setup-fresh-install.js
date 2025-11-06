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

async function checkDatabaseEmpty() {
  try {
    const { PrismaClient } = require('@prisma/client')
    const prisma = new PrismaClient()

    try {
      // Try to query a table - if it exists, database is not empty
      const result = await prisma.$queryRaw`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name = 'users'
        ) as table_exists;
      `

      await prisma.$disconnect()

      if (result[0]?.table_exists) {
        return false // Database has tables
      }
      return true // Database is empty
    } catch (error) {
      await prisma.$disconnect()
      return true // Assume empty if query fails
    }
  } catch (error) {
    return true // Assume empty if Prisma client not generated yet
  }
}

async function createDatabaseIfNeeded() {
  try {
    // Extract database info from DATABASE_URL
    require('dotenv').config()
    const databaseUrl = process.env.DATABASE_URL
    
    if (!databaseUrl) {
      throw new Error('DATABASE_URL not found in environment variables')
    }

    // Parse the database URL
    const url = new URL(databaseUrl)
    const dbName = url.pathname.slice(1) // Remove leading '/'
    const host = url.hostname
    const port = url.port || 5432
    const username = url.username
    const password = url.password

    // Create connection to postgres (default) database to create target database
    const { Client } = require('pg')
    const adminClient = new Client({
      host,
      port,
      user: username,
      password,
      database: 'postgres' // Connect to default postgres database
    })

    try {
      await adminClient.connect()
      
      // Check if database exists
      const result = await adminClient.query(
        'SELECT 1 FROM pg_database WHERE datname = $1',
        [dbName]
      )

      if (result.rows.length === 0) {
        console.log(`📦 Creating database '${dbName}'...`)
        await adminClient.query(`CREATE DATABASE "${dbName}"`)
        console.log(`✅ Database '${dbName}' created successfully\n`)
      } else {
        console.log(`✅ Database '${dbName}' already exists\n`)
      }
    } finally {
      await adminClient.end()
    }

    return true
  } catch (error) {
    console.error('❌ Failed to create database:', error.message)
    console.error('\nPlease ensure:')
    console.error('1. PostgreSQL is running')
    console.error('2. Database credentials in .env are correct')
    console.error('3. PostgreSQL user has CREATE DATABASE privileges\n')
    return false
  }
}

async function checkAdminPrivileges() {
  try {
    const wincmd = require('node-windows')
    return new Promise((resolve) => {
      wincmd.isAdminUser((isAdmin) => {
        resolve(isAdmin)
      })
    })
  } catch (error) {
    // If node-windows is not available, assume not admin
    console.warn('⚠️  Could not check admin privileges:', error.message)
    return false
  }
}

async function main() {
  console.log('\n' + '='.repeat(60))
  console.log('🚀 MULTI-BUSINESS MULTI-APPS - FRESH INSTALLATION SETUP')
  console.log('='.repeat(60) + '\n')

  // Check admin privileges for service installation
  console.log('🔐 Checking administrator privileges...\n')
  const isAdmin = await checkAdminPrivileges()

  if (!isAdmin) {
    console.log('❌ Administrator privileges required!')
    console.log('')
    console.log('This setup script installs a Windows service, which requires admin rights.')
    console.log('')
    console.log('To fix this:')
    console.log('  1. Close this terminal')
    console.log('  2. Open PowerShell as Administrator:')
    console.log('     - Right-click Start button')
    console.log('     - Select "Windows PowerShell (Admin)" or "Terminal (Admin)"')
    console.log('  3. Navigate to project directory:')
    console.log(`     cd "${process.cwd()}"`)
    console.log('  4. Run setup again:')
    console.log('     npm run setup')
    console.log('')
    process.exit(1)
  }

  console.log('✅ Administrator privileges confirmed\n')

  // Check if .env exists
  const envPath = path.join(ROOT_DIR, '.env')
  if (!fs.existsSync(envPath)) {
    console.log('⚠️  WARNING: .env file not found!')
    console.log('Please create a .env file with your database credentials.')
    console.log('See SETUP.md for required environment variables.\n')
    process.exit(1)
  }

  // Safety check: Verify this is a fresh installation
  console.log('🔍 Checking if this is a fresh installation...\n')

  const isEmpty = await checkDatabaseEmpty()

  if (!isEmpty) {
    console.log('⚠️  DATABASE NOT EMPTY!')
    console.log('This script is for fresh installations only.')
    console.log('The database already contains tables.\n')
    console.log('If you pulled code updates, use instead:')
    console.log('  npm run setup:update\n')
    console.log('To force fresh installation (⚠️  DELETES ALL DATA):')
    console.log('  npx prisma migrate reset')
    console.log('  npm run setup\n')
    process.exit(1)
  }

  console.log('✅ Database is empty - proceeding with fresh installation\n')

  // Create database if it doesn't exist
  console.log('🗄️  Ensuring database exists...\n')
  const dbCreated = await createDatabaseIfNeeded()
  if (!dbCreated) {
    console.error('❌ Database creation failed. Cannot proceed with installation.\n')
    process.exit(1)
  }

  // Clean up Prisma cache first to avoid Windows file lock issues
  console.log('🧹 Cleaning Prisma cache to avoid file lock issues...\n')
  const prismaClientPath = path.join(ROOT_DIR, 'node_modules', '.prisma')
  if (fs.existsSync(prismaClientPath)) {
    try {
      if (process.platform === 'win32') {
        execSync(`rmdir /s /q "${prismaClientPath}"`, { stdio: 'inherit' })
      } else {
        execSync(`rm -rf "${prismaClientPath}"`, { stdio: 'inherit' })
      }
      console.log('✅ Cleaned .prisma cache\n')
    } catch (error) {
      console.warn('⚠️  Could not clean .prisma cache (continuing anyway)\n')
    }
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
      description: 'Creating database and applying migrations',
      required: true
    },
    {
      command: 'node scripts/seed-all-employee-data.js',
      description: 'Seeding employee reference data',
      required: false
    },
    {
      command: 'node scripts/seed-type-categories.js',
      description: 'Seeding business type categories (20 categories, 59 subcategories)',
      required: true
    },
    {
      command: 'node scripts/setup-project-management-schema.js',
      description: 'Seeding project types (13 types across 3 business types)',
      required: true
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
    },
    {
      command: 'npm run build:service',
      description: 'Building the Windows service',
      required: true
    },
    {
      command: 'npm run service:install',
      description: 'Installing the Windows service',
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
  console.log('\n📖 For Development:')
  console.log('   Start the dev server: npm run dev')
  console.log('   Access the app at: http://localhost:8080')
  console.log('   Login with: admin@business.local / admin123')
  console.log('')
  console.log('📖 For Production:')
  console.log('   The Windows service is now installed.')
  console.log('   See the service installation output above for next steps.')
  console.log('')
  console.log('📚 For more information, see SETUP.md\n')
}

main().catch(error => {
  console.error('\n❌ FATAL ERROR:', error.message)
  process.exit(1)
})
