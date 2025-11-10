#!/usr/bin/env node
/**
 * Mark Build Complete
 *
 * Creates build completion markers that are recognized by all parts of the system:
 * - Service build info (dist/service/build-info.json) - for sync-service-runner
 * - Next.js build marker (.next/BUILD_ID) - automatically created by Next.js
 * - Build version info (config/build-info.json, dist/version.json) - for build-version-manager
 *
 * This ensures that when ANY workflow builds the app (npm run build, setup scripts,
 * git hooks, service startup), the service won't rebuild unnecessarily on restart.
 *
 * Usage:
 *   node scripts/mark-build-complete.js
 *   node scripts/mark-build-complete.js --verbose
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const ROOT_DIR = path.join(__dirname, '..')
const VERBOSE = process.argv.includes('--verbose')

function log(message, isVerbose = false) {
  if (!isVerbose || VERBOSE) {
    console.log(message)
  }
}

function getGitCommit() {
  try {
    const commit = execSync('git rev-parse HEAD', {
      encoding: 'utf8',
      cwd: ROOT_DIR,
      stdio: ['pipe', 'pipe', 'ignore'] // Suppress git errors
    }).trim()
    return commit
  } catch {
    return null
  }
}

function getShortGitCommit() {
  try {
    const commit = execSync('git rev-parse --short HEAD', {
      encoding: 'utf8',
      cwd: ROOT_DIR,
      stdio: ['pipe', 'pipe', 'ignore']
    }).trim()
    return commit
  } catch {
    return 'unknown'
  }
}

function ensureDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true })
    log(`  📁 Created directory: ${path.relative(ROOT_DIR, dirPath)}`, true)
  }
}

function createServiceBuildInfo() {
  try {
    const distServicePath = path.join(ROOT_DIR, 'dist', 'service')
    ensureDirectory(distServicePath)

    const buildInfoFile = path.join(distServicePath, 'build-info.json')
    const gitCommit = getGitCommit()

    const buildInfo = {
      buildTimestamp: new Date().toISOString(),
      gitCommit: gitCommit,
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      createdBy: 'mark-build-complete.js'
    }

    fs.writeFileSync(buildInfoFile, JSON.stringify(buildInfo, null, 2))
    log(`  ✅ Service build info: dist/service/build-info.json (commit: ${getShortGitCommit()})`)
    return true
  } catch (error) {
    log(`  ❌ Failed to create service build info: ${error.message}`)
    return false
  }
}

function createBuildVersionInfo() {
  try {
    // Create config directory if needed
    const configDir = path.join(ROOT_DIR, 'config')
    ensureDirectory(configDir)

    // Create dist directory if needed
    const distDir = path.join(ROOT_DIR, 'dist')
    ensureDirectory(distDir)

    const buildInfo = {
      buildDate: new Date().toISOString(),
      buildVersion: process.env.npm_package_version || '1.0.0',
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      gitCommit: getShortGitCommit(),
      buildNumber: getBuildNumber(),
      createdBy: 'mark-build-complete.js'
    }

    // Save to both locations
    const configFile = path.join(configDir, 'build-info.json')
    const distFile = path.join(distDir, 'version.json')

    fs.writeFileSync(configFile, JSON.stringify(buildInfo, null, 2))
    fs.writeFileSync(distFile, JSON.stringify(buildInfo, null, 2))

    log(`  ✅ Build version info: config/build-info.json and dist/version.json`)
    return true
  } catch (error) {
    log(`  ⚠️  Failed to create build version info: ${error.message}`)
    return false
  }
}

function getBuildNumber() {
  try {
    const configFile = path.join(ROOT_DIR, 'config', 'build-info.json')
    if (fs.existsSync(configFile)) {
      const info = JSON.parse(fs.readFileSync(configFile, 'utf8'))
      return (info.buildNumber || 0) + 1
    }
  } catch {
    // Ignore errors
  }
  return 1
}

function checkNextJsBuild() {
  try {
    const buildIdFile = path.join(ROOT_DIR, '.next', 'BUILD_ID')
    if (fs.existsSync(buildIdFile)) {
      const buildId = fs.readFileSync(buildIdFile, 'utf8').trim()
      log(`  ✅ Next.js build detected: .next/BUILD_ID (${buildId})`)
      return true
    } else {
      log(`  ⚠️  Next.js build not found (.next/BUILD_ID missing)`)
      return false
    }
  } catch (error) {
    log(`  ⚠️  Could not check Next.js build: ${error.message}`)
    return false
  }
}

function main() {
  console.log('🏗️  Marking build as complete...\n')

  const results = {
    nextjs: checkNextJsBuild(),
    service: createServiceBuildInfo(),
    version: createBuildVersionInfo()
  }

  console.log('')

  if (results.service && results.version) {
    console.log('✅ Build markers created successfully!')
    console.log('   Service will not rebuild unnecessarily on restart.')
    return 0
  } else if (results.service || results.version) {
    console.log('⚠️  Build markers partially created')
    console.log('   Some markers may be missing, but basic tracking is in place.')
    return 0
  } else {
    console.log('❌ Failed to create build markers')
    console.log('   Service may rebuild on next restart.')
    return 1
  }
}

// Run if executed directly
if (require.main === module) {
  const exitCode = main()
  process.exit(exitCode)
}

module.exports = {
  createServiceBuildInfo,
  createBuildVersionInfo,
  checkNextJsBuild
}
