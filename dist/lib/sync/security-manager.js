"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecurityManager = void 0;
exports.createSecurityManager = createSecurityManager;
const events_1 = require("events");
const client_1 = require("@prisma/client");
const crypto_1 = __importDefault(require("crypto"));
class SecurityManager extends events_1.EventEmitter {
    constructor(prisma, nodeId, config) {
        super();
        this.activeSessions = new Map();
        this.rateLimitMap = new Map();
        this.keyRotationTimer = null;
        this.sessionCleanupTimer = null;
        this.TOKEN_VALIDITY_PERIOD = 3600000;
        this.SESSION_CLEANUP_INTERVAL = 300000;
        this.MAX_TOKEN_SIZE = 4096;
        this.ENCRYPTION_ALGORITHM = 'aes-256-gcm';
        this.SIGNATURE_ALGORITHM = 'sha256';
        this.prisma = prisma;
        this.nodeId = nodeId;
        const defaults = {
            registrationKey: config.registrationKey,
            enableEncryption: true,
            enableSignatures: true,
            keyRotationEnabled: true,
            keyRotationInterval: 24 * 60 * 60 * 1000,
            sessionTimeout: 30 * 60 * 1000,
            maxFailedAttempts: 5,
            rateLimitWindow: 60000,
            rateLimitMaxRequests: 10
        };
        this.config = Object.assign({}, defaults, config);
        this.currentRegistrationKey = config.registrationKey;
    }
    async start() {
        if (this.config.keyRotationEnabled) {
            this.startKeyRotation();
        }
        this.startSessionCleanup();
        await this.loadExistingSessions();
        this.emit('started');
    }
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
    async authenticatePeer(peer, providedKeyHash) {
        try {
            if (!this.checkRateLimit(peer.ipAddress)) {
                await this.auditSecurityEvent('RATE_LIMIT_EXCEEDED', peer.ipAddress, peer.nodeId, 'Rate limit exceeded');
                return { success: false, errorMessage: 'Rate limit exceeded' };
            }
            const isValidKey = await this.validateRegistrationKey(providedKeyHash);
            if (!isValidKey) {
                await this.auditSecurityEvent('AUTH_FAILURE', peer.ipAddress, peer.nodeId, 'Invalid registration key');
                return { success: false, errorMessage: 'Invalid registration key' };
            }
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
    async establishSecureSession(sourceNodeId, targetNodeId, authToken) {
        try {
            const tokenValidation = await this.validateAuthToken(authToken);
            if (!tokenValidation.valid) {
                return { success: false, errorMessage: 'Invalid auth token' };
            }
            const sessionId = crypto_1.default.randomUUID();
            const now = new Date();
            const expiresAt = new Date(now.getTime() + this.config.sessionTimeout);
            let encryptionKey;
            let signingKey;
            if (this.config.enableEncryption) {
                encryptionKey = this.generateSecureKey(32);
            }
            if (this.config.enableSignatures) {
                signingKey = this.generateSecureKey(32);
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
    async validateSession(sessionId) {
        try {
            const session = this.activeSessions.get(sessionId);
            if (!session) {
                return { valid: false, errorMessage: 'Session not found' };
            }
            const now = new Date();
            if (now > session.expiresAt) {
                session.isValid = false;
                await this.auditSecurityEvent('SESSION_EXPIRED', 'internal', session.sourceNodeId, 'Session expired', { sessionId });
                return { valid: false, errorMessage: 'Session expired' };
            }
            session.lastActivity = now;
            await this.updateSecuritySession(session);
            return { valid: true, session };
        }
        catch (error) {
            return { valid: false, errorMessage: error instanceof Error ? error.message : 'Session validation failed' };
        }
    }
    async encryptData(data, sessionIdOrKey) {
        try {
            const sessionKey = sessionIdOrKey;
            if (!this.config.enableEncryption) {
                return { success: true, encryptedData: JSON.stringify(data) };
            }
            let encryptionKey;
            if (sessionKey && this.activeSessions.has(sessionKey)) {
                const session = this.activeSessions.get(sessionKey);
                encryptionKey = session?.encryptionKey;
            }
            else {
                encryptionKey = sessionKey;
            }
            if (!encryptionKey) {
                throw new Error('No encryption key available for session');
            }
            const cryptoLib = require('crypto');
            const dataString = JSON.stringify(data);
            const iv = cryptoLib.randomBytes(16);
            const cipher = cryptoLib.createCipher(this.ENCRYPTION_ALGORITHM, encryptionKey);
            let encrypted = cipher.update(dataString, 'utf8', 'hex');
            encrypted += cipher.final('hex');
            const encryptedWithIv = iv.toString('hex') + ':' + encrypted;
            let signature;
            if (this.config.enableSignatures) {
                const hmac = cryptoLib.createHmac(this.SIGNATURE_ALGORITHM, encryptionKey);
                hmac.update(encryptedWithIv);
                signature = hmac.digest('hex');
            }
            return { success: true, encryptedData: encryptedWithIv, signature };
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Encryption failed';
            console.error('Encryption failed:', error);
            return { success: false, errorMessage: message };
        }
    }
    async decryptData(encryptedData, maybeSignatureOrKey, maybeSessionKey) {
        try {
            let signature;
            let sessionKey;
            if (maybeSessionKey) {
                signature = maybeSignatureOrKey;
                sessionKey = maybeSessionKey;
            }
            else {
                sessionKey = maybeSignatureOrKey;
            }
            if (!this.config.enableEncryption) {
                try {
                    const parsed = JSON.parse(encryptedData);
                    return { success: true, data: parsed };
                }
                catch (e) {
                    return { success: false, errorMessage: 'Invalid plaintext payload' };
                }
            }
            if (!sessionKey) {
                throw new Error('No encryption key provided');
            }
            if (this.config.enableSignatures && signature) {
                const cryptoLib = require('crypto');
                const expected = cryptoLib.createHmac(this.SIGNATURE_ALGORITHM, sessionKey).update(encryptedData).digest('hex');
                if (expected !== signature) {
                    return { success: false, errorMessage: 'Invalid signature' };
                }
            }
            const [ivHex, encrypted] = encryptedData.split(':');
            if (!ivHex || !encrypted) {
                return { success: false, errorMessage: 'Invalid encrypted data format' };
            }
            const cryptoLib = require('crypto');
            const decipher = cryptoLib.createDecipher(this.ENCRYPTION_ALGORITHM, sessionKey);
            let decrypted = decipher.update(encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            return { success: true, data: JSON.parse(decrypted) };
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Decryption failed';
            console.error('Decryption failed:', error);
            return { success: false, errorMessage: message };
        }
    }
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
    async rotateRegistrationKey(newKey, gracePeriodMs = 300000) {
        if (typeof newKey !== 'undefined' || typeof gracePeriodMs !== 'undefined') {
            return await this.rotateRegistrationKeyWithOptions(newKey, gracePeriodMs);
        }
        try {
            this.previousRegistrationKey = this.currentRegistrationKey;
            this.currentRegistrationKey = this.generateSecureKey(64);
            await this.storeRegistrationKey(this.currentRegistrationKey);
            await this.auditSecurityEvent('KEY_ROTATION', 'internal', this.nodeId, 'Registration key rotated');
            this.emit('key_rotated', { previousKey: this.previousRegistrationKey, newKey: this.currentRegistrationKey });
            setTimeout(() => {
                this.previousRegistrationKey = undefined;
            }, 300000);
            return this.currentRegistrationKey;
        }
        catch (error) {
            console.error('Key rotation failed:', error);
            throw error;
        }
    }
    async rotateRegistrationKeyWithOptions(newKey, gracePeriodMs = 300000) {
        try {
            this.previousRegistrationKey = this.currentRegistrationKey;
            if (newKey) {
                this.currentRegistrationKey = newKey;
            }
            else {
                this.currentRegistrationKey = this.generateSecureKey(64);
            }
            await this.storeRegistrationKey(this.currentRegistrationKey);
            await this.auditSecurityEvent('KEY_ROTATION', 'internal', this.nodeId, 'Registration key rotated');
            setTimeout(() => {
                this.previousRegistrationKey = undefined;
            }, gracePeriodMs);
            return true;
        }
        catch (error) {
            console.error('Key rotation (with options) failed:', error);
            return false;
        }
    }
    async getSecurityStats() {
        try {
            const now = new Date();
            const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
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
                    authSuccesses: auditEvents.filter((e) => e.eventType === 'AUTH_SUCCESS' || e.eventType === 'AUTHENTICATION_SUCCESS').length,
                    authFailures: auditEvents.filter((e) => e.eventType === 'AUTH_FAILURE' || e.eventType === 'AUTHENTICATION_FAILED').length,
                    sessionsCreated: auditEvents.filter((e) => e.eventType === 'SESSION_CREATED').length,
                    rateLimitExceeded: auditEvents.filter((e) => e.eventType === 'RATE_LIMIT_EXCEEDED').length
                },
                configuration: {
                    encryptionEnabled: this.config.enableEncryption,
                    signaturesEnabled: this.config.enableSignatures,
                    keyRotationEnabled: this.config.keyRotationEnabled,
                    sessionTimeout: this.config.sessionTimeout / 1000 / 60
                },
                recentEvents: auditEvents.slice(0, 20).map((event) => ({
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
    checkRateLimit(sourceIp) {
        const now = Date.now();
        const limit = this.rateLimitMap.get(sourceIp);
        if (!limit || now > limit.resetTime) {
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
    async validateRegistrationKey(providedKeyHash) {
        try {
            const currentKeyHash = this.hashRegistrationKey(this.currentRegistrationKey);
            if (providedKeyHash === currentKeyHash) {
                return true;
            }
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
    hashRegistrationKey(key) {
        const crypto = require('crypto');
        return crypto.createHash('sha256').update(key).digest('hex');
    }
    async generateAuthToken(nodeId) {
        const tokenId = require('crypto').randomUUID();
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
        const crypto = require('crypto');
        const tokenString = JSON.stringify(tokenData);
        const signature = crypto.createHmac('sha256', this.currentRegistrationKey)
            .update(tokenString)
            .digest('hex');
        const authToken = Buffer.from(JSON.stringify({ ...tokenData, signature })).toString('base64');
        await this.storeAuthToken(tokenId, nodeId, expiresAt, authToken);
        return authToken;
    }
    async validateAuthToken(authToken) {
        try {
            const tokenString = Buffer.from(authToken, 'base64').toString('utf8');
            const tokenData = JSON.parse(tokenString);
            if (!tokenData.signature || !tokenData.tokenId || !tokenData.nodeId) {
                return { valid: false, errorMessage: 'Invalid token format' };
            }
            const expiresAt = new Date(tokenData.expiresAt);
            if (new Date() > expiresAt) {
                return { valid: false, errorMessage: 'Token expired' };
            }
            const { signature, ...dataToVerify } = tokenData;
            const expectedSignature = require('crypto')
                .createHmac('sha256', this.currentRegistrationKey)
                .update(JSON.stringify(dataToVerify))
                .digest('hex');
            if (signature !== expectedSignature) {
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
    generateSecureKey(length) {
        const crypto = require('crypto');
        return crypto.randomBytes(length).toString('hex');
    }
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
    startSessionCleanup() {
        this.sessionCleanupTimer = setInterval(async () => {
            await this.cleanupExpiredSessions();
        }, this.SESSION_CLEANUP_INTERVAL);
    }
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
    async auditSecurityEvent(eventType, sourceIp, targetNodeId, errorMessage, metadata = {}) {
        try {
            const persistedEventType = (() => {
                const evt = eventType;
                if (evt === 'AUTH_SUCCESS' || evt === 'AUTHENTICATION_SUCCESS')
                    return 'AUTHENTICATION_SUCCESS';
                if (evt === 'AUTH_FAILURE' || evt === 'AUTHENTICATION_FAILED')
                    return 'AUTHENTICATION_FAILED';
                return evt;
            })();
            await this.prisma.securityAudit.create({
                data: {
                    auditId: crypto_1.default.randomUUID(),
                    nodeId: this.nodeId,
                    eventType: persistedEventType,
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
    async loadExistingSessions() {
    }
    async cleanupExpiredTokens() {
        try {
            await this.prisma.authToken.deleteMany({ where: { expiresAt: { lt: new Date() } } });
        }
        catch (error) {
            console.error('Failed to cleanup expired tokens:', error);
        }
    }
    async storeSecuritySession(session) {
    }
    async updateSecuritySession(session) {
    }
    async storeAuthToken(tokenId, nodeId, expiresAt, authToken) {
    }
    async storeRegistrationKey(key) {
    }
    async shutdown() {
        this.stop();
    }
    async initialize() {
        await this.start();
    }
    async getAuditLogs(limit = 100) {
        try {
            const logs = await this.prisma.securityAudit.findMany({
                where: { nodeId: this.nodeId },
                orderBy: { timestamp: 'desc' },
                take: limit
            });
            return logs.map((log) => ({
                auditId: log.auditId,
                nodeId: log.nodeId,
                eventType: log.eventType,
                timestamp: log.timestamp,
                sourceIp: log.sourceIp,
                targetNodeId: log.targetNodeId || undefined,
                errorMessage: log.errorMessage || undefined,
                metadata: log.metadata
            }));
        }
        catch (error) {
            console.error('Failed to get audit logs:', error);
            return [];
        }
    }
    async revokeSession(sessionId) {
        return await this.invalidateSession(sessionId);
    }
    async getActiveSessions() {
        return Array.from(this.activeSessions.values());
    }
}
exports.SecurityManager = SecurityManager;
function createSecurityManager(prismaOrConfig, nodeId, config) {
    if (typeof prismaOrConfig.securityAudit === 'undefined') {
        const cfg = prismaOrConfig;
        const prisma = new client_1.PrismaClient();
        const nid = cfg.nodeId || 'local';
        const fullConfig = { registrationKey: cfg.registrationKey || '', enableEncryption: !!cfg.enableEncryption, enableSignatures: !!cfg.enableSignatures, keyRotationEnabled: !!cfg.keyRotationEnabled, keyRotationInterval: cfg.keyRotationInterval || 24 * 60 * 60 * 1000, sessionTimeout: cfg.sessionTimeout || 30 * 60 * 1000, maxFailedAttempts: cfg.maxFailedAttempts || 5, rateLimitWindow: cfg.rateLimitWindow || 60000, rateLimitMaxRequests: cfg.rateLimitMaxRequests || 10 };
        return new SecurityManager(prisma, nid, fullConfig);
    }
    const defaultConfig = {
        registrationKey: '',
        enableEncryption: true,
        enableSignatures: true,
        keyRotationEnabled: true,
        keyRotationInterval: 24 * 60 * 60 * 1000,
        sessionTimeout: 30 * 60 * 1000,
        maxFailedAttempts: 5,
        rateLimitWindow: 60000,
        rateLimitMaxRequests: 10
    };
    return new SecurityManager(prismaOrConfig, nodeId || 'local', config || defaultConfig);
}
