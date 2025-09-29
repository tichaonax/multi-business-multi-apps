/**
 * Sync System Validation Script
 * Comprehensive validation of the peer-to-peer synchronization system
 *
 * Usage: npm run validate:sync
 */

import { SyncService, SyncServiceConfig } from './sync-service'
import { createSecurityManager } from './security-manager'
import { PrismaClient } from '@prisma/client'
import { createHash } from 'crypto'

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
}

class SyncSystemValidator {
  private results: { test: string; status: 'pass' | 'fail' | 'skip'; message?: string; duration?: number }[] = []

  constructor() {}

  private log(message: string, color: keyof typeof colors = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`)
  }

  private async runTest(name: string, testFn: () => Promise<void>): Promise<void> {
    const startTime = Date.now()
    this.log(`\n🔄 ${name}...`, 'cyan')

    try {
      await testFn()
      const duration = Date.now() - startTime
      this.results.push({ test: name, status: 'pass', duration })
      this.log(`✅ ${name} - PASSED (${duration}ms)`, 'green')
    } catch (error) {
      const duration = Date.now() - startTime
      const message = error instanceof Error ? error.message : String(error)
      this.results.push({ test: name, status: 'fail', message, duration })
      this.log(`❌ ${name} - FAILED (${duration}ms)`, 'red')
      this.log(`   Error: ${message}`, 'red')
    }
  }

  private skipTest(name: string, reason: string): void {
    this.results.push({ test: name, status: 'skip', message: reason })
    this.log(`⏭️  ${name} - SKIPPED (${reason})`, 'yellow')
  }

  async validateDependencies(): Promise<void> {
    await this.runTest('Validate Dependencies', async () => {
      // Check if required modules can be imported
      const { PrismaClient } = await import('@prisma/client')
      const crypto = await import('crypto')
      const dgram = await import('dgram')
      const os = await import('os')
      const fs = await import('fs')

      if (!PrismaClient) throw new Error('PrismaClient not available')
      if (!crypto) throw new Error('crypto module not available')
      if (!dgram) throw new Error('dgram module not available')
      if (!os) throw new Error('os module not available')
      if (!fs) throw new Error('fs module not available')
    })
  }

  async validateSyncServiceCreation(): Promise<void> {
    await this.runTest('SyncService Creation', async () => {
      const config: SyncServiceConfig = {
        nodeId: 'validation-node-1',
        nodeName: 'Validation Node 1',
        registrationKey: 'validation-key-123',
        port: 9001,
        syncInterval: 30000,
        enableAutoStart: false,
        logLevel: 'info',
        dataDirectory: './validation-data',
        maxLogSize: 1024 * 1024,
        maxLogFiles: 3,
        security: {
          enableEncryption: true,
          enableSignatures: true,
        }
      }

      const syncService = new SyncService(config)
      const status = syncService.getStatus()

      if (status.nodeId !== 'validation-node-1') {
        throw new Error('Node ID not set correctly')
      }

      if (status.nodeName !== 'Validation Node 1') {
        throw new Error('Node name not set correctly')
      }

      if (status.isRunning !== false) {
        throw new Error('Service should not be running initially')
      }
    })
  }

  async validateSecurityManagerCreation(): Promise<void> {
    await this.runTest('SecurityManager Creation', async () => {
      const prisma = new PrismaClient()
      const securityManager = createSecurityManager(
        prisma,
        'validation-security-node',
        {
          registrationKey: 'validation-security-key',
          enableEncryption: true,
          enableSignatures: true,
          keyRotationEnabled: false,
          keyRotationInterval: 3600000,
          sessionTimeout: 1800000,
          maxFailedAttempts: 5,
          rateLimitWindow: 60000,
          rateLimitMaxRequests: 10
        }
      )

      if (!securityManager) {
        throw new Error('SecurityManager not created')
      }

      // Check if it has expected methods
      const requiredMethods = [
        'initialize', 'shutdown', 'authenticatePeer', 'establishSecureSession',
        'validateSession', 'encryptData', 'decryptData', 'getAuditLogs',
        'getSecurityStats', 'rotateRegistrationKey', 'revokeSession'
      ]

      for (const method of requiredMethods) {
        if (typeof (securityManager as any)[method] !== 'function') {
          throw new Error(`SecurityManager missing method: ${method}`)
        }
      }

      await securityManager.shutdown()
    })
  }

  async validateDatabaseConnection(): Promise<void> {
    await this.runTest('Database Connection', async () => {
      try {
        const prisma = new PrismaClient()
        await prisma.$connect()

        // Test basic query
        await prisma.$queryRaw`SELECT 1 as test`

        await prisma.$disconnect()
      } catch (error) {
        if (error instanceof Error && error.message.includes('ECONNREFUSED')) {
          throw new Error('Database connection refused - ensure PostgreSQL is running')
        }
        throw error
      }
    })
  }

  async validateSyncServiceLifecycle(): Promise<void> {
    await this.runTest('SyncService Lifecycle', async () => {
      const config: SyncServiceConfig = {
        nodeId: 'lifecycle-test-node',
        nodeName: 'Lifecycle Test Node',
        registrationKey: 'lifecycle-test-key',
        port: 9002,
        syncInterval: 30000,
        enableAutoStart: false,
        logLevel: 'error', // Reduce log noise
        dataDirectory: './lifecycle-test-data',
        maxLogSize: 1024 * 1024,
        maxLogFiles: 1,
      }

      const syncService = new SyncService(config)

      // Test start
      await syncService.start()
      let status = syncService.getStatus()
      if (!status.isRunning) {
        throw new Error('Service not running after start')
      }

      // Test restart
      await syncService.restart()
      status = syncService.getStatus()
      if (!status.isRunning) {
        throw new Error('Service not running after restart')
      }

      // Test stop
      await syncService.stop()
      status = syncService.getStatus()
      if (status.isRunning) {
        throw new Error('Service still running after stop')
      }
    })
  }

  async validateSecurityAuthentication(): Promise<void> {
    await this.runTest('Security Authentication', async () => {
      const prisma = new PrismaClient()
      const securityManager = createSecurityManager(
        prisma,
        'auth-test-node',
        {
          registrationKey: 'auth-test-key',
          enableEncryption: true,
          enableSignatures: true,
          keyRotationEnabled: false,
          keyRotationInterval: 3600000,
          sessionTimeout: 1800000,
          maxFailedAttempts: 5,
          rateLimitWindow: 60000,
          rateLimitMaxRequests: 10
        }
      )

      await securityManager.initialize()

      // Test peer authentication with correct key
      const peer = {
        nodeId: 'test-peer',
        nodeName: 'Test Peer',
        ipAddress: '192.168.1.100',
        port: 8080,
        capabilities: [],
        registrationKeyHash: '',
        lastSeen: new Date(),
        isAuthenticated: false
      }

      // Create correct key hash
      const correctKeyHash = createHash('sha256')
        .update('auth-test-key')
        .digest('hex')

      const authResult = await securityManager.authenticatePeer(peer, correctKeyHash)
      if (!authResult.success) {
        throw new Error(`Authentication failed: ${authResult.errorMessage}`)
      }

      if (!authResult.authToken) {
        throw new Error('Auth token not provided')
      }

      // Test authentication with incorrect key
      const incorrectKeyHash = 'incorrect-hash'
      const failAuthResult = await securityManager.authenticatePeer(peer, incorrectKeyHash)
      if (failAuthResult.success) {
        throw new Error('Authentication should have failed with incorrect key')
      }

      await securityManager.shutdown()
    })
  }

  async validateDataEncryption(): Promise<void> {
    await this.runTest('Data Encryption', async () => {
      const prisma = new PrismaClient()
      const securityManager = createSecurityManager(
        prisma,
        'encryption-test-node',
        {
          registrationKey: 'encryption-test-key',
          enableEncryption: true,
          enableSignatures: true,
          keyRotationEnabled: false,
          keyRotationInterval: 3600000,
          sessionTimeout: 1800000,
          maxFailedAttempts: 5,
          rateLimitWindow: 60000,
          rateLimitMaxRequests: 10
        }
      )

      await securityManager.initialize()

      const testData = {
        message: 'test encrypted data',
        timestamp: new Date().toISOString(),
        value: 12345
      }

      const sessionKey = 'test-session-key-for-encryption'

      // Test encryption
      const encryptResult = await securityManager.encryptData(testData, sessionKey)
      if (!encryptResult) {
        throw new Error('Encryption failed: no result')
      }

      if (!encryptResult.encryptedData || !encryptResult.signature) {
        throw new Error('Encrypted data or signature missing')
      }

      // Test decryption
      const decryptResult = await securityManager.decryptData(
        encryptResult.encryptedData,
        encryptResult.signature,
        sessionKey
      )

      if (!decryptResult.success) {
        throw new Error(`Decryption failed: ${decryptResult.errorMessage}`)
      }

      // Verify data integrity
      const decryptedData = decryptResult.data
      if (JSON.stringify(decryptedData) !== JSON.stringify(testData)) {
        throw new Error('Decrypted data does not match original')
      }

      await securityManager.shutdown()
    })
  }

  async validateConfigurationVariations(): Promise<void> {
    await this.runTest('Configuration Variations', async () => {
      // Test minimal configuration
      const minimalConfig: SyncServiceConfig = {
        nodeName: 'Minimal Node',
        registrationKey: 'minimal-key',
        port: 9003,
        syncInterval: 10000,
        enableAutoStart: false,
        logLevel: 'error',
        dataDirectory: './minimal-data',
        maxLogSize: 1024,
        maxLogFiles: 1,
      }

      const minimalService = new SyncService(minimalConfig)
      const minimalStatus = minimalService.getStatus()
      if (!minimalStatus.nodeId) {
        throw new Error('Node ID should be auto-generated')
      }

      // Test security-disabled configuration
      const noSecurityConfig: SyncServiceConfig = {
        ...minimalConfig,
        nodeName: 'No Security Node',
        port: 9004,
        security: {
          enableEncryption: false,
          enableSignatures: false,
        }
      }

      const noSecurityService = new SyncService(noSecurityConfig)
      const noSecurityStatus = noSecurityService.getStatus()
      if (!noSecurityStatus.nodeId) {
        throw new Error('Node ID should be set for no-security config')
      }

      // Test custom security configuration
      const customSecurityConfig: SyncServiceConfig = {
        ...minimalConfig,
        nodeName: 'Custom Security Node',
        port: 9005,
        security: {
          enableEncryption: true,
          enableSignatures: true,
          keyRotationEnabled: true,
          keyRotationInterval: 12 * 60 * 60 * 1000,
          sessionTimeout: 30 * 60 * 1000,
          maxFailedAttempts: 10,
          rateLimitWindow: 30 * 1000,
          rateLimitMaxRequests: 50,
        }
      }

      const customSecurityService = new SyncService(customSecurityConfig)
      const customSecurityStatus = customSecurityService.getStatus()
      if (!customSecurityStatus.nodeId) {
        throw new Error('Node ID should be set for custom security config')
      }
    })
  }

  async validateErrorHandling(): Promise<void> {
    await this.runTest('Error Handling', async () => {
      // Test invalid port configuration
      const invalidPortConfig: SyncServiceConfig = {
        nodeName: 'Invalid Port Node',
        registrationKey: 'invalid-port-key',
        port: -1, // Invalid port
        syncInterval: 10000,
        enableAutoStart: false,
        logLevel: 'error',
        dataDirectory: './invalid-port-data',
        maxLogSize: 1024,
        maxLogFiles: 1,
      }

      const invalidPortService = new SyncService(invalidPortConfig)
      // Service creation should succeed, but start might fail
      // This tests that the service handles invalid configuration gracefully

      // Test with empty registration key
      const emptyKeyConfig: SyncServiceConfig = {
        nodeName: 'Empty Key Node',
        registrationKey: '', // Empty key
        port: 9006,
        syncInterval: 10000,
        enableAutoStart: false,
        logLevel: 'error',
        dataDirectory: './empty-key-data',
        maxLogSize: 1024,
        maxLogFiles: 1,
      }

      const emptyKeyService = new SyncService(emptyKeyConfig)
      // Should handle empty registration key gracefully

      // Test operations on stopped service
      const status = invalidPortService.getStatus()
      if (status.isRunning) {
        throw new Error('Service should not be running with invalid config')
      }

      // These should handle gracefully when service is not started
      const syncStats = await invalidPortService.getSyncStats().catch(() => null)
      const securityStats = await invalidPortService.getSecurityStats()

      if (securityStats.totalAuthentications < 0) {
        throw new Error('Security stats should have valid default values')
      }
    })
  }

  async validateMultipleServices(): Promise<void> {
    await this.runTest('Multiple Services', async () => {
      const services: SyncService[] = []

      try {
        // Create multiple services with different configurations
        for (let i = 0; i < 3; i++) {
          const config: SyncServiceConfig = {
            nodeId: `multi-service-node-${i}`,
            nodeName: `Multi Service Node ${i}`,
            registrationKey: 'multi-service-shared-key',
            port: 9010 + i,
            syncInterval: 30000,
            enableAutoStart: false,
            logLevel: 'error',
            dataDirectory: `./multi-service-data-${i}`,
            maxLogSize: 1024 * 1024,
            maxLogFiles: 1,
          }

          const service = new SyncService(config)
          services.push(service)

          // Start each service
          await service.start()
          const status = service.getStatus()

          if (!status.isRunning) {
            throw new Error(`Service ${i} failed to start`)
          }

          if (status.nodeId !== `multi-service-node-${i}`) {
            throw new Error(`Service ${i} has incorrect node ID`)
          }
        }

        // Verify all services are running independently
        for (let i = 0; i < services.length; i++) {
          const status = services[i].getStatus()
          if (!status.isRunning) {
            throw new Error(`Service ${i} stopped unexpectedly`)
          }
        }

      } finally {
        // Clean up all services
        for (const service of services) {
          try {
            await service.stop()
          } catch (error) {
            // Ignore cleanup errors
          }
        }
      }
    })
  }

  async validateMemoryUsage(): Promise<void> {
    await this.runTest('Memory Usage', async () => {
      const initialMemory = process.memoryUsage()

      // Create and destroy multiple services to check for memory leaks
      for (let i = 0; i < 10; i++) {
        const config: SyncServiceConfig = {
          nodeId: `memory-test-node-${i}`,
          nodeName: `Memory Test Node ${i}`,
          registrationKey: 'memory-test-key',
          port: 9020 + i,
          syncInterval: 30000,
          enableAutoStart: false,
          logLevel: 'error',
          dataDirectory: `./memory-test-data-${i}`,
          maxLogSize: 1024,
          maxLogFiles: 1,
        }

        const service = new SyncService(config)
        await service.start()
        await service.stop()
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc()
      }

      const finalMemory = process.memoryUsage()
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed

      // Allow for some memory increase, but flag excessive growth
      const maxAllowedIncrease = 50 * 1024 * 1024 // 50MB
      if (memoryIncrease > maxAllowedIncrease) {
        throw new Error(`Excessive memory usage increase: ${Math.round(memoryIncrease / 1024 / 1024)}MB`)
      }
    })
  }

  async printSummary(): Promise<void> {
    this.log('\n' + '='.repeat(60), 'bright')
    this.log('SYNC SYSTEM VALIDATION SUMMARY', 'bright')
    this.log('='.repeat(60), 'bright')

    const passed = this.results.filter(r => r.status === 'pass')
    const failed = this.results.filter(r => r.status === 'fail')
    const skipped = this.results.filter(r => r.status === 'skip')

    this.log(`\n📊 Results:`, 'bright')
    this.log(`   ✅ Passed: ${passed.length}`, 'green')
    this.log(`   ❌ Failed: ${failed.length}`, failed.length > 0 ? 'red' : 'green')
    this.log(`   ⏭️  Skipped: ${skipped.length}`, 'yellow')
    this.log(`   📈 Total: ${this.results.length}`, 'bright')

    if (failed.length > 0) {
      this.log(`\n❌ Failed Tests:`, 'red')
      for (const failure of failed) {
        this.log(`   • ${failure.test}: ${failure.message}`, 'red')
      }
    }

    if (skipped.length > 0) {
      this.log(`\n⏭️  Skipped Tests:`, 'yellow')
      for (const skip of skipped) {
        this.log(`   • ${skip.test}: ${skip.message}`, 'yellow')
      }
    }

    const totalDuration = this.results.reduce((sum, r) => sum + (r.duration || 0), 0)
    this.log(`\n⏱️  Total Duration: ${totalDuration}ms`, 'cyan')

    const successRate = Math.round((passed.length / (passed.length + failed.length)) * 100)
    this.log(`\n📊 Success Rate: ${successRate}%`, successRate >= 90 ? 'green' : 'yellow')

    if (failed.length === 0) {
      this.log(`\n🎉 ALL VALIDATIONS PASSED! 🎉`, 'green')
      this.log('The sync system is ready for use.', 'green')
    } else {
      this.log(`\n⚠️  VALIDATION ISSUES FOUND`, 'red')
      this.log('Please address the failed tests before using the sync system.', 'red')
    }

    this.log('\n' + '='.repeat(60), 'bright')
  }

  async run(): Promise<boolean> {
    this.log('🚀 Starting Sync System Validation...', 'bright')
    this.log('This will test all major components of the sync system.\n', 'cyan')

    // Core validations
    await this.validateDependencies()
    await this.validateDatabaseConnection()
    await this.validateSyncServiceCreation()
    await this.validateSecurityManagerCreation()

    // Functional validations
    await this.validateSyncServiceLifecycle()
    await this.validateSecurityAuthentication()
    await this.validateDataEncryption()

    // Configuration validations
    await this.validateConfigurationVariations()
    await this.validateErrorHandling()

    // Integration validations
    await this.validateMultipleServices()
    await this.validateMemoryUsage()

    await this.printSummary()

    const hasFailures = this.results.some(r => r.status === 'fail')
    return !hasFailures
  }
}

// Main execution
async function main() {
  const validator = new SyncSystemValidator()

  try {
    const success = await validator.run()
    process.exit(success ? 0 : 1)
  } catch (error) {
    console.error('❌ Validation script failed:', error)
    process.exit(1)
  }
}

// Run validation if this file is executed directly
if (require.main === module) {
  main()
}

export { SyncSystemValidator }