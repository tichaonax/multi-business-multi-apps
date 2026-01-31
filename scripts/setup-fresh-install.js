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

  // For Prisma commands, verify DATABASE_URL is available
  if (command.includes('prisma')) {
    if (process.env.DATABASE_URL) {
      // Mask password in URL for logging
      const maskedUrl = process.env.DATABASE_URL.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@')
      console.log(`🔗 DATABASE_URL: ${maskedUrl}\n`)
    } else {
      console.warn(`⚠️  WARNING: DATABASE_URL is not set! Prisma command may fail.\n`)
    }
  }

  try {
    execSync(command, {
      cwd: ROOT_DIR,
      stdio: 'inherit',
      shell: true,
      env: {
        ...process.env,
        // Explicitly pass DATABASE_URL to ensure Prisma can access it
        DATABASE_URL: process.env.DATABASE_URL
      }
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
    // Try .env.local first, then .env
    require('dotenv').config({ path: path.join(ROOT_DIR, '.env.local') })
    require('dotenv').config({ path: path.join(ROOT_DIR, '.env') })
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

async function main() {
  console.log('\n' + '='.repeat(60))
  console.log('🚀 MULTI-BUSINESS MULTI-APPS - FRESH INSTALLATION SETUP')
  console.log('='.repeat(60) + '\n')

  // Check if .env or .env.local exists
  const envPath = path.join(ROOT_DIR, '.env')
  const envLocalPath = path.join(ROOT_DIR, '.env.local')

  if (!fs.existsSync(envPath) && !fs.existsSync(envLocalPath)) {
    console.log('⚠️  WARNING: No environment file found!')
    console.log('Please create a .env.local or .env file with your database credentials.')
    console.log('See SETUP.md for required environment variables.\n')
    process.exit(1)
  }

  // Load environment variables BEFORE running any steps
  // This ensures DATABASE_URL is available for Prisma commands
  console.log('🔧 Loading environment variables...\n')
  try {
    // Try to load dotenv if it exists (from a previous install)
    const dotenvPath = path.join(ROOT_DIR, 'node_modules', 'dotenv')
    if (fs.existsSync(dotenvPath)) {
      const dotenv = require('dotenv')
      dotenv.config({ path: envLocalPath })
      dotenv.config({ path: envPath })
      console.log(`✅ Environment loaded via dotenv`)
      if (process.env.DATABASE_URL) {
        console.log(`✅ DATABASE_URL is set`)
      } else {
        console.warn(`⚠️  DATABASE_URL not found in environment files`)
      }
    } else {
      // Manually parse .env.local to set DATABASE_URL
      // This is needed when running setup before npm install
      console.log('📦 dotenv not installed yet, manually parsing environment file...')
      const envContent = fs.existsSync(envLocalPath)
        ? fs.readFileSync(envLocalPath, 'utf8')
        : fs.readFileSync(envPath, 'utf8')

      envContent.split('\n').forEach(line => {
        const trimmed = line.trim()
        if (trimmed && !trimmed.startsWith('#')) {
          const equalsIndex = trimmed.indexOf('=')
          if (equalsIndex > 0) {
            const key = trimmed.substring(0, equalsIndex).trim()
            let value = trimmed.substring(equalsIndex + 1).trim()
            // Remove surrounding quotes if present
            if ((value.startsWith('"') && value.endsWith('"')) ||
                (value.startsWith("'") && value.endsWith("'"))) {
              value = value.slice(1, -1)
            }
            if (!process.env[key]) {
              process.env[key] = value
            }
          }
        }
      })

      if (process.env.DATABASE_URL) {
        console.log(`✅ DATABASE_URL manually loaded from environment file`)
      } else {
        console.warn(`⚠️  DATABASE_URL not found in environment files`)
      }
    }
  } catch (error) {
    console.warn(`⚠️  Could not load environment: ${error.message}`)
    console.warn(`   Will try to continue - some steps may fail`)
  }
  console.log('')

  // NOTE: Database checks moved to AFTER npm install and Prisma generation
  // This avoids the "Cannot find module 'dotenv'" error since dependencies
  // aren't installed yet at this point in the script

  // Clean up Prisma cache first to avoid Windows file lock issues
  console.log('🧹 Cleaning Prisma cache to avoid file lock issues...\n')
  const prismaClientPath = path.join(ROOT_DIR, 'node_modules', '.prisma')
  if (fs.existsSync(prismaClientPath)) {
    let cleaned = false
    const maxRetries = 3

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (process.platform === 'win32') {
          // Try multiple cleanup methods for Windows
          try {
            execSync(`rmdir /s /q "${prismaClientPath}"`, { stdio: 'pipe' })
          } catch {
            // If rmdir fails, try del
            execSync(`del /f /s /q "${prismaClientPath}\\*.*"`, { stdio: 'pipe' })
            execSync(`rmdir /s /q "${prismaClientPath}"`, { stdio: 'pipe' })
          }
        } else {
          execSync(`rm -rf "${prismaClientPath}"`, { stdio: 'inherit' })
        }
        console.log('✅ Cleaned .prisma cache\n')
        cleaned = true
        break
      } catch (error) {
        if (attempt === maxRetries) {
          console.warn(`⚠️  Could not clean .prisma cache after ${maxRetries} attempts: ${error.message}\n`)
          console.warn('⚠️  This may cause issues with Prisma client generation\n')
        } else {
          console.log(`⚠️  Cleanup attempt ${attempt} failed, retrying in 2 seconds...\n`)
          // Wait 2 seconds before retry
          execSync('timeout /t 2 /nobreak > nul', { stdio: 'pipe' })
        }
      }
    }

    if (!cleaned) {
      // Last resort: try to remove just the client files
      try {
        const clientPath = path.join(prismaClientPath, 'client')
        if (fs.existsSync(clientPath)) {
          if (process.platform === 'win32') {
            execSync(`rmdir /s /q "${clientPath}"`, { stdio: 'pipe' })
          } else {
            execSync(`rm -rf "${clientPath}"`, { stdio: 'inherit' })
          }
          console.log('✅ Cleaned .prisma/client cache\n')
        }
      } catch (error) {
        console.warn('⚠️  Could not clean .prisma/client either\n')
      }
    }
  }

  // Clean package-lock.json if it exists to avoid lock file conflicts
  console.log('🧹 Cleaning package-lock.json to avoid dependency conflicts...\n')
  const lockFilePath = path.join(ROOT_DIR, 'package-lock.json')
  if (fs.existsSync(lockFilePath)) {
    try {
      fs.unlinkSync(lockFilePath)
      console.log('✅ Removed package-lock.json\n')
    } catch (error) {
      console.warn('⚠️  Could not remove package-lock.json (continuing anyway)\n')
    }
  }

  // Clean node_modules for truly fresh install
  console.log('🧹 Cleaning node_modules for fresh installation...\n')
  const nodeModulesPath = path.join(ROOT_DIR, 'node_modules')
  if (fs.existsSync(nodeModulesPath)) {
    try {
      console.log('   This may take a minute...')
      if (process.platform === 'win32') {
        execSync(`rmdir /s /q "${nodeModulesPath}"`, { stdio: 'inherit' })
      } else {
        execSync(`rm -rf "${nodeModulesPath}"`, { stdio: 'inherit' })
      }
      console.log('✅ Removed node_modules\n')
    } catch (error) {
      console.warn('⚠️  Could not remove node_modules (continuing anyway)\n')
    }
  }

  const steps = [
    {
      command: 'npm install --legacy-peer-deps',
      description: 'Installing dependencies',
      required: true
    },
    {
      command: 'node scripts/prisma-generate-safe.js',
      description: 'Generating Prisma client (with retry logic)',
      required: true
    },
    {
      command: 'node scripts/check-and-setup-database.js',
      description: 'Checking database state and creating if needed',
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
      command: 'node scripts/seed-migration-data.js',
      description: 'Seeding reference data (ID templates, job titles, expense categories, admin user)',
      required: true
    },
    {
      command: 'npm run create-admin',
      description: 'Creating admin user',
      required: false
    },
    {
      command: process.platform === 'win32' ? 'if exist .next rmdir /s /q .next' : 'rm -rf .next',
      description: 'Cleaning Next.js build cache before first build',
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
  console.log('   For Development:')
  console.log('     1. Start the dev server: npm run dev')
  console.log('     2. Access the app at: http://localhost:8080')
  console.log('     3. Login with: admin@business.local / admin123')
  console.log('')
  console.log('   For Production (Windows Service):')
  console.log('     1. Install service (as Administrator): npm run service:install')
  console.log('     2. Start service (as Administrator): npm run service:start')
  console.log('     3. Access the app at: http://localhost:8080')
  console.log('     4. Login with: admin@business.local / admin123')
  console.log('\n📚 For more information, see SETUP.md\n')
}

main().catch(error => {
  console.error('\n❌ FATAL ERROR:', error.message)
  process.exit(1)
})
