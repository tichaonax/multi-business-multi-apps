"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InitialLoadReceiver = void 0;
exports.createInitialLoadReceiver = createInitialLoadReceiver;
const events_1 = require("events");
class InitialLoadReceiver extends events_1.EventEmitter {
    constructor(prisma, nodeId, registrationKey) {
        super();
        this.receptionSessions = new Map();
        this.chunkBuffer = new Map();
        this.processingTimer = null;
        this.BATCH_PROCESSING_INTERVAL = 5000;
        this.MAX_BUFFER_SIZE = 100 * 1024 * 1024;
        this.CHUNK_TIMEOUT = 300000;
        this.prisma = prisma;
        this.nodeId = nodeId;
        this.registrationKey = registrationKey;
    }
    async start() {
        await this.loadActiveReceptionSessions();
        this.startChunkProcessing();
        this.emit('started');
    }
    stop() {
        if (this.processingTimer) {
            clearInterval(this.processingTimer);
            this.processingTimer = null;
        }
        this.emit('stopped');
    }
    async initializeReceptionSession(sessionId, sourceNodeId, metadata) {
        const session = {
            sessionId,
            sourceNodeId,
            targetNodeId: this.nodeId,
            startedAt: new Date(),
            status: 'RECEIVING',
            progress: 0,
            currentStep: 'Initializing reception',
            expectedChunks: 0,
            receivedChunks: 0,
            processedChunks: 0,
            totalRecords: metadata.expectedRecords,
            processedRecords: 0,
            tableStatus: new Map()
        };
        for (const tableName of metadata.selectedTables) {
            session.tableStatus.set(tableName, {
                expectedChunks: 0,
                receivedChunks: 0,
                processedChunks: 0,
                isComplete: false
            });
        }
        await this.createReceptionSession(session);
        this.receptionSessions.set(sessionId, session);
        this.chunkBuffer.set(sessionId, new Map());
        this.emit('reception_initialized', session);
    }
    async receiveChunk(chunk) {
        try {
            const session = this.receptionSessions.get(chunk.sessionId);
            if (!session) {
                throw new Error(`No active reception session: ${chunk.sessionId}`);
            }
            if (session.status !== 'RECEIVING') {
                throw new Error(`Session not in receiving state: ${session.status}`);
            }
            await this.validateChunk(chunk);
            const sessionBuffer = this.chunkBuffer.get(chunk.sessionId);
            sessionBuffer.set(chunk.chunkId, chunk);
            session.receivedChunks++;
            const tableStatus = session.tableStatus.get(chunk.tableName);
            tableStatus.receivedChunks++;
            if (tableStatus.expectedChunks === 0) {
                tableStatus.expectedChunks = chunk.totalChunks;
                session.expectedChunks += chunk.totalChunks;
            }
            await this.recordReceivedChunk(chunk);
            const progress = session.expectedChunks > 0
                ? (session.receivedChunks / session.expectedChunks) * 50
                : 0;
            await this.updateSessionProgress(session, progress, `Received ${session.receivedChunks}/${session.expectedChunks} chunks`);
            this.emit('chunk_received', { sessionId: chunk.sessionId, chunkId: chunk.chunkId });
            if (session.receivedChunks >= session.expectedChunks && session.expectedChunks > 0) {
                session.status = 'PROCESSING';
                await this.updateSessionProgress(session, 50, 'All chunks received, starting processing');
            }
            return true;
        }
        catch (error) {
            console.error('Failed to receive chunk:', error);
            await this.handleChunkError(chunk.sessionId, error);
            return false;
        }
    }
    async validateTransfer(sessionId, expectedChecksum, expectedRecordCount) {
        try {
            const session = this.receptionSessions.get(sessionId);
            if (!session) {
                return { valid: false, error: 'Session not found' };
            }
            session.status = 'VALIDATING';
            await this.updateSessionProgress(session, 85, 'Validating received data');
            if (session.processedRecords !== expectedRecordCount) {
                return {
                    valid: false,
                    error: `Record count mismatch: expected ${expectedRecordCount}, got ${session.processedRecords}`
                };
            }
            const actualChecksum = await this.calculateReceivedDataChecksum(session);
            if (actualChecksum !== expectedChecksum) {
                return {
                    valid: false,
                    error: `Checksum mismatch: expected ${expectedChecksum}, got ${actualChecksum}`
                };
            }
            session.status = 'COMPLETED';
            session.completedAt = new Date();
            await this.updateSessionProgress(session, 100, 'Transfer validation completed');
            await this.updateReceptionSession(session);
            this.cleanupSession(sessionId);
            this.emit('transfer_validated', session);
            return { valid: true };
        }
        catch (error) {
            console.error('Transfer validation failed:', error);
            return { valid: false, error: error instanceof Error ? error.message : 'Validation failed' };
        }
    }
    getActiveReceptionSessions() {
        return Array.from(this.receptionSessions.values());
    }
    getReceptionSession(sessionId) {
        return this.receptionSessions.get(sessionId) || null;
    }
    async cancelReceptionSession(sessionId) {
        const session = this.receptionSessions.get(sessionId);
        if (!session)
            return false;
        session.status = 'FAILED';
        session.completedAt = new Date();
        session.errorMessage = 'Reception cancelled';
        await this.updateReceptionSession(session);
        this.cleanupSession(sessionId);
        this.emit('reception_cancelled', session);
        return true;
    }
    startChunkProcessing() {
        this.processingTimer = setInterval(async () => {
            await this.processBufferedChunks();
        }, this.BATCH_PROCESSING_INTERVAL);
    }
    async processBufferedChunks() {
        for (const [sessionId, session] of this.receptionSessions) {
            if (session.status === 'PROCESSING') {
                await this.processSessionChunks(sessionId, session);
            }
        }
    }
    async processSessionChunks(sessionId, session) {
        const sessionBuffer = this.chunkBuffer.get(sessionId);
        if (!sessionBuffer)
            return;
        try {
            const tableChunks = new Map();
            for (const chunk of sessionBuffer.values()) {
                if (!tableChunks.has(chunk.tableName)) {
                    tableChunks.set(chunk.tableName, []);
                }
                tableChunks.get(chunk.tableName).push(chunk);
            }
            for (const [tableName, chunks] of tableChunks) {
                const tableStatus = session.tableStatus.get(tableName);
                chunks.sort((a, b) => a.sequenceNumber - b.sequenceNumber);
                for (const chunk of chunks) {
                    if (tableStatus.processedChunks <= chunk.sequenceNumber) {
                        await this.processChunk(chunk, session);
                        tableStatus.processedChunks++;
                        session.processedChunks++;
                        session.processedRecords += chunk.data.length;
                        sessionBuffer.delete(chunk.chunkId);
                    }
                }
                if (tableStatus.processedChunks >= tableStatus.expectedChunks && tableStatus.expectedChunks > 0) {
                    tableStatus.isComplete = true;
                }
            }
            const progress = session.expectedChunks > 0
                ? 50 + (session.processedChunks / session.expectedChunks) * 35
                : 50;
            await this.updateSessionProgress(session, progress, `Processed ${session.processedChunks}/${session.expectedChunks} chunks`);
            const allTablesComplete = Array.from(session.tableStatus.values()).every(status => status.isComplete);
            if (allTablesComplete) {
                session.status = 'VALIDATING';
                await this.updateSessionProgress(session, 85, 'Processing complete, ready for validation');
            }
        }
        catch (error) {
            console.error(`Failed to process chunks for session ${sessionId}:`, error);
            await this.handleSessionError(sessionId, error);
        }
    }
    async processChunk(chunk, session) {
        try {
            let data = chunk.data;
            if (chunk.isEncrypted) {
                data = await this.decryptChunkData(data);
            }
            await this.insertChunkData(chunk.tableName, data);
            this.emit('chunk_processed', { sessionId: session.sessionId, chunkId: chunk.chunkId });
        }
        catch (error) {
            console.error(`Failed to process chunk ${chunk.chunkId}:`, error);
            throw error;
        }
    }
    async insertChunkData(tableName, data) {
        if (data.length === 0)
            return;
        try {
            for (const record of data) {
                await this.upsertRecord(tableName, record);
            }
        }
        catch (error) {
            console.error(`Failed to insert data into table ${tableName}:`, error);
            throw error;
        }
    }
    async upsertRecord(tableName, record) {
        try {
            const cleanRecord = Object.fromEntries(Object.entries(record).filter(([_, value]) => value !== null && value !== undefined));
            const fields = Object.keys(cleanRecord);
            const values = fields.map(field => cleanRecord[field]);
            const placeholders = fields.map((_, index) => `$${index + 1}`).join(', ');
            const query = `
        INSERT INTO "${tableName}" (${fields.map(f => `"${f}"`).join(', ')})
        VALUES (${placeholders})
        ON CONFLICT (id) DO UPDATE SET
        ${fields.filter(f => f !== 'id').map(f => `"${f}" = EXCLUDED."${f}"`).join(', ')}
      `;
            await this.prisma.$executeRawUnsafe(query, ...values);
        }
        catch (error) {
            console.error(`Failed to upsert record in table ${tableName}:`, error);
            throw error;
        }
    }
    async validateChunk(chunk) {
        const calculatedChecksum = this.calculateDataChecksum(chunk.data);
        if (calculatedChecksum !== chunk.checksum) {
            throw new Error(`Chunk checksum mismatch: ${chunk.chunkId}`);
        }
        const chunkSize = JSON.stringify(chunk.data).length;
        if (chunkSize > 10 * 1024 * 1024) {
            throw new Error(`Chunk too large: ${chunk.chunkId}`);
        }
    }
    calculateDataChecksum(data) {
        const crypto = require('crypto');
        const dataString = JSON.stringify(data, Object.keys(data).sort());
        return crypto.createHash('sha256').update(dataString).digest('hex');
    }
    async decryptChunkData(encryptedData) {
        return encryptedData;
    }
    async calculateReceivedDataChecksum(session) {
        const crypto = require('crypto');
        const hash = crypto.createHash('sha256');
        for (const [tableName, status] of session.tableStatus) {
            if (status.isComplete) {
                hash.update(`${tableName}:${status.processedChunks}`);
            }
        }
        return hash.digest('hex');
    }
    async updateSessionProgress(session, progress, step) {
        session.progress = Math.min(100, Math.max(0, progress));
        session.currentStep = step;
        await this.updateReceptionSession(session);
        this.emit('reception_progress', { sessionId: session.sessionId, progress, step });
    }
    async handleChunkError(sessionId, error) {
        const session = this.receptionSessions.get(sessionId);
        if (session) {
            session.status = 'FAILED';
            session.completedAt = new Date();
            session.errorMessage = error instanceof Error ? error.message : 'Chunk processing failed';
            await this.updateReceptionSession(session);
            this.cleanupSession(sessionId);
            this.emit('reception_failed', { session, error });
        }
    }
    async handleSessionError(sessionId, error) {
        const session = this.receptionSessions.get(sessionId);
        if (session) {
            session.status = 'FAILED';
            session.completedAt = new Date();
            session.errorMessage = error instanceof Error ? error.message : 'Session processing failed';
            await this.updateReceptionSession(session);
            this.cleanupSession(sessionId);
            this.emit('reception_failed', { session, error });
        }
    }
    cleanupSession(sessionId) {
        this.receptionSessions.delete(sessionId);
        this.chunkBuffer.delete(sessionId);
    }
    async loadActiveReceptionSessions() {
    }
    async recordReceivedChunk(chunk) {
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
            });
        }
        catch (error) {
            console.error('Failed to record received chunk:', error);
        }
    }
    async createReceptionSession(session) {
    }
    async updateReceptionSession(session) {
    }
}
exports.InitialLoadReceiver = InitialLoadReceiver;
function createInitialLoadReceiver(prisma, nodeId, registrationKey) {
    return new InitialLoadReceiver(prisma, nodeId, registrationKey);
}
