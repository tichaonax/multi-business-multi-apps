"use strict";
/**
 * Background Sync Service
 * Independent service that runs database synchronization without the main Next.js app
 * Based on electricity-tokens service architecture
 */
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
const os_1 = require("os");
const path_1 = require("path");
const fs_1 = require("fs");
/**
 * Background Sync Service
 * Runs independently of the main application
 */
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
        this.isRunning = false;
        this.isOnline = true;
        this.startTime = null;
        this.logStream = null;
        this.healthCheckTimer = null;
        this.config = {
            syncInterval: 30000, // 30 seconds
            enableAutoStart: true,
            logLevel: 'info',
            maxLogSize: 10 * 1024 * 1024, // 10MB
            maxLogFiles: 5,
            ...config
        };
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
        // Setup logging
        this.initializeLogging();
        // Handle graceful shutdown
        this.setupShutdownHandlers();
    }
    /**
     * Start the sync service
     */
    async start() {
        if (this.isRunning) {
            this.log('warn', 'Service is already running');
            return;
        }
        try {
            this.log('info', `Starting sync service: ${this.config.nodeName} (${this.nodeId})`);
            // Initialize database sync system (with retry/reconnect support)
            try {
                await this.initializeDatabase();
            }
            catch (dbInitErr) {
                this.log('error', 'Database initialization failed during start; entering reconnect mode', dbInitErr);
                this.isOnline = false;
                this.emit('offline', { error: dbInitErr });
                // Start background reconnect loop (non-blocking)
                this.startDatabaseReconnectLoop();
                // Continue startup (service will operate in degraded/offline mode until DB reconnects)
            }
            // Initialize peer discovery
            await this.initializePeerDiscovery();
            // Initialize sync engine
            await this.initializeSyncEngine();
            // Initialize conflict resolver
            this.initializeConflictResolver();
            // Initialize utilities
            this.initializeUtils();
            // Initialize partition detection and recovery
            await this.initializePartitionHandling();
            // Initialize initial load system
            await this.initializeInitialLoadSystem();
            // Initialize security manager
            await this.initializeSecurityManager();
            // Start health monitoring
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
    /**
     * Start a background loop that attempts to reconnect and re-run initializeDatabase
     */
    startDatabaseReconnectLoop() {
        const maxAttempts = 0; // 0 = infinite retries
        const baseDelay = 1000; // 1s
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
                const delay = baseDelay * Math.pow(2, Math.min(attempt - 1, 6)); // cap backoff at 64x
                setTimeout(tryReconnect, delay);
            }
        };
        // Start first reconnect attempt after a short delay
        setTimeout(tryReconnect, baseDelay);
    }
    /**
     * Stop the sync service
     */
    async stop() {
        if (!this.isRunning) {
            this.log('warn', 'Service is not running');
            return;
        }
        try {
            this.log('info', 'Stopping sync service...');
            // Stop health monitoring
            if (this.healthCheckTimer) {
                clearInterval(this.healthCheckTimer);
                this.healthCheckTimer = null;
            }
            // Stop sync engine
            if (this.syncEngine) {
                await this.syncEngine.stop();
            }
            // Stop peer discovery
            if (this.peerDiscovery) {
                await this.peerDiscovery.stop();
            }
            // Stop partition handling
            if (this.recoveryService) {
                await this.recoveryService.stop();
            }
            if (this.partitionDetector) {
                this.partitionDetector.stop();
            }
            // Stop initial load system
            if (this.initialLoadManager) {
                this.initialLoadManager.stop();
            }
            if (this.initialLoadReceiver) {
                this.initialLoadReceiver.stop();
            }
            // Stop security manager
            if (this.securityManager) {
                await this.securityManager.shutdown();
                this.securityManager = null;
            }
            // Close database connection
            await this.prisma.$disconnect();
            this.isRunning = false;
            this.startTime = null;
            this.status.isRunning = false;
            // Close log stream
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
    /**
     * Restart the sync service
     */
    async restart() {
        this.log('info', 'Restarting sync service...');
        await this.stop();
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
        await this.start();
    }
    /**
     * Get service status
     */
    getStatus() {
        const now = new Date();
        return {
            ...this.status,
            uptime: this.startTime ? now.getTime() - this.startTime.getTime() : 0,
            peersConnected: this.peerDiscovery?.getDiscoveredPeers().length || 0,
            peersDiscovered: this.peerDiscovery?.getDiscoveredPeers().length || 0
        };
    }
    /**
     * Force sync with all peers
     */
    async forceSync() {
        if (!this.syncEngine) {
            throw new Error('Sync engine not initialized');
        }
        this.log('info', 'Force sync requested');
        await this.syncEngine.syncWithAllPeers();
    }
    /**
     * Get sync statistics
     */
    async getSyncStats() {
        if (!this.syncUtils) {
            throw new Error('Sync utils not initialized');
        }
        return await this.syncUtils.getSyncStats();
    }
    /**
     * Get active partitions
     */
    getActivePartitions() {
        if (!this.partitionDetector) {
            return [];
        }
        return this.partitionDetector.getActivePartitions();
    }
    /**
     * Initiate partition recovery
     */
    async initiatePartitionRecovery(partitionId, strategy) {
        if (!this.recoveryService) {
            throw new Error('Recovery service not initialized');
        }
        return await this.recoveryService.initiateRecovery(partitionId, strategy);
    }
    /**
     * Get recovery session status
     */
    getRecoverySession(sessionId) {
        if (!this.recoveryService) {
            return null;
        }
        return this.recoveryService.getRecoverySession(sessionId);
    }
    /**
     * Get all active recovery sessions
     */
    getActiveRecoverySessions() {
        if (!this.recoveryService) {
            return [];
        }
        return this.recoveryService.getActiveRecoverySessions();
    }
    /**
     * Get recovery metrics
     */
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
    /**
     * Cancel recovery session
     */
    async cancelRecoverySession(sessionId) {
        if (!this.recoveryService) {
            return false;
        }
        return await this.recoveryService.cancelRecoverySession(sessionId);
    }
    /**
     * Authenticate a peer for sync operations
     */
    async authenticatePeer(peer, providedKeyHash) {
        if (!this.securityManager) {
            return { success: false, errorMessage: 'Security manager not initialized' };
        }
        return await this.securityManager.authenticatePeer(peer, providedKeyHash);
    }
    /**
     * Establish secure session with peer
     */
    async establishSecureSession(targetNodeId, authToken) {
        if (!this.securityManager) {
            return { success: false, errorMessage: 'Security manager not initialized' };
        }
        return await this.securityManager.establishSecureSession(this.nodeId, targetNodeId, authToken);
    }
    /**
     * Validate security session
     */
    async validateSession(sessionId) {
        if (!this.securityManager) {
            return { valid: false, errorMessage: 'Security manager not initialized' };
        }
        return await this.securityManager.validateSession(sessionId);
    }
    /**
     * Get security audit logs
     */
    async getSecurityAuditLogs(limit = 100) {
        if (!this.securityManager) {
            return [];
        }
        return await this.securityManager.getAuditLogs(limit);
    }
    /**
     * Get security statistics
     */
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
    /**
     * Rotate registration key
     */
    async rotateRegistrationKey(newKey, gracePeriodMs = 300000) {
        if (!this.securityManager) {
            return false;
        }
        return await this.securityManager.rotateRegistrationKey(newKey, gracePeriodMs);
    }
    /**
     * Revoke session
     */
    async revokeSession(sessionId) {
        if (!this.securityManager) {
            return false;
        }
        return await this.securityManager.revokeSession(sessionId);
    }
    /**
     * Get active security sessions
     */
    async getActiveSessions() {
        if (!this.securityManager) {
            return [];
        }
        return await this.securityManager.getActiveSessions();
    }
    /**
     * Create data snapshot
     */
    async createDataSnapshot() {
        if (!this.initialLoadManager) {
            throw new Error('Initial load manager not initialized');
        }
        return await this.initialLoadManager.createDataSnapshot();
    }
    /**
     * Initiate initial load to target peer
     */
    async initiateInitialLoad(targetPeer, options) {
        if (!this.initialLoadManager) {
            throw new Error('Initial load manager not initialized');
        }
        return await this.initialLoadManager.initiateInitialLoad(targetPeer, options);
    }
    /**
     * Request initial load from source peer
     */
    async requestInitialLoad(sourcePeer, options) {
        if (!this.initialLoadManager) {
            throw new Error('Initial load manager not initialized');
        }
        return await this.initialLoadManager.requestInitialLoad(sourcePeer, options);
    }
    /**
     * Get active initial load sessions
     */
    getActiveInitialLoadSessions() {
        if (!this.initialLoadManager) {
            return [];
        }
        return this.initialLoadManager.getActiveSessions();
    }
    /**
     * Get initial load session
     */
    getInitialLoadSession(sessionId) {
        if (!this.initialLoadManager) {
            return null;
        }
        return this.initialLoadManager.getSession(sessionId);
    }
    /**
     * Cancel initial load session
     */
    async cancelInitialLoadSession(sessionId) {
        if (!this.initialLoadManager) {
            return false;
        }
        return await this.initialLoadManager.cancelSession(sessionId);
    }
    /**
     * Get active reception sessions
     */
    getActiveReceptionSessions() {
        if (!this.initialLoadReceiver) {
            return [];
        }
        return this.initialLoadReceiver.getActiveReceptionSessions();
    }
    /**
     * Initialize database sync system
     */
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
    /**
     * Initialize peer discovery service
     */
    async initializePeerDiscovery() {
        try {
            this.peerDiscovery = (0, peer_discovery_1.createPeerDiscovery)({
                nodeId: this.nodeId,
                nodeName: this.config.nodeName,
                port: this.config.port,
                registrationKey: this.config.registrationKey
            });
            // Listen for peer events
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
    /**
     * Initialize sync engine
     */
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
            // Listen for sync events
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
    /**
     * Initialize conflict resolver
     */
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
    /**
     * Initialize sync utilities
     */
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
    /**
     * Initialize partition detection and recovery
     */
    async initializePartitionHandling() {
        try {
            // Initialize partition detector
            this.partitionDetector = (0, partition_detector_1.createPartitionDetector)(this.prisma, this.nodeId, this.config.registrationKey);
            // Initialize recovery service
            this.recoveryService = (0, partition_recovery_1.createPartitionRecoveryService)(this.prisma, this.nodeId, this.config.registrationKey, this.partitionDetector);
            // Set references for cross-component communication
            if (this.syncEngine) {
                this.recoveryService.setSyncEngine(this.syncEngine);
            }
            if (this.peerDiscovery) {
                this.recoveryService.setPeerDiscovery(this.peerDiscovery);
            }
            // Setup event handlers for sync engine integration
            if (this.syncEngine) {
                this.syncEngine.on('sync_failed', ({ peer, error }) => {
                    this.partitionDetector?.reportSyncFailure(peer, error);
                });
            }
            // Start partition monitoring
            await this.partitionDetector.start();
            await this.recoveryService.start();
            this.log('info', 'Partition detection and recovery initialized');
        }
        catch (error) {
            this.log('error', 'Failed to initialize partition handling:', error);
            throw error;
        }
    }
    /**
     * Initialize initial load system
     */
    async initializeInitialLoadSystem() {
        try {
            // Initialize initial load manager
            this.initialLoadManager = (0, initial_load_1.createInitialLoadManager)(this.prisma, this.nodeId, this.config.registrationKey);
            // Initialize initial load receiver
            this.initialLoadReceiver = (0, initial_load_receiver_1.createInitialLoadReceiver)(this.prisma, this.nodeId, this.config.registrationKey);
            // Start initial load services
            await this.initialLoadManager.start();
            await this.initialLoadReceiver.start();
            this.log('info', 'Initial load system initialized');
        }
        catch (error) {
            this.log('error', 'Failed to initialize initial load system:', error);
            throw error;
        }
    }
    /**
     * Initialize security manager
     */
    async initializeSecurityManager() {
        try {
            this.log('info', 'Initializing security manager...');
            // Create security manager instance with prisma and nodeId
            this.securityManager = (0, security_manager_1.createSecurityManager)(this.prisma, this.nodeId, {
                registrationKey: this.config.registrationKey,
                enableEncryption: this.config.security?.enableEncryption ?? true,
                enableSignatures: this.config.security?.enableSignatures ?? true,
                keyRotationEnabled: this.config.security?.keyRotationEnabled ?? false,
                keyRotationInterval: this.config.security?.keyRotationInterval ?? 24 * 60 * 60 * 1000, // 24 hours
                sessionTimeout: this.config.security?.sessionTimeout ?? 60 * 60 * 1000, // 1 hour
                maxFailedAttempts: this.config.security?.maxFailedAttempts ?? 5,
                rateLimitWindow: this.config.security?.rateLimitWindow ?? 60 * 1000, // 1 minute
                rateLimitMaxRequests: this.config.security?.rateLimitMaxRequests ?? 100
            });
            // Start the security manager
            await this.securityManager.start();
            this.log('info', 'Security manager initialized');
        }
        catch (error) {
            this.log('error', 'Failed to initialize security manager:', error);
            throw error;
        }
    }
    /**
     * Start health monitoring
     */
    startHealthMonitoring() {
        this.healthCheckTimer = setInterval(async () => {
            try {
                // Update status
                this.status = this.getStatus();
                // Emit health status
                this.emit('health_check', this.status);
                // Log periodic status
                if (this.config.logLevel === 'debug') {
                    this.log('debug', `Health check: ${this.status.peersConnected} peers, ${this.status.totalEventsSynced} events synced`);
                }
            }
            catch (error) {
                this.log('error', 'Health check failed:', error);
            }
        }, 60000); // Every minute
    }
    /**
     * Initialize logging system
     */
    initializeLogging() {
        try {
            // Ensure data directory exists
            if (!fs_1.default.existsSync(this.config.dataDirectory)) {
                fs_1.default.mkdirSync(this.config.dataDirectory, { recursive: true });
            }
            // Setup log rotation
            const logFile = path_1.default.join(this.config.dataDirectory, 'sync-service.log');
            // Check log file size and rotate if needed
            if (fs_1.default.existsSync(logFile)) {
                const stats = fs_1.default.statSync(logFile);
                if (stats.size > this.config.maxLogSize) {
                    this.rotateLogFiles(logFile);
                }
            }
            // Create write stream
            this.logStream = fs_1.default.createWriteStream(logFile, { flags: 'a' });
        }
        catch (error) {
            console.error('Failed to initialize logging:', error);
        }
    }
    /**
     * Rotate log files
     */
    rotateLogFiles(logFile) {
        try {
            for (let i = this.config.maxLogFiles - 1; i >= 1; i--) {
                const oldFile = `${logFile}.${i}`;
                const newFile = `${logFile}.${i + 1}`;
                if (fs_1.default.existsSync(oldFile)) {
                    if (i === this.config.maxLogFiles - 1) {
                        fs_1.default.unlinkSync(oldFile); // Delete oldest
                    }
                    else {
                        fs_1.default.renameSync(oldFile, newFile);
                    }
                }
            }
            // Rotate current log
            fs_1.default.renameSync(logFile, `${logFile}.1`);
        }
        catch (error) {
            console.error('Failed to rotate log files:', error);
        }
    }
    /**
     * Log message with timestamp
     */
    log(level, message, ...args) {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] [${level.toUpperCase()}] [${this.nodeId}] ${message}`;
        // Console output
        console.log(logMessage, ...args);
        // File output
        if (this.logStream) {
            const fullMessage = args.length > 0
                ? `${logMessage} ${args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ')}\n`
                : `${logMessage}\n`;
            this.logStream.write(fullMessage);
        }
    }
    /**
     * Get local IP address
     */
    getLocalIPAddress() {
        const interfaces = (0, os_1.networkInterfaces)();
        for (const [name, nets] of Object.entries(interfaces)) {
            if (nets) {
                for (const net of nets) {
                    // Skip internal interfaces and IPv6
                    if (!net.internal && net.family === 'IPv4') {
                        return net.address;
                    }
                }
            }
        }
        return '127.0.0.1'; // Fallback
    }
    /**
     * Setup graceful shutdown handlers
     */
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
        // Windows specific
        if (process.platform === 'win32') {
            process.on('SIGHUP', () => shutdown('SIGHUP'));
        }
    }
}
exports.SyncService = SyncService;
/**
 * Create and configure sync service
 */
function createSyncService(config) {
    return new SyncService(config);
}
/**
 * Default service configuration
 */
function getDefaultSyncConfig() {
    return {
        port: 8765,
        syncInterval: 30000, // 30 seconds
        enableAutoStart: true,
        logLevel: 'info',
        dataDirectory: './data/sync',
        maxLogSize: 10 * 1024 * 1024, // 10MB
        maxLogFiles: 5
    };
}
