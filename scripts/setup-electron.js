/**
 * Sets up the Electron app: installs dependencies, rebuilds serialport native binding,
 * and creates the startup shortcut. Run via: npm run electron:setup
 */
const { execSync } = require('child_process')
const path = require('path')
const fs = require('fs')

const ROOT = path.join(__dirname, '..')
const ELECTRON_DIR = path.join(ROOT, 'electron')

function run(cmd, cwd) {
  execSync(cmd, { cwd, stdio: 'inherit' })
}

// 1. Install electron dependencies
console.log('\n[1/3] Installing Electron dependencies...')
run('npm install', ELECTRON_DIR)

// 2. Create startup shortcut
console.log('\n[2/2] Creating startup shortcut...')
try {
  run('node scripts/create-electron-shortcut.js', ROOT)
} catch (e) {
  console.warn('[!] Could not create shortcut:', e.message)
}

console.log('\nElectron setup complete.')
