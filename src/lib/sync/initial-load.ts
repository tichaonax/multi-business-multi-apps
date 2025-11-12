/**
 * Initial Data Load System
 * Handles onboarding of new sync nodes with complete database state transfer
 */

import { EventEmitter } from 'events'
import { PrismaClient } from '@prisma/client'
import { getDbName } from '../db-names'
import { PeerInfo } from './peer-discovery'
import { SyncUtils } from './sync-utils'

// use Node's crypto consistently inside this module
const crypto = require('crypto')

export interface InitialLoadSession {
  sessionId: string
  sourceNodeId: string
  targetNodeId: string
  startedAt: Date
  completedAt?: Date
  status: 'PREPARING' | 'TRANSFERRING' | 'VALIDATING' | 'COMPLETED' | 'FAILED' | 'CANCELLED'
  progress: number // 0-100
  // currentStep may be undefined when loaded from DB
  currentStep?: string
  totalRecords: number
  transferredRecords: number
  // transferredBytes may be BigInt in DB; allow number | bigint | null
  transferredBytes: number | bigint | null
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
  // Use mapped physical DB names when available via getDbName
  private readonly CORE_TABLES = [
    getDbName('users'),
    getDbName('businesses'),
    getDbName('businessMemberships') || 'business_memberships',
    getDbName('employees'),
    getDbName('employeeContracts') || 'employee_contracts',
    getDbName('jobTitles') || 'job_titles',
    getDbName('compensationTypes') || 'compensation_types',
    getDbName('benefitTypes') || 'benefit_types',
    getDbName('projects'),
    getDbName('projectContractors') || 'project_contractors',
    getDbName('projectStages') || 'project_stages',
    getDbName('projectTransactions') || 'project_transactions',
    getDbName('persons') || 'persons',
    getDbName('idFormatTemplates') || 'id_format_templates',
    'phone_format_templates',
    'date_format_templates'
  ]

  constructor(prisma: PrismaClient, nodeId: string, registrationKey: string, private httpPort?: number) {
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
        // keep totalSize in our runtime snapshot but persist into metadata to match Prisma schema
        totalSize,
        checksum,
        tables
      }

      // Store snapshot metadata (map to prisma fields)
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
      const port = this.httpPort || sourcePeer.port
      const response = await fetch(`http://${sourcePeer.ipAddress}:${port}/api/sync/request-initial-load`, {
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
        // Check if session was cancelled by external process
        if ((session.status as string) === 'CANCELLED') {
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
  // ensure transferredBytes is a number and handle nulls
  const prevBytes = Number(session.transferredBytes || 0)
  session.transferredBytes = prevBytes + this.calculateChunkSize(chunk)
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
      const port = this.httpPort || targetPeer.port
      const response = await fetch(`http://${targetPeer.ipAddress}:${port}/api/sync/receive-chunk`, {
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
      const port = this.httpPort || targetPeer.port
      const response = await fetch(`http://${targetPeer.ipAddress}:${port}/api/sync/validate-transfer`, {
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
        `SELECT MAX(COALESCE("updated_at", "created_at", updatedAt, createdAt)) as last_modified FROM "${tableName}"`
      )
  const last = (result as any)[0]?.lastModified || (result as any)[0]?.last_modified || Date.now()
      return new Date(last)
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
    // stable JSON stringify to ensure deterministic checksums across runs
    const stableStringify = (value: any): string => {
      const replacer = (_key: string, v: any) => {
        if (v && typeof v === 'object' && !Array.isArray(v)) {
          // produce an object with sorted keys
          const ordered: any = {}
          for (const k of Object.keys(v).sort()) {
            ordered[k] = v[k]
          }
          return ordered
        }
        return v
      }

      return JSON.stringify(value, replacer)
    }

    const dataString = stableStringify(data)
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
      // Prisma schema for DataSnapshot may differ between deployments. Write into
      // snapshotData/metadata fields to ensure compatibility.
      await this.prisma.dataSnapshots.create({
        data: {
          id: snapshot.snapshotId,
          nodeId: snapshot.nodeId,
          createdAt: snapshot.createdAt,
          totalRecords: snapshot.totalRecords,
          // store tables and totalSize inside metadata to avoid schema mismatch
          snapshotData: snapshot.tables,
          metadata: {
            totalSize: snapshot.totalSize,
            checksum: snapshot.checksum
          },
          checksum: snapshot.checksum
        } as any
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
      console.log('InitialLoadManager: Loading active sessions, prisma client exists:', !!this.prisma)
      console.log('InitialLoadManager: Prisma client type:', typeof this.prisma)
      console.log('InitialLoadManager: Prisma client keys:', this.prisma ? Object.keys(this.prisma).slice(0, 10) : 'N/A')

      if (!this.prisma) {
        console.error('InitialLoadManager: Prisma client is null/undefined!')
        return
      }

      // Check if initialLoadSessions exists
      console.log('InitialLoadManager: Checking initialLoadSessions property...')
      console.log('InitialLoadManager: initialLoadSessions exists:', !!this.prisma.initialLoadSessions)
      console.log('InitialLoadManager: initialLoadSessions type:', typeof this.prisma.initialLoadSessions)

      if (!this.prisma.initialLoadSessions) {
        console.warn('InitialLoadManager: initialLoadSessions property is missing! This may indicate the database schema is outdated.')
        console.warn('InitialLoadManager: Available properties:', Object.keys(this.prisma))
        console.warn('InitialLoadManager: Continuing with empty sessions list. Please update the database schema.')
        return
      }

      // Check if findMany method exists
      console.log('InitialLoadManager: Checking findMany method...')
      console.log('InitialLoadManager: findMany exists:', typeof this.prisma.initialLoadSessions.findMany)

      if (typeof this.prisma.initialLoadSessions.findMany !== 'function') {
        console.warn('InitialLoadManager: findMany is not a function! Schema may be outdated.')
        return
      }

      console.log('InitialLoadManager: Attempting to call findMany...')
      const sessions = await this.prisma.initialLoadSessions.findMany({
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

      console.log(`InitialLoadManager: Successfully loaded ${sessions.length} active sessions`)

      for (const dbSession of sessions) {
        const s = dbSession as any
        const session: InitialLoadSession = {
          sessionId: s.id,
          sourceNodeId: s.sourceNodeId,
          targetNodeId: s.targetNodeId,
          startedAt: s.startedAt,
          completedAt: s.completedAt || undefined,
          status: s.status as any,
          progress: s.progress,
          currentStep: s.currentStep,
          totalRecords: s.totalRecords,
          transferredRecords: s.transferredRecords,
          transferredBytes: s.transferredBytes,
          estimatedTimeRemaining: s.estimatedTimeRemaining,
          errorMessage: s.errorMessage || undefined,
          metadata: s.metadata as any
        }

        this.activeSessions.set(session.sessionId, session)
      }
    } catch (error) {
      console.error('InitialLoadManager: Failed to load active sessions:', error)
      console.error('InitialLoadManager: Error details:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : 'No stack trace'
      })

      // Check if this is a schema-related error
      if (error instanceof Error && (
        error.message.includes('does not exist') ||
        error.message.includes('P2021') ||
        error.message.includes('initial_load_sessions')
      )) {
        console.warn('InitialLoadManager: Database schema appears to be outdated. The initial_load_sessions table may not exist yet.')
        console.warn('InitialLoadManager: Continuing with empty sessions list. Please update the database schema on this node.')
        return
      }

      console.error('InitialLoadManager: Prisma client state:', {
        exists: !!this.prisma,
        type: typeof this.prisma,
        hasInitialLoadSessions: this.prisma ? !!this.prisma.initialLoadSessions : false,
        hasFindMany: this.prisma?.initialLoadSessions ? typeof this.prisma.initialLoadSessions.findMany : 'N/A'
      })
    }
  }

  /**
   * Create initial load session in database
   */
  private async createInitialLoadSession(session: InitialLoadSession): Promise<void> {
    try {
      await this.prisma.initialLoadSessions.create({
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
        } as any
      })
    } catch (error) {
      console.warn('Failed to create initial load session (table may not exist yet):', error instanceof Error ? error.message : String(error))
      // Don't throw - allow the session to continue in memory even if DB persistence fails
    }
  }

  /**
   * Update initial load session in database
   */
  private async updateInitialLoadSession(session: InitialLoadSession): Promise<void> {
    try {
      await this.prisma.initialLoadSessions.update({
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
        } as any
      })
    } catch (error) {
      console.warn('Failed to update initial load session (table may not exist yet):', error instanceof Error ? error.message : String(error))
      // Don't throw - allow the session to continue even if DB updates fail
    }
  }
}

/**
 * Create initial load manager
 */
export function createInitialLoadManager(
  prisma: PrismaClient,
  nodeId: string,
  registrationKey: string,
  httpPort?: number
): InitialLoadManager {
  return new InitialLoadManager(prisma, nodeId, registrationKey, httpPort)
}