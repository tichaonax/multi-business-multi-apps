/**
 * Install Multi-Business Sync Service as Windows Service
 * First performs clean uninstall of any existing service, then installs fresh
 */

const Service = require('node-windows').Service;
const { exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const fs = require('fs');
const execAsync = promisify(exec);

// Import uninstall functionality
async function performCleanUninstall() {
  const serviceInternalName = 'multibusinesssyncservice.exe';
  const SC_CMD = 'sc.exe';
  
  // Check if service exists
  const checkServiceExists = async () => {
    try {
      const { stdout } = await execAsync(`${SC_CMD} query "${serviceInternalName}"`);
      return !stdout.includes('does not exist');
    } catch (error) {
      return false;
    }
  };
  
  // Get service status
  const getServiceStatus = async () => {
    try {
      const { stdout } = await execAsync(`${SC_CMD} query "${serviceInternalName}"`);
      if (stdout.includes('RUNNING')) return 'RUNNING';
      if (stdout.includes('STOPPED')) return 'STOPPED';
      if (stdout.includes('START_PENDING')) return 'START_PENDING';
      if (stdout.includes('STOP_PENDING')) return 'STOP_PENDING';
      return 'UNKNOWN';
    } catch (error) {
      return 'NOT_FOUND';
    }
  };
  
  console.log('🔍 Checking for existing service...');
  
  const serviceExists = await checkServiceExists();
  if (!serviceExists) {
    console.log('   ✅ No existing service found');
    return;
  }
  
  console.log('   ⚠️  Existing service detected - performing clean removal');
  console.log('');
  
  // Step 1: Stop the service and wait for it to complete
  console.log('1️⃣  Stopping existing service...');
  const status = await getServiceStatus();
  
  if (status === 'RUNNING' || status === 'START_PENDING') {
    console.log(`   🔄 Service is ${status}, stopping...`);
    
    try {
      await execAsync(`${SC_CMD} stop "${serviceInternalName}"`);
      console.log('   ⏳ Waiting for service to complete shutdown...');
      
      // Wait for service to fully stop (max 45 seconds for proper cleanup)
      for (let i = 0; i < 45; i++) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        const currentStatus = await getServiceStatus();
        
        if (currentStatus === 'STOPPED') {
          console.log('   ✅ Service stopped and completed cleanup');
          break;
        }
        
        if (currentStatus === 'NOT_FOUND') {
          console.log('   ✅ Service shutdown completed');
          break;
        }
        
        // Show progress every 10 seconds
        if ((i + 1) % 10 === 0) {
          console.log(`   ⏳ Still waiting for service shutdown... (${i + 1}s)`);
        }
      }
      
      // Final status check
      const finalStatus = await getServiceStatus();
      if (finalStatus === 'RUNNING') {
        console.log('   ⚠️  Service did not stop completely, but proceeding with removal');
      }
      
    } catch (error) {
      if (error.message.includes('Access is denied')) {
        throw new Error('ADMIN_REQUIRED');
      }
      console.log(`   ⚠️  Stop command completed with message: ${error.message}`);
    }
  } else if (status === 'STOPPED') {
    console.log('   ✅ Service is already stopped');
  } else {
    console.log(`   📝 Service status: ${status}`);
  }
  
  // Step 2: Remove the service
  console.log('');
  console.log('2️⃣  Removing existing service...');
  
  try {
    const { stdout } = await execAsync(`${SC_CMD} delete "${serviceInternalName}"`);
    console.log('   ✅ Service removed successfully');
    
    // Wait for Windows to process the deletion completely
    console.log('   ⏳ Waiting for Windows to complete service cleanup...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
  } catch (error) {
    if (error.message.includes('Access is denied')) {
      throw new Error('ADMIN_REQUIRED');
    }
    throw error;
  }
  
  // Step 3: Verify removal
  const stillExists = await checkServiceExists();
  if (stillExists) {
    console.log('   ⚠️  Service still appears to exist, but continuing with installation');
  } else {
    console.log('   ✅ Service completely removed');
  }
  
  console.log('');
}

// Ensure the compiled service exists
const serviceScript = path.join(__dirname, '../dist/service/sync-service-runner.js');

if (!fs.existsSync(serviceScript)) {
  console.error('❌ Sync service script not found!');
  console.log('Please build the service first:');
  console.log('  npm run build:service');
  process.exit(1);
}

// Configuration
// Internal service name (used by sc and node-windows). Keep short and matching daemon id.
const serviceInternalName = 'multibusinesssyncservice.exe';
const serviceDisplayName = 'Multi-Business Sync Service';
const serviceDescription = 'Background database synchronization service for Multi-Business Management Platform';

const svc = new Service({
  name: serviceInternalName,
  displayName: serviceDisplayName,
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
      value: process.env.SYNC_REGISTRATION_KEY || "b3f1c9d7a5e4f2c3819d6b7a2e4f0c1d2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7"
    },
    {
      name: "SYNC_PORT",
  value: process.env.SYNC_PORT || "8765"
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
  console.log(`Service Name: ${serviceDisplayName}`);
  console.log(`Service ID: ${serviceInternalName}`);
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
  console.log(`  Name: ${serviceDisplayName}`);
  console.log(`  ID: ${serviceInternalName}`);
  console.log(`  Description: ${serviceDescription}`);
  console.log(`  Script: ${serviceScript}`);
  console.log(`  Registration Key: ${process.env.SYNC_REGISTRATION_KEY ? '***' : 'DEFAULT (CHANGE IN PRODUCTION)'}`);
  console.log(`  Port: ${process.env.SYNC_PORT || '8765'}`);
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

// Main installation process with clean uninstall first
async function runInstallation() {
  try {
    // Step 1: Clean uninstall any existing service
    await performCleanUninstall();
    
    // Step 2: Proceed with fresh installation
    console.log('🔧 Installing Multi-Business Sync Service as Windows Service...');
    console.log('');
    
    // Show configuration
    console.log('Configuration:');
    console.log(`  Service Name: ${serviceDisplayName}`);
    console.log(`  Service ID: ${serviceInternalName}`);
    console.log(`  Script Path: ${serviceScript}`);
    console.log(`  Registration Key: ${process.env.SYNC_REGISTRATION_KEY ? '***' : 'DEFAULT (⚠️  CHANGE IN PRODUCTION)'}`);
    console.log(`  Port: ${process.env.SYNC_PORT || '8765'}`);
    console.log(`  Sync Interval: ${process.env.SYNC_INTERVAL || '30000'}ms`);
    console.log(`  Log Level: ${process.env.LOG_LEVEL || 'info'}`);
    console.log('');
    
    // Security warning
    if (!process.env.SYNC_REGISTRATION_KEY || process.env.SYNC_REGISTRATION_KEY === 'b3f1c9d7a5e4f2c3819d6b7a2e4f0c1d2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7') {
      console.log('⚠️  WARNING: Using default registration key!');
      console.log('   Set SYNC_REGISTRATION_KEY environment variable for production use.');
      console.log('   Example: set SYNC_REGISTRATION_KEY=your-secure-key-here');
      console.log('');
    }
    
    // Step 3: Install the fresh service
    console.log('3️⃣  Installing fresh service...');
    svc.install();
    
  } catch (error) {
    if (error.message === 'ADMIN_REQUIRED') {
      console.log('');
      console.log('🔐 Administrator privileges required!');
      console.log('');
      console.log('The installation process needs to manage Windows services.');
      console.log('Please run this command from an Administrator terminal:');
      console.log('');
      console.log('To fix this:');
      console.log('  1. Close this terminal');
      console.log('  2. Open PowerShell as Administrator:');
      console.log('     - Right-click Start button');
      console.log('     - Select "Windows PowerShell (Admin)" or "Terminal (Admin)"');
      console.log('  3. Navigate to project directory:');
      console.log(`     cd "${process.cwd()}"`);
      console.log('  4. Run install again:');
      console.log('     npm run sync-service:install');
      console.log('');
    } else {
      console.error('❌ Installation failed:', error.message);
    }
    process.exit(1);
  }
}

// Start the installation process
runInstallation();
