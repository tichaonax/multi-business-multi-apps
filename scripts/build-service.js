#!/usr/bin/env node

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const util = require('util');

const execAsync = util.promisify(exec);
const SERVICE_NAME = 'multibusinesssyncservice.exe';
const SC = process.env.SC_COMMAND || 'sc.exe';
const DIST_PATH = path.join(__dirname, '..', 'dist');

/**
 * Check if the sync service is currently running
 */
async function isServiceRunning() {
  try {
    const { stdout } = await execAsync(`${SC} query ${SERVICE_NAME}`);
    
    if (stdout.includes('RUNNING')) {
      return true;
    }
    
    if (stdout.includes('STOPPED') || stdout.includes('STOP_PENDING')) {
      return false;
    }
    
    return false;
  } catch (error) {
    // If sc query fails, service might be uninstalled
    if (error.message.includes('1060') || error.message.toLowerCase().includes('does not exist')) {
      console.log('ℹ️  Service not installed - proceeding with build');
      return false;
    }
    
    // For other errors, assume service is not running
    console.warn('⚠️  Could not determine service status, assuming stopped');
    return false;
  }
}

/**
 * Clean the dist folder with version preservation
 */
function cleanDistFolder() {
  if (fs.existsSync(DIST_PATH)) {
    console.log('🧹 Cleaning dist folder for fresh build...');
    
    try {
      // Preserve build version info before cleaning
      const { saveBuildInfo } = require('./build-version-manager')
      saveBuildInfo()
      
      // Remove recursively (cross-platform)
      fs.rmSync(DIST_PATH, { recursive: true, force: true });
      console.log('✅ dist folder cleaned (build info preserved)');
    } catch (error) {
      console.warn('⚠️  Could not clean dist folder:', error.message);
      console.log('   Proceeding with build anyway...');
    }
  } else {
    console.log('ℹ️  No dist folder to clean');
  }
}

/**
 * Build the TypeScript service files
 */
async function buildService() {
  console.log('🔨 Building TypeScript service files...');
  
  try {
    const { stdout, stderr } = await execAsync('npx tsc --project tsconfig.service.json');
    
    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);
    
    // Verify build output exists
    const serviceScript = path.join(DIST_PATH, 'service', 'sync-service-runner.js');
    if (!fs.existsSync(serviceScript)) {
      throw new Error(`Build failed - service script not found: ${serviceScript}`);
    }
    
    // Save and restore build information after successful build
    const { saveBuildInfo, restoreBuildInfo } = require('./build-version-manager')
    const buildInfo = saveBuildInfo()
    
    // Restore build info to dist folder
    restoreBuildInfo()
    
    console.log('✅ Service build completed successfully');
    
    // Show some build info
    const stats = fs.statSync(serviceScript);
    console.log(`📄 Main service file: ${serviceScript}`);
    console.log(`📅 Built: ${stats.mtime.toLocaleString()}`);
    console.log(`📏 Size: ${Math.round(stats.size / 1024)}KB`);
    
    if (buildInfo) {
      console.log(`🏷️  Build Version: ${buildInfo.buildVersion} (${buildInfo.buildNumber})`);
    }
    
  } catch (error) {
    console.error('❌ Service build failed:', error.message);
    throw error;
  }
}

/**
 * Stop the service and wait for it to fully stop
 */
async function stopServiceAndWait() {
  console.log('🛑 Stopping Windows service for safe rebuild...');

  try {
    // Try to stop the service
    await execAsync('node scripts/sync-service-stop.js');
    console.log('✅ Service stop command sent');

    // Wait for service to fully stop (check status with retries)
    const maxRetries = 10;
    const retryDelay = 2000; // 2 seconds

    for (let i = 0; i < maxRetries; i++) {
      await new Promise(resolve => setTimeout(resolve, retryDelay));

      const isRunning = await isServiceRunning();
      if (!isRunning) {
        console.log('✅ Service has stopped completely');
        return true;
      }

      console.log(`   Waiting for service to stop... (${i + 1}/${maxRetries})`);
    }

    console.log('⚠️  Service did not stop within expected time, proceeding anyway...');
    return false;

  } catch (error) {
    console.warn(`⚠️  Could not stop service: ${error.message}`);
    console.log('   Proceeding with build anyway...');
    return false;
  }
}

/**
 * Main build process
 */
async function main() {
  try {
    console.log('🔍 Smart Service Build Process');
    console.log('================================\n');

    // Step 1: Check if service is running
    console.log('1️⃣  Checking service status...');
    const serviceRunning = await isServiceRunning();

    if (serviceRunning) {
      console.log('⚠️  Sync service is currently RUNNING');
      console.log('');
      console.log('🔄 Automatically stopping service for safe rebuild...');
      await stopServiceAndWait();
      console.log('');
    } else {
      console.log('✅ Service is stopped - safe to rebuild');
      console.log('');
    }
    
    // Step 2: Clean dist folder
    console.log('2️⃣  Cleaning old build files...');
    cleanDistFolder();
    console.log('');
    
    // Step 3: Build TypeScript
    console.log('3️⃣  Compiling TypeScript...');
    await buildService();
    console.log('');
    
    console.log('🎉 Build process completed successfully!');
    console.log('');
    console.log('📋 Next steps:');
    console.log('   • Start the service: npm run sync-service:start');
    console.log('   • Check status: npm run sync-service:status');
    console.log('   • View logs: Check Windows Event Viewer or service logs');
    
  } catch (error) {
    console.error('💥 Build process failed:', error.message);
    process.exit(1);
  }
}

// Run if this script is executed directly
if (require.main === module) {
  main();
}

module.exports = { isServiceRunning, cleanDistFolder, buildService };