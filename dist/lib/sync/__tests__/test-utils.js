"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestData = exports.MockEventEmitter = void 0;
exports.createTestSyncConfig = createTestSyncConfig;
exports.createTestSecurityConfig = createTestSecurityConfig;
exports.createMockPrisma = createMockPrisma;
exports.createMockSecurityManager = createMockSecurityManager;
exports.createMockSyncEngine = createMockSyncEngine;
exports.createMockPeerDiscovery = createMockPeerDiscovery;
exports.createMockConflictResolver = createMockConflictResolver;
exports.createTestPeerInfo = createTestPeerInfo;
exports.createTestSyncEvent = createTestSyncEvent;
exports.createTestSecuritySession = createTestSecuritySession;
exports.createTestAuthToken = createTestAuthToken;
exports.wait = wait;
exports.expectEventEmitted = expectEventEmitted;
exports.resetAllMocks = resetAllMocks;
exports.setupTestEnvironment = setupTestEnvironment;
exports.createMockTimer = createMockTimer;
exports.validateSyncEvent = validateSyncEvent;
exports.validateSecurityAudit = validateSecurityAudit;
const events_1 = require("events");
function createTestSyncConfig(overrides = {}) {
    return {
        nodeId: 'test-node-' + Math.random().toString(36).substr(2, 9),
        nodeName: 'Test Node',
        registrationKey: 'test-registration-key',
        port: 8080 + Math.floor(Math.random() * 1000),
        syncInterval: 5000,
        enableAutoStart: false,
        logLevel: 'info',
        dataDirectory: './test-data',
        maxLogSize: 1024 * 1024,
        maxLogFiles: 3,
        security: {
            enableEncryption: true,
            enableSignatures: true,
            keyRotationEnabled: false,
            sessionTimeout: 60000,
            maxFailedAttempts: 3,
            rateLimitWindow: 60000,
            rateLimitMaxRequests: 100,
        },
        ...overrides
    };
}
function createTestSecurityConfig(overrides = {}) {
    return {
        nodeId: 'test-security-node-' + Math.random().toString(36).substr(2, 9),
        registrationKey: 'test-security-key',
        enableEncryption: true,
        enableSignatures: true,
        keyRotationEnabled: false,
        keyRotationInterval: 24 * 60 * 60 * 1000,
        sessionTimeout: 60 * 60 * 1000,
        maxFailedAttempts: 5,
        rateLimitWindow: 60 * 1000,
        rateLimitMaxRequests: 100,
        auditEnabled: true,
        ...overrides
    };
}
function createMockPrisma() {
    return {
        $connect: jest.fn().mockResolvedValue(undefined),
        $disconnect: jest.fn().mockResolvedValue(undefined),
        syncEvent: {
            findMany: jest.fn().mockResolvedValue([]),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            upsert: jest.fn(),
        },
        securityAudit: {
            findMany: jest.fn().mockResolvedValue([]),
            create: jest.fn(),
        },
        authToken: {
            findMany: jest.fn().mockResolvedValue([]),
            findUnique: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        },
        securitySession: {
            findMany: jest.fn().mockResolvedValue([]),
            findUnique: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        },
        nodeState: {
            findUnique: jest.fn(),
            upsert: jest.fn(),
        },
        conflictResolution: {
            create: jest.fn(),
            findMany: jest.fn().mockResolvedValue([]),
        }
    };
}
function createMockSecurityManager() {
    return {
        initialize: jest.fn().mockResolvedValue(undefined),
        shutdown: jest.fn().mockResolvedValue(undefined),
        authenticatePeer: jest.fn().mockResolvedValue({
            success: true,
            authToken: 'mock-auth-token'
        }),
        establishSecureSession: jest.fn().mockResolvedValue({
            success: true,
            sessionId: 'mock-session-id',
            encryptionKey: 'mock-encryption-key'
        }),
        validateSession: jest.fn().mockResolvedValue({
            valid: true,
            session: { sessionId: 'mock-session', nodeId: 'mock-node' }
        }),
        encryptData: jest.fn().mockResolvedValue({
            success: true,
            encryptedData: 'encrypted-data',
            signature: 'mock-signature'
        }),
        decryptData: jest.fn().mockResolvedValue({
            success: true,
            data: { test: 'decrypted-data' }
        }),
        getAuditLogs: jest.fn().mockResolvedValue([]),
        getSecurityStats: jest.fn().mockResolvedValue({
            totalAuthentications: 0,
            successfulAuthentications: 0,
            failedAuthentications: 0,
            activeSessions: 0,
            expiredSessions: 0,
            securityIncidents: 0
        }),
        rotateRegistrationKey: jest.fn().mockResolvedValue(true),
        revokeSession: jest.fn().mockResolvedValue(true),
        getActiveSessions: jest.fn().mockResolvedValue([]),
        cleanupExpiredTokens: jest.fn().mockResolvedValue(undefined),
        on: jest.fn(),
        emit: jest.fn(),
    };
}
function createMockSyncEngine() {
    return {
        start: jest.fn().mockResolvedValue(undefined),
        stop: jest.fn().mockResolvedValue(undefined),
        syncWithPeer: jest.fn().mockResolvedValue({
            success: true,
            eventsSynced: 0,
            conflictsResolved: 0
        }),
        syncWithAllPeers: jest.fn().mockResolvedValue(undefined),
        processIncomingEvent: jest.fn().mockResolvedValue(true),
        getLastSyncTime: jest.fn().mockReturnValue(new Date()),
        getSyncStats: jest.fn().mockResolvedValue({
            totalEventsSynced: 0,
            conflictsResolved: 0,
            syncErrors: 0,
            lastSyncTime: new Date()
        }),
        on: jest.fn(),
        emit: jest.fn(),
    };
}
function createMockPeerDiscovery() {
    return {
        start: jest.fn().mockResolvedValue(undefined),
        stop: jest.fn().mockResolvedValue(undefined),
        getDiscoveredPeers: jest.fn().mockReturnValue([]),
        announceSelf: jest.fn().mockResolvedValue(undefined),
        discoverPeers: jest.fn().mockResolvedValue([]),
        addPeer: jest.fn(),
        removePeer: jest.fn(),
        on: jest.fn(),
        emit: jest.fn(),
    };
}
function createMockConflictResolver() {
    return {
        resolveConflict: jest.fn().mockResolvedValue({
            resolution: 'timestamp_wins',
            winner: null,
            mergedData: null
        }),
        getConflictStats: jest.fn().mockResolvedValue({
            totalConflicts: 0,
            resolvedConflicts: 0,
            pendingConflicts: 0
        }),
        on: jest.fn(),
        emit: jest.fn(),
    };
}
function createTestPeerInfo(overrides = {}) {
    return {
        nodeId: 'test-peer-' + Math.random().toString(36).substr(2, 9),
        address: '192.168.1.' + Math.floor(Math.random() * 255),
        port: 8080 + Math.floor(Math.random() * 1000),
        nodeName: 'Test Peer',
        lastSeen: new Date(),
        ...overrides
    };
}
function createTestSyncEvent(overrides = {}) {
    return {
        id: 'event-' + Math.random().toString(36).substr(2, 9),
        nodeId: 'test-node',
        eventType: 'CREATE',
        tableName: 'test_table',
        recordId: 'record-' + Math.random().toString(36).substr(2, 9),
        timestamp: new Date(),
        data: { test: 'data' },
        hash: 'mock-hash',
        signature: 'mock-signature',
        ...overrides
    };
}
function createTestSecuritySession(overrides = {}) {
    return {
        id: 'session-db-' + Math.random().toString(36).substr(2, 9),
        sessionId: 'session-' + Math.random().toString(36).substr(2, 9),
        sourceNodeId: 'source-node',
        targetNodeId: 'target-node',
        authToken: 'auth-token-123',
        establishedAt: new Date(),
        expiresAt: new Date(Date.now() + 60000),
        lastActivity: new Date(),
        isValid: true,
        encryptionKey: 'encryption-key-123',
        signingKey: 'signing-key-123',
        ...overrides
    };
}
function createTestAuthToken(overrides = {}) {
    return {
        id: 'token-db-' + Math.random().toString(36).substr(2, 9),
        tokenId: 'token-' + Math.random().toString(36).substr(2, 9),
        nodeId: 'test-node',
        issuedAt: new Date(),
        expiresAt: new Date(Date.now() + 60000),
        isValid: true,
        token: 'jwt-token-123',
        ...overrides
    };
}
function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
class MockEventEmitter extends events_1.EventEmitter {
    constructor() {
        super(...arguments);
        this.emitSpy = jest.fn();
        this.onSpy = jest.fn();
    }
    emit(event, ...args) {
        this.emitSpy(event, ...args);
        return super.emit(event, ...args);
    }
    on(event, listener) {
        this.onSpy(event, listener);
        return super.on(event, listener);
    }
}
exports.MockEventEmitter = MockEventEmitter;
function expectEventEmitted(emitter, eventName, expectedData) {
    const emitCalls = emitter.emitSpy.mock.calls;
    const eventCall = emitCalls.find(call => call[0] === eventName);
    expect(eventCall).toBeDefined();
    if (expectedData !== undefined) {
        expect(eventCall[1]).toEqual(expect.objectContaining(expectedData));
    }
}
function resetAllMocks() {
    jest.clearAllMocks();
}
function setupTestEnvironment() {
    const consoleMethods = ['log', 'info', 'warn', 'error', 'debug'];
    const originalConsole = {};
    consoleMethods.forEach(method => {
        originalConsole[method] = console[method];
        console[method] = jest.fn();
    });
    return {
        restoreConsole: () => {
            consoleMethods.forEach(method => {
                ;
                console[method] = originalConsole[method];
            });
        }
    };
}
function createMockTimer() {
    let currentTime = Date.now();
    return {
        getCurrentTime: () => currentTime,
        advanceTime: (ms) => {
            currentTime += ms;
        },
        resetTime: () => {
            currentTime = Date.now();
        },
        mockDateNow: () => {
            jest.spyOn(Date, 'now').mockImplementation(() => currentTime);
        },
        restoreDateNow: () => {
            jest.restoreAllMocks();
        }
    };
}
function validateSyncEvent(event) {
    expect(event).toEqual({
        id: expect.any(String),
        nodeId: expect.any(String),
        eventType: expect.stringMatching(/^(CREATE|UPDATE|DELETE)$/),
        tableName: expect.any(String),
        recordId: expect.any(String),
        timestamp: expect.any(Date),
        data: expect.any(Object),
        hash: expect.any(String),
        signature: expect.any(String)
    });
}
function validateSecurityAudit(audit) {
    expect(audit).toEqual({
        id: expect.any(String),
        auditId: expect.any(String),
        nodeId: expect.any(String),
        eventType: expect.any(String),
        timestamp: expect.any(Date),
        sourceIp: expect.any(String),
        targetNodeId: expect.any(String),
        errorMessage: expect.any(String),
        metadata: expect.any(Object)
    });
}
exports.TestData = {
    generateSyncEvents(count, nodeId = 'test-node') {
        return Array(count).fill(0).map((_, i) => createTestSyncEvent({
            nodeId,
            recordId: `record-${i}`,
            timestamp: new Date(Date.now() + i * 1000)
        }));
    },
    generateTestPeers(count) {
        return Array(count).fill(0).map((_, i) => createTestPeerInfo({
            nodeId: `peer-${i}`,
            address: `192.168.1.${100 + i}`,
            port: 8080 + i
        }));
    },
    generateConflictingEvents() {
        const baseEvent = createTestSyncEvent({
            recordId: 'conflicting-record',
            tableName: 'test_table'
        });
        return [
            {
                ...baseEvent,
                nodeId: 'node-1',
                timestamp: new Date('2024-01-01T10:00:00Z'),
                data: { value: 'node1-value', version: 1 }
            },
            {
                ...baseEvent,
                nodeId: 'node-2',
                timestamp: new Date('2024-01-01T10:01:00Z'),
                data: { value: 'node2-value', version: 2 }
            }
        ];
    }
};
