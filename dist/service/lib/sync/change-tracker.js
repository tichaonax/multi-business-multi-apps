"use strict";
/**
 * Database Change Tracking System with Vector Clocks and Registration Key Security
 * Captures all database changes for peer-to-peer synchronization
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseChangeTracker = void 0;
exports.getChangeTracker = getChangeTracker;
const client_1 = require("@prisma/client");
const crypto_1 = require("crypto");
const uuid_1 = require("uuid");
class DatabaseChangeTracker {
    constructor(prisma, nodeId, registrationKey) {
        this.vectorClock = {};
        this.lamportClock = 0n;
        this.isEnabled = true;
        // Tables to exclude from sync (system tables)
        this.excludedTables = new Set([
            'accounts',
            'sessions',
            'verification_tokens',
            'audit_logs',
            'sync_nodes',
            'sync_events',
            'conflict_resolutions',
            'sync_sessions',
            'network_partitions',
            'sync_metrics',
            'sync_configurations'
        ]);
        this.prisma = prisma;
        this.nodeId = nodeId;
        // Ensure registrationKey is always a string to avoid runtime TypeErrors
        if (!registrationKey || typeof registrationKey !== 'string') {
            console.warn('ChangeTracker: registrationKey is missing or invalid; using empty key. Set SYNC_REGISTRATION_KEY to enable full security features.');
            this.registrationKey = '';
        }
        else {
            this.registrationKey = registrationKey;
        }
        // Detect whether the generated Prisma client exposes expected model methods
        try {
            // simple checks for a couple of core models
            // @ts-ignore - runtime check
            this['prismaReady'] = typeof this.prisma.syncConfiguration?.upsert === 'function' && typeof this.prisma.syncEvent?.create === 'function';
        }
        catch (e) {
            // @ts-ignore
            this['prismaReady'] = false;
        }
        // Warn once if prisma appears degraded
        // @ts-ignore
        if (!this['prismaReady']) {
            console.warn('⚠️ Prisma client does not expose expected model methods; database change tracking will be degraded.');
        }
        this.initializeVectorClock();
    }
    /**
     * Initialize vector clock with current node
     */
    async initializeVectorClock() {
        this.vectorClock[this.nodeId] = 0;
        // Load existing vector clock state from database
        try {
            const syncConfig = await this.prisma.syncConfiguration.findUnique({
                where: { nodeId: this.nodeId }
            });
            if (syncConfig?.configMetadata) {
                const metadata = syncConfig.configMetadata;
                if (metadata.vectorClock) {
                    this.vectorClock = { ...metadata.vectorClock };
                }
                if (metadata.lamportClock) {
                    this.lamportClock = BigInt(metadata.lamportClock);
                }
            }
        }
        catch (error) {
            console.warn('Failed to load vector clock state:', error);
        }
    }
    /**
     * Track a database change event
     */
    async trackChange(tableName, recordId, operation, changeData, beforeData, priority = 5, metadata) {
        if (!this.isEnabled || this.excludedTables.has(tableName)) {
            return '';
        }
        // Increment vector clock and Lamport clock
        this.vectorClock[this.nodeId] = (this.vectorClock[this.nodeId] || 0) + 1;
        this.lamportClock += 1n;
        const eventId = (0, uuid_1.v4)();
        const checksum = this.calculateChecksum(changeData);
        const changeEvent = {
            eventId,
            sourceNodeId: this.nodeId,
            tableName,
            recordId,
            operation,
            changeData,
            beforeData,
            vectorClock: { ...this.vectorClock },
            lamportClock: this.lamportClock,
            checksum,
            priority,
            metadata: {
                timestamp: new Date().toISOString(),
                nodeVersion: process.env.npm_package_version || '1.0.0',
                registrationKeyHash: this.hashRegistrationKey(),
                ...metadata
            }
        };
        try {
            // Store the sync event
            await this.prisma.syncEvent.create({
                data: {
                    eventId: changeEvent.eventId,
                    sourceNodeId: changeEvent.sourceNodeId,
                    tableName: changeEvent.tableName,
                    recordId: changeEvent.recordId,
                    operation: changeEvent.operation,
                    changeData: changeEvent.changeData,
                    beforeData: changeEvent.beforeData,
                    vectorClock: changeEvent.vectorClock,
                    lamportClock: BigInt(changeEvent.lamportClock),
                    checksum: changeEvent.checksum,
                    priority: changeEvent.priority,
                    metadata: changeEvent.metadata,
                    processed: false
                }
            });
            // Update vector clock state in configuration
            await this.updateVectorClockState();
            return eventId;
        }
        catch (error) {
            console.error('Failed to track change event:', error);
            throw error;
        }
    }
    /**
     * Track CREATE operation
     */
    async trackCreate(tableName, recordId, data, priority = 5) {
        return this.trackChange(tableName, recordId, client_1.SyncOperation.CREATE, data, undefined, priority);
    }
    /**
     * Track UPDATE operation
     */
    async trackUpdate(tableName, recordId, newData, oldData, priority = 5) {
        return this.trackChange(tableName, recordId, client_1.SyncOperation.UPDATE, newData, oldData, priority);
    }
    /**
     * Track DELETE operation
     */
    async trackDelete(tableName, recordId, deletedData, priority = 5) {
        return this.trackChange(tableName, recordId, client_1.SyncOperation.DELETE, {}, deletedData, priority);
    }
    /**
     * Merge vector clock from another node
     */
    mergeVectorClock(otherClock) {
        for (const [nodeId, timestamp] of Object.entries(otherClock)) {
            this.vectorClock[nodeId] = Math.max(this.vectorClock[nodeId] || 0, timestamp);
        }
        // Update Lamport clock to be greater than any seen timestamp
        const maxLamport = Math.max(...Object.values(this.vectorClock));
        this.lamportClock = BigInt(Math.max(Number(this.lamportClock), maxLamport + 1));
    }
    /**
     * Compare vector clocks for causality
     */
    compareVectorClocks(clockA, clockB) {
        let aBefore = true;
        let aAfter = true;
        const allNodes = new Set([...Object.keys(clockA), ...Object.keys(clockB)]);
        for (const nodeId of allNodes) {
            const a = clockA[nodeId] || 0;
            const b = clockB[nodeId] || 0;
            if (a > b)
                aBefore = false;
            if (a < b)
                aAfter = false;
        }
        if (aBefore && !aAfter)
            return 'before';
        if (aAfter && !aBefore)
            return 'after';
        return 'concurrent';
    }
    /**
     * Calculate data integrity checksum
     */
    calculateChecksum(data) {
        const dataString = JSON.stringify(data, Object.keys(data).sort());
        return crypto_1.default.createHash('sha256').update(dataString).digest('hex');
    }
    /**
     * Hash registration key for security verification
     */
    hashRegistrationKey() {
        // Guard against undefined registrationKey; use empty string when not provided.
        const key = this.registrationKey || '';
        return crypto_1.default.createHash('sha256').update(key + this.nodeId).digest('hex');
    }
    /**
     * Update vector clock state in database
     */
    async updateVectorClockState() {
        try {
            // If Prisma client is missing generated model methods, skip updates
            // to avoid runtime exceptions. This allows the service to run in a
            // degraded mode while we investigate Prisma generation issues.
            // @ts-ignore
            if (!this['prismaReady']) {
                console.warn('Skipping updateVectorClockState: Prisma client model methods unavailable');
                return;
            }
            await this.prisma.syncConfiguration.upsert({
                where: { nodeId: this.nodeId },
                update: {
                    lastConfigUpdate: new Date(),
                    configMetadata: {
                        vectorClock: this.vectorClock,
                        lamportClock: this.lamportClock.toString()
                    }
                },
                create: {
                    nodeId: this.nodeId,
                    registrationKeyHash: this.hashRegistrationKey(),
                    configMetadata: {
                        vectorClock: this.vectorClock,
                        lamportClock: this.lamportClock.toString()
                    }
                }
            });
        }
        catch (error) {
            console.warn('Failed to update vector clock state:', error);
        }
    }
    /**
     * Get unprocessed sync events for propagation
     */
    async getUnprocessedEvents(limit = 100) {
        // @ts-ignore
        if (!this['prismaReady']) {
            console.warn('getUnprocessedEvents: Prisma client model methods unavailable; returning empty list');
            return [];
        }
        const events = await this.prisma.syncEvent.findMany({
            where: {
                processed: false,
                sourceNodeId: this.nodeId
            },
            orderBy: [
                { priority: 'desc' },
                { lamportClock: 'asc' }
            ],
            take: limit
        });
        return events.map(event => ({
            eventId: event.eventId,
            sourceNodeId: event.sourceNodeId,
            tableName: event.tableName,
            recordId: event.recordId,
            operation: event.operation,
            changeData: event.changeData,
            beforeData: event.beforeData,
            vectorClock: event.vectorClock,
            lamportClock: event.lamportClock.toString(),
            checksum: event.checksum,
            priority: event.priority,
            metadata: event.metadata
        }));
    }
    /**
     * Mark events as processed
     */
    async markEventsProcessed(eventIds) {
        // @ts-ignore
        if (!this['prismaReady']) {
            console.warn('markEventsProcessed: Prisma client model methods unavailable; skipping');
            return;
        }
        await this.prisma.syncEvent.updateMany({
            where: {
                eventId: { in: eventIds }
            },
            data: {
                processed: true,
                processedAt: new Date()
            }
        });
    }
    /**
     * Enable/disable change tracking
     */
    setEnabled(enabled) {
        this.isEnabled = enabled;
    }
    /**
     * Get current vector clock
     */
    getVectorClock() {
        return { ...this.vectorClock };
    }
    /**
     * Get current Lamport clock
     */
    getLamportClock() {
        return this.lamportClock;
    }
    /**
     * Verify registration key hash matches
     */
    verifyRegistrationKey(providedHash) {
        return providedHash === this.hashRegistrationKey();
    }
    /**
     * Initialize node registration
     */
    async initializeNode(nodeName, ipAddress, port = 8765) {
        try {
            // @ts-ignore
            if (!this['prismaReady']) {
                console.warn('initializeNode: Prisma client model methods unavailable; skipping node registration');
                return;
            }
            await this.prisma.syncNode.upsert({
                where: { nodeId: this.nodeId },
                update: {
                    nodeName,
                    ipAddress,
                    port,
                    lastSeen: new Date(),
                    isActive: true,
                    nodeVersion: process.env.npm_package_version || '1.0.0',
                    databaseVersion: '1.0.0', // TODO: Get from schema version
                    platformInfo: {
                        platform: process.platform,
                        arch: process.arch,
                        nodeVersion: process.version
                    },
                    capabilities: {
                        compression: true,
                        encryption: true,
                        vectorClocks: true,
                        conflictResolution: true
                    }
                },
                create: {
                    nodeId: this.nodeId,
                    nodeName,
                    ipAddress,
                    port,
                    registrationKey: this.registrationKey,
                    publicKey: '', // TODO: Generate RSA key pair
                    isActive: true,
                    nodeVersion: process.env.npm_package_version || '1.0.0',
                    databaseVersion: '1.0.0',
                    platformInfo: {
                        platform: process.platform,
                        arch: process.arch,
                        nodeVersion: process.version
                    },
                    capabilities: {
                        compression: true,
                        encryption: true,
                        vectorClocks: true,
                        conflictResolution: true
                    }
                }
            });
        }
        catch (error) {
            console.error('Failed to initialize sync node:', error);
            throw error;
        }
    }
    /**
     * Submit an already-constructed ChangeEvent (used by offline queue when coming online)
     */
    async submitEvent(event) {
        // Ensure eventId exists
        const eventId = event.eventId || (0, uuid_1.v4)();
        // Compute checksum if missing
        const checksum = event.checksum || this.calculateChecksum(event.changeData);
        const metadata = {
            ...(event.metadata || {}),
            registrationKeyHash: this.hashRegistrationKey(),
            nodeVersion: process.env.npm_package_version || '1.0.0',
            timestamp: (event.metadata && event.metadata.timestamp) || new Date().toISOString()
        };
        try {
            await this.prisma.syncEvent.create({
                data: {
                    eventId,
                    sourceNodeId: event.sourceNodeId || this.nodeId,
                    tableName: event.tableName,
                    recordId: event.recordId,
                    operation: event.operation,
                    changeData: event.changeData,
                    beforeData: event.beforeData,
                    vectorClock: event.vectorClock,
                    lamportClock: event.lamportClock || this.lamportClock,
                    checksum,
                    priority: event.priority || 5,
                    metadata,
                    processed: false
                }
            });
            // If this event originated from this node, update our stored vector clock state
            if (event.sourceNodeId === this.nodeId) {
                await this.updateVectorClockState();
            }
            return eventId;
        }
        catch (error) {
            console.error('Failed to submit event:', error);
            throw error;
        }
    }
}
exports.DatabaseChangeTracker = DatabaseChangeTracker;
// Export singleton instance factory
let changeTrackerInstance = null;
function getChangeTracker(prisma, nodeId, registrationKey) {
    if (!changeTrackerInstance) {
        changeTrackerInstance = new DatabaseChangeTracker(prisma, nodeId, registrationKey);
    }
    return changeTrackerInstance;
}
