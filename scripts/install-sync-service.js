/**
 * Install Multi-Business Sync Service as Windows Service
 * Based on electricity-tokens service installation framework
 */

const Service = require('node-windows').Service;
const path = require('path');
const fs = require('fs');

// Ensure the compiled service exists
const serviceScript = path.join(__dirname, '../dist/service/sync-service-runner.js');

if (!fs.existsSync(serviceScript)) {
  console.error('❌ Sync service script not found!');
  console.log('Please build the service first:');
  console.log('  npm run build:service');
  process.exit(1);
}

// Configuration
const serviceName = 'Multi-Business Sync Service';
const serviceDescription = 'Background database synchronization service for Multi-Business Management Platform';

const svc = new Service({
  name: serviceName,
  description: serviceDescription,
  script: serviceScript,
  nodeOptions: [
    '--harmony',
    '--max_old_space_size=2048' // 2GB memory limit for sync service
  ],
  env: [
    {
      name: "NODE_ENV",
      value: "production"
    },
    {
      name: "SYNC_REGISTRATION_KEY",
      value: process.env.SYNC_REGISTRATION_KEY || "default-registration-key-change-in-production"
    },
    {
      name: "SYNC_PORT",
      value: process.env.SYNC_PORT || "3001"
    },
    {
      name: "SYNC_INTERVAL",
      value: process.env.SYNC_INTERVAL || "30000"
    },
    {
      name: "LOG_LEVEL",
      value: process.env.LOG_LEVEL || "info"
    }
  ],
  workingDirectory: path.join(__dirname, '..'),
  allowServiceLogon: true
});

// Event handlers
svc.on('install', function() {
  console.log('✅ Sync service installed successfully!');
  console.log(`Service Name: ${serviceName}`);
  console.log('Starting service...');
  svc.start();
});

svc.on('alreadyinstalled', function() {
  console.log('⚠️  Sync service is already installed.');
  console.log('To reinstall:');
  console.log('  1. npm run sync-service:uninstall');
  console.log('  2. npm run sync-service:install');
});

svc.on('start', function() {
  console.log('🚀 Sync service started successfully!');
  console.log('');
  console.log('Service Details:');
  console.log(`  Name: ${serviceName}`);
  console.log(`  Description: ${serviceDescription}`);
  console.log(`  Script: ${serviceScript}`);
  console.log(`  Registration Key: ${process.env.SYNC_REGISTRATION_KEY ? '***' : 'DEFAULT (CHANGE IN PRODUCTION)'}`);
  console.log(`  Port: ${process.env.SYNC_PORT || '3001'}`);
  console.log(`  Sync Interval: ${process.env.SYNC_INTERVAL || '30000'}ms`);
  console.log(`  Log Level: ${process.env.LOG_LEVEL || 'info'}`);
  console.log('');
  console.log('The sync service is now running in the background and will:');
  console.log('  • Automatically discover peer nodes on the network');
  console.log('  • Synchronize database changes every 30 seconds');
  console.log('  • Resolve conflicts using advanced strategies');
  console.log('  • Continue running even when the main app is closed');
  console.log('');
  console.log('Management Commands:');
  console.log('  npm run sync-service:status    - Check service status');
  console.log('  npm run sync-service:stop      - Stop the service');
  console.log('  npm run sync-service:restart   - Restart the service');
  console.log('  npm run sync-service:uninstall - Remove the service');
});

svc.on('stop', function() {
  console.log('⏹️  Sync service stopped.');
});

svc.on('error', function(err) {
  console.error('❌ Sync service error:', err);
  console.log('');
  console.log('Troubleshooting:');
  console.log('  1. Ensure you have administrator privileges');
  console.log('  2. Check that the service script exists and is built');
  console.log('  3. Verify environment variables are set correctly');
  console.log('  4. Check Windows Event Viewer for detailed errors');
});

// Installation process
console.log('🔧 Installing Multi-Business Sync Service as Windows Service...');
console.log('');

// Show configuration
console.log('Configuration:');
console.log(`  Service Name: ${serviceName}`);
console.log(`  Script Path: ${serviceScript}`);
console.log(`  Registration Key: ${process.env.SYNC_REGISTRATION_KEY ? '***' : 'DEFAULT (⚠️  CHANGE IN PRODUCTION)'}`);
console.log(`  Port: ${process.env.SYNC_PORT || '3001'}`);
console.log(`  Sync Interval: ${process.env.SYNC_INTERVAL || '30000'}ms`);
console.log(`  Log Level: ${process.env.LOG_LEVEL || 'info'}`);
console.log('');

// Security warning
if (!process.env.SYNC_REGISTRATION_KEY || process.env.SYNC_REGISTRATION_KEY === 'default-registration-key-change-in-production') {
  console.log('⚠️  WARNING: Using default registration key!');
  console.log('   Set SYNC_REGISTRATION_KEY environment variable for production use.');
  console.log('   Example: set SYNC_REGISTRATION_KEY=your-secure-key-here');
  console.log('');
}

// Install the service
svc.install();