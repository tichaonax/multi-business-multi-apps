#!/usr/bin/env node
/**
 * Sync Service Runner
 * Entry point for running the sync service independently of the main app
 * Based on electricity-tokens service architecture
 */

// Load environment variables from .env.local and .env files
import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'

// CRITICAL: When running as Windows service, process.cwd() may not be the app directory
// Navigate from dist/service/ to project root (when compiled, this is dist/service/sync-service-runner.js)
// __dirname will be dist/service in compiled code
const PROJECT_ROOT = path.resolve(__dirname, '..', '..')

// Load .env.local first (higher priority), then .env
const envLocalPath = path.join(PROJECT_ROOT, '.env.local')
const envPath = path.join(PROJECT_ROOT, '.env')

console.log('📂 Loading environment variables...')
console.log(`   Project root: ${PROJECT_ROOT}`)

if (fs.existsSync(envLocalPath)) {
  console.log(`   Loading: .env.local`)
  dotenv.config({ path: envLocalPath })
} else {
  console.warn(`   ⚠️  .env.local not found at: ${envLocalPath}`)
}

if (fs.existsSync(envPath)) {
  console.log(`   Loading: .env`)
  dotenv.config({ path: envPath })
} else {
  console.warn(`   ⚠️  .env not found at: ${envPath}`)
}

// CRITICAL: Verify DATABASE_URL is loaded
if (!process.env.DATABASE_URL) {
  console.error('❌ CRITICAL: DATABASE_URL not found in environment!')
  console.error('   Checked paths:')
  console.error(`     - ${envLocalPath}`)
  console.error(`     - ${envPath}`)
  console.error('   This sync service requires DATABASE_URL to run migrations and access the database.')
  console.error('   Please ensure .env or .env.local contains DATABASE_URL before starting the service.')
  process.exit(1)
}

console.log('✅ DATABASE_URL loaded successfully')

import { createSyncService, getDefaultSyncConfig, SyncServiceConfig } from '../lib/sync/sync-service'
import { generateNodeId } from '../lib/sync/database-hooks'
import { hostname } from 'os'
import { exec, spawn, ChildProcess } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

interface ServiceConfiguration extends SyncServiceConfig {
  autoRestart: boolean
  restartDelay: number
  maxRestartAttempts: number
}

class SyncServiceRunner {
  private service: any = null
  private electronProcess: ChildProcess | null = null
  private config: ServiceConfiguration
  private restartAttempts = 0
  private isShuttingDown = false

  constructor() {
    this.config = this.loadConfiguration()
    this.setupErrorHandlers()
  }

  /**
   * Load service configuration
   */
  private loadConfiguration(): ServiceConfiguration {
    const configPath = path.join(process.cwd(), 'data', 'sync', 'config.json')
    
    const defaultConfig: ServiceConfiguration = {
      ...getDefaultSyncConfig(),
      nodeId: generateNodeId(),
      nodeName: `sync-node-${hostname()}`,
      registrationKey: process.env.SYNC_REGISTRATION_KEY || 'b3f1c9d7a5e4f2c3819d6b7a2e4f0c1d2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7',
  port: parseInt(process.env.SYNC_PORT || '8765'),
      syncInterval: parseInt(process.env.SYNC_INTERVAL || '30000'),
      enableAutoStart: true,
      logLevel: (process.env.LOG_LEVEL as any) || 'info',
      dataDirectory: path.join(process.cwd(), 'data', 'sync'),
      maxLogSize: 10 * 1024 * 1024,
      maxLogFiles: 5,
      autoRestart: true,
      restartDelay: 5000, // 5 seconds
      maxRestartAttempts: 5
    }

    try {
      if (fs.existsSync(configPath)) {
        const configFile = JSON.parse(fs.readFileSync(configPath, 'utf8'))
        return { ...defaultConfig, ...configFile }
      }
    } catch (error) {
      console.warn('Failed to load config file, using defaults:', error)
    }

    return defaultConfig
  }

  /**
   * Save current configuration
   */
  private saveConfiguration(): void {
    try {
      const configPath = path.join(this.config.dataDirectory, 'config.json')

      // Ensure directory exists
      const configDir = path.dirname(configPath)
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true })
      }

      fs.writeFileSync(configPath, JSON.stringify(this.config, null, 2))
    } catch (error) {
      console.error('Failed to save configuration:', error)
    }
  }

  /**
   * Run database migrations and seeding
   */
  private async runDatabaseSetup(): Promise<void> {
    try {
      console.log('🗄️  Running database migrations...')

      // Run migrations
      await execAsync('npx prisma migrate deploy', {
        cwd: process.cwd(),
        env: { ...process.env }
      })
      console.log('✅ Database migrations completed')

      // Verify critical tables exist before proceeding
      await this.verifyDatabaseSchema()

      // Run seeding
      console.log('🌱 Seeding reference data...')
      await execAsync('npm run seed:migration', {
        cwd: process.cwd(),
        env: { ...process.env }
      })
      console.log('✅ Database seeding completed')

    } catch (error) {
      console.error('❌ Database setup failed:', error instanceof Error ? error.message : error)
      console.log('💥 Sync service cannot start without a properly configured database')
      throw new Error(`Database setup failed: ${error instanceof Error ? error.message : error}`)
    }
  }

  /**
   * Verify that critical database tables exist before starting sync service
   */
  private async verifyDatabaseSchema(): Promise<void> {
    try {
      console.log('🔍 Verifying database schema...')

      // DISABLED: Schema regeneration was overwriting API fixes
      // The schema should be managed manually to ensure API compatibility
      // Run prisma db pull to sync schema with database
      // console.log('📡 Syncing schema with database...')
      // await execAsync('npx prisma db pull --force', {
      //   cwd: process.cwd(),
      //   env: { ...process.env }
      // })

      // Convert schema to PascalCase using existing script
      // console.log('🔄 Converting schema to PascalCase...')
      // await execAsync('node scripts/convert-schema-to-pascal.js', {
      //   cwd: process.cwd(),
      //   env: { ...process.env }
      // })

      // Test that we can connect to the database and access key tables
      const { PrismaClient } = await import('@prisma/client')
      const prisma = new PrismaClient()

      try {
        // Try to query a critical table that sync service needs
        const res = await prisma.$queryRaw`SELECT 1 as ok FROM information_schema.tables WHERE table_name = 'sync_nodes' LIMIT 1`

        // Prisma raw results can vary; treat any non-empty array as success
        const hasTable = Array.isArray(res) ? res.length > 0 : !!res

        if (!hasTable) {
          throw new Error('sync_nodes table not found - run migrations first')
        }

        // Verify we can access the sync_nodes table directly
        await prisma.$queryRaw`SELECT COUNT(*) FROM sync_nodes LIMIT 1`

        console.log('✅ Database schema verification completed')
      } finally {
        await prisma.$disconnect()
      }

    } catch (error) {
      console.error('❌ Database schema verification failed:', error instanceof Error ? error.message : error)
      throw new Error(`Database schema is not ready: ${error instanceof Error ? error.message : error}`)
    }
  }

  /**
   * Start the sync service
   */
  async start(options: { forceBuild?: boolean } = {}): Promise<void> {
    try {
      console.log(`Starting Sync Service: ${this.config.nodeName}`)
      console.log(`Node ID: ${this.config.nodeId}`)
      console.log(`Port: ${this.config.port}`)
      console.log(`Registration Key: ${this.config.registrationKey ? '***' : 'NOT SET'}`)
      console.log(`Data Directory: ${this.config.dataDirectory}`)

      if (!this.config.registrationKey || this.config.registrationKey === 'b3f1c9d7a5e4f2c3819d6b7a2e4f0c1d2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7') {
        console.warn('⚠️  WARNING: Using default registration key! Change SYNC_REGISTRATION_KEY environment variable for production.')
      }

      // Check if build is needed (with force-build override) - BEFORE database setup
      if (await this.isBuildRequired(options.forceBuild)) {
        await this.forceBuild()
      }

      // Run database setup after build
      if (process.env.SKIP_SYNC_RUNNER_MIGRATIONS !== 'true') {
        await this.runDatabaseSetup()
      } else {
        console.log('🔄 Skipping database setup (handled by service wrapper)')
        // Still verify schema is ready
        await this.verifyDatabaseSchema()
      }

      this.service = createSyncService(this.config)

      // Setup service event handlers
      this.setupServiceEventHandlers()

      // Save configuration
      this.saveConfiguration()

      // Start the service
      await this.service.start()

      this.restartAttempts = 0 // Reset on successful start
      console.log('🚀 Sync service started successfully')

      // Start Electron with display detection (polls until 2 displays are found)
      this.startElectronWithDisplayCheck()

    } catch (error) {
      console.error('❌ Failed to start sync service:', error)

      if (this.config.autoRestart && !this.isShuttingDown) {
        await this.handleRestart(error)
      } else {
        process.exit(1)
      }
    }
  }

  /**
   * Stop the sync service
   */
  async stop(): Promise<void> {
    this.isShuttingDown = true

    // Stop Electron first before stopping the service
    this.stopElectron()

    if (this.service) {
      try {
        console.log('Stopping sync service...')
        await this.service.stop()
        console.log('✅ Sync service stopped')
      } catch (error) {
        console.error('Error stopping sync service:', error)
      }
    }
  }

  /**
   * Verify the C# launcher helper exists (pre-built during service build)
   */
  private verifyLauncherExists(): boolean {
    const launcherPath = path.join(PROJECT_ROOT, 'windows-service', 'LaunchInUserSession.exe')

    // Check if launcher exists
    if (fs.existsSync(launcherPath)) {
      console.log('[Launcher] ✅ LaunchInUserSession.exe found')
      return true
    }

    console.error('[Launcher] ❌ LaunchInUserSession.exe not found!')
    console.error('[Launcher] Run "npm run build:service" to build the launcher')
    console.error('[Launcher] Path expected:', launcherPath)
    return false
  }

  /**
   * Wait briefly before launching Electron
   * Gives system time to stabilize after boot
   */
  private async waitBeforeLaunch(): Promise<void> {
    const waitSeconds = 10
    console.log(`⏳ Waiting ${waitSeconds} seconds for system to stabilize...`)
    await new Promise(resolve => setTimeout(resolve, waitSeconds * 1000))
    console.log('✅ Ready to launch Electron')
  }

  /**
   * Start Electron kiosk application in user session using CreateProcessAsUser
   */
  private async startElectronWithDisplayCheck(): Promise<void> {
    console.log('🖥️  Preparing to start Electron in user session...')

    try {
      // Step 1: Verify launcher exists (pre-built during service build)
      const launcherReady = this.verifyLauncherExists()
      if (!launcherReady) {
        console.error('[Electron] Cannot start - launcher not found')
        console.error('[Electron] Run "npm run build:service" to build the launcher')
        return
      }

      // Step 2: Wait for system to stabilize
      // Note: C# launcher will check for active user session using WTSGetActiveConsoleSessionId()
      // If no user logged in, it will return error code 2 and retry
      await this.waitBeforeLaunch()

      // Step 3: Launch Electron in user session
      const launcherPath = path.join(PROJECT_ROOT, 'windows-service', 'LaunchInUserSession.exe')
      const electronPath = path.join(PROJECT_ROOT, 'electron')
      const PORT = process.env.PORT || process.env.NEXT_PUBLIC_PORT || '8080'

      console.log('[Electron] Launching in user session via CreateProcessAsUser...')
      console.log(`[Electron] Working directory: ${electronPath}`)
      console.log(`[Electron] PORT: ${PORT}`)

      // Find npm executable (npm.cmd on Windows)
      // npm is typically in C:\Program Files\nodejs\npm.cmd
      const npmCmd = 'C:\\Program Files\\nodejs\\npm.cmd'

      // Build command line arguments for npm start
      // Format: "C:\Program Files\nodejs\npm.cmd" "start" "--prefix" "C:\path\to\electron"
      const npmArgs = `start --prefix "${electronPath}"`

      // Build environment variable string
      // Format: PORT=8080 NODE_ENV=production
      const envVars = `PORT=${PORT} NODE_ENV=production`

      // Use cmd.exe to set environment and run npm
      const cmdExe = 'C:\\Windows\\System32\\cmd.exe'
      const cmdArgs = `/c "set ${envVars} && cd /d "${electronPath}" && "${npmCmd}" start"`

      console.log(`[Electron] Command: ${cmdExe} ${cmdArgs}`)

      // Use launcher to start cmd.exe with npm
      this.electronProcess = spawn(launcherPath, [cmdExe, cmdArgs], {
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: false
      })

      this.electronProcess.stdout?.on('data', (data: Buffer) => {
        const output = data.toString().trim()
        console.log('[Launcher]', output)
      })

      this.electronProcess.stderr?.on('data', (data: Buffer) => {
        const error = data.toString().trim()
        console.error('[Launcher Error]', error)
      })

      this.electronProcess.on('exit', (code, signal) => {
        console.log(`[Launcher] Process exited with code ${code}, signal ${signal}`)

        if (!this.isShuttingDown && code !== 0) {
          // Error code 2 = no active console session (user not logged in)
          if (code === 2) {
            console.log('[Electron] No user logged in yet, waiting 30 seconds...')
            setTimeout(() => {
              this.startElectronWithDisplayCheck()
            }, 30000)
          } else {
            console.log('[Electron] Launch failed (code ' + code + '), retrying in 10 seconds...')
            setTimeout(() => {
              this.startElectronWithDisplayCheck()
            }, 10000)
          }
        }
      })

      this.electronProcess.on('error', (error: Error) => {
        console.error('[Launcher] Failed to start:', error.message)
      })

      console.log('✅ Electron launch command sent to user session')
      console.log('   Electron should now have access to all displays')
    } catch (error: any) {
      console.error('[Electron] Error starting Electron:', error.message)
    }
  }

  /**
   * Stop Electron kiosk application
   */
  private stopElectron(): void {
    if (this.electronProcess && !this.electronProcess.killed) {
      console.log('🛑 Stopping Electron kiosk...')
      this.electronProcess.kill('SIGTERM')

      setTimeout(() => {
        if (this.electronProcess && !this.electronProcess.killed) {
          console.log('[Electron] Force killing process')
          this.electronProcess.kill('SIGKILL')
        }
      }, 5000)
    }
  }

  /**
   * Restart the sync service
   */
  async restart(): Promise<void> {
    console.log('Restarting sync service...')
    await this.stop()
    await new Promise(resolve => setTimeout(resolve, 2000))
    await this.start()
  }

  /**
   * Handle automatic restart
   */
  private async handleRestart(error: any): Promise<void> {
    this.restartAttempts++

    if (this.restartAttempts > this.config.maxRestartAttempts) {
      console.error(`❌ Maximum restart attempts (${this.config.maxRestartAttempts}) exceeded. Exiting.`)
      process.exit(1)
    }

    console.log(`🔄 Attempting restart ${this.restartAttempts}/${this.config.maxRestartAttempts} in ${this.config.restartDelay}ms...`)

    await new Promise(resolve => setTimeout(resolve, this.config.restartDelay))

    if (!this.isShuttingDown) {
      await this.start()
    }
  }

  /**
   * Setup service event handlers
   */
  private setupServiceEventHandlers(): void {
    if (!this.service) return

    this.service.on('started', (status: any) => {
      console.log('📡 Service started:', status.nodeName)
    })

    this.service.on('stopped', () => {
      console.log('⏹️  Service stopped')
    })

    this.service.on('peer_discovered', (peer: any) => {
      console.log(`🔍 Peer discovered: ${peer.nodeName} (${peer.ipAddress}:${peer.port})`)
    })

    this.service.on('peer_left', (peer: any) => {
      console.log(`👋 Peer left: ${peer.nodeName}`)
    })

    this.service.on('sync_completed', ({ peer, sentEvents, receivedEvents }: any) => {
      console.log(`🔄 Sync completed with ${peer.nodeName}: ↑${sentEvents} ↓${receivedEvents}`)
    })

    this.service.on('sync_failed', ({ peer, error }: any) => {
      console.error(`❌ Sync failed with ${peer.nodeName}:`, error.message)
    })

    this.service.on('conflict_resolved', (conflict: any) => {
      console.log(`⚖️  Conflict resolved using ${conflict.strategy}`)
    })

    this.service.on('health_check', (status: any) => {
      if (this.config.logLevel === 'debug') {
        console.log(`💓 Health: ${status.peersConnected} peers, uptime: ${Math.round(status.uptime / 1000)}s`)
      }
    })
  }

  /**
   * Setup error handlers
   */
  private setupErrorHandlers(): void {
    process.on('uncaughtException', async (error) => {
      console.error('💥 Uncaught Exception:', error)

      if (this.config.autoRestart && !this.isShuttingDown) {
        await this.handleRestart(error)
      } else {
        process.exit(1)
      }
    })

    process.on('unhandledRejection', async (reason, promise) => {
      console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason)

      if (this.config.autoRestart && !this.isShuttingDown) {
        await this.handleRestart(reason)
      } else {
        process.exit(1)
      }
    })

    process.on('SIGINT', async () => {
      console.log('\n📡 Received SIGINT, shutting down gracefully...')
      await this.stop()
      process.exit(0)
    })

    process.on('SIGTERM', async () => {
      console.log('\n📡 Received SIGTERM, shutting down gracefully...')
      await this.stop()
      process.exit(0)
    })

    // Windows specific
    if (process.platform === 'win32') {
      process.on('SIGHUP', async () => {
        console.log('\n📡 Received SIGHUP, restarting...')
        await this.restart()
      })
    }
  }

  /**
   * Get service status
   */
  getStatus(): any {
    return this.service ? this.service.getStatus() : null
  }

  /**
   * Force sync with all peers
   */
  async forceSync(): Promise<void> {
    if (this.service) {
      await this.service.forceSync()
    }
  }

  /**
   * Check if TypeScript build is required using git commit tracking
   */
  private async isBuildRequired(forceBuild: boolean = false): Promise<boolean> {
    try {
      console.log('🔍 Checking if build is required...')

      // Force build flag overrides all checks
      if (forceBuild) {
        console.log('🔨 Force build requested - skipping build detection')
        return true
      }

      const fs = require('fs')
      const path = require('path')

      // Check if dist directory exists
      const distPath = path.join(process.cwd(), 'dist/service')
      console.log(`🔍 Checking dist directory: ${distPath}`)
      if (!fs.existsSync(distPath)) {
        console.log('🔍 Build required: dist directory missing')
        return true
      }

      // Check if main service file exists
      const mainServiceFile = path.join(distPath, 'sync-service-runner.js')
      console.log(`🔍 Checking main service file: ${mainServiceFile}`)
      if (!fs.existsSync(mainServiceFile)) {
        console.log('🔍 Build required: main service file missing')
        return true
      }

      // Check for build info file
      const buildInfoFile = path.join(distPath, 'build-info.json')
      console.log(`🔍 Checking build info file: ${buildInfoFile}`)
      if (!fs.existsSync(buildInfoFile)) {
        console.log('🔍 Build required: no build info file found')
        return true
      }

      // Get current git commit
      const currentCommit = await this.getCurrentGitCommit()

      // Get last build commit
      const lastBuildCommit = this.getLastBuildCommit(buildInfoFile)

      // If we can't determine current commit but have build info, be conservative
      if (!currentCommit) {
        if (lastBuildCommit) {
          console.log('⚠️  Cannot determine current commit but build info exists - assuming build is current')
          return false
        } else {
          console.log('🔍 Build required: no git access and no build commit info')
          return true
        }
      }

      // If we have current commit but no last build commit, rebuild
      if (!lastBuildCommit) {
        console.log('🔍 Build required: current commit detected but no last build commit info')
        return true
      }

      // If commits are different, rebuild needed
      if (currentCommit !== lastBuildCommit) {
        console.log(`🔍 Build required: code changes detected ${lastBuildCommit.substring(0, 8)} → ${currentCommit.substring(0, 8)}`)
        return true
      }

      // All checks passed - commits match
      console.log(`✅ Build not required: both at commit ${currentCommit.substring(0, 8)}`)
      return false
    } catch (error) {
      console.log('🔍 Build required: error checking build status, building to be safe')
      return true
    }
  }

  /**
   * Get current git commit using multiple methods
   */
  private async getCurrentGitCommit(): Promise<string | null> {
    try {
      const fs = require('fs')
      const path = require('path')

      // Method 1: Try reading from .git/HEAD directly
      const gitHeadFile = path.join(process.cwd(), '.git', 'HEAD')
      if (fs.existsSync(gitHeadFile)) {
        try {
          const headContent = fs.readFileSync(gitHeadFile, 'utf8').trim()
          if (headContent.startsWith('ref: ')) {
            // It's a reference, read the actual commit
            const refPath = headContent.substring(5)
            const refFile = path.join(process.cwd(), '.git', refPath)
            if (fs.existsSync(refFile)) {
              const commit = fs.readFileSync(refFile, 'utf8').trim()
              if (commit && commit.length === 40) {
                return commit
              }
            }
          } else if (headContent.length === 40) {
            // It's a direct commit hash
            return headContent
          }
        } catch (err) {
          // Continue to other methods
        }
      }

      // Method 2: Try git command
      try {
        const { execSync } = require('child_process')
        const commit = execSync('git rev-parse HEAD', {
          cwd: process.cwd(),
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'ignore'],
        }).trim()

        if (commit && commit.length === 40) {
          return commit
        }
      } catch (err) {
        // Git command failed, continue
      }

      return null
    } catch (error) {
      return null
    }
  }

  /**
   * Get last build commit from build info file
   */
  private getLastBuildCommit(buildInfoFile: string): string | null {
    try {
      const fs = require('fs')
      if (fs.existsSync(buildInfoFile)) {
        const buildInfo = JSON.parse(fs.readFileSync(buildInfoFile, 'utf8'))
        return buildInfo.gitCommit
      }
    } catch (err) {
      // Ignore errors
    }
    return null
  }

  /**
   * Force TypeScript build compilation
   */
  async forceBuild(): Promise<void> {
    try {
      console.log('🔨 Building TypeScript files...')
      await execAsync('npx tsc --project tsconfig.service.json', {
        cwd: process.cwd(),
        env: { ...process.env }
      })
      console.log('✅ TypeScript build completed successfully')

      // Create build-info.json to track build state
      await this.createBuildInfo()

      // Also run unified build marker to harmonize with other build workflows
      try {
        await execAsync('node scripts/mark-build-complete.js', {
          cwd: process.cwd(),
          env: { ...process.env }
        })
      } catch (err) {
        console.warn('⚠️  Could not run unified build marker (non-critical):', err instanceof Error ? err.message : err)
      }

    } catch (error) {
      console.error('❌ TypeScript build failed:', error instanceof Error ? error.message : error)
      throw new Error(`Build failed: ${error instanceof Error ? error.message : error}`)
    }
  }

  /**
   * Create build-info.json file with current git commit and timestamp
   */
  private async createBuildInfo(): Promise<void> {
    try {
      const fs = require('fs')
      const path = require('path')

      // Ensure dist/service directory exists
      const distPath = path.join(process.cwd(), 'dist/service')
      if (!fs.existsSync(distPath)) {
        fs.mkdirSync(distPath, { recursive: true })
        console.log('📁 Created dist/service directory')
      }

      // Get current git commit
      const currentCommit = await this.getCurrentGitCommit()

      // Create build info
      const buildInfo = {
        buildTimestamp: new Date().toISOString(),
        gitCommit: currentCommit,
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch
      }

      const buildInfoFile = path.join(distPath, 'build-info.json')
      fs.writeFileSync(buildInfoFile, JSON.stringify(buildInfo, null, 2))

      console.log(`📝 Created build-info.json with commit: ${currentCommit ? currentCommit.substring(0, 8) : 'unknown'}`)

    } catch (error) {
      console.warn('⚠️  Warning: Could not create build-info.json:', error instanceof Error ? error.message : error)
      // Don't fail the build if we can't create build info
    }
  }
}

// CLI Command handling
async function main() {
  const args = process.argv.slice(2)
  const command = args[0] || 'start'

  // Parse flags
  const flags = {
    forceBuild: args.includes('--force-build') || args.includes('-f'),
    verbose: args.includes('--verbose') || args.includes('-v')
  }

  const runner = new SyncServiceRunner()

  switch (command) {
    case 'start':
      await runner.start({ forceBuild: flags.forceBuild })
      break

    case 'stop':
      await runner.stop()
      break

    case 'restart':
      await runner.restart()
      break

    case 'status':
      const status = runner.getStatus()
      if (status) {
        console.log('Service Status:')
        console.log(`  Running: ${status.isRunning}`)
        console.log(`  Node: ${status.nodeName} (${status.nodeId})`)
        console.log(`  Uptime: ${Math.round(status.uptime / 1000)}s`)
        console.log(`  Peers: ${status.peersConnected}`)
        console.log(`  Events Synced: ${status.totalEventsSynced}`)
        console.log(`  Conflicts Resolved: ${status.conflictsResolved}`)
        console.log(`  Sync Errors: ${status.syncErrors}`)
      } else {
        console.log('Service is not running')
      }
      break

    case 'sync':
      await runner.forceSync()
      console.log('Manual sync triggered')
      break

    case 'build':
      await runner.forceBuild()
      console.log('TypeScript build completed')
      break

    case 'help':
    default:
      console.log('Usage: node sync-service-runner.js [command] [flags]')
      console.log('')
      console.log('Commands:')
      console.log('  start    Start the sync service (default)')
      console.log('  stop     Stop the sync service')
      console.log('  restart  Restart the sync service')
      console.log('  status   Show service status')
      console.log('  sync     Force manual sync')
      console.log('  build    Force TypeScript build compilation')
      console.log('  help     Show this help')
      console.log('')
      console.log('Flags:')
      console.log('  --force-build, -f      Force TypeScript build before starting service')
      console.log('  --verbose, -v          Enable verbose output')
      console.log('')
      console.log('Examples:')
      console.log('  node sync-service-runner.js start --force-build')
      console.log('  node sync-service-runner.js start -f')
      console.log('  node sync-service-runner.js build')
      console.log('')
      console.log('Environment Variables:')
      console.log('  SYNC_REGISTRATION_KEY  Registration key for secure peer discovery')
      console.log('  SYNC_PORT              Port to run sync service on (default: 8765)')
      console.log('  SYNC_INTERVAL          Sync interval in milliseconds (default: 30000)')
      console.log('  LOG_LEVEL              Log level: error, warn, info, debug (default: info)')
      break
  }

  // Keep the process alive for start command
  if (command === 'start') {
    process.stdin.resume()
  }
}

// Run if this is the main module
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Service runner error:', error)
    process.exit(1)
  })
}

export { SyncServiceRunner }