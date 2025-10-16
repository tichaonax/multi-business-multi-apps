#!/usr/bin/env node

/**
 * Pre-commit Hook - Service Stopper
 * 
 * Automatically stops the Windows service before commit builds to prevent file lock issues
 */

const fs = require('fs')
const path = require('path')
const { spawn } = require('child_process')

const ROOT_DIR = path.join(__dirname, '..')

function log(message, type = 'INFO') {
  const colors = {
    INFO: '\x1b[36m',    // Cyan
    SUCCESS: '\x1b[32m', // Green
    WARN: '\x1b[33m',    // Yellow
    ERROR: '\x1b[31m',   // Red
  }
  const reset = '\x1b[0m'
  console.log(`${colors[type]}${message}${reset}`)
}

/**
 * Stop Windows service to prevent file locks during build
 */
async function stopWindowsService() {
  try {
    log('🛑 Pre-commit: Stopping Windows service to prevent build conflicts...', 'WARN')
    
    return new Promise((resolve, reject) => {
      const stopProcess = spawn('node', ['scripts/sync-service-stop.js'], {
        cwd: ROOT_DIR,
        stdio: 'inherit'
      })
      
      const timeout = setTimeout(() => {
        stopProcess.kill('SIGTERM')
        log('⚠️  Service stop timed out - continuing with commit', 'WARN')
        resolve() // Don't block commit
      }, 15000) // 15 second timeout (shorter for pre-commit)
      
      stopProcess.on('exit', (code) => {
        clearTimeout(timeout)
        if (code === 0) {
          log('✅ Service stopped - commit can proceed safely', 'SUCCESS')
          resolve()
        } else {
          log(`⚠️  Service stop exited with code ${code} - commit proceeding anyway`, 'WARN')
          resolve() // Don't block commit
        }
      })
      
      stopProcess.on('error', (error) => {
        clearTimeout(timeout)
        log(`⚠️  Service stop failed: ${error.message} - commit proceeding anyway`, 'WARN')
        resolve() // Don't block commit
      })
    })
    
  } catch (error) {
    log(`⚠️  Could not stop service: ${error.message} - commit proceeding anyway`, 'WARN')
  }
}

/**
 * Check if this commit involves build files
 */
function shouldStopService() {
  // For now, always stop service on pre-commit to be safe
  // Could be enhanced to check specific file patterns if needed
  return true
}

/**
 * Main pre-commit execution
 */
async function main() {
  try {
    if (shouldStopService()) {
      await stopWindowsService()
    }
    
    // Exit successfully to allow commit to proceed
    process.exit(0)
    
  } catch (error) {
    log(`Pre-commit hook failed: ${error.message}`, 'ERROR')
    // Don't block commits due to hook failures
    log('⚠️  Allowing commit to proceed despite hook failure', 'WARN')
    process.exit(0)
  }
}

// Only run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Pre-commit hook error:', error)
    // Don't block commits due to hook failures
    process.exit(0)
  })
}

module.exports = { main }