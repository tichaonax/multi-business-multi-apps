/**
 * Uninstall Multi-Business Sync Service Windows Service
 * Uses direct Windows sc.exe commands to match hybrid installation method
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// Service configuration - matches hybrid service config
const serviceInternalName = 'multibusinesssyncservice.exe';
const serviceDisplayName = 'Multi-Business Sync Service';
const SC_CMD = 'sc.exe';

// Check if service exists using Windows sc command
async function checkServiceExists() {
  try {
    const { stdout } = await execAsync(`${SC_CMD} query "${serviceInternalName}"`);
    return !stdout.includes('does not exist');
  } catch (error) {
    return false;
  }
}

// Get current service status
async function getServiceStatus() {
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
}

// Stop the service if running
async function stopService() {
  const status = await getServiceStatus();
  
  if (status === 'STOPPED') {
    console.log('   ✅ Service is already stopped');
    return true;
  }
  
  if (status === 'NOT_FOUND') {
    console.log('   ⚠️  Service not found');
    return false;
  }
  
  console.log(`   🔄 Service is ${status}, attempting to stop...`);
  
  try {
    const { stdout, stderr } = await execAsync(`${SC_CMD} stop "${serviceInternalName}"`);
    
    if (stderr && stderr.includes('Access is denied')) {
      throw new Error('Access denied - requires administrator privileges');
    }
    
    console.log('   ⏳ Waiting for service to stop...');
    
    // Wait for service to fully stop (max 30 seconds)
    for (let i = 0; i < 30; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const currentStatus = await getServiceStatus();
      
      if (currentStatus === 'STOPPED') {
        console.log('   ✅ Service stopped successfully');
        return true;
      }
      
      if (currentStatus === 'NOT_FOUND') {
        console.log('   ✅ Service no longer exists');
        return true;
      }
    }
    
    console.log('   ⚠️  Service did not stop within 30 seconds, proceeding anyway');
    return true;
    
  } catch (error) {
    if (error.message.includes('Access is denied')) {
      throw error;
    }
    
    // Service might already be stopped or stopping
    console.log(`   ⚠️  Stop command failed: ${error.message}`);
    return true;
  }
}

// Delete the service
async function deleteService() {
  console.log('   🗑️  Deleting service from Windows Services...');
  
  try {
    const { stdout, stderr } = await execAsync(`${SC_CMD} delete "${serviceInternalName}"`);
    
    if (stderr && stderr.includes('Access is denied')) {
      throw new Error('Access denied - requires administrator privileges');
    }
    
    if (stdout.includes('[SC] DeleteService SUCCESS')) {
      console.log('   ✅ Service deleted successfully');
      return true;
    } else {
      console.log(`   ⚠️  Delete result: ${stdout.trim()}`);
      return true; // Assume success even if message is different
    }
    
  } catch (error) {
    if (error.message.includes('Access is denied')) {
      throw error;
    }
    
    throw new Error(`Failed to delete service: ${error.message}`);
  }
}

// Hybrid uninstall function using direct sc.exe commands
async function attemptUninstall() {
  console.log(`🔧 Uninstalling ${serviceDisplayName}...`);
  console.log(`   Service ID: ${serviceInternalName}`);
  console.log('');
  
  // Check if service exists using Windows
  const serviceExists = await checkServiceExists();
  if (!serviceExists) {
    console.log(`⚠️  ${serviceDisplayName} does not exist or is not installed.`);
    console.log(`   Looked for service: ${serviceInternalName}`);
    console.log('');
    console.log('To check if any sync services are running:');
    console.log('  npm run sync-service:status');
    console.log('');
    console.log('To install the sync service:');
    console.log('  npm run sync-service:install');
    return;
  }
  
  console.log('✅ Service found, proceeding with uninstall...');
  console.log('');
  console.log('This will:');
  console.log('  • Stop the sync service if running');
  console.log('  • Remove the service from Windows Services');
  console.log('  • Disable automatic database synchronization');
  console.log('');
  
  try {
    // Step 1: Stop the service
    console.log('1️⃣  Stopping service...');
    await stopService();
    console.log('');
    
    // Step 2: Delete the service
    console.log('2️⃣  Removing service...');
    await deleteService();
    console.log('');
    
    // Step 3: Verify removal
    console.log('3️⃣  Verifying removal...');
    const stillExists = await checkServiceExists();
    if (stillExists) {
      console.log('   ⚠️  Service still appears in Windows Services');
      console.log('   ⚠️  It may take a moment for Windows to update the service list');
    } else {
      console.log('   ✅ Service successfully removed from Windows Services');
    }
    console.log('');
    
    // Success message
    console.log(`✅ ${serviceDisplayName} uninstalled successfully!`);
    console.log('   • Background sync service has been removed');
    console.log('   • Database synchronization will no longer run automatically');
    console.log('');
    console.log('To reinstall the service:');
    console.log('  npm run sync-service:install');
    console.log('');
    console.log('To check status:');
    console.log('  npm run sync-service:status');
    
  } catch (error) {
    console.log('');
    console.log('❌ Uninstall failed:', error.message);
    console.log('');
    
    if (error.message.includes('Access is denied')) {
      console.log('🔐 Administrator privileges required!');
      console.log('');
      console.log('To fix this:');
      console.log('  1. Close this terminal');
      console.log('  2. Open PowerShell as Administrator:');
      console.log('     - Right-click Start button');
      console.log('     - Select "Windows PowerShell (Admin)" or "Terminal (Admin)"');
      console.log('  3. Navigate to project directory:');
      console.log(`     cd "${process.cwd()}"`);
      console.log('  4. Run uninstall again:');
      console.log('     npm run sync-service:uninstall');
    } else {
      console.log('Manual uninstall options:');
      console.log('  1. Use Windows Services (services.msc):');
      console.log('     - Find "Multi-Business Sync Service" or "MultiBusinessSyncService"');
      console.log('     - Right-click → Stop (if running)');
      console.log('     - Right-click → Delete');
      console.log('');
      console.log('  2. Use administrator command prompt:');
      console.log(`     sc.exe stop "${serviceInternalName}"`);
      console.log(`     sc.exe delete "${serviceInternalName}"`);
    }
    
    console.log('');
    process.exit(1);
  }
}

// Run the uninstall
attemptUninstall().catch((error) => {
  console.error('💥 Uninstall process failed:', error.message);
  process.exit(1);
});
