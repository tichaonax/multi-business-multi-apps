/**
 * Production Service Installation Script
 *
 * This script creates a production-ready Windows service that:
 * 1. Runs database migrations
 * 2. Builds the Next.js application
 * 3. Starts the application in production mode
 * 4. Includes proper error handling and restart capabilities
 *
 * Usage: node scripts/install-production-service.js
 */

const Service = require('node-windows').Service;
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step, message) {
  log(`\n[${step}] ${message}`, 'cyan');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

class ProductionServiceInstaller {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '..');
    this.serviceRunner = path.join(this.projectRoot, 'scripts', 'production-service-runner.js');

    this.serviceConfig = {
      name: 'Multi-Business-Platform',
      description: 'Multi-Business Management Platform - Production Service with Database Migrations and Build Process',
      script: this.serviceRunner,
      nodeOptions: [
        '--harmony',
        '--max_old_space_size=4096'
      ],
      env: [
        {
          name: "NODE_ENV",
          value: "production"
        },
        {
          name: "PORT",
          value: process.env.PORT || "8080"
        }
      ]
    };
  }

  async install() {
    try {
      log('🚀 Installing Production Service for Multi-Business Platform...', 'bright');
      log('This service will handle migrations, builds, and production startup.\n', 'cyan');

      // Step 1: Create the production service runner
      await this.createServiceRunner();

      // Step 2: Install the Windows service
      await this.installWindowsService();

      // Step 3: Provide usage instructions
      this.printUsageInstructions();

      logSuccess('Production service installation completed!');
      return true;

    } catch (error) {
      logError(`Installation failed: ${error.message}`);
      return false;
    }
  }

  async createServiceRunner() {
    logStep('1/2', 'Creating production service runner...');

    const runnerContent = `/**
 * Production Service Runner
 * Handles database migrations, builds, and starts the application
 */

const { execSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Service configuration
const PROJECT_ROOT = path.resolve(__dirname, '..');
const PORT = process.env.PORT || 8080;
const NODE_ENV = process.env.NODE_ENV || 'production';

// Logging setup
const winston = require('winston');
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({
      filename: path.join(PROJECT_ROOT, 'logs', 'service-error.log'),
      level: 'error',
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: path.join(PROJECT_ROOT, 'logs', 'service.log'),
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
    }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

class ProductionServiceRunner {
  constructor() {
    this.isShuttingDown = false;
    this.appProcess = null;
    this.electronProcess = null;
    this.restartCount = 0;
    this.maxRestarts = 3;
    this.restartDelay = 5000;
  }

  async start() {
    try {
      logger.info('🚀 Starting Multi-Business Platform Production Service...', {
        port: PORT,
        nodeEnv: NODE_ENV,
        projectRoot: PROJECT_ROOT
      });

      // Step 1: Ensure logs directory exists
      await this.ensureDirectories();

      // Step 2: Run database migrations
      await this.runMigrations();

      // Step 3: Build the application
      await this.buildApplication();

      // Step 4: Start the application
      await this.startApplication();

      // Reset restart count on successful start
      this.restartCount = 0;
      logger.info('✅ Multi-Business Platform started successfully');

    } catch (error) {
      logger.error('❌ Failed to start service', {
        error: error.message,
        stack: error.stack,
        restartCount: this.restartCount
      });

      if (this.restartCount < this.maxRestarts && !this.isShuttingDown) {
        this.restartCount++;
        logger.info(\`🔄 Attempting restart \${this.restartCount}/\${this.maxRestarts} in \${this.restartDelay}ms\`);

        setTimeout(() => {
          this.start();
        }, this.restartDelay);
      } else {
        logger.error('💀 Max restart attempts reached, exiting');
        process.exit(1);
      }
    }
  }

  async ensureDirectories() {
    logger.info('📁 Ensuring required directories exist...');

    const directories = [
      path.join(PROJECT_ROOT, 'logs'),
      path.join(PROJECT_ROOT, '.next'), // Next.js build directory
    ];

    for (const dir of directories) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        logger.info(\`Created directory: \${dir}\`);
      }
    }
  }

  async runMigrations() {
    logger.info('🗄️  Running database migrations...');

    try {
      // Generate Prisma client first
      logger.info('Generating Prisma client...');
      execSync('npx prisma generate', {
        cwd: PROJECT_ROOT,
        stdio: 'pipe',
        timeout: 60000 // 1 minute timeout
      });

      // Run migrations
      logger.info('Deploying database migrations...');
      const result = execSync('npx prisma migrate deploy', {
        cwd: PROJECT_ROOT,
        stdio: 'pipe',
        timeout: 120000 // 2 minute timeout
      });

      logger.info('✅ Database migrations completed successfully');
      if (result.toString().trim()) {
        logger.info('Migration output:', { output: result.toString() });
      }

    } catch (error) {
      // If migrations fail, try to push schema instead (for fresh installs)
      logger.warn('Migration deploy failed, attempting schema push...', {
        error: error.message
      });

      try {
        execSync('npx prisma migrate deploy', {
          cwd: ROOT_DIR,
          stdio: 'inherit'
        });
        logger.info('✅ Database schema pushed successfully');
      } catch (pushError) {
        throw new Error(\`Database setup failed: \${pushError.message}\`);
      }
    }
  }

  async buildApplication() {
    logger.info('🔨 Building Next.js application...');

    try {
      // Check if .next directory exists and has content
      const nextDir = path.join(PROJECT_ROOT, '.next');
      const shouldBuild = !fs.existsSync(nextDir) ||
                         fs.readdirSync(nextDir).length === 0 ||
                         process.env.FORCE_BUILD === 'true';

      if (shouldBuild) {
        logger.info('Building application (this may take a few minutes)...');

        const buildResult = execSync('npm run build', {
          cwd: PROJECT_ROOT,
          stdio: 'pipe',
          timeout: 300000 // 5 minute timeout
        });

        logger.info('✅ Application build completed successfully');
        logger.info('Build output:', { output: buildResult.toString().slice(-500) }); // Last 500 chars
      } else {
        logger.info('✅ Application build already exists, skipping build');
      }

    } catch (error) {
      throw new Error(\`Build failed: \${error.message}\`);
    }
  }

  async startApplication() {
    logger.info('🚀 Starting Next.js application server...');

    return new Promise((resolve, reject) => {
      // Start the application using the production server
      this.appProcess = spawn('node', ['server.js'], {
        cwd: PROJECT_ROOT,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: {
          ...process.env,
          NODE_ENV: 'production',
          PORT: PORT
        }
      });

      // Handle stdout
      this.appProcess.stdout.on('data', (data) => {
        const output = data.toString().trim();
        logger.info('App Output:', { output });

        // Check if server started successfully
        if (output.includes('Multi-Business Platform ready on')) {
          logger.info('✅ Application server started successfully');

          // Start Electron after server is ready
          this.startElectron();

          resolve();
        }
      });

      // Handle stderr
      this.appProcess.stderr.on('data', (data) => {
        const error = data.toString().trim();
        logger.error('App Error:', { error });
      });

      // Handle process exit
      this.appProcess.on('exit', (code, signal) => {
        logger.warn('Application process exited', { code, signal });

        if (!this.isShuttingDown) {
          // Stop Electron before restarting
          this.stopElectron();

          // Restart the service if app crashes
          logger.info('Application crashed, restarting service...');
          setTimeout(() => {
            this.start();
          }, this.restartDelay);
        }
      });

      // Handle startup errors
      this.appProcess.on('error', (error) => {
        logger.error('Failed to start application process', { error: error.message });
        reject(error);
      });

      // Timeout for startup
      setTimeout(() => {
        if (this.appProcess && !this.appProcess.killed) {
          logger.info('✅ Application startup timeout reached, assuming success');

          // Start Electron if server started
          this.startElectron();

          resolve();
        }
      }, 30000); // 30 second timeout
    });
  }

  startElectron() {
    logger.info('🖥️  Starting Electron kiosk application...');

    try {
      const electronPath = path.join(PROJECT_ROOT, 'electron');

      this.electronProcess = spawn('npm', ['start'], {
        cwd: electronPath,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: {
          ...process.env,
          PORT: PORT,
          NODE_ENV: 'production'
        },
        shell: true
      });

      this.electronProcess.stdout.on('data', (data) => {
        const output = data.toString().trim();
        logger.info('Electron Output:', { output });
      });

      this.electronProcess.stderr.on('data', (data) => {
        const error = data.toString().trim();
        logger.error('Electron Error:', { error });
      });

      this.electronProcess.on('exit', (code, signal) => {
        logger.warn('Electron process exited', { code, signal });

        if (!this.isShuttingDown) {
          // Restart Electron if it crashes (but don't restart the whole service)
          logger.info('Electron crashed, restarting Electron...');
          setTimeout(() => {
            this.startElectron();
          }, 3000);
        }
      });

      this.electronProcess.on('error', (error) => {
        logger.error('Failed to start Electron', { error: error.message });
      });

      logger.info('✅ Electron kiosk application started');
    } catch (error) {
      logger.error('Error starting Electron', { error: error.message });
    }
  }

  stopElectron() {
    if (this.electronProcess && !this.electronProcess.killed) {
      logger.info('Stopping Electron...');
      this.electronProcess.kill('SIGTERM');

      setTimeout(() => {
        if (this.electronProcess && !this.electronProcess.killed) {
          logger.warn('Force killing Electron process');
          this.electronProcess.kill('SIGKILL');
        }
      }, 5000);
    }
  }

  async stop() {
    if (this.isShuttingDown) {
      return;
    }

    this.isShuttingDown = true;
    logger.info('🛑 Stopping Multi-Business Platform Service...');

    try {
      // Stop Electron first
      this.stopElectron();

      // Then stop the application server
      if (this.appProcess && !this.appProcess.killed) {
        logger.info('Terminating application process...');
        this.appProcess.kill('SIGTERM');

        // Force kill after 10 seconds if it doesn't stop gracefully
        setTimeout(() => {
          if (this.appProcess && !this.appProcess.killed) {
            logger.warn('Force killing application process');
            this.appProcess.kill('SIGKILL');
          }
        }, 10000);
      }

      logger.info('✅ Multi-Business Platform Service stopped successfully');
    } catch (error) {
      logger.error('Error stopping service', { error: error.message });
    }
  }

  setupEventHandlers() {
    // Process events
    process.on('SIGINT', () => {
      logger.info('Received SIGINT, shutting down gracefully');
      this.stop().then(() => process.exit(0));
    });

    process.on('SIGTERM', () => {
      logger.info('Received SIGTERM, shutting down gracefully');
      this.stop().then(() => process.exit(0));
    });

    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception', { error: error.message, stack: error.stack });
      this.stop().then(() => process.exit(1));
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled rejection', { reason, promise });
    });
  }
}

// Main execution
async function main() {
  const runner = new ProductionServiceRunner();

  // Setup event handlers
  runner.setupEventHandlers();

  // Start the service
  await runner.start();
}

// Run the service
if (require.main === module) {
  main().catch((error) => {
    console.error('Service startup failed:', error);
    process.exit(1);
  });
}

module.exports = { ProductionServiceRunner };`;

    // Write the service runner
    fs.writeFileSync(this.serviceRunner, runnerContent);
    logSuccess(`Service runner created: ${this.serviceRunner}`);
  }

  async installWindowsService() {
    logStep('2/2', 'Installing Windows service...');

    const svc = new Service(this.serviceConfig);

    return new Promise((resolve, reject) => {
      svc.on('install', () => {
        logSuccess('Service installed successfully!');
        log('Starting service...', 'cyan');
        svc.start();
      });

      svc.on('start', () => {
        logSuccess('Service started successfully!');
        resolve();
      });

      svc.on('alreadyinstalled', () => {
        logWarning('Service is already installed.');
        log('Restarting existing service...', 'cyan');
        svc.restart();
        resolve();
      });

      svc.on('error', (err) => {
        logError(`Service error: ${err.message}`);
        reject(err);
      });

      log('Installing Windows service...', 'cyan');
      svc.install();
    });
  }

  printUsageInstructions() {
    log('\n' + '='.repeat(60), 'bright');
    log('SERVICE INSTALLATION COMPLETE', 'bright');
    log('='.repeat(60), 'bright');

    log(`\n📋 Service Information:`, 'bright');
    log(`   Name: ${this.serviceConfig.name}`);
    log(`   Description: ${this.serviceConfig.description}`);
    log(`   Port: ${process.env.PORT || 8080}`);

    log(`\n⚙️  Service Management:`, 'bright');
    log(`   Start:   net start "${this.serviceConfig.name}"`);
    log(`   Stop:    net stop "${this.serviceConfig.name}"`);
    log(`   Restart: net stop "${this.serviceConfig.name}" && net start "${this.serviceConfig.name}"`);
    log(`   Status:  sc query "${this.serviceConfig.name}"`);

    log(`\n📝 What this service does:`, 'bright');
    log(`   1. ✅ Runs database migrations (prisma migrate deploy)`);
    log(`   2. ✅ Builds the Next.js application (npm run build)`);
    log(`   3. ✅ Starts the app in production mode`);
    log(`   4. ✅ Starts Electron kiosk application (POS + Customer Display)`);
    log(`   5. ✅ Automatic restart on crashes (up to 3 times)`);
    log(`   6. ✅ Comprehensive logging to logs/ directory`);

    log(`\n📂 Important Files:`, 'bright');
    log(`   Service Runner: ${this.serviceRunner}`);
    log(`   Service Logs: ${path.join(this.projectRoot, 'logs', 'service.log')}`);
    log(`   Error Logs: ${path.join(this.projectRoot, 'logs', 'service-error.log')}`);

    log(`\n🌐 Access your application:`, 'bright');
    log(`   URL: http://localhost:${process.env.PORT || 8080}`);
    log(`   Admin: http://localhost:${process.env.PORT || 8080}/admin`);

    log(`\n💡 Troubleshooting:`, 'bright');
    log(`   - Check service logs for startup issues`);
    log(`   - Ensure PostgreSQL is running`);
    log(`   - Verify DATABASE_URL in .env file`);
    log(`   - Check Windows Event Viewer for service events`);

    log('\n' + '='.repeat(60), 'bright');
  }
}

// Main execution
async function main() {
  const installer = new ProductionServiceInstaller();

  try {
    const success = await installer.install();
    process.exit(success ? 0 : 1);
  } catch (error) {
    logError(`Installation failed: ${error.message}`);
    process.exit(1);
  }
}

// Run installation if this file is executed directly
if (require.main === module) {
  main();
}

module.exports = { ProductionServiceInstaller };