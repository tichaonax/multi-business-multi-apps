#!/usr/bin/env node
/**
 * Sync Service Runner
 * Entry point for running the sync service independently of the main app
 * Based on electricity-tokens service architecture
 */

import { createSyncService, getDefaultSyncConfig, SyncServiceConfig } from '../lib/sync/sync-service'
import { generateNodeId } from '../lib/sync/database-hooks'
import path from 'path'
import fs from 'fs'
import { hostname } from 'os'

interface ServiceConfiguration extends SyncServiceConfig {
  autoRestart: boolean
  restartDelay: number
  maxRestartAttempts: number
}

class SyncServiceRunner {
  private service: any = null
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
      registrationKey: process.env.SYNC_REGISTRATION_KEY || 'default-registration-key-change-in-production',
      port: parseInt(process.env.SYNC_PORT || '3001'),
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
   * Start the sync service
   */
  async start(): Promise<void> {
    try {
      console.log(`Starting Sync Service: ${this.config.nodeName}`)
      console.log(`Node ID: ${this.config.nodeId}`)
      console.log(`Port: ${this.config.port}`)
      console.log(`Registration Key: ${this.config.registrationKey ? '***' : 'NOT SET'}`)
      console.log(`Data Directory: ${this.config.dataDirectory}`)

      if (!this.config.registrationKey || this.config.registrationKey === 'default-registration-key-change-in-production') {
        console.warn('⚠️  WARNING: Using default registration key! Change SYNC_REGISTRATION_KEY environment variable for production.')
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
}

// CLI Command handling
async function main() {
  const args = process.argv.slice(2)
  const command = args[0] || 'start'

  const runner = new SyncServiceRunner()

  switch (command) {
    case 'start':
      await runner.start()
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

    case 'help':
    default:
      console.log('Usage: node sync-service-runner.js [command]')
      console.log('')
      console.log('Commands:')
      console.log('  start    Start the sync service (default)')
      console.log('  stop     Stop the sync service')
      console.log('  restart  Restart the sync service')
      console.log('  status   Show service status')
      console.log('  sync     Force manual sync')
      console.log('  help     Show this help')
      console.log('')
      console.log('Environment Variables:')
      console.log('  SYNC_REGISTRATION_KEY  Registration key for secure peer discovery')
      console.log('  SYNC_PORT              Port to run sync service on (default: 3001)')
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