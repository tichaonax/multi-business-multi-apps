/**
 * Database Schema Version Manager
 * Ensures sync nodes only communicate when they have compatible database schemas
 * Prevents data corruption from schema mismatches
 */

import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'

export interface SchemaVersion {
  version: string
  hash: string
  migrationName: string
  appliedAt: Date
  isCompatible: boolean
}

export interface SchemaCompatibilityCheck {
  isCompatible: boolean
  localVersion: SchemaVersion
  remoteVersion: SchemaVersion
  compatibilityLevel: 'IDENTICAL' | 'COMPATIBLE' | 'INCOMPATIBLE'
  reason?: string
}

/**
 * Schema Version Manager
 * Tracks and validates database schema versions for sync compatibility
 */
export class SchemaVersionManager {
  private prisma: PrismaClient
  private nodeId: string
  private schemaHash: string | null = null
  private currentVersion: SchemaVersion | null = null

  constructor(prisma: PrismaClient, nodeId: string) {
    this.prisma = prisma
    this.nodeId = nodeId
  }

  /**
   * Initialize schema version tracking
   */
  async initialize(): Promise<void> {
    try {
      // Get current schema hash
      this.schemaHash = await this.calculateSchemaHash()

      // Get current migration version
      const migrationVersion = await this.getCurrentMigrationVersion()

      // Create or update schema version record
      this.currentVersion = {
        version: migrationVersion.version,
        hash: this.schemaHash,
        migrationName: migrationVersion.name,
        appliedAt: migrationVersion.appliedAt,
        isCompatible: true
      }

      // Store schema version in sync_nodes table
      await this.updateNodeSchemaVersion()

      console.log(`📊 Schema version initialized: ${this.currentVersion.version} (${this.schemaHash.substring(0, 8)}...)`)
    } catch (error) {
      console.error('❌ Failed to initialize schema version manager:', error)
      throw error
    }
  }

  /**
   * Check if two nodes have compatible schema versions
   */
  async checkCompatibility(remoteNode: any): Promise<SchemaCompatibilityCheck> {
    if (!this.currentVersion) {
      throw new Error('Schema version manager not initialized')
    }

    const remoteVersion: SchemaVersion = {
      version: remoteNode.schemaVersion || 'unknown',
      hash: remoteNode.schemaHash || '',
      migrationName: remoteNode.migrationName || 'unknown',
      appliedAt: remoteNode.schemaAppliedAt ? new Date(remoteNode.schemaAppliedAt) : new Date(),
      isCompatible: remoteNode.schemaCompatible !== false
    }

    // Check compatibility levels
    let compatibilityLevel: 'IDENTICAL' | 'COMPATIBLE' | 'INCOMPATIBLE'
    let isCompatible = false
    let reason: string | undefined

    if (this.currentVersion.hash === remoteVersion.hash) {
      // Identical schemas - fully compatible
      compatibilityLevel = 'IDENTICAL'
      isCompatible = true
    } else if (this.currentVersion.version === remoteVersion.version) {
      // Same migration version but different hash - check if acceptable
      if (this.isVersionCompatible(this.currentVersion.version, remoteVersion.version)) {
        compatibilityLevel = 'COMPATIBLE'
        isCompatible = true
      } else {
        compatibilityLevel = 'INCOMPATIBLE'
        isCompatible = false
        reason = `Same migration version (${this.currentVersion.version}) but different schema hash`
      }
    } else {
      // Different migration versions - check compatibility matrix
      if (this.areVersionsCompatible(this.currentVersion.version, remoteVersion.version)) {
        compatibilityLevel = 'COMPATIBLE'
        isCompatible = true
      } else {
        compatibilityLevel = 'INCOMPATIBLE'
        isCompatible = false
        reason = `Migration version mismatch: local(${this.currentVersion.version}) vs remote(${remoteVersion.version})`
      }
    }

    return {
      isCompatible,
      localVersion: this.currentVersion,
      remoteVersion,
      compatibilityLevel,
      reason
    }
  }

  /**
   * Get current schema version information
   */
  getCurrentVersion(): SchemaVersion | null {
    return this.currentVersion
  }

  /**
   * Calculate schema hash from Prisma schema file
   */
  private async calculateSchemaHash(): Promise<string> {
    try {
      const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma')

      if (!fs.existsSync(schemaPath)) {
        throw new Error(`Prisma schema file not found: ${schemaPath}`)
      }

      const schemaContent = fs.readFileSync(schemaPath, 'utf8')

      // Remove comments and normalize whitespace for consistent hashing
      const normalizedSchema = schemaContent
        .replace(/\/\/.*$/gm, '') // Remove line comments
        .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim()

      // Calculate hash
      const hash = crypto.createHash('sha256').update(normalizedSchema).digest('hex')
      return hash
    } catch (error) {
      console.error('Failed to calculate schema hash:', error)
      throw error
    }
  }

  /**
   * Get current migration version from Prisma
   */
  private async getCurrentMigrationVersion(): Promise<{ version: string; name: string; appliedAt: Date }> {
    try {
      // Check if _prisma_migrations table exists
      const migrationExists = await this.prisma.$queryRaw`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name = '_prisma_migrations'
        );
      ` as any[]

      if (!migrationExists[0]?.exists) {
        // No migrations table - likely using db push
        return {
          version: process.env.DB_SCHEMA_VERSION || '1.0.0',
          name: 'schema_push',
          appliedAt: new Date()
        }
      }

      // Get latest migration
      const latestMigration = await this.prisma.$queryRaw`
        SELECT migration_name AS migration_name, applied_steps_count AS applied_steps_count, finished_at AS finished_at
        FROM _prisma_migrations
        WHERE finished_at IS NOT NULL
        ORDER BY finished_at DESC
        LIMIT 1;
      ` as any[]

      if (latestMigration.length === 0) {
        return {
          version: '0.0.0',
          name: 'no_migrations',
          appliedAt: new Date()
        }
      }

      const migration = latestMigration[0]

      // Map SQL result fields to camelCase used in the code
  const migrationName = migration.migrationName || migration.migration_name
  const finishedAt = migration.finishedAt || migration.finished_at

      return {
        version: this.extractVersionFromMigrationName(migrationName),
        name: migrationName,
        appliedAt: new Date(finishedAt)
      }
    } catch (error) {
      console.error('Failed to get migration version:', error)
      // Fallback to environment variable or default
      return {
        version: process.env.DB_SCHEMA_VERSION || '1.0.0',
        name: 'fallback_version',
        appliedAt: new Date()
      }
    }
  }

  /**
   * Extract version from migration name
   */
  private extractVersionFromMigrationName(migrationName: string): string {
    // Try to extract timestamp-based version from migration name
    const timestampMatch = migrationName.match(/^(\d{14})_/)
    if (timestampMatch) {
      const timestamp = timestampMatch[1]
      // Convert timestamp to semantic version format
      const year = timestamp.substring(0, 4)
      const month = timestamp.substring(4, 6)
      const day = timestamp.substring(6, 8)
      return `${year}.${month}.${day}`
    }

    // Try to extract semantic version from migration name
    const versionMatch = migrationName.match(/(\d+\.\d+\.\d+)/)
    if (versionMatch) {
      return versionMatch[1]
    }

    // Fallback to environment variable or default
    return process.env.DB_SCHEMA_VERSION || '1.0.0'
  }

  /**
   * Update node schema version in database
   */
  private async updateNodeSchemaVersion(): Promise<void> {
    if (!this.currentVersion) {
      return
    }

    try {
      await this.prisma.$executeRaw`
        UPDATE sync_nodes
        SET
          schema_version = ${this.currentVersion.version},
          schema_hash = ${this.currentVersion.hash},
          migration_name = ${this.currentVersion.migrationName},
          schema_applied_at = ${this.currentVersion.appliedAt},
          updated_at = NOW()
        WHERE node_id = ${this.nodeId};
      `
    } catch (error) {
      console.error('Failed to update node schema version:', error)
      // Don't throw - this is not critical for operation
    }
  }

  /**
   * Check if a specific version is compatible with current version
   */
  private isVersionCompatible(localVersion: string, remoteVersion: string): boolean {
    // Exact match is always compatible
    if (localVersion === remoteVersion) {
      return true
    }

    // Parse semantic versions
    const local = this.parseVersion(localVersion)
    const remote = this.parseVersion(remoteVersion)

    // Same major version is compatible
    if (local.major === remote.major) {
      return true
    }

    // Define compatibility matrix for major version differences
    const compatibilityMatrix: { [key: string]: string[] } = {
      '1': ['1'], // Version 1.x only compatible with 1.x
      '2': ['2'], // Version 2.x only compatible with 2.x
    }

    const localMajorStr = local.major.toString()
    const remoteMajorStr = remote.major.toString()

    return compatibilityMatrix[localMajorStr]?.includes(remoteMajorStr) || false
  }

  /**
   * Check if two versions are compatible for sync
   */
  private areVersionsCompatible(localVersion: string, remoteVersion: string): boolean {
    return this.isVersionCompatible(localVersion, remoteVersion)
  }

  /**
   * Parse semantic version string
   */
  private parseVersion(version: string): { major: number; minor: number; patch: number } {
    const parts = version.split('.').map(Number)
    return {
      major: parts[0] || 0,
      minor: parts[1] || 0,
      patch: parts[2] || 0
    }
  }

  /**
   * Get schema compatibility report for all known nodes
   */
  async getCompatibilityReport(): Promise<{
    totalNodes: number
    compatibleNodes: number
    incompatibleNodes: number
    nodeDetails: Array<{
      nodeId: string
      nodeName: string
      isCompatible: boolean
      compatibilityLevel: string
      version: string
      reason?: string
    }>
  }> {
    try {
      // Get all sync nodes
      const nodes = await this.prisma.$queryRaw`
        SELECT
          node_id AS node_id,
          node_name AS node_name,
          schema_version AS schema_version,
          schema_hash AS schema_hash,
          migration_name AS migration_name,
          schema_applied_at AS schema_applied_at
        FROM sync_nodes
        WHERE enabled = true AND node_id != ${this.nodeId};
      ` as any[]

      const nodeDetails = []
      let compatibleCount = 0
      let incompatibleCount = 0

      for (const node of nodes) {
        const compatibility = await this.checkCompatibility(node)

        // Map DB row properties to camelCase
  const nodeId = node.nodeId || node.node_id
  const nodeName = node.nodeName || node.node_name
  const version = node.schemaVersion || node.schema_version || 'unknown'

        nodeDetails.push({
          nodeId,
          nodeName,
          isCompatible: compatibility.isCompatible,
          compatibilityLevel: compatibility.compatibilityLevel,
          version,
          reason: compatibility.reason
        })

        if (compatibility.isCompatible) {
          compatibleCount++
        } else {
          incompatibleCount++
        }
      }

      return {
        totalNodes: nodes.length,
        compatibleNodes: compatibleCount,
        incompatibleNodes: incompatibleCount,
        nodeDetails
      }
    } catch (error) {
      console.error('Failed to generate compatibility report:', error)
      return {
        totalNodes: 0,
        compatibleNodes: 0,
        incompatibleNodes: 0,
        nodeDetails: []
      }
    }
  }
}

/**
 * Create schema version manager instance
 */
export function createSchemaVersionManager(prisma: PrismaClient, nodeId: string): SchemaVersionManager {
  return new SchemaVersionManager(prisma, nodeId)
}