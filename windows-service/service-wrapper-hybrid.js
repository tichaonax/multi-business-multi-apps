/**
 * Hybrid Service Wrapper
 * Wrapper for running the Multi-Business Sync Service as a Windows Service
 * Based on electricity-tokens hybrid service pattern with direct process execution
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const EventEmitter = require('events');

class HybridServiceWrapper extends EventEmitter {
  constructor() {
    super();
    this.childProcess = null;
    this.isShuttingDown = false;
    this.restartAttempts = 0;
    this.maxRestartAttempts = 5;
    this.restartDelay = 5000; // 5 seconds
    this.pidFile = path.join(__dirname, 'daemon', 'service.pid');
    this.logFile = path.join(__dirname, 'daemon', 'service.log');

    this.setupPidManagement();
    this.setupLogging();
    this.setupShutdownHandlers();
  }

  /**
   * Start the sync service
   */
  async start() {
    try {
      console.log('🚀 Starting Multi-Business Sync Service (Hybrid Mode)...');

      // Ensure the compiled service exists
      const serviceScript = path.join(__dirname, '..', 'dist', 'service', 'sync-service-runner.js');

      if (!fs.existsSync(serviceScript)) {
        throw new Error(
          `Service script not found: ${serviceScript}\n` +
          'Please build the service first: npm run build:service'
        );
      }

      // Start the Node.js process directly
      this.childProcess = spawn('node', [serviceScript, 'start'], {
        cwd: path.join(__dirname, '..'),
        env: {
          ...process.env,
          NODE_ENV: 'production',
          SYNC_REGISTRATION_KEY: process.env.SYNC_REGISTRATION_KEY || 'default-registration-key-change-in-production',
          SYNC_PORT: process.env.SYNC_PORT || '3001',
          SYNC_INTERVAL: process.env.SYNC_INTERVAL || '30000',
          LOG_LEVEL: process.env.LOG_LEVEL || 'info',
          SYNC_DATA_DIR: process.env.SYNC_DATA_DIR || './data/sync'
        },
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: false
      });

      // Save PID
      this.savePid(this.childProcess.pid);

      // Setup process event handlers
      this.setupProcessHandlers();

      console.log(`✅ Sync service started with PID: ${this.childProcess.pid}`);
      this.emit('started', { pid: this.childProcess.pid });

    } catch (error) {
      console.error('❌ Failed to start sync service:', error);
      this.emit('error', error);

      if (!this.isShuttingDown && this.restartAttempts < this.maxRestartAttempts) {
        await this.handleRestart();
      } else {
        process.exit(1);
      }
    }
  }

  /**
   * Stop the sync service
   */
  async stop() {
    this.isShuttingDown = true;

    if (this.childProcess) {
      try {
        console.log('⏹️  Stopping sync service...');

        // Send SIGTERM for graceful shutdown
        this.childProcess.kill('SIGTERM');

        // Wait for graceful shutdown
        await new Promise((resolve) => {
          const timeout = setTimeout(() => {
            // Force kill if graceful shutdown takes too long
            if (this.childProcess) {
              console.log('🔪 Force killing sync service...');
              this.childProcess.kill('SIGKILL');
            }
            resolve();
          }, 10000); // 10 second timeout

          this.childProcess.on('exit', () => {
            clearTimeout(timeout);
            resolve();
          });
        });

        console.log('✅ Sync service stopped');
        this.emit('stopped');

      } catch (error) {
        console.error('❌ Error stopping sync service:', error);
        this.emit('error', error);
      }
    }

    this.cleanupPid();
  }

  /**
   * Setup process event handlers
   */
  setupProcessHandlers() {
    if (!this.childProcess) return;

    this.childProcess.stdout.on('data', (data) => {
      const output = data.toString();
      this.logOutput('STDOUT', output);
      console.log(output);
    });

    this.childProcess.stderr.on('data', (data) => {
      const output = data.toString();
      this.logOutput('STDERR', output);
      console.error(output);
    });

    this.childProcess.on('error', (error) => {
      console.error('🔥 Child process error:', error);
      this.emit('error', error);

      if (!this.isShuttingDown) {
        this.handleRestart();
      }
    });

    this.childProcess.on('exit', (code, signal) => {
      console.log(`📤 Child process exited with code ${code}, signal ${signal}`);
      this.cleanupPid();

      if (!this.isShuttingDown && code !== 0) {
        console.log('🔄 Process exited unexpectedly, attempting restart...');
        this.handleRestart();
      } else {
        this.emit('stopped');
      }
    });
  }

  /**
   * Handle automatic restart
   */
  async handleRestart() {
    this.restartAttempts++;

    if (this.restartAttempts > this.maxRestartAttempts) {
      console.error(`❌ Maximum restart attempts (${this.maxRestartAttempts}) exceeded. Exiting.`);
      process.exit(1);
    }

    console.log(`🔄 Attempting restart ${this.restartAttempts}/${this.maxRestartAttempts} in ${this.restartDelay}ms...`);

    await new Promise(resolve => setTimeout(resolve, this.restartDelay));

    if (!this.isShuttingDown) {
      await this.start();
    }
  }

  /**
   * Setup PID management
   */
  setupPidManagement() {
    // Ensure daemon directory exists
    const daemonDir = path.dirname(this.pidFile);
    if (!fs.existsSync(daemonDir)) {
      fs.mkdirSync(daemonDir, { recursive: true });
    }
  }

  /**
   * Save process PID
   */
  savePid(pid) {
    try {
      fs.writeFileSync(this.pidFile, pid.toString());
    } catch (error) {
      console.warn('Failed to save PID file:', error);
    }
  }

  /**
   * Clean up PID file
   */
  cleanupPid() {
    try {
      if (fs.existsSync(this.pidFile)) {
        fs.unlinkSync(this.pidFile);
      }
    } catch (error) {
      console.warn('Failed to cleanup PID file:', error);
    }
  }

  /**
   * Get saved PID
   */
  getSavedPid() {
    try {
      if (fs.existsSync(this.pidFile)) {
        return parseInt(fs.readFileSync(this.pidFile, 'utf8'));
      }
    } catch (error) {
      // Ignore errors
    }
    return null;
  }

  /**
   * Setup logging
   */
  setupLogging() {
    const logDir = path.dirname(this.logFile);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }

  /**
   * Log output to file
   */
  logOutput(type, output) {
    try {
      const timestamp = new Date().toISOString();
      const logEntry = `[${timestamp}] [${type}] ${output}`;

      fs.appendFileSync(this.logFile, logEntry);
    } catch (error) {
      // Ignore logging errors
    }
  }

  /**
   * Setup shutdown handlers
   */
  setupShutdownHandlers() {
    process.on('SIGINT', async () => {
      console.log('\n📡 Received SIGINT, shutting down...');
      await this.stop();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log('\n📡 Received SIGTERM, shutting down...');
      await this.stop();
      process.exit(0);
    });

    process.on('SIGHUP', async () => {
      console.log('\n📡 Received SIGHUP, restarting...');
      await this.stop();
      await new Promise(resolve => setTimeout(resolve, 2000));
      await this.start();
    });

    process.on('uncaughtException', async (error) => {
      console.error('💥 Uncaught Exception:', error);
      await this.stop();
      process.exit(1);
    });

    process.on('unhandledRejection', async (reason, promise) => {
      console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
      await this.stop();
      process.exit(1);
    });
  }

  /**
   * Get service status
   */
  getStatus() {
    const savedPid = this.getSavedPid();
    const isRunning = this.childProcess && !this.childProcess.killed;

    return {
      isRunning,
      pid: this.childProcess ? this.childProcess.pid : savedPid,
      restartAttempts: this.restartAttempts,
      maxRestartAttempts: this.maxRestartAttempts,
      isShuttingDown: this.isShuttingDown
    };
  }
}

// Create and start the service wrapper
const wrapper = new HybridServiceWrapper();

// Handle command line
const command = process.argv[2] || 'start';

switch (command) {
  case 'start':
    wrapper.start();
    break;

  case 'stop':
    wrapper.stop();
    break;

  case 'status':
    const status = wrapper.getStatus();
    console.log('Service Status:', status);
    break;

  default:
    console.log('Usage: node service-wrapper-hybrid.js [start|stop|status]');
    break;
}

// Keep process alive
process.stdin.resume();

module.exports = HybridServiceWrapper;