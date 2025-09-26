/**
 * Jest Configuration for Sync System Tests
 */

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    '../**/*.ts',
    '!../**/*.d.ts',
    '!../**/__tests__/**',
    '!../node_modules/**',
  ],
  coverageDirectory: './coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testTimeout: 30000,
  maxWorkers: 1, // Run tests sequentially to avoid port conflicts
  verbose: true,

  // Module path mapping for absolute imports
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/../../../../$1',
  },

  // Global test setup
  globalSetup: '<rootDir>/jest.global-setup.js',
  globalTeardown: '<rootDir>/jest.global-teardown.js',

  // Test environment setup
  testEnvironment: 'node',

  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 75,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
}