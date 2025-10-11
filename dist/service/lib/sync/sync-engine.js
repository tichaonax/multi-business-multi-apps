"use strict";
/**
 * Bidirectional Sync Engine
 * Handles data replication between peer nodes with conflict resolution
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SyncEngine = void 0;
const events_1 = require("events");
const change_tracker_1 = require("./change-tracker");
const sync_utils_1 = require("./sync-utils");
const crypto_1 = require("crypto");
/**
 * Bidirectional Sync Engine
 * Manages data synchronization between peer nodes
 */
class SyncEngine extends events_1.EventEmitter {
    constructor(prisma, peerDiscovery, options) {
        super();
        this.activeSessions = new Map();
        this.syncTimer = null;
        this.isRunning = false;
        this.prisma = prisma;
        this.peerDiscovery = peerDiscovery;
        this.options = {
            syncInterval: 30000, // 30 seconds
            batchSize: 50,
            retryAttempts: 3,
            compressionEnabled: true,
            encryptionEnabled: true,
            ...options
        };
        this.changeTracker = (0, change_tracker_1.getChangeTracker)(prisma, options.nodeId, options.registrationKey);
        this.syncUtils = new sync_utils_1.SyncUtils(prisma, options.nodeId);
        // Listen for peer discovery events
        this.peerDiscovery.on('peer_discovered', this.handlePeerDiscovered.bind(this));
        this.peerDiscovery.on('peer_left', this.handlePeerLeft.bind(this));
    }
    /**
     * Start the sync engine
     */
    async start() {
        if (this.isRunning) {
            return;
        }
        try {
            // Start periodic sync
            this.startPeriodicSync();
            this.isRunning = true;
            this.emit('started');
            console.log('✅ Sync engine started');
        }
        catch (error) {
            console.error('❌ Failed to start sync engine:', error);
            throw error;
        }
    }
    /**
     * Stop the sync engine
     */
    async stop() {
        if (!this.isRunning) {
            return;
        }
        try {
            // Stop periodic sync
            if (this.syncTimer) {
                clearInterval(this.syncTimer);
                this.syncTimer = null;
            }
            // Cancel active sessions
            for (const session of this.activeSessions.values()) {
                session.status = 'failed';
            }
            this.activeSessions.clear();
            this.isRunning = false;
            this.emit('stopped');
            console.log('✅ Sync engine stopped');
        }
        catch (error) {
            console.error('❌ Error stopping sync engine:', error);
        }
    }
    /**
     * Manually trigger sync with all peers
     */
    async syncWithAllPeers() {
        const peers = this.peerDiscovery.getDiscoveredPeers();
        for (const peer of peers) {
            try {
                await this.syncWithPeer(peer);
            }
            catch (error) {
                console.error(`Failed to sync with peer ${peer.nodeId}:`, error);
            }
        }
    }
    /**
     * Sync with a specific peer
     */
    async syncWithPeer(peer) {
        const sessionId = crypto_1.default.randomUUID();
        try {
            const session = {
                sessionId,
                targetNodeId: peer.nodeId,
                startTime: new Date(),
                status: 'active',
                eventsTransferred: 0,
                conflictsDetected: 0,
                lastActivity: new Date()
            };
            this.activeSessions.set(sessionId, session);
            this.emit('sync_started', { peer, session });
            // Step 1: Send our changes to peer
            const sentEvents = await this.sendChangesToPeer(peer, session);
            // Step 2: Request changes from peer
            const receivedEvents = await this.requestChangesFromPeer(peer, session);
            // Step 3: Record session completion
            await this.recordSyncSession(session);
            session.status = 'completed';
            this.activeSessions.delete(sessionId);
            this.emit('sync_completed', {
                peer,
                session,
                sentEvents,
                receivedEvents
            });
            console.log(`✅ Sync completed with ${peer.nodeName}: sent ${sentEvents}, received ${receivedEvents}`);
        }
        catch (error) {
            const session = this.activeSessions.get(sessionId);
            if (session) {
                session.status = 'failed';
                this.activeSessions.delete(sessionId);
            }
            this.emit('sync_failed', { peer, error });
            console.error(`❌ Sync failed with ${peer.nodeName}:`, error);
            throw error;
        }
    }
    /**
     * Send our changes to a peer
     */
    async sendChangesToPeer(peer, session) {
        try {
            // Get unprocessed events for this peer
            const events = await this.changeTracker.getUnprocessedEvents(this.options.batchSize);
            if (events.length === 0) {
                return 0;
            }
            // Prepare sync payload
            const payload = {
                type: 'sync_events',
                sessionId: session.sessionId,
                sourceNodeId: this.options.nodeId,
                events: events,
                timestamp: new Date().toISOString(),
                checksum: this.calculatePayloadChecksum(events)
            };
            // Compress if enabled
            let finalPayload = payload;
            if (this.options.compressionEnabled) {
                finalPayload = await this.compressPayload(payload);
            }
            // Encrypt if enabled
            if (this.options.encryptionEnabled) {
                finalPayload = await this.encryptPayload(finalPayload, this.options.registrationKey);
            }
            // Send to peer via HTTP
            const sent = await this.sendHttpRequest(peer, '/api/sync/receive', finalPayload);
            if (sent) {
                // Mark events as processed
                const eventIds = events.map(e => e.eventId);
                await this.changeTracker.markEventsProcessed(eventIds);
                session.eventsTransferred += events.length;
                session.lastActivity = new Date();
                // Record metrics
                await this.syncUtils.recordMetrics({
                    eventsGenerated: events.length,
                    dataTransferredBytes: BigInt(JSON.stringify(payload).length)
                });
            }
            return events.length;
        }
        catch (error) {
            console.error('Error sending changes to peer:', error);
            throw error;
        }
    }
    /**
     * Request changes from a peer
     */
    async requestChangesFromPeer(peer, session) {
        try {
            // Request changes since our last sync
            const requestPayload = {
                type: 'sync_request',
                sessionId: session.sessionId,
                requestorNodeId: this.options.nodeId,
                lastSyncTime: await this.getLastSyncTime(peer.nodeId),
                maxEvents: this.options.batchSize,
                timestamp: new Date().toISOString()
            };
            // Send request to peer
            const response = await this.sendHttpRequest(peer, '/api/sync/request', requestPayload);
            if (!response || !response.events) {
                return 0;
            }
            let receivedEvents = response.events;
            // Decrypt if needed
            if (this.options.encryptionEnabled) {
                receivedEvents = await this.decryptPayload(receivedEvents, this.options.registrationKey);
            }
            // Decompress if needed
            if (this.options.compressionEnabled) {
                receivedEvents = await this.decompressPayload(receivedEvents);
            }
            // Process received events
            let processedCount = 0;
            for (const event of receivedEvents) {
                try {
                    // Verify registration key
                    if (!this.verifyEventAuth(event)) {
                        console.warn(`Rejected unauthorized event from ${event.sourceNodeId}`);
                        continue;
                    }
                    // Check for conflicts
                    const conflictResult = await this.syncUtils.detectConflicts(event);
                    if (conflictResult.hasConflict) {
                        await this.handleConflict(conflictResult, session);
                        session.conflictsDetected++;
                    }
                    else {
                        // Apply the event
                        const applied = await this.syncUtils.applySyncEvent(event);
                        if (applied) {
                            processedCount++;
                        }
                    }
                    // Update vector clock
                    this.changeTracker.mergeVectorClock(event.vectorClock);
                }
                catch (error) {
                    console.error('Error processing sync event:', error);
                }
            }
            session.eventsTransferred += processedCount;
            session.lastActivity = new Date();
            // Record metrics
            await this.syncUtils.recordMetrics({
                eventsReceived: receivedEvents.length,
                eventsProcessed: processedCount,
                conflictsDetected: session.conflictsDetected
            });
            return processedCount;
        }
        catch (error) {
            console.error('Error requesting changes from peer:', error);
            throw error;
        }
    }
    /**
     * Handle sync conflicts
     */
    async handleConflict(conflictResult, session) {
        try {
            // Record the conflict
            await this.prisma.conflictResolution.create({
                data: {
                    conflictType: conflictResult.conflictType,
                    tableName: conflictResult.winningEvent.tableName,
                    recordId: conflictResult.winningEvent.recordId,
                    winningEventId: conflictResult.winningEvent.eventId,
                    losingEventIds: conflictResult.losingEvents.map((e) => e.eventId),
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
            });
            // Apply the winning event
            await this.syncUtils.applySyncEvent(conflictResult.winningEvent);
            this.emit('conflict_resolved', {
                conflict: conflictResult,
                session
            });
        }
        catch (error) {
            console.error('Error handling conflict:', error);
            throw error;
        }
    }
    /**
     * Start periodic sync with all discovered peers
     */
    startPeriodicSync() {
        this.syncTimer = setInterval(async () => {
            try {
                await this.syncWithAllPeers();
            }
            catch (error) {
                console.error('Error in periodic sync:', error);
            }
        }, this.options.syncInterval);
    }
    /**
     * Handle new peer discovery
     */
    handlePeerDiscovered(peer) {
        console.log(`🔗 New peer discovered: ${peer.nodeName}, initiating sync...`);
        // Immediately sync with new peer
        this.syncWithPeer(peer).catch(error => {
            console.error(`Failed initial sync with ${peer.nodeName}:`, error);
        });
    }
    /**
     * Handle peer leaving
     */
    handlePeerLeft(peer) {
        console.log(`📤 Peer left: ${peer.nodeName}`);
        // Cancel any active sessions with this peer
        for (const [sessionId, session] of this.activeSessions.entries()) {
            if (session.targetNodeId === peer.nodeId) {
                session.status = 'failed';
                this.activeSessions.delete(sessionId);
            }
        }
    }
    /**
     * Send HTTP request to peer
     */
    async sendHttpRequest(peer, endpoint, payload) {
        try {
            const url = `http://${peer.ipAddress}:${peer.port}${endpoint}`;
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Node-ID': this.options.nodeId,
                    'X-Registration-Hash': crypto_1.default.createHash('sha256')
                        .update(this.options.registrationKey)
                        .digest('hex')
                },
                body: JSON.stringify(payload),
                timeout: 30000 // 30 second timeout
            });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return await response.json();
        }
        catch (error) {
            console.error(`HTTP request failed to ${peer.ipAddress}:${peer.port}${endpoint}:`, error);
            throw error;
        }
    }
    /**
     * Calculate payload checksum
     */
    calculatePayloadChecksum(events) {
        const payloadString = JSON.stringify(events.map(e => e.eventId).sort());
        return crypto_1.default.createHash('sha256').update(payloadString).digest('hex');
    }
    /**
     * Compress payload
     */
    async compressPayload(payload) {
        // TODO: Implement compression using zlib
        return payload;
    }
    /**
     * Decompress payload
     */
    async decompressPayload(payload) {
        // TODO: Implement decompression using zlib
        return payload;
    }
    /**
     * Encrypt payload
     */
    async encryptPayload(payload, key) {
        // TODO: Implement AES encryption
        return payload;
    }
    /**
     * Decrypt payload
     */
    async decryptPayload(payload, key) {
        // TODO: Implement AES decryption
        return payload;
    }
    /**
     * Verify event authentication
     */
    verifyEventAuth(event) {
        if (!event.metadata?.registrationKeyHash) {
            return false;
        }
        const expectedHash = crypto_1.default.createHash('sha256')
            .update(this.options.registrationKey + event.sourceNodeId)
            .digest('hex');
        return event.metadata.registrationKeyHash === expectedHash;
    }
    /**
     * Get last sync time with a peer
     */
    async getLastSyncTime(peerNodeId) {
        try {
            const lastSession = await this.prisma.syncSession.findFirst({
                where: {
                    OR: [
                        { initiatorNodeId: this.options.nodeId },
                        { participantNodes: { has: this.options.nodeId } }
                    ],
                    participantNodes: { has: peerNodeId },
                    status: 'COMPLETED'
                },
                orderBy: { endTime: 'desc' }
            });
            return lastSession?.endTime || null;
        }
        catch (error) {
            console.warn('Failed to get last sync time:', error);
            return null;
        }
    }
    /**
     * Record completed sync session
     */
    async recordSyncSession(session) {
        try {
            await this.prisma.syncSession.create({
                data: {
                    sessionId: session.sessionId,
                    initiatorNodeId: this.options.nodeId,
                    participantNodes: [this.options.nodeId, session.targetNodeId],
                    sessionType: 'INCREMENTAL',
                    status: session.status === 'completed' ? 'COMPLETED' : 'FAILED',
                    startTime: session.startTime,
                    endTime: new Date(),
                    eventsTransferred: session.eventsTransferred,
                    conflictsDetected: session.conflictsDetected,
                    conflictsResolved: session.conflictsDetected, // Auto-resolved
                    lastActivity: session.lastActivity
                }
            });
        }
        catch (error) {
            console.warn('Failed to record sync session:', error);
        }
    }
    /**
     * Get active sync sessions
     */
    getActiveSessions() {
        return Array.from(this.activeSessions.values());
    }
    /**
     * Get sync statistics
     */
    async getSyncStats() {
        return this.syncUtils.getSyncStats();
    }
}
exports.SyncEngine = SyncEngine;
