/**
 * Build Version Manager
 * Preserves build version information across deployments
 */

const fs = require('fs')
const path = require('path')

const ROOT_DIR = path.join(__dirname, '..')
const BUILD_INFO_FILE = path.join(ROOT_DIR, 'config', 'build-info.json')
const DIST_VERSION_FILE = path.join(ROOT_DIR, 'dist', 'version.json')

/**
 * Save build version information to persistent location
 */
function saveBuildInfo() {
  try {
    const buildInfo = {
      buildDate: new Date().toISOString(),
      buildVersion: process.env.npm_package_version || '1.0.0',
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      gitCommit: getBuildCommitHash(),
      buildNumber: generateBuildNumber()
    }

    // Ensure config directory exists
    const configDir = path.dirname(BUILD_INFO_FILE)
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true })
    }

    // Save to persistent location
    fs.writeFileSync(BUILD_INFO_FILE, JSON.stringify(buildInfo, null, 2))
    
    // Also save to dist folder for runtime access
    const distDir = path.dirname(DIST_VERSION_FILE)
    if (!fs.existsSync(distDir)) {
      fs.mkdirSync(distDir, { recursive: true })
    }
    fs.writeFileSync(DIST_VERSION_FILE, JSON.stringify(buildInfo, null, 2))

    console.log('✅ Build version information saved')
    console.log(`   Build: ${buildInfo.buildVersion} (${buildInfo.buildNumber})`)
    console.log(`   Date: ${buildInfo.buildDate}`)
    console.log(`   Git: ${buildInfo.gitCommit}`)

    return buildInfo
  } catch (error) {
    console.warn('⚠️  Failed to save build info:', error.message)
    return null
  }
}

/**
 * Restore build version information after deployment
 */
function restoreBuildInfo() {
  try {
    if (!fs.existsSync(BUILD_INFO_FILE)) {
      console.log('ℹ️  No previous build info to restore')
      return null
    }

    const buildInfo = JSON.parse(fs.readFileSync(BUILD_INFO_FILE, 'utf8'))
    
    // Restore to dist folder
    const distDir = path.dirname(DIST_VERSION_FILE)
    if (!fs.existsSync(distDir)) {
      fs.mkdirSync(distDir, { recursive: true })
    }
    fs.writeFileSync(DIST_VERSION_FILE, JSON.stringify(buildInfo, null, 2))

    console.log('✅ Build version information restored')
    console.log(`   Previous Build: ${buildInfo.buildVersion} (${buildInfo.buildNumber})`)
    console.log(`   Date: ${buildInfo.buildDate}`)

    return buildInfo
  } catch (error) {
    console.warn('⚠️  Failed to restore build info:', error.message)
    return null
  }
}

/**
 * Get current build information
 */
function getBuildInfo() {
  try {
    if (fs.existsSync(BUILD_INFO_FILE)) {
      return JSON.parse(fs.readFileSync(BUILD_INFO_FILE, 'utf8'))
    }
    if (fs.existsSync(DIST_VERSION_FILE)) {
      return JSON.parse(fs.readFileSync(DIST_VERSION_FILE, 'utf8'))
    }
    return null
  } catch (error) {
    return null
  }
}

/**
 * Get git commit hash if available
 */
function getBuildCommitHash() {
  try {
    const { execSync } = require('child_process')
    const hash = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim()
    return hash
  } catch (error) {
    return 'unknown'
  }
}

/**
 * Generate incremental build number
 */
function generateBuildNumber() {
  try {
    const currentInfo = getBuildInfo()
    const currentBuildNumber = currentInfo ? (currentInfo.buildNumber || 0) : 0
    return currentBuildNumber + 1
  } catch (error) {
    return 1
  }
}

module.exports = {
  saveBuildInfo,
  restoreBuildInfo,
  getBuildInfo
}

// CLI usage
if (require.main === module) {
  const action = process.argv[2]
  
  switch (action) {
    case 'save':
      saveBuildInfo()
      break
    case 'restore':
      restoreBuildInfo()
      break
    case 'info':
      const info = getBuildInfo()
      if (info) {
        console.log('Current Build Info:')
        Object.entries(info).forEach(([key, value]) => {
          console.log(`  ${key}: ${value}`)
        })
      } else {
        console.log('No build information available')
      }
      break
    default:
      console.log('Usage: node build-version-manager.js [save|restore|info]')
  }
}