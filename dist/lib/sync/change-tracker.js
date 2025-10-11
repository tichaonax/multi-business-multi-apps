"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseChangeTracker = void 0;
exports.getChangeTracker = getChangeTracker;
const client_1 = require("@prisma/client");
const crypto_1 = __importDefault(require("crypto"));
const uuid_1 = require("uuid");
class DatabaseChangeTracker {
    constructor(prisma, nodeId, registrationKey) {
        this.vectorClock = {};
        this.lamportClock = 0n;
        this.isEnabled = true;
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
        if (!registrationKey || typeof registrationKey !== 'string') {
            console.warn('ChangeTracker: registrationKey is missing or invalid; using empty key. Set SYNC_REGISTRATION_KEY to enable full security features.');
            this.registrationKey = '';
        }
        else {
            this.registrationKey = registrationKey;
        }
        try {
            this['prismaReady'] = typeof this.prisma.syncConfiguration?.upsert === 'function' && typeof this.prisma.syncEvent?.create === 'function';
        }
        catch (e) {
            this['prismaReady'] = false;
        }
        if (!this['prismaReady']) {
            console.warn('⚠️ Prisma client does not expose expected model methods; database change tracking will be degraded.');
        }
        this.initializeVectorClock();
    }
    async initializeVectorClock() {
        this.vectorClock[this.nodeId] = 0;
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
    async trackChange(tableName, recordId, operation, changeData, beforeData, priority = 5, metadata) {
        if (!this.isEnabled || this.excludedTables.has(tableName)) {
            return '';
        }
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
            lamportClock: this.lamportClock.toString(),
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
                    lamportClock: changeEvent.lamportClock,
                    checksum: changeEvent.checksum,
                    priority: changeEvent.priority,
                    metadata: changeEvent.metadata,
                    processed: false
                }
            });
            await this.updateVectorClockState();
            return eventId;
        }
        catch (error) {
            console.error('Failed to track change event:', error);
            throw error;
        }
    }
    async trackCreate(tableName, recordId, data, priority = 5) {
        return this.trackChange(tableName, recordId, client_1.SyncOperation.CREATE, data, undefined, priority);
    }
    async trackUpdate(tableName, recordId, newData, oldData, priority = 5) {
        return this.trackChange(tableName, recordId, client_1.SyncOperation.UPDATE, newData, oldData, priority);
    }
    async trackDelete(tableName, recordId, deletedData, priority = 5) {
        return this.trackChange(tableName, recordId, client_1.SyncOperation.DELETE, {}, deletedData, priority);
    }
    mergeVectorClock(otherClock) {
        for (const [nodeId, timestamp] of Object.entries(otherClock)) {
            this.vectorClock[nodeId] = Math.max(this.vectorClock[nodeId] || 0, timestamp);
        }
        const maxLamport = Math.max(...Object.values(this.vectorClock));
        this.lamportClock = BigInt(Math.max(Number(this.lamportClock), maxLamport + 1));
    }
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
    calculateChecksum(data) {
        const dataString = JSON.stringify(data, Object.keys(data).sort());
        return crypto_1.default.createHash('sha256').update(dataString).digest('hex');
    }
    hashRegistrationKey() {
        const key = this.registrationKey || '';
        return crypto_1.default.createHash('sha256').update(key + this.nodeId).digest('hex');
    }
    async updateVectorClockState() {
        try {
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
                    id: (0, uuid_1.v4)(),
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
    async getUnprocessedEvents(limit = 100) {
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
        return events.map((event) => ({
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
    async markEventsProcessed(eventIds) {
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
    setEnabled(enabled) {
        this.isEnabled = enabled;
    }
    getVectorClock() {
        return { ...this.vectorClock };
    }
    getLamportClock() {
        return this.lamportClock;
    }
    verifyRegistrationKey(providedHash) {
        return providedHash === this.hashRegistrationKey();
    }
    async initializeNode(nodeName, ipAddress, port = 8765) {
        try {
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
                },
                create: {
                    id: (0, uuid_1.v4)(),
                    nodeId: this.nodeId,
                    nodeName,
                    ipAddress,
                    port,
                    registrationKey: this.registrationKey,
                    publicKey: '',
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
    async submitEvent(event) {
        const eventId = event.eventId || (0, uuid_1.v4)();
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
let changeTrackerInstance = null;
function getChangeTracker(prisma, nodeId, registrationKey) {
    if (!changeTrackerInstance) {
        changeTrackerInstance = new DatabaseChangeTracker(prisma, nodeId, registrationKey);
    }
    return changeTrackerInstance;
}
