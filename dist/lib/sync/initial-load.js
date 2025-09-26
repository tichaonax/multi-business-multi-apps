"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InitialLoadManager = void 0;
exports.createInitialLoadManager = createInitialLoadManager;
const events_1 = require("events");
const sync_utils_1 = require("./sync-utils");
class InitialLoadManager extends events_1.EventEmitter {
    constructor(prisma, nodeId, registrationKey) {
        super();
        this.activeSessions = new Map();
        this.transferQueue = new Map();
        this.DEFAULT_BATCH_SIZE = 1000;
        this.MAX_CHUNK_SIZE = 5 * 1024 * 1024;
        this.MAX_CONCURRENT_TRANSFERS = 3;
        this.VALIDATION_SAMPLE_SIZE = 100;
        this.CORE_TABLES = [
            'users',
            'businesses',
            'business_memberships',
            'employees',
            'employee_contracts',
            'job_titles',
            'compensation_types',
            'benefit_types',
            'projects',
            'project_contractors',
            'project_stages',
            'project_transactions',
            'persons',
            'id_format_templates',
            'phone_format_templates',
            'date_format_templates'
        ];
        this.prisma = prisma;
        this.nodeId = nodeId;
        this.registrationKey = registrationKey;
        this.syncUtils = new sync_utils_1.SyncUtils(prisma, nodeId);
    }
    async start() {
        await this.loadActiveSessions();
        this.emit('started');
    }
    stop() {
        for (const session of this.activeSessions.values()) {
            if (session.status === 'TRANSFERRING' || session.status === 'PREPARING') {
                session.status = 'CANCELLED';
                this.emit('session_cancelled', session);
            }
        }
        this.emit('stopped');
    }
    async createDataSnapshot() {
        const snapshotId = crypto.randomUUID();
        const createdAt = new Date();
        try {
            const tables = [];
            let totalRecords = 0;
            let totalSize = 0;
            for (const tableName of this.CORE_TABLES) {
                try {
                    const count = await this.getTableRecordCount(tableName);
                    const size = await this.estimateTableSize(tableName);
                    const lastModified = await this.getTableLastModified(tableName);
                    tables.push({
                        tableName,
                        recordCount: count,
                        dataSize: size,
                        lastModified
                    });
                    totalRecords += count;
                    totalSize += size;
                }
                catch (error) {
                    console.warn(`Failed to analyze table ${tableName}:`, error);
                }
            }
            const checksum = await this.calculateSnapshotChecksum(tables);
            const snapshot = {
                snapshotId,
                nodeId: this.nodeId,
                createdAt,
                totalRecords,
                totalSize,
                checksum,
                tables
            };
            await this.storeSnapshotMetadata(snapshot);
            this.emit('snapshot_created', snapshot);
            return snapshot;
        }
        catch (error) {
            console.error('Failed to create data snapshot:', error);
            throw error;
        }
    }
    async initiateInitialLoad(targetPeer, options = {}) {
        const sessionId = crypto.randomUUID();
        const session = {
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
        };
        await this.createInitialLoadSession(session);
        this.activeSessions.set(sessionId, session);
        setImmediate(() => this.executeInitialLoad(session, targetPeer));
        this.emit('initial_load_started', session);
        return sessionId;
    }
    async requestInitialLoad(sourcePeer, options = {}) {
        try {
            const response = await fetch(`http://${sourcePeer.ipAddress}:${sourcePeer.port}/api/sync/request-initial-load`, {
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
            });
            if (!response.ok) {
                throw new Error(`Initial load request failed: ${response.statusText}`);
            }
            const result = await response.json();
            return result.sessionId;
        }
        catch (error) {
            console.error('Failed to request initial load:', error);
            throw error;
        }
    }
    getActiveSessions() {
        return Array.from(this.activeSessions.values());
    }
    getSession(sessionId) {
        return this.activeSessions.get(sessionId) || null;
    }
    async cancelSession(sessionId) {
        const session = this.activeSessions.get(sessionId);
        if (!session)
            return false;
        if (session.status === 'COMPLETED' || session.status === 'FAILED') {
            return false;
        }
        session.status = 'CANCELLED';
        session.completedAt = new Date();
        await this.updateInitialLoadSession(session);
        this.activeSessions.delete(sessionId);
        this.emit('session_cancelled', session);
        return true;
    }
    async executeInitialLoad(session, targetPeer) {
        try {
            await this.updateSessionProgress(session, 10, 'Creating data snapshot');
            const snapshot = await this.createDataSnapshot();
            session.totalRecords = snapshot.totalRecords;
            await this.updateSessionProgress(session, 20, 'Preparing transfer chunks');
            const chunks = await this.createTransferChunks(session, snapshot);
            session.status = 'TRANSFERRING';
            await this.updateSessionProgress(session, 30, 'Transferring data');
            let transferredChunks = 0;
            const totalChunks = chunks.length;
            for (const chunk of chunks) {
                if (session.status === 'CANCELLED') {
                    throw new Error('Transfer cancelled');
                }
                await this.sendChunkToTarget(chunk, targetPeer);
                transferredChunks++;
                const progress = 30 + (transferredChunks / totalChunks) * 50;
                await this.updateSessionProgress(session, progress, `Transferred ${transferredChunks}/${totalChunks} chunks`);
                session.transferredRecords += chunk.data.length;
                session.transferredBytes += this.calculateChunkSize(chunk);
            }
            if (session.metadata.checksumVerification) {
                session.status = 'VALIDATING';
                await this.updateSessionProgress(session, 85, 'Validating transfer');
                await this.validateTransfer(session, targetPeer, snapshot);
            }
            session.status = 'COMPLETED';
            session.completedAt = new Date();
            await this.updateSessionProgress(session, 100, 'Transfer completed successfully');
            await this.updateInitialLoadSession(session);
            this.activeSessions.delete(session.sessionId);
            this.emit('initial_load_completed', session);
        }
        catch (error) {
            session.status = 'FAILED';
            session.completedAt = new Date();
            session.errorMessage = error instanceof Error ? error.message : 'Unknown error';
            await this.updateInitialLoadSession(session);
            this.activeSessions.delete(session.sessionId);
            this.emit('initial_load_failed', { session, error });
        }
    }
    async createTransferChunks(session, snapshot) {
        const chunks = [];
        for (const table of snapshot.tables) {
            if (!session.metadata.selectedTables.includes(table.tableName)) {
                continue;
            }
            const tableChunks = await this.createTableChunks(session, table.tableName, table.recordCount);
            chunks.push(...tableChunks);
        }
        return chunks;
    }
    async createTableChunks(session, tableName, recordCount) {
        const chunks = [];
        const batchSize = session.metadata.batchSize;
        const totalChunks = Math.ceil(recordCount / batchSize);
        for (let i = 0; i < totalChunks; i++) {
            const offset = i * batchSize;
            const data = await this.fetchTableData(tableName, offset, batchSize);
            if (data.length === 0)
                break;
            const chunk = {
                chunkId: crypto.randomUUID(),
                sessionId: session.sessionId,
                tableName,
                sequenceNumber: i,
                totalChunks,
                data,
                checksum: this.calculateDataChecksum(data),
                isEncrypted: session.metadata.encryptionEnabled
            };
            if (session.metadata.compressionEnabled) {
                chunk.compressedSize = this.estimateCompressedSize(data);
            }
            chunks.push(chunk);
        }
        return chunks;
    }
    async sendChunkToTarget(chunk, targetPeer) {
        try {
            const response = await fetch(`http://${targetPeer.ipAddress}:${targetPeer.port}/api/sync/receive-chunk`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.hashRegistrationKey()}`
                },
                body: JSON.stringify(chunk)
            });
            if (!response.ok) {
                throw new Error(`Failed to send chunk ${chunk.chunkId}: ${response.statusText}`);
            }
            const result = await response.json();
            if (!result.success) {
                throw new Error(`Chunk transfer failed: ${result.error}`);
            }
        }
        catch (error) {
            console.error(`Failed to send chunk ${chunk.chunkId}:`, error);
            throw error;
        }
    }
    async validateTransfer(session, targetPeer, snapshot) {
        try {
            const response = await fetch(`http://${targetPeer.ipAddress}:${targetPeer.port}/api/sync/validate-transfer`, {
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
            });
            if (!response.ok) {
                throw new Error(`Validation request failed: ${response.statusText}`);
            }
            const result = await response.json();
            if (!result.valid) {
                throw new Error(`Transfer validation failed: ${result.error}`);
            }
        }
        catch (error) {
            console.error('Transfer validation failed:', error);
            throw error;
        }
    }
    hashRegistrationKey() {
        const crypto = require('crypto');
        return crypto.createHash('sha256').update(this.registrationKey).digest('hex');
    }
    async updateSessionProgress(session, progress, step) {
        session.progress = Math.min(100, Math.max(0, progress));
        session.currentStep = step;
        if (progress > 0 && progress < 100) {
            const elapsed = Date.now() - session.startedAt.getTime();
            const estimatedTotal = (elapsed / progress) * 100;
            session.estimatedTimeRemaining = Math.round((estimatedTotal - elapsed) / 1000);
        }
        await this.updateInitialLoadSession(session);
        this.emit('session_progress', { sessionId: session.sessionId, progress, step });
    }
    async getTableRecordCount(tableName) {
        try {
            const result = await this.prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM "${tableName}"`);
            return Number(result[0]?.count || 0);
        }
        catch (error) {
            console.warn(`Failed to count records in table ${tableName}:`, error);
            return 0;
        }
    }
    async estimateTableSize(tableName) {
        try {
            const sampleData = await this.prisma.$queryRawUnsafe(`SELECT * FROM "${tableName}" LIMIT 10`);
            const sampleSize = JSON.stringify(sampleData).length;
            const recordCount = await this.getTableRecordCount(tableName);
            return Math.round((sampleSize / 10) * recordCount);
        }
        catch (error) {
            return 0;
        }
    }
    async getTableLastModified(tableName) {
        try {
            const result = await this.prisma.$queryRawUnsafe(`SELECT MAX(COALESCE("updated_at", "created_at")) as last_modified FROM "${tableName}"`);
            return new Date(result[0]?.last_modified || Date.now());
        }
        catch (error) {
            return new Date();
        }
    }
    async calculateSnapshotChecksum(tables) {
        const crypto = require('crypto');
        const hash = crypto.createHash('sha256');
        for (const table of tables) {
            hash.update(`${table.tableName}:${table.recordCount}:${table.dataSize}`);
        }
        return hash.digest('hex');
    }
    async fetchTableData(tableName, offset, limit) {
        try {
            return await this.prisma.$queryRawUnsafe(`SELECT * FROM "${tableName}" ORDER BY "created_at" LIMIT ${limit} OFFSET ${offset}`);
        }
        catch (error) {
            console.error(`Failed to fetch data from table ${tableName}:`, error);
            return [];
        }
    }
    calculateDataChecksum(data) {
        const crypto = require('crypto');
        const dataString = JSON.stringify(data, Object.keys(data).sort());
        return crypto.createHash('sha256').update(dataString).digest('hex');
    }
    estimateCompressedSize(data) {
        const originalSize = JSON.stringify(data).length;
        return Math.round(originalSize * 0.3);
    }
    calculateChunkSize(chunk) {
        return chunk.compressedSize || JSON.stringify(chunk.data).length;
    }
    async storeSnapshotMetadata(snapshot) {
        try {
            await this.prisma.dataSnapshot.create({
                data: {
                    id: snapshot.snapshotId,
                    nodeId: snapshot.nodeId,
                    createdAt: snapshot.createdAt,
                    totalRecords: snapshot.totalRecords,
                    totalSize: snapshot.totalSize,
                    checksum: snapshot.checksum,
                    tableMetadata: snapshot.tables
                }
            });
        }
        catch (error) {
            console.error('Failed to store snapshot metadata:', error);
        }
    }
    async loadActiveSessions() {
        try {
            const sessions = await this.prisma.initialLoadSession.findMany({
                where: {
                    OR: [
                        { sourceNodeId: this.nodeId },
                        { targetNodeId: this.nodeId }
                    ],
                    status: {
                        in: ['PREPARING', 'TRANSFERRING', 'VALIDATING']
                    }
                }
            });
            for (const dbSession of sessions) {
                const session = {
                    sessionId: dbSession.id,
                    sourceNodeId: dbSession.sourceNodeId,
                    targetNodeId: dbSession.targetNodeId,
                    startedAt: dbSession.startedAt,
                    completedAt: dbSession.completedAt || undefined,
                    status: dbSession.status,
                    progress: dbSession.progress,
                    currentStep: dbSession.currentStep,
                    totalRecords: dbSession.totalRecords,
                    transferredRecords: dbSession.transferredRecords,
                    transferredBytes: dbSession.transferredBytes,
                    estimatedTimeRemaining: dbSession.estimatedTimeRemaining,
                    errorMessage: dbSession.errorMessage || undefined,
                    metadata: dbSession.metadata
                };
                this.activeSessions.set(session.sessionId, session);
            }
        }
        catch (error) {
            console.error('Failed to load active sessions:', error);
        }
    }
    async createInitialLoadSession(session) {
        try {
            await this.prisma.initialLoadSession.create({
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
                }
            });
        }
        catch (error) {
            console.error('Failed to create initial load session:', error);
        }
    }
    async updateInitialLoadSession(session) {
        try {
            await this.prisma.initialLoadSession.update({
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
                }
            });
        }
        catch (error) {
            console.error('Failed to update initial load session:', error);
        }
    }
}
exports.InitialLoadManager = InitialLoadManager;
function createInitialLoadManager(prisma, nodeId, registrationKey) {
    return new InitialLoadManager(prisma, nodeId, registrationKey);
}
