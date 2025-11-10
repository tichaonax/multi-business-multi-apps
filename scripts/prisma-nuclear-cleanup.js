#!/usr/bin/env node
/**
 * Prisma Nuclear Cleanup
 *
 * This is the most aggressive cleanup option for Prisma DLL locking issues.
 * It removes the entire .prisma directory and kills all Node processes.
 *
 * Use this when the regular cleanup doesn't work.
 *
 * Usage:
 *   node scripts/prisma-nuclear-cleanup.js
 *   node scripts/prisma-nuclear-cleanup.js --force  # Skip confirmation
 */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')
const readline = require('readline')

const ROOT_DIR = path.join(__dirname, '..')
const PRISMA_DIR = path.join(ROOT_DIR, 'node_modules', '.prisma')
const FORCE_MODE = process.argv.includes('--force')

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

/**
 * Kill all Node.js processes
 */
function killAllNodeProcesses() {
  try {
    log('\n🔪 Killing all Node.js processes...')

    // Get list of Node processes first
    const output = execSync('tasklist /FI "IMAGENAME eq node.exe" /FO CSV /NH', {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore']
    })

    const lines = output.trim().split('\n').filter(l => l.trim())

    if (lines.length === 0) {
      log('   No Node.js processes found')
      return true
    }

    log(`   Found ${lines.length} Node.js process(es)`)

    // Kill all Node processes
    try {
      execSync('taskkill /F /IM node.exe', { stdio: 'ignore' })
      success(`   Killed ${lines.length} Node.js process(es)`)
      return true
    } catch (err) {
      warning('   Some processes could not be killed (may require admin)')
      return false
    }
  } catch (err) {
    warning('   Could not enumerate Node.js processes')
    return false
  }
}

/**
 * Remove directory recursively with retry
 */
function removeDirWithRetry(dirPath, maxAttempts = 3) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      if (!fs.existsSync(dirPath)) {
        return true
      }

      fs.rmSync(dirPath, { recursive: true, force: true })

      if (!fs.existsSync(dirPath)) {
        return true
      }
    } catch (err) {
      if (attempt === maxAttempts) {
        return false
      }
      // Wait a bit before retry
      execSync('timeout /t 2 /nobreak', { stdio: 'ignore' })
    }
  }
  return false
}

/**
 * Confirm with user
 */
async function confirm(message) {
  if (FORCE_MODE) return true

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })

  return new Promise(resolve => {
    rl.question(`${message} (y/N): `, answer => {
      rl.close()
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes')
    })
  })
}

/**
 * Main execution
 */
async function main() {
  log('💣 Prisma Nuclear Cleanup\n')
  warning('⚠️  WARNING: This will kill ALL Node.js processes and remove .prisma directory')
  log('')

  // Check if .prisma directory exists
  if (!fs.existsSync(PRISMA_DIR)) {
    success('✅ .prisma directory does not exist - nothing to clean')
    return 0
  }

  // Confirm action
  const confirmed = await confirm('🤔 Do you want to proceed?')

  if (!confirmed) {
    log('\n❌ Cancelled by user')
    return 1
  }

  log('')

  // Step 1: Kill all Node processes
  const killed = killAllNodeProcesses()

  // Wait for processes to fully terminate
  log('\n⏳ Waiting for processes to terminate...')
  execSync('timeout /t 3 /nobreak', { stdio: 'ignore' })

  // Step 2: Remove .prisma directory
  log('\n🗑️  Removing .prisma directory...')
  const removed = removeDirWithRetry(PRISMA_DIR)

  if (removed) {
    success('   Successfully removed .prisma directory')
  } else {
    error('   Failed to remove .prisma directory')
    log('\n📋 Manual steps required:')
    log('   1. Close this terminal')
    log('   2. Open Task Manager and end all Node.js processes')
    log('   3. Delete: node_modules\\.prisma')
    log('   4. Restart and run setup again')
    return 1
  }

  // Step 3: Verify cleanup
  log('\n🔍 Verifying cleanup...')

  if (fs.existsSync(PRISMA_DIR)) {
    error('   .prisma directory still exists')
    return 1
  }

  success('   Cleanup verified')

  // Final message
  log('\n✅ Nuclear cleanup completed successfully!')
  log('\n📋 Next steps:')
  log('   1. Run: npx prisma generate')
  log('   2. Or continue with your setup script')
  log('')

  return 0
}

// Run if executed directly
if (require.main === module) {
  main().then(exitCode => {
    process.exit(exitCode)
  }).catch(err => {
    error(`\nUnexpected error: ${err.message}`)
    process.exit(1)
  })
}

module.exports = { killAllNodeProcesses, removeDirWithRetry }
