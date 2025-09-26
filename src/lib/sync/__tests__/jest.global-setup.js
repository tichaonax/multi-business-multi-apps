/**
 * Jest Global Setup
 * Runs once before all tests
 */

module.exports = async () => {
  console.log('🚀 Starting Sync System Test Suite...')

  // Set test environment variables
  process.env.NODE_ENV = 'test'
  process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/test_sync_db'

  // Global test configuration
  global.__TEST_CONFIG__ = {
    startTime: Date.now(),
    testDatabaseUrl: process.env.DATABASE_URL,
    defaultTimeout: 30000,

    // Test ports range
    testPortStart: 9000,
    testPortEnd: 9999,

    // Security test keys
    testRegistrationKey: 'test-sync-registration-key-2024',
    testEncryptionKey: 'test-encryption-key-2024',

    // Test node configurations
    testNodes: {
      node1: {
        nodeId: 'test-node-1',
        port: 9001,
        name: 'Test Node 1'
      },
      node2: {
        nodeId: 'test-node-2',
        port: 9002,
        name: 'Test Node 2'
      },
      node3: {
        nodeId: 'test-node-3',
        port: 9003,
        name: 'Test Node 3'
      }
    }
  }

  // Suppress logs during tests unless explicitly enabled
  if (!process.env.ENABLE_TEST_LOGS) {
    const originalLog = console.log
    const originalInfo = console.info
    const originalWarn = console.warn
    const originalDebug = console.debug

    global.__ORIGINAL_CONSOLE__ = {
      log: originalLog,
      info: originalInfo,
      warn: originalWarn,
      debug: originalDebug
    }
  }

  console.log('✅ Global test setup completed')
}