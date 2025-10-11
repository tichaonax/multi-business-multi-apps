"use strict";
/**
 * Sync System Utilities
 * Helper functions for database synchronization
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SyncUtils = void 0;
const crypto_1 = require("crypto");
/**
 * Sync utilities class for common sync operations
 */
class SyncUtils {
    constructor(prisma, nodeId) {
        this.prisma = prisma;
        this.nodeId = nodeId;
    }
    /**
     * Get sync statistics for monitoring
     */
    async getSyncStats() {
        try {
            const [totalEvents, processedEvents, conflictCount, lastEvent, peerCount] = await Promise.all([
                this.prisma.syncEvent.count(),
                this.prisma.syncEvent.count({ where: { processed: true } }),
                this.prisma.conflictResolution.count(),
                this.prisma.syncEvent.findFirst({
                    orderBy: { createdAt: 'desc' },
                    select: { createdAt: true }
                }),
                this.prisma.syncNode.count({ where: { isActive: true, nodeId: { not: this.nodeId } } })
            ]);
            return {
                totalEvents,
                processedEvents,
                pendingEvents: totalEvents - processedEvents,
                conflictCount,
                totalConflicts: conflictCount,
                totalEventsSynced: processedEvents,
                lastSyncTime: lastEvent?.createdAt || null,
                peersConnected: peerCount
            };
        }
        catch (error) {
            console.error('Failed to get sync stats:', error);
            throw error;
        }
    }
    /**
     * Detect conflicts between sync events
     */
    async detectConflicts(incomingEvent) {
        try {
            // Find existing events for the same record
            const existingEvents = await this.prisma.syncEvent.findMany({
                where: {
                    tableName: incomingEvent.tableName,
                    recordId: incomingEvent.recordId,
                    sourceNodeId: { not: incomingEvent.sourceNodeId },
                    processed: false
                },
                orderBy: { lamportClock: 'desc' }
            });
            if (existingEvents.length === 0) {
                return { hasConflict: false, conflictType: 'CREATE_CREATE' };
            }
            // Check for conflicts
            for (const existingEvent of existingEvents) {
                const existingClock = existingEvent.vectorClock;
                const incomingClock = incomingEvent.vectorClock;
                // Compare vector clocks to determine causality
                const causality = this.compareVectorClocks(existingClock, incomingClock);
                if (causality === 'concurrent') {
                    // Concurrent events = potential conflict
                    const conflictType = this.determineConflictType(existingEvent.operation, incomingEvent.operation);
                    const { winningEvent, losingEvents, strategy } = this.resolveConflict([existingEvent, incomingEvent]);
                    return {
                        hasConflict: true,
                        conflictType,
                        winningEvent,
                        losingEvents,
                        resolutionStrategy: strategy
                    };
                }
            }
            return { hasConflict: false, conflictType: 'CREATE_CREATE' };
        }
        catch (error) {
            console.error('Failed to detect conflicts:', error);
            throw error;
        }
    }
    /**
     * Apply a sync event to the local database
     */
    async applySyncEvent(event) {
        try {
            const modelName = this.pascalCase(event.tableName);
            const modelClient = this.prisma[event.tableName];
            if (!modelClient) {
                console.warn(`Model ${modelName} not found in Prisma client`);
                return false;
            }
            switch (event.operation) {
                case 'CREATE':
                    await modelClient.create({ data: event.changeData });
                    break;
                case 'UPDATE':
                    await modelClient.update({
                        where: { id: event.recordId },
                        data: event.changeData
                    });
                    break;
                case 'DELETE':
                    await modelClient.delete({
                        where: { id: event.recordId }
                    });
                    break;
                default:
                    console.warn(`Unsupported operation: ${event.operation}`);
                    return false;
            }
            // Mark event as processed
            await this.prisma.syncEvent.update({
                where: { eventId: event.eventId },
                data: {
                    processed: true,
                    processedAt: new Date()
                }
            });
            return true;
        }
        catch (error) {
            console.error('Failed to apply sync event:', error);
            // Mark event as failed
            await this.prisma.syncEvent.update({
                where: { eventId: event.eventId },
                data: {
                    retryCount: { increment: 1 },
                    errorMessage: error instanceof Error ? error.message : 'Unknown error'
                }
            }).catch(() => { }); // Ignore errors when updating error state
            return false;
        }
    }
    /**
     * Verify data integrity using checksums
     */
    verifyChecksum(event) {
        const calculatedChecksum = this.calculateChecksum(event.changeData);
        return calculatedChecksum === event.checksum;
    }
    /**
     * Calculate data checksum
     */
    calculateChecksum(data) {
        const dataString = JSON.stringify(data, Object.keys(data).sort());
        return crypto_1.default.createHash('sha256').update(dataString).digest('hex');
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
     * Determine conflict type based on operations
     */
    determineConflictType(opA, opB) {
        if (opA === 'UPDATE' && opB === 'UPDATE')
            return 'UPDATE_UPDATE';
        if (opA === 'UPDATE' && opB === 'DELETE')
            return 'UPDATE_DELETE';
        if (opA === 'DELETE' && opB === 'UPDATE')
            return 'DELETE_UPDATE';
        if (opA === 'CREATE' && opB === 'CREATE')
            return 'CREATE_CREATE';
        return 'CONSTRAINT';
    }
    /**
     * Resolve conflicts using configured strategy
     */
    resolveConflict(events) {
        // Sort by priority first, then by Lamport clock
        const sortedEvents = events.sort((a, b) => {
            if (a.priority !== b.priority) {
                return b.priority - a.priority; // Higher priority wins
            }
            return Number(b.lamportClock - a.lamportClock); // Later timestamp wins
        });
        const winningEvent = sortedEvents[0];
        const losingEvents = sortedEvents.slice(1);
        return {
            winningEvent,
            losingEvents,
            strategy: 'PRIORITY_THEN_TIMESTAMP'
        };
    }
    /**
     * Convert snake_case to PascalCase
     */
    pascalCase(str) {
        return str
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join('');
    }
    /**
     * Clean up old processed events
     */
    async cleanupOldEvents(daysToKeep = 30) {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
            const result = await this.prisma.syncEvent.deleteMany({
                where: {
                    processed: true,
                    processedAt: {
                        lt: cutoffDate
                    }
                }
            });
            return result.count;
        }
        catch (error) {
            console.error('Failed to cleanup old events:', error);
            throw error;
        }
    }
    /**
     * Get failed sync events for retry
     */
    async getFailedEvents(maxRetries = 3) {
        const events = await this.prisma.syncEvent.findMany({
            where: {
                processed: false,
                retryCount: { lt: maxRetries },
                errorMessage: { not: null }
            },
            orderBy: { createdAt: 'asc' },
            take: 50
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
     * Update node last seen timestamp
     */
    async updateNodeLastSeen(nodeId) {
        try {
            await this.prisma.syncNode.update({
                where: { nodeId },
                data: { lastSeen: new Date() }
            });
        }
        catch (error) {
            console.warn(`Failed to update last seen for node ${nodeId}:`, error);
        }
    }
    /**
     * Get active peer nodes
     */
    async getActivePeers() {
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        const peers = await this.prisma.syncNode.findMany({
            where: {
                isActive: true,
                nodeId: { not: this.nodeId },
                lastSeen: { gte: fiveMinutesAgo }
            },
            select: {
                nodeId: true,
                nodeName: true,
                ipAddress: true,
                port: true,
                lastSeen: true
            }
        });
        return peers;
    }
    /**
     * Record sync metrics
     */
    async recordMetrics(metrics) {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            await this.prisma.syncMetrics.upsert({
                where: {
                    nodeId_metricDate: {
                        nodeId: this.nodeId,
                        metricDate: today
                    }
                },
                update: {
                    eventsGenerated: { increment: metrics.eventsGenerated || 0 },
                    eventsReceived: { increment: metrics.eventsReceived || 0 },
                    eventsProcessed: { increment: metrics.eventsProcessed || 0 },
                    eventsFailed: { increment: metrics.eventsFailed || 0 },
                    conflictsDetected: { increment: metrics.conflictsDetected || 0 },
                    conflictsResolved: { increment: metrics.conflictsResolved || 0 },
                    syncLatencyMs: metrics.syncLatencyMs,
                    networkLatencyMs: metrics.networkLatencyMs,
                    dataTransferredBytes: metrics.dataTransferredBytes
                        ? { increment: metrics.dataTransferredBytes }
                        : undefined,
                    peersConnected: metrics.peersConnected,
                    peersDiscovered: metrics.peersDiscovered
                },
                create: {
                    nodeId: this.nodeId,
                    metricDate: today,
                    eventsGenerated: metrics.eventsGenerated || 0,
                    eventsReceived: metrics.eventsReceived || 0,
                    eventsProcessed: metrics.eventsProcessed || 0,
                    eventsFailed: metrics.eventsFailed || 0,
                    conflictsDetected: metrics.conflictsDetected || 0,
                    conflictsResolved: metrics.conflictsResolved || 0,
                    syncLatencyMs: metrics.syncLatencyMs,
                    networkLatencyMs: metrics.networkLatencyMs,
                    dataTransferredBytes: metrics.dataTransferredBytes || 0n,
                    peersConnected: metrics.peersConnected || 0,
                    peersDiscovered: metrics.peersDiscovered || 0
                }
            });
        }
        catch (error) {
            console.warn('Failed to record sync metrics:', error);
        }
    }
}
exports.SyncUtils = SyncUtils;
