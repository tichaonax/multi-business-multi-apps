#!/usr/bin/env node
/**
 * Electron Kiosk Startup Script
 *
 * This script:
 * 1. Waits for the Next.js server to be ready (http://localhost:PORT)
 * 2. Starts Electron in kiosk mode (POS + Customer Display)
 *
 * Add this to Windows Startup folder to auto-start Electron on login
 */

const { spawn } = require('child_process');
const http = require('http');
const path = require('path');

// Configuration
const SERVER_PORT = process.env.PORT || process.env.NEXT_PUBLIC_PORT || 8080;
const SERVER_URL = `http://localhost:${SERVER_PORT}`;
const MAX_WAIT_TIME = 120000; // 2 minutes max wait
const CHECK_INTERVAL = 2000; // Check every 2 seconds

console.log('🖥️  Multi-Business Platform - Electron Kiosk Startup');
console.log(`📡 Waiting for server at ${SERVER_URL}...`);

/**
 * Check if server is ready
 */
function checkServerReady() {
  return new Promise((resolve) => {
    const req = http.get(SERVER_URL, (res) => {
      resolve(res.statusCode === 200 || res.statusCode === 304);
    });

    req.on('error', () => {
      resolve(false);
    });

    req.setTimeout(5000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

/**
 * Wait for server to be ready
 */
async function waitForServer() {
  const startTime = Date.now();
  let attempts = 0;

  while (Date.now() - startTime < MAX_WAIT_TIME) {
    attempts++;
    const ready = await checkServerReady();

    if (ready) {
      console.log(`✅ Server is ready! (after ${attempts} attempts, ${Math.round((Date.now() - startTime) / 1000)}s)`);
      return true;
    }

    // Show progress
    if (attempts % 5 === 0) {
      console.log(`⏳ Still waiting for server... (${Math.round((Date.now() - startTime) / 1000)}s elapsed)`);
    }

    // Wait before next check
    await new Promise(resolve => setTimeout(resolve, CHECK_INTERVAL));
  }

  console.error(`❌ Server did not start within ${MAX_WAIT_TIME / 1000}s`);
  console.error('Please check if the service is running:');
  console.error('  sc query multibusinesssyncservice.exe');
  return false;
}

/**
 * Start Electron kiosk
 */
function startElectron() {
  console.log('🚀 Starting Electron kiosk...');

  const electronPath = path.join(__dirname, '..', 'electron');

  const electronProcess = spawn('npm', ['start'], {
    cwd: electronPath,
    stdio: 'inherit',
    shell: true,
    env: {
      ...process.env,
      PORT: SERVER_PORT,
      NODE_ENV: process.env.NODE_ENV || 'production'
    }
  });

  electronProcess.on('error', (error) => {
    console.error('❌ Failed to start Electron:', error.message);
    process.exit(1);
  });

  electronProcess.on('exit', (code, signal) => {
    console.log(`Electron exited with code ${code}, signal ${signal}`);
    process.exit(code || 0);
  });

  console.log('✅ Electron kiosk started');
  console.log('   - POS window on primary monitor');
  console.log('   - Customer display on secondary monitor (if connected)');
}

/**
 * Main execution
 */
async function main() {
  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  console.log('  Multi-Business Platform - Kiosk Mode Startup');
  console.log('═══════════════════════════════════════════════════════');
  console.log('');

  // Wait for server
  const serverReady = await waitForServer();

  if (!serverReady) {
    console.error('');
    console.error('💡 Troubleshooting:');
    console.error('  1. Check if service is running: sc query multibusinesssyncservice.exe');
    console.error('  2. Start service: npm run service:start');
    console.error('  3. Check logs: type logs\\service.log');
    console.error('');
    process.exit(1);
  }

  // Start Electron
  startElectron();
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down...');
  process.exit(0);
});

// Run
main().catch((error) => {
  console.error('❌ Startup failed:', error.message);
  process.exit(1);
});
