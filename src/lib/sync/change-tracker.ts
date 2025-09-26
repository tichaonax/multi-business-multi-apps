/**
 * Database Change Tracking System with Vector Clocks and Registration Key Security
 * Captures all database changes for peer-to-peer synchronization
 */

import { PrismaClient, SyncOperation } from '@prisma/client'
import crypto from 'crypto'
import { v4 as uuidv4 } from 'uuid'

export interface VectorClock {
  [nodeId: string]: number
}

export interface ChangeEvent {
  eventId: string
  sourceNodeId: string
  tableName: string
  recordId: string
  operation: SyncOperation
  changeData: any
  beforeData?: any
  vectorClock: VectorClock
  lamportClock: bigint
  checksum: string
  priority: number
  metadata?: any
}

export class DatabaseChangeTracker {
  private prisma: PrismaClient
  private nodeId: string
  private vectorClock: VectorClock = {}
  private lamportClock: bigint = 0n
  private registrationKey: string
  private isEnabled: boolean = true

  // Tables to exclude from sync (system tables)
  private excludedTables = new Set([
    'accounts',
    'sessions',
    'verification_tokens',
    'audit_logs',
    'sync_nodes',
    'sync_events',
    'conflict_resolutions',
    'sync_sessions',
    'network_partitions',
    'sync_metrics',
    'sync_configurations'
  ])

  constructor(prisma: PrismaClient, nodeId: string, registrationKey: string) {
    this.prisma = prisma
    this.nodeId = nodeId
    this.registrationKey = registrationKey
    this.initializeVectorClock()
  }

  /**
   * Initialize vector clock with current node
   */
  private async initializeVectorClock() {
    this.vectorClock[this.nodeId] = 0

    // Load existing vector clock state from database
    try {
      const syncConfig = await this.prisma.syncConfiguration.findUnique({
        where: { nodeId: this.nodeId }
      })

      if (syncConfig?.configMetadata) {
        const metadata = syncConfig.configMetadata as any
        if (metadata.vectorClock) {
          this.vectorClock = { ...metadata.vectorClock }
        }
        if (metadata.lamportClock) {
          this.lamportClock = BigInt(metadata.lamportClock)
        }
      }
    } catch (error) {
      console.warn('Failed to load vector clock state:', error)
    }
  }

  /**
   * Track a database change event
   */
  async trackChange(
    tableName: string,
    recordId: string,
    operation: SyncOperation,
    changeData: any,
    beforeData?: any,
    priority: number = 5,
    metadata?: any
  ): Promise<string> {

    if (!this.isEnabled || this.excludedTables.has(tableName)) {
      return ''
    }

    // Increment vector clock and Lamport clock
    this.vectorClock[this.nodeId] = (this.vectorClock[this.nodeId] || 0) + 1
    this.lamportClock += 1n

    const eventId = uuidv4()
    const checksum = this.calculateChecksum(changeData)

    const changeEvent: ChangeEvent = {
      eventId,
      sourceNodeId: this.nodeId,
      tableName,
      recordId,
      operation,
      changeData,
      beforeData,
      vectorClock: { ...this.vectorClock },
      lamportClock: this.lamportClock,
      checksum,
      priority,
      metadata: {
        timestamp: new Date().toISOString(),
        nodeVersion: process.env.npm_package_version || '1.0.0',
        registrationKeyHash: this.hashRegistrationKey(),
        ...metadata
      }
    }

    try {
      // Store the sync event
      await this.prisma.syncEvent.create({
        data: {
          eventId: changeEvent.eventId,
          sourceNodeId: changeEvent.sourceNodeId,
          tableName: changeEvent.tableName,
          recordId: changeEvent.recordId,
          operation: changeEvent.operation,
          changeData: changeEvent.changeData,
          beforeData: changeEvent.beforeData,
          vectorClock: changeEvent.vectorClock,
          lamportClock: changeEvent.lamportClock,
          checksum: changeEvent.checksum,
          priority: changeEvent.priority,
          metadata: changeEvent.metadata,
          processed: false
        }
      })

      // Update vector clock state in configuration
      await this.updateVectorClockState()

      return eventId
    } catch (error) {
      console.error('Failed to track change event:', error)
      throw error
    }
  }

  /**
   * Track CREATE operation
   */
  async trackCreate(tableName: string, recordId: string, data: any, priority: number = 5): Promise<string> {
    return this.trackChange(tableName, recordId, SyncOperation.CREATE, data, undefined, priority)
  }

  /**
   * Track UPDATE operation
   */
  async trackUpdate(tableName: string, recordId: string, newData: any, oldData: any, priority: number = 5): Promise<string> {
    return this.trackChange(tableName, recordId, SyncOperation.UPDATE, newData, oldData, priority)
  }

  /**
   * Track DELETE operation
   */
  async trackDelete(tableName: string, recordId: string, deletedData: any, priority: number = 5): Promise<string> {
    return this.trackChange(tableName, recordId, SyncOperation.DELETE, {}, deletedData, priority)
  }

  /**
   * Merge vector clock from another node
   */
  mergeVectorClock(otherClock: VectorClock): void {
    for (const [nodeId, timestamp] of Object.entries(otherClock)) {
      this.vectorClock[nodeId] = Math.max(
        this.vectorClock[nodeId] || 0,
        timestamp
      )
    }

    // Update Lamport clock to be greater than any seen timestamp
    const maxLamport = Math.max(...Object.values(this.vectorClock))
    this.lamportClock = BigInt(Math.max(Number(this.lamportClock), maxLamport + 1))
  }

  /**
   * Compare vector clocks for causality
   */
  compareVectorClocks(clockA: VectorClock, clockB: VectorClock): 'before' | 'after' | 'concurrent' {
    let aBefore = true
    let aAfter = true

    const allNodes = new Set([...Object.keys(clockA), ...Object.keys(clockB)])

    for (const nodeId of allNodes) {
      const a = clockA[nodeId] || 0
      const b = clockB[nodeId] || 0

      if (a > b) aBefore = false
      if (a < b) aAfter = false
    }

    if (aBefore && !aAfter) return 'before'
    if (aAfter && !aBefore) return 'after'
    return 'concurrent'
  }

  /**
   * Calculate data integrity checksum
   */
  private calculateChecksum(data: any): string {
    const dataString = JSON.stringify(data, Object.keys(data).sort())
    return crypto.createHash('sha256').update(dataString).digest('hex')
  }

  /**
   * Hash registration key for security verification
   */
  private hashRegistrationKey(): string {
    return crypto.createHash('sha256').update(this.registrationKey + this.nodeId).digest('hex')
  }

  /**
   * Update vector clock state in database
   */
  private async updateVectorClockState(): Promise<void> {
    try {
      await this.prisma.syncConfiguration.upsert({
        where: { nodeId: this.nodeId },
        update: {
          lastConfigUpdate: new Date(),
          configMetadata: {
            vectorClock: this.vectorClock,
            lamportClock: this.lamportClock.toString()
          }
        },
        create: {
          nodeId: this.nodeId,
          registrationKeyHash: this.hashRegistrationKey(),
          configMetadata: {
            vectorClock: this.vectorClock,
            lamportClock: this.lamportClock.toString()
          }
        }
      })
    } catch (error) {
      console.warn('Failed to update vector clock state:', error)
    }
  }

  /**
   * Get unprocessed sync events for propagation
   */
  async getUnprocessedEvents(limit: number = 100): Promise<ChangeEvent[]> {
    const events = await this.prisma.syncEvent.findMany({
      where: {
        processed: false,
        sourceNodeId: this.nodeId
      },
      orderBy: [
        { priority: 'desc' },
        { lamportClock: 'asc' }
      ],
      take: limit
    })

    return events.map(event => ({
      eventId: event.eventId,
      sourceNodeId: event.sourceNodeId,
      tableName: event.tableName,
      recordId: event.recordId,
      operation: event.operation,
      changeData: event.changeData,
      beforeData: event.beforeData,
      vectorClock: event.vectorClock as VectorClock,
      lamportClock: event.lamportClock,
      checksum: event.checksum,
      priority: event.priority,
      metadata: event.metadata
    }))
  }

  /**
   * Mark events as processed
   */
  async markEventsProcessed(eventIds: string[]): Promise<void> {
    await this.prisma.syncEvent.updateMany({
      where: {
        eventId: { in: eventIds }
      },
      data: {
        processed: true,
        processedAt: new Date()
      }
    })
  }

  /**
   * Enable/disable change tracking
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled
  }

  /**
   * Get current vector clock
   */
  getVectorClock(): VectorClock {
    return { ...this.vectorClock }
  }

  /**
   * Get current Lamport clock
   */
  getLamportClock(): bigint {
    return this.lamportClock
  }

  /**
   * Verify registration key hash matches
   */
  verifyRegistrationKey(providedHash: string): boolean {
    return providedHash === this.hashRegistrationKey()
  }

  /**
   * Initialize node registration
   */
  async initializeNode(nodeName: string, ipAddress: string, port: number = 3001): Promise<void> {
    try {
      await this.prisma.syncNode.upsert({
        where: { nodeId: this.nodeId },
        update: {
          nodeName,
          ipAddress,
          port,
          lastSeen: new Date(),
          isActive: true,
          nodeVersion: process.env.npm_package_version || '1.0.0',
          databaseVersion: '1.0.0', // TODO: Get from schema version
          platformInfo: {
            platform: process.platform,
            arch: process.arch,
            nodeVersion: process.version
          },
          capabilities: {
            compression: true,
            encryption: true,
            vectorClocks: true,
            conflictResolution: true
          }
        },
        create: {
          nodeId: this.nodeId,
          nodeName,
          ipAddress,
          port,
          registrationKey: this.registrationKey,
          publicKey: '', // TODO: Generate RSA key pair
          isActive: true,
          nodeVersion: process.env.npm_package_version || '1.0.0',
          databaseVersion: '1.0.0',
          platformInfo: {
            platform: process.platform,
            arch: process.arch,
            nodeVersion: process.version
          },
          capabilities: {
            compression: true,
            encryption: true,
            vectorClocks: true,
            conflictResolution: true
          }
        }
      })
    } catch (error) {
      console.error('Failed to initialize sync node:', error)
      throw error
    }
  }
}

// Export singleton instance factory
let changeTrackerInstance: DatabaseChangeTracker | null = null

export function getChangeTracker(
  prisma: PrismaClient,
  nodeId: string,
  registrationKey: string
): DatabaseChangeTracker {
  if (!changeTrackerInstance) {
    changeTrackerInstance = new DatabaseChangeTracker(prisma, nodeId, registrationKey)
  }
  return changeTrackerInstance
}