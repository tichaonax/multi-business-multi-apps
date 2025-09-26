/**
 * Partition Recovery Service
 * Handles healing and recovery from network partitions
 */

import { EventEmitter } from 'events'
import { PrismaClient } from '@prisma/client'
import { PartitionDetector, PartitionInfo, PartitionRecoveryPlan } from './partition-detector'
import { SyncEngine } from './sync-engine'
import { ConflictResolver } from './conflict-resolver'
import { SyncUtils } from './sync-utils'
import { PeerDiscoveryService } from './peer-discovery'

export interface RecoverySession {
  sessionId: string
  partitionId: string
  strategy: string
  startedAt: Date
  completedAt?: Date
  status: 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED'
  progress: number // 0-100
  currentStep: string
  errorMessage?: string
  recoveryMetrics: {
    eventsProcessed: number
    conflictsResolved: number
    dataRebuilt: number
    peersReconnected: number
  }
}

export interface RecoveryMetrics {
  totalRecoveries: number
  successfulRecoveries: number
  failedRecoveries: number
  averageRecoveryTime: number
  recoverySuccessRate: number
  commonFailureReasons: Array<{ reason: string; count: number }>
}

/**
 * Partition Recovery Service
 * Orchestrates healing from network partitions
 */
export class PartitionRecoveryService extends EventEmitter {
  private prisma: PrismaClient
  private nodeId: string
  private registrationKey: string
  private partitionDetector: PartitionDetector
  private syncEngine: SyncEngine | null = null
  private conflictResolver: ConflictResolver
  private syncUtils: SyncUtils
  private peerDiscovery: PeerDiscoveryService | null = null

  private activeSessions: Map<string, RecoverySession> = new Map()
  private recoveryTimer: NodeJS.Timeout | null = null
  private isRecovering = false

  // Recovery configuration
  private readonly RECOVERY_CHECK_INTERVAL = 30000 // 30 seconds
  private readonly MAX_CONCURRENT_RECOVERIES = 3
  private readonly RECOVERY_TIMEOUT = 1800000 // 30 minutes

  constructor(
    prisma: PrismaClient,
    nodeId: string,
    registrationKey: string,
    partitionDetector: PartitionDetector
  ) {
    super()
    this.prisma = prisma
    this.nodeId = nodeId
    this.registrationKey = registrationKey
    this.partitionDetector = partitionDetector
    this.conflictResolver = new ConflictResolver(prisma, nodeId)
    this.syncUtils = new SyncUtils(prisma, nodeId)

    this.setupPartitionDetectorEvents()
  }

  /**
   * Set sync engine reference
   */
  setSyncEngine(syncEngine: SyncEngine): void {
    this.syncEngine = syncEngine
  }

  /**
   * Set peer discovery service reference
   */
  setPeerDiscovery(peerDiscovery: PeerDiscoveryService): void {
    this.peerDiscovery = peerDiscovery
  }

  /**
   * Start recovery service
   */
  async start(): Promise<void> {
    await this.loadActiveSessions()
    this.startPeriodicRecovery()
    this.emit('started')
  }

  /**
   * Stop recovery service
   */
  async stop(): Promise<void> {
    if (this.recoveryTimer) {
      clearInterval(this.recoveryTimer)
      this.recoveryTimer = null
    }

    // Cancel active recovery sessions
    for (const session of this.activeSessions.values()) {
      if (session.status === 'RUNNING') {
        await this.cancelRecoverySession(session.sessionId)
      }
    }

    this.emit('stopped')
  }

  /**
   * Initiate manual recovery
   */
  async initiateRecovery(partitionId: string, strategy?: string): Promise<string | null> {
    if (this.activeSessions.size >= this.MAX_CONCURRENT_RECOVERIES) {
      throw new Error('Maximum concurrent recoveries reached')
    }

    const partition = this.partitionDetector.getActivePartitions()
      .find(p => p.partitionId === partitionId)

    if (!partition) {
      throw new Error('Partition not found or already resolved')
    }

    return await this.startRecoverySession(partition, strategy)
  }

  /**
   * Get recovery session status
   */
  getRecoverySession(sessionId: string): RecoverySession | null {
    return this.activeSessions.get(sessionId) || null
  }

  /**
   * Get all active recovery sessions
   */
  getActiveRecoverySessions(): RecoverySession[] {
    return Array.from(this.activeSessions.values())
  }

  /**
   * Cancel recovery session
   */
  async cancelRecoverySession(sessionId: string): Promise<boolean> {
    const session = this.activeSessions.get(sessionId)
    if (!session || session.status !== 'RUNNING') {
      return false
    }

    session.status = 'CANCELLED'
    session.completedAt = new Date()

    await this.updateRecoverySession(session)
    this.activeSessions.delete(sessionId)
    this.emit('recovery_cancelled', session)

    return true
  }

  /**
   * Get recovery metrics
   */
  async getRecoveryMetrics(): Promise<RecoveryMetrics> {
    try {
      const sessions = await this.prisma.recoverySession.findMany({
        where: { nodeId: this.nodeId },
        orderBy: { startedAt: 'desc' }
      })

      const total = sessions.length
      const successful = sessions.filter(s => s.status === 'COMPLETED').length
      const failed = sessions.filter(s => s.status === 'FAILED').length

      const completedSessions = sessions.filter(s => s.completedAt)
      const avgTime = completedSessions.length > 0
        ? completedSessions.reduce((sum, s) =>
          sum + (s.completedAt!.getTime() - s.startedAt.getTime()), 0) / completedSessions.length
        : 0

      // Analyze failure reasons
      const failureReasons = new Map<string, number>()
      sessions.filter(s => s.errorMessage).forEach(s => {
        const reason = s.errorMessage!
        failureReasons.set(reason, (failureReasons.get(reason) || 0) + 1)
      })

      const commonFailures = Array.from(failureReasons.entries())
        .map(([reason, count]) => ({ reason, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)

      return {
        totalRecoveries: total,
        successfulRecoveries: successful,
        failedRecoveries: failed,
        averageRecoveryTime: Math.round(avgTime / 1000), // seconds
        recoverySuccessRate: total > 0 ? successful / total : 0,
        commonFailureReasons: commonFailures
      }
    } catch (error) {
      console.error('Failed to get recovery metrics:', error)
      return {
        totalRecoveries: 0,
        successfulRecoveries: 0,
        failedRecoveries: 0,
        averageRecoveryTime: 0,
        recoverySuccessRate: 0,
        commonFailureReasons: []
      }
    }
  }

  /**
   * Setup partition detector events
   */
  private setupPartitionDetectorEvents(): void {
    this.partitionDetector.on('partition_detected', async (partition: PartitionInfo) => {
      await this.handlePartitionDetected(partition)
    })

    this.partitionDetector.on('critical_partition', async (partition: PartitionInfo) => {
      await this.handleCriticalPartition(partition)
    })
  }

  /**
   * Handle partition detected
   */
  private async handlePartitionDetected(partition: PartitionInfo): Promise<void> {
    // Auto-start recovery for certain types if auto-executable
    const plan = await this.partitionDetector.getRecoveryPlan(partition.partitionId)

    if (plan?.autoExecutable && this.activeSessions.size < this.MAX_CONCURRENT_RECOVERIES) {
      try {
        await this.startRecoverySession(partition)
      } catch (error) {
        console.error('Failed to auto-start recovery:', error)
      }
    }
  }

  /**
   * Handle critical partition
   */
  private async handleCriticalPartition(partition: PartitionInfo): Promise<void> {
    // Always attempt recovery for critical partitions
    if (this.activeSessions.size < this.MAX_CONCURRENT_RECOVERIES) {
      try {
        await this.startRecoverySession(partition)
        this.emit('critical_recovery_started', partition)
      } catch (error) {
        console.error('Failed to start critical recovery:', error)
        this.emit('critical_recovery_failed', { partition, error })
      }
    }
  }

  /**
   * Start periodic recovery checks
   */
  private startPeriodicRecovery(): void {
    this.recoveryTimer = setInterval(async () => {
      await this.performRecoveryCheck()
    }, this.RECOVERY_CHECK_INTERVAL)
  }

  /**
   * Perform recovery check
   */
  private async performRecoveryCheck(): Promise<void> {
    if (this.isRecovering) return

    try {
      this.isRecovering = true

      // Check for timeouts
      await this.checkRecoveryTimeouts()

      // Update session progress
      await this.updateActiveSessionProgress()

      // Check for completed recoveries
      await this.checkCompletedRecoveries()

    } catch (error) {
      console.error('Recovery check failed:', error)
    } finally {
      this.isRecovering = false
    }
  }

  /**
   * Start recovery session
   */
  private async startRecoverySession(
    partition: PartitionInfo,
    strategy?: string
  ): Promise<string> {
    const sessionId = crypto.randomUUID()
    const plan = await this.partitionDetector.getRecoveryPlan(partition.partitionId)

    if (!plan) {
      throw new Error('Cannot generate recovery plan')
    }

    const selectedStrategy = strategy || plan.strategy

    const session: RecoverySession = {
      sessionId,
      partitionId: partition.partitionId,
      strategy: selectedStrategy,
      startedAt: new Date(),
      status: 'RUNNING',
      progress: 0,
      currentStep: 'Initializing recovery',
      recoveryMetrics: {
        eventsProcessed: 0,
        conflictsResolved: 0,
        dataRebuilt: 0,
        peersReconnected: 0
      }
    }

    await this.createRecoverySession(session)
    this.activeSessions.set(sessionId, session)

    // Start recovery execution
    setImmediate(() => this.executeRecovery(session))

    this.emit('recovery_started', session)
    return sessionId
  }

  /**
   * Execute recovery
   */
  private async executeRecovery(session: RecoverySession): Promise<void> {
    try {
      await this.updateSessionProgress(session, 10, 'Starting recovery process')

      switch (session.strategy) {
        case 'WAIT_RECONNECT':
          await this.executeWaitReconnectRecovery(session)
          break
        case 'FORCE_RESYNC':
          await this.executeForceResyncRecovery(session)
          break
        case 'MANUAL_INTERVENTION':
          await this.executeManualInterventionRecovery(session)
          break
        case 'DATA_REBUILD':
          await this.executeDataRebuildRecovery(session)
          break
        default:
          throw new Error(`Unknown recovery strategy: ${session.strategy}`)
      }

      // Mark as completed
      session.status = 'COMPLETED'
      session.completedAt = new Date()
      session.progress = 100
      session.currentStep = 'Recovery completed successfully'

      await this.updateRecoverySession(session)
      this.emit('recovery_completed', session)

    } catch (error) {
      session.status = 'FAILED'
      session.completedAt = new Date()
      session.errorMessage = error instanceof Error ? error.message : 'Unknown error'

      await this.updateRecoverySession(session)
      this.emit('recovery_failed', { session, error })
    } finally {
      this.activeSessions.delete(session.sessionId)
    }
  }

  /**
   * Execute wait reconnect recovery
   */
  private async executeWaitReconnectRecovery(session: RecoverySession): Promise<void> {
    await this.updateSessionProgress(session, 20, 'Monitoring for peer reconnection')

    // Wait for peers to reconnect (with timeout)
    const startTime = Date.now()
    const timeout = 300000 // 5 minutes

    while (Date.now() - startTime < timeout && session.status === 'RUNNING') {
      // Check if partition is resolved
      const partitions = this.partitionDetector.getActivePartitions()
      const partition = partitions.find(p => p.partitionId === session.partitionId)

      if (!partition) {
        // Partition resolved
        await this.updateSessionProgress(session, 100, 'Peer reconnected successfully')
        return
      }

      await this.updateSessionProgress(
        session,
        20 + Math.min(70, (Date.now() - startTime) / timeout * 70),
        'Waiting for peer reconnection...'
      )

      await new Promise(resolve => setTimeout(resolve, 5000)) // Check every 5 seconds
    }

    throw new Error('Timeout waiting for peer reconnection')
  }

  /**
   * Execute force resync recovery
   */
  private async executeForceResyncRecovery(session: RecoverySession): Promise<void> {
    await this.updateSessionProgress(session, 20, 'Clearing failed sync sessions')

    // Clear failed sessions
    await this.prisma.syncSession.updateMany({
      where: {
        sourceNodeId: this.nodeId,
        status: 'FAILED'
      },
      data: { status: 'CANCELLED' }
    })

    await this.updateSessionProgress(session, 40, 'Resetting sync state')

    // Reset sync state
    await this.syncUtils.resetSyncState()

    await this.updateSessionProgress(session, 60, 'Initiating full resynchronization')

    // Trigger resync with all available peers
    if (this.syncEngine && this.peerDiscovery) {
      const peers = this.peerDiscovery.getDiscoveredPeers()

      for (let i = 0; i < peers.length; i++) {
        const peer = peers[i]
        try {
          await this.syncEngine.syncWithPeer(peer)
          session.recoveryMetrics.peersReconnected++

          await this.updateSessionProgress(
            session,
            60 + (i + 1) / peers.length * 30,
            `Syncing with peer ${peer.nodeName}`
          )
        } catch (error) {
          console.warn(`Failed to sync with peer ${peer.nodeName}:`, error)
        }
      }
    }

    await this.updateSessionProgress(session, 90, 'Verifying sync completion')

    // Wait a bit for sync to complete
    await new Promise(resolve => setTimeout(resolve, 10000))
  }

  /**
   * Execute manual intervention recovery
   */
  private async executeManualInterventionRecovery(session: RecoverySession): Promise<void> {
    await this.updateSessionProgress(session, 30, 'Marking as requiring manual intervention')

    // Update partition metadata
    await this.prisma.networkPartition.update({
      where: { id: session.partitionId },
      data: {
        partitionMetadata: {
          requiresManualIntervention: true,
          interventionRequested: new Date().toISOString(),
          recoverySessionId: session.sessionId
        }
      }
    })

    await this.updateSessionProgress(session, 100, 'Marked for manual intervention')
  }

  /**
   * Execute data rebuild recovery
   */
  private async executeDataRebuildRecovery(session: RecoverySession): Promise<void> {
    await this.updateSessionProgress(session, 20, 'Preparing for data rebuild')

    // This is a critical operation - mark for admin action
    await this.prisma.networkPartition.update({
      where: { id: session.partitionId },
      data: {
        partitionMetadata: {
          dataRebuildRequired: true,
          rebuildRequested: new Date().toISOString(),
          recoverySessionId: session.sessionId
        }
      }
    })

    await this.updateSessionProgress(session, 100, 'Data rebuild requested - admin action required')
  }

  /**
   * Update session progress
   */
  private async updateSessionProgress(
    session: RecoverySession,
    progress: number,
    step: string
  ): Promise<void> {
    session.progress = Math.min(100, Math.max(0, progress))
    session.currentStep = step

    await this.updateRecoverySession(session)
    this.emit('recovery_progress', { sessionId: session.sessionId, progress, step })
  }

  /**
   * Check recovery timeouts
   */
  private async checkRecoveryTimeouts(): Promise<void> {
    const now = Date.now()

    for (const session of this.activeSessions.values()) {
      if (session.status === 'RUNNING') {
        const elapsed = now - session.startedAt.getTime()

        if (elapsed > this.RECOVERY_TIMEOUT) {
          session.status = 'FAILED'
          session.completedAt = new Date()
          session.errorMessage = 'Recovery timeout'

          await this.updateRecoverySession(session)
          this.activeSessions.delete(session.sessionId)
          this.emit('recovery_timeout', session)
        }
      }
    }
  }

  /**
   * Update active session progress
   */
  private async updateActiveSessionProgress(): Promise<void> {
    for (const session of this.activeSessions.values()) {
      if (session.status === 'RUNNING') {
        await this.updateRecoverySession(session)
      }
    }
  }

  /**
   * Check completed recoveries
   */
  private async checkCompletedRecoveries(): Promise<void> {
    for (const session of this.activeSessions.values()) {
      if (session.status !== 'RUNNING') {
        this.activeSessions.delete(session.sessionId)
      }
    }
  }

  /**
   * Load active sessions
   */
  private async loadActiveSessions(): Promise<void> {
    try {
      const sessions = await this.prisma.recoverySession.findMany({
        where: {
          nodeId: this.nodeId,
          status: 'RUNNING'
        }
      })

      for (const dbSession of sessions) {
        const session: RecoverySession = {
          sessionId: dbSession.id,
          partitionId: dbSession.partitionId,
          strategy: dbSession.strategy,
          startedAt: dbSession.startedAt,
          completedAt: dbSession.completedAt || undefined,
          status: dbSession.status as any,
          progress: dbSession.progress,
          currentStep: dbSession.currentStep,
          errorMessage: dbSession.errorMessage || undefined,
          recoveryMetrics: dbSession.recoveryMetrics as any || {
            eventsProcessed: 0,
            conflictsResolved: 0,
            dataRebuilt: 0,
            peersReconnected: 0
          }
        }

        this.activeSessions.set(session.sessionId, session)
      }
    } catch (error) {
      console.error('Failed to load active recovery sessions:', error)
    }
  }

  /**
   * Create recovery session in database
   */
  private async createRecoverySession(session: RecoverySession): Promise<void> {
    try {
      await this.prisma.recoverySession.create({
        data: {
          id: session.sessionId,
          nodeId: this.nodeId,
          partitionId: session.partitionId,
          strategy: session.strategy,
          startedAt: session.startedAt,
          status: session.status,
          progress: session.progress,
          currentStep: session.currentStep,
          recoveryMetrics: session.recoveryMetrics
        }
      })
    } catch (error) {
      console.error('Failed to create recovery session:', error)
    }
  }

  /**
   * Update recovery session in database
   */
  private async updateRecoverySession(session: RecoverySession): Promise<void> {
    try {
      await this.prisma.recoverySession.update({
        where: { id: session.sessionId },
        data: {
          status: session.status,
          progress: session.progress,
          currentStep: session.currentStep,
          completedAt: session.completedAt,
          errorMessage: session.errorMessage,
          recoveryMetrics: session.recoveryMetrics
        }
      })
    } catch (error) {
      console.error('Failed to update recovery session:', error)
    }
  }
}

/**
 * Create partition recovery service
 */
export function createPartitionRecoveryService(
  prisma: PrismaClient,
  nodeId: string,
  registrationKey: string,
  partitionDetector: PartitionDetector
): PartitionRecoveryService {
  return new PartitionRecoveryService(prisma, nodeId, registrationKey, partitionDetector)
}