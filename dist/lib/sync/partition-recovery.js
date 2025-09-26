"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PartitionRecoveryService = void 0;
exports.createPartitionRecoveryService = createPartitionRecoveryService;
const events_1 = require("events");
const conflict_resolver_1 = require("./conflict-resolver");
const sync_utils_1 = require("./sync-utils");
class PartitionRecoveryService extends events_1.EventEmitter {
    constructor(prisma, nodeId, registrationKey, partitionDetector) {
        super();
        this.syncEngine = null;
        this.peerDiscovery = null;
        this.activeSessions = new Map();
        this.recoveryTimer = null;
        this.isRecovering = false;
        this.RECOVERY_CHECK_INTERVAL = 30000;
        this.MAX_CONCURRENT_RECOVERIES = 3;
        this.RECOVERY_TIMEOUT = 1800000;
        this.prisma = prisma;
        this.nodeId = nodeId;
        this.registrationKey = registrationKey;
        this.partitionDetector = partitionDetector;
        this.conflictResolver = new conflict_resolver_1.ConflictResolver(prisma, nodeId);
        this.syncUtils = new sync_utils_1.SyncUtils(prisma, nodeId);
        this.setupPartitionDetectorEvents();
    }
    setSyncEngine(syncEngine) {
        this.syncEngine = syncEngine;
    }
    setPeerDiscovery(peerDiscovery) {
        this.peerDiscovery = peerDiscovery;
    }
    async start() {
        await this.loadActiveSessions();
        this.startPeriodicRecovery();
        this.emit('started');
    }
    async stop() {
        if (this.recoveryTimer) {
            clearInterval(this.recoveryTimer);
            this.recoveryTimer = null;
        }
        for (const session of this.activeSessions.values()) {
            if (session.status === 'RUNNING') {
                await this.cancelRecoverySession(session.sessionId);
            }
        }
        this.emit('stopped');
    }
    async initiateRecovery(partitionId, strategy) {
        if (this.activeSessions.size >= this.MAX_CONCURRENT_RECOVERIES) {
            throw new Error('Maximum concurrent recoveries reached');
        }
        const partition = this.partitionDetector.getActivePartitions()
            .find(p => p.partitionId === partitionId);
        if (!partition) {
            throw new Error('Partition not found or already resolved');
        }
        return await this.startRecoverySession(partition, strategy);
    }
    getRecoverySession(sessionId) {
        return this.activeSessions.get(sessionId) || null;
    }
    getActiveRecoverySessions() {
        return Array.from(this.activeSessions.values());
    }
    async cancelRecoverySession(sessionId) {
        const session = this.activeSessions.get(sessionId);
        if (!session || session.status !== 'RUNNING') {
            return false;
        }
        session.status = 'CANCELLED';
        session.completedAt = new Date();
        await this.updateRecoverySession(session);
        this.activeSessions.delete(sessionId);
        this.emit('recovery_cancelled', session);
        return true;
    }
    async getRecoveryMetrics() {
        try {
            const sessions = await this.prisma.recoverySession.findMany({
                where: { nodeId: this.nodeId },
                orderBy: { startedAt: 'desc' }
            });
            const total = sessions.length;
            const successful = sessions.filter(s => s.status === 'COMPLETED').length;
            const failed = sessions.filter(s => s.status === 'FAILED').length;
            const completedSessions = sessions.filter(s => s.completedAt);
            const avgTime = completedSessions.length > 0
                ? completedSessions.reduce((sum, s) => sum + (s.completedAt.getTime() - s.startedAt.getTime()), 0) / completedSessions.length
                : 0;
            const failureReasons = new Map();
            sessions.filter(s => s.errorMessage).forEach(s => {
                const reason = s.errorMessage;
                failureReasons.set(reason, (failureReasons.get(reason) || 0) + 1);
            });
            const commonFailures = Array.from(failureReasons.entries())
                .map(([reason, count]) => ({ reason, count }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 5);
            return {
                totalRecoveries: total,
                successfulRecoveries: successful,
                failedRecoveries: failed,
                averageRecoveryTime: Math.round(avgTime / 1000),
                recoverySuccessRate: total > 0 ? successful / total : 0,
                commonFailureReasons: commonFailures
            };
        }
        catch (error) {
            console.error('Failed to get recovery metrics:', error);
            return {
                totalRecoveries: 0,
                successfulRecoveries: 0,
                failedRecoveries: 0,
                averageRecoveryTime: 0,
                recoverySuccessRate: 0,
                commonFailureReasons: []
            };
        }
    }
    setupPartitionDetectorEvents() {
        this.partitionDetector.on('partition_detected', async (partition) => {
            await this.handlePartitionDetected(partition);
        });
        this.partitionDetector.on('critical_partition', async (partition) => {
            await this.handleCriticalPartition(partition);
        });
    }
    async handlePartitionDetected(partition) {
        const plan = await this.partitionDetector.getRecoveryPlan(partition.partitionId);
        if (plan?.autoExecutable && this.activeSessions.size < this.MAX_CONCURRENT_RECOVERIES) {
            try {
                await this.startRecoverySession(partition);
            }
            catch (error) {
                console.error('Failed to auto-start recovery:', error);
            }
        }
    }
    async handleCriticalPartition(partition) {
        if (this.activeSessions.size < this.MAX_CONCURRENT_RECOVERIES) {
            try {
                await this.startRecoverySession(partition);
                this.emit('critical_recovery_started', partition);
            }
            catch (error) {
                console.error('Failed to start critical recovery:', error);
                this.emit('critical_recovery_failed', { partition, error });
            }
        }
    }
    startPeriodicRecovery() {
        this.recoveryTimer = setInterval(async () => {
            await this.performRecoveryCheck();
        }, this.RECOVERY_CHECK_INTERVAL);
    }
    async performRecoveryCheck() {
        if (this.isRecovering)
            return;
        try {
            this.isRecovering = true;
            await this.checkRecoveryTimeouts();
            await this.updateActiveSessionProgress();
            await this.checkCompletedRecoveries();
        }
        catch (error) {
            console.error('Recovery check failed:', error);
        }
        finally {
            this.isRecovering = false;
        }
    }
    async startRecoverySession(partition, strategy) {
        const sessionId = crypto.randomUUID();
        const plan = await this.partitionDetector.getRecoveryPlan(partition.partitionId);
        if (!plan) {
            throw new Error('Cannot generate recovery plan');
        }
        const selectedStrategy = strategy || plan.strategy;
        const session = {
            sessionId,
            partitionId: partition.partitionId,
            strategy: selectedStrategy,
            startedAt: new Date(),
            status: 'RUNNING',
            progress: 0,
            currentStep: 'Initializing recovery',
            recoveryMetrics: {
                eventsProcessed: 0,
                conflictsResolved: 0,
                dataRebuilt: 0,
                peersReconnected: 0
            }
        };
        await this.createRecoverySession(session);
        this.activeSessions.set(sessionId, session);
        setImmediate(() => this.executeRecovery(session));
        this.emit('recovery_started', session);
        return sessionId;
    }
    async executeRecovery(session) {
        try {
            await this.updateSessionProgress(session, 10, 'Starting recovery process');
            switch (session.strategy) {
                case 'WAIT_RECONNECT':
                    await this.executeWaitReconnectRecovery(session);
                    break;
                case 'FORCE_RESYNC':
                    await this.executeForceResyncRecovery(session);
                    break;
                case 'MANUAL_INTERVENTION':
                    await this.executeManualInterventionRecovery(session);
                    break;
                case 'DATA_REBUILD':
                    await this.executeDataRebuildRecovery(session);
                    break;
                default:
                    throw new Error(`Unknown recovery strategy: ${session.strategy}`);
            }
            session.status = 'COMPLETED';
            session.completedAt = new Date();
            session.progress = 100;
            session.currentStep = 'Recovery completed successfully';
            await this.updateRecoverySession(session);
            this.emit('recovery_completed', session);
        }
        catch (error) {
            session.status = 'FAILED';
            session.completedAt = new Date();
            session.errorMessage = error instanceof Error ? error.message : 'Unknown error';
            await this.updateRecoverySession(session);
            this.emit('recovery_failed', { session, error });
        }
        finally {
            this.activeSessions.delete(session.sessionId);
        }
    }
    async executeWaitReconnectRecovery(session) {
        await this.updateSessionProgress(session, 20, 'Monitoring for peer reconnection');
        const startTime = Date.now();
        const timeout = 300000;
        while (Date.now() - startTime < timeout && session.status === 'RUNNING') {
            const partitions = this.partitionDetector.getActivePartitions();
            const partition = partitions.find(p => p.partitionId === session.partitionId);
            if (!partition) {
                await this.updateSessionProgress(session, 100, 'Peer reconnected successfully');
                return;
            }
            await this.updateSessionProgress(session, 20 + Math.min(70, (Date.now() - startTime) / timeout * 70), 'Waiting for peer reconnection...');
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
        throw new Error('Timeout waiting for peer reconnection');
    }
    async executeForceResyncRecovery(session) {
        await this.updateSessionProgress(session, 20, 'Clearing failed sync sessions');
        await this.prisma.syncSession.updateMany({
            where: {
                sourceNodeId: this.nodeId,
                status: 'FAILED'
            },
            data: { status: 'CANCELLED' }
        });
        await this.updateSessionProgress(session, 40, 'Resetting sync state');
        await this.syncUtils.resetSyncState();
        await this.updateSessionProgress(session, 60, 'Initiating full resynchronization');
        if (this.syncEngine && this.peerDiscovery) {
            const peers = this.peerDiscovery.getDiscoveredPeers();
            for (let i = 0; i < peers.length; i++) {
                const peer = peers[i];
                try {
                    await this.syncEngine.syncWithPeer(peer);
                    session.recoveryMetrics.peersReconnected++;
                    await this.updateSessionProgress(session, 60 + (i + 1) / peers.length * 30, `Syncing with peer ${peer.nodeName}`);
                }
                catch (error) {
                    console.warn(`Failed to sync with peer ${peer.nodeName}:`, error);
                }
            }
        }
        await this.updateSessionProgress(session, 90, 'Verifying sync completion');
        await new Promise(resolve => setTimeout(resolve, 10000));
    }
    async executeManualInterventionRecovery(session) {
        await this.updateSessionProgress(session, 30, 'Marking as requiring manual intervention');
        await this.prisma.networkPartition.update({
            where: { id: session.partitionId },
            data: {
                partitionMetadata: {
                    requiresManualIntervention: true,
                    interventionRequested: new Date().toISOString(),
                    recoverySessionId: session.sessionId
                }
            }
        });
        await this.updateSessionProgress(session, 100, 'Marked for manual intervention');
    }
    async executeDataRebuildRecovery(session) {
        await this.updateSessionProgress(session, 20, 'Preparing for data rebuild');
        await this.prisma.networkPartition.update({
            where: { id: session.partitionId },
            data: {
                partitionMetadata: {
                    dataRebuildRequired: true,
                    rebuildRequested: new Date().toISOString(),
                    recoverySessionId: session.sessionId
                }
            }
        });
        await this.updateSessionProgress(session, 100, 'Data rebuild requested - admin action required');
    }
    async updateSessionProgress(session, progress, step) {
        session.progress = Math.min(100, Math.max(0, progress));
        session.currentStep = step;
        await this.updateRecoverySession(session);
        this.emit('recovery_progress', { sessionId: session.sessionId, progress, step });
    }
    async checkRecoveryTimeouts() {
        const now = Date.now();
        for (const session of this.activeSessions.values()) {
            if (session.status === 'RUNNING') {
                const elapsed = now - session.startedAt.getTime();
                if (elapsed > this.RECOVERY_TIMEOUT) {
                    session.status = 'FAILED';
                    session.completedAt = new Date();
                    session.errorMessage = 'Recovery timeout';
                    await this.updateRecoverySession(session);
                    this.activeSessions.delete(session.sessionId);
                    this.emit('recovery_timeout', session);
                }
            }
        }
    }
    async updateActiveSessionProgress() {
        for (const session of this.activeSessions.values()) {
            if (session.status === 'RUNNING') {
                await this.updateRecoverySession(session);
            }
        }
    }
    async checkCompletedRecoveries() {
        for (const session of this.activeSessions.values()) {
            if (session.status !== 'RUNNING') {
                this.activeSessions.delete(session.sessionId);
            }
        }
    }
    async loadActiveSessions() {
        try {
            const sessions = await this.prisma.recoverySession.findMany({
                where: {
                    nodeId: this.nodeId,
                    status: 'RUNNING'
                }
            });
            for (const dbSession of sessions) {
                const session = {
                    sessionId: dbSession.id,
                    partitionId: dbSession.partitionId,
                    strategy: dbSession.strategy,
                    startedAt: dbSession.startedAt,
                    completedAt: dbSession.completedAt || undefined,
                    status: dbSession.status,
                    progress: dbSession.progress,
                    currentStep: dbSession.currentStep,
                    errorMessage: dbSession.errorMessage || undefined,
                    recoveryMetrics: dbSession.recoveryMetrics || {
                        eventsProcessed: 0,
                        conflictsResolved: 0,
                        dataRebuilt: 0,
                        peersReconnected: 0
                    }
                };
                this.activeSessions.set(session.sessionId, session);
            }
        }
        catch (error) {
            console.error('Failed to load active recovery sessions:', error);
        }
    }
    async createRecoverySession(session) {
        try {
            await this.prisma.recoverySession.create({
                data: {
                    id: session.sessionId,
                    nodeId: this.nodeId,
                    partitionId: session.partitionId,
                    strategy: session.strategy,
                    startedAt: session.startedAt,
                    status: session.status,
                    progress: session.progress,
                    currentStep: session.currentStep,
                    recoveryMetrics: session.recoveryMetrics
                }
            });
        }
        catch (error) {
            console.error('Failed to create recovery session:', error);
        }
    }
    async updateRecoverySession(session) {
        try {
            await this.prisma.recoverySession.update({
                where: { id: session.sessionId },
                data: {
                    status: session.status,
                    progress: session.progress,
                    currentStep: session.currentStep,
                    completedAt: session.completedAt,
                    errorMessage: session.errorMessage,
                    recoveryMetrics: session.recoveryMetrics
                }
            });
        }
        catch (error) {
            console.error('Failed to update recovery session:', error);
        }
    }
}
exports.PartitionRecoveryService = PartitionRecoveryService;
function createPartitionRecoveryService(prisma, nodeId, registrationKey, partitionDetector) {
    return new PartitionRecoveryService(prisma, nodeId, registrationKey, partitionDetector);
}
