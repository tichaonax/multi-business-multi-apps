/**
 * Sync Helper for Manual Change Tracking
 * Since Prisma 6.x removed $use middleware, we need to manually track changes
 */

import { PrismaClient } from '@prisma/client'
import { createHash, randomUUID } from 'crypto'

export interface SyncHelperOptions {
  nodeId: string
  registrationKey: string
  enabled?: boolean
}

export class SyncHelper {
  private prisma: PrismaClient
  private nodeId: string
  private registrationKey: string
  private enabled: boolean

  constructor(prisma: PrismaClient, options: SyncHelperOptions) {
    this.prisma = prisma
    this.nodeId = options.nodeId
    this.registrationKey = options.registrationKey
    this.enabled = options.enabled !== false
  }

  /**
   * Track a create operation
   */
  async trackCreate(tableName: string, recordId: string, data: any): Promise<void> {
    if (!this.enabled) return

    try {
      await this.createSyncEvent({
        tableName,
        recordId,
        operation: 'CREATE',
        changeData: data,
        beforeData: null
      })
    } catch (error) {
      console.error(`Failed to track CREATE for ${tableName}:`, error)
    }
  }

  /**
   * Track an update operation
   */
  async trackUpdate(tableName: string, recordId: string, newData: any, oldData: any): Promise<void> {
    if (!this.enabled) return

    try {
      await this.createSyncEvent({
        tableName,
        recordId,
        operation: 'UPDATE',
        changeData: newData,
        beforeData: oldData
      })
    } catch (error) {
      console.error(`Failed to track UPDATE for ${tableName}:`, error)
    }
  }

  /**
   * Track a delete operation
   */
  async trackDelete(tableName: string, recordId: string, data: any): Promise<void> {
    if (!this.enabled) return

    try {
      await this.createSyncEvent({
        tableName,
        recordId,
        operation: 'DELETE',
        changeData: null,
        beforeData: data
      })
    } catch (error) {
      console.error(`Failed to track DELETE for ${tableName}:`, error)
    }
  }

  /**
   * Create a sync event
   */
  private async createSyncEvent(event: {
    tableName: string
    recordId: string
    operation: 'CREATE' | 'UPDATE' | 'DELETE'
    changeData: any
    beforeData: any
  }): Promise<void> {
    const eventId = randomUUID()
    const checksum = this.generateChecksum(event.changeData || event.beforeData)

    await this.prisma.syncEvents.create({
      data: {
        eventId,
        sourceNodeId: this.nodeId,
        tableName: event.tableName,
        recordId: event.recordId,
        operation: event.operation,
        changeData: event.changeData || {},
        beforeData: event.beforeData,
        checksum,
        priority: this.getPriority(event.tableName, event.operation),
        processed: false,
        retryCount: 0,
        createdAt: new Date()
      }
    })

    console.log(`✅ Sync event created: ${event.operation} on ${event.tableName} (${event.recordId})`)
  }

  /**
   * Generate checksum for data integrity
   */
  private generateChecksum(data: any): string {
    if (!data) return ''
    const dataString = JSON.stringify(data, Object.keys(data).sort())
    return createHash('sha256').update(dataString).digest('hex')
  }

  /**
   * Get sync priority based on table and operation
   */
  private getPriority(tableName: string, operation: string): number {
    // Critical business data gets higher priority
    const highPriorityTables = [
      'users', 'businesses', 'employees', 'business_orders', 'personal_expenses'
    ]

    const mediumPriorityTables = [
      'business_products', 'business_customers', 'vehicles', 'project_transactions'
    ]

    // Delete operations get higher priority to maintain consistency
    if (operation === 'DELETE') {
      return highPriorityTables.includes(tableName) ? 9 : 7
    }

    // Create operations for critical tables
    if (operation === 'CREATE' && highPriorityTables.includes(tableName)) {
      return 8
    }

    // Update operations for critical tables
    if (operation === 'UPDATE' && highPriorityTables.includes(tableName)) {
      return 7
    }

    // Medium priority tables
    if (mediumPriorityTables.includes(tableName)) {
      return operation === 'DELETE' ? 6 : 5
    }

    // Default priority
    return 4
  }
}

/**
 * Generate unique node ID based on machine characteristics
 */
export function generateNodeId(): string {
  const { networkInterfaces } = require('os')
  const interfaces = networkInterfaces()

  // Use MAC address as base for node ID
  let macAddress = ''
  for (const [name, nets] of Object.entries(interfaces)) {
    if (nets && Array.isArray(nets)) {
      for (const net of nets) {
        if (net.mac && net.mac !== '00:00:00:00:00:00') {
          macAddress = net.mac
          break
        }
      }
    }
    if (macAddress) break
  }

  if (!macAddress) {
    // Fallback to hostname + random
    const hostname = require('os').hostname()
    macAddress = hostname + '-' + Math.random().toString(36).substring(2, 15)
  }

  // Create deterministic node ID
  return createHash('sha256')
    .update(macAddress)
    .digest('hex')
    .substring(0, 16)
}

/**
 * Create a Prisma client with sync helper attached
 */
export function createSyncPrismaClient(options: SyncHelperOptions): PrismaClient & { syncHelper: SyncHelper } {
  const client = new PrismaClient()
  const syncHelper = new SyncHelper(client, options)
  
  // Attach sync helper to client
  ;(client as any).syncHelper = syncHelper
  
  return client as PrismaClient & { syncHelper: SyncHelper }
}