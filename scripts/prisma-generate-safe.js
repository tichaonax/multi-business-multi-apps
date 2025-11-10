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
 */

const { execSync } = require('child_process')
const { unlockPrismaFiles, cleanupTempFiles } = require('./cleanup-prisma-locks')

const VERBOSE = process.argv.includes('--verbose')
const MAX_RETRIES = 3
const RETRY_DELAY = 3000 // 3 seconds

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
        log('   1. Run: node scripts/cleanup-prisma-locks.js --auto')
        log('   2. Close all terminals and Node.js processes')
        log('   3. Stop any development servers (npm run dev)')
        log('   4. If running as a service, stop it first')
        log('   5. As a last resort, restart Windows\n')
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
