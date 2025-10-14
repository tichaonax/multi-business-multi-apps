/**
 * Multi-Business Sync Service Runner
 * Runs the sync service as a system service
 */

const path = require('path')
const fs = require('fs')
// Prefer compiled dist module when available (production). Fallback to src for dev.
let SyncService
try {
  SyncService = require('../dist/lib/sync/sync-service').SyncService
} catch (e1) {
  try {
    SyncService = require('../src/lib/sync/sync-service').SyncService
  } catch (e2) {
    // Leave undefined; errors will surface when attempting to start the service.
    SyncService = undefined
  }
}

// Load configuration
const configPath = path.join(__dirname, '../config/service-config.json')
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'))

// Load environment variables
const envPath = path.join(__dirname, '../config/service.env')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8')
  const lines = envContent.split('\n').filter(line => line.trim() && !line.startsWith('#'))

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
      // Perform lightweight pre-start checks (with retries/backoff)
      await this.performDbPrecheck()

      // Run database migrations
      await this.runMigrations()

      // Debug registration key sources
      logger.info('Registration Key Sources Debug:', {
        fromServiceConfig: config.sync.registrationKey ? `[${config.sync.registrationKey.length} chars]` : 'undefined',
        fromEnvVar: process.env.SYNC_REGISTRATION_KEY ? `[${process.env.SYNC_REGISTRATION_KEY.length} chars]` : 'undefined',
        envVarFirst8: process.env.SYNC_REGISTRATION_KEY ? process.env.SYNC_REGISTRATION_KEY.substring(0, 8) : 'none',
        configFirst8: config.sync.registrationKey ? config.sync.registrationKey.substring(0, 8) : 'none'
      })

      // Override registrationKey with environment variable if present
      if (process.env.SYNC_REGISTRATION_KEY) {
        logger.info('Overriding registrationKey with environment variable value')
        config.sync.registrationKey = process.env.SYNC_REGISTRATION_KEY
      }

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
        logger.info(`Attempting restart ${this.restartCount}/${this.maxRestarts} in ${this.restartDelay}ms`)

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
      logger.info(`Health check server listening on port ${healthPort}`)
    })

    return server
  }

  /**
   * Perform a lightweight database precheck with retries and exponential backoff.
   * Respects SKIP_DB_PRECHECK=true to bypass in CI or special environments.
   */
  async performDbPrecheck() {
    const skip = (process.env.SKIP_DB_PRECHECK || 'false').toLowerCase() === 'true'
    if (skip) {
      logger.info('SKIP_DB_PRECHECK=true, skipping database precheck')
      return
    }

    const maxAttempts = parseInt(process.env.DB_PRECHECK_ATTEMPTS || '3', 10)
    const baseDelay = parseInt(process.env.DB_PRECHECK_BASE_DELAY_MS || '500', 10) // 500ms

    // Validate DATABASE_URL is available with explicit source logging
    const dbUrl = process.env.DATABASE_URL || config.databaseUrl || null
    if (!dbUrl) {
      logger.error('DATABASE_URL not set; service cannot connect to database')
      logger.error('Checked sources: process.env.DATABASE_URL, config.databaseUrl')
      logger.error('Ensure config/service.env exists and contains DATABASE_URL')
      throw new Error('Missing DATABASE_URL')
    }

    // Log where DATABASE_URL was loaded from for debugging
    const source = process.env.DATABASE_URL ? 'process.env (loaded from config/service.env)' : 'service-config.json'
    logger.info(`DATABASE_URL loaded from: ${source}`)

    // Validate URL format
    if (!dbUrl.startsWith('postgresql://') && !dbUrl.startsWith('postgres://')) {
      logger.error(`Invalid DATABASE_URL format: ${dbUrl.substring(0, 20)}...`)
      throw new Error('DATABASE_URL must be a valid PostgreSQL connection string')
    }

    // Try to use Prisma for a cheap readiness probe
    let lastErr = null
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        logger.info(`DB precheck attempt ${attempt}/${maxAttempts}`)
        const { PrismaClient } = require('@prisma/client')
        const p = new PrismaClient({ datasources: { db: { url: dbUrl } } })
        await p.$connect()
        // Use a safe raw query
        await p.$queryRaw`SELECT 1`
        await p.$disconnect()
        logger.info('Database connectivity check passed')
        return
      } catch (err) {
        lastErr = err
        logger.warn(`DB precheck attempt ${attempt} failed: ${err.message}`)
        if (attempt < maxAttempts) {
          const delay = baseDelay * Math.pow(2, attempt - 1)
          logger.info(`Waiting ${delay}ms before next DB precheck attempt`)
          await new Promise(r => setTimeout(r, delay))
        }
      }
    }

    logger.error('Database precheck failed after all attempts', { error: lastErr && lastErr.message })
    throw lastErr || new Error('Database precheck failed')
  }

  /**
   * Run database migrations on service startup.
   * Respects SKIP_MIGRATIONS=true to bypass in special environments.
   */
  async runMigrations() {
    const skip = (process.env.SKIP_MIGRATIONS || 'false').toLowerCase() === 'true'
    if (skip) {
      logger.info('SKIP_MIGRATIONS=true, skipping database migrations')
      return
    }

    logger.info('Running database migrations...')

    return new Promise((resolve, reject) => {
      const { exec } = require('child_process')
      const migrationCommand = 'npx prisma migrate deploy'

      exec(migrationCommand, { cwd: path.join(__dirname, '..') }, (error, stdout, stderr) => {
        if (error) {
          logger.error('Migration execution failed', {
            error: error.message,
            stdout: stdout,
            stderr: stderr
          })

          // Log warning but don't fail service startup
          // This allows service to start even if migrations fail (e.g., no pending migrations)
          logger.warn('Service will continue despite migration failure. Manual migration may be required.')
          return resolve()
        }

        if (stdout) {
          logger.info('Migration output:', { output: stdout })
        }

        if (stderr) {
          logger.warn('Migration warnings:', { warnings: stderr })
        }

        logger.info('Database migrations completed successfully')
        resolve()
      })
    })
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

module.exports = { ServiceRunner }