# Sync System Test Suite

Comprehensive testing and validation suite for the peer-to-peer database synchronization system.

## Overview

This test suite provides complete coverage for all components of the sync system:

- **SyncService**: Main service orchestration and lifecycle management
- **SecurityManager**: Authentication, encryption, and security audit
- **Integration Tests**: End-to-end testing of the complete system
- **Test Utilities**: Helper functions and mocks for testing

## Test Structure

```
__tests__/
├── sync-service.test.ts     # Main service tests
├── security-manager.test.ts # Security component tests
├── integration.test.ts      # End-to-end integration tests
├── test-utils.ts           # Testing utilities and mocks
├── jest.config.js          # Jest configuration
├── jest.setup.js           # Global test setup
├── jest.global-setup.js    # Pre-test initialization
├── jest.global-teardown.js # Post-test cleanup
└── README.md               # This documentation
```

## Running Tests

### Prerequisites

Ensure you have the required dependencies installed:

```bash
npm install --save-dev jest @types/jest ts-jest
```

### Test Commands

```bash
# Run all tests
npm run test:sync

# Run tests with coverage
npm run test:sync:coverage

# Run tests in watch mode
npm run test:sync:watch

# Run specific test file
npm run test:sync -- sync-service.test.ts

# Run tests with verbose output
npm run test:sync -- --verbose

# Run integration tests only
npm run test:sync -- integration.test.ts
```

### Test Configuration

Add these scripts to your `package.json`:

```json
{
  "scripts": {
    "test:sync": "jest --config=src/lib/sync/__tests__/jest.config.js",
    "test:sync:coverage": "jest --config=src/lib/sync/__tests__/jest.config.js --coverage",
    "test:sync:watch": "jest --config=src/lib/sync/__tests__/jest.config.js --watch",
    "test:sync:ci": "jest --config=src/lib/sync/__tests__/jest.config.js --ci --coverage --watchAll=false"
  }
}
```

## Test Categories

### 1. Unit Tests

#### SyncService Tests (`sync-service.test.ts`)
- **Initialization**: Service creation with various configurations
- **Lifecycle Management**: Start, stop, restart operations
- **Status Monitoring**: Service status and health checks
- **Sync Operations**: Force sync, statistics retrieval
- **Partition Handling**: Network partition detection and recovery
- **Security Integration**: Authentication and session management
- **Event Handling**: Event emission and listener management
- **Error Handling**: Graceful error recovery
- **Configuration**: Various configuration scenarios

#### SecurityManager Tests (`security-manager.test.ts`)
- **Peer Authentication**: Registration key validation
- **Session Management**: Secure session establishment and validation
- **Data Encryption**: AES-256-GCM encryption/decryption
- **Key Management**: Registration key rotation
- **Audit Logging**: Security event tracking
- **Rate Limiting**: Authentication rate limiting
- **Error Handling**: Security error scenarios
- **Event Emission**: Security event broadcasting

### 2. Integration Tests (`integration.test.ts`)

#### Two-Node Synchronization
- **Service Startup**: Multiple nodes starting successfully
- **Secure Connection**: Authentication and session establishment
- **Data Synchronization**: Bidirectional data sync
- **Conflict Resolution**: Handling conflicting data changes

#### Network Scenarios
- **Partition Detection**: Network split detection
- **Partition Recovery**: Automatic recovery from splits
- **Offline Operations**: Queuing operations during network issues

#### Security Scenarios
- **Unauthorized Access**: Rejecting invalid peers
- **Session Management**: Session expiration and renewal
- **Key Rotation**: Safe registration key updates
- **Rate Limiting**: Protection against abuse

#### Performance Testing
- **Concurrent Operations**: Multiple simultaneous sync operations
- **Large Datasets**: Handling substantial data volumes
- **Metrics Collection**: Performance monitoring

#### Error Recovery
- **Database Failures**: Recovery from connection issues
- **Component Failures**: Graceful degradation
- **Network Issues**: Handling connectivity problems

## Test Utilities

### Mock Factories
- `createTestSyncConfig()`: Generate test configurations
- `createMockPrisma()`: Mock database client
- `createMockSecurityManager()`: Mock security component
- `createMockSyncEngine()`: Mock sync engine
- `createMockPeerDiscovery()`: Mock peer discovery

### Data Generators
- `createTestPeerInfo()`: Generate peer information
- `createTestSyncEvent()`: Generate sync events
- `createTestSecuritySession()`: Generate security sessions
- `TestData.generateSyncEvents()`: Bulk event generation
- `TestData.generateConflictingEvents()`: Conflict scenarios

### Validation Helpers
- `validateSyncEvent()`: Verify sync event structure
- `validateSecurityAudit()`: Verify audit entry structure
- `expectEventEmitted()`: Assert event emission

### Timing Utilities
- `wait()`: Async delay helper
- `createMockTimer()`: Mock time-based functionality
- `waitFor()`: Condition waiting helper

## Coverage Goals

The test suite aims for comprehensive coverage:

- **Lines**: 80%+ coverage
- **Functions**: 80%+ coverage
- **Branches**: 75%+ coverage
- **Statements**: 80%+ coverage

### Coverage Reports

Coverage reports are generated in multiple formats:
- **Console**: Real-time coverage summary
- **HTML**: Detailed browser-viewable report (`coverage/lcov-report/index.html`)
- **LCOV**: Machine-readable format for CI integration

## Test Scenarios

### Security Test Scenarios

1. **Valid Authentication**
   - Correct registration key hash
   - Session establishment
   - Data encryption/decryption

2. **Invalid Authentication**
   - Wrong registration key
   - Expired tokens
   - Invalid signatures

3. **Rate Limiting**
   - Multiple rapid authentication attempts
   - Per-IP rate limiting
   - Backoff strategies

4. **Key Rotation**
   - Graceful key updates
   - Grace period handling
   - Backward compatibility

### Sync Test Scenarios

1. **Basic Synchronization**
   - Single event sync
   - Multiple event batches
   - Bidirectional sync

2. **Conflict Resolution**
   - Timestamp-based resolution
   - Node priority resolution
   - Data merging scenarios

3. **Network Conditions**
   - Normal connectivity
   - Intermittent connections
   - Complete network partition
   - Slow network conditions

4. **Error Conditions**
   - Database failures
   - Memory limitations
   - Disk space issues
   - Process crashes

### Performance Test Scenarios

1. **Load Testing**
   - High-frequency events
   - Large data payloads
   - Multiple concurrent peers

2. **Stress Testing**
   - Resource exhaustion
   - Memory leaks
   - Connection limits

3. **Endurance Testing**
   - Long-running operations
   - Continuous sync over time
   - Gradual resource usage

## Debugging Tests

### Debug Configuration

Enable debug logging during tests:

```bash
ENABLE_TEST_LOGS=true npm run test:sync
```

### Common Issues

1. **Port Conflicts**: Tests use random ports 9000-9999
2. **Timing Issues**: Use `waitFor()` for async conditions
3. **Mock Conflicts**: Reset mocks between tests
4. **Resource Cleanup**: Ensure proper service shutdown

### Debug Helpers

```javascript
// Enable verbose logging
process.env.ENABLE_TEST_LOGS = 'true'

// Wait for condition
await global.testUtils.waitFor(() => condition, 5000)

// Check mock calls
expect(mockFunction).toHaveBeenCalledWith(expectedArgs)
```

## Continuous Integration

### CI Configuration

For GitHub Actions or similar CI systems:

```yaml
- name: Run Sync Tests
  run: npm run test:sync:ci
  env:
    DATABASE_URL: postgresql://test:test@localhost:5432/test_db

- name: Upload Coverage
  uses: codecov/codecov-action@v1
  with:
    file: ./coverage/lcov.info
```

### Test Database

Tests require a PostgreSQL database. Use Docker for CI:

```bash
docker run -d \
  --name test-postgres \
  -e POSTGRES_PASSWORD=test \
  -e POSTGRES_USER=test \
  -e POSTGRES_DB=test_sync_db \
  -p 5432:5432 \
  postgres:13
```

## Best Practices

### Writing Tests

1. **Isolation**: Each test should be independent
2. **Cleanup**: Always cleanup resources in `afterEach`
3. **Mocking**: Mock external dependencies
4. **Assertions**: Use specific, meaningful assertions
5. **Documentation**: Comment complex test scenarios

### Test Organization

1. **Descriptive Names**: Use clear test and describe names
2. **Logical Grouping**: Group related tests together
3. **Setup/Teardown**: Use beforeEach/afterEach consistently
4. **Test Data**: Use factories for consistent test data

### Performance

1. **Parallel Execution**: Tests run in sequence to avoid port conflicts
2. **Mock Heavy Operations**: Mock file I/O, network calls
3. **Timeout Management**: Set appropriate timeouts
4. **Resource Management**: Prevent memory leaks

## Troubleshooting

### Common Test Failures

1. **Timeout Errors**: Increase timeout for slow operations
2. **Port Conflicts**: Ensure unique ports for each test
3. **Mock Issues**: Verify mock setup and reset
4. **Async Issues**: Use proper async/await patterns

### Getting Help

For test-related issues:
1. Check test logs with `ENABLE_TEST_LOGS=true`
2. Run individual test files to isolate issues
3. Verify mock configurations
4. Check for resource cleanup in failing tests

## Future Enhancements

### Planned Improvements

1. **Load Testing**: Add performance benchmarks
2. **Chaos Engineering**: Introduce random failures
3. **Property Testing**: Add property-based tests
4. **Visual Coverage**: Enhanced coverage reporting
5. **Test Automation**: Automated test generation

### Contributing

When adding new features:
1. Write tests first (TDD approach)
2. Ensure coverage meets thresholds
3. Add integration tests for new components
4. Update documentation
5. Run full test suite before committing