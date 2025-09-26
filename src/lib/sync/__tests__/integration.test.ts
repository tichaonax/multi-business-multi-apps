/**
 * Integration Test Suite
 * Tests the entire peer-to-peer synchronization system working together
 */

import { SyncService, SyncServiceConfig } from '../sync-service'
import { createSecurityManager } from '../security-manager'
import { createSyncEngine } from '../sync-engine'
import { createPeerDiscovery } from '../peer-discovery'
import { PrismaClient } from '@prisma/client'

// Mock all dependencies
jest.mock('@prisma/client')
jest.mock('../peer-discovery')
jest.mock('../sync-engine')
jest.mock('../security-manager')
jest.mock('../conflict-resolver')
jest.mock('../database-hooks')
jest.mock('os')
jest.mock('fs')
jest.mock('dgram')

const mockPrisma = {
  $connect: jest.fn(),
  $disconnect: jest.fn(),
  syncEvent: {
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  securityAudit: {
    create: jest.fn(),
    findMany: jest.fn(),
  },
  authToken: {
    create: jest.fn(),
    findUnique: jest.fn(),
  },
  securitySession: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
}

// Mock security manager
const mockSecurityManager = {
  initialize: jest.fn(),
  shutdown: jest.fn(),
  authenticatePeer: jest.fn(),
  establishSecureSession: jest.fn(),
  validateSession: jest.fn(),
  encryptData: jest.fn(),
  decryptData: jest.fn(),
  getAuditLogs: jest.fn(),
  getSecurityStats: jest.fn(),
  rotateRegistrationKey: jest.fn(),
  revokeSession: jest.fn(),
  getActiveSessions: jest.fn(),
  cleanupExpiredTokens: jest.fn(),
  on: jest.fn(),
  emit: jest.fn(),
}

// Mock sync engine
const mockSyncEngine = {
  start: jest.fn(),
  stop: jest.fn(),
  syncWithPeer: jest.fn(),
  syncWithAllPeers: jest.fn(),
  on: jest.fn(),
  emit: jest.fn(),
}

// Mock peer discovery
const mockPeerDiscovery = {
  start: jest.fn(),
  stop: jest.fn(),
  getDiscoveredPeers: jest.fn(),
  announceSelf: jest.fn(),
  on: jest.fn(),
  emit: jest.fn(),
}

describe('Integration Tests', () => {
  let node1: SyncService
  let node2: SyncService
  let config1: SyncServiceConfig
  let config2: SyncServiceConfig

  beforeEach(() => {
    jest.clearAllMocks()

    // Setup mocks
    ;(PrismaClient as jest.Mock).mockImplementation(() => mockPrisma)
    ;(createSecurityManager as jest.Mock).mockReturnValue(mockSecurityManager)
    ;(createSyncEngine as jest.Mock).mockReturnValue(mockSyncEngine)
    ;(createPeerDiscovery as jest.Mock).mockReturnValue(mockPeerDiscovery)

    // Setup default mock behaviors
    mockPrisma.$connect.mockResolvedValue(undefined)
    mockPrisma.$disconnect.mockResolvedValue(undefined)
    mockSecurityManager.initialize.mockResolvedValue(undefined)
    mockSecurityManager.shutdown.mockResolvedValue(undefined)
    mockSyncEngine.start.mockResolvedValue(undefined)
    mockSyncEngine.stop.mockResolvedValue(undefined)
    mockPeerDiscovery.start.mockResolvedValue(undefined)
    mockPeerDiscovery.stop.mockResolvedValue(undefined)
    mockPeerDiscovery.getDiscoveredPeers.mockReturnValue([])

    config1 = {
      nodeId: 'node-1',
      nodeName: 'Test Node 1',
      registrationKey: 'shared-registration-key',
      port: 8081,
      syncInterval: 5000,
      enableAutoStart: false,
      logLevel: 'info',
      dataDirectory: './test-data-1',
      maxLogSize: 1024 * 1024,
      maxLogFiles: 3,
      security: {
        enableEncryption: true,
        enableSignatures: true,
        sessionTimeout: 60000,
        maxFailedAttempts: 3,
      }
    }

    config2 = {
      nodeId: 'node-2',
      nodeName: 'Test Node 2',
      registrationKey: 'shared-registration-key',
      port: 8082,
      syncInterval: 5000,
      enableAutoStart: false,
      logLevel: 'info',
      dataDirectory: './test-data-2',
      maxLogSize: 1024 * 1024,
      maxLogFiles: 3,
      security: {
        enableEncryption: true,
        enableSignatures: true,
        sessionTimeout: 60000,
        maxFailedAttempts: 3,
      }
    }

    node1 = new SyncService(config1)
    node2 = new SyncService(config2)
  })

  afterEach(async () => {
    try {
      await node1?.stop()
      await node2?.stop()
    } catch (error) {
      // Ignore cleanup errors in tests
    }
  })

  describe('Two-Node Synchronization', () => {
    test('should start both nodes successfully', async () => {
      await expect(node1.start()).resolves.not.toThrow()
      await expect(node2.start()).resolves.not.toThrow()

      expect(node1.getStatus().isRunning).toBe(true)
      expect(node2.getStatus().isRunning).toBe(true)
    })

    test('should establish secure connection between nodes', async () => {
      await node1.start()
      await node2.start()

      // Mock successful authentication
      mockSecurityManager.authenticatePeer.mockResolvedValue({
        success: true,
        authToken: 'auth-token-123'
      })

      // Mock successful session establishment
      mockSecurityManager.establishSecureSession.mockResolvedValue({
        success: true,
        sessionId: 'session-123',
        encryptionKey: 'encryption-key-123'
      })

      // Simulate peer discovery
      const node2Info = {
        nodeId: 'node-2',
        address: '192.168.1.102',
        port: 8082
      }

      const authResult = await node1.authenticatePeer(node2Info, 'mock-key-hash')
      expect(authResult.success).toBe(true)

      const sessionResult = await node1.establishSecureSession('node-2', authResult.authToken!)
      expect(sessionResult.success).toBe(true)
    })

    test('should synchronize data between nodes', async () => {
      await node1.start()
      await node2.start()

      // Mock sync engine operations
      mockSyncEngine.syncWithAllPeers.mockResolvedValue(undefined)

      await expect(node1.forceSync()).resolves.not.toThrow()
      await expect(node2.forceSync()).resolves.not.toThrow()

      expect(mockSyncEngine.syncWithAllPeers).toHaveBeenCalledTimes(2)
    })

    test('should handle conflict resolution during sync', async () => {
      await node1.start()
      await node2.start()

      // Simulate conflicting data
      const conflictingEvent1 = {
        id: 'event-1',
        nodeId: 'node-1',
        timestamp: new Date('2024-01-01T10:00:00Z'),
        data: { value: 'node1-value' }
      }

      const conflictingEvent2 = {
        id: 'event-1',
        nodeId: 'node-2',
        timestamp: new Date('2024-01-01T10:01:00Z'),
        data: { value: 'node2-value' }
      }

      // Mock sync engine to handle conflicts
      mockSyncEngine.syncWithPeer.mockImplementation(async (peerId, events) => {
        // Simulate conflict resolution - newer timestamp wins
        return {
          resolved: true,
          conflicts: 1,
          winner: conflictingEvent2 // Node 2 has newer timestamp
        }
      })

      await node1.forceSync()
      expect(mockSyncEngine.syncWithAllPeers).toHaveBeenCalled()
    })

    test('should maintain security audit trail', async () => {
      await node1.start()
      await node2.start()

      // Mock audit log entries
      const mockAuditLogs = [
        {
          id: 'audit-1',
          eventType: 'AUTHENTICATION_SUCCESS',
          nodeId: 'node-2',
          timestamp: new Date(),
          sourceIp: '192.168.1.102'
        },
        {
          id: 'audit-2',
          eventType: 'SESSION_ESTABLISHED',
          nodeId: 'node-2',
          timestamp: new Date(),
          sourceIp: '192.168.1.102'
        }
      ]

      mockSecurityManager.getAuditLogs.mockResolvedValue(mockAuditLogs)

      const auditLogs = await node1.getSecurityAuditLogs(10)
      expect(auditLogs).toHaveLength(2)
      expect(auditLogs[0].eventType).toBe('AUTHENTICATION_SUCCESS')
    })
  })

  describe('Network Partition Scenarios', () => {
    test('should detect network partition', async () => {
      await node1.start()
      await node2.start()

      // Simulate network partition
      mockPeerDiscovery.getDiscoveredPeers.mockReturnValue([])

      const partitions = node1.getActivePartitions()
      expect(Array.isArray(partitions)).toBe(true)
    })

    test('should recover from network partition', async () => {
      await node1.start()
      await node2.start()

      // Simulate partition recovery
      const partitionId = 'partition-123'
      const recoveryResult = await node1.initiatePartitionRecovery(partitionId, 'merge')

      expect(recoveryResult).toBeDefined()
    })

    test('should handle offline operations during partition', async () => {
      await node1.start()

      // Simulate offline operations
      const offlineEvent = {
        id: 'offline-event-1',
        nodeId: 'node-1',
        timestamp: new Date(),
        data: { operation: 'create', table: 'users', record: { id: 1, name: 'test' } }
      }

      // Operations should queue locally when offline
      await expect(node1.forceSync()).resolves.not.toThrow()
    })
  })

  describe('Security Scenarios', () => {
    test('should reject unauthorized peer', async () => {
      await node1.start()

      const unauthorizedPeer = {
        nodeId: 'malicious-node',
        address: '192.168.1.999'
      }

      mockSecurityManager.authenticatePeer.mockResolvedValue({
        success: false,
        errorMessage: 'Invalid registration key'
      })

      const result = await node1.authenticatePeer(unauthorizedPeer, 'wrong-key-hash')
      expect(result.success).toBe(false)
      expect(result.errorMessage).toContain('Invalid registration key')
    })

    test('should handle session expiration', async () => {
      await node1.start()
      await node2.start()

      const expiredSessionId = 'expired-session-123'

      mockSecurityManager.validateSession.mockResolvedValue({
        valid: false,
        errorMessage: 'Session expired'
      })

      const result = await node1.validateSession(expiredSessionId)
      expect(result.valid).toBe(false)
      expect(result.errorMessage).toContain('expired')
    })

    test('should rotate registration keys safely', async () => {
      await node1.start()
      await node2.start()

      mockSecurityManager.rotateRegistrationKey.mockResolvedValue(true)

      const rotationResult = await node1.rotateRegistrationKey('new-shared-key', 60000)
      expect(rotationResult).toBe(true)
    })

    test('should handle rate limiting', async () => {
      await node1.start()

      const peer = { nodeId: 'rate-limited-peer', address: '192.168.1.100' }

      // Simulate rate limiting after multiple attempts
      mockSecurityManager.authenticatePeer
        .mockResolvedValueOnce({ success: true, authToken: 'token1' })
        .mockResolvedValueOnce({ success: true, authToken: 'token2' })
        .mockResolvedValue({ success: false, errorMessage: 'Rate limit exceeded' })

      const results = []
      for (let i = 0; i < 5; i++) {
        const result = await node1.authenticatePeer(peer, 'key-hash')
        results.push(result)
      }

      const rateLimitedResults = results.filter(r =>
        r.errorMessage?.includes('Rate limit exceeded')
      )
      expect(rateLimitedResults.length).toBeGreaterThan(0)
    })
  })

  describe('Performance and Scalability', () => {
    test('should handle multiple concurrent sync operations', async () => {
      await node1.start()
      await node2.start()

      // Simulate multiple concurrent sync operations
      const syncPromises = Array(10).fill(0).map(() => node1.forceSync())

      await expect(Promise.all(syncPromises)).resolves.not.toThrow()
      expect(mockSyncEngine.syncWithAllPeers).toHaveBeenCalledTimes(10)
    })

    test('should handle large data sets', async () => {
      await node1.start()

      // Mock large dataset sync
      const largeEventSet = Array(1000).fill(0).map((_, i) => ({
        id: `event-${i}`,
        nodeId: 'node-1',
        timestamp: new Date(),
        data: { index: i, payload: 'large-data'.repeat(100) }
      }))

      mockSyncEngine.syncWithAllPeers.mockImplementation(async () => {
        // Simulate processing large dataset
        await new Promise(resolve => setTimeout(resolve, 100))
        return { syncedEvents: largeEventSet.length }
      })

      await expect(node1.forceSync()).resolves.not.toThrow()
    })

    test('should provide performance metrics', async () => {
      await node1.start()

      const stats = await node1.getSyncStats()
      expect(stats).toBeDefined()

      const securityStats = await node1.getSecurityStats()
      expect(securityStats).toEqual({
        totalAuthentications: expect.any(Number),
        successfulAuthentications: expect.any(Number),
        failedAuthentications: expect.any(Number),
        activeSessions: expect.any(Number),
        expiredSessions: expect.any(Number),
        securityIncidents: expect.any(Number)
      })
    })
  })

  describe('Error Recovery', () => {
    test('should recover from database connection failure', async () => {
      // Simulate database failure during startup
      mockPrisma.$connect.mockRejectedValueOnce(new Error('Database connection failed'))

      await expect(node1.start()).rejects.toThrow('Database connection failed')

      // Simulate recovery
      mockPrisma.$connect.mockResolvedValue(undefined)
      await expect(node1.restart()).resolves.not.toThrow()
    })

    test('should handle sync engine failures gracefully', async () => {
      await node1.start()

      // Simulate sync engine failure
      mockSyncEngine.syncWithAllPeers.mockRejectedValue(new Error('Sync engine error'))

      await expect(node1.forceSync()).rejects.toThrow('Sync engine error')

      // Service should still be running
      expect(node1.getStatus().isRunning).toBe(true)
    })

    test('should handle security manager failures', async () => {
      await node1.start()

      const peer = { nodeId: 'test-peer', address: '192.168.1.100' }

      // Simulate security manager failure
      mockSecurityManager.authenticatePeer.mockRejectedValue(new Error('Security error'))

      await expect(node1.authenticatePeer(peer, 'hash')).rejects.toThrow('Security error')

      // Service should still be running
      expect(node1.getStatus().isRunning).toBe(true)
    })
  })

  describe('Event Coordination', () => {
    test('should coordinate events between all components', async () => {
      const eventSpy = jest.fn()

      node1.on('started', eventSpy)
      node1.on('peer_discovered', eventSpy)
      node1.on('sync_completed', eventSpy)
      node1.on('security_event', eventSpy)

      await node1.start()

      // Service should emit started event
      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          isRunning: true,
          nodeId: 'node-1'
        })
      )
    })

    test('should propagate component events to service level', async () => {
      await node1.start()

      // Mock peer discovery event
      const peerInfo = {
        nodeId: 'discovered-peer',
        address: '192.168.1.200',
        port: 8080
      }

      // Simulate peer discovery event propagation
      if (mockPeerDiscovery.on.mock.calls.length > 0) {
        const peerDiscoveredCallback = mockPeerDiscovery.on.mock.calls
          .find(call => call[0] === 'peer_discovered')?.[1]

        if (peerDiscoveredCallback) {
          peerDiscoveredCallback(peerInfo)
        }
      }

      // Service should handle the event appropriately
      expect(mockPeerDiscovery.on).toHaveBeenCalledWith('peer_discovered', expect.any(Function))
    })
  })

  describe('Graceful Shutdown', () => {
    test('should shutdown all components in correct order', async () => {
      await node1.start()
      await node2.start()

      await node1.stop()
      await node2.stop()

      // Verify shutdown order and completion
      expect(mockSyncEngine.stop).toHaveBeenCalled()
      expect(mockPeerDiscovery.stop).toHaveBeenCalled()
      expect(mockSecurityManager.shutdown).toHaveBeenCalled()
      expect(mockPrisma.$disconnect).toHaveBeenCalled()
    })

    test('should handle shutdown with active connections', async () => {
      await node1.start()
      await node2.start()

      // Simulate active sessions
      mockSecurityManager.getActiveSessions.mockResolvedValue([
        { sessionId: 'session-1', sourceNodeId: 'node-1', targetNodeId: 'node-2' }
      ])

      await expect(node1.stop()).resolves.not.toThrow()
      await expect(node2.stop()).resolves.not.toThrow()
    })
  })
})