/**
 * Initial Data Load System
 * Handles onboarding of new sync nodes with complete database state transfer
 */

import { EventEmitter } from 'events'
import { PrismaClient } from '@prisma/client'
import { PeerInfo } from './peer-discovery'
import { SyncUtils } from './sync-utils'

export interface InitialLoadSession {
  sessionId: string
  sourceNodeId: string
  targetNodeId: string
  startedAt: Date
  completedAt?: Date
  status: 'PREPARING' | 'TRANSFERRING' | 'VALIDATING' | 'COMPLETED' | 'FAILED' | 'CANCELLED'
  progress: number // 0-100
  currentStep: string
  totalRecords: number
  transferredRecords: number
  transferredBytes: number
  estimatedTimeRemaining: number // seconds
  errorMessage?: string
  metadata: {
    selectedTables: string[]
    compressionEnabled: boolean
    encryptionEnabled: boolean
    batchSize: number
    checksumVerification: boolean
  }
}

export interface DataSnapshot {
  snapshotId: string
  nodeId: string
  createdAt: Date
  totalRecords: number
  totalSize: number // bytes
  checksum: string
  tables: Array<{
    tableName: string
    recordCount: number
    dataSize: number
    lastModified: Date
  }>
}

export interface TransferChunk {
  chunkId: string
  sessionId: string
  tableName: string
  sequenceNumber: number
  totalChunks: number
  data: any[]
  checksum: string
  compressedSize?: number
  isEncrypted: boolean
}

/**
 * Initial Load Manager
 * Coordinates complete database transfers for new nodes
 */
export class InitialLoadManager extends EventEmitter {
  private prisma: PrismaClient
  private nodeId: string
  private registrationKey: string
  private syncUtils: SyncUtils
  private activeSessions: Map<string, InitialLoadSession> = new Map()
  private transferQueue: Map<string, TransferChunk[]> = new Map()

  // Transfer configuration
  private readonly DEFAULT_BATCH_SIZE = 1000
  private readonly MAX_CHUNK_SIZE = 5 * 1024 * 1024 // 5MB
  private readonly MAX_CONCURRENT_TRANSFERS = 3
  private readonly VALIDATION_SAMPLE_SIZE = 100

  // Tables to include in initial load (excluding sync system tables)
  private readonly CORE_TABLES = [
    'users',
    'businesses',
    'business_memberships',
    'employees',
    'employee_contracts',
    'job_titles',
    'compensation_types',
    'benefit_types',
    'projects',
    'project_contractors',
    'project_stages',
    'project_transactions',
    'persons',
    'id_format_templates',
    'phone_format_templates',
    'date_format_templates'
  ]

  constructor(prisma: PrismaClient, nodeId: string, registrationKey: string) {
    super()
    this.prisma = prisma
    this.nodeId = nodeId
    this.registrationKey = registrationKey
    this.syncUtils = new SyncUtils(prisma, nodeId)
  }

  /**
   * Start initial load manager
   */
  async start(): Promise<void> {
    await this.loadActiveSessions()
    this.emit('started')
  }

  /**
   * Stop initial load manager
   */
  stop(): void {
    // Cancel active transfers
    for (const session of this.activeSessions.values()) {
      if (session.status === 'TRANSFERRING' || session.status === 'PREPARING') {
        session.status = 'CANCELLED'
        this.emit('session_cancelled', session)
      }
    }
    this.emit('stopped')
  }

  /**
   * Create data snapshot for transfer
   */
  async createDataSnapshot(): Promise<DataSnapshot> {
    const snapshotId = crypto.randomUUID()
    const createdAt = new Date()

    try {
      const tables: DataSnapshot['tables'] = []
      let totalRecords = 0
      let totalSize = 0

      // Analyze each table
      for (const tableName of this.CORE_TABLES) {
        try {
          const count = await this.getTableRecordCount(tableName)
          const size = await this.estimateTableSize(tableName)
          const lastModified = await this.getTableLastModified(tableName)

          tables.push({
            tableName,
            recordCount: count,
            dataSize: size,
            lastModified
          })

          totalRecords += count
          totalSize += size
        } catch (error) {
          console.warn(`Failed to analyze table ${tableName}:`, error)
        }
      }

      // Calculate overall checksum
      const checksum = await this.calculateSnapshotChecksum(tables)

      const snapshot: DataSnapshot = {
        snapshotId,
        nodeId: this.nodeId,
        createdAt,
        totalRecords,
        totalSize,
        checksum,
        tables
      }

      // Store snapshot metadata
      await this.storeSnapshotMetadata(snapshot)

      this.emit('snapshot_created', snapshot)
      return snapshot

    } catch (error) {
      console.error('Failed to create data snapshot:', error)
      throw error
    }
  }

  /**
   * Initiate initial load to new node
   */
  async initiateInitialLoad(
    targetPeer: PeerInfo,
    options: {
      selectedTables?: string[]
      compressionEnabled?: boolean
      encryptionEnabled?: boolean
      batchSize?: number
      checksumVerification?: boolean
    } = {}
  ): Promise<string> {
    const sessionId = crypto.randomUUID()

    const session: InitialLoadSession = {
      sessionId,
      sourceNodeId: this.nodeId,
      targetNodeId: targetPeer.nodeId,
      startedAt: new Date(),
      status: 'PREPARING',
      progress: 0,
      currentStep: 'Preparing data snapshot',
      totalRecords: 0,
      transferredRecords: 0,
      transferredBytes: 0,
      estimatedTimeRemaining: 0,
      metadata: {
        selectedTables: options.selectedTables || this.CORE_TABLES,
        compressionEnabled: options.compressionEnabled ?? true,
        encryptionEnabled: options.encryptionEnabled ?? true,
        batchSize: options.batchSize || this.DEFAULT_BATCH_SIZE,
        checksumVerification: options.checksumVerification ?? true
      }
    }

    await this.createInitialLoadSession(session)
    this.activeSessions.set(sessionId, session)

    // Start transfer process
    setImmediate(() => this.executeInitialLoad(session, targetPeer))

    this.emit('initial_load_started', session)
    return sessionId
  }

  /**
   * Request initial load from peer
   */
  async requestInitialLoad(
    sourcePeer: PeerInfo,
    options: {
      selectedTables?: string[]
      compressionEnabled?: boolean
      encryptionEnabled?: boolean
    } = {}
  ): Promise<string> {
    try {
      // Send initial load request to source peer
      const response = await fetch(`http://${sourcePeer.ipAddress}:${sourcePeer.port}/api/sync/request-initial-load`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.hashRegistrationKey()}`
        },
        body: JSON.stringify({
          requestingNodeId: this.nodeId,
          selectedTables: options.selectedTables || this.CORE_TABLES,
          compressionEnabled: options.compressionEnabled ?? true,
          encryptionEnabled: options.encryptionEnabled ?? true
        })
      })

      if (!response.ok) {
        throw new Error(`Initial load request failed: ${response.statusText}`)
      }

      const result = await response.json()
      return result.sessionId

    } catch (error) {
      console.error('Failed to request initial load:', error)
      throw error
    }
  }

  /**
   * Get active transfer sessions
   */
  getActiveSessions(): InitialLoadSession[] {
    return Array.from(this.activeSessions.values())
  }

  /**
   * Get transfer session by ID
   */
  getSession(sessionId: string): InitialLoadSession | null {
    return this.activeSessions.get(sessionId) || null
  }

  /**
   * Cancel transfer session
   */
  async cancelSession(sessionId: string): Promise<boolean> {
    const session = this.activeSessions.get(sessionId)
    if (!session) return false

    if (session.status === 'COMPLETED' || session.status === 'FAILED') {
      return false
    }

    session.status = 'CANCELLED'
    session.completedAt = new Date()

    await this.updateInitialLoadSession(session)
    this.activeSessions.delete(sessionId)
    this.emit('session_cancelled', session)

    return true
  }

  /**
   * Execute initial load transfer
   */
  private async executeInitialLoad(session: InitialLoadSession, targetPeer: PeerInfo): Promise<void> {
    try {
      // Phase 1: Create snapshot
      await this.updateSessionProgress(session, 10, 'Creating data snapshot')
      const snapshot = await this.createDataSnapshot()
      session.totalRecords = snapshot.totalRecords

      // Phase 2: Prepare transfer chunks
      await this.updateSessionProgress(session, 20, 'Preparing transfer chunks')
      const chunks = await this.createTransferChunks(session, snapshot)

      // Phase 3: Transfer data
      session.status = 'TRANSFERRING'
      await this.updateSessionProgress(session, 30, 'Transferring data')

      let transferredChunks = 0
      const totalChunks = chunks.length

      for (const chunk of chunks) {
        if (session.status === 'CANCELLED') {
          throw new Error('Transfer cancelled')
        }

        await this.sendChunkToTarget(chunk, targetPeer)
        transferredChunks++

        const progress = 30 + (transferredChunks / totalChunks) * 50
        await this.updateSessionProgress(
          session,
          progress,
          `Transferred ${transferredChunks}/${totalChunks} chunks`
        )

        session.transferredRecords += chunk.data.length
        session.transferredBytes += this.calculateChunkSize(chunk)
      }

      // Phase 4: Validation
      if (session.metadata.checksumVerification) {
        session.status = 'VALIDATING'
        await this.updateSessionProgress(session, 85, 'Validating transfer')
        await this.validateTransfer(session, targetPeer, snapshot)
      }

      // Phase 5: Complete
      session.status = 'COMPLETED'
      session.completedAt = new Date()
      await this.updateSessionProgress(session, 100, 'Transfer completed successfully')

      await this.updateInitialLoadSession(session)
      this.activeSessions.delete(session.sessionId)
      this.emit('initial_load_completed', session)

    } catch (error) {
      session.status = 'FAILED'
      session.completedAt = new Date()
      session.errorMessage = error instanceof Error ? error.message : 'Unknown error'

      await this.updateInitialLoadSession(session)
      this.activeSessions.delete(session.sessionId)
      this.emit('initial_load_failed', { session, error })
    }
  }

  /**
   * Create transfer chunks from snapshot
   */
  private async createTransferChunks(session: InitialLoadSession, snapshot: DataSnapshot): Promise<TransferChunk[]> {
    const chunks: TransferChunk[] = []

    for (const table of snapshot.tables) {
      if (!session.metadata.selectedTables.includes(table.tableName)) {
        continue
      }

      const tableChunks = await this.createTableChunks(session, table.tableName, table.recordCount)
      chunks.push(...tableChunks)
    }

    return chunks
  }

  /**
   * Create chunks for a specific table
   */
  private async createTableChunks(session: InitialLoadSession, tableName: string, recordCount: number): Promise<TransferChunk[]> {
    const chunks: TransferChunk[] = []
    const batchSize = session.metadata.batchSize
    const totalChunks = Math.ceil(recordCount / batchSize)

    for (let i = 0; i < totalChunks; i++) {
      const offset = i * batchSize
      const data = await this.fetchTableData(tableName, offset, batchSize)

      if (data.length === 0) break

      const chunk: TransferChunk = {
        chunkId: crypto.randomUUID(),
        sessionId: session.sessionId,
        tableName,
        sequenceNumber: i,
        totalChunks,
        data,
        checksum: this.calculateDataChecksum(data),
        isEncrypted: session.metadata.encryptionEnabled
      }

      if (session.metadata.compressionEnabled) {
        chunk.compressedSize = this.estimateCompressedSize(data)
      }

      chunks.push(chunk)
    }

    return chunks
  }

  /**
   * Send chunk to target peer
   */
  private async sendChunkToTarget(chunk: TransferChunk, targetPeer: PeerInfo): Promise<void> {
    try {
      const response = await fetch(`http://${targetPeer.ipAddress}:${targetPeer.port}/api/sync/receive-chunk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.hashRegistrationKey()}`
        },
        body: JSON.stringify(chunk)
      })

      if (!response.ok) {
        throw new Error(`Failed to send chunk ${chunk.chunkId}: ${response.statusText}`)
      }

      const result = await response.json()
      if (!result.success) {
        throw new Error(`Chunk transfer failed: ${result.error}`)
      }

    } catch (error) {
      console.error(`Failed to send chunk ${chunk.chunkId}:`, error)
      throw error
    }
  }

  /**
   * Validate transfer completion
   */
  private async validateTransfer(session: InitialLoadSession, targetPeer: PeerInfo, snapshot: DataSnapshot): Promise<void> {
    try {
      // Request validation from target
      const response = await fetch(`http://${targetPeer.ipAddress}:${targetPeer.port}/api/sync/validate-transfer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.hashRegistrationKey()}`
        },
        body: JSON.stringify({
          sessionId: session.sessionId,
          expectedChecksum: snapshot.checksum,
          expectedRecordCount: snapshot.totalRecords
        })
      })

      if (!response.ok) {
        throw new Error(`Validation request failed: ${response.statusText}`)
      }

      const result = await response.json()
      if (!result.valid) {
        throw new Error(`Transfer validation failed: ${result.error}`)
      }

    } catch (error) {
      console.error('Transfer validation failed:', error)
      throw error
    }
  }

  /**
   * Hash registration key for authentication
   */
  private hashRegistrationKey(): string {
    const crypto = require('crypto')
    return crypto.createHash('sha256').update(this.registrationKey).digest('hex')
  }

  /**
   * Update session progress
   */
  private async updateSessionProgress(session: InitialLoadSession, progress: number, step: string): Promise<void> {
    session.progress = Math.min(100, Math.max(0, progress))
    session.currentStep = step

    // Update estimated time remaining
    if (progress > 0 && progress < 100) {
      const elapsed = Date.now() - session.startedAt.getTime()
      const estimatedTotal = (elapsed / progress) * 100
      session.estimatedTimeRemaining = Math.round((estimatedTotal - elapsed) / 1000)
    }

    await this.updateInitialLoadSession(session)
    this.emit('session_progress', { sessionId: session.sessionId, progress, step })
  }

  /**
   * Get table record count
   */
  private async getTableRecordCount(tableName: string): Promise<number> {
    try {
      const result = await this.prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM "${tableName}"`)
      return Number((result as any)[0]?.count || 0)
    } catch (error) {
      console.warn(`Failed to count records in table ${tableName}:`, error)
      return 0
    }
  }

  /**
   * Estimate table size in bytes
   */
  private async estimateTableSize(tableName: string): Promise<number> {
    try {
      // Rough estimation based on average row size
      const sampleData = await this.prisma.$queryRawUnsafe(`SELECT * FROM "${tableName}" LIMIT 10`)
      const sampleSize = JSON.stringify(sampleData).length
      const recordCount = await this.getTableRecordCount(tableName)
      return Math.round((sampleSize / 10) * recordCount)
    } catch (error) {
      return 0
    }
  }

  /**
   * Get table last modified timestamp
   */
  private async getTableLastModified(tableName: string): Promise<Date> {
    try {
      // Try to get from updatedAt or createdAt columns
      const result = await this.prisma.$queryRawUnsafe(
        `SELECT MAX(COALESCE("updated_at", "created_at")) as last_modified FROM "${tableName}"`
      )
      return new Date((result as any)[0]?.last_modified || Date.now())
    } catch (error) {
      return new Date()
    }
  }

  /**
   * Calculate snapshot checksum
   */
  private async calculateSnapshotChecksum(tables: DataSnapshot['tables']): Promise<string> {
    const crypto = require('crypto')
    const hash = crypto.createHash('sha256')

    for (const table of tables) {
      hash.update(`${table.tableName}:${table.recordCount}:${table.dataSize}`)
    }

    return hash.digest('hex')
  }

  /**
   * Fetch table data in batches
   */
  private async fetchTableData(tableName: string, offset: number, limit: number): Promise<any[]> {
    try {
      return await this.prisma.$queryRawUnsafe(
        `SELECT * FROM "${tableName}" ORDER BY "created_at" LIMIT ${limit} OFFSET ${offset}`
      )
    } catch (error) {
      console.error(`Failed to fetch data from table ${tableName}:`, error)
      return []
    }
  }

  /**
   * Calculate data checksum
   */
  private calculateDataChecksum(data: any[]): string {
    const crypto = require('crypto')
    const dataString = JSON.stringify(data, Object.keys(data).sort())
    return crypto.createHash('sha256').update(dataString).digest('hex')
  }

  /**
   * Estimate compressed size
   */
  private estimateCompressedSize(data: any[]): number {
    // Rough compression ratio estimate
    const originalSize = JSON.stringify(data).length
    return Math.round(originalSize * 0.3) // Assume 70% compression
  }

  /**
   * Calculate chunk size
   */
  private calculateChunkSize(chunk: TransferChunk): number {
    return chunk.compressedSize || JSON.stringify(chunk.data).length
  }

  /**
   * Store snapshot metadata
   */
  private async storeSnapshotMetadata(snapshot: DataSnapshot): Promise<void> {
    try {
      await this.prisma.dataSnapshot.create({
        data: {
          id: snapshot.snapshotId,
          nodeId: snapshot.nodeId,
          createdAt: snapshot.createdAt,
          totalRecords: snapshot.totalRecords,
          totalSize: snapshot.totalSize,
          checksum: snapshot.checksum,
          tableMetadata: snapshot.tables
        }
      })
    } catch (error) {
      console.error('Failed to store snapshot metadata:', error)
    }
  }

  /**
   * Load active sessions from database
   */
  private async loadActiveSessions(): Promise<void> {
    try {
      const sessions = await this.prisma.initialLoadSession.findMany({
        where: {
          OR: [
            { sourceNodeId: this.nodeId },
            { targetNodeId: this.nodeId }
          ],
          status: {
            in: ['PREPARING', 'TRANSFERRING', 'VALIDATING']
          }
        }
      })

      for (const dbSession of sessions) {
        const session: InitialLoadSession = {
          sessionId: dbSession.id,
          sourceNodeId: dbSession.sourceNodeId,
          targetNodeId: dbSession.targetNodeId,
          startedAt: dbSession.startedAt,
          completedAt: dbSession.completedAt || undefined,
          status: dbSession.status as any,
          progress: dbSession.progress,
          currentStep: dbSession.currentStep,
          totalRecords: dbSession.totalRecords,
          transferredRecords: dbSession.transferredRecords,
          transferredBytes: dbSession.transferredBytes,
          estimatedTimeRemaining: dbSession.estimatedTimeRemaining,
          errorMessage: dbSession.errorMessage || undefined,
          metadata: dbSession.metadata as any
        }

        this.activeSessions.set(session.sessionId, session)
      }
    } catch (error) {
      console.error('Failed to load active sessions:', error)
    }
  }

  /**
   * Create initial load session in database
   */
  private async createInitialLoadSession(session: InitialLoadSession): Promise<void> {
    try {
      await this.prisma.initialLoadSession.create({
        data: {
          id: session.sessionId,
          sourceNodeId: session.sourceNodeId,
          targetNodeId: session.targetNodeId,
          startedAt: session.startedAt,
          status: session.status,
          progress: session.progress,
          currentStep: session.currentStep,
          totalRecords: session.totalRecords,
          transferredRecords: session.transferredRecords,
          transferredBytes: session.transferredBytes,
          estimatedTimeRemaining: session.estimatedTimeRemaining,
          metadata: session.metadata
        }
      })
    } catch (error) {
      console.error('Failed to create initial load session:', error)
    }
  }

  /**
   * Update initial load session in database
   */
  private async updateInitialLoadSession(session: InitialLoadSession): Promise<void> {
    try {
      await this.prisma.initialLoadSession.update({
        where: { id: session.sessionId },
        data: {
          status: session.status,
          progress: session.progress,
          currentStep: session.currentStep,
          totalRecords: session.totalRecords,
          transferredRecords: session.transferredRecords,
          transferredBytes: session.transferredBytes,
          estimatedTimeRemaining: session.estimatedTimeRemaining,
          completedAt: session.completedAt,
          errorMessage: session.errorMessage,
          metadata: session.metadata
        }
      })
    } catch (error) {
      console.error('Failed to update initial load session:', error)
    }
  }
}

/**
 * Create initial load manager
 */
export function createInitialLoadManager(
  prisma: PrismaClient,
  nodeId: string,
  registrationKey: string
): InitialLoadManager {
  return new InitialLoadManager(prisma, nodeId, registrationKey)
}