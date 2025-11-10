#!/usr/bin/env node
/**
 * Cleanup Prisma Locks
 *
 * This script handles Windows file locking issues with Prisma query engine.
 * It detects running processes that may be holding locks on Prisma files
 * and provides options to clean them up.
 *
 * Usage:
 *   node scripts/cleanup-prisma-locks.js
 *   node scripts/cleanup-prisma-locks.js --auto    # Automatic cleanup
 *   node scripts/cleanup-prisma-locks.js --force   # Force kill processes
 */

const { execSync, exec } = require('child_process')
const fs = require('fs')
const path = require('path')

const ROOT_DIR = path.join(__dirname, '..')
const PRISMA_CLIENT_DIR = path.join(ROOT_DIR, 'node_modules', '.prisma', 'client')
const AUTO_MODE = process.argv.includes('--auto')
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
 * Get all Node.js processes
 */
function getNodeProcesses() {
  try {
    const output = execSync('tasklist /FI "IMAGENAME eq node.exe" /FO CSV /NH', {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore']
    })

    const processes = []
    const lines = output.trim().split('\n')

    for (const line of lines) {
      if (!line.trim()) continue

      // Parse CSV: "node.exe","PID","Services","Memory","Session Name"
      const match = line.match(/"([^"]+)","(\d+)","([^"]+)","([^"]+)","([^"]+)"/)
      if (match) {
        processes.push({
          name: match[1],
          pid: parseInt(match[2]),
          memory: match[4]
        })
      }
    }

    return processes
  } catch (err) {
    warning('Could not get process list')
    return []
  }
}

/**
 * Check if file is locked
 */
function isFileLocked(filePath) {
  try {
    // Try to rename the file to itself (no-op if successful)
    fs.renameSync(filePath, filePath)
    return false
  } catch (err) {
    if (err.code === 'EPERM' || err.code === 'EBUSY') {
      return true
    }
    return false
  }
}

/**
 * Check for locked Prisma files
 */
function checkPrismaLocks() {
  const lockedFiles = []

  if (!fs.existsSync(PRISMA_CLIENT_DIR)) {
    return lockedFiles
  }

  const files = [
    'query_engine-windows.dll.node',
    'libquery_engine-windows.dll.node'
  ]

  for (const file of files) {
    const filePath = path.join(PRISMA_CLIENT_DIR, file)
    if (fs.existsSync(filePath) && isFileLocked(filePath)) {
      lockedFiles.push(file)
    }
  }

  return lockedFiles
}

/**
 * Kill a process by PID
 */
function killProcess(pid, force = false) {
  try {
    const command = force ? `taskkill /F /PID ${pid}` : `taskkill /PID ${pid}`
    execSync(command, { stdio: 'ignore' })
    return true
  } catch (err) {
    return false
  }
}

/**
 * Get process details for a PID
 */
function getProcessDetails(pid) {
  try {
    const output = execSync(`wmic process where ProcessId=${pid} get CommandLine,ExecutablePath /FORMAT:LIST`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore']
    })

    const details = {}
    const lines = output.split('\n')

    for (const line of lines) {
      const [key, ...valueParts] = line.split('=')
      if (key && valueParts.length > 0) {
        details[key.trim()] = valueParts.join('=').trim()
      }
    }

    return details
  } catch (err) {
    return null
  }
}

/**
 * Check if a process is likely related to this project
 */
function isProjectProcess(pid) {
  const details = getProcessDetails(pid)
  if (!details || !details.CommandLine) {
    return false
  }

  const cmdLine = details.CommandLine.toLowerCase()
  const projectPath = ROOT_DIR.toLowerCase()

  // Check if command line contains our project path
  return cmdLine.includes(projectPath) ||
         cmdLine.includes('next dev') ||
         cmdLine.includes('prisma') ||
         cmdLine.includes('sync-service')
}

/**
 * Try to unlock Prisma files by stopping related processes
 */
async function unlockPrismaFiles() {
  log('\n🔍 Checking for locked Prisma files...\n')

  const lockedFiles = checkPrismaLocks()

  if (lockedFiles.length === 0) {
    success('No locked Prisma files detected')
    return true
  }

  error(`Found ${lockedFiles.length} locked file(s):`)
  lockedFiles.forEach(file => console.log(`   - ${file}`))

  log('\n🔍 Checking for Node.js processes...\n')

  const nodeProcesses = getNodeProcesses()

  if (nodeProcesses.length === 0) {
    warning('No Node.js processes found, but files are still locked')
    warning('You may need to restart Windows to clear the locks')
    return false
  }

  // Filter to project-related processes
  const projectProcesses = []
  const otherProcesses = []

  for (const proc of nodeProcesses) {
    if (isProjectProcess(proc.pid)) {
      projectProcesses.push(proc)
    } else {
      otherProcesses.push(proc)
    }
  }

  if (projectProcesses.length === 0 && otherProcesses.length > 0) {
    warning(`Found ${otherProcesses.length} Node.js process(es), but none appear related to this project`)
    log('\nNode.js processes found:')
    otherProcesses.forEach(proc => {
      console.log(`   - PID ${proc.pid} (${proc.memory})`)
    })

    if (!FORCE_MODE) {
      warning('\nFiles may be locked by Windows services or background processes')
      log('Options:')
      log('  1. Run with --force to kill all Node.js processes')
      log('  2. Manually stop Node.js processes in Task Manager')
      log('  3. Restart Windows')
      return false
    }
  }

  if (projectProcesses.length > 0) {
    log(`Found ${projectProcesses.length} project-related process(es):\n`)
    projectProcesses.forEach(proc => {
      const details = getProcessDetails(proc.pid)
      console.log(`   - PID ${proc.pid} (${proc.memory})`)
      if (details && details.CommandLine) {
        console.log(`     ${details.CommandLine.substring(0, 80)}...`)
      }
    })

    if (AUTO_MODE || FORCE_MODE) {
      log('\n🔨 Stopping processes...\n')

      let stoppedCount = 0
      for (const proc of projectProcesses) {
        if (killProcess(proc.pid, FORCE_MODE)) {
          success(`Stopped PID ${proc.pid}`)
          stoppedCount++
        } else {
          error(`Failed to stop PID ${proc.pid}`)
        }
      }

      if (stoppedCount > 0) {
        log('\n⏳ Waiting for file locks to clear...')
        await new Promise(resolve => setTimeout(resolve, 2000))

        const stillLocked = checkPrismaLocks()
        if (stillLocked.length === 0) {
          success('All Prisma file locks cleared!')
          return true
        } else {
          warning(`${stillLocked.length} file(s) still locked`)
          return false
        }
      }
    } else {
      log('\n💡 To automatically stop these processes, run:')
      log('   node scripts/cleanup-prisma-locks.js --auto\n')
      return false
    }
  }

  return false
}

/**
 * Cleanup temp files
 */
function cleanupTempFiles() {
  if (!fs.existsSync(PRISMA_CLIENT_DIR)) {
    return 0
  }

  const files = fs.readdirSync(PRISMA_CLIENT_DIR)
  let cleaned = 0

  for (const file of files) {
    if (file.includes('.tmp') || file.endsWith('.tmp')) {
      const filePath = path.join(PRISMA_CLIENT_DIR, file)
      try {
        fs.unlinkSync(filePath)
        cleaned++
      } catch (err) {
        // Ignore errors
      }
    }
  }

  return cleaned
}

/**
 * Main execution
 */
async function main() {
  log('🧹 Prisma Lock Cleanup Tool\n')

  // First, cleanup temp files
  const tempCleaned = cleanupTempFiles()
  if (tempCleaned > 0) {
    success(`Cleaned up ${tempCleaned} temporary file(s)`)
  }

  // Check and unlock
  const unlocked = await unlockPrismaFiles()

  if (unlocked) {
    log('\n✅ Ready to run: npx prisma generate\n')
    return 0
  } else {
    log('\n❌ Could not unlock all files\n')
    log('If issues persist:')
    log('  1. Close all terminals and development tools')
    log('  2. Stop any Windows services using Node.js')
    log('  3. Run: node scripts/cleanup-prisma-locks.js --force')
    log('  4. As a last resort, restart Windows\n')
    return 1
  }
}

// Run if executed directly
if (require.main === module) {
  main().then(exitCode => {
    process.exit(exitCode)
  }).catch(err => {
    error(`Unexpected error: ${err.message}`)
    process.exit(1)
  })
}

module.exports = {
  unlockPrismaFiles,
  checkPrismaLocks,
  cleanupTempFiles
}
