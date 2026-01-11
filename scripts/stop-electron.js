#!/usr/bin/env node
/**
 * Stop Electron Kiosk
 *
 * Kills all running Electron processes for this application
 */

const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

async function stopElectron() {
  console.log('🛑 Stopping Electron kiosk...');

  try {
    // On Windows, find and kill Electron processes
    if (process.platform === 'win32') {
      // Try to kill gracefully first
      try {
        await execAsync('taskkill /IM electron.exe /T');
        console.log('✅ Electron stopped gracefully');
        return;
      } catch (error) {
        // If graceful kill fails, check if any Electron is running
        try {
          const { stdout } = await execAsync('tasklist /FI "IMAGENAME eq electron.exe"');

          if (stdout.includes('electron.exe')) {
            // Force kill if graceful failed
            console.log('⚠️  Graceful stop failed, forcing...');
            await execAsync('taskkill /F /IM electron.exe /T');
            console.log('✅ Electron stopped (forced)');
          } else {
            console.log('ℹ️  Electron is not running');
          }
        } catch (checkError) {
          console.log('ℹ️  Electron is not running');
        }
      }
    } else {
      // On Linux/Mac
      try {
        await execAsync('pkill -f electron');
        console.log('✅ Electron stopped');
      } catch (error) {
        console.log('ℹ️  Electron is not running');
      }
    }

  } catch (error) {
    console.error('❌ Error stopping Electron:', error.message);
    process.exit(1);
  }
}

// Run
stopElectron().catch((error) => {
  console.error('Failed to stop Electron:', error.message);
  process.exit(1);
});
