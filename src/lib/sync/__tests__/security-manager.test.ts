/**
 * Security Manager Test Suite
 * Tests authentication, encryption, and security audit functionality
 */

import { SecurityManager, createSecurityManager, SecurityManagerConfig } from '../security-manager'
import { PrismaClient } from '@prisma/client'
import { EventEmitter } from 'events'

// Mock Prisma client
jest.mock('@prisma/client')
const mockPrisma = {
  securityAudit: {
    create: jest.fn(),
    findMany: jest.fn(),
  },
  authToken: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    deleteMany: jest.fn(),
  },
  securitySession: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
    deleteMany: jest.fn(),
  },
}

// Mock crypto
const mockCrypto = {
  createHash: jest.fn(() => ({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn(() => 'mock-hash')
  })),
  createHmac: jest.fn(() => ({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn(() => 'mock-signature')
  })),
  createCipher: jest.fn(() => ({
    update: jest.fn(() => 'encrypted-'),
    final: jest.fn(() => 'data')
  })),
  createDecipher: jest.fn(() => ({
    update: jest.fn(() => 'decrypted-'),
    final: jest.fn(() => 'data')
  })),
  randomBytes: jest.fn(() => Buffer.from('random-bytes'))
}

jest.mock('crypto', () => mockCrypto)

describe('SecurityManager', () => {
  let securityManager: SecurityManager
  let config: SecurityManagerConfig

  beforeEach(() => {
    jest.clearAllMocks()
    ;(PrismaClient as jest.Mock).mockImplementation(() => mockPrisma)

    config = {
      nodeId: 'test-node-id',
      registrationKey: 'test-registration-key',
      enableEncryption: true,
      enableSignatures: true,
      keyRotationEnabled: false,
      keyRotationInterval: 24 * 60 * 60 * 1000,
      sessionTimeout: 60 * 60 * 1000,
      maxFailedAttempts: 5,
      rateLimitWindow: 60 * 1000,
      rateLimitMaxRequests: 100,
      auditEnabled: true
    }

    securityManager = createSecurityManager(config)
  })

  afterEach(async () => {
    if (securityManager) {
      try {
        await securityManager.shutdown()
      } catch (error) {
        // Ignore cleanup errors in tests
      }
    }
  })

  describe('Initialization', () => {
    test('should create SecurityManager with factory function', () => {
      expect(securityManager).toBeInstanceOf(SecurityManager)
      expect(securityManager).toBeInstanceOf(EventEmitter)
    })

    test('should initialize successfully', async () => {
      await expect(securityManager.initialize()).resolves.not.toThrow()
    })

    test('should handle initialization with default config', async () => {
      const minimalConfig = {
        nodeId: 'minimal-node',
        registrationKey: 'minimal-key'
      }

      const manager = createSecurityManager(minimalConfig)
      await expect(manager.initialize()).resolves.not.toThrow()
      await manager.shutdown()
    })
  })

  describe('Peer Authentication', () => {
    beforeEach(async () => {
      await securityManager.initialize()
    })

    test('should authenticate peer with correct key hash', async () => {
      const peer = {
        nodeId: 'peer-node-id',
        address: '192.168.1.100',
        port: 8080
      }
      const keyHash = 'mock-hash' // This will match our mocked crypto.createHash

      mockPrisma.authToken.create.mockResolvedValue({
        id: 'token-1',
        tokenId: 'token-id-1',
        nodeId: peer.nodeId,
        token: 'auth-token-123',
        expiresAt: new Date(Date.now() + 60000)
      })

      const result = await securityManager.authenticatePeer(peer, keyHash)

      expect(result.success).toBe(true)
      expect(result.authToken).toBeDefined()
      expect(mockPrisma.authToken.create).toHaveBeenCalled()
      expect(mockPrisma.securityAudit.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          eventType: 'AUTHENTICATION_SUCCESS',
          nodeId: peer.nodeId
        })
      })
    })

    test('should reject peer with incorrect key hash', async () => {
      const peer = {
        nodeId: 'peer-node-id',
        address: '192.168.1.100'
      }
      const incorrectKeyHash = 'wrong-hash'

      const result = await securityManager.authenticatePeer(peer, incorrectKeyHash)

      expect(result.success).toBe(false)
      expect(result.errorMessage).toContain('Invalid registration key')
      expect(mockPrisma.securityAudit.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          eventType: 'AUTHENTICATION_FAILED',
          nodeId: peer.nodeId
        })
      })
    })

    test('should handle authentication rate limiting', async () => {
      const peer = {
        nodeId: 'rate-limited-peer',
        address: '192.168.1.100'
      }

      // Simulate rate limiting by calling authenticate multiple times quickly
      const promises = Array(150).fill(0).map(() =>
        securityManager.authenticatePeer(peer, 'any-hash')
      )

      const results = await Promise.all(promises)

      // Some requests should be rate limited
      const rateLimitedResults = results.filter(r =>
        r.errorMessage?.includes('Rate limit exceeded')
      )
      expect(rateLimitedResults.length).toBeGreaterThan(0)
    })

    test('should track failed authentication attempts', async () => {
      const peer = {
        nodeId: 'failing-peer',
        address: '192.168.1.100'
      }

      // Multiple failed attempts
      for (let i = 0; i < 6; i++) {
        await securityManager.authenticatePeer(peer, 'wrong-hash')
      }

      // Should create multiple audit entries
      expect(mockPrisma.securityAudit.create).toHaveBeenCalledTimes(6)
    })
  })

  describe('Session Management', () => {
    let authToken: string

    beforeEach(async () => {
      await securityManager.initialize()

      // Create auth token first
      const peer = { nodeId: 'session-peer', address: '192.168.1.100' }
      mockPrisma.authToken.create.mockResolvedValue({
        id: 'token-1',
        tokenId: 'token-id-1',
        nodeId: peer.nodeId,
        token: 'auth-token-123',
        expiresAt: new Date(Date.now() + 60000)
      })

      const authResult = await securityManager.authenticatePeer(peer, 'mock-hash')
      authToken = authResult.authToken!
    })

    test('should establish secure session', async () => {
      const sourceNodeId = 'source-node'
      const targetNodeId = 'target-node'

      mockPrisma.securitySession.create.mockResolvedValue({
        id: 'session-1',
        sessionId: 'session-id-1',
        sourceNodeId,
        targetNodeId,
        authToken,
        establishedAt: new Date(),
        expiresAt: new Date(Date.now() + 60000),
        encryptionKey: 'encryption-key',
        signingKey: 'signing-key'
      })

      const result = await securityManager.establishSecureSession(sourceNodeId, targetNodeId, authToken)

      expect(result.success).toBe(true)
      expect(result.sessionId).toBeDefined()
      expect(result.encryptionKey).toBeDefined()
      expect(mockPrisma.securitySession.create).toHaveBeenCalled()
    })

    test('should validate active session', async () => {
      const sessionId = 'valid-session-id'

      mockPrisma.securitySession.findUnique.mockResolvedValue({
        id: 'session-1',
        sessionId,
        sourceNodeId: 'source',
        targetNodeId: 'target',
        authToken,
        establishedAt: new Date(Date.now() - 30000),
        expiresAt: new Date(Date.now() + 30000),
        lastActivity: new Date(),
        isValid: true,
        encryptionKey: 'encryption-key'
      })

      const result = await securityManager.validateSession(sessionId)

      expect(result.valid).toBe(true)
      expect(result.session).toBeDefined()
      expect(mockPrisma.securitySession.update).toHaveBeenCalledWith({
        where: { sessionId },
        data: { lastActivity: expect.any(Date) }
      })
    })

    test('should reject expired session', async () => {
      const sessionId = 'expired-session-id'

      mockPrisma.securitySession.findUnique.mockResolvedValue({
        id: 'session-1',
        sessionId,
        sourceNodeId: 'source',
        targetNodeId: 'target',
        authToken,
        establishedAt: new Date(Date.now() - 120000),
        expiresAt: new Date(Date.now() - 60000), // Expired
        lastActivity: new Date(Date.now() - 60000),
        isValid: true,
        encryptionKey: 'encryption-key'
      })

      const result = await securityManager.validateSession(sessionId)

      expect(result.valid).toBe(false)
      expect(result.errorMessage).toContain('expired')
    })

    test('should revoke session', async () => {
      const sessionId = 'session-to-revoke'

      mockPrisma.securitySession.update.mockResolvedValue({
        id: 'session-1',
        sessionId,
        isValid: false
      })

      const result = await securityManager.revokeSession(sessionId)

      expect(result).toBe(true)
      expect(mockPrisma.securitySession.update).toHaveBeenCalledWith({
        where: { sessionId },
        data: { isValid: false }
      })
    })

    test('should get active sessions', async () => {
      mockPrisma.securitySession.findMany.mockResolvedValue([
        {
          id: 'session-1',
          sessionId: 'session-1-id',
          sourceNodeId: 'source',
          targetNodeId: 'target',
          establishedAt: new Date(),
          expiresAt: new Date(Date.now() + 60000),
          isValid: true
        },
        {
          id: 'session-2',
          sessionId: 'session-2-id',
          sourceNodeId: 'source2',
          targetNodeId: 'target2',
          establishedAt: new Date(),
          expiresAt: new Date(Date.now() + 60000),
          isValid: true
        }
      ])

      const sessions = await securityManager.getActiveSessions()

      expect(sessions).toHaveLength(2)
      expect(mockPrisma.securitySession.findMany).toHaveBeenCalledWith({
        where: {
          isValid: true,
          expiresAt: { gt: expect.any(Date) }
        }
      })
    })
  })

  describe('Data Encryption', () => {
    beforeEach(async () => {
      await securityManager.initialize()
    })

    test('should encrypt data with session key', async () => {
      const data = { message: 'secret data', value: 123 }
      const sessionKey = 'session-encryption-key'

      const result = await securityManager.encryptData(data, sessionKey)

      expect(result.success).toBe(true)
      expect(result.encryptedData).toBeDefined()
      expect(result.signature).toBeDefined()
      expect(mockCrypto.createCipher).toHaveBeenCalled()
      expect(mockCrypto.createHmac).toHaveBeenCalled()
    })

    test('should decrypt data with session key', async () => {
      const encryptedData = 'encrypted-data'
      const signature = 'mock-signature'
      const sessionKey = 'session-encryption-key'

      const result = await securityManager.decryptData(encryptedData, signature, sessionKey)

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(mockCrypto.createDecipher).toHaveBeenCalled()
      expect(mockCrypto.createHmac).toHaveBeenCalled()
    })

    test('should reject data with invalid signature', async () => {
      const encryptedData = 'encrypted-data'
      const invalidSignature = 'invalid-signature'
      const sessionKey = 'session-encryption-key'

      // Mock signature verification to fail
      mockCrypto.createHmac.mockReturnValueOnce({
        update: jest.fn().mockReturnThis(),
        digest: jest.fn(() => 'different-signature')
      })

      const result = await securityManager.decryptData(encryptedData, invalidSignature, sessionKey)

      expect(result.success).toBe(false)
      expect(result.errorMessage).toContain('Invalid signature')
    })

    test('should handle encryption/decryption when disabled', async () => {
      const noEncryptionConfig = { ...config, enableEncryption: false, enableSignatures: false }
      const manager = createSecurityManager(noEncryptionConfig)
      await manager.initialize()

      const data = { message: 'test' }
      const sessionKey = 'key'

      const encryptResult = await manager.encryptData(data, sessionKey)
      expect(encryptResult.success).toBe(true)
      expect(encryptResult.encryptedData).toBe(JSON.stringify(data)) // Should be plain text

      const decryptResult = await manager.decryptData(encryptResult.encryptedData!, '', sessionKey)
      expect(decryptResult.success).toBe(true)
      expect(decryptResult.data).toEqual(data)

      await manager.shutdown()
    })
  })

  describe('Key Management', () => {
    beforeEach(async () => {
      await securityManager.initialize()
    })

    test('should rotate registration key', async () => {
      const newKey = 'new-registration-key'
      const gracePeriodMs = 60000

      const result = await securityManager.rotateRegistrationKey(newKey, gracePeriodMs)

      expect(result).toBe(true)
      // Key rotation should be tracked internally
    })

    test('should handle key rotation with grace period', async () => {
      const newKey = 'another-new-key'
      const gracePeriodMs = 100 // Short grace period for testing

      const result = await securityManager.rotateRegistrationKey(newKey, gracePeriodMs)
      expect(result).toBe(true)

      // During grace period, both old and new keys should work
      const peer = { nodeId: 'test-peer', address: '192.168.1.1' }

      // Test with new key hash
      const newKeyHash = 'mock-hash' // Our mocked hash
      const authResult = await securityManager.authenticatePeer(peer, newKeyHash)
      expect(authResult.success).toBe(true)

      // Wait for grace period to end
      await new Promise(resolve => setTimeout(resolve, 150))
    })

    test('should clean up expired tokens and sessions', async () => {
      // Mock expired tokens and sessions
      mockPrisma.authToken.deleteMany.mockResolvedValue({ count: 3 })
      mockPrisma.securitySession.deleteMany.mockResolvedValue({ count: 2 })

      await securityManager.cleanupExpiredTokens()

      expect(mockPrisma.authToken.deleteMany).toHaveBeenCalledWith({
        where: { expiresAt: { lt: expect.any(Date) } }
      })
      expect(mockPrisma.securitySession.deleteMany).toHaveBeenCalledWith({
        where: { expiresAt: { lt: expect.any(Date) } }
      })
    })
  })

  describe('Audit and Statistics', () => {
    beforeEach(async () => {
      await securityManager.initialize()
    })

    test('should get audit logs', async () => {
      const mockLogs = [
        {
          id: 'audit-1',
          auditId: 'audit-id-1',
          nodeId: 'node-1',
          eventType: 'AUTHENTICATION_SUCCESS',
          timestamp: new Date(),
          sourceIp: '192.168.1.100'
        },
        {
          id: 'audit-2',
          auditId: 'audit-id-2',
          nodeId: 'node-2',
          eventType: 'AUTHENTICATION_FAILED',
          timestamp: new Date(),
          sourceIp: '192.168.1.101'
        }
      ]

      mockPrisma.securityAudit.findMany.mockResolvedValue(mockLogs)

      const logs = await securityManager.getAuditLogs(10)

      expect(logs).toEqual(mockLogs)
      expect(mockPrisma.securityAudit.findMany).toHaveBeenCalledWith({
        orderBy: { timestamp: 'desc' },
        take: 10
      })
    })

    test('should get security statistics', async () => {
      // Mock statistics queries
      mockPrisma.securityAudit.findMany
        .mockResolvedValueOnce([{ id: '1' }, { id: '2' }, { id: '3' }]) // Total authentications
        .mockResolvedValueOnce([{ id: '1' }, { id: '2' }]) // Successful authentications
        .mockResolvedValueOnce([{ id: '3' }]) // Failed authentications
        .mockResolvedValueOnce([]) // Security incidents

      mockPrisma.securitySession.findMany
        .mockResolvedValueOnce([{ id: '1' }, { id: '2' }]) // Active sessions
        .mockResolvedValueOnce([{ id: '3' }]) // Expired sessions

      const stats = await securityManager.getSecurityStats()

      expect(stats).toEqual({
        totalAuthentications: 3,
        successfulAuthentications: 2,
        failedAuthentications: 1,
        activeSessions: 2,
        expiredSessions: 1,
        securityIncidents: 0
      })
    })

    test('should handle audit logging when disabled', async () => {
      const noAuditConfig = { ...config, auditEnabled: false }
      const manager = createSecurityManager(noAuditConfig)
      await manager.initialize()

      const peer = { nodeId: 'test-peer', address: '192.168.1.1' }
      await manager.authenticatePeer(peer, 'wrong-hash')

      // Should not create audit log when disabled
      expect(mockPrisma.securityAudit.create).not.toHaveBeenCalled()

      await manager.shutdown()
    })
  })

  describe('Event Emission', () => {
    beforeEach(async () => {
      await securityManager.initialize()
    })

    test('should emit security events', async () => {
      const authSuccessSpy = jest.fn()
      const authFailedSpy = jest.fn()

      securityManager.on('authentication_success', authSuccessSpy)
      securityManager.on('authentication_failed', authFailedSpy)

      const peer = { nodeId: 'event-peer', address: '192.168.1.1' }

      // Successful authentication
      await securityManager.authenticatePeer(peer, 'mock-hash')
      expect(authSuccessSpy).toHaveBeenCalledWith({
        nodeId: peer.nodeId,
        address: peer.address,
        timestamp: expect.any(Date)
      })

      // Failed authentication
      await securityManager.authenticatePeer(peer, 'wrong-hash')
      expect(authFailedSpy).toHaveBeenCalledWith({
        nodeId: peer.nodeId,
        address: peer.address,
        reason: expect.any(String),
        timestamp: expect.any(Date)
      })
    })

    test('should emit session events', async () => {
      const sessionEstablishedSpy = jest.fn()
      const sessionExpiredSpy = jest.fn()

      securityManager.on('session_established', sessionEstablishedSpy)
      securityManager.on('session_expired', sessionExpiredSpy)

      // Establish session
      mockPrisma.securitySession.create.mockResolvedValue({
        id: 'session-1',
        sessionId: 'session-id-1',
        sourceNodeId: 'source',
        targetNodeId: 'target'
      })

      await securityManager.establishSecureSession('source', 'target', 'auth-token')
      expect(sessionEstablishedSpy).toHaveBeenCalled()
    })
  })

  describe('Error Handling', () => {
    beforeEach(async () => {
      await securityManager.initialize()
    })

    test('should handle database errors gracefully', async () => {
      mockPrisma.securityAudit.create.mockRejectedValue(new Error('Database error'))

      const peer = { nodeId: 'error-peer', address: '192.168.1.1' }
      const result = await securityManager.authenticatePeer(peer, 'mock-hash')

      // Should still return a result even if audit logging fails
      expect(result).toBeDefined()
      expect(result.success).toBe(true)
    })

    test('should handle encryption errors', async () => {
      mockCrypto.createCipher.mockImplementation(() => {
        throw new Error('Encryption failed')
      })

      const data = { test: 'data' }
      const result = await securityManager.encryptData(data, 'key')

      expect(result.success).toBe(false)
      expect(result.errorMessage).toContain('Encryption failed')
    })

    test('should handle invalid session data', async () => {
      const sessionId = 'invalid-session'

      mockPrisma.securitySession.findUnique.mockResolvedValue(null)

      const result = await securityManager.validateSession(sessionId)

      expect(result.valid).toBe(false)
      expect(result.errorMessage).toContain('not found')
    })
  })

  describe('Shutdown', () => {
    test('should shutdown gracefully', async () => {
      await securityManager.initialize()
      await expect(securityManager.shutdown()).resolves.not.toThrow()
    })

    test('should handle shutdown when not initialized', async () => {
      await expect(securityManager.shutdown()).resolves.not.toThrow()
    })

    test('should clean up resources on shutdown', async () => {
      await securityManager.initialize()

      const cleanupSpy = jest.fn()
      securityManager.on('shutdown', cleanupSpy)

      await securityManager.shutdown()

      expect(cleanupSpy).toHaveBeenCalled()
    })
  })
})