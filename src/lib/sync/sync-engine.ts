/**
 * Bidirectional Sync Engine
 * Handles data replication between peer nodes with conflict resolution
 */

import { EventEmitter } from 'events'
import { PrismaClient } from '@prisma/client'
import { ChangeEvent, getChangeTracker } from './change-tracker'
import { SyncUtils } from './sync-utils'
import { PeerDiscoveryService, PeerInfo } from './peer-discovery'
import crypto from 'crypto'

export interface SyncEngineOptions {
  nodeId: string
  registrationKey: string
  httpPort?: number // Port for HTTP sync API calls
  syncInterval: number // milliseconds
  batchSize: number
  retryAttempts: number
  compressionEnabled: boolean
  encryptionEnabled: boolean
}

export interface SyncSession {
  sessionId: string
  targetNodeId: string
  startTime: Date
  status: 'active' | 'completed' | 'failed'
  eventsTransferred: number
  conflictsDetected: number
  lastActivity: Date
}

/**
 * Bidirectional Sync Engine
 * Manages data synchronization between peer nodes
 */
export class SyncEngine extends EventEmitter {
  private prisma: PrismaClient
  private options: SyncEngineOptions
  private peerDiscovery: PeerDiscoveryService
  private changeTracker: any
  private syncUtils: SyncUtils
  private activeSessions = new Map<string, SyncSession>()
  private syncTimer: NodeJS.Timeout | null = null
  private isRunning = false

  constructor(
    prisma: PrismaClient,
    peerDiscovery: PeerDiscoveryService,
    options: SyncEngineOptions
  ) {
    super()
    this.prisma = prisma
    this.peerDiscovery = peerDiscovery
    this.options = Object.assign({
      syncInterval: 30000, // 30 seconds
      batchSize: 50,
      retryAttempts: 3,
      compressionEnabled: true,
      encryptionEnabled: true
    }, options)

    this.changeTracker = getChangeTracker(prisma, options.nodeId, options.registrationKey)
    this.syncUtils = new SyncUtils(prisma, options.nodeId)
  // Ensure options.nodeId exists on merged options
  if (!this.options.nodeId) this.options.nodeId = options.nodeId
  if (!this.options.registrationKey) this.options.registrationKey = options.registrationKey

    // Listen for peer discovery events
    this.peerDiscovery.on('peer_discovered', this.handlePeerDiscovered.bind(this))
    this.peerDiscovery.on('peer_left', this.handlePeerLeft.bind(this))
  }

  /**
   * Start the sync engine
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      return
    }

    try {
      // Start periodic sync
      this.startPeriodicSync()

      this.isRunning = true
      this.emit('started')

      console.log('✅ Sync engine started')
    } catch (error) {
      console.error('❌ Failed to start sync engine:', error)
      throw error
    }
  }

  /**
   * Stop the sync engine
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return
    }

    try {
      // Stop periodic sync
      if (this.syncTimer) {
        clearInterval(this.syncTimer)
        this.syncTimer = null
      }

      // Cancel active sessions
      for (const session of this.activeSessions.values()) {
        session.status = 'failed'
      }
      this.activeSessions.clear()

      this.isRunning = false
      this.emit('stopped')

      console.log('✅ Sync engine stopped')
    } catch (error) {
      console.error('❌ Error stopping sync engine:', error)
    }
  }

  /**
   * Manually trigger sync with all peers
   */
  async syncWithAllPeers(): Promise<void> {
    const peers = this.peerDiscovery.getDiscoveredPeers()

    for (const peer of peers) {
      try {
        await this.syncWithPeer(peer)
      } catch (error) {
        console.error(`Failed to sync with peer ${peer.nodeId}:`, error)
      }
    }
  }

  /**
   * Sync with a specific peer
   */
  async syncWithPeer(peer: PeerInfo): Promise<void> {
    const sessionId = crypto.randomUUID()

    try {
      const session: SyncSession = {
        sessionId,
        targetNodeId: peer.nodeId,
        startTime: new Date(),
        status: 'active',
        eventsTransferred: 0,
        conflictsDetected: 0,
        lastActivity: new Date()
      }

      this.activeSessions.set(sessionId, session)
      this.emit('sync_started', { peer, session })

      // Step 1: Send our changes to peer
      const sentEvents = await this.sendChangesToPeer(peer, session)

      // Step 2: Request changes from peer
      const receivedEvents = await this.requestChangesFromPeer(peer, session)

      // Step 3: Record session completion
      await this.recordSyncSession(session)

      session.status = 'completed'
      this.activeSessions.delete(sessionId)

      this.emit('sync_completed', {
        peer,
        session,
        sentEvents,
        receivedEvents
      })

      console.log(`✅ Sync completed with ${peer.nodeName}: sent ${sentEvents}, received ${receivedEvents}`)

    } catch (error) {
      const session = this.activeSessions.get(sessionId)
      if (session) {
        session.status = 'failed'
        this.activeSessions.delete(sessionId)
      }

      this.emit('sync_failed', { peer, error })
      console.error(`❌ Sync failed with ${peer.nodeName}:`, error)
      throw error
    }
  }

  /**
   * Send our changes to a peer
   */
  private async sendChangesToPeer(peer: PeerInfo, session: SyncSession): Promise<number> {
    try {
      // Get unprocessed events for this peer
      const events = await this.changeTracker.getUnprocessedEvents(this.options.batchSize)

      if (events.length === 0) {
        return 0
      }

      // Prepare sync payload
      const payload = {
        type: 'sync_events',
        sessionId: session.sessionId,
        sourceNodeId: this.options.nodeId,
        events: events,
        timestamp: new Date().toISOString(),
        checksum: this.calculatePayloadChecksum(events)
      }

      // Compress if enabled
      let finalPayload = payload
      if (this.options.compressionEnabled) {
        finalPayload = await this.compressPayload(payload)
      }

      // Encrypt if enabled
      if (this.options.encryptionEnabled) {
        finalPayload = await this.encryptPayload(finalPayload, this.options.registrationKey)
      }

      // Send to peer via HTTP
      const sent = await this.sendHttpRequest(peer, '/api/sync/receive', finalPayload)

      if (sent) {
        // Mark events as processed
  const eventIds = events.map((e: any) => e.eventId)
        await this.changeTracker.markEventsProcessed(eventIds)

        session.eventsTransferred += events.length
        session.lastActivity = new Date()

        // Record metrics
        await this.syncUtils.recordMetrics({
          eventsGenerated: events.length,
          dataTransferredBytes: BigInt(JSON.stringify(payload).length)
        })
      }

      return events.length
    } catch (error) {
      console.error('Error sending changes to peer:', error)
      throw error
    }
  }

  /**
   * Request changes from a peer
   */
  private async requestChangesFromPeer(peer: PeerInfo, session: SyncSession): Promise<number> {
    try {
      // Request changes since our last sync
      const requestPayload = {
        type: 'sync_request',
        sessionId: session.sessionId,
        sourceNodeId: this.options.nodeId,
        lastSyncTime: await this.getLastSyncTime(peer.nodeId),
        maxEvents: this.options.batchSize,
        timestamp: new Date().toISOString()
      }

      // Send request to peer
      const response = await this.sendHttpRequest(peer, '/api/sync/request', requestPayload)

      if (!response || !response.events) {
        return 0
      }

      let receivedEvents = response.events as ChangeEvent[]

      // Decrypt if needed
      if (this.options.encryptionEnabled) {
        receivedEvents = await this.decryptPayload(receivedEvents, this.options.registrationKey)
      }

      // Decompress if needed
      if (this.options.compressionEnabled) {
        receivedEvents = await this.decompressPayload(receivedEvents)
      }

      // Process received events
      let processedCount = 0
      for (const event of receivedEvents) {
        try {
          // Verify registration key
          if (!this.verifyEventAuth(event)) {
            console.warn(`Rejected unauthorized event from ${event.sourceNodeId}`)
            continue
          }

          // Check for conflicts
          const conflictResult = await this.syncUtils.detectConflicts(event)

          if (conflictResult.hasConflict) {
            await this.handleConflict(conflictResult, session)
            session.conflictsDetected++
          } else {
            // Apply the event
            const applied = await this.syncUtils.applySyncEvent(event)
            if (applied) {
              processedCount++
            }
          }

          // Update vector clock
          this.changeTracker.mergeVectorClock(event.vectorClock)

        } catch (error) {
          console.error('Error processing sync event:', error)
        }
      }

      session.eventsTransferred += processedCount
      session.lastActivity = new Date()

      // Record metrics
      await this.syncUtils.recordMetrics({
        eventsReceived: receivedEvents.length,
        eventsProcessed: processedCount,
        conflictsDetected: session.conflictsDetected
      })

      return processedCount
    } catch (error) {
      console.error('Error requesting changes from peer:', error)
      throw error
    }
  }

  /**
   * Handle sync conflicts
   */
  private async handleConflict(
    conflictResult: any,
    session: SyncSession
  ): Promise<void> {
    try {
      // Record the conflict
      // Prisma types for conflictResolution may vary between deployments; cast to any to avoid strict typing errors here
      await (this.prisma.conflictResolution as any).create({
        data: {
          conflictType: conflictResult.conflictType,
          tableName: conflictResult.winningEvent.tableName,
          recordId: conflictResult.winningEvent.recordId,
          winningEventId: conflictResult.winningEvent.eventId,
          losingEventIds: conflictResult.losingEvents.map((e: any) => e.eventId),
          resolutionStrategy: conflictResult.resolutionStrategy,
          resolvedByNodeId: this.options.nodeId,
          resolutionData: conflictResult.winningEvent.changeData,
          autoResolved: true,
          conflictMetadata: {
            sessionId: session.sessionId,
            conflictTime: new Date().toISOString(),
            strategy: conflictResult.resolutionStrategy
          }
        }
      } as any)

      // Apply the winning event
      await this.syncUtils.applySyncEvent(conflictResult.winningEvent)

      this.emit('conflict_resolved', {
        conflict: conflictResult,
        session
      })

    } catch (error) {
      console.error('Error handling conflict:', error)
      throw error
    }
  }

  /**
   * Factory helper to create a SyncEngine instance (exported for tests and external callers)
   */
  // factory moved outside class to avoid being declared inside the class body

  /**
   * Start periodic sync with all discovered peers
   */
  private startPeriodicSync(): void {
    this.syncTimer = setInterval(async () => {
      try {
        await this.syncWithAllPeers()
      } catch (error) {
        console.error('Error in periodic sync:', error)
      }
    }, this.options.syncInterval)
  }

  /**
   * Handle new peer discovery
   */
  private handlePeerDiscovered(peer: PeerInfo): void {
    console.log(`🔗 New peer discovered: ${peer.nodeName}, initiating sync...`)

    // Immediately sync with new peer
    this.syncWithPeer(peer).catch(error => {
      console.error(`Failed initial sync with ${peer.nodeName}:`, error)
    })
  }

  /**
   * Handle peer leaving
   */
  private handlePeerLeft(peer: PeerInfo): void {
    console.log(`📤 Peer left: ${peer.nodeName}`)

    // Cancel any active sessions with this peer
    for (const [sessionId, session] of this.activeSessions.entries()) {
      if (session.targetNodeId === peer.nodeId) {
        session.status = 'failed'
        this.activeSessions.delete(sessionId)
      }
    }
  }

  /**
   * Send HTTP request to peer
   */
  private async sendHttpRequest(peer: PeerInfo, endpoint: string, payload: any): Promise<any> {
    try {
      // Use httpPort for API calls if configured, otherwise fall back to peer.port
      const port = this.options.httpPort || peer.port
      const url = `http://${peer.ipAddress}:${port}${endpoint}`

      // Create fetch with timeout using AbortController
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Node-ID': this.options.nodeId,
          'X-Registration-Hash': crypto.createHash('sha256')
            .update(this.options.registrationKey)
            .digest('hex')
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error(`HTTP request failed to ${peer.ipAddress}:${peer.port}${endpoint}:`, error)
      throw error
    }
  }

  /**
   * Calculate payload checksum
   */
  private calculatePayloadChecksum(events: ChangeEvent[]): string {
    const payloadString = JSON.stringify(events.map(e => e.eventId).sort())
    return crypto.createHash('sha256').update(payloadString).digest('hex')
  }

  /**
   * Compress payload
   */
  private async compressPayload(payload: any): Promise<any> {
    // TODO: Implement compression using zlib
    return payload
  }

  /**
   * Decompress payload
   */
  private async decompressPayload(payload: any): Promise<any> {
    // TODO: Implement decompression using zlib
    return payload
  }

  /**
   * Encrypt payload
   */
  private async encryptPayload(payload: any, key: string): Promise<any> {
    // TODO: Implement AES encryption
    return payload
  }

  /**
   * Decrypt payload
   */
  private async decryptPayload(payload: any, key: string): Promise<any> {
    // TODO: Implement AES decryption
    return payload
  }

  /**
   * Verify event authentication
   */
  private verifyEventAuth(event: ChangeEvent): boolean {
    if (!event.metadata?.registrationKeyHash) {
      return false
    }

    const expectedHash = crypto.createHash('sha256')
      .update(this.options.registrationKey + event.sourceNodeId)
      .digest('hex')

    return event.metadata.registrationKeyHash === expectedHash
  }

  /**
   * Get last sync time with a peer
   */
  private async getLastSyncTime(peerNodeId: string): Promise<Date | null> {
    try {
      const lastSession = await this.prisma.syncSessions.findFirst({
        where: {
          sourceNodeId: this.options.nodeId,
          targetNodeId: peerNodeId,
          status: 'COMPLETED'
        },
        orderBy: { endTime: 'desc' }
      })

      return lastSession?.endTime || null
    } catch (error) {
      console.warn('Failed to get last sync time:', error)
      return null
    }
  }

  /**
   * Record completed sync session
   */
  private async recordSyncSession(session: SyncSession): Promise<void> {
    try {
      await this.prisma.syncSessions.create({
        data: {
          id: crypto.randomUUID(),
          sessionId: session.sessionId,
          sourceNodeId: this.options.nodeId,
          targetNodeId: session.targetNodeId,
          status: session.status === 'completed' ? 'COMPLETED' : 'FAILED',
          startedAt: session.startTime,
          endedAt: new Date(),
          endTime: new Date(),
          // Persist extra session telemetry into the metadata JSON so schema stays stable
          metadata: {
            eventsTransferred: session.eventsTransferred,
            conflictsDetected: session.conflictsDetected,
            conflictsResolved: (session as any).conflictsResolved || session.conflictsDetected,
            lastActivity: session.lastActivity
          }
        }
      })
    } catch (error) {
      console.warn('Failed to record sync session:', error)
    }
  }

  /**
   * Get active sync sessions
   */
  getActiveSessions(): SyncSession[] {
    return Array.from(this.activeSessions.values())
  }

  /**
   * Get sync statistics
   */
  async getSyncStats(): Promise<any> {
    return this.syncUtils.getSyncStats()
  }
}

/**
 * Factory helper to create a SyncEngine instance (exported for tests and external callers)
 */
export function createSyncEngine(prisma: PrismaClient, peerDiscovery: any, options: SyncEngineOptions): SyncEngine {
  return new SyncEngine(prisma, peerDiscovery, options)
}
