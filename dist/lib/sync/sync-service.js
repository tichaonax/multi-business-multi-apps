"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SyncService = void 0;
exports.createSyncService = createSyncService;
exports.getDefaultSyncConfig = getDefaultSyncConfig;
const events_1 = require("events");
const client_1 = require("@prisma/client");
const sync_engine_1 = require("./sync-engine");
const peer_discovery_1 = require("./peer-discovery");
const conflict_resolver_1 = require("./conflict-resolver");
const database_hooks_1 = require("./database-hooks");
const sync_utils_1 = require("./sync-utils");
const partition_detector_1 = require("./partition-detector");
const partition_recovery_1 = require("./partition-recovery");
const initial_load_1 = require("./initial-load");
const initial_load_receiver_1 = require("./initial-load-receiver");
const security_manager_1 = require("./security-manager");
const schema_version_manager_1 = require("./schema-version-manager");
const sync_compatibility_guard_1 = require("./sync-compatibility-guard");
const os_1 = require("os");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
class SyncService extends events_1.EventEmitter {
    constructor(config) {
        super();
        this.syncEngine = null;
        this.peerDiscovery = null;
        this.conflictResolver = null;
        this.syncUtils = null;
        this.networkMonitor = null;
        this.offlineQueue = null;
        this.partitionDetector = null;
        this.recoveryService = null;
        this.initialLoadManager = null;
        this.initialLoadReceiver = null;
        this.securityManager = null;
        this.schemaVersionManager = null;
        this.compatibilityGuard = null;
        this.isRunning = false;
        this.isOnline = true;
        this.startTime = null;
        this.logStream = null;
        this.healthCheckTimer = null;
        const baseConfig = {
            syncInterval: 30000,
            enableAutoStart: true,
            logLevel: 'info',
            maxLogSize: 10 * 1024 * 1024,
            maxLogFiles: 5
        };
        this.config = Object.assign({}, baseConfig, config);
        this.nodeId = config.nodeId || (0, database_hooks_1.generateNodeId)();
        this.prisma = new client_1.PrismaClient();
        this.status = {
            isRunning: false,
            nodeId: this.nodeId,
            nodeName: this.config.nodeName,
            uptime: 0,
            peersConnected: 0,
            peersDiscovered: 0,
            lastSyncTime: null,
            totalEventsSynced: 0,
            conflictsResolved: 0,
            syncErrors: 0
        };
        this.initializeLogging();
        this.setupShutdownHandlers();
    }
    async start() {
        if (this.isRunning) {
            this.log('warn', 'Service is already running');
            return;
        }
        try {
            this.log('info', `Starting sync service: ${this.config.nodeName} (${this.nodeId})`);
            try {
                await this.initializeDatabase();
            }
            catch (dbInitErr) {
                this.log('error', 'Database initialization failed during start; entering reconnect mode', dbInitErr);
                this.isOnline = false;
                this.emit('offline', { error: dbInitErr });
                this.startDatabaseReconnectLoop();
            }
            await this.initializePeerDiscovery();
            await this.initializeSyncEngine();
            this.initializeConflictResolver();
            this.initializeUtils();
            await this.initializePartitionHandling();
            await this.initializeInitialLoadSystem();
            await this.initializeSecurityManager();
            await this.initializeSchemaVersionManager();
            this.initializeCompatibilityGuard();
            this.startHealthMonitoring();
            this.isRunning = true;
            this.startTime = new Date();
            this.status.isRunning = true;
            this.log('info', '✅ Sync service started successfully');
            this.emit('started', this.getStatus());
        }
        catch (error) {
            this.log('error', 'Failed to start sync service:', error);
            throw error;
        }
    }
    startDatabaseReconnectLoop() {
        const maxAttempts = 0;
        const baseDelay = 1000;
        let attempt = 0;
        const tryReconnect = async () => {
            if (this.isRunning === false && this.isOnline === true)
                return;
            attempt++;
            try {
                this.log('info', `Reconnect attempt ${attempt} to initialize database`);
                await this.initializeDatabase();
                this.isOnline = true;
                this.log('info', 'Database reconnected successfully');
                this.emit('online');
            }
            catch (err) {
                this.log('warn', `Database reconnect attempt ${attempt} failed: ${err.message || String(err)}`);
                const delay = baseDelay * Math.pow(2, Math.min(attempt - 1, 6));
                setTimeout(tryReconnect, delay);
            }
        };
        setTimeout(tryReconnect, baseDelay);
    }
    async stop() {
        if (!this.isRunning) {
            this.log('warn', 'Service is not running');
            return;
        }
        try {
            this.log('info', 'Stopping sync service...');
            if (this.healthCheckTimer) {
                clearInterval(this.healthCheckTimer);
                this.healthCheckTimer = null;
            }
            if (this.syncEngine) {
                await this.syncEngine.stop();
            }
            if (this.peerDiscovery) {
                await this.peerDiscovery.stop();
            }
            if (this.recoveryService) {
                await this.recoveryService.stop();
            }
            if (this.partitionDetector) {
                this.partitionDetector.stop();
            }
            if (this.initialLoadManager) {
                this.initialLoadManager.stop();
            }
            if (this.initialLoadReceiver) {
                this.initialLoadReceiver.stop();
            }
            if (this.securityManager) {
                await this.securityManager.shutdown();
                this.securityManager = null;
            }
            await this.prisma.$disconnect();
            this.isRunning = false;
            this.startTime = null;
            this.status.isRunning = false;
            if (this.logStream) {
                this.logStream.end();
                this.logStream = null;
            }
            this.log('info', '✅ Sync service stopped successfully');
            this.emit('stopped');
        }
        catch (error) {
            this.log('error', 'Error stopping sync service:', error);
            throw error;
        }
    }
    async restart() {
        this.log('info', 'Restarting sync service...');
        await this.stop();
        await new Promise(resolve => setTimeout(resolve, 2000));
        await this.start();
    }
    getStatus() {
        const now = new Date();
        return {
            ...this.status,
            uptime: this.startTime ? now.getTime() - this.startTime.getTime() : 0,
            peersConnected: this.peerDiscovery?.getDiscoveredPeers().length || 0,
            peersDiscovered: this.peerDiscovery?.getDiscoveredPeers().length || 0
        };
    }
    async forceSync() {
        if (!this.syncEngine) {
            throw new Error('Sync engine not initialized');
        }
        this.log('info', 'Force sync requested');
        await this.syncEngine.syncWithAllPeers();
    }
    async getSyncStats() {
        if (!this.syncUtils) {
            throw new Error('Sync utils not initialized');
        }
        return await this.syncUtils.getSyncStats();
    }
    getActivePartitions() {
        if (!this.partitionDetector) {
            return [];
        }
        return this.partitionDetector.getActivePartitions();
    }
    async initiatePartitionRecovery(partitionId, strategy) {
        if (!this.recoveryService) {
            throw new Error('Recovery service not initialized');
        }
        return await this.recoveryService.initiateRecovery(partitionId, strategy);
    }
    getRecoverySession(sessionId) {
        if (!this.recoveryService) {
            return null;
        }
        return this.recoveryService.getRecoverySession(sessionId);
    }
    getActiveRecoverySessions() {
        if (!this.recoveryService) {
            return [];
        }
        return this.recoveryService.getActiveRecoverySessions();
    }
    async getRecoveryMetrics() {
        if (!this.recoveryService) {
            return {
                totalRecoveries: 0,
                successfulRecoveries: 0,
                failedRecoveries: 0,
                averageRecoveryTime: 0,
                recoverySuccessRate: 0,
                commonFailureReasons: []
            };
        }
        return await this.recoveryService.getRecoveryMetrics();
    }
    async cancelRecoverySession(sessionId) {
        if (!this.recoveryService) {
            return false;
        }
        return await this.recoveryService.cancelRecoverySession(sessionId);
    }
    async authenticatePeer(peer, providedKeyHash) {
        if (!this.securityManager) {
            return { success: false, errorMessage: 'Security manager not initialized' };
        }
        return await this.securityManager.authenticatePeer(peer, providedKeyHash);
    }
    async establishSecureSession(targetNodeId, authToken) {
        if (!this.securityManager) {
            return { success: false, errorMessage: 'Security manager not initialized' };
        }
        return await this.securityManager.establishSecureSession(this.nodeId, targetNodeId, authToken);
    }
    async validateSession(sessionId) {
        if (!this.securityManager) {
            return { valid: false, errorMessage: 'Security manager not initialized' };
        }
        return await this.securityManager.validateSession(sessionId);
    }
    async getSecurityAuditLogs(limit = 100) {
        if (!this.securityManager) {
            return [];
        }
        return await this.securityManager.getAuditLogs(limit);
    }
    async getSecurityStats() {
        if (!this.securityManager) {
            return {
                totalAuthentications: 0,
                successfulAuthentications: 0,
                failedAuthentications: 0,
                activeSessions: 0,
                expiredSessions: 0,
                securityIncidents: 0
            };
        }
        return await this.securityManager.getSecurityStats();
    }
    async rotateRegistrationKey(newKey, gracePeriodMs = 300000) {
        if (!this.securityManager) {
            return false;
        }
        try {
            await this.securityManager.rotateRegistrationKey();
            return true;
        }
        catch (error) {
            console.error('Failed to rotate registration key:', error);
            return false;
        }
    }
    async revokeSession(sessionId) {
        if (!this.securityManager) {
            return false;
        }
        return await this.securityManager.revokeSession(sessionId);
    }
    async getActiveSessions() {
        if (!this.securityManager) {
            return [];
        }
        return await this.securityManager.getActiveSessions();
    }
    async createDataSnapshot() {
        if (!this.initialLoadManager) {
            throw new Error('Initial load manager not initialized');
        }
        return await this.initialLoadManager.createDataSnapshot();
    }
    async initiateInitialLoad(targetPeer, options) {
        if (!this.initialLoadManager) {
            throw new Error('Initial load manager not initialized');
        }
        return await this.initialLoadManager.initiateInitialLoad(targetPeer, options);
    }
    async requestInitialLoad(sourcePeer, options) {
        if (!this.initialLoadManager) {
            throw new Error('Initial load manager not initialized');
        }
        return await this.initialLoadManager.requestInitialLoad(sourcePeer, options);
    }
    getActiveInitialLoadSessions() {
        if (!this.initialLoadManager) {
            return [];
        }
        return this.initialLoadManager.getActiveSessions();
    }
    getInitialLoadSession(sessionId) {
        if (!this.initialLoadManager) {
            return null;
        }
        return this.initialLoadManager.getSession(sessionId);
    }
    async cancelInitialLoadSession(sessionId) {
        if (!this.initialLoadManager) {
            return false;
        }
        return await this.initialLoadManager.cancelSession(sessionId);
    }
    getActiveReceptionSessions() {
        if (!this.initialLoadReceiver) {
            return [];
        }
        return this.initialLoadReceiver.getActiveReceptionSessions();
    }
    async checkSchemaCompatibility(remoteNode) {
        if (!this.schemaVersionManager) {
            throw new Error('Schema version manager not initialized');
        }
        return await this.schemaVersionManager.checkCompatibility(remoteNode);
    }
    getCurrentSchemaVersion() {
        if (!this.schemaVersionManager) {
            return null;
        }
        return this.schemaVersionManager.getCurrentVersion();
    }
    async getSchemaCompatibilityReport() {
        if (!this.schemaVersionManager) {
            return {
                totalNodes: 0,
                compatibleNodes: 0,
                incompatibleNodes: 0,
                nodeDetails: []
            };
        }
        return await this.schemaVersionManager.getCompatibilityReport();
    }
    async isSyncAllowed(remoteNode) {
        if (!this.compatibilityGuard) {
            return {
                allowed: false,
                reason: 'Compatibility guard not initialized'
            };
        }
        return await this.compatibilityGuard.isSyncAllowed(remoteNode);
    }
    getSyncAttemptHistory() {
        if (!this.compatibilityGuard) {
            return [];
        }
        return this.compatibilityGuard.getSyncAttemptHistory();
    }
    getSyncAttemptStats() {
        if (!this.compatibilityGuard) {
            return {
                totalAttempts: 0,
                allowedAttempts: 0,
                blockedAttempts: 0,
                successRate: 0,
                recentBlocks: []
            };
        }
        return this.compatibilityGuard.getSyncAttemptStats();
    }
    getCompatibilityIssuesSummary() {
        if (!this.compatibilityGuard) {
            return {
                incompatibleNodes: [],
                commonIssues: []
            };
        }
        return this.compatibilityGuard.getCompatibilityIssuesSummary();
    }
    async initializeDatabase() {
        try {
            const ipAddress = this.getLocalIPAddress();
            await (0, database_hooks_1.initializeSyncSystem)(this.prisma, {
                nodeId: this.nodeId,
                nodeName: this.config.nodeName,
                registrationKey: this.config.registrationKey,
                ipAddress,
                port: this.config.port,
                enabled: true
            });
            this.log('info', 'Database sync system initialized');
        }
        catch (error) {
            this.log('error', 'Failed to initialize database sync system:', error);
            throw error;
        }
    }
    async initializePeerDiscovery() {
        try {
            this.peerDiscovery = (0, peer_discovery_1.createPeerDiscovery)(Object.assign({
                nodeId: this.nodeId,
                nodeName: this.config.nodeName,
                port: this.config.port,
                registrationKey: this.config.registrationKey,
                broadcastInterval: 30000,
                discoveryPort: 5353,
                serviceName: 'multi-business-sync'
            }, {}));
            this.peerDiscovery.on('peer_discovered', (peer) => {
                this.log('info', `New peer discovered: ${peer.nodeName} (${peer.nodeId})`);
                this.emit('peer_discovered', peer);
            });
            this.peerDiscovery.on('peer_left', (peer) => {
                this.log('info', `Peer left: ${peer.nodeName} (${peer.nodeId})`);
                this.emit('peer_left', peer);
            });
            this.peerDiscovery.on('error', (error) => {
                this.log('error', 'Peer discovery error:', error);
                this.status.syncErrors++;
            });
            await this.peerDiscovery.start();
            this.log('info', 'Peer discovery service started');
        }
        catch (error) {
            this.log('error', 'Failed to initialize peer discovery:', error);
            throw error;
        }
    }
    async initializeSyncEngine() {
        if (!this.peerDiscovery) {
            throw new Error('Peer discovery must be initialized first');
        }
        try {
            this.syncEngine = new sync_engine_1.SyncEngine(this.prisma, this.peerDiscovery, {
                nodeId: this.nodeId,
                registrationKey: this.config.registrationKey,
                syncInterval: this.config.syncInterval,
                batchSize: 50,
                retryAttempts: 3,
                compressionEnabled: true,
                encryptionEnabled: true
            });
            this.syncEngine.on('sync_started', ({ peer, session }) => {
                this.log('debug', `Sync started with ${peer.nodeName}`);
            });
            this.syncEngine.on('sync_completed', ({ peer, sentEvents, receivedEvents }) => {
                this.log('info', `Sync completed with ${peer.nodeName}: sent ${sentEvents}, received ${receivedEvents}`);
                this.status.totalEventsSynced += sentEvents + receivedEvents;
                this.status.lastSyncTime = new Date();
                this.emit('sync_completed', { peer, sentEvents, receivedEvents });
            });
            this.syncEngine.on('sync_failed', ({ peer, error }) => {
                this.log('error', `Sync failed with ${peer.nodeName}:`, error);
                this.status.syncErrors++;
                this.emit('sync_failed', { peer, error });
            });
            this.syncEngine.on('conflict_resolved', ({ conflict, session }) => {
                this.log('info', `Conflict resolved using ${conflict.strategy}`);
                this.status.conflictsResolved++;
                this.emit('conflict_resolved', conflict);
            });
            await this.syncEngine.start();
            this.log('info', 'Sync engine started');
        }
        catch (error) {
            this.log('error', 'Failed to initialize sync engine:', error);
            throw error;
        }
    }
    initializeConflictResolver() {
        try {
            this.conflictResolver = new conflict_resolver_1.ConflictResolver(this.prisma, this.nodeId);
            this.log('info', 'Conflict resolver initialized');
        }
        catch (error) {
            this.log('error', 'Failed to initialize conflict resolver:', error);
            throw error;
        }
    }
    initializeUtils() {
        try {
            this.syncUtils = new sync_utils_1.SyncUtils(this.prisma, this.nodeId);
            this.log('info', 'Sync utilities initialized');
        }
        catch (error) {
            this.log('error', 'Failed to initialize sync utilities:', error);
            throw error;
        }
    }
    async initializePartitionHandling() {
        try {
            this.partitionDetector = (0, partition_detector_1.createPartitionDetector)(this.prisma, this.nodeId, this.config.registrationKey);
            this.recoveryService = (0, partition_recovery_1.createPartitionRecoveryService)(this.prisma, this.nodeId, this.config.registrationKey, this.partitionDetector);
            if (this.syncEngine) {
                this.recoveryService.setSyncEngine(this.syncEngine);
            }
            if (this.peerDiscovery) {
                this.recoveryService.setPeerDiscovery(this.peerDiscovery);
            }
            if (this.syncEngine) {
                this.syncEngine.on('sync_failed', ({ peer, error }) => {
                    this.partitionDetector?.reportSyncFailure(peer, error);
                });
            }
            await this.partitionDetector.start();
            await this.recoveryService.start();
            this.log('info', 'Partition detection and recovery initialized');
        }
        catch (error) {
            this.log('error', 'Failed to initialize partition handling:', error);
            throw error;
        }
    }
    async initializeInitialLoadSystem() {
        try {
            this.initialLoadManager = (0, initial_load_1.createInitialLoadManager)(this.prisma, this.nodeId, this.config.registrationKey);
            this.initialLoadReceiver = (0, initial_load_receiver_1.createInitialLoadReceiver)(this.prisma, this.nodeId, this.config.registrationKey);
            await this.initialLoadManager.start();
            await this.initialLoadReceiver.start();
            this.log('info', 'Initial load system initialized');
        }
        catch (error) {
            this.log('error', 'Failed to initialize initial load system:', error);
            throw error;
        }
    }
    async initializeSecurityManager() {
        try {
            this.log('info', 'Initializing security manager...');
            this.securityManager = (0, security_manager_1.createSecurityManager)(this.prisma, this.nodeId, {
                registrationKey: this.config.registrationKey,
                enableEncryption: this.config.security?.enableEncryption ?? true,
                enableSignatures: this.config.security?.enableSignatures ?? true,
                keyRotationEnabled: this.config.security?.keyRotationEnabled ?? false,
                keyRotationInterval: this.config.security?.keyRotationInterval ?? 24 * 60 * 60 * 1000,
                sessionTimeout: this.config.security?.sessionTimeout ?? 60 * 60 * 1000,
                maxFailedAttempts: this.config.security?.maxFailedAttempts ?? 5,
                rateLimitWindow: this.config.security?.rateLimitWindow ?? 60 * 1000,
                rateLimitMaxRequests: this.config.security?.rateLimitMaxRequests ?? 100
            });
            await this.securityManager.start();
            this.log('info', 'Security manager initialized');
        }
        catch (error) {
            this.log('error', 'Failed to initialize security manager:', error);
            throw error;
        }
    }
    async initializeSchemaVersionManager() {
        try {
            this.log('info', 'Initializing schema version manager...');
            this.schemaVersionManager = (0, schema_version_manager_1.createSchemaVersionManager)(this.prisma, this.nodeId);
            await this.schemaVersionManager.initialize();
            this.log('info', 'Schema version manager initialized');
        }
        catch (error) {
            this.log('error', 'Failed to initialize schema version manager:', error);
            throw error;
        }
    }
    initializeCompatibilityGuard() {
        if (!this.schemaVersionManager) {
            throw new Error('Schema version manager must be initialized first');
        }
        try {
            this.log('info', 'Initializing compatibility guard...');
            this.compatibilityGuard = (0, sync_compatibility_guard_1.createSyncCompatibilityGuard)(this.schemaVersionManager);
            this.log('info', 'Compatibility guard initialized');
        }
        catch (error) {
            this.log('error', 'Failed to initialize compatibility guard:', error);
            throw error;
        }
    }
    startHealthMonitoring() {
        this.healthCheckTimer = setInterval(async () => {
            try {
                this.status = this.getStatus();
                this.emit('health_check', this.status);
                if (this.config.logLevel === 'debug') {
                    this.log('debug', `Health check: ${this.status.peersConnected} peers, ${this.status.totalEventsSynced} events synced`);
                }
            }
            catch (error) {
                this.log('error', 'Health check failed:', error);
            }
        }, 60000);
    }
    initializeLogging() {
        try {
            if (!fs_1.default.existsSync(this.config.dataDirectory)) {
                fs_1.default.mkdirSync(this.config.dataDirectory, { recursive: true });
            }
            const logFile = path_1.default.join(this.config.dataDirectory, 'sync-service.log');
            if (fs_1.default.existsSync(logFile)) {
                const stats = fs_1.default.statSync(logFile);
                if (stats.size > this.config.maxLogSize) {
                    this.rotateLogFiles(logFile);
                }
            }
            this.logStream = fs_1.default.createWriteStream(logFile, { flags: 'a' });
        }
        catch (error) {
            console.error('Failed to initialize logging:', error);
        }
    }
    rotateLogFiles(logFile) {
        try {
            for (let i = this.config.maxLogFiles - 1; i >= 1; i--) {
                const oldFile = `${logFile}.${i}`;
                const newFile = `${logFile}.${i + 1}`;
                if (fs_1.default.existsSync(oldFile)) {
                    if (i === this.config.maxLogFiles - 1) {
                        fs_1.default.unlinkSync(oldFile);
                    }
                    else {
                        fs_1.default.renameSync(oldFile, newFile);
                    }
                }
            }
            fs_1.default.renameSync(logFile, `${logFile}.1`);
        }
        catch (error) {
            console.error('Failed to rotate log files:', error);
        }
    }
    log(level, message, ...args) {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] [${level.toUpperCase()}] [${this.nodeId}] ${message}`;
        console.log(logMessage, ...args);
        if (this.logStream) {
            const fullMessage = args.length > 0
                ? `${logMessage} ${args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ')}\n`
                : `${logMessage}\n`;
            this.logStream.write(fullMessage);
        }
    }
    getLocalIPAddress() {
        const interfaces = (0, os_1.networkInterfaces)();
        for (const [name, nets] of Object.entries(interfaces)) {
            if (nets) {
                for (const net of nets) {
                    if (!net.internal && net.family === 'IPv4') {
                        return net.address;
                    }
                }
            }
        }
        return '127.0.0.1';
    }
    setupShutdownHandlers() {
        const shutdown = async (signal) => {
            this.log('info', `Received ${signal}, shutting down gracefully...`);
            try {
                await this.stop();
                process.exit(0);
            }
            catch (error) {
                this.log('error', 'Error during shutdown:', error);
                process.exit(1);
            }
        };
        process.on('SIGINT', () => shutdown('SIGINT'));
        process.on('SIGTERM', () => shutdown('SIGTERM'));
        if (process.platform === 'win32') {
            process.on('SIGHUP', () => shutdown('SIGHUP'));
        }
    }
}
exports.SyncService = SyncService;
function createSyncService(config) {
    return new SyncService(config);
}
function getDefaultSyncConfig() {
    return {
        port: 8765,
        syncInterval: 30000,
        enableAutoStart: true,
        logLevel: 'info',
        dataDirectory: './data/sync',
        maxLogSize: 10 * 1024 * 1024,
        maxLogFiles: 5
    };
}
