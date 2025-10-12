/**
 * Sync System Utilities
 * Helper functions for database synchronization
 */

import { PrismaClient, SyncOperation } from '@prisma/client'
import { ChangeEvent, VectorClock } from './change-tracker'
import crypto from 'crypto'

export interface SyncStats {
  totalEvents: number
  processedEvents: number
  pendingEvents: number
  conflictCount: number
  totalConflicts: number
  totalEventsSynced: number
  lastSyncTime: Date | null
  peersConnected: number
}

export interface ConflictDetectionResult {
  hasConflict: boolean
  conflictType: 'UPDATE_UPDATE' | 'UPDATE_DELETE' | 'DELETE_UPDATE' | 'CREATE_CREATE' | 'CONSTRAINT'
  winningEvent?: ChangeEvent
  losingEvents?: ChangeEvent[]
  resolutionStrategy?: string
}

/**
 * Sync utilities class for common sync operations
 */
export class SyncUtils {
  private prisma: PrismaClient
  private nodeId: string

  constructor(prisma: PrismaClient, nodeId: string) {
    this.prisma = prisma
    this.nodeId = nodeId
  }

  /**
   * Get sync statistics for monitoring
   */
  async getSyncStats(): Promise<SyncStats> {
    try {
      const [totalEvents, processedEvents, conflictCount, lastEvent, peerCount] = await Promise.all([
        this.prisma.syncEvents.count(),
        this.prisma.syncEvents.count({ where: { processed: true } }),
        this.prisma.conflictResolutions.count(),
        this.prisma.syncEvents.findFirst({
          orderBy: { createdAt: 'desc' },
          select: { createdAt: true }
        }),
        this.prisma.syncNodes.count({ where: { isActive: true, nodeId: { not: this.nodeId } } })
      ])

      return {
        totalEvents,
        processedEvents,
        pendingEvents: totalEvents - processedEvents,
        conflictCount,
        totalConflicts: conflictCount,
        totalEventsSynced: processedEvents,
        lastSyncTime: lastEvent?.createdAt || null,
        peersConnected: peerCount
      }
    } catch (error) {
      console.error('Failed to get sync stats:', error)
      throw error
    }
  }

  /**
   * Detect conflicts between sync events
   */
  async detectConflicts(incomingEvent: ChangeEvent): Promise<ConflictDetectionResult> {
    try {
      // Find existing events for the same record
      const existingEvents = await this.prisma.syncEvents.findMany({
        where: {
          tableName: incomingEvent.tableName,
          recordId: incomingEvent.recordId,
          sourceNodeId: { not: incomingEvent.sourceNodeId },
          processed: false
        },
        orderBy: { lamportClock: 'desc' }
      })

      if (existingEvents.length === 0) {
        return { hasConflict: false, conflictType: 'CREATE_CREATE' }
      }

      // Check for conflicts
      for (const existingEvent of existingEvents) {
        const existingClock = existingEvent.vectorClock as VectorClock
        const incomingClock = incomingEvent.vectorClock

        // Compare vector clocks to determine causality
        const causality = this.compareVectorClocks(existingClock, incomingClock)

        if (causality === 'concurrent') {
          // Concurrent events = potential conflict
          const conflictType = this.determineConflictType(
            existingEvent.operation as any,
            incomingEvent.operation
          )

          const { winningEvent, losingEvents, strategy } = this.resolveConflict(
            [existingEvent as any, incomingEvent]
          )

          return {
            hasConflict: true,
            conflictType,
            winningEvent,
            losingEvents,
            resolutionStrategy: strategy
          }
        }
      }

      return { hasConflict: false, conflictType: 'CREATE_CREATE' }
    } catch (error) {
      console.error('Failed to detect conflicts:', error)
      throw error
    }
  }

  /**
   * Apply a sync event to the local database
   */
  async applySyncEvent(event: ChangeEvent): Promise<boolean> {
    try {
      const modelName = this.pascalCase(event.tableName)
      const modelClient = (this.prisma as any)[event.tableName]

      if (!modelClient) {
        console.warn(`Model ${modelName} not found in Prisma client`)
        return false
      }

      switch (event.operation) {
        case 'CREATE':
          await modelClient.create({ data: event.changeData })
          break

        case 'UPDATE':
          await modelClient.update({
            where: { id: event.recordId },
            data: event.changeData
          })
          break

        case 'DELETE':
          await modelClient.delete({
            where: { id: event.recordId }
          })
          break

        default:
          console.warn(`Unsupported operation: ${event.operation}`)
          return false
      }

      // Mark event as processed
      await this.prisma.syncEvents.update({
        where: { eventId: event.eventId },
        data: {
          processed: true,
          processedAt: new Date()
        }
      })

      return true
    } catch (error) {
      console.error('Failed to apply sync event:', error)

      // Mark event as failed
      await this.prisma.syncEvents.update({
        where: { eventId: event.eventId },
        data: {
          retryCount: { increment: 1 },
          processingError: error instanceof Error ? error.message : 'Unknown error'
        }
      }).catch(() => {}) // Ignore errors when updating error state

      return false
    }
  }

  /**
   * Verify data integrity using checksums
   */
  verifyChecksum(event: ChangeEvent): boolean {
    const calculatedChecksum = this.calculateChecksum(event.changeData)
    return calculatedChecksum === event.checksum
  }

  /**
   * Calculate data checksum
   */
  private calculateChecksum(data: any): string {
    const dataString = JSON.stringify(data, Object.keys(data).sort())
    return crypto.createHash('sha256').update(dataString).digest('hex')
  }

  /**
   * Compare vector clocks for causality
   */
  private compareVectorClocks(clockA: VectorClock, clockB: VectorClock): 'before' | 'after' | 'concurrent' {
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
   * Determine conflict type based on operations
   */
  private determineConflictType(opA: any, opB: any): ConflictDetectionResult['conflictType'] {
    if (opA === 'UPDATE' && opB === 'UPDATE') return 'UPDATE_UPDATE'
    if (opA === 'UPDATE' && opB === 'DELETE') return 'UPDATE_DELETE'
    if (opA === 'DELETE' && opB === 'UPDATE') return 'DELETE_UPDATE'
    if (opA === 'CREATE' && opB === 'CREATE') return 'CREATE_CREATE'
    return 'CONSTRAINT'
  }

  /**
   * Resolve conflicts using configured strategy
   */
  private resolveConflict(events: ChangeEvent[]): {
    winningEvent: ChangeEvent
    losingEvents: ChangeEvent[]
    strategy: string
  } {
    // Sort by priority first, then by Lamport clock
    const sortedEvents = events.sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority // Higher priority wins
      }
      return Number(BigInt(b.lamportClock) - BigInt(a.lamportClock)) // Later timestamp wins
    })

    const winningEvent = sortedEvents[0]
    const losingEvents = sortedEvents.slice(1)

    return {
      winningEvent,
      losingEvents,
      strategy: 'PRIORITY_THEN_TIMESTAMP'
    }
  }

  /**
   * Convert snake_case to PascalCase
   */
  private pascalCase(str: string): string {
    return str
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join('')
  }

  /**
   * Clean up old processed events
   */
  async cleanupOldEvents(daysToKeep: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)

      const result = await this.prisma.syncEvents.deleteMany({
        where: {
          processed: true,
          processedAt: {
            lt: cutoffDate
          }
        }
      })

      return result.count
    } catch (error) {
      console.error('Failed to cleanup old events:', error)
      throw error
    }
  }

  /**
   * Get failed sync events for retry
   */
  async getFailedEvents(maxRetries: number = 3): Promise<ChangeEvent[]> {
    const events = await this.prisma.syncEvents.findMany({
      where: {
        processed: false,
        retryCount: { lt: maxRetries },
        processingError: { not: null }
      },
      orderBy: { createdAt: 'asc' },
      take: 50
    })

  return events.map((event: any) => ({
      eventId: event.eventId,
      sourceNodeId: event.sourceNodeId,
      tableName: event.tableName,
      recordId: event.recordId,
      operation: event.operation as SyncOperation,
      changeData: event.changeData,
      beforeData: event.beforeData,
      vectorClock: event.vectorClock as VectorClock,
      lamportClock: event.lamportClock.toString(),
      checksum: event.checksum,
      priority: event.priority,
      metadata: event.metadata
    }))
  }

  /**
   * Update node last seen timestamp
   */
  async updateNodeLastSeen(nodeId: string): Promise<void> {
    try {
      await this.prisma.syncNodes.update({
        where: { nodeId },
        data: { lastSeen: new Date() }
      })
    } catch (error) {
      console.warn(`Failed to update last seen for node ${nodeId}:`, error)
    }
  }

  /**
   * Get active peer nodes
   */
  async getActivePeers(): Promise<Array<{
    nodeId: string
    nodeName: string
    ipAddress: string
    port: number
    lastSeen: Date
  }>> {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)

    const peers = await this.prisma.syncNodes.findMany({
      where: {
        isActive: true,
        nodeId: { not: this.nodeId },
        lastSeen: { gte: fiveMinutesAgo }
      },
      select: {
        nodeId: true,
        nodeName: true,
        ipAddress: true,
        port: true,
        lastSeen: true
      }
    })

    return peers.map(p => ({
      nodeId: p.nodeId,
      nodeName: p.nodeName,
      ipAddress: p.ipAddress || '0.0.0.0',
      port: p.port || 0,
      lastSeen: p.lastSeen
    }))
  }

  /**
   * Record sync metrics
   */
  async recordMetrics(metrics: {
    eventsGenerated?: number
    eventsReceived?: number
    eventsProcessed?: number
    eventsFailed?: number
    conflictsDetected?: number
    conflictsResolved?: number
    syncLatencyMs?: number
    networkLatencyMs?: number
    dataTransferredBytes?: bigint
    peersConnected?: number
    peersDiscovered?: number
  }): Promise<void> {
    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      await this.prisma.syncMetrics.upsert({
        where: {
          nodeId_metricDate: {
            nodeId: this.nodeId,
            metricDate: today
          }
        },
        update: {
          eventsGenerated: { increment: metrics.eventsGenerated || 0 },
          eventsReceived: { increment: metrics.eventsReceived || 0 },
          eventsProcessed: { increment: metrics.eventsProcessed || 0 },
          eventsFailed: { increment: metrics.eventsFailed || 0 },
          conflictsDetected: { increment: metrics.conflictsDetected || 0 },
          conflictsResolved: { increment: metrics.conflictsResolved || 0 },
          syncLatencyMs: metrics.syncLatencyMs,
          networkLatencyMs: metrics.networkLatencyMs,
          dataTransferredBytes: metrics.dataTransferredBytes
            ? { increment: metrics.dataTransferredBytes }
            : undefined,
          peersConnected: metrics.peersConnected,
          peersDiscovered: metrics.peersDiscovered
        },
        create: {
          id: crypto.randomUUID(),
          nodeId: this.nodeId,
          metricDate: today,
          eventsGenerated: metrics.eventsGenerated || 0,
          eventsReceived: metrics.eventsReceived || 0,
          eventsProcessed: metrics.eventsProcessed || 0,
          eventsFailed: metrics.eventsFailed || 0,
          conflictsDetected: metrics.conflictsDetected || 0,
          conflictsResolved: metrics.conflictsResolved || 0,
          syncLatencyMs: metrics.syncLatencyMs,
          networkLatencyMs: metrics.networkLatencyMs,
          dataTransferredBytes: metrics.dataTransferredBytes ? metrics.dataTransferredBytes : BigInt(0),
          peersConnected: metrics.peersConnected || 0,
          peersDiscovered: metrics.peersDiscovered || 0
        }
      })
    } catch (error) {
      console.warn('Failed to record sync metrics:', error)
    }
  }

  /**
   * Reset sync state for recovery scenarios
   */
  async resetSyncState(): Promise<void> {
    try {
      // Clear all unprocessed sync events
      await this.prisma.syncEvents.deleteMany({
        where: {
          processed: false
        }
      })

      // Reset conflict resolutions (delete all - fields vary between deployments)
      await this.prisma.conflictResolutions.deleteMany({})

      // Clear sync metrics for current node
      await this.prisma.syncMetrics.deleteMany({
        where: {
          nodeId: this.nodeId
        }
      })

      console.log('Sync state reset completed')
    } catch (error) {
      console.error('Failed to reset sync state:', error)
      throw error
    }
  }
}