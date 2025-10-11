"use strict";
/**
 * Security Manager
 * Comprehensive security authentication and authorization for sync network
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecurityManager = void 0;
exports.createSecurityManager = createSecurityManager;
const events_1 = require("events");
/**
 * Security Manager
 * Handles authentication, authorization, and security for sync operations
 */
class SecurityManager extends events_1.EventEmitter {
    constructor(prisma, nodeId, config) {
        super();
        this.activeSessions = new Map();
        this.rateLimitMap = new Map();
        this.keyRotationTimer = null;
        this.sessionCleanupTimer = null;
        // Security constants
        this.TOKEN_VALIDITY_PERIOD = 3600000; // 1 hour
        this.SESSION_CLEANUP_INTERVAL = 300000; // 5 minutes
        this.MAX_TOKEN_SIZE = 4096; // bytes
        this.ENCRYPTION_ALGORITHM = 'aes-256-gcm';
        this.SIGNATURE_ALGORITHM = 'sha256';
        this.prisma = prisma;
        this.nodeId = nodeId;
        this.config = {
            enableEncryption: true,
            enableSignatures: true,
            keyRotationEnabled: true,
            keyRotationInterval: 24 * 60 * 60 * 1000, // 24 hours
            sessionTimeout: 30 * 60 * 1000, // 30 minutes
            maxFailedAttempts: 5,
            rateLimitWindow: 60000, // 1 minute
            rateLimitMaxRequests: 10,
            ...config
        };
        this.currentRegistrationKey = config.registrationKey;
    }
    /**
     * Start security manager
     */
    async start() {
        if (this.config.keyRotationEnabled) {
            this.startKeyRotation();
        }
        this.startSessionCleanup();
        await this.loadExistingSessions();
        this.emit('started');
    }
    /**
     * Stop security manager
     */
    stop() {
        if (this.keyRotationTimer) {
            clearInterval(this.keyRotationTimer);
            this.keyRotationTimer = null;
        }
        if (this.sessionCleanupTimer) {
            clearInterval(this.sessionCleanupTimer);
            this.sessionCleanupTimer = null;
        }
        this.emit('stopped');
    }
    /**
     * Authenticate peer using registration key
     */
    async authenticatePeer(peer, providedKeyHash) {
        try {
            // Rate limiting check
            if (!this.checkRateLimit(peer.ipAddress)) {
                await this.auditSecurityEvent('RATE_LIMIT_EXCEEDED', peer.ipAddress, peer.nodeId, 'Rate limit exceeded');
                return { success: false, errorMessage: 'Rate limit exceeded' };
            }
            // Validate registration key
            const isValidKey = await this.validateRegistrationKey(providedKeyHash);
            if (!isValidKey) {
                await this.auditSecurityEvent('AUTH_FAILURE', peer.ipAddress, peer.nodeId, 'Invalid registration key');
                return { success: false, errorMessage: 'Invalid registration key' };
            }
            // Generate auth token
            const authToken = await this.generateAuthToken(peer.nodeId);
            await this.auditSecurityEvent('AUTH_SUCCESS', peer.ipAddress, peer.nodeId, 'Authentication successful');
            return { success: true, authToken };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
            await this.auditSecurityEvent('AUTH_FAILURE', peer.ipAddress, peer.nodeId, errorMessage);
            return { success: false, errorMessage };
        }
    }
    /**
     * Establish secure session between nodes
     */
    async establishSecureSession(sourceNodeId, targetNodeId, authToken) {
        try {
            // Validate auth token
            const tokenValidation = await this.validateAuthToken(authToken);
            if (!tokenValidation.valid) {
                return { success: false, errorMessage: 'Invalid auth token' };
            }
            const sessionId = crypto.randomUUID();
            const now = new Date();
            const expiresAt = new Date(now.getTime() + this.config.sessionTimeout);
            // Generate session-specific encryption key if encryption is enabled
            let encryptionKey;
            let signingKey;
            if (this.config.enableEncryption) {
                encryptionKey = this.generateSecureKey(32); // 256-bit key
            }
            if (this.config.enableSignatures) {
                signingKey = this.generateSecureKey(32); // 256-bit key
            }
            const session = {
                sessionId,
                sourceNodeId,
                targetNodeId,
                authToken,
                establishedAt: now,
                expiresAt,
                lastActivity: now,
                isValid: true,
                encryptionKey,
                signingKey
            };
            await this.storeSecuritySession(session);
            this.activeSessions.set(sessionId, session);
            await this.auditSecurityEvent('SESSION_CREATED', 'internal', sourceNodeId, 'Secure session established', {
                targetNodeId,
                sessionId,
                encryptionEnabled: this.config.enableEncryption,
                signaturesEnabled: this.config.enableSignatures
            });
            this.emit('session_established', session);
            return {
                success: true,
                sessionId,
                encryptionKey: this.config.enableEncryption ? encryptionKey : undefined
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Session establishment failed';
            return { success: false, errorMessage };
        }
    }
    /**
     * Validate security session
     */
    async validateSession(sessionId) {
        try {
            const session = this.activeSessions.get(sessionId);
            if (!session) {
                return { valid: false, errorMessage: 'Session not found' };
            }
            const now = new Date();
            // Check if session has expired
            if (now > session.expiresAt) {
                session.isValid = false;
                await this.auditSecurityEvent('SESSION_EXPIRED', 'internal', session.sourceNodeId, 'Session expired', { sessionId });
                return { valid: false, errorMessage: 'Session expired' };
            }
            // Update last activity
            session.lastActivity = now;
            await this.updateSecuritySession(session);
            return { valid: true, session };
        }
        catch (error) {
            return { valid: false, errorMessage: error instanceof Error ? error.message : 'Session validation failed' };
        }
    }
    /**
     * Encrypt data for secure transmission
     */
    async encryptData(data, sessionId) {
        if (!this.config.enableEncryption) {
            return null;
        }
        try {
            const session = this.activeSessions.get(sessionId);
            if (!session || !session.encryptionKey) {
                throw new Error('No encryption key available for session');
            }
            const crypto = require('crypto');
            const dataString = JSON.stringify(data);
            // Generate IV for this encryption
            const iv = crypto.randomBytes(16);
            const cipher = crypto.createCipher(this.ENCRYPTION_ALGORITHM, session.encryptionKey);
            let encrypted = cipher.update(dataString, 'utf8', 'hex');
            encrypted += cipher.final('hex');
            // Combine IV and encrypted data
            const encryptedWithIv = iv.toString('hex') + ':' + encrypted;
            // Generate signature if enabled
            let signature;
            if (this.config.enableSignatures && session.signingKey) {
                const hmac = crypto.createHmac(this.SIGNATURE_ALGORITHM, session.signingKey);
                hmac.update(encryptedWithIv);
                signature = hmac.digest('hex');
            }
            return { encrypted: encryptedWithIv, signature };
        }
        catch (error) {
            console.error('Encryption failed:', error);
            return null;
        }
    }
    /**
     * Decrypt data from secure transmission
     */
    async decryptData(encryptedData, sessionId, signature) {
        if (!this.config.enableEncryption) {
            return null;
        }
        try {
            const session = this.activeSessions.get(sessionId);
            if (!session || !session.encryptionKey) {
                throw new Error('No encryption key available for session');
            }
            // Verify signature if provided
            if (this.config.enableSignatures && signature && session.signingKey) {
                const crypto = require('crypto');
                const hmac = crypto.createHmac(this.SIGNATURE_ALGORITHM, session.signingKey);
                hmac.update(encryptedData);
                const expectedSignature = hmac.digest('hex');
                if (signature !== expectedSignature) {
                    throw new Error('Signature verification failed');
                }
            }
            // Split IV and encrypted data
            const [ivHex, encrypted] = encryptedData.split(':');
            if (!ivHex || !encrypted) {
                throw new Error('Invalid encrypted data format');
            }
            const crypto = require('crypto');
            const iv = Buffer.from(ivHex, 'hex');
            const decipher = crypto.createDecipher(this.ENCRYPTION_ALGORITHM, session.encryptionKey);
            let decrypted = decipher.update(encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            return JSON.parse(decrypted);
        }
        catch (error) {
            console.error('Decryption failed:', error);
            return null;
        }
    }
    /**
     * Invalidate security session
     */
    async invalidateSession(sessionId) {
        try {
            const session = this.activeSessions.get(sessionId);
            if (session) {
                session.isValid = false;
                await this.updateSecuritySession(session);
                this.activeSessions.delete(sessionId);
                await this.auditSecurityEvent('SESSION_EXPIRED', 'internal', session.sourceNodeId, 'Session invalidated', { sessionId });
                this.emit('session_invalidated', session);
            }
            return true;
        }
        catch (error) {
            console.error('Failed to invalidate session:', error);
            return false;
        }
    }
    /**
     * Rotate registration key
     */
    async rotateRegistrationKey() {
        try {
            this.previousRegistrationKey = this.currentRegistrationKey;
            this.currentRegistrationKey = this.generateSecureKey(64); // 512-bit key
            // Store new key securely
            await this.storeRegistrationKey(this.currentRegistrationKey);
            await this.auditSecurityEvent('KEY_ROTATION', 'internal', this.nodeId, 'Registration key rotated');
            this.emit('key_rotated', { previousKey: this.previousRegistrationKey, newKey: this.currentRegistrationKey });
            // Previous key remains valid for a grace period
            setTimeout(() => {
                this.previousRegistrationKey = undefined;
            }, 300000); // 5 minutes grace period
            return this.currentRegistrationKey;
        }
        catch (error) {
            console.error('Key rotation failed:', error);
            throw error;
        }
    }
    /**
     * Get security statistics
     */
    async getSecurityStats() {
        try {
            const now = new Date();
            const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            // Get audit events from last 24 hours
            const auditEvents = await this.prisma.securityAudit.findMany({
                where: {
                    nodeId: this.nodeId,
                    timestamp: { gte: last24Hours }
                },
                orderBy: { timestamp: 'desc' }
            });
            const stats = {
                activeSessions: this.activeSessions.size,
                last24Hours: {
                    authSuccesses: auditEvents.filter(e => e.eventType === 'AUTH_SUCCESS').length,
                    authFailures: auditEvents.filter(e => e.eventType === 'AUTH_FAILURE').length,
                    sessionsCreated: auditEvents.filter(e => e.eventType === 'SESSION_CREATED').length,
                    rateLimitExceeded: auditEvents.filter(e => e.eventType === 'RATE_LIMIT_EXCEEDED').length
                },
                configuration: {
                    encryptionEnabled: this.config.enableEncryption,
                    signaturesEnabled: this.config.enableSignatures,
                    keyRotationEnabled: this.config.keyRotationEnabled,
                    sessionTimeout: this.config.sessionTimeout / 1000 / 60 // minutes
                },
                recentEvents: auditEvents.slice(0, 20).map(event => ({
                    eventType: event.eventType,
                    timestamp: event.timestamp,
                    sourceIp: event.sourceIp,
                    errorMessage: event.errorMessage
                }))
            };
            return stats;
        }
        catch (error) {
            console.error('Failed to get security stats:', error);
            return {
                activeSessions: 0,
                last24Hours: { authSuccesses: 0, authFailures: 0, sessionsCreated: 0, rateLimitExceeded: 0 },
                configuration: {},
                recentEvents: []
            };
        }
    }
    /**
     * Check rate limiting
     */
    checkRateLimit(sourceIp) {
        const now = Date.now();
        const limit = this.rateLimitMap.get(sourceIp);
        if (!limit || now > limit.resetTime) {
            // Reset or create new limit
            this.rateLimitMap.set(sourceIp, {
                count: 1,
                resetTime: now + this.config.rateLimitWindow
            });
            return true;
        }
        if (limit.count >= this.config.rateLimitMaxRequests) {
            return false;
        }
        limit.count++;
        return true;
    }
    /**
     * Validate registration key
     */
    async validateRegistrationKey(providedKeyHash) {
        try {
            const currentKeyHash = this.hashRegistrationKey(this.currentRegistrationKey);
            if (providedKeyHash === currentKeyHash) {
                return true;
            }
            // Check previous key during grace period
            if (this.previousRegistrationKey) {
                const previousKeyHash = this.hashRegistrationKey(this.previousRegistrationKey);
                if (providedKeyHash === previousKeyHash) {
                    return true;
                }
            }
            return false;
        }
        catch (error) {
            console.error('Key validation failed:', error);
            return false;
        }
    }
    /**
     * Hash registration key
     */
    hashRegistrationKey(key) {
        const crypto = require('crypto');
        return crypto.createHash('sha256').update(key).digest('hex');
    }
    /**
     * Generate auth token
     */
    async generateAuthToken(nodeId) {
        const tokenId = crypto.randomUUID();
        const now = new Date();
        const expiresAt = new Date(now.getTime() + this.TOKEN_VALIDITY_PERIOD);
        const tokenData = {
            tokenId,
            nodeId,
            issuedAt: now.toISOString(),
            expiresAt: expiresAt.toISOString(),
            permissions: ['sync_read', 'sync_write', 'peer_discovery'],
            issuer: this.nodeId
        };
        // Sign the token
        const crypto = require('crypto');
        const tokenString = JSON.stringify(tokenData);
        const signature = crypto.createHmac('sha256', this.currentRegistrationKey)
            .update(tokenString)
            .digest('hex');
        const authToken = Buffer.from(JSON.stringify({ ...tokenData, signature })).toString('base64');
        // Store token
        await this.storeAuthToken(tokenId, nodeId, expiresAt, authToken);
        return authToken;
    }
    /**
     * Validate auth token
     */
    async validateAuthToken(authToken) {
        try {
            // Decode token
            const tokenString = Buffer.from(authToken, 'base64').toString('utf8');
            const tokenData = JSON.parse(tokenString);
            if (!tokenData.signature || !tokenData.tokenId || !tokenData.nodeId) {
                return { valid: false, errorMessage: 'Invalid token format' };
            }
            // Check expiration
            const expiresAt = new Date(tokenData.expiresAt);
            if (new Date() > expiresAt) {
                return { valid: false, errorMessage: 'Token expired' };
            }
            // Verify signature
            const { signature, ...dataToVerify } = tokenData;
            const expectedSignature = require('crypto')
                .createHmac('sha256', this.currentRegistrationKey)
                .update(JSON.stringify(dataToVerify))
                .digest('hex');
            if (signature !== expectedSignature) {
                // Try with previous key if available
                if (this.previousRegistrationKey) {
                    const previousSignature = require('crypto')
                        .createHmac('sha256', this.previousRegistrationKey)
                        .update(JSON.stringify(dataToVerify))
                        .digest('hex');
                    if (signature !== previousSignature) {
                        return { valid: false, errorMessage: 'Invalid token signature' };
                    }
                }
                else {
                    return { valid: false, errorMessage: 'Invalid token signature' };
                }
            }
            return { valid: true, tokenData };
        }
        catch (error) {
            return { valid: false, errorMessage: 'Token validation failed' };
        }
    }
    /**
     * Generate secure key
     */
    generateSecureKey(length) {
        const crypto = require('crypto');
        return crypto.randomBytes(length).toString('hex');
    }
    /**
     * Start key rotation
     */
    startKeyRotation() {
        this.keyRotationTimer = setInterval(async () => {
            try {
                await this.rotateRegistrationKey();
            }
            catch (error) {
                console.error('Automatic key rotation failed:', error);
            }
        }, this.config.keyRotationInterval);
    }
    /**
     * Start session cleanup
     */
    startSessionCleanup() {
        this.sessionCleanupTimer = setInterval(async () => {
            await this.cleanupExpiredSessions();
        }, this.SESSION_CLEANUP_INTERVAL);
    }
    /**
     * Cleanup expired sessions
     */
    async cleanupExpiredSessions() {
        const now = new Date();
        const expiredSessions = [];
        for (const [sessionId, session] of this.activeSessions) {
            if (now > session.expiresAt || !session.isValid) {
                expiredSessions.push(sessionId);
            }
        }
        for (const sessionId of expiredSessions) {
            await this.invalidateSession(sessionId);
        }
        if (expiredSessions.length > 0) {
            console.log(`Cleaned up ${expiredSessions.length} expired sessions`);
        }
    }
    /**
     * Audit security event
     */
    async auditSecurityEvent(eventType, sourceIp, targetNodeId, errorMessage, metadata = {}) {
        try {
            await this.prisma.securityAudit.create({
                data: {
                    auditId: crypto.randomUUID(),
                    nodeId: this.nodeId,
                    eventType,
                    timestamp: new Date(),
                    sourceIp,
                    targetNodeId,
                    errorMessage,
                    metadata
                }
            });
        }
        catch (error) {
            console.error('Failed to audit security event:', error);
        }
    }
    /**
     * Load existing sessions
     */
    async loadExistingSessions() {
        // Implementation would load from database if sessions were persisted
        // For now, start with empty state
    }
    /**
     * Store security session
     */
    async storeSecuritySession(session) {
        // Would implement persistent storage if needed
    }
    /**
     * Update security session
     */
    async updateSecuritySession(session) {
        // Would implement persistent storage if needed
    }
    /**
     * Store auth token
     */
    async storeAuthToken(tokenId, nodeId, expiresAt, authToken) {
        // Would implement persistent storage if needed
    }
    /**
     * Store registration key
     */
    async storeRegistrationKey(key) {
        // Would implement secure key storage if needed
    }
}
exports.SecurityManager = SecurityManager;
/**
 * Create security manager
 */
function createSecurityManager(prisma, nodeId, config) {
    return new SecurityManager(prisma, nodeId, config);
}
