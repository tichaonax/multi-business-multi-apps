/**
 * Database Hooks for Automatic Change Tracking
 * Integrates with Prisma middleware to automatically capture all database changes
 */

import { PrismaClient } from '@prisma/client'
import { getChangeTracker } from './change-tracker'
import crypto from 'crypto'

export interface SyncMiddlewareOptions {
  nodeId: string
  registrationKey: string
  enabled?: boolean
}

/**
 * Install Prisma middleware for automatic change tracking
 */
export function installSyncMiddleware(
  prisma: PrismaClient,
  options: SyncMiddlewareOptions
): void {
  // Guard: some generated Prisma clients / runtimes may not expose $use (middleware)
  // If $use is not available, don't attempt to install middleware to avoid runtime errors.
  if (typeof (prisma as any).$use !== 'function') {
    console.warn('⚠️ Prisma client does not expose $use(); sync middleware will be disabled.')
    return
  }
  const changeTracker = getChangeTracker(prisma, options.nodeId, options.registrationKey)

  prisma.$use(async (params, next) => {
    // Skip if sync is disabled
    if (options.enabled === false) {
      return next(params)
    }

    const { model, action } = params

    // Skip system and sync tables
    const excludedModels = [
      'Account', 'Session', 'VerificationToken', 'AuditLog',
      'SyncNode', 'SyncEvent', 'ConflictResolution', 'SyncSession',
      'NetworkPartition', 'SyncMetrics', 'SyncConfiguration'
    ]

    if (!model || excludedModels.includes(model)) {
      return next(params)
    }

    // Handle different operations
    switch (action) {
      case 'create':
        return handleCreate(params, next, changeTracker, model, prisma)

      case 'update':
        return handleUpdate(params, next, changeTracker, model, prisma)

      case 'upsert':
        return handleUpsert(params, next, changeTracker, model, prisma)

      case 'delete':
        return handleDelete(params, next, changeTracker, model, prisma)

      case 'createMany':
        return handleCreateMany(params, next, changeTracker, model, prisma)

      case 'updateMany':
        return handleUpdateMany(params, next, changeTracker, model, prisma)

      case 'deleteMany':
        return handleDeleteMany(params, next, changeTracker, model, prisma)

      default:
        return next(params)
    }
  })
}

/**
 * Handle CREATE operations
 */
async function handleCreate(
  params: any,
  next: any,
  changeTracker: any,
  model: string,
  prisma: PrismaClient
) {
  const result = await next(params)

  try {
    if (result && result.id) {
      await changeTracker.trackCreate(
        model.toLowerCase(),
        result.id,
        result,
        getPriority(model, 'create')
      )
    }
  } catch (error) {
    console.error(`Failed to track CREATE for ${model}:`, error)
  }

  return result
}

/**
 * Handle UPDATE operations
 */
async function handleUpdate(
  params: any,
  next: any,
  changeTracker: any,
  model: string,
  prisma: PrismaClient
) {
  // Get the record before update
  let beforeData = null
  try {
    if (params.where) {
      beforeData = await prisma[model.toLowerCase()].findUnique({
        where: params.where
      })
    }
  } catch (error) {
    console.warn(`Failed to fetch before data for ${model}:`, error)
  }

  const result = await next(params)

  try {
    if (result && result.id) {
      await changeTracker.trackUpdate(
        model.toLowerCase(),
        result.id,
        result,
        beforeData,
        getPriority(model, 'update')
      )
    }
  } catch (error) {
    console.error(`Failed to track UPDATE for ${model}:`, error)
  }

  return result
}

/**
 * Handle UPSERT operations
 */
async function handleUpsert(
  params: any,
  next: any,
  changeTracker: any,
  model: string,
  prisma: PrismaClient
) {
  // Check if record exists before upsert
  let existingRecord = null
  try {
    if (params.where) {
      existingRecord = await prisma[model.toLowerCase()].findUnique({
        where: params.where
      })
    }
  } catch (error) {
    console.warn(`Failed to check existing record for ${model}:`, error)
  }

  const result = await next(params)

  try {
    if (result && result.id) {
      if (existingRecord) {
        // This was an update
        await changeTracker.trackUpdate(
          model.toLowerCase(),
          result.id,
          result,
          existingRecord,
          getPriority(model, 'update')
        )
      } else {
        // This was a create
        await changeTracker.trackCreate(
          model.toLowerCase(),
          result.id,
          result,
          getPriority(model, 'create')
        )
      }
    }
  } catch (error) {
    console.error(`Failed to track UPSERT for ${model}:`, error)
  }

  return result
}

/**
 * Handle DELETE operations
 */
async function handleDelete(
  params: any,
  next: any,
  changeTracker: any,
  model: string,
  prisma: PrismaClient
) {
  // Get the record before deletion
  let beforeData = null
  try {
    if (params.where) {
      beforeData = await prisma[model.toLowerCase()].findUnique({
        where: params.where
      })
    }
  } catch (error) {
    console.warn(`Failed to fetch before data for ${model}:`, error)
  }

  const result = await next(params)

  try {
    if (beforeData && beforeData.id) {
      await changeTracker.trackDelete(
        model.toLowerCase(),
        beforeData.id,
        beforeData,
        getPriority(model, 'delete')
      )
    }
  } catch (error) {
    console.error(`Failed to track DELETE for ${model}:`, error)
  }

  return result
}

/**
 * Handle CREATE MANY operations
 */
async function handleCreateMany(
  params: any,
  next: any,
  changeTracker: any,
  model: string,
  prisma: PrismaClient
) {
  const result = await next(params)

  try {
    if (params.data && Array.isArray(params.data)) {
      // For createMany, we need to track each record individually
      // Since createMany doesn't return the created records with IDs,
      // we need to find them after creation
      const priority = getPriority(model, 'create')

      for (const data of params.data) {
        // Generate a temporary ID for tracking
        const tempId = crypto.randomUUID()
        await changeTracker.trackCreate(
          model.toLowerCase(),
          tempId,
          data,
          priority
        )
      }
    }
  } catch (error) {
    console.error(`Failed to track CREATE_MANY for ${model}:`, error)
  }

  return result
}

/**
 * Handle UPDATE MANY operations
 */
async function handleUpdateMany(
  params: any,
  next: any,
  changeTracker: any,
  model: string,
  prisma: PrismaClient
) {
  // Get affected records before update
  let affectedRecords = []
  try {
    if (params.where) {
      affectedRecords = await prisma[model.toLowerCase()].findMany({
        where: params.where
      })
    }
  } catch (error) {
    console.warn(`Failed to fetch affected records for ${model}:`, error)
  }

  const result = await next(params)

  try {
    const priority = getPriority(model, 'update')

    for (const record of affectedRecords) {
      // Create updated record data by merging
      const updatedData = { ...record, ...params.data }

      await changeTracker.trackUpdate(
        model.toLowerCase(),
        record.id,
        updatedData,
        record,
        priority
      )
    }
  } catch (error) {
    console.error(`Failed to track UPDATE_MANY for ${model}:`, error)
  }

  return result
}

/**
 * Handle DELETE MANY operations
 */
async function handleDeleteMany(
  params: any,
  next: any,
  changeTracker: any,
  model: string,
  prisma: PrismaClient
) {
  // Get affected records before deletion
  let affectedRecords = []
  try {
    if (params.where) {
      affectedRecords = await prisma[model.toLowerCase()].findMany({
        where: params.where
      })
    }
  } catch (error) {
    console.warn(`Failed to fetch affected records for ${model}:`, error)
  }

  const result = await next(params)

  try {
    const priority = getPriority(model, 'delete')

    for (const record of affectedRecords) {
      await changeTracker.trackDelete(
        model.toLowerCase(),
        record.id,
        record,
        priority
      )
    }
  } catch (error) {
    console.error(`Failed to track DELETE_MANY for ${model}:`, error)
  }

  return result
}

/**
 * Get sync priority based on model and operation
 */
function getPriority(model: string, operation: string): number {
  // Critical business data gets higher priority
  const highPriorityModels = [
    'User', 'Business', 'Employee', 'BusinessOrder', 'PersonalExpense'
  ]

  const mediumPriorityModels = [
    'BusinessProduct', 'BusinessCustomer', 'Vehicle', 'ProjectTransaction'
  ]

  // Delete operations get higher priority to maintain consistency
  if (operation === 'delete') {
    return highPriorityModels.includes(model) ? 9 : 7
  }

  // Create operations for critical models
  if (operation === 'create' && highPriorityModels.includes(model)) {
    return 8
  }

  // Update operations for critical models
  if (operation === 'update' && highPriorityModels.includes(model)) {
    return 7
  }

  // Medium priority models
  if (mediumPriorityModels.includes(model)) {
    return operation === 'delete' ? 6 : 5
  }

  // Default priority
  return 4
}

/**
 * Initialize sync system on application startup
 */
export async function initializeSyncSystem(
  prisma: PrismaClient,
  options: SyncMiddlewareOptions & {
    nodeName: string
    ipAddress: string
    port?: number
  }
): Promise<void> {
  try {
    // Install the middleware
    installSyncMiddleware(prisma, options)

    // Initialize the change tracker
    const changeTracker = getChangeTracker(prisma, options.nodeId, options.registrationKey)

    // Initialize the node registration
    await changeTracker.initializeNode(
      options.nodeName,
      options.ipAddress,
  options.port || 8765
    )

    console.log(`✅ Sync system initialized for node: ${options.nodeId}`)
  } catch (error) {
    console.error('❌ Failed to initialize sync system:', error)
    throw error
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
  return crypto.createHash('sha256')
    .update(macAddress)
    .digest('hex')
    .substring(0, 16)
}