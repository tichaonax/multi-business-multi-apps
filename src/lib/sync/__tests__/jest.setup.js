/**
 * Jest Test Setup
 * Global setup for all sync system tests
 */

// Increase timeout for integration tests
jest.setTimeout(30000)

// Mock console methods to reduce noise during tests
const originalConsole = {
  log: console.log,
  info: console.info,
  warn: console.warn,
  error: console.error,
  debug: console.debug,
}

beforeAll(() => {
  // Mock console methods for cleaner test output
  console.log = jest.fn()
  console.info = jest.fn()
  console.warn = jest.fn()
  console.debug = jest.fn()
  // Keep error logs for debugging
  // console.error = jest.fn()
})

afterAll(() => {
  // Restore console methods
  Object.assign(console, originalConsole)
})

// Global test utilities
global.testUtils = {
  /**
   * Wait for a condition to be true
   */
  waitFor: async (condition, timeout = 5000, interval = 100) => {
    const startTime = Date.now()

    while (Date.now() - startTime < timeout) {
      if (await condition()) {
        return true
      }
      await new Promise(resolve => setTimeout(resolve, interval))
    }

    throw new Error(`Condition not met within ${timeout}ms`)
  },

  /**
   * Wait for a specific amount of time
   */
  wait: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

  /**
   * Generate random string for testing
   */
  randomString: (length = 8) => {
    return Math.random().toString(36).substring(2, length + 2)
  },

  /**
   * Generate random port for testing
   */
  randomPort: () => 8000 + Math.floor(Math.random() * 2000),
}

// Global mocks for Node.js modules
jest.mock('fs', () => ({
  writeFileSync: jest.fn(),
  readFileSync: jest.fn(),
  existsSync: jest.fn(() => true),
  mkdirSync: jest.fn(),
  createWriteStream: jest.fn(() => ({
    write: jest.fn(),
    end: jest.fn(),
  })),
  promises: {
    writeFile: jest.fn(),
    readFile: jest.fn(),
    access: jest.fn(),
    mkdir: jest.fn(),
  }
}))

jest.mock('os', () => ({
  networkInterfaces: jest.fn(() => ({
    eth0: [
      {
        address: '192.168.1.100',
        netmask: '255.255.255.0',
        family: 'IPv4',
        mac: '00:00:00:00:00:00',
        internal: false,
        cidr: '192.168.1.100/24'
      }
    ]
  })),
  hostname: jest.fn(() => 'test-hostname'),
  platform: jest.fn(() => 'linux'),
  arch: jest.fn(() => 'x64'),
}))

jest.mock('dgram', () => ({
  createSocket: jest.fn(() => ({
    bind: jest.fn(),
    close: jest.fn(),
    send: jest.fn(),
    on: jest.fn(),
    setBroadcast: jest.fn(),
    setMulticastTTL: jest.fn(),
    addMembership: jest.fn(),
  }))
}))

jest.mock('crypto', () => ({
  randomBytes: jest.fn(() => Buffer.from('random-bytes')),
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
}))

// Global cleanup after each test
afterEach(() => {
  jest.clearAllTimers()
})

// Global error handlers
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason)
})

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error)
})