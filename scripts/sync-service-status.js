#!/usr/bin/env node
// Lightweight status checker for the Windows service using `sc query`.
// Prints a user-friendly summary and exits.

const { spawnSync } = require('child_process');
const serviceName = 'Multi-Business Sync Service';

function runScQuery() {
  try {
    const res = spawnSync('sc', ['query', '"' + serviceName + '"'], { encoding: 'utf8' });
    if (res.error) {
      console.error('Failed to run `sc query`. Are you on Windows or is `sc` unavailable?');
      process.exit(2);
    }
    return res.stdout || res.stderr || '';
  } catch (err) {
    console.error('Error running sc query:', err.message || err);
    process.exit(2);
  }
}

function parseScOutput(out) {
  const lines = out.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return { installed: false };
  const result = { installed: false, state: 'UNKNOWN', raw: out };
  for (const line of lines) {
    if (/SERVICE_NAME:/i.test(line)) result.name = line.split(':').slice(1).join(':').trim();
    const m = line.match(/STATE\s*:\s*\d+\s*(\w+)/i);
    if (m) {
      result.installed = true;
      result.state = m[1];
    }
    const pidm = line.match(/PID\s*:\s*(\d+)/i);
    if (pidm) result.pid = pidm[1];
  }
  return result;
}

const out = runScQuery();
if (!out || /FAILED 1060/.test(out)) {
  console.log('Service not installed: %s', serviceName);
  process.exit(0);
}
const parsed = parseScOutput(out);
if (!parsed.installed) {
  console.log('Service not installed or could not parse sc output. Raw output:\n');
  console.log(out);
  process.exit(0);
}
console.log('Service: %s', parsed.name || serviceName);
console.log('State: %s', parsed.state);
if (parsed.pid) console.log('PID: %s', parsed.pid);
process.exit(0);
/**
 * Check Multi-Business Sync Service Status
 * Based on electricity-tokens service status checking
 */

const { exec } = require('child_process');
const path = require('path');

/**
 * Check if the Windows service is installed and running
 */
function checkWindowsService() {
  return new Promise((resolve) => {
    const serviceName = 'Multi-Business Sync Service';

    exec(`sc query "${serviceName}"`, (error, stdout, stderr) => {
      if (error) {
        resolve({
          installed: false,
          running: false,
          message: 'Service not installed'
        });
        return;
      }

      const isRunning = stdout.includes('RUNNING');
      const isStopped = stdout.includes('STOPPED');

      resolve({
        installed: true,
        running: isRunning,
        stopped: isStopped,
        message: isRunning ? 'Service is running' : 'Service is stopped'
      });
    });
  });
}

/**
 * Check if the sync service script exists
 */
function checkServiceScript() {
  const fs = require('fs');
  const serviceScript = path.join(__dirname, '../dist/service/sync-service-runner.js');

  return {
    exists: fs.existsSync(serviceScript),
    path: serviceScript
  };
}

/**
 * Get service configuration
 */
function getServiceConfig() {
  return {
    registrationKey: process.env.SYNC_REGISTRATION_KEY || 'default-registration-key-change-in-production',
    port: process.env.SYNC_PORT || '3001',
    syncInterval: process.env.SYNC_INTERVAL || '30000',
    logLevel: process.env.LOG_LEVEL || 'info',
    isDefaultKey: !process.env.SYNC_REGISTRATION_KEY || process.env.SYNC_REGISTRATION_KEY === 'default-registration-key-change-in-production'
  };
}

/**
 * Check network connectivity
 */
function checkNetwork() {
  return new Promise((resolve) => {
    const { networkInterfaces } = require('os');
    const interfaces = networkInterfaces();

    let hasNetwork = false;
    let ipAddresses = [];

    for (const [name, nets] of Object.entries(interfaces)) {
      if (nets) {
        for (const net of nets) {
          if (!net.internal && net.family === 'IPv4') {
            hasNetwork = true;
            ipAddresses.push({
              interface: name,
              address: net.address
            });
          }
        }
      }
    }

    resolve({
      hasNetwork,
      ipAddresses
    });
  });
}

/**
 * Main status check
 */
async function main() {
  console.log('🔍 Multi-Business Sync Service Status Check');
  console.log('=' .repeat(50));
  console.log('');

  // Check service script
  const script = checkServiceScript();
  console.log('📁 Service Script:');
  console.log(`   Exists: ${script.exists ? '✅ Yes' : '❌ No'}`);
  console.log(`   Path: ${script.path}`);

  if (!script.exists) {
    console.log('   💡 Build the service with: npm run build:service');
  }
  console.log('');

  // Check Windows service
  const service = await checkWindowsService();
  console.log('🔧 Windows Service:');
  console.log(`   Installed: ${service.installed ? '✅ Yes' : '❌ No'}`);
  if (service.installed) {
    console.log(`   Status: ${service.running ? '✅ Running' : '⏹️  Stopped'}`);
  } else {
    console.log('   💡 Install with: npm run sync-service:install');
  }
  console.log('');

  // Check configuration
  const config = getServiceConfig();
  console.log('⚙️  Configuration:');
  console.log(`   Registration Key: ${config.isDefaultKey ? '⚠️  DEFAULT (CHANGE IN PRODUCTION)' : '✅ Custom'}`);
  console.log(`   Port: ${config.port}`);
  console.log(`   Sync Interval: ${config.syncInterval}ms`);
  console.log(`   Log Level: ${config.logLevel}`);
  console.log('');

  // Check network
  const network = await checkNetwork();
  console.log('🌐 Network:');
  console.log(`   Available: ${network.hasNetwork ? '✅ Yes' : '❌ No'}`);
  if (network.hasNetwork) {
    console.log('   IP Addresses:');
    network.ipAddresses.forEach(addr => {
      console.log(`     ${addr.interface}: ${addr.address}`);
    });
  }
  console.log('');

  // Overall status
  console.log('📊 Overall Status:');
  if (!script.exists) {
    console.log('   ❌ Service script not built');
    console.log('   👉 Run: npm run build:service');
  } else if (!service.installed) {
    console.log('   ⚠️  Service not installed');
    console.log('   👉 Run: npm run sync-service:install');
  } else if (!service.running) {
    console.log('   ⚠️  Service installed but not running');
    console.log('   👉 Run: npm run sync-service:start');
  } else {
    console.log('   ✅ Service is running and ready for sync');
    if (config.isDefaultKey) {
      console.log('   ⚠️  Using default registration key');
      console.log('   👉 Set SYNC_REGISTRATION_KEY environment variable');
    }
  }
  console.log('');

  // Management commands
  console.log('🎛️  Management Commands:');
  console.log('   npm run build:service           - Build the sync service');
  console.log('   npm run sync-service:install    - Install as Windows service');
  console.log('   npm run sync-service:uninstall  - Remove Windows service');
  console.log('   npm run sync-service:start      - Start the service');
  console.log('   npm run sync-service:stop       - Stop the service');
  console.log('   npm run sync-service:restart    - Restart the service');
  console.log('   npm run sync-service:status     - Show this status (current command)');
  console.log('');

  // Environment variables help
  if (config.isDefaultKey) {
    console.log('🔐 Security Setup:');
    console.log('   Set environment variables for production:');
    console.log('   set SYNC_REGISTRATION_KEY=your-secure-key-here');
    console.log('   set SYNC_PORT=3001');
    console.log('   set SYNC_INTERVAL=30000');
    console.log('   set LOG_LEVEL=info');
    console.log('');
  }
}

// Run status check
main().catch(error => {
  console.error('❌ Status check failed:', error);
  process.exit(1);
});