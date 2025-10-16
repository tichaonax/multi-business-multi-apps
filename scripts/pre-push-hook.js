#!/usr/bin/env node

/**
 * Pre-push Hook - Service Stopper
 * 
 * Automatically stops the Windows service before push operations to prevent file lock issues
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
 * Stop Windows service to prevent file locks during push/build
 */
async function stopWindowsService() {
  try {
    log('🛑 Pre-push: Stopping Windows service to prevent build conflicts...', 'WARN')
    
    return new Promise((resolve, reject) => {
      const stopProcess = spawn('node', ['scripts/sync-service-stop.js'], {
        cwd: ROOT_DIR,
        stdio: 'inherit'
      })
      
      const timeout = setTimeout(() => {
        stopProcess.kill('SIGTERM')
        log('⚠️  Service stop timed out - continuing with push', 'WARN')
        resolve() // Don't block push
      }, 20000) // 20 second timeout
      
      stopProcess.on('exit', (code) => {
        clearTimeout(timeout)
        if (code === 0) {
          log('✅ Service stopped - push can proceed safely', 'SUCCESS')
          resolve()
        } else {
          log(`⚠️  Service stop exited with code ${code} - push proceeding anyway`, 'WARN')
          resolve() // Don't block push
        }
      })
      
      stopProcess.on('error', (error) => {
        clearTimeout(timeout)
        log(`⚠️  Service stop failed: ${error.message} - push proceeding anyway`, 'WARN')
        resolve() // Don't block push
      })
    })
    
  } catch (error) {
    log(`⚠️  Could not stop service: ${error.message} - push proceeding anyway`, 'WARN')
  }
}

/**
 * Main pre-push execution
 */
async function main() {
  try {
    await stopWindowsService()
    
    // Exit successfully to allow push to proceed
    process.exit(0)
    
  } catch (error) {
    log(`Pre-push hook failed: ${error.message}`, 'ERROR')
    // Don't block pushes due to hook failures
    log('⚠️  Allowing push to proceed despite hook failure', 'WARN')
    process.exit(0)
  }
}

// Only run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Pre-push hook error:', error)
    // Don't block pushes due to hook failures
    process.exit(0)
  })
}

module.exports = { main }