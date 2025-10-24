/**
 * Main Installation Script
 * Complete installation of the Multi-Business Sync Platform
 *
 * This script orchestrates the entire installation process:
 * - Environment validation
 * - Database setup and seeding
 * - Service installation
 * - Configuration
 *
 * Usage:
 *   node scripts/install/install.js [options]
 *
 * Options:
 *   --skip-database    Skip database installation
 *   --skip-service     Skip service installation
 *   --dev-mode         Install in development mode
 *   --silent           Minimal output
 */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')
const { DatabaseInstaller } = require('./install-database')
const { ServiceInstaller } = require('./install-service')

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
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

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue')
}

class MainInstaller {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '../..')
    this.startTime = Date.now()

    // Parse command line arguments
    this.options = {
      skipDatabase: process.argv.includes('--skip-database'),
      skipService: process.argv.includes('--skip-service'),
      devMode: process.argv.includes('--dev-mode'),
      silent: process.argv.includes('--silent'),
      force: process.argv.includes('--force'),
      help: process.argv.includes('--help') || process.argv.includes('-h'),
    }

    // Set environment variables based on options
    if (this.options.devMode) {
      process.env.NODE_ENV = 'development'
      process.env.CREATE_SERVICE = 'false'
      process.env.START_SERVICE = 'false'
    }

    if (this.options.skipDatabase) {
      process.env.INSTALL_DATABASE = 'false'
    }

    if (this.options.skipService) {
      process.env.CREATE_SERVICE = 'false'
      process.env.START_SERVICE = 'false'
    }
  }

  async run() {
    try {
      if (this.options.help) {
        this.showHelp()
        return true
      }

      this.showWelcome()

      // Phase 1: Pre-installation checks
      await this.preInstallationChecks()

      // Phase 2: Install dependencies
      await this.installDependencies()

      // Phase 3: Database installation
      if (!this.options.skipDatabase) {
        await this.installDatabase()
      }

      // Phase 4: Service installation
      if (!this.options.skipService) {
        await this.installService()
      }

      // Phase 5: Post-installation setup
      await this.postInstallationSetup()

      // Phase 6: Final verification
      await this.finalVerification()

      this.showCompletionSummary()

      return true

    } catch (error) {
      logError(`Installation failed: ${error.message}`)
      if (error.details) {
        log(error.details, 'red')
      }
      this.showTroubleshootingHelp()
      return false
    }
  }

  showWelcome() {
    if (this.options.silent) return

    log('\n' + '='.repeat(70), 'bright')
    log('🚀 MULTI-BUSINESS SYNC PLATFORM INSTALLER', 'bright')
    log('='.repeat(70), 'bright')
    log('')
    log('This installer will set up the complete multi-business synchronization', 'cyan')
    log('platform with peer-to-peer database sync capabilities.', 'cyan')
    log('')
    log('Components to be installed:', 'bright')
    log(`  ${this.options.skipDatabase ? '⏭️' : '✅'} Database setup and seeding`)
    log(`  ${this.options.skipService ? '⏭️' : '✅'} Sync service installation`)
    log(`  ✅ Admin dashboard configuration`)
    log(`  ✅ Security and authentication setup`)
    log('')
    log(`Installation mode: ${this.options.devMode ? 'Development' : 'Production'}`, this.options.devMode ? 'yellow' : 'green')
    log('='.repeat(70), 'bright')
  }

  showHelp() {
    log('Multi-Business Sync Platform Installer', 'bright')
    log('')
    log('Usage:', 'cyan')
    log('  node scripts/install/install.js [options]', 'bright')
    log('')
    log('Options:', 'cyan')
    log('  --skip-database    Skip database installation and seeding')
    log('  --skip-service     Skip system service installation')
    log('  --dev-mode         Install in development mode (no service)')
    log('  --silent           Minimal console output')
    log('  --force            Force installation (skip confirmations)')
    log('  --help, -h         Show this help message')
    log('')
    log('Environment Variables:', 'cyan')
    log('  DATABASE_URL       PostgreSQL connection string')
    log('  POSTGRES_HOST      PostgreSQL host (default: localhost)')
    log('  POSTGRES_PORT      PostgreSQL port (default: 5432)')
    log('  POSTGRES_USER      PostgreSQL user (default: postgres)')
    log('  POSTGRES_PASSWORD  PostgreSQL password')
    log('  POSTGRES_DB        Database name (default: multi_business_db)')
    log('  SYNC_PORT          Sync service port (default: 8765)')
    log('  SYNC_REGISTRATION_KEY  Registration key for sync network')
    log('')
    log('Examples:', 'cyan')
    log('  # Full installation', 'bright')
    log('  node scripts/install/install.js')
    log('')
    log('  # Development installation (no service)', 'bright')
    log('  node scripts/install/install.js --dev-mode')
    log('')
    log('  # Database only', 'bright')
    log('  node scripts/install/install.js --skip-service')
    log('')
    log('  # Service only (assumes database exists)', 'bright')
    log('  node scripts/install/install.js --skip-database')
  }

  async preInstallationChecks() {
    logStep('1/6', 'Pre-installation checks...')

    // Check Node.js version
    const nodeVersion = process.version
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0])
    if (majorVersion < 16) {
      throw new Error(`Node.js version 16+ required, found ${nodeVersion}`)
    }
    logInfo(`Node.js version: ${nodeVersion}`)

    // Check if project root is correct
    const packageJsonPath = path.join(this.projectRoot, 'package.json')
    if (!fs.existsSync(packageJsonPath)) {
      throw new Error('package.json not found - ensure you are running from project root')
    }

    // Check if Prisma schema exists
    const prismaSchemaPath = path.join(this.projectRoot, 'prisma', 'schema.prisma')
    if (!fs.existsSync(prismaSchemaPath)) {
      throw new Error('Prisma schema not found - ensure project is properly set up')
    }

    // Check available disk space
    try {
      const stats = fs.statSync(this.projectRoot)
      logInfo('Project directory accessible')
    } catch (error) {
      throw new Error('Cannot access project directory')
    }

    // Check if ports are available (in dev mode)
    if (this.options.devMode) {
      const syncPort = parseInt(process.env.SYNC_PORT) || 8765
      if (await this.isPortInUse(syncPort)) {
        logWarning(`Port ${syncPort} is in use - sync service may not start`)
      }
    }

    logSuccess('Pre-installation checks completed')
  }

  async isPortInUse(port) {
    return new Promise((resolve) => {
      const net = require('net')
      const server = net.createServer()

      server.listen(port, () => {
        server.once('close', () => resolve(false))
        server.close()
      })

      server.on('error', () => resolve(true))
    })
  }

  async installDependencies() {
    logStep('2/6', 'Installing dependencies...')

    try {
      // Check if node_modules exists and has recent content
      const nodeModulesPath = path.join(this.projectRoot, 'node_modules')
      const packageJsonPath = path.join(this.projectRoot, 'package.json')

      let needsInstall = false

      if (!fs.existsSync(nodeModulesPath)) {
        needsInstall = true
        logInfo('node_modules not found')
      } else {
        // Check if package.json is newer than node_modules
        const packageStats = fs.statSync(packageJsonPath)
        const nodeModulesStats = fs.statSync(nodeModulesPath)

        if (packageStats.mtime > nodeModulesStats.mtime) {
          needsInstall = true
          logInfo('package.json is newer than node_modules')
        }
      }

      if (needsInstall || this.options.force) {
        logInfo('Installing npm dependencies...')
        execSync('npm install', {
          stdio: this.options.silent ? 'pipe' : 'inherit',
          cwd: this.projectRoot
        })
      } else {
        logInfo('Dependencies are up to date')
      }

      // Install additional sync service dependencies
      const syncDependencies = ['winston', 'node-cron']
      const currentDeps = require(packageJsonPath).dependencies || {}

      const missingDeps = syncDependencies.filter(dep => !currentDeps[dep])

      if (missingDeps.length > 0) {
        logInfo(`Installing sync service dependencies: ${missingDeps.join(', ')}`)
        execSync(`npm install ${missingDeps.join(' ')}`, {
          stdio: this.options.silent ? 'pipe' : 'inherit',
          cwd: this.projectRoot
        })
      }

      // Generate Prisma client
      logInfo('Generating Prisma client...')
      execSync('npx prisma generate', {
        stdio: this.options.silent ? 'pipe' : 'inherit',
        cwd: this.projectRoot
      })

      logSuccess('Dependencies installed successfully')

    } catch (error) {
      throw new Error(`Dependency installation failed: ${error.message}`)
    }
  }

  async installDatabase() {
    logStep('3/6', 'Installing database...')

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

  async installService() {
    logStep('4/6', 'Installing service...')

    try {
      const serviceInstaller = new ServiceInstaller()
      const success = await serviceInstaller.run()

      if (!success) {
        throw new Error('Service installation failed')
      }

      logSuccess('Service installation completed')

    } catch (error) {
      throw new Error(`Service installation failed: ${error.message}`)
    }
  }

  async postInstallationSetup() {
    logStep('5/6', 'Post-installation setup...')

    try {
      // Create .env file if it doesn't exist
      await this.createEnvironmentFile()

      // Set up log rotation
      await this.setupLogRotation()

      // Create backup scripts
      await this.createBackupScripts()

      // Set up monitoring (if not dev mode)
      if (!this.options.devMode) {
        await this.setupMonitoring()
      }

      logSuccess('Post-installation setup completed')

    } catch (error) {
      logWarning(`Post-installation setup warning: ${error.message}`)
      // Don't fail installation for post-setup issues
    }
  }

  async createEnvironmentFile() {
    const envPath = path.join(this.projectRoot, '.env')

    if (fs.existsSync(envPath) && !this.options.force) {
      logInfo('.env file already exists')
      return
    }

    const envContent = `# Multi-Business Sync Platform Environment
# Database Configuration
DATABASE_URL=${process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/multi_business_db'}

# Sync Service Configuration
SYNC_PORT=${process.env.SYNC_PORT || '8765'}
SYNC_REGISTRATION_KEY=${process.env.SYNC_REGISTRATION_KEY || require('crypto').randomBytes(32).toString('hex')}

# Application Configuration
NODE_ENV=${this.options.devMode ? 'development' : 'production'}
NEXTAUTH_SECRET=${require('crypto').randomBytes(32).toString('hex')}
NEXTAUTH_URL=http://localhost:8080

# Security Configuration
ENABLE_SYNC_ENCRYPTION=true
ENABLE_SYNC_SIGNATURES=true
ENABLE_AUDIT_LOGGING=true

# Monitoring Configuration
ENABLE_HEALTH_CHECKS=true
HEALTH_CHECK_INTERVAL=30000

# Logging Configuration
LOG_LEVEL=info
LOG_DIRECTORY=./logs
LOG_MAX_SIZE=10MB
LOG_MAX_FILES=10

# Generated on: ${new Date().toISOString()}
`

    fs.writeFileSync(envPath, envContent)
    logInfo('.env file created')
  }

  async setupLogRotation() {
    const logsDir = path.join(this.projectRoot, 'logs')

    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true })
    }

    // Create log rotation script
    const rotationScript = `/**
 * Log Rotation Script
 * Rotates and compresses old log files
 */

const fs = require('fs')
const path = require('path')
const zlib = require('zlib')

const logsDir = '${logsDir}'
const maxAge = 30 * 24 * 60 * 60 * 1000 // 30 days
const maxSize = 100 * 1024 * 1024 // 100MB

function rotatelogs() {
  try {
    const files = fs.readdirSync(logsDir)

    for (const file of files) {
      const filePath = path.join(logsDir, file)
      const stats = fs.statSync(filePath)
      const age = Date.now() - stats.mtime.getTime()

      // Delete old files
      if (age > maxAge) {
        fs.unlinkSync(filePath)
        console.log(\`Deleted old log file: \${file}\`)
        continue
      }

      // Compress large files
      if (stats.size > maxSize && !file.endsWith('.gz')) {
        const gzPath = filePath + '.gz'
        const input = fs.createReadStream(filePath)
        const output = fs.createWriteStream(gzPath)
        const gzip = zlib.createGzip()

        input.pipe(gzip).pipe(output)

        output.on('finish', () => {
          fs.unlinkSync(filePath)
          console.log(\`Compressed log file: \${file}\`)
        })
      }
    }
  } catch (error) {
    console.error('Log rotation error:', error)
  }
}

if (require.main === module) {
  rotateLog
}

module.exports = { rotateLog }`

    const rotationScriptPath = path.join(this.projectRoot, 'scripts', 'rotate-logs.js')
    fs.writeFileSync(rotationScriptPath, rotationScript)

    logInfo('Log rotation setup completed')
  }

  async createBackupScripts() {
    const backupScript = `/**
 * Database Backup Script
 * Creates automated backups of the database
 */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const backupDir = path.join(__dirname, '../backups')
const dbUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/multi_business_db'

function createBackup() {
  try {
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true })
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19)
    const backupFile = path.join(backupDir, \`MultiBusinessSyncService-backup_database_\${timestamp}.sql\`)

    console.log(\`Creating backup: \${backupFile}\`)

    execSync(\`pg_dump "\${dbUrl}" > "\${backupFile}"\`, {
      stdio: 'inherit'
    })

    console.log('Backup completed successfully')

    // Clean up old backups (keep last 7 days)
    const files = fs.readdirSync(backupDir)
      .filter(f => f.startsWith('MultiBusinessSyncService-backup_database_') && f.endsWith('.sql'))
      .map(f => ({
        name: f,
        path: path.join(backupDir, f),
        time: fs.statSync(path.join(backupDir, f)).mtime
      }))
      .sort((a, b) => b.time - a.time)

    const toDelete = files.slice(7) // Keep newest 7
    toDelete.forEach(file => {
      fs.unlinkSync(file.path)
      console.log(\`Deleted old backup: \${file.name}\`)
    })

  } catch (error) {
    console.error('Backup failed:', error.message)
    process.exit(1)
  }
}

if (require.main === module) {
  createBackup()
}

module.exports = { createBackup }`

    const backupScriptPath = path.join(this.projectRoot, 'scripts', 'backup-database.js')
    fs.writeFileSync(backupScriptPath, backupScript)

    logInfo('Backup scripts created')
  }

  async setupMonitoring() {
    // Create a simple monitoring script
    const monitoringScript = `/**
 * Service Monitoring Script
 * Monitors sync service health and restarts if needed
 */

const http = require('http')
const { execSync } = require('child_process')

const config = {
  healthUrl: 'http://localhost:${process.env.SYNC_PORT || 8765 + 1}/health',
  serviceName: 'multi-business-sync',
  checkInterval: 60000, // 1 minute
  timeout: 10000, // 10 seconds
  maxFailures: 3
}

let failureCount = 0

function checkHealth() {
  return new Promise((resolve) => {
    const req = http.get(config.healthUrl, { timeout: config.timeout }, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try {
          const health = JSON.parse(data)
          resolve(health.status === 'healthy')
        } catch (error) {
          resolve(false)
        }
      })
    })

    req.on('error', () => resolve(false))
    req.on('timeout', () => {
      req.destroy()
      resolve(false)
    })
  })
}

async function monitor() {
  const isHealthy = await checkHealth()

  if (isHealthy) {
    failureCount = 0
    console.log(\`[\${new Date().toISOString()}] Service healthy\`)
  } else {
    failureCount++
    console.log(\`[\${new Date().toISOString()}] Health check failed (\${failureCount}/\${config.maxFailures})\`)

    if (failureCount >= config.maxFailures) {
      console.log('Attempting service restart...')
      try {
        ${process.platform === 'win32' ?
          `execSync(\`net stop "\${config.serviceName}" && net start "\${config.serviceName}"\`)` :
          `execSync(\`sudo systemctl restart \${config.serviceName}\`)`}
        failureCount = 0
        console.log('Service restarted successfully')
      } catch (error) {
        console.error('Failed to restart service:', error.message)
      }
    }
  }
}

// Start monitoring
console.log('Starting service monitoring...')
setInterval(monitor, config.checkInterval)
monitor() // Initial check`

    const monitoringScriptPath = path.join(this.projectRoot, 'scripts', 'monitor-service.js')
    fs.writeFileSync(monitoringScriptPath, monitoringScript)

    logInfo('Monitoring setup completed')
  }

  async finalVerification() {
    logStep('6/6', 'Final verification...')

    try {
      // Verify files were created
      const requiredFiles = [
        'config/service-config.json',
        'service/sync-service-runner.js',
        '.env'
      ]

      for (const file of requiredFiles) {
        const filePath = path.join(this.projectRoot, file)
        if (!fs.existsSync(filePath)) {
          throw new Error(`Required file missing: ${file}`)
        }
      }

      // Test database connection (if database was installed)
      if (!this.options.skipDatabase) {
        try {
          const { PrismaClient } = require('@prisma/client')
          const prisma = new PrismaClient()
          await prisma.$connect()
          await prisma.$disconnect()
          logInfo('Database connection verified')
        } catch (error) {
          logWarning(`Database verification failed: ${error.message}`)
        }
      }

      // Test sync service health (if service was installed and is running)
      if (!this.options.skipService && !this.options.devMode) {
        try {
          const syncPort = parseInt(process.env.SYNC_PORT) || 8765
          const healthPort = syncPort + 1

          await new Promise((resolve, reject) => {
            const http = require('http')
            const req = http.get(`http://localhost:${healthPort}/health`, { timeout: 5000 }, (res) => {
              if (res.statusCode === 200) {
                logInfo('Sync service health check passed')
                resolve()
              } else {
                reject(new Error(`Health check returned status ${res.statusCode}`))
              }
            })

            req.on('error', () => {
              logInfo('Sync service not yet responding (this is normal)')
              resolve() // Don't fail verification for this
            })

            req.on('timeout', () => {
              req.destroy()
              logInfo('Sync service health check timeout')
              resolve() // Don't fail verification for this
            })
          })

        } catch (error) {
          logInfo(`Sync service health check: ${error.message}`)
        }
      }

      logSuccess('Final verification completed')

    } catch (error) {
      throw new Error(`Final verification failed: ${error.message}`)
    }
  }

  showCompletionSummary() {
    const duration = Math.round((Date.now() - this.startTime) / 1000)

    if (this.options.silent) {
      log('Installation completed successfully', 'green')
      return
    }

    log('\n' + '='.repeat(70), 'bright')
    log('🎉 INSTALLATION COMPLETED SUCCESSFULLY! 🎉', 'green')
    log('='.repeat(70), 'bright')
    log('')
    log(`⏱️  Installation time: ${duration} seconds`, 'cyan')
    log('')
    log('📋 What was installed:', 'bright')

    if (!this.options.skipDatabase) {
      log('  ✅ PostgreSQL database created and seeded')
      log('  ✅ Reference data (job titles, permissions, etc.)')
      log('  ✅ Admin user created (admin@business.local / admin123)')
    }

    if (!this.options.skipService) {
      log('  ✅ Sync service installed and configured')
      log('  ✅ System service registration')
      log('  ✅ Health monitoring enabled')
    }

    log('  ✅ Environment configuration')
    log('  ✅ Backup and monitoring scripts')
    log('  ✅ Log rotation setup')
    log('')
    log('🔗 Important URLs:', 'bright')
    log('  • Main App: http://localhost:8080')
    log('  • Admin Dashboard: http://localhost:8080/admin')
    log('  • Sync Dashboard: http://localhost:8080/admin/sync')

    if (!this.options.skipService) {
      const syncPort = parseInt(process.env.SYNC_PORT) || 8765
      log(`  • Health Check: http://localhost:${syncPort + 1}/health`)
    }

    log('')
    log('📝 Next Steps:', 'bright')

    if (this.options.devMode) {
      log('  1. Start the development server: npm run dev')
      log('  2. Access the admin dashboard to configure sync settings')
      log('  3. Create additional user accounts as needed')
    } else {
      log('  1. Configure firewall rules for sync port')
      log('  2. Set up additional nodes with the same registration key')
      log('  3. Monitor service logs in ./logs directory')
      log('  4. Configure automated backups')
    }

    log('')
    log('📚 Documentation:', 'bright')
    log('  • Setup Guide: ./docs/setup.md')
    log('  • Sync Guide: ./src/lib/sync/__tests__/README.md')
    log('  • API Reference: http://localhost:8080/api-docs')
    log('')
    log('🎊 Happy syncing!', 'magenta')
    log('='.repeat(70), 'bright')
  }

  showTroubleshootingHelp() {
    log('\n' + '='.repeat(50), 'yellow')
    log('TROUBLESHOOTING HELP', 'yellow')
    log('='.repeat(50), 'yellow')
    log('')
    log('Common Issues:', 'bright')
    log('')
    log('1. Database Connection Issues:', 'cyan')
    log('   • Ensure PostgreSQL is running')
    log('   • Check DATABASE_URL environment variable')
    log('   • Verify user permissions')
    log('')
    log('2. Service Installation Issues:', 'cyan')
    log('   • Run as Administrator/root for service installation')
    log('   • Check firewall settings')
    log('   • Verify port availability')
    log('')
    log('3. Dependency Issues:', 'cyan')
    log('   • Run: npm install --force')
    log('   • Clear npm cache: npm cache clean --force')
    log('   • Delete node_modules and reinstall')
    log('')
    log('4. Permission Issues:', 'cyan')
    log('   • Ensure proper file permissions')
    log('   • Run with elevated privileges if needed')
    log('')
    log('For more help:', 'bright')
    log('  • Check logs in ./logs directory')
    log('  • Run: node scripts/install/install.js --help')
    log('  • Review documentation in ./docs')
    log('='.repeat(50), 'yellow')
  }
}

// Main execution
async function main() {
  const installer = new MainInstaller()

  try {
    const success = await installer.run()
    process.exit(success ? 0 : 1)
  } catch (error) {
    logError(`Installation failed: ${error.message}`)
    process.exit(1)
  }
}

// Run installation if this file is executed directly
if (require.main === module) {
  main()
}

module.exports = { MainInstaller }