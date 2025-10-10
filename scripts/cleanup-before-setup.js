#!/usr/bin/env node

/**
 * Cleanup Script for Windows Setup Issues
 *
 * Fixes common Windows file locking issues before running setup:
 * 1. Stops development server and other node processes
 * 2. Cleans up locked Prisma client files
 * 3. Removes corrupted node_modules if needed
 */

const { execSync } = require('child_process')
const path = require('path')
const fs = require('fs')

const ROOT_DIR = path.join(__dirname, '..')

function run(command, description, ignoreErrors = false) {
  console.log(`\n📦 ${description}...`)
  try {
    execSync(command, {
      cwd: ROOT_DIR,
      stdio: 'inherit',
      shell: true
    })
    console.log(`✅ ${description} - Done`)
    return true
  } catch (error) {
    if (!ignoreErrors) {
      console.error(`❌ ${description} - Failed: ${error.message}`)
      return false
    }
    console.log(`⚠️  ${description} - Skipped (not critical)`)
    return true
  }
}

async function main() {
  console.log('\n' + '='.repeat(60))
  console.log('🧹 CLEANUP BEFORE SETUP - Windows File Lock Resolver')
  console.log('='.repeat(60) + '\n')

  console.log('This script will:')
  console.log('  1. Stop development server on port 8080')
  console.log('  2. Clean Prisma client cache')
  console.log('  3. Remove node_modules/.prisma folder')
  console.log('  4. Prepare for fresh Prisma client generation\n')

  // Step 1: Kill processes on port 8080 (development server)
  console.log('\n' + '='.repeat(60))
  console.log('Step 1: Stopping development server (port 8080)')
  console.log('='.repeat(60))

  run(
    'powershell "Stop-Process -Id (Get-NetTCPConnection -LocalPort 8080 -ErrorAction SilentlyContinue).OwningProcess -Force -ErrorAction SilentlyContinue"',
    'Stopping processes on port 8080',
    true // Ignore errors if no process is running
  )

  // Step 2: Wait a moment for processes to release files
  console.log('\n⏳ Waiting for processes to release files...')
  await new Promise(resolve => setTimeout(resolve, 2000))

  // Step 3: Remove .prisma folder
  console.log('\n' + '='.repeat(60))
  console.log('Step 2: Removing Prisma client cache')
  console.log('='.repeat(60))

  const prismaClientPath = path.join(ROOT_DIR, 'node_modules', '.prisma')

  if (fs.existsSync(prismaClientPath)) {
    try {
      // Use rimraf-like recursive delete
      if (process.platform === 'win32') {
        execSync(`rmdir /s /q "${prismaClientPath}"`, { stdio: 'inherit' })
      } else {
        execSync(`rm -rf "${prismaClientPath}"`, { stdio: 'inherit' })
      }
      console.log('✅ Removed .prisma folder')
    } catch (error) {
      console.error('❌ Failed to remove .prisma folder')
      console.error('Try manually deleting: node_modules\\.prisma')
      console.error('Then run: npm run setup')
      process.exit(1)
    }
  } else {
    console.log('⚠️  .prisma folder not found (already clean)')
  }

  // Step 4: Remove @prisma/client folder
  const prismaClientPackagePath = path.join(ROOT_DIR, 'node_modules', '@prisma', 'client')

  if (fs.existsSync(prismaClientPackagePath)) {
    try {
      if (process.platform === 'win32') {
        execSync(`rmdir /s /q "${prismaClientPackagePath}"`, { stdio: 'inherit' })
      } else {
        execSync(`rm -rf "${prismaClientPackagePath}"`, { stdio: 'inherit' })
      }
      console.log('✅ Removed @prisma/client folder')
    } catch (error) {
      console.warn('⚠️  Could not remove @prisma/client folder (may not exist)')
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log('✅ CLEANUP COMPLETED')
  console.log('='.repeat(60))
  console.log('\n📖 Next steps:')
  console.log('   1. Run: npm install (to reinstall Prisma packages)')
  console.log('   2. Run: npm run setup (for fresh install)')
  console.log('   Or run: npm run setup:clean (does both automatically)\n')
}

main().catch(error => {
  console.error('\n❌ CLEANUP FAILED:', error.message)
  process.exit(1)
})
