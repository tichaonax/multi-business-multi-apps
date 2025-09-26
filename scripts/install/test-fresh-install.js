#!/usr/bin/env node
/**
 * Test fresh install script
 * Drops the existing database and runs the full service installer in a non-interactive way.
 * Usage: node scripts/install/test-fresh-install.js
 */

const { execSync } = require('child_process')
const path = require('path')

const projectRoot = path.resolve(__dirname, '..', '..')
const installerScript = path.join(projectRoot, 'scripts', 'install', 'install-service.js')

try {
  console.log('Running fresh install test: dropping DB and reinstalling service')

  // Set env var to ensure installer drops the DB first
  const env = Object.assign({}, process.env, { INSTALL_FRESH: 'true', INSTALL_DATABASE: 'true', CREATE_SERVICE: 'false', START_SERVICE: 'false' })

  // Run installer
  execSync(`node "${installerScript}"`, { stdio: 'inherit', env })

  console.log('\nFresh install test completed')
  process.exit(0)
} catch (err) {
  console.error('Fresh install test failed:', err.message)
  process.exit(1)
}
