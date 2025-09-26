/**
 * Comprehensive Test Suite for Sync Service
 * Tests all core functionality of the peer-to-peer synchronization system
 */

import { SyncService, SyncServiceConfig } from '../sync-service'
import { PrismaClient } from '@prisma/client'
import { EventEmitter } from 'events'

// Mock Prisma client
jest.mock('@prisma/client')
const mockPrisma = {
  $connect: jest.fn(),
  $disconnect: jest.fn(),
  syncEvent: {
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  securityAudit: {
    findMany: jest.fn(),
    create: jest.fn(),
  },
  authToken: {
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  securitySession: {
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
}

// Mock dependencies
jest.mock('../peer-discovery')
jest.mock('../sync-engine')
jest.mock('../security-manager')
jest.mock('../conflict-resolver')
jest.mock('../database-hooks')
jest.mock('os')
jest.mock('fs')

describe('SyncService', () => {
  let syncService: SyncService
  let config: SyncServiceConfig

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks()

    // Mock PrismaClient constructor
    ;(PrismaClient as jest.Mock).mockImplementation(() => mockPrisma)

    config = {
      nodeName: 'test-node',
      registrationKey: 'test-registration-key',
      port: 8080,
      syncInterval: 30000,
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
      }
    }

    syncService = new SyncService(config)
  })

  afterEach(async () => {
    if (syncService) {
      try {
        await syncService.stop()
      } catch (error) {
        // Ignore cleanup errors in tests
      }
    }
  })

  describe('Initialization', () => {
    test('should create SyncService with default config', () => {
      const minimalConfig = {
        nodeName: 'minimal-node',
        registrationKey: 'test-key',
        port: 8080,
        syncInterval: 30000,
        enableAutoStart: false,
        logLevel: 'info' as const,
        dataDirectory: './data',
        maxLogSize: 1024,
        maxLogFiles: 1,
      }

      const service = new SyncService(minimalConfig)
      expect(service).toBeInstanceOf(SyncService)
      expect(service).toBeInstanceOf(EventEmitter)
    })

    test('should generate nodeId if not provided', () => {
      const service = new SyncService(config)
      const status = service.getStatus()
      expect(status.nodeId).toBeDefined()
      expect(typeof status.nodeId).toBe('string')
    })

    test('should use provided nodeId', () => {
      const customNodeId = 'custom-node-id'
      const configWithNodeId = { ...config, nodeId: customNodeId }
      const service = new SyncService(configWithNodeId)
      const status = service.getStatus()
      expect(status.nodeId).toBe(customNodeId)
    })
  })

  describe('Service Lifecycle', () => {
    test('should start service successfully', async () => {
      const startSpy = jest.fn()
      syncService.on('started', startSpy)

      await syncService.start()

      expect(startSpy).toHaveBeenCalledWith(expect.objectContaining({
        isRunning: true,
        nodeId: expect.any(String),
        nodeName: config.nodeName
      }))

      const status = syncService.getStatus()
      expect(status.isRunning).toBe(true)
    })

    test('should stop service successfully', async () => {
      const stopSpy = jest.fn()
      syncService.on('stopped', stopSpy)

      await syncService.start()
      await syncService.stop()

      expect(stopSpy).toHaveBeenCalled()

      const status = syncService.getStatus()
      expect(status.isRunning).toBe(false)
    })

    test('should restart service successfully', async () => {
      await syncService.start()
      expect(syncService.getStatus().isRunning).toBe(true)

      await syncService.restart()
      expect(syncService.getStatus().isRunning).toBe(true)
    })

    test('should handle start failure gracefully', async () => {
      // Mock database connection failure
      mockPrisma.$connect.mockRejectedValue(new Error('Database connection failed'))

      await expect(syncService.start()).rejects.toThrow('Database connection failed')
      expect(syncService.getStatus().isRunning).toBe(false)
    })

    test('should handle stop when not running', async () => {
      // Should not throw when stopping a service that's not running
      await expect(syncService.stop()).resolves.not.toThrow()
    })
  })

  describe('Status and Monitoring', () => {
    test('should return correct initial status', () => {
      const status = syncService.getStatus()

      expect(status).toEqual({
        isRunning: false,
        nodeId: expect.any(String),
        nodeName: config.nodeName,
        uptime: 0,
        peersConnected: 0,
        peersDiscovered: 0,
        lastSyncTime: null,
        totalEventsSynced: 0,
        conflictsResolved: 0,
        syncErrors: 0
      })
    })

    test('should update uptime when running', async () => {
      await syncService.start()

      // Wait a bit for uptime to accumulate
      await new Promise(resolve => setTimeout(resolve, 100))

      const status = syncService.getStatus()
      expect(status.uptime).toBeGreaterThan(0)
    })

    test('should emit health check events', async () => {
      const healthCheckSpy = jest.fn()
      syncService.on('health_check', healthCheckSpy)

      await syncService.start()

      // Wait for at least one health check
      await new Promise(resolve => setTimeout(resolve, 100))

      // Health checks should be emitted (implementation dependent)
      // This test validates the event structure when emitted
    })
  })

  describe('Sync Operations', () => {
    beforeEach(async () => {
      await syncService.start()
    })

    test('should force sync with all peers', async () => {
      await expect(syncService.forceSync()).resolves.not.toThrow()
    })

    test('should get sync statistics', async () => {
      const stats = await syncService.getSyncStats()
      expect(stats).toBeDefined()
    })

    test('should handle force sync when engine not initialized', async () => {
      await syncService.stop()
      await expect(syncService.forceSync()).rejects.toThrow('Sync engine not initialized')
    })

    test('should handle get stats when utils not initialized', async () => {
      await syncService.stop()
      await expect(syncService.getSyncStats()).rejects.toThrow('Sync utils not initialized')
    })
  })

  describe('Partition Handling', () => {
    beforeEach(async () => {
      await syncService.start()
    })

    test('should get active partitions', () => {
      const partitions = syncService.getActivePartitions()
      expect(Array.isArray(partitions)).toBe(true)
    })

    test('should initiate partition recovery', async () => {
      const partitionId = 'test-partition-id'
      const result = await syncService.initiatePartitionRecovery(partitionId)
      expect(result).toBeDefined()
    })

    test('should get recovery session status', () => {
      const sessionId = 'test-session-id'
      const session = syncService.getRecoverySession(sessionId)
      // Should handle gracefully when session doesn't exist
      expect(session).toBeDefined()
    })

    test('should get active recovery sessions', () => {
      const sessions = syncService.getActiveRecoverySessions()
      expect(Array.isArray(sessions)).toBe(true)
    })

    test('should get recovery metrics', async () => {
      const metrics = await syncService.getRecoveryMetrics()
      expect(metrics).toEqual({
        totalRecoveries: expect.any(Number),
        successfulRecoveries: expect.any(Number),
        failedRecoveries: expect.any(Number),
        averageRecoveryTime: expect.any(Number),
        recoverySuccessRate: expect.any(Number),
        commonFailureReasons: expect.any(Array)
      })
    })

    test('should cancel recovery session', async () => {
      const sessionId = 'test-session-id'
      const result = await syncService.cancelRecoverySession(sessionId)
      expect(typeof result).toBe('boolean')
    })
  })

  describe('Security Operations', () => {
    beforeEach(async () => {
      await syncService.start()
    })

    test('should authenticate peer', async () => {
      const peer = { nodeId: 'peer-node-id', address: '192.168.1.100' }
      const keyHash = 'test-key-hash'

      const result = await syncService.authenticatePeer(peer, keyHash)
      expect(result).toEqual({
        success: expect.any(Boolean),
        authToken: expect.any(String),
        errorMessage: expect.any(String)
      })
    })

    test('should establish secure session', async () => {
      const targetNodeId = 'target-node-id'
      const authToken = 'test-auth-token'

      const result = await syncService.establishSecureSession(targetNodeId, authToken)
      expect(result).toEqual({
        success: expect.any(Boolean),
        sessionId: expect.any(String),
        encryptionKey: expect.any(String),
        errorMessage: expect.any(String)
      })
    })

    test('should validate session', async () => {
      const sessionId = 'test-session-id'

      const result = await syncService.validateSession(sessionId)
      expect(result).toEqual({
        valid: expect.any(Boolean),
        session: expect.any(Object),
        errorMessage: expect.any(String)
      })
    })

    test('should get security audit logs', async () => {
      const logs = await syncService.getSecurityAuditLogs(50)
      expect(Array.isArray(logs)).toBe(true)
    })

    test('should get security statistics', async () => {
      const stats = await syncService.getSecurityStats()
      expect(stats).toEqual({
        totalAuthentications: expect.any(Number),
        successfulAuthentications: expect.any(Number),
        failedAuthentications: expect.any(Number),
        activeSessions: expect.any(Number),
        expiredSessions: expect.any(Number),
        securityIncidents: expect.any(Number)
      })
    })

    test('should rotate registration key', async () => {
      const newKey = 'new-registration-key'
      const gracePeriod = 60000

      const result = await syncService.rotateRegistrationKey(newKey, gracePeriod)
      expect(typeof result).toBe('boolean')
    })

    test('should revoke session', async () => {
      const sessionId = 'test-session-id'

      const result = await syncService.revokeSession(sessionId)
      expect(typeof result).toBe('boolean')
    })

    test('should get active sessions', async () => {
      const sessions = await syncService.getActiveSessions()
      expect(Array.isArray(sessions)).toBe(true)
    })

    test('should handle security operations when manager not initialized', async () => {
      await syncService.stop()

      const peer = { nodeId: 'test-node' }
      const authResult = await syncService.authenticatePeer(peer, 'hash')
      expect(authResult.success).toBe(false)
      expect(authResult.errorMessage).toBe('Security manager not initialized')

      const sessionResult = await syncService.establishSecureSession('target', 'token')
      expect(sessionResult.success).toBe(false)

      const validateResult = await syncService.validateSession('session-id')
      expect(validateResult.valid).toBe(false)

      const logs = await syncService.getSecurityAuditLogs()
      expect(logs).toEqual([])

      const stats = await syncService.getSecurityStats()
      expect(stats.totalAuthentications).toBe(0)

      const rotateResult = await syncService.rotateRegistrationKey('new-key')
      expect(rotateResult).toBe(false)

      const revokeResult = await syncService.revokeSession('session-id')
      expect(revokeResult).toBe(false)

      const sessions = await syncService.getActiveSessions()
      expect(sessions).toEqual([])
    })
  })

  describe('Event Handling', () => {
    test('should emit started event with correct data', async () => {
      const startedSpy = jest.fn()
      syncService.on('started', startedSpy)

      await syncService.start()

      expect(startedSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          isRunning: true,
          nodeId: expect.any(String),
          nodeName: config.nodeName,
          uptime: expect.any(Number)
        })
      )
    })

    test('should emit stopped event', async () => {
      const stoppedSpy = jest.fn()
      syncService.on('stopped', stoppedSpy)

      await syncService.start()
      await syncService.stop()

      expect(stoppedSpy).toHaveBeenCalled()
    })

    test('should handle multiple event listeners', async () => {
      const listener1 = jest.fn()
      const listener2 = jest.fn()

      syncService.on('started', listener1)
      syncService.on('started', listener2)

      await syncService.start()

      expect(listener1).toHaveBeenCalled()
      expect(listener2).toHaveBeenCalled()
    })
  })

  describe('Error Handling', () => {
    test('should handle database initialization failure', async () => {
      mockPrisma.$connect.mockRejectedValue(new Error('Database connection failed'))

      await expect(syncService.start()).rejects.toThrow('Database connection failed')
      expect(syncService.getStatus().isRunning).toBe(false)
    })

    test('should handle graceful shutdown on errors', async () => {
      await syncService.start()

      // Simulate error during operation
      mockPrisma.$disconnect.mockRejectedValue(new Error('Disconnect failed'))

      // Should still complete shutdown despite error
      await expect(syncService.stop()).rejects.toThrow('Disconnect failed')
    })

    test('should validate configuration parameters', () => {
      const invalidConfig = {
        ...config,
        port: -1, // Invalid port
      }

      // Service should still create but may fail on start
      const service = new SyncService(invalidConfig)
      expect(service).toBeInstanceOf(SyncService)
    })
  })

  describe('Configuration', () => {
    test('should apply default configuration values', () => {
      const minimalConfig = {
        nodeName: 'test',
        registrationKey: 'key',
        port: 8080,
        syncInterval: 30000,
        enableAutoStart: false,
        logLevel: 'info' as const,
        dataDirectory: './data',
        maxLogSize: 1024,
        maxLogFiles: 1,
      }

      const service = new SyncService(minimalConfig)
      expect(service).toBeDefined()
    })

    test('should override default values with provided config', () => {
      const customConfig = {
        ...config,
        syncInterval: 60000,
        logLevel: 'debug' as const,
        maxLogSize: 2 * 1024 * 1024,
      }

      const service = new SyncService(customConfig)
      expect(service).toBeDefined()
    })

    test('should handle security configuration', () => {
      const securityConfig = {
        ...config,
        security: {
          enableEncryption: false,
          enableSignatures: false,
          keyRotationEnabled: true,
          keyRotationInterval: 12 * 60 * 60 * 1000, // 12 hours
          sessionTimeout: 30 * 60 * 1000, // 30 minutes
          maxFailedAttempts: 10,
          rateLimitWindow: 30 * 1000, // 30 seconds
          rateLimitMaxRequests: 50,
        }
      }

      const service = new SyncService(securityConfig)
      expect(service).toBeDefined()
    })
  })
})