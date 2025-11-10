#!/usr/bin/env node
/**
 * Safe Prisma Generate
 *
 * Wrapper around `prisma generate` that handles Windows file locking issues
 * with automatic retry logic and process cleanup.
 *
 * Usage:
 *   node scripts/prisma-generate-safe.js
 *   node scripts/prisma-generate-safe.js --verbose
 *   node scripts/prisma-generate-safe.js --nuclear  # Use nuclear cleanup on final attempt
 */

const { execSync } = require('child_process')
const { unlockPrismaFiles, cleanupTempFiles } = require('./cleanup-prisma-locks')
const { killAllNodeProcesses, removeDirWithRetry } = require('./prisma-nuclear-cleanup')
const path = require('path')
const fs = require('fs')

const VERBOSE = process.argv.includes('--verbose')
const NUCLEAR = process.argv.includes('--nuclear')
const MAX_RETRIES = 3
const RETRY_DELAY = 3000 // 3 seconds
const PRISMA_DIR = path.join(__dirname, '..', 'node_modules', '.prisma')

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
 * Try to generate Prisma client
 */
function generatePrismaClient() {
  try {
    if (VERBOSE) {
      log('Running: npx prisma generate')
    }

    const output = execSync('npx prisma generate', {
      encoding: 'utf8',
      stdio: VERBOSE ? 'inherit' : 'pipe'
    })

    if (!VERBOSE) {
      // Show key lines from output
      const lines = output.split('\n')
      for (const line of lines) {
        if (line.includes('✔') || line.includes('Prisma Client') || line.includes('Generated')) {
          console.log(line)
        }
      }
    }

    return true
  } catch (err) {
    // Check if it's a file locking error
    const errorMessage = err.message || err.toString()
    if (errorMessage.includes('EPERM') || errorMessage.includes('operation not permitted')) {
      return 'LOCKED'
    }
    throw err
  }
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Try nuclear cleanup (remove .prisma directory and kill other Node processes)
 */
async function nuclearCleanup() {
  try {
    warning('\n💣 Attempting nuclear cleanup...')
    log('   This will kill other Node.js processes and remove .prisma directory')

    // Kill all Node processes (except current script)
    killAllNodeProcesses()

    // Wait for processes to terminate
    await sleep(3000)

    // Remove .prisma directory
    if (fs.existsSync(PRISMA_DIR)) {
      const removed = removeDirWithRetry(PRISMA_DIR)
      if (removed) {
        success('   Nuclear cleanup successful')
        return true
      } else {
        error('   Could not remove .prisma directory')
        return false
      }
    }

    return true
  } catch (err) {
    error(`   Nuclear cleanup failed: ${err.message}`)
    return false
  }
}

/**
 * Main execution with retry logic
 */
async function main() {
  log('🔧 Safe Prisma Generate (with retry logic)\n')

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 1) {
      log(`\n🔄 Attempt ${attempt}/${MAX_RETRIES}\n`)
    }

    const result = generatePrismaClient()

    if (result === true) {
      success('\nPrisma client generated successfully!')
      return 0
    }

    if (result === 'LOCKED') {
      error('File locking error detected (EPERM)')

      if (attempt < MAX_RETRIES) {
        log(`\n🧹 Running cleanup and will retry in ${RETRY_DELAY / 1000} seconds...`)

        // On last retry before final attempt, try nuclear cleanup if enabled
        if (NUCLEAR && attempt === MAX_RETRIES - 1) {
          const nuclearSuccess = await nuclearCleanup()
          if (nuclearSuccess) {
            log('\n⏳ Waiting for system to stabilize...')
            await sleep(RETRY_DELAY)
            continue
          }
        }

        // Cleanup temp files
        const tempCleaned = cleanupTempFiles()
        if (tempCleaned > 0 && VERBOSE) {
          log(`   Cleaned ${tempCleaned} temp file(s)`)
        }

        // Try to unlock files
        try {
          await unlockPrismaFiles()
        } catch (err) {
          if (VERBOSE) {
            warning(`   Cleanup warning: ${err.message}`)
          }
        }

        // Wait before retry
        await sleep(RETRY_DELAY)
      } else {
        error('\n❌ Max retries reached. Prisma generate failed.\n')
        log('📋 Troubleshooting steps:')
        log('   1. Run: node scripts/prisma-nuclear-cleanup.js --force')
        log('   2. Then run: npx prisma generate')
        log('   3. Or restart Windows and try again\n')
        log('💡 Alternative: Run this script with --nuclear flag next time:')
        log('   node scripts/prisma-generate-safe.js --nuclear\n')
        return 1
      }
    }
  }

  error('Unexpected error during Prisma generate')
  return 1
}

// Run if executed directly
if (require.main === module) {
  main().then(exitCode => {
    process.exit(exitCode)
  }).catch(err => {
    error(`\nUnexpected error: ${err.message}`)
    if (VERBOSE) {
      console.error(err)
    }
    process.exit(1)
  })
}

module.exports = { generatePrismaClient }
