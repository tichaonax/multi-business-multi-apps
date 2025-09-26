#!/usr/bin/env node

/**
 * Cleanup Old Database Seeding Scripts
 *
 * This script removes outdated individual seed scripts that have been
 * superseded by the comprehensive production-setup.js script.
 */

const fs = require('fs')
const path = require('path')

// Console colors
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
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

// List of old seed scripts to remove (superseded by production-setup.js)
const oldScripts = [
  'seed-id-templates.js',
  'seed-phone-templates.js',
  'seed-date-templates.js',
  'seed-driver-license-templates.js',
  'seed-job-titles.js',
  'seed-compensation-types.js',
  'seed-benefit-types.js',
  'seed-business-categories.js',
  'seed-business-brands.js',
  'seed-business-products.js',
  'seed-restaurant-categories.js',
  'seed-grocery-categories.js',
  'seed-project-types.js',
  'seed-universal-system.js',
  'seed-employee-data.js',
  'seed-sample-employees.js',
  // Keep seed-all-employee-data.js as it's still used for reference
]

// Scripts to keep (still useful or referenced in documentation)
const scriptsToKeep = [
  'production-setup.js',       // Main production setup script
  'create-admin.js',          // Still useful for creating additional admins
  'seed-all-employee-data.js', // Referenced in CLAUDE.md documentation
  'backup-database.js',       // Backup functionality
  'cleanup-old-scripts.js'    // This script
]

function main() {
  log('\n🧹 Cleaning up old database seeding scripts...', colors.blue)

  const scriptsDir = path.dirname(__filename)
  let removedCount = 0
  let keptCount = 0

  for (const script of oldScripts) {
    const scriptPath = path.join(scriptsDir, script)

    try {
      if (fs.existsSync(scriptPath)) {
        fs.unlinkSync(scriptPath)
        success(`Removed: ${script}`)
        removedCount++
      } else {
        warning(`Not found: ${script}`)
      }
    } catch (err) {
      error(`Failed to remove ${script}: ${err.message}`)
    }
  }

  // Show what's being kept
  log('\n📦 Scripts being kept:', colors.blue)
  for (const script of scriptsToKeep) {
    const scriptPath = path.join(scriptsDir, script)
    if (fs.existsSync(scriptPath)) {
      success(`Kept: ${script}`)
      keptCount++
    }
  }

  log(`\n📊 Cleanup Summary:`, colors.blue)
  log(`   • Removed: ${removedCount} old scripts`)
  log(`   • Kept: ${keptCount} current scripts`)

  if (removedCount > 0) {
    success('\n🎉 Cleanup completed successfully!')
    log('\nThe following script now handles all database seeding:')
    log('   📋 scripts/production-setup.js')
    log('\nTo set up a fresh database, run:')
    log('   npm run setup:production')
  } else {
    log('\n✨ No cleanup needed - scripts are already clean!')
  }
}

main()