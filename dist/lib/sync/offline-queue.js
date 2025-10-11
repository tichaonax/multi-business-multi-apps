"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OfflineQueueManager = void 0;
exports.createOfflineQueueManager = createOfflineQueueManager;
const events_1 = require("events");
const crypto_1 = __importDefault(require("crypto"));
class OfflineQueueManager extends events_1.EventEmitter {
    constructor(prisma, nodeId) {
        super();
        this.isOnline = true;
        this.isProcessing = false;
        this.queue = new Map();
        this.processTimer = null;
        this.maxQueueSize = 10000;
        this.maxRetries = 3;
        this.processBatchSize = 50;
        this.prisma = prisma;
        this.nodeId = nodeId;
    }
    async start() {
        await this.loadQueueFromDatabase();
        this.startProcessing();
        this.emit('started');
    }
    async stop() {
        if (this.processTimer) {
            clearInterval(this.processTimer);
            this.processTimer = null;
        }
        await this.saveQueueToDatabase();
        this.emit('stopped');
    }
    setOnlineStatus(isOnline) {
        const wasOnline = this.isOnline;
        this.isOnline = isOnline;
        if (!wasOnline && isOnline) {
            this.emit('online');
            this.processQueue();
        }
        else if (wasOnline && !isOnline) {
            this.emit('offline');
        }
    }
    async addToQueue(event) {
        if (this.queue.size >= this.maxQueueSize) {
            await this.cleanupProcessedItems();
            if (this.queue.size >= this.maxQueueSize) {
                throw new Error('Offline queue is full');
            }
        }
        const queueItem = {
            id: crypto_1.default.randomUUID(),
            eventId: event.eventId,
            tableName: event.tableName,
            recordId: event.recordId,
            operation: event.operation,
            changeData: event.changeData,
            beforeData: event.beforeData,
            queuedAt: new Date(),
            priority: event.priority,
            retryCount: 0,
            dependencies: this.calculateDependencies(event),
            isProcessed: false
        };
        this.queue.set(queueItem.id, queueItem);
        await this.persistQueueItem(queueItem);
        this.emit('item_queued', queueItem);
        if (this.isOnline && !this.isProcessing) {
            setImmediate(() => this.processQueue());
        }
    }
    getQueueStats() {
        const items = Array.from(this.queue.values());
        const pendingItems = items.filter(item => !item.isProcessed && item.retryCount < this.maxRetries);
        const processedItems = items.filter(item => item.isProcessed);
        const failedItems = items.filter(item => !item.isProcessed && item.retryCount >= this.maxRetries);
        const oldestItem = items.length > 0
            ? new Date(Math.min(...items.map(item => item.queuedAt.getTime())))
            : null;
        const queueSizeBytes = this.calculateQueueSizeBytes();
        return {
            totalItems: items.length,
            pendingItems: pendingItems.length,
            processedItems: processedItems.length,
            failedItems: failedItems.length,
            oldestItem,
            queueSizeBytes
        };
    }
    async forceProcessQueue() {
        if (!this.isProcessing) {
            await this.processQueue();
        }
    }
    async clearProcessedItems() {
        const processedCount = await this.cleanupProcessedItems();
        await this.saveQueueToDatabase();
        return processedCount;
    }
    startProcessing() {
        this.processTimer = setInterval(async () => {
            if (this.isOnline && !this.isProcessing) {
                await this.processQueue();
            }
        }, 30000);
    }
    async processQueue() {
        if (this.isProcessing || !this.isOnline) {
            return;
        }
        this.isProcessing = true;
        this.emit('processing_started');
        try {
            const pendingItems = Array.from(this.queue.values())
                .filter(item => !item.isProcessed && item.retryCount < this.maxRetries)
                .sort((a, b) => {
                if (a.priority !== b.priority) {
                    return b.priority - a.priority;
                }
                return a.queuedAt.getTime() - b.queuedAt.getTime();
            });
            let processedCount = 0;
            let failedCount = 0;
            for (let i = 0; i < pendingItems.length; i += this.processBatchSize) {
                const batch = pendingItems.slice(i, i + this.processBatchSize);
                for (const item of batch) {
                    try {
                        if (!this.areDependenciesSatisfied(item)) {
                            continue;
                        }
                        const success = await this.processQueueItem(item);
                        if (success) {
                            item.isProcessed = true;
                            processedCount++;
                            this.emit('item_processed', item);
                        }
                        else {
                            item.retryCount++;
                            item.lastAttempt = new Date();
                            failedCount++;
                            this.emit('item_failed', item);
                        }
                        await this.persistQueueItem(item);
                    }
                    catch (error) {
                        item.retryCount++;
                        item.lastAttempt = new Date();
                        item.errorMessage = error instanceof Error ? error.message : 'Unknown error';
                        failedCount++;
                        await this.persistQueueItem(item);
                        this.emit('item_error', { item, error });
                    }
                }
                if (i + this.processBatchSize < pendingItems.length) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            }
            this.emit('processing_completed', { processedCount, failedCount });
        }
        catch (error) {
            this.emit('processing_error', error);
        }
        finally {
            this.isProcessing = false;
        }
    }
    async processQueueItem(item) {
        try {
            const event = {
                eventId: item.eventId,
                sourceNodeId: this.nodeId,
                tableName: item.tableName,
                recordId: item.recordId,
                operation: item.operation,
                changeData: item.changeData,
                beforeData: item.beforeData,
                vectorClock: {},
                lamportClock: BigInt(Date.now()).toString(),
                checksum: this.calculateChecksum(item.changeData),
                priority: item.priority,
                metadata: {
                    queuedOffline: true,
                    originalQueueTime: item.queuedAt.toISOString()
                }
            };
            const { getChangeTracker } = await Promise.resolve().then(() => __importStar(require('./change-tracker')));
            const changeTracker = getChangeTracker(this.prisma, this.nodeId, 'temp-key');
            await changeTracker.submitEvent(event);
            return true;
        }
        catch (error) {
            console.error('Failed to process queue item:', error);
            return false;
        }
    }
    calculateDependencies(event) {
        const dependencies = [];
        if (event.operation === 'UPDATE' || event.operation === 'DELETE') {
            for (const [id, item] of this.queue) {
                if (item.tableName === event.tableName &&
                    item.recordId === event.recordId &&
                    item.operation === 'CREATE' &&
                    !item.isProcessed) {
                    dependencies.push(id);
                }
            }
        }
        return dependencies;
    }
    areDependenciesSatisfied(item) {
        for (const depId of item.dependencies) {
            const dependency = this.queue.get(depId);
            if (dependency && !dependency.isProcessed) {
                return false;
            }
        }
        return true;
    }
    calculateChecksum(data) {
        const crypto = require('crypto');
        const dataString = JSON.stringify(data, Object.keys(data).sort());
        return crypto.createHash('sha256').update(dataString).digest('hex');
    }
    calculateQueueSizeBytes() {
        let totalSize = 0;
        for (const item of this.queue.values()) {
            totalSize += JSON.stringify(item).length;
        }
        return totalSize;
    }
    async cleanupProcessedItems() {
        const processedItems = Array.from(this.queue.entries())
            .filter(([id, item]) => item.isProcessed);
        let removedCount = 0;
        const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000);
        for (const [id, item] of processedItems) {
            if (item.queuedAt < cutoffTime) {
                this.queue.delete(id);
                await this.removeQueueItemFromDatabase(id);
                removedCount++;
            }
        }
        return removedCount;
    }
    async loadQueueFromDatabase() {
        try {
            const queueItems = await this.prisma.offlineQueue.findMany({
                where: { nodeId: this.nodeId },
                orderBy: { queuedAt: 'asc' }
            });
            for (const dbItem of queueItems) {
                const queueItem = {
                    id: dbItem.id,
                    eventId: dbItem.eventId,
                    tableName: dbItem.tableName,
                    recordId: dbItem.recordId,
                    operation: dbItem.operation,
                    changeData: dbItem.changeData,
                    beforeData: dbItem.beforeData ?? undefined,
                    queuedAt: dbItem.queuedAt,
                    priority: dbItem.priority,
                    retryCount: dbItem.retryCount,
                    lastAttempt: dbItem.lastAttempt ?? undefined,
                    errorMessage: dbItem.errorMessage ?? undefined,
                    dependencies: dbItem.dependencies || [],
                    isProcessed: dbItem.isProcessed
                };
                this.queue.set(queueItem.id, queueItem);
            }
            console.log(`📥 Loaded ${queueItems.length} items from offline queue`);
        }
        catch (error) {
            console.error('Failed to load offline queue from database:', error);
        }
    }
    async saveQueueToDatabase() {
        try {
            for (const item of this.queue.values()) {
                await this.persistQueueItem(item);
            }
        }
        catch (error) {
            console.error('Failed to save offline queue to database:', error);
        }
    }
    async persistQueueItem(item) {
        try {
            await this.prisma.offlineQueue.upsert({
                where: { id: item.id },
                update: {
                    retryCount: item.retryCount,
                    lastAttempt: item.lastAttempt,
                    errorMessage: item.errorMessage,
                    isProcessed: item.isProcessed
                },
                create: {
                    id: item.id,
                    nodeId: this.nodeId,
                    eventId: item.eventId,
                    tableName: item.tableName,
                    recordId: item.recordId,
                    operation: item.operation,
                    changeData: item.changeData,
                    beforeData: item.beforeData,
                    queuedAt: item.queuedAt,
                    priority: item.priority,
                    retryCount: item.retryCount,
                    lastAttempt: item.lastAttempt,
                    errorMessage: item.errorMessage,
                    dependencies: item.dependencies,
                    isProcessed: item.isProcessed
                }
            });
        }
        catch (error) {
            console.error('Failed to persist queue item:', error);
        }
    }
    async removeQueueItemFromDatabase(itemId) {
        try {
            await this.prisma.offlineQueue.delete({
                where: { id: itemId }
            });
        }
        catch (error) {
            console.error('Failed to remove queue item from database:', error);
        }
    }
}
exports.OfflineQueueManager = OfflineQueueManager;
function createOfflineQueueManager(prisma, nodeId) {
    return new OfflineQueueManager(prisma, nodeId);
}
