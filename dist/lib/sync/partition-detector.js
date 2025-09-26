"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PartitionDetector = void 0;
exports.createPartitionDetector = createPartitionDetector;
const events_1 = require("events");
const sync_utils_1 = require("./sync-utils");
class PartitionDetector extends events_1.EventEmitter {
    constructor(prisma, nodeId, registrationKey) {
        super();
        this.monitoringTimer = null;
        this.activePartitions = new Map();
        this.peerHealthMap = new Map();
        this.MAX_SYNC_FAILURES = 3;
        this.SYNC_TIMEOUT_THRESHOLD = 300000;
        this.PEER_UNREACHABLE_THRESHOLD = 180000;
        this.MONITOR_INTERVAL = 60000;
        this.prisma = prisma;
        this.nodeId = nodeId;
        this.registrationKey = registrationKey;
        this.syncUtils = new sync_utils_1.SyncUtils(prisma, nodeId);
    }
    async start() {
        await this.loadExistingPartitions();
        this.startPeriodicMonitoring();
        this.emit('started');
    }
    stop() {
        if (this.monitoringTimer) {
            clearInterval(this.monitoringTimer);
            this.monitoringTimer = null;
        }
        this.emit('stopped');
    }
    updatePeerHealth(peer, isHealthy, errorMessage) {
        const existing = this.peerHealthMap.get(peer.nodeId) || {
            nodeId: peer.nodeId,
            isHealthy: true,
            lastSeen: new Date(),
            failureCount: 0,
            lastError: null
        };
        this.peerHealthMap.set(peer.nodeId, {
            ...existing,
            isHealthy,
            lastSeen: new Date(),
            failureCount: isHealthy ? 0 : existing.failureCount + 1,
            lastError: errorMessage || existing.lastError
        });
        if (!isHealthy && existing.failureCount >= this.MAX_SYNC_FAILURES) {
            this.detectPartitionForPeer(peer, errorMessage);
        }
    }
    async reportSyncFailure(peer, error) {
        this.updatePeerHealth(peer, false, error.message);
        await this.analyzePartitionRisk([peer], error.message);
    }
    getActivePartitions() {
        return Array.from(this.activePartitions.values());
    }
    async getRecoveryPlan(partitionId) {
        const partition = this.activePartitions.get(partitionId);
        if (!partition)
            return null;
        return this.generateRecoveryPlan(partition);
    }
    async executeRecovery(partitionId, strategy) {
        const partition = this.activePartitions.get(partitionId);
        if (!partition)
            return false;
        const plan = await this.getRecoveryPlan(partitionId);
        if (!plan)
            return false;
        const selectedStrategy = strategy || plan.strategy;
        try {
            const success = await this.executeRecoveryStrategy(partition, selectedStrategy);
            if (success) {
                await this.markPartitionResolved(partitionId);
                this.emit('partition_recovered', { partitionId, strategy: selectedStrategy });
            }
            return success;
        }
        catch (error) {
            this.emit('recovery_failed', { partitionId, error });
            return false;
        }
    }
    startPeriodicMonitoring() {
        this.monitoringTimer = setInterval(async () => {
            await this.performHealthCheck();
        }, this.MONITOR_INTERVAL);
    }
    async performHealthCheck() {
        try {
            await this.checkPeerTimeouts();
            await this.checkDataConsistency();
            await this.checkSyncLag();
            await this.analyzeExistingPartitions();
        }
        catch (error) {
            console.error('Health check failed:', error);
        }
    }
    async checkPeerTimeouts() {
        const now = new Date();
        for (const [nodeId, health] of this.peerHealthMap) {
            const timeSinceLastSeen = now.getTime() - health.lastSeen.getTime();
            if (timeSinceLastSeen > this.PEER_UNREACHABLE_THRESHOLD && health.isHealthy) {
                const peerInfo = {
                    nodeId,
                    nodeName: `Node-${nodeId}`,
                    ipAddress: 'unknown',
                    port: 0,
                    lastSeen: health.lastSeen,
                    registrationKeyHash: ''
                };
                await this.detectPartitionForPeer(peerInfo, 'Peer unreachable timeout');
            }
        }
    }
    async checkDataConsistency() {
        try {
            const stats = await this.syncUtils.getSyncStats();
            if (stats.totalConflicts > stats.totalEventsSynced * 0.1) {
                await this.detectDataInconsistencyPartition('High conflict rate detected', { conflictRate: stats.totalConflicts / stats.totalEventsSynced });
            }
        }
        catch (error) {
            console.error('Data consistency check failed:', error);
        }
    }
    async checkSyncLag() {
        try {
            const recentSessions = await this.prisma.syncSession.findMany({
                where: {
                    sourceNodeId: this.nodeId,
                    startedAt: {
                        gte: new Date(Date.now() - this.SYNC_TIMEOUT_THRESHOLD)
                    }
                },
                orderBy: { startedAt: 'desc' },
                take: 10
            });
            const failedSessions = recentSessions.filter(s => s.status === 'FAILED');
            if (failedSessions.length >= 3) {
                await this.detectSyncLagPartition(failedSessions);
            }
        }
        catch (error) {
            console.error('Sync lag check failed:', error);
        }
    }
    async detectPartitionForPeer(peer, reason) {
        const partitionId = crypto.randomUUID();
        const partition = {
            partitionId,
            partitionType: 'PEER_UNREACHABLE',
            affectedPeers: [peer],
            isolatedPeers: [peer],
            detectedAt: new Date(),
            isResolved: false,
            severity: 'MEDIUM',
            metadata: {
                failureCount: this.peerHealthMap.get(peer.nodeId)?.failureCount || 0,
                errorMessages: [reason],
                networkStatus: await this.getNetworkStatus()
            }
        };
        await this.createPartitionRecord(partition);
        this.activePartitions.set(partitionId, partition);
        this.emit('partition_detected', partition);
    }
    async detectDataInconsistencyPartition(reason, metadata) {
        const partitionId = crypto.randomUUID();
        const partition = {
            partitionId,
            partitionType: 'DATA_INCONSISTENCY',
            affectedPeers: [],
            isolatedPeers: [],
            detectedAt: new Date(),
            isResolved: false,
            severity: 'HIGH',
            metadata: {
                failureCount: 0,
                errorMessages: [reason],
                networkStatus: metadata
            }
        };
        await this.createPartitionRecord(partition);
        this.activePartitions.set(partitionId, partition);
        this.emit('partition_detected', partition);
    }
    async detectSyncLagPartition(failedSessions) {
        const partitionId = crypto.randomUUID();
        const partition = {
            partitionId,
            partitionType: 'SYNC_FAILURE',
            affectedPeers: [],
            isolatedPeers: [],
            detectedAt: new Date(),
            isResolved: false,
            severity: 'MEDIUM',
            metadata: {
                failureCount: failedSessions.length,
                errorMessages: failedSessions.map(s => s.errorMessage).filter(Boolean),
                networkStatus: { syncLag: true }
            }
        };
        await this.createPartitionRecord(partition);
        this.activePartitions.set(partitionId, partition);
        this.emit('partition_detected', partition);
    }
    async analyzePartitionRisk(peers, reason) {
        const riskFactors = {
            multipleFailures: peers.length > 1,
            recentFailures: this.countRecentFailures() > 5,
            networkIssues: reason.includes('network') || reason.includes('timeout'),
            dataCorruption: reason.includes('checksum') || reason.includes('corrupt')
        };
        const riskScore = Object.values(riskFactors).filter(Boolean).length;
        if (riskScore >= 2) {
            await this.escalatePartitionDetection(peers, reason, riskScore);
        }
    }
    countRecentFailures() {
        const recentThreshold = new Date(Date.now() - 600000);
        let count = 0;
        for (const health of this.peerHealthMap.values()) {
            if (health.lastSeen > recentThreshold && !health.isHealthy) {
                count += health.failureCount;
            }
        }
        return count;
    }
    async escalatePartitionDetection(peers, reason, riskScore) {
        const partitionId = crypto.randomUUID();
        const partition = {
            partitionId,
            partitionType: 'NETWORK_DISCONNECTION',
            affectedPeers: peers,
            isolatedPeers: peers,
            detectedAt: new Date(),
            isResolved: false,
            severity: riskScore >= 3 ? 'CRITICAL' : 'HIGH',
            metadata: {
                failureCount: riskScore,
                errorMessages: [reason],
                networkStatus: await this.getNetworkStatus()
            }
        };
        await this.createPartitionRecord(partition);
        this.activePartitions.set(partitionId, partition);
        this.emit('partition_detected', partition);
        this.emit('critical_partition', partition);
    }
    async generateRecoveryPlan(partition) {
        const strategy = this.selectRecoveryStrategy(partition);
        return {
            partitionId: partition.partitionId,
            strategy,
            estimatedRecoveryTime: this.estimateRecoveryTime(partition, strategy),
            requiredActions: this.getRequiredActions(partition, strategy),
            riskLevel: this.assessRecoveryRisk(partition, strategy),
            autoExecutable: this.isAutoExecutable(partition, strategy)
        };
    }
    selectRecoveryStrategy(partition) {
        switch (partition.partitionType) {
            case 'PEER_UNREACHABLE':
                return 'WAIT_RECONNECT';
            case 'SYNC_FAILURE':
                return 'FORCE_RESYNC';
            case 'DATA_INCONSISTENCY':
                return 'MANUAL_INTERVENTION';
            case 'NETWORK_DISCONNECTION':
                return partition.severity === 'CRITICAL' ? 'DATA_REBUILD' : 'FORCE_RESYNC';
            default:
                return 'WAIT_RECONNECT';
        }
    }
    estimateRecoveryTime(partition, strategy) {
        const baseTime = {
            'WAIT_RECONNECT': 300,
            'FORCE_RESYNC': 600,
            'MANUAL_INTERVENTION': 1800,
            'DATA_REBUILD': 3600
        };
        const multiplier = partition.affectedPeers.length * 0.5 + 1;
        return (baseTime[strategy] || 300) * multiplier;
    }
    getRequiredActions(partition, strategy) {
        const actions = {
            'WAIT_RECONNECT': [
                'Monitor network connectivity',
                'Wait for peer to reconnect',
                'Verify sync resumption'
            ],
            'FORCE_RESYNC': [
                'Stop current sync operations',
                'Clear sync state',
                'Initiate full resynchronization',
                'Verify data consistency'
            ],
            'MANUAL_INTERVENTION': [
                'Review partition details',
                'Analyze data inconsistencies',
                'Determine manual resolution steps',
                'Execute corrective actions'
            ],
            'DATA_REBUILD': [
                'Stop all sync operations',
                'Backup current data',
                'Rebuild data from authoritative source',
                'Restart sync system'
            ]
        };
        return actions[strategy] || ['Monitor situation'];
    }
    assessRecoveryRisk(partition, strategy) {
        if (strategy === 'DATA_REBUILD')
            return 'HIGH';
        if (strategy === 'MANUAL_INTERVENTION')
            return 'MEDIUM';
        if (partition.severity === 'CRITICAL')
            return 'HIGH';
        return 'LOW';
    }
    isAutoExecutable(partition, strategy) {
        return ['WAIT_RECONNECT', 'FORCE_RESYNC'].includes(strategy) &&
            partition.severity !== 'CRITICAL';
    }
    async executeRecoveryStrategy(partition, strategy) {
        switch (strategy) {
            case 'WAIT_RECONNECT':
                return await this.executeWaitReconnect(partition);
            case 'FORCE_RESYNC':
                return await this.executeForceResync(partition);
            case 'MANUAL_INTERVENTION':
                return await this.executeManualIntervention(partition);
            case 'DATA_REBUILD':
                return await this.executeDataRebuild(partition);
            default:
                return false;
        }
    }
    async executeWaitReconnect(partition) {
        console.log(`Waiting for peer reconnection for partition ${partition.partitionId}`);
        return true;
    }
    async executeForceResync(partition) {
        try {
            await this.prisma.syncSession.updateMany({
                where: {
                    sourceNodeId: this.nodeId,
                    status: 'FAILED'
                },
                data: {
                    status: 'CANCELLED'
                }
            });
            await this.syncUtils.resetSyncState();
            console.log(`Force resync initiated for partition ${partition.partitionId}`);
            return true;
        }
        catch (error) {
            console.error('Force resync failed:', error);
            return false;
        }
    }
    async executeManualIntervention(partition) {
        await this.prisma.networkPartition.update({
            where: { id: partition.partitionId },
            data: {
                partitionMetadata: {
                    ...partition.metadata,
                    requiresManualIntervention: true,
                    interventionRequested: new Date().toISOString()
                }
            }
        });
        console.log(`Manual intervention required for partition ${partition.partitionId}`);
        return false;
    }
    async executeDataRebuild(partition) {
        try {
            console.log(`Data rebuild initiated for partition ${partition.partitionId}`);
            await this.prisma.networkPartition.update({
                where: { id: partition.partitionId },
                data: {
                    partitionMetadata: {
                        ...partition.metadata,
                        dataRebuildRequired: true,
                        rebuildRequested: new Date().toISOString()
                    }
                }
            });
            return false;
        }
        catch (error) {
            console.error('Data rebuild setup failed:', error);
            return false;
        }
    }
    async loadExistingPartitions() {
        try {
            const partitions = await this.prisma.networkPartition.findMany({
                where: {
                    nodeId: this.nodeId,
                    isResolved: false
                }
            });
            for (const dbPartition of partitions) {
                const partition = {
                    partitionId: dbPartition.id,
                    partitionType: dbPartition.partitionType,
                    affectedPeers: [],
                    isolatedPeers: [],
                    detectedAt: dbPartition.detectedAt,
                    isResolved: dbPartition.isResolved,
                    severity: 'MEDIUM',
                    metadata: dbPartition.partitionMetadata || {}
                };
                this.activePartitions.set(partition.partitionId, partition);
            }
        }
        catch (error) {
            console.error('Failed to load existing partitions:', error);
        }
    }
    async analyzeExistingPartitions() {
        for (const partition of this.activePartitions.values()) {
            const isResolved = await this.checkPartitionResolution(partition);
            if (isResolved) {
                await this.markPartitionResolved(partition.partitionId);
            }
        }
    }
    async checkPartitionResolution(partition) {
        const timeSinceDetection = Date.now() - partition.detectedAt.getTime();
        if (partition.partitionType === 'PEER_UNREACHABLE' && timeSinceDetection > 3600000) {
            return true;
        }
        for (const peer of partition.affectedPeers) {
            const health = this.peerHealthMap.get(peer.nodeId);
            if (!health || !health.isHealthy) {
                return false;
            }
        }
        return true;
    }
    async createPartitionRecord(partition) {
        try {
            await this.prisma.networkPartition.create({
                data: {
                    id: partition.partitionId,
                    nodeId: this.nodeId,
                    partitionType: partition.partitionType,
                    startTime: partition.detectedAt,
                    detectedAt: partition.detectedAt,
                    isResolved: false,
                    partitionMetadata: partition.metadata
                }
            });
        }
        catch (error) {
            console.error('Failed to create partition record:', error);
        }
    }
    async markPartitionResolved(partitionId) {
        try {
            await this.prisma.networkPartition.update({
                where: { id: partitionId },
                data: {
                    isResolved: true,
                    endTime: new Date(),
                    resolutionMetadata: {
                        resolvedAt: new Date().toISOString(),
                        resolvedBy: 'automatic'
                    }
                }
            });
            this.activePartitions.delete(partitionId);
            this.emit('partition_resolved', partitionId);
        }
        catch (error) {
            console.error('Failed to mark partition as resolved:', error);
        }
    }
    async getNetworkStatus() {
        return {
            timestamp: new Date().toISOString(),
            activePeers: this.peerHealthMap.size,
            healthyPeers: Array.from(this.peerHealthMap.values()).filter(h => h.isHealthy).length
        };
    }
}
exports.PartitionDetector = PartitionDetector;
function createPartitionDetector(prisma, nodeId, registrationKey) {
    return new PartitionDetector(prisma, nodeId, registrationKey);
}
