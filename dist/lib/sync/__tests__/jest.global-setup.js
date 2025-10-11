module.exports = async () => {
    console.log('🚀 Starting Sync System Test Suite...');
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/test_sync_db';
    global.__TEST_CONFIG__ = {
        startTime: Date.now(),
        testDatabaseUrl: process.env.DATABASE_URL,
        defaultTimeout: 30000,
        testPortStart: 9000,
        testPortEnd: 9999,
        testRegistrationKey: 'test-sync-registration-key-2024',
        testEncryptionKey: 'test-encryption-key-2024',
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
    };
    if (!process.env.ENABLE_TEST_LOGS) {
        const originalLog = console.log;
        const originalInfo = console.info;
        const originalWarn = console.warn;
        const originalDebug = console.debug;
        global.__ORIGINAL_CONSOLE__ = {
            log: originalLog,
            info: originalInfo,
            warn: originalWarn,
            debug: originalDebug
        };
    }
    console.log('✅ Global test setup completed');
};
