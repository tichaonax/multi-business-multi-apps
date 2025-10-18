const { promisify } = require('util');
const { exec } = require('child_process');
const Service = require('node-windows').Service;
const config = require('./config');
const path = require('path');
const fs = require('fs');
const HybridServiceManager = require('./hybrid-service-manager');

const execAsync = promisify(exec);

class ForceInstallManager {
  constructor() {
    // Service name always comes from config
    this.serviceName = config.name;
    this.daemonPath = path.join(__dirname, 'daemon');
    this.hybridManager = new HybridServiceManager();
  }

  /**
   * Get Windows service name for sc.exe commands
   * Windows registers services as lowercase with .exe extension
   */
  getScServiceName() {
    let name = this.serviceName.toLowerCase().replace(/\s+/g, '');
    if (!name.endsWith('.exe')) {
      name += '.exe';
    }
    return name;
  }

  async log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${level}] ${message}`);
  }

  async checkAdminPrivileges() {
    const wincmd = require('node-windows');
    return new Promise((resolve) => {
      wincmd.isAdminUser((isAdmin) => {
        resolve(isAdmin);
      });
    });
  }

  async getServiceStatus() {
    // Use HybridServiceManager for status check
    try {
      const status = await this.hybridManager.getServiceStatus();

      if (status.serviceStatus === 'RUNNING') return 'RUNNING';
      if (status.serviceStatus === 'STOPPED') return 'STOPPED';
      if (status.serviceStatus === 'NOT_INSTALLED') return 'NOT_INSTALLED';

      return status.serviceStatus || 'UNKNOWN';
    } catch (err) {
      if (err && String(err).includes('does not exist')) {
        return 'NOT_INSTALLED';
      }
      return 'ERROR';
    }
  }

  async forceStopService() {
    try {
      this.log('Attempting comprehensive service stop...');

      const status = await this.getServiceStatus();
      if (status === 'NOT_INSTALLED') {
        this.log('Service is not installed');
        await this.ensureNoRelatedProcesses();
        return true;
      }

      if (status === 'STOPPED') {
        this.log('Service is already stopped');
        await this.ensureNoRelatedProcesses();
        this.log('Waiting for Windows to complete service cleanup...');
        await new Promise((resolve) => setTimeout(resolve, 5000));
        return true;
      }

      // Use hybrid service manager for comprehensive stop
      try {
        this.log('Using hybrid service manager for comprehensive stop...');
        await this.hybridManager.stopService();
        this.log('Hybrid service stop completed');

        this.log('Waiting for complete file handle release...');
        await new Promise((resolve) => setTimeout(resolve, 8000));

        return true;
      } catch (err) {
        this.log(`Hybrid stop failed: ${err.message}`, 'WARN');

        this.log('Falling back to direct process cleanup...');
        await this.ensureNoRelatedProcesses();
        return true;
      }
    } catch (err) {
      this.log(`Error during force stop: ${err.message}`, 'ERROR');
      return false;
    }
  }

  async ensureNoRelatedProcesses() {
    try {
      this.log('Ensuring no related processes are running...');

      // Check for processes on sync port
  const syncPort = process.env.SYNC_PORT || 8765;
      const portPID = await this.hybridManager.findProcessByPort(syncPort);
      if (portPID) {
        this.log(`Found process on port ${syncPort}: PID ${portPID}`);
        await this.hybridManager.killPID(portPID);
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      // Check for any Node.js processes that might be related
      const serviceProcesses = await this.hybridManager.findServiceProcesses();
      if (serviceProcesses.length > 0) {
        this.log(`Found ${serviceProcesses.length} related processes, terminating...`);
        for (const proc of serviceProcesses) {
          const pid = parseInt(proc.PID, 10);
          if (pid) {
            await this.hybridManager.killPID(pid);
          }
        }
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }

      this.log('Process cleanup completed');
    } catch (err) {
      this.log(`Error during process cleanup: ${err.message}`, 'WARN');
    }
  }

  async forceCleanupDaemonFiles() {
    try {
      this.log('Cleaning up daemon files with enhanced retry logic...');

      if (fs.existsSync(this.daemonPath)) {
        const files = fs.readdirSync(this.daemonPath);

        for (const file of files) {
          const filePath = path.join(this.daemonPath, file);
          let deleted = false;
          let attempts = 0;
          const maxAttempts = 5;

          while (!deleted && attempts < maxAttempts) {
            try {
              fs.unlinkSync(filePath);
              this.log(`Deleted: ${file}`);
              deleted = true;
            } catch (err) {
              attempts++;

              if (err.code === 'EBUSY' || err.code === 'EACCES') {
                this.log(`File locked (attempt ${attempts}/${maxAttempts}): ${file}`, 'WARN');

                if (attempts < maxAttempts) {
                  const delay = Math.pow(2, attempts - 1) * 1000;
                  this.log(`Waiting ${delay}ms before retry...`);
                  await new Promise((resolve) => setTimeout(resolve, delay));
                } else {
                  this.log(`File remains locked after ${maxAttempts} attempts: ${file}`, 'ERROR');

                  try {
                    const deleteFile = `${filePath}.delete.${Date.now()}`;
                    await execAsync(`move "${filePath}" "${deleteFile}"`);
                    this.log(`Renamed for deletion: ${file} -> ${path.basename(deleteFile)}`);
                  } catch (moveErr) {
                    this.log(`Could not rename for deletion: ${file} - ${moveErr.message}`, 'WARN');
                  }
                }
              } else {
                this.log(`Could not delete ${file}: ${err.message}`, 'WARN');
                break;
              }
            }
          }
        }

        // Try to remove the daemon directory
        let dirRemoved = false;
        let dirAttempts = 0;
        const maxDirAttempts = 3;

        while (!dirRemoved && dirAttempts < maxDirAttempts) {
          try {
            const remainingFiles = fs.readdirSync(this.daemonPath);
            const nonDeleteFiles = remainingFiles.filter((f) => !f.includes('.delete'));

            if (nonDeleteFiles.length === 0) {
              fs.rmdirSync(this.daemonPath);
              this.log('Removed daemon directory');
              dirRemoved = true;
            } else {
              this.log(`Daemon directory still contains files: ${nonDeleteFiles.join(', ')}`, 'WARN');
              break;
            }
          } catch (err) {
            dirAttempts++;
            this.log(`Could not remove daemon directory (attempt ${dirAttempts}/${maxDirAttempts}): ${err.message}`, 'WARN');

            if (dirAttempts < maxDirAttempts) {
              await new Promise((resolve) => setTimeout(resolve, 2000));
            }
          }
        }
      } else {
        this.log('Daemon directory does not exist');
      }

      return true;
    } catch (err) {
      this.log(`Error during cleanup: ${err.message}`, 'ERROR');
      return false;
    }
  }

  async uninstallExistingService() {
    this.log(`Uninstalling existing service using hybrid approach...`);

    const scCmd = (config.commands && config.commands.SC_COMMAND) || 'sc.exe';

    // Check if service exists
    try {
      await execAsync(`${scCmd} query "${this.getScServiceName()}"`);
      this.log('Existing service detected - performing hybrid removal');
      this.log(`Service name: "${this.serviceName}"`);
    } catch (err) {
      // In uninstall workflow, any query failure means service doesn't exist
      // This is safe - we're trying to remove it anyway
      this.log('Service does not exist - nothing to uninstall');
      return true;
    }

    // Step 1: Stop the service if running
    const status = await this.getServiceStatus();

    if (status === 'RUNNING' || status === 'START_PENDING') {
      this.log(`Service is ${status}, stopping...`);

      try {
        await execAsync(`${scCmd} stop "${this.getScServiceName()}"`);
        this.log('Service stop command executed, waiting for shutdown...');

        // Wait for service to fully stop (max 45 seconds)
        for (let i = 0; i < 45; i++) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          const currentStatus = await this.getServiceStatus();

          if (currentStatus === 'STOPPED' || currentStatus === 'NOT_INSTALLED') {
            this.log('Service stopped successfully');
            break;
          }

          // Show progress every 10 seconds
          if ((i + 1) % 10 === 0) {
            this.log(`Still waiting for service shutdown... (${i + 1}s)`);
          }
        }

      } catch (error) {
        if (error.message.includes('Access is denied')) {
          throw new Error('ADMIN_REQUIRED');
        }
        this.log(`Stop operation error: ${error.message}`, 'WARN');
      }
    } else if (status === 'STOPPED') {
      this.log('Service is already stopped');
    } else {
      this.log(`Service status: ${status}`);
    }

    // Step 2: Remove the service
    this.log('Removing service from Windows registry...');

    try {
      await execAsync(`${scCmd} delete "${this.getScServiceName()}"`);
      this.log('Service removed from registry successfully');

      // Wait for Windows to process the deletion
      this.log('Waiting for Windows to complete service cleanup...');
      await new Promise(resolve => setTimeout(resolve, 3000));

    } catch (error) {
      if (error.message.includes('Access is denied')) {
        throw new Error('ADMIN_REQUIRED');
      }
      this.log(`Service deletion completed with message: ${error.message}`, 'WARN');
    }

    // Step 3: Verify removal
    try {
      await execAsync(`${scCmd} query "${this.getScServiceName()}"`);
      this.log('Service still appears in registry, but continuing', 'WARN');
    } catch (err) {
      // Any query failure after deletion means service is removed (expected)
      this.log('Service completely removed from registry');
    }

    this.log('Waiting for service registry to stabilize...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    return true;
  }

  async installHybridService() {
    return new Promise((resolve, reject) => {
      this.log('Installing hybrid service...');

      const svc = new Service({
        name: config.name,
        displayName: config.displayName || config.name,
        description: config.description + ' (Hybrid Mode - Direct execution with PID management)',
        script: path.resolve(__dirname, 'service-wrapper-hybrid.js'),
        nodeOptions: config.nodeOptions,
        env: config.env,

        stopparentfirst: true,
        stopchild: true,
        logOnAs: config.logOnAs,
        restart: config.restart,
        dependencies: config.dependencies,
      });

      svc.on('install', () => {
        this.log('✅ Hybrid service installed successfully!');
        console.log('');
        console.log('📋 Service Details:');
        console.log(`   Name: ${svc.name}`);
        console.log(`   Description: ${svc.description}`);
        console.log(`   Script: ${svc.script}`);
        console.log('');
        console.log('🚀 Usage:');
        console.log('   Start:        npm run service:start');
        console.log('   Force Build:  npm run service:start -- --force-build');
        console.log('   Stop:         npm run service:stop');
        console.log('   Status:       npm run service:status');
        console.log('   Diagnose:     npm run service:diagnose');
        console.log('');
        console.log('💡 The hybrid service provides:');
        console.log('   • Direct sync service execution with PID management');
        console.log('   • Database replication between multiple instances');
        console.log('   • Automatic peer discovery and conflict resolution');
        console.log('   • Enhanced process tracking and cleanup');
        console.log('   • Graceful shutdown with fallback to force kill');
        console.log('   • Auto-restart capabilities for production reliability');

        resolve(true);
      });

      svc.on('error', (err) => {
        this.log(`Installation error: ${err.message}`, 'ERROR');
        reject(err);
      });

      svc.install();
    });
  }
}

async function forceInstallHybrid() {
  const manager = new ForceInstallManager();

  try {
    console.log('🔧 Force Installing Multi-Business Sync Service (Hybrid Mode)...');
    console.log('');

    // Check admin privileges
    const isAdmin = await manager.checkAdminPrivileges();
    if (!isAdmin) {
      console.error('❌ Administrator privileges required.');
      console.log('💡 Please run this command as Administrator.');
      process.exit(1);
    }

    await manager.log('Admin privileges confirmed');

    // Note: Service script will be built during the installation process

    // Step 1: Comprehensive service stop
    await manager.log('=== Step 1: Comprehensive Service Stop ===');
    await manager.forceStopService();

    // Step 2: Clean up daemon files
    await manager.log('=== Step 2: Clean Up Files ===');
    await manager.forceCleanupDaemonFiles();

    // Step 3: Wait for file system cleanup
    await manager.log('Waiting for file system cleanup...');
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Step 3: Uninstall existing service
    await manager.log('=== Step 3: Uninstall Existing Service ===');
    await manager.uninstallExistingService();

    // Step 4: Ensure dependencies are installed
    await manager.log('=== Step 4: Verify Dependencies ===');
    await manager.log('Checking if node_modules exists...');

    const nodeModulesPath = path.join(__dirname, '..', 'node_modules');
    if (!fs.existsSync(nodeModulesPath)) {
      await manager.log('⚠️  node_modules not found, running npm install...');
      try {
        const { stdout, stderr } = await execAsync('npm install', {
          cwd: path.join(__dirname, '..'),
          timeout: 300000 // 5 minutes
        });
        await manager.log('✅ Dependencies installed successfully');
      } catch (installError) {
        await manager.log(`❌ Dependency installation failed: ${installError.message}`, 'ERROR');
        throw new Error('Failed to install dependencies. Please run "npm install" manually.');
      }
    } else {
      await manager.log('✅ node_modules exists, skipping installation');
    }

    // Step 5: Build fresh service files
    await manager.log('=== Step 5: Build Fresh Service Files ===');
    await manager.log('Cleaning dist folder for fresh build...');

    const distPath = path.join(__dirname, '..', 'dist');
    try {
      if (fs.existsSync(distPath)) {
        // Remove recursively (cross-platform)
        fs.rmSync(distPath, { recursive: true, force: true });
        await manager.log('✅ dist folder cleaned');
      } else {
        await manager.log('ℹ️  No dist folder to clean');
      }
    } catch (error) {
      await manager.log(`⚠️  Could not clean dist folder: ${error.message}`, 'WARN');
      await manager.log('   Proceeding with build anyway...');
    }

    await manager.log('Running build process to ensure latest code...');
    try {
      const { stdout, stderr } = await execAsync('npm run build:service', { cwd: path.join(__dirname, '..') });
      
      if (stdout) {
        // Filter out unwanted "Next steps" messages from build script
        const filteredLines = stdout.split('\n').filter(line => {
          const trimmed = line.trim();
          return trimmed && 
                 !trimmed.includes('📋 Next steps:') &&
                 !trimmed.includes('• Start the service:') &&
                 !trimmed.includes('• Check status:') &&
                 !trimmed.includes('• View logs:') &&
                 !trimmed.includes('npm run sync-service:start') &&
                 !trimmed.includes('npm run sync-service:status') &&
                 !trimmed.includes('Windows Event Viewer');
        });
        
        filteredLines.forEach(line => {
          if (line.trim()) manager.log(`BUILD: ${line.trim()}`);
        });
      }
      
      if (stderr && !stderr.includes('npm WARN')) {
        // Filter out service status warnings from build script
        const filteredErrors = stderr.split('\n').filter(line => {
          const trimmed = line.trim();
          return trimmed && 
                 !trimmed.includes('Could not determine service status') &&
                 !trimmed.includes('assuming stopped');
        });
        
        filteredErrors.forEach(line => {
          if (line.trim()) manager.log(`BUILD: ${line.trim()}`, 'WARN');
        });
      }
      await manager.log('✅ Service build completed successfully');
      
      // Verify build output exists
      const serviceScript = path.join(__dirname, '..', 'dist', 'service', 'sync-service-runner.js');
      if (!fs.existsSync(serviceScript)) {
        throw new Error(`Build verification failed - service script not found: ${serviceScript}`);
      }
      await manager.log('✅ Build verification passed - service script exists');
      
      // Show some build info
      const stats = fs.statSync(serviceScript);
      await manager.log(`📄 Main service file: ${serviceScript}`);
      await manager.log(`📅 Built: ${stats.mtime.toLocaleString()}`);
      await manager.log(`📏 Size: ${Math.round(stats.size / 1024)}KB`);
      
    } catch (buildError) {
      await manager.log(`❌ Build process failed: ${buildError.message}`, 'ERROR');
      console.error('');
      console.error('Build failed! This could be due to:');
      console.error('  • TypeScript compilation errors');
      console.error('  • Service is still running and locking files');
      console.error('  • Missing dependencies or configuration');
      console.error('');
      console.error('To troubleshoot:');
      console.error('  1. Manually run: npm run build:service');
      console.error('  2. Check for TypeScript errors');
      console.error('  3. Ensure service is fully stopped');
      process.exit(1);
    }

    // Step 6: Wait and verify service registry cleanup
    await manager.log('Waiting for service registry to stabilize...');
    await new Promise((resolve) => setTimeout(resolve, 8000));

    await manager.log('Verifying service removal from registry...');
    let registryCleared = false;
    let attempts = 0;
    while (!registryCleared && attempts < 15) {
      const status = await manager.getServiceStatus();
      if (status === 'NOT_INSTALLED') {
        registryCleared = true;
        await manager.log('Service successfully removed from registry');
      } else {
        await manager.log(`Service still in registry (${status}), waiting...`);
        await new Promise((resolve) => setTimeout(resolve, 3000));
        attempts++;
      }
    }

    if (!registryCleared) {
      await manager.log('Service registry cleanup may be incomplete, proceeding anyway', 'WARN');
    }

    // Step 7: Final wait before installation
    await manager.log('Final wait for complete system cleanup...');
    await new Promise((resolve) => setTimeout(resolve, 10000));

    // Step 8: Install hybrid service
    await manager.log('=== Step 7: Install Hybrid Service ===');
    await manager.installHybridService();

    console.log('');
    console.log('✅ Force installation completed successfully!');
    console.log('');
    console.log('🎯 Next Steps:');
    console.log('   1. Start the service: npm run service:start');
    console.log('      (Use --force-build flag to rebuild TypeScript: npm run service:start -- --force-build)');
    console.log('   2. Check status: npm run service:status');
    console.log('   3. View logs: npm run service:diagnose');
    console.log('');
    console.log('🔐 Security Note:');
    if (!process.env.SYNC_REGISTRATION_KEY || process.env.SYNC_REGISTRATION_KEY === 'b3f1c9d7a5e4f2c3819d6b7a2e4f0c1d2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7') {
      console.log('   ⚠️  Set SYNC_REGISTRATION_KEY environment variable for production!');
    } else {
      console.log('   ✅ Custom registration key is configured');
    }

  } catch (err) {
    console.error('❌ Force installation failed:', err.message);
    console.log('');
    console.log('🔧 Manual Recovery Steps:');
    console.log('   1. Open Services.msc as Administrator');
    console.log(`   2. Find "${config.displayName}" service`);
    console.log('   3. Stop the service manually');
    console.log(`   4. Delete the service: sc delete "${manager.getScServiceName()}"`);
    console.log('   5. Restart your computer');
    console.log('   6. Try installation again');

    process.exit(1);
  }
}

if (require.main === module) {
  forceInstallHybrid().catch((err) => {
    console.error('❌ Force installation failed:', err.message);
    process.exit(1);
  });
}

module.exports = forceInstallHybrid;