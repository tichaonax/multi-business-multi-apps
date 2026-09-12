#!/usr/bin/env node
/**
 * Multi-Business Service Status Checker
 * Comprehensive status check using .exe service name
 */

const { exec } = require('child_process');
const path = require('path');

/**
 * Check if the Windows service is installed and running
 */
function checkWindowsService() {
  return new Promise((resolve) => {
    // Use .exe service name for consistency with Windows service management
    const serviceName = 'multibusinesssyncservice.exe';

    exec(`sc.exe query ${serviceName}`, (error, stdout, stderr) => {
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
  console.log('🔍 Multi-Business Service Status Check');
  console.log('=' .repeat(50));
  console.log('');

  // Check Windows service
  const service = await checkWindowsService();
  console.log('🔧 Windows Service:');
  console.log(`   Installed: ${service.installed ? '✅ Yes' : '❌ No'}`);
  if (service.installed) {
    console.log(`   Status: ${service.running ? '✅ Running' : '⏹️  Stopped'}`);
  } else {
    console.log('   💡 Install with: npm run service:install');
  }
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
  if (!service.installed) {
    console.log('   ⚠️  Service not installed');
    console.log('   👉 Run: npm run service:install');
  } else if (!service.running) {
    console.log('   ⚠️  Service installed but not running');
    console.log('   👉 Run: npm run service:start');
  } else {
    console.log('   ✅ Service is running');
  }
  console.log('');

  // Management commands
  console.log('🎛️  Management Commands:');
  console.log('   npm run service:install    - Install as Windows service');
  console.log('   npm run service:uninstall  - Remove Windows service');
  console.log('   npm run service:start      - Start the service');
  console.log('   npm run service:stop       - Stop the service');
  console.log('   npm run service:restart    - Restart the service');
  console.log('   npm run service:status     - Show this status (current command)');
  console.log('');
}

// Run status check
main().catch(error => {
  console.error('❌ Status check failed:', error);
  process.exit(1);
});