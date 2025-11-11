/**
 * Prisma Extension for Automatic Change Tracking
 * Uses Prisma 6.x Client Extensions to automatically track all database changes
 */

import { Prisma } from '@prisma/client'
import { SyncHelper } from './sync-helper'

// Tables to exclude from sync tracking (sync infrastructure only)
// NOTE: Users and Accounts ARE synced for authentication across servers
const EXCLUDED_TABLES = new Set([
  'Session',
  'Sessions',  // Ephemeral sessions - users re-login on new server
  'VerificationToken',
  'VerificationTokens',  // Email verification tokens - server-specific
  'AuditLog',
  'AuditLogs',  // Audit logs - can be server-specific
  'SyncNode',
  'SyncNodes',  // Sync infrastructure
  'SyncEvent',
  'SyncEvents',  // Sync infrastructure
  'ConflictResolution',
  'ConflictResolutions',  // Sync infrastructure
  'SyncSession',
  'SyncSessions',  // Sync infrastructure
  'NetworkPartition',
  'NetworkPartitions',  // Sync infrastructure
  'SyncMetric',
  'SyncMetrics',  // Sync infrastructure
  'SyncConfiguration',
  'SyncConfigurations',  // Sync infrastructure
  'InitialLoadSession',
  'InitialLoadSessions'  // Sync infrastructure
])

/**
 * Create Prisma extension for automatic sync tracking
 */
export function createSyncExtension(syncHelper: SyncHelper) {
  return Prisma.defineExtension((client) => {
    return client.$extends({
      name: 'syncTracking',
      query: {
        $allModels: {
          // Track CREATE operations
          async create({ model, operation, args, query }) {
            // Execute the operation first
            const result = await query(args)

            // Track the change if not excluded
            if (!EXCLUDED_TABLES.has(model)) {
              try {
                const recordId = String((result as any)?.id || 'unknown')
                await syncHelper.trackCreate(
                  model.toLowerCase(),
                  recordId,
                  result
                )
              } catch (error) {
                console.error(`Failed to track ${operation} on ${model}:`, error)
              }
            }

            return result
          },

          // Track UPDATE operations
          async update({ model, operation, args, query }) {
            // Get old data before update
            let oldData = null
            if (!EXCLUDED_TABLES.has(model) && args.where) {
              try {
                oldData = await (client as any)[model].findUnique({
                  where: args.where
                })
              } catch (error) {
                console.warn(`Could not fetch old data for ${model}:`, error)
              }
            }

            // Execute the operation
            const result = await query(args)

            // Track the change if not excluded
            if (!EXCLUDED_TABLES.has(model) && oldData) {
              try {
                const recordId = String((result as any)?.id || (args.where as any)?.id || 'unknown')
                await syncHelper.trackUpdate(
                  model.toLowerCase(),
                  recordId,
                  result,
                  oldData
                )
              } catch (error) {
                console.error(`Failed to track ${operation} on ${model}:`, error)
              }
            }

            return result
          },

          // Track DELETE operations
          async delete({ model, operation, args, query }) {
            // Get data before delete
            let oldData = null
            if (!EXCLUDED_TABLES.has(model) && args.where) {
              try {
                oldData = await (client as any)[model].findUnique({
                  where: args.where
                })
              } catch (error) {
                console.warn(`Could not fetch data before delete for ${model}:`, error)
              }
            }

            // Execute the operation
            const result = await query(args)

            // Track the change if not excluded
            if (!EXCLUDED_TABLES.has(model) && oldData) {
              try {
                const recordId = String((oldData as any)?.id || (args.where as any)?.id || 'unknown')
                await syncHelper.trackDelete(
                  model.toLowerCase(),
                  recordId,
                  oldData
                )
              } catch (error) {
                console.error(`Failed to track ${operation} on ${model}:`, error)
              }
            }

            return result
          },

          // Track UPSERT operations (treat as CREATE or UPDATE)
          async upsert({ model, operation, args, query }) {
            // Check if record exists
            let oldData = null
            let isUpdate = false
            if (!EXCLUDED_TABLES.has(model) && args.where) {
              try {
                oldData = await (client as any)[model].findUnique({
                  where: args.where
                })
                isUpdate = !!oldData
              } catch (error) {
                console.warn(`Could not check existence for ${model}:`, error)
              }
            }

            // Execute the operation
            const result = await query(args)

            // Track the change if not excluded
            if (!EXCLUDED_TABLES.has(model)) {
              try {
                const recordId = String((result as any)?.id || 'unknown')

                if (isUpdate) {
                  await syncHelper.trackUpdate(
                    model.toLowerCase(),
                    recordId,
                    result,
                    oldData
                  )
                } else {
                  await syncHelper.trackCreate(
                    model.toLowerCase(),
                    recordId,
                    result
                  )
                }
              } catch (error) {
                console.error(`Failed to track ${operation} on ${model}:`, error)
              }
            }

            return result
          },

          // Track UPDATE MANY operations (less granular but important)
          async updateMany({ model, operation, args, query }) {
            // For updateMany, we can't track individual records efficiently
            // So we'll skip tracking to avoid performance issues
            // Alternative: Could fetch all matching records first, but expensive

            const result = await query(args)

            // Log that changes occurred but weren't tracked individually
            if (!EXCLUDED_TABLES.has(model) && result.count > 0) {
              console.log(`⚠️  ${result.count} records updated in ${model} (bulk operation - not tracked individually)`)
            }

            return result
          },

          // Track DELETE MANY operations
          async deleteMany({ model, operation, args, query }) {
            // For deleteMany, we can't track individual records efficiently
            const result = await query(args)

            // Log that changes occurred but weren't tracked individually
            if (!EXCLUDED_TABLES.has(model) && result.count > 0) {
              console.log(`⚠️  ${result.count} records deleted from ${model} (bulk operation - not tracked individually)`)
            }

            return result
          }
        }
      }
    })
  })
}
