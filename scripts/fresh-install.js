#!/usr/bin/env node

/**
 * Fresh Installation Script
 * 
 * This script sets up a completely new production database from scratch.
 * Use this for new deployments or when you want to start with a clean database.
 * 
 * MBM-341: only for an EMPTY database. It refuses when the database has data,
 * and builds the schema with `prisma migrate deploy` (never `db push`).
 */

const { PrismaClient } = require('@prisma/client')
const { exec } = require('child_process')
const { promisify } = require('util')
const readline = require('readline')

const execAsync = promisify(exec)
const prisma = new PrismaClient()

// Console colors
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
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

async function askForConfirmation(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })

  return new Promise((resolve) => {
    rl.question(question + ' (yes/no): ', (answer) => {
      rl.close()
      resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y')
    })
  })
}

async function runCommand(command, description) {
  log(`🔄 ${description}...`)
  try {
    const { stdout, stderr } = await execAsync(command, {
      cwd: process.cwd(),
      env: { ...process.env }
    })

    if (stdout) console.log(stdout)
    if (stderr && !stderr.includes('warning')) console.error(stderr)

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

async function checkForExistingData() {
  log('\n🔍 Checking for existing data...')
  
  try {
    const userCount = await prisma.users.count().catch(() => 0)
    const businessCount = await prisma.businesses.count().catch(() => 0)
    const employeeCount = await prisma.employees.count().catch(() => 0)
    
    if (userCount > 0 || businessCount > 0 || employeeCount > 0) {
      warning('EXISTING DATA DETECTED!')
      log(`Found:`)
      log(`  - Users: ${userCount}`)
      log(`  - Businesses: ${businessCount}`)
      log(`  - Employees: ${employeeCount}`)
      
      return { hasData: true, counts: { userCount, businessCount, employeeCount } }
    }
    
    success('No existing data found - safe to proceed')
    return { hasData: false, counts: { userCount: 0, businessCount: 0, employeeCount: 0 } }
    
  } catch (err) {
    // Tables might not exist yet, which is fine for fresh install
    success('Database appears to be completely fresh')
    return { hasData: false, counts: { userCount: 0, businessCount: 0, employeeCount: 0 } }
  }
}

async function performFreshInstall() {
  log('\n🚀 Starting Fresh Installation...')
  log('=' .repeat(60))
  
  // Step 1: Check database connection
  if (!await checkDatabaseConnection()) {
    error('Cannot proceed without database connection')
    return false
  }
  
  // Step 2: Check for existing data
  const dataCheck = await checkForExistingData()
  
  if (dataCheck.hasData) {
    error('DANGER: Existing data detected!')
    log('\n' + '⚠️'.repeat(20))
    log(colors.bold + colors.red + 'THIS OPERATION WILL DESTROY ALL EXISTING DATA!' + colors.reset)
    log('⚠️'.repeat(20) + '\n')
    
    log('If you want to preserve existing data, use the upgrade script instead:')
    log('  node scripts/production-upgrade.js')
    log('')
    
    // MBM-341: a fresh install never wipes a database with data in it. To start
    // over, drop and create the database yourself (on purpose), then run this.
    error('Refusing: this database has data. Nothing was changed.')
    return false
  }

  // Step 3: Create the schema from the migrations (never `db push`)
  log('🔄 Applying all migrations...')
  const resetResult = await runCommand('npx prisma migrate deploy', 'Applying migrations')
  if (!resetResult.success) {
    error('Applying migrations failed')
    return false
  }
  
  // Step 4: Generate Prisma client (with retry logic)
  await runCommand('node scripts/prisma-generate-safe.js', 'Generating Prisma client (with retry logic)')
  
  // Step 5: Run production setup
  log('\n🌱 Setting up production data...')
  const setupResult = await runCommand('npm run setup:production', 'Running production setup')
  if (!setupResult.success) {
    error('Production setup failed')
    return false
  }
  
  // Step 6: Validate installation
  if (!await validateInstallation()) {
    error('Installation validation failed')
    return false
  }
  
  // Success!
  log('\n🎉 Fresh installation completed successfully!')
  log('=' .repeat(60))
  success('Your Multi-Business Management Platform is ready for production use!')
  
  log('\n📝 Next steps:')
  log('1. Start the application: npm run dev (development) or npm run build && npm start (production)')
  log('2. Login with admin credentials: admin@business.local / admin123')
  log('3. Change the default admin password')
  log('4. Create your first business and users')
  log('5. Configure system settings and preferences')
  
  return true
}

async function validateInstallation() {
  log('\n✅ Validating fresh installation...')
  
  try {
    // Check reference data
    const compensationCount = await prisma.compensationTypes.count()
    const jobTitleCount = await prisma.jobTitles.count()
    const benefitCount = await prisma.benefitTypes.count()
    const adminCount = await prisma.users.count({ where: { role: 'admin' } })
    
    const checks = [
      { name: 'Compensation types', count: compensationCount, min: 10 },
      { name: 'Job titles', count: jobTitleCount, min: 25 },
      { name: 'Benefit types', count: benefitCount, min: 20 },
      { name: 'Admin users', count: adminCount, min: 1 }
    ]
    
    let allPassed = true
    
    for (const check of checks) {
      if (check.count >= check.min) {
        success(`${check.name}: ${check.count} (required: ${check.min}) - PASSED`)
      } else {
        error(`${check.name}: ${check.count} (required: ${check.min}) - FAILED`)
        allPassed = false
      }
    }
    
    // Test critical queries
    const queryTests = [
      {
        name: 'Admin user login test',
        query: async () => await prisma.users.findFirst({ 
          where: { email: 'admin@business.local' },
          include: { businesses: true }
        })
      }
    ]
    
    for (const test of queryTests) {
      try {
        const result = await test.query()
        if (result) {
          success(`${test.name} - PASSED`)
        } else {
          error(`${test.name} - FAILED (no results)`)
          allPassed = false
        }
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

// Handle command line arguments
async function main() {
  const args = process.argv.slice(2)
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Fresh Installation Script

Usage: node scripts/fresh-install.js [options]

Options:
  --force      Skip confirmation prompts (DANGEROUS!)
  --help, -h   Show this help message

This script performs a complete fresh installation by:
1. Checking for existing data (with warnings)
2. Resetting the database schema completely
3. Setting up all production reference data
4. Creating the system administrator account
5. Validating the installation

⚠️  WARNING: This will DESTROY any existing data in the database!

For upgrading existing databases, use: node scripts/production-upgrade.js
`)
    process.exit(0)
  }
  
  if (args.includes('--force')) {
    warning('FORCE MODE: Skipping safety confirmations')
    // Override askForConfirmation to always return true
    global.askForConfirmation = async () => true
  }
  
  try {
    const success = await performFreshInstall()
    process.exit(success ? 0 : 1)
  } catch (err) {
    error(`Fresh installation failed with error: ${err.message}`)
    console.error(err)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  main()
}

module.exports = { performFreshInstall }