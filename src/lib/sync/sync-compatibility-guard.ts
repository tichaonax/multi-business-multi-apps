/**
 * Sync Compatibility Guard
 * Ensures sync operations only occur between nodes with compatible database schemas
 * Prevents data corruption from schema mismatches
 */

import { SchemaVersionManager } from './schema-version-manager'

// Normalize remote node objects from either snake_case (DB/raw) or camelCase (Prisma)
function getField(obj: any, ...keys: string[]) {
  if (!obj || typeof obj !== 'object') return undefined
  for (const k of keys) {
    if (Object.prototype.hasOwnProperty.call(obj, k) && obj[k] !== undefined) return obj[k]
  }
  return undefined
}

function normalizeRemoteNode(remoteNode: any) {
  if (!remoteNode || typeof remoteNode !== 'object') return {
    nodeId: 'unknown', nodeName: 'unknown', schemaVersion: 'unknown'
  }

  return {
    nodeId: String(getField(remoteNode, 'nodeId') || 'unknown'),
    nodeName: String(getField(remoteNode, 'nodeName') || 'unknown'),
    schemaVersion: String(getField(remoteNode, 'schemaVersion') || 'unknown'),
    schemaHash: getField(remoteNode, 'schemaHash'),
    migrationName: getField(remoteNode, 'migrationName'),
    schemaAppliedAt: getField(remoteNode, 'schemaAppliedAt'),
    schemaCompatible: ((): boolean => {
      const v = getField(remoteNode, 'schemaCompatible')
      return v !== undefined ? Boolean(v) : true
    })()
  }
}

export interface SyncAttempt {
  remoteNode: any
  timestamp: Date
  allowed: boolean
  reason?: string
  localVersion?: string
  remoteVersion?: string
}

/**
 * Sync Compatibility Guard
 * Guards against sync attempts between incompatible schema versions
 */
export class SyncCompatibilityGuard {
  private schemaVersionManager: SchemaVersionManager
  private recentAttempts: SyncAttempt[] = []
  private maxAttemptHistory = 100

  constructor(schemaVersionManager: SchemaVersionManager) {
    this.schemaVersionManager = schemaVersionManager
  }

  /**
   * Check if sync is allowed with a remote node
   */
  async isSyncAllowed(remoteNode: any): Promise<{
    allowed: boolean
    reason?: string
    compatibilityCheck?: any
  }> {
    try {
      // Normalize remote node fields so callers can pass either snake_case or camelCase
      const normalized = normalizeRemoteNode(remoteNode)

      // Check schema compatibility
      const compatibilityCheck = await this.schemaVersionManager.checkCompatibility(normalized)

      const attempt: SyncAttempt = {
        remoteNode: {
          nodeId: normalized.nodeId,
          nodeName: normalized.nodeName,
          schemaVersion: normalized.schemaVersion
        },
        timestamp: new Date(),
        allowed: compatibilityCheck.isCompatible,
        reason: compatibilityCheck.reason,
        localVersion: compatibilityCheck.localVersion?.version,
        remoteVersion: compatibilityCheck.remoteVersion?.version
      }

      // Record attempt
      this.recordAttempt(attempt)

      if (!compatibilityCheck.isCompatible) {
    const reason = compatibilityCheck.reason || 'Schema versions are incompatible'
  console.warn(`🚫 Sync blocked with ${normalized.nodeName}: ${reason}`)

        return {
          allowed: false,
          reason,
          compatibilityCheck
        }
      }

      // Log compatible sync
      const level = compatibilityCheck.compatibilityLevel
  console.log(`✅ Sync allowed with ${normalized.nodeName} (${level})`)

      return {
        allowed: true,
        compatibilityCheck
      }

    } catch (error) {
      console.error('Failed to check sync compatibility:', error)

      // Record failed attempt
        const normalized = normalizeRemoteNode(remoteNode)

        const attempt: SyncAttempt = {
          remoteNode: {
            nodeId: normalized.nodeId,
            nodeName: normalized.nodeName,
            schemaVersion: 'unknown'
          },
          timestamp: new Date(),
          allowed: false,
          reason: `Compatibility check failed: ${error instanceof Error ? error.message : String(error)}`
        }

      this.recordAttempt(attempt)

      return {
        allowed: false,
        reason: 'Failed to verify schema compatibility'
      }
    }
  }

  /**
   * Get sync attempt history
   */
  getSyncAttemptHistory(): SyncAttempt[] {
    return [...this.recentAttempts].reverse() // Most recent first
  }

  /**
   * Get sync attempt statistics
   */
  getSyncAttemptStats(): {
    totalAttempts: number
    allowedAttempts: number
    blockedAttempts: number
    successRate: number
    recentBlocks: SyncAttempt[]
  } {
    const totalAttempts = this.recentAttempts.length
    const allowedAttempts = this.recentAttempts.filter(a => a.allowed).length
    const blockedAttempts = totalAttempts - allowedAttempts
    const successRate = totalAttempts > 0 ? (allowedAttempts / totalAttempts) * 100 : 0

    // Get recent blocked attempts (last 10)
    const recentBlocks = this.recentAttempts
      .filter(a => !a.allowed)
      .slice(-10)
      .reverse()

    return {
      totalAttempts,
      allowedAttempts,
      blockedAttempts,
      successRate,
      recentBlocks
    }
  }

  /**
   * Clear sync attempt history
   */
  clearAttemptHistory(): void {
    this.recentAttempts = []
  }

  /**
   * Get compatibility issues summary
   */
  getCompatibilityIssuesSummary(): {
    incompatibleNodes: Array<{
      nodeId: string
      nodeName: string
      lastAttempt: Date
      reason: string
      localVersion?: string
      remoteVersion?: string
    }>
    commonIssues: Array<{
      reason: string
      count: number
      affectedNodes: string[]
    }>
  } {
    // Get all blocked attempts
    const blockedAttempts = this.recentAttempts.filter(a => !a.allowed)

    // Group by node
    const nodeIssues = new Map<string, SyncAttempt[]>()
    blockedAttempts.forEach(attempt => {
      const nodeId = attempt.remoteNode.nodeId
      if (!nodeIssues.has(nodeId)) {
        nodeIssues.set(nodeId, [])
      }
      nodeIssues.get(nodeId)!.push(attempt)
    })

    // Get incompatible nodes (most recent attempt per node)
    const incompatibleNodes = Array.from(nodeIssues.entries()).map(([nodeId, attempts]) => {
      const latestAttempt = attempts[attempts.length - 1] // Most recent
      return {
        nodeId,
        nodeName: latestAttempt.remoteNode.nodeName,
        lastAttempt: latestAttempt.timestamp,
        reason: latestAttempt.reason || 'Unknown compatibility issue',
        localVersion: latestAttempt.localVersion,
        remoteVersion: latestAttempt.remoteVersion
      }
    })

    // Group by reason to find common issues
    const reasonCounts = new Map<string, { count: number; nodes: Set<string> }>()
    blockedAttempts.forEach(attempt => {
      const reason = attempt.reason || 'Unknown'
      if (!reasonCounts.has(reason)) {
        reasonCounts.set(reason, { count: 0, nodes: new Set() })
      }
      const entry = reasonCounts.get(reason)!
      entry.count++
      entry.nodes.add(attempt.remoteNode.nodeId)
    })

    const commonIssues = Array.from(reasonCounts.entries())
      .map(([reason, data]) => ({
        reason,
        count: data.count,
        affectedNodes: Array.from(data.nodes)
      }))
      .sort((a, b) => b.count - a.count) // Most common issues first

    return {
      incompatibleNodes,
      commonIssues
    }
  }

  /**
   * Record a sync attempt
   */
  private recordAttempt(attempt: SyncAttempt): void {
    this.recentAttempts.push(attempt)

    // Keep only recent attempts
    if (this.recentAttempts.length > this.maxAttemptHistory) {
      this.recentAttempts.shift()
    }
  }
}

/**
 * Create sync compatibility guard instance
 */
export function createSyncCompatibilityGuard(schemaVersionManager: SchemaVersionManager): SyncCompatibilityGuard {
  return new SyncCompatibilityGuard(schemaVersionManager)
}