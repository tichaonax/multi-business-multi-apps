#!/usr/bin/env node

/**
 * Clean and Setup
 *
 * This script cleans build caches and runs fresh installation setup.
 * Useful when build errors occur due to stale caches.
 *
 * Usage:
 *   node scripts/clean-and-setup.js
 */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const ROOT_DIR = path.join(__dirname, '..')

function log(message, color = '\x1b[36m') {
  console.log(`${color}${message}\x1b[0m`)
}

function success(message) {
  log(`✅ ${message}`, '\x1b[32m')
}

function warning(message) {
  log(`⚠️  ${message}`, '\x1b[33m')
}

function error(message) {
  log(`❌ ${message}`, '\x1b[31m')
}

function cleanDirectory(dirPath, dirName) {
  try {
    if (fs.existsSync(dirPath)) {
      log(`Removing ${dirName}...`)
      fs.rmSync(dirPath, { recursive: true, force: true })
      success(`${dirName} removed`)
      return true
    } else {
      log(`${dirName} does not exist - skipping`)
      return true
    }
  } catch (err) {
    warning(`Could not remove ${dirName}: ${err.message}`)
    return false
  }
}

async function main() {
  log('\n🧹 Clean and Setup\n')
  log('=' .repeat(60))

  // Step 1: Clean .next build cache
  log('\n📦 Cleaning build caches...\n')
  cleanDirectory(path.join(ROOT_DIR, '.next'), '.next (Next.js build cache)')
  cleanDirectory(path.join(ROOT_DIR, 'node_modules', '.prisma'), '.prisma (Prisma client)')

  success('\n✅ All caches cleaned\n')

  // Step 2: Run setup
  log('=' .repeat(60))
  log('\n🚀 Running fresh installation setup...\n')
  log('=' .repeat(60) + '\n')

  try {
    execSync('node scripts/setup-fresh-install.js', {
      cwd: ROOT_DIR,
      stdio: 'inherit'
    })
  } catch (err) {
    error('\n❌ Setup failed: ' + err.message)
    log('\nTroubleshooting:')
    log('  1. If EPERM errors persist, run nuclear cleanup:')
    log('     node scripts/prisma-nuclear-cleanup.js --force')
    log('  2. Ensure all services are stopped:')
    log('     npm run sync-service:stop')
    log('     sc.exe stop "electricity-tokens.exe"')
    log('  3. Try running setup again:')
    log('     node scripts/clean-and-setup.js\n')
    process.exit(1)
  }

  success('\n✅ Clean and setup completed successfully!\n')
}

main().catch(err => {
  error('\n❌ FATAL ERROR: ' + err.message)
  console.error(err)
  process.exit(1)
})
