"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SyncEngine = void 0;
exports.createSyncEngine = createSyncEngine;
const events_1 = require("events");
const change_tracker_1 = require("./change-tracker");
const sync_utils_1 = require("./sync-utils");
const crypto_1 = __importDefault(require("crypto"));
class SyncEngine extends events_1.EventEmitter {
    constructor(prisma, peerDiscovery, options) {
        super();
        this.activeSessions = new Map();
        this.syncTimer = null;
        this.isRunning = false;
        this.prisma = prisma;
        this.peerDiscovery = peerDiscovery;
        this.options = Object.assign({
            syncInterval: 30000,
            batchSize: 50,
            retryAttempts: 3,
            compressionEnabled: true,
            encryptionEnabled: true
        }, options);
        this.changeTracker = (0, change_tracker_1.getChangeTracker)(prisma, options.nodeId, options.registrationKey);
        this.syncUtils = new sync_utils_1.SyncUtils(prisma, options.nodeId);
        if (!this.options.nodeId)
            this.options.nodeId = options.nodeId;
        if (!this.options.registrationKey)
            this.options.registrationKey = options.registrationKey;
        this.peerDiscovery.on('peer_discovered', this.handlePeerDiscovered.bind(this));
        this.peerDiscovery.on('peer_left', this.handlePeerLeft.bind(this));
    }
    async start() {
        if (this.isRunning) {
            return;
        }
        try {
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
    async stop() {
        if (!this.isRunning) {
            return;
        }
        try {
            if (this.syncTimer) {
                clearInterval(this.syncTimer);
                this.syncTimer = null;
            }
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
            const sentEvents = await this.sendChangesToPeer(peer, session);
            const receivedEvents = await this.requestChangesFromPeer(peer, session);
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
    async sendChangesToPeer(peer, session) {
        try {
            const events = await this.changeTracker.getUnprocessedEvents(this.options.batchSize);
            if (events.length === 0) {
                return 0;
            }
            const payload = {
                type: 'sync_events',
                sessionId: session.sessionId,
                sourceNodeId: this.options.nodeId,
                events: events,
                timestamp: new Date().toISOString(),
                checksum: this.calculatePayloadChecksum(events)
            };
            let finalPayload = payload;
            if (this.options.compressionEnabled) {
                finalPayload = await this.compressPayload(payload);
            }
            if (this.options.encryptionEnabled) {
                finalPayload = await this.encryptPayload(finalPayload, this.options.registrationKey);
            }
            const sent = await this.sendHttpRequest(peer, '/api/sync/receive', finalPayload);
            if (sent) {
                const eventIds = events.map((e) => e.eventId);
                await this.changeTracker.markEventsProcessed(eventIds);
                session.eventsTransferred += events.length;
                session.lastActivity = new Date();
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
    async requestChangesFromPeer(peer, session) {
        try {
            const requestPayload = {
                type: 'sync_request',
                sessionId: session.sessionId,
                sourceNodeId: this.options.nodeId,
                lastSyncTime: await this.getLastSyncTime(peer.nodeId),
                maxEvents: this.options.batchSize,
                timestamp: new Date().toISOString()
            };
            const response = await this.sendHttpRequest(peer, '/api/sync/request', requestPayload);
            if (!response || !response.events) {
                return 0;
            }
            let receivedEvents = response.events;
            if (this.options.encryptionEnabled) {
                receivedEvents = await this.decryptPayload(receivedEvents, this.options.registrationKey);
            }
            if (this.options.compressionEnabled) {
                receivedEvents = await this.decompressPayload(receivedEvents);
            }
            let processedCount = 0;
            for (const event of receivedEvents) {
                try {
                    if (!this.verifyEventAuth(event)) {
                        console.warn(`Rejected unauthorized event from ${event.sourceNodeId}`);
                        continue;
                    }
                    const conflictResult = await this.syncUtils.detectConflicts(event);
                    if (conflictResult.hasConflict) {
                        await this.handleConflict(conflictResult, session);
                        session.conflictsDetected++;
                    }
                    else {
                        const applied = await this.syncUtils.applySyncEvent(event);
                        if (applied) {
                            processedCount++;
                        }
                    }
                    this.changeTracker.mergeVectorClock(event.vectorClock);
                }
                catch (error) {
                    console.error('Error processing sync event:', error);
                }
            }
            session.eventsTransferred += processedCount;
            session.lastActivity = new Date();
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
    async handleConflict(conflictResult, session) {
        try {
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
    handlePeerDiscovered(peer) {
        console.log(`🔗 New peer discovered: ${peer.nodeName}, initiating sync...`);
        this.syncWithPeer(peer).catch(error => {
            console.error(`Failed initial sync with ${peer.nodeName}:`, error);
        });
    }
    handlePeerLeft(peer) {
        console.log(`📤 Peer left: ${peer.nodeName}`);
        for (const [sessionId, session] of this.activeSessions.entries()) {
            if (session.targetNodeId === peer.nodeId) {
                session.status = 'failed';
                this.activeSessions.delete(sessionId);
            }
        }
    }
    async sendHttpRequest(peer, endpoint, payload) {
        try {
            const url = `http://${peer.ipAddress}:${peer.port}${endpoint}`;
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000);
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
                signal: controller.signal
            });
            clearTimeout(timeoutId);
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
    calculatePayloadChecksum(events) {
        const payloadString = JSON.stringify(events.map(e => e.eventId).sort());
        return crypto_1.default.createHash('sha256').update(payloadString).digest('hex');
    }
    async compressPayload(payload) {
        return payload;
    }
    async decompressPayload(payload) {
        return payload;
    }
    async encryptPayload(payload, key) {
        return payload;
    }
    async decryptPayload(payload, key) {
        return payload;
    }
    verifyEventAuth(event) {
        if (!event.metadata?.registrationKeyHash) {
            return false;
        }
        const expectedHash = crypto_1.default.createHash('sha256')
            .update(this.options.registrationKey + event.sourceNodeId)
            .digest('hex');
        return event.metadata.registrationKeyHash === expectedHash;
    }
    async getLastSyncTime(peerNodeId) {
        try {
            const lastSession = await this.prisma.syncSession.findFirst({
                where: {
                    sourceNodeId: this.options.nodeId,
                    targetNodeId: peerNodeId,
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
    async recordSyncSession(session) {
        try {
            await this.prisma.syncSession.create({
                data: {
                    id: crypto_1.default.randomUUID(),
                    sessionId: session.sessionId,
                    sourceNodeId: this.options.nodeId,
                    targetNodeId: session.targetNodeId,
                    status: session.status === 'completed' ? 'COMPLETED' : 'FAILED',
                    startedAt: session.startTime,
                    endedAt: new Date(),
                    endTime: new Date(),
                    metadata: {
                        eventsTransferred: session.eventsTransferred,
                        conflictsDetected: session.conflictsDetected,
                        conflictsResolved: session.conflictsResolved || session.conflictsDetected,
                        lastActivity: session.lastActivity
                    }
                }
            });
        }
        catch (error) {
            console.warn('Failed to record sync session:', error);
        }
    }
    getActiveSessions() {
        return Array.from(this.activeSessions.values());
    }
    async getSyncStats() {
        return this.syncUtils.getSyncStats();
    }
}
exports.SyncEngine = SyncEngine;
function createSyncEngine(prisma, peerDiscovery, options) {
    return new SyncEngine(prisma, peerDiscovery, options);
}
