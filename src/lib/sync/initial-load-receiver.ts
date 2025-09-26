/**
 * Initial Load Receiver
 * Handles receiving and processing initial data loads from source nodes
 */

import { EventEmitter } from 'events'
import { PrismaClient } from '@prisma/client'
import { TransferChunk, InitialLoadSession } from './initial-load'

export interface ReceivedChunk {
  chunkId: string
  sessionId: string
  tableName: string
  sequenceNumber: number
  totalChunks: number
  receivedAt: Date
  isProcessed: boolean
  checksum: string
  recordCount: number
}

export interface ReceptionSession {
  sessionId: string
  sourceNodeId: string
  targetNodeId: string
  startedAt: Date
  completedAt?: Date
  status: 'RECEIVING' | 'PROCESSING' | 'VALIDATING' | 'COMPLETED' | 'FAILED'
  progress: number
  currentStep: string
  expectedChunks: number
  receivedChunks: number
  processedChunks: number
  totalRecords: number
  processedRecords: number
  errorMessage?: string
  tableStatus: Map<string, {
    expectedChunks: number
    receivedChunks: number
    processedChunks: number
    isComplete: boolean
  }>
}

/**
 * Initial Load Receiver
 * Manages the target side of initial data transfers
 */
export class InitialLoadReceiver extends EventEmitter {
  private prisma: PrismaClient
  private nodeId: string
  private registrationKey: string
  private receptionSessions: Map<string, ReceptionSession> = new Map()
  private chunkBuffer: Map<string, Map<string, TransferChunk>> = new Map() // sessionId -> chunkId -> chunk
  private processingTimer: NodeJS.Timeout | null = null

  // Processing configuration
  private readonly BATCH_PROCESSING_INTERVAL = 5000 // 5 seconds
  private readonly MAX_BUFFER_SIZE = 100 * 1024 * 1024 // 100MB
  private readonly CHUNK_TIMEOUT = 300000 // 5 minutes

  constructor(prisma: PrismaClient, nodeId: string, registrationKey: string) {
    super()
    this.prisma = prisma
    this.nodeId = nodeId
    this.registrationKey = registrationKey
  }

  /**
   * Start receiver
   */
  async start(): Promise<void> {
    await this.loadActiveReceptionSessions()
    this.startChunkProcessing()
    this.emit('started')
  }

  /**
   * Stop receiver
   */
  stop(): void {
    if (this.processingTimer) {
      clearInterval(this.processingTimer)
      this.processingTimer = null
    }
    this.emit('stopped')
  }

  /**
   * Initialize reception session
   */
  async initializeReceptionSession(
    sessionId: string,
    sourceNodeId: string,
    metadata: {
      selectedTables: string[]
      expectedRecords: number
      compressionEnabled: boolean
      encryptionEnabled: boolean
    }
  ): Promise<void> {
    const session: ReceptionSession = {
      sessionId,
      sourceNodeId,
      targetNodeId: this.nodeId,
      startedAt: new Date(),
      status: 'RECEIVING',
      progress: 0,
      currentStep: 'Initializing reception',
      expectedChunks: 0, // Will be updated as chunks arrive
      receivedChunks: 0,
      processedChunks: 0,
      totalRecords: metadata.expectedRecords,
      processedRecords: 0,
      tableStatus: new Map()
    }

    // Initialize table status
    for (const tableName of metadata.selectedTables) {
      session.tableStatus.set(tableName, {
        expectedChunks: 0,
        receivedChunks: 0,
        processedChunks: 0,
        isComplete: false
      })
    }

    await this.createReceptionSession(session)
    this.receptionSessions.set(sessionId, session)
    this.chunkBuffer.set(sessionId, new Map())

    this.emit('reception_initialized', session)
  }

  /**
   * Receive transfer chunk
   */
  async receiveChunk(chunk: TransferChunk): Promise<boolean> {
    try {
      const session = this.receptionSessions.get(chunk.sessionId)
      if (!session) {
        throw new Error(`No active reception session: ${chunk.sessionId}`)
      }

      if (session.status !== 'RECEIVING') {
        throw new Error(`Session not in receiving state: ${session.status}`)
      }

      // Validate chunk
      await this.validateChunk(chunk)

      // Store chunk in buffer
      const sessionBuffer = this.chunkBuffer.get(chunk.sessionId)!
      sessionBuffer.set(chunk.chunkId, chunk)

      // Update reception session
      session.receivedChunks++
      const tableStatus = session.tableStatus.get(chunk.tableName)!
      tableStatus.receivedChunks++

      // Update expected chunks if this is the first chunk for this table
      if (tableStatus.expectedChunks === 0) {
        tableStatus.expectedChunks = chunk.totalChunks
        session.expectedChunks += chunk.totalChunks
      }

      // Record received chunk
      await this.recordReceivedChunk(chunk)

      // Update progress
      const progress = session.expectedChunks > 0
        ? (session.receivedChunks / session.expectedChunks) * 50 // 50% for receiving
        : 0

      await this.updateSessionProgress(
        session,
        progress,
        `Received ${session.receivedChunks}/${session.expectedChunks} chunks`
      )

      this.emit('chunk_received', { sessionId: chunk.sessionId, chunkId: chunk.chunkId })

      // Check if all chunks received
      if (session.receivedChunks >= session.expectedChunks && session.expectedChunks > 0) {
        session.status = 'PROCESSING'
        await this.updateSessionProgress(session, 50, 'All chunks received, starting processing')
      }

      return true

    } catch (error) {
      console.error('Failed to receive chunk:', error)
      await this.handleChunkError(chunk.sessionId, error)
      return false
    }
  }

  /**
   * Validate transfer completion
   */
  async validateTransfer(
    sessionId: string,
    expectedChecksum: string,
    expectedRecordCount: number
  ): Promise<{ valid: boolean; error?: string }> {
    try {
      const session = this.receptionSessions.get(sessionId)
      if (!session) {
        return { valid: false, error: 'Session not found' }
      }

      session.status = 'VALIDATING'
      await this.updateSessionProgress(session, 85, 'Validating received data')

      // Check record counts
      if (session.processedRecords !== expectedRecordCount) {
        return {
          valid: false,
          error: `Record count mismatch: expected ${expectedRecordCount}, got ${session.processedRecords}`
        }
      }

      // Calculate actual checksum
      const actualChecksum = await this.calculateReceivedDataChecksum(session)
      if (actualChecksum !== expectedChecksum) {
        return {
          valid: false,
          error: `Checksum mismatch: expected ${expectedChecksum}, got ${actualChecksum}`
        }
      }

      // Mark as completed
      session.status = 'COMPLETED'
      session.completedAt = new Date()
      await this.updateSessionProgress(session, 100, 'Transfer validation completed')

      await this.updateReceptionSession(session)
      this.cleanupSession(sessionId)

      this.emit('transfer_validated', session)
      return { valid: true }

    } catch (error) {
      console.error('Transfer validation failed:', error)
      return { valid: false, error: error instanceof Error ? error.message : 'Validation failed' }
    }
  }

  /**
   * Get active reception sessions
   */
  getActiveReceptionSessions(): ReceptionSession[] {
    return Array.from(this.receptionSessions.values())
  }

  /**
   * Get reception session by ID
   */
  getReceptionSession(sessionId: string): ReceptionSession | null {
    return this.receptionSessions.get(sessionId) || null
  }

  /**
   * Cancel reception session
   */
  async cancelReceptionSession(sessionId: string): Promise<boolean> {
    const session = this.receptionSessions.get(sessionId)
    if (!session) return false

    session.status = 'FAILED'
    session.completedAt = new Date()
    session.errorMessage = 'Reception cancelled'

    await this.updateReceptionSession(session)
    this.cleanupSession(sessionId)

    this.emit('reception_cancelled', session)
    return true
  }

  /**
   * Start chunk processing
   */
  private startChunkProcessing(): void {
    this.processingTimer = setInterval(async () => {
      await this.processBufferedChunks()
    }, this.BATCH_PROCESSING_INTERVAL)
  }

  /**
   * Process buffered chunks
   */
  private async processBufferedChunks(): Promise<void> {
    for (const [sessionId, session] of this.receptionSessions) {
      if (session.status === 'PROCESSING') {
        await this.processSessionChunks(sessionId, session)
      }
    }
  }

  /**
   * Process chunks for a specific session
   */
  private async processSessionChunks(sessionId: string, session: ReceptionSession): Promise<void> {
    const sessionBuffer = this.chunkBuffer.get(sessionId)
    if (!sessionBuffer) return

    try {
      // Group chunks by table and sort by sequence
      const tableChunks = new Map<string, TransferChunk[]>()

      for (const chunk of sessionBuffer.values()) {
        if (!tableChunks.has(chunk.tableName)) {
          tableChunks.set(chunk.tableName, [])
        }
        tableChunks.get(chunk.tableName)!.push(chunk)
      }

      // Process each table
      for (const [tableName, chunks] of tableChunks) {
        const tableStatus = session.tableStatus.get(tableName)!

        // Sort chunks by sequence number
        chunks.sort((a, b) => a.sequenceNumber - b.sequenceNumber)

        // Process chunks in order
        for (const chunk of chunks) {
          if (tableStatus.processedChunks <= chunk.sequenceNumber) {
            await this.processChunk(chunk, session)
            tableStatus.processedChunks++
            session.processedChunks++
            session.processedRecords += chunk.data.length

            // Remove processed chunk from buffer
            sessionBuffer.delete(chunk.chunkId)
          }
        }

        // Check if table is complete
        if (tableStatus.processedChunks >= tableStatus.expectedChunks && tableStatus.expectedChunks > 0) {
          tableStatus.isComplete = true
        }
      }

      // Update progress
      const progress = session.expectedChunks > 0
        ? 50 + (session.processedChunks / session.expectedChunks) * 35 // 35% for processing
        : 50

      await this.updateSessionProgress(
        session,
        progress,
        `Processed ${session.processedChunks}/${session.expectedChunks} chunks`
      )

      // Check if all processing complete
      const allTablesComplete = Array.from(session.tableStatus.values()).every(status => status.isComplete)
      if (allTablesComplete) {
        session.status = 'VALIDATING'
        await this.updateSessionProgress(session, 85, 'Processing complete, ready for validation')
      }

    } catch (error) {
      console.error(`Failed to process chunks for session ${sessionId}:`, error)
      await this.handleSessionError(sessionId, error)
    }
  }

  /**
   * Process single chunk
   */
  private async processChunk(chunk: TransferChunk, session: ReceptionSession): Promise<void> {
    try {
      // Decrypt if needed
      let data = chunk.data
      if (chunk.isEncrypted) {
        data = await this.decryptChunkData(data)
      }

      // Insert data into database
      await this.insertChunkData(chunk.tableName, data)

      this.emit('chunk_processed', { sessionId: session.sessionId, chunkId: chunk.chunkId })

    } catch (error) {
      console.error(`Failed to process chunk ${chunk.chunkId}:`, error)
      throw error
    }
  }

  /**
   * Insert chunk data into database
   */
  private async insertChunkData(tableName: string, data: any[]): Promise<void> {
    if (data.length === 0) return

    try {
      // Use upsert strategy to handle potential duplicates
      for (const record of data) {
        await this.upsertRecord(tableName, record)
      }

    } catch (error) {
      console.error(`Failed to insert data into table ${tableName}:`, error)
      throw error
    }
  }

  /**
   * Upsert single record
   */
  private async upsertRecord(tableName: string, record: any): Promise<void> {
    try {
      // Remove any null or undefined fields
      const cleanRecord = Object.fromEntries(
        Object.entries(record).filter(([_, value]) => value !== null && value !== undefined)
      )

      // Use raw query for flexibility
      const fields = Object.keys(cleanRecord)
      const values = fields.map(field => cleanRecord[field])
      const placeholders = fields.map((_, index) => `$${index + 1}`).join(', ')

      const query = `
        INSERT INTO "${tableName}" (${fields.map(f => `"${f}"`).join(', ')})
        VALUES (${placeholders})
        ON CONFLICT (id) DO UPDATE SET
        ${fields.filter(f => f !== 'id').map(f => `"${f}" = EXCLUDED."${f}"`).join(', ')}
      `

      await this.prisma.$executeRawUnsafe(query, ...values)

    } catch (error) {
      console.error(`Failed to upsert record in table ${tableName}:`, error)
      throw error
    }
  }

  /**
   * Validate chunk
   */
  private async validateChunk(chunk: TransferChunk): Promise<void> {
    // Verify checksum
    const calculatedChecksum = this.calculateDataChecksum(chunk.data)
    if (calculatedChecksum !== chunk.checksum) {
      throw new Error(`Chunk checksum mismatch: ${chunk.chunkId}`)
    }

    // Check chunk size limits
    const chunkSize = JSON.stringify(chunk.data).length
    if (chunkSize > 10 * 1024 * 1024) { // 10MB limit
      throw new Error(`Chunk too large: ${chunk.chunkId}`)
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
   * Decrypt chunk data
   */
  private async decryptChunkData(encryptedData: any[]): Promise<any[]> {
    // TODO: Implement actual decryption using registration key
    // For now, return data as-is
    return encryptedData
  }

  /**
   * Calculate received data checksum
   */
  private async calculateReceivedDataChecksum(session: ReceptionSession): Promise<string> {
    const crypto = require('crypto')
    const hash = crypto.createHash('sha256')

    // Calculate checksum based on processed record counts per table
    for (const [tableName, status] of session.tableStatus) {
      if (status.isComplete) {
        hash.update(`${tableName}:${status.processedChunks}`)
      }
    }

    return hash.digest('hex')
  }

  /**
   * Update session progress
   */
  private async updateSessionProgress(session: ReceptionSession, progress: number, step: string): Promise<void> {
    session.progress = Math.min(100, Math.max(0, progress))
    session.currentStep = step

    await this.updateReceptionSession(session)
    this.emit('reception_progress', { sessionId: session.sessionId, progress, step })
  }

  /**
   * Handle chunk error
   */
  private async handleChunkError(sessionId: string, error: any): Promise<void> {
    const session = this.receptionSessions.get(sessionId)
    if (session) {
      session.status = 'FAILED'
      session.completedAt = new Date()
      session.errorMessage = error instanceof Error ? error.message : 'Chunk processing failed'

      await this.updateReceptionSession(session)
      this.cleanupSession(sessionId)

      this.emit('reception_failed', { session, error })
    }
  }

  /**
   * Handle session error
   */
  private async handleSessionError(sessionId: string, error: any): Promise<void> {
    const session = this.receptionSessions.get(sessionId)
    if (session) {
      session.status = 'FAILED'
      session.completedAt = new Date()
      session.errorMessage = error instanceof Error ? error.message : 'Session processing failed'

      await this.updateReceptionSession(session)
      this.cleanupSession(sessionId)

      this.emit('reception_failed', { session, error })
    }
  }

  /**
   * Cleanup session
   */
  private cleanupSession(sessionId: string): void {
    this.receptionSessions.delete(sessionId)
    this.chunkBuffer.delete(sessionId)
  }

  /**
   * Load active reception sessions
   */
  private async loadActiveReceptionSessions(): Promise<void> {
    // Implementation would load from database if sessions were persisted
    // For now, start with empty state
  }

  /**
   * Record received chunk
   */
  private async recordReceivedChunk(chunk: TransferChunk): Promise<void> {
    try {
      await this.prisma.receivedChunk.create({
        data: {
          chunkId: chunk.chunkId,
          sessionId: chunk.sessionId,
          tableName: chunk.tableName,
          sequenceNumber: chunk.sequenceNumber,
          totalChunks: chunk.totalChunks,
          receivedAt: new Date(),
          isProcessed: false,
          checksum: chunk.checksum,
          recordCount: chunk.data.length
        }
      })
    } catch (error) {
      console.error('Failed to record received chunk:', error)
    }
  }

  /**
   * Create reception session in database
   */
  private async createReceptionSession(session: ReceptionSession): Promise<void> {
    // Would implement database storage if needed
  }

  /**
   * Update reception session in database
   */
  private async updateReceptionSession(session: ReceptionSession): Promise<void> {
    // Would implement database storage if needed
  }
}

/**
 * Create initial load receiver
 */
export function createInitialLoadReceiver(
  prisma: PrismaClient,
  nodeId: string,
  registrationKey: string
): InitialLoadReceiver {
  return new InitialLoadReceiver(prisma, nodeId, registrationKey)
}