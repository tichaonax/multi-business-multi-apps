/**
 * Offline Queue Manager
 * Manages database changes while offline and synchronizes when online
 */

import { EventEmitter } from 'events'
import { PrismaClient, SyncOperation } from '@prisma/client'
import { ChangeEvent, VectorClock } from './change-tracker'
import crypto from 'crypto'

export interface OfflineQueueItem {
  id: string
  eventId: string
  tableName: string
  recordId: string
  operation: SyncOperation
  changeData: any
  beforeData?: any
  queuedAt: Date
  priority: number
  retryCount: number
  lastAttempt?: Date
  errorMessage?: string
  dependencies: string[] // IDs of events this depends on
  isProcessed: boolean
}

export interface OfflineQueueStats {
  totalItems: number
  pendingItems: number
  processedItems: number
  failedItems: number
  oldestItem: Date | null
  queueSizeBytes: number
}

/**
 * Offline Queue Manager
 * Handles queuing and processing of changes while offline
 */
export class OfflineQueueManager extends EventEmitter {
  private prisma: PrismaClient
  private nodeId: string
  private isOnline = true
  private isProcessing = false
  private queue: Map<string, OfflineQueueItem> = new Map()
  private processTimer: NodeJS.Timeout | null = null
  private maxQueueSize = 10000 // Maximum number of queued items
  private maxRetries = 3
  private processBatchSize = 50

  constructor(prisma: PrismaClient, nodeId: string) {
    super()
    this.prisma = prisma
    this.nodeId = nodeId
  }

  /**
   * Start the offline queue manager
   */
  async start(): Promise<void> {
    await this.loadQueueFromDatabase()
    this.startProcessing()
    this.emit('started')
  }

  /**
   * Stop the offline queue manager
   */
  async stop(): Promise<void> {
    if (this.processTimer) {
      clearInterval(this.processTimer)
      this.processTimer = null
    }
    await this.saveQueueToDatabase()
    this.emit('stopped')
  }

  /**
   * Set online/offline status
   */
  setOnlineStatus(isOnline: boolean): void {
    const wasOnline = this.isOnline
    this.isOnline = isOnline

    if (!wasOnline && isOnline) {
      // Coming online - start processing queue
      this.emit('online')
      this.processQueue()
    } else if (wasOnline && !isOnline) {
      // Going offline
      this.emit('offline')
    }
  }

  /**
   * Add item to offline queue
   */
  async addToQueue(event: ChangeEvent): Promise<void> {
    if (this.queue.size >= this.maxQueueSize) {
      // Remove oldest processed items to make space
      await this.cleanupProcessedItems()

      if (this.queue.size >= this.maxQueueSize) {
        throw new Error('Offline queue is full')
      }
    }

    const queueItem: OfflineQueueItem = {
      id: crypto.randomUUID(),
      eventId: event.eventId,
      tableName: event.tableName,
      recordId: event.recordId,
      operation: event.operation,
      changeData: event.changeData,
      beforeData: event.beforeData,
      queuedAt: new Date(),
      priority: event.priority,
      retryCount: 0,
      dependencies: this.calculateDependencies(event),
      isProcessed: false
    }

    this.queue.set(queueItem.id, queueItem)

    // Persist to database immediately
    await this.persistQueueItem(queueItem)

    this.emit('item_queued', queueItem)

    // If online, try to process immediately
    if (this.isOnline && !this.isProcessing) {
      setImmediate(() => this.processQueue())
    }
  }

  /**
   * Get queue statistics
   */
  getQueueStats(): OfflineQueueStats {
    const items = Array.from(this.queue.values())
    const pendingItems = items.filter(item => !item.isProcessed && item.retryCount < this.maxRetries)
    const processedItems = items.filter(item => item.isProcessed)
    const failedItems = items.filter(item => !item.isProcessed && item.retryCount >= this.maxRetries)

    const oldestItem = items.length > 0
      ? new Date(Math.min(...items.map(item => item.queuedAt.getTime())))
      : null

    const queueSizeBytes = this.calculateQueueSizeBytes()

    return {
      totalItems: items.length,
      pendingItems: pendingItems.length,
      processedItems: processedItems.length,
      failedItems: failedItems.length,
      oldestItem,
      queueSizeBytes
    }
  }

  /**
   * Force process queue
   */
  async forceProcessQueue(): Promise<void> {
    if (!this.isProcessing) {
      await this.processQueue()
    }
  }

  /**
   * Clear processed items from queue
   */
  async clearProcessedItems(): Promise<number> {
    const processedCount = await this.cleanupProcessedItems()
    await this.saveQueueToDatabase()
    return processedCount
  }

  /**
   * Start processing queue periodically
   */
  private startProcessing(): void {
    // Process queue every 30 seconds
    this.processTimer = setInterval(async () => {
      if (this.isOnline && !this.isProcessing) {
        await this.processQueue()
      }
    }, 30000)
  }

  /**
   * Process items in the queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || !this.isOnline) {
      return
    }

    this.isProcessing = true
    this.emit('processing_started')

    try {
      const pendingItems = Array.from(this.queue.values())
        .filter(item => !item.isProcessed && item.retryCount < this.maxRetries)
        .sort((a, b) => {
          // Sort by priority (higher first), then by queued time
          if (a.priority !== b.priority) {
            return b.priority - a.priority
          }
          return a.queuedAt.getTime() - b.queuedAt.getTime()
        })

      let processedCount = 0
      let failedCount = 0

      // Process in batches
      for (let i = 0; i < pendingItems.length; i += this.processBatchSize) {
        const batch = pendingItems.slice(i, i + this.processBatchSize)

        for (const item of batch) {
          try {
            // Check dependencies are satisfied
            if (!this.areDependenciesSatisfied(item)) {
              continue // Skip this item for now
            }

            // Attempt to process the item
            const success = await this.processQueueItem(item)

            if (success) {
              item.isProcessed = true
              processedCount++
              this.emit('item_processed', item)
            } else {
              item.retryCount++
              item.lastAttempt = new Date()
              failedCount++
              this.emit('item_failed', item)
            }

            // Update in database
            await this.persistQueueItem(item)

          } catch (error) {
            item.retryCount++
            item.lastAttempt = new Date()
            item.errorMessage = error instanceof Error ? error.message : 'Unknown error'
            failedCount++

            await this.persistQueueItem(item)
            this.emit('item_error', { item, error })
          }
        }

        // Brief pause between batches to avoid overwhelming the system
        if (i + this.processBatchSize < pendingItems.length) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }

      this.emit('processing_completed', { processedCount, failedCount })

    } catch (error) {
      this.emit('processing_error', error)
    } finally {
      this.isProcessing = false
    }
  }

  /**
   * Process a single queue item
   */
  private async processQueueItem(item: OfflineQueueItem): Promise<boolean> {
    try {
      // Create sync event
      const event: ChangeEvent = {
        eventId: item.eventId,
        sourceNodeId: this.nodeId,
        tableName: item.tableName,
        recordId: item.recordId,
        operation: item.operation,
        changeData: item.changeData,
        beforeData: item.beforeData,
        vectorClock: {}, // Will be populated by change tracker
        lamportClock: BigInt(Date.now()).toString(),
        checksum: this.calculateChecksum(item.changeData),
        priority: item.priority,
        metadata: {
          queuedOffline: true,
          originalQueueTime: item.queuedAt.toISOString()
        }
      }

      // Submit to sync system
      const { getChangeTracker } = await import('./change-tracker')
      const changeTracker = getChangeTracker(this.prisma, this.nodeId, 'temp-key')

      await changeTracker.submitEvent(event)
      return true

    } catch (error) {
      console.error('Failed to process queue item:', error)
      return false
    }
  }

  /**
   * Calculate dependencies for an event
   */
  private calculateDependencies(event: ChangeEvent): string[] {
    const dependencies: string[] = []

    // For UPDATE and DELETE operations, they depend on CREATE
    if (event.operation === 'UPDATE' || event.operation === 'DELETE') {
      // Find any CREATE events for the same record in the queue
      for (const [id, item] of this.queue) {
        if (item.tableName === event.tableName &&
          item.recordId === event.recordId &&
          item.operation === 'CREATE' &&
          !item.isProcessed) {
          dependencies.push(id)
        }
      }
    }

    return dependencies
  }

  /**
   * Check if dependencies are satisfied
   */
  private areDependenciesSatisfied(item: OfflineQueueItem): boolean {
    for (const depId of item.dependencies) {
      const dependency = this.queue.get(depId)
      if (dependency && !dependency.isProcessed) {
        return false
      }
    }
    return true
  }

  /**
   * Calculate checksum for data
   */
  private calculateChecksum(data: any): string {
    const crypto = require('crypto')
    const dataString = JSON.stringify(data, Object.keys(data).sort())
    return crypto.createHash('sha256').update(dataString).digest('hex')
  }

  /**
   * Calculate queue size in bytes
   */
  private calculateQueueSizeBytes(): number {
    let totalSize = 0
    for (const item of this.queue.values()) {
      totalSize += JSON.stringify(item).length
    }
    return totalSize
  }

  /**
   * Clean up processed items
   */
  private async cleanupProcessedItems(): Promise<number> {
    const processedItems = Array.from(this.queue.entries())
      .filter(([id, item]) => item.isProcessed)

    let removedCount = 0

    // Keep recent processed items, remove older ones
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000) // 24 hours ago

    for (const [id, item] of processedItems) {
      if (item.queuedAt < cutoffTime) {
        this.queue.delete(id)
        await this.removeQueueItemFromDatabase(id)
        removedCount++
      }
    }

    return removedCount
  }

  /**
   * Load queue from database
   */
  private async loadQueueFromDatabase(): Promise<void> {
    try {
      const queueItems = await this.prisma.offlineQueue.findMany({
        where: { nodeId: this.nodeId },
        orderBy: { queuedAt: 'asc' }
      })

      for (const dbItem of queueItems) {
        const queueItem: OfflineQueueItem = {
          id: dbItem.id,
          eventId: dbItem.eventId,
          tableName: dbItem.tableName,
          recordId: dbItem.recordId,
          operation: dbItem.operation as any,
          changeData: dbItem.changeData,
          beforeData: dbItem.beforeData,
          queuedAt: dbItem.queuedAt,
          priority: dbItem.priority,
          retryCount: dbItem.retryCount,
          lastAttempt: dbItem.lastAttempt,
          errorMessage: dbItem.errorMessage,
          dependencies: (dbItem.dependencies as string[]) || [],
          isProcessed: dbItem.isProcessed
        }

        this.queue.set(queueItem.id, queueItem)
      }

      console.log(`📥 Loaded ${queueItems.length} items from offline queue`)
    } catch (error) {
      console.error('Failed to load offline queue from database:', error)
    }
  }

  /**
   * Save queue to database
   */
  private async saveQueueToDatabase(): Promise<void> {
    try {
      for (const item of this.queue.values()) {
        await this.persistQueueItem(item)
      }
    } catch (error) {
      console.error('Failed to save offline queue to database:', error)
    }
  }

  /**
   * Persist single queue item to database
   */
  private async persistQueueItem(item: OfflineQueueItem): Promise<void> {
    try {
      await this.prisma.offlineQueue.upsert({
        where: { id: item.id },
        update: {
          retryCount: item.retryCount,
          lastAttempt: item.lastAttempt,
          errorMessage: item.errorMessage,
          isProcessed: item.isProcessed
        },
        create: {
          id: item.id,
          nodeId: this.nodeId,
          eventId: item.eventId,
          tableName: item.tableName,
          recordId: item.recordId,
          operation: item.operation,
          changeData: item.changeData,
          beforeData: item.beforeData,
          queuedAt: item.queuedAt,
          priority: item.priority,
          retryCount: item.retryCount,
          lastAttempt: item.lastAttempt,
          errorMessage: item.errorMessage,
          dependencies: item.dependencies,
          isProcessed: item.isProcessed
        }
      })
    } catch (error) {
      console.error('Failed to persist queue item:', error)
    }
  }

  /**
   * Remove queue item from database
   */
  private async removeQueueItemFromDatabase(itemId: string): Promise<void> {
    try {
      await this.prisma.offlineQueue.delete({
        where: { id: itemId }
      })
    } catch (error) {
      console.error('Failed to remove queue item from database:', error)
    }
  }
}

/**
 * Create offline queue manager
 */
export function createOfflineQueueManager(prisma: PrismaClient, nodeId: string): OfflineQueueManager {
  return new OfflineQueueManager(prisma, nodeId)
}