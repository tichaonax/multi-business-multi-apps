/**
 * Background Sync Service
 * Independent service that runs database synchronization without the main Next.js app
 * Based on electricity-tokens service architecture
 */

import { EventEmitter } from 'events'
import { PrismaClient } from '@prisma/client'
import { SyncEngine } from './sync-engine'
import { PeerDiscoveryService, createPeerDiscovery } from './peer-discovery'
import { ConflictResolver } from './conflict-resolver'
import { initializeSyncSystem, generateNodeId } from './database-hooks'
import { SyncUtils } from './sync-utils'
import { NetworkMonitor, createNetworkMonitor } from './network-monitor'
import { OfflineQueueManager, createOfflineQueueManager } from './offline-queue'
import { PartitionDetector, createPartitionDetector } from './partition-detector'
import { PartitionRecoveryService, createPartitionRecoveryService } from './partition-recovery'
import { InitialLoadManager, createInitialLoadManager } from './initial-load'
import { InitialLoadReceiver, createInitialLoadReceiver } from './initial-load-receiver'
import { SecurityManager, createSecurityManager } from './security-manager'
import { SchemaVersionManager, createSchemaVersionManager } from './schema-version-manager'
import { SyncCompatibilityGuard, createSyncCompatibilityGuard } from './sync-compatibility-guard'
import { DailyRotatingLogger, createSyncServiceLogger } from './rotating-logger'
import { networkInterfaces } from 'os'
import path from 'path'
import fs from 'fs'

export interface SyncServiceConfig {
  nodeId?: string
  nodeName: string
  registrationKey: string
  port: number
  httpPort?: number // Port for HTTP sync API calls (defaults to main app port)
  syncInterval: number // milliseconds
  enableAutoStart: boolean
  logLevel: 'error' | 'warn' | 'info' | 'debug'
  dataDirectory: string
  maxLogSize: number // bytes
  maxLogFiles: number
  printWorkerHealthCheck?: {
    enabled?: boolean // Enable print worker health monitoring
    url?: string // URL to check (e.g., http://localhost:8080/api/health/print-worker)
    interval?: number // Check interval in milliseconds (default: 60000 = 1 minute)
    autoRestart?: boolean // Automatically restart worker if not running
  }
  wifiTokenSanitization?: {
    enabled?: boolean // Enable WiFi token sanitization
    url?: string // URL to trigger sanitization (e.g., http://localhost:8080/api/wifi-portal/admin/sanitize-tokens)
    interval?: number // Check interval in milliseconds (default: 21600000 = 6 hours)
  }
  r710ConnectedClientsSync?: {
    enabled?: boolean // Enable R710 connected clients synchronization
    url?: string // URL to trigger sync (e.g., http://localhost:8080/api/r710/connected-clients/sync)
    interval?: number // Check interval in milliseconds (default: 300000 = 5 minutes)
  }
  esp32ConnectedClientsSync?: {
    enabled?: boolean // Enable ESP32 connected clients synchronization
    url?: string // URL to trigger sync (e.g., http://localhost:8080/api/esp32/connected-clients/sync)
    interval?: number // Check interval in milliseconds (default: 300000 = 5 minutes)
  }
  security?: {
    enableEncryption?: boolean
    enableSignatures?: boolean
    keyRotationEnabled?: boolean
    keyRotationInterval?: number
    sessionTimeout?: number
    maxFailedAttempts?: number
    rateLimitWindow?: number
    rateLimitMaxRequests?: number
  }
}

export interface ServiceStatus {
  isRunning: boolean
  nodeId: string
  nodeName: string
  uptime: number
  peersConnected: number
  peersDiscovered: number
  lastSyncTime: Date | null
  totalEventsSynced: number
  conflictsResolved: number
  syncErrors: number
}

/**
 * Background Sync Service
 * Runs independently of the main application
 */
export class SyncService extends EventEmitter {
  private config: SyncServiceConfig
  private prisma: PrismaClient
  private syncEngine: SyncEngine | null = null
  private peerDiscovery: PeerDiscoveryService | null = null
  private conflictResolver: ConflictResolver | null = null
  private syncUtils: SyncUtils | null = null
  private networkMonitor: NetworkMonitor | null = null
  private offlineQueue: OfflineQueueManager | null = null
  private partitionDetector: PartitionDetector | null = null
  private recoveryService: PartitionRecoveryService | null = null
  private initialLoadManager: InitialLoadManager | null = null
  private initialLoadReceiver: InitialLoadReceiver | null = null
  private securityManager: SecurityManager | null = null
  private schemaVersionManager: SchemaVersionManager | null = null
  private compatibilityGuard: SyncCompatibilityGuard | null = null

  private isRunning = false
  private isOnline = true
  private startTime: Date | null = null
  private nodeId: string
  private logger: DailyRotatingLogger | null = null
  private healthCheckTimer: NodeJS.Timeout | null = null
  private printWorkerHealthTimer: NodeJS.Timeout | null = null
  private wifiTokenSanitizationTimer: NodeJS.Timeout | null = null
  private r710ConnectedClientsSyncTimer: NodeJS.Timeout | null = null
  private esp32ConnectedClientsSyncTimer: NodeJS.Timeout | null = null
  private status: ServiceStatus

  constructor(config: SyncServiceConfig) {
    super()

    const baseConfig: Partial<SyncServiceConfig> = {
      syncInterval: 30000, // 30 seconds
      enableAutoStart: true,
      logLevel: 'info',
      maxLogSize: 10 * 1024 * 1024, // 10MB
      maxLogFiles: 5
    }

    this.config = Object.assign({}, baseConfig, config) as SyncServiceConfig

    this.nodeId = config.nodeId || generateNodeId()
    this.prisma = new PrismaClient()

    // Connect to database
    this.prisma.$connect().catch(error => {
      console.error('Failed to connect to database:', error)
    })

    this.status = {
      isRunning: false,
      nodeId: this.nodeId,
      nodeName: this.config.nodeName,
      uptime: 0,
      peersConnected: 0,
      peersDiscovered: 0,
      lastSyncTime: null,
      totalEventsSynced: 0,
      conflictsResolved: 0,
      syncErrors: 0
    }

    // Setup logging
    this.initializeLogging()

    // Handle graceful shutdown
    this.setupShutdownHandlers()
  }

  /**
   * Start the sync service
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      this.log('warn', 'Service is already running')
      return
    }

    try {
      this.log('info', `Starting sync service: ${this.config.nodeName} (${this.nodeId})`)
      this.log('info', '⚠️  Demo business data will be excluded from synchronization')

      // Initialize database sync system (with retry/reconnect support)
      try {
        await this.initializeDatabase()
      } catch (dbInitErr) {
        this.log('error', 'Database initialization failed during start; entering reconnect mode', dbInitErr)
        this.isOnline = false
        this.emit('offline', { error: dbInitErr })

        // Start background reconnect loop (non-blocking)
        this.startDatabaseReconnectLoop()
        // Continue startup (service will operate in degraded/offline mode until DB reconnects)
      }

      // Initialize peer discovery
      await this.initializePeerDiscovery()

      // Initialize sync engine
      await this.initializeSyncEngine()

      // Initialize conflict resolver
      this.initializeConflictResolver()

      // Initialize utilities
      this.initializeUtils()

      // Initialize partition detection and recovery
      await this.initializePartitionHandling()

      // Initialize initial load system
      await this.initializeInitialLoadSystem()

      // Initialize security manager
      await this.initializeSecurityManager()

      // Initialize schema version manager
      await this.initializeSchemaVersionManager()

      // Initialize compatibility guard
      this.initializeCompatibilityGuard()

      // Start health monitoring
      this.startHealthMonitoring()

      this.isRunning = true
      this.startTime = new Date()
      this.status.isRunning = true

      this.log('info', '✅ Sync service started successfully')
      this.emit('started', this.getStatus())

    } catch (error) {
      this.log('error', 'Failed to start sync service:', error)
      throw error
    }
  }

  /**
   * Start a background loop that attempts to reconnect and re-run initializeDatabase
   */
  private startDatabaseReconnectLoop() {
    const maxAttempts = 0 // 0 = infinite retries
    const baseDelay = 1000 // 1s

    let attempt = 0
    const tryReconnect = async () => {
      if (this.isRunning === false && this.isOnline === true) return
      attempt++
      try {
        this.log('info', `Reconnect attempt ${attempt} to initialize database`)
        await this.initializeDatabase()
        this.isOnline = true
        this.log('info', 'Database reconnected successfully')
        this.emit('online')
      } catch (err: any) {
        this.log('warn', `Database reconnect attempt ${attempt} failed: ${err.message || String(err)}`)
        const delay = baseDelay * Math.pow(2, Math.min(attempt - 1, 6)) // cap backoff at 64x
        setTimeout(tryReconnect, delay)
      }
    }

    // Start first reconnect attempt after a short delay
    setTimeout(tryReconnect, baseDelay)
  }

  /**
   * Stop the sync service
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      this.log('warn', 'Service is not running')
      return
    }

    try {
      this.log('info', 'Stopping sync service...')

      // Stop health monitoring
      if (this.healthCheckTimer) {
        clearInterval(this.healthCheckTimer)
        this.healthCheckTimer = null
      }

      // Stop print worker health monitoring
      this.stopPrintWorkerHealthMonitoring()

      // Stop WiFi token sanitization
      this.stopWifiTokenSanitization()

      // Stop R710 connected clients sync
      this.stopR710ConnectedClientsSync()

      // Stop ESP32 connected clients sync
      this.stopESP32ConnectedClientsSync()

      // Stop sync engine
      if (this.syncEngine) {
        await this.syncEngine.stop()
      }

      // Stop peer discovery
      if (this.peerDiscovery) {
        await this.peerDiscovery.stop()
      }

      // Stop partition handling
      if (this.recoveryService) {
        await this.recoveryService.stop()
      }
      if (this.partitionDetector) {
        this.partitionDetector.stop()
      }

      // Stop initial load system
      if (this.initialLoadManager) {
        this.initialLoadManager.stop()
      }
      if (this.initialLoadReceiver) {
        this.initialLoadReceiver.stop()
      }

      // Stop security manager
      if (this.securityManager) {
        await this.securityManager.shutdown()
        this.securityManager = null
      }

      // Close database connection
      await this.prisma.$disconnect()

      this.isRunning = false
      this.startTime = null
      this.status.isRunning = false

      // Close rotating logger
      if (this.logger) {
        this.logger.close()
        this.logger = null
      }

      this.log('info', '✅ Sync service stopped successfully')
      this.emit('stopped')

    } catch (error) {
      this.log('error', 'Error stopping sync service:', error)
      throw error
    }
  }

  /**
   * Restart the sync service
   */
  async restart(): Promise<void> {
    this.log('info', 'Restarting sync service...')
    await this.stop()
    await new Promise(resolve => setTimeout(resolve, 2000)) // 2 second delay
    await this.start()
  }

  /**
   * Get service status
   */
  getStatus(): ServiceStatus {
    const now = new Date()

    return {
      ...this.status,
      uptime: this.startTime ? now.getTime() - this.startTime.getTime() : 0,
      peersConnected: this.peerDiscovery?.getDiscoveredPeers().length || 0,
      peersDiscovered: this.peerDiscovery?.getDiscoveredPeers().length || 0
    }
  }

  /**
   * Get logging statistics
   */
  getLogStats() {
    if (this.logger) {
      return this.logger.getLogStats()
    }
    return null
  }

  /**
   * Force sync with all peers
   */
  async forceSync(): Promise<void> {
    if (!this.syncEngine) {
      throw new Error('Sync engine not initialized')
    }

    this.log('info', 'Force sync requested')
    await this.syncEngine.syncWithAllPeers()
  }

  /**
   * Get sync statistics
   */
  async getSyncStats(): Promise<any> {
    if (!this.syncUtils) {
      throw new Error('Sync utils not initialized')
    }

    return await this.syncUtils.getSyncStats()
  }

  /**
   * Get active partitions
   */
  getActivePartitions(): any[] {
    if (!this.partitionDetector) {
      return []
    }
    return this.partitionDetector.getActivePartitions()
  }

  /**
   * Initiate partition recovery
   */
  async initiatePartitionRecovery(partitionId: string, strategy?: string): Promise<string | null> {
    if (!this.recoveryService) {
      throw new Error('Recovery service not initialized')
    }
    return await this.recoveryService.initiateRecovery(partitionId, strategy)
  }

  /**
   * Get recovery session status
   */
  getRecoverySession(sessionId: string): any | null {
    if (!this.recoveryService) {
      return null
    }
    return this.recoveryService.getRecoverySession(sessionId)
  }

  /**
   * Get all active recovery sessions
   */
  getActiveRecoverySessions(): any[] {
    if (!this.recoveryService) {
      return []
    }
    return this.recoveryService.getActiveRecoverySessions()
  }

  /**
   * Get recovery metrics
   */
  async getRecoveryMetrics(): Promise<any> {
    if (!this.recoveryService) {
      return {
        totalRecoveries: 0,
        successfulRecoveries: 0,
        failedRecoveries: 0,
        averageRecoveryTime: 0,
        recoverySuccessRate: 0,
        commonFailureReasons: []
      }
    }
    return await this.recoveryService.getRecoveryMetrics()
  }

  /**
   * Cancel recovery session
   */
  async cancelRecoverySession(sessionId: string): Promise<boolean> {
    if (!this.recoveryService) {
      return false
    }
    return await this.recoveryService.cancelRecoverySession(sessionId)
  }

  /**
   * Authenticate a peer for sync operations
   */
  async authenticatePeer(peer: any, providedKeyHash: string): Promise<{ success: boolean; authToken?: string; errorMessage?: string }> {
    if (!this.securityManager) {
      return { success: false, errorMessage: 'Security manager not initialized' }
    }
    return await this.securityManager.authenticatePeer(peer, providedKeyHash)
  }

  /**
   * Establish secure session with peer
   */
  async establishSecureSession(targetNodeId: string, authToken: string): Promise<{ success: boolean; sessionId?: string; encryptionKey?: string; errorMessage?: string }> {
    if (!this.securityManager) {
      return { success: false, errorMessage: 'Security manager not initialized' }
    }
    return await this.securityManager.establishSecureSession(this.nodeId, targetNodeId, authToken)
  }

  /**
   * Validate security session
   */
  async validateSession(sessionId: string): Promise<{ valid: boolean; session?: any; errorMessage?: string }> {
    if (!this.securityManager) {
      return { valid: false, errorMessage: 'Security manager not initialized' }
    }
    return await this.securityManager.validateSession(sessionId)
  }

  /**
   * Get security audit logs
   */
  async getSecurityAuditLogs(limit: number = 100): Promise<any[]> {
    if (!this.securityManager) {
      return []
    }
    return await this.securityManager.getAuditLogs(limit)
  }

  /**
   * Get security statistics
   */
  async getSecurityStats(): Promise<any> {
    if (!this.securityManager) {
      return {
        totalAuthentications: 0,
        successfulAuthentications: 0,
        failedAuthentications: 0,
        activeSessions: 0,
        expiredSessions: 0,
        securityIncidents: 0
      }
    }
    return await this.securityManager.getSecurityStats()
  }

  /**
   * Rotate registration key
   */
  async rotateRegistrationKey(newKey: string, gracePeriodMs: number = 300000): Promise<boolean> {
    if (!this.securityManager) {
      return false
    }
    try {
      await this.securityManager.rotateRegistrationKey()
      return true
    } catch (error) {
      console.error('Failed to rotate registration key:', error)
      return false
    }
  }

  /**
   * Revoke session
   */
  async revokeSession(sessionId: string): Promise<boolean> {
    if (!this.securityManager) {
      return false
    }
    return await this.securityManager.revokeSession(sessionId)
  }

  /**
   * Get active security sessions
   */
  async getActiveSessions(): Promise<any[]> {
    if (!this.securityManager) {
      return []
    }
    return await this.securityManager.getActiveSessions()
  }

  /**
   * Create data snapshot
   */
  async createDataSnapshot(): Promise<any> {
    if (!this.initialLoadManager) {
      throw new Error('Initial load manager not initialized')
    }
    return await this.initialLoadManager.createDataSnapshot()
  }

  /**
   * Initiate initial load to target peer
   */
  async initiateInitialLoad(targetPeer: any, options?: any): Promise<string> {
    if (!this.initialLoadManager) {
      throw new Error('Initial load manager not initialized')
    }
    return await this.initialLoadManager.initiateInitialLoad(targetPeer, options)
  }

  /**
   * Request initial load from source peer
   */
  async requestInitialLoad(sourcePeer: any, options?: any): Promise<string> {
    if (!this.initialLoadManager) {
      throw new Error('Initial load manager not initialized')
    }
    return await this.initialLoadManager.requestInitialLoad(sourcePeer, options)
  }

  /**
   * Get active initial load sessions
   */
  getActiveInitialLoadSessions(): any[] {
    if (!this.initialLoadManager) {
      return []
    }
    return this.initialLoadManager.getActiveSessions()
  }

  /**
   * Get initial load session
   */
  getInitialLoadSession(sessionId: string): any | null {
    if (!this.initialLoadManager) {
      return null
    }
    return this.initialLoadManager.getSession(sessionId)
  }

  /**
   * Cancel initial load session
   */
  async cancelInitialLoadSession(sessionId: string): Promise<boolean> {
    if (!this.initialLoadManager) {
      return false
    }
    return await this.initialLoadManager.cancelSession(sessionId)
  }

  /**
   * Get active reception sessions
   */
  getActiveReceptionSessions(): any[] {
    if (!this.initialLoadReceiver) {
      return []
    }
    return this.initialLoadReceiver.getActiveReceptionSessions()
  }

  /**
   * Check schema compatibility with a remote node
   */
  async checkSchemaCompatibility(remoteNode: any): Promise<any> {
    if (!this.schemaVersionManager) {
      throw new Error('Schema version manager not initialized')
    }
    return await this.schemaVersionManager.checkCompatibility(remoteNode)
  }

  /**
   * Get current schema version
   */
  getCurrentSchemaVersion(): any {
    if (!this.schemaVersionManager) {
      return null
    }
    return this.schemaVersionManager.getCurrentVersion()
  }

  /**
   * Get schema compatibility report for all nodes
   */
  async getSchemaCompatibilityReport(): Promise<any> {
    if (!this.schemaVersionManager) {
      return {
        totalNodes: 0,
        compatibleNodes: 0,
        incompatibleNodes: 0,
        nodeDetails: []
      }
    }
    return await this.schemaVersionManager.getCompatibilityReport()
  }

  /**
   * Check if sync is allowed with a remote node
   */
  async isSyncAllowed(remoteNode: any): Promise<any> {
    if (!this.compatibilityGuard) {
      return {
        allowed: false,
        reason: 'Compatibility guard not initialized'
      }
    }
    return await this.compatibilityGuard.isSyncAllowed(remoteNode)
  }

  /**
   * Get sync attempt history
   */
  getSyncAttemptHistory(): any[] {
    if (!this.compatibilityGuard) {
      return []
    }
    return this.compatibilityGuard.getSyncAttemptHistory()
  }

  /**
   * Get sync attempt statistics
   */
  getSyncAttemptStats(): any {
    if (!this.compatibilityGuard) {
      return {
        totalAttempts: 0,
        allowedAttempts: 0,
        blockedAttempts: 0,
        successRate: 0,
        recentBlocks: []
      }
    }
    return this.compatibilityGuard.getSyncAttemptStats()
  }

  /**
   * Get compatibility issues summary
   */
  getCompatibilityIssuesSummary(): any {
    if (!this.compatibilityGuard) {
      return {
        incompatibleNodes: [],
        commonIssues: []
      }
    }
    return this.compatibilityGuard.getCompatibilityIssuesSummary()
  }

  /**
   * Initialize database sync system
   */
  private async initializeDatabase(): Promise<void> {
    try {
      const ipAddress = this.getLocalIPAddress()

      await initializeSyncSystem(this.prisma, {
        nodeId: this.nodeId,
        nodeName: this.config.nodeName,
        registrationKey: this.config.registrationKey,
        ipAddress,
        port: this.config.port,
        enabled: true
      })

      this.log('info', 'Database sync system initialized')
    } catch (error) {
      this.log('error', 'Failed to initialize database sync system:', error)
      throw error
    }
  }

  /**
   * Initialize peer discovery service
   */
  private async initializePeerDiscovery(): Promise<void> {
    try {
      this.peerDiscovery = createPeerDiscovery(Object.assign({
        nodeId: this.nodeId,
        nodeName: this.config.nodeName,
        port: this.config.port,
        registrationKey: this.config.registrationKey,
        broadcastInterval: 30000, // 30 seconds
        discoveryPort: 5353, // mDNS port
        serviceName: 'multi-business-sync',
        prisma: this.prisma
      }, {} as any))

      // Listen for peer events
      this.peerDiscovery.on('peer_discovered', (peer) => {
        this.log('info', `New peer discovered: ${peer.nodeName} (${peer.nodeId})`)
        this.emit('peer_discovered', peer)
      })

      this.peerDiscovery.on('peer_left', (peer) => {
        this.log('info', `Peer left: ${peer.nodeName} (${peer.nodeId})`)
        this.emit('peer_left', peer)
      })

      this.peerDiscovery.on('error', (error) => {
        this.log('error', 'Peer discovery error:', error)
        this.status.syncErrors++
      })

      await this.peerDiscovery.start()
      this.log('info', 'Peer discovery service started')
    } catch (error) {
      this.log('error', 'Failed to initialize peer discovery:', error)
      throw error
    }
  }

  /**
   * Initialize sync engine
   */
  private async initializeSyncEngine(): Promise<void> {
    if (!this.peerDiscovery) {
      throw new Error('Peer discovery must be initialized first')
    }

    try {
      this.syncEngine = new SyncEngine(this.prisma, this.peerDiscovery, {
        nodeId: this.nodeId,
        registrationKey: this.config.registrationKey,
        httpPort: this.config.httpPort,
        syncInterval: this.config.syncInterval,
        batchSize: 50,
        retryAttempts: 3,
        compressionEnabled: true,
        encryptionEnabled: true
      })

      // Listen for sync events
      this.syncEngine.on('sync_started', ({ peer, session }) => {
        this.log('debug', `Sync started with ${peer.nodeName}`)
      })

      this.syncEngine.on('sync_completed', ({ peer, sentEvents, receivedEvents }) => {
        this.log('info', `Sync completed with ${peer.nodeName}: sent ${sentEvents}, received ${receivedEvents}`)
        this.status.totalEventsSynced += sentEvents + receivedEvents
        this.status.lastSyncTime = new Date()
        this.emit('sync_completed', { peer, sentEvents, receivedEvents })
      })

      this.syncEngine.on('sync_failed', ({ peer, error }) => {
        this.log('error', `Sync failed with ${peer.nodeName}:`, error)
        this.status.syncErrors++
        this.emit('sync_failed', { peer, error })
      })

      this.syncEngine.on('conflict_resolved', ({ conflict, session }) => {
        this.log('info', `Conflict resolved using ${conflict.strategy}`)
        this.status.conflictsResolved++
        this.emit('conflict_resolved', conflict)
      })

      await this.syncEngine.start()
      this.log('info', 'Sync engine started')
    } catch (error) {
      this.log('error', 'Failed to initialize sync engine:', error)
      throw error
    }
  }

  /**
   * Initialize conflict resolver
   */
  private initializeConflictResolver(): void {
    try {
      this.conflictResolver = new ConflictResolver(this.prisma, this.nodeId)
      this.log('info', 'Conflict resolver initialized')
    } catch (error) {
      this.log('error', 'Failed to initialize conflict resolver:', error)
      throw error
    }
  }

  /**
   * Initialize sync utilities
   */
  private initializeUtils(): void {
    try {
      this.syncUtils = new SyncUtils(this.prisma, this.nodeId)
      this.log('info', 'Sync utilities initialized')
    } catch (error) {
      this.log('error', 'Failed to initialize sync utilities:', error)
      throw error
    }
  }

  /**
   * Initialize partition detection and recovery
   */
  private async initializePartitionHandling(): Promise<void> {
    try {
      // Initialize partition detector
      this.partitionDetector = createPartitionDetector(
        this.prisma,
        this.nodeId,
        this.config.registrationKey
      )

      // Initialize recovery service
      this.recoveryService = createPartitionRecoveryService(
        this.prisma,
        this.nodeId,
        this.config.registrationKey,
        this.partitionDetector
      )

      // Set references for cross-component communication
      if (this.syncEngine) {
        this.recoveryService.setSyncEngine(this.syncEngine)
      }
      if (this.peerDiscovery) {
        this.recoveryService.setPeerDiscovery(this.peerDiscovery)
      }

      // Setup event handlers for sync engine integration
      if (this.syncEngine) {
        this.syncEngine.on('sync_failed', ({ peer, error }) => {
          this.partitionDetector?.reportSyncFailure(peer, error)
        })
      }

      // Start partition monitoring
      await this.partitionDetector.start()
      await this.recoveryService.start()

      this.log('info', 'Partition detection and recovery initialized')
    } catch (error) {
      this.log('error', 'Failed to initialize partition handling:', error)
      throw error
    }
  }

  /**
   * Initialize initial load system
   */
  private async initializeInitialLoadSystem(): Promise<void> {
    try {
      // Initialize initial load manager
      this.initialLoadManager = createInitialLoadManager(
        this.prisma,
        this.nodeId,
        this.config.registrationKey,
        this.config.httpPort
      )

      // Initialize initial load receiver
      this.initialLoadReceiver = createInitialLoadReceiver(
        this.prisma,
        this.nodeId,
        this.config.registrationKey
      )

      // Start initial load services
      await this.initialLoadManager.start()
      await this.initialLoadReceiver.start()

      this.log('info', 'Initial load system initialized')
    } catch (error) {
      this.log('error', 'Failed to initialize initial load system:', error)
      throw error
    }
  }

  /**
   * Initialize security manager
   */
  private async initializeSecurityManager(): Promise<void> {
    try {
      this.log('info', 'Initializing security manager...')

      // Create security manager instance with prisma and nodeId
      this.securityManager = createSecurityManager(
        this.prisma,
        this.nodeId,
        {
          registrationKey: this.config.registrationKey,
          enableEncryption: this.config.security?.enableEncryption ?? true,
          enableSignatures: this.config.security?.enableSignatures ?? true,
          keyRotationEnabled: this.config.security?.keyRotationEnabled ?? false,
          keyRotationInterval: this.config.security?.keyRotationInterval ?? 24 * 60 * 60 * 1000, // 24 hours
          sessionTimeout: this.config.security?.sessionTimeout ?? 60 * 60 * 1000, // 1 hour
          maxFailedAttempts: this.config.security?.maxFailedAttempts ?? 5,
          rateLimitWindow: this.config.security?.rateLimitWindow ?? 60 * 1000, // 1 minute
          rateLimitMaxRequests: this.config.security?.rateLimitMaxRequests ?? 100
        }
      )

      // Start the security manager
      await this.securityManager.start()

      this.log('info', 'Security manager initialized')
    } catch (error) {
      this.log('error', 'Failed to initialize security manager:', error)
      throw error
    }
  }

  /**
   * Initialize schema version manager
   */
  private async initializeSchemaVersionManager(): Promise<void> {
    try {
      this.log('info', 'Initializing schema version manager...')

      // Create schema version manager instance
      this.schemaVersionManager = createSchemaVersionManager(this.prisma, this.nodeId)

      // Initialize schema version tracking
      await this.schemaVersionManager.initialize()

      this.log('info', 'Schema version manager initialized')
    } catch (error) {
      this.log('error', 'Failed to initialize schema version manager:', error)
      throw error
    }
  }

  /**
   * Initialize compatibility guard
   */
  private initializeCompatibilityGuard(): void {
    if (!this.schemaVersionManager) {
      throw new Error('Schema version manager must be initialized first')
    }

    try {
      this.log('info', 'Initializing compatibility guard...')

      // Create compatibility guard instance
      this.compatibilityGuard = createSyncCompatibilityGuard(this.schemaVersionManager)

      this.log('info', 'Compatibility guard initialized')
    } catch (error) {
      this.log('error', 'Failed to initialize compatibility guard:', error)
      throw error
    }
  }

  /**
   * Start health monitoring
   */
  private startHealthMonitoring(): void {
    this.healthCheckTimer = setInterval(async () => {
      try {
        // Update status
        this.status = this.getStatus()

        // Emit health status
        this.emit('health_check', this.status)

        // Log periodic status
        if (this.config.logLevel === 'debug') {
          this.log('debug', `Health check: ${this.status.peersConnected} peers, ${this.status.totalEventsSynced} events synced`)
        }
      } catch (error) {
        this.log('error', 'Health check failed:', error)
      }
    }, 60000) // Every minute

    // Start print worker health monitoring if enabled
    this.startPrintWorkerHealthMonitoring()

    // Start WiFi token sanitization if enabled
    this.startWifiTokenSanitization()

    // Start R710 connected clients sync if enabled
    this.startR710ConnectedClientsSync()

    // Start ESP32 connected clients sync if enabled
    this.startESP32ConnectedClientsSync()
  }

  /**
   * Start print worker health monitoring
   */
  private startPrintWorkerHealthMonitoring(): void {
    const config = this.config.printWorkerHealthCheck

    if (!config?.enabled) {
      return
    }

    const url = config.url || 'http://localhost:8080/api/health/print-worker'
    const interval = config.interval || 60000 // Default: 1 minute
    const autoRestart = config.autoRestart !== false // Default: true

    this.log('info', `Starting print worker health monitoring (${url}, interval: ${interval}ms)`)

    this.printWorkerHealthTimer = setInterval(async () => {
      try {
        const checkUrl = autoRestart ? `${url}?autoRestart=true` : url
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout

        const response = await fetch(checkUrl, {
          method: 'GET',
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
          this.log('warn', `Print worker health check failed: HTTP ${response.status}`)
          return
        }

        const data = await response.json()

        if (data.worker?.wasRestarted) {
          this.log('warn', '⚠️  Print worker was not running and has been restarted')
          this.emit('print_worker_restarted', data)
        } else if (!data.worker?.isRunning) {
          this.log('error', '❌ Print worker is not running')
          this.emit('print_worker_down', data)
        } else if (this.config.logLevel === 'debug') {
          this.log('debug', '✅ Print worker health check passed')
        }
      } catch (error) {
        if ((error as any).name === 'AbortError') {
          this.log('warn', 'Print worker health check timed out')
        } else {
          this.log('error', 'Print worker health check error:', error)
        }
      }
    }, interval)
  }

  /**
   * Stop print worker health monitoring
   */
  private stopPrintWorkerHealthMonitoring(): void {
    if (this.printWorkerHealthTimer) {
      clearInterval(this.printWorkerHealthTimer)
      this.printWorkerHealthTimer = null
      this.log('info', 'Print worker health monitoring stopped')
    }
  }

  /**
   * Start WiFi token sanitization job
   */
  private startWifiTokenSanitization(): void {
    const config = this.config.wifiTokenSanitization

    if (!config?.enabled) {
      return
    }

    const url = config.url || 'http://localhost:8080/api/wifi-portal/admin/sanitize-tokens'
    const interval = config.interval || 21600000 // 6 hours default

    this.log('info', `Starting WiFi token sanitization (${url}, interval: ${interval}ms = ${interval / 3600000} hours)`)

    this.wifiTokenSanitizationTimer = setInterval(async () => {
      try {
        this.log('info', '🔄 Starting WiFi token sanitization...')

        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 300000) // 5 minute timeout

        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
          this.log('error', `WiFi token sanitization failed: HTTP ${response.status}`)
          return
        }

        const data = await response.json()

        if (data.success && data.result) {
          const { processed, disabled, businessesProcessed, errors } = data.result
          this.log('info', `✅ WiFi token sanitization completed: ${disabled}/${processed} tokens disabled across ${businessesProcessed} businesses`)

          if (errors && errors.length > 0) {
            this.log('warn', `⚠️  Sanitization errors: ${errors.length}`)
            errors.forEach((err: string) => this.log('warn', `   - ${err}`))
          }

          this.emit('wifi_token_sanitization_complete', data.result)
        } else {
          this.log('error', 'WiFi token sanitization failed:', data.error || 'Unknown error')
        }
      } catch (error) {
        if ((error as any).name === 'AbortError') {
          this.log('error', 'WiFi token sanitization timed out (exceeded 5 minutes)')
        } else {
          this.log('error', 'WiFi token sanitization error:', error)
        }
      }
    }, interval)

    // Run immediately on startup, then at interval
    this.log('info', '🔄 Running initial WiFi token sanitization on service startup...')
    setTimeout(async () => {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })

        if (response.ok) {
          const data = await response.json()
          if (data.success && data.result) {
            this.log('info', `✅ Initial sanitization: ${data.result.disabled}/${data.result.processed} tokens disabled`)
          }
        }
      } catch (error) {
        this.log('warn', 'Initial sanitization failed (will retry on schedule):', error)
      }
    }, 10000) // Wait 10 seconds after service starts
  }

  /**
   * Stop WiFi token sanitization
   */
  private stopWifiTokenSanitization(): void {
    if (this.wifiTokenSanitizationTimer) {
      clearInterval(this.wifiTokenSanitizationTimer)
      this.wifiTokenSanitizationTimer = null
      this.log('info', 'WiFi token sanitization stopped')
    }
  }

  /**
   * Start R710 connected clients synchronization job
   */
  private startR710ConnectedClientsSync(): void {
    const config = this.config.r710ConnectedClientsSync

    if (!config?.enabled) {
      return
    }

    const url = config.url || 'http://localhost:8080/api/r710/connected-clients/sync'
    const interval = config.interval || 300000 // 5 minutes default

    this.log('info', `Starting R710 connected clients sync (${url}, interval: ${interval}ms = ${interval / 60000} minutes)`)

    // Run immediately on start
    this.runR710Sync(url)

    // Then run on interval
    this.r710ConnectedClientsSyncTimer = setInterval(async () => {
      await this.runR710Sync(url)
    }, interval)
  }

  /**
   * Execute R710 connected clients sync
   */
  private async runR710Sync(url: string): Promise<void> {
    try {
      this.log('info', '📶 Starting R710 connected clients sync...')

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 120000) // 2 minute timeout

      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorText = await response.text()
        this.log('error', `❌ R710 sync failed: ${response.status} ${errorText}`)
        return
      }

      const result = await response.json()

      if (result.success) {
        this.log(
          'info',
          `✅ R710 sync completed: ${result.synced} clients synced from ${result.devices} devices`
        )
      } else {
        this.log('error', `❌ R710 sync failed: ${result.error}`)
      }
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          this.log('error', '❌ R710 sync timed out after 2 minutes')
        } else {
          this.log('error', `❌ R710 sync error: ${error.message}`)
        }
      }
    }
  }

  /**
   * Stop R710 connected clients synchronization
   */
  private stopR710ConnectedClientsSync(): void {
    if (this.r710ConnectedClientsSyncTimer) {
      clearInterval(this.r710ConnectedClientsSyncTimer)
      this.r710ConnectedClientsSyncTimer = null
      this.log('info', 'R710 connected clients sync stopped')
    }
  }

  /**
   * Start ESP32 connected clients synchronization job
   */
  private startESP32ConnectedClientsSync(): void {
    const config = this.config.esp32ConnectedClientsSync

    if (!config?.enabled) {
      return
    }

    const url = config.url || 'http://localhost:8080/api/esp32/connected-clients/sync'
    const interval = config.interval || 300000 // 5 minutes default

    this.log('info', `Starting ESP32 connected clients sync (${url}, interval: ${interval}ms = ${interval / 60000} minutes)`)

    // Run immediately on start
    this.runESP32Sync(url)

    // Then run on interval
    this.esp32ConnectedClientsSyncTimer = setInterval(async () => {
      await this.runESP32Sync(url)
    }, interval)
  }

  /**
   * Execute ESP32 connected clients sync
   */
  private async runESP32Sync(url: string): Promise<void> {
    try {
      this.log('info', '📡 Starting ESP32 connected clients sync...')

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 120000) // 2 minute timeout

      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorText = await response.text()
        this.log('error', `❌ ESP32 sync failed: ${response.status} ${errorText}`)
        return
      }

      const result = await response.json()

      if (result.success) {
        this.log(
          'info',
          `✅ ESP32 sync completed: ${result.synced} clients synced from ${result.devices} devices`
        )
      } else {
        this.log('error', `❌ ESP32 sync failed: ${result.error}`)
      }
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          this.log('error', '❌ ESP32 sync timed out after 2 minutes')
        } else {
          this.log('error', `❌ ESP32 sync error: ${error.message}`)
        }
      }
    }
  }

  /**
   * Stop ESP32 connected clients synchronization
   */
  private stopESP32ConnectedClientsSync(): void {
    if (this.esp32ConnectedClientsSyncTimer) {
      clearInterval(this.esp32ConnectedClientsSyncTimer)
      this.esp32ConnectedClientsSyncTimer = null
      this.log('info', 'ESP32 connected clients sync stopped')
    }
  }

  /**
   * Initialize logging system
   */
  private initializeLogging(): void {
    try {
      // Initialize the daily rotating logger
      this.logger = createSyncServiceLogger()
      this.logger.info('Sync service logging initialized', {
        nodeId: this.nodeId,
        nodeName: this.config.nodeName,
        logLevel: this.config.logLevel
      })
    } catch (error) {
      console.error('Failed to initialize logging:', error)
    }
  }



  /**
   * Log message with timestamp
   */
  private log(level: string, message: string, ...args: any[]): void {
    // Console output (keep for development/debugging)
    if (this.config.logLevel === 'debug' || level === 'error') {
      const timestamp = new Date().toISOString()
      const logMessage = `[${timestamp}] [${level.toUpperCase()}] [${this.nodeId}] ${message}`
      console.log(logMessage, ...args)
    }

    // File output via rotating logger
    if (this.logger) {
      const logData = args.length > 0 ? {
        nodeId: this.nodeId,
        nodeName: this.config.nodeName,
        args: args.map(arg => 
          typeof arg === 'object' ? arg : String(arg)
        )
      } : {
        nodeId: this.nodeId,
        nodeName: this.config.nodeName
      }

      this.logger.writeLog(level, message, logData)
    }
  }

  /**
   * Get local IP address
   * Prioritizes proper network interfaces over VPN/virtual interfaces
   */
  private getLocalIPAddress(): string {
    const interfaces = networkInterfaces()
    const candidates: Array<{ name: string; address: string; priority: number }> = []

    for (const [name, nets] of Object.entries(interfaces)) {
      if (nets) {
        for (const net of nets) {
          // Skip internal interfaces and IPv6
          if (!net.internal && net.family === 'IPv4') {
            const priority = this.getInterfacePriority(name, net.address)
            candidates.push({ name, address: net.address, priority })
          }
        }
      }
    }

    // Sort by priority (higher is better) and return the best candidate
    if (candidates.length > 0) {
      candidates.sort((a, b) => b.priority - a.priority)
      this.log('info', `Selected IP ${candidates[0].address} from interface ${candidates[0].name} (priority: ${candidates[0].priority})`)
      return candidates[0].address
    }

    return '127.0.0.1' // Fallback
  }

  /**
   * Assign priority to network interfaces
   * Higher priority = preferred interface
   */
  private getInterfacePriority(interfaceName: string, ipAddress: string): number {
    // Exclude APIPA/link-local addresses (169.254.x.x)
    if (ipAddress.startsWith('169.254.')) {
      return 1 // Very low priority
    }

    // Exclude other reserved/private ranges that shouldn't be used for sync
    if (ipAddress.startsWith('10.') && interfaceName.toLowerCase().includes('docker')) {
      return 2 // Low priority for Docker interfaces
    }

    const lowerName = interfaceName.toLowerCase()

    // High priority for standard network interfaces
    if (lowerName.includes('wi-fi') || lowerName === 'wifi') {
      return 100 // Highest priority for Wi-Fi
    }
    if (lowerName.includes('ethernet') || lowerName.startsWith('eth')) {
      return 95 // High priority for Ethernet
    }

    // Medium priority for standard private networks
    if (ipAddress.startsWith('192.168.') || ipAddress.startsWith('10.0.')) {
      return 50
    }

    // Low priority for VPN and virtual interfaces
    if (lowerName.includes('tailscale') || lowerName.includes('vpn') || 
        lowerName.includes('virtual') || lowerName.includes('vmware') ||
        lowerName.includes('hyper-v') || lowerName.includes('bluetooth')) {
      return 10
    }

    // Default priority for other interfaces
    return 30
  }

  /**
   * Setup graceful shutdown handlers
   */
  private setupShutdownHandlers(): void {
    const shutdown = async (signal: string) => {
      this.log('info', `Received ${signal}, shutting down gracefully...`)
      try {
        await this.stop()
        process.exit(0)
      } catch (error) {
        this.log('error', 'Error during shutdown:', error)
        process.exit(1)
      }
    }

    process.on('SIGINT', () => shutdown('SIGINT'))
    process.on('SIGTERM', () => shutdown('SIGTERM'))

    // Windows specific
    if (process.platform === 'win32') {
      process.on('SIGHUP', () => shutdown('SIGHUP'))
    }
  }
}

/**
 * Create and configure sync service
 */
export function createSyncService(config: SyncServiceConfig): SyncService {
  return new SyncService(config)
}

/**
 * Default service configuration
 */
export function getDefaultSyncConfig(): Partial<SyncServiceConfig> {
  const httpPort = process.env.PORT ? parseInt(process.env.PORT) : 8080
  
  return {
    port: 8765,
    httpPort: httpPort,
    syncInterval: 30000, // 30 seconds
    enableAutoStart: true,
    logLevel: 'info',
    dataDirectory: './data/sync',
    maxLogSize: 10 * 1024 * 1024, // 10MB
    maxLogFiles: 5
  }
}