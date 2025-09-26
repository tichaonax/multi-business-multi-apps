/**
 * Uninstall Multi-Business Sync Service Windows Service
 * Based on electricity-tokens service installation framework
 */

const Service = require('node-windows').Service;
const path = require('path');

// Service configuration
const serviceName = 'Multi-Business Sync Service';
const serviceScript = path.join(__dirname, '../dist/service/sync-service-runner.js');

const svc = new Service({
  name: serviceName,
  script: serviceScript
});

// Event handlers
svc.on('uninstall', function() {
  console.log('✅ Multi-Business Sync Service uninstalled successfully!');
  console.log('');
  console.log('The background sync service has been removed from Windows Services.');
  console.log('Database synchronization will no longer run automatically.');
  console.log('');
  console.log('To reinstall:');
  console.log('  npm run sync-service:install');
});

svc.on('doesnotexist', function() {
  console.log('⚠️  Multi-Business Sync Service does not exist or is not installed.');
  console.log('');
  console.log('To check if any sync services are running:');
  console.log('  npm run sync-service:status');
  console.log('');
  console.log('To install the sync service:');
  console.log('  npm run sync-service:install');
});

svc.on('stop', function() {
  console.log('⏹️  Sync service stopped before uninstall.');
});

svc.on('error', function(err) {
  console.error('❌ Error uninstalling sync service:', err);
  console.log('');
  console.log('Troubleshooting:');
  console.log('  1. Ensure you have administrator privileges');
  console.log('  2. Try stopping the service first:');
  console.log('     npm run sync-service:stop');
  console.log('  3. Check Windows Services manually:');
  console.log('     services.msc → Look for "Multi-Business Sync Service"');
  console.log('  4. Check Windows Event Viewer for detailed errors');
});

// Uninstallation process
console.log('🔧 Uninstalling Multi-Business Sync Service...');
console.log('');
console.log('This will:');
console.log('  • Stop the sync service if running');
console.log('  • Remove the service from Windows Services');
console.log('  • Disable automatic database synchronization');
console.log('');

svc.uninstall();