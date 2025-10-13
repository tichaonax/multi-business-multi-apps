#!/usr/bin/env node

/**
 * Production Upgrade Script
 * 
 * This script safely upgrades an existing production database to the new schema
 * while preserving all existing data.
 * 
 * IMPORTANT: This handles the baseline migration issue by:
 * 1. Backing up existing data
 * 2. Applying schema changes safely
 * 3. Seeding missing reference data
 * 4. Validating the upgrade
 */

const { PrismaClient } = require('@prisma/client')
const { exec } = require('child_process')
const { promisify } = require('util')
const fs = require('fs')
const path = require('path')

const execAsync = promisify(exec)
const prisma = new PrismaClient()

// Console colors
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
}

function log(message, color = colors.cyan) {
  console.log(`${color}${message}${colors.reset}`)
}

function success(message) {
  log(`✅ ${message}`, colors.green)
}

function warning(message) {
  log(`⚠️ ${message}`, colors.yellow)
}

function error(message) {
  log(`❌ ${message}`, colors.red)
}

async function runCommand(command, description) {
  log(`🔄 ${description}...`)
  try {
    const { stdout, stderr } = await execAsync(command, {
      cwd: process.cwd(),
      env: { ...process.env }
    })

    if (stdout) console.log(stdout)
    if (stderr) console.error(stderr)

    success(`${description} completed`)
    return { success: true, stdout, stderr }
  } catch (err) {
    error(`${description} failed: ${err.message}`)
    return { success: false, error: err }
  }
}

async function checkDatabaseConnection() {
  try {
    await prisma.$connect()
    success('Database connection established')
    return true
  } catch (err) {
    error('Database connection failed: ' + err.message)
    return false
  }
}

async function createBackup() {
  log('\n📦 Creating database backup...')
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
  const backupDir = path.join(process.cwd(), 'backups')
  
  // Ensure backup directory exists
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true })
  }
  
  const backupFile = path.join(backupDir, `pre-upgrade-backup-${timestamp}.sql`)
  
  // Get database connection details from environment
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    error('DATABASE_URL not found in environment')
    return null
  }
  
  // Parse database URL to extract connection details
  const url = new URL(databaseUrl)
  const dbHost = url.hostname
  const dbPort = url.port || 5432
  const dbName = url.pathname.slice(1)
  const dbUser = url.username
  const dbPassword = url.password
  
  // Create pg_dump command
  const pgDumpCommand = `pg_dump -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} -f "${backupFile}" --verbose`
  
  // Set PGPASSWORD environment variable for pg_dump
  const env = { ...process.env, PGPASSWORD: dbPassword }
  
  try {
    await execAsync(pgDumpCommand, { env })
    success(`Database backup created: ${backupFile}`)
    return backupFile
  } catch (err) {
    error(`Backup failed: ${err.message}`)
    warning('Continuing without backup - PROCEED WITH CAUTION!')
    return null
  }
}

async function checkSchemaCompatibility() {
  log('\n🔍 Checking schema compatibility...')
  
  try {
    // Check if critical tables exist
    const criticalTables = [
      'users', 'businesses', 'employees', 'business_memberships'
    ]
    
    for (const table of criticalTables) {
      try {
        await prisma.$queryRaw`SELECT 1 FROM ${table} LIMIT 1`
        success(`Found table: ${table}`)
      } catch (err) {
        error(`Missing critical table: ${table}`)
        return false
      }
    }
    
    // Check for data that needs migration
    const userCount = await prisma.users.count()
    const businessCount = await prisma.businesses.count()
    const employeeCount = await prisma.employees.count()
    
    log(`\nExisting data found:`)
    log(`  - Users: ${userCount}`)
    log(`  - Businesses: ${businessCount}`)
    log(`  - Employees: ${employeeCount}`)
    
    if (userCount === 0 && businessCount === 0 && employeeCount === 0) {
      warning('No existing data found - this appears to be a fresh database')
      return 'fresh'
    }
    
    return 'existing'
  } catch (err) {
    error(`Schema compatibility check failed: ${err.message}`)
    return false
  }
}

async function resolveBaselineMigration() {
  log('\n🔧 Resolving baseline migration...')
  
  try {
    // Check migration status
    const migrationStatus = await runCommand('npx prisma migrate status', 'Checking migration status')
    
    if (migrationStatus.stdout && migrationStatus.stdout.includes('baseline')) {
      log('Baseline migration detected - resolving...')
      
      // Mark the baseline migration as applied without running it
      const resolveResult = await runCommand(
        'npx prisma migrate resolve --applied 20250112000000_baseline',
        'Resolving baseline migration'
      )
      
      if (!resolveResult.success) {
        error('Failed to resolve baseline migration')
        return false
      }
      
      success('Baseline migration resolved')
    }
    
    // Apply any pending migrations
    const deployResult = await runCommand('npx prisma migrate deploy', 'Applying migrations')
    return deployResult.success
    
  } catch (err) {
    error(`Migration resolution failed: ${err.message}`)
    return false
  }
}

async function seedMissingReferenceData() {
  log('\n🌱 Seeding missing reference data...')
  
  try {
    // Check what reference data already exists
    const compensationCount = await prisma.compensationTypes.count()
    const jobTitleCount = await prisma.jobTitles.count()
    const benefitCount = await prisma.benefitTypes.count()
    
    log(`Current reference data:`)
    log(`  - Compensation types: ${compensationCount}`)
    log(`  - Job titles: ${jobTitleCount}`)
    log(`  - Benefit types: ${benefitCount}`)
    
    // Only seed if data is missing
    if (compensationCount === 0 || jobTitleCount === 0 || benefitCount === 0) {
      warning('Missing reference data detected - running production seeding...')
      
      const seedResult = await runCommand('npm run setup:production', 'Seeding reference data')
      if (!seedResult.success) {
        error('Reference data seeding failed')
        return false
      }
    } else {
      success('Reference data already present')
    }
    
    return true
  } catch (err) {
    error(`Reference data seeding failed: ${err.message}`)
    return false
  }
}

async function validateUpgrade() {
  log('\n✅ Validating upgrade...')
  
  try {
    // Test critical queries to ensure schema is working
    const tests = [
      {
        name: 'Users query',
        query: async () => await prisma.users.findFirst({ include: { businesses: true } })
      },
      {
        name: 'Business memberships query', 
        query: async () => await prisma.businessMemberships.findFirst({ include: { businesses: true, users: true } })
      },
      {
        name: 'Employees query',
        query: async () => await prisma.employees.findFirst({ include: { businesses: true } })
      },
      {
        name: 'Projects query',
        query: async () => await prisma.projects.findFirst({ include: { project_types: true, users: true } })
      }
    ]
    
    let allPassed = true
    
    for (const test of tests) {
      try {
        await test.query()
        success(`${test.name} - PASSED`)
      } catch (err) {
        error(`${test.name} - FAILED: ${err.message}`)
        allPassed = false
      }
    }
    
    return allPassed
  } catch (err) {
    error(`Validation failed: ${err.message}`)
    return false
  }
}

async function performUpgrade() {
  log('\n🚀 Starting Production Database Upgrade...')
  log('=' .repeat(60))
  
  // Step 1: Check database connection
  if (!await checkDatabaseConnection()) {
    error('Cannot proceed without database connection')
    return false
  }
  
  // Step 2: Create backup
  const backupFile = await createBackup()
  
  // Step 3: Check schema compatibility
  const compatibilityResult = await checkSchemaCompatibility()
  if (compatibilityResult === false) {
    error('Schema compatibility check failed')
    return false
  }
  
  // Step 4: Generate Prisma client
  await runCommand('npx prisma generate', 'Generating Prisma client')
  
  // Step 5: Resolve migrations
  if (!await resolveBaselineMigration()) {
    error('Migration resolution failed')
    return false
  }
  
  // Step 6: Seed missing reference data
  if (!await seedMissingReferenceData()) {
    error('Reference data seeding failed')
    return false
  }
  
  // Step 7: Validate upgrade
  if (!await validateUpgrade()) {
    error('Upgrade validation failed')
    return false
  }
  
  // Success!
  log('\n🎉 Production upgrade completed successfully!')
  log('=' .repeat(60))
  success('Your application is ready for production use')
  
  if (backupFile) {
    log(`💾 Backup stored at: ${backupFile}`)
  }
  
  log('\n📝 Next steps:')
  log('1. Test critical application functionality')
  log('2. Monitor application logs for any issues')
  log('3. Keep the backup file safe for 30 days')
  
  return true
}

// Handle command line arguments
async function main() {
  const args = process.argv.slice(2)
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Production Upgrade Script

Usage: node scripts/production-upgrade.js [options]

Options:
  --dry-run    Show what would be done without making changes
  --help, -h   Show this help message

This script safely upgrades an existing production database by:
1. Creating a backup of existing data
2. Resolving baseline migration issues
3. Seeding missing reference data  
4. Validating the upgrade

IMPORTANT: Always test on a staging environment first!
`)
    process.exit(0)
  }
  
  if (args.includes('--dry-run')) {
    log('🧪 DRY RUN MODE - No changes will be made')
    log('This would perform the following steps:')
    log('1. ✅ Check database connection')
    log('2. 📦 Create database backup')
    log('3. 🔍 Check schema compatibility')
    log('4. 🔧 Resolve baseline migrations')
    log('5. 🌱 Seed missing reference data')
    log('6. ✅ Validate upgrade')
    log('\nRun without --dry-run to perform actual upgrade')
    process.exit(0)
  }
  
  try {
    const success = await performUpgrade()
    process.exit(success ? 0 : 1)
  } catch (err) {
    error(`Upgrade failed with error: ${err.message}`)
    console.error(err)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  main()
}

module.exports = { performUpgrade }