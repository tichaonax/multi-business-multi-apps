#!/usr/bin/env node

/**
 * Smart Post-Merge Git Hook
 * Automatically runs after git merge/pull and provides intelligent setup guidance
 */

const fs = require('fs')
const path = require('path')

const ROOT_DIR = path.join(__dirname, '..')
const ENV_FILE = path.join(ROOT_DIR, '.env')
const ENV_EXAMPLE_FILE = path.join(ROOT_DIR, '.env.example')
const SERVICE_CONFIG_FILE = path.join(ROOT_DIR, 'config', 'service-config.json')
const SYNC_CONFIG_FILE = path.join(ROOT_DIR, 'data', 'sync', 'config.json')

function log(message, type = 'INFO') {
  const colors = {
    INFO: '\x1b[36m',    // Cyan
    SUCCESS: '\x1b[32m', // Green
    WARN: '\x1b[33m',    // Yellow
    ERROR: '\x1b[31m',   // Red
    HEADER: '\x1b[35m'   // Magenta
  }
  const reset = '\x1b[0m'
  console.log(`${colors[type]}${message}${reset}`)
}

/**
 * Check if environment migration is needed
 */
function checkEnvironmentMigration() {
  const legacyFiles = []
  
  // Check for service config file
  if (fs.existsSync(SERVICE_CONFIG_FILE)) {
    try {
      const content = fs.readFileSync(SERVICE_CONFIG_FILE, 'utf8')
      const config = JSON.parse(content)
      // If it's not a migration marker file, it needs migration
      if (!config._migrated) {
        legacyFiles.push('config/service-config.json')
      }
    } catch (error) {
      // If we can't parse it, it might need migration
      legacyFiles.push('config/service-config.json')
    }
  }
  
  // Check for sync config file
  if (fs.existsSync(SYNC_CONFIG_FILE)) {
    try {
      const content = fs.readFileSync(SYNC_CONFIG_FILE, 'utf8')
      const config = JSON.parse(content)
      // If it's not a migration marker file, it needs migration
      if (!config._migrated) {
        legacyFiles.push('data/sync/config.json')
      }
    } catch (error) {
      // If we can't parse it, it might need migration
      legacyFiles.push('data/sync/config.json')
    }
  }
  
  return {
    needsMigration: legacyFiles.length > 0,
    legacyFiles,
    hasEnvFile: fs.existsSync(ENV_FILE)
  }
}

/**
 * Check if this is a fresh install
 */
async function isFreshInstall() {
  try {
    // Check 1: Does .env file exist?
    if (!fs.existsSync(ENV_FILE)) {
      return { fresh: true, reason: 'No .env file found' }
    }

    // Check 2: Can we connect to database?
    const { PrismaClient } = require('@prisma/client')
    const prisma = new PrismaClient()
    
    try {
      await prisma.$queryRaw`SELECT 1`
      const userCount = await prisma.users.count()
      await prisma.$disconnect()
      
      if (userCount === 0) {
        return { fresh: true, reason: 'Database exists but is empty' }
      }
      
      return { fresh: false, reason: 'Database exists with data' }
      
    } catch (dbError) {
      await prisma.$disconnect().catch(() => {})
      
      if (dbError.message.includes('does not exist') || 
          dbError.code === 'P1003' || 
          dbError.code === 'P1001') {
        return { fresh: true, reason: 'Database does not exist or is not accessible' }
      }
      
      return { fresh: true, reason: 'Database connection failed' }
    }
    
  } catch (error) {
    return { fresh: true, reason: `Environment check failed: ${error.message}` }
  }
}

/**
 * Check environment configuration completeness
 */
function checkEnvironmentConfig() {
  if (!fs.existsSync(ENV_FILE)) {
    return { 
      configured: false, 
      missing: ['Complete .env file missing'],
      critical: true
    }
  }

  const envContent = fs.readFileSync(ENV_FILE, 'utf8')
  const missing = []
  const warnings = []

  // Critical variables
  const critical = [
    'DATABASE_URL',
    'NEXTAUTH_SECRET',
    'SYNC_REGISTRATION_KEY'
  ]

  // Server-specific variables that should be unique
  const serverSpecific = [
    'SYNC_NODE_ID',
    'SYNC_NODE_NAME'
  ]

  critical.forEach(key => {
    if (!envContent.includes(`${key}=`) || envContent.includes(`${key}="your-`) || envContent.includes(`${key}="generate-`)) {
      missing.push(key)
    }
  })

  serverSpecific.forEach(key => {
    if (!envContent.includes(`${key}=`) || envContent.includes(`${key}="generate-`) || envContent.includes(`${key}="sync-node-server`)) {
      warnings.push(key)
    }
  })

  return {
    configured: missing.length === 0,
    missing,
    warnings,
    critical: missing.length > 0
  }
}

/**
 * Generate environment migration instructions
 */
function generateMigrationInstructions() {
  const migrationCheck = checkEnvironmentMigration()
  
  log('\n' + '='.repeat(70), 'HEADER')
  log('🔄 ENVIRONMENT MIGRATION REQUIRED', 'HEADER')
  log('='.repeat(70), 'HEADER')
  log('')
  
  log('Legacy configuration files detected that need to be migrated to environment variables:', 'WARN')
  log('')
  
  migrationCheck.legacyFiles.forEach(file => {
    log(`   • ${file}`, 'INFO')
  })
  log('')
  
  // Step 1: Migration
  log('📋 STEP 1: Run Environment Migration', 'WARN')
  log('=' .repeat(50))
  log('✓ First, preview what will be migrated (dry run):', 'INFO')
  log('   node scripts/migrate-environment.js migrate --dry-run', 'INFO')
  log('')
  log('✓ If the preview looks correct, run the migration:', 'SUCCESS')
  log('   node scripts/migrate-environment.js migrate', 'SUCCESS')
  log('')
  log('   This will:', 'INFO')
  log('   • Extract settings from legacy config files', 'INFO')
  log('   • Create/update your .env file', 'INFO')
  log('   • Archive original config files with timestamp', 'INFO')
  log('   • Mark legacy files as migrated', 'INFO')
  log('')
  
  // Step 2: Validation
  log('📋 STEP 2: Validate Migration', 'WARN')
  log('=' .repeat(50))
  log('✓ Verify the migration worked correctly:', 'INFO')
  log('   node scripts/env-config.js validate', 'INFO')
  log('')
  
  // Step 3: Update Services
  log('📋 STEP 3: Update Services', 'WARN')
  log('=' .repeat(50))
  log('✓ Restart services to use new environment config:', 'INFO')
  log('   npm run setup:update', 'SUCCESS')
  log('')
  
  // Step 4: Rollback (if needed)
  log('📋 OPTIONAL: Rollback (if something goes wrong)', 'WARN')
  log('=' .repeat(50))
  log('✓ If migration causes issues, you can rollback:', 'INFO')
  log('   node scripts/migrate-environment.js rollback', 'INFO')
  log('')
  
  log('🔧 Once migration is complete, future git pulls will use standard update process.', 'SUCCESS')
  log('')
}

/**
 * Generate setup instructions for fresh install
 */
function generateFreshInstallInstructions() {
  const envCheck = checkEnvironmentConfig()
  
  log('\n' + '='.repeat(70), 'HEADER')
  log('🆕 FRESH INSTALL DETECTED', 'HEADER')
  log('='.repeat(70), 'HEADER')
  log('')
  
  log('This appears to be a fresh installation. Please complete these steps:', 'INFO')
  log('')
  
  // Step 1: Environment Configuration
  log('📋 STEP 1: Configure Environment Variables', 'WARN')
  log('=' .repeat(50))
  
  if (!fs.existsSync(ENV_FILE)) {
    log('✓ Copy environment template:', 'INFO')
    log('   copy .env.example .env', 'INFO')
    log('')
  }
  
  if (envCheck.critical) {
    log('✓ Update these REQUIRED variables in .env:', 'ERROR')
    envCheck.missing.forEach(key => {
      switch(key) {
        case 'DATABASE_URL':
          log(`   ${key}="postgresql://username:password@localhost:5432/multi_business_db"`, 'INFO')
          break
        case 'NEXTAUTH_SECRET':
          log(`   ${key}="$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")"`, 'INFO')
          break
        case 'SYNC_REGISTRATION_KEY':
          log(`   ${key}="$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")"`, 'INFO')
          break
        default:
          log(`   ${key}="<your-value>"`, 'INFO')
      }
    })
    log('')
  }
  
  if (envCheck.warnings.length > 0) {
    log('✓ Update these SERVER-SPECIFIC variables:', 'WARN')
    envCheck.warnings.forEach(key => {
      switch(key) {
        case 'SYNC_NODE_ID':
          log(`   ${key}="$(node -e "console.log(require('crypto').randomBytes(8).toString('hex'))")"`, 'INFO')
          break
        case 'SYNC_NODE_NAME':
          log(`   ${key}="sync-node-$(hostname)"`, 'INFO')
          break
        default:
          log(`   ${key}="<server-specific-value>"`, 'INFO')
      }
    })
    log('')
  }
  
  // Step 2: Database Setup
  log('📋 STEP 2: Verify Database Server', 'WARN')
  log('=' .repeat(50))
  log('✓ Ensure PostgreSQL server is running', 'INFO')
  log('✓ Create database if it doesn\'t exist:', 'INFO')
  log('   createdb multi_business_db', 'INFO')
  log('')
  
  // Step 3: Environment Validation
  log('📋 STEP 3: Validate Configuration', 'WARN')
  log('=' .repeat(50))
  log('✓ Test your configuration:', 'INFO')
  log('   node scripts/env-config.js validate', 'INFO')
  log('')
  
  // Step 4: Fresh Install
  log('📋 STEP 4: Run Fresh Install', 'WARN')
  log('=' .repeat(50))
  log('✓ Once environment is configured, run:', 'INFO')
  log('   npm run setup', 'SUCCESS')
  log('')
  log('   This will:', 'INFO')
  log('   • Install dependencies', 'INFO')
  log('   • Set up database schema', 'INFO')
  log('   • Seed initial data', 'INFO')
  log('   • Build the application', 'INFO')
  log('')
  
  // Step 5: Service Installation
  log('📋 STEP 5: Install Windows Service (Run as Administrator)', 'WARN')
  log('=' .repeat(50))
  log('✓ After fresh install completes:', 'INFO')
  log('   npm run service:install', 'SUCCESS')
  log('   npm run service:start', 'SUCCESS')
  log('')
  
  log('🌐 Then access your application at: http://localhost:8080', 'SUCCESS')
  log('')
  log('=' .repeat(70), 'HEADER')
  log('')
}

/**
 * Generate update instructions for existing install
 */
function generateUpdateInstructions() {
  log('\n' + '='.repeat(70), 'HEADER')
  log('🔄 EXISTING INSTALLATION DETECTED', 'HEADER') 
  log('='.repeat(70), 'HEADER')
  log('')
  
  log('Updating existing installation...', 'INFO')
  log('')
  
  log('📋 RECOMMENDED UPDATE PROCESS:', 'WARN')
  log('=' .repeat(50))
  log('✓ Run the smart update (as Administrator):', 'INFO')
  log('   npm run setup:update', 'SUCCESS')
  log('   npm run service:restart', 'SUCCESS')
  log('')
  log('   This will:', 'INFO')
  log('   • Stop the service safely', 'INFO')
  log('   • Update dependencies', 'INFO')
  log('   • Rebuild changed components', 'INFO')
  log('   • Handle database migrations', 'INFO')
  log('   • Restart the service', 'INFO')
  log('')
  
  log('🌐 Application will be available at: http://localhost:8080', 'SUCCESS')
  log('')
  log('=' .repeat(70), 'HEADER')
  log('')
}

/**
 * Main hook execution
 */
async function main() {
  try {
    log('')
    log('🔗 Post-merge hook executing...', 'INFO')
    
    // First check for environment migration needs
    const migrationCheck = checkEnvironmentMigration()
    
    if (migrationCheck.needsMigration) {
      log('Detection: Legacy configuration files need migration', 'WARN')
      generateMigrationInstructions()
      return
    }
    
    // Then check for fresh vs existing install
    const installCheck = await isFreshInstall()
    
    if (installCheck.fresh) {
      log(`Detection: ${installCheck.reason}`, 'INFO')
      generateFreshInstallInstructions()
    } else {
      log(`Detection: ${installCheck.reason}`, 'INFO')
      generateUpdateInstructions()
    }
    
  } catch (error) {
    log(`Hook execution failed: ${error.message}`, 'ERROR')
    log('Defaulting to fresh install instructions...', 'WARN')
    generateFreshInstallInstructions()
  }
}

// Only run if called directly (not imported)
if (require.main === module) {
  main().catch(error => {
    console.error('Hook failed:', error)
    process.exit(1)
  })
}

module.exports = { main, isFreshInstall, checkEnvironmentConfig }