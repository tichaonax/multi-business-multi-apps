/**
 * Service Installation Script
 * Installs the multi-business sync service with database setup
 * Based on the electricity-tokens service installation pattern
 *
 * This script handles:
 * - Service registration
 * - Database initialization
 * - Configuration setup
 * - Sync system integration
 */

const { execSync, spawn } = require('child_process')
const fs = require('fs')
const path = require('path')
const os = require('os')
const { DatabaseInstaller } = require('./install-database')

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function logStep(step, message) {
  log(`\n[${step}] ${message}`, 'cyan')
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green')
}

function logError(message) {
  log(`❌ ${message}`, 'red')
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow')
}

class ServiceInstaller {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '../..')
    this.installDir = path.join(__dirname)
    this.configDir = path.join(this.projectRoot, 'config')
    this.logsDir = path.join(this.projectRoot, 'logs')
    this.dataDir = path.join(this.projectRoot, 'data')

    // Service configuration
    this.serviceConfig = {
      name: 'multi-business-sync',
      displayName: 'Multi-Business Sync Service',
      description: 'Peer-to-peer database synchronization service for multi-business platform',
      execPath: process.execPath,
      scriptPath: path.join(this.projectRoot, 'service', 'sync-service-runner.js'),
      workingDir: this.projectRoot,
      user: process.env.SERVICE_USER || 'LocalSystem',
      restartDelay: 5000,
      maxRestarts: 3,
    }

    // Installation options
    this.options = {
      installDatabase: process.env.INSTALL_DATABASE !== 'false',
      freshInstall: process.env.INSTALL_FRESH === 'true' || process.argv.includes('--fresh'),
      createService: process.env.CREATE_SERVICE !== 'false',
      startService: process.env.START_SERVICE !== 'false',
      enableAutoStart: process.env.ENABLE_AUTO_START !== 'false',
      syncPort: parseInt(process.env.SYNC_PORT) || 8765,
      registrationKey: process.env.SYNC_REGISTRATION_KEY || this.generateRegistrationKey(),
    }
  }

  generateRegistrationKey() {
    const crypto = require('crypto')
    return crypto.randomBytes(32).toString('hex')
  }

  async run() {
    try {
      log('🚀 Starting Multi-Business Sync Service Installation...', 'bright')
      log('This will install the complete sync service with database setup.\n', 'cyan')

      // Step 1: Verify prerequisites
      await this.verifyPrerequisites()

      // Step 2: Create directories
      await this.createDirectories()

      // Step 3: Install database (if requested)
      if (this.options.installDatabase) {
          // If a fresh install is requested, drop existing database first
          if (this.options.freshInstall) {
            logWarning('Fresh install requested: dropping existing database before install')
            const dbInstaller = new DatabaseInstaller()
            await dbInstaller.dropDatabase()
          }

          await this.installDatabase()
      }

      // Step 4: Create service configuration
      await this.createServiceConfiguration()

      // Step 5: Create service runner script
      await this.createServiceRunner()

      // Step 6: Install system service (if requested)
      if (this.options.createService) {
        await this.installSystemService()
      }

      // Step 7: Create management scripts
      await this.createManagementScripts()

      // Step 8: Start service (if requested)
      if (this.options.startService) {
        await this.startService()
      }

      // Step 9: Verify installation
      await this.verifyInstallation()

      log('\n🎉 Multi-Business Sync Service Installation Complete! 🎉', 'green')
      this.printInstallationSummary()

      return true

    } catch (error) {
      logError(`Installation failed: ${error.message}`)
      if (error.details) {
        log(error.details, 'red')
      }
      return false
    }
  }

  async verifyPrerequisites() {
    logStep('1/9', 'Verifying prerequisites...')

    try {
      // Check Node.js version
      const nodeVersion = process.version
      log(`Node.js version: ${nodeVersion}`)

      const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0])
      if (majorVersion < 16) {
        throw new Error('Node.js version 16 or higher is required')
      }

      // Check npm availability
      try {
        execSync('npm --version', { stdio: 'pipe' })
        logSuccess('npm is available')
      } catch (error) {
        throw new Error('npm is not available')
      }

      // Check if running as administrator (Windows) or root (Linux/Mac)
      if (this.options.createService && !this.isElevated()) {
        logWarning('Service creation requires elevated privileges')
        logWarning('Run as Administrator (Windows) or with sudo (Linux/Mac)')
      }

      // Check PostgreSQL (if database installation is requested)
      if (this.options.installDatabase) {
        try {
          execSync('psql --version', { stdio: 'pipe' })
          logSuccess('PostgreSQL is available')
        } catch (error) {
          logWarning('PostgreSQL not found in PATH - ensure it is installed')
        }
      }

      logSuccess('Prerequisites verification completed')

    } catch (error) {
      throw new Error(`Prerequisites check failed: ${error.message}`)
    }
  }

  isElevated() {
    try {
      if (os.platform() === 'win32') {
        // On Windows, try to write to System32
        const testFile = path.join(process.env.WINDIR, 'Temp', 'elevation-test.tmp')
        fs.writeFileSync(testFile, 'test')
        fs.unlinkSync(testFile)
        return true
      } else {
        // On Unix-like systems, check if running as root
        return process.getuid && process.getuid() === 0
      }
    } catch (error) {
      return false
    }
  }

  async createDirectories() {
    logStep('2/9', 'Creating directories...')

    const directories = [
      this.configDir,
      this.logsDir,
      this.dataDir,
      path.join(this.projectRoot, 'service'),
      path.join(this.dataDir, 'sync'),
      path.join(this.dataDir, 'backups'),
    ]

    for (const dir of directories) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
        log(`Created directory: ${dir}`)
      } else {
        log(`Directory exists: ${dir}`)
      }
    }

    logSuccess('Directories created successfully')
  }

  async installDatabase() {
    logStep('3/9', 'Installing database...')

    try {
      const dbInstaller = new DatabaseInstaller()
      const success = await dbInstaller.run()

      if (!success) {
        throw new Error('Database installation failed')
      }

      logSuccess('Database installation completed')

    } catch (error) {
      throw new Error(`Database installation failed: ${error.message}`)
    }
  }

  async createServiceConfiguration() {
    logStep('4/9', 'Creating service configuration...')

    const config = {
      service: {
        name: this.serviceConfig.name,
        displayName: this.serviceConfig.displayName,
        description: this.serviceConfig.description,
        port: this.options.syncPort,
        autoStart: this.options.enableAutoStart,
        restartDelay: this.serviceConfig.restartDelay,
        maxRestarts: this.serviceConfig.maxRestarts,
      },
      sync: {
        nodeId: require('crypto').randomUUID(),
        nodeName: os.hostname() || 'Multi-Business-Node',
        registrationKey: this.options.registrationKey,
        port: this.options.syncPort,
        syncInterval: 30000,
        enableAutoStart: true,
        logLevel: 'info',
        dataDirectory: path.join(this.dataDir, 'sync'),
        maxLogSize: 10 * 1024 * 1024, // 10MB
        maxLogFiles: 5,
        security: {
          enableEncryption: true,
          enableSignatures: true,
          keyRotationEnabled: false,
          sessionTimeout: 60 * 60 * 1000, // 1 hour
          maxFailedAttempts: 5,
          rateLimitWindow: 60 * 1000, // 1 minute
          rateLimitMaxRequests: 100,
        }
      },
      database: {
        url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/multi_business_db',
        maxConnections: 20,
        connectionTimeout: 30000,
      },
      logging: {
        level: 'info',
        directory: this.logsDir,
        maxFileSize: '10MB',
        maxFiles: 10,
        console: false, // Disable console logging for service
      }
    }

    const configPath = path.join(this.configDir, 'service-config.json')
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2))

    log(`Service configuration created: ${configPath}`)

    // Create environment file
    const envContent = `# Multi-Business Sync Service Environment
DATABASE_URL=${config.database.url}
SYNC_PORT=${config.sync.port}
SYNC_REGISTRATION_KEY=${config.sync.registrationKey}
NODE_ENV=production
LOG_LEVEL=${config.logging.level}
`

    const envPath = path.join(this.configDir, 'service.env')
    fs.writeFileSync(envPath, envContent)

    log(`Environment file created: ${envPath}`)

    logSuccess('Service configuration created successfully')
  }

  async createServiceRunner() {
    logStep('5/9', 'Creating service runner...')

    const runnerContent = `/**
 * Multi-Business Sync Service Runner
 * Runs the sync service as a system service
 */

const path = require('path')
const fs = require('fs')
const { SyncService } = require('../src/lib/sync/sync-service')

// Load configuration
const configPath = path.join(__dirname, '../config/service-config.json')
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'))

// Load environment variables
const envPath = path.join(__dirname, '../config/service.env')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8')
  const lines = envContent.split('\\n').filter(line => line.trim() && !line.startsWith('#'))

  for (const line of lines) {
    const [key, value] = line.split('=')
    if (key && value) {
      process.env[key.trim()] = value.trim()
    }
  }
}

// Setup logging
const winston = require('winston')
const logger = winston.createLogger({
  level: config.logging.level,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({
      filename: path.join(config.logging.directory, 'service-error.log'),
      level: 'error',
      maxsize: config.logging.maxFileSize,
      maxFiles: config.logging.maxFiles,
    }),
    new winston.transports.File({
      filename: path.join(config.logging.directory, 'service.log'),
      maxsize: config.logging.maxFileSize,
      maxFiles: config.logging.maxFiles,
    })
  ]
})

if (config.logging.console) {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }))
}

class ServiceRunner {
  constructor() {
    this.syncService = null
    this.isShuttingDown = false
    this.restartCount = 0
    this.maxRestarts = config.service.maxRestarts
    this.restartDelay = config.service.restartDelay
  }

  async start() {
    try {
      logger.info('Starting Multi-Business Sync Service...', {
        nodeId: config.sync.nodeId,
        nodeName: config.sync.nodeName,
        port: config.sync.port
      })

      // Create sync service
      this.syncService = new SyncService(config.sync)

      // Setup event handlers
      this.setupEventHandlers()

      // Start the service
      await this.syncService.start()

      logger.info('Multi-Business Sync Service started successfully', {
        pid: process.pid,
        nodeId: config.sync.nodeId,
        port: config.sync.port
      })

      // Reset restart count on successful start
      this.restartCount = 0

    } catch (error) {
      logger.error('Failed to start sync service', { error: error.message, stack: error.stack })

      if (this.restartCount < this.maxRestarts && !this.isShuttingDown) {
        this.restartCount++
        logger.info(\`Attempting restart \${this.restartCount}/\${this.maxRestarts} in \${this.restartDelay}ms\`)

        setTimeout(() => {
          this.start()
        }, this.restartDelay)
      } else {
        logger.error('Max restart attempts reached, exiting')
        process.exit(1)
      }
    }
  }

  async stop() {
    if (this.isShuttingDown) {
      return
    }

    this.isShuttingDown = true
    logger.info('Stopping Multi-Business Sync Service...')

    try {
      if (this.syncService) {
        await this.syncService.stop()
        this.syncService = null
      }

      logger.info('Multi-Business Sync Service stopped successfully')
    } catch (error) {
      logger.error('Error stopping sync service', { error: error.message })
    }
  }

  setupEventHandlers() {
    // Sync service events
    this.syncService.on('started', (status) => {
      logger.info('Sync service started', status)
    })

    this.syncService.on('stopped', () => {
      logger.info('Sync service stopped')
    })

    this.syncService.on('peer_discovered', (peer) => {
      logger.info('Peer discovered', peer)
    })

    this.syncService.on('sync_completed', (stats) => {
      logger.debug('Sync completed', stats)
    })

    this.syncService.on('conflict_resolved', (conflict) => {
      logger.info('Conflict resolved', conflict)
    })

    this.syncService.on('security_event', (event) => {
      logger.warn('Security event', event)
    })

    this.syncService.on('error', (error) => {
      logger.error('Sync service error', { error: error.message, stack: error.stack })
    })

    // Process events
    process.on('SIGINT', () => {
      logger.info('Received SIGINT, shutting down gracefully')
      this.stop().then(() => process.exit(0))
    })

    process.on('SIGTERM', () => {
      logger.info('Received SIGTERM, shutting down gracefully')
      this.stop().then(() => process.exit(0))
    })

    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception', { error: error.message, stack: error.stack })
      this.stop().then(() => process.exit(1))
    })

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled rejection', { reason, promise })
    })
  }

  // Health check endpoint for monitoring
  createHealthCheck() {
    const http = require('http')
    const healthPort = config.sync.port + 1

    const server = http.createServer((req, res) => {
      if (req.url === '/health') {
        const status = this.syncService ? this.syncService.getStatus() : { isRunning: false }

        res.writeHead(status.isRunning ? 200 : 503, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({
          status: status.isRunning ? 'healthy' : 'unhealthy',
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          memoryUsage: process.memoryUsage(),
          syncService: status
        }))
      } else {
        res.writeHead(404)
        res.end('Not Found')
      }
    })

    server.listen(healthPort, () => {
      logger.info(\`Health check server listening on port \${healthPort}\`)
    })

    return server
  }
}

// Main execution
async function main() {
  const runner = new ServiceRunner()

  // Create health check server
  runner.createHealthCheck()

  // Start the service
  await runner.start()
}

// Handle service control for Windows
if (process.platform === 'win32') {
  const Service = require('node-windows').Service

  if (process.argv.includes('--install')) {
    // Install service
    const svc = new Service({
      name: config.service.name,
      description: config.service.description,
      script: __filename,
      nodeOptions: ['--max-old-space-size=2048']
    })

    svc.on('install', () => {
      console.log('Service installed successfully')
      process.exit(0)
    })

    svc.install()
    return
  }

  if (process.argv.includes('--uninstall')) {
    // Uninstall service
    const svc = new Service({
      name: config.service.name,
      script: __filename
    })

    svc.on('uninstall', () => {
      console.log('Service uninstalled successfully')
      process.exit(0)
    })

    svc.uninstall()
    return
  }
}

// Run the service
if (require.main === module) {
  main().catch((error) => {
    console.error('Service startup failed:', error)
    process.exit(1)
  })
}

module.exports = { ServiceRunner }`

    const runnerPath = path.join(this.projectRoot, 'service', 'sync-service-runner.js')
    fs.writeFileSync(runnerPath, runnerContent)

    log(`Service runner created: ${runnerPath}`)

    logSuccess('Service runner created successfully')
  }

  async installSystemService() {
    logStep('6/9', 'Installing system service...')

    try {
      if (os.platform() === 'win32') {
        await this.installWindowsService()
      } else {
        await this.installUnixService()
      }

      logSuccess('System service installed successfully')

    } catch (error) {
      throw new Error(`Service installation failed: ${error.message}`)
    }
  }

  async installWindowsService() {
    log('Installing Windows service...')

    // Install node-windows if not present
    try {
      require('node-windows')
    } catch (error) {
      log('Installing node-windows dependency...')
      execSync('npm install node-windows', { stdio: 'inherit', cwd: this.projectRoot })
    }

    // Run service installation
    const runnerPath = path.join(this.projectRoot, 'service', 'sync-service-runner.js')
    execSync(`node "${runnerPath}" --install`, {
      stdio: 'inherit',
      cwd: this.projectRoot
    })
  }

  async installUnixService() {
    log('Installing Unix systemd service...')

    const serviceContent = `[Unit]
Description=${this.serviceConfig.displayName}
After=network.target postgresql.service

[Service]
Type=simple
User=${this.serviceConfig.user}
WorkingDirectory=${this.serviceConfig.workingDir}
ExecStart=${this.serviceConfig.execPath} ${this.serviceConfig.scriptPath}
Restart=always
RestartSec=${Math.floor(this.serviceConfig.restartDelay / 1000)}
Environment=NODE_ENV=production
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target`

    const servicePath = `/etc/systemd/system/${this.serviceConfig.name}.service`

    if (this.isElevated()) {
      fs.writeFileSync(servicePath, serviceContent)

      // Reload systemd and enable service
      execSync('systemctl daemon-reload', { stdio: 'inherit' })

      if (this.options.enableAutoStart) {
        execSync(`systemctl enable ${this.serviceConfig.name}`, { stdio: 'inherit' })
      }

      log(`Systemd service created: ${servicePath}`)
    } else {
      // Write service file to project directory for manual installation
      const localServicePath = path.join(this.configDir, `${this.serviceConfig.name}.service`)
      fs.writeFileSync(localServicePath, serviceContent)

      logWarning(`Service file created at: ${localServicePath}`)
      logWarning(`To install manually, run as root:`)
      logWarning(`  sudo cp "${localServicePath}" "${servicePath}"`)
      logWarning(`  sudo systemctl daemon-reload`)
      logWarning(`  sudo systemctl enable ${this.serviceConfig.name}`)
    }
  }

  async createManagementScripts() {
    logStep('7/9', 'Creating management scripts...')

    // Create start script
    const startScript = os.platform() === 'win32' ?
      this.createWindowsStartScript() :
      this.createUnixStartScript()

    const startScriptPath = path.join(this.installDir, `start-service.${os.platform() === 'win32' ? 'bat' : 'sh'}`)
    fs.writeFileSync(startScriptPath, startScript)
    if (os.platform() !== 'win32') {
      fs.chmodSync(startScriptPath, '755')
    }

    // Create stop script
    const stopScript = os.platform() === 'win32' ?
      this.createWindowsStopScript() :
      this.createUnixStopScript()

    const stopScriptPath = path.join(this.installDir, `stop-service.${os.platform() === 'win32' ? 'bat' : 'sh'}`)
    fs.writeFileSync(stopScriptPath, stopScript)
    if (os.platform() !== 'win32') {
      fs.chmodSync(stopScriptPath, '755')
    }

    // Create status script
    const statusScript = os.platform() === 'win32' ?
      this.createWindowsStatusScript() :
      this.createUnixStatusScript()

    const statusScriptPath = path.join(this.installDir, `status-service.${os.platform() === 'win32' ? 'bat' : 'sh'}`)
    fs.writeFileSync(statusScriptPath, statusScript)
    if (os.platform() !== 'win32') {
      fs.chmodSync(statusScriptPath, '755')
    }

    log(`Management scripts created in: ${this.installDir}`)
    logSuccess('Management scripts created successfully')
  }

  createWindowsStartScript() {
    return `@echo off
echo Starting Multi-Business Sync Service...
net start "${this.serviceConfig.name}"
if %ERRORLEVEL% == 0 (
    echo Service started successfully
) else (
    echo Failed to start service
    exit /b 1
)`
  }

  createWindowsStopScript() {
    return `@echo off
echo Stopping Multi-Business Sync Service...
net stop "${this.serviceConfig.name}"
if %ERRORLEVEL% == 0 (
    echo Service stopped successfully
) else (
    echo Failed to stop service
    exit /b 1
)`
  }

  createWindowsStatusScript() {
    return `@echo off
echo Checking Multi-Business Sync Service status...
sc.exe query "${this.serviceConfig.name}"
curl -s http://localhost:${this.options.syncPort + 1}/health 2>nul
if %ERRORLEVEL% == 0 (
    echo Health check: OK
) else (
    echo Health check: FAILED
)`
  }

  createUnixStartScript() {
    return `#!/bin/bash
echo "Starting Multi-Business Sync Service..."
sudo systemctl start "${this.serviceConfig.name}"
if [ $? -eq 0 ]; then
    echo "Service started successfully"
else
    echo "Failed to start service"
    exit 1
fi`
  }

  createUnixStopScript() {
    return `#!/bin/bash
echo "Stopping Multi-Business Sync Service..."
sudo systemctl stop "${this.serviceConfig.name}"
if [ $? -eq 0 ]; then
    echo "Service stopped successfully"
else
    echo "Failed to stop service"
    exit 1
fi`
  }

  createUnixStatusScript() {
    return `#!/bin/bash
echo "Checking Multi-Business Sync Service status..."
sudo systemctl status "${this.serviceConfig.name}" --no-pager
echo ""
echo "Health check:"
curl -s http://localhost:${this.options.syncPort + 1}/health || echo "Health check failed"`
  }

  async startService() {
    logStep('8/9', 'Starting service...')

    try {
      if (os.platform() === 'win32') {
        execSync(`net start "${this.serviceConfig.name}"`, { stdio: 'inherit' })
      } else {
        if (this.isElevated()) {
          execSync(`systemctl start ${this.serviceConfig.name}`, { stdio: 'inherit' })
        } else {
          logWarning('Cannot start service without elevated privileges')
          logWarning(`To start manually: sudo systemctl start ${this.serviceConfig.name}`)
          return
        }
      }

      // Wait a moment for service to start
      await new Promise(resolve => setTimeout(resolve, 3000))

      logSuccess('Service started successfully')

    } catch (error) {
      logWarning(`Service start failed: ${error.message}`)
      logWarning('You can start the service manually using the provided scripts')
    }
  }

  async verifyInstallation() {
    logStep('9/9', 'Verifying installation...')

    try {
      // Check if configuration files exist
      const configPath = path.join(this.configDir, 'service-config.json')
      if (!fs.existsSync(configPath)) {
        throw new Error('Service configuration file missing')
      }

      // Check if service runner exists
      const runnerPath = path.join(this.projectRoot, 'service', 'sync-service-runner.js')
      if (!fs.existsSync(runnerPath)) {
        throw new Error('Service runner script missing')
      }

      // Test health check endpoint
      try {
        const http = require('http')
        const options = {
          hostname: 'localhost',
          port: this.options.syncPort + 1,
          path: '/health',
          timeout: 5000
        }

        await new Promise((resolve, reject) => {
          const req = http.request(options, (res) => {
            let data = ''
            res.on('data', chunk => data += chunk)
            res.on('end', () => {
              if (res.statusCode === 200) {
                log('Health check: OK')
                resolve()
              } else {
                log('Health check: Service not ready')
                resolve() // Don't fail installation for this
              }
            })
          })

          req.on('error', () => {
            log('Health check: Service not responding')
            resolve() // Don't fail installation for this
          })

          req.on('timeout', () => {
            req.destroy()
            log('Health check: Timeout')
            resolve() // Don't fail installation for this
          })

          req.end()
        })

      } catch (error) {
        log('Health check: Unable to connect')
      }

      logSuccess('Installation verification completed')

    } catch (error) {
      throw new Error(`Installation verification failed: ${error.message}`)
    }
  }

  printInstallationSummary() {
    log('\n' + '='.repeat(60), 'bright')
    log('INSTALLATION SUMMARY', 'bright')
    log('='.repeat(60), 'bright')

    log(`\n📋 Service Information:`, 'bright')
    log(`   Name: ${this.serviceConfig.name}`)
    log(`   Display Name: ${this.serviceConfig.displayName}`)
    log(`   Port: ${this.options.syncPort}`)
    log(`   Health Check: http://localhost:${this.options.syncPort + 1}/health`)

    log(`\n📂 Important Directories:`, 'bright')
    log(`   Configuration: ${this.configDir}`)
    log(`   Logs: ${this.logsDir}`)
    log(`   Data: ${this.dataDir}`)

    log(`\n🔑 Security:`, 'bright')
    log(`   Registration Key: ${this.options.registrationKey.substring(0, 8)}...`)
    log(`   Encryption: Enabled`)
    log(`   Signatures: Enabled`)

    log(`\n⚙️  Management Commands:`, 'bright')
    if (os.platform() === 'win32') {
      log(`   Start:  net start "${this.serviceConfig.name}"`)
      log(`   Stop:   net stop "${this.serviceConfig.name}"`)
      log(`   Status: sc.exe query "${this.serviceConfig.name}"`)
    } else {
      log(`   Start:  sudo systemctl start ${this.serviceConfig.name}`)
      log(`   Stop:   sudo systemctl stop ${this.serviceConfig.name}`)
      log(`   Status: sudo systemctl status ${this.serviceConfig.name}`)
    }

    log(`\n📝 Next Steps:`, 'bright')
    log(`   1. Configure additional nodes with the same registration key`)
    log(`   2. Monitor logs in: ${this.logsDir}`)
    log(`   3. Access admin dashboard: http://localhost:8080/admin/sync`)
    log(`   4. Configure firewall for port ${this.options.syncPort}`)

    log('\n' + '='.repeat(60), 'bright')
  }
}

// Main execution
async function main() {
  const installer = new ServiceInstaller()

  try {
    const success = await installer.run()
    process.exit(success ? 0 : 1)
  } catch (error) {
    logError(`Service installation failed: ${error.message}`)
    process.exit(1)
  }
}

// Run installation if this file is executed directly
if (require.main === module) {
  main()
}

module.exports = { ServiceInstaller }